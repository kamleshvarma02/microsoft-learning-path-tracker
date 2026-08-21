# Microsoft Learning Path Tracker

## Features
- Cloud, AI/Data and Security domain picker
- Completed / Available / Locked states
- Prerequisite logic handled in app code
- Progress saved in localStorage
- Optional Gemini AI explanation
- Loading state and fallback if AI fails
- Microsoft Learn links

## Run
```bash
npm install
npm run dev
```

## Optional AI
Copy `.env.example` to `.env` and add your Gemini API key.

### Interview explanation
`statusOf()` computes completed/available/locked using prerequisite IDs. AI never chooses the next certificate; it only explains the already-selected step. `complete()` only accepts an available step. `localStorage` persists progress. If the AI call fails, `fallback()` prevents a blank screen or crash.
