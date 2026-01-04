"""
Redis Cache and Distributed State Management

Features:
- Sub-millisecond cache lookups
- Distributed quota tracking across workers
- Session and token caching
- Replied comments bloom filter-like cache
"""
import redis.asyncio as redis
from typing import Optional, List, Dict, Set
from datetime import date
import json

from config import settings


class CacheManager:
    """Redis-based caching for high-performance operations"""
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
    
    async def connect(self):
        """Initialize Redis connection"""
        # Fix for Heroku Redis SSL (self-signed certs)
        redis_url = settings.REDIS_URL
        if redis_url.startswith('rediss://'):
            if '?' in redis_url:
                redis_url += '&ssl_cert_reqs=none'
            else:
                redis_url += '?ssl_cert_reqs=none'
        
        self.redis = redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True
        )
        # Test connection
        await self.redis.ping()
        print("✓ Redis cache connected")
    
    async def close(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()
            print("✓ Redis cache closed")
    
    # ============================================
    # USER CACHING
    # ============================================
    
    async def get_user(self, user_id: int) -> Optional[Dict]:
        """Get cached user data"""
        data = await self.redis.get(f"user:{user_id}")
        return json.loads(data) if data else None
    
    async def set_user(self, user_id: int, user_data: Dict, ttl: int = 3600):
        """Cache user data for 1 hour"""
        await self.redis.setex(
            f"user:{user_id}",
            ttl,
            json.dumps(user_data, default=str)
        )
    
    async def invalidate_user(self, user_id: int):
        """Invalidate user cache"""
        await self.redis.delete(f"user:{user_id}")
    
    # ============================================
    # VIDEO CACHING
    # ============================================
    
    async def get_user_videos(self, user_id: int) -> Optional[List[Dict]]:
        """Get cached videos for user"""
        data = await self.redis.get(f"videos:{user_id}")
        return json.loads(data) if data else None
    
    async def set_user_videos(self, user_id: int, videos: List[Dict], ttl: int = 300):
        """Cache videos for 5 minutes"""
        await self.redis.setex(
            f"videos:{user_id}",
            ttl,
            json.dumps(videos, default=str)
        )
    
    async def invalidate_user_videos(self, user_id: int):
        """Invalidate videos cache after sync"""
        await self.redis.delete(f"videos:{user_id}")
    
    # ============================================
    # REPLIED COMMENTS CACHE (Fast duplicate check)
    # ============================================
    
    async def is_comment_replied(self, comment_id: str) -> bool:
        """O(1) check if comment was replied to"""
        return await self.redis.sismember("replied_comments", comment_id)
    
    async def check_replied_batch(self, comment_ids: List[str]) -> Set[str]:
        """Batch check for replied comments - O(n) with pipeline"""
        if not comment_ids:
            return set()
        
        pipe = self.redis.pipeline()
        for cid in comment_ids:
            pipe.sismember("replied_comments", cid)
        
        results = await pipe.execute()
        return {cid for cid, is_member in zip(comment_ids, results) if is_member}
    
    async def mark_comment_replied(self, comment_id: str):
        """Add comment to replied set"""
        await self.redis.sadd("replied_comments", comment_id)
    
    async def mark_comments_replied_batch(self, comment_ids: List[str]):
        """Batch add comments to replied set"""
        if comment_ids:
            await self.redis.sadd("replied_comments", *comment_ids)
    
    async def sync_replied_comments(self, comment_ids: List[str]):
        """Sync replied comments from database to cache"""
        if comment_ids:
            await self.redis.sadd("replied_comments", *comment_ids)
    
    # ============================================
    # ANALYTICS CACHING
    # ============================================
    
    async def get_analytics(self, user_id: int) -> Optional[Dict]:
        """Get cached analytics"""
        data = await self.redis.get(f"analytics:{user_id}")
        return json.loads(data) if data else None
    
    async def set_analytics(self, user_id: int, analytics: Dict, ttl: int = 60):
        """Cache analytics for 1 minute"""
        await self.redis.setex(
            f"analytics:{user_id}",
            ttl,
            json.dumps(analytics, default=str)
        )


class QuotaManager:
    """Redis-based distributed quota management
    
    Features:
    - Shared across all workers
    - Per-user quota tracking
    - Survives restarts
    - Automatic daily reset
    """
    
    def __init__(self, cache: CacheManager):
        self.cache = cache
        self.daily_limit = settings.DAILY_QUOTA_LIMIT
        self.user_daily_limit = settings.USER_DAILY_REPLY_LIMIT
    
    def _get_quota_key(self, user_id: Optional[int] = None) -> str:
        """Get quota key for today"""
        today = date.today().isoformat()
        if user_id:
            return f"quota:{user_id}:{today}"
        return f"quota:global:{today}"
    
    async def get_current_usage(self, user_id: Optional[int] = None) -> int:
        """Get today's quota usage"""
        key = self._get_quota_key(user_id)
        usage = await self.cache.redis.get(key)
        return int(usage) if usage else 0
    
    async def get_user_reply_count(self, user_id: int) -> int:
        """Get THIS user's reply count today from Redis"""
        # Use the user-specific quota key which tracks reply count
        key = self._get_quota_key(user_id)
        count = await self.cache.redis.get(key)
        # Note: In Redis mode, we track quota units, not reply count
        # Each reply costs 50 units, so we divide by 50 to get approximate reply count
        # For exact count, we fall back to DB
        from db import get_reply_stats
        stats = await get_reply_stats(user_id, days=1)
        return stats.get('total_replies', 0) if stats else 0
    
    async def can_user_reply(self, user_id: int) -> bool:
        """Check if user hasn't exceeded their daily limit"""
        user_replies_today = await self.get_user_reply_count(user_id)
        return user_replies_today < self.user_daily_limit
    
    async def get_user_remaining_replies(self, user_id: int) -> int:
        """Get how many replies user can still send today"""
        user_replies_today = await self.get_user_reply_count(user_id)
        return max(0, self.user_daily_limit - user_replies_today)
    
    async def can_make_request(self, cost: int, user_id: Optional[int] = None) -> bool:
        """Check if request can be made within quota"""
        current = await self.get_current_usage(user_id)
        return (current + cost) <= self.daily_limit
    
    async def track_request(self, cost: int, user_id: Optional[int] = None):
        """Track API request quota usage"""
        key = self._get_quota_key(user_id)
        pipe = self.cache.redis.pipeline()
        pipe.incrby(key, cost)
        pipe.expire(key, 86400 * 2)  # 2 day TTL for safety
        await pipe.execute()
    
    async def get_remaining_quota(self, user_id: Optional[int] = None) -> int:
        """Get remaining quota for today"""
        used = await self.get_current_usage(user_id)
        return max(0, self.daily_limit - used)
    
    async def reset_quota(self, user_id: Optional[int] = None):
        """Reset quota (for testing)"""
        key = self._get_quota_key(user_id)
        await self.cache.redis.delete(key)
    
    async def get_all_user_quotas(self) -> Dict[str, int]:
        """Get quota usage for all users today"""
        today = date.today().isoformat()
        pattern = f"quota:*:{today}"
        
        result = {}
        async for key in self.cache.redis.scan_iter(match=pattern):
            usage = await self.cache.redis.get(key)
            result[key] = int(usage) if usage else 0
        
        return result


# Global instances
cache_manager = CacheManager()
quota_manager: Optional[QuotaManager] = None


async def init_cache():
    """Initialize cache on startup"""
    global quota_manager
    await cache_manager.connect()
    quota_manager = QuotaManager(cache_manager)


async def close_cache():
    """Close cache on shutdown"""
    await cache_manager.close()
