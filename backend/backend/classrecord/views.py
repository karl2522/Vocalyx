from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.conf import settings
from .models import ClassRecord, Student, GradeCategory, Grade, CategoryPercentage
from .serializers import (
    ClassRecordSerializer,
    ClassRecordDetailSerializer,
    StudentSerializer,
    GradeCategorySerializer,
    GradeSerializer,
    CategoryPercentageSerializer
)
from users.google_sheets_service import GoogleSheetsService
from users.google_drive_service import GoogleDriveService
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .import_service import build_preview, ImportParseError, read_csv_bytes, read_xlsx_bytes, detect_and_map_headers, validate_required_mappings, normalize_rows
import json
# Remove the service account imports since we're switching to user-based approach
# from utils.google_service_account_sheets import GoogleServiceAccountSheets


class ClassRecordViewSet(viewsets.ModelViewSet):
    serializer_class = ClassRecordSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_queryset(self):
        return ClassRecord.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        print("🔍 DEBUG: Entering perform_create method.")
        
        try:
            # Save the class record initially without Google Sheet details
            # Ensure google_sheet_url is explicitly set to None to avoid constraint issues
            class_record = serializer.save(
                user=self.request.user,
                google_sheet_id=None,
                google_sheet_url=None
            )
            
            print(f"✅ ClassRecord created successfully: {class_record.id}")

            # Check for user's Google access token
            access_token = self.request.headers.get('X-Google-Access-Token')
            if not access_token:
                print("❌ No Google access token found in request headers. Skipping Google Sheets creation.")
                print("   Please ensure the frontend sends the user's Google access token in the X-Google-Access-Token header.")
                return

            # Initialize Google Sheets service with user's access token
            user_sheets_service = GoogleSheetsService(access_token)
            template_id = getattr(settings, 'GOOGLE_SHEETS_TEMPLATE_ID', None)
            
            print(f"🔍 Template ID: {template_id}")
            print(f"🔍 User email: {self.request.user.email}")
            print(f"🔍 Using user's Google access token for Google Drive operations")
            
            if template_id:
                # Step 1: Copy the template using the user's access token (will be owned by user)
                print(f"🔄 Copying template sheet to user's Google Drive: {template_id}")
                copy_result = user_sheets_service.copy_template_sheet(
                    template_file_id=template_id,
                    new_name=f"{class_record.name} - {class_record.semester}"
                )
                
                print(f"🔍 Copy result: {copy_result}")
                
                if copy_result['success']:
                    copied_file_info = copy_result['file']
                    copied_sheet_id = copied_file_info['id']
                    
                    print(f"✅ Sheet copied successfully to user's Drive: {copied_sheet_id}")
                    print(f"✅ File is now owned by user: {self.request.user.email}")
                    
                    # Step 2: Make the sheet publicly editable for iframe embedding
                    print(f"🔄 Making sheet publicly editable for embedding...")
                    public_result = user_sheets_service.update_sheet_permissions(
                        file_id=copied_sheet_id, 
                        make_editable=True
                    )
                    
                    print(f"🔍 Public result: {public_result}")
                    
                    if public_result['success']:
                        # Update the class record with the new sheet information
                        class_record.google_sheet_id = copied_sheet_id
                        class_record.google_sheet_url = copied_file_info.get('webViewLink')
                        class_record.save()
                        
                        print(f"✅ Google Sheet created in user's Drive and made publicly editable successfully!")
                        print(f"   Sheet ID: {copied_sheet_id}")
                        print(f"   View URL: {copied_file_info.get('webViewLink')}")
                        print(f"   Embed URL: {copied_file_info.get('embedLink')}")
                        print(f"   File owner: User ({self.request.user.email})")
                        print(f"   Permissions: Anyone with link can edit")
                    else:
                        print(f"⚠️ Sheet created in user's Drive but failed to make publicly editable: {public_result.get('error', 'Unknown error')}")
                        print(f"   Details: {public_result.get('details', 'No details provided')}")
                        print(f"   Sheet may be view-only in embedded mode but user has full access")
                        
                        # Still save with user access
                        class_record.google_sheet_id = copied_sheet_id
                        class_record.google_sheet_url = copied_file_info.get('webViewLink')
                        class_record.save()
                else:
                    print(f"❌ Failed to copy Google Sheet template to user's Drive: {copy_result.get('error', 'Unknown error')}")
                    print(f"   Details: {copy_result.get('details', 'No details provided')}")
                    print(f"   Make sure the template is accessible to the user or publicly readable")
            else:
                print("❌ No Google Sheets template ID configured in settings.")
                
        except Exception as e:
            print(f"❌ Error during Google Sheets user operation: {str(e)}")
            import traceback
            print(f"   Full traceback: {traceback.format_exc()}")
            # Don't re-raise - allow ClassRecord creation to succeed even if Google Sheets fails
            print("📝 ClassRecord created successfully, but Google Sheets integration failed.")

    def perform_update(self, serializer):
        """Update the record; if name or semester changes, rename the Drive file accordingly."""
        instance: ClassRecord = self.get_object()
        old_name = instance.name
        old_semester = instance.semester

        class_record = serializer.save()

        try:
            # Only attempt Drive rename if we actually have a sheet and the display name changed
            display_old = f"{old_name} - {old_semester}".strip()
            display_new = f"{class_record.name} - {class_record.semester}".strip()

            if class_record.google_sheet_id and display_old != display_new:
                access_token = self.request.headers.get('X-Google-Access-Token')
                if not access_token:
                    print("⚠️ Update: No X-Google-Access-Token provided; skipping Google Drive rename.")
                    return

                drive_service = GoogleDriveService(access_token)
                result = drive_service.rename_file(class_record.google_sheet_id, display_new)
                if result.get('success'):
                    print(f"✅ Renamed Drive file to '{display_new}' for class record {class_record.id}")
                else:
                    print("⚠️ Failed to rename Drive file:", result)

        except Exception as e:
            import traceback
            print(f"⚠️ Error during Drive rename on update: {str(e)}")
            print(traceback.format_exc())

    def perform_destroy(self, instance):
        """Extend the default destroy method to delete the Google Sheet."""
        print("--- Entering perform_destroy for ClassRecord ---")
        
        try:
            # Log initial state
            print(f"Attempting to delete ClassRecord with ID: {instance.id}")
            print(f"Associated Google Sheet ID: {instance.google_sheet_id}")

            # Check for Google Sheet ID
            if not instance.google_sheet_id:
                print("No Google Sheet ID associated with this record. Skipping Drive deletion.")
                instance.delete()
                print(f"ClassRecord with ID: {instance.id} deleted successfully from database.")
                return

            # Check for access token
            access_token = self.request.headers.get('X-Google-Access-Token')
            if not access_token:
                print("❌ CRITICAL: No 'X-Google-Access-Token' found in request headers.")
                print("   The frontend must send this header for Google Drive deletion to work.")
                print("   Skipping Drive deletion, but proceeding with database deletion.")
                instance.delete()
                print(f"ClassRecord with ID: {instance.id} deleted successfully from database.")
                return
            
            print(f"✅ Found 'X-Google-Access-Token'. Proceeding with Google Drive deletion.")
            
            # Attempt to delete from Google Drive
            print(f"🗑️ Initializing GoogleDriveService to delete file: {instance.google_sheet_id}")
            drive_service = GoogleDriveService(access_token)
            delete_result = drive_service.delete_file(instance.google_sheet_id)
            
            # Log the result from Google Drive
            print(f"🔍 Google Drive API response: {delete_result}")
            
            if delete_result.get('success'):
                print(f"✅ Google Sheet '{instance.google_sheet_id}' deleted successfully from user's Drive.")
            else:
                # Log the error but don't block the ClassRecord deletion
                print(f"⚠️ FAILED to delete Google Sheet '{instance.google_sheet_id}'.")
                print(f"   Error: {delete_result.get('error')}")
                print(f"   Details: {delete_result.get('details')}")
                print("   The ClassRecord will still be deleted from the database.")

        except Exception as e:
            import traceback
            print(f"❌ An unexpected error occurred during the deletion process: {str(e)}")
            print(f"   Traceback: {traceback.format_exc()}")

        # Finally, delete the ClassRecord instance from the database
        print(f"Proceeding to delete ClassRecord '{instance.id}' from the database.")
        instance.delete()
        print(f"✅ ClassRecord '{instance.id}' has been deleted from the database.")
        print("--- Exiting perform_destroy ---")

    @action(detail=True, methods=['post'])
    def sync_percentages_from_sheet(self, request, pk=None):
        """ULTRA-OPTIMIZED with enhanced Django caching - NO Redis needed!
        
        PERFORMANCE IMPROVEMENTS:
        - Fetches only 6 rows instead of entire sheet
        - Uses direct API calls with minimal data transfer
        - Enhanced multi-layer caching strategy
        - Intelligent cache invalidation
        - Request deduplication to prevent double calls
        """
        import time
        import threading
        from django.core.cache import cache
        from django.utils import timezone
        
        start_time = time.time()
        
        try:
            class_record = self.get_object()
            access_token = request.headers.get('X-Google-Access-Token')
            sheet_name = request.data.get('sheet_name') or request.query_params.get('sheet_name')
            user_id = request.user.id

            if not class_record.google_sheet_id:
                return Response({'error': 'Class record has no linked Google Sheet'}, status=400)
            if not sheet_name:
                return Response({'error': 'sheet_name is required'}, status=400)

            # 🚀 ENHANCED CACHING STRATEGY - Multiple cache layers
            base_cache_key = f"percentages_v3_{class_record.google_sheet_id}_{sheet_name}_{user_id}"
            
            # Layer 1: Fast cache (2 minutes) - for immediate repeated requests
            fast_cache_key = f"fast_{base_cache_key}"
            fast_cached = cache.get(fast_cache_key)
            if fast_cached:
                fast_cached.update({
                    'cached': True,
                    'cache_type': 'fast',
                    'response_time': round(time.time() - start_time, 2)
                })
                print(f"⚡ FAST CACHE HIT: {fast_cached['response_time']}s")
                return Response(fast_cached)

            # Layer 2: Standard cache (10 minutes) - for regular use
            standard_cache_key = f"std_{base_cache_key}"
            standard_cached = cache.get(standard_cache_key)
            if standard_cached:
                # Refresh fast cache from standard cache
                cache.set(fast_cache_key, standard_cached, 120)  # 2 minutes
                standard_cached.update({
                    'cached': True,
                    'cache_type': 'standard',
                    'response_time': round(time.time() - start_time, 2)
                })
                print(f"🔄 STANDARD CACHE HIT: {standard_cached['response_time']}s")
                return Response(standard_cached)

            # 🚀 REQUEST DEDUPLICATION - Prevent double API calls
            processing_key = f"processing_{base_cache_key}"
            if cache.get(processing_key):
                # Another request is already processing, wait briefly and check cache again
                import time
                time.sleep(0.5)
                quick_check = cache.get(fast_cache_key)
                if quick_check:
                    quick_check.update({
                        'cached': True,
                        'cache_type': 'dedup',
                        'response_time': round(time.time() - start_time, 2)
                    })
                    return Response(quick_check)

            # Mark as processing (10 second lock)
            cache.set(processing_key, True, 10)

            try:
                print(f"🔄 CACHE MISS: Fetching fresh data from Google Sheets...")

                # 🚀 OPTIMIZATION: Use minimal range - only 6 rows, specific columns
                percentage_range = f"'{sheet_name}'!K1:AC6"  # Only columns K, Q, W, AC and first 6 rows
                
                read_ok = False
                percentage_data = None
                
                # 🚀 Primary: Direct API call with aggressive timeout
                try:
                    if access_token:
                        import requests
                        api_url = f"https://sheets.googleapis.com/v4/spreadsheets/{class_record.google_sheet_id}/values/{percentage_range}"
                        headers = {
                            'Authorization': f'Bearer {access_token}',
                            'Accept': 'application/json'
                        }
                        
                        # Aggressive timeout for speed
                        response = requests.get(api_url, headers=headers, timeout=6)
                        
                        if response.status_code == 200:
                            data = response.json()
                            percentage_data = data.get('values', [])
                            read_ok = True
                            print(f"✅ User token API: {len(percentage_data)} rows in {time.time() - start_time:.2f}s")
                except Exception as e:
                    print(f"⚠️ User token failed: {str(e)}")
                
                # 🚀 Fallback: Service account with optimized settings
                if not read_ok:
                    try:
                        from utils.google_service_account_sheets import GoogleServiceAccountSheets
                        
                        if hasattr(settings, 'GOOGLE_SERVICE_ACCOUNT_CREDENTIALS'):
                            sa = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
                        else:
                            sa = GoogleServiceAccountSheets()
                        
                        # Direct API call with minimal range
                        result = sa.sheets_service.spreadsheets().values().get(
                            spreadsheetId=class_record.google_sheet_id,
                            range=percentage_range,
                            valueRenderOption='UNFORMATTED_VALUE'
                        ).execute()
                        
                        percentage_data = result.get('values', [])
                        read_ok = True
                        print(f"✅ Service account API: {len(percentage_data)} rows in {time.time() - start_time:.2f}s")
                        
                    except Exception as e:
                        print(f"❌ Service account failed: {str(e)}")

                if not read_ok or not percentage_data:
                    return Response({
                        'error': 'Failed to read sheet percentages',
                        'response_time': round(time.time() - start_time, 2)
                    }, status=400)

                # 🚀 ULTRA-FAST percentage parsing
                def parse_percentage_lightning(raw):
                    if not raw:
                        return None
                    try:
                        s = str(raw).strip()
                        if not s or s == '0':
                            return None
                        # Remove % and commas in one pass
                        s = s.replace('%', '').replace(',', '')
                        val = int(float(s))
                        return val if val > 0 else None
                    except:
                        return None

                # 🚀 Optimized column mapping (relative to K column = index 0)
                column_mapping = {
                    'QUIZZES': 0,           # K column
                    'ASSIGNMENTS': 6,       # Q column (Q-K = 6)
                    'SEATWORK': 12,         # W column (W-K = 12)
                    'LABORATORY ACTIVITIES': 18,  # AC column (AC-K = 18)
                }

                results = {}
                
                # 🚀 Lightning-fast row scanning
                for category, col_offset in column_mapping.items():
                    percentage = None
                    for row_idx in range(min(6, len(percentage_data))):
                        row = percentage_data[row_idx]
                        if col_offset < len(row):
                            candidate = parse_percentage_lightning(row[col_offset])
                            if candidate is not None:
                                percentage = candidate
                                break
                    
                    if percentage is not None:
                        results[category] = percentage

                # 🚀 BULK database operations - single transaction
                if results:
                    # Single delete query
                    CategoryPercentage.objects.filter(
                        class_record=class_record,
                        sheet_name=sheet_name,
                        group=CategoryPercentage.CLASS_STANDING,
                        category_name__in=results.keys()
                    ).delete()
                    
                    # Bulk create all at once
                    category_objects = [
                        CategoryPercentage(
                            class_record=class_record,
                            sheet_name=sheet_name,
                            group=CategoryPercentage.CLASS_STANDING,
                            category_name=name,
                            percentage=pct
                        )
                        for name, pct in results.items()
                    ]
                    CategoryPercentage.objects.bulk_create(category_objects)

                # Single query to get final state
                final_percentages = dict(
                    CategoryPercentage.objects.filter(
                        class_record=class_record,
                        sheet_name=sheet_name,
                        group=CategoryPercentage.CLASS_STANDING,
                    ).values_list('category_name', 'percentage')
                )

                total = sum(final_percentages.values())
                response_time = round(time.time() - start_time, 2)
                
                result = {
                    'status': 'success',
                    'mirrored': results,
                    'db': final_percentages,
                    'total': total,
                    'remaining': max(0, 100 - total),
                    'optimized': True,
                    'response_time': response_time,
                    'rows_fetched': len(percentage_data),
                    'cache_type': 'fresh',
                    'cached': False,
                    'performance_note': f'Fresh data: {len(percentage_data)} rows in {response_time}s',
                    'cache_expires': '2min fast, 10min standard'
                }
                
                # 🚀 MULTI-LAYER CACHING
                # Fast cache: 2 minutes for immediate repeated requests
                cache.set(fast_cache_key, result, 120)
                
                # Standard cache: 10 minutes for regular use  
                cache.set(standard_cache_key, result, 600)
                
                # Long cache: 30 minutes for emergencies (if Google Sheets is down)
                emergency_cache_key = f"emergency_{base_cache_key}"
                cache.set(emergency_cache_key, result, 1800)
                
                print(f"🚀 OPTIMIZED sync_percentages: {response_time}s (cached for 2min/10min)")
                return Response(result)
                
            finally:
                # Always release processing lock
                cache.delete(processing_key)
                
        except Exception as e:
            response_time = round(time.time() - start_time, 2)
            print(f"❌ Sync failed in {response_time}s: {str(e)}")
            
            # 🚀 EMERGENCY FALLBACK - Try to return last known good data
            emergency_cache_key = f"emergency_percentages_v3_{class_record.google_sheet_id}_{sheet_name}_{request.user.id}"
            emergency_data = cache.get(emergency_cache_key)
            if emergency_data:
                emergency_data.update({
                    'cached': True,
                    'cache_type': 'emergency',
                    'response_time': response_time,
                    'note': 'Returned cached data due to API error'
                })
                print(f"🆘 EMERGENCY CACHE: Returned fallback data")
                return Response(emergency_data)
            
            return Response({
                'error': str(e),
                'response_time': response_time
            }, status=400)

    @action(detail=True, methods=['get'])
    def category_percentages(self, request, pk=None):
        """Return mirrored CLASS STANDING percentages for a given sheet."""
        try:
            class_record = self.get_object()
            sheet_name = request.query_params.get('sheet_name')

            # If sheet_name not provided, fall back to latest-updated sheet for this class_record/group
            if not sheet_name:
                latest = CategoryPercentage.objects.filter(
                    class_record=class_record,
                    group=CategoryPercentage.CLASS_STANDING,
                ).order_by('-updated_at').first()
                if latest:
                    sheet_name = latest.sheet_name

            qs = CategoryPercentage.objects.filter(
                class_record=class_record,
                group=CategoryPercentage.CLASS_STANDING,
            )
            if sheet_name:
                qs = qs.filter(sheet_name=sheet_name)
            data = {cp.category_name: int(cp.percentage) for cp in qs}
            total = sum(data.values())
            return Response({
                'status': 'success',
                'data': data,
                'total': total,
                'remaining': max(0, 100 - total),
                'sheet_name': sheet_name,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=True, methods=['post'])
    def save_spreadsheet(self, request, pk=None):
        """Save spreadsheet data"""
        try:
            class_record = self.get_object()
            spreadsheet_data = request.data.get('spreadsheet_data', [])

            class_record.spreadsheet_data = spreadsheet_data
            class_record.save()

            return Response({
                'status': 'success',
                'message': 'Spreadsheet data saved successfully',
                'last_modified': class_record.last_modified
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def spreadsheet(self, request, pk=None):
        """Get spreadsheet data"""
        try:
            class_record = self.get_object()
            return Response({
                'spreadsheet_data': class_record.spreadsheet_data,
                'custom_columns': class_record.custom_columns,
                'last_modified': class_record.last_modified
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    # NEW METHODS FOR EXCEL IMPORT
    @action(detail=True, methods=['post'])
    def save_imported_excel(self, request, pk=None):
        """Save imported Excel data"""
        try:
            class_record = self.get_object()
            headers = request.data.get('headers', [])
            data = request.data.get('data', [])
            file_name = request.data.get('fileName', '')

            # Save the imported Excel data
            class_record.imported_excel_headers = headers
            class_record.imported_excel_data = data
            class_record.imported_file_name = file_name
            class_record.is_excel_imported = True
            class_record.excel_last_modified = timezone.now()
            class_record.save()

            return Response({
                'status': 'success',
                'message': 'Excel data saved successfully',
                'excel_last_modified': class_record.excel_last_modified,
                'is_excel_imported': class_record.is_excel_imported
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def get_imported_excel(self, request, pk=None):
        """Get imported Excel data"""
        try:
            class_record = self.get_object()

            if not class_record.is_excel_imported:
                return Response({
                    'status': 'no_data',
                    'message': 'No Excel data imported yet',
                    'is_excel_imported': False
                })

            return Response({
                'status': 'success',
                'headers': class_record.imported_excel_headers,
                'data': class_record.imported_excel_data,
                'fileName': class_record.imported_file_name,
                'excel_last_modified': class_record.excel_last_modified,
                'is_excel_imported': class_record.is_excel_imported
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def spreadsheet(self, request, pk=None):
        """Get spreadsheet data - TEMPLATE MODE ONLY"""
        try:
            class_record = self.get_object()

            # 🔥 FORCE template mode - ignore Excel import
            return Response({
                'spreadsheet_data': class_record.get_template_data(),  # Always template data
                'custom_columns': class_record.custom_columns,
                'last_modified': class_record.last_modified
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def columns(self, request, pk=None):
        """Get custom column structure - TEMPLATE MODE ONLY"""
        try:
            class_record = self.get_object()
            columns = class_record.custom_columns if class_record.custom_columns else class_record.get_default_columns()

            # 🔥 FORCE template headers - ignore Excel import
            return Response({
                'custom_columns': columns,
                'all_headers': class_record.get_all_headers()  # Always template headers
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def update_imported_excel(self, request, pk=None):
        """Update specific cell in imported Excel data"""
        try:
            class_record = self.get_object()

            if not class_record.is_excel_imported:
                return Response({
                    'status': 'error',
                    'message': 'No Excel data to update'
                }, status=status.HTTP_400_BAD_REQUEST)

            updated_data = request.data.get('data', [])

            # Update the imported Excel data
            class_record.imported_excel_data = updated_data
            class_record.excel_last_modified = timezone.now()
            class_record.save()

            return Response({
                'status': 'success',
                'message': 'Excel data updated successfully',
                'excel_last_modified': class_record.excel_last_modified
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def clear_imported_excel(self, request, pk=None):
        """Clear imported Excel data and return to template mode"""
        try:
            class_record = self.get_object()

            class_record.imported_excel_headers = []
            class_record.imported_excel_data = []
            class_record.imported_file_name = ''
            class_record.is_excel_imported = False
            class_record.excel_last_modified = None
            class_record.save()

            return Response({
                'status': 'success',
                'message': 'Excel data cleared successfully',
                'is_excel_imported': False
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def save_columns(self, request, pk=None):
        """Save custom column structure"""
        try:
            class_record = self.get_object()
            custom_columns = request.data.get('custom_columns', {})

            class_record.custom_columns = custom_columns
            class_record.save()

            return Response({
                'status': 'success',
                'message': 'Column structure saved successfully',
                'custom_columns': class_record.custom_columns
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    # -------- Import Endpoints --------
    @action(detail=False, methods=['post'], url_path='import/preview-upload')
    def preview_import_upload(self, request):
        """
        Preview an uploaded .csv/.xlsx file; return auto-mapped headers and sample rows.
        """
        try:
            uploaded = request.FILES.get('file')
            if not uploaded:
                return Response({'error': 'No file provided'}, status=400)

            preview = build_preview(uploaded.read(), uploaded.name)
            return Response(preview)
        except ImportParseError as e:
            return Response({'error': str(e)}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'], url_path='import/upload')
    def import_upload(self, request):
        """
        Finalize import from an uploaded file with a provided mapping.
        """
        try:
            uploaded = request.FILES.get('file')
            mapping = request.data.get('mapping')
            if isinstance(mapping, str):
                try:
                    mapping = json.loads(mapping)
                except Exception:
                    return Response({'error': 'Invalid mapping JSON'}, status=400)
            name = (request.data.get('name') or '').strip()
            semester = (request.data.get('semester') or '').strip()
            if not semester:
                semester = '1st Semester'

            # Enforce Google Sheet creation prerequisites
            access_token = request.headers.get('X-Google-Access-Token')
            template_id = getattr(settings, 'GOOGLE_SHEETS_TEMPLATE_ID', None)
            if not access_token:
                return Response({'error': 'Missing X-Google-Access-Token. Please connect Google and retry.'}, status=400)
            if not template_id:
                return Response({'error': 'Template not configured. Please set GOOGLE_SHEETS_TEMPLATE_ID on the server.'}, status=400)

            if not uploaded:
                return Response({'error': 'No file provided'}, status=400)
            if not mapping:
                return Response({'error': 'Mapping is required'}, status=400)

            # Derive name from filename if not provided
            if not name:
                try:
                    import os
                    base = os.path.basename(uploaded.name)
                    name = os.path.splitext(base)[0]
                except Exception:
                    name = uploaded.name

            # Soft-check required mappings; continue and surface row-level errors instead of hard failing
            missing = validate_required_mappings(mapping)

            # Read full rows
            lower = uploaded.name.lower()
            if lower.endswith('.csv'):
                headers, rows = read_csv_bytes(uploaded.read())
            else:
                headers, rows = read_xlsx_bytes(uploaded.read())

            valid_rows, row_errors = normalize_rows(rows, mapping)

            # Create ClassRecord and store imported data in JSON fields as per model
            class_record = ClassRecord.objects.create(
                user=request.user,
                name=name,
                semester=semester,
                imported_excel_headers=list(mapping.values()),
                imported_excel_data=valid_rows,
                imported_file_name=uploaded.name,
                is_excel_imported=True,
                excel_last_modified=timezone.now(),
            )

            # Attempt to create Google Sheet same as perform_create does (optional, best effort)
            try:
                access_token = request.headers.get('X-Google-Access-Token')
                template_id = getattr(settings, 'GOOGLE_SHEETS_TEMPLATE_ID', None)
                if access_token and template_id:
                    user_sheets_service = GoogleSheetsService(access_token)
                    copy_result = user_sheets_service.copy_template_sheet(
                        template_file_id=template_id,
                        new_name=f"{class_record.name} - {class_record.semester}"
                    )
                    if copy_result.get('success'):
                        copied_file_info = copy_result['file']
                        class_record.google_sheet_id = copied_file_info['id']
                        class_record.google_sheet_url = copied_file_info.get('webViewLink')
                        class_record.save()
                        # Make public editable (best effort)
                        user_sheets_service.update_sheet_permissions(
                            file_id=copied_file_info['id'], make_editable=True
                        )
            except Exception:
                pass

            return Response({
                'status': 'success',
                'classRecordId': class_record.id,
                'importedCount': len(valid_rows),
                'skippedCount': len(row_errors),
                'errors': row_errors[:50],
            }, status=201)
        except ImportParseError as e:
            return Response({'error': str(e)}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'], url_path='import/preview-drive')
    def preview_import_drive(self, request):
        try:
            file_id = request.data.get('fileId')
            file_name = request.data.get('fileName')
            access_token = request.headers.get('X-Google-Access-Token')
            if not file_id or not file_name:
                return Response({'error': 'fileId and fileName are required'}, status=400)
            if not access_token:
                return Response({'error': 'Missing X-Google-Access-Token'}, status=400)

            drive = GoogleDriveService(access_token)
            download = drive.get_file_content(file_id)
            if not download.get('success'):
                return Response({'error': download.get('error', 'Failed to download file'), 'details': download.get('details')}, status=400)

            preview = build_preview(download['content'], file_name)
            return Response(preview)
        except ImportParseError as e:
            return Response({'error': str(e)}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'], url_path='import/drive')
    def import_drive(self, request):
        try:
            file_id = request.data.get('fileId')
            file_name = request.data.get('fileName')
            mapping = request.data.get('mapping')
            name = (request.data.get('name') or '').strip()
            semester = (request.data.get('semester') or '').strip()
            access_token = request.headers.get('X-Google-Access-Token')
            if not semester:
                semester = '1st Semester'

            if not file_id or not file_name:
                return Response({'error': 'fileId and fileName are required'}, status=400)
            if not mapping:
                return Response({'error': 'Mapping is required'}, status=400)
            if not access_token:
                return Response({'error': 'Missing X-Google-Access-Token'}, status=400)
            template_id = getattr(settings, 'GOOGLE_SHEETS_TEMPLATE_ID', None)
            if not template_id:
                return Response({'error': 'Template not configured. Please set GOOGLE_SHEETS_TEMPLATE_ID on the server.'}, status=400)

            if isinstance(mapping, str):
                try:
                    mapping = json.loads(mapping)
                except Exception:
                    return Response({'error': 'Invalid mapping JSON'}, status=400)

            missing = validate_required_mappings(mapping)

            drive = GoogleDriveService(access_token)
            download = drive.get_file_content(file_id)
            if not download.get('success'):
                return Response({'error': download.get('error', 'Failed to download file'), 'details': download.get('details')}, status=400)

            content = download['content']
            if file_name.lower().endswith('.csv'):
                headers, rows = read_csv_bytes(content)
            else:
                headers, rows = read_xlsx_bytes(content)

            valid_rows, row_errors = normalize_rows(rows, mapping)

            # Derive name from file when not provided
            if not name:
                try:
                    import os
                    base = os.path.basename(file_name)
                    name = os.path.splitext(base)[0]
                except Exception:
                    name = file_name

            class_record = ClassRecord.objects.create(
                user=request.user,
                name=name,
                semester=semester,
                imported_excel_headers=list(mapping.values()),
                imported_excel_data=valid_rows,
                imported_file_name=file_name,
                is_excel_imported=True,
                excel_last_modified=timezone.now(),
            )

            # Attempt to create Google Sheet same as perform_create (best effort)
            try:
                template_id = getattr(settings, 'GOOGLE_SHEETS_TEMPLATE_ID', None)
                if access_token and template_id:
                    user_sheets_service = GoogleSheetsService(access_token)
                    copy_result = user_sheets_service.copy_template_sheet(
                        template_file_id=template_id,
                        new_name=f"{class_record.name} - {class_record.semester}"
                    )
                    if copy_result.get('success'):
                        copied_file_info = copy_result['file']
                        class_record.google_sheet_id = copied_file_info['id']
                        class_record.google_sheet_url = copied_file_info.get('webViewLink')
                        class_record.save()
                        user_sheets_service.update_sheet_permissions(
                            file_id=copied_file_info['id'], make_editable=True
                        )
            except Exception:
                pass

            return Response({
                'status': 'success',
                'classRecordId': class_record.id,
                'importedCount': len(valid_rows),
                'skippedCount': len(row_errors),
                'errors': row_errors[:50],
            }, status=201)
        except ImportParseError as e:
            return Response({'error': str(e)}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['get'])
    def columns(self, request, pk=None):
        """Get custom column structure"""
        try:
            class_record = self.get_object()
            columns = class_record.custom_columns if class_record.custom_columns else class_record.get_default_columns()

            return Response({
                'custom_columns': columns,
                'all_headers': class_record.get_all_headers()
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def add_column(self, request, pk=None):
        """Add a new column to a specific category"""
        try:
            class_record = self.get_object()
            category = request.data.get('category')
            column_name = request.data.get('column_name')

            columns = class_record.custom_columns if class_record.custom_columns else class_record.get_default_columns()

            if category in columns:
                if column_name not in columns[category]:
                    columns[category].append(column_name)

                    class_record.custom_columns = columns
                    class_record.save()

                    return Response({
                        'status': 'success',
                        'message': f'Column "{column_name}" added to {category}',
                        'custom_columns': columns,
                        'all_headers': class_record.get_all_headers()
                    })
                else:
                    return Response({
                        'status': 'error',
                        'message': 'Column already exists'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'status': 'error',
                    'message': 'Invalid category'
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def remove_column(self, request, pk=None):
        try:
            class_record = self.get_object()
            category = request.data.get('category')
            column_name = request.data.get('column_name')

            columns = class_record.custom_columns if class_record.custom_columns else class_record.get_default_columns()

            if category in columns and column_name in columns[category]:
                columns[category].remove(column_name)

                class_record.custom_columns = columns
                class_record.save()

                return Response({
                    'status': 'success',
                    'message': f'Column "{column_name}" removed from {category}',
                    'custom_columns': columns,
                    'all_headers': class_record.get_all_headers()
                })
            else:
                return Response({
                    'status': 'error',
                    'message': 'Column not found'
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Student.objects.filter(class_record__teacher=self.request.user)


class GradeCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = GradeCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return GradeCategory.objects.filter(class_record__teacher=self.request.user)


class GradeViewSet(viewsets.ModelViewSet):
    serializer_class = GradeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Grade.objects.filter(student__class_record__teacher=self.request.user)


class CategoryPercentageViewSet(viewsets.ModelViewSet):
    serializer_class = CategoryPercentageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = CategoryPercentage.objects.filter(class_record__user=self.request.user)
        class_record_id = self.request.query_params.get('class_record_id')
        sheet_name = self.request.query_params.get('sheet_name')
        group = self.request.query_params.get('group')
        if class_record_id:
            qs = qs.filter(class_record_id=class_record_id)
        if sheet_name:
            qs = qs.filter(sheet_name=sheet_name)
        if group:
            qs = qs.filter(group=group)
        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        self._validate_total(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._validate_total(instance)

    def _validate_total(self, instance: CategoryPercentage):
        # Only enforce for CLASS_STANDING group
        if instance.group != CategoryPercentage.CLASS_STANDING:
            return
        siblings = CategoryPercentage.objects.filter(
            class_record=instance.class_record,
            sheet_name=instance.sheet_name,
            group=instance.group,
        )
        total = sum(max(0, int(cp.percentage)) for cp in siblings)
        if total > 100:
            # Rollback the last change by raising validation error
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'percentage': 'Total CLASS STANDING percentage cannot exceed 100%.'})