import asyncio
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import init_db, close_db, get_auto_reply_videos
from services.youtube_client import AsyncYouTubeClient
from services.reply_engine import ReplyEngine
from services.quota_manager import QuotaManager
from utils.human_delays import HumanDelayGenerator
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def process_all_videos():
    """Main auto-reply job - called by Heroku Scheduler"""
    
    logger.info("🚀 Starting auto-reply job...")
    
    # Initialize database
    await init_db()
    
    try:
        # Get all videos with auto-reply enabled
        videos = await get_auto_reply_videos()
        logger.info(f"Found {len(videos)} videos with auto-reply enabled")
        
        if not videos:
            logger.info("No videos to process")
            return
        
        # Process each video
        total_replied = 0
        for video in videos:
            try:
                replied = await process_single_video(video)
                total_replied += replied
            except Exception as e:
                logger.error(f"Error processing video {video['video_id']}: {e}")
                continue
        
        logger.info(f"✅ Job complete. Total replies: {total_replied}")
    
    finally:
        await close_db()

async def process_single_video(video: dict) -> int:
    """Process auto-reply for a single video"""
    
    logger.info(f"Processing: {video['title']}")
    
    # Initialize services
    youtube = AsyncYouTubeClient(video['access_token'], video['refresh_token'])
    quota_mgr = QuotaManager()
    engine = ReplyEngine(youtube, quota_mgr)
    
    # Check quota
    remaining = await quota_mgr.get_remaining_quota()
    logger.info(f"Remaining quota: {remaining} units")
    
    if remaining < 1000:
        logger.warning("Low quota, skipping")
        return 0
    
    # Fetch comments
    comments = await youtube.get_video_comments(video['video_id'])
    logger.info(f"Fetched {len(comments)} comments")
    
    if not comments:
        return 0
    
    # Filter by keywords
    filtered = engine.filter_comments_by_keywords(
        comments,
        video['keywords']
    )
    logger.info(f"Found {len(filtered)} comments matching keywords")
    
    if not filtered:
        return 0
    
    # Filter non-replied
    to_reply = await engine.filter_non_replied(filtered)
    logger.info(f"{len(to_reply)} comments need replies")
    
    if not to_reply:
        return 0
    
    # Batch processing with delays
    batch_size = HumanDelayGenerator.get_batch_size()
    total_replied = 0
    
    for i in range(0, len(to_reply), batch_size):
        batch = to_reply[i:i + batch_size]
        
        # Check quota before batch
        if not await quota_mgr.can_make_request(len(batch) * 50):
            logger.warning("Quota exhausted mid-processing")
            break
        
        # Reply to batch
        results = await engine.reply_to_comments_batch(
            batch,
            video['video_id'],
            video['user_id'],
            video['reply_templates']
        )
        
        replied_count = sum(1 for r in results if r['success'])
        total_replied += replied_count
        logger.info(f"Replied to {replied_count}/{len(batch)} in batch")
        
        # Delay between batches
        if i + batch_size < len(to_reply):
            logger.info("Waiting before next batch...")
            await HumanDelayGenerator.between_batches(batch_size)
    
    logger.info(f"✅ Processed {video['title']}: {total_replied} replies")
    return total_replied

if __name__ == "__main__":
    asyncio.run(process_all_videos())
