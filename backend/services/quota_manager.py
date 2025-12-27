from datetime import datetime, date
from typing import Dict
from config import settings

# In-memory quota storage (for local development)
# In production, this would use Redis
_quota_storage: Dict[str, int] = {}
_quota_date: date = None

class QuotaManager:
    """Manage YouTube API quota - using in-memory storage for local dev"""
    
    def __init__(self):
        self.daily_limit = settings.DAILY_QUOTA_LIMIT
    
    async def get_current_usage(self) -> int:
        """Get today's quota usage"""
        global _quota_storage, _quota_date
        
        today = date.today()
        
        # Reset if new day
        if _quota_date != today:
            _quota_storage = {}
            _quota_date = today
        
        return _quota_storage.get('daily', 0)
    
    async def can_make_request(self, cost: int) -> bool:
        """Check if request can be made"""
        current = await self.get_current_usage()
        return (current + cost) <= self.daily_limit
    
    async def track_request(self, cost: int):
        """Track API request"""
        global _quota_storage, _quota_date
        
        today = date.today()
        
        # Reset if new day
        if _quota_date != today:
            _quota_storage = {}
            _quota_date = today
        
        current = _quota_storage.get('daily', 0)
        _quota_storage['daily'] = current + cost
    
    async def get_remaining_quota(self) -> int:
        """Get remaining quota"""
        used = await self.get_current_usage()
        return self.daily_limit - used
    
    async def reset_quota(self):
        """Reset daily quota (for testing)"""
        global _quota_storage
        _quota_storage = {}
