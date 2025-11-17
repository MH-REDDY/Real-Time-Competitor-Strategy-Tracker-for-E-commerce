from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import sys
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from bson import ObjectId
import json
import importlib.util
import uuid
import threading
from typing import Dict, Optional
from datetime import datetime, timezone, timedelta
import random
import math
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Import payment routes
try:
    from payments.payment_routes import router as payment_router
except ImportError:
    payment_router = None
    logger.warning("Payment routes not found")

# Read configuration
MONGO_URI = os.environ.get('MONGO_URI')
API_KEY = os.environ.get('API_KEY')  # optional: protect scrape endpoint

# Try to connect to MongoDB with fallback
client: Optional[MongoClient] = None
db = None
products_col = None
jobs_col = None
users_col = None
admins_col = None
orders_col = None

if MONGO_URI:
    try:
        logger.info("Attempting to connect to MongoDB Atlas...")
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Test the connection
        client.admin.command('ping')
        db = client['ecom_tracker']
        products_col = db['products']
        jobs_col = db['scrape_jobs']
        users_col = db['user']
        admins_col = db['admin']
        orders_col = db['orders']
        logger.info("✓ Successfully connected to MongoDB Atlas")
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        logger.warning(f"MongoDB Atlas connection failed: {e}")
        logger.info("Falling back to local MongoDB...")
        try:
            client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
            client.admin.command('ping')
            db = client['ecom_tracker']
            products_col = db['products']
            jobs_col = db['scrape_jobs']
            users_col = db['user']
            admins_col = db['admin']
            orders_col = db['orders']
            logger.info("✓ Successfully connected to local MongoDB")
        except Exception as e2:
            logger.error(f"Local MongoDB connection also failed: {e2}")
            logger.warning("⚠ Running without database - using in-memory storage only")

# Simple in-memory job store (job_id -> status/info)
jobs: Dict[str, Dict] = {}

# On startup, mark any jobs that were running as interrupted (only if we have a database)
if jobs_col is not None:
    try:
        jobs_col.update_many({'status': 'running'}, {'$set': {'status': 'interrupted', 'updated_at': datetime.now(timezone.utc)}})
    except Exception as e:
        logger.error(f"Failed to update interrupted jobs: {e}")

app = FastAPI(title='Ecom Tracker API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include payment routes
if payment_router:
    app.include_router(payment_router)


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
        if products_col is None:
            # Return empty list if no database connection
            logger.warning("No database connection - returning empty product list")
            return []
        # Fetch products, but for compare (live scraped view) we prefer the latest
        # scraped metrics from the `price_history` collection. We will return
        # product metadata from `products` but merge in the latest scraped values
        # from `price_history` so the compare table reflects live scraped prices.
        price_history_col = None
        try:
            price_history_col = db['price_history'] if db is not None else None
        except Exception:
            price_history_col = None

        docs = list(products_col.find())
        out = []
        for d in docs:
            doc = _serialize_doc(d)
            # Preserve any admin-modified top-level numeric fields under admin_* keys
            for fld in ('price', 'original_price', 'discount_percent', 'rating', 'reviews_count'):
                if fld in doc:
                    doc[f'admin_{fld}'] = doc.get(fld)

            # If we have a price_history collection, fetch the latest record for this ASIN
            if price_history_col is not None and doc.get('asin'):
                try:
                    ph = price_history_col.find_one({'asin': doc['asin']}, sort=[('scraped_at', -1)])
                    if ph:
                        # Merge scraped values into the response (do NOT persist to products collection here)
                        doc['price'] = ph.get('price')
                        doc['original_price'] = ph.get('original_price')
                        doc['discount_percent'] = ph.get('discount_percent')
                        doc['scraped_at'] = ph.get('scraped_at')
                        # Also provide a `scraped` namespace so UI can display both
                        doc['scraped'] = {
                            'price': ph.get('price'),
                            'original_price': ph.get('original_price'),
                            'discount_percent': ph.get('discount_percent'),
                            'scraped_at': ph.get('scraped_at')
                        }
                except Exception:
                    # Non-fatal - fall back to product-level values
                    pass

            out.append(doc)
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/brands')
def get_brands_and_models():
    """Return available brands and models inferred from products.
    modelsByBrand keys are brand names; values are model names (derived from product titles).
    """
    try:
        if products_col is None:
            return {"brands": [], "modelsByBrand": {}}
        brands_set = set()
        models_by_brand = {}
        # Pull latest products
        docs = list(products_col.find({}, {"brand": 1, "title": 1}).limit(500))
        for d in docs:
            title = (d.get('title') or '').strip()
            brand = (d.get('brand') or '').strip()
            if not brand and title:
                # Heuristic: brand as first token
                brand = title.split()[0]
            if not brand:
                continue
            brands_set.add(brand)
            # Heuristic for model: title without brand prefix
            model = title
            if title.lower().startswith(brand.lower() + ' '):
                model = title[len(brand):].strip()
            if model:
                models_by_brand.setdefault(brand, set()).add(model)
        # Convert sets to sorted lists and limit for UI brevity
        brands_list = sorted(brands_set)
        models_by_brand_out = {
            b: sorted(list(models_by_brand.get(b, [])))[:50] for b in brands_list
        }
        return {"brands": brands_list, "modelsByBrand": models_by_brand_out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/forecast')
def forecast(payload: dict):
    """Return historical and 30-day forecast data for a brand+model.
    The response shape matches the frontend expectations.
    """
    try:
        brand = (payload or {}).get('brand') or ''
        model = (payload or {}).get('model') or ''
        if not brand or not model:
            raise HTTPException(status_code=400, detail='brand and model are required')

        # Deterministic base using brand+model to keep charts stable
        base_seed = abs(hash(f"{brand}:{model}")) & 0xFFFFFFFF
        rng = random.Random(base_seed)
        base_price = 25000 + rng.random() * 50000  # 25k - 75k
        base_discount = 5 + rng.random() * 15      # 5% - 20%

        today = datetime.now(timezone.utc).date()

        # Historical: last 60 days
        historical = []
        for i in range(60, 0, -1):
            date_i = (today - timedelta(days=i)).isoformat()
            seasonal = math.sin(i / 10.0) * 0.15
            noise = (random.Random(base_seed + i).random() - 0.5) * 0.1
            price = base_price * (1 + seasonal + noise)
            disc = max(0.0, base_discount * (1 + seasonal * 1.5 + noise))
            historical.append({
                'date': date_i,
                'price': int(round(price)),
                'discount': round(disc, 1),
            })

        # Forecast: next 30 days
        forecast_out = []
        last_price = historical[-1]['price']
        last_disc = historical[-1]['discount']
        for i in range(1, 31):
            date_i = (today + timedelta(days=i)).isoformat()
            trend = 1 + (i * 0.002)
            seasonal = math.sin(i / 7.0) * 0.05
            noise = (random.Random(base_seed + 1000 + i).random() - 0.5) * 0.03
            price = last_price * (trend + seasonal + noise)
            disc_trend = math.sin(i / 5.0) * 0.2
            disc = max(0.0, last_disc * (1 + disc_trend + noise * 2))
            forecast_out.append({
                'date': date_i,
                'price': int(round(price)),
                'discount': round(disc, 1),
                'isForecast': True,
            })

        return {
            'brand': brand,
            'model': model,
            'historical': historical,
            'forecast': forecast_out,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get('/api/products/{item_id}')
def products_get_one(item_id: str):
    """Fetch a single product by ASIN or _id."""
    if products_col is None:
        raise HTTPException(status_code=404, detail='Database not connected')
    try:
        # Try by ASIN first
        doc = products_col.find_one({'asin': item_id})
        if not doc:
            # Try by ObjectId
            try:
                doc = products_col.find_one({'_id': ObjectId(item_id)})
            except Exception:
                doc = None
        if not doc:
            raise HTTPException(status_code=404, detail='Product not found')
        return _serialize_doc(doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------
# Products CRUD (Admin) - Dev
# -----------------------------
@app.get('/api/products')
def products_list():
    """Return raw products from the `products` collection (admin-editable values).
    This endpoint is intended for admin Inventory management and should return
    the stored product documents without merging in live scraped metrics.
    """
    try:
        if products_col is None:
            logger.warning("No database connection - returning empty product list")
            return []
        docs = list(products_col.find().sort([('title', 1)]))
        out = [_serialize_doc(d) for d in docs]
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/products')
def products_create(payload: dict, request: Request):
    """Create or upsert a product by asin. Requires API key if configured."""
    _require_api_key(request)
    if products_col is None:
        # no DB: accept but no persistence
        return {'status': 'ok', 'note': 'no database connected'}
    try:
        asin = payload.get('asin')
        if not asin:
            raise HTTPException(status_code=400, detail='asin is required')
        payload['updated_at'] = datetime.now(timezone.utc)
        products_col.update_one({'asin': asin}, {'$set': payload}, upsert=True)
        return {'status': 'ok'}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put('/api/products/{asin}')
def products_update(asin: str, payload: dict, request: Request):
    _require_api_key(request)
    if products_col is None:
        return {'status': 'ok', 'note': 'no database connected'}
    try:
        payload['updated_at'] = datetime.now(timezone.utc)
        res = products_col.update_one({'asin': asin}, {'$set': payload}, upsert=False)
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail='Product not found')
        return {'status': 'ok'}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete('/api/products/{asin}')
def products_delete(asin: str, request: Request):
    _require_api_key(request)
    if products_col is None:
        return {'status': 'ok', 'note': 'no database connected'}
    try:
        res = products_col.delete_one({'asin': asin})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail='Product not found')
        return {'status': 'ok'}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/products/import')
def products_import(payload: list, request: Request):
    _require_api_key(request)
    if not isinstance(payload, list):
        raise HTTPException(status_code=400, detail='Expected a JSON array')
    if products_col is None:
        return {'status': 'ok', 'imported': len(payload), 'note': 'no database connected'}
    try:
        ops = []
        for item in payload:
            asin = item.get('asin')
            if not asin:
                # skip items without ASIN
                continue
            item['updated_at'] = datetime.now(timezone.utc)
            ops.append({'update_one': {
                'filter': {'asin': asin},
                'update': {'$set': item},
                'upsert': True
            }})
        if ops:
            # Use bulk_write style via raw command for simplicity
            products_col.bulk_write([
                type('X', (), {'_Command': o}) for o in []
            ])
            # Fallback simple loop if bulk_write is not convenient
            for item in payload:
                asin = item.get('asin')
                if not asin:
                    continue
                products_col.update_one({'asin': asin}, {'$set': item}, upsert=True)
        return {'status': 'ok', 'imported': len(payload)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# Minimal Auth Endpoints (Dev)
# -----------------------------
@app.post('/auth/login')
def auth_login(payload: dict):
    try:
        # Detect admin tab by presence of 'username' (admin form sends username, user form sends email)
        is_admin_form = 'username' in payload and 'email' not in payload
        username_input = payload.get('username')
        email_input = payload.get('email')
        username = username_input or email_input or 'user@example.com'
        email = email_input or (username if '@' in (username or '') else f"{username}@example.com")
        # Derive a friendly display name: use username for admin, or email local-part for users
        if is_admin_form and username_input:
            display_name = username_input
        else:
            # take part before '@' and title-case it
            local_part = (email or 'user').split('@')[0]
            display_name = local_part.replace('.', ' ').replace('_', ' ').title()
        # Only treat as admin when admin form is used
        role = 'admin' if is_admin_form else 'user'
        user_doc = {
            '_id': str(uuid.uuid4()),
            'email': email,
            'full_name': display_name,
        }
        # Upsert into users collection if available
        try:
            if role == 'admin':
                if admins_col is not None:
                    admins_col.update_one(
                        {'email': email},
                        {'$set': {
                            'email': email,
                            'full_name': display_name,
                            'role': 'admin',
                            'is_active': True,
                            'updated_at': datetime.now(timezone.utc),
                        }, '$setOnInsert': {
                            'created_at': datetime.now(timezone.utc)
                        }},
                        upsert=True
                    )
                    doc = admins_col.find_one({'email': email})
                    if doc and doc.get('_id'):
                        user_doc['_id'] = str(doc['_id'])
            else:
                if users_col is not None:
                    users_col.update_one(
                        {'email': email},
                        {'$set': {
                            'email': email,
                            'full_name': display_name,
                            'role': 'user',
                            'is_active': True,
                            'updated_at': datetime.now(timezone.utc),
                        }, '$setOnInsert': {
                            'created_at': datetime.now(timezone.utc)
                        }},
                        upsert=True
                    )
                    doc = users_col.find_one({'email': email})
                    if doc and doc.get('_id'):
                        user_doc['_id'] = str(doc['_id'])
        except Exception:
            # non-fatal
            pass
        return {
            'access_token': str(uuid.uuid4()),
            'token_type': 'bearer',
            'role': role,
            'user': user_doc,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/auth/register')
def auth_register(payload: dict):
    # Accept and return success (no real persistence for this demo)
    return {'status': 'ok'}


@app.get('/auth/me')
def auth_me(request: Request):
    # Return a basic user object; in real app this would validate the bearer token
    return {
        'user': {
            '_id': str(uuid.uuid4()),
            'email': 'user@example.com',
            'full_name': 'Demo User',
        },
        'role': 'user',
    }


# -----------------------------
# Admin Users Endpoints
# -----------------------------
@app.get('/admin/users')
def admin_users_list():
    if users_col is None:
        return []
    try:
        docs = list(users_col.find({'role': {'$ne': 'admin'}}).sort([('created_at', -1)]))
        return [_serialize_doc(d) for d in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch('/admin/users/{user_id}/toggle-active')
def admin_users_toggle(user_id: str):
    if users_col is None:
        return {'status': 'ok', 'note': 'no database connected'}
    try:
        # locate by ObjectId if possible, else string id
        try:
            q = {'_id': ObjectId(user_id)}
        except Exception:
            q = {'_id': user_id}
        doc = users_col.find_one(q)
        if not doc:
            raise HTTPException(status_code=404, detail='User not found')
        new_status = not bool(doc.get('is_active', True))
        users_col.update_one(q, {'$set': {'is_active': new_status, 'updated_at': datetime.now(timezone.utc)}})
        return {'status': 'ok', 'is_active': new_status}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete('/admin/users/{user_id}')
def admin_users_delete(user_id: str):
    if users_col is None:
        return {'status': 'ok', 'note': 'no database connected'}
    try:
        try:
            q = {'_id': ObjectId(user_id)}
        except Exception:
            q = {'_id': user_id}
        res = users_col.delete_one(q)
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail='User not found')
        return {'status': 'ok'}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/admin/orders')
def admin_orders_list():
    if orders_col is None:
        return []
    try:
        docs = list(orders_col.find().sort([('created_at', -1)]))
        return [_serialize_doc(d) for d in docs]
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
    # update job status -> running (in-memory and persistent if available)
    jobs[job_id] = {'status': 'running', 'progress': 0, 'updated_at': datetime.now(timezone.utc)}
    if jobs_col is not None:
        jobs_col.update_one({'job_id': job_id}, {'$set': {'status': 'running', 'progress': 0, 'updated_at': datetime.now(timezone.utc)}}, upsert=True)
    try:
        module = _load_scraper_module()
        # If the scraper module exposes a PROGRESS_HOOK, attach one so it can report progress
        def _progress_hook(processed: int, total: int, last_asin: str = None):
            try:
                pct = int((processed / total) * 100) if total and total > 0 else None
            except Exception:
                pct = None
            update = {'updated_at': datetime.now(timezone.utc)}
            if pct is not None:
                update['progress'] = pct
            if last_asin:
                update['last_asin'] = last_asin
            jobs[job_id].update(update)
            if jobs_col is not None:
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
        jobs[job_id].update({'status': 'completed', 'progress': 100, 'updated_at': datetime.now(timezone.utc)})
        if jobs_col is not None:
            jobs_col.update_one({'job_id': job_id}, {'$set': {'status': 'completed', 'progress': 100, 'updated_at': datetime.now(timezone.utc)}}, upsert=True)
    except Exception as e:
        error_info = {'status': 'failed', 'error': str(e), 'updated_at': datetime.now(timezone.utc)}
        jobs[job_id].update(error_info)
        if jobs_col is not None:
            jobs_col.update_one({'job_id': job_id}, {'$set': error_info}, upsert=True)


@app.post('/api/scrape')
def start_scrape(request: Request):
    """Start scraper as a background job and return a job id immediately.
    Requires API key if configured.
    """
    _require_api_key(request)
    # Prevent duplicate concurrent scrapes
    existing = None
    if jobs_col is not None:
        existing = jobs_col.find_one({'status': {'$in': ['pending', 'running']}})
    else:
        # Check in-memory jobs
        for jid, jdata in jobs.items():
            if jdata.get('status') in ['pending', 'running']:
                existing = {'job_id': jid}
                break
    
    if existing:
        raise HTTPException(status_code=409, detail=f"A scrape is already in progress (job_id={existing.get('job_id')})")

    job_id = str(uuid.uuid4())
    # persist job with initial progress
    now = datetime.now(timezone.utc)
    jobs[job_id] = {'job_id': job_id, 'status': 'pending', 'progress': 0, 'created_at': now, 'updated_at': now}
    if jobs_col is not None:
        jobs_col.insert_one({'job_id': job_id, 'status': 'pending', 'progress': 0, 'created_at': now, 'updated_at': now})

    # start background thread so it survives the request/response cycle
    t = threading.Thread(target=_run_scraper_job, args=(job_id,), daemon=True)
    t.start()

    return {'status': 'started', 'job_id': job_id}


@app.get('/api/scrape/status/{job_id}')
def scrape_status(job_id: str, request: Request):
    """Return status for a given job id. Requires API key if configured."""
    _require_api_key(request)
    # Try database first, then in-memory
    job = None
    if jobs_col is not None:
        job = jobs_col.find_one({'job_id': job_id})
    if not job and job_id in jobs:
        job = jobs[job_id].copy()
        job['job_id'] = job_id
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



if __name__ == "__main__":
    import uvicorn
    logger.info("Starting FastAPI server on http://localhost:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)
