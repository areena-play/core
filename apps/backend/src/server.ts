import express from 'express';
import cors from 'cors';
import { HeadBucketCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { config } from './config/env';
import { basePrisma } from './config/prisma';
import { errorHandler } from './middleware/errorHandler';
import { apiIngressGuard } from './middleware/ingressGuard';
import { prismaCacheContext } from './middleware/prismaCacheContext';
import { autoTransaction } from './middleware/autoTransaction';
import { ensureBucketExists, s3Client } from './config/s3';

// Route imports
import authRoutes from './routes/auth.routes';
import associationRoutes from './routes/associations.routes';
import clubRoutes from './routes/clubs.routes';
import licenseRoutes from './routes/licenses.routes';
import competitionRoutes from './routes/competitions.routes';
import calendarRoutes from './routes/calendar.routes';
import messageRoutes from './routes/messages.routes';
import oauthRoutes from './routes/oauth.routes';
import uploadRoutes from './routes/upload.routes';
import invoiceRoutes from './routes/invoices.routes';
import auditRoutes from './routes/audit.routes';
import setupRoutes from './routes/setup.routes';
import noticeRoutes from './routes/notices.routes';
import userRoutes from './routes/users.routes';
import supportRoutes from './routes/support.routes';
import adminRoutes from './routes/admin.routes';
import locationsRoutes from './routes/locations.routes';
import searchRoutes from './routes/search.routes';
import pushRoutes from './routes/push.routes';
import relationshipRoutes from './routes/relationships.routes';
import { ratingsRouter } from './routes/ratings.routes';
import billingRoutes from './routes/billing.routes';
import aiRoutes from './routes/ai.routes';
import ttsRoutes from './routes/tts.routes';
import { startDemoScheduler } from './services/demoScheduler.service';
import { CronSchedulerService } from './services/cronScheduler.service';
import { RatingSchedulerService } from './services/ratingScheduler.service';
import { ClickTTScraperService } from './services/clickttScraper.service';
import { SystemService } from './services/system.service';

const app = express();

// Trust reverse proxy (Caddy / Cloudflare) to extract accurate client IP addresses
app.set('trust proxy', true);

// Middlewares
app.use(prismaCacheContext);
app.use(cors({ origin: '*', credentials: true }));
app.use(
    express.json({
        limit: '50mb',
        verify: (req: any, _res, buf) => {
            req.rawBody = buf;
        },
    })
);
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Prevent stale HTTP caching for all dynamic API responses
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Helper to wrap promises with a timeout
const checkWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} check timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        clearTimeout(timer!);
    }
};

// Public Health & Config Handlers
const healthHandler = async (_req: express.Request, res: express.Response) => {
    const timeoutMs = 3000;

    // Concurrently execute Database and S3 checks
    const [dbResult, s3Result] = await Promise.allSettled([
        (async () => {
            const start = Date.now();
            await checkWithTimeout(basePrisma.$queryRaw`SELECT 1`, timeoutMs, 'Database');
            return { latencyMs: Date.now() - start };
        })(),
        (async () => {
            if (!config.s3.bucketName) {
                throw new Error('S3_BUCKET_NAME is not configured');
            }
            const start = Date.now();

            // 1. Try HeadBucket first
            try {
                await checkWithTimeout(
                    s3Client.send(new HeadBucketCommand({ Bucket: config.s3.bucketName })),
                    timeoutMs,
                    'S3 Storage (HeadBucket)'
                );
                return { latencyMs: Date.now() - start };
            } catch (headBucketErr: any) {
                // 2. If HeadBucket failed (common when IAM policy restricts bucket-level permissions),
                // probe with HeadObject in the application's 'uploads/' folder.
                // A 404 (NoSuchKey / NotFound) confirms the bucket/prefix is reachable, authenticated, and valid.
                try {
                    await checkWithTimeout(
                        s3Client.send(
                            new HeadObjectCommand({
                                Bucket: config.s3.bucketName,
                                Key: 'uploads/.healthcheck',
                            })
                        ),
                        timeoutMs,
                        'S3 Storage (HeadObject)'
                    );
                    return { latencyMs: Date.now() - start };
                } catch (headObjectErr: any) {
                    const statusCode = headObjectErr.$metadata?.httpStatusCode;
                    const errName = headObjectErr.name;
                    if (
                        statusCode === 404 ||
                        errName === 'NotFound' ||
                        errName === 'NoSuchKey'
                    ) {
                        return { latencyMs: Date.now() - start };
                    }

                    // 3. Fallback: Try ListObjectsV2 on uploads/ prefix
                    try {
                        await checkWithTimeout(
                            s3Client.send(
                                new ListObjectsV2Command({
                                    Bucket: config.s3.bucketName,
                                    Prefix: 'uploads/',
                                    MaxKeys: 1,
                                })
                            ),
                            timeoutMs,
                            'S3 Storage (ListObjectsV2)'
                        );
                        return { latencyMs: Date.now() - start };
                    } catch (listErr: any) {
                        throw headObjectErr || headBucketErr || listErr;
                    }
                }
            }
        })(),
    ]);

    const isDbHealthy = dbResult.status === 'fulfilled';
    const isS3Healthy = s3Result.status === 'fulfilled';
    const isHealthy = isDbHealthy && isS3Healthy;

    const dbData = isDbHealthy
        ? { status: 'healthy', latencyMs: dbResult.value.latencyMs }
        : {
              status: 'unhealthy',
              error: (dbResult as PromiseRejectedResult).reason?.message || 'Database unreachable',
          };

    const s3Data = isS3Healthy
        ? { status: 'healthy', bucket: config.s3.bucketName, latencyMs: s3Result.value.latencyMs }
        : {
              status: 'unhealthy',
              bucket: config.s3.bucketName,
              error: (s3Result as PromiseRejectedResult).reason?.message || 'S3 storage unreachable',
          };

    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        service: 'areena-backend',
        version: config.version,
        timestamp: new Date().toISOString(),
        checks: {
            database: dbData,
            storage: s3Data,
        },
    });
};

