// @ts-nocheck
import { Request, Response } from 'express';
import { processUploadedFile, removeFile } from '../services/fileService';
import { generateCleanNotes } from '../services/aiService';
import { generatePdfFromMarkdown } from '../services/pdfService';
import usageStore from '../services/usageStore';

const inProgressMap: Map<string, boolean> = new Map();

export const uploadSlides = async (req: Request, res: Response) => {
    const ip = (req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || 'unknown').toString();
    if (inProgressMap.get(ip)) {
        return res.status(429).json({ message: 'Another processing job is already in progress for your IP. Please wait.' });
    }

    inProgressMap.set(ip, true);
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        // Log request receipt
        console.log('Request body received for upload.');

        // Process the file in memory (no file is saved to disk)
        const fileId = await processUploadedFile(file);
        
        // Get provider from request body (if sent)
        const provider = req.body.provider;
        const model = req.body.model;

        // AI processing
        console.log(`Using AI processing with provider: ${provider || 'default'}...`);
        const notes = await generateCleanNotes(fileId, provider, model);
        
        // Remove file from memory after processing
        removeFile(fileId);

        // Increment cumulative usage for Gemini (if enabled) — use daily key so counters reset each day
        try {
            const geminiTotalEnabled = String(process.env.GEMINI_TOTAL_ENABLED || 'false').toLowerCase() === 'true';
            // Only increment when the request explicitly used Gemini as the provider.
            if (provider === 'gemini' && geminiTotalEnabled) {
                const clientIdFromBody = req.body && req.body.clientId ? String(req.body.clientId) : null;
                const ip = (req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || 'unknown').toString();
                const client = clientIdFromBody || ip;
                const day = new Date().toISOString().slice(0, 10);
                const providerKey = `gemini:${day}`;
                // best-effort increment; on error we do not fail the request
                await usageStore.incrementUsage(client, providerKey);
            }
        } catch (err) {
            console.error('Failed to increment usage store:', err);
        }

        return res.status(200).json({ 
            notes,
            fileId,
            fileName: file.originalname
        });
    } catch (error) {
        console.error('Error in uploadSlides controller:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({ 
            message: `Error processing file: ${errorMessage}`,
            details: error instanceof Error ? error.stack : undefined
        });
    } finally {
        inProgressMap.set(ip, false);
    }
};

export const getNotes = async (req: Request, res: Response) => {
    try {
        const notesId = req.params.id;
        // Logic to retrieve notes by ID can be implemented here
        // For now, we will return a placeholder response
        return res.status(200).json({ notes: 'Clean notes for the given ID.' });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({ message: `Error retrieving notes: ${errorMessage}` });
    }
};

export const downloadNotesPdf = async (req: Request, res: Response) => {
    try {
        const { markdown } = req.body;
        
        if (!markdown) {
            return res.status(400).json({ message: 'No markdown content provided.' });
        }
        
        console.log('Generating PDF from markdown...');
        const pdfBuffer = await generatePdfFromMarkdown(markdown);
        
        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=lecture-notes.pdf');
        
        // Send the PDF buffer
        return res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({ message: `Error generating PDF: ${errorMessage}` });
    }
};

export default {
    uploadSlides,
    getNotes,
    downloadNotesPdf
};