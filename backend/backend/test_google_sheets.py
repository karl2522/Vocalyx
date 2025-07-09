#!/usr/bin/env python
"""
Test script for Google Sheets integration
Run this to diagnose Google Sheets API issues
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings
from utils.google_service_account_sheets import GoogleServiceAccountSheets
import traceback

def test_google_sheets_service():
    """Test the Google Sheets service account functionality"""
    
    print("🔍 Google Sheets Service Test")
    print("=" * 50)
    
    # 1. Check service account credentials
    print("\n1. Checking Service Account Credentials:")
    if not settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS:
        print("❌ No service account credentials found!")
        print(f"   Looking for file at: {os.path.join(settings.BASE_DIR.parent, 'vocalyx2-service-account.json')}")
        return False
    
    print("✅ Service account credentials loaded")
    print(f"   Email: {settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS.get('client_email')}")
    print(f"   Project: {settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS.get('project_id')}")
    
    # 2. Check template ID
    print(f"\n2. Template ID: {settings.GOOGLE_SHEETS_TEMPLATE_ID}")
    
    # 3. Test service initialization
    print("\n3. Testing Service Initialization:")
    try:
        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        print("✅ Service initialized successfully")
    except Exception as e:
        print(f"❌ Service initialization failed: {str(e)}")
        print(f"   Full error: {traceback.format_exc()}")
        return False
    
    # 4. Test template access
    print(f"\n4. Testing Template Access:")
    template_id = settings.GOOGLE_SHEETS_TEMPLATE_ID
    
    try:
        # Try to get template info using Drive API
        template_info = service.drive_service.files().get(
            fileId=template_id,
            fields='id,name,owners,permissions'
        ).execute()
        
        print("✅ Template sheet accessible")
        print(f"   Name: {template_info.get('name')}")
        print(f"   Owners: {[owner.get('emailAddress') for owner in template_info.get('owners', [])]}")
        
    except Exception as e:
        print(f"❌ Cannot access template sheet: {str(e)}")
        print("   This might be the cause of 403 errors!")
        print("   Solutions:")
        print("   1. Make sure the template sheet is shared with the service account email")
        print("   2. Or make the template sheet public (Anyone with link can view)")
        return False
    
    # 5. Test sheet copying
    print(f"\n5. Testing Sheet Copying:")
    test_name = "Vocalyx Test Sheet"
    
    try:
        copy_result = service.copy_template_sheet(
            template_file_id=template_id,
            new_name=test_name
        )
        
        if copy_result['success']:
            test_sheet_id = copy_result['file']['id']
            print("✅ Sheet copying successful")
            print(f"   New sheet ID: {test_sheet_id}")
            print(f"   View URL: {copy_result['file']['webViewLink']}")
            
            # Clean up: Delete the test sheet
            try:
                service.drive_service.files().delete(fileId=test_sheet_id).execute()
                print("✅ Test sheet deleted successfully")
            except Exception as e:
                print(f"⚠️ Could not delete test sheet: {str(e)}")
                print(f"   You may need to manually delete sheet ID: {test_sheet_id}")
                
        else:
            print(f"❌ Sheet copying failed: {copy_result.get('error')}")
            print(f"   Details: {copy_result.get('details')}")
            return False
            
    except Exception as e:
        print(f"❌ Sheet copying exception: {str(e)}")
        print(f"   Full error: {traceback.format_exc()}")
        return False
    
    print(f"\n🎉 All tests passed! Google Sheets integration should work.")
    return True

def test_existing_sheets():
    """Check existing ClassRecords with Google Sheets"""
    
    print("\n" + "=" * 50)
    print("🔍 Existing ClassRecords with Google Sheets")
    print("=" * 50)
    
    from classrecord.models import ClassRecord
    
    records_with_sheets = ClassRecord.objects.filter(google_sheet_id__isnull=False)
    
    if not records_with_sheets.exists():
        print("📝 No ClassRecords with Google Sheets found")
        return
    
    for record in records_with_sheets:
        print(f"\nRecord: {record.name}")
        print(f"  ID: {record.id}")
        print(f"  User: {record.user.email}")
        print(f"  Sheet ID: {record.google_sheet_id}")
        print(f"  Sheet URL: {record.google_sheet_url}")
        
        # Test if the sheet is accessible
        if settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS:
            try:
                service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
                sheet_info = service.drive_service.files().get(
                    fileId=record.google_sheet_id,
                    fields='id,name,permissions'
                ).execute()
                print(f"  ✅ Sheet accessible: {sheet_info.get('name')}")
                
                # Check if user has access
                permissions = sheet_info.get('permissions', [])
                user_has_access = any(
                    perm.get('emailAddress') == record.user.email 
                    for perm in permissions
                )
                
                if user_has_access:
                    print(f"  ✅ User has access to sheet")
                else:
                    print(f"  ❌ User does not have access to sheet")
                    print(f"     This is likely why you get 403 errors!")
                    
            except Exception as e:
                print(f"  ❌ Cannot access sheet: {str(e)}")

if __name__ == "__main__":
    print("🚀 Starting Google Sheets Diagnosis...")
    
    # Test the service
    service_ok = test_google_sheets_service()
    
    # Check existing sheets
    test_existing_sheets()
    
    print("\n" + "=" * 50)
    if service_ok:
        print("✅ Google Sheets service is working correctly!")
        print("\n💡 If you're still getting 403 errors:")
        print("   1. Check that ClassRecords have valid google_sheet_id")
        print("   2. Verify the user has been granted access to the sheets")
        print("   3. Make sure the sheets exist and weren't deleted")
    else:
        print("❌ Google Sheets service has issues that need to be fixed")
        print("\n🔧 Next steps:")
        print("   1. Fix the service account setup")
        print("   2. Ensure template sheet is accessible")
        print("   3. Re-run this test") 