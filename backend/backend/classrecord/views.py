from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.conf import settings
from .models import ClassRecord, Student, GradeCategory, Grade
from .serializers import (
    ClassRecordSerializer,
    ClassRecordDetailSerializer,
    StudentSerializer,
    GradeCategorySerializer,
    GradeSerializer
)
from users.google_sheets_service import GoogleSheetsService
# Remove the service account imports since we're switching to user-based approach
# from utils.google_service_account_sheets import GoogleServiceAccountSheets


class ClassRecordViewSet(viewsets.ModelViewSet):
    serializer_class = ClassRecordSerializer
    permission_classes = [IsAuthenticated]

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