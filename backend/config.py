import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    APP_NAME: str = "YouTube Auto-Reply"
    DEBUG: bool = os.getenv("DEBUG", "False") == "True"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    
    # Heroku detection
    IS_HEROKU: bool = "DYNO" in os.environ
    PORT: int = int(os.getenv("PORT", 8000))
    
    # Database - Use PostgreSQL in production, SQLite locally
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    USE_POSTGRES: bool = bool(os.getenv("DATABASE_URL", ""))
    
    # Fix postgres:// to postgresql:// (Heroku uses old format)
    @property
    def db_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url
    
    # Redis (Heroku provides this, optional locally)
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    USE_REDIS: bool = bool(os.getenv("REDIS_URL", ""))
    
    # Frontend
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Google OAuth (REQUIRED - set in environment variables)
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    REDIRECT_URI: str = os.getenv("REDIRECT_URI", "http://localhost:8000/api/auth/callback")
    
    # YouTube API (REQUIRED - set in environment variables)
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
    
    # Meta/Instagram API Configuration
    META_APP_ID: str = os.getenv("META_APP_ID", "")
    META_APP_SECRET: str = os.getenv("META_APP_SECRET", "")
    META_GRAPH_API_VERSION: str = os.getenv("META_GRAPH_API_VERSION", "v22.0")
    INSTAGRAM_OAUTH_REDIRECT_URI: str = os.getenv(
        "INSTAGRAM_OAUTH_REDIRECT_URI",
        "https://tryreply.app/api/auth/instagram/callback"
    )
    
    # Quota limits (500k total for 50 users)
    DAILY_QUOTA_LIMIT: int = 500000  # Global project limit (YouTube API)
    USER_DAILY_QUOTA_LIMIT: int = 10000  # Per-user quota units per day (~200 replies)
    USER_DAILY_REPLY_LIMIT: int = 200  # Per-user max replies (10k / 50 cost)
    REPLY_COST: int = 50  # Write operation cost
    FETCH_COST: int = 1   # Read operation cost
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra env vars like BETTER_AUTH_SECRET (used by frontend)

# Global settings instance
settings = Settings()
