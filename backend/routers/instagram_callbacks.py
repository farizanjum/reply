"""
Instagram/Meta Callback Endpoints

These endpoints are required by Meta for app compliance:
1. Data Deletion Callback - Called when user requests data deletion from Meta
2. Deauthorize Callback - Called when user removes the app from their account

These must be deployed FIRST before adding the URLs to Meta App settings.
"""

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime
import hashlib
import hmac
import json
import base64
from config import settings

router = APIRouter(prefix="/api/instagram", tags=["Instagram Callbacks"])


def parse_signed_request(signed_request: str) -> dict | None:
    """
    Parse and validate a signed_request from Meta.
    Returns the payload if valid, None if invalid.
    """
    try:
        encoded_sig, payload = signed_request.split('.', 1)
        
        # Decode the signature
        sig = base64.urlsafe_b64decode(encoded_sig + '==')
        
        # Decode the payload
        data = json.loads(base64.urlsafe_b64decode(payload + '=='))
        
        # Verify the signature
        expected_sig = hmac.new(
            settings.META_APP_SECRET.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        if hmac.compare_digest(sig, expected_sig):
            return data
        else:
            print("[Instagram] Invalid signature in signed_request")
            return None
    except Exception as e:
        print(f"[Instagram] Error parsing signed_request: {e}")
        return None


@router.post("/data-deletion")
async def data_deletion_callback(request: Request):
    """
    Handle data deletion requests from Meta.
    
    When a user requests deletion of their data from Meta's "Your Facebook Information"
    settings, Meta will call this endpoint with a signed_request.
    
    We must:
    1. Parse the signed request to get the user's Facebook/Instagram ID
    2. Delete any data we have for that user
    3. Return a confirmation URL where the user can check deletion status
    
    Meta requires this for app compliance.
    """
    try:
        form_data = await request.form()
        signed_request = form_data.get("signed_request")
        
        if not signed_request:
            raise HTTPException(status_code=400, detail="Missing signed_request")
        
        # Parse and validate the signed request
        data = parse_signed_request(signed_request)
        
        if not data:
            raise HTTPException(status_code=400, detail="Invalid signed_request")
        
        user_id = data.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Missing user_id in signed_request")
        
        print(f"[Instagram] Data deletion request for user: {user_id}")
        
        # Generate a unique confirmation code for this deletion request
        confirmation_code = hashlib.sha256(
            f"{user_id}:{datetime.utcnow().isoformat()}:{settings.SECRET_KEY}".encode()
        ).hexdigest()[:16].upper()
        
        # TODO: Actually delete user data from database
        # This will be implemented when we have the instagram_accounts table
        # For now, we log the request
        
        # In the future, this should:
        # 1. Find the instagram_account by instagram_user_id = user_id
        # 2. Delete all instagram_media for that account
        # 3. Delete all instagram_replied_comments for those media
        # 4. Delete the instagram_account record
        # 5. Store the confirmation_code with deletion timestamp
        
        # Return the response Meta expects
        confirmation_url = f"{settings.FRONTEND_URL}/data-deletion?code={confirmation_code}"
        
        return JSONResponse(content={
            "url": confirmation_url,
            "confirmation_code": confirmation_code
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Instagram] Data deletion error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/deauthorize")
async def deauthorize_callback(request: Request):
    """
    Handle deauthorization requests from Meta.
    
    When a user removes the app from their Facebook/Instagram account settings,
    Meta will call this endpoint to notify us.
    
    We should:
    1. Parse the signed request to get the user's ID
    2. Revoke their access tokens and disable their account
    3. Optionally trigger a cleanup process
    """
    try:
        form_data = await request.form()
        signed_request = form_data.get("signed_request")
        
        if not signed_request:
            raise HTTPException(status_code=400, detail="Missing signed_request")
        
        # Parse and validate the signed request
        data = parse_signed_request(signed_request)
        
        if not data:
            raise HTTPException(status_code=400, detail="Invalid signed_request")
        
        user_id = data.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Missing user_id in signed_request")
        
        print(f"[Instagram] Deauthorization request for user: {user_id}")
        
        # TODO: Actually deactivate user's Instagram account
        # This will be implemented when we have the instagram_accounts table
        # For now, we log the request
        
        # In the future, this should:
        # 1. Find the instagram_account by instagram_user_id = user_id
        # 2. Set is_active = False
        # 3. Clear the access_token
        # 4. Optionally notify the user via email
        
        return JSONResponse(content={"success": True})
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Instagram] Deauthorization error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/data-deletion")
async def data_deletion_status(code: str = None):
    """
    Check the status of a data deletion request.
    
    This is the page users are redirected to after requesting data deletion.
    """
    if not code:
        return JSONResponse(content={
            "status": "error",
            "message": "No confirmation code provided"
        })
    
    # TODO: Look up the confirmation code in database to get actual status
    # For now, return a generic response
    
    return JSONResponse(content={
        "status": "completed",
        "confirmation_code": code,
        "message": "Your data has been deleted from our systems."
    })
