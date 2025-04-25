import React, { useState } from 'react';
import FileUpload from './FileUpload';
import Notes from './Notes';
import Slides from './Slides';
import axios, { AxiosError } from 'axios';

// API base URL - automatically detect if we're in production or development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? '/api' 
    : 'http://localhost:5003/api';

const App = () => {
    const [slides, setSlides] = useState<File | null>(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [aiUsed, setAiUsed] = useState(true);
    const [pdfGenerating, setPdfGenerating] = useState(false);

    const handleFileUpload = async (file: File, useAI: boolean) => {
        setSlides(file);
        setLoading(true);
        setError('');
        setSuccess(false);
        setNotes('');
        setAiUsed(useAI);
        
        // Create form data to send to the API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('useAI', useAI.toString());
        
        try {
            const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            // Update notes with response from API
            setNotes(response.data.notes);
            setSuccess(true);
        } catch (err) {
            console.error('Error uploading file:', err);
            // Show more detailed error message if available from the server
            if (axios.isAxiosError(err)) {
                // Now TypeScript knows err is an AxiosError
                const axiosError = err as AxiosError<{message: string}>;
                if (axiosError.response?.data && 'message' in axiosError.response.data) {
                    setError(`Error: ${axiosError.response.data.message}`);
                } else {
                    setError('Failed to process the file. Please try again.');
                }
            } else {
                setError('Failed to process the file. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        try {
            setPdfGenerating(true);
            setError('');
            
            const response = await axios.post(
                `${API_BASE_URL}/download-pdf`, 
                { markdown: notes },
                { responseType: 'blob' }
            );
            
            // Create a download link
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `notes-${slides?.name.split('.')[0] || 'lecture'}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {
            console.error('Error downloading PDF:', err);
            setError('Failed to download PDF. Please try again.');
        } finally {
            setPdfGenerating(false);
        }
    };

    return (
        <div className="app">
            <h1>Lecture Notes AI</h1>
            <p>Upload your lecture slides to convert them into clean, structured notes using AI.</p>
            
            <FileUpload onFileUpload={handleFileUpload} />
            
            {loading && (
                <div className="loading">
                    <p>Processing your slides... This may take a moment.</p>
                    {aiUsed ? (
                        <p>The AI is analyzing your content and generating comprehensive notes.</p>
                    ) : (
                        <p>Generating mock notes to save API credits.</p>
                    )}
                </div>
            )}
            
            {error && <div className="error">{error}</div>}
            
            {slides && !loading && <Slides file={slides} />}
            
            {notes && !loading && (
                <>
                    <Notes notes={notes} />
                    {!aiUsed && (
                        <div style={{ textAlign: 'center', margin: '10px 0', padding: '8px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px' }}>
                            <p style={{ margin: '0' }}>⚠️ Note: These are mock notes generated without AI processing.</p>
                        </div>
                    )}
                </>
            )}
            
            {pdfGenerating && (
                <div className="loading pdf-loading">
                    <div className="spinner"></div>
                    <p>Generating your PDF...</p>
                    <p className="loading-hint">This may take a few moments</p>
                </div>
            )}
            
            {success && notes && !loading && (
                <div style={{ textAlign: 'center', margin: '20px 0', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                    <button 
                        onClick={() => {
                            const blob = new Blob([notes], { type: 'text/markdown' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `notes-${slides?.name.split('.')[0] || 'lecture'}.md`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                        }}
                        className="upload-btn"
                        style={{ marginTop: '20px' }}
                        disabled={pdfGenerating}
                    >
                        Download as Markdown
                    </button>
                    <button 
                        onClick={handleDownloadPdf}
                        className="upload-btn"
                        style={{ marginTop: '20px', backgroundColor: '#3d5a80' }}
                        disabled={pdfGenerating}
                    >
                        {pdfGenerating ? 'Generating PDF...' : 'Download as PDF'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default App;