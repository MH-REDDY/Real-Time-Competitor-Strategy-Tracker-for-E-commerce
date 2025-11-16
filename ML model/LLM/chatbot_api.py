"""
FastAPI server for LLM chatbot with WebSocket streaming
"""

import os
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from dotenv import load_dotenv
import asyncio

# Ensure .env is loaded before importing LLMAgent
load_dotenv()
from llm_agent import LLMAgent

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(
    title="E-commerce LLM Assistant API",
    description="Intelligent chatbot for pricing strategy and competitor analysis",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LLM agent
llm_agent = LLMAgent()


# Request/Response models
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


class HistoryResponse(BaseModel):
    session_id: str
    messages: List[Dict]


# REST Endpoints
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "E-commerce LLM Assistant",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "groq_api_configured": bool(os.getenv('GROQ_API_KEY')),
        "mongodb_configured": bool(os.getenv('MONGO_URI')),
        "model": "llama-3.1-70b-versatile"
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint for non-streaming requests
    
    Send a message and get a complete response
    """
    print(f"\n🔵 REST API CALL RECEIVED")
    print(f"📩 Message: {request.message}")
    print(f"🆔 Session: {request.session_id}")
    try:
        # Generate or use provided session ID
        session_id = request.session_id or str(uuid.uuid4())

        # Get response from LLM agent (async generator)
        print(f"🤖 Calling LLM agent...")
        result_list = [r async for r in llm_agent.chat(
            user_message=request.message,
            session_id=session_id,
            stream=False
        )]
        
        print(f"✅ LLM agent returned {len(result_list)} results")
        
        if not result_list:
            raise HTTPException(status_code=500, detail="No response from LLM agent")
        
        result = result_list[0]
        print(f"📤 Response: {result.get('response', '')[:100]}...")

        
        # Handle if result is not a dict
        if not isinstance(result, dict):
            raise HTTPException(status_code=500, detail=f"Invalid response type: {type(result)}")

        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])

        return ChatResponse(
            response=result.get("response", ""),
            session_id=result.get("session_id", session_id)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history/{session_id}", response_model=HistoryResponse)
async def get_history(session_id: str):
    """
    Get conversation history for a session
    """
    try:
        history = llm_agent.get_history(session_id)
        return HistoryResponse(
            session_id=session_id,
            messages=history
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/session/{session_id}")
async def clear_session(session_id: str):
    """
    Clear conversation history for a session
    """
    try:
        llm_agent.clear_session(session_id)
        return {"status": "success", "message": f"Session {session_id} cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# WebSocket endpoint for streaming
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for streaming chat responses
    
    Client sends: {"message": "your message", "session_id": "optional-id"}
    Server streams: {"text": "chunk"} or {"done": true} or {"error": "message"}
    """
    await websocket.accept()
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            message = data.get("message")
            session_id = data.get("session_id", str(uuid.uuid4()))
            
            if not message:
                await websocket.send_json({"error": "Message is required"})
                continue
            
            # Send session ID to client
            await websocket.send_json({"session_id": session_id})
            
            # Stream response
            try:
                async for chunk in llm_agent.chat(
                    user_message=message,
                    session_id=session_id,
                    stream=True
                ):
                    # Handle both SSE format strings and direct dict responses
                    if isinstance(chunk, str):
                        # Parse SSE format to JSON
                        if chunk.startswith("data: "):
                            import json
                            chunk_data = json.loads(chunk[6:])
                            await websocket.send_json(chunk_data)
                    elif isinstance(chunk, dict):
                        # Direct dict (e.g., from rate limit or rejection)
                        # Normalize 'response' field to 'text' for consistency with streaming
                        if 'response' in chunk and 'text' not in chunk:
                            # Convert complete response to text + done format
                            await websocket.send_json({"text": chunk['response']})
                            await websocket.send_json({"done": True})
                        else:
                            await websocket.send_json(chunk)
            
            except Exception as e:
                await websocket.send_json({"error": str(e)})
    
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass


# Startup message
@app.on_event("startup")
async def startup_event():
    """Print startup information"""
    print("\n" + "="*60)
    print("🚀 E-commerce LLM Assistant API Started")
    print("="*60)
    print(f"📍 REST API: http://localhost:5001")
    print(f"🔌 WebSocket: ws://localhost:5001/ws")
    print(f"📚 Docs: http://localhost:5001/docs")
    print(f"🤖 Model: llama-3.3-70b-versatile (Groq)")
    print("="*60 + "\n")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "chatbot_api:app",
        host="0.0.0.0",
        port=5001,
        reload=True,
        log_level="info"
    )
