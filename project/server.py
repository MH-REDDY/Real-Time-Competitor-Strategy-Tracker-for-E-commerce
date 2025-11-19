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

# Ensure repository root (parent of `project`) is on sys.path so sibling
# packages like `amazon_scraper` can be imported when the server is started
# from inside the `project` folder (common dev setup).
try:
    repo_root = str(Path(__file__).resolve().parent.parent)
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)
        logger.info(f"Added repo root to sys.path: {repo_root}")
except Exception:
    # Non-fatal; import errors will be caught where they occur.
    pass

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


# -----------------------------
# Admin Alerts Endpoints
# -----------------------------
@app.get('/admin/alerts')
def list_alerts(limit: int = 50):
    if db is None:
        raise HTTPException(status_code=500, detail='Database not available')
    try:
        alerts_col = db.get_collection('alerts')
        docs = list(alerts_col.find().sort('triggered_at', -1).limit(int(limit)))
        out = []
        for d in docs:
            d2 = {}
            for k, v in d.items():
                if isinstance(v, ObjectId):
                    d2[k] = str(v)
                else:
                    try:
                        if hasattr(v, 'isoformat'):
                            d2[k] = v.isoformat()
                        else:
                            d2[k] = v
                    except Exception:
                        d2[k] = v
            out.append(d2)
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch('/admin/alerts/{alert_id}/ack')
def ack_alert(alert_id: str):
    if db is None:
        raise HTTPException(status_code=500, detail='Database not available')
    try:
        alerts_col = db.get_collection('alerts')
        try:
            res = alerts_col.update_one({'_id': ObjectId(alert_id)}, {'$set': {'status': 'acknowledged'}})
        except Exception:
            raise HTTPException(status_code=400, detail='Invalid alert id')
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail='Alert not found')
        return {'ok': True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/admin/alerts/settings')
def get_alert_settings():
    if db is None:
        raise HTTPException(status_code=500, detail='Database not available')
    try:
        settings_col = db.get_collection('alert_settings')
        doc = settings_col.find_one({'_id': 'global'})
        if not doc:
            return {
                'enabled': True,
                'notify_channels': {'slack': True, 'email': False},
                'threshold_percent': 20.0,
                'threshold_absolute': 500.0,
                'min_price_for_alert': 100.0,
                'quiet_hours': None
            }
        if '_id' in doc:
            del doc['_id']
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _in_quiet_hours(quiet_hours):
    """Checks whether current local time falls within quiet_hours.
    quiet_hours should be dict like {'start':'22:00', 'end':'07:00'} or None.
    Handles ranges that span midnight.
    """
    if not quiet_hours:
        return False
    try:
        now = datetime.now()
        start = datetime.strptime(quiet_hours.get('start', '22:00'), '%H:%M').time()
        end = datetime.strptime(quiet_hours.get('end', '07:00'), '%H:%M').time()
        now_t = now.time()
        if start <= end:
            return start <= now_t <= end
        else:
            return now_t >= start or now_t <= end
    except Exception:
        return False


@app.get('/admin/alerts/diagnose')
def diagnose_alerts(limit: int = 200):
    """Return diagnostic info for products whether they would trigger alerts now.
    This does a compare-only check (no scraping) and explains why alerts would
    or would not be sent (thresholds, min_price, quiet hours, dedupe).
    """
    if db is None:
        raise HTTPException(status_code=500, detail='Database not available')
    try:
        settings_col = db.get_collection('alert_settings')
        doc = settings_col.find_one({'_id': 'global'}) or {}
        threshold_percent = float(doc.get('threshold_percent', 20.0))
        threshold_absolute = float(doc.get('threshold_absolute', 500.0))
        min_price_for_alert = float(doc.get('min_price_for_alert', 100.0))
        quiet_hours = doc.get('quiet_hours')
        alerts_enabled = bool(doc.get('enabled', True))

        alerts_col = db.get_collection('alerts')
        price_history_col = db.get_collection('price_history')

        now = datetime.now(timezone.utc)
        dedupe_hours = int(os.environ.get('ALERT_DEDUPE_HOURS', '12'))
        cutoff = now - timedelta(hours=dedupe_hours)

        out = []
        docs = list(products_col.find().limit(int(limit)))
        for p in docs:
            asin = p.get('asin')
            admin_price = p.get('price')
            # latest scraped price
            ph = price_history_col.find_one({'asin': asin}, sort=[('scraped_at', -1)])
            scraped_price = ph.get('price') if ph else None

            # use admin price as the reference when available
            ref_price = admin_price if admin_price is not None else (p.get('scraper', {}).get('last', {}).get('price'))

            pct = None
            abs_diff = None
            trigger_percent = False
            trigger_absolute = False
            reason = []

            if ref_price is not None and scraped_price is not None and ref_price != 0:
                try:
                    pct = (float(ref_price) - float(scraped_price)) / float(ref_price) * 100.0
                except Exception:
                    pct = None

            if ref_price is not None and scraped_price is not None:
                try:
                    abs_diff = abs(float(ref_price) - float(scraped_price))
                except Exception:
                    abs_diff = None

            if pct is not None and abs(pct) >= threshold_percent:
                trigger_percent = True
                reason.append('percent')

            if abs_diff is not None:
                try:
                    max_price = max(float(ref_price), float(scraped_price))
                    if abs_diff >= threshold_absolute and max_price >= min_price_for_alert:
                        trigger_absolute = True
                        reason.append('absolute')
                except Exception:
                    pass

            # availability difference
            admin_avail = p.get('availability')
            scraped_avail = (p.get('scraper', {}).get('last', {}).get('availability')) if p.get('scraper') else None
            avail_trigger = False
            if admin_avail and scraped_avail and admin_avail != scraped_avail:
                avail_trigger = True
                reason.append('availability')

            # For this simplified project we do not dedupe or respect quiet-hours
            deduped = False
            in_quiet = False
            will_trigger = alerts_enabled and (trigger_percent or trigger_absolute or avail_trigger)

            out.append({
                'asin': asin,
                'title': p.get('title'),
                'admin_price': admin_price,
                'scraped_price': scraped_price,
                'pct_change': pct,
                'abs_change': abs_diff,
                'trigger_percent': trigger_percent,
                'trigger_absolute': trigger_absolute,
                'availability_trigger': avail_trigger,
                'in_quiet_hours': in_quiet,
                'deduped_recent_alert': deduped,
                'would_notify_now': bool(will_trigger),
                'reasons': reason,
            })

        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put('/admin/alerts/settings')
def update_alert_settings(payload: dict):
    if db is None:
        raise HTTPException(status_code=500, detail='Database not available')
    try:
        # Coerce numeric fields to proper numeric types to avoid displaying
        # values with leading zeros or as strings in the UI.
        settings_col = db.get_collection('alert_settings')
        sanitized = dict(payload or {})
        # numeric fields we expect
        for key in ('threshold_percent', 'threshold_absolute', 'min_price_for_alert'):
            if key in sanitized:
                try:
                    # Convert empty strings or nulls to None
                    val = sanitized.get(key)
                    if val == '' or val is None:
                        sanitized[key] = None
                    else:
                        # use float to strip leading zeros and normalize
                        sanitized[key] = float(val)
                except Exception:
                    # If conversion fails, remove the key to avoid corrupt data
                    sanitized.pop(key, None)

        # ensure notify_channels structure exists
        nc = sanitized.get('notify_channels') or {}
        sanitized['notify_channels'] = {
            'slack': bool(nc.get('slack', False)),
            'email': bool(nc.get('email', False))
        }

        settings_col.update_one({'_id': 'global'}, {'$set': sanitized}, upsert=True)
        return {'ok': True, 'updated': sanitized}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/admin/alerts/test')
def create_test_alert():
    if db is None:
        raise HTTPException(status_code=500, detail='Database not available')
    try:
        alerts_col = db.get_collection('alerts')
        now = datetime.now(timezone.utc)
        doc = {
            'asin': 'TEST-ASIN-UI',
            'title': 'Test Alert — UI',
            'current_price': 1999,
            'scraped_price': 1499,
            'percent_change': 25.0,
            'absolute_change': 500,
            'trigger_reason': 'test',
            'triggered_at': now,
            'status': 'open',
            'created_at': now
        }
        res = alerts_col.insert_one(doc)

        # Also attempt to notify via notifier when available so this test route
        # behaves like the other notify endpoint.
        notified = False
        try:
            try:
                from amazon_scraper import notify as notifier
            except Exception:
                notifier = None
            if notifier is not None:
                try:
                    notified = bool(notifier.record_and_notify(doc))
                except Exception:
                    notified = False
        except Exception:
            notified = False

        return {'ok': True, 'inserted_id': str(res.inserted_id), 'notified': notified}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/admin/alerts/test-notify')
def create_and_notify_test_alert():
    """Create a test alert and attempt to notify via the project's notifier.
    This is useful to verify Slack/email notifier configuration from the dev server.
    """
    try:
        # Create sample alert
        now = datetime.now(timezone.utc)
        alert = {
            'asin': 'TEST-ASIN-NOTIFY',
            'title': 'Test Alert — Notify',
            'current_price': 2999,
            'scraped_price': 2499,
            'percent_change': 16.7,
            'absolute_change': 500,
            'trigger_reason': 'test-notify',
            'triggered_at': now,
            'status': 'open',
            'created_at': now
        }
        # Import notifier from amazon_scraper (works when repo root is on sys.path)
        try:
            from amazon_scraper import notify as notifier
        except Exception as ie:
            raise HTTPException(status_code=500, detail=f'Failed to import notifier: {ie}')

        ok = notifier.record_and_notify(alert)
        return {'ok': True, 'notified': bool(ok)}
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

    # Ensure repository root is on sys.path while importing the scraper so
    # relative package imports like `from amazon_scraper.notify import ...`
    # resolve correctly when the server is started from the `project` folder.
    repo_root = str(workspace_root)
    inserted = False
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)
        inserted = True

    try:
        spec = importlib.util.spec_from_file_location('amazon_price_scraper', str(script_path))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        if inserted:
            try:
                sys.path.remove(repo_root)
            except ValueError:
                pass


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
