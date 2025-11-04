from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import sys
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
import json
import importlib.util
import uuid
import threading
from typing import Dict
from datetime import datetime


load_dotenv()

# Read configuration
MONGO_URI = os.environ.get('MONGO_URI')
API_KEY = os.environ.get('API_KEY')  # optional: protect scrape endpoint

if not MONGO_URI:
    raise RuntimeError('MONGO_URI not set in environment or .env')

client = MongoClient(MONGO_URI)
db = client['ecom_tracker']
products_col = db['products']

# Simple in-memory job store (job_id -> status/info). For production use a persistent store.
jobs: Dict[str, Dict] = {}
# Persistent jobs collection
jobs_col = db['scrape_jobs']

# On startup, mark any jobs that were running as interrupted so status is accurate after restarts
try:
    jobs_col.update_many({'status': 'running'}, {'$set': {'status': 'interrupted', 'updated_at': datetime.utcnow()}})
except Exception:
    # If update fails, continue — we'll handle per-job errors later
    pass

app = FastAPI(title='Ecom Tracker API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _serialize_doc(doc: dict) -> dict:
    # Convert ObjectId and datetimes
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        else:
            try:
                json.dumps({k: v}, default=str)
                out[k] = v
            except Exception:
                out[k] = str(v)
    return out


@app.get('/api/compare')
def get_compare():
    try:
        docs = list(products_col.find().sort([('scraped_at', -1)]))
        out = [_serialize_doc(d) for d in docs]
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _require_api_key(request: Request):
    """Validate API key if configured. Raises HTTPException(401) when invalid."""
    if not API_KEY:
        return True
    key = request.headers.get('x-api-key') or request.query_params.get('api_key')
    if not key or key != API_KEY:
        raise HTTPException(status_code=401, detail='Invalid or missing API key')


def _load_scraper_module():
    workspace_root = Path(__file__).resolve().parent.parent
    script_path = workspace_root / 'amazon_scraper' / 'amazon_price_scraper.py'
    if not script_path.exists():
        raise FileNotFoundError(f"Scraper not found at {script_path}")

    spec = importlib.util.spec_from_file_location('amazon_price_scraper', str(script_path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run_scraper_job(job_id: str):
    """Background thread target: runs scraper.run_scraper() and updates job status."""
    # update persistent job -> running
    jobs_col.update_one({'job_id': job_id}, {'$set': {'status': 'running', 'progress': 0, 'updated_at': datetime.utcnow()}}, upsert=True)
    try:
        module = _load_scraper_module()
        # If the scraper module exposes a PROGRESS_HOOK, attach one so it can report progress
        def _progress_hook(processed: int, total: int, last_asin: str = None):
            try:
                pct = int((processed / total) * 100) if total and total > 0 else None
            except Exception:
                pct = None
            update = {'updated_at': datetime.utcnow()}
            if pct is not None:
                update['progress'] = pct
            if last_asin:
                update['last_asin'] = last_asin
            jobs_col.update_one({'job_id': job_id}, {'$set': update}, upsert=True)

        if hasattr(module, 'PROGRESS_HOOK'):
            try:
                setattr(module, 'PROGRESS_HOOK', _progress_hook)
            except Exception:
                # non-fatal — proceed without hook
                pass

        # call the run_scraper function exposed by the script
        if not hasattr(module, 'run_scraper'):
            raise RuntimeError('scraper module does not expose run_scraper()')
        module.run_scraper()
        # mark completed
        jobs_col.update_one({'job_id': job_id}, {'$set': {'status': 'completed', 'progress': 100, 'updated_at': datetime.utcnow()}}, upsert=True)
    except Exception as e:
        jobs_col.update_one({'job_id': job_id}, {'$set': {'status': 'failed', 'error': str(e), 'updated_at': datetime.utcnow()}}, upsert=True)


@app.post('/api/scrape')
def start_scrape(request: Request):
    """Start scraper as a background job and return a job id immediately.
    Requires API key if configured.
    """
    _require_api_key(request)
    # Prevent duplicate concurrent scrapes: if a job is already pending/running, return 409 with its id
    existing = jobs_col.find_one({'status': {'$in': ['pending', 'running']}})
    if existing:
        raise HTTPException(status_code=409, detail=f"A scrape is already in progress (job_id={existing.get('job_id')})")

    job_id = str(uuid.uuid4())
    # persist job with initial progress
    now = datetime.utcnow()
    jobs_col.insert_one({'job_id': job_id, 'status': 'pending', 'progress': 0, 'created_at': now, 'updated_at': now})

    # start background thread so it survives the request/response cycle
    t = threading.Thread(target=_run_scraper_job, args=(job_id,), daemon=True)
    t.start()

    return {'status': 'started', 'job_id': job_id}


@app.get('/api/scrape/status/{job_id}')
def scrape_status(job_id: str, request: Request):
    """Return status for a given job id. Requires API key if configured."""
    _require_api_key(request)
    job = jobs_col.find_one({'job_id': job_id})
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    # convert ObjectId/datetime to strings where needed
    out = {}
    for k, v in job.items():
        if k == '_id':
            out['id'] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            try:
                json.dumps({k: v}, default=str)
                out[k] = v
            except Exception:
                out[k] = str(v)
    return out

