"""
Celery Background Tasks

All heavy operations that should run in the background:
- Video comment processing
- Bulk reply operations
- Cache synchronization
"""
import sys
import os

# Ensure the backend directory is in Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from worker import celery_app, run_async
from celery import Task, group, chord
from typing import List, Dict
import asyncio


class DatabaseTask(Task):
    """Base task with database connection"""
    _db_initialized = False
    
    def __call__(self, *args, **kwargs):
        if not self._db_initialized:
            # Import here to avoid circular imports
            if __class__._db_initialized is False:
                run_async(self._init_db())
                __class__._db_initialized = True
        return self.run(*args, **kwargs)
    
    async def _init_db(self):
        """Initialize connections for worker - skip pool, use direct connections"""
        # Load environment variables
        from dotenv import load_dotenv
        load_dotenv()
        
        # Don't initialize the pool - Celery tasks will use direct connections
        # This avoids event loop conflicts between pool and task execution
        print("✓ Celery worker ready (using direct DB connections)")
        
        # Initialize Redis cache if available
        try:
            from services.cache import init_cache
            await init_cache()
            print("✓ Redis cache initialized in Celery worker")
        except Exception as e:
            print(f"Warning: Redis cache init failed: {e}")


@celery_app.task(
    base=DatabaseTask,
    bind=True,
    max_retries=3,
    default_retry_delay=60
)
def process_video_replies(
    self,
    video_id: str,
    user_id: int,
    keywords: List[str],
    reply_templates: List[str],
    max_comments: int = 1000
) -> Dict:
    """
    Process all comments for a video and reply to matching ones
    
    This is the main background job for auto-reply functionality.
    Returns: Stats about the job execution
    """
    async def _process():
        from database_pg import get_user_by_id
        from services.youtube_client import AsyncYouTubeClient
        from services.reply_engine import ReplyEngine
        from services.cache import cache_manager, QuotaManager
        from config import settings
        
        try:
            # Get user
            user = await get_user_by_id(user_id)
            if not user:
                return {"error": "User not found", "succeeded": 0, "failed": 0}
            
            # Initialize services
            from database_pg import update_user_tokens
            youtube = AsyncYouTubeClient(
                user['access_token'], 
                user['refresh_token'],
                user_id=user_id,
                on_token_refresh=update_user_tokens
            )
            
            if settings.USE_REDIS:
                quota_mgr = QuotaManager(cache_manager)
            else:
                from services.quota_manager import QuotaManager as LocalQuota
                quota_mgr = LocalQuota()
            
            engine = ReplyEngine(youtube, quota_mgr)
            
            # Check quota before starting
            if settings.USE_REDIS:
                remaining = await quota_mgr.get_remaining_quota(user_id)
            else:
                remaining = await quota_mgr.get_remaining_quota()
            
            if remaining < 100:
                return {"error": "Insufficient quota", "quota_remaining": remaining}
            
            # Fetch comments
            print(f"📥 Fetching comments for video {video_id}...")
            comments = await youtube.get_video_comments(video_id, max_results=max_comments)
            
            # Filter by keywords
            filtered = engine.filter_comments_by_keywords(comments, keywords)
            print(f"🎯 {len(filtered)} comments matched keywords")
            
            # Filter out already replied
            to_reply = await engine.filter_non_replied(filtered)
            print(f"✨ {len(to_reply)} new comments to reply to")
            
            # Process in batches of 50
            batch_size = 50
            all_results = []
            
            for i in range(0, len(to_reply), batch_size):
                batch = to_reply[i:i + batch_size]
                print(f"📤 Processing batch {i//batch_size + 1} ({len(batch)} comments)...")
                
                results = await engine.reply_to_comments_batch(
                    batch,
                    video_id,
                    user_id,
                    reply_templates,
                    max_concurrent=5
                )
                all_results.extend(results)
                
                # Brief pause between batches to avoid rate limiting
                if i + batch_size < len(to_reply):
                    await asyncio.sleep(2)
            
            succeeded = sum(1 for r in all_results if r.get('success'))
            failed = sum(1 for r in all_results if not r.get('success'))
            
            return {
                "total_comments": len(comments),
                "matched_keywords": len(filtered),
                "new_comments": len(to_reply),
                "succeeded": succeeded,
                "failed": failed,
                "quota_used": succeeded * 50  # Each reply costs 50 units
            }
            
        except Exception as e:
            print(f"❌ Error in process_video_replies: {e}")
            # Retry the task
            raise self.retry(exc=e)
    
    return run_async(_process())


