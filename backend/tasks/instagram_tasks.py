"""
Instagram Celery Background Tasks

Tasks for:
- Processing Instagram comments
- Syncing media from Instagram
- Sending DMs and replies
- Refreshing tokens
"""

import sys
import os
import asyncio
import random
import json

# Ensure the backend directory is in Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from worker import celery_app, run_async
from celery import Task
from typing import List, Dict
from datetime import datetime, timedelta


class InstagramTask(Task):
    """Base task for Instagram operations"""
    _initialized = False
    
    def __call__(self, *args, **kwargs):
        if not InstagramTask._initialized:
            run_async(self._init())
            InstagramTask._initialized = True
        return self.run(*args, **kwargs)
    
    async def _init(self):
        """Initialize connections for worker"""
        from dotenv import load_dotenv
        load_dotenv()
        print("✓ Instagram Celery tasks ready")


@celery_app.task(base=InstagramTask, bind=True, max_retries=3, default_retry_delay=60)
def process_instagram_media_comments(self, media_db_id: int) -> Dict:
    """
    Process comments for a single Instagram media item.
    
    Workflow:
    1. Fetch media settings from database
    2. Get comments from Instagram API
    3. Filter already-processed comments
    4. Match keywords
    5. For matching comments:
       a. Send DM with resource link (if enabled)
       b. Post reply comment
       c. Record in database
    
    Args:
        media_db_id: Database ID of the instagram_media row
    
    Returns:
        Processing stats
    """
    async def _process():
        from database_pg import (
            get_direct_connection,
            add_instagram_replied_comment,
            has_replied_to_instagram_comment,
            update_instagram_media_last_processed,
        )
        from services.instagram_client import (
            AsyncInstagramClient,
            InstagramAPIError,
            match_keywords,
            format_dm_template,
            select_random_template,
        )
        
        stats = {
            "media_id": media_db_id,
            "total_comments": 0,
            "keyword_matches": 0,
            "dms_sent": 0,
            "replies_sent": 0,
            "errors": 0,
        }
        
        try:
            # Get media with account info from database
            async with get_direct_connection() as conn:
                media = await conn.fetchrow("""
                    SELECT m.*, a.access_token, a.instagram_user_id, a.user_id
                    FROM instagram_media m
                    JOIN instagram_accounts a ON m.instagram_account_id = a.id
                    WHERE m.id = $1 AND a.is_active = TRUE
                """, media_db_id)
            
            if not media:
                return {"error": "Media not found or account inactive", **stats}
            
            # Parse settings
            keywords = json.loads(media['keywords']) if isinstance(media['keywords'], str) else (media['keywords'] or [])
            reply_templates = json.loads(media['reply_templates']) if isinstance(media['reply_templates'], str) else (media['reply_templates'] or [])
            dm_enabled = media.get('dm_enabled', False)
            dm_template = media.get('dm_template', '')
            resource_link = media.get('resource_link', '')
            
            if not keywords:
                print(f"No keywords configured for media {media_db_id}")
                return {"error": "No keywords configured", **stats}
            
            if not reply_templates:
                reply_templates = ["Thanks for your comment! 🙏"]
            
            # Initialize Instagram client
            client = AsyncInstagramClient(
                access_token=media['access_token'],
                instagram_user_id=media['instagram_user_id'],
            )
            
            try:
                # Fetch comments from Instagram
                comments = await client.get_comments(media['media_id'], limit=100)
                stats["total_comments"] = len(comments)
                print(f"📥 Fetched {len(comments)} comments for media {media['media_id']}")
                
                for comment in comments:
                    comment_id = comment.get('id')
                    comment_text = comment.get('text', '')
                    
                    # Get commenter info
                    from_user = comment.get('from', {})
                    commenter_id = from_user.get('id', '')
                    commenter_username = from_user.get('username', comment.get('username', ''))
                    
                    # Skip if already processed
                    if await has_replied_to_instagram_comment(comment_id, use_direct=True):
                        continue
                    
                    # Check keyword match
                    matched_keyword = match_keywords(comment_text, keywords)
                    
                    if matched_keyword:
                        stats["keyword_matches"] += 1
                        print(f"🎯 Keyword match: '{matched_keyword}' in comment from @{commenter_username}")
                        
                        dm_sent = False
                        dm_text_sent = None
                        reply_sent = False
                        reply_text = None
                        error_message = None
                        
                        # Send DM if enabled
                        if dm_enabled and dm_template and resource_link and commenter_id:
                            try:
                                dm_text_sent = format_dm_template(dm_template, resource_link)
                                await client.send_dm(commenter_id, dm_text_sent)
                                dm_sent = True
                                stats["dms_sent"] += 1
                                print(f"📨 DM sent to @{commenter_username}")
                                
                                # Delay after DM
                                await asyncio.sleep(random.uniform(1.5, 3.0))
                                
                            except InstagramAPIError as e:
                                error_message = f"DM failed: {e.message}"
                                print(f"❌ DM failed to @{commenter_username}: {e.message}")
                        
                        # Post reply comment
                        try:
                            reply_text = select_random_template(reply_templates)
                            await client.reply_to_comment(comment_id, reply_text)
                            reply_sent = True
                            stats["replies_sent"] += 1
                            print(f"💬 Reply sent to @{commenter_username}")
                            
                            # Delay after reply
                            await asyncio.sleep(random.uniform(2.0, 4.0))
                            
                        except InstagramAPIError as e:
                            if error_message:
                                error_message += f"; Reply failed: {e.message}"
                            else:
                                error_message = f"Reply failed: {e.message}"
                            stats["errors"] += 1
                            print(f"❌ Reply failed to @{commenter_username}: {e.message}")
                        
                        # Record in database
                        await add_instagram_replied_comment(
                            media_id=media_db_id,
                            comment_id=comment_id,
                            commenter_username=commenter_username,
                            commenter_id=commenter_id,
                            comment_text=comment_text,
                            matched_keyword=matched_keyword,
                            dm_sent=dm_sent,
                            dm_text=dm_text_sent,
                            reply_sent=reply_sent,
                            reply_text=reply_text,
                            error_message=error_message,
                            use_direct=True,
                        )
                    
                    else:
                        # No keyword match - still record to prevent reprocessing
                        await add_instagram_replied_comment(
                            media_id=media_db_id,
                            comment_id=comment_id,
                            commenter_username=commenter_username,
                            commenter_id=commenter_id,
                            comment_text=comment_text,
                            matched_keyword=None,
                            dm_sent=False,
                            reply_sent=False,
                            use_direct=True,
                        )
                
                # Update last processed timestamp
                await update_instagram_media_last_processed(media_db_id, use_direct=True)
                
            finally:
                await client.close()
            
            print(f"✅ Processed media {media_db_id}: {stats['replies_sent']} replies, {stats['dms_sent']} DMs")
            return stats
            
        except Exception as e:
            print(f"❌ Error processing Instagram media {media_db_id}: {e}")
            raise self.retry(exc=e)
    
    return run_async(_process())


