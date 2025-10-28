# Performance Testing Safety Guide

## ⚠️ Current Risks

**By default, your performance tests WILL create data** in your production database:

1. **User Registration** - Creates real users in `custom_users` table (~10-30 per test run)
2. **Class Records** - Creates real class records (~5-10 per test run)
3. **Notifications** - Creates real notifications (~5-15 per test run)
4. **Database Bloat** - Repeated tests accumulate data without cleanup
5. **Email Verification** - Sends verification emails (if configured)
6. **Google Sheets Updates** - Modifies test sheets (if TEST_SHEET_IDS set)

### Impact Per Test Run (50 users, 10 minutes):
- **Database Growth**: ~1-5 MB per run
- **New Users**: 10-30 fake users
- **Storage Cost**: Minimal but accumulates over time
- **Performance**: May slow down queries if not cleaned up

## 🛡️ Safety Features Implemented

The tests now include safety features to prevent database bloat:

### 1. **Read-Only Mode** (RECOMMENDED)
Set `PERFORMANCE_TEST_READ_ONLY=true` to disable ALL write operations:
- ✅ No user registrations
- ✅ No class record creation
- ✅ No notifications created
- ✅ No sheet writes
- ✅ Only tests read endpoints (GET requests)

### 2. **Selective Write Disabling**
Disable specific operations individually:
- `PERFORMANCE_TEST_DISABLE_REGISTRATION=true`
- `PERFORMANCE_TEST_DISABLE_CLASS_CREATE=true`
- `PERFORMANCE_TEST_DISABLE_NOTIFICATIONS=true`
- `PERFORMANCE_TEST_DISABLE_SHEET_WRITES=true`

### 3. **Test Data Prefix**
All test data includes `test_perf_` prefix for easy identification and cleanup.

## 🛡️ Safety Recommendations

### 1. **Use Read-Only Mode (Recommended)**

Enable read-only mode to prevent any data creation:

```bash
# Set in .env or environment
PERFORMANCE_TEST_READ_ONLY=true
```

### 2. **Use Staging/Test Environment**

**BEST PRACTICE**: Test against a staging environment, not production:
- Create a separate Cloud Run instance for testing
- Use a test database (separate from production)
- Point tests to: `https://vocalyx-staging-*.run.app`

### 3. **Limit Write Operations**

Configure test weights to minimize write operations:
- Reduce registration task frequency
- Disable class record creation
- Reduce notification creation

### 4. **Test Data Cleanup**

After testing, clean up test data:
```bash
# Use Django admin or create cleanup script
python manage.py shell
>>> from users.models import CustomUser
>>> CustomUser.objects.filter(email__startswith='test_').delete()
```

### 5. **Monitor Resource Usage**

- Watch Cloud Run CPU/Memory during tests
- Monitor database size growth
- Set up alerts for unusual activity

## 🚨 What Gets Created

### Per Test Run (50 users, 10 minutes):
- **Users**: ~10-30 new user registrations (depending on task weights)
- **Class Records**: ~5-10 new records
- **Notifications**: ~5-15 new notifications
- **Database Growth**: ~1-5 MB per test run

### Over Time:
- Without cleanup, database will accumulate test data
- Indexes may slow down queries
- Storage costs will increase

## ✅ Safe Testing Configuration

### Quick Setup (Recommended):

1. **Copy the safe configuration template:**
```bash
cp backend/performance_tests/SAFE_TESTING_EXAMPLE.env backend/.env
```

2. **Edit `.env` and enable read-only mode:**
```env
PERFORMANCE_TEST_READ_ONLY=true
TEST_USER_EMAIL=your-test-email@example.com
TEST_USER_PASSWORD=your-test-password
```

3. **Run tests safely:**
```bash
cd backend
locust -f performance_tests/locustfile.py --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

### Alternative: Disable Specific Operations

If you need to test some write operations but not others:

```env
# Enable only read operations + sheet reads
PERFORMANCE_TEST_DISABLE_REGISTRATION=true
PERFORMANCE_TEST_DISABLE_CLASS_CREATE=true
PERFORMANCE_TEST_DISABLE_NOTIFICATIONS=true
# Sheet writes still enabled (for testing sheet updates)
```

## 🧹 Test Data Cleanup

### Automatic Cleanup Script

After testing, clean up test data:

```python
# cleanup_test_data.py
from django.core.management import setup_environ
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from users.models import CustomUser
from classrecord.models import ClassRecord
from notifications.models import Notification

# Delete test users
test_users = CustomUser.objects.filter(email__startswith='test_perf_')
count = test_users.count()
test_users.delete()
print(f"Deleted {count} test users")

# Delete test class records
test_records = ClassRecord.objects.filter(name__startswith='test_perf_')
count = test_records.count()
test_records.delete()
print(f"Deleted {count} test class records")

# Delete test notifications
test_notifications = Notification.objects.filter(title__startswith='test_perf_')
count = test_notifications.count()
test_notifications.delete()
print(f"Deleted {count} test notifications")
```

### Manual Cleanup via Django Admin

1. Filter users: `email contains "test_perf_"`
2. Bulk delete
3. Repeat for class records and notifications

## 📊 Efficiency Improvements

### 1. **Use Read-Only Mode for Most Tests**
- Tests 80% of your API (read operations)
- No database bloat
- Safe to run frequently

### 2. **Limit Test Duration and Users**
```env
PERFORMANCE_TEST_MAX_USERS=20
PERFORMANCE_TEST_MAX_DURATION_MINUTES=5
```

### 3. **Use Cached Endpoints**
The tests already use `/api/class-records/live-counts/` which is cached - this is efficient.

### 4. **Schedule Tests During Off-Peak Hours**
Run tests when user traffic is low to minimize impact.

### 5. **Use Staging Environment**
**BEST PRACTICE**: Test against a staging instance:
- Separate Cloud Run service
- Separate database
- Can test write operations safely

## 🚨 Before Running Tests

**ALWAYS:**
1. ✅ Set `PERFORMANCE_TEST_READ_ONLY=true` in `.env` (if testing production)
2. ✅ Verify `TEST_SHEET_IDS` point to test sheets, not production
3. ✅ Check that `TEST_USER_EMAIL` is a test account
4. ✅ Monitor Cloud Run metrics during tests
5. ✅ Have a cleanup plan ready

**NEVER:**
- ❌ Run write tests on production without safety measures
- ❌ Use production Google Sheets IDs
- ❌ Run unlimited duration tests
- ❌ Test without monitoring

## 📈 Monitoring

Watch these metrics during tests:
- Cloud Run CPU/Memory usage
- Database connection count
- Response time (p50, p95, p99)
- Error rate
- Database size growth

## 🔧 Configuration Reference

See `config/settings.py` for all safety options and `SAFE_TESTING_EXAMPLE.env` for example configuration.

