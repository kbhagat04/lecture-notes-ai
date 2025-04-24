import React from 'react';

interface SlidesProps {
    file: File;
}

const Slides: React.FC<SlidesProps> = ({ file }) => {
    // Function to get a file icon based on file type
    const getFileIcon = (mimeType: string): string => {
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
        if (mimeType.includes('image')) return '🖼️';
        return '📁';
    };

    // Function to format file size in a readable way
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    return (
        <div className="slides-container">
            <h2>Uploaded Slide File</h2>
            <div className="file-info">
                <p><strong>{getFileIcon(file.type)} File name:</strong> {file.name}</p>
                <p><strong>File type:</strong> {file.type || 'Unknown'}</p>
                <p><strong>File size:</strong> {formatFileSize(file.size)}</p>
                <p><strong>Last modified:</strong> {new Date(file.lastModified).toLocaleString()}</p>
            </div>
            <p className="note">Your file is being processed. The AI-generated notes will appear below when ready.</p>
        </div>
    );
};

export default Slides;