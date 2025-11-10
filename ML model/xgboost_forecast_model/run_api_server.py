"""
FastAPI Server for Price Forecast

INSTRUCTIONS TO RUN:
1. Double-click "start_server.bat" to run automatically
   
   OR manually:
   
2. Open Anaconda Prompt or Terminal
3. Navigate to this folder:
   cd "c:\\Users\\kvpra\\OneDrive\\Desktop\\Infosys\\Real-Time-Competitor-Strategy-Tracker-for-E-commerce\\ML model\\xgboost_forecast_model"
4. Activate the conda environment:
   conda activate myenv1
5. Run the server:
   python run_api_server.py

The server will start at http://localhost:5000
API docs available at http://localhost:5000/docs
Press Ctrl+C to stop the server

NOTE: The import errors you see in VS Code are normal - they'll work when you run 
      the script with the conda environment activated.
"""
import pandas as pd
import numpy as np
import json
import pickle
import xgboost as xgb
from datetime import datetime, timedelta
import warnings
import os
from dotenv import load_dotenv, find_dotenv
from pymongo import MongoClient
warnings.filterwarnings('ignore')

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import uvicorn

# Authentication removed for lean inference service

# Load environment variables
print("� Loading environment variables...")
env_path = find_dotenv('../../project/.env')
load_dotenv(env_path)
print(f"✅ Using env file: {env_path}")

# Connect to MongoDB
print("📊 Connecting to MongoDB...")
MONGO_URI = os.getenv('MONGO_URI')
MONGO_DB = os.getenv('MONGO_DB')
MONGO_COLLECTION = os.getenv('MONGO_COLLECTION')

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
collection = db[MONGO_COLLECTION]

# Load all data from MongoDB
cursor = collection.find({}, {'_id': 0, 'asin': 1, 'price': 1, 'original_price': 1, 'discount_percent': 1, 'scraped_at': 1})
data = list(cursor)
df = pd.DataFrame(data)

# Process data
df['Date'] = pd.to_datetime(df['scraped_at'], errors='coerce')
df = df.dropna(subset=['Date']).copy()
df['DiscountPercentage'] = df['discount_percent']
df = df.rename(columns={'asin': 'product_id'})
print(f"✅ Loaded {len(df)} rows from MongoDB")

# Get unique products
products = df['product_id'].unique().tolist()
print(f"✅ Found {len(products)} unique products: {products}")

# Load product details from products collection
products_collection = db['products']
product_docs = list(products_collection.find({}, {'_id': 0, 'asin': 1, 'title': 1}))

# Create product mapping (ASIN to product details)
product_names = {}
for doc in product_docs:
    asin = doc.get('asin')
    title = doc.get('title', 'Unknown Product')
    # Extract brand and model from title (first word as brand, rest as model)
    parts = title.split()
    if len(parts) > 0:
        product_names[asin] = title
    else:
        product_names[asin] = f"Product {asin}"

print(f"✅ Loaded {len(product_names)} products from database")

# Create brands and models structure for compatibility
brands = []
models_by_brand = {}
for asin, title in product_names.items():
    # Extract brand (first word or first meaningful part)
    parts = title.split()
    if len(parts) > 0:
        brand = parts[0]
        model = ' '.join(parts[1:]) if len(parts) > 1 else title
    else:
        brand = "Unknown"
        model = title
    
    if brand not in brands:
        brands.append(brand)
    if brand not in models_by_brand:
        models_by_brand[brand] = []
    if model not in models_by_brand[brand]:
        models_by_brand[brand].append(model)

print(f"✅ Created {len(brands)} brands with models")

# Load ML artifacts
print("🤖 Loading XGBoost model...")
xgb_model = xgb.Booster()
xgb_model.load_model('xgboost_model_real_data.json')

with open('label_encoders.pkl', 'rb') as f:
    label_encoders = pickle.load(f)

with open('feature_columns.json', 'r') as f:
    feature_cols = json.load(f)
print("✅ Model ready!")

