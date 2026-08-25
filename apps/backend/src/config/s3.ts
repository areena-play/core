import { S3Client, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { config } from './env';

export const s3Client = new S3Client({
    region: config.s3.region,
    endpoint: config.s3.endpoint,
    forcePathStyle: true,
    credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
    },
});

export async function ensureBucketExists() {
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: config.s3.bucketName }));
    } catch (err: any) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            try {
                await s3Client.send(new CreateBucketCommand({ Bucket: config.s3.bucketName }));
                console.log(`[S3/MinIO] Bucket "${config.s3.bucketName}" created successfully.`);
            } catch (createErr: any) {
                console.warn(`[S3/MinIO] Could not create bucket: ${createErr.message}`);
            }
        }
    }
}
