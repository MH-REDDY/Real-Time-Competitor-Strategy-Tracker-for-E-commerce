# 🧪 LLM Backend Testing Guide

## Prerequisites Checklist
- [x] Python 3.12.6 installed
- [x] Dependencies installed (`pip install -r requirements.txt`)
- [ ] **Groq API Key added to .env file**
- [x] MongoDB URI configured

## Step 1: Get Groq API Key (FREE) ⚡

1. **Visit**: https://console.groq.com
2. **Sign up** with Google/GitHub (takes 30 seconds)
3. **Navigate** to "API Keys" in left sidebar
4. **Click** "Create API Key"
5. **Copy** the generated key (starts with `gsk_...`)
6. **Open** `.env` file in this folder
7. **Replace** `YOUR_GROQ_API_KEY_HERE` with your actual key

Example:
```env
GROQ_API_KEY=gsk_abc123xyz456...
```

## Step 2: Run Test Script 🔬

```powershell
python test_backend.py
```

### Expected Output:
```
============================================================
🧪 LLM Backend Test Suite
============================================================

1️⃣ Testing Environment Variables...
✅ GROQ_API_KEY found (length: XX)
✅ MONGO_URI configured
✅ MONGO_DB: ecom_tracker

2️⃣ Testing Dependencies...
✅ pymongo installed
✅ groq installed
✅ fastapi installed
✅ httpx installed

3️⃣ Testing MongoDB Connection...
✅ MongoDB connection successful
✅ Database 'ecom_tracker' accessible
   Collections found: products, price_history, synthetic_data
✅ Products collection: X documents

4️⃣ Testing Tools Functions...
   Testing search_products()...
   ✅ Found X products
      Sample: Product Title...
   Testing get_top_rated_products()...
   ✅ Found X top rated products
✅ Tools module loaded successfully

5️⃣ Testing Groq API Connection...
✅ Groq API working! Response: Hello

6️⃣ Testing Conversation Memory...
✅ Conversation memory working (2 messages)

7️⃣ Testing LLM Agent...
✅ LLM Agent module loaded
   (Full agent test requires async environment)

============================================================
✅ All tests passed! Backend is ready to start
============================================================
```

## Step 3: Start the Server 🚀

Once tests pass, start the API server:

```powershell
python chatbot_api.py
```

Or use the batch file:
```powershell
.\start_server.bat
```

### Expected Output:
```
============================================================
🚀 E-commerce LLM Assistant API Started
============================================================
📍 REST API: http://localhost:5001
🔌 WebSocket: ws://localhost:5001/ws
📚 Docs: http://localhost:5001/docs
🤖 Model: llama-3.1-70b-versatile (Groq)
============================================================
```

## Step 4: Test API Endpoints 🎯

### Option A: Browser (Interactive Docs)
1. Open: http://localhost:5001/docs
2. Try `/health` endpoint (click "Try it out" → "Execute")
3. Try `/api/chat` endpoint with:
   ```json
   {
     "message": "What products do you have?"
   }
   ```

### Option B: PowerShell (curl)
```powershell
# Health check
Invoke-WebRequest -Uri "http://localhost:5001/health" | Select-Object -Expand Content

# Chat request
$body = @{
    message = "What products do you have?"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5001/api/chat" -Method POST -Body $body -ContentType "application/json" | Select-Object -Expand Content
```

## Step 5: Test Sample Queries 💬

Try these queries in the chat endpoint:

1. **Product Search**: "What products do you have?"
2. **Top Rated**: "Show me your best rated products"
3. **Price Trends**: "What's the price trend for Samsung phones?"
4. **Pricing Strategy**: "Give me pricing recommendation for ASIN: B0XXXXX"
5. **Competitor Check**: "What's the current competitor price?"

## Troubleshooting 🔧

### Error: GROQ_API_KEY not set
- Make sure you've added the key to `.env` file
- Key should NOT have quotes: `GROQ_API_KEY=gsk_abc123...`
- Restart terminal after editing `.env`

### Error: MongoDB connection failed
- Check internet connection
- Verify MONGO_URI is correct in `.env`
- Test connection: `python -c "from pymongo import MongoClient; print(MongoClient('YOUR_URI').server_info())"`

### Error: ModuleNotFoundError
- Run: `pip install -r requirements.txt`
- Make sure you're in the correct folder

### Error: Port 5001 already in use
- Kill existing process: `Get-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess | Stop-Process`
- Or change PORT in `.env` to 5002

## Next Steps After Testing ✅

Once all tests pass and the server runs:
1. ✅ Backend is working!
2. 📱 Build frontend chat UI (QAAssistantView.jsx)
3. 🔗 Integrate with admin dashboard
4. 🎨 Add forecast chart modals
5. 🚀 Full system testing

## Need Help? 🆘

Common issues:
- **Groq API limits**: Free tier = 30 requests/minute (plenty for testing)
- **Slow responses**: First request may take 2-3 seconds (LLM cold start)
- **Function calling errors**: Make sure MongoDB has product data
- **WebSocket issues**: Use REST endpoint first, then test WebSocket

---

**Status**: Ready for testing! 🎉
