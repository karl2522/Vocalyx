"""
Main Locust file for Vocalyx performance testing.

This file defines the user behavior patterns and orchestrates all test scenarios.

Run from backend directory:
    locust -f performance_tests/locustfile.py --host=<API_URL>
"""
import sys
from pathlib import Path

# Add performance_tests to path to allow imports
backend_dir = Path(__file__).parent.parent
performance_tests_dir = Path(__file__).parent
if str(performance_tests_dir) not in sys.path:
    sys.path.insert(0, str(performance_tests_dir))

from locust import HttpUser, task, between, events
from locust.contrib.fasthttp import FastHttpUser
from locust.runners import MasterRunner, WorkerRunner

from config.settings import (
    PRODUCTION_API_URL, USER_WEIGHTS, WAIT_TIME_MIN, WAIT_TIME_MAX
)
from test_scenarios.auth_scenarios import AuthenticationUser
from test_scenarios.classrecord_scenarios import ClassRecordUser
from test_scenarios.sheets_scenarios import SheetsUser
from test_scenarios.notifications_scenarios import NotificationUser


# Custom event handlers for additional metrics tracking
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when a test starts."""
    from config.settings import (
        READ_ONLY_MODE, DISABLE_USER_REGISTRATION, DISABLE_CLASS_RECORD_CREATION,
        DISABLE_NOTIFICATION_CREATION, DISABLE_SHEET_WRITES
    )
    
    print("=" * 60)
    print("Starting Vocalyx Performance Test")
    print(f"Target: {PRODUCTION_API_URL}")
    print("=" * 60)
    
    # Safety warnings
    from config.settings import TEST_USER_TOKEN, TEST_USER_EMAIL, TEST_USER_PASSWORD
    
    if READ_ONLY_MODE:
        print("🛡️  READ-ONLY MODE ENABLED - No data will be created/modified")
    else:
        print("⚠️  WRITE MODE - Tests will create data in database!")
        if DISABLE_USER_REGISTRATION:
            print("   ✓ User registration disabled")
        if DISABLE_CLASS_RECORD_CREATION:
            print("   ✓ Class record creation disabled")
        if DISABLE_NOTIFICATION_CREATION:
            print("   ✓ Notification creation disabled")
        if DISABLE_SHEET_WRITES:
            print("   ✓ Sheet write operations disabled")
    
    # Check credentials
    print("\n📋 Configuration Check:")
    if TEST_USER_TOKEN:
        print("   ✓ Using pre-obtained JWT token (TEST_USER_TOKEN)")
        print("   ✓ Authenticated endpoints will work")
    elif TEST_USER_EMAIL and TEST_USER_PASSWORD:
        print(f"   ✓ Using email/password credentials: {TEST_USER_EMAIL[:10]}...")
        print("   ✓ Authenticated endpoints will work")
    else:
        print("   ⚠️  WARNING: No authentication configured!")
        print("      Set TEST_USER_TOKEN (recommended for Google/Firebase users) or")
        print("      Set TEST_USER_EMAIL + TEST_USER_PASSWORD (for email/password login)")
        print("      Authenticated endpoints will fail with 401 errors")
    
    print("=" * 60)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when a test stops."""
    print("=" * 60)
    print("Performance Test Complete")
    print("=" * 60)


# User behavior pattern classes with weights
class AnonymousUser(AuthenticationUser):
    """
    Simulates anonymous users (30% of load).
    Primary activities: Login, Registration
    
    NOTE: This user class intentionally makes POST /api/login/ requests
    to test the login endpoint. Set weight to 0 to disable if you only
    want to test authenticated endpoints.
    """
    weight = USER_WEIGHTS['anonymous']  # Set to 0 to disable login POST requests
    wait_time = between(WAIT_TIME_MIN, WAIT_TIME_MAX)


