// @ts-nocheck
import { Request, Response } from 'express';
import { processUploadedFile, removeFile } from '../services/fileService';
import { generateCleanNotes } from '../services/aiService';
import { generatePdfFromMarkdown } from '../services/pdfService';

export const uploadSlides = async (req: Request, res: Response) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        // Log request receipt
        console.log('Request body received for upload.');

        // Process the file in memory (no file is saved to disk)
        const fileId = await processUploadedFile(file);
        
    // AI processing
    console.log('Using AI processing...');
        const notes = await generateCleanNotes(fileId);
        
        // Remove file from memory after processing
        removeFile(fileId);

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