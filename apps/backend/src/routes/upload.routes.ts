import { Router, Response } from 'express';
import multer from 'multer';
import { S3Service } from '../services/s3Service';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// POST /upload - Upload a file to S3/MinIO
router.post('/', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const folder = (req.body.folder as string) || 'general';
        const result = await S3Service.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, folder);

        res.status(201).json(result);
    } catch (err: any) {
        res.status(500).json({ error: 'Upload failed', details: err.message });
    }
});

// GET /upload/file/* - Stream/serve object from S3
router.get('/file/*', async (req: any, res: Response, next) => {
    try {
        const rawKey = req.params[0] || (req.params as any)['0'] || req.url.replace(/^\/file\/?/, '').split('?')[0];
        const key = decodeURIComponent(rawKey).replace(/^\/+/, '');
        const s3Object = await S3Service.getFileStream(key);

        if (s3Object.ContentType) {
            res.setHeader('Content-Type', s3Object.ContentType);
        }
        if (s3Object.ContentLength) {
            res.setHeader('Content-Length', s3Object.ContentLength);
        }
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        if (s3Object.Body && typeof (s3Object.Body as any).pipe === 'function') {
            (s3Object.Body as any).on('error', (streamErr: any) => {
                console.error('S3 stream pipe error:', streamErr);
                if (!res.headersSent) res.status(500).json({ error: 'Stream error' });
            });
            (s3Object.Body as any).pipe(res);
        } else if (s3Object.Body && typeof (s3Object.Body as any).transformToByteArray === 'function') {
            const bytes = await (s3Object.Body as any).transformToByteArray();
            res.send(Buffer.from(bytes));
        } else {
            res.status(500).json({ error: 'Unable to read file stream' });
        }
    } catch (err: any) {
        res.status(404).json({ error: 'File not found on storage' });
    }
});

export default router;
