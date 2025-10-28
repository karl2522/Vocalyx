"""
Helper functions for performance tests.
"""
import json
import time
from typing import Dict, Optional

def get_auth_headers(token: Optional[str] = None) -> Dict[str, str]:
    """
    Get authentication headers for API requests.
    
    Args:
        token: JWT token. If None, returns headers without authorization.
    
    Returns:
        Dictionary with headers.
    """
    headers = {
        'Content-Type': 'application/json',
    }
    
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    return headers

def extract_token_from_response(response) -> Optional[str]:
    """
    Extract JWT token from login/register response.
    
    Args:
        response: Locust response object.
    
    Returns:
        JWT token string or None if not found.
    """
    try:
        if response.status_code == 200:
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
    except (json.JSONDecodeError, AttributeError, TypeError):
        pass
    
    return None

def log_response_time(response, endpoint_name: str, threshold_ms: int = 1000, start_time: Optional[float] = None):
    """
    Log response time and mark as failure if exceeds threshold.
    
    Args:
        response: Locust response context manager or response object.
        endpoint_name: Name of the endpoint for logging.
        threshold_ms: Threshold in milliseconds.
        start_time: Optional start time (from time.time()) for manual timing calculation.
    
    Note: Locust automatically tracks response times, but this function
    allows us to add custom threshold validation.
    """
    response_time_ms = None
    
    # Try to get response time from Locust's response context manager
    # Locust tracks response time automatically and stores it in the context manager
    try:
        # Method 1: Try accessing response_time directly (available in Locust 2.x context manager)
        if hasattr(response, 'response_time'):
            response_time_ms = getattr(response, 'response_time', None)
            # response_time is already in milliseconds in Locust
        # Method 2: Check if response has elapsed attribute (standard requests.Response)
        elif hasattr(response, 'elapsed'):
            response_time_ms = response.elapsed.total_seconds() * 1000
        # Method 3: Try to get from underlying response object
        elif hasattr(response, 'response'):
            underlying = response.response
            if hasattr(underlying, 'response_time'):
                response_time_ms = underlying.response_time
            elif hasattr(underlying, 'elapsed'):
                response_time_ms = underlying.elapsed.total_seconds() * 1000
            else:
                response_time_ms = None
        else:
            response_time_ms = None
        
        # Method 4: If we still don't have it and have start_time, calculate manually
        if response_time_ms is None and start_time is not None:
            response_time_ms = (time.time() - start_time) * 1000
            
    except (AttributeError, TypeError):
        # Fallback to manual timing if available
        if start_time is not None:
            response_time_ms = (time.time() - start_time) * 1000
        else:
            response_time_ms = None
    
    # If we can't determine response time, skip threshold check
    # Locust will still track it automatically in its stats
    if response_time_ms is None:
        return None
    
    # Check threshold if we have a response time
    if response_time_ms is not None and response_time_ms > threshold_ms:
        response.failure(f"{endpoint_name} exceeded threshold: {response_time_ms:.2f}ms > {threshold_ms}ms")
    
    return response_time_ms

def validate_response(response, expected_status: int = 200) -> bool:
    """
    Validate that response has expected status code.
    
    IMPORTANT: With catch_response=True, Locust only records response times
    if response.success() or response.failure() is called.
    
    Args:
        response: Locust response object.
        expected_status: Expected HTTP status code.
    
    Returns:
        True if status matches, False otherwise.
    """
    if response.status_code != expected_status:
        response.failure(
            f"Expected status {expected_status}, got {response.status_code}. "
            f"Response: {response.text[:200]}"
        )
        return False
    # CRITICAL: Call success() to ensure Locust records the response time
    response.success()
    return True

def safe_json_parse(response) -> Optional[dict]:
    """
    Safely parse JSON response.
    
    Args:
        response: Locust response object.
    
    Returns:
        Parsed JSON dict or None if parsing fails.
    """
    try:
        return response.json()
    except (json.JSONDecodeError, AttributeError):
        response.failure(f"Failed to parse JSON response: {response.text[:200]}")
        return None

def exponential_backoff(base_delay: float = 1.0, max_delay: float = 60.0, factor: float = 2.0):
    """
    Generator for exponential backoff delays.
    
    Args:
        base_delay: Initial delay in seconds.
        max_delay: Maximum delay in seconds.
        factor: Multiplier for each iteration.
    
    Yields:
        Delay time in seconds.
    """
    delay = base_delay
    while True:
        yield min(delay, max_delay)
        delay *= factor

