import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiIngressGuard } from './middleware/ingressGuard';
import { prismaCacheContext } from './middleware/prismaCacheContext';
import { autoTransaction } from './middleware/autoTransaction';
import { ensureBucketExists } from './config/s3';

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
import { startDemoScheduler } from './services/demoScheduler.service';
import { CronSchedulerService } from './services/cronScheduler.service';

const app = express();

// Trust reverse proxy (Caddy / Cloudflare) to extract accurate client IP addresses
app.set('trust proxy', true);

// Middlewares
app.use(prismaCacheContext);
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Public Health & Config Handlers
const healthHandler = (req: express.Request, res: express.Response) => {
    res.json({
        status: 'ok',
        service: 'areena-backend',
        version: config.version,
        timestamp: new Date().toISOString(),
    });
};

const publicConfigHandler = (req: express.Request, res: express.Response) => {
    res.json({
        isDemo: config.isDemo,
        version: config.version,
        timestamp: new Date().toISOString(),
    });
};

// Root Health & Config
app.get('/health', healthHandler);
app.get('/config/public', publicConfigHandler);

// API Ingress Guard (OAuth unrestricted / Frontend rate-limited / Direct blocked)
app.use(apiIngressGuard);

// Automatic Transaction Rollback Guard for all mutating requests (POST, PUT, PATCH, DELETE)
app.use(autoTransaction);

// Assemble v1 Router
const v1Router = express.Router();
v1Router.get('/health', healthHandler);
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
    CronSchedulerService.start();
});

export default app;
