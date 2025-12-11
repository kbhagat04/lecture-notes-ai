# Lecture Notes AI

This project is a web application that allows users to upload lecture slides and converts them into clean notes using AI. The application is structured into a client-side and server-side, with a clear separation of concerns.

## Features

- Upload lecture slides in various formats.
- AI-powered conversion of slides into concise notes.
- Display of uploaded slides and generated notes.

## Project Structure

```
lecture-notes-ai
├── src
│   ├── client
│   │   ├── components
│   │   │   ├── App.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── Notes.tsx
│   │   │   └── Slides.tsx
│   │   ├── styles
│   │   │   └── index.css
│   │   └── index.tsx
│   ├── server
│   │   ├── api
│   │   │   ├── routes.ts
│   │   │   └── controllers.ts
│   │   ├── services
│   │   │   ├── aiService.ts
│   │   │   └── fileService.ts
│   │   └── index.ts
│   └── types
│       └── index.ts
├── public
│   └── index.html
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

To get started with the project, follow these steps:

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/lecture-notes-ai.git
   ```

2. Navigate to the project directory:
   ```
   cd lecture-notes-ai
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and go to `http://localhost:3000` to access the application.

## Usage

- Use the file upload component to select and upload your lecture slides.
- The application will process the slides and generate clean notes.
- View the uploaded slides and the generated notes in the respective components.

## Security & API key safeguards

This project can use Google's Gemini API. To avoid exposing your Gemini API key to the public, the server expects you to set a `GEMINI_API_KEY` in your environment to enable Gemini processing.
Rate limiting: The server includes a windowed in-memory rate limiter for the upload route and an optional daily cumulative cap for Gemini. The app uses a frontend-generated `clientId` (stored in `localStorage`) to apply per-user limits. When `clientId` is not available the server falls back to the request IP.

Environment variables (most relevant):
- `RATE_LIMIT_WINDOW_MS` (default: `60000`) — window size in ms for general rate limiting.
- `RATE_LIMIT_MAX_REQUESTS` (default: `10`) — max requests per `RATE_LIMIT_WINDOW_MS` for non-Gemini providers.
- `GEMINI_RATE_LIMIT_WINDOW_MS` (defaults to `RATE_LIMIT_WINDOW_MS`) — window size for Gemini-specific rate limiting.
- `GEMINI_RATE_LIMIT_MAX_REQUESTS` (default: `5`) — max requests per window for Gemini to protect your quota.
- `GEMINI_TOTAL_ENABLED` (default: `false`) — enable the daily cumulative Gemini cap.
- `GEMINI_TOTAL_MAX_REQUESTS` (default: `0`) — when `GEMINI_TOTAL_ENABLED=true`, this sets the allowed number of Gemini uploads per user per day. Set to a positive integer (e.g. `10`).
- `TOTAL_USAGE_STORE` (optional) — path to the JSON usage store (default: `data/usage.json`).

Daily reset and usage store
- Gemini's cumulative limits are tracked in a small JSON-backed store (`data/usage.json` by default) using a date-keyed format so counts reset daily. Keys look like `client_<id>:gemini:YYYY-MM-DD`.
- The UI shows "Daily remaining" and the local time when the cap resets (00:00 UTC).

Example (enable 10 Gemini uploads per day):
```
GEMINI_API_KEY=sk-your-real-key
GEMINI_TOTAL_ENABLED=true
GEMINI_TOTAL_MAX_REQUESTS=10
TOTAL_USAGE_STORE=data/usage.json
```

Admin / reset options
- Currently the usage store is a simple JSON file. You can reset a user's today's counter by editing `data/usage.json` directly (or removing the appropriate key). Example key format: `client_snkxa4aa6:gemini:2025-12-10`.
- For convenience and safety you can add an authenticated admin endpoint (recommended for production) that: lists a client's usage for today and resets it on demand. If you want, I can add a protected `POST /api/admin/usage/reset` route that requires an `ADMIN_TOKEN` supplied via the `x-admin-token` header.

Frontend behaviour
- The frontend requests `/api/config` on load to learn whether Gemini is enabled and to read the configured caps. It also fetches `/api/usage?clientId=...&provider=gemini` to present the user's daily remaining uploads and a progress bar. After each successful upload the frontend refreshes the usage so the UI stays in sync.

Notes and recommendations
- The JSON store is fine for a single server instance / small deployment. For production or multiple instances, replace `usageStore` with Redis (atomic `INCR`/`GET` plus TTL) to avoid race conditions and ensure global counters.
- If you expect public usage, consider adding stronger protections: account-based quotas, reCAPTCHA, billing, or explicit signup flows.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.