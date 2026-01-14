from datetime import datetime, date
from typing import Dict, List
from config import settings
from database_pg import (
    get_direct_connection, 
    get_pool, 
    create_quota_log,
    get_user_quota_today,
    get_user_quota_history
)


class QuotaManager:
    """Manage YouTube API quota - using persistent Database storage for accuracy"""
    
    def __init__(self):
        self.daily_limit = settings.DAILY_QUOTA_LIMIT  # 500k global
        self.user_daily_quota_limit = settings.USER_DAILY_QUOTA_LIMIT  # 10k per user
        self.user_daily_reply_limit = settings.USER_DAILY_REPLY_LIMIT  # ~200 replies per user
        self.reply_cost = settings.REPLY_COST  # 50 units
        self.fetch_cost = settings.FETCH_COST  # 1 unit
    
    async def log_quota_usage(
        self, 
        user_id: str, 
        operation: str, 
        cost: int, 
        video_id: str = None,
        use_direct: bool = False
    ):
        """Log a quota usage event to database for accurate tracking"""
        await create_quota_log(
            user_id=str(user_id),
            operation=operation,
            quota_cost=cost,
            video_id=video_id,
            use_direct=use_direct
        )
    
    async def get_user_quota_usage_today(self, user_id: str, use_direct: bool = False) -> int:
        """Get accurate quota units used by user today from quota_logs"""
        return await get_user_quota_today(str(user_id), use_direct=use_direct)
    
    async def get_user_quota_remaining(self, user_id: str, use_direct: bool = False) -> int:
        """Get remaining quota units for user today"""
        used = await self.get_user_quota_usage_today(str(user_id), use_direct=use_direct)
        return max(0, self.user_daily_quota_limit - used)
    
    async def can_user_make_request(self, user_id: str, cost: int, use_direct: bool = False) -> bool:
        """Check if user can make an API request with given cost"""
        remaining = await self.get_user_quota_remaining(str(user_id), use_direct=use_direct)
        return remaining >= cost
    
    async def get_user_reply_count(self, user_id: str) -> int:
        """Get THIS user's reply count today (approximate from quota usage)"""
        pool = get_pool()
        today = date.today()
        
        # Count actual replies sent today from replied_comments table
        query = """
            SELECT COUNT(*) FROM replied_comments 
            WHERE user_id = $1 AND DATE(replied_at) = $2
        """
        
        # Note: user_id in replied_comments is INTEGER, so we need to convert
        count = 0
        try:
            if pool:
                async with pool.acquire() as conn:
                    val = await conn.fetchval(query, int(user_id) if user_id.isdigit() else user_id, today)
                    count = val or 0
            else:
                async with get_direct_connection() as conn:
                    val = await conn.fetchval(query, int(user_id) if str(user_id).isdigit() else user_id, today)
                    count = val or 0
        except Exception as e:
            print(f"Error reading user reply count: {e}")
            
        return count
    
    async def can_user_reply(self, user_id: str, use_direct: bool = False) -> bool:
        """Check if user hasn't exceeded their daily quota limit for replies"""
        remaining = await self.get_user_quota_remaining(str(user_id), use_direct=use_direct)
        return remaining >= self.reply_cost
    
    async def get_user_remaining_replies(self, user_id: str, use_direct: bool = False) -> int:
        """Get how many replies user can still send today (based on quota)"""
        remaining_quota = await self.get_user_quota_remaining(str(user_id), use_direct=use_direct)
        return remaining_quota // self.reply_cost
    
    async def get_user_quota_history(self, user_id: str, days: int = 7) -> List[Dict]:
        """Get quota usage per day for last N days"""
        return await get_user_quota_history(str(user_id), days=days)
    
    # Legacy methods for backward compatibility
    async def get_current_usage(self, user_id: int = None) -> int:
        """Get today's quota usage from DB (global for project monitoring)"""
        if user_id:
            return await self.get_user_quota_usage_today(str(user_id))
        
        # For global monitoring - sum all users
        pool = get_pool()
        today = date.today()
        
        query = "SELECT SUM(daily_quota_used) FROM users WHERE last_quota_reset = $1"
        
        usage = 0
        try:
            if pool:
                async with pool.acquire() as conn:
                    val = await conn.fetchval(query, today)
                    usage = val or 0
            else:
                async with get_direct_connection() as conn:
                    val = await conn.fetchval(query, today)
                    usage = val or 0
        except Exception as e:
            print(f"Error reading quota: {e}")
            
        return usage
    
    async def can_make_request(self, cost: int, user_id: int = None) -> bool:
        """Check if request can be made (global project limit)"""
        if user_id:
            return await self.can_user_make_request(str(user_id), cost)
        current = await self.get_current_usage()
        return (current + cost) <= self.daily_limit
    
    async def track_request(self, cost: int, user_id: int = None):
        """Track API request - persist to DB and log to quota_logs"""
        if user_id:
            # Log to quota_logs for accurate tracking
            await self.log_quota_usage(str(user_id), "API_REQUEST", cost)
            
            # Also update legacy users table for backward compatibility
            pool = get_pool()
            today = date.today()
            
            query = """
                UPDATE users 
                SET daily_quota_used = CASE 
                        WHEN last_quota_reset = $2 THEN daily_quota_used + $3 
                        ELSE $3 
                    END,
                    last_quota_reset = $2
                WHERE id = $1
            """
            
            try:
                if pool:
                    async with pool.acquire() as conn:
                        await conn.execute(query, user_id, today, cost)
                else:
                    async with get_direct_connection() as conn:
                        await conn.execute(query, user_id, today, cost)
            except Exception as e:
                print(f"Error tracking quota: {e}")

    async def get_remaining_quota(self, user_id: int = None) -> int:
        """Get remaining quota"""
        if user_id:
            return await self.get_user_quota_remaining(str(user_id))
        used = await self.get_current_usage()
        return self.daily_limit - used
    
    async def check_and_send_quota_warning(self, user_id: str, user_email: str, use_direct: bool = False):
        """Check if quota warning should be sent (at 80% usage, max once per day)"""
        import httpx
        from database_pg import get_notification_preferences, update_last_quota_warning
        from datetime import datetime, timedelta
        
        # Get user's notification preferences
        prefs = await get_notification_preferences(int(user_id), use_direct=use_direct)
        
        if not prefs.get('notify_quota_warnings', True):
            return  # User disabled quota warnings
        
        # Check if already sent today
        last_warning = prefs.get('last_quota_warning')
        if last_warning:
            try:
                last_dt = datetime.fromisoformat(last_warning)
                if datetime.utcnow() - last_dt < timedelta(hours=24):
                    return  # Already warned today
            except:
                pass
        
        # Get current quota usage
        used = await self.get_user_quota_usage_today(str(user_id), use_direct=use_direct)
        usage_percent = int((used / self.user_daily_quota_limit) * 100)
        
        # Only warn at 80% or above
        if usage_percent < 80:
            return
        
        # Update last warning timestamp
        await update_last_quota_warning(int(user_id), use_direct=use_direct)
        
        # Calculate reset time (midnight PT)
        try:
            from datetime import timezone
            try:
                import pytz
                pacific = pytz.timezone('America/Los_Angeles')
            except ImportError:
                from zoneinfo import ZoneInfo
                pacific = ZoneInfo('America/Los_Angeles')
            
            now = datetime.now(pacific)
            tomorrow = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
            reset_time = f"at midnight PT ({tomorrow.strftime('%I:%M %p')} your time)"
        except:
            reset_time = "at midnight PT"
        
        # Send notification via frontend API
        try:
            import os
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
            notification_secret = os.getenv('NOTIFICATION_SECRET', 'dev-notification-secret')
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(
                    f"{frontend_url}/api/notifications/send",
                    json={
                        "type": "quota_warning",
                        "email": user_email,
                        "usagePercent": usage_percent,
                        "quotaUsed": used,
                        "quotaLimit": self.user_daily_quota_limit,
                        "resetTime": reset_time
                    },
                    headers={"x-notification-secret": notification_secret}
                )
                print(f"📧 Sent quota warning to {user_email} ({usage_percent}% used)")
        except Exception as e:
            print(f"Failed to send quota warning email: {e}")

