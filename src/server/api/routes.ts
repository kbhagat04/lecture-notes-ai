// @ts-nocheck
import express from 'express';
import controllers from './controllers';
import multer from 'multer';
import usageStore from '../services/usageStore';
import notesStore from '../services/notesStore';

const router = express.Router?.() || require('express').Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// In-memory rate limiter (per-client and provider)
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'); // default 1 minute
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10');
// Optional stricter defaults for Gemini to protect API usage
const GEMINI_RATE_LIMIT_WINDOW_MS = parseInt(process.env.GEMINI_RATE_LIMIT_WINDOW_MS || String(RATE_LIMIT_WINDOW_MS));
const GEMINI_RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.GEMINI_RATE_LIMIT_MAX_REQUESTS || '5');
// Optional total (cumulative) limit per-client for Gemini
const GEMINI_TOTAL_ENABLED = String(process.env.GEMINI_TOTAL_ENABLED || 'false').toLowerCase() === 'true';
const GEMINI_TOTAL_MAX_REQUESTS = parseInt(process.env.GEMINI_TOTAL_MAX_REQUESTS || '0');

type RateEntry = { count: number; firstRequestTs: number };
// Keyed by `${ip}:${provider}` to allow per-provider limits
const rateMap: Map<string, RateEntry> = new Map();

const rateLimiter = (req: any, res: any, next: any) => {
    try {
        const ip = (req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || 'unknown').toString();
        // provider will be present in multipart fields after multer runs
        const provider = (req.body && req.body.provider) ? String(req.body.provider) : 'all';
        // Prefer a client-generated id (sent by the frontend) to enable per-user limits.
        // Fall back to IP when clientId absent.
        const clientIdFromBody = req.body && req.body.clientId ? String(req.body.clientId) : null;
        const client = clientIdFromBody || ip;
        const now = Date.now();

        const key = `${client}:${provider}`;
        const entry = rateMap.get(key);

        // Select window and max based on provider
        const windowMs = provider === 'gemini' ? GEMINI_RATE_LIMIT_WINDOW_MS : RATE_LIMIT_WINDOW_MS;
        const maxReqs = provider === 'gemini' ? GEMINI_RATE_LIMIT_MAX_REQUESTS : RATE_LIMIT_MAX_REQUESTS;

        if (!entry) {
            rateMap.set(key, { count: 1, firstRequestTs: now });
            return next();
        }

        // If window expired, reset
        if (now - entry.firstRequestTs > windowMs) {
            rateMap.set(key, { count: 1, firstRequestTs: now });
            return next();
        }

        // Otherwise increment and check
        entry.count += 1;
        if (entry.count > maxReqs) {
            res.status(429).json({ message: 'Too many requests. Please slow down.' });
            return;
        }

        rateMap.set(key, entry);
        return next();
    } catch (err) {
        console.error('Rate limiter error:', (err as any)?.message || err);
        return next();
    }
};

// Total (cumulative) limiter middleware - checks persisted usage store
const totalLimiter = async (req: any, res: any, next: any) => {
    try {
        const provider = (req.body && req.body.provider) ? String(req.body.provider) : 'all';
        const clientIdFromBody = req.body && req.body.clientId ? String(req.body.clientId) : null;
        const ip = (req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || 'unknown').toString();
        const client = clientIdFromBody || ip;

        // Only enforce the total cap for Gemini when enabled
        if (provider === 'gemini' && GEMINI_TOTAL_ENABLED && GEMINI_TOTAL_MAX_REQUESTS > 0) {
            // Use a date-keyed counter so the limit resets daily
            const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            const providerKey = `gemini:${day}`;
            const used = await usageStore.getUsage(client, providerKey);
            if (used >= GEMINI_TOTAL_MAX_REQUESTS) {
                res.status(429).json({ message: 'Daily Gemini upload limit reached for your account.' });
                return;
            }
        }

        return next();
    } catch (err) {
        console.error('Total limiter error:', (err as any)?.message || err);
        return next();
    }
};

