from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import ClassRecord, Student, GradeCategory, Grade
from .serializers import (
    ClassRecordSerializer,
    ClassRecordDetailSerializer,
    StudentSerializer,
    GradeCategorySerializer,
    GradeSerializer
)


class ClassRecordViewSet(viewsets.ModelViewSet):
    serializer_class = ClassRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ClassRecord.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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