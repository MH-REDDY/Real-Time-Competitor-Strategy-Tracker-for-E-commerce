# 🚀 How to Start the FastAPI Server

## Quick Start

### Option 1: Using Anaconda Prompt (Recommended)
1. Open **Anaconda Prompt**
2. Navigate to this folder:
   ```bash
   cd "c:\Users\kvpra\OneDrive\Desktop\Infosys\Real-Time-Competitor-Strategy-Tracker-for-E-commerce\ML model\New folder (2)"
   ```
3. Activate the environment:
   ```bash
   conda activate myenv1
   ```
4. Run the server:
   ```bash
   python run_api_server.py
   ```

### Option 2: Using VS Code Terminal
1. Open terminal in VS Code
2. Run:
   ```powershell
   cd "c:\Users\kvpra\OneDrive\Desktop\Infosys\Real-Time-Competitor-Strategy-Tracker-for-E-commerce\ML model\New folder (2)"
   conda activate myenv1
   python run_api_server.py
   ```

## What Happens Next

The server will start and show:
```
🚀 Starting FastAPI server...
📍 Server: http://localhost:5000
📚 Docs: http://localhost:5000/docs
⚠️  Press Ctrl+C to stop
```

## Test the Server

Open your browser and visit:
- **API Health Check**: http://localhost:5000/health
- **Interactive Docs**: http://localhost:5000/docs (Swagger UI)
- **Available Endpoints**:
  - `GET /api/brands` - Get all brands and models
  - `POST /api/forecast` - Generate 30-day forecast

## Using with React Frontend

Once the server is running:
1. Keep this terminal/prompt open (server must be running)
2. Open a NEW terminal
3. Navigate to the React project:
   ```bash
   cd "c:\Users\kvpra\OneDrive\Desktop\Infosys\Real-Time-Competitor-Strategy-Tracker-for-E-commerce\project"
   ```
4. Start the React app:
   ```bash
   npm run dev
   ```
5. Go to Admin → Prices in the React app
6. Select a brand and model
7. Click "Generate Forecast" to see real XGBoost predictions!

## Troubleshooting

**Error: "No module named 'xgboost'"**
- Make sure you activated the correct conda environment: `conda activate myenv1`

**Error: "Address already in use"**
- Port 5000 is already being used
- Stop any other servers running on port 5000
- Or change the port in `run_api_server.py` (line at bottom: `port=5000`)

**Error: "Cannot find file"**
- Make sure you're in the correct directory
- Check that `expanded_prices_10k.xlsx` and model files exist

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running
