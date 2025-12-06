#!/usr/bin/env python
"""Test script for Apps Script Service"""
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
from utils.google_apps_script_service import GoogleAppsScriptService
from utils.id_generator import generate_category_id

if __name__ == "__main__":
    print("\n" + "="*60)
    print("PHASE 3: Testing Apps Script Service")
    print("="*60 + "\n")
    
    # Initialize service
    service = GoogleAppsScriptService()
    
    if not service.web_app_url:
        print("❌ ERROR: GOOGLE_APPS_SCRIPT_WEB_APP_URL not configured!")
        print("   Please add it to backend/.env file:")
        print("   GOOGLE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/.../exec")
        sys.exit(1)
    
    print(f"✅ Web App URL configured: {service.web_app_url[:50]}...")
    print()
    
    # Test 1: Generate ID
    print("Test 1: Generate Internal ID")
    print("-" * 60)
    display_name = "Lab Activities"
    internal_id = generate_category_id(display_name)
    print(f"  Display Name: '{display_name}'")
    print(f"  Generated ID: '{internal_id}'")
    print()
    
    # Test 2: Register Category
    print("Test 2: Register Category via Apps Script")
    print("-" * 60)
    print(f"  Calling Apps Script with:")
    print(f"    displayName: '{display_name}'")
    print(f"    weight: 0.30")
    print(f"    internalId: '{internal_id}'")
    print()
    
    result = service.register_category(
        display_name=display_name,
        weight_decimal=0.30,
        internal_id=internal_id
    )
    
    print(f"  Response:")
    print(f"    success: {result.get('success')}")
    print(f"    message: {result.get('message')}")
    print(f"    internal_id: {result.get('internal_id')}")
    print(f"    written_id: {result.get('written_id')}")
    print()
    
    if result.get('success'):
        print("✅ Test 2 PASSED: Category registered successfully!")
        
        # Verify ID consistency
        if result.get('internal_id') == internal_id:
            print(f"✅ ID Consistency Verified: '{internal_id}' matches!")
        else:
            print(f"⚠️  ID Mismatch: Expected '{internal_id}', got '{result.get('internal_id')}'")
    else:
        print(f"❌ Test 2 FAILED: {result.get('error')}")
    
    print("\n" + "="*60)
    print("✅ PHASE 3 COMPLETE: Service tested!")
    print("="*60 + "\n")
    print("Next: Update backend endpoints (Phase 4)")

