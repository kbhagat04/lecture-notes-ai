import { Request, Response } from 'express';
import { processUploadedFile, getFileMetadata, removeFile } from '../services/fileService';
import { generateCleanNotes, generateMockNotes } from '../services/aiService';

export const uploadSlides = async (req: Request, res: Response) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        // Debug: Log the entire request body to see what's being received
        console.log('Request body:', req.body);
        
        // Check if AI processing should be used
        const useAIParam = req.body.useAI;
        const useAI = useAIParam !== 'false';
        
        // Debug: Log the parsed parameters
        console.log(`useAI parameter received: "${useAIParam}" (${typeof useAIParam})`);
        console.log(`Processing file with AI: ${useAI ? 'Yes' : 'No'}`);

        // Process the file in memory (no file is saved to disk)
        const fileId = await processUploadedFile(file);
        
        // Generate notes based on useAI parameter
        let notes;
        if (useAI) {
            console.log('Using AI processing...');
            notes = await generateCleanNotes(fileId);
        } else {
            console.log('Using mock notes (AI disabled)...');
            notes = await generateMockNotes(fileId);
        }
        
        // Remove file from memory after processing
        removeFile(fileId);

        return res.status(200).json({ 
            notes,
            fileId,
            fileName: file.originalname,
            aiProcessed: useAI
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