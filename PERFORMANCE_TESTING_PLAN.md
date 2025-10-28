# Performance Testing Plan for Vocalyx

## Overview
This document outlines the plan for implementing performance testing for the deployed Vocalyx application using Locust.

## Branch Strategy Recommendation

### **Recommendation: Create in DEV Branch First, Then Merge to Production2**

**Rationale:**
1. **Development Branch First** - Performance tests should be developed and validated in a development branch before merging to production
2. **Production Branch for Running Tests** - Once validated, merge to production2 branch and run tests against the deployed production environment
3. **Isolation** - Keeps test development separate from production code initially
4. **CI/CD Integration** - Allows for integration into CI/CD pipelines later

**Workflow:**
```
DEV Branch → Develop & Validate Tests → Merge to Production2 → Run Against Production Environment
```

---

## Project Structure

```
Vocalyx/
├── performance_tests/
│   ├── __init__.py
│   ├── locustfile.py              # Main Locust test scenarios
│   ├── test_scenarios/
│   │   ├── __init__.py
│   │   ├── auth_scenarios.py      # Authentication endpoints
│   │   ├── classrecord_scenarios.py  # Class record operations
│   │   ├── sheets_scenarios.py    # Google Sheets operations
│   │   └── notifications_scenarios.py  # Notification endpoints
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── test_data.py           # Test data generators
│   │   └── helpers.py             # Helper functions
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py            # Test configuration
│   └── results/                   # Test results storage
│       ├── .gitignore
│       └── README.md
├── requirements-test.txt          # Additional test dependencies
└── README_PERFORMANCE_TESTING.md  # Documentation
```

---

## Step-by-Step Implementation Plan

### Phase 1: Setup and Configuration (Week 1)

#### 1.1 Environment Setup
- [ ] Create `performance_tests/` directory structure
- [ ] Create `requirements-test.txt` with Locust and dependencies
- [ ] Set up virtual environment for performance testing
- [ ] Configure test environment variables

#### 1.2 Configuration Files
- [ ] Create `config/settings.py` with:
  - Production API URL: `https://vocalyx-backend-64846917574.asia-southeast1.run.app/api`
  - Test user credentials (if needed)
  - Load test parameters (users, spawn rate, duration)
  - Target response time thresholds

#### 1.3 Test Data Preparation
- [ ] Create `utils/test_data.py` with:
  - Mock user data generators
  - Sample class record data
  - Sheet IDs for testing (use test/dummy sheets)
  - JWT token generation helpers

---

### Phase 2: Core Test Scenarios (Week 1-2)

#### 2.1 Authentication Scenarios (`auth_scenarios.py`)
**Endpoints to Test:**
- `POST /api/login/` - Login
- `POST /api/register/` - User registration
- `POST /api/token/refresh/` - Token refresh
- `GET /api/validate-token/` - Token validation
- `GET /api/profile/` - Get user profile

**Test Cases:**
- Login with valid credentials (high load)
- Concurrent login attempts (stress test)
- Token refresh under load
- Profile retrieval performance

#### 2.2 Class Records Scenarios (`classrecord_scenarios.py`)
**Endpoints to Test:**
- `GET /api/class-records/` - List class records
- `GET /api/students/` - List students
- `GET /api/grades/` - List grades
- `GET /api/class-records/live-counts/` - Cached live counts
- `POST /api/class-records/` - Create class record

**Test Cases:**
- Concurrent retrieval of class records
- Large dataset pagination performance
- Live counts caching effectiveness

#### 2.3 Google Sheets Scenarios (`sheets_scenarios.py`)
**Endpoints to Test:**
- `GET /api/sheets/service-account/<sheet_id>/data/` - Get sheet data
- `POST /api/sheets/service-account/<sheet_id>/update-cell/` - Update cell
- `GET /api/sheets/service-account/<sheet_id>/all-sheets-data/` - Get all sheets
- `POST /api/sheets/<sheet_id>/add-student/` - Add student

**Test Cases:**
- Read-heavy scenarios (simulating dashboard loads)
- Write operations (grading updates)
- Batch operations performance
- Large sheet data retrieval

#### 2.4 Notifications Scenarios (`notifications_scenarios.py`)
**Endpoints to Test:**
- `GET /api/notifications/` - List notifications
- `POST /api/notifications/` - Create notification

**Test Cases:**
- Notification retrieval under load
- Real-time notification performance

---

### Phase 3: Main Locust File (Week 2)

#### 3.1 `locustfile.py` Structure
```python
# Key Components:
- Locust HttpUser classes for each scenario type
- Task weights for realistic user behavior
- Wait time distributions
- Custom stats for monitoring
- Failure handling and logging
```

**User Behavior Patterns:**
1. **Anonymous Users** (30% load)
   - Login attempts
   - Registration

2. **Authenticated Users** (50% load)
   - Browse class records
   - View sheets
   - Check notifications
   - Profile operations

3. **Active Teachers** (20% load)
   - Update grades
   - Add students
   - Import operations
   - Final grade operations

---

### Phase 4: Advanced Features (Week 2-3)

#### 4.1 Custom Metrics
- [ ] Track custom metrics:
  - Google Sheets API call latency
  - Database query times
  - Cache hit rates
  - Authentication latency

