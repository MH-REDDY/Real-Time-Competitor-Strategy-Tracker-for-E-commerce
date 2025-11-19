#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Team Ignite - Amazon Scraper for Product Details (Robust Version)
This script scrapes product information from Amazon.in and stores it in MongoDB.
It includes logging, session management, and automatic retries.
"""

# --- All imports consolidated here ---
import requests
from bs4 import BeautifulSoup
import re
import time
import random
import pandas as pd
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError
from datetime import datetime, timezone
import uuid
import concurrent.futures
import os
from dotenv import load_dotenv

# --- New Imports for Robustness ---
import logging
from decimal import Decimal
from amazon_scraper.notify import record_and_notify
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# -------------------
# Setup basic logging
# -------------------
# This will log to your console with timestamps and error levels
logging.basicConfig(
    level=logging.INFO, 
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt='%Y-%m-%d %H:%M:%S'
)

# -------------------
# MongoDB Setup
# -------------------

# Load the .env file (it looks for a file named '.env' in the same folder)
load_dotenv()

# Read the variable from the environment
mongo_uri = os.environ.get("MONGO_URI")

# Defensive cleaning: users sometimes paste the URI into GitHub secrets with
# surrounding quotes or accidental whitespace/newlines. Trim common wrappers
# so pymongo receives a valid URI scheme.
if mongo_uri:
    mongo_uri = mongo_uri.strip()
    # remove surrounding single/double quotes if present
    if (mongo_uri.startswith('"') and mongo_uri.endswith('"')) or (mongo_uri.startswith("'") and mongo_uri.endswith("'")):
        mongo_uri = mongo_uri[1:-1].strip()

    # final trim
    mongo_uri = mongo_uri.strip()

if not mongo_uri:
    logging.error("❌ MONGO_URI not found. Make sure you have a .env file with the key.")
    # This will stop the script if the key isn't found
    raise Exception("MONGO_URI not found")
else:
    # Validate basic scheme quickly and provide a clearer error message
    if not (mongo_uri.startswith('mongodb://') or mongo_uri.startswith('mongodb+srv://')):
        logging.error("❌ MONGO_URI looks malformed. It must begin with 'mongodb://' or 'mongodb+srv://'")
        logging.debug(f"MONGO_URI (masked start): {mongo_uri[:12]}...")
        raise Exception("MONGO_URI malformed - must begin with 'mongodb://' or 'mongodb+srv://' (check for surrounding quotes)")

try:
    client = MongoClient(mongo_uri)
    db = client["ecom_tracker"]
    products_col = db["products"]
    price_history_col = db["price_history"]
    reviews_col = db["reviews"] 

    # Ensure a TTL on locks so stale locks are cleared after 1 hour
    locks_col = db.get_collection('scraper_locks')
    try:
        locks_col.create_index([("locked_at", ASCENDING)], expireAfterSeconds=3600)
    except Exception:
        logging.debug('Could not create TTL index on scraper_locks (may already exist)')

    # Create indexes for all 3 collections
    products_col.create_index([("asin", ASCENDING)], unique=True)
    price_history_col.create_index([("asin", ASCENDING), ("scraped_at", ASCENDING)])
    reviews_col.create_index([("asin", ASCENDING), ("review_id", ASCENDING)], unique=True)

    logging.info("✅ MongoDB Connected (securely) and all 3 collections + indexes are ready!")

except Exception as e:
    logging.exception(f"❌ MongoDB Connection Error: {e}")
    print("Please check your MONGO_URI in the .env file, username, password, and IP whitelist.")
    exit()


# -------------------
# Alert settings loader & helpers
# -------------------
def load_alert_settings_from_db():
    """Load global alert settings from the `alert_settings` collection.
    Returns a dict with defaults if not found or on error.
    """
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
        # remove internal _id if present
        if '_id' in doc:
            del doc['_id']
        return doc
    except Exception:
        logging.exception('Failed to load alert settings from DB; using defaults')
        return {
            'enabled': True,
            'notify_channels': {'slack': True, 'email': False},
            'threshold_percent': 20.0,
            'threshold_absolute': 500.0,
            'min_price_for_alert': 100.0,
            'quiet_hours': None
        }


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
            # spans midnight
            return now_t >= start or now_t <= end
    except Exception:
        logging.exception('Invalid quiet_hours format')
        return False

# -------------------
# Scraping Constants
# -------------------
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
]

# -------------------
# Create a global Session with retries
# -------------------
_session = requests.Session()
# Retry 3 times on these common server errors
retries = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
# Use an adapter to apply these retries to all "https://" requests
adapter = HTTPAdapter(max_retries=retries, pool_connections=10, pool_maxsize=10)
_session.mount("https://", adapter)
_session.mount("http://", adapter)

# -------------------
# Helper Functions
# -------------------
def clean_price(price_str):
    if not price_str:
        return None
    s = re.sub(r'[^\d.]', '', price_str)
    try:
        return float(s)
    except (ValueError, TypeError):
        return None

# (You can add your other helpers like parse_review_date here if needed)

# -------------------
# Main Scraper Function (Upgraded)
# -------------------
def scrape_amazon_product(url):
    """
    Fetches a single Amazon product page and extracts key details.
    Uses the global session for retries and connection pooling.
    """
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept-Language": "en-IN,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Referer": "https://www.amazon.in/",
    }

    try:
        # Use the global session to make the request
        response = _session.get(url, headers=headers, timeout=15)
        final_url = response.url
        
        # Raise an error if the status code is bad (this triggers the retry logic)
        response.raise_for_status() 

        if "api-services-support@amazon.com" in response.text:
            logging.warning(f"❌ Blocked by CAPTCHA for {url} (resolved to {final_url})")
            return None
            
    except requests.exceptions.RequestException as e:
        # This will catch connection errors, timeouts, and 4xx/5xx errors
        logging.warning(f"❌ Request error for {url}: {e}")
        return None

    soup = BeautifulSoup(response.content, "html.parser")

    # Title
    title_tag = soup.find("span", {"id": "productTitle"})
    title = title_tag.get_text(strip=True) if title_tag else "N/A"
    if title == "N/A":
        title_tag = soup.select_one("h1#title")
        title = title_tag.get_text(strip=True) if title_tag else "N/A"

    # --- Smarter Price Logic ---
    price = None
    price_offscreen = soup.select_one("span.a-price > span.a-offscreen")
    if price_offscreen:
        # This is the best, most reliable price
        price = clean_price(price_offscreen.get_text())
    else:
        # Fallback: try to combine the whole and fraction parts
        price_whole = soup.select_one("span.a-price-whole")
        price_frac = soup.select_one("span.a-price-fraction")
        if price_whole:
            price_str = price_whole.get_text(strip=True)
            if price_frac:
                # Manually add the dot
                price_str = f"{price_str}{price_frac.get_text(strip=True)}"
            price = clean_price(price_str)
    # --- End Smarter Price Logic ---

    # Original price / MRP
    original_price = None
    mrp_tag = soup.select_one("span.a-text-price > span.a-offscreen")
    if mrp_tag:
        original_price = clean_price(mrp_tag.get_text())
    if not original_price and price:
        original_price = price # Default to current price if no MRP

    # Discount %
    discount_percent = 0.0
    if original_price and price and original_price > price:
        discount_percent = round((original_price - price) / original_price * 100, 2)

    # Rating
    rating = None
    rating_tag = soup.find("span", {"class": "a-icon-alt"})
    if rating_tag:
        try:
            rating_text = rating_tag.get_text().split()[0]
            rating = float(rating_text)
        except (ValueError, IndexError):
            rating = None

    # Reviews Count
    reviews_count = 0
    reviews_count_tag = soup.select_one("span#acrCustomerReviewText")
    if reviews_count_tag:
        reviews_count_str = reviews_count_tag.get_text(strip=True).split()[0]
        reviews_count = int(re.sub(r'[^\d]', '', reviews_count_str))

    # Category
    category_tags = soup.select("div#wayfinding-breadcrumbs li a")
    categories = [tag.get_text(strip=True) for tag in category_tags]
    category_str = " > ".join(categories) if categories else "N/A"

    # Availability
    availability_tag = soup.select_one("div#availability span")
    availability = "In Stock"
    if availability_tag:
        availability_text = availability_tag.get_text(strip=True).lower()
        if "out of stock" in availability_text or "unavailable" in availability_text:
            availability = "Out of Stock"
        elif "in stock" in availability_text:
             availability = "In Stock"
        else:
            availability = availability_tag.get_text(strip=True)

    # Main Image URL
    image_tag = soup.select_one("div#imgTagWrapperId img#landingImage")
    image_url = image_tag.get('src') if image_tag else "N/A"

    # --- Smarter ASIN Logic ---
    # re.I makes it case-insensitive
    asin_match = re.search(r'/(?:dp|d|gp/product)/([A-Z0-9]{10})', final_url, re.I)
    asin = asin_match.group(1).upper() if asin_match else None
    # --- End Smarter ASIN Logic ---

    if not asin:
        logging.error(f"❌ Could not extract ASIN from FINAL URL: {final_url} (Original: {url})")
        return None

    return {
        "asin": asin,
        "title": title,
        "url": final_url,
        "category": category_str,
        "availability": availability,
        "image_url": image_url,
        "price": price,
        "original_price": original_price,
        "discount_percent": discount_percent,
        "rating": rating,
        "reviews_count": reviews_count,
        "scraped_at": datetime.now(timezone.utc)
    }

# -------------------
# Main Execution
# -------------------
# Optional progress hook that external callers (like a webserver) can set.
# Expected signature: PROGRESS_HOOK(processed:int, total:int, last_asin:Optional[str]=None)
PROGRESS_HOOK = None

def main():
    """
    Main function to run the scraper.
    """
    start_time = datetime.now(timezone.utc)
    product_links = [
        "https://amzn.in/d/am4Rr4C",
        "https://amzn.in/d/9cVbj8s",
        "https://amzn.in/d/fGpfno4",
        "https://amzn.in/d/6eFNUhg",
        "https://amzn.in/d/5kfILVS",
    ]

    logging.info(f"🚀 Starting concurrent scraper for {len(product_links)} products...")

    # Load alert settings from DB (global settings document)
    alert_settings = load_alert_settings_from_db()
    threshold_percent = float(alert_settings.get('threshold_percent', 20.0))
    threshold_absolute = float(alert_settings.get('threshold_absolute', 500.0))
    min_price_for_alert = float(alert_settings.get('min_price_for_alert', 100.0))
    quiet_hours = alert_settings.get('quiet_hours')
    alerts_enabled = bool(alert_settings.get('enabled', True))

    price_history_to_insert = []
    products_scraped_count = 0
    total = len(product_links)
    processed = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        results = executor.map(scrape_amazon_product, product_links)

        for product_data in results:
            processed += 1
            try:
                if product_data:
                    products_scraped_count += 1
                    # Preserve admin-editable fields if the product already exists.
                    # Admin-editable fields (should NOT be overwritten by scraper):
                    admin_editable = {"price", "original_price", "discount_percent", "reviews_count", "rating"}

                    asin = product_data["asin"]
                    existing = products_col.find_one({"asin": asin})

                    # --- Alert checks (percent + absolute + availability) ---
                    old_price = None
                    old_availability = None
                    if existing:
                        # Prefer the admin/inventory price stored at the top-level `price` field
                        # (this represents the price set for the user's side of the website).
                        # Fall back to the scraper's last known price when admin price is not set.
                        admin_price = existing.get('price')
                        scraper_last = existing.get('scraper', {}).get('last', {})
                        # Use admin price when it exists (including 0 if intentionally set),
                        # otherwise use the last scraped price if available.
                        if admin_price is not None:
                            old_price = admin_price
                        else:
                            old_price = scraper_last.get('price') or existing.get('price')

                        # Similarly, prefer admin-provided availability, else fallback to scraper
                        old_availability = existing.get('availability') or scraper_last.get('availability')

                    new_price = product_data.get('price')
                    new_availability = product_data.get('availability')

                    # compute percent change if possible
                    try:
                        if old_price and new_price:
                            pct = (float(old_price) - float(new_price)) / float(old_price) * 100.0
                        else:
                            pct = None
                    except Exception:
                        pct = None

                    try:
                        if not alerts_enabled:
                            pass
                        else:
                            in_quiet = _in_quiet_hours(quiet_hours)
                            triggered = False
                            trigger_reason = None

                            # percent threshold
                            if pct is not None and abs(pct) >= threshold_percent:
                                triggered = True
                                trigger_reason = 'percent'

                            # absolute threshold (guard with min price)
                            if (not triggered) and old_price is not None and new_price is not None:
                                try:
                                    abs_diff = abs(float(old_price) - float(new_price))
                                    max_price = max(float(old_price), float(new_price))
                                    if abs_diff >= threshold_absolute and max_price >= min_price_for_alert:
                                        triggered = True
                                        trigger_reason = 'absolute'
                                except Exception:
                                    pass

                            # availability change always triggers (unless alerts disabled)
                            if (not triggered) and old_availability and new_availability and old_availability != new_availability:
                                triggered = True
                                trigger_reason = 'availability'

                            if triggered:
                                # Use clearer field names: `current_price` (admin/inventory) and
                                # `scraped_price` (the newly scraped value). Keep percent/absolute
                                # fields the same for backward compatibility in displays.
                                alert = {
                                    "asin": asin,
                                    "title": product_data.get('title'),
                                    "current_price": old_price,
                                    "scraped_price": new_price,
                                    "percent_change": pct or 0.0,
                                    "absolute_change": (abs(float(old_price) - float(new_price)) if (old_price is not None and new_price is not None) else None),
                                    "url": product_data.get('url'),
                                    "run_id": None,
                                    "source": "scheduled",
                                    "trigger_reason": trigger_reason
                                }
                                # For this small project we always record and notify when triggered.
                                try:
                                    record_and_notify(alert)
                                except Exception:
                                    logging.exception('Failed to record and notify alert')
                    except Exception:
                        logging.exception('Alert check failed')

                    if existing:
                        # Build a set document for metadata/identifiers only and write scraped numeric values
                        # into a separate `scraper.last` subdocument so admin-edited top-level fields
                        # (like `price`) are not overwritten by the scraper.
                        set_doc = {}
                        allowed_scraper_fields = ["title", "url", "category", "availability", "image_url"]
                        for f in allowed_scraper_fields:
                            if f in product_data:
                                set_doc[f] = product_data[f]

                        # Always update the scraper subdocument with latest scraped metrics
                        set_doc["scraper.last"] = {
                            "price": product_data.get("price"),
                            "original_price": product_data.get("original_price"),
                            "discount_percent": product_data.get("discount_percent"),
                            "rating": product_data.get("rating"),
                            "reviews_count": product_data.get("reviews_count"),
                            "scraped_at": product_data.get("scraped_at")
                        }

                        products_col.update_one({"asin": asin}, {"$set": set_doc}, upsert=False)
                    else:
                        # New product - insert full scraped document and mirror scraped metrics
                        # into `scraper.last` for consistency
                        to_insert = dict(product_data)
                        to_insert.setdefault("scraper", {})
                        to_insert["scraper"]["last"] = {
                            "price": product_data.get("price"),
                            "original_price": product_data.get("original_price"),
                            "discount_percent": product_data.get("discount_percent"),
                            "rating": product_data.get("rating"),
                            "reviews_count": product_data.get("reviews_count"),
                            "scraped_at": product_data.get("scraped_at")
                        }
                        products_col.insert_one(to_insert)
                    price_history_to_insert.append({
                        "asin": product_data["asin"],
                        "price": product_data["price"],
                        "original_price": product_data["original_price"],
                        "discount_percent": product_data["discount_percent"],
                        "scraped_at": product_data["scraped_at"]
                    })
                    # Use logging.info for successful scrapes
                    logging.info(f"✅ Scraped: {product_data['title'][:35]}... | Price: ₹{product_data['price']}")
                    last_asin = product_data.get('asin')
                else:
                    logging.warning("⚠️ A product scrape failed. See error logs above.")
                    last_asin = None

            except Exception:
                # don't let one failure stop progress reporting
                logging.exception("Error processing product result")
                last_asin = None

            # report progress if hook is provided
            try:
                if callable(PROGRESS_HOOK):
                    try:
                        PROGRESS_HOOK(processed, total, last_asin)
                    except Exception:
                        # don't let progress hook failures interrupt scraping
                        logging.debug('Progress hook raised an error')
            except Exception:
                pass

    # --- Upgraded Database Insert ---
    if price_history_to_insert:
        try:
            price_history_col.insert_many(price_history_to_insert, ordered=False)
            logging.info(f"\n🎉 Scraping complete! Successfully scraped {products_scraped_count}/{len(product_links)} products.")
            logging.info(f"📈 Inserted {len(price_history_to_insert)} records into price history.")
        except Exception as e:
            logging.exception(f"❌ Failed to insert price history batch: {e}")
    else:
        logging.warning("\n❌ Scraping finished, but no new data was inserted into price history.")

    # -------------------
    # Display Products in Pandas
    # -------------------
    logging.info("\nFetching data from MongoDB to display...")

    products_list = list(products_col.find())
    products_df = pd.DataFrame(products_list)

    if not products_df.empty:
        columns_to_show = [
            "title", "price", "original_price", "discount_percent", 
            "rating", "reviews_count", "availability", "category", "scraped_at"
        ]
        for col in columns_to_show:
            if col not in products_df.columns:
                products_df[col] = "N/A"

        # Set pandas to show full text, not truncated
        pd.set_option('display.max_rows', None)
        pd.set_option('display.max_columns', None)
        pd.set_option('display.width', 1000)
        
        print("\n--- Scraped Product Data ---")
        print(products_df[columns_to_show])
        print("----------------------------\n")
    else:
        logging.info("No products found in the 'products' collection.")
    # Compute run summary
    end_time = datetime.now(timezone.utc)
    duration_secs = (end_time - start_time).total_seconds()
    summary = {
        "products_scraped": products_scraped_count,
        "price_history_inserted": len(price_history_to_insert),
        "started_at": start_time,
        "finished_at": end_time,
        "duration_seconds": duration_secs
    }
    return summary

# This makes the script runnable
if __name__ == "__main__":
    main()


def run_scraper():
    """
    Importable wrapper for running the scraper programmatically.
    This function acquires a simple MongoDB-backed lock to prevent overlapping
    runs, records run metadata into `scraper_runs`, and releases the lock when
    finished. Returns a dict with status information.
    """
    run_id = str(uuid.uuid4())
    locks_col = db.get_collection('scraper_locks')
    runs_col = db.get_collection('scraper_runs')
    now = datetime.now(timezone.utc)

    # Try to acquire lock by inserting a doc with a well-known _id. If insert
    # fails with DuplicateKeyError, another run is active.
    lock_doc = {
        "_id": "amazon_scraper_lock",
        "run_id": run_id,
        "locked_at": now
    }
    try:
        locks_col.insert_one(lock_doc)
    except DuplicateKeyError:
        logging.info("Another scraper run is active — exiting early.")
        return {"status": "locked"}
    except Exception:
        logging.exception("Failed to create lock document")
        return {"status": "lock_error"}

    # Record run start
    runs_col.insert_one({"run_id": run_id, "started_at": now, "status": "running"})

    try:
        result = main()
        # If main returned a summary dict, persist useful fields
        update_fields = {"finished_at": datetime.now(timezone.utc), "status": "success"}
        if isinstance(result, dict):
            update_fields.update({
                "products_scraped": int(result.get("products_scraped", 0)),
                "price_history_inserted": int(result.get("price_history_inserted", 0)),
                "duration_seconds": float(result.get("duration_seconds", 0.0)),
                "started_at": result.get("started_at")
            })

        runs_col.update_one({"run_id": run_id}, {"$set": update_fields})
        return {"status": "ok", "run_id": run_id, "summary": result}
    except Exception as e:
        logging.exception(f"Run scraper failed: {e}")
        runs_col.update_one({"run_id": run_id}, {"$set": {"finished_at": datetime.now(timezone.utc), "status": "failed", "error": str(e)}})
        return {"status": "error", "run_id": run_id, "error": str(e)}
    finally:
        try:
            locks_col.delete_one({"_id": "amazon_scraper_lock", "run_id": run_id})
        except Exception:
            logging.exception("Failed to release scraper lock")