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

const frontendPort = parseInt(process.env.FRONTEND_PORT || '', 10);

export const config = {
    appBaseUrl: process.env.APP_BASE_URL || `https://${process.env.DOMAIN_NAME}`,
    domain: process.env.DOMAIN_NAME || '',
    port: parseInt(process.env.BACKEND_PORT || '', 10),
    jwtSecret: process.env.JWT_SECRET || '',
    databaseUrl: process.env.DATABASE_URL || '',
    redisUrl: process.env.REDIS_URL || '',
    s3: {
        endpoint: process.env.AWS_ENDPOINT || process.env.S3_ENDPOINT || undefined,
        region: process.env.MINIO_REGION || process.env.AWS_REGION || process.env.S3_REGION || '',
        accessKeyId: process.env.MINIO_USER || process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.MINIO_PASS || process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || '',
        bucketName: process.env.MINIO_BUCKET_NAME || process.env.AWS_BUCKET_NAME || process.env.S3_BUCKET_NAME || '',
    },
    isDemo: process.env.IS_DEMO === 'true',
    supportEmail: process.env.AREENA_SUPPORT_EMAIL || '',
    version: JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '../../../../package.json'), 'utf8')
    ).version,
};

export default config;
