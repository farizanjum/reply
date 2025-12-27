"""
Performance Testing Suite

Run all tests:
    pytest tests/test_performance.py -v

Run specific test:
    pytest tests/test_performance.py::test_database_connection_pool -v
"""
import pytest
import asyncio
import time
from typing import List


@pytest.mark.asyncio
async def test_database_connection_pool():
    """Test PostgreSQL connection pooling performance"""
    from config import settings
    
    if not settings.USE_POSTGRES:
        pytest.skip("PostgreSQL not configured")
    
    import database_pg as db
    
    # Initialize pool
    await db.init_db()
    
    # Test concurrent connections
    async def query_test():
        async with db.pool.acquire() as conn:
            result = await conn.fetchval("SELECT 1")
            return result
    
    start = time.time()
    
    # Run 100 concurrent queries
    tasks = [query_test() for _ in range(100)]
    results = await asyncio.gather(*tasks)
    
    duration = time.time() - start
    
    assert len(results) == 100
    assert all(r == 1 for r in results)
    print(f"\n✓ 100 concurrent queries completed in {duration:.3f}s")
    print(f"  Average: {(duration/100)*1000:.2f}ms per query")
    
    await db.close_db()


@pytest.mark.asyncio
async def test_redis_cache_performance():
    """Test Redis cache performance"""
    from config import settings
    
    if not settings.USE_REDIS:
        pytest.skip("Redis not configured")
    
    from services.cache import cache_manager
    
    await cache_manager.connect()
    
    # Test cache writes
    start = time.time()
    for i in range(1000):
        await cache_manager.redis.set(f"test_key_{i}", f"value_{i}")
    write_duration = time.time() - start
    
    # Test cache reads
    start = time.time()
    for i in range(1000):
        await cache_manager.redis.get(f"test_key_{i}")
    read_duration = time.time() - start
    
    print(f"\n✓ 1000 cache writes in {write_duration:.3f}s ({1000/write_duration:.0f} ops/sec)")
    print(f"✓ 1000 cache reads in {read_duration:.3f}s ({1000/read_duration:.0f} ops/sec)")
    
    # Cleanup
    for i in range(1000):
        await cache_manager.redis.delete(f"test_key_{i}")
    
    await cache_manager.close()


@pytest.mark.asyncio
async def test_batch_operations():
    """Test batch database operations vs individual operations"""
    from config import settings
    
    if not settings.USE_POSTGRES:
        pytest.skip("PostgreSQL not configured")
    
    import database_pg as db
    from datetime import datetime
    
    await db.init_db()
    
    # Prepare test data
    test_replies = [
        {
            'comment_id': f'batch_test_{i}',
            'video_id': 'test_video',
            'user_id': 1,
            'comment_text': f'Test comment {i}',
            'comment_author': 'Test User',
            'keyword_matched': 'test',
            'reply_text': f'Test reply {i}'
        }
        for i in range(100)
    ]
    
    # Test batch insert
    start = time.time()
    count = await db.mark_comments_replied_batch(test_replies)
    batch_duration = time.time() - start
    
    print(f"\n✓ Batch insert of {count} records in {batch_duration:.3f}s")
    print(f"  Average: {(batch_duration/count)*1000:.2f}ms per record")
    
    # Cleanup
    async with db.pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM replied_comments WHERE comment_id LIKE 'batch_test_%'"
        )
    
    await db.close_db()


@pytest.mark.asyncio
async def test_quota_manager_concurrency():
    """Test quota manager under concurrent load"""
    from config import settings
    
    if not settings.USE_REDIS:
        pytest.skip("Redis not configured")
    
    from services.cache import cache_manager, QuotaManager
    
    await cache_manager.connect()
    quota_mgr = QuotaManager(cache_manager)
    
    # Reset quota
    await quota_mgr.reset_quota(user_id=999)
    
    # Simulate concurrent quota tracking
    async def track_quota():
        await quota_mgr.track_request(50, user_id=999)
    
    start = time.time()
    tasks = [track_quota() for _ in range(100)]
    await asyncio.gather(*tasks)
    duration = time.time() - start
    
    # Verify total
    usage = await quota_mgr.get_current_usage(user_id=999)
    
    assert usage == 5000  # 100 * 50
    print(f"\n✓ 100 concurrent quota updates in {duration:.3f}s")
    print(f"  Final quota usage: {usage}")
    
    await cache_manager.close()


def test_celery_task_submission():
    """Test Celery task submission (requires Redis)"""
    from config import settings
    
    if not settings.USE_REDIS:
        pytest.skip("Redis not configured for Celery")
    
    from tasks import sync_replied_comments_cache
    
    # Submit task
    result = sync_replied_comments_cache.delay()
    
    assert result.id is not None
    print(f"\n✓ Celery task submitted: {result.id}")


async def measure_throughput(func, iterations: int) -> float:
    """Helper to measure throughput"""
    start = time.time()
    await func(iterations)
    duration = time.time() - start
    return iterations / duration


if __name__ == "__main__":
    # Run tests manually
    print("Running performance tests...")
    asyncio.run(test_database_connection_pool())
    asyncio.run(test_redis_cache_performance())
    asyncio.run(test_batch_operations())
    asyncio.run(test_quota_manager_concurrency())
