"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3_1 = require("../config/s3");
const env_1 = require("../config/env");
const uuid_1 = require("uuid");
class S3Service {
    static async uploadFile(fileBuffer, originalFilename, mimeType, folder = 'uploads') {
        await (0, s3_1.ensureBucketExists)();
        const extension = originalFilename.includes('.') ? originalFilename.split('.').pop() : 'bin';
        const key = `${folder}/${(0, uuid_1.v4)()}.${extension}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: env_1.config.s3.bucketName,
            Key: key,
            Body: fileBuffer,
            ContentType: mimeType,
        });
        await s3_1.s3Client.send(command);
        // In local development with MinIO or S3, construct direct URL or relative key
        const fileUrl = `${env_1.config.s3.endpoint}/${env_1.config.s3.bucketName}/${key}`;
        return {
            key,
            fileUrl,
            bucket: env_1.config.s3.bucketName,
        };
    }
    static async getDownloadUrl(key, expiresInSeconds = 3600) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: env_1.config.s3.bucketName,
            Key: key,
        });
        return await (0, s3_request_presigner_1.getSignedUrl)(s3_1.s3Client, command, { expiresIn: expiresInSeconds });
    }
}
exports.S3Service = S3Service;
