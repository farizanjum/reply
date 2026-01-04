from datetime import datetime, date
from typing import Dict
from config import settings
from database_pg import get_direct_connection, get_pool

class QuotaManager:
    """Manage YouTube API quota - using persistent Database storage"""
    
    def __init__(self):
        self.daily_limit = settings.DAILY_QUOTA_LIMIT
        self.user_daily_limit = settings.USER_DAILY_REPLY_LIMIT
    
    async def get_user_usage(self, user_id: int) -> int:
        """Get THIS user's quota usage today (for per-user analytics)"""
        pool = get_pool()
        today = date.today()
        
        query = """
            SELECT daily_quota_used FROM users 
            WHERE id = $1 AND last_quota_reset = $2
        """
        
        usage = 0
        try:
            if pool:
                async with pool.acquire() as conn:
                    val = await conn.fetchval(query, user_id, today)
                    usage = val or 0
            else:
                async with get_direct_connection() as conn:
                    val = await conn.fetchval(query, user_id, today)
                    usage = val or 0
        except Exception as e:
            print(f"Error reading user quota: {e}")
            
        return usage
    
    async def get_user_reply_count(self, user_id: int) -> int:
        """Get THIS user's reply count today (for dashboard display)"""
        pool = get_pool()
        today = date.today()
        
        # Count actual replies sent today
        query = """
            SELECT COUNT(*) FROM replied_comments 
            WHERE user_id = $1 AND DATE(replied_at) = $2
        """
        
        count = 0
        try:
            if pool:
                async with pool.acquire() as conn:
                    val = await conn.fetchval(query, user_id, today)
                    count = val or 0
            else:
                async with get_direct_connection() as conn:
                    val = await conn.fetchval(query, user_id, today)
                    count = val or 0
        except Exception as e:
            print(f"Error reading user reply count: {e}")
            
        return count
    
    async def can_user_reply(self, user_id: int) -> bool:
        """Check if user hasn't exceeded their daily limit"""
        user_replies_today = await self.get_user_reply_count(user_id)
        return user_replies_today < self.user_daily_limit
    
    async def get_user_remaining_replies(self, user_id: int) -> int:
        """Get how many replies user can still send today"""
        user_replies_today = await self.get_user_reply_count(user_id)
        return max(0, self.user_daily_limit - user_replies_today)
    
    async def get_current_usage(self, user_id: int = None) -> int:
        """Get today's quota usage from DB (global for project monitoring)"""
        # For global project monitoring - sums ALL users
        # Used for internal admin checks, not user-facing
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
        current = await self.get_current_usage()
        return (current + cost) <= self.daily_limit
    
    async def track_request(self, cost: int, user_id: int = None):
        """Track API request - persist to DB"""
        if user_id:
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

    async def get_remaining_quota(self) -> int:
        """Get remaining global quota (for admin monitoring)"""
        used = await self.get_current_usage()
        return self.daily_limit - used

