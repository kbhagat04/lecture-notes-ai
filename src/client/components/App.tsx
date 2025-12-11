import React, { useEffect, useState } from 'react';
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
    const [provider, setProvider] = useState<'gemini' | 'openrouter'>('gemini');
    // Using Gemini 2.0 Flash - the only free model that properly supports PDF input
    const openRouterModel = 'google/gemini-2.0-flash-exp:free';

    // Server config flags
    const [geminiConfigured, setGeminiConfigured] = useState<boolean>(false);
    const [geminiTotal, setGeminiTotal] = useState<{ enabled: boolean; max: number; used?: number; remaining?: number }>({ enabled: false, max: 0, used: 0, remaining: 0 });
    const [resetLocal, setResetLocal] = useState<string>('');

    // Client identifier persisted in localStorage to support per-user rate limits on the server
    const [clientId, setClientId] = React.useState<string>(() => {
        try {
            const existing = localStorage.getItem('clientId');
            if (existing) return existing;
            const id = `client_${Math.random().toString(36).substring(2, 11)}`;
            localStorage.setItem('clientId', id);
            return id;
        } catch (e) {
            return `client_${Math.random().toString(36).substring(2, 11)}`;
        }
    });

    useEffect(() => {
        // Query backend for basic config to know if Gemini is enabled or requires an admin token
        const fetchConfig = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/config`);
                if (!res.ok) return;
                const data = await res.json();
                if (typeof data.geminiConfigured === 'boolean') setGeminiConfigured(data.geminiConfigured);
                if (data.geminiTotal) {
                    setGeminiTotal({ enabled: Boolean(data.geminiTotal.enabled), max: Number(data.geminiTotal.max) || 0, used: 0, remaining: Number(data.geminiTotal.max) || 0 });
                }
                // fetch per-client usage to show remaining
                try {
                    const usageRes = await fetch(`${API_BASE_URL}/usage?clientId=${encodeURIComponent(clientId)}&provider=gemini`);
                    if (usageRes.ok) {
                        const usageData = await usageRes.json();
                        setGeminiTotal((prev) => ({ ...prev, used: usageData.used || 0, remaining: usageData.remaining }));
                    }
                } catch (err) {
                    // ignore
                }
                // If Gemini is not enabled (no API key configured) and the current provider is gemini, switch to openrouter
                if (data.geminiConfigured === false && provider === 'gemini') {
                    setProvider('openrouter');
                }
            } catch (err) {
                // Fail silently; keep defaults
                console.warn('Failed to fetch config from server', err);
            }
        };
        fetchConfig();
        // compute local reset time (next 00:00 UTC) for display
        const computeLocalReset = () => {
            const now = new Date();
            const nextUtcMidnight = new Date();
            nextUtcMidnight.setUTCDate(now.getUTCDate() + 1);
            nextUtcMidnight.setUTCHours(0, 0, 0, 0);
            const localTime = nextUtcMidnight.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
            setResetLocal(localTime);
        };
        computeLocalReset();
        const interval = setInterval(computeLocalReset, 60 * 1000);
        return () => clearInterval(interval);
        }, []);

    const handleFileUpload = async (file: File) => {
        setSlides(file);
        setLoading(true);
        setError('');
        setSuccess(false);
        setNotes('');
        
        // Create form data to send to the API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('provider', provider);
        formData.append('model', openRouterModel);
        // Attach clientId so server can enforce per-user limits
        try {
            formData.append('clientId', clientId);
        } catch (e) {
            // ignore
        }
        
        try {
            const headers: Record<string,string> = {
                'Content-Type': 'multipart/form-data',
            };

            const response = await axios.post(`${API_BASE_URL}/upload`, formData, { headers });
            
            // Update notes with response from API
            setNotes(response.data.notes);
            setSuccess(true);
            // Refresh usage after successful upload to show updated remaining
            try {
                const usageRes = await fetch(`${API_BASE_URL}/usage?clientId=${encodeURIComponent(clientId)}&provider=gemini`);
                if (usageRes.ok) {
                    const usageData = await usageRes.json();
                    setGeminiTotal((prev) => ({ ...prev, used: usageData.used || 0, remaining: usageData.remaining }));
                }
            } catch (err) {
                console.warn('Failed to refresh usage after upload', err);
            }
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
                    <div className="provider-toggle">
                        <button 
                            className={`provider-btn ${provider === 'gemini' ? 'active' : ''}`}
                            onClick={() => { if (geminiConfigured && !loading) setProvider('gemini'); }}
                            title={geminiConfigured ? "Use Google's Gemini API directly" : "Gemini is disabled on the server"}
                            disabled={!geminiConfigured || loading}
                        >
                            Gemini
                        </button>
                        {/* cap moved below upload area for better placement */}
                        <button 
                            className={`provider-btn ${provider === 'openrouter' ? 'active' : ''}`}
                            onClick={() => !loading && setProvider('openrouter')}
                            title="Use OpenRouter (Free Models)"
                            disabled={loading}
                        >
                            OpenRouter
                        </button>
                    </div>

                    {/* No admin-token UI: public Gemini usage controlled by server-side GEMINI_API_KEY and rate limits */}
                </div>
            </header>
            
            <main className="main-content">
                <div className="hero-text">
                    <h1>Transform Slides into Notes</h1>
                    <p>Upload your lecture slides and let AI generate comprehensive, structured study notes in seconds.</p>
                </div>
                
                <FileUpload onFileUpload={handleFileUpload} disabled={loading} />

                {/* Gemini cap card below the upload area */}
                {geminiTotal.enabled && (
                    <div className="gemini-cap-card">
                        <div className="gemini-cap-row">
                            <div>
                                <strong>Gemini uploads</strong>
                                <div className="cap-sub">Daily remaining: <span className="cap-nums">{geminiTotal.remaining ?? 0}</span> of {geminiTotal.max}</div>
                                <div className="cap-note">Resets daily at 00:00 UTC{resetLocal ? ` (local: ${resetLocal})` : ''}</div>
                            </div>
                            <div className="cap-actions">
                                {/* optional place for help or reset buttons later */}
                            </div>
                        </div>
                        <div className="cap-bar">
                            <div
                                className="cap-bar-fill"
                                style={{ width: `${Math.min(100, ((geminiTotal.used || 0) / Math.max(1, geminiTotal.max)) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

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