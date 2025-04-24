import React, { useState } from 'react';

const FileUpload: React.FC<{ 
    onFileUpload: (file: File, useAI: boolean) => void 
}> = ({ onFileUpload }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [useAI, setUseAI] = useState(true);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleUpload = () => {
        if (selectedFile) {
            onFileUpload(selectedFile, useAI);
            setSelectedFile(null);
            // Reset the file input
            const fileInput = document.getElementById('file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        }
    };

    return (
        <div className="file-upload">
            <label htmlFor="file-input" className="file-input-label">
                Choose File
            </label>
            <input
                id="file-input"
                type="file"
                accept=".pdf,.ppt,.pptx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
            />
            {selectedFile && (
                <div className="file-name-display">
                    Selected: {selectedFile.name}
                </div>
            )}
            
            <div className="ai-toggle" style={{ margin: '15px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <label className="toggle-label" style={{ marginRight: '10px', userSelect: 'none' }}>
                    <input
                        type="checkbox"
                        checked={useAI}
                        onChange={(e) => setUseAI(e.target.checked)}
                        style={{ marginRight: '5px' }}
                    />
                    Use AI Processing
                </label>
                {!useAI && (
                    <span style={{ color: '#6c757d', fontSize: '0.9em', fontStyle: 'italic' }}>
                        (Using mock data to save credits)
                    </span>
                )}
            </div>
            
            <button 
                className="upload-btn"
                onClick={handleUpload} 
                disabled={!selectedFile}
            >
                Process Slides
            </button>
        </div>
    );
};

export default FileUpload;