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
        <div className="slides-card">
            <div className="file-icon">{getFileIcon(file.type)}</div>
            <div className="file-details">
                <h3>{file.name}</h3>
                <div className="file-meta">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{file.type || 'Unknown Type'}</span>
                </div>
            </div>
        </div>
    );
};

export default Slides;