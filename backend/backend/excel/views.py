import json
import os

import Levenshtein
from drf_spectacular.types import OpenApiTypes
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
import pandas as pd
from django.http import HttpResponse
from io import BytesIO

from unidecode import unidecode

from .models import ExcelFile
from .serializers import ExcelFileSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import datetime


# Create a custom permission class to check team permissions
class HasTeamEditPermission(BasePermission):
    """
    Custom permission to check team permissions for Excel file operations.
    """

    def has_permission(self, request, view):
        """Check general permission for the view."""
        # Allow authenticated users to access GET requests
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return request.user and request.user.is_authenticated

        # For modifying requests, check if user has proper permissions
        class_id = view.kwargs.get('pk') or request.data.get('class_id')

        # For DELETE operations, we need to get the class_id from the object
        if request.method == 'DELETE' and 'pk' in view.kwargs:
            try:
                excel_file = ExcelFile.objects.get(pk=view.kwargs['pk'])
                class_id = excel_file.class_ref.id if excel_file.class_ref else None
            except ExcelFile.DoesNotExist:
                return False

        if not class_id:
            # If no class_id, check if this is an object-level operation
            return request.user and request.user.is_authenticated

        try:
            from classes.models import Class
            class_obj = Class.objects.get(id=class_id)

            # If user is the owner, they have full permissions
            if class_obj.user == request.user:
                print(f"Permission granted: User {request.user.id} is owner of class {class_id}")
                return True

            # If there's a course associated with this class, check team permissions
            if class_obj.course:
                from teams.models import TeamMember

                team_member = TeamMember.objects.filter(
                    team__courses__course_id=class_obj.course.id,
                    user=request.user,
                    is_active=True
                ).first()

                # Only allow edit/delete if user has edit or full permissions
                if team_member and team_member.permissions in ['edit', 'full']:
                    print(
                        f"Permission granted: User {request.user.id} has team access ({team_member.permissions}) to class {class_id}")
                    return True
                elif team_member:
                    print(
                        f"Permission denied: User {request.user.id} has insufficient team permissions ({team_member.permissions}) for class {class_id}")
                else:
                    print(f"Permission denied: User {request.user.id} is not a team member for class {class_id}")

            print(f"Permission denied: User {request.user.id} has no access to class {class_id}")
            return False

        except Class.DoesNotExist:
            print(f"Permission denied: Class {class_id} does not exist")
            return False

    def has_object_permission(self, request, view, obj):
        """Check object-level permissions."""
        # Allow authenticated users to access GET requests
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return request.user and request.user.is_authenticated

        print(f"Checking object permission for user {request.user.id} on ExcelFile {obj.id}")
        print(f"File owner: {obj.user.id}, Request user: {request.user.id}")

        # If user is the owner, they have full permissions
        if obj.user == request.user:
            print(f"Permission granted: User {request.user.id} owns ExcelFile {obj.id}")
            return True

        # Check if user has proper team permissions for this file's class
        if obj.class_ref and obj.class_ref.course:
            from teams.models import TeamMember

            team_member = TeamMember.objects.filter(
                team__courses__course_id=obj.class_ref.course.id,
                user=request.user,
                is_active=True
            ).first()

            # Only allow edit/delete if user has edit or full permissions
            if team_member and team_member.permissions in ['edit', 'full']:
                print(
                    f"Permission granted: User {request.user.id} has team access ({team_member.permissions}) to ExcelFile {obj.id}")
                return True
            elif team_member:
                print(
                    f"Permission denied: User {request.user.id} has insufficient team permissions ({team_member.permissions}) for ExcelFile {obj.id}")
            else:
                print(f"Permission denied: User {request.user.id} is not a team member for ExcelFile {obj.id}")

        print(f"Permission denied: User {request.user.id} has no access to ExcelFile {obj.id}")
        return False


class ExcelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasTeamEditPermission]
    serializer_class = ExcelFileSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        user_files = ExcelFile.objects.filter(user=self.request.user)

        class_id = self.request.query_params.get('class_id', None)
        if class_id:
            user_files = user_files.filter(class_ref_id=class_id)

            try:
                from classes.models import Class
                class_obj = Class.objects.get(id=class_id)

                if class_obj.course:
                    from teams.models import TeamCourse

                    team_access_exists = TeamCourse.objects.filter(
                        course_id=class_obj.course.id,
                        team__members__user=self.request.user,
                        team__members__is_active=True
                    ).exists()

                    if team_access_exists:
                        team_files = ExcelFile.objects.filter(class_ref_id=class_id)
                        return user_files | team_files
            except Class.DoesNotExist:
                pass

        return user_files

    def destroy(self, request, *args, **kwargs):
        """Enhanced delete method with better error handling and logging."""
        try:
            instance = self.get_object()
            print(f"Delete request for ExcelFile {instance.id} by user {request.user.id}")

            # Additional permission check with detailed logging
            if instance.user != request.user:
                print(f"User {request.user.id} is not the owner of ExcelFile {instance.id}")

                # Check team permissions
                has_team_access = False
                if instance.class_ref and instance.class_ref.course:
                    from teams.models import TeamMember
                    team_member = TeamMember.objects.filter(
                        team__courses__course_id=instance.class_ref.course.id,
                        user=request.user,
                        is_active=True
                    ).first()

                    if team_member:
                        print(f"Team member found with permissions: {team_member.permissions}")
                        if team_member.permissions in ['edit', 'full']:
                            has_team_access = True
                            print("Team access granted for delete operation")
                        else:
                            print(f"Insufficient team permissions: {team_member.permissions}")
                    else:
                        print("No team membership found")

                if not has_team_access:
                    print("Delete operation denied - insufficient permissions")
                    return Response(
                        {
                            'error': 'You do not have permission to delete this file',
                            'detail': 'Only file owners or team members with edit/full permissions can delete files'
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )

            # Log successful delete
            file_name = instance.file_name
            class_name = instance.class_ref.name if instance.class_ref else "Unknown"

            # Perform the delete
            self.perform_destroy(instance)

            print(f"Successfully deleted ExcelFile '{file_name}' from class '{class_name}' by user {request.user.id}")

            return Response(
                {
                    'message': f'File "{file_name}" has been successfully deleted',
                    'deleted_file': {
                        'id': kwargs.get('pk'),
                        'name': file_name,
                        'class': class_name
                    }
                },
                status=status.HTTP_200_OK
            )

        except ExcelFile.DoesNotExist:
            print(f"Delete failed: ExcelFile with id {kwargs.get('pk')} not found")
            return Response(
                {'error': 'File not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            import traceback
            print(f"Delete operation failed with error: {str(e)}")
            print("Traceback:", traceback.format_exc())
            return Response(
                {
                    'error': 'An error occurred while deleting the file',
                    'detail': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['PATCH'], permission_classes=[IsAuthenticated])
    def set_active_sheet(self, request, pk=None):
        try:
            excel_file = ExcelFile.objects.get(pk=pk)
            sheet_name = request.data.get('sheet_name')

            if not sheet_name:
                return Response({'error': 'sheet_name is required'}, status=status.HTTP_400_BAD_REQUEST)

            if sheet_name not in excel_file.all_sheets:
                return Response({'error': f'Sheet {sheet_name} not found'}, status=status.HTTP_404_NOT_FOUND)

            user_is_owner = excel_file.user == request.user

            team_access = False
            if not user_is_owner and excel_file.class_ref and excel_file.class_ref.course:
                from teams.models import TeamMember
                team_member = TeamMember.objects.filter(
                    team__courses__course_id=excel_file.class_ref.course.id,
                    user=request.user,
                    is_active=True
                ).exists()
                if team_member:
                    team_access = True

            if not user_is_owner and not team_access:
                return Response(
                    {'error': 'You do not have permission to access this file'},
                    status=status.HTTP_403_FORBIDDEN
                )

            excel_file.active_sheet = sheet_name
            excel_file.save()

            serializer = self.get_serializer(excel_file)
            return Response(serializer.data)

        except ExcelFile.DoesNotExist:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            print("Error setting active sheet:", str(e))
            print("Traceback:", traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def normalize_student_id(self, student_id):
        """Normalize student ID by removing dashes, spaces, and leading zeros."""
        if not student_id:
            return ""

        # Convert to string and remove dashes, spaces
        normalized = str(student_id).strip().replace('-', '').replace(' ', '')

        # Remove leading zeros but keep at least one digit
        normalized = normalized.lstrip('0') or '0'

        return normalized.lower()

    def normalize_name(self, name):
        """Enhanced name normalization with better handling."""
        if name is None:
            return ""

        # Convert to string if not already
        name = str(name).strip()

        # Remove accents and convert to lowercase
        normalized = unidecode(name).lower()

        # Remove extra spaces and special characters
        normalized = " ".join(normalized.split())

        # Remove common prefixes/suffixes
        prefixes = ['mr.', 'ms.', 'mrs.', 'dr.']
        suffixes = ['jr.', 'sr.', 'ii', 'iii', 'iv']

        words = normalized.split()
        words = [w for w in words if w not in prefixes and w not in suffixes]

        return " ".join(words)

    def detect_student_columns(self, headers):
        """Enhanced column detection for No, First Name, Last Name."""
        column_mapping = {
            'student_id': None,
            'first_name': None,
            'last_name': None,
            'full_name': None
        }

        # Enhanced patterns for better detection
        id_patterns = ['no.', 'no', 'student no', 'student no.', 'id', 'student id', '#', 'number', 'student number']
        first_patterns = ['first name', 'firstname', 'first', 'given name', 'fname']
        last_patterns = ['last name', 'lastname', 'last', 'surname', 'family name', 'lname']
        full_patterns = ['full name', 'fullname', 'name', 'student name', 'complete name']

        for header in headers:
            header_lower = str(header).lower().strip()

            # Check for student ID
            if any(pattern in header_lower for pattern in id_patterns):
                if column_mapping['student_id'] is None:  # Take first match
                    column_mapping['student_id'] = header

            # Check for first name
            elif any(pattern in header_lower for pattern in first_patterns):
                if column_mapping['first_name'] is None:
                    column_mapping['first_name'] = header

            # Check for last name
            elif any(pattern in header_lower for pattern in last_patterns):
                if column_mapping['last_name'] is None:
                    column_mapping['last_name'] = header

            # Check for full name
            elif any(pattern in header_lower for pattern in full_patterns):
                if column_mapping['full_name'] is None:
                    column_mapping['full_name'] = header

        return column_mapping

    def build_student_lookup(self, data, column_mapping):
        """Build comprehensive lookup dictionaries for students."""
        lookup_by_id = {}
        lookup_by_name = {}
        lookup_by_full_name = {}

        for record in data:
            # Student ID lookup
            if column_mapping['student_id']:
                student_id = self.normalize_student_id(record.get(column_mapping['student_id']))
                if student_id:
                    lookup_by_id[student_id] = record

            # Name-based lookups
            first_name = self.normalize_name(record.get(column_mapping['first_name'])) if column_mapping[
                'first_name'] else ""
            last_name = self.normalize_name(record.get(column_mapping['last_name'])) if column_mapping[
                'last_name'] else ""
            full_name = self.normalize_name(record.get(column_mapping['full_name'])) if column_mapping[
                'full_name'] else ""

            # Build combined first + last name
            if first_name and last_name:
                combined_name = f"{first_name} {last_name}"
                lookup_by_name[combined_name] = record

                # Also add reversed version (last, first)
                reversed_name = f"{last_name} {first_name}"
                lookup_by_name[reversed_name] = record

            # Full name lookup
            if full_name:
                lookup_by_full_name[full_name] = record

        return {
            'by_id': lookup_by_id,
            'by_name': lookup_by_name,
            'by_full_name': lookup_by_full_name
        }

    def find_student_match(self, imported_record, existing_lookups, column_mapping, threshold=0.85):
        """Find matching student with detailed conflict detection."""

        # Extract imported student data
        imported_id = self.normalize_student_id(imported_record.get(column_mapping['student_id'])) if column_mapping[
            'student_id'] else ""
        imported_first = self.normalize_name(imported_record.get(column_mapping['first_name'])) if column_mapping[
            'first_name'] else ""
        imported_last = self.normalize_name(imported_record.get(column_mapping['last_name'])) if column_mapping[
            'last_name'] else ""
        imported_full = self.normalize_name(imported_record.get(column_mapping['full_name'])) if column_mapping[
            'full_name'] else ""

        imported_combined = f"{imported_first} {imported_last}".strip() if imported_first and imported_last else ""

        # Priority 1: Exact Student ID match
        if imported_id and imported_id in existing_lookups['by_id']:
            existing_record = existing_lookups['by_id'][imported_id]
            existing_first = self.normalize_name(existing_record.get(column_mapping['first_name'])) if column_mapping[
                'first_name'] else ""
            existing_last = self.normalize_name(existing_record.get(column_mapping['last_name'])) if column_mapping[
                'last_name'] else ""
            existing_combined = f"{existing_first} {existing_last}".strip()

            # Check if names match too
            if imported_combined and existing_combined:
                if imported_combined == existing_combined:
                    return {
                        'type': 'exact_match',
                        'existing_record': existing_record,
                        'imported_record': imported_record,
                        'match_method': 'id_and_name_exact',
                        'confidence': 1.0
                    }
                else:
                    # Same ID but different names - potential conflict
                    name_similarity = Levenshtein.ratio(imported_combined, existing_combined)
                    if name_similarity < 0.7:  # Names are quite different
                        return {
                            'type': 'conflict',
                            'conflict_type': 'DUPLICATE_ID_DIFFERENT_NAME',
                            'existing_record': existing_record,
                            'imported_record': imported_record,
                            'details': {
                                'existing_name': existing_combined,
                                'imported_name': imported_combined,
                                'student_id': imported_id,
                                'name_similarity': name_similarity
                            },
                            'recommended_action': 'override_name' if name_similarity > 0.5 else 'manual_review'
                        }

            # ID match but no name comparison possible
            return {
                'type': 'exact_match',
                'existing_record': existing_record,
                'imported_record': imported_record,
                'match_method': 'id_only',
                'confidence': 0.95
            }

        # Priority 2: Exact name match (combined or full)
        name_to_check = imported_combined if imported_combined else imported_full

        if name_to_check:
            # Check combined name lookup
            if imported_combined and imported_combined in existing_lookups['by_name']:
                existing_record = existing_lookups['by_name'][imported_combined]
                existing_id = self.normalize_student_id(existing_record.get(column_mapping['student_id'])) if \
                column_mapping['student_id'] else ""

                # Check for ID conflict
                if imported_id and existing_id and imported_id != existing_id:
                    return {
                        'type': 'conflict',
                        'conflict_type': 'DUPLICATE_NAME_DIFFERENT_ID',
                        'existing_record': existing_record,
                        'imported_record': imported_record,
                        'details': {
                            'existing_id': existing_id,
                            'imported_id': imported_id,
                            'student_name': imported_combined
                        },
                        'recommended_action': 'manual_review'
                    }

                return {
                    'type': 'exact_match',
                    'existing_record': existing_record,
                    'imported_record': imported_record,
                    'match_method': 'name_exact',
                    'confidence': 0.98
                }

            # Check full name lookup
            if imported_full and imported_full in existing_lookups['by_full_name']:
                existing_record = existing_lookups['by_full_name'][imported_full]
                return {
                    'type': 'exact_match',
                    'existing_record': existing_record,
                    'imported_record': imported_record,
                    'match_method': 'full_name_exact',
                    'confidence': 0.98
                }

        # Priority 3: Fuzzy matching
        best_match = None
        best_score = 0
        best_method = None

        # Fuzzy match against combined names
        if imported_combined:
            for existing_name, existing_record in existing_lookups['by_name'].items():
                similarity = Levenshtein.ratio(imported_combined, existing_name)

                # Boost score for partial matches (first or last name matches)
                if imported_first or imported_last:
                    existing_parts = set(existing_name.split())
                    imported_parts = set([imported_first, imported_last]) - {''}
                    common_parts = existing_parts.intersection(imported_parts)
                    if common_parts:
                        similarity += 0.1 * len(common_parts) / max(len(existing_parts), len(imported_parts))

                if similarity > best_score and similarity >= threshold:
                    best_score = similarity
                    best_match = existing_record
                    best_method = 'fuzzy_name'

        # Fuzzy match against full names
        if imported_full:
            for existing_name, existing_record in existing_lookups['by_full_name'].items():
                similarity = Levenshtein.ratio(imported_full, existing_name)

                if similarity > best_score and similarity >= threshold:
                    best_score = similarity
                    best_match = existing_record
                    best_method = 'fuzzy_full_name'

        if best_match:
            return {
                'type': 'fuzzy_match',
                'existing_record': best_match,
                'imported_record': imported_record,
                'match_method': best_method,
                'confidence': best_score,
                'requires_confirmation': best_score < 0.95
            }

        # No match found - new student
        return {
            'type': 'new_student',
            'imported_record': imported_record,
            'confidence': 1.0
        }

    def process_merge_conflicts(self, existing_data, imported_data, existing_column_mapping, imported_column_mapping,
                                threshold=0.85):
        """Process merge and detect all conflicts."""

        # Build lookup dictionaries
        existing_lookups = self.build_student_lookup(existing_data, existing_column_mapping)

        results = {
            'exact_matches': [],
            'fuzzy_matches': [],
            'conflicts': [],
            'new_students': [],
            'statistics': {
                'total_imported': len(imported_data),
                'exact_matches': 0,
                'fuzzy_matches': 0,
                'conflicts': 0,
                'new_students': 0
            }
        }

        # Process each imported record
        for imported_record in imported_data:
            match_result = self.find_student_match(
                imported_record,
                existing_lookups,
                imported_column_mapping,
                threshold
            )

            # Categorize results
            if match_result['type'] == 'exact_match':
                results['exact_matches'].append(match_result)
                results['statistics']['exact_matches'] += 1

            elif match_result['type'] == 'fuzzy_match':
                results['fuzzy_matches'].append(match_result)
                results['statistics']['fuzzy_matches'] += 1

            elif match_result['type'] == 'conflict':
                results['conflicts'].append(match_result)
                results['statistics']['conflicts'] += 1

            elif match_result['type'] == 'new_student':
                results['new_students'].append(match_result)
                results['statistics']['new_students'] += 1

        return results

    @extend_schema(
        description='Preview merge conflicts before actual merge',
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'file': {'type': 'string', 'format': 'binary'},
                    'class_id': {'type': 'integer'},
                    'matching_threshold': {'type': 'number'},
                    'column_mapping': {'type': 'string'}  # JSON string of column mappings
                }
            }
        },
        responses={200: 'Conflict preview data'}
    )
    @action(detail=False, methods=['POST'])
    def preview_merge(self, request):
        """Preview merge conflicts before actual merge - no data changes."""
        print("Preview merge request received")

        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        print(f"File received for preview: {file.name}")

        if not file.name.endswith(('.xlsx', '.xls', '.csv')):
            return Response({'error': 'File must be an Excel file'}, status=status.HTTP_400_BAD_REQUEST)

        class_id = request.data.get('class_id')
        if not class_id:
            return Response({'error': 'class_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Get matching threshold
        try:
            matching_threshold = float(request.data.get('matching_threshold', 0.85))
            matching_threshold = max(0.5, min(1.0, matching_threshold))
        except (ValueError, TypeError):
            matching_threshold = 0.85

        try:
            # Check permissions
            from classes.models import Class
            class_obj = Class.objects.get(id=class_id)

            if class_obj.user != request.user:
                from teams.models import TeamMember
                team_member = TeamMember.objects.filter(
                    team__courses__course_id=class_obj.course.id if class_obj.course else None,
                    user=request.user,
                    is_active=True
                ).first()

                if not team_member or team_member.permissions not in ['edit', 'full']:
                    return Response({'error': 'You do not have permission to modify files in this class'},
                                    status=status.HTTP_403_FORBIDDEN)

            # Get existing file
            existing_file = ExcelFile.objects.filter(class_ref=class_obj).order_by('-uploaded_at').first()

            if not existing_file:
                return Response({
                    'status': 'no_existing_file',
                    'message': 'No existing file found. This will be uploaded as a new file.',
                    'statistics': {'total_imported': 0, 'new_students': 0}
                })

            # Load and process new file
            new_excel = pd.read_excel(file, sheet_name=None)
            first_sheet_name = list(new_excel.keys())[0]
            df = new_excel[first_sheet_name]

            # Clean columns
            original_columns = df.columns.tolist()
            columns_to_keep = []
            for col in original_columns:
                col_str = str(col).strip()
                if not (col_str.startswith('Unnamed:') or
                        col_str in ['', 'nan', 'NaN', 'None'] or
                        col_str.lower() == 'null' or
                        df[col].isna().all() or
                        (df[col] == '').all()):
                    columns_to_keep.append(col)

            df = df[columns_to_keep]
            df = df.replace({pd.NA: None}).fillna("")

            # Convert to records
            imported_records = df.to_dict('records')
            imported_headers = df.columns.tolist()

            # Get existing data
            active_sheet = existing_file.active_sheet
            existing_data = existing_file.all_sheets[active_sheet]['data']
            existing_headers = existing_file.all_sheets[active_sheet]['headers']

            # Detect columns in both datasets
            existing_column_mapping = self.detect_student_columns(existing_headers)
            imported_column_mapping = self.detect_student_columns(imported_headers)

            # Parse custom column mapping if provided
            if 'column_mapping' in request.data:
                try:
                    custom_mapping = json.loads(request.data.get('column_mapping'))
                    imported_column_mapping.update(custom_mapping)
                    print(f"Applied custom column mapping: {custom_mapping}")
                except Exception as e:
                    print(f"Error parsing column mapping: {str(e)}")

            # Process conflicts
            conflict_results = self.process_merge_conflicts(
                existing_data,
                imported_records,
                existing_column_mapping,
                imported_column_mapping,
                matching_threshold
            )

            print("=== CONFLICT DETECTION DEBUG ===")
            print(f"Exact matches found: {len(conflict_results.get('exact_matches', []))}")
            print(f"Fuzzy matches found: {len(conflict_results.get('fuzzy_matches', []))}")
            print(f"Conflicts found: {len(conflict_results.get('conflicts', []))}")
            print(f"New students found: {len(conflict_results.get('new_students', []))}")
            print(f"Total imported records: {len(imported_records)}")

            if conflict_results.get('exact_matches'):
                print("=== EXACT MATCHES DETAILS ===")
                for i, match in enumerate(conflict_results['exact_matches'][:3]):  # Show first 3
                    print(f"  Match {i}: {match['existing_record']} -> {match['imported_record']}")

            if conflict_results.get('new_students'):
                print("=== NEW STUDENTS DETAILS ===")
                for i, new_student in enumerate(conflict_results['new_students'][:3]):  # Show first 3
                    print(f"  New student {i}: {new_student['imported_record']}")

            print("=== END DEBUG ===")

            # Prepare response data
            response_data = {
                'status': 'conflicts_detected' if conflict_results['conflicts'] else 'ready_to_merge',
                'file_info': {
                    'name': file.name,
                    'imported_rows': len(imported_records),
                    'imported_columns': len(imported_headers)
                },
                'column_mapping': {
                    'existing': existing_column_mapping,
                    'imported': imported_column_mapping
                },
                'conflicts': conflict_results['conflicts'],
                'exact_matches': conflict_results['exact_matches'][:10],  # Limit for preview
                'fuzzy_matches': conflict_results['fuzzy_matches'][:10],  # Limit for preview
                'new_students': conflict_results['new_students'][:10],  # Limit for preview
                'statistics': conflict_results['statistics'],
                'bulk_actions_available': [
                    'accept_all_exact',
                    'accept_all_fuzzy_high_confidence',
                    'add_all_new',
                    'override_all_conflicts'
                ]
            }

            # Add sample data for frontend display
            if conflict_results['conflicts']:
                response_data['sample_conflicts'] = conflict_results['conflicts'][:5]

            if conflict_results['fuzzy_matches']:
                high_confidence = [m for m in conflict_results['fuzzy_matches'] if m['confidence'] > 0.9]
                response_data['high_confidence_matches'] = high_confidence[:5]

            print(f"Preview complete: {conflict_results['statistics']}")

            return Response(response_data)

        except Class.DoesNotExist:
            return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            print("Error during preview:", str(e))
            print("Traceback:", traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description='Execute merge with conflict resolutions',
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'file': {'type': 'string', 'format': 'binary'},
                    'class_id': {'type': 'integer'},
                    'conflict_resolutions': {'type': 'string'},  # JSON string
                    'bulk_actions': {'type': 'string'},  # JSON string
                    'matching_threshold': {'type': 'number'},
                    'column_mapping': {'type': 'string'},
                    'category_mappings': {'type': 'string'}  # JSON string
                }
            }
        },
        responses={200: ExcelFileSerializer}
    )
    @action(detail=False, methods=['POST'])
    def execute_merge(self, request):
        """Execute merge with user-provided conflict resolutions."""
        print("Execute merge request received")

        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        print(f"File received for execute merge: {file.name}")

        if not file.name.endswith(('.xlsx', '.xls', '.csv')):
            return Response({'error': 'File must be an Excel file'}, status=status.HTTP_400_BAD_REQUEST)

        class_id = request.data.get('class_id')
        if not class_id:
            return Response({'error': 'class_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Get matching threshold
        try:
            matching_threshold = float(request.data.get('matching_threshold', 0.85))
            matching_threshold = max(0.5, min(1.0, matching_threshold))
        except (ValueError, TypeError):
            matching_threshold = 0.85

        # Parse conflict resolutions
        conflict_resolutions = {}
        bulk_actions = {}
        column_mapping = {}
        category_mappings = []

        if 'conflict_resolutions' in request.data:
            try:
                conflict_resolutions = json.loads(request.data.get('conflict_resolutions'))
                print(f"Parsed conflict resolutions: {len(conflict_resolutions)} items")
            except Exception as e:
                print(f"Error parsing conflict resolutions: {str(e)}")

        if 'bulk_actions' in request.data:
            try:
                bulk_actions = json.loads(request.data.get('bulk_actions'))
                print(f"Parsed bulk actions: {bulk_actions}")
            except Exception as e:
                print(f"Error parsing bulk actions: {str(e)}")

        if 'column_mapping' in request.data:
            try:
                column_mapping = json.loads(request.data.get('column_mapping'))
                print(f"Parsed column mapping: {column_mapping}")
            except Exception as e:
                print(f"Error parsing column mapping: {str(e)}")

        if 'category_mappings' in request.data:
            try:
                category_mappings = json.loads(request.data.get('category_mappings'))
                print(f"Parsed category mappings: {len(category_mappings)} categories")
            except Exception as e:
                print(f"Error parsing category mappings: {str(e)}")

        def find_best_column_replacement(category_id, new_column_name, new_column_data, existing_data,
                                         existing_category_mappings, already_assigned_columns=None,
                                         max_columns_per_category=10):
            """
            Find the best strategy for placing a new column:
            1. Replace an empty existing column (that hasn't been assigned yet)
            2. Add as new column if space allows
            3. Reject if no space and all columns have data
            """
            if already_assigned_columns is None:
                already_assigned_columns = set()

            print(f"\n🎯 FINDING BEST PLACEMENT FOR: {new_column_name} in {category_id} category")
            print(f"  Already assigned columns in this batch: {list(already_assigned_columns)}")

            # Get existing columns for this category
            existing_categories = {cat.get('id'): cat.get('columns', []) for cat in existing_category_mappings}
            existing_columns_in_category = existing_categories.get(category_id, [])

            print(f"  Existing columns in category: {existing_columns_in_category}")

            # Check data quality in existing columns
            empty_columns = []
            columns_with_data = []

            for column in existing_columns_in_category:
                # Skip columns that have already been assigned in this batch
                if column in already_assigned_columns:
                    print(f"  ⏭️ Skipping '{column}' - already assigned in this batch")
                    continue

                column_data = []
                for row in existing_data:
                    value = row.get(column) if isinstance(row, dict) else None
                    column_data.append(value)

                # Check if column is mostly empty
                numeric_count = 0
                total_rows = len(existing_data)

                for value in column_data:
                    if value is not None and value != '' and value != 'None':
                        try:
                            float_val = float(value)
                            if not (pd.isna(float_val) or float_val == 0):
                                numeric_count += 1
                        except (ValueError, TypeError):
                            continue

                percentage = (numeric_count / total_rows * 100) if total_rows > 0 else 0

                if percentage < 20:  # Less than 20% data = empty
                    empty_columns.append(column)
                    print(f"  📝 Empty column found: '{column}' ({percentage:.1f}% data)")
                else:
                    columns_with_data.append(column)
                    print(f"  ✅ Column with data: '{column}' ({percentage:.1f}% data)")

            # Strategy 1: Replace the first available empty column
            if empty_columns:
                target_column = empty_columns[0]  # First available empty column
                print(f"  🔄 STRATEGY: Replace empty column '{target_column}' with '{new_column_name}' data")
                return {
                    'action': 'replace',
                    'target_column': target_column,
                    'new_column_name': new_column_name,
                    'reason': f"Replacing empty column '{target_column}' with '{new_column_name}' data"
                }

            # Strategy 2: Add as new column if under limit
            if len(existing_columns_in_category) < max_columns_per_category:
                print(
                    f"  ➕ STRATEGY: Add new column '{new_column_name}' ({len(existing_columns_in_category) + 1}/{max_columns_per_category})")
                return {
                    'action': 'add_new',
                    'new_column_name': new_column_name,
                    'reason': f"Adding new column - under limit ({len(existing_columns_in_category) + 1}/{max_columns_per_category})"
                }

            # Strategy 3: Reject - no space and all columns have data
            print(
                f"  ❌ STRATEGY: Reject - all columns have data and at max limit ({len(existing_columns_in_category)}/{max_columns_per_category})")
            return {
                'action': 'reject',
                'reason': f"Category '{category_id}' is at maximum capacity ({max_columns_per_category} columns) and all existing columns have data"
            }

        def process_smart_column_mapping(imported_headers, imported_records, category_mappings, existing_data,
                                         existing_category_mappings, max_columns_per_category=10):
            """
            Process imported columns with smart replacement/addition logic
            """
            print("\n🧠 PROCESSING SMART COLUMN MAPPING")

            print(f"🔍 DEBUG: Frontend sent category_mappings: {category_mappings}")
            for i, cat in enumerate(category_mappings):
                print(f"  Category {i}: {cat.get('id')} → columns: {cat.get('columns', [])}")

            column_operations = []

            # 🔧 FIX: Start with existing categories and ONLY update what changed
            final_category_mappings = []
            for cat in existing_category_mappings:
                final_category_mappings.append({
                    'id': cat.get('id'),
                    'name': cat.get('name'),
                    'columns': cat.get('columns', []).copy(),  # Keep existing columns
                    'imported_column_mapping': cat.get('imported_column_mapping', {}).copy()
                    # ✅ PRESERVE EXISTING MAPPINGS!
                })

            # 🆕 ONLY PROCESS EXPLICITLY MAPPED COLUMNS (USER'S DRAG & DROP CHOICES)
            explicitly_mapped_columns = set()
            for category in category_mappings:
                for col in category.get('columns', []):
                    explicitly_mapped_columns.add(col)

            print(f"📌 Only processing explicitly mapped columns: {list(explicitly_mapped_columns)}")
            print(f"📌 Ignoring unmapped columns: {set(imported_headers) - explicitly_mapped_columns}")

            # 🔧 NEW: Track which columns have been assigned during this operation
            already_assigned_columns = set()

            # Process each imported column ONLY IF IT WAS EXPLICITLY MAPPED
            for header in imported_headers:
                # 🆕 SKIP UNMAPPED COLUMNS - Let them stay as uncategorized
                if header not in explicitly_mapped_columns:
                    print(f"  ⏭️ SKIPPING {header} - not explicitly mapped by user")
                    continue

                # Find which category this column belongs to
                target_category = None
                for category in category_mappings:
                    if header in category.get('columns', []):
                        target_category = category
                        break

                if not target_category:
                    # This shouldn't happen since we filtered for explicitly mapped columns
                    column_operations.append({
                        'imported_column': header,
                        'action': 'keep',
                        'final_column': header,
                        'reason': 'No category mapping specified'
                    })
                    continue

                category_id = target_category.get('id')

                # Skip student category - always allow
                if category_id == 'student':
                    column_operations.append({
                        'imported_column': header,
                        'action': 'keep',
                        'final_column': header,
                        'category': category_id,
                        'reason': 'Student category - always allowed'
                    })
                    continue

                # Get column data from imported records
                column_data = [record.get(header) for record in imported_records]

                # 🔧 PASS already_assigned_columns to avoid conflicts
                strategy = find_best_column_replacement(
                    category_id,
                    header,
                    column_data,
                    existing_data,
                    existing_category_mappings,
                    already_assigned_columns,  # 🆕 Pass the tracking set
                    max_columns_per_category
                )

                if strategy['action'] == 'replace':
                    # Replace existing empty column
                    target_column = strategy['target_column']

                    # 🔧 TRACK the assigned column to prevent conflicts
                    already_assigned_columns.add(target_column)

                    column_operations.append({
                        'imported_column': header,
                        'action': 'replace',
                        'final_column': target_column,
                        'category': category_id,
                        'reason': strategy['reason']
                    })
                    print(f"  🔄 {header} → {target_column} (replace)")

                    # 🔧 CRITICAL FIX: PRESERVE existing imported_column_mapping
                    for final_cat in final_category_mappings:
                        if final_cat['id'] == category_id:
                            # Initialize if doesn't exist
                            if 'imported_column_mapping' not in final_cat:
                                final_cat['imported_column_mapping'] = {}

                            # 🆕 PRESERVE existing mappings and add new one
                            existing_mapping = final_cat.get('imported_column_mapping', {})
                            final_cat['imported_column_mapping'] = {**existing_mapping, target_column: header}
                            print(
                                f"🔧 Updated imported_column_mapping for {category_id}: {final_cat['imported_column_mapping']}")
                            break

                elif strategy['action'] == 'add_new':
                    # Add as new column
                    column_operations.append({
                        'imported_column': header,
                        'action': 'add_new',
                        'final_column': header,
                        'category': category_id,
                        'reason': strategy['reason']
                    })
                    print(f"  ➕ {header} → {header} (new)")

                    # 🔧 CRITICAL FIX: PRESERVE existing imported_column_mapping
                    for final_cat in final_category_mappings:
                        if final_cat['id'] == category_id:
                            if header not in final_cat['columns']:
                                final_cat['columns'].append(header)

                            # Initialize if doesn't exist
                            if 'imported_column_mapping' not in final_cat:
                                final_cat['imported_column_mapping'] = {}

                            # 🆕 PRESERVE existing mappings and add new one
                            existing_mapping = final_cat.get('imported_column_mapping', {})
                            final_cat['imported_column_mapping'] = {**existing_mapping, header: header}
                            print(
                                f"🔧 Updated imported_column_mapping for {category_id}: {final_cat['imported_column_mapping']}")
                            break

                else:  # reject
                    column_operations.append({
                        'imported_column': header,
                        'action': 'reject',
                        'reason': strategy['reason']
                    })
                    print(f"  ❌ {header} → REJECTED ({strategy['reason']})")

            # 🆕 HANDLE UNMAPPED COLUMNS - But check if they were already imported before
            unmapped_columns = set(imported_headers) - explicitly_mapped_columns

            # 🚫 Get list of previously imported column names to avoid duplicates
            previously_imported_columns = set()
            for category in existing_category_mappings:
                imported_mapping = category.get('imported_column_mapping', {})
                for original_name in imported_mapping.values():
                    if original_name:
                        previously_imported_columns.add(original_name)

            print(f"🚫 Previously imported columns to skip: {list(previously_imported_columns)}")

            for unmapped_col in unmapped_columns:
                # 🚫 Skip if this column was already imported before
                if unmapped_col in previously_imported_columns:
                    print(f"  🚫 SKIPPING '{unmapped_col}' - already imported previously")
                    continue

                print(f"  📝 Adding unmapped column '{unmapped_col}' as-is (no smart replacement)")
                column_operations.append({
                    'imported_column': unmapped_col,
                    'action': 'keep_unmapped',
                    'final_column': unmapped_col,
                    'reason': 'Column not mapped to any category by user'
                })

            print(f"🔍 DEBUG: Final category mappings: {final_category_mappings}")
            return column_operations, final_category_mappings

        def reorder_columns_by_category(headers, category_mappings):
            """Reorder headers to group categories together"""
            print("=== REORDERING COLUMNS BY CATEGORY ===")

            # Create ordered header list
            ordered_headers = []
            used_headers = set()

            # Process each category in order
            category_order = ['student', 'quiz', 'laboratory', 'exams']

            for category_mapping in category_mappings:
                category_id = category_mapping.get('id')
                category_columns = category_mapping.get('columns', [])

                if category_id in category_order:
                    print(f"Adding {len(category_columns)} columns for {category_id}: {category_columns}")
                    for col in category_columns:
                        if col in headers and col not in used_headers:
                            ordered_headers.append(col)
                            used_headers.add(col)

            # Add any remaining headers that weren't categorized
            for header in headers:
                if header not in used_headers:
                    ordered_headers.append(header)
                    used_headers.add(header)

            print(f"Original order: {headers}")
            print(f"New order: {ordered_headers}")

            return ordered_headers

        try:
            # Check permissions for the class
            from classes.models import Class
            class_obj = Class.objects.get(id=class_id)

            if class_obj.user != request.user:
                from teams.models import TeamMember
                team_member = TeamMember.objects.filter(
                    team__courses__course_id=class_obj.course.id if class_obj.course else None,
                    user=request.user,
                    is_active=True
                ).first()

                if not team_member or team_member.permissions not in ['edit', 'full']:
                    return Response({'error': 'You do not have permission to modify files in this class'},
                                    status=status.HTTP_403_FORBIDDEN)

            # Get existing file
            existing_file = ExcelFile.objects.filter(class_ref=class_obj).order_by('-uploaded_at').first()

            if not existing_file:
                # No existing file, upload as new
                return self.upload(request)

            # Load and process new file
            new_excel = pd.read_excel(file, sheet_name=None)
            first_sheet_name = list(new_excel.keys())[0]
            df = new_excel[first_sheet_name]

            # Clean columns (same as preview_merge)
            original_columns = df.columns.tolist()
            columns_to_keep = []
            for col in original_columns:
                col_str = str(col).strip()
                if not (col_str.startswith('Unnamed:') or
                        col_str in ['', 'nan', 'NaN', 'None'] or
                        col_str.lower() == 'null' or
                        df[col].isna().all() or
                        (df[col] == '').all()):
                    columns_to_keep.append(col)

            df = df[columns_to_keep]
            df = df.replace({pd.NA: None}).fillna("")

            # Convert to records
            imported_records = []
            for record in df.to_dict('records'):
                cleaned_record = {}
                for key, value in record.items():
                    if pd.isna(value):
                        cleaned_record[key] = None
                    elif isinstance(value, (pd.Timestamp, pd.DatetimeTZDtype, datetime.datetime, datetime.date)):
                        cleaned_record[key] = value.isoformat()
                    else:
                        cleaned_record[key] = value
                imported_records.append(cleaned_record)

            imported_headers = df.columns.tolist()

            # Get existing data
            active_sheet = existing_file.active_sheet
            existing_data = existing_file.all_sheets[active_sheet]['data']
            existing_headers = existing_file.all_sheets[active_sheet]['headers']
            existing_category_mappings = existing_file.all_sheets.get('category_mappings', [])

            # 🆕 SMART COLUMN MAPPING INSTEAD OF SIMPLE FILTERING
            column_operations, updated_category_mappings = process_smart_column_mapping(
                imported_headers,
                imported_records,
                category_mappings,
                existing_data,
                existing_category_mappings
            )

            # Check for rejected columns
            rejected_operations = [op for op in column_operations if op['action'] == 'reject']
            if rejected_operations:
                print(f"\n⚠️ WARNING: {len(rejected_operations)} columns were rejected:")
                for i, op in enumerate(rejected_operations):
                    print(f"  {i + 1}. {op['imported_column']}: {op['reason']}")

                return Response({
                    'error': 'Some columns were rejected due to category capacity limits',
                    'details': {
                        'rejected_columns': [op['imported_column'] for op in rejected_operations],
                        'rejection_reasons': [op['reason'] for op in rejected_operations],
                        'suggestion': 'All existing columns in the category have data and the category is at maximum capacity.'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

            # Apply column operations
            print(f"\n🔄 APPLYING {len(column_operations)} COLUMN OPERATIONS:")
            merged_data = existing_file.all_sheets[active_sheet].copy()

            # Track new columns that are actually added (not replaced)
            new_columns_added = []

            for operation in column_operations:
                if operation['action'] in ['keep', 'add_new', 'replace', 'keep_unmapped']:  # 🆕 Add keep_unmapped
                    imported_column = operation['imported_column']
                    final_column = operation['final_column']

                    print(f"  {operation['action'].upper()}: {imported_column} → {final_column}")

                    # Add column to headers if new
                    if final_column not in merged_data['headers']:
                        merged_data['headers'].append(final_column)
                        if operation['action'] in ['add_new', 'keep_unmapped']:  # 🆕 Count unmapped as new
                            new_columns_added.append(final_column)

                    # Initialize column in existing records if new
                    for record in merged_data['data']:
                        if final_column not in record:
                            record[final_column] = None

            print(f"✅ Applied column operations successfully")

            # Use provided column mapping or detect automatically
            if not column_mapping:
                existing_column_mapping = self.detect_student_columns(existing_headers)
                imported_column_mapping = self.detect_student_columns(imported_headers)
            else:
                existing_column_mapping = self.detect_student_columns(existing_headers)
                imported_column_mapping = column_mapping

            print(f"Using column mapping - Existing: {existing_column_mapping}, Imported: {imported_column_mapping}")

            # Re-run conflict detection to get current state
            conflict_results = self.process_merge_conflicts(
                existing_data,
                imported_records,
                existing_column_mapping,
                imported_column_mapping,
                matching_threshold
            )

            # Counters for statistics
            exact_matches_processed = 0
            fuzzy_matches_processed = 0
            conflicts_resolved = 0
            new_students_added = 0
            skipped_count = 0

            # Process exact matches (if bulk action enabled or individual decisions)
            if bulk_actions.get('accept_all_exact', False):
                print("Processing bulk action: accept all exact matches")
                for match in conflict_results['exact_matches']:
                    try:
                        existing_record = match['existing_record']
                        imported_record = match['imported_record']

                        # Apply column operations to update the right columns
                        for operation in column_operations:
                            if operation['action'] in ['keep', 'add_new', 'replace']:
                                imported_column = operation['imported_column']
                                final_column = operation['final_column']

                                if imported_column in imported_record:
                                    existing_record[final_column] = imported_record[imported_column]

                        exact_matches_processed += 1
                    except Exception as e:
                        print(f"Error processing exact match: {str(e)}")
                        skipped_count += 1

            # Process fuzzy matches with high confidence (if bulk action enabled)
            if bulk_actions.get('accept_high_confidence', False):
                print("Processing bulk action: accept high confidence fuzzy matches")
                high_confidence_matches = [m for m in conflict_results['fuzzy_matches'] if m.get('confidence', 0) > 0.9]
                for match in high_confidence_matches:
                    try:
                        existing_record = match['existing_record']
                        imported_record = match['imported_record']

                        # Apply column operations to update the right columns
                        for operation in column_operations:
                            if operation['action'] in ['keep', 'add_new', 'replace']:
                                imported_column = operation['imported_column']
                                final_column = operation['final_column']

                                if imported_column in imported_record:
                                    existing_record[final_column] = imported_record[imported_column]

                        fuzzy_matches_processed += 1
                    except Exception as e:
                        print(f"Error processing high confidence match: {str(e)}")
                        skipped_count += 1

            # Process individual conflict resolutions
            for conflict_index, resolution in conflict_resolutions.items():
                try:
                    conflict_index = int(conflict_index)
                    if conflict_index < len(conflict_results['conflicts']):
                        conflict = conflict_results['conflicts'][conflict_index]
                        action = resolution.get('action')

                        if action == 'override':
                            # Override existing record with imported data
                            existing_record = conflict['existing_record']
                            imported_record = conflict['imported_record']

                            # Apply column operations to update the right columns
                            for operation in column_operations:
                                if operation['action'] in ['keep', 'add_new', 'replace']:
                                    imported_column = operation['imported_column']
                                    final_column = operation['final_column']

                                    if imported_column in imported_record:
                                        existing_record[final_column] = imported_record[imported_column]

                            conflicts_resolved += 1
                            print(f"Conflict {conflict_index}: Override existing record")

                        elif action == 'keep_existing':
                            # Keep existing record, just add new columns with null values
                            existing_record = conflict['existing_record']
                            imported_record = conflict['imported_record']

                            # Only add data for completely new columns (not replacements)
                            for operation in column_operations:
                                if operation['action'] == 'add_new':
                                    imported_column = operation['imported_column']
                                    final_column = operation['final_column']

                                    if imported_column in imported_record:
                                        existing_record[final_column] = imported_record[imported_column]

                            conflicts_resolved += 1
                            print(f"Conflict {conflict_index}: Keep existing record")

                        elif action == 'add_new':
                            # Add imported record as new student
                            new_record = {key: None for key in merged_data['headers']}

                            # Apply column operations for the new student record
                            for operation in column_operations:
                                if operation['action'] in ['keep', 'add_new', 'replace']:
                                    imported_column = operation['imported_column']
                                    final_column = operation['final_column']

                                    if imported_column in conflict['imported_record']:
                                        new_record[final_column] = conflict['imported_record'][imported_column]

                            merged_data['data'].append(new_record)
                            conflicts_resolved += 1
                            new_students_added += 1
                            print(f"Conflict {conflict_index}: Add as new student")

                except Exception as e:
                    print(f"Error processing conflict resolution {conflict_index}: {str(e)}")
                    skipped_count += 1

            # Process new students (if bulk action enabled or no conflicts)
            if bulk_actions.get('add_all_new', False):
                print("Processing bulk action: add all new students")
                for new_student in conflict_results['new_students']:
                    try:
                        new_record = {key: None for key in merged_data['headers']}

                        # Apply column operations for the new student record
                        for operation in column_operations:
                            if operation['action'] in ['keep', 'add_new', 'replace']:
                                imported_column = operation['imported_column']
                                final_column = operation['final_column']

                                if imported_column in new_student['imported_record']:
                                    new_record[final_column] = new_student['imported_record'][imported_column]

                        merged_data['data'].append(new_record)
                        new_students_added += 1
                    except Exception as e:
                        print(f"Error adding new student: {str(e)}")
                        skipped_count += 1

            # Process remaining fuzzy matches that weren't handled by bulk actions
            remaining_fuzzy = [m for m in conflict_results['fuzzy_matches']
                               if
                               not bulk_actions.get('accept_high_confidence', False) or m.get('confidence', 0) <= 0.9]

            # Handle category mappings with updated mappings
            if updated_category_mappings:
                print(f"Received {len(updated_category_mappings)} updated category mappings")

                existing_file.all_sheets['category_mappings'] = updated_category_mappings
                print(f"✅ Updated category mappings with {len(updated_category_mappings)} categories (smart mapped)")

                # Reorder columns
                current_headers = merged_data['headers']
                new_header_order = reorder_columns_by_category(current_headers, updated_category_mappings)

                if new_header_order != current_headers:
                    print("🔄 Reordering columns based on category mappings...")

                    # Reorder data to match new header order - handle both dict and list formats
                    reordered_data = []
                    for row in merged_data['data']:
                        if isinstance(row, dict):
                            # Keep as dict but ensure all headers are present
                            reordered_row = {}
                            for header in new_header_order:
                                reordered_row[header] = row.get(header)
                            reordered_data.append(reordered_row)
                        else:
                            # Convert list to dict first, then reorder
                            row_dict = {}
                            for i, header in enumerate(current_headers):
                                row_dict[header] = row[i] if i < len(row) else None

                            # Create reordered dict
                            reordered_row = {}
                            for header in new_header_order:
                                reordered_row[header] = row_dict.get(header)
                            reordered_data.append(reordered_row)

                    # Update merged data
                    merged_data['headers'] = new_header_order
                    merged_data['data'] = reordered_data

                    print(f"✅ Reordered {len(new_header_order)} columns to group categories")
                else:
                    print("No column reordering needed - order is already correct")

            else:
                print("No updated category mappings - keeping existing structure")

            # Update the file with merged data
            existing_file.all_sheets[active_sheet] = merged_data
            existing_file.update_count += 1
            existing_file.save()

            # Count operations for summary
            replaced_columns = len([op for op in column_operations if op['action'] == 'replace'])
            added_columns = len([op for op in column_operations if op['action'] == 'add_new'])

            print(f"Merge execution complete:")
            print(f"  - Exact matches processed: {exact_matches_processed}")
            print(f"  - Fuzzy matches processed: {fuzzy_matches_processed}")
            print(f"  - Conflicts resolved: {conflicts_resolved}")
            print(f"  - New students added: {new_students_added}")
            print(f"  - Records skipped: {skipped_count}")
            print(f"  - Columns replaced: {replaced_columns}")
            print(f"  - New columns added: {added_columns}")

            serializer = self.get_serializer(existing_file)
            return Response({
                **serializer.data,
                'merge_results': {
                    'exact_matches_processed': exact_matches_processed,
                    'fuzzy_matches_processed': fuzzy_matches_processed,
                    'conflicts_resolved': conflicts_resolved,
                    'new_students_added': new_students_added,
                    'skipped_count': skipped_count,
                    'columns_replaced': replaced_columns,
                    'new_columns_added': added_columns,
                    'total_records': len(merged_data['data']),
                    'bulk_actions_applied': list(bulk_actions.keys()) if bulk_actions else [],
                    'column_operations': [
                        {
                            'imported': op['imported_column'],
                            'final': op['final_column'],
                            'action': op['action']
                        } for op in column_operations if op['action'] != 'reject'
                    ],
                    'summary': f"Successfully merged file with {exact_matches_processed + fuzzy_matches_processed + new_students_added} records processed, {replaced_columns} columns replaced, {added_columns} new columns added"
                }
            })

        except Class.DoesNotExist:
            return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            print("Error during execute merge:", str(e))
            print("Traceback:", traceback.format_exc())
            return Response({'error': f'Merge execution failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description='Upload Excel file',
        request={
            'multipart/form-data': {'type': 'object', 'properties': {'file': {'type': 'string', 'format': 'binary'}}}},
        responses={201: ExcelFileSerializer}
    )
    @action(detail=False, methods=['POST'])
    def upload(self, request):
        print("Upload request received")

        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        print(f"File received: {file.name}")

        if not file.name.endswith(('.xlsx', '.xls')):
            return Response({'error': 'File must be an Excel file'}, status=status.HTTP_400_BAD_REQUEST)

        class_id = request.data.get('class_id')
        if not class_id:
            return Response({'error': 'class_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        custom_columns = []
        if 'custom_columns' in request.data:
            try:
                import json
                custom_columns = json.loads(request.data.get('custom_columns'))
                print(f"Received {len(custom_columns)} custom columns")
            except Exception as e:
                print("Error parsing custom columns:", str(e))
                # Continue processing even if custom columns parsing fails

        # Process category mappings if provided
        category_mappings = []
        if 'category_mappings' in request.data:
            try:
                import json
                category_mappings_str = request.data.get('category_mappings')
                print(f"Raw category mappings from request: {category_mappings_str[:100] if category_mappings_str else 'None'}...")

                if category_mappings_str:
                    category_mappings_data = json.loads(category_mappings_str)
                    print(f"Parsed category mappings - type: {type(category_mappings_data)}")

                    # Handle array format with 'id', 'name', and 'columns' properties
                    if isinstance(category_mappings_data, list):
                        category_mappings = category_mappings_data
                        print(f"Processed {len(category_mappings)} category mappings from array format")
                    else:
                        print("Category mappings data is not in expected array format")
            except Exception as e:
                print("Error parsing category mappings:", str(e))
                import traceback
                print("Traceback:", traceback.format_exc())
                # Continue processing even if category mappings parsing fails

        try:
            from classes.models import Class
            class_obj = Class.objects.get(id=class_id)

            if class_obj.user != request.user:
                from teams.models import TeamMember

                team_member = TeamMember.objects.filter(
                    team__courses__course_id=class_obj.course.id if class_obj.course else None,
                    user=request.user,
                    is_active=True
                ).first()

                if not team_member or team_member.permissions not in ['edit', 'full']:
                    return Response({'error': 'You do not have permission to upload files to this class'},
                                    status=status.HTTP_403_FORBIDDEN)
        except Class.DoesNotExist:
            return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            excel_data = pd.read_excel(file, sheet_name=None)
            print(f"Excel file contains {len(excel_data)} sheets")

            all_sheets_data = {}

            for sheet_name, df in excel_data.items():
                print(f"Processing sheet: {sheet_name}, shape: {df.shape}")

                # Remove columns that are completely empty or have unnamed/null column names
                # This fixes the issue with extra blank columns appearing
                original_columns = df.columns.tolist()

                # Filter out columns that are:
                # 1. Completely empty (all NaN/null values)
                # 2. Have unnamed/generic column names like 'Unnamed: X'
                # 3. Have null/empty column names
                columns_to_keep = []
                for col in original_columns:
                    col_str = str(col).strip()

                    # Skip columns with generic/unnamed headers
                    if (col_str.startswith('Unnamed:') or
                        col_str in ['', 'nan', 'NaN', 'None'] or
                        col_str.lower() == 'null'):
                        print(f"Removing column with generic/empty name: '{col_str}'")
                        continue

                    # Skip columns that are completely empty
                    if df[col].isna().all() or (df[col] == '').all():
                        print(f"Removing completely empty column: '{col_str}'")
                        continue

                    columns_to_keep.append(col)

                # Keep only the valid columns
                df = df[columns_to_keep]
                print(f"Filtered columns from {len(original_columns)} to {len(columns_to_keep)}")

                df = df.replace({pd.NA: None})
                df = df.fillna("")

                for column in df.select_dtypes(include=['float64', 'int64']).columns:
                    df[column] = df[column].apply(
                        lambda x: None if pd.isna(x) else float(x) if isinstance(x, float) else int(x))

                records = []
                for record in df.to_dict('records'):
                    cleaned_record = {}
                    for key, value in record.items():
                        if pd.isna(value):
                            cleaned_record[key] = None
                        elif isinstance(value, (pd.Timestamp, pd.DatetimeTZDtype, datetime.datetime, datetime.date)):
                            cleaned_record[key] = value.isoformat()
                        else:
                            cleaned_record[key] = value
                    records.append(cleaned_record)

                headers = df.columns.tolist()

                # Add custom columns if provided
                if custom_columns and sheet_name == list(excel_data.keys())[0]:  # Apply to first sheet only
                    # Filter out header-type columns for adding to data
                    custom_column_headers = [col['name'] for col in custom_columns if col.get('type') != 'header']
                    headers.extend(custom_column_headers)

                    for record in records:
                        for header in custom_column_headers:
                            record[header] = None

                all_sheets_data[sheet_name] = {
                    'headers': headers,
                    'data': records
                }

            # Add category mappings to the data structure if provided
            if category_mappings:
                all_sheets_data['category_mappings'] = category_mappings
                print(f"Added category mappings to file data: {len(category_mappings)} categories")
                for cat in category_mappings:
                    print(f"  Category '{cat.get('name')}' ({cat.get('id')}): {len(cat.get('columns', []))} columns")

            first_sheet_name = list(all_sheets_data.keys())[0] if all_sheets_data else 'Sheet1'

            excel_file = ExcelFile.objects.create(
                user=request.user,
                class_ref=class_obj,
                file_name=file.name,
                all_sheets=all_sheets_data,
                active_sheet=first_sheet_name
            )
            print(f"ExcelFile created with ID: {excel_file.id}, containing {len(all_sheets_data)} sheets")

            serializer = self.get_serializer(excel_file)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"Error during upload: {str(e)}")
            import traceback
            print("Traceback:", traceback.format_exc())
            if 'excel_file' in locals():
                excel_file.delete()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=True, methods=['PATCH'], permission_classes=[IsAuthenticated])
    def update_categories(self, request, pk=None):
        try:
            excel_file = self.get_object()  # This will use existing permission checks

            # Check permissions (similar to update_data)
            if excel_file.user.id != request.user.id:
                # Only allow if user is a team member with appropriate access
                has_team_access = False
                if excel_file.class_ref and excel_file.class_ref.course:
                    from teams.models import TeamMember
                    team_access = TeamMember.objects.filter(
                        team__courses__course_id=excel_file.class_ref.course.id,
                        user=request.user,
                        is_active=True,
                        permissions__in=['edit', 'full']
                    ).exists()
                    if team_access:
                        has_team_access = True
                        print("Team access granted for category update")

                if not has_team_access:
                    print("Permission denied for category update: Not owner and no team access")
                    return Response(
                        {'error': 'You do not have permission to modify this file'},
                        status=status.HTTP_403_FORBIDDEN
                    )

            # Process category mappings data
            if 'all_sheets' in request.data and 'category_mappings' in request.data['all_sheets']:
                category_mappings = request.data['all_sheets']['category_mappings']

                # Update the file with the new mappings
                if 'category_mappings' not in excel_file.all_sheets:
                    excel_file.all_sheets['category_mappings'] = []

                excel_file.all_sheets['category_mappings'] = category_mappings

                # Increment update counter
                excel_file.update_count += 1
                print(f"Incremented update count to: {excel_file.update_count}")

                excel_file.save()

                print(f"Updated category mappings: {len(category_mappings)} categories")
                for cat in category_mappings:
                    print(f"  Category '{cat.get('name')}' ({cat.get('id')}): {len(cat.get('columns', []))} columns")

                # Get updated serializer data to return
                serializer = self.get_serializer(excel_file)
                return Response({
                    'message': 'Category mappings updated successfully',
                    'file_data': serializer.data,
                    'update_count': excel_file.update_count  # Include update_count in response
                })
            else:
                return Response({'error': 'No category_mappings provided in all_sheets'},
                                status=status.HTTP_400_BAD_REQUEST)

        except ExcelFile.DoesNotExist:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            print("Error updating categories:", str(e))
            print("Traceback:", traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    #updated
    @action(detail=True, methods=['PATCH'], permission_classes=[IsAuthenticated])
    def update_data(self, request, pk=None):
        try:
            excel_file = ExcelFile.objects.get(pk=pk)

            # Parse JSON if needed
            sheet_data = request.data.get('sheet_data')
            if isinstance(sheet_data, str):
                import json
                try:
                    sheet_data = json.loads(sheet_data)
                    print("Parsed sheet_data from string")
                except json.JSONDecodeError as e:
                    return Response(
                        {'error': f'Invalid JSON in sheet_data: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            sheet_name = request.data.get('sheet_name', excel_file.active_sheet)

            # Add a simple permission check to ensure user owns the file or is in the right team
            if excel_file.user.id != request.user.id:
                # Simple log to debug permission issues
                print(f"Permission check: File owner: {excel_file.user.id}, Request user: {request.user.id}")

                # Only allow if user is a team member with appropriate access
                has_team_access = False
                if excel_file.class_ref and excel_file.class_ref.course:
                    from teams.models import TeamMember
                    team_access = TeamMember.objects.filter(
                        team__courses__course_id=excel_file.class_ref.course.id,
                        user=request.user,
                        is_active=True,
                        permissions__in=['edit', 'full']
                    ).exists()
                    if team_access:
                        has_team_access = True
                        print("Team access granted")

                # If neither owner nor team access, deny
                if not has_team_access:
                    print("Permission denied: Not owner and no team access")
                    return Response(
                        {'error': 'You do not have permission to modify this file'},
                        status=status.HTTP_403_FORBIDDEN
                    )

            if not sheet_data:
                return Response(
                    {'error': 'sheet_data is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if sheet_name not in excel_file.all_sheets:
                return Response(
                    {'error': f'Sheet {sheet_name} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            if 'headers' in request.data:
                new_headers = request.data.get('headers')
                excel_file.all_sheets[sheet_name]['headers'] = new_headers
                print(f"Updated headers explicitly: {new_headers}")

            # Log data structure to debug
            print(f"Sheet data type: {type(sheet_data)}")
            if isinstance(sheet_data, list) and len(sheet_data) > 0:
                print(f"First row type: {type(sheet_data[0])}")

            existing_headers = excel_file.all_sheets[sheet_name]['headers']

            # Validate that we have a list of dictionaries/objects
            if not isinstance(sheet_data, list):
                return Response(
                    {'error': 'sheet_data must be a list of objects/rows'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            all_keys = set()
            for row in sheet_data:
                # Check each row is a dictionary
                if not isinstance(row, dict):
                    print(f"Invalid row type: {type(row)}, value: {row}")
                    if isinstance(row, str):
                        # Try to parse as JSON if it's a string
                        try:
                            row_dict = json.loads(row)
                            all_keys.update(row_dict.keys())
                        except:
                            continue  # Skip this row if parsing fails
                    else:
                        continue  # Skip non-dictionary rows
                else:
                    all_keys.update(row.keys())

            new_headers = existing_headers.copy()
            for key in all_keys:
                if key not in new_headers:
                    print(f"Adding new column: {key}")
                    new_headers.append(key)

            excel_file.all_sheets[sheet_name]['headers'] = new_headers

            formatted_data = []
            for row in sheet_data:
                # Convert row to dict if needed
                if not isinstance(row, dict):
                    if isinstance(row, str):
                        try:
                            row = json.loads(row)
                        except:
                            continue  # Skip invalid rows
                    else:
                        continue  # Skip non-dictionary rows

                formatted_row = {}
                for key, value in row.items():
                    if value == "":
                        formatted_row[key] = None
                    elif isinstance(value, str) and value.replace('.', '', 1).isdigit():
                        formatted_row[key] = float(value) if '.' in value else int(value)
                    else:
                        formatted_row[key] = value
                formatted_data.append(formatted_row)

            excel_file.all_sheets[sheet_name]['data'] = formatted_data

            # Increment the update counter
            excel_file.update_count += 1
            print(f"Incremented update count to: {excel_file.update_count}")

            excel_file.save()
            print(f"Updated Excel file with new headers: {new_headers}")

            return Response({
                'message': f'Data updated successfully for sheet {sheet_name}',
                'sheet_data': formatted_data,
                'sheet_name': sheet_name,
                'headers': new_headers,
                'update_count': excel_file.update_count  # Include update_count in response
            })

        except ExcelFile.DoesNotExist:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            print("Error updating data:", str(e))
            print("Traceback:", traceback.format_exc())
            return (Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        @extend_schema(
        description='Get student names from Excel file',
        responses={200: {
            'type': 'object',
            'properties': {
                'students': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'first_name': {'type': 'string'},
                            'last_name': {'type': 'string'},
                            'full_name': {'type': 'string'}
                        }
                    }
                },
                'detected_columns': {
                    'type': 'object',
                    'properties': {
                        'first_name_column': {'type': 'string'},
                        'last_name_column': {'type': 'string'}
                    }
                },
                'total_count': {'type': 'integer'}
            }
        }}
    ))
    @action(detail=True, methods=['GET'])
    def student_names(self, request, pk=None):
        try:
            excel_file = self.get_object()

            # Get the active sheet data
            sheet_name = excel_file.active_sheet
            if sheet_name not in excel_file.all_sheets:
                return Response(
                    {'error': f'Sheet {sheet_name} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            sheet_data = excel_file.all_sheets[sheet_name]
            headers = sheet_data.get('headers', [])
            data = sheet_data.get('data', [])

            # Auto-detect name columns
            first_name_patterns = [
                'first name', 'firstname', 'first_name', 'fname', 'given name', 'givenname',
                'name_first', 'student_first', 'first', 'prenom', 'nombre'
            ]
            last_name_patterns = [
                'last name', 'lastname', 'last_name', 'lname', 'surname', 'family name',
                'familyname', 'name_last', 'student_last', 'last', 'apellido', 'nom'
            ]

            first_name_col = None
            last_name_col = None

            for header in headers:
                if not first_name_col and any(pattern in header.lower() for pattern in first_name_patterns):
                    first_name_col = header
                if not last_name_col and any(pattern in header.lower() for pattern in last_name_patterns):
                    last_name_col = header

                if first_name_col and last_name_col:
                    break

            # Extract student names
            students = []
            for record in data:
                first_name = record.get(first_name_col, '').strip() if first_name_col else ''
                last_name = record.get(last_name_col, '').strip() if last_name_col else ''

                if first_name or last_name:
                    full_name = ''
                    if first_name and last_name:
                        full_name = f"{first_name} {last_name}"
                    elif first_name:
                        full_name = first_name
                    elif last_name:
                        full_name = last_name

                    students.append({
                        'first_name': first_name,
                        'last_name': last_name,
                        'full_name': full_name
                    })

            return Response({
                'students': students,
                'detected_columns': {
                    'first_name_column': first_name_col,
                    'last_name_column': last_name_col
                },
                'total_count': len(students)
            })

        except ExcelFile.DoesNotExist:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            print("Error getting student names:", str(e))
            print("Traceback:", traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

