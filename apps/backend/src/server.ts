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
// Health & Public Config endpoints (allowed unauthenticated)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'areena-backend',
        version: config.version,
        timestamp: new Date().toISOString(),
    });
});

app.get('/config/public', (req, res) => {
    res.json({
        isDemo: config.isDemo,
        version: config.version,
        timestamp: new Date().toISOString(),
    });
});

// API Ingress Guard (OAuth unrestricted / Frontend rate-limited / Direct blocked)
app.use(apiIngressGuard);

// Automatic Transaction Rollback Guard for all mutating requests (POST, PUT, PATCH, DELETE)
app.use(autoTransaction);

// Mount Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/associations', associationRoutes);
app.use('/clubs', clubRoutes);
app.use('/licenses', licenseRoutes);
app.use('/competitions', competitionRoutes);
app.use('/calendar', calendarRoutes);
app.use('/messages', messageRoutes);
app.use('/oauth', oauthRoutes);
app.use('/upload', uploadRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/audit-logs', auditRoutes);
app.use('/setup', setupRoutes);
app.use('/notices', noticeRoutes);
app.use('/support', supportRoutes);
app.use('/admin', adminRoutes);
app.use('/locations', locationsRoutes);

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
