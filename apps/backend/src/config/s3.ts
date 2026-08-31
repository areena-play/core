import { S3Client, CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
import { config } from './env';

export const s3Client = new S3Client({
    region: config.s3.region,
    ...(config.s3.endpoint ? { endpoint: config.s3.endpoint } : {}),
    forcePathStyle: Boolean(config.s3.endpoint),
    credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
    },
});

/**
 * This function sets a public read policy on the S3 bucket, allowing anyone to read objects from the bucket.
 * It constructs a policy object and sends a PutBucketPolicyCommand to the S3 client. If the operation is
 * successful, it logs a confirmation message; if it fails, it logs a warning with the error message.
 * 
 * For AWS S3 will usually fail, as default is that the policies cannot be changed. As long as access to the
 * bucket is proxied via the backend, this is not a problem. This way, the backend can restrict access to the
 * bucket and only allow access to the files that are meant to be public. On the other hand, this way the backend
 * has to take the load of serving the files.
 * 
 * It could be circumvented by creating temporary signed URLs for the files, but this would require a lot of changes
 *  to the frontend and backend, and would also require a lot of changes to the way the files are served. For now,
 * we will keep it simple and just serve the files via the backend.
 */
export async function setBucketPublicPolicy() {
    const policy = {
        Version: '2012-10-17',
        Statement: [
            {
                Sid: 'PublicReadGetObject',
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${config.s3.bucketName}/*`],
            },
        ],
    };

    try {
        await s3Client.send(
            new PutBucketPolicyCommand({
                Bucket: config.s3.bucketName,
                Policy: JSON.stringify(policy),
            }),
        );
        console.log(`[S3/MinIO] Public read policy configured on bucket "${config.s3.bucketName}".`);
    } catch (err: any) {
        console.warn(`[S3/MinIO] Notice on setting bucket policy: ${err.message}`);
    }
}

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

    await setBucketPublicPolicy();
}
