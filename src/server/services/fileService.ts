import path from 'path';

// In-memory storage for file data (for demo purposes)
// In a production app, you might use a database or cloud storage
interface FileMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  uploadDate: Date;
}

// In-memory storage of files (will be cleared when server restarts)
const fileStore: Map<string, FileMetadata> = new Map();

export const processUploadedFile = async (file: Express.Multer.File): Promise<string> => {
  // Generate a unique ID for the file
  const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  
  // Store file metadata and buffer in memory
  fileStore.set(fileId, {
    id: fileId,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    buffer: file.buffer,
    uploadDate: new Date()
  });
  
  console.log(`File processed in-memory. ID: ${fileId}, Name: ${file.originalname}`);
  
  // Return the file ID which can be used to reference this file
  return fileId;
};

export const getFileMetadata = (fileId: string): FileMetadata | undefined => {
  return fileStore.get(fileId);
};

export const getFileBuffer = (fileId: string): Buffer | undefined => {
  const file = fileStore.get(fileId);
  return file ? file.buffer : undefined;
};

export const removeFile = (fileId: string): boolean => {
  return fileStore.delete(fileId);
};