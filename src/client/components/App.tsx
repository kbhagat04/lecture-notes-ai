import React, { useState } from 'react';
import FileUpload from './FileUpload';
import Notes from './Notes';
import Slides from './Slides';
import axios, { AxiosError } from 'axios';
// @ts-ignore
import html2pdf from 'html2pdf.js';

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
    const [pdfGenerating, setPdfGenerating] = useState(false);

    const handleFileUpload = async (file: File) => {
        setSlides(file);
        setLoading(true);
        setError('');
        setSuccess(false);
        setNotes('');
        
        // Create form data to send to the API
        const formData = new FormData();
        formData.append('file', file);
        
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
            
            const element = document.getElementById('notes-content');
            if (!element) {
                throw new Error('Notes content not found');
            }

            const opt = {
                margin:       0.5,
                filename:     `notes-${slides?.name.split('.')[0] || 'lecture'}.pdf`,
                image:        { type: 'jpeg' as const, quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
            };

            await html2pdf().set(opt).from(element).save();
            
        } catch (err) {
            console.error('Error downloading PDF:', err);
            setError('Failed to download PDF. Please try again.');
        } finally {
            setPdfGenerating(false);
        }
    };

    return (
        <div className="app">
            <header className="app-header">
                <div className="header-content">
                    <div className="logo">
                        <span>📚</span> Lecture Notes AI
                    </div>
                </div>
            </header>
            
            <main className="main-content">
                <div className="hero-text">
                    <h1>Transform Slides into Notes</h1>
                    <p>Upload your lecture slides and let AI generate comprehensive, structured study notes in seconds.</p>
                </div>
                
                <FileUpload onFileUpload={handleFileUpload} />
                
                {loading && (
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <div className="loading-text">Processing your slides...</div>
                        <div className="loading-subtext">The AI is analyzing content and generating comprehensive notes.</div>
                    </div>
                )}
                
                {error && (
                    <div className="error-message">
                        <span>⚠️</span> {error}
                    </div>
                )}
                
                {slides && !loading && <Slides file={slides} />}
                
                {notes && !loading && (
                    <Notes notes={notes} />
                )}
                
                {pdfGenerating && (
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <div className="loading-text">Generating PDF...</div>
                        <div className="loading-subtext">Preparing your document for download.</div>
                    </div>
                )}
                
                {success && notes && !loading && (
                    <div className="action-bar">
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
                            className="action-btn secondary"
                            disabled={pdfGenerating}
                        >
                            Download Markdown
                        </button>
                        <button 
                            onClick={handleDownloadPdf}
                            className="action-btn"
                            disabled={pdfGenerating}
                        >
                            {pdfGenerating ? 'Generating...' : 'Download PDF'}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;