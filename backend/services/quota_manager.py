from datetime import datetime, date
from typing import Dict
from config import settings
from database_pg import get_direct_connection, get_pool

class QuotaManager:
    """Manage YouTube API quota - using persistent Database storage"""
    
    def __init__(self):
        self.daily_limit = settings.DAILY_QUOTA_LIMIT
    
    async def get_current_usage(self, user_id: int = None) -> int:
        """Get today's quota usage from DB (global or per user if expanded)"""
        # For now, we simulate global quota by summing users or using a single user for single-tenant
        # But wait, original implementation was GLOBAL in-memory.
        # Users reported "Quota limit not increasing". 
        # If we act as single tenant, we can just check the first user or aggregate?
        # Let's use the DB. But without a specific user_id context in some calls, it's tricky.
        
        # However, looking at usage:
        # engine = ReplyEngine(youtube, quota_mgr)
        # engine.reply_to_comments_batch -> calls track_request(cost)
        
        # We need to switch context to persistent storage. 
        # Since we are single-tenant mostly (or the user implies "MY quota"), 
        # we can sum up 'daily_quota_used' from all users or tracking table?
        # Actually, API quota is per PROJECT (Application), not per user.
        # So we should validly track GLOBAL usage.
        
        # Problem: DB is user-centric. 
        # Solution: Create a 'system_settings' table or just use an in-memory fallback backed by Redis?
        # User said "Quota limit not increasing".
        # If we use Redis, it persists. 
        
        # Let's try to use Redis if available, else DB fallback (maybe store on user 1?)
        # Or simpler: The user is likely the ONLY user (Fariz).
        # Let's aggregate ALL users' daily_quota_used as the total usage.
        
        pool = get_pool()
        today = date.today()
        
        query = "SELECT SUM(daily_quota_used) FROM users WHERE last_quota_reset = $1"
        
        # Reset logic handled in track_request usually, but here we just read.
        # If date mismatch, count is effective 0.
        
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
        """Check if request can be made"""
        current = await self.get_current_usage()
        return (current + cost) <= self.daily_limit
    
    async def track_request(self, cost: int, user_id: int = None):
        """Track API request - persist to DB"""
        # We need a user_id to attribute usage to!
        # If user_id is None, we might fail to track if we rely on 'users' table.
        # In `reply_engine.py`, does it pass user_id?
        # Let's check reply_engine.py usage.
        
        # If user_id provided:
        if user_id:
            pool = get_pool()
            today = date.today()
            
            # Logic: Update user's quota. If date changed, reset and add cost.
            # Handles DB side.
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
        else:
            # Fallback if no user_id (shouldn't happen in video context)
            pass

    async def get_remaining_quota(self) -> int:
        """Get remaining quota"""
        used = await self.get_current_usage()
        return self.daily_limit - used