#### 4.2 Realistic Load Patterns
- [ ] Implement ramp-up scenarios (start slow, increase load)
- [ ] Spike testing (sudden load increases)
- [ ] Endurance testing (sustained load over time)
- [ ] Stress testing (load beyond expected capacity)

#### 4.3 Reporting
- [ ] Configure HTML report generation
- [ ] Set up CSV export for analysis
- [ ] Create performance baseline metrics
- [ ] Document acceptable thresholds

---

### Phase 5: Test Execution Strategy (Week 3)

#### 5.1 Pre-Production Checklist
- [ ] Notify team before running tests
- [ ] Ensure test data is isolated (use test sheets, not production)
- [ ] Schedule tests during low-traffic periods initially
- [ ] Set up monitoring/alerting for production environment

#### 5.2 Test Execution Types

**1. Smoke Tests (Quick Validation)**
```bash
locust -f locustfile.py --headless -u 10 -r 2 -t 2m --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

**2. Load Tests (Normal Load)**
```bash
locust -f locustfile.py --headless -u 50 -r 5 -t 10m --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

**3. Stress Tests (Above Normal Load)**
```bash
locust -f locustfile.py --headless -u 200 -r 10 -t 15m --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

**4. Spike Tests (Sudden Load Increase)**
```bash
locust -f locustfile.py --headless -u 500 -r 50 -t 5m --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

#### 5.3 Distributed Testing
- [ ] Set up Locust master-worker configuration for high load
- [ ] Run tests from multiple locations if needed
- [ ] Monitor Cloud Run scaling behavior

---

### Phase 6: Integration and Automation (Week 3-4)

#### 6.1 CI/CD Integration
- [ ] Create GitHub Actions workflow for scheduled tests
- [ ] Configure to run tests against staging first (if available)
- [ ] Set up automated reporting

#### 6.2 Monitoring Integration
- [ ] Integrate with Cloud Run monitoring
- [ ] Track metrics during tests:
  - Request latency (p50, p95, p99)
  - Error rates
  - Throughput (requests/second)
  - Instance scaling
  - Memory/CPU utilization

#### 6.3 Documentation
- [ ] Document test scenarios
- [ ] Create runbook for executing tests
- [ ] Document baseline performance metrics
- [ ] Create performance improvement recommendations process

---

## Dependencies to Add

### `requirements-test.txt` Contents:
```
locust>=2.17.0
requests>=2.31.0
faker>=19.0.0          # For generating test data
python-dotenv>=1.0.0   # For environment variables
pytest>=7.4.0          # Optional: for test validation
```

---

## Key Performance Metrics to Track

### Response Time Thresholds (Recommended)
- **Auth endpoints**: < 500ms (p95)
- **Read operations**: < 1000ms (p95)
- **Write operations**: < 2000ms (p95)
- **Google Sheets operations**: < 3000ms (p95)

### Success Rates
- **Target**: > 99% success rate under normal load
- **Acceptable**: > 95% success rate under stress conditions

### Throughput
- **Target**: Support 100+ concurrent users
- **Stress**: Identify breaking point (500+ concurrent users)

---

## Risk Considerations

1. **Production Impact**
   - Use test/dummy Google Sheets to avoid affecting real data
   - Schedule initial tests during off-peak hours
   - Monitor Cloud Run costs

2. **Rate Limiting**
   - Google Sheets API has rate limits (be aware)
   - May need to adjust test scenarios if rate limits are hit

3. **Authentication**
   - May need test user accounts
   - Consider using service account tokens for certain endpoints

4. **Data Isolation**
   - Ensure tests don't interfere with production data
   - Use separate test sheet IDs

---

## Test Execution Commands Reference

### Basic Execution
```bash
# Web UI mode (interactive)
locust -f performance_tests/locustfile.py --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app

# Headless mode (automated)
locust -f performance_tests/locustfile.py \
  --headless \
  --users 50 \
  --spawn-rate 5 \
  --run-time 10m \
  --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app \
  --html results/report.html \
  --csv results/stats
```

### Distributed Execution (High Load)
```bash
# Master node
locust -f performance_tests/locustfile.py --master --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app

# Worker nodes (run on multiple machines)
locust -f performance_tests/locustfile.py --worker --master-host=<master-ip>
```

---

## Success Criteria

- [ ] All critical endpoints have performance tests
- [ ] Tests can be run against production environment
- [ ] Baseline performance metrics established
- [ ] Performance regressions can be detected
- [ ] Tests integrated into development workflow
- [ ] Team trained on running and interpreting tests

---

## Next Steps After Implementation

1. **Baseline Establishment**: Run initial tests to establish performance baselines
2. **Regular Monitoring**: Schedule weekly or monthly performance tests
3. **Performance Optimization**: Use test results to identify bottlenecks
4. **Capacity Planning**: Use stress test results for capacity planning
5. **Alerting**: Set up alerts for performance degradation

---

## Notes

- Tests should be run from a stable network environment
- Consider running tests from multiple geographic locations if users are global
- Keep test scripts version-controlled and reviewed
- Regularly update test scenarios as new features are added
- Document any production incidents related to performance testing

---

**Last Updated**: [Date]
**Owner**: [Your Name/Team]
**Status**: Planning Phase

