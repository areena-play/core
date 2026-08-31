import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Resolve .env file from process.cwd() or walking up to monorepo root
const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../../../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../.env'),
];

for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        break;
    }
}
dotenv.config();

export const config = {
    port: parseInt(process.env.BACKEND_PORT || '4000', 10),
    jwtSecret: process.env.JWT_SECRET || '',
    databaseUrl:
        process.env.DATABASE_URL || '',
    redisUrl: process.env.REDIS_URL || '',
    internalApiSecret: process.env.INTERNAL_API_SECRET || '',
    s3: {
        endpoint: process.env.S3_ENDPOINT || undefined,
        region: process.env.AWS_REGION || process.env.MINIO_REGION || '',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.MINIO_USER || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.MINIO_PASS || '',
        bucketName: process.env.AWS_BUCKET_NAME || process.env.MINIO_BUCKET_NAME || '',
    },
    isDemo: process.env.IS_DEMO === 'true',
    supportEmail: process.env.AREENA_SUPPORT_EMAIL || 'support@areena.ch',
    smtp: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '',
        from: process.env.SMTP_FROM || 'AREENA Platform <no-reply@areena.ch>',
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    },
    mailgun: {
        apiKey: process.env.MAILGUN_API_KEY || '',
        domain: process.env.MAILGUN_DOMAIN || '',
        url: process.env.MAILGUN_HOST || (process.env.MAILGUN_EU === 'true' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'),
        from: process.env.MAILGUN_FROM || process.env.SMTP_FROM || 'AREENA Platform <no-reply@areena.ch>',
    },
};

export default config;
