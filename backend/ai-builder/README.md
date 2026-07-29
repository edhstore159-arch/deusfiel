AI Builder service

Quick start:

1. Install dependencies:

```bash
cd backend/ai-builder
npm install
```

2. Start service (default port 4321):

```bash
npm start
```

3. Frontend scaffold is at `frontend/ai-builder/index.html`. Serve it from your static server or integrate into your dashboard. The backend exposes endpoints under `/api/ai-builder/*`.

Security & notes:
- The service is intentionally conservative: it writes changes only after you call `approve`.
- Ollama integration expects an HTTP endpoint at `http://localhost:11434` by default; set `OLLAMA_URL` and `OLLAMA_MODEL` env vars to change.
- Backups are created under `backend/ai-builder/state/backups` before applying patches. Use the `revert` endpoint to restore.
- The implementation is scaffold-level and may need hardening for production. It blocks editing `.env` only by convention — avoid providing patches that include `.env` changes.
