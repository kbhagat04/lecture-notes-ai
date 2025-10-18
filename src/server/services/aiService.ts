import { getFileBuffer, getFileMetadata } from './fileService';
import { processLectureSlides } from './geminiService';

// AI service implementation with Gemini integration
export const generateCleanNotes = async (fileId: string): Promise<string> => {
    try {
        // Get file metadata and buffer from in-memory storage
        const fileMetadata = getFileMetadata(fileId);
        const fileBuffer = getFileBuffer(fileId);
        
        if (!fileMetadata || !fileBuffer) {
            throw new Error('File not found in memory');
        }
        
        console.log(`Processing in-memory file: ${fileMetadata.originalName} (${fileMetadata.size} bytes)`);
        console.log(`File MIME type: ${fileMetadata.mimeType}`);
        
        // Use Gemini to process the slides
        console.log('Processing with Gemini AI...');
        const notes = await processLectureSlides(
            fileBuffer, 
            fileMetadata.mimeType, 
            fileMetadata.originalName
        );
        console.log('Gemini processing successful!');
        return notes;
    } catch (error) {
        console.error('Error generating clean notes:', error);
        // Surface the underlying error message when possible
        const message = error instanceof Error ? error.message : 'Failed to generate clean notes';
        throw new Error(message);
    }
};
