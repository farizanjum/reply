import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Callable, Awaitable

from config import settings


class AsyncYouTubeClient:
    """Async YouTube API client with automatic token refresh"""
    
    def __init__(
        self, 
        access_token: str, 
        refresh_token: Optional[str] = None,
        user_id: Optional[int] = None,
        on_token_refresh: Optional[Callable[[int, str, datetime], Awaitable[None]]] = None
    ):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.user_id = user_id
        self.on_token_refresh = on_token_refresh
        self.base_url = "https://www.googleapis.com/youtube/v3"
    
    async def _refresh_access_token(self) -> Dict:
        """Use refresh_token to get a new access_token from Google"""
        if not self.refresh_token:
            raise Exception("No refresh token available - user needs to re-authenticate")
        
        async with aiohttp.ClientSession() as session:
            payload = {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": self.refresh_token,
                "grant_type": "refresh_token"
            }
            
            async with session.post("https://oauth2.googleapis.com/token", data=payload) as resp:
                if resp.status != 200:
                    error_data = await resp.json()
                    error_desc = error_data.get('error_description', error_data.get('error', 'Unknown error'))
                    # If refresh fails (e.g., user revoked access), raise a hard error
                    raise Exception(f"Token refresh failed: {error_desc}")
                
                data = await resp.json()
                self.access_token = data["access_token"]
                
                # Calculate new expiry time
                expires_in = data.get("expires_in", 3599)
                new_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
                
                print(f"✅ Token refreshed for user {self.user_id}, expires in {expires_in}s")
                
                return {
                    "access_token": self.access_token,
                    "token_expiry": new_expiry
                }
    
    async def _request_with_retry(
        self, 
        url: str, 
        params: Optional[Dict] = None, 
        method: str = "GET",
        json_body: Optional[Dict] = None
    ) -> Dict:
        """Make request, auto-refresh token if expired, retry"""
        if params is None:
            params = {}
        
        async with aiohttp.ClientSession() as session:
            # 1. Try with current token
            params["access_token"] = self.access_token
            
            kwargs = {"params": params}
            if json_body:
                kwargs["json"] = json_body
            
            async with session.request(method, url, **kwargs) as resp:
                if resp.status == 401:  # Token likely expired
                    print(f"⚠️ 401 encountered for user {self.user_id}. Attempting refresh...")
                    
                    try:
                        # 2. Refresh token
                        new_token_data = await self._refresh_access_token()
                        
                        # 3. Callback to update DB
                        if self.on_token_refresh and self.user_id:
                            await self.on_token_refresh(
                                self.user_id, 
                                new_token_data["access_token"], 
                                new_token_data["token_expiry"]
                            )
                        
                        # 4. Retry with new token
                        params["access_token"] = self.access_token
                        async with session.request(method, url, **kwargs) as retry_resp:
                            if retry_resp.status != 200:
                                error_text = await retry_resp.text()
                                return {"error": error_text, "status": retry_resp.status}
                            return await retry_resp.json()
                            
                    except Exception as e:
                        print(f"❌ Refresh failed for user {self.user_id}: {e}")
                        # Return the original 401 response if refresh fails
                        return await resp.json()
                
                # Return normal response
                if resp.status != 200:
                    error_text = await resp.text()
                    return {"error": error_text, "status": resp.status}
                
                return await resp.json()
    
    async def get_channel_info(self) -> Optional[Dict]:
        """Get the authenticated user's YouTube channel info"""
        url = f"{self.base_url}/channels"
        params = {
            "part": "snippet,contentDetails,statistics",
            "mine": "true"
        }
        
        data = await self._request_with_retry(url, params)
        
        if "error" in data or not data.get('items'):
            print(f"Failed to fetch channel info: {data}")
            return None
        
        channel = data['items'][0]
        return {
            'channel_id': channel['id'],
            'channel_name': channel['snippet']['title'],
            'channel_thumbnail': channel['snippet']['thumbnails'].get('default', {}).get('url'),
            'subscriber_count': channel['statistics'].get('subscriberCount'),
            'video_count': channel['statistics'].get('videoCount')
        }
    
    async def get_channel_videos(self, channel_id: str, max_results: int = 50) -> List[Dict]:
        """Fetch all videos from a channel"""
        # Step 1: Get uploads playlist ID
        url = f"{self.base_url}/channels"
        params = {
            "part": "contentDetails,snippet,statistics",
            "id": channel_id
        }
        
        data = await self._request_with_retry(url, params)
        
        if "error" in data or not data.get('items'):
            raise Exception(f"Failed to fetch channel: {data}")
        
        uploads_playlist = data['items'][0]['contentDetails']['relatedPlaylists']['uploads']
        
        # Step 2: Fetch videos from uploads playlist
        videos = []
        page_token = None
        
        while True:
            url = f"{self.base_url}/playlistItems"
            params = {
                "part": "snippet,contentDetails",
                "playlistId": uploads_playlist,
                "maxResults": min(max_results, 50)
            }
            if page_token:
                params["pageToken"] = page_token
            
            data = await self._request_with_retry(url, params)
            
            if "error" in data:
                break
            
            videos.extend(data.get('items', []))
            
            page_token = data.get('nextPageToken')
            if not page_token or len(videos) >= max_results:
                break
            
            await asyncio.sleep(0.2)  # Rate limiting
        
        # Step 3: Get video statistics
        video_ids = [v['contentDetails']['videoId'] for v in videos]
        video_stats = await self._get_video_stats(video_ids)
        
        # Combine data
        for video in videos:
            video_id = video['contentDetails']['videoId']
            if video_id in video_stats:
                video['statistics'] = video_stats[video_id]
        
        return videos
    
    async def _get_video_stats(self, video_ids: List[str]) -> Dict:
        """Get statistics for multiple videos"""
        stats = {}
        
        # YouTube API allows max 50 IDs per request
        for i in range(0, len(video_ids), 50):
            batch = video_ids[i:i+50]
            url = f"{self.base_url}/videos"
            params = {
                "part": "statistics",
                "id": ",".join(batch)
            }
            
            data = await self._request_with_retry(url, params)
            
            if "error" not in data:
                for item in data.get('items', []):
                    stats[item['id']] = item['statistics']
            
            await asyncio.sleep(0.2)
        
        return stats
    
    async def get_video_comments(
        self, 
        video_id: str, 
        max_results: int = 100
    ) -> List[Dict]:
        """Fetch all comments for a video"""
        comments = []
        page_token = None
        
        while True:
            url = f"{self.base_url}/commentThreads"
            params = {
                "part": "snippet,replies",
                "videoId": video_id,
                "maxResults": min(max_results, 100),
                "textFormat": "plainText",
                "order": "time"  # Get newest first
            }
            if page_token:
                params["pageToken"] = page_token
            
            data = await self._request_with_retry(url, params)
            
            if "error" in data:
                print(f"Error fetching comments: {data}")
                break
            
            comments.extend(data.get('items', []))
            
            page_token = data.get('nextPageToken')
            if not page_token or len(comments) >= max_results:
                break
            
            await asyncio.sleep(0.2)
        
        return comments
    
    async def post_comment_reply(self, parent_id: str, text: str) -> Dict:
        """Post a reply to a comment"""
        url = f"{self.base_url}/comments"
        params = {"part": "snippet"}
        json_body = {
            "snippet": {
                "parentId": parent_id,
                "textOriginal": text
            }
        }
        
        data = await self._request_with_retry(url, params, method="POST", json_body=json_body)
        
        if "error" in data:
            raise Exception(f"Failed to post reply: {data}")
        
        return data
