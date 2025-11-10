from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
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
from typing import Dict, Optional, List
from datetime import datetime

# Import routers
from routers import auth as auth_router
from routers import admin as admin_router

# Load environment variables
load_dotenv()

# Read configuration
MONGO_URI = os.environ.get('MONGO_URI')
API_KEY = os.environ.get('API_KEY')  # optional: protect scrape endpoint

if not MONGO_URI:
    raise RuntimeError('MONGO_URI not set in environment or .env')

# Initialize MongoDB client
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
except Exception as e:
    print(f"Warning: Could not update running jobs status: {e}")
    # If update fails, continue — we'll handle per-job errors later

# Initialize FastAPI app
app = FastAPI(
    title='Ecom Tracker API',
    description='E-commerce Competitor Tracking API',
    version='1.0.0',
    docs_url='/docs',
    redoc_url='/redoc'
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router.router, prefix="/api", tags=["Authentication"])
app.include_router(admin_router.router)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "E-commerce Tracker API is running"}

# Health check endpoint
@app.get("/health")
async def health_check():
    try:
        # Test database connection
        client.server_info()
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


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

@app.get('/api/products/{product_id}')
def get_product(product_id: str):
    try:
        try:
            oid = ObjectId(product_id)
        except Exception:
            raise HTTPException(status_code=400, detail='Invalid product id')
        doc = products_col.find_one({'_id': oid})
        if not doc:
            raise HTTPException(status_code=404, detail='Product not found')
        return _serialize_doc(doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================
# Products CRUD API
# ==========================

@app.get('/api/products')
def list_products():
    try:
        docs = list(products_col.find().sort([('created_at', -1)]))
        return [_serialize_doc(d) for d in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/products')
async def create_product(request: Request):
    try:
        payload = await request.json()
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail='Invalid product payload')

        # Normalize a few fields
        now = datetime.utcnow()
        payload.setdefault('created_at', now)
        payload.setdefault('updated_at', now)

        res = products_col.insert_one(payload)
        doc = products_col.find_one({'_id': res.inserted_id})
        return _serialize_doc(doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put('/api/products/{product_id}')
async def update_product(product_id: str, request: Request):
    try:
        try:
            oid = ObjectId(product_id)
        except Exception:
            raise HTTPException(status_code=400, detail='Invalid product id')

        payload = await request.json()
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail='Invalid product payload')

        payload['updated_at'] = datetime.utcnow()
        res = products_col.update_one({'_id': oid}, {'$set': payload})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail='Product not found')
        doc = products_col.find_one({'_id': oid})
        return _serialize_doc(doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete('/api/products/{product_id}')
def delete_product(product_id: str):
    try:
        try:
            oid = ObjectId(product_id)
        except Exception:
            raise HTTPException(status_code=400, detail='Invalid product id')
        res = products_col.delete_one({'_id': oid})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail='Product not found')
        return {'status': 'deleted', 'id': product_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/products/import')
async def import_products(request: Request):
    try:
        payload = await request.json()
        if not isinstance(payload, list):
            raise HTTPException(status_code=400, detail='Expected a list of products')

        now = datetime.utcnow()
        docs: List[dict] = []
        for p in payload:
            if not isinstance(p, dict):
                continue
            p.setdefault('created_at', now)
            p.setdefault('updated_at', now)
            docs.append(p)
        if not docs:
            return {'inserted': 0}
        res = products_col.insert_many(docs)
        inserted = list(products_col.find({'_id': {'$in': res.inserted_ids}}))
        return {'inserted': len(res.inserted_ids), 'products': [_serialize_doc(d) for d in inserted]}
    except HTTPException:
        raise
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

