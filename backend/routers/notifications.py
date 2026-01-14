from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
from middleware.auth_middleware import get_current_user
from database_pg import (
    get_notification_preferences,
    update_notification_preferences
)

router = APIRouter()


class NotificationPreferences(BaseModel):
    notify_quota_warnings: Optional[bool] = None
    notify_errors: Optional[bool] = None


async def get_current_user_from_header(authorization: str = Header(None)):
    """Extract user from Authorization header - delegates to centralized middleware"""
    return await get_current_user(authorization)


@router.get("/preferences")
async def get_preferences(authorization: str = Header(None)):
    """Get user's notification preferences"""
    user = await get_current_user_from_header(authorization)
    user_id = user['id']
    
    prefs = await get_notification_preferences(user_id)
    
    return {
        "notify_quota_warnings": prefs['notify_quota_warnings'],
        "notify_errors": prefs['notify_errors']
    }


@router.put("/preferences")
async def update_preferences(
    preferences: NotificationPreferences,
    authorization: str = Header(None)
):
    """Update user's notification preferences"""
    user = await get_current_user_from_header(authorization)
    user_id = user['id']
    
    success = await update_notification_preferences(
        user_id,
        notify_quota_warnings=preferences.notify_quota_warnings,
        notify_errors=preferences.notify_errors
    )
    
    if not success:
        raise HTTPException(500, "Failed to update preferences")
    
    # Return updated preferences
    prefs = await get_notification_preferences(user_id)
    
    return {
        "success": True,
        "notify_quota_warnings": prefs['notify_quota_warnings'],
        "notify_errors": prefs['notify_errors']
    }
