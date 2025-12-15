import { getFileBuffer, getFileMetadata } from './fileService';
import { processLectureSlides } from './geminiService';
import { processWithOpenRouter } from './openRouterService';

class ServiceError extends Error {
    status?: number;
    code?: string;
    retryAfter?: number | null;
    remaining?: number | null;
    constructor(message: string, opts: { status?: number; code?: string; retryAfter?: number | null; remaining?: number | null } = {}) {
        super(message);
        this.name = 'ServiceError';
        this.status = opts.status;
        this.code = opts.code;
        this.retryAfter = opts.retryAfter ?? null;
        this.remaining = opts.remaining ?? null;
    }
}

export const generateCleanNotes = async (fileId: string, provider?: string, model?: string): Promise<string> => {
    try {
        // Get file metadata and buffer from in-memory storage
        const fileMetadata = getFileMetadata(fileId);
        const fileBuffer = getFileBuffer(fileId);
        
        if (!fileMetadata || !fileBuffer) {
            throw new Error('File not found in memory');
        }
        
        // File metadata available in `fileMetadata`
        
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
            notes = await processWithOpenRouter(
                fileBuffer,
                fileMetadata.mimeType,
                fileMetadata.originalName,
                model
            );
        } else {
            notes = await processLectureSlides(
                fileBuffer, 
                fileMetadata.mimeType, 
                fileMetadata.originalName
            );
        }

        return notes;
    } catch (error) {
        console.error('Error generating clean notes:', (error as any)?.message || error);
        // Surface the underlying error message when possible
        const message = error instanceof Error ? error.message : 'Failed to generate clean notes';
        throw new Error(message);
    }
};