@celery_app.task(
    base=DatabaseTask,
    bind=True,
    rate_limit='10/m'  # Max 10 batches per minute
)
def reply_to_comments_batch(
    self,
    comments: List[Dict],
    video_id: str,
    user_id: int,
    reply_templates: List[str]
) -> Dict:
    """Reply to a batch of comments with rate limiting"""
    async def _reply():
        from database_pg import get_user_by_id
        from services.youtube_client import AsyncYouTubeClient
        from services.reply_engine import ReplyEngine
        from services.cache import cache_manager, QuotaManager
        from config import settings
        
        user = await get_user_by_id(user_id)
        from database_pg import update_user_tokens
        youtube = AsyncYouTubeClient(
            user['access_token'], 
            user['refresh_token'],
            user_id=user_id,
            on_token_refresh=update_user_tokens
        )
        
        if settings.USE_REDIS:
            quota_mgr = QuotaManager(cache_manager)
        else:
            from services.quota_manager import QuotaManager as LocalQuota
            quota_mgr = LocalQuota()
        
        engine = ReplyEngine(youtube, quota_mgr)
        
        results = await engine.reply_to_comments_batch(
            comments,
            video_id,
            user_id,
            reply_templates
        )
        
        return {
            "processed": len(comments),
            "succeeded": sum(1 for r in results if r.get('success')),
            "failed": sum(1 for r in results if not r.get('success'))
        }
    
    return run_async(_reply())


@celery_app.task(base=DatabaseTask, bind=True)
def sync_user_videos(self, user_id: int) -> Dict:
    """Sync all videos from YouTube for a user"""
    async def _sync():
        from database_pg import get_user_by_id, upsert_videos_batch
        from services.youtube_client import AsyncYouTubeClient
        
        user = await get_user_by_id(user_id)
        if not user:
            return {"error": "User not found"}
        
        from database_pg import update_user_tokens
        youtube = AsyncYouTubeClient(
            user['access_token'], 
            user['refresh_token'],
            user_id=user_id,
            on_token_refresh=update_user_tokens
        )
        
        # Fetch videos
        videos = await youtube.get_channel_videos(user['channel_id'], max_results=100)
        
        # Prepare video data
        video_data = []
        for video in videos:
            snippet = video['snippet']
            stats = video.get('statistics', {})
            
            video_data.append({
                'video_id': video['contentDetails']['videoId'],
                'title': snippet['title'],
                'description': snippet.get('description', ''),
                'thumbnail_url': snippet['thumbnails']['high']['url'],
                'published_at': snippet['publishedAt'],
                'view_count': int(stats.get('viewCount', 0)),
                'comment_count': int(stats.get('commentCount', 0))
            })
        
        # Bulk insert
        count = await upsert_videos_batch(user_id, video_data)
        
        # Invalidate cache
        from config import settings
        if settings.USE_REDIS:
            from services.cache import cache_manager
            await cache_manager.invalidate_user_videos(user_id)
        
        return {
            "synced": count,
            "total_videos": len(videos)
        }
    
    return run_async(_sync())


@celery_app.task(base=DatabaseTask)
def sync_replied_comments_cache(user_id: int = None) -> Dict:
    """Sync replied comments from DB to Redis cache"""
    async def _sync():
        from config import settings
        if not settings.USE_REDIS:
            return {"error": "Redis not enabled"}
        
        from database_pg import get_direct_connection
        from services.cache import cache_manager
        
        async with get_direct_connection() as conn:
            if user_id:
                rows = await conn.fetch(
                    "SELECT comment_id FROM replied_comments WHERE user_id = $1",
                    user_id
                )
            else:
                rows = await conn.fetch("SELECT comment_id FROM replied_comments")
            
            comment_ids = [row['comment_id'] for row in rows]
            
            # Sync to Redis
            await cache_manager.sync_replied_comments(comment_ids)
            
            return {"synced": len(comment_ids)}
    
    return run_async(_sync())


@celery_app.task(base=DatabaseTask)
def cleanup_old_results():
    """Cleanup old Celery results (runs daily)"""
    # Celery automatically expires results after 1 hour
    # This is just a placeholder for any custom cleanup
    return {"cleaned": 0}