// Middleware to ensure Gemini is available when requested (checks API key presence).
// Unlike before, this does NOT require an admin token — public Gemini usage is allowed
// when `GEMINI_API_KEY` is present. Admin token can still be used for extra access control if desired.
const checkGeminiConfigured = (req: any, res: any, next: any) => {
    try {
        const provider = req.body?.provider || req.query?.provider;
        if (!provider || provider !== 'gemini') return next();

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
            return res.status(503).json({ message: 'Gemini API is not configured on the server.' });
        }

        // Allow public access — rate limiter will protect abuse.
        return next();
    } catch (err) {
        console.error('Gemini config check error:', (err as any)?.message || err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// File upload endpoint: multer first to parse multipart/form-data (gives access to req.body.provider), then rate limiter and Gemini check
// Order: multer to parse form, then total (cumulative) limiter, then windowed rate limiter and provider check
router.post('/upload', upload.single('file'), totalLimiter, rateLimiter, checkGeminiConfigured, controllers.uploadSlides);

// Get notes by ID
router.get('/notes/:id', controllers.getNotes);

// Minimal config endpoint for frontend to know whether Gemini is enabled
router.get('/config', (req: any, res: any) => {
    const geminiConfigured = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
    // Provide flags and rate limit info so frontend can adjust UI
    res.json({
        geminiConfigured,
        // Public Gemini usage is allowed when a GEMINI_API_KEY is configured; rate limiting protects abuse
        geminiEnabled: geminiConfigured,
        rateLimit: { windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX_REQUESTS },
        geminiRateLimit: { windowMs: GEMINI_RATE_LIMIT_WINDOW_MS, max: GEMINI_RATE_LIMIT_MAX_REQUESTS },
        geminiTotal: { enabled: GEMINI_TOTAL_ENABLED, max: GEMINI_TOTAL_MAX_REQUESTS, period: 'daily' }
    });
});

// Usage endpoint to return cumulative usage for a client (useful for showing remaining uploads)
router.get('/usage', async (req: any, res: any) => {
        try {
            const clientIdFromQuery = req.query?.clientId ? String(req.query.clientId) : null;
            const provider = req.query?.provider ? String(req.query.provider) : 'gemini';
            const ip = (req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || 'unknown').toString();
            const client = clientIdFromQuery || ip;

            let used = 0;
            if (provider === 'gemini') {
                // report today's usage so UI shows remaining for daily cap
                const day = new Date().toISOString().slice(0, 10);
                used = await usageStore.getUsage(client, `gemini:${day}`);
            } else {
                used = await usageStore.getUsage(client, provider);
            }

            const max = provider === 'gemini' ? GEMINI_TOTAL_MAX_REQUESTS : RATE_LIMIT_MAX_REQUESTS;
            const enabled = provider === 'gemini' ? GEMINI_TOTAL_ENABLED : false;
            const remaining = max > 0 ? Math.max(0, max - used) : Infinity;

            return res.json({ client, provider, used, max, remaining, enabled });
    } catch (err) {
        console.error('Error in /usage route:', (err as any)?.message || err);
        return res.status(500).json({ message: 'Failed to get usage' });
    }
});

// Health check endpoint for Render.com
router.get('/health', (req: any, res: any) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the local README.md as plain text for a simple in-app docs view
router.get('/docs', async (req: any, res: any) => {
        try {
                const fs = await import('fs/promises');
                const path = await import('path');
                const mdLib = await import('markdown-it');
                const root = path.resolve(process.cwd());
                const readmePath = path.join(root, 'README.md');
                const mdContent = await fs.readFile(readmePath, 'utf8');

                const md = new mdLib.default({ html: true, linkify: true, typographer: true });
                const htmlBody = md.render(mdContent || '');

                // Return only the rendered markdown fragment so the client modal
                // can apply site-wide theming (dark mode) and not be overridden
                // by a standalone page's CSS.
                const fragment = `<div class="docs-fragment">${htmlBody}</div>`;
                res.type('text/html').send(fragment);
        } catch (err) {
                console.error('Failed to load README for /docs route:', (err as any)?.message || err);
                res.status(500).json({ message: 'Failed to load docs' });
        }
});

// Add this route to your routes
router.post('/download-pdf', controllers.downloadNotesPdf);

// Chat endpoint: ask a question about a previously uploaded file
router.post('/chat', async (req: any, res: any) => {
    try {
        const { fileId, question, provider } = req.body || {};
        if (!fileId || !question) return res.status(400).json({ message: 'fileId and question are required' });
        const notes = await notesStore.getNotes(fileId);
        if (!notes) return res.status(404).json({ message: 'Notes for fileId not found. Generate notes first.' });
        // Use aiService to answer. Force OpenRouter for chat to avoid consuming Gemini credits.
        const { answerQuestion } = await import('../services/aiService');
        const answer = await answerQuestion(notes, question, 'openrouter');
        return res.json({ answer });
    } catch (err) {
        console.error('Chat error:', (err as any)?.message || err);
        // If the AI service returned a structured error or retry info, surface it with a suitable status code
        const e: any = err || {};
        const msg = e.message || 'Failed to answer question';

        // Detect rate-limit-like responses even if thrown as a generic error
        const isRateLimit = e.status === 429 || /rate limit|quota|throttl/i.test(String(msg).toLowerCase()) || e.code === 'RATE_LIMIT';
        if (isRateLimit) {
            const retryAfter = e.retryAfter || e.retry || null;
            const remaining = e.remaining || null;
            const payload: any = { message: msg, code: 'rate_limit' };
            if (retryAfter) payload.retryAfter = retryAfter;
            if (remaining !== null) payload.remaining = remaining;
            return res.status(429).json(payload);
        }

        // For other known structured errors, pass through message and code when available (avoid leaking stacks)
        if (e.code) {
            return res.status(e.status || 500).json({ message: msg, code: e.code });
        }

        return res.status(500).json({ message: msg });
    }
});

export default router;