class AuthenticatedUser(ClassRecordUser):
    """
    Simulates authenticated users (50% of load).
    Primary activities: Browsing class records, viewing sheets, checking notifications
    """
    weight = USER_WEIGHTS['authenticated']
    wait_time = between(WAIT_TIME_MIN, WAIT_TIME_MAX)
    
    @task(3)
    def browse_class_records(self):
        """Browse class records - most common activity."""
        self.list_class_records()
        self.get_live_counts()
    
    @task(2)
    def view_sheets(self):
        """View Google Sheets data."""
        from utils.helpers import get_auth_headers
        from config.settings import TEST_SHEET_IDS
        
        # Skip only if no sheet IDs configured
        if not TEST_SHEET_IDS:
            return
        
        sheet_id = TEST_SHEET_IDS[0]
        # Always make request - will fail with 401 if no token, but Locust will track it
        headers = get_auth_headers(self.token) if self.token else get_auth_headers()
        
        with self.client.get(
            f'/api/sheets/service-account/{sheet_id}/data/',
            headers=headers,
            catch_response=True,
            name='GET /api/sheets/service-account/{sheet_id}/data/ (AuthenticatedUser)'
        ) as response:
            if response.status_code == 401:
                response.failure("Authentication required")
            elif response.status_code == 200:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")
    
    @task(2)
    def check_notifications(self):
        """Check notifications."""
        from utils.helpers import get_auth_headers
        
        # Always make request - will fail with 401 if no token, but Locust will track it
        headers = get_auth_headers(self.token) if self.token else get_auth_headers()
        
        with self.client.get(
            '/api/notifications/',
            headers=headers,
            params={'page': 1, 'page_size': 20},
            catch_response=True,
            name='GET /api/notifications/ (AuthenticatedUser)'
        ) as response:
            if response.status_code == 401:
                response.failure("Authentication required")
            elif response.status_code == 200:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")
    
    @task(1)
    def view_profile(self):
        """View own profile."""
        if not self.token:
            return
        
        from utils.helpers import get_auth_headers
        headers = get_auth_headers(self.token)
        
        with self.client.get(
            '/api/profile/',
            headers=headers,
            catch_response=True,
            name='GET /api/profile/ (AuthenticatedUser)'
        ) as response:
            if response.status_code == 401:
                response.failure("Authentication failed - token may be invalid")
                self.token = None  # Force re-login next time
            elif response.status_code == 200:
                response.success()  # Must call success() for Locust to record response time
            else:
                response.failure(f"Unexpected status: {response.status_code}")


class ActiveTeacherUser(SheetsUser):
    """
    Simulates active teachers (20% of load).
    Primary activities: Updating grades, adding students, import operations
    """
    weight = USER_WEIGHTS['active_teacher']
    wait_time = between(WAIT_TIME_MIN, WAIT_TIME_MAX * 1.5)  # Teachers take more time between actions
    
    @task(4)
    def grade_students(self):
        """Update student grades - most common teacher activity."""
        self.update_cell()
    
    @task(2)
    def manage_students(self):
        """Add students to sheets."""
        self.add_student()
    
    @task(2)
    def review_all_data(self):
        """Review all sheet data."""
        self.get_all_sheets_data()
    
    @task(1)
    def manage_categories(self):
        """View and manage grade categories."""
        self.get_categories()


# Alternative: Simple unified user class for simpler testing
class WebsiteUser(FastHttpUser):
    """
    Simplified user class that performs a mix of all operations.
    Useful for quick smoke tests.
    """
    weight = 0  # Disabled by default, set weight > 0 to enable
    wait_time = between(1, 3)
    
    def on_start(self):
        """Login when user starts."""
        from config.settings import TEST_USER_TOKEN, TEST_USER_EMAIL, TEST_USER_PASSWORD
        from utils.helpers import get_auth_headers
        
        # OPTION 1: Use pre-obtained token (for Google/Firebase auth users)
        if TEST_USER_TOKEN:
            self.token = TEST_USER_TOKEN
            return
        
        # OPTION 2: Use email/password login (fallback)
        if TEST_USER_EMAIL and TEST_USER_PASSWORD:
            response = self.client.post(
                '/api/login/',
                json={'email': TEST_USER_EMAIL, 'password': TEST_USER_PASSWORD},
                headers=get_auth_headers(),
                name='POST /api/login/ (WebsiteUser)'
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
                                self.token = access_token
                            else:
                                # Check direct token fields
                                self.token = (
                                    data.get('access') or
                                    data.get('token') or
                                    data.get('access_token')
                                )
                        else:
                            # Check direct token fields
                            self.token = (
                                data.get('access') or
                                data.get('token') or
                                data.get('access_token')
                            )
                    else:
                        self.token = None
                except:
                    self.token = None
            else:
                self.token = None
        else:
            self.token = None
    
    @task(5)
    def browse_class_records(self):
        """Browse class records."""
        from utils.helpers import get_auth_headers
        headers = get_auth_headers(self.token)
        
        with self.client.get(
            '/api/class-records/',
            headers=headers,
            catch_response=True,
            name='GET /api/class-records/ (WebsiteUser)'
        ) as response:
            if response.status_code == 401:
                response.failure("Authentication required")
            elif response.status_code == 200:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")
    
    @task(3)
    def view_sheets(self):
        """View sheets."""
        # Skip - would need test sheet ID
        pass
    
    @task(2)
    def check_notifications(self):
        """Check notifications."""
        from utils.helpers import get_auth_headers
        headers = get_auth_headers(self.token)
        
        with self.client.get(
            '/api/notifications/',
            headers=headers,
            catch_response=True,
            name='GET /api/notifications/ (WebsiteUser)'
        ) as response:
            if response.status_code == 401:
                response.failure("Authentication required")
            elif response.status_code == 200:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")


# Export the user classes that Locust will use
# Uncomment/Comment classes to include/exclude from tests
USER_CLASSES = [
    AnonymousUser,       # 30% load
    AuthenticatedUser,   # 50% load
    ActiveTeacherUser,   # 20% load
    # WebsiteUser,       # Disabled by default
]