@celery_app.task(base=DatabaseTask, bind=True)
def process_auto_replies_all(self) -> Dict:
    """
    Main auto-reply job - processes videos that are DUE based on their custom intervals
    
    Runs every minute via Celery Beat.
    Uses human-like delays for each video processed.
    """
    import random
    
    # IMMEDIATE LOG - confirms task was received by worker
    print("=" * 50)
    print("🚀 TASK RECEIVED: process_auto_replies_all")
    print("=" * 50)
    
    async def _process_all():
        from database_pg import get_auto_reply_videos, get_user_by_id
        from services.youtube_client import AsyncYouTubeClient
        from services.reply_engine import ReplyEngine
        from config import settings
        import json
        
        print("🤖 Starting scheduled auto-reply job...")
        
        # Get videos that are due for a check (based on schedule_interval_minutes)
        videos = await get_auto_reply_videos(use_direct=True)
        print(f"Found {len(videos)} videos due for auto-reply")
        
        if not videos:
            return {"message": "No videos due", "total_replied": 0}
        
        total_replied = 0
        processed_videos = 0
        errors = []
        
        for video in videos:
            try:
                # Get user for this video
                user = await get_user_by_id(video['user_id'], use_direct=True)
                if not user:
                    continue
                
                # Update last checked timestamp immediately so we don't re-process in the next minute
                from database_pg import update_last_checked
                await update_last_checked(video['video_id'], use_direct=True)
                
                # Check if user has tokens
                if not user.get('access_token'):
                    continue
                
                # Initialize services
                from database_pg import update_user_tokens
                youtube = AsyncYouTubeClient(
                    user['access_token'], 
                    user['refresh_token'],
                    user_id=video['user_id'],
                    on_token_refresh=update_user_tokens
                )
                
                if settings.USE_REDIS:
                    from services.cache import cache_manager, QuotaManager
                    quota_mgr = QuotaManager(cache_manager)
                else:
                    from services.quota_manager import QuotaManager as LocalQuota
                    quota_mgr = LocalQuota()
                
                engine = ReplyEngine(youtube, quota_mgr)
                
                # Check quota
                remaining = await quota_mgr.get_remaining_quota() if not settings.USE_REDIS else await quota_mgr.get_remaining_quota(video['user_id'])
                if remaining < 100:
                    print(f"Low quota for user {video['user_id']}, skipping")
                    continue
                
                # Fetch comments
                comments = await youtube.get_video_comments(video['video_id'])
                print(f"Video {video['video_id']}: {len(comments)} comments")
                
                if not comments:
                    continue
                
                # Parse keywords and templates from JSON if needed
                keywords = video.get('keywords', [])
                if isinstance(keywords, str):
                    keywords = json.loads(keywords)
                
                templates = video.get('reply_templates', [])
                if isinstance(templates, str):
                    templates = json.loads(templates)
                
                if not keywords or not templates:
                    continue
                
                # Filter by keywords
                filtered = engine.filter_comments_by_keywords(comments, keywords)
                
                # Filter non-replied
                to_reply = await engine.filter_non_replied(filtered)
                print(f"Found {len(to_reply)} comments needing replies")
                
                if not to_reply:
                    continue
                
                # Use human-like batch processing
                from utils.human_delays import HumanDelayGenerator
                batch_size = HumanDelayGenerator.get_batch_size()
                
                # Only process one batch per run to spread load
                batch = to_reply[:batch_size]
                
                results = await engine.reply_to_comments_batch(
                    batch,
                    video['video_id'],
                    video['user_id'],
                    templates
                )
                
                replied = sum(1 for r in results if r.get('success'))
                total_replied += replied
                processed_videos += 1
                print(f"✅ Replied to {replied} comments on {video['video_id']}")
                
                # Professional delay between videos (5-15 seconds)
                if videos.index(video) < len(videos) - 1:
                    delay = random.uniform(5, 15)
                    print(f"Waiting {delay:.1f}s before next video...")
                    import asyncio
                    await asyncio.sleep(delay)
                
            except Exception as e:
                error_msg = f"Error processing video {video.get('video_id')}: {e}"
                print(f"❌ {error_msg}")
                errors.append(error_msg)
                continue
        
        print(f"🎉 Auto-reply job complete. Processed {processed_videos} videos, {total_replied} replies")
        
        return {
            "processed_videos": processed_videos,
            "total_replied": total_replied,
            "errors": errors[:5]  # Only first 5 errors
        }
    
    return run_async(_process_all())


# Periodic tasks (Celery Beat schedule)
celery_app.conf.beat_schedule = {
    # Main auto-reply job - runs every minute to check for due videos
    'auto-reply-scheduler': {
        'task': 'tasks.process_auto_replies_all',
        'schedule': 60.0,  # Every minute
        'options': {'queue': 'celery'}  # MUST match worker's queue!
    },
    # Sync cache every hour
    'sync-cache-every-hour': {
        'task': 'tasks.sync_replied_comments_cache',
        'schedule': 3600.0,  # Every hour
        'options': {'queue': 'celery'}
    },
    # Cleanup every day
    'cleanup-every-day': {
        'task': 'tasks.cleanup_old_results',
        'schedule': 86400.0,  # Every day
        'options': {'queue': 'celery'}
    },
}

