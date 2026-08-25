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
exports.default = router;
