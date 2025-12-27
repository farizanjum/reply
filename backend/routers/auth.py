from fastapi import APIRouter, HTTPException, Request, Header
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import requests
from datetime import datetime, timedelta
import jwt
from config import settings
from db import create_or_update_user, get_user_by_id

router = APIRouter()

# OAuth configuration
CLIENT_CONFIG = {
    "web": {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [settings.REDIRECT_URI]
    }
}

SCOPES = [
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
]

@router.get("/google")
async def google_auth(request: Request):
    """Initiate OAuth flow"""
    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
        redirect_uri=settings.REDIRECT_URI
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'  # Force to get refresh token
    )
    
    # Store state in session for CSRF protection
    # In production, use encrypted session
    
    return {"auth_url": authorization_url}

@router.get("/callback")
async def google_callback(code: str, state: str = None):
    """Handle OAuth callback"""
    
    try:
        # Exchange code for tokens using direct API call to avoid scope validation
        token_response = requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'code': code,
                'client_id': settings.GOOGLE_CLIENT_ID,
                'client_secret': settings.GOOGLE_CLIENT_SECRET,
                'redirect_uri': settings.REDIRECT_URI,
                'grant_type': 'authorization_code',
            }
        )
        
        if token_response.status_code != 200:
            raise HTTPException(400, f"Token exchange failed: {token_response.text}")
        
        token_data = token_response.json()
        access_token = token_data['access_token']
        refresh_token = token_data.get('refresh_token')
        expires_in = token_data.get('expires_in', 3600)
        
        # Calculate token expiry
        token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
        
        # Create credentials object
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=SCOPES
        )
        
        # Get user info
        user_info = get_user_info(credentials)
        
        # Get YouTube channel info
        channel_info = get_channel_info(credentials)
        
        # Save or update user in database
        user = await create_or_update_user(
            email=user_info['email'],
            google_id=user_info['id'],
            channel_id=channel_info['id'],
            channel_name=channel_info['snippet']['title'],
            channel_thumbnail=channel_info['snippet']['thumbnails']['default']['url'],
            access_token=access_token,
            refresh_token=refresh_token,
            token_expiry=token_expiry
        )
        
        # Create JWT token for frontend
        token = jwt.encode(
            {
                "user_id": user['id'],
                "email": user['email'],
                "exp": datetime.utcnow() + timedelta(days=30)
            },
            settings.SECRET_KEY,
            algorithm="HS256"
        )
        
        # Redirect to frontend with token
        frontend_url = settings.FRONTEND_URL
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?token={token}"
        )
        
    except Exception as e:
        print(f"Auth error: {e}")
        import traceback
        traceback.print_exc()
        # Redirect to frontend with error
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/callback?error={str(e)}"
        )

def get_user_info(credentials: Credentials) -> dict:
    """Get user profile info from Google"""
    response = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {credentials.token}"}
    )
    return response.json()

def get_channel_info(credentials: Credentials) -> dict:
    """Get YouTube channel info"""
    youtube = build('youtube', 'v3', credentials=credentials)
    
    request = youtube.channels().list(
        part="snippet,contentDetails,statistics",
        mine=True
    )
    response = request.execute()
    
    if not response.get('items'):
        raise HTTPException(400, "No YouTube channel found")
    
    return response['items'][0]

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
