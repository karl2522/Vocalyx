"""
Notification endpoint test scenarios.
"""
from locust import task, between
from locust.contrib.fasthttp import FastHttpUser
from config.settings import THRESHOLDS
from utils.helpers import (
    get_auth_headers, validate_response, log_response_time, safe_json_parse
)
from utils.test_data import generate_notification_data


class NotificationUser(FastHttpUser):
    """Simulates users interacting with notifications."""
    
    wait_time = between(1, 3)
    
    def on_start(self):
        """Called when a simulated user starts. Login and get token."""
        self.token = self.authenticate()
    
    def authenticate(self):
        """Authenticate user and return token."""
        from config.settings import TEST_USER_TOKEN, TEST_USER_EMAIL, TEST_USER_PASSWORD
        
        # OPTION 1: Use pre-obtained token (for Google/Firebase auth users)
        if TEST_USER_TOKEN:
            # Token provided directly - use it without making login request
            return TEST_USER_TOKEN
        
        # OPTION 2: Use email/password login (fallback)
        # Always make a login request (even with dummy credentials if not configured)
        # This ensures Locust tracks the request
        if not TEST_USER_EMAIL or not TEST_USER_PASSWORD:
            payload = {
                'email': 'test@example.com',
                'password': 'testpassword123',
            }
        else:
            payload = {
                'email': TEST_USER_EMAIL,
                'password': TEST_USER_PASSWORD,
            }
        
        response = self.client.post(
            '/api/login/',
            json=payload,
            headers=get_auth_headers(),
            name='POST /api/login/ (NotificationUser)'
        )
        
        if response.status_code == 200:
            try:
                data = response.json()
                # Check nested tokens structure first (tokens.access)
                if isinstance(data, dict):
                    tokens = data.get('tokens', {})
                    if isinstance(tokens, dict):
                        access_token = tokens.get('access')
                        if access_token:
                            return access_token
                # Check direct token fields
                return (
                    data.get('access') or
                    data.get('token') or
                    data.get('access_token') or
                    None
                )
            except:
                return None
        return None
    
    @task(5)
    def list_notifications(self):
        """Test listing notifications."""
        # Always make the request so Locust tracks it
        headers = get_auth_headers(self.token) if self.token else get_auth_headers()
        
        with self.client.get(
            '/api/notifications/',
            headers=headers,
            params={'page': 1, 'page_size': 20},
            catch_response=True,
            name='GET /api/notifications/'
        ) as response:
            log_response_time(response, 'List Notifications', THRESHOLDS['read'])
            if response.status_code == 401:
                response.failure("Authentication required")
            else:
                validate_response(response, 200)
    
    @task(1)
    def create_notification(self):
        """Test creating a notification."""
        from config.settings import READ_ONLY_MODE, DISABLE_NOTIFICATION_CREATION
        
        # Skip if read-only mode or notification creation is disabled
        if READ_ONLY_MODE or DISABLE_NOTIFICATION_CREATION:
            return
        
        if not self.token:
            return
        
        headers = get_auth_headers(self.token)
        payload = generate_notification_data()
        
        with self.client.post(
            '/api/notifications/',
            json=payload,
            headers=headers,
            catch_response=True,
            name='POST /api/notifications/'
        ) as response:
            log_response_time(response, 'Create Notification', THRESHOLDS['write'])
            
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")

