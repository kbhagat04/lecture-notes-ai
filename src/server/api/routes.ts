// @ts-nocheck
import express from 'express';
// Import controllers directly from the module file
import controllers from './controllers'; 
import multer from 'multer';

// Fix the Router issue by using a different syntax that TypeScript can understand
const router = express.Router?.() || require('express').Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// File upload endpoint
router.post('/upload', upload.single('file'), controllers.uploadSlides);

// Get notes by ID
router.get('/notes/:id', controllers.getNotes);

// Health check endpoint for Render.com
router.get('/health', (req: any, res: any) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;