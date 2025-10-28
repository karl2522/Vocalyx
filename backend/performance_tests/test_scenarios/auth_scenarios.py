"""
Authentication endpoint test scenarios.
"""
from locust import task, between
from locust.contrib.fasthttp import FastHttpUser
from config.settings import THRESHOLDS
from utils.helpers import (
    get_auth_headers, extract_token_from_response, 
    validate_response, log_response_time
)
from utils.test_data import generate_user_data


class AuthenticationUser(FastHttpUser):
    """Simulates anonymous users performing authentication operations."""
    
    wait_time = between(2, 5)
    
    def on_start(self):
        """Called when a simulated user starts. Initialize user state."""
        self.token = None
        self.user_data = None
    
    @task(3)
    def login(self):
        """Test login endpoint with valid credentials."""
        from config.settings import TEST_USER_EMAIL, TEST_USER_PASSWORD
        
        if not TEST_USER_EMAIL or not TEST_USER_PASSWORD:
            # Even without credentials, make a request to test the endpoint
            # This ensures Locust tracks requests even in misconfigured scenarios
            payload = {
                'email': 'test@example.com',
                'password': 'testpassword123',
            }
        else:
            payload = {
                'email': TEST_USER_EMAIL,
                'password': TEST_USER_PASSWORD,
            }
        
        headers = get_auth_headers()
        
        with self.client.post(
            '/api/login/',
            json=payload,
            headers=headers,
            catch_response=True,
            name='POST /api/login/'
        ) as response:
            log_response_time(response, 'Login', THRESHOLDS['auth'])
            
            if response.status_code == 200:
                self.token = extract_token_from_response(response)
                if self.token:
                    response.success()
                else:
                    response.failure("Token not found in response")
            elif response.status_code == 401:
                # Invalid credentials - expected if no credentials configured
                response.failure("Authentication failed - invalid credentials")
                self.token = None
            else:
                response.failure(f"Unexpected status: {response.status_code}")
                self.token = None
    
    @task(1)
    def register(self):
        """Test user registration endpoint."""
        from config.settings import READ_ONLY_MODE, DISABLE_USER_REGISTRATION
        
        # Skip if read-only mode or registration is disabled
        if READ_ONLY_MODE or DISABLE_USER_REGISTRATION:
            return
        
        self.user_data = generate_user_data()
        
        headers = get_auth_headers()
        
        with self.client.post(
            '/api/register/',
            json=self.user_data,
            headers=headers,
            catch_response=True,
            name='POST /api/register/'
        ) as response:
            log_response_time(response, 'Register', THRESHOLDS['auth'])
            
            # Registration might fail if email exists, which is acceptable
            if response.status_code in [200, 201, 400]:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")
    
    @task(2)
    def validate_token(self):
        """Test token validation endpoint."""
        if not self.token:
            # Try to login first if no token
            self.login()
        
        if not self.token:
            return
        
        headers = get_auth_headers(self.token)
        
        with self.client.get(
            '/api/validate-token/',
            headers=headers,
            catch_response=True,
            name='GET /api/validate-token/'
        ) as response:
            log_response_time(response, 'Validate Token', THRESHOLDS['auth'])
            validate_response(response, 200)
    
    @task(1)
    def get_profile(self):
        """Test get user profile endpoint."""
        if not self.token:
            # Try to login first if no token
            self.login()
        
        if not self.token:
            # Skip if we don't have a token
            return
        
        headers = get_auth_headers(self.token)
        
        with self.client.get(
            '/api/profile/',
            headers=headers,
            catch_response=True,
            name='GET /api/profile/'
        ) as response:
            log_response_time(response, 'Get Profile', THRESHOLDS['read'])
            
            # Handle different status codes
            if response.status_code == 401:
                response.failure(f"Authentication failed: {response.text[:200]}")
                # Token might be invalid, try to get a new one
                self.token = None
            elif response.status_code == 403:
                response.failure(f"Forbidden: {response.text[:200]}")
            elif response.status_code == 404:
                response.failure(f"Endpoint not found: {response.text[:200]}")
            elif response.status_code == 200:
                response.success()  # Must call success() for Locust to record response time
            else:
                # Use validate_response which will call success() or failure()
                validate_response(response, 200)

