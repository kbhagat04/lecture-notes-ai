import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize the Gemini API client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  console.error('WARNING: Valid GEMINI_API_KEY is not set in the .env file');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

// Extended list of supported MIME types for Gemini processing
const SUPPORTED_MIME_TYPES = [
  // Images
  'image/jpeg', 
  'image/png', 
  'image/webp',
  'image/gif',
  'image/bmp',
  // Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
  'application/vnd.ms-powerpoint', // PPT
  'application/msword', // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/plain'
];

// Helper function to convert file to base64
const fileToGenerativePart = async (buffer: Buffer, mimeType: string) => {
  // Convert buffer to base64
  const base64EncodedFile = buffer.toString('base64');
  return {
    inlineData: {
      data: base64EncodedFile,
      mimeType: convertMimeTypeIfNeeded(mimeType)
    },
  };
};

// Function to convert unsupported MIME types to ones that Gemini can process
function convertMimeTypeIfNeeded(mimeType: string): string {
  // For office documents, we'll tell Gemini it's a PDF
  // This is a hack, but might help for some file types
  if (mimeType.includes('officedocument') || 
      mimeType.includes('msword') || 
      mimeType.includes('ms-powerpoint')) {
    console.log(`Converting MIME type from ${mimeType} to application/pdf for Gemini compatibility`);
    return 'application/pdf';
  }
  return mimeType;
}

// Process lecture slides and convert them to notes using Gemini
export const processLectureSlides = async (buffer: Buffer, mimeType: string, fileName: string): Promise<string> => {
  try {
    // Check if API key is configured
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key is not properly configured. Please add your API key to the .env file.');
    }
    
    // Check if the file type is supported
    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}. Please upload a supported file format (JPEG, PNG, PDF, PPTX, etc).`);
    }
    
    console.log(`Starting Gemini processing for file: ${fileName} (${mimeType})`);
    
    // Use gemini-1.5-flash instead of the deprecated gemini-pro-vision model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
      }
    });
    
    // Safety settings
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];
    
    // Convert the file buffer to a format that Gemini API can understand
    const filePart = await fileToGenerativePart(buffer, mimeType);
    
    // The prompt for generating notes from lecture slides
    const prompt = `You are an expert note-taker for academic lectures. 
    I'm providing lecture slides that I need you to convert into comprehensive, 
    well-structured notes. Please:
    
    1. Extract all key concepts, definitions, and important points
    2. Organize the content logically with clear headings and subheadings
    3. Maintain any mathematical formulas, coding examples, or special notation
    4. Add bullet points for lists and key takeaways
    5. Format the notes in a clean, readable, markdown structure
    6. Include a brief summary at the beginning

    Here are the lecture slides from file: ${fileName}. Generate clear, concise notes from this content.`;

    console.log("Sending request to Gemini API using the gemini-1.5-flash model...");
    
    // Generate content using Gemini
    const result = await model.generateContent([prompt, filePart]);
    const response = await result.response;
    const text = response.text();
    
    console.log("Received response from Gemini API.");
    
    return text;
  } catch (error) {
    console.error("Error processing with Gemini:", error);
    // Fix the TypeScript error by properly handling the unknown type
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to process slides with Gemini: ${errorMessage}`);
  }
};