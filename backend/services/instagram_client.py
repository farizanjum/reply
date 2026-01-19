"""
Instagram Graph API Client

Async client for Instagram Graph API operations:
- Fetch user profile
- List media (posts, reels)
- Get comments
- Reply to comments
- Send DMs

Rate limits:
- 200 API calls per hour per user
- Use with delays between requests
"""

import httpx
from typing import List, Dict, Optional, Callable
from datetime import datetime, timedelta
import asyncio
import random

from config import settings


class InstagramAPIError(Exception):
    """Instagram API error with status code and message"""
    def __init__(self, status_code: int, message: str, error_code: int = None):
        self.status_code = status_code
        self.message = message
        self.error_code = error_code
        super().__init__(f"Instagram API Error ({status_code}): {message}")


class AsyncInstagramClient:
    """
    Async client for Instagram Graph API.
    
    Usage:
        client = AsyncInstagramClient(access_token, account_id)
        media = await client.get_media_list()
        comments = await client.get_comments(media[0]['id'])
        await client.reply_to_comment(comments[0]['id'], "Thanks!")
    """
    
    BASE_URL = "https://graph.facebook.com"
    
    # Rate limiting settings
    MIN_DELAY = 0.5  # Minimum seconds between requests
    MAX_DELAY = 1.5  # Maximum seconds between requests
    
    def __init__(
        self,
        access_token: str,
        instagram_user_id: str,
        api_version: str = None,
        on_token_refresh: Callable = None,
    ):
        self.access_token = access_token
        self.instagram_user_id = instagram_user_id
        self.api_version = api_version or settings.META_GRAPH_API_VERSION
        self.on_token_refresh = on_token_refresh
        self._session: Optional[httpx.AsyncClient] = None
        self._last_request_time = 0
    
    async def _get_session(self) -> httpx.AsyncClient:
        """Get or create HTTP session"""
        if self._session is None or self._session.is_closed:
            self._session = httpx.AsyncClient(timeout=30.0)
        return self._session
    
    async def close(self):
        """Close the HTTP session"""
        if self._session and not self._session.is_closed:
            await self._session.aclose()
    
    async def _rate_limit_delay(self):
        """Apply rate limiting delay between requests"""
        now = asyncio.get_event_loop().time()
        elapsed = now - self._last_request_time
        
        # Add random delay for human-like behavior
        min_wait = self.MIN_DELAY
        if elapsed < min_wait:
            delay = min_wait - elapsed + random.uniform(0, self.MAX_DELAY - self.MIN_DELAY)
            await asyncio.sleep(delay)
        
        self._last_request_time = asyncio.get_event_loop().time()
    
    def _build_url(self, endpoint: str) -> str:
        """Build full API URL"""
        return f"{self.BASE_URL}/{self.api_version}/{endpoint}"
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Dict = None,
        data: Dict = None,
    ) -> Dict:
        """Make an authenticated request to Instagram Graph API"""
        await self._rate_limit_delay()
        
        session = await self._get_session()
        url = self._build_url(endpoint)
        
        # Add access token to params
        if params is None:
            params = {}
        params["access_token"] = self.access_token
        
        try:
            if method == "GET":
                response = await session.get(url, params=params)
            elif method == "POST":
                response = await session.post(url, params=params, data=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response_data = response.json()
            
            # Handle errors
            if response.status_code >= 400:
                error = response_data.get("error", {})
                error_code = error.get("code")
                error_msg = error.get("message", "Unknown error")
                
                # Check for token expiration
                if error_code == 190:  # OAuthException
                    raise InstagramAPIError(
                        status_code=401,
                        message="Access token expired",
                        error_code=error_code
                    )
                
                raise InstagramAPIError(
                    status_code=response.status_code,
                    message=error_msg,
                    error_code=error_code
                )
            
            return response_data
            
        except httpx.HTTPError as e:
            raise InstagramAPIError(
                status_code=500,
                message=f"HTTP error: {str(e)}"
            )
    
    async def _get(self, endpoint: str, params: Dict = None) -> Dict:
        """Make a GET request"""
        return await self._request("GET", endpoint, params=params)
    
    async def _post(self, endpoint: str, params: Dict = None, data: Dict = None) -> Dict:
        """Make a POST request"""
        return await self._request("POST", endpoint, params=params, data=data)
    
    # =====================================================
    # USER & ACCOUNT METHODS
    # =====================================================
    
    async def get_user_profile(self) -> Dict:
        """Get Instagram Business account profile"""
        fields = "id,username,name,profile_picture_url,followers_count,follows_count,media_count"
        return await self._get(self.instagram_user_id, params={"fields": fields})
    
    # =====================================================
    # MEDIA METHODS
    # =====================================================
    
    async def get_media_list(self, limit: int = 50) -> List[Dict]:
        """
        Get list of Instagram media (posts, reels).
        
        Returns list of media with id, type, caption, permalink, thumbnail, timestamp.
        """
        fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count"
        
        response = await self._get(
            f"{self.instagram_user_id}/media",
            params={"fields": fields, "limit": limit}
        )
        
        return response.get("data", [])
    
    async def get_all_media(self, max_items: int = 200) -> List[Dict]:
        """
        Get all media with pagination.
        
        Follows cursor pagination to get more than 50 items.
        """
        all_media = []
        fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count"
        
        response = await self._get(
            f"{self.instagram_user_id}/media",
            params={"fields": fields, "limit": 50}
        )
        
        all_media.extend(response.get("data", []))
        
        # Follow pagination
        while len(all_media) < max_items:
            paging = response.get("paging", {})
            next_url = paging.get("next")
            
            if not next_url:
                break
            
            # Extract the cursor and make another request
            cursors = paging.get("cursors", {})
            after = cursors.get("after")
            
            if not after:
                break
            
            response = await self._get(
                f"{self.instagram_user_id}/media",
                params={"fields": fields, "limit": 50, "after": after}
            )
            
            data = response.get("data", [])
            if not data:
                break
            
            all_media.extend(data)
        
        return all_media[:max_items]
    
    async def get_media_details(self, media_id: str) -> Dict:
        """Get detailed info for a single media item"""
        fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count"
        return await self._get(media_id, params={"fields": fields})
    
    # =====================================================
    # COMMENT METHODS
    # =====================================================
    
    async def get_comments(self, media_id: str, limit: int = 50) -> List[Dict]:
        """
        Get comments on a media item.
        
        Returns list of comments with id, text, username, timestamp.
        """
        fields = "id,text,username,timestamp,from{id,username}"
        
        response = await self._get(
            f"{media_id}/comments",
            params={"fields": fields, "limit": limit}
        )
        
        return response.get("data", [])
    
    async def get_all_comments(self, media_id: str, max_comments: int = 200) -> List[Dict]:
        """Get all comments with pagination"""
        all_comments = []
        fields = "id,text,username,timestamp,from{id,username}"
        
        response = await self._get(
            f"{media_id}/comments",
            params={"fields": fields, "limit": 50}
        )
        
        all_comments.extend(response.get("data", []))
        
        # Follow pagination
        while len(all_comments) < max_comments:
            paging = response.get("paging", {})
            cursors = paging.get("cursors", {})
            after = cursors.get("after")
            
            if not after:
                break
            
            response = await self._get(
                f"{media_id}/comments",
                params={"fields": fields, "limit": 50, "after": after}
            )
            
            data = response.get("data", [])
            if not data:
                break
            
            all_comments.extend(data)
        
        return all_comments[:max_comments]
    
    async def reply_to_comment(self, comment_id: str, message: str) -> Dict:
        """
        Reply to a comment.
        
        Returns the created reply comment.
        """
        return await self._post(
            f"{comment_id}/replies",
            data={"message": message}
        )
    
    # =====================================================
    # DIRECT MESSAGE METHODS
    # =====================================================
    
    async def send_dm(self, recipient_id: str, message: str) -> Dict:
        """
        Send a direct message to a user.
        
        Note: Can only DM users who have interacted with your account
        in the last 24 hours (commented, messaged, etc.)
        
        Args:
            recipient_id: Instagram user ID (IGSID) of the recipient
            message: Message text to send
        
        Returns:
            Message send confirmation
        """
        # Instagram uses the Facebook Messenger API for DMs
        # Need to use the Page access token, not the user token
        return await self._post(
            "me/messages",
            data={
                "recipient": {"id": recipient_id},
                "message": {"text": message},
                "messaging_type": "RESPONSE"
            }
        )
    
    async def can_send_dm(self, user_id: str) -> bool:
        """
        Check if we can send a DM to this user.
        
        Instagram only allows DMs to users who have interacted
        within the last 24 hours.
        
        For now, we assume commenters are within the window.
        """
        # Since the user just commented, they're within the 24h window
        # A more robust check would require storing interaction timestamps
        return True


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def parse_media_timestamp(timestamp_str: str) -> Optional[datetime]:
    """Parse Instagram timestamp to datetime"""
    try:
        # Instagram uses ISO 8601 format
        return datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def format_dm_template(template: str, resource_link: str) -> str:
    """
    Format DM template with resource link.
    
    Replaces {link} placeholder with actual link.
    """
    return template.replace("{link}", resource_link)


def match_keywords(comment_text: str, keywords: List[str]) -> Optional[str]:
    """
    Check if comment text contains any of the keywords.
    
    Returns the matched keyword or None.
    Case-insensitive matching.
    """
    if not comment_text or not keywords:
        return None
    
    comment_lower = comment_text.lower()
    
    for keyword in keywords:
        if keyword.lower() in comment_lower:
            return keyword
    
    return None


def select_random_template(templates: List[str]) -> str:
    """Select a random reply template"""
    if not templates:
        return "Thanks for your comment! 🙏"
    return random.choice(templates)
