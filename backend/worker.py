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
import ssl

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

# SSL configuration for Heroku Redis
broker_use_ssl = None
if redis_url.startswith('rediss://'):
    broker_use_ssl = {
        'ssl_cert_reqs': ssl.CERT_NONE,
        'ssl_check_hostname': False,
    }

celery_app = Celery(
    'youtube_autoreply',
    broker=redis_url,
    backend=redis_url,
    include=['tasks']
)

# Celery configuration
celery_app.conf.update(
    # SSL Configuration for Heroku Redis
    broker_use_ssl=broker_use_ssl,
    redis_backend_use_ssl=broker_use_ssl,
    
    # Serialization
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    
    # Task routing - route to specific queues
    task_routes={
        'tasks.process_video_replies': {'queue': 'celery'},
        'tasks.reply_to_comments_batch': {'queue': 'celery'},
        'tasks.sync_user_videos': {'queue': 'celery'},
        'tasks.sync_replied_comments_cache': {'queue': 'celery'},
        'tasks.process_auto_replies_all': {'queue': 'celery'},
        'tasks.cleanup_old_results': {'queue': 'celery'},
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
    try:
        # Check for existing running loop first
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None
            
        if loop and loop.is_running():
            # If we are already in a running loop, we can't use run_until_complete
            # This happens in tests or if worker is async. 
            # For sync tasks, we shouldn't be here, but if we are, create a task?
            # But we need result synchronously.
            # We can't block a running loop.
            # This signals an architecture issue if it happens in prod.
            # But for safety, we try to create a new loop in a separate thread if needed?
            # For now, just rely on the global one if not running.
            pass

        if _celery_loop is None or _celery_loop.is_closed():
            _celery_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(_celery_loop)
        
        return _celery_loop.run_until_complete(async_func)
    except RuntimeError as e:
        if "Cannot run the event loop while another loop is running" in str(e):
             # Deep fallback: Just run the coroutine directly if we are in a loop?
             # No, you can't await in sync function.
             # Use a new thread to run the loop
             import threading
             result = []
             def run_in_thread():
                 new_loop = asyncio.new_event_loop()
                 asyncio.set_event_loop(new_loop)
                 result.append(new_loop.run_until_complete(async_func))
                 new_loop.close()
             
             t = threading.Thread(target=run_in_thread)
             t.start()
             t.join()
             return result[0]
        raise e


if __name__ == '__main__':
    celery_app.start()
