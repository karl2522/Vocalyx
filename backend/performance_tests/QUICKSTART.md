# Quick Start Guide

## Installation

1. Install test dependencies:
```bash
cd backend
pip install -r requirements-test.txt
```

## Configuration

2. Create a `.env` file in the `backend/` directory (optional but recommended):
```env
TEST_USER_EMAIL=your-test-email@example.com
TEST_USER_PASSWORD=your-test-password
TEST_SHEET_IDS=your-test-sheet-id-1,your-test-sheet-id-2
```

## Running Tests

### Option 1: Web UI (Recommended for first run)
```bash
cd backend
locust -f performance_tests/locustfile.py --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

Then open http://localhost:8089 in your browser to start the test.

### Option 2: Headless Mode (Automated)
```bash
cd backend
locust -f performance_tests/locustfile.py \
  --headless \
  --users 10 \
  --spawn-rate 2 \
  --run-time 2m \
  --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

### Option 3: With HTML Report
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

### Smoke Test (Quick check)
```bash
locust -f performance_tests/locustfile.py --headless -u 10 -r 2 -t 2m --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

### Load Test (Normal load)
```bash
locust -f performance_tests/locustfile.py --headless -u 50 -r 5 -t 10m --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app
```

## Troubleshooting

**Import errors?** Make sure you're running from the `backend/` directory, not `backend/backend/`.

**Authentication errors?** Verify your `.env` file has correct `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`.

**Sheet errors?** Make sure `TEST_SHEET_IDS` in `.env` contains valid test sheet IDs.

## Next Steps

See `../README_PERFORMANCE_TESTING.md` for detailed documentation.

