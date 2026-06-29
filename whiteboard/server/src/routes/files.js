import { Router } from 'express';
import multer from 'multer';
import { Room } from '../models/Room.js';
import { storage } from '../services/storage.js';
import { requireGuest } from '../middleware/auth.js';
import { env } from '../config/env.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_MB * 1024 * 1024 },
});

// POST /api/files/:code  (multipart field "file") -> { fileId, originalName, contentType }
router.post('/files/:code', requireGuest, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const { id } = await storage.save({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      metadata: {
        roomId: room._id.toString(),
        authorId: req.user.userId,
        originalName: req.file.originalname,
        contentType: req.file.mimetype,
      },
    });

    res.status(201).json({
      fileId: id.toString(),
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/files/:id -> streams the file
router.get('/files/:id', requireGuest, async (req, res, next) => {
  try {
    const file = await storage.stat(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    res.setHeader('Content-Type', file.contentType || file.metadata?.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', file.length);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.metadata?.originalName || file.filename)}"`
    );
    storage
      .openDownloadStream(req.params.id)
      .on('error', () => res.status(404).end())
      .pipe(res);
  } catch (e) {
    next(e);
  }
});

export default router;
