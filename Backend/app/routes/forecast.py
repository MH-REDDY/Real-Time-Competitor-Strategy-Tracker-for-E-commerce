"""
Improved ML Forecast routes - fetches real data from MongoDB
Returns actual prices and product images
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from app.config.database import get_database
from app.utils.security import get_current_admin, TokenData
import random
import logging

# Set up logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = APIRouter(prefix="/api", tags=["ML Forecast"])

class ForecastRequest(BaseModel):
    brand: str
    model: str

class DataPoint(BaseModel):
    date: str
    price: float
    discount: float

class ForecastResponse(BaseModel):
    brand: str
    model: str
    historical: List[DataPoint]
    forecast: List[DataPoint]
    product_info: Optional[Dict] = None  # Add product details

class BrandsResponse(BaseModel):
    brands: List[str]
    modelsByBrand: Dict[str, List[str]]

class ProductInfo(BaseModel):
    asin: str
    title: str
    price: Optional[float] = None
    original_price: Optional[float] = None
    discount_percent: Optional[float] = None
    image_url: Optional[str] = None
    rating: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    availability: Optional[str] = None
    reviews_count: Optional[int] = None
    scraped_at: Optional[str] = None

class ProductCreate(BaseModel):
    asin: str
    category: Optional[str] = None
    description: Optional[str] = None
    discount_percent: Optional[float] = None
    original_price: Optional[float] = None
    price: Optional[float] = None
    rating: Optional[float] = None
    scraped_at: Optional[str] = Field(default=None, description="ISO datetime string")
    title: str
    url: Optional[str] = None
    availability: Optional[str] = None
    image_url: Optional[str] = None
    reviews_count: Optional[int] = None

class ProductUpdate(ProductCreate):
    pass

@router.get("/products", response_model=List[ProductInfo])
async def get_products():
    """Get all products from MongoDB with full details"""
    try:
        db = get_database()
        products_collection = db['products']
        
        # Get products from MongoDB with all relevant fields
        products = list(products_collection.find(
            {}, 
            {
                '_id': 0, 
                'asin': 1, 
                'title': 1,
                'price': 1,
                'original_price': 1,
                'discount_percent': 1,
                'image_url': 1,
                'rating': 1,
                'category': 1,
                'description': 1,
                'url': 1,
                'availability': 1,
                'reviews_count': 1,
                'scraped_at': 1,
            }
        ))
        
        if not products:
            return []
        
        # Ensure all values are properly typed
        for product in products:
            if 'price' in product and product['price']:
                try:
                    product['price'] = float(product['price'])
                except:
                    product['price'] = None
            if 'original_price' in product and product['original_price']:
                try:
                    product['original_price'] = float(product['original_price'])
                except:
                    product['original_price'] = None
            if 'discount_percent' in product and product['discount_percent']:
                try:
                    product['discount_percent'] = float(product['discount_percent'])
                except:
                    product['discount_percent'] = None
            if 'rating' in product and product['rating']:
                try:
                    product['rating'] = float(product['rating'])
                except:
                    product['rating'] = None
            # stringify scraped_at
            if 'scraped_at' in product and product['scraped_at']:
                try:
                    product['scraped_at'] = product['scraped_at'].isoformat()
                except:
                    product['scraped_at'] = str(product['scraped_at'])
        
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching products: {str(e)}")

@router.post("/products", response_model=dict)
async def create_product(payload: ProductCreate, current_admin: TokenData = Depends(get_current_admin)):
    """Create a new product (Admin only)"""
    try:
        db = get_database()
        products_collection = db['products']
        # Upsert by asin
        doc = payload.dict()
        # Parse scraped_at
        if doc.get('scraped_at'):
            try:
                from datetime import datetime
                doc['scraped_at'] = datetime.fromisoformat(doc['scraped_at'])
            except Exception:
                pass
        products_collection.update_one({"asin": doc['asin']}, {"$set": doc}, upsert=True)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Create product error: {str(e)}")

@router.get("/products/{asin}", response_model=ProductInfo)
async def get_product(asin: str):
    """Get a single product by ASIN"""
    try:
        db = get_database()
        col = db['products']
        doc = col.find_one({"asin": asin}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Product not found")
        # Normalize numeric fields and datetime
        for k in ["price","original_price","discount_percent","rating"]:
            if k in doc and doc[k] is not None:
                try:
                    doc[k] = float(doc[k])
                except:
                    pass
        if 'reviews_count' in doc and doc['reviews_count'] is not None:
            try:
                doc['reviews_count'] = int(doc['reviews_count'])
            except:
                pass
        if doc.get('scraped_at'):
            try:
                doc['scraped_at'] = doc['scraped_at'].isoformat()
            except:
                doc['scraped_at'] = str(doc['scraped_at'])
        return doc
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Get product error: {str(e)}")

@router.put("/products/{asin}", response_model=dict)
async def update_product(asin: str, payload: ProductUpdate, current_admin: TokenData = Depends(get_current_admin)):
    """Update product by ASIN (Admin only)"""
    try:
        db = get_database()
        products_collection = db['products']
        doc = payload.dict()
        if doc.get('scraped_at'):
            try:
                from datetime import datetime
                doc['scraped_at'] = datetime.fromisoformat(doc['scraped_at'])
            except Exception:
                pass
        result = products_collection.update_one({"asin": asin}, {"$set": doc})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update product error: {str(e)}")

@router.delete("/products/{asin}", response_model=dict)
async def delete_product(asin: str, current_admin: TokenData = Depends(get_current_admin)):
    """Delete product by ASIN (Admin only)"""
    try:
        db = get_database()
        products_collection = db['products']
        result = products_collection.delete_one({"asin": asin})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete product error: {str(e)}")

@router.post("/products/import", response_model=dict)
async def import_products(items: List[ProductCreate], current_admin: TokenData = Depends(get_current_admin)):
    """Bulk import products (Admin only)"""
    try:
        db = get_database()
        col = db['products']
        docs = []
        from datetime import datetime
        for it in items:
            d = it.dict()
            if d.get('scraped_at'):
                try:
                    d['scraped_at'] = datetime.fromisoformat(d['scraped_at'])
                except Exception:
                    pass
            docs.append(d)
        # Upsert each by asin
        for d in docs:
            col.update_one({"asin": d['asin']}, {"$set": d}, upsert=True)
        return {"status": "ok", "count": len(docs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")

@router.get("/brands", response_model=BrandsResponse)
async def get_brands():
    """Get available brands and models from MongoDB"""
    try:
        db = get_database()
        products_collection = db['products']
        
        # Get all products
        products = list(products_collection.find({}, {'_id': 0, 'asin': 1, 'title': 1}))
        
        if not products:
            return {"brands": [], "modelsByBrand": {}}
        
        # Parse brands and models from titles
        brands = []
        models_by_brand = {}
        
        for product in products:
            title = product.get('title', '')
            parts = title.split()
            
            if len(parts) > 0:
                brand = parts[0]  # First word as brand
                model = ' '.join(parts[1:]) if len(parts) > 1 else title
                
                if brand not in brands:
                    brands.append(brand)
                if brand not in models_by_brand:
                    models_by_brand[brand] = []
                if model not in models_by_brand[brand]:
                    models_by_brand[brand].append(model)
        
        return {"brands": brands, "modelsByBrand": models_by_brand}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching brands: {str(e)}")

@router.post("/forecast", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    """
    Generate price forecast using real MongoDB data
    Returns historical prices and simple forecast with product details
    """
    try:
        db = get_database()
        products_collection = db['products']
        price_history_collection = db['price_history']
        
        # Find product matching brand and model
        search_term = f"{request.brand} {request.model}".lower()
        product = products_collection.find_one({
            "$or": [
                {"title": {"$regex": search_term, "$options": "i"}},
                {"title": {"$regex": request.brand, "$options": "i"}}
            ]
        })
        
        if not product:
            raise HTTPException(
                status_code=404, 
                detail=f"No data found for {request.brand} - {request.model}"
            )
        
        asin = product['asin']
        
        # Get product info for response
        product_info = {
            'asin': asin,
            'title': product.get('title', ''),
            'current_price': float(product.get('price', 0)) if product.get('price') else None,
            'original_price': float(product.get('original_price', 0)) if product.get('original_price') else None,
            'discount_percent': float(product.get('discount_percent', 0)) if product.get('discount_percent') else None,
            'image_url': product.get('image_url', ''),
            'rating': float(product.get('rating', 0)) if product.get('rating') else None
        }
        
        # Get price history for this product
        # Use synthetic_data collection (this has the historical variations)
        logger.info(f"🔍 Looking for price data for ASIN: {asin}")
        
        synthetic_collection = db['synthetic_data']
        price_records = list(synthetic_collection.find(
            {"asin": asin},
            {'_id': 0, 'price': 1, 'original_price': 1, 'discount_percent': 1, 'scraped_at': 1}
        ).sort('scraped_at', 1).limit(90))  # Get up to 90 days of history
        
        logger.info(f"📊 Found {len(price_records)} records in synthetic_data")
        
        # If no data in synthetic_data, try price_history collection as fallback
        if not price_records:
            price_history_collection = db['price_history']
            price_records = list(price_history_collection.find(
                {"asin": asin},
                {'_id': 0, 'price': 1, 'original_price': 1, 'discount_percent': 1, 'scraped_at': 1}
            ).sort('scraped_at', 1).limit(90))
            logger.info(f"📊 Found {len(price_records)} records in price_history")
        
        # If still no data, check what's actually in the collection
        if not price_records:
            # Let's see what fields the synthetic data actually has
            sample = synthetic_collection.find_one()
            logger.info(f"📄 Sample document from synthetic_data: {sample}")
            
            # Try searching without ASIN filter to see all data
            all_records = list(synthetic_collection.find({}).limit(5))
            logger.info(f"📊 Found {len(all_records)} total records in synthetic_data")
            if all_records:
                logger.info(f"📄 Sample record structure: {all_records[0]}")
        
        # Format historical data
        historical = []
        
        if price_records:
            logger.info(f"⚙️ Processing {len(price_records)} price records")
            for i, record in enumerate(price_records):
                try:
                    price_val = float(record.get('price', 0)) if record.get('price') else 0
                    discount_val = float(record.get('discount_percent', 0)) if record.get('discount_percent') else 0
                    
                    if price_val > 0:  # Only include valid prices
                        historical.append({
                            'date': record['scraped_at'].strftime('%Y-%m-%d'),
                            'price': round(price_val, 2),
                            'discount': round(discount_val, 2)
                        })
                        if i < 3:  # Log first 3 for debugging
                            logger.info(f"💰 Record {i}: date={record.get('scraped_at')}, price={price_val}, discount={discount_val}")
                except Exception as e:
                    logger.error(f"❌ Error parsing record: {e}, record: {record}")
                    continue
        
        logger.info(f"✅ Created {len(historical)} historical data points")
        
        # If no historical data from price_history, use current product data
        if not historical and product.get('price'):
            try:
                current_price = float(product['price'])
                current_discount = float(product.get('discount_percent', 0))
                
                # Create a historical entry with today's date
                historical.append({
                    'date': datetime.now().strftime('%Y-%m-%d'),
                    'price': round(current_price, 2),
                    'discount': round(current_discount, 2)
                })
            except:
                pass
        
        # Generate forecast (30 days)
        forecast = []
        
        if historical:
            # Use last known price as baseline
            last_price = historical[-1]['price']
            last_discount = historical[-1]['discount']
            last_date = datetime.strptime(historical[-1]['date'], '%Y-%m-%d')
            
            # Calculate average price trend if we have enough history
            if len(historical) > 1:
                price_changes = []
                for i in range(1, len(historical)):
                    change = (historical[i]['price'] - historical[i-1]['price']) / historical[i-1]['price']
                    price_changes.append(change)
                avg_trend = sum(price_changes) / len(price_changes) if price_changes else 0
            else:
                avg_trend = 0
            
            for i in range(1, 31):  # 30 days forecast
                forecast_date = last_date + timedelta(days=i)
                
                # Apply trend with some randomness
                trend_factor = avg_trend + random.uniform(-0.01, 0.01)  # ±1%
                discount_variation = random.uniform(-1, 1)  # ±1 percentage point
                
                forecast_price = last_price * (1 + trend_factor)
                forecast_discount = max(0, min(100, last_discount + discount_variation))
                
                # Keep prices reasonable
                forecast_price = max(forecast_price, last_price * 0.7)  # Not more than 30% drop
                forecast_price = min(forecast_price, last_price * 1.3)  # Not more than 30% increase
                
                forecast.append({
                    'date': forecast_date.strftime('%Y-%m-%d'),
                    'price': round(forecast_price, 2),
                    'discount': round(forecast_discount, 2)
                })
                
                # Update baseline
                last_price = forecast_price
                last_discount = forecast_discount
        else:
            # No historical data - create forecast based on current price
            base_price = float(product.get('price', 1000)) if product.get('price') else 1000
            base_discount = float(product.get('discount_percent', 10)) if product.get('discount_percent') else 10
            start_date = datetime.now()
            
            for i in range(30):
                forecast_date = start_date + timedelta(days=i)
                price_variation = random.uniform(-0.01, 0.01)  # ±1%
                discount_variation = random.uniform(-1, 1)
                
                forecast.append({
                    'date': forecast_date.strftime('%Y-%m-%d'),
                    'price': round(base_price * (1 + price_variation), 2),
                    'discount': round(max(0, min(100, base_discount + discount_variation)), 2)
                })
        
        return {
            "brand": request.brand,
            "model": request.model,
            "historical": historical,
            "forecast": forecast,
            "product_info": product_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Forecast error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")

@router.get("/health")
async def ml_health_check():
    """Health check for ML API"""
    return {
        "status": "healthy",
        "message": "ML Forecast API is running",
        "model": "Simple trend forecast"
    }

@router.get("/debug/database")
async def debug_database():
    """Debug endpoint to check database collections"""
    try:
        db = get_database()
        
        # Check all collections
        collections = db.list_collection_names()
        
        # Count documents in each relevant collection
        products_count = db['products'].count_documents({})
        price_history_count = db['price_history'].count_documents({})
        
        # Get sample product
        sample_product = db['products'].find_one({}, {'_id': 0})
        
        # Check if price_history has any data for this product
        price_history_sample = None
        if sample_product and 'asin' in sample_product:
            price_history_sample = list(db['price_history'].find(
                {"asin": sample_product['asin']},
                {'_id': 0}
            ).limit(3))
        
        # Check synthetic_data if it exists
        synthetic_data_count = 0
        synthetic_sample = None
        if 'synthetic_data' in collections:
            synthetic_data_count = db['synthetic_data'].count_documents({})
            synthetic_sample = db['synthetic_data'].find_one({}, {'_id': 0})
        
        return {
            "collections": collections,
            "counts": {
                "products": products_count,
                "price_history": price_history_count,
                "synthetic_data": synthetic_data_count
            },
            "samples": {
                "product": sample_product,
                "price_history": price_history_sample,
                "synthetic_data": synthetic_sample
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Debug error: {str(e)}")

@router.get("/compare")
async def get_compare_data():
    """Get all products with latest prices for comparison"""
    try:
        db = get_database()
        products_collection = db['products']
        
        # Get all products with their details
        products = list(products_collection.find({}, {'_id': 0}))
        
        # Ensure prices are properly formatted
        for product in products:
            if 'price' in product and product['price']:
                try:
                    product['price'] = float(product['price'])
                except:
                    pass
            if 'original_price' in product and product['original_price']:
                try:
                    product['original_price'] = float(product['original_price'])
                except:
                    pass
            if 'discount_percent' in product and product['discount_percent']:
                try:
                    product['discount_percent'] = float(product['discount_percent'])
                except:
                    pass
            if 'rating' in product and product['rating']:
                try:
                    product['rating'] = float(product['rating'])
                except:
                    pass
        
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching compare data: {str(e)}")

@router.post("/scrape")
async def trigger_scrape():
    """Trigger scraping process"""
    try:
        # For now, return a message that scraper needs to be run manually
        # The scraper is a separate Python script in amazon_scraper folder
        return {
            "status": "info",
            "message": "Scraper needs to be run manually. Please run the scraper script from amazon_scraper folder.",
            "jobId": "manual-scrape",
            "note": "The scraper is a standalone script, not part of the API server"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scrape error: {str(e)}")

@router.get("/scrape/status/{job_id}")
async def get_scrape_status(job_id: str):
    """Get scraping job status"""
    return {
        "status": "completed",
        "message": "Scraper is a manual process. Check the database for latest data.",
        "jobId": job_id
    }