# Forecast function
def generate_forecast(brand, model_name, days=30):
    """Generate price and discount forecast"""
    # Find the ASIN that matches this brand and model
    target_asin = None
    search_term = f"{brand} {model_name}"
    for asin, title in product_names.items():
        if search_term.lower() in title.lower() or title.lower() in search_term.lower():
            target_asin = asin
            break
    
    if not target_asin:
        return {"error": f"No data found for {brand} - {model_name}"}
    
    # Filter data for this product
    filtered_df = df[df['product_id'] == target_asin].copy()
    if filtered_df.empty:
        return {"error": f"No data found for {brand} - {model_name}"}

    filtered_df = filtered_df.sort_values('Date').reset_index(drop=True)
    
    # Get historical data (ENTIRE history for this product)
    # Previously we limited to the last 60 days; now we return all available points
    historical_data = filtered_df
    
    # Clean and validate historical data
    historical = []
    for d, p, dc in zip(historical_data['Date'], historical_data['price'], historical_data['DiscountPercentage']):
        # Ensure values are valid
        price_val = float(p) if pd.notna(p) and not np.isinf(p) else 0.0
        discount_val = float(dc) if pd.notna(dc) and not np.isinf(dc) else 0.0
        historical.append({
            'date': d.strftime('%Y-%m-%d'),
            'price': round(price_val, 2),
            'discount': round(discount_val, 2)
        })

    discount_series = [float(dc) if pd.notna(dc) and not np.isinf(dc) else 0.0 
                       for dc in historical_data['DiscountPercentage'].tolist()]

    # Encode product_id
    enc_product = label_encoders['product_id']
    classes = set(enc_product.classes_.tolist()) if hasattr(enc_product, 'classes_') else set()
    
    if target_asin in classes:
        product_encoded = int(enc_product.transform([target_asin])[0])
    else:
        # Use first available class as fallback
        product_encoded = int(enc_product.transform([list(classes)[0]])[0]) if classes else 0

    # Get average base price from historical data
    historical_base_prices = historical_data['original_price'].dropna()
    if len(historical_base_prices) > 0:
        avg_base_price = float(historical_base_prices.mean())
    else:
        avg_base_price = float(historical_data['price'].mean() * 1.3)
    
    # Validate avg_base_price
    if pd.isna(avg_base_price) or np.isinf(avg_base_price) or avg_base_price <= 0:
        avg_base_price = 1000.0  # Default fallback
    
    last_price = float(historical_data['price'].iloc[-1])
    last_discount = float(historical_data['DiscountPercentage'].iloc[-1])

    forecast_data = []
    last_date = historical_data['Date'].max()

    for i in range(days):
        forecast_date = last_date + pd.Timedelta(days=i + 1)

        year = forecast_date.year
        month = forecast_date.month
        day = forecast_date.day
        dayofweek = forecast_date.dayofweek
        quarter = (month - 1) // 3 + 1
        week_of_year = int(forecast_date.strftime('%U'))
        is_weekend = 1 if dayofweek >= 5 else 0
        is_month_start = 1 if day == 1 else 0
        is_month_end = 1 if (forecast_date + pd.Timedelta(days=1)).month != month else 0

        def lag(n):
            if len(discount_series) >= n:
                val = discount_series[-n]
                return val if pd.notna(val) and not np.isinf(val) else 0.0
            return discount_series[-1] if discount_series else 0.0

        def rolling_mean(n):
            arr = discount_series[-n:] if len(discount_series) >= n else discount_series
            if not arr:
                return 0.0
            mean_val = float(pd.Series(arr).mean())
            return mean_val if pd.notna(mean_val) and not np.isinf(mean_val) else 0.0

        def rolling_std(n):
            arr = discount_series[-n:] if len(discount_series) >= n else discount_series
            if not arr:
                return 0.0
            std_val = float(pd.Series(arr).std(ddof=0))
            return std_val if pd.notna(std_val) and not np.isinf(std_val) else 0.0

        feat = {
            'product_id_encoded': product_encoded,
            'year': year,
            'month': month,
            'day': day,
            'dayofweek': dayofweek,
            'quarter': quarter,
            'week_of_year': week_of_year,
            'is_weekend': is_weekend,
            'is_month_start': is_month_start,
            'is_month_end': is_month_end,
            'DiscountPercentage_lag_1': lag(1),
            'DiscountPercentage_lag_2': lag(2),
            'DiscountPercentage_lag_3': lag(3),
            'DiscountPercentage_lag_7': lag(7) if len(discount_series) >= 7 else lag(1),
            'DiscountPercentage_rolling_mean_3': rolling_mean(3),
            'DiscountPercentage_rolling_std_3': rolling_std(3),
            'DiscountPercentage_rolling_mean_7': rolling_mean(7),
            'DiscountPercentage_rolling_std_7': rolling_std(7),
        }

        row_df = pd.DataFrame([{col: feat.get(col, 0) for col in feature_cols}])
        dmat = xgb.DMatrix(row_df)
        pred_discount = float(xgb_model.predict(dmat)[0])
        
        # Validate prediction
        if pd.isna(pred_discount) or np.isinf(pred_discount):
            pred_discount = discount_series[-1] if discount_series else 10.0
        
        pred_discount = max(0.0, min(90.0, pred_discount))
        discount_series.append(pred_discount)

        # Price calculation: base price adjusted by predicted discount
        base_price_variation = np.random.uniform(-0.02, 0.02)  # ±2% variation
        current_base_price = avg_base_price * (1 + base_price_variation)
        
        # Apply the predicted discount to get final price
        predicted_price = current_base_price * (1 - pred_discount / 100)
        
        # Validate price
        if pd.isna(predicted_price) or np.isinf(predicted_price) or predicted_price < 0:
            predicted_price = last_price
        
        last_price = float(predicted_price)
        last_discount = pred_discount

        forecast_data.append({
            'date': forecast_date.strftime('%Y-%m-%d'),
            'price': round(last_price, 2),
            'discount': round(pred_discount, 2)
        })

    return {
        'brand': brand,
        'model': model_name,
        'historical': historical,
        'forecast': forecast_data
    }

# FastAPI app
# FastAPI app (no auth)
app = FastAPI(
    title="E-Commerce Tracker API",
    description="ML-powered price forecasting & authentication",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("🔐 Authentication skipped (removed).")

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

class BrandsResponse(BaseModel):
    brands: List[str]
    modelsByBrand: Dict[str, List[str]]

class ProductInfo(BaseModel):
    asin: str
    title: str
    price: float
    original_price: float
    discount_percent: float
    rating: float
    availability: str
    image_url: str

@app.post("/api/forecast", response_model=ForecastResponse)
async def forecast(request: ForecastRequest):
    """Generate 30-day forecast"""
    try:
        result = generate_forecast(request.brand, request.model)
        if 'error' in result:
            raise HTTPException(status_code=404, detail=result['error'])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/brands", response_model=BrandsResponse)
async def get_brands():
    """Get all brands and models"""
    return {'brands': brands, 'modelsByBrand': models_by_brand}

@app.get("/api/products", response_model=List[ProductInfo])
async def get_products():
    """Get all product details with images"""
    try:
        products_list = list(products_collection.find({}, {
            '_id': 0,
            'asin': 1,
            'title': 1,
            'price': 1,
            'original_price': 1,
            'discount_percent': 1,
            'rating': 1,
            'availability': 1,
            'image_url': 1
        }))
        return products_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching products: {str(e)}")

@app.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "message": "Forecast API is running"}

if __name__ == '__main__':
    print("\n🚀 Starting FastAPI server...")
    print("📍 Server: http://localhost:5000")
    print("📚 Docs: http://localhost:5000/docs")
    print("⚠️  Press Ctrl+C to stop\n")
    uvicorn.run(app, host="0.0.0.0", port=5000, log_level="info")
