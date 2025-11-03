"""
FastAPI Server for Price Forecast

INSTRUCTIONS TO RUN:
1. Double-click "start_server.bat" to run automatically
   
   OR manually:
   
2. Open Anaconda Prompt or Terminal
3. Navigate to this folder:
   cd "c:\\Users\\kvpra\\OneDrive\\Desktop\\Infosys\\Real-Time-Competitor-Strategy-Tracker-for-E-commerce\\ML model\\New folder (2)"
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
warnings.filterwarnings('ignore')

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import uvicorn

# Load data
print("📊 Loading data...")
df = pd.read_excel('expanded_prices_10k.xlsx')
df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
df = df.dropna(subset=['Date']).copy()
print(f"✅ Loaded {len(df)} rows")

# Load brands and models
with open('brands_models.json', 'r') as f:
    brands_data = json.load(f)
brands = brands_data['brands']
models_by_brand = brands_data['modelsByBrand']
print(f"✅ Loaded {len(brands)} brands")

# Load ML artifacts
print("🤖 Loading XGBoost model...")
xgb_model = xgb.Booster()
xgb_model.load_model('xgboost_model_tuned.json')

with open('label_encoders.pkl', 'rb') as f:
    label_encoders = pickle.load(f)

with open('feature_columns.json', 'r') as f:
    feature_cols = json.load(f)
print("✅ Model ready!")

# Forecast function
def generate_forecast(brand, model_name, days=30):
    """Generate price and discount forecast"""
    filtered_df = df[(df['Brand'] == brand) & (df['Model'] == model_name)].copy()
    if filtered_df.empty:
        return {"error": f"No data found for {brand} - {model_name}"}

    filtered_df = filtered_df.sort_values('Date').reset_index(drop=True)
    
    top_product_id = filtered_df['product_id'].mode().iat[0]
    top_category = filtered_df['Category'].mode().iat[0]
    top_time = filtered_df['Time'].mode().iat[0]

    historical_data = filtered_df.tail(60)
    historical = [
        {
            'date': d.strftime('%Y-%m-%d'),
            'price': float(p),
            'discount': float(dc)
        }
        for d, p, dc in zip(historical_data['Date'], historical_data['Price'], historical_data['DiscountPercentage'])
    ]

    discount_series = historical_data['DiscountPercentage'].tolist()

    def encode_safe(le, value, fallback=None):
        classes = set(le.classes_.tolist()) if hasattr(le, 'classes_') else set()
        if value in classes:
            return int(le.transform([value])[0])
        fb = fallback if fallback is not None else list(classes)[0] if classes else value
        return int(le.transform([fb])[0])

    enc_brand = label_encoders['Brand']
    enc_model = label_encoders['Model']
    enc_category = label_encoders['Category']
    enc_product = label_encoders['product_id']
    enc_time = label_encoders['Time']
    enc_sale = label_encoders['SaleEvent']

    brand_encoded = encode_safe(enc_brand, brand)
    model_encoded = encode_safe(enc_model, model_name)
    category_encoded = encode_safe(enc_category, top_category)
    product_encoded = encode_safe(enc_product, top_product_id)
    time_encoded = encode_safe(enc_time, top_time)

    sale_event_value = 'No Sale' if hasattr(enc_sale, 'classes_') and ('No Sale' in enc_sale.classes_) else (filtered_df['SaleEvent'].mode().iat[0] if not filtered_df['SaleEvent'].isna().all() else 'No Sale')
    sale_event_encoded = encode_safe(enc_sale, sale_event_value)

    price_hist = historical_data['Price'].astype(float)
    
    # Get historical base prices (price before discount)
    historical_base_prices = historical_data['Price'] / (1 - historical_data['DiscountPercentage'] / 100)
    avg_base_price = float(historical_base_prices.mean())
    
    last_price = float(price_hist.iloc[-1])
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
        days_in_month = int(pd.Period(forecast_date, freq='M').days_in_month)

        def lag(n):
            if len(discount_series) >= n:
                return float(discount_series[-n])
            return float(discount_series[-1])

        def rolling_mean(n):
            arr = discount_series[-n:] if len(discount_series) >= n else discount_series
            return float(pd.Series(arr).mean())

        def rolling_std(n):
            arr = discount_series[-n:] if len(discount_series) >= n else discount_series
            val = float(pd.Series(arr).std(ddof=0))
            return 0.0 if pd.isna(val) else val

        feat = {
            'product_id': product_encoded,
            'Brand': brand_encoded,
            'Model': model_encoded,
            'Category': category_encoded,
            'Time': time_encoded,
            'SaleEvent': sale_event_encoded,
            'HasSaleEvent': 0 if (isinstance(sale_event_value, str) and sale_event_value.lower() in ['no sale', 'nan']) else 1,
            'year': year,
            'month': month,
            'day': day,
            'dayofweek': dayofweek,
            'quarter': quarter,
            'week_of_year': week_of_year,
            'is_weekend': is_weekend,
            'is_month_start': is_month_start,
            'is_month_end': is_month_end,
            'days_in_month': days_in_month,
            'DiscountPercentage_lag_1': lag(1),
            'DiscountPercentage_lag_2': lag(2),
            'DiscountPercentage_lag_3': lag(3),
            'DiscountPercentage_lag_7': lag(7),
            'DiscountPercentage_lag_14': lag(14),
            'DiscountPercentage_lag_30': lag(30),
            'DiscountPercentage_rolling_mean_7': rolling_mean(7),
            'DiscountPercentage_rolling_std_7': rolling_std(7),
            'DiscountPercentage_rolling_mean_30': rolling_mean(30),
            'DiscountPercentage_rolling_std_30': rolling_std(30),
        }

        row_df = pd.DataFrame([{col: feat.get(col, 0) for col in feature_cols}])
        dmat = xgb.DMatrix(row_df)
        pred_discount = float(xgb_model.predict(dmat)[0])
        pred_discount = max(-50.0, min(90.0, pred_discount))

        discount_series.append(pred_discount)

        # Price calculation: base price adjusted by predicted discount
        # Keep base price stable with small random variations
        base_price_variation = np.random.uniform(-0.02, 0.02)  # ±2% variation
        current_base_price = avg_base_price * (1 + base_price_variation)
        
        # Apply the predicted discount to get final price
        last_price = float(current_base_price * (1 - pred_discount / 100))
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
app = FastAPI(
    title="Price Forecast API",
    description="ML-powered price and discount forecasting using XGBoost",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "message": "Forecast API is running"}

if __name__ == '__main__':
    print("\n🚀 Starting FastAPI server...")
    print("📍 Server: http://localhost:5000")
    print("📚 Docs: http://localhost:5000/docs")
    print("⚠️  Press Ctrl+C to stop\n")
    uvicorn.run(app, host="0.0.0.0", port=5000)
