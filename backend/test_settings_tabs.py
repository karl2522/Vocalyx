"""
Quick test script for Phase 2: SETTINGS Tabs functionality

Run this from the backend directory:
    python test_settings_tabs.py
"""

import os
import sys
import django

# Add the backend directory to Python path (where manage.py is)
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_dir)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# Import from utils directly (since we're in backend/backend/ context now)
from utils.google_apps_script_service import determine_sheet_type

def test_determine_sheet_type():
    """Test the determine_sheet_type function"""
    print("=" * 60)
    print("Testing determine_sheet_type() function")
    print("=" * 60)
    
    test_cases = [
        ("Midterm", "midterm"),
        ("midterm", "midterm"),
        ("MIDTERM", "midterm"),
        ("Midterm Exam", "midterm"),
        ("Midterm Sheet", "midterm"),
        ("Final", "final"),
        ("final", "final"),
        ("FINAL", "final"),
        ("Final Exam", "final"),
        ("Final Sheet", "final"),
        ("Prefinal", None),  # Should return None (not final)
        ("Prefinal Exam", None),
        ("Prefinal Sheet", None),
        ("Some Other Sheet", None),
        (None, None),
        ("", None),
    ]
    
    passed = 0
    failed = 0
    
    for sheet_name, expected in test_cases:
        result = determine_sheet_type(sheet_name)
        if result == expected:
            status = "✅ PASS"
            passed += 1
        else:
            status = "❌ FAIL"
            failed += 1
        
        sheet_display = f"'{sheet_name}'" if sheet_name else "None"
        expected_display = f"'{expected}'" if expected else "None"
        result_display = f"'{result}'" if result else "None"
        
        print(f"{status} | Input: {sheet_display:20} | Got: {result_display:10} | Expected: {expected_display}")
    
    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed == 0:
        print("✅ All tests passed!")
        return True
    else:
        print("❌ Some tests failed!")
        return False

if __name__ == "__main__":
    success = test_determine_sheet_type()
    sys.exit(0 if success else 1)

