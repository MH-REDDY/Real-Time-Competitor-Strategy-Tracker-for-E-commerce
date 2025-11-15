"""
Tools for LLM chatbot - MongoDB queries, XGBoost API, scraper integration
"""
import os
import httpx
from pymongo import MongoClient
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import asyncio
import subprocess
from uuid import uuid4

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI')
MONGO_DB = os.getenv('MONGO_DB', 'ecom_tracker')

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]

# Collections
products_collection = db['products']
price_history_collection = db['price_history']
synthetic_data_collection = db['synthetic_data']
scrape_jobs_collection = db.get_collection('scrape_jobs')

# XGBoost API
XGBOOST_API_URL = "http://localhost:5000"


# Tool 1: Search Products
def search_products(query: str = None, brand: str = None, min_rating: float = None) -> List[Dict]:
    """
    Search products in database
    
    Args:
        query: Search term (searches in title)
        brand: Filter by brand name
        min_rating: Minimum rating filter
    
    Returns:
        List of product dictionaries
    """
    try:
        filter_query = {}
        
        if query:
            filter_query['title'] = {'$regex': query, '$options': 'i'}
        
        if brand:
            filter_query['$or'] = [
                {'title': {'$regex': brand, '$options': 'i'}},
                {'brand': {'$regex': brand, '$options': 'i'}} if 'brand' in products_collection.find_one() or {} else {}
            ]
        
        if min_rating:
            filter_query['rating'] = {'$gte': min_rating}
        
        products = list(products_collection.find(filter_query, {'_id': 0}).limit(20))
        
        # Enhance with latest prices if available
        for product in products:
            asin = product.get('asin')
            if asin:
                latest_price = price_history_collection.find_one(
                    {'asin': asin},
                    sort=[('scraped_at', -1)]
                )
                if latest_price:
                    product['latest_price'] = latest_price.get('price')
                    product['last_updated'] = latest_price.get('scraped_at')
        
        return products
    except Exception as e:
        return [{"error": f"Failed to search products: {str(e)}"}]


# Tool 2: Get Product by ASIN
def get_product_details(asin: str) -> Dict:
    """Get detailed product information"""
    try:
        product = products_collection.find_one({'asin': asin}, {'_id': 0})
        if not product:
            return {"error": f"Product with ASIN {asin} not found"}
        
        # Get latest price
        latest_price = price_history_collection.find_one(
            {'asin': asin},
            sort=[('scraped_at', -1)]
        )
        if latest_price:
            product['latest_price'] = latest_price.get('price')
            product['last_updated'] = latest_price.get('scraped_at')
        
        return product
    except Exception as e:
        return {"error": f"Failed to get product details: {str(e)}"}


# Tool 3: Get Price Trends
def get_price_trends(asin: str = None, brand: str = None, days: int = 30) -> Dict:
    """
    Analyze price trends for a product
    
    Args:
        asin: Product ASIN
        brand: Brand name (if ASIN not provided)
        days: Number of days to analyze
    
    Returns:
        Price trend analysis
    """
    try:
        # Find product
        if not asin and brand:
            product = products_collection.find_one({'title': {'$regex': brand, '$options': 'i'}})
            if product:
                asin = product['asin']
        
        if not asin:
            return {"error": "Product not found. Please specify ASIN or brand name."}
        
        # Get price history
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Try synthetic_data first (has more history)
        prices = list(synthetic_data_collection.find(
            {
                'asin': asin,
                'scraped_at': {'$gte': cutoff_date}
            },
            {'_id': 0, 'price': 1, 'scraped_at': 1, 'discount_percent': 1}
        ).sort('scraped_at', 1))
        
        # Fallback to price_history
        if not prices:
            prices = list(price_history_collection.find(
                {
                    'asin': asin,
                    'scraped_at': {'$gte': cutoff_date}
                },
                {'_id': 0, 'price': 1, 'scraped_at': 1, 'discount_percent': 1}
            ).sort('scraped_at', 1))
        
        if not prices:
            return {"error": f"No price history found for the last {days} days"}
        
        # Calculate statistics
        price_values = [p['price'] for p in prices if 'price' in p]
        
        if not price_values:
            return {"error": "No valid price data"}
        
        first_price = price_values[0]
        last_price = price_values[-1]
        avg_price = sum(price_values) / len(price_values)
        min_price = min(price_values)
        max_price = max(price_values)
        
        price_change = last_price - first_price
        price_change_pct = (price_change / first_price * 100) if first_price > 0 else 0
        
        trend = "stable"
        if price_change_pct > 5:
            trend = "increasing"
        elif price_change_pct < -5:
            trend = "decreasing"
        
        return {
            "asin": asin,
            "period_days": days,
            "data_points": len(prices),
            "first_price": round(first_price, 2),
            "last_price": round(last_price, 2),
            "avg_price": round(avg_price, 2),
            "min_price": round(min_price, 2),
            "max_price": round(max_price, 2),
            "price_change": round(price_change, 2),
            "price_change_percent": round(price_change_pct, 2),
            "trend": trend,
            "price_history": [
                {
                    "date": p['scraped_at'].strftime('%Y-%m-%d') if isinstance(p['scraped_at'], datetime) else str(p['scraped_at']),
                    "price": round(p['price'], 2)
                }
                for p in prices[-30:]  # Last 30 data points for chart
            ]
        }
    except Exception as e:
        return {"error": f"Failed to analyze price trends: {str(e)}"}


# Tool 4: Get Forecast from XGBoost API
async def get_forecast(brand: str, model: str, days: int = 30) -> Dict:
    """
    Get price forecast from XGBoost API
    
    Args:
        brand: Product brand
        model: Product model
        days: Number of days to forecast (default 30)
    
    Returns:
        Forecast data with historical + predictions
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{XGBOOST_API_URL}/api/forecast",
                json={"brand": brand, "model": model}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Parse and format response
                forecast_result = {
                    "brand": data.get('brand'),
                    "model": data.get('model'),
                    "historical_data": data.get('historical', []),
                    "forecast_data": data.get('forecast', [])[:days],  # Limit to requested days
                    "total_historical_points": len(data.get('historical', [])),
                    "forecast_days": min(days, len(data.get('forecast', [])))
                }
                
                # Add summary
                if forecast_result['forecast_data']:
                    first_forecast = forecast_result['forecast_data'][0]
                    last_forecast = forecast_result['forecast_data'][-1]
                    
                    forecast_result['summary'] = {
                        "starting_price": round(first_forecast.get('price', 0), 2),
                        "ending_price": round(last_forecast.get('price', 0), 2),
                        "price_change": round(last_forecast.get('price', 0) - first_forecast.get('price', 0), 2),
                        "avg_discount": round(sum(f.get('discount', 0) for f in forecast_result['forecast_data']) / len(forecast_result['forecast_data']), 2)
                    }
                
                return forecast_result
            else:
                return {"error": f"Forecast API error: {response.text}"}
    
    except Exception as e:
        return {"error": f"Failed to get forecast: {str(e)}"}


# Tool 5: Trigger Scraper
async def trigger_scraper(product_query: str = None) -> Dict:
    """
    Trigger Amazon scraper to get latest prices
    
    Args:
        product_query: Optional product to scrape (scrapes all if not provided)
    
    Returns:
        Scraper status with updated prices
    """
    import asyncio
    print(f"🚀 TRIGGER_SCRAPER CALLED with product_query={product_query}")
    try:
        # Note: Scraper runs asynchronously, doesn't block
        scraper_path = os.path.join(os.path.dirname(__file__), '../../amazon_scraper/amazon_price_scraper.py')
        print(f"📍 Scraper path: {scraper_path}")
        
        # Start scraper in background
        process = subprocess.Popen(
            ['python', scraper_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=os.path.dirname(scraper_path)
        )
        print(f"✅ Scraper process started with PID: {process.pid}")
        
        # Record a scrape job for basic tracking (best-effort; scraper may not update this document)
        job_id = str(uuid4())
        print(f"📝 Job ID: {job_id}")
        try:
            scrape_jobs_collection.insert_one({
                "job_id": job_id,
                "status": "running",
                "started_at": datetime.utcnow(),
                "product_query": product_query,
                "pid": process.pid,
                "source": "Amazon"
            })
            print(f"✅ Job recorded in database")
        except Exception as e:
            # Non-fatal if jobs collection is missing permissions
            print(f"⚠️  Job recording failed: {e}")
            pass

        # Wait 8 seconds for scraper to complete (it typically takes 5-6 seconds)
        print(f"⏳ Waiting 8 seconds for scraper to complete...")
        await asyncio.sleep(8)
        print(f"✅ Wait complete, checking for results...")
        
        # Check if scraper completed and get results
        two_minutes_ago = datetime.utcnow() - timedelta(minutes=2)
        recent_prices = list(price_history_collection.find(
            {"scraped_at": {"$gte": two_minutes_ago}},
            {"_id": 0, "asin": 1, "price": 1, "currency": 1, "scraped_at": 1}
        ).sort("scraped_at", -1).limit(10))
        
        print(f"📊 Found {len(recent_prices)} recent prices")
        
        if not recent_prices:
            return {
                "status": "in_progress",
                "message": "Scraper started but no new prices detected yet. Please try checking again in a moment.",
                "job_id": job_id,
                "source": "Amazon"
            }
        
        # Get product details for these ASINs
        asins = list(set([p['asin'] for p in recent_prices]))
        products_data = {
            p['asin']: p 
            for p in products_collection.find(
                {"asin": {"$in": asins}},
                {"_id": 0, "asin": 1, "title": 1, "brand": 1, "rating": 1, "reviews_count": 1}
            )
        }
        
        # Combine price and product data
        results = []
        for price_rec in recent_prices:
            asin = price_rec['asin']
            product = products_data.get(asin, {})
            results.append({
                "asin": asin,
                "title": product.get('title', 'Unknown'),
                "brand": product.get('brand', 'Unknown'),
                "current_price": price_rec['price'],
                "currency": price_rec.get('currency', 'INR'),
                "rating": product.get('rating'),
                "reviews_count": product.get('reviews_count'),
                "last_updated": price_rec['scraped_at']
            })
        
        print(f"✅ Returning {len(results)} scraped products")
        return {
            "status": "completed",
            "message": f"✅ Scraper completed successfully! {len(results)} prices updated from Amazon India.",
            "scraped_count": len(results),
            "products": results[:5],  # Show top 5
            "job_id": job_id,
            "source": "Amazon"
        }
    except Exception as e:
        print(f"❌ ERROR in trigger_scraper: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": f"Failed to trigger scraper: {str(e)}"}


# Tool 6: Get Pricing Recommendation
def get_pricing_recommendation(asin: str = None, brand: str = None) -> Dict:
    """
    Analyze competitor prices and provide pricing recommendations
    
    Args:
        asin: Product ASIN
        brand: Brand name
    
    Returns:
        Pricing recommendation
    """
    try:
        # Find product
        if not asin and brand:
            product = products_collection.find_one({'title': {'$regex': brand, '$options': 'i'}})
            if product:
                asin = product['asin']
        
        if not asin:
            return {"error": "Product not found"}
        
        # Get product details
        product = products_collection.find_one({'asin': asin}, {'_id': 0})
        current_price = product.get('price', 0)
        rating = product.get('rating', 0)
        title = product.get('title', '')
        
        # Get latest competitor price
        latest_price = price_history_collection.find_one(
            {'asin': asin},
            sort=[('scraped_at', -1)]
        )
        competitor_price = latest_price.get('price', current_price) if latest_price else current_price
        
        # Get price trends
        trends = get_price_trends(asin=asin, days=30)
        
        # Recommendation logic
        recommendation = {
            "asin": asin,
            "product": title,
            "current_price": round(current_price, 2),
            "competitor_price": round(competitor_price, 2),
            "rating": rating,
            "trend": trends.get('trend', 'unknown') if not trends.get('error') else 'unknown'
        }
        
        # Calculate recommended price
        if rating >= 4.0:
            # High rating - can price slightly higher or match
            recommended = competitor_price * 1.02  # 2% higher
            strategy = "premium_match"
            reason = "Your product has excellent rating (4.0+), you can maintain premium pricing"
        elif rating >= 3.5:
            # Good rating - match competitor
            recommended = competitor_price
            strategy = "competitive_match"
            reason = "Match competitor price given similar quality"
        else:
            # Lower rating - price below competitor
            recommended = competitor_price * 0.95  # 5% lower
            strategy = "competitive_undercut"
            reason = "Price below competitor to compensate for lower rating"
        
        # Adjust for trends
        if trends.get('trend') == 'decreasing':
            recommended = recommended * 0.97  # Further 3% discount if market is dropping
            reason += ". Market prices are decreasing, recommend aggressive pricing."
        elif trends.get('trend') == 'increasing':
            recommended = recommended * 1.02  # Can price slightly higher if market rising
            reason += ". Market prices are rising, safe to increase price."
        
        recommendation['recommended_price'] = round(recommended, 2)
        recommendation['price_change_from_current'] = round(recommended - current_price, 2)
        recommendation['price_change_percent'] = round((recommended - current_price) / current_price * 100, 2) if current_price > 0 else 0
        recommendation['strategy'] = strategy
        recommendation['reason'] = reason
        
        return recommendation
    
    except Exception as e:
        return {"error": f"Failed to generate pricing recommendation: {str(e)}"}


# Tool 7: Get Highest Rated Products
def get_top_rated_products(limit: int = 5) -> List[Dict]:
    """Get products with highest ratings"""
    try:
        products = list(products_collection.find(
            {},
            {'_id': 0}
        ).sort('rating', -1).limit(limit))
        
        return products
    except Exception as e:
        return [{"error": f"Failed to get top rated products: {str(e)}"}]


# Tool 8: Get latest Amazon price
def get_latest_price(asin: str = None, brand: str = None) -> Dict:
    """Return the most recent price for a given product (Amazon source)."""
    try:
        if not asin and brand:
            product = products_collection.find_one({'title': {'$regex': brand, '$options': 'i'}}, {'_id': 0})
            if product:
                asin = product.get('asin')
        if not asin:
            return {"error": "Please provide ASIN or brand to locate a product."}

        latest = price_history_collection.find_one(
            {"asin": asin},
            sort=[('scraped_at', -1)],
            projection={'_id': 0, 'price': 1, 'scraped_at': 1, 'currency': 1, 'source': 1}
        )
        if not latest:
            return {"asin": asin, "message": "No price history found yet", "source": "Amazon"}

        price = latest.get('price')
        ts = latest.get('scraped_at')
        currency = latest.get('currency', 'INR')
        source = latest.get('source') or 'Amazon'
        return {
            "asin": asin,
            "latest_price": price,
            "currency": currency,
            "last_updated": ts,
            "source": source
        }
    except Exception as e:
        return {"error": f"Failed to get latest price: {str(e)}"}


# Tool 9: Check scraper completion and get updated prices
def check_scraper_status(job_id: str = None) -> Dict:
    """
    Check if scraper has finished and return recently updated prices.
    Use this after triggering scraper to show users the updated data.
    
    Args:
        job_id: Optional job ID from trigger_scraper
    
    Returns:
        Scraper completion status and updated prices
    """
    try:
        # Check for recent price updates (within last 2 minutes)
        two_minutes_ago = datetime.utcnow() - timedelta(minutes=2)
        recent_prices = list(price_history_collection.find(
            {"scraped_at": {"$gte": two_minutes_ago}},
            {"_id": 0, "asin": 1, "price": 1, "currency": 1, "scraped_at": 1}
        ).sort("scraped_at", -1).limit(10))
        
        if not recent_prices:
            return {
                "status": "in_progress",
                "message": "Scraper is still running. No new prices detected yet. Please wait 30-60 seconds.",
                "scraped_count": 0
            }
        
        # Get product details for these ASINs
        asins = list(set([p['asin'] for p in recent_prices]))
        products = {
            p['asin']: p 
            for p in products_collection.find(
                {"asin": {"$in": asins}},
                {"_id": 0, "asin": 1, "title": 1, "brand": 1, "rating": 1, "reviews_count": 1}
            )
        }
        
        # Combine price and product data
        results = []
        for price_rec in recent_prices:
            asin = price_rec['asin']
            product = products.get(asin, {})
            results.append({
                "asin": asin,
                "title": product.get('title', 'Unknown'),
                "brand": product.get('brand', 'Unknown'),
                "current_price": price_rec['price'],
                "currency": price_rec.get('currency', 'INR'),
                "rating": product.get('rating'),
                "reviews_count": product.get('reviews_count'),
                "last_updated": price_rec['scraped_at']
            })
        
        return {
            "status": "completed",
            "message": f"Scraper completed successfully! {len(results)} prices updated.",
            "scraped_count": len(results),
            "products": results[:5]  # Show top 5
        }
        
    except Exception as e:
        return {"error": f"Failed to check scraper status: {str(e)}"}
