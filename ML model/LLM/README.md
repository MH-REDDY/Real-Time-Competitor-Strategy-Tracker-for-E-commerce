# LLM Chatbot API - Setup Guide

## Overview
AI-powered chatbot assistant for e-commerce competitor tracking and pricing intelligence.

## Features
- Product information & discovery
- Competitor price checking (live scraping)
- Price trend analysis
- Forecast insights (XGBoost integration)
- Pricing recommendations
- Multi-turn conversations
- Action buttons (scrape, forecast charts, comparisons)

## Setup Instructions

### 1. Get Groq API Key (Free)
1. Go to: https://console.groq.com
2. Sign up for free account
3. Navigate to API Keys section
4. Create new API key
5. Copy the key

### 2. Add API Key to Environment
Add to `project/.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Install Dependencies
```bash
cd "ML model/LLM"
pip install -r requirements.txt
```

### 4. Run the Server
```bash
python chatbot_api.py
```

Server will start on: http://localhost:5001

### 5. Test the API
Open browser: http://localhost:5001/docs

## API Endpoints

- `POST /api/chat` - Send message to chatbot
- `GET /api/chat/history/{session_id}` - Get conversation history
- `DELETE /api/chat/history/{session_id}` - Clear conversation
- `GET /health` - Health check

## Example Queries

**Product Info:**
- "Tell me about boAt products"
- "Which product has the highest rating?"

**Price Checking:**
- "What's the current price of boAt Airdopes on Amazon?"

**Trends:**
- "Show price trends for Sony headphones last 30 days"

**Forecasts:**
- "What will be the price trend next month?"
- "Show me 1 day forecast for boAt Airdopes"

**Pricing:**
- "What price should I set for my product to beat competitors?"

## Architecture

```
chatbot_api.py      → FastAPI server (port 5001)
llm_agent.py        → Groq LLM integration + function calling
tools.py            → MongoDB, XGBoost, scraper integration
conversation_memory.py → Multi-turn context
```

## Troubleshooting

**Port already in use:**
```bash
# Change port in chatbot_api.py line: uvicorn.run(app, host="0.0.0.0", port=5001)
```

**MongoDB connection error:**
- Check MONGO_URI in project/.env
- Ensure MongoDB Atlas IP whitelist includes your IP

**Groq API error:**
- Verify GROQ_API_KEY is set correctly
- Check free tier limits (30 requests/min)

## Notes
- Requires XGBoost server running on port 5000
- Requires MongoDB with products, price_history, synthetic_data collections
- Scraper integration uses existing amazon_price_scraper.py
