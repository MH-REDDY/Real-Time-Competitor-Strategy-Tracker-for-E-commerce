"""
Main FastAPI application for E-Commerce Tracker Backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, admin, forecast
from app.config.settings import HOST, PORT
from app.utils.init_db import init_database
import uvicorn

# Create FastAPI app
app = FastAPI(
    title="E-Commerce Tracker API",
    description="Backend API for authentication, data management, and ML forecasting",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(forecast.router)  # Added ML forecast routes

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    print("🚀 Starting E-Commerce Tracker Backend API...")
    print("📊 Initializing database...")
    init_database()
    print("✅ Database initialized successfully!")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "E-Commerce Tracker Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Backend API is running"
    }

if __name__ == "__main__":
    print(f"\n{'='*60}")
    print(f"🚀 E-Commerce Tracker Backend API")
    print(f"{'='*60}")
    print(f"📍 Server: http://{HOST}:{PORT}")
    print(f"📚 API Docs: http://{HOST}:{PORT}/docs")
    print(f"📖 ReDoc: http://{HOST}:{PORT}/redoc")
    print(f"{'='*60}\n")
    print("⚠️  Default Credentials:")
    print("   Admin: admin@ecomtracker.com / Admin@123")
    print("   User:  user@example.com / User@123")
    print(f"\n{'='*60}\n")
    
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=True,
        log_level="info"
    )
