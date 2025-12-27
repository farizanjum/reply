"""
Load Testing with Locust

This simulates thousands of concurrent users to test the system's performance.

Run with:
    locust -f tests/load_test.py --host=http://localhost:8000
    
Then open http://localhost:8089 and start the test.
"""
from locust import HttpUser, task, between
import random
import json


class YouTubeAutoReplyUser(HttpUser):
    """Simulates a user interacting with the YouTube Auto-Reply API"""
    
    # Wait 1-3 seconds between tasks
    wait_time = between(1, 3)
    
    def on_start(self):
        """Called when a simulated user starts"""
        # Simulate login
        self.token = "test-token-" + str(random.randint(1000, 9999))
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    @task(5)  # Weight: 5x more likely than other tasks
    def get_videos(self):
        """Fetch user's videos"""
        with self.client.get(
            "/api/videos/",
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code in [401, 404]:
                # Expected for test tokens
                response.success()
            else:
                response.failure(f"Got status code {response.status_code}")
    
    @task(3)
    def get_analytics(self):
        """Fetch analytics"""
        with self.client.get(
            "/api/analytics/",
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code in [200, 401]:
                response.success()
            else:
                response.failure(f"Got status code {response.status_code}")
    
    @task(2)
    def sync_videos(self):
        """Trigger video sync"""
        with self.client.get(
            "/api/videos/sync",
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code in [200, 401, 500]:
                # 500 is acceptable for test without real YouTube API
                response.success()
            else:
                response.failure(f"Got status code {response.status_code}")
    
    @task(1)
    def trigger_reply(self):
        """Trigger auto-reply"""
        video_id = "test-video-" + str(random.randint(1, 100))
        with self.client.post(
            f"/api/videos/{video_id}/trigger-reply",
            headers=self.headers,
            catch_response=True
        ) as response:
            if response.status_code in [200, 401, 404, 503]:
                response.success()
            else:
                response.failure(f"Got status code {response.status_code}")
    
    @task(10)  # Most frequent - health check
    def health_check(self):
        """Health check endpoint"""
        with self.client.get("/health") as response:
            if response.status_code == 200:
                response.success()


class HighLoadUser(HttpUser):
    """Simulates high-frequency API calls"""
    
    wait_time = between(0.1, 0.5)  # Very fast - 100-500ms between requests
    
    def on_start(self):
        self.token = "heavy-user-" + str(random.randint(1000, 9999))
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task
    def rapid_video_checks(self):
        """Rapid video list checks"""
        self.client.get("/api/videos/", headers=self.headers)
    
    @task
    def rapid_analytics(self):
        """Rapid analytics checks"""
        self.client.get("/api/analytics/", headers=self.headers)


class BurstUser(HttpUser):
    """Simulates burst traffic - sudden spikes"""
    
    wait_time = between(0, 1)
    
    @task
    def burst_requests(self):
        """Send burst of requests"""
        for _ in range(10):
            self.client.get("/health")
            self.client.get("/")


# Custom test scenarios
class DatabaseStressTest(HttpUser):
    """Test database under heavy load"""
    
    wait_time = between(0.5, 1.5)
    
    def on_start(self):
        self.user_id = random.randint(1, 100)
        self.headers = {"Authorization": f"Bearer test-{self.user_id}"}
    
    @task(5)
    def read_videos(self):
        """Stress test video reads"""
        self.client.get("/api/videos/", headers=self.headers)
    
    @task(2)
    def read_analytics(self):
        """Stress test analytics queries"""
        self.client.get("/api/analytics/", headers=self.headers)
        self.client.get("/api/analytics/chart?days=7", headers=self.headers)
    
    @task(1)
    def write_operation(self):
        """Stress test write operations"""
        video_id = f"video-{random.randint(1, 1000)}"
        settings = {
            "auto_reply_enabled": random.choice([True, False]),
            "keywords": ["test", "demo"],
            "reply_templates": ["Thanks!"],
            "schedule_type": "hourly"
        }
        self.client.put(
            f"/api/videos/{video_id}/settings",
            headers=self.headers,
            json=settings
        )
