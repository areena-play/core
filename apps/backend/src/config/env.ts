import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || process.env.BACKEND_PORT || '4000', 10),
    jwtSecret: process.env.JWT_SECRET || 'areena_jwt_secret_dev_key_2026',
    databaseUrl:
        process.env.DATABASE_URL ||
        'postgresql://areena_admin:supersecretpassword@localhost:5432/areena_db?schema=public',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    s3: {
        endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
        region: process.env.AWS_REGION || process.env.MINIO_REGION || 'eu-central-2',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.MINIO_USER || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.MINIO_PASS || 'minioadmin',
        bucketName: process.env.AWS_BUCKET_NAME || process.env.MINIO_BUCKET_NAME || 'areena-local-storage',
    },
};

export default config;
