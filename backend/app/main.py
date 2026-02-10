"""
PayMeJunior API - FastAPI Backend
Processes receipt images and generates SAP Concur expense reports
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import receipts, reports


# Create FastAPI app
app = FastAPI(
    title="PayMeJunior API",
    description="API for processing receipt images and generating SAP Concur expense reports",
    version="1.0.0"
)

# Configure CORS for mobile app access
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(receipts.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "name": "PayMeJunior API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Railway/monitoring"""
    return {
        "status": "healthy",
        "version": "1.0.0"
    }


@app.get("/debug/config")
async def debug_config():
    """Debug endpoint to check configuration status (does not expose secrets)"""
    settings = get_settings()
    return {
        "anthropic_api_key_set": bool(settings.anthropic_api_key),
        "anthropic_api_key_length": len(settings.anthropic_api_key) if settings.anthropic_api_key else 0,
        "supabase_url_set": bool(settings.supabase_url),
        "supabase_url": settings.supabase_url[:30] + "..." if settings.supabase_url else None,
        "supabase_key_set": bool(settings.supabase_key),
        "supabase_key_length": len(settings.supabase_key) if settings.supabase_key else 0,
    }


# For local development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