// Answer a question given the document notes as context
export const answerQuestion = async (context: string, question: string, provider?: string): Promise<string> => {
    try {
        const selectedProvider = (provider === 'openrouter' || provider === 'gemini') 
            ? provider 
            : (process.env.AI_PROVIDER === 'openrouter' ? 'openrouter' : 'gemini');

        const prompt = `You are an expert assistant. Use the following lecture notes as context (do not invent facts):\n\n${context}\n\nQuestion: ${question}\n\nAnswer concisely, cite relevant section headings if helpful.`;

        if (selectedProvider === 'openrouter') {
            // Use OpenRouter via the existing service by sending a chat completion-style request
            const { processWithOpenRouter } = await import('./openRouterService');
            // openRouterService is oriented to files; but it exposes a function to call OpenRouter.
            // We will call the processWithOpenRouter with a tiny fake buffer path by leveraging axios directly here instead.
            // To avoid duplicating logic, fallback to a simple HTTP call to OpenRouter chat completions.
            const axios = (await import('axios')).default;
            const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
            // Use a free OpenRouter model for chat to avoid consuming Gemini credits
            const model = 'openai/gpt-oss-20b:free';
            if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key not configured');
            let res;
            try {
                res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model,
                messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
            }, { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } });
            } catch (e: any) {
                // Normalize axios errors into ServiceError so upstream handlers can detect rate limits and retry info
                const status = e?.response?.status;
                const data = e?.response?.data || {};
                if (status === 429) {
                    const retryHeader = e?.response?.headers?.['retry-after'] || e?.response?.headers?.['Retry-After'];
                    const retrySec = retryHeader ? parseInt(retryHeader, 10) : undefined;
                    const remaining = data?.remaining ?? (e?.response?.headers?.['x-ratelimit-remaining'] ? parseInt(e.response.headers['x-ratelimit-remaining'], 10) : null);
                    throw new ServiceError(data?.message || 'OpenRouter rate limit', { status: 429, code: 'RATE_LIMIT', retryAfter: retrySec ?? null, remaining });
                }
                // For other response errors, wrap with available info
                if (status) {
                    throw new ServiceError(data?.message || `OpenRouter error ${status}`, { status, code: data?.code || 'OPENROUTER_ERROR' });
                }
                // Non-response errors (network) - rethrow as ServiceError
                throw new ServiceError(e?.message || 'OpenRouter request failed');
            }
            const choice = res.data?.choices?.[0];
            const raw = choice?.message?.content ?? choice?.text ?? null;
            if (!raw) throw new ServiceError('Invalid OpenRouter response', { code: 'INVALID_RESPONSE' });
            // If OpenRouter returns structured content, extract string pieces; otherwise stringify
            let text: string;
            if (typeof raw === 'string') text = raw;
            else if (Array.isArray(raw)) {
                text = raw.map((c: any) => (typeof c === 'string' ? c : c?.text || '')).join('');
            } else if (raw?.text) text = raw.text;
            else text = String(raw);

            // Sanitize to plain text:
            // 1) Convert HTML <br> to newlines
            // 2) Convert Markdown tables into readable numbered/bulleted lists
            // 3) Strip remaining markdown formatting and headings
            try {
                text = text.replace(/<br\s*\/?>/gi, '\n');

                // Preprocess inline table patterns: convert repeated `| |` separators into line-starting pipes
                // and ensure divider rows are on their own line. This helps with OpenRouter responses that
                // emit compact table markup without newlines.
                text = text.replace(/\|\s*\|\s*-{3,}/g, '\n|---');
                text = text.replace(/\s*\|\s*\|\s*/g, '\n|');

                // Convert markdown table blocks to readable lists
                const lines = text.split(/\r?\n/);
                const out: string[] = [];
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const next = lines[i + 1] ?? '';
                    // detect table header followed by divider like |---|---|
                    if (line.includes('|') && /^\s*\|?\s*[:\- ]+\s*(\|\s*[:\- ]+\s*)+$/m.test(next)) {
                        const headerCells = line.split('|').map(s => s.trim()).filter(Boolean);
                        // consume divider
                        i++;
                        let rowIndex = 0;
                        while (i + 1 < lines.length && (lines[i + 1] ?? '').includes('|')) {
                            i++;
                            const row = lines[i];
                            // Split columns and normalize bullet lists inside cells
                            const cols = row.split('|').map(s => s.trim()).filter(Boolean).map((c: string) => {
                                // convert bullet markers to semicolon-separated items for inline readability
                                if (c.includes('•')) return c.split('•').map((p) => p.trim()).filter(Boolean).join('; ');
                                return c;
                            });
                            rowIndex++;
                            // If first header looks like an index/number column, use numeric list
                            const firstHeader = headerCells[0] || '';
                            const isNumbered = /(^#?$|^no\.?$|^index$|^\d+$)/i.test(firstHeader) || /^\d+$/.test(cols[0] || '');
                            if (isNumbered) {
                                const num = cols[0] && /^\\b\d+\\b/.test(cols[0]) ? cols[0] : String(rowIndex);
                                // Build a compact item from remaining columns
                                const pairs = headerCells.slice(1).map((h, idx) => `${h}: ${cols[idx + 1] ?? ''}`);
                                out.push(`${num}. ${pairs.join(' — ')}`.trim());
                            } else {
                                // Bulleted with key: value pairs
                                const pairs = headerCells.map((h, idx) => `${h}: ${cols[idx] ?? ''}`);
                                out.push(`- ${pairs.join(' — ')}`);
                            }
                        }
                        continue;
                    }
                    out.push(line);
                }
                text = out.join('\n');

                // Remove remaining markdown table pipes left over
                text = text.replace(/\s*\|\s*/g, ' — ');
                // Remove markdown divider rows that might remain
                text = text.replace(/(^|\n)\s*[:\- ]{2,}(\s*\|\s*[:\- ]+)*\s*(\n|$)/g, '\n');
                // Remove bold/italic/backticks
                text = text.replace(/\*\*(.*?)\*\*/g, '$1');
                text = text.replace(/\*(.*?)\*/g, '$1');
                text = text.replace(/`+/g, '');
                // Remove heading markers but keep text
                text = text.replace(/^#{1,6}\s*/gm, '');
                // Collapse multiple blank lines
                text = text.replace(/\n{3,}/g, '\n\n');
                // Trim whitespace
                text = text.trim();
            } catch (e) {
                console.warn('Sanitization failed, returning raw text', e);
            }

            return text;
        }

        // Default to Gemini
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Gemini API key not configured');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-chat', generationConfig: { temperature: 0.2, maxOutputTokens: 1024 } });
        try {
            const result = await model.generateContent([prompt]);
            const response = await result.response;
            return response.text();
        } catch (e: any) {
            // Wrap Gemini errors as ServiceError when possible
            const msg = e?.message || 'Gemini failed';
            if (e?.code === 'RATE_LIMIT' || /rate limit|quota|throttl/i.test(String(msg).toLowerCase())) {
                throw new ServiceError(msg, { status: 429, code: 'RATE_LIMIT' });
            }
            throw new ServiceError(msg);
        }
    } catch (err) {
        console.error('answerQuestion error:', (err as any)?.message || err);
        // Ensure we throw ServiceError for consistent upstream handling
        if (err instanceof ServiceError) throw err;
        const message = err instanceof Error ? err.message : 'Answering question failed';
        throw new ServiceError(message);
    }
};
