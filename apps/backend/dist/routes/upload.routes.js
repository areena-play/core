"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const s3Service_1 = require("../services/s3Service");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit
// POST /upload - Upload a file to S3/MinIO
router.post('/', auth_1.authenticateToken, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        const folder = req.body.folder || 'general';
        const result = await s3Service_1.S3Service.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, folder);
        res.status(201).json(result);
    }
    catch (err) {
        res.status(500).json({ error: 'Upload failed', details: err.message });
    }
});
// GET /upload/file/* - Stream/serve object from S3
router.get('/file/*', async (req, res, next) => {
    try {
        const rawKey = req.params[0] || req.params['0'] || req.url.replace(/^\/file\/?/, '').split('?')[0];
        const key = decodeURIComponent(rawKey).replace(/^\/+/, '');
        const s3Object = await s3Service_1.S3Service.getFileStream(key);
        if (s3Object.ContentType) {
            res.setHeader('Content-Type', s3Object.ContentType);
        }
        if (s3Object.ContentLength) {
            res.setHeader('Content-Length', s3Object.ContentLength);
        }
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        if (s3Object.Body && typeof s3Object.Body.pipe === 'function') {
            s3Object.Body.on('error', (streamErr) => {
                console.error('S3 stream pipe error:', streamErr);
                if (!res.headersSent)
                    res.status(500).json({ error: 'Stream error' });
            });
            s3Object.Body.pipe(res);
        }
        else if (s3Object.Body && typeof s3Object.Body.transformToByteArray === 'function') {
            const bytes = await s3Object.Body.transformToByteArray();
            res.send(Buffer.from(bytes));
        }
        else {
            res.status(500).json({ error: 'Unable to read file stream' });
        }
    }
    catch (err) {
        res.status(404).json({ error: 'File not found on storage' });
    }
});
exports.default = router;
