"""
Class record endpoint test scenarios.
"""
from locust import task, between
from locust.contrib.fasthttp import FastHttpUser
from config.settings import THRESHOLDS
from utils.helpers import (
    get_auth_headers, validate_response, log_response_time, safe_json_parse
)
from utils.test_data import generate_class_record_data, generate_student_data


class ClassRecordUser(FastHttpUser):
    """Simulates authenticated users browsing class records."""
    
    wait_time = between(1, 3)
    
    def on_start(self):
        """Called when a simulated user starts. Login and get token."""
        self.token = self.authenticate()
        self.class_record_ids = []
    
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
        
        # Make login request - Locust will track this
        response = self.client.post(
            '/api/login/',
            json=payload,
            headers=get_auth_headers(),
            name='POST /api/login/ (ClassRecordUser)'
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
    def list_class_records(self):
        """Test listing class records."""
        # Always make the request, even without token, so Locust tracks it
        # If no token, it will fail with 401 which is fine for testing
        headers = get_auth_headers(self.token) if self.token else get_auth_headers()
        
        with self.client.get(
            '/api/class-records/',
            headers=headers,
            catch_response=True,
            name='GET /api/class-records/'
        ) as response:
            log_response_time(response, 'List Class Records', THRESHOLDS['read'])
            
            if response.status_code == 401:
                # No token or invalid token - expected in some scenarios
                response.failure("Authentication required")
            elif validate_response(response, 200):
                data = safe_json_parse(response)
                if data:
                    # Extract IDs for later use
                    results = data.get('results', []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
                    self.class_record_ids = [item.get('id') for item in results if item.get('id')]
    
    @task(3)
    def list_students(self):
        """Test listing students."""
        # Always make the request so Locust tracks it
        headers = get_auth_headers(self.token) if self.token else get_auth_headers()
        
        with self.client.get(
            '/api/students/',
            headers=headers,
            catch_response=True,
            name='GET /api/students/'
        ) as response:
            log_response_time(response, 'List Students', THRESHOLDS['read'])
            if response.status_code == 401:
                response.failure("Authentication required")
            else:
                validate_response(response, 200)
    
    @task(3)
    def list_grades(self):
        """Test listing grades."""
        # Always make the request so Locust tracks it
        headers = get_auth_headers(self.token) if self.token else get_auth_headers()
        
        with self.client.get(
            '/api/grades/',
            headers=headers,
            params={'page': 1, 'page_size': 20},
            catch_response=True,
            name='GET /api/grades/'
        ) as response:
            log_response_time(response, 'List Grades', THRESHOLDS['read'])
            if response.status_code == 401:
                response.failure("Authentication required")
            else:
                validate_response(response, 200)
    
    @task(4)
    def get_live_counts(self):
        """Test cached live counts endpoint."""
        # Always make the request so Locust tracks it
        headers = get_auth_headers(self.token) if self.token else get_auth_headers()
        
        with self.client.get(
            '/api/class-records/live-counts/',
            headers=headers,
            catch_response=True,
            name='GET /api/class-records/live-counts/'
        ) as response:
            log_response_time(response, 'Get Live Counts', THRESHOLDS['read'])
            if response.status_code == 401:
                response.failure("Authentication required")
            else:
                validate_response(response, 200)
    
    @task(1)
    def create_class_record(self):
        """Test creating a class record."""
        from config.settings import READ_ONLY_MODE, DISABLE_CLASS_RECORD_CREATION
        
        # Skip if read-only mode or class record creation is disabled
        if READ_ONLY_MODE or DISABLE_CLASS_RECORD_CREATION:
            return
        
        if not self.token:
            return
        
        headers = get_auth_headers(self.token)
        payload = generate_class_record_data()
        
        with self.client.post(
            '/api/class-records/',
            json=payload,
            headers=headers,
            catch_response=True,
            name='POST /api/class-records/'
        ) as response:
            log_response_time(response, 'Create Class Record', THRESHOLDS['write'])
            
            # Accept both 200 and 201 as success
            if response.status_code in [200, 201]:
                data = safe_json_parse(response)
                if data and data.get('id'):
                    self.class_record_ids.append(data['id'])
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")

