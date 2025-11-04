# Project API & Developer Guide

This document explains how to run the FastAPI backend, start the frontend, and use the Compare endpoints (scraper control) added for the admin UI.

## Overview
- Frontend: Vite + React app in `project/src` (Admin UI under `project/src/admin`).
- Backend: FastAPI server at `project/server.py` exposing these endpoints:
  - `GET /api/compare` — returns the product documents from MongoDB `products` collection.
  - `POST /api/scrape` — starts a background scrape job. Returns `{ "status": "started", "job_id": "..." }`.
  - `GET /api/scrape/status/{job_id}` — returns the job document with `status` (`pending` | `running` | `completed` | `failed`) and `error` (if any).

The scraper lives at `amazon_scraper/amazon_price_scraper.py` and writes to the same MongoDB database.

## Requirements
- Python 3.10+ (dev used 3.11/3.13)
- Node.js + npm for frontend
- MongoDB Atlas or local Mongo instance

## Setup
1. Backend (FastAPI + Python)

```powershell
cd project
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# scraper extra deps (if not installed):
pip install requests beautifulsoup4 pandas python-dotenv lxml
```

2. Provide `MONGO_URI` and optional `API_KEY` in `.env` (repo root or `project/`):

```
MONGO_URI="mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority"
# optional: API_KEY to protect scrape endpoints
API_KEY="a-secret-key"
```

> Important: do not commit `.env` to source control. Keep credentials secret.

3. Frontend (Vite)

```powershell
cd project
npm install
npm run dev
```

Vite is configured to proxy `/api` requests to the FastAPI server (http://localhost:8000) during development.

## Running the backend

```powershell
cd project
.\.venv\Scripts\Activate.ps1
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Open http://localhost:8000/docs to see the FastAPI Swagger UI.

## Example API usage

- Start a scrape job (no API_KEY):

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/api/scrape
```

- With API_KEY header:

```powershell
Invoke-RestMethod -Method Post -Headers @{ 'x-api-key' = 'a-secret-key' } http://localhost:8000/api/scrape
```

- Check job status:

```powershell
Invoke-RestMethod http://localhost:8000/api/scrape/status/<job_id>
```

- Fetch compare data:

```powershell
Invoke-RestMethod http://localhost:8000/api/compare | ConvertTo-Json -Depth 5
```

## Notes & troubleshooting
- If FastAPI refuses to start with `MONGO_URI not set`, add `.env` or set environment variable `MONGO_URI`.
- If `/api/scrape` fails, check backend logs (uvicorn terminal) for errors from the scraper.
- The scraper performs real network requests to Amazon — it can be blocked by CAPTCHA or rate limits. Check scraper logs for messages about blocking.
- Job persistence: job documents are stored in the Mongo collection `scrape_jobs` so statuses survive server restarts.

## Security
- To lock down scraper control, set `API_KEY` in your `.env`. Client requests must include the header `x-api-key: <API_KEY>` or `?api_key=<API_KEY>` query parameter.

Client-side (dev) support: if you want the frontend to automatically include an API key when calling the backend during development, set a Vite env variable in `project/.env` like:

```
VITE_API_KEY="a-secret-key"
```

This will expose `import.meta.env.VITE_API_KEY` to the client code. The `Compare` view is already implemented to include the `x-api-key` header when that variable is present. Note: do NOT use `VITE_API_KEY` for production — embedding secret keys in browser builds is insecure.
## Next improvements (optional)
- Migrate job execution to a real job queue (Redis + RQ/Celery) for scale.
- Stream scraper logs to the frontend via WebSockets or Server-Sent Events (SSE).
- Add role-based auth for admin UI endpoints.

If you want, I can update the README with more examples or add a small health endpoint.
