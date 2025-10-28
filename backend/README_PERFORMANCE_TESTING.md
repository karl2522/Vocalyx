# Vocalyx Performance Testing Guide

This directory contains performance tests for the Vocalyx backend API using Locust.

## Quick Start

### Prerequisites

1. Install test dependencies:
```bash
pip install -r requirements-test.txt
```

2. Set up environment variables (optional, create a `.env` file in the backend directory):
```env
# Required for authenticated endpoints
TEST_USER_EMAIL=your-test-email@example.com
TEST_USER_PASSWORD=your-test-password

# Optional: Test Google Sheets IDs (comma-separated)
TEST_SHEET_IDS=sheet_id_1,sheet_id_2

# Optional: Override defaults
PERFORMANCE_TEST_API_URL=https://vocalyx-backend-64846917574.asia-southeast1.run.app/api
LOCUST_USERS=50
LOCUST_SPAWN_RATE=5
LOCUST_RUN_TIME=10m
```

### Running Tests

#### Web UI Mode (Interactive)
```bash
cd backend
locust -f performance_tests/locustfile.py --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

Then open http://localhost:8089 in your browser.

#### Headless Mode (Automated)
```bash
cd backend
locust -f performance_tests/locustfile.py \
  --headless \
  --users 50 \
  --spawn-rate 5 \
  --run-time 10m \
  --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app \
  --html performance_tests/results/report.html \
  --csv performance_tests/results/stats
```

## Test Types

### 1. Smoke Tests (Quick Validation)
```bash
locust -f performance_tests/locustfile.py \
  --headless -u 10 -r 2 -t 2m \
  --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

### 2. Load Tests (Normal Load)
```bash
locust -f performance_tests/locustfile.py \
  --headless -u 50 -r 5 -t 10m \
  --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

### 3. Stress Tests (Above Normal Load)
```bash
locust -f performance_tests/locustfile.py \
  --headless -u 200 -r 10 -t 15m \
  --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

### 4. Spike Tests (Sudden Load Increase)
```bash
locust -f performance_tests/locustfile.py \
  --headless -u 500 -r 50 -t 5m \
  --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

## Test Scenarios

### Authentication Scenarios
- User login
- User registration
- Token validation
- Profile retrieval

### Class Records Scenarios
- List class records
- List students
- List grades
- Get live counts (cached)
- Create class records

### Google Sheets Scenarios
- Get sheet data
- Get all sheets data
- Update cells
- Add students
- Get categories

### Notifications Scenarios
- List notifications
- Create notifications

## User Behavior Patterns

The tests simulate three types of users:

1. **Anonymous Users (30% load)**
   - Login attempts
   - Registration

2. **Authenticated Users (50% load)**
   - Browse class records
   - View sheets
   - Check notifications
   - Profile operations

3. **Active Teachers (20% load)**
   - Update grades
   - Add students
   - Import operations
   - Final grade operations

## Performance Thresholds

### Response Time Targets (p95)
- **Auth endpoints**: < 500ms
- **Read operations**: < 1000ms
- **Write operations**: < 2000ms
- **Google Sheets operations**: < 3000ms

### Success Rates
- **Target**: > 99% success rate under normal load
- **Acceptable**: > 95% success rate under stress conditions

### Throughput
- **Target**: Support 100+ concurrent users
- **Stress**: Identify breaking point (500+ concurrent users)

## Distributed Testing (High Load)

For testing with high load, you can run Locust in distributed mode:

### Master Node
```bash
locust -f performance_tests/locustfile.py \
  --master \
  --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

### Worker Nodes (on other machines)
```bash
locust -f performance_tests/locustfile.py \
  --worker \
  --master-host=<master-ip-address>
```

## Configuration

All configuration is in `performance_tests/config/settings.py`. Key settings:

- `PRODUCTION_API_URL`: Target API URL
- `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`: Test user credentials
- `TEST_SHEET_IDS`: Google Sheets IDs for testing
- `THRESHOLDS`: Response time thresholds
- `USER_WEIGHTS`: User behavior distribution

## Results

Test results are saved in `performance_tests/results/`:
- HTML reports for visual analysis
- CSV files for statistical analysis
- Logs for debugging

## Important Notes

1. **Production Impact**: Tests run against production. Be cautious!
2. **Test Data**: Use test/dummy Google Sheets, not production data
3. **Rate Limiting**: Google Sheets API has rate limits - be aware
4. **Scheduling**: Run initial tests during off-peak hours
5. **Monitoring**: Monitor Cloud Run metrics during tests

## Troubleshooting

### Tests failing with authentication errors
- Verify `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are set correctly
- Check that the test user account exists and is active

### Tests failing with sheet errors
- Verify `TEST_SHEET_IDS` are set and valid
- Ensure test sheets exist and are accessible
- Check Google Sheets API rate limits

### High error rates
- Check network connectivity
- Verify API endpoint URLs
- Review server logs for issues
- Consider reducing load (users/spawn rate)

## CI/CD Integration

To integrate into CI/CD pipelines, use headless mode with exit codes:

```bash
locust -f performance_tests/locustfile.py \
  --headless \
  --users 50 \
  --spawn-rate 5 \
  --run-time 10m \
  --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app \
  --html results/report.html \
  --csv results/stats \
  --exit-code-on-error 1
```

The `--exit-code-on-error` flag will cause the test to exit with code 1 if error rate exceeds threshold.

## Contributing

When adding new test scenarios:

1. Create scenario file in `performance_tests/test_scenarios/`
2. Import and use in `locustfile.py`
3. Update this documentation
4. Test thoroughly before running against production

## Resources

- [Locust Documentation](https://docs.locust.io/)
- [Locust Best Practices](https://docs.locust.io/en/stable/writing-a-locustfile.html)
- Performance Testing Plan: `../PERFORMANCE_TESTING_PLAN.md`