@celery_app.task(base=InstagramTask, bind=True)
def sync_instagram_media(self, account_id: int) -> Dict:
    """
    Sync media from Instagram to database.
    
    Fetches latest media and upserts into instagram_media table.
    """
    async def _sync():
        from database_pg import (
            get_direct_connection,
            upsert_instagram_media,
        )
        from services.instagram_client import AsyncInstagramClient, parse_media_timestamp
        
        try:
            # Get account info
            async with get_direct_connection() as conn:
                account = await conn.fetchrow("""
                    SELECT * FROM instagram_accounts 
                    WHERE id = $1 AND is_active = TRUE
                """, account_id)
            
            if not account:
                return {"error": "Account not found or inactive"}
            
            # Initialize client
            client = AsyncInstagramClient(
                access_token=account['access_token'],
                instagram_user_id=account['instagram_user_id'],
            )
            
            try:
                # Fetch media
                media_list = await client.get_all_media(max_items=100)
                
                synced = 0
                for media in media_list:
                    timestamp = parse_media_timestamp(media.get('timestamp'))
                    
                    await upsert_instagram_media(
                        instagram_account_id=account_id,
                        media_id=media.get('id'),
                        media_type=media.get('media_type'),
                        caption=media.get('caption', '')[:500] if media.get('caption') else '',
                        permalink=media.get('permalink', ''),
                        thumbnail_url=media.get('thumbnail_url') or media.get('media_url', ''),
                        media_timestamp=timestamp,
                        use_direct=True,
                    )
                    synced += 1
                
                print(f"✅ Synced {synced} media items for account {account_id}")
                return {"synced": synced, "total": len(media_list)}
                
            finally:
                await client.close()
                
        except Exception as e:
            print(f"❌ Error syncing Instagram media: {e}")
            return {"error": str(e)}
    
    return run_async(_sync())


