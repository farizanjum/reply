import asyncio
import random

class HumanDelayGenerator:
    """Generate realistic human-like delays"""
    
    @staticmethod
    async def before_reply() -> float:
        """Delay before posting reply (reading/thinking time)"""
        delay = random.uniform(0.8, 3.5)  # 800ms - 3.5s
        await asyncio.sleep(delay)
        return delay
    
    @staticmethod
    async def after_reply() -> float:
        """Delay after posting reply (cool down)"""
        delay = random.uniform(1.0, 2.5)  # 1s - 2.5s
        await asyncio.sleep(delay)
        return delay
    
    @staticmethod
    async def between_batches(batch_size: int) -> float:
        """Delay between batches (longer break)"""
        base_delay = 120  # 2 minutes
        variance = random.uniform(-30, 60)  # ±30-60 seconds
        delay = base_delay + variance
        await asyncio.sleep(delay)
        return delay
    
    @staticmethod
    def get_batch_size() -> int:
        """Random batch size to avoid patterns"""
        return random.randint(8, 15)
