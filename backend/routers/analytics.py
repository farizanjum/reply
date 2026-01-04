from fastapi import APIRouter, Header, HTTPException
from db import get_reply_stats, get_user_by_id, get_recent_replies, get_chart_data as db_get_chart_data
from config import settings
import jwt

router = APIRouter()

# Import centralized auth middleware
from middleware.auth_middleware import get_current_user

async def get_current_user_from_header(authorization: str = Header(None)):
    """Extract user from Authorization header - delegates to centralized middleware"""
    return await get_current_user(authorization)



async def get_quota_manager():
    """Get quota manager - Redis-based in production, in-memory locally"""
    if settings.USE_REDIS:
        from services.cache import cache_manager, QuotaManager
        return QuotaManager(cache_manager)
    else:
        from services.quota_manager import QuotaManager
        return QuotaManager()


@router.get("/")
async def get_analytics(authorization: str = Header(None)):
    """Get analytics dashboard data"""
    user = await get_current_user_from_header(authorization)
    
    # Get reply stats
    stats_7d = await get_reply_stats(user['id'], days=7)
    
    # Get per-user quota usage (not global)
    quota_mgr = await get_quota_manager()
    
    # Get THIS user's reply count today and remaining
    user_replies_today = await quota_mgr.get_user_reply_count(user['id'])
    user_remaining = await quota_mgr.get_user_remaining_replies(user['id'])
    user_daily_limit = quota_mgr.user_daily_limit
    
    # Calculate percentage of user's daily limit used
    user_quota_percent = int((user_replies_today / user_daily_limit) * 100) if user_daily_limit > 0 else 0
    
    # Get recent replies (using the db abstraction)
    recent_replies = await get_recent_replies(user['id'], limit=50)
    
    # Serialize datetime objects for JSON response
    for reply in recent_replies:
        for key, value in reply.items():
            if hasattr(value, 'isoformat'):
                reply[key] = value.isoformat()
    
    return {
        "total_replies": stats_7d.get('total_replies', 0) if stats_7d else 0,
        "replies_today": user_replies_today,
        "replies_this_week": stats_7d.get('total_replies', 0) if stats_7d else 0,
        "quota_used": user_quota_percent,
        "quota_units_used": user_replies_today,
        "user_daily_limit": user_daily_limit,
        "user_remaining": user_remaining,
        "recent_replies": recent_replies
    }


@router.get("/chart")
async def get_chart_data_endpoint(authorization: str = Header(None), days: int = 7):
    """Get chart data for analytics"""
    user = await get_current_user_from_header(authorization)
    
    chart_data = await db_get_chart_data(user['id'], days=days)
    
    # Serialize date objects
    for item in chart_data:
        if 'date' in item and hasattr(item['date'], 'isoformat'):
            item['date'] = item['date'].isoformat()
    
    return chart_data
