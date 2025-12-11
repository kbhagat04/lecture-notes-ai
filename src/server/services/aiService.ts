import { getFileBuffer, getFileMetadata } from './fileService';
import { processLectureSlides } from './geminiService';
import { processWithOpenRouter } from './openRouterService';

// AI service implementation
export const generateCleanNotes = async (fileId: string, provider?: string, model?: string): Promise<string> => {
    try {
        // Get file metadata and buffer from in-memory storage
        const fileMetadata = getFileMetadata(fileId);
        const fileBuffer = getFileBuffer(fileId);
        
        if (!fileMetadata || !fileBuffer) {
            throw new Error('File not found in memory');
        }
        
        console.log(`Processing in-memory file: ${fileMetadata.originalName} (${fileMetadata.size} bytes)`);
        console.log(`File MIME type: ${fileMetadata.mimeType}`);
        
        let notes: string;
        
        // Determine which provider to use
        // 1. Use passed provider if valid
        // 2. Fallback to env var
        // 3. Default to gemini
        const selectedProvider = (provider === 'openrouter' || provider === 'gemini') 
            ? provider 
            : (process.env.AI_PROVIDER === 'openrouter' ? 'openrouter' : 'gemini');

        // Check which provider to use
        if (selectedProvider === 'openrouter') {
            console.log(`Processing with OpenRouter (Model: ${model || 'default'})...`);
            notes = await processWithOpenRouter(
                fileBuffer,
                fileMetadata.mimeType,
                fileMetadata.originalName,
                model
            );
            console.log('OpenRouter processing successful!');
        } else {
            // Default to Gemini
            console.log('Processing with Gemini AI...');
            notes = await processLectureSlides(
                fileBuffer, 
                fileMetadata.mimeType, 
                fileMetadata.originalName
            );
            console.log('Gemini processing successful!');
        }

        return notes;
    } catch (error) {
        console.error('Error generating clean notes:', error);
        // Surface the underlying error message when possible
        const message = error instanceof Error ? error.message : 'Failed to generate clean notes';
        throw new Error(message);
    }
};
