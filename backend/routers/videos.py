from fastapi import APIRouter, Header, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from db import (
    get_user_videos, update_video_settings, get_db_connection, 
    upsert_video, upsert_videos_batch, get_user_by_id
)
from services.youtube_client import AsyncYouTubeClient
import jwt
from config import settings
import json

router = APIRouter()

class VideoSettings(BaseModel):
    auto_reply_enabled: bool
    keywords: List[str]
    reply_templates: List[str]
    schedule_type: Optional[str] = "hourly"
    schedule_interval_minutes: Optional[int] = 60  # Default 1 hour, range: 1-1440 (24 hours)

# Import centralized auth middleware
from middleware.auth_middleware import get_current_user

async def get_current_user_from_header(authorization: str = Header(None)):
    """Extract user from Authorization header - delegates to centralized middleware"""
    return await get_current_user(authorization)

@router.get("/")
async def list_videos(authorization: str = Header(None)):
    """Get all videos for authenticated user"""
    user = await get_current_user_from_header(authorization)
    videos = await get_user_videos(user['id'])
    return videos

@router.get("/sync")
async def sync_videos(authorization: str = Header(None)):
    """Sync videos from YouTube - Background job"""
    user = await get_current_user_from_header(authorization)
    
    # Check if user has YouTube tokens
    if not user.get('access_token'):
        raise HTTPException(
            400, 
            "YouTube tokens not synced. Please reconnect your YouTube account."
        )
    
    if not user.get('channel_id'):
        raise HTTPException(
            400,
            "No YouTube channel linked. Please reconnect your YouTube account."
        )
    
    from config import settings
    
    # Use Celery background job if Redis is available
    if settings.USE_REDIS:
        from tasks import sync_user_videos
        
        # Submit background job
        task = sync_user_videos.delay(user['id'])
        
        return {
            "status": "processing",
            "task_id": task.id,
            "message": "Video sync started in background. Check task status."
        }
    else:
        # Fallback: Process synchronously (local development)
        from services.youtube_client import AsyncYouTubeClient
        from database_pg import update_user_tokens
        
        youtube = AsyncYouTubeClient(
            user['access_token'], 
            user['refresh_token'],
            user_id=user['id'],
            on_token_refresh=update_user_tokens
        )
        
        try:
            videos = await youtube.get_channel_videos(user['channel_id'])
        except Exception as e:
            raise HTTPException(500, f"Failed to fetch videos: {str(e)}")
        
        # Save to database using batch operation
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
        
        synced_count = await upsert_videos_batch(user['id'], video_data)
        
        return {"synced": synced_count}


