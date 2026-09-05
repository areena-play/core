import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, ensureBucketExists } from '../config/s3';
import { config } from '../config/env';
import { v4 as uuidv4 } from 'uuid';

export class S3Service {
    static async uploadFile(
        fileBuffer: Buffer,
        originalFilename: string,
        mimeType: string,
        folder: string = 'uploads',
    ) {
        await ensureBucketExists();

        const extension = originalFilename.includes('.') ? originalFilename.split('.').pop() : 'bin';
        const key = `${folder}/${uuidv4()}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: config.s3.bucketName,
            Key: key,
            Body: fileBuffer,
            ContentType: mimeType,
        });

        await s3Client.send(command);

        // Generate reliable API streaming URL for browser access (avoids MinIO private bucket/CORS/port mismatch)
        const fileUrl = `/api/upload/file/${key}`;

        return {
            key,
            fileUrl,
            bucket: config.s3.bucketName,
        };
    }

    static async getFileStream(key: string) {
        const command = new GetObjectCommand({
            Bucket: config.s3.bucketName,
            Key: key,
        });

        return await s3Client.send(command);
    }

    static async deleteFile(key: string) {
        const command = new DeleteObjectCommand({
            Bucket: config.s3.bucketName,
            Key: key,
        });

        return await s3Client.send(command);
    }

    static async getDownloadUrl(key: string, expiresInSeconds: number = 3600) {
        const command = new GetObjectCommand({
            Bucket: config.s3.bucketName,
            Key: key,
        });

        return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    }
}
