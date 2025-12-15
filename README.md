# Lecture Notes AI

This project is a web application that allows users to upload lecture slides and converts them into clean notes using AI. The application is structured into a client-side and server-side, with a clear separation of concerns.

## Features

- Upload lecture slides in various formats.
- AI-powered conversion of slides into concise notes.
- Display of uploaded slides and generated notes.

# Lecture Notes AI

Lightweight app to convert slide PDFs into readable study notes and ask questions about them.

Quick start
1. Install:
```bash
npm install
```
2. Run in development:
```bash
npm run dev
```
3. Open http://localhost:3000

Configuration
- `GEMINI_API_KEY` — optional, enable Gemini processing when present.
- `OPENROUTER_API_KEY` — required for chat via OpenRouter.
- `GEMINI_TOTAL_ENABLED` / `GEMINI_TOTAL_MAX_REQUESTS` — optional daily cap per user for Gemini uploads.
- `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` — in-memory windowed rate limits.

Storage
- Dev stores: `data/usage.json` and `data/notes.json` (JSON-backed). For production, use Redis or another central store.

Notes
- Chat uses OpenRouter by default (configurable) to avoid consuming Gemini credits.
- The server enforces basic rate limits and daily caps; consider adding account-based quotas for public deployments.

License: MIT
