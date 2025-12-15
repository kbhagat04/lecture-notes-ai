# Lecture Notes AI

Lightweight web app to convert lecture slides (PDFs) into clean, readable study notes and ask questions about them.

**Features**
- Upload slide decks and generate structured notes.
- In-app Q&A over generated notes (chat uses OpenRouter by default to avoid consuming Gemini credits).
- Per-client rate limiting and optional daily Gemini upload caps.

## Local Development

**Quick start**
1. Install dependencies:
```bash
npm install
```
2. Run development servers (starts server + client):
```bash
npm run dev
```
3. Open the app at http://localhost:3000

**Configuration (env)**
- `OPENROUTER_API_KEY` — required for chat via OpenRouter.
- `GEMINI_API_KEY` — optional; enable Gemini processing when present.
- `GEMINI_TOTAL_ENABLED` / `GEMINI_TOTAL_MAX_REQUESTS` — daily cap per client for Gemini uploads.
- `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` — windowed in-memory rate limits.

**Storage**
- Dev: JSON-backed stores under `data/` (`data/usage.json`, `data/notes.json`).
- Production: use Redis or another central store for persistence and distributed rate limits.

**Notes**
- Chat is routed to OpenRouter by default to conserve Gemini credits. Uploads processed with Gemini will consume the configured Gemini quota if enabled.
- The server implements both windowed in-memory rate limiting and an optional daily cumulative cap for Gemini uploads; consider adding account-level quotas for public deployments.

## Troubleshooting
- Chat errors (e.g., "Failed to answer question" or 429 responses): often caused by rate limiting. Check the browser Network tab for a `429` status or a `Retry-After` header, and the server logs for rate-limit messages. For local development you can increase `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MS` or disable the Gemini total cap.

- Upload failures using Gemini: confirm `GEMINI_API_KEY` is set and you have remaining daily quota (if `GEMINI_TOTAL_ENABLED` is on). Use the `/api/usage?clientId=<yourClientId>&provider=gemini` endpoint to inspect usage.

- If the Docs link shows unexpected content, open the backend route directly at `http://localhost:5003/api/docs` to verify the server is serving the README.

**License**
- MIT