@celery_app.task(base=InstagramTask)
def process_all_instagram_accounts() -> Dict:
    """
    Main scheduled task - process all accounts with enabled media.
    
    Runs via Celery Beat every 5 minutes.
    """
    async def _process_all():
        from database_pg import get_enabled_instagram_media
        
        print("🤖 Starting Instagram auto-reply job...")
        
        # Get all media due for processing
        media_list = await get_enabled_instagram_media(use_direct=True)
        print(f"Found {len(media_list)} Instagram media items due for processing")
        
        if not media_list:
            return {"message": "No media due", "processed": 0}
        
        processed = 0
        errors = []
        
        for media in media_list:
            try:
                # Process each media in sequence (not parallel to respect rate limits)
                result = process_instagram_media_comments.delay(media['id'])
                processed += 1
                
                # Brief pause between queuing tasks
                await asyncio.sleep(1)
                
            except Exception as e:
                error_msg = f"Error queuing media {media.get('id')}: {e}"
                print(f"❌ {error_msg}")
                errors.append(error_msg)
        
        print(f"🎉 Instagram job complete. Queued {processed} media items for processing")
        
        return {
            "processed": processed,
            "total_due": len(media_list),
            "errors": errors[:5]
        }
    
    return run_async(_process_all())


@celery_app.task(base=InstagramTask)
def refresh_expiring_instagram_tokens() -> Dict:
    """
    Refresh Instagram tokens that are about to expire.
    
    Long-lived tokens last 60 days. Refresh tokens older than 50 days.
    Runs daily via Celery Beat.
    """
    async def _refresh():
        from database_pg import get_direct_connection, update_instagram_token
        import httpx
        from config import settings
        
        print("🔄 Checking for expiring Instagram tokens...")
        
        # Get tokens expiring in next 10 days
        cutoff = datetime.utcnow() + timedelta(days=10)
        
        async with get_direct_connection() as conn:
            accounts = await conn.fetch("""
                SELECT id, access_token, token_expiry, instagram_username
                FROM instagram_accounts
                WHERE is_active = TRUE
                AND token_expiry IS NOT NULL
                AND token_expiry < $1
            """, cutoff)
        
        if not accounts:
            print("No tokens need refreshing")
            return {"refreshed": 0}
        
        refreshed = 0
        errors = []
        
        async with httpx.AsyncClient() as client:
            for account in accounts:
                try:
                    # Refresh token
                    url = f"https://graph.facebook.com/{settings.META_GRAPH_API_VERSION}/oauth/access_token"
                    response = await client.get(url, params={
                        "grant_type": "fb_exchange_token",
                        "client_id": settings.META_APP_ID,
                        "client_secret": settings.META_APP_SECRET,
                        "fb_exchange_token": account['access_token'],
                    })
                    
                    if response.status_code == 200:
                        data = response.json()
                        new_token = data.get("access_token")
                        expires_in = data.get("expires_in", 5184000)
                        new_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
                        
                        await update_instagram_token(
                            instagram_account_id=account['id'],
                            access_token=new_token,
                            token_expiry=new_expiry,
                            use_direct=True,
                        )
                        
                        refreshed += 1
                        print(f"✅ Refreshed token for @{account['instagram_username']}")
                    else:
                        errors.append(f"Failed for @{account['instagram_username']}: {response.text}")
                        
                except Exception as e:
                    errors.append(f"Error for account {account['id']}: {e}")
        
        print(f"🔄 Token refresh complete. Refreshed {refreshed}/{len(accounts)} tokens")
        
        return {
            "refreshed": refreshed,
            "total": len(accounts),
            "errors": errors[:5]
        }
    
    return run_async(_refresh())


# Note: Add these to the main tasks.py Celery Beat schedule:
# 
# 'instagram-auto-reply': {
#     'task': 'tasks.instagram_tasks.process_all_instagram_accounts',
#     'schedule': 300.0,  # Every 5 minutes
#     'options': {'queue': 'celery'}
# },
# 'instagram-token-refresh': {
#     'task': 'tasks.instagram_tasks.refresh_expiring_instagram_tokens',
#     'schedule': 86400.0,  # Every day
#     'options': {'queue': 'celery'}
# },
