"""
Database Layer - PostgreSQL Only

Uses PostgreSQL with connection pooling via asyncpg.
Requires Docker PostgreSQL container or Heroku Postgres.
"""
from database_pg import (
    init_db,
    close_db,
    get_db_connection,
    pool,
    get_pool,
    get_user_by_id,
    get_user_by_google_id,
    update_user_tokens,
    create_or_update_user,
    get_user_videos,
    get_auto_reply_videos,
    update_last_checked,
    update_video_settings,
    upsert_video,
    upsert_videos_batch,
    has_replied_to_comment,
    has_replied_batch,
    mark_comment_replied,
    mark_comments_replied_batch,
    get_reply_stats,
    get_recent_replies,
    get_chart_data,
    get_user_templates,
    create_user_template,
    delete_user_template,
)

# Re-export all functions
__all__ = [
    'init_db',
    'close_db',
    'get_db_connection',
    'pool',
    'get_pool',
    'get_user_by_id',
    'get_user_by_google_id',
    'update_user_tokens',
    'create_or_update_user',
    'get_user_videos',
    'get_auto_reply_videos',
    'update_last_checked',
    'update_video_settings',
    'upsert_video',
    'upsert_videos_batch',
    'has_replied_to_comment',
    'has_replied_batch',
    'mark_comment_replied',
    'mark_comments_replied_batch',
    'get_reply_stats',
    'get_recent_replies',
    'get_chart_data',
    'get_user_templates',
    'create_user_template',
    'delete_user_template',
]
