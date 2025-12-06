#!/usr/bin/env python
"""Quick test script for ID generator"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.utils.id_generator import generate_category_id, validate_category_id, test_id_generation_consistency

if __name__ == "__main__":
    print("\n" + "="*60)
    print("PHASE 1: Testing ID Generator")
    print("="*60 + "\n")
    
    # Quick manual tests
    print("Quick Tests:")
    print("-" * 60)
    test1 = generate_category_id("Quiz")
    print(f"  'Quiz' -> '{test1}' (expected: 'QUIZ') {'✅' if test1 == 'QUIZ' else '❌'}")
    
    test2 = generate_category_id("Lab Activities")
    print(f"  'Lab Activities' -> '{test2}' (expected: 'LAB_ACTIVITIES') {'✅' if test2 == 'LAB_ACTIVITIES' else '❌'}")
    
    test3 = generate_category_id("Quiz 1")
    print(f"  'Quiz 1' -> '{test3}' (expected: 'QUIZ_1') {'✅' if test3 == 'QUIZ_1' else '❌'}")
    
    print("\nValidation Tests:")
    print("-" * 60)
    val1 = validate_category_id("QUIZ")
    print(f"  'QUIZ' is valid: {val1} {'✅' if val1 else '❌'}")
    
    val2 = validate_category_id("LAB_ACTIVITIES")
    print(f"  'LAB_ACTIVITIES' is valid: {val2} {'✅' if val2 else '❌'}")
    
    val3 = validate_category_id("invalid-id!")
    print(f"  'invalid-id!' is valid: {val3} {'✅' if not val3 else '❌'} (should be False)")
    
    print("\n" + "="*60)
    print("Running Full Test Suite:")
    print("="*60 + "\n")
    
    # Run full test suite
    result = test_id_generation_consistency()
    
    print("\n" + "="*60)
    if result:
        print("✅ PHASE 1 COMPLETE: All tests passed!")
    else:
        print("❌ PHASE 1 FAILED: Some tests failed. Review the output above.")
    print("="*60 + "\n")

