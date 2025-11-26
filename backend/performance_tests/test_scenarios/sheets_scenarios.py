"""
Google Sheets endpoint test scenarios.
"""
from locust import task, between
from locust.contrib.fasthttp import FastHttpUser
from config.settings import THRESHOLDS, TEST_SHEET_IDS
from utils.helpers import (
    get_auth_headers, validate_response, log_response_time, safe_json_parse
)
from utils.test_data import get_test_sheet_ids, generate_cell_update_data, generate_student_data


class SheetsUser(FastHttpUser):
    """Simulates users performing Google Sheets operations."""
    
    wait_time = between(2, 5)
    
    def on_start(self):
        """Called when a simulated user starts. Login and get available sheet IDs."""
        self.token = self.authenticate()
        self.sheet_ids = get_test_sheet_ids() if get_test_sheet_ids() else TEST_SHEET_IDS
        self.current_sheet_id = self.sheet_ids[0] if self.sheet_ids else None
    
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
            name='POST /api/login/ (SheetsUser)'
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
    
    
    
    @task(2)
    def get_all_sheets_data(self):
        """Test getting all sheets data."""
        if not self.current_sheet_id:
            return
        
        # Always make request - will fail with 401 if no token, but Locust will track it
        headers = get_auth_headers(self.token) if self.token else get_auth_headers()
        
        with self.client.get(
            f'/api/sheets/service-account/{self.current_sheet_id}/all-sheets-data/',
            headers=headers,
            catch_response=True,
            name='GET /api/sheets/service-account/{sheet_id}/all-sheets-data/'
        ) as response:
            log_response_time(response, 'Get All Sheets Data', THRESHOLDS['sheets'])
            if response.status_code == 401:
                response.failure("Authentication required")
            else:
                validate_response(response, 200)
    
    @task(3)
    def update_cell(self):
        """Test updating a single cell."""
        from config.settings import READ_ONLY_MODE, DISABLE_SHEET_WRITES
        
        # Skip if read-only mode or sheet writes are disabled
        if READ_ONLY_MODE or DISABLE_SHEET_WRITES:
            return
        
        if not self.token or not self.current_sheet_id:
            return
        
        headers = get_auth_headers(self.token)
        cell_data = generate_cell_update_data()
        
        payload = {
            'row': cell_data['row'],
            'col': cell_data['col'],
            'value': cell_data['value'],
        }
        
        with self.client.post(
            f'/api/sheets/service-account/{self.current_sheet_id}/update-cell/',
            json=payload,
            headers=headers,
            catch_response=True,
            name='POST /api/sheets/service-account/{sheet_id}/update-cell/'
        ) as response:
            log_response_time(response, 'Update Cell', THRESHOLDS['sheets'])
            
            # Accept various success status codes
            if response.status_code in [200, 201, 204]:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")
    
    @task(1)
    def add_student(self):
        """Test adding a student to a sheet."""
        from config.settings import READ_ONLY_MODE, DISABLE_SHEET_WRITES
        
        # Skip if read-only mode or sheet writes are disabled
        if READ_ONLY_MODE or DISABLE_SHEET_WRITES:
            return
        
        if not self.token or not self.current_sheet_id:
            return
        
        headers = get_auth_headers(self.token)
        student_data = generate_student_data()
        
        payload = {
            'first_name': student_data['first_name'],
            'last_name': student_data['last_name'],
            'student_number': str(student_data['student_number']),
        }
        
        with self.client.post(
            f'/api/sheets/{self.current_sheet_id}/add-student-auto-number/',
            json=payload,
            headers=headers,
            catch_response=True,
            name='POST /api/sheets/{sheet_id}/add-student-auto-number/'
        ) as response:
            log_response_time(response, 'Add Student', THRESHOLDS['write'])
            
            if response.status_code in [200, 201]:
                response.success()
            else:
                # Adding duplicate students might fail, which is acceptable
                if response.status_code == 400:
                    response.success()
                else:
                    response.failure(f"Unexpected status: {response.status_code}")
    


