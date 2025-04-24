import express from 'express';
import { uploadSlides, getNotes } from './controllers';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// File upload endpoint
router.post('/upload', upload.single('file'), uploadSlides);

// Get notes by ID
router.get('/notes/:id', getNotes);

// Health check endpoint for Render.com
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;