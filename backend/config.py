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
    
    # Quota limits
    DAILY_QUOTA_LIMIT: int = 10000
    REPLY_COST: int = 50
    FETCH_COST: int = 1
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra env vars like BETTER_AUTH_SECRET (used by frontend)

# Global settings instance
settings = Settings()