const publicConfigHandler = async (req: express.Request, res: express.Response) => {
    try {
        const gaConfig = await SystemService.getGoogleAnalyticsConfig();
        res.json({
            isDemo: config.isDemo,
            version: config.version,
            timestamp: new Date().toISOString(),
            googleAnalytics: {
                measurementId: gaConfig.enabled ? gaConfig.measurementId : '',
                enabled: gaConfig.enabled && Boolean(gaConfig.measurementId),
                anonymizeIp: gaConfig.anonymizeIp,
            },
        });
    } catch (e) {
        res.json({
            isDemo: config.isDemo,
            version: config.version,
            timestamp: new Date().toISOString(),
            googleAnalytics: {
                measurementId: '',
                enabled: false,
                anonymizeIp: true,
            },
        });
    }
};

// Root Health & Config
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
app.get('/config/public', publicConfigHandler);

// API Ingress Guard (OAuth unrestricted / Frontend rate-limited / Direct blocked)
app.use(apiIngressGuard);

// Automatic Transaction Rollback Guard for all mutating requests (POST, PUT, PATCH, DELETE)
app.use(autoTransaction);

// Assemble v1 Router
const v1Router = express.Router();
v1Router.get('/health', healthHandler);
v1Router.get('/api/health', healthHandler);
v1Router.get('/config/public', publicConfigHandler);
v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/associations', associationRoutes);
v1Router.use('/clubs', clubRoutes);
v1Router.use('/licenses', licenseRoutes);
v1Router.use('/competitions', competitionRoutes);
v1Router.use('/calendar', calendarRoutes);
v1Router.use('/messages', messageRoutes);
v1Router.use('/oauth', oauthRoutes);
v1Router.use('/upload', uploadRoutes);
v1Router.use('/invoices', invoiceRoutes);
v1Router.use('/audit-logs', auditRoutes);
v1Router.use('/setup', setupRoutes);
v1Router.use('/notices', noticeRoutes);
v1Router.use('/support', supportRoutes);
v1Router.use('/admin', adminRoutes);
v1Router.use('/locations', locationsRoutes);
v1Router.use('/search', searchRoutes);
v1Router.use('/push', pushRoutes);
v1Router.use('/relationships', relationshipRoutes);
v1Router.use('/ratings', ratingsRouter);
v1Router.use('/billing', billingRoutes);
v1Router.use('/ai', aiRoutes);
v1Router.use('/tts', ttsRoutes);

// 404 Catch-All Handler for unmatched v1 routes
v1Router.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `API endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`,
        docs: '/developers',
        timestamp: new Date().toISOString(),
    });
});

// Mount v1 router at /v1 (versioned standard) and / (latest version for convenience)
app.use('/v1', v1Router);
app.use('/', v1Router);

// Global Root 404 Catch-All
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Resource '${req.method} ${req.originalUrl}' does not exist on this server.`,
        docs: '/developers',
        timestamp: new Date().toISOString(),
    });
});

// Global Error Handler
app.use(errorHandler);

const PORT = config.port;

app.listen(PORT, () => {
    console.log(`[AREENA Backend] Server listening on port ${PORT}`);
    console.log(`[AREENA Backend] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[AREENA Backend] Demo Mode: ${config.isDemo ? 'ENABLED (Auto 2am Reset)' : 'DISABLED'}`);

    ensureBucketExists().catch((err) => {
        console.warn(`[AREENA S3] Bucket initialization notice: ${err.message}`);
    });

    startDemoScheduler();
    RatingSchedulerService.init();
    ClickTTScraperService.initCronJobs();
    CronSchedulerService.start();
});

export default app;
