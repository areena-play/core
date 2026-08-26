import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
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

const app = express();

// Middlewares
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'areena-backend',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

// Mount Routes
app.use('/auth', authRoutes);
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

// Global Error Handler
app.use(errorHandler);

const PORT = config.port;

app.listen(PORT, () => {
    console.log(`[AREENA Backend] Server listening on port ${PORT}`);
    console.log(`[AREENA Backend] Environment: ${process.env.NODE_ENV || 'development'}`);
    ensureBucketExists().catch((err) => {
        console.warn(`[AREENA S3] Bucket initialization notice: ${err.message}`);
    });
});

export default app;
