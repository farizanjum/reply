import asyncio
import random
from typing import List, Dict, TYPE_CHECKING
from db import has_replied_batch, mark_comment_replied
from config import settings
from utils.human_delays import HumanDelayGenerator
from utils.text_variation import TextVariation

# Import QuotaManager for type hints
if TYPE_CHECKING:
    from services.quota_manager import QuotaManager
else:
    # Runtime import to avoid circular import
    try:
        from services.quota_manager import QuotaManager
    except ImportError:
        QuotaManager = None  # Will be passed as instance anyway

class ReplyEngine:
    """Core auto-reply logic"""
    
    def __init__(self, youtube_client, quota_manager: QuotaManager):
        self.youtube = youtube_client
        self.quota_manager = quota_manager
        self.delay_gen = HumanDelayGenerator()
        self.text_var = TextVariation()
    
    def filter_comments_by_keywords(
        self, 
        comments: List[Dict], 
        keywords: List[str]
    ) -> List[Dict]:
        """Filter comments that match keywords"""
        if not keywords:
            return []
        
        filtered = []
        
        for comment in comments:
            try:
                # Get comment text and normalize for case‑insensitive matching
                text = comment['snippet']['topLevelComment']['snippet']['textDisplay']
                text_normalized = text.casefold()

                # Check if any keyword matches (case‑insensitive)
                for keyword in keywords:
                    if keyword.casefold() in text_normalized:
                        comment['matched_keyword'] = keyword
                        filtered.append(comment)
                        break  # Only match once per comment
            except (KeyError, AttributeError):
                continue
        
        return filtered
    
    async def filter_non_replied(self, comments: List[Dict]) -> List[Dict]:
        """Filter out already-replied comments (FAST)"""
        if not comments:
            return []
        
        # Extract comment IDs
        comment_ids = []
        for c in comments:
            try:
                comment_id = c['id']
                comment_ids.append(comment_id)
            except KeyError:
                continue
        
        # Batch check (2-5ms for 100 comments)
        replied_ids = await has_replied_batch(comment_ids)
        
        # Filter out replied comments
        return [c for c in comments if c['id'] not in replied_ids]
    
    def get_varied_reply(
        self, 
        templates: List[str], 
        variables: Dict
    ) -> str:
        """Generate a varied reply from templates"""
        if not templates:
            return "Thanks for your comment!"
        
        # Select random template
        template = random.choice(templates)
        
        # Apply text variation
        reply = self.text_var.generate_reply(template, variables)
        
        return reply
    
    async def reply_to_comments_batch(
        self,
        comments: List[Dict],
        video_id: str,
        user_id: int,
        reply_templates: List[str],
        max_concurrent: int = 5
    ) -> List[Dict]:
        """Reply to comments with controlled concurrency"""
        
        if not comments:
            return []
        
        semaphore = asyncio.Semaphore(max_concurrent)
        results = []
        
        async def reply_with_control(comment: Dict):
            """Reply to single comment with concurrency control"""
            async with semaphore:
                try:
                    comment_id = comment['id']
                    snippet = comment['snippet']['topLevelComment']['snippet']
                    
                    # Check quota
                    if not await self.quota_manager.can_make_request(50):
                        return {
                            "success": False,
                            "comment_id": comment_id,
                            "error": "Quota exhausted"
                        }
                    
                    # Human delay BEFORE posting
                    await self.delay_gen.before_reply()
                    
                    # Generate reply
                    reply_text = self.get_varied_reply(
                        reply_templates,
                        {
                            "name": snippet.get('authorDisplayName', 'there'),
                            "video_title": "this video"
                        }
                    )
                    
                    # Post reply
                    result = await self.youtube.post_comment_reply(comment_id, reply_text)
                    
                    # Track quota
                    await self.quota_manager.track_request(50)
                    
                    # Human delay AFTER posting
                    await self.delay_gen.after_reply()
                    
                    # Mark as replied in DB
                    await mark_comment_replied(
                        comment_id=comment_id,
                        video_id=video_id,
                        user_id=user_id,
                        comment_text=snippet.get('textDisplay', ''),
                        comment_author=snippet.get('authorDisplayName', ''),
                        keyword_matched=comment.get('matched_keyword', ''),
                        reply_text=reply_text
                    )
                    
                    return {
                        "success": True,
                        "comment_id": comment_id,
                        "reply_text": reply_text
                    }
                
                except Exception as e:
                    print(f"Error replying to {comment_id}: {e}")
                    return {
                        "success": False,
                        "comment_id": comment_id,
                        "error": str(e)
                    }
        
        # Process all comments with controlled concurrency
        tasks = [reply_with_control(c) for c in comments]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        return [r for r in results if isinstance(r, dict)]
