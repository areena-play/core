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
    s3: {
        endpoint: process.env.S3_ENDPOINT || undefined,
        region: process.env.AWS_REGION || process.env.MINIO_REGION || '',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.MINIO_USER || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.MINIO_PASS || '',
        bucketName: process.env.AWS_BUCKET_NAME || process.env.MINIO_BUCKET_NAME || '',
    },
    isDemo: process.env.IS_DEMO === 'true',
    supportEmail: process.env.AREENA_SUPPORT_EMAIL || 'support@areena.ch',
    version: JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '../../../../package.json'), 'utf8')
    ).version,
};

export default config;
