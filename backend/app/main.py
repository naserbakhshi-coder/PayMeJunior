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


@app.get("/debug/test")
async def debug_test():
    """Test database and storage connectivity"""
    from app.services.supabase_service import get_supabase_service

    results = {
        "database": {"status": "unknown", "error": None},
        "storage": {"status": "unknown", "error": None},
        "claude": {"status": "unknown", "error": None},
    }

    # Test database
    try:
        supabase = get_supabase_service()
        test_report = supabase.create_expense_report("_test_report")
        if test_report:
            supabase.delete_expense_report(test_report["id"])
            results["database"]["status"] = "ok"
        else:
            results["database"]["status"] = "failed"
            results["database"]["error"] = "Could not create test report"
    except Exception as e:
        results["database"]["status"] = "error"
        results["database"]["error"] = str(e)

    # Test storage bucket exists
    try:
        buckets = supabase.client.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        if "receipts" in bucket_names:
            results["storage"]["status"] = "ok"
        else:
            results["storage"]["status"] = "missing"
            results["storage"]["error"] = f"Bucket 'receipts' not found. Available: {bucket_names}"
    except Exception as e:
        results["storage"]["status"] = "error"
        results["storage"]["error"] = str(e)

    # Test Claude API
    try:
        import anthropic
        settings = get_settings()
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=10,
            messages=[{"role": "user", "content": "Say hi"}]
        )
        results["claude"]["status"] = "ok"
    except Exception as e:
        results["claude"]["status"] = "error"
        results["claude"]["error"] = str(e)

    return results


# For local development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