@router.get("/{video_id}/settings")
async def get_video_settings(video_id: str, authorization: str = Header(None)):
    """Get settings for a video"""
    user = await get_current_user_from_header(authorization)
    
    async with get_db_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT auto_reply_enabled, keywords, reply_templates, schedule_type, schedule_interval_minutes
            FROM videos
            WHERE video_id = $1 AND user_id = $2
            """,
            video_id, user['id']
        )
        
        if not row:
            # Return default settings if video doesn't exist yet
            return {
                "auto_reply_enabled": False,
                "keywords": [],
                "reply_templates": [],
                "schedule_type": "hourly",
                "schedule_interval_minutes": 60
            }
        
        video_settings = dict(row)
        
        # Parse JSON fields
        video_settings['keywords'] = json.loads(video_settings['keywords'] or '[]')
        video_settings['reply_templates'] = json.loads(video_settings['reply_templates'] or '[]')
        video_settings['auto_reply_enabled'] = bool(video_settings['auto_reply_enabled'])
        video_settings['schedule_interval_minutes'] = video_settings.get('schedule_interval_minutes') or 60
        
        return video_settings


@router.put("/{video_id}/settings")
async def update_settings(
    video_id: str,
    video_settings: VideoSettings,
    authorization: str = Header(None)
):
    """Update video settings"""
    user = await get_current_user_from_header(authorization)
    
    # CRITICAL FIX: Ensure video exists in database before updating settings
    # If video doesn't exist, create a minimal entry so settings can be saved
    from db import get_pool
    async with get_pool().acquire() as conn:
        video_exists = await conn.fetchval(
            "SELECT 1 FROM videos WHERE video_id = $1 AND user_id = $2",
            video_id, user['id']
        )
        
        if not video_exists:
            # Create minimal video entry to allow settings save
            await conn.execute("""
                INSERT INTO videos (
                    user_id, video_id, title, published_at
                )
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (video_id) DO NOTHING
            """, user['id'], video_id, f"Video {video_id}")
    
    # Now update settings (video is guaranteed to exist)
    await update_video_settings(
        video_id,
        user['id'],
        video_settings.model_dump()
    )
    return {"success": True}

@router.post("/{video_id}/trigger-reply")
async def trigger_reply(video_id: str, authorization: str = Header(None)):
    """Manually trigger auto-reply - Runs in background"""
    user = await get_current_user_from_header(authorization)
    
    # Validate YouTube tokens are available
    if not user.get('access_token'):
        raise HTTPException(
            400, 
            "YouTube tokens not synced. Please reconnect your YouTube account."
        )
    
    from config import settings
    
    # Get video settings
    async with get_db_connection() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM videos WHERE video_id = $1 AND user_id = $2",
            video_id, user['id']
        )
        if not row:
            raise HTTPException(404, "Video not found")
        video = dict(row)
        # Parse JSON fields
        video['keywords'] = json.loads(video.get('keywords', '[]') or '[]')
        video['reply_templates'] = json.loads(video.get('reply_templates', '[]') or '[]')
    
    # Validate settings
    if not video.get('keywords'):
        return {
            "error": "No keywords configured",
            "total_comments": 0,
            "qualified": 0,
            "non_replied": 0,
            "replied": 0,
            "failed": 0
        }
    
    if not video.get('reply_templates'):
        return {
            "error": "No reply templates configured",
            "total_comments": 0,
            "qualified": 0,
            "non_replied": 0,
            "replied": 0,
            "failed": 0
        }
    
    # Use Celery if Redis is available
    if settings.USE_REDIS:
        from tasks import process_video_replies
        
        # Submit background job
        task = process_video_replies.delay(
            video_id,
            user['id'],
            video['keywords'],
            video['reply_templates'],
            max_comments=1000  # Process up to 1000 comments
        )
        
        return {
            "status": "processing",
            "task_id": task.id,
            "message": "Reply processing started in background. Connect to WebSocket for live updates.",
            "websocket_url": f"/ws/{user['id']}"
        }
    else:
        # Fallback: Process synchronously (local development)
        from services.reply_engine import ReplyEngine
        from services.quota_manager import QuotaManager
        from database_pg import update_user_tokens
        
        youtube = AsyncYouTubeClient(
            user['access_token'], 
            user['refresh_token'],
            user_id=user['id'],
            on_token_refresh=update_user_tokens
        )
        quota_mgr = QuotaManager()
        engine = ReplyEngine(youtube, quota_mgr)
        
        # Check quota
        remaining = await quota_mgr.get_remaining_quota()
        if remaining < 100:
            raise HTTPException(503, "Insufficient quota")
        
        # Fetch comments
        comments = await youtube.get_video_comments(video_id)
        
        # Filter by keywords
        filtered = engine.filter_comments_by_keywords(
            comments,
            video['keywords']
        )
        
        # Filter non-replied
        to_reply = await engine.filter_non_replied(filtered)
        
        # Reply (limit to 20 for manual trigger in sync mode)
        results = await engine.reply_to_comments_batch(
            to_reply[:20],
            video_id,
            user['id'],
            video['reply_templates']
        )
        
        succeeded = sum(1 for r in results if r.get('success'))
        failed = sum(1 for r in results if not r.get('success'))
        
        return {
            "total_comments": len(comments),
            "qualified": len(filtered),
            "non_replied": len(to_reply),
            "replied": succeeded,
            "failed": failed
        }


# New endpoint: Check task status
@router.get("/tasks/{task_id}/status")
async def get_task_status(task_id: str, authorization: str = Header(None)):
    """Check status of background task"""
    user = await get_current_user_from_header(authorization)
    
    from config import settings
    if not settings.USE_REDIS:
        raise HTTPException(400, "Background tasks not available in local mode")
    
    from celery.result import AsyncResult
    
    task = AsyncResult(task_id)
    
    if task.ready():
        result = task.get()
        return {
            "status": "completed",
            "task_id": task_id,
            "result": result
        }
    elif task.failed():
        return {
            "status": "failed",
            "task_id": task_id,
            "error": str(task.info)
        }
    else:
        return {
            "status": "processing",
            "task_id": task_id,
            "progress": task.info if task.state == 'PROGRESS' else None
        }
