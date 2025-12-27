"""
Celery Worker Configuration

Handles background jobs for:
- Video comment processing
- Bulk reply operations
- Video syncing
- Analytics computation
"""
import sys
import os

# Ensure the backend directory is in Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from celery import Celery
from celery.signals import worker_ready
from config import settings
import asyncio

# Create Celery app
# Heroku Redis requires SSL cert verification disabled
def get_redis_url():
    redis_url = settings.REDIS_URL if settings.USE_REDIS else 'redis://localhost:6379'
    # Heroku Redis uses self-signed certs, disable verification
    if redis_url.startswith('rediss://'):
        if '?' in redis_url:
            redis_url += '&ssl_cert_reqs=none'
        else:
            redis_url += '?ssl_cert_reqs=none'
    return redis_url

redis_url = get_redis_url()

celery_app = Celery(
    'youtube_autoreply',
    broker=redis_url,
    backend=redis_url,
    include=['tasks']
)

# Celery configuration
celery_app.conf.update(
    # Serialization
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    
    # Task routing
    task_routes={
        'tasks.process_video_replies': {'queue': 'replies'},
        'tasks.reply_to_comments_batch': {'queue': 'replies'},
        'tasks.sync_user_videos': {'queue': 'sync'},
        'tasks.sync_replied_comments_cache': {'queue': 'cache'},
    },
    
    # Performance settings
    worker_prefetch_multiplier=1,  # Fair distribution
    task_acks_late=True,  # Reliability - ack only after completion
    worker_max_tasks_per_child=1000,  # Prevent memory leaks
    task_time_limit=600,  # 10 minute hard timeout
    task_soft_time_limit=540,  # 9 minute soft timeout
    
    # Rate limiting
    task_default_rate_limit='100/m',  # Max 100 tasks per minute
    
    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    result_backend_transport_options={
        'master_name': 'mymaster',
        'visibility_timeout': 3600,
    },
    
    # Timezone
    timezone='UTC',
    enable_utc=True,
    
    # Beat scheduler - use RedBeat (Redis-backed) for Windows compatibility
    beat_scheduler='redbeat.RedBeatScheduler',
    redbeat_redis_url=redis_url,
    redbeat_key_prefix='redbeat:',
)


@worker_ready.connect
def at_start(sender, **kwargs):
    """Initialize database connections when worker starts"""
    print("🚀 Celery worker starting...")
    print(f"   Redis URL: {settings.REDIS_URL[:30]}..." if settings.USE_REDIS else "   Redis: Local")
    print(f"   PostgreSQL: {settings.USE_POSTGRES}")


# Global event loop for Celery tasks
_celery_loop = None

# Helper to run async functions in Celery tasks
def run_async(async_func):
    """Run async function in sync Celery task - reuses event loop"""
    global _celery_loop
    import sys
    import os
    # Ensure backend directory is in path before running async code
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    
    # Reuse existing loop or create new one
    if _celery_loop is None or _celery_loop.is_closed():
        _celery_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_celery_loop)
    
    return _celery_loop.run_until_complete(async_func)


if __name__ == '__main__':
    celery_app.start()
