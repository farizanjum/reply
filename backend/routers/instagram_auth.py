"""
Instagram OAuth Authentication Router

Handles:
- OAuth login initiation
- OAuth callback and token exchange
- Account disconnection
- Account info retrieval

Instagram Graph API uses Facebook Login for Business authentication.
Flow: Facebook Login -> Get Pages -> Get Instagram Business Account
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import RedirectResponse
from typing import Optional
import httpx
from datetime import datetime, timedelta
import secrets
import urllib.parse

from config import settings
from database_pg import (
    get_user_by_id,
    upsert_instagram_account,
    get_instagram_account_by_user_id,
    deactivate_instagram_account,
    update_instagram_token,
    get_backend_user_id_from_auth_id,
)
from middleware.auth_middleware import get_current_user

router = APIRouter()

# Store state tokens temporarily (in production, use Redis)
# Format: {state: user_id}
oauth_states: dict = {}


def get_oauth_url(state: str) -> str:
    """Generate Facebook OAuth URL for Instagram Business login"""
    base_url = "https://www.facebook.com/v22.0/dialog/oauth"
    
    params = {
        "client_id": settings.META_APP_ID,
        "redirect_uri": settings.INSTAGRAM_OAUTH_REDIRECT_URI,
        "state": state,
        "scope": ",".join([
            "instagram_business_basic",
            "instagram_business_manage_comments",
            "instagram_business_manage_messages",
            "pages_show_list",
            "pages_read_engagement",
        ]),
        "response_type": "code",
    }
    
    return f"{base_url}?{urllib.parse.urlencode(params)}"


async def exchange_code_for_token(code: str) -> dict:
    """Exchange authorization code for access token"""
    url = f"https://graph.facebook.com/{settings.META_GRAPH_API_VERSION}/oauth/access_token"
    
    params = {
        "client_id": settings.META_APP_ID,
        "client_secret": settings.META_APP_SECRET,
        "redirect_uri": settings.INSTAGRAM_OAUTH_REDIRECT_URI,
        "code": code,
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        
        if response.status_code != 200:
            error_data = response.json()
            raise HTTPException(
                status_code=400,
                detail=f"Token exchange failed: {error_data.get('error', {}).get('message', 'Unknown error')}"
            )
        
        return response.json()


async def get_long_lived_token(short_lived_token: str) -> dict:
    """Exchange short-lived token for long-lived token (60 days)"""
    url = f"https://graph.facebook.com/{settings.META_GRAPH_API_VERSION}/oauth/access_token"
    
    params = {
        "grant_type": "fb_exchange_token",
        "client_id": settings.META_APP_ID,
        "client_secret": settings.META_APP_SECRET,
        "fb_exchange_token": short_lived_token,
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        
        if response.status_code != 200:
            # If exchange fails, return the short-lived token
            print(f"Warning: Could not get long-lived token: {response.text}")
            return {"access_token": short_lived_token, "expires_in": 3600}
        
        return response.json()


async def get_facebook_pages(access_token: str) -> list:
    """Get list of Facebook Pages the user manages"""
    url = f"https://graph.facebook.com/{settings.META_GRAPH_API_VERSION}/me/accounts"
    
    params = {
        "access_token": access_token,
        "fields": "id,name,access_token,instagram_business_account",
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Failed to get Facebook Pages"
            )
        
        return response.json().get("data", [])


async def get_instagram_account_info(ig_user_id: str, access_token: str) -> dict:
    """Get Instagram Business account details"""
    url = f"https://graph.facebook.com/{settings.META_GRAPH_API_VERSION}/{ig_user_id}"
    
    params = {
        "access_token": access_token,
        "fields": "id,username,profile_picture_url,followers_count,media_count",
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Failed to get Instagram account info"
            )
        
        return response.json()


@router.get("/auth/login")
async def instagram_login(
    user_id: str = Query(..., description="User ID (Better Auth UUID or backend int) to associate Instagram account with"),
    frontend_redirect: Optional[str] = Query(None, description="Frontend URL to redirect after OAuth")
):
    """
    Initiate Instagram OAuth flow.
    
    1. Generate state token
    2. Lookup backend user_id if Better Auth UUID provided
    3. Store user_id with state
    4. Redirect to Facebook OAuth
    """
    # Determine the backend user_id (integer)
    backend_user_id: int = None
    
    # Check if it's a Better Auth UUID (contains letters) or a plain integer
    try:
        backend_user_id = int(user_id)
    except ValueError:
        # It's a Better Auth UUID string - lookup the backend user_id
        backend_user_id = await get_backend_user_id_from_auth_id(user_id)
        if not backend_user_id:
            # User doesn't exist in backend users table yet
            # This can happen if they only used Better Auth login
            return RedirectResponse(
                url=f"{frontend_redirect or 'https://tryreply.app/dashboard/settings'}?instagram_error=User+not+found.+Please+connect+YouTube+first."
            )
    
    # Generate secure state token
    state = secrets.token_urlsafe(32)
    
    # Store state -> user_id mapping (with optional frontend redirect)
    oauth_states[state] = {
        "user_id": backend_user_id,  # Store the backend integer ID
        "frontend_redirect": frontend_redirect or "https://tryreply.app/dashboard/settings",
        "created_at": datetime.utcnow()
    }
    
    # Clean up old states (older than 10 minutes)
    cutoff = datetime.utcnow() - timedelta(minutes=10)
    oauth_states_copy = dict(oauth_states)
    for s, data in oauth_states_copy.items():
        if data.get("created_at", datetime.utcnow()) < cutoff:
            del oauth_states[s]
    
    # Generate OAuth URL and redirect
    oauth_url = get_oauth_url(state)
    
    return RedirectResponse(url=oauth_url)


@router.get("/auth/callback")
async def instagram_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
):
    """
    Handle OAuth callback from Facebook.
    
    1. Validate state
    2. Exchange code for token
    3. Get long-lived token
    4. Find Instagram Business account
    5. Save to database
    6. Redirect to frontend
    """
    # Handle OAuth errors
    if error:
        error_msg = error_description or error
        return RedirectResponse(
            url=f"https://tryreply.app/dashboard/settings?instagram_error={urllib.parse.quote(error_msg)}"
        )
    
    # Validate required params
    if not code or not state:
        return RedirectResponse(
            url="https://tryreply.app/dashboard/settings?instagram_error=Missing+code+or+state"
        )
    
    # Validate state
    state_data = oauth_states.pop(state, None)
    if not state_data:
        return RedirectResponse(
            url="https://tryreply.app/dashboard/settings?instagram_error=Invalid+or+expired+state"
        )
    
    user_id = state_data["user_id"]
    frontend_redirect = state_data.get("frontend_redirect", "https://tryreply.app/dashboard/settings")
    
    try:
        # Exchange code for short-lived token
        token_data = await exchange_code_for_token(code)
        short_lived_token = token_data.get("access_token")
        
        if not short_lived_token:
            raise HTTPException(status_code=400, detail="No access token received")
        
        # Exchange for long-lived token
        long_lived_data = await get_long_lived_token(short_lived_token)
        access_token = long_lived_data.get("access_token")
        expires_in = long_lived_data.get("expires_in", 5184000)  # Default 60 days
        token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
        
        # Get Facebook Pages
        pages = await get_facebook_pages(access_token)
        
        if not pages:
            return RedirectResponse(
                url=f"{frontend_redirect}?instagram_error=No+Facebook+Pages+found.+Please+connect+your+Instagram+to+a+Facebook+Page."
            )
        
        # Find first page with Instagram Business account
        instagram_account = None
        page_with_ig = None
        
        for page in pages:
            ig_account = page.get("instagram_business_account")
            if ig_account:
                instagram_account = ig_account
                page_with_ig = page
                break
        
        if not instagram_account:
            return RedirectResponse(
                url=f"{frontend_redirect}?instagram_error=No+Instagram+Business+account+found.+Please+convert+to+a+Business+or+Creator+account."
            )
        
        # Get Instagram account details
        ig_user_id = instagram_account.get("id")
        ig_info = await get_instagram_account_info(ig_user_id, access_token)
        
        # Save to database
        await upsert_instagram_account(
            user_id=user_id,
            instagram_user_id=ig_user_id,
            instagram_username=ig_info.get("username", ""),
            profile_picture_url=ig_info.get("profile_picture_url", ""),
            facebook_page_id=page_with_ig.get("id", ""),
            facebook_page_name=page_with_ig.get("name", ""),
            access_token=access_token,
            token_expiry=token_expiry,
        )
        
        print(f"✅ Instagram account connected: @{ig_info.get('username')} for user {user_id}")
        
        # Redirect to frontend with success
        return RedirectResponse(
            url=f"{frontend_redirect}?instagram_success=true&instagram_username={ig_info.get('username', '')}"
        )
        
    except HTTPException as e:
        return RedirectResponse(
            url=f"{frontend_redirect}?instagram_error={urllib.parse.quote(str(e.detail))}"
        )
    except Exception as e:
        print(f"❌ Instagram OAuth error: {e}")
        return RedirectResponse(
            url=f"{frontend_redirect}?instagram_error={urllib.parse.quote(str(e))}"
        )


@router.post("/auth/disconnect")
async def disconnect_instagram(user: dict = Depends(get_current_user)):
    """
    Disconnect Instagram account.
    
    - Deactivates the account (soft delete)
    - Clears access token
    """
    user_id = user.get("id")
    
    # Check if account exists
    account = await get_instagram_account_by_user_id(user_id)
    if not account:
        raise HTTPException(status_code=404, detail="No Instagram account connected")
    
    # Deactivate account
    success = await deactivate_instagram_account(user_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to disconnect Instagram account")
    
    return {"success": True, "message": "Instagram account disconnected"}


@router.get("/account")
async def get_instagram_account(user: dict = Depends(get_current_user)):
    """
    Get connected Instagram account info.
    
    Returns account details or null if not connected.
    """
    user_id = user.get("id")
    
    account = await get_instagram_account_by_user_id(user_id)
    
    if not account:
        return {"connected": False, "account": None}
    
    # Don't expose access token
    return {
        "connected": True,
        "account": {
            "id": account.get("id"),
            "instagram_user_id": account.get("instagram_user_id"),
            "instagram_username": account.get("instagram_username"),
            "profile_picture_url": account.get("profile_picture_url"),
            "facebook_page_name": account.get("facebook_page_name"),
            "is_active": account.get("is_active"),
            "token_expiry": account.get("token_expiry").isoformat() if account.get("token_expiry") else None,
            "created_at": account.get("created_at").isoformat() if account.get("created_at") else None,
        }
    }


@router.post("/auth/refresh")
async def refresh_instagram_token(user: dict = Depends(get_current_user)):
    """
    Manually refresh Instagram access token.
    
    Long-lived tokens can be refreshed before they expire (60 days).
    """
    user_id = user.get("id")
    
    account = await get_instagram_account_by_user_id(user_id)
    if not account:
        raise HTTPException(status_code=404, detail="No Instagram account connected")
    
    current_token = account.get("access_token")
    if not current_token:
        raise HTTPException(status_code=400, detail="No access token to refresh")
    
    try:
        # Refresh the token
        url = f"https://graph.facebook.com/{settings.META_GRAPH_API_VERSION}/oauth/access_token"
        params = {
            "grant_type": "fb_exchange_token",
            "client_id": settings.META_APP_ID,
            "client_secret": settings.META_APP_SECRET,
            "fb_exchange_token": current_token,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Token refresh failed")
            
            data = response.json()
            new_token = data.get("access_token")
            expires_in = data.get("expires_in", 5184000)
            token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
            
            # Update in database
            await update_instagram_token(
                instagram_account_id=account.get("id"),
                access_token=new_token,
                token_expiry=token_expiry,
            )
            
            return {
                "success": True,
                "message": "Token refreshed successfully",
                "expires_at": token_expiry.isoformat(),
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token refresh failed: {str(e)}")
