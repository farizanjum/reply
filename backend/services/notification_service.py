"""
Notification Service - Sends emails via frontend API
"""
import httpx
import os
from typing import Optional


async def send_error_notification(
    user_email: str,
    error_message: str,
    video_id: Optional[str] = None,
    video_title: Optional[str] = None,
    user_id: Optional[int] = None
):
    """Send error notification email to user"""
    from database_pg import get_notification_preferences
    
    # Check if user wants error notifications
    if user_id:
        try:
            prefs = await get_notification_preferences(int(user_id))
            if not prefs.get('notify_errors', True):
                return  # User disabled error notifications
        except Exception as e:
            print(f"Error checking notification preferences: {e}")
    
    try:
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        notification_secret = os.getenv('NOTIFICATION_SECRET', 'dev-notification-secret')
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{frontend_url}/api/notifications/send",
                json={
                    "type": "error_alert",
                    "email": user_email,
                    "errorMessage": error_message,
                    "videoId": video_id,
                    "videoTitle": video_title
                },
                headers={"x-notification-secret": notification_secret}
            )
            if response.status_code == 200:
                print(f"📧 Sent error notification to {user_email}")
            else:
                print(f"Failed to send error notification: {response.status_code}")
    except Exception as e:
        print(f"Failed to send error notification email: {e}")


async def send_quota_warning(
    user_email: str,
    usage_percent: int,
    quota_used: int,
    quota_limit: int,
    user_id: Optional[int] = None,
    reset_time: str = "at midnight PT"
):
    """Send quota warning email to user"""
    from database_pg import get_notification_preferences, update_last_quota_warning
    from datetime import datetime, timedelta
    
    # Check if user wants quota notifications
    if user_id:
        try:
            prefs = await get_notification_preferences(int(user_id))
            if not prefs.get('notify_quota_warnings', True):
                return  # User disabled quota warnings
            
            # Check if already warned today
            last_warning = prefs.get('last_quota_warning')
            if last_warning:
                try:
                    last_dt = datetime.fromisoformat(last_warning)
                    if datetime.utcnow() - last_dt < timedelta(hours=24):
                        return  # Already warned today
                except:
                    pass
            
            # Update last warning timestamp
            await update_last_quota_warning(int(user_id))
        except Exception as e:
            print(f"Error checking notification preferences: {e}")
    
    try:
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        notification_secret = os.getenv('NOTIFICATION_SECRET', 'dev-notification-secret')
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{frontend_url}/api/notifications/send",
                json={
                    "type": "quota_warning",
                    "email": user_email,
                    "usagePercent": usage_percent,
                    "quotaUsed": quota_used,
                    "quotaLimit": quota_limit,
                    "resetTime": reset_time
                },
                headers={"x-notification-secret": notification_secret}
            )
            if response.status_code == 200:
                print(f"📧 Sent quota warning to {user_email} ({usage_percent}% used)")
            else:
                print(f"Failed to send quota warning: {response.status_code}")
    except Exception as e:
        print(f"Failed to send quota warning email: {e}")
