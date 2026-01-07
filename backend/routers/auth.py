from fastapi import APIRouter, HTTPException, Request, Header
from fastapi.responses import RedirectResponse
import requests
from datetime import datetime, timedelta
import jwt
from config import settings
from db import get_user_by_id

router = APIRouter()

# NOTE: OAuth flow is now handled by Better Auth on the frontend.
# The frontend syncs tokens to this backend via /sync-tokens endpoint.
# Old /google and /callback routes have been removed to avoid confusion.


@router.get("/me")
async def get_me(authorization: str = Header(None)):
    """Get current user info"""
    if not authorization:
        raise HTTPException(401, "No authorization header")
    
    # Extract token from "Bearer <token>"
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        
        if not user_id:
            raise HTTPException(401, "Invalid token")
        
        user = await get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(404, "User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


from pydantic import BaseModel
from typing import Optional

class TokenSyncRequest(BaseModel):
    email: str
    name: Optional[str] = None
    image: Optional[str] = None
    access_token: str
    refresh_token: Optional[str] = None
    channel_id: Optional[str] = None
    channel_name: Optional[str] = None

@router.post("/sync-tokens")
async def sync_youtube_tokens(request: TokenSyncRequest, authorization: str = Header(None)):
    """
    Receive YouTube OAuth tokens from Better Auth frontend.
    Creates or updates user in backend database with fresh tokens.
    """
    from middleware.auth_middleware import get_current_user
    
    # Verify the request is authenticated via Better Auth JWT
    try:
        user = await get_current_user(authorization)
    except:
        # If no user exists yet, create one
        user = None
    
    # Get channel info from token if not provided
    channel_id = request.channel_id
    channel_name = request.channel_name
    channel_thumbnail = request.image
    
    if request.access_token and not channel_id:
        # Fetch channel info from YouTube API
        try:
            from services.youtube_client import AsyncYouTubeClient
            youtube = AsyncYouTubeClient(request.access_token, request.refresh_token)
            channel_info = await youtube.get_channel_info()
            if channel_info:
                channel_id = channel_info.get('channel_id')
                channel_name = channel_info.get('channel_name') or request.name
                channel_thumbnail = channel_info.get('channel_thumbnail') or request.image
        except Exception as e:
            print(f"Warning: Could not fetch channel info: {e}")
            # Use defaults
            channel_id = f"better_auth_{request.email}"
            channel_name = request.name or request.email.split('@')[0]
    
    # Create or update user in backend database (PostgreSQL)
    from db import get_pool
    
    async with get_pool().acquire() as conn:
        row = await conn.fetchrow("""
            INSERT INTO users (
                email, google_id, channel_id, channel_name, 
                channel_thumbnail, access_token, refresh_token, token_expiry
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (email) DO UPDATE SET
                access_token = EXCLUDED.access_token,
                refresh_token = COALESCE(EXCLUDED.refresh_token, users.refresh_token),
                channel_id = COALESCE(EXCLUDED.channel_id, users.channel_id),
                channel_name = COALESCE(EXCLUDED.channel_name, users.channel_name),
                channel_thumbnail = COALESCE(EXCLUDED.channel_thumbnail, users.channel_thumbnail),
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        """, 
            request.email,
            f"better_auth_{request.email}",
            channel_id,
            channel_name,
            channel_thumbnail,
            request.access_token,
            request.refresh_token,
            datetime.utcnow() + timedelta(hours=1)
        )
        user_data = dict(row) if row else None
    
    if not user_data:
        raise HTTPException(500, "Failed to sync user")
    
    print(f"✅ Synced YouTube tokens for user: {request.email}")
    
    return {
        "success": True,
        "user_id": user_data.get('id'),
        "email": request.email,
        "channel_id": user_data.get('channel_id'),
        "channel_name": user_data.get('channel_name')
    }
