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

export default router;
