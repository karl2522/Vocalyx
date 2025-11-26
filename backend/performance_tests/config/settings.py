"""
Configuration settings for performance tests.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
# Try multiple locations: backend/.env, root/.env, or current directory
# __file__ is: backend/performance_tests/config/settings.py
# So parent.parent.parent = backend/
config_dir = Path(__file__).parent  # backend/performance_tests/config/
perf_tests_dir = config_dir.parent  # backend/performance_tests/
backend_dir = perf_tests_dir.parent  # backend/
root_dir = backend_dir.parent        # root/

env_paths = [
    backend_dir / '.env',        # backend/.env (most likely)
    root_dir / '.env',           # root/.env
    Path.cwd() / '.env',         # current working directory
    perf_tests_dir / '.env',     # backend/performance_tests/.env
]

env_loaded = False
loaded_from = None
for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path, override=True)
        env_loaded = True
        loaded_from = str(env_path)
        break

# Fallback to default load_dotenv() behavior (checks current dir and parents)
if not env_loaded:
    load_dotenv(override=True)
    # Check if it worked
    if os.getenv('PERFORMANCE_TEST_READ_ONLY'):
        loaded_from = 'default search'

# Debug: Show where .env was loaded from
if loaded_from:
    print(f"[DEBUG] Loaded .env from: {loaded_from}")
    print(f"[DEBUG] PERFORMANCE_TEST_READ_ONLY = {os.getenv('PERFORMANCE_TEST_READ_ONLY', 'NOT SET')}")
else:
    print(f"[DEBUG] No .env file found. Searched in: {[str(p) for p in env_paths]}")
    print(f"[DEBUG] Current working directory: {Path.cwd()}")
    print(f"[DEBUG] PERFORMANCE_TEST_READ_ONLY = {os.getenv('PERFORMANCE_TEST_READ_ONLY', 'NOT SET')}")

# Production API URL (without /api suffix - paths will include /api/ prefix)
PRODUCTION_API_URL = os.getenv(
    'PERFORMANCE_TEST_API_URL',
    'https://vocalyx-backend-64846917574.asia-southeast1.run.app'
)

# Test user credentials (should be set in environment variables)
# OPTION 1: Use pre-obtained JWT token (RECOMMENDED for Google/Firebase auth users)
# Get this token from browser console: localStorage.getItem('authToken')
# or from browser DevTools > Application > Local Storage > authToken
TEST_USER_TOKEN = os.getenv('TEST_USER_TOKEN', '')

# OPTION 2: Use email/password (only if you have email/password login enabled)
TEST_USER_EMAIL = os.getenv('TEST_USER_EMAIL', '')
TEST_USER_PASSWORD = os.getenv('TEST_USER_PASSWORD', '')

# Test data configuration
TEST_SHEET_IDS = os.getenv('TEST_SHEET_IDS', '').split(',') if os.getenv('TEST_SHEET_IDS') else []
TEST_SHEET_IDS = [sheet_id.strip() for sheet_id in TEST_SHEET_IDS if sheet_id.strip()]

# Load test parameters
DEFAULT_USERS = int(os.getenv('LOCUST_USERS', '50'))
DEFAULT_SPAWN_RATE = int(os.getenv('LOCUST_SPAWN_RATE', '5'))
DEFAULT_RUN_TIME = os.getenv('LOCUST_RUN_TIME', '10m')

# Response time thresholds (in milliseconds)
THRESHOLDS = {
    'auth': 500,           # Authentication endpoints
    'read': 1000,          # Read operations
    'write': 2000,         # Write operations
    'sheets': 3000,        # Google Sheets operations
}

# Success rate thresholds
SUCCESS_RATE_TARGET = float(os.getenv('SUCCESS_RATE_TARGET', '0.99'))  # 99%
SUCCESS_RATE_MINIMUM = float(os.getenv('SUCCESS_RATE_MINIMUM', '0.95'))  # 95%

# Dynamic endpoint suite selection and filters
# Suites: current, high_priority, custom
PERF_SUITE = os.getenv('PERF_SUITE', 'current')
PERF_INCLUDE_TAGS = [t.strip() for t in os.getenv('PERF_INCLUDE_TAGS', '').split(',') if t.strip()]
PERF_EXCLUDE_TAGS = [t.strip() for t in os.getenv('PERF_EXCLUDE_TAGS', '').split(',') if t.strip()]
PERF_INCLUDE_ENDPOINTS = [p.strip() for p in os.getenv('PERF_INCLUDE_ENDPOINTS', '').split(',') if p.strip()]
PERF_EXCLUDE_ENDPOINTS = [p.strip() for p in os.getenv('PERF_EXCLUDE_ENDPOINTS', '').split(',') if p.strip()]

# User behavior weights (percentages should add up to 100)
# Set 'anonymous' to 0 to disable login POST requests (if you only want authenticated endpoint tests)
USER_WEIGHTS = {
    'anonymous': 0,        # 0% anonymous users (set to 0 to disable login POST requests)
    'authenticated': 70,   # 70% authenticated users (increased when anonymous is 0)
    'active_teacher': 30,  # 30% active teachers (increased when anonymous is 0)
}

# Wait time between tasks (in seconds)
WAIT_TIME_MIN = float(os.getenv('WAIT_TIME_MIN', '1'))
WAIT_TIME_MAX = float(os.getenv('WAIT_TIME_MAX', '5'))

# SAFETY SETTINGS - Prevent database bloat
# Set to True to disable all write operations (CREATE/UPDATE/DELETE)
READ_ONLY_MODE = os.getenv('PERFORMANCE_TEST_READ_ONLY', 'false').lower() == 'true'

# Disable specific write operations individually
DISABLE_USER_REGISTRATION = os.getenv('PERFORMANCE_TEST_DISABLE_REGISTRATION', 'false').lower() == 'true'
DISABLE_CLASS_RECORD_CREATION = os.getenv('PERFORMANCE_TEST_DISABLE_CLASS_CREATE', 'false').lower() == 'true'
DISABLE_NOTIFICATION_CREATION = os.getenv('PERFORMANCE_TEST_DISABLE_NOTIFICATIONS', 'false').lower() == 'true'
DISABLE_SHEET_WRITES = os.getenv('PERFORMANCE_TEST_DISABLE_SHEET_WRITES', 'false').lower() == 'true'

# Maximum limits to prevent excessive load
MAX_USERS = int(os.getenv('PERFORMANCE_TEST_MAX_USERS', '100'))  # Max concurrent users
MAX_DURATION_MINUTES = int(os.getenv('PERFORMANCE_TEST_MAX_DURATION_MINUTES', '30'))  # Max test duration

# Test data prefix for easy identification and cleanup
TEST_DATA_PREFIX = os.getenv('PERFORMANCE_TEST_DATA_PREFIX', 'test_perf_')

