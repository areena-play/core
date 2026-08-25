"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Client = void 0;
exports.ensureBucketExists = ensureBucketExists;
const client_s3_1 = require("@aws-sdk/client-s3");
const env_1 = require("./env");
exports.s3Client = new client_s3_1.S3Client({
    region: env_1.config.s3.region,
    endpoint: env_1.config.s3.endpoint,
    forcePathStyle: true,
    credentials: {
        accessKeyId: env_1.config.s3.accessKeyId,
        secretAccessKey: env_1.config.s3.secretAccessKey,
    },
});
async function ensureBucketExists() {
    try {
        await exports.s3Client.send(new client_s3_1.HeadBucketCommand({ Bucket: env_1.config.s3.bucketName }));
    }
    catch (err) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            try {
                await exports.s3Client.send(new client_s3_1.CreateBucketCommand({ Bucket: env_1.config.s3.bucketName }));
                console.log(`[S3/MinIO] Bucket "${env_1.config.s3.bucketName}" created successfully.`);
            }
            catch (createErr) {
                console.warn(`[S3/MinIO] Could not create bucket: ${createErr.message}`);
            }
        }
    }
}
