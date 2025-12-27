from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("🚀 Starting YouTube Auto-Reply API...")
    print(f"   Environment: {'Heroku' if settings.IS_HEROKU else 'Local (Docker)'}")
    
    # Initialize PostgreSQL database
    import database_pg as database
    await database.init_db()
    print("✓ PostgreSQL connected with connection pooling")
    
    # Initialize Redis cache
    if settings.REDIS_URL:
        from services.cache import init_cache
        await init_cache()
        print("✓ Redis cache connected")
    else:
        print("⚠ Redis not configured - caching disabled")
    
    yield
    
    # Shutdown
    print("👋 Shutting down...")
    
    await database.close_db()
    
    if settings.REDIS_URL:
        from services.cache import close_cache
        await close_cache()
    
    print("✓ All connections closed")

# Create FastAPI app
app = FastAPI(
    title="YouTube Auto-Reply API",
    description="Automated YouTube comment reply system - Production Ready",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://tryreply.app",
        "https://www.tryreply.app",
        settings.FRONTEND_URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register routers
from routers import auth, videos, analytics, templates

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(videos.router, prefix="/api/videos", tags=["videos"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "environment": "heroku" if settings.IS_HEROKU else "local",
        "postgres": True,
        "redis": bool(settings.REDIS_URL)
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "YouTube Auto-Reply API",
        "version": "2.0.0",
        "docs": "/docs"
    }
