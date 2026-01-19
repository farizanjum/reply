"""
Instagram Media Management Router

Endpoints for:
- Listing user's Instagram media
- Syncing media from Instagram
- Updating automation settings
- Manual trigger for comment processing
- Getting media activity/stats
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel

from database_pg import (
    get_instagram_account_by_user_id,
    get_instagram_media_by_account,
    update_instagram_media_settings,
    update_instagram_media_last_processed,
    get_instagram_replied_comments,
    get_instagram_reply_stats,
)
from middleware.auth_middleware import get_current_user

router = APIRouter()


# =====================================================
# PYDANTIC MODELS
# =====================================================

class MediaSettingsUpdate(BaseModel):
    """Settings update payload"""
    auto_reply_enabled: Optional[bool] = None
    keywords: Optional[List[str]] = None
    reply_templates: Optional[List[str]] = None
    dm_enabled: Optional[bool] = None
    dm_template: Optional[str] = None
    resource_link: Optional[str] = None
    schedule_interval_minutes: Optional[int] = None


class MediaResponse(BaseModel):
    """Media item response"""
    id: int
    media_id: str
    media_type: Optional[str]
    caption: Optional[str]
    permalink: Optional[str]
    thumbnail_url: Optional[str]
    auto_reply_enabled: bool
    keywords: List[str]
    reply_templates: List[str]
    dm_enabled: bool
    dm_template: Optional[str]
    resource_link: Optional[str]
    schedule_interval_minutes: int
    last_processed_at: Optional[str]


# =====================================================
# ENDPOINTS
# =====================================================

@router.get("/media")
async def list_instagram_media(user: dict = Depends(get_current_user)):
    """
    Get all Instagram media for the user with automation settings.
    
    Returns list of posts/reels with their current settings.
    """
    user_id = user.get("id")
    
    # Get Instagram account
    account = await get_instagram_account_by_user_id(user_id)
    if not account:
        return {"media": [], "account_connected": False}
    
    # Get media
    media = await get_instagram_media_by_account(account["id"])
    
    # Parse JSONB fields and format response
    formatted_media = []
    for item in media:
        keywords = item.get("keywords", [])
        if isinstance(keywords, str):
            import json
            keywords = json.loads(keywords)
        
        reply_templates = item.get("reply_templates", [])
        if isinstance(reply_templates, str):
            import json
            reply_templates = json.loads(reply_templates)
        
        formatted_media.append({
            "id": item["id"],
            "media_id": item["media_id"],
            "media_type": item.get("media_type"),
            "caption": item.get("caption", "")[:100] + "..." if item.get("caption") and len(item.get("caption", "")) > 100 else item.get("caption", ""),
            "permalink": item.get("permalink"),
            "thumbnail_url": item.get("thumbnail_url"),
            "auto_reply_enabled": item.get("auto_reply_enabled", False),
            "keywords": keywords or [],
            "reply_templates": reply_templates or [],
            "dm_enabled": item.get("dm_enabled", False),
            "dm_template": item.get("dm_template"),
            "resource_link": item.get("resource_link"),
            "schedule_interval_minutes": item.get("schedule_interval_minutes", 60),
            "last_processed_at": item["last_processed_at"].isoformat() if item.get("last_processed_at") else None,
            "media_timestamp": item["media_timestamp"].isoformat() if item.get("media_timestamp") else None,
        })
    
    return {
        "media": formatted_media,
        "account_connected": True,
        "account": {
            "username": account.get("instagram_username"),
            "profile_picture_url": account.get("profile_picture_url"),
        }
    }


@router.post("/media/sync")
async def sync_media(user: dict = Depends(get_current_user)):
    """
    Sync media from Instagram.
    
    Fetches latest posts/reels and saves to database.
    """
    user_id = user.get("id")
    
    # Get Instagram account
    account = await get_instagram_account_by_user_id(user_id)
    if not account:
        raise HTTPException(status_code=404, detail="Instagram account not connected")
    
    # Trigger sync task
    from tasks.instagram_tasks import sync_instagram_media
    
    try:
        result = sync_instagram_media.delay(account["id"])
        return {
            "success": True,
            "message": "Media sync started",
            "task_id": result.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start sync: {str(e)}")


@router.get("/media/{media_id}")
async def get_media_details(
    media_id: int,
    user: dict = Depends(get_current_user)
):
    """
    Get detailed info for a single media item including activity.
    """
    user_id = user.get("id")
    
    # Verify ownership
    account = await get_instagram_account_by_user_id(user_id)
    if not account:
        raise HTTPException(status_code=404, detail="Instagram account not connected")
    
    # Get media
    media_list = await get_instagram_media_by_account(account["id"])
    media = next((m for m in media_list if m["id"] == media_id), None)
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Get recent activity
    activity = await get_instagram_replied_comments(media_id, limit=20)
    
    import json
    keywords = media.get("keywords", [])
    if isinstance(keywords, str):
        keywords = json.loads(keywords)
    
    reply_templates = media.get("reply_templates", [])
    if isinstance(reply_templates, str):
        reply_templates = json.loads(reply_templates)
    
    return {
        "media": {
            "id": media["id"],
            "media_id": media["media_id"],
            "media_type": media.get("media_type"),
            "caption": media.get("caption"),
            "permalink": media.get("permalink"),
            "thumbnail_url": media.get("thumbnail_url"),
            "auto_reply_enabled": media.get("auto_reply_enabled", False),
            "keywords": keywords or [],
            "reply_templates": reply_templates or [],
            "dm_enabled": media.get("dm_enabled", False),
            "dm_template": media.get("dm_template"),
            "resource_link": media.get("resource_link"),
            "schedule_interval_minutes": media.get("schedule_interval_minutes", 60),
            "last_processed_at": media["last_processed_at"].isoformat() if media.get("last_processed_at") else None,
        },
        "activity": [
            {
                "id": a["id"],
                "comment_id": a["comment_id"],
                "commenter_username": a["commenter_username"],
                "comment_text": a["comment_text"][:100] + "..." if a.get("comment_text") and len(a.get("comment_text", "")) > 100 else a.get("comment_text"),
                "matched_keyword": a.get("matched_keyword"),
                "dm_sent": a.get("dm_sent", False),
                "reply_sent": a.get("reply_sent", False),
                "error_message": a.get("error_message"),
                "processed_at": a["processed_at"].isoformat() if a.get("processed_at") else None,
            }
            for a in activity
        ]
    }


@router.put("/media/{media_id}/settings")
async def update_media_settings(
    media_id: int,
    settings: MediaSettingsUpdate,
    user: dict = Depends(get_current_user)
):
    """
    Update automation settings for a media item.
    """
    user_id = user.get("id")
    
    # Verify ownership
    account = await get_instagram_account_by_user_id(user_id)
    if not account:
        raise HTTPException(status_code=404, detail="Instagram account not connected")
    
    # Get media to verify ownership
    media_list = await get_instagram_media_by_account(account["id"])
    media = next((m for m in media_list if m["id"] == media_id), None)
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Update settings
    success = await update_instagram_media_settings(
        media_id=media_id,
        auto_reply_enabled=settings.auto_reply_enabled,
        keywords=settings.keywords,
        reply_templates=settings.reply_templates,
        dm_enabled=settings.dm_enabled,
        dm_template=settings.dm_template,
        resource_link=settings.resource_link,
        schedule_interval_minutes=settings.schedule_interval_minutes,
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update settings")
    
    return {"success": True, "message": "Settings updated"}


@router.post("/media/{media_id}/trigger")
async def trigger_processing(
    media_id: int,
    user: dict = Depends(get_current_user)
):
    """
    Manually trigger comment processing for a media item.
    """
    user_id = user.get("id")
    
    # Verify ownership
    account = await get_instagram_account_by_user_id(user_id)
    if not account:
        raise HTTPException(status_code=404, detail="Instagram account not connected")
    
    # Get media to verify ownership
    media_list = await get_instagram_media_by_account(account["id"])
    media = next((m for m in media_list if m["id"] == media_id), None)
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Trigger processing task
    from tasks.instagram_tasks import process_instagram_media_comments
    
    try:
        result = process_instagram_media_comments.delay(media_id)
        return {
            "success": True,
            "message": "Processing started",
            "task_id": result.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start processing: {str(e)}")


@router.get("/stats")
async def get_instagram_stats(
    days: int = Query(default=7, ge=1, le=90),
    user: dict = Depends(get_current_user)
):
    """
    Get Instagram automation statistics.
    """
    user_id = user.get("id")
    
    # Get Instagram account
    account = await get_instagram_account_by_user_id(user_id)
    if not account:
        return {
            "connected": False,
            "stats": None
        }
    
    # Get stats
    stats = await get_instagram_reply_stats(account["id"], days=days)
    
    # Get media counts
    media = await get_instagram_media_by_account(account["id"])
    active_media = sum(1 for m in media if m.get("auto_reply_enabled"))
    
    return {
        "connected": True,
        "account": {
            "username": account.get("instagram_username"),
            "profile_picture_url": account.get("profile_picture_url"),
        },
        "stats": {
            "total_media": len(media),
            "active_media": active_media,
            "total_processed": stats.get("total_processed", 0),
            "replies_sent": stats.get("replies_sent", 0),
            "dms_sent": stats.get("dms_sent", 0),
            "keyword_matches": stats.get("keyword_matches", 0),
            "period_days": days,
        }
    }
