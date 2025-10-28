# Performance Test Results

This directory stores the results from Locust performance tests.

## File Types

- `*.html` - HTML reports from Locust test runs
- `*.csv` - CSV exports of statistics
- `*.log` - Test execution logs

## Usage

Test results are automatically generated when running Locust in headless mode with the `--html` and `--csv` flags:

```bash
locust -f locustfile.py \
  --headless \
  --users 50 \
  --spawn-rate 5 \
  --run-time 10m \
  --host=https://vocalyx-backend-64846917574.asia-southeast1.run.app \
  --html results/report.html \
  --csv results/stats
```

## Best Practices

1. **Naming Convention**: Include date and test type in filenames
   - Example: `load-test-2024-01-15-report.html`
   - Example: `stress-test-2024-01-15-stats.csv`

2. **Storage**: Archive old results periodically
3. **Analysis**: Compare results over time to identify performance trends
4. **Baseline**: Keep baseline results for comparison

