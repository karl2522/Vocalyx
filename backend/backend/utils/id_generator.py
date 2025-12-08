import re
from typing import Optional


def generate_category_id(display_name: str) -> str:
    """
    Generate internal ID from category display name.
    
    CRITICAL: This logic MUST be identical to Apps Script fallback logic.
    Any changes here must be reflected in Apps Script.
    
    Logic:
    1. Convert to uppercase
    2. Replace all non-alphanumeric with underscore
    3. Remove consecutive underscores
    4. Trim leading/trailing underscores
    
    Args:
        display_name: Category display name (e.g., "Quiz", "Lab Activities")
    
    Returns:
        Internal ID (e.g., "QUIZ", "LAB_ACTIVITIES")
    
    Examples:
        "Quiz" -> "QUIZ"
        "Lab Activities" -> "LAB_ACTIVITIES"
        "Oral Recitation" -> "ORAL_RECITATION"
        "Quiz 1" -> "QUIZ_1"
        "Assignment #2" -> "ASSIGNMENT_2"
    """
    if not display_name:
        return ""
    
    # Step 1: Convert to uppercase and strip whitespace
    upper_name = str(display_name).upper().strip()
    
    if not upper_name:
        return ""
    
    # Step 2: Replace all non-alphanumeric characters with underscore
    # This matches JavaScript: .replace(/[^A-Z0-9]/g, "_")
    internal_id = re.sub(r'[^A-Z0-9]', '_', upper_name)
    
    # Step 3: Remove consecutive underscores (replace multiple _ with single _)
    internal_id = re.sub(r'_+', '_', internal_id)
    
    # Step 4: Remove leading and trailing underscores
    internal_id = internal_id.strip('_')
    
    return internal_id


def validate_category_id(internal_id: str) -> bool:
    """
    Validate that an internal ID is properly formatted.
    
    Args:
        internal_id: Internal ID to validate
    
    Returns:
        True if valid, False otherwise
    
    Valid format:
    - Must contain only uppercase letters, numbers, and underscores
    - Must not start or end with underscore
    - Must not have consecutive underscores
    """
    if not internal_id:
        return False
    
    # Must contain only uppercase letters, numbers, and underscores
    # Must not start or end with underscore
    # Must not have consecutive underscores
    pattern = r'^[A-Z0-9]+(_[A-Z0-9]+)*$'
    return bool(re.match(pattern, internal_id))


def test_id_generation_consistency():
    """
    Test cases to ensure ID generation is consistent.
    Run this to verify the logic matches Apps Script.
    
    Returns:
        bool: True if all tests pass, False otherwise
    """
    test_cases = [
        ("Quiz", "QUIZ"),
        ("Lab Activities", "LAB_ACTIVITIES"),
        ("Oral Recitation", "ORAL_RECITATION"),
        ("Quiz 1", "QUIZ_1"),
        ("Assignment #2", "ASSIGNMENT_2"),
        ("Lab Exercise 3", "LAB_EXERCISE_3"),
        ("Mid-Term Exam", "MID_TERM_EXAM"),
        ("Final Project", "FINAL_PROJECT"),
        ("   Quiz   ", "QUIZ"),  # Trim whitespace
        ("Quiz!!!", "QUIZ"),  # Remove special chars
        ("Quiz___1", "QUIZ_1"),  # Remove consecutive underscores
        ("_Quiz_", "QUIZ"),  # Remove leading/trailing underscores
        ("Quiz-1", "QUIZ_1"),  # Replace hyphen with underscore
        ("Quiz/Test", "QUIZ_TEST"),  # Replace slash with underscore
    ]
    
    print("Testing ID Generation Consistency:")
    print("=" * 60)
    
    all_passed = True
    for display_name, expected_id in test_cases:
        actual_id = generate_category_id(display_name)
        passed = actual_id == expected_id
        is_valid = validate_category_id(actual_id)
        
        status = "✅ PASS" if (passed and is_valid) else "❌ FAIL"
        
        if not (passed and is_valid):
            all_passed = False
        
        print(f"{status} | '{display_name}' -> '{actual_id}' (expected: '{expected_id}')")
        if not passed:
            print(f"       ⚠️  ID mismatch!")
        if not is_valid:
            print(f"       ⚠️  Invalid ID format!")
    
    print("=" * 60)
    if all_passed:
        print("✅ All tests passed! ID generation is consistent.")
    else:
        print("❌ Some tests failed! Review the logic.")
    
    return all_passed


if __name__ == "__main__":
    # Run tests when executed directly
    test_id_generation_consistency()


