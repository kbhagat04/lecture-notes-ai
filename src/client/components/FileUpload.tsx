import React, { useState } from 'react';

const FileUpload: React.FC<{
    onFileUpload: (file: File) => void,
    disabled?: boolean
}> = ({ onFileUpload, disabled = false }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleUpload = () => {
        if (selectedFile) {
            onFileUpload(selectedFile);
            setSelectedFile(null);
            // Reset the file input
            const fileInput = document.getElementById('file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        }
    };

    return (
        <div className="file-upload-card">
            <div className="upload-icon">☁️</div>
            
            <div className="file-input-wrapper">
                <label htmlFor="file-input" className="file-input-label">
                    Choose File
                </label>
                <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.ppt,.pptx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    disabled={disabled}
                />
            </div>
            
            {selectedFile && (
                <div className="selected-file">
                    <span>📄</span> {selectedFile.name}
                </div>
            )}
            
            <button 
                className="action-btn"
                onClick={handleUpload} 
                disabled={!selectedFile || disabled}
            >
                {disabled ? 'Processing...' : 'Process Slides'}
            </button>
        </div>
    );
};

export default FileUpload;