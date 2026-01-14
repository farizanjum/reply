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
    """Get analytics dashboard data - USER-SPECIFIC, not global"""
    user = await get_current_user_from_header(authorization)
    user_id = str(user['id'])
    
    # Get reply stats for this user
    stats_7d = await get_reply_stats(user['id'], days=7)
    
    # Get per-user quota usage (accurate from quota_logs)
    quota_mgr = await get_quota_manager()
    
    # Get THIS user's quota usage from quota_logs table
    user_quota_used = await quota_mgr.get_user_quota_usage_today(user_id)
    user_quota_remaining = await quota_mgr.get_user_quota_remaining(user_id)
    user_replies_today = await quota_mgr.get_user_reply_count(user_id)
    
    # Calculate percentage of user's 10k daily limit used
    user_daily_limit = settings.USER_DAILY_QUOTA_LIMIT  # 10000 units
    user_quota_percent = int((user_quota_used / user_daily_limit) * 100) if user_daily_limit > 0 else 0
    
    # Cap percentage at 100%
    user_quota_percent = min(user_quota_percent, 100)
    
    # Get quota history for chart
    quota_history = await quota_mgr.get_user_quota_history(user_id, days=7)
    
    # Get recent replies (using the db abstraction)
    recent_replies = await get_recent_replies(user['id'], limit=50)
    
    # Serialize datetime objects for JSON response
    for reply in recent_replies:
        for key, value in reply.items():
            if hasattr(value, 'isoformat'):
                reply[key] = value.isoformat()
    
    for item in quota_history:
        for key, value in item.items():
            if hasattr(value, 'isoformat'):
                item[key] = value.isoformat()
    
    # Calculate next quota reset time (midnight Pacific Time)
    from datetime import datetime, timedelta, timezone
    
    # Pacific Time is UTC-8 (standard) or UTC-7 (daylight saving)
    # For simplicity, we calculate midnight PT and return as ISO string
    import zoneinfo
    try:
        pacific = zoneinfo.ZoneInfo("America/Los_Angeles")
    except Exception:
        # Fallback for systems without tzdata
        pacific = timezone(timedelta(hours=-8))
    
    now_pt = datetime.now(pacific)
    # Calculate tomorrow midnight PT
    tomorrow_midnight_pt = (now_pt + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    quota_reset_at = tomorrow_midnight_pt.isoformat()
    
    return {
        "total_replies": stats_7d.get('total_replies', 0) if stats_7d else 0,
        "replies_today": user_replies_today,
        "replies_this_week": stats_7d.get('total_replies', 0) if stats_7d else 0,
        "quota_used": user_quota_percent,  # Percentage of 10k limit
        "quota_units_used": user_quota_used,  # Actual units from quota_logs
        "user_daily_quota_limit": user_daily_limit,  # 10k units per day
        "quota_remaining": user_quota_remaining,  # Remaining quota units
        "quota_history": quota_history,  # Last 7 days breakdown
        "quota_reset_at": quota_reset_at,  # Next reset time (midnight PT)
        "recent_replies": recent_replies
    }


@router.get("/chart")
async def get_chart_data_endpoint(
    authorization: str = Header(None), 
    days: int = 7,
    include_comparison: bool = True
):
    """Get chart data for analytics with optional comparison period"""
    user = await get_current_user_from_header(authorization)
    
    # Handle "all time" (days=0) - cap at 1 year for performance
    actual_days = 365 if days == 0 else days
    
    # Get current period data
    chart_data = await db_get_chart_data(user['id'], days=actual_days)
    
    # Calculate comparison with previous period (only for non-all-time)
    comparison = None
    if include_comparison and days > 0:
        # Get previous period data
        previous_data = await db_get_chart_data(
            user['id'], 
            days=days * 2  # Get double the range, we'll slice
        )
        
        # Sum current period
        current_total = sum(item.get('count', 0) for item in chart_data)
        
        # Previous period is the older half of the data
        if len(previous_data) > len(chart_data):
            previous_items = previous_data[len(chart_data):]
            previous_total = sum(item.get('count', 0) for item in previous_items)
            
            # Calculate percentage change
            if previous_total > 0:
                change_percent = int(((current_total - previous_total) / previous_total) * 100)
                comparison = {
                    "current_total": current_total,
                    "previous_total": previous_total,
                    "change_percent": change_percent,
                    "trend": "up" if change_percent > 0 else "down" if change_percent < 0 else "flat"
                }
            elif current_total > 0:
                # No previous data but have current data
                comparison = {
                    "current_total": current_total,
                    "previous_total": 0,
                    "change_percent": 100,
                    "trend": "up"
                }
    
    # Serialize date objects
    for item in chart_data:
        if 'date' in item and hasattr(item['date'], 'isoformat'):
            item['date'] = item['date'].isoformat()
    
    return {
        "data": chart_data,
        "comparison": comparison,
        "period_days": actual_days
    }

