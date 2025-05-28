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

    def normalize_name(self, name):
        """Normalize a name by removing accents, extra spaces, and converting to lowercase."""
        if name is None:
            return ""

        # Convert to string if not already
        name = str(name).strip()

        # Remove accents and convert to lowercase
        normalized = unidecode(name).lower()

        # Remove extra spaces
        normalized = " ".join(normalized.split())

        return normalized

    def find_best_match(self, name, existing_names, threshold=0.85):
        """Find best matching name from existing names using Levenshtein distance."""
        if not name:
            return None

        name = self.normalize_name(name)

        # Quick exact match first (most efficient)
        if name in existing_names:
            return existing_names[name]

        # Try reversing "Last, First" to "First Last"
        if "," in name:
            parts = name.split(",")
            if len(parts) == 2:
                reversed_name = f"{parts[1].strip()} {parts[0].strip()}"
                if reversed_name in existing_names:
                    return existing_names[reversed_name]

        # Fuzzy matching using Levenshtein distance
        best_match = None
        best_score = 0

        for existing_name, original in existing_names.items():
            # Skip very short names for fuzzy matching to avoid false positives
            if len(name) < 3 or len(existing_name) < 3:
                continue

            # Calculate similarity ratio
            similarity = Levenshtein.ratio(name, existing_name)

            # If names are very similar or exact match for first/last names
            name_parts = set(name.split())
            existing_parts = set(existing_name.split())
            common_parts = name_parts.intersection(existing_parts)

            # Boost score if there are common parts (first/last name matches)
            if common_parts:
                similarity += 0.1 * len(common_parts) / max(len(name_parts), len(existing_parts))

            if similarity > best_score and similarity >= threshold:
                best_score = similarity
                best_match = original

        return best_match

    @extend_schema(
        description='Merge Excel file with existing file',
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'file': {'type': 'string', 'format': 'binary'},
                    'class_id': {'type': 'integer'},
                    'merge': {'type': 'boolean'},
                    'override_names': {'type': 'boolean'},
                    'category_mappings': {'type': 'string'},  # JSON string of category mappings
                    'matching_threshold': {'type': 'number'}  # Added threshold parameter
                }
            }
        },
        responses={200: ExcelFileSerializer}
    )
    @action(detail=False, methods=['POST'])
    def merge(self, request):
        print("Merge request received")

        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        print(f"File received for merge: {file.name}")

        if not file.name.endswith(('.xlsx', '.xls', '.csv')):
            return Response({'error': 'File must be an Excel file'}, status=status.HTTP_400_BAD_REQUEST)

        class_id = request.data.get('class_id')
        if not class_id:
            return Response({'error': 'class_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        override_names = request.data.get('override_names', 'false').lower() == 'true'

        # Get optional matching threshold (default to 0.85 - 85% similarity)
        try:
            matching_threshold = float(request.data.get('matching_threshold', 0.85))
            matching_threshold = max(0.5, min(1.0, matching_threshold))  # Ensure between 0.5 and 1.0
        except (ValueError, TypeError):
            matching_threshold = 0.85

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

            # Get the most recent excel file for this class to merge with
            existing_file = ExcelFile.objects.filter(class_ref=class_obj).order_by('-uploaded_at').first()

            if not existing_file:
                # If no existing file, just upload as new
                return self.upload(request)

            # Load both excel files
            new_excel = pd.read_excel(file, sheet_name=None)

            # Process the new file first
            all_sheets_data = {}
            for sheet_name, df in new_excel.items():
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
                if custom_columns and sheet_name == list(new_excel.keys())[0]:  # Apply to first sheet only
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

            # Now merge with existing file
            active_sheet = existing_file.active_sheet
            existing_data = existing_file.all_sheets[active_sheet]
            new_data = all_sheets_data[list(all_sheets_data.keys())[0]]  # First sheet of new file

            # Find name columns in both datasets
            name_patterns = ['name', 'student', 'learner', 'no.', 'id']

            def find_name_column(headers):
                for header in headers:
                    if any(pattern in str(header).lower() for pattern in name_patterns):
                        return header
                return headers[0] if headers else None

            existing_name_col = find_name_column(existing_data['headers'])
            new_name_col = find_name_column(new_data['headers'])

            # Build lookup dictionaries for quick access with normalized names
            existing_lookup = {}
            existing_lookup_normalized = {}

            for record in existing_data['data']:
                if existing_name_col and existing_name_col in record:
                    # Store both raw and normalized versions
                    raw_name = str(record[existing_name_col])
                    normalized_name = self.normalize_name(raw_name)

                    existing_lookup[raw_name] = record
                    existing_lookup_normalized[normalized_name] = record

            # Start with existing data
            merged_data = existing_data.copy()

            # Merge headers
            all_new_cols = []
            # Add new columns from new file that aren't in existing headers
            for col in new_data['headers']:
                if col not in merged_data['headers'] and col != new_name_col:
                    merged_data['headers'].append(col)
                    all_new_cols.append(col)

            print(f"Added {len(all_new_cols)} new columns to headers")

            # Update existing records and add new ones
            added_count = 0
            updated_count = 0
            fuzzy_matched_count = 0

            # For detailed logging of matches
            match_results = []

            for record in new_data['data']:
                if not new_name_col or new_name_col not in record:
                    continue

                # Get original name
                original_name = str(record[new_name_col])

                # Try exact match first
                if original_name in existing_lookup:
                    existing_record = existing_lookup[original_name]
                    if override_names and new_name_col and existing_name_col:
                        existing_record[existing_name_col] = record[new_name_col]

                    # Add all new columns from new record
                    for key, value in record.items():
                        if key != new_name_col or key not in existing_record:
                            existing_record[key] = value

                    updated_count += 1
                    match_results.append(f"Exact match: '{original_name}'")
                else:
                    # Try fuzzy matching
                    normalized_name = self.normalize_name(original_name)

                    # Try direct normalized match first
                    if normalized_name in existing_lookup_normalized:
                        existing_record = existing_lookup_normalized[normalized_name]
                        if override_names and new_name_col and existing_name_col:
                            existing_record[existing_name_col] = record[new_name_col]

                        # Add all new columns from new record
                        for key, value in record.items():
                            if key != new_name_col or key not in existing_record:
                                existing_record[key] = value

                        updated_count += 1
                        fuzzy_matched_count += 1
                        match_results.append(
                            f"Normalized match: '{original_name}' -> '{existing_record[existing_name_col]}'")
                    else:
                        # Try Levenshtein-based fuzzy matching
                        best_match = self.find_best_match(original_name, existing_lookup_normalized,
                                                          threshold=matching_threshold)

                        if best_match:
                            if override_names and new_name_col and existing_name_col:
                                best_match[existing_name_col] = record[new_name_col]

                            # Add all new columns from new record
                            for key, value in record.items():
                                if key != new_name_col or key not in best_match:
                                    best_match[key] = value

                            updated_count += 1
                            fuzzy_matched_count += 1
                            match_results.append(f"Fuzzy match: '{original_name}' -> '{best_match[existing_name_col]}'")
                        else:
                            # Add new record
                            new_record = {key: None for key in merged_data['headers']}
                            for key, value in record.items():
                                new_record[key] = value

                            merged_data['data'].append(new_record)
                            added_count += 1
                            match_results.append(f"No match, added new record: '{original_name}'")

            # Get existing category mappings if they exist
            existing_mappings = {}
            if 'category_mappings' in existing_file.all_sheets:
                print("Found existing category mappings, will preserve them")
                try:
                    for category in existing_file.all_sheets['category_mappings']:
                        for column in category.get('columns', []):
                            if column in existing_data['headers']:  # Only keep columns that still exist
                                existing_mappings[column] = category['id']
                    print(f"Loaded {len(existing_mappings)} existing column mappings")
                except Exception as e:
                    print(f"Error processing existing mappings: {str(e)}")

            # Process new category mappings if provided
            new_column_mappings = {}
            if 'category_mappings' in request.data:
                try:
                    import json
                    category_mappings_str = request.data.get('category_mappings')
                    print(
                        f"Raw category mappings from request: {category_mappings_str[:100]}...")  # Print first 100 chars

                    category_mappings_data = json.loads(category_mappings_str)
                    print(f"Parsed category mappings - type: {type(category_mappings_data)}")

                    # Handle dictionary format directly
                    if isinstance(category_mappings_data, dict):
                        for column, category in category_mappings_data.items():
                            if column in merged_data['headers']:
                                new_column_mappings[column] = category
                    # Handle array format with 'columns' property
                    elif isinstance(category_mappings_data, list):
                        for item in category_mappings_data:
                            if isinstance(item, dict) and 'id' in item and 'columns' in item:
                                for column in item['columns']:
                                    if column in merged_data['headers']:
                                        new_column_mappings[column] = item['id']

                    print(f"Processed {len(new_column_mappings)} new column mappings")
                except Exception as e:
                    import traceback
                    print("Error parsing category mappings:", str(e))
                    print("Traceback:", traceback.format_exc())

            # Combine existing and new mappings (new mappings override existing ones)
            combined_mappings = {**existing_mappings, **new_column_mappings}
            print(f"Combined mappings: {len(combined_mappings)} columns mapped")

            # Convert back to category -> columns format for storage
            category_structure = []
            category_ids = set(combined_mappings.values())
            for cat_id in category_ids:
                # Find all columns for this category
                columns = [col for col, cat in combined_mappings.items() if cat == cat_id]
                if columns:
                    # Use the standard category names or default names
                    category_name = {
                        'quiz': 'Quizzes',
                        'laboratory': 'Laboratory',
                        'exams': 'Major Exams',
                        'other': 'Other Activities'
                    }.get(cat_id, cat_id.capitalize())

                    category_structure.append({
                        'id': cat_id,
                        'name': category_name,
                        'columns': columns
                    })

            # Update the existing file with merged data
            existing_file.all_sheets[active_sheet] = merged_data

            # Store the combined category mappings
            if category_structure:
                existing_file.all_sheets['category_mappings'] = category_structure
                print(f"Saved category structure with {len(category_structure)} categories")

                # Debug output of categories
                for cat in category_structure:
                    print(f"  Category '{cat['name']}' ({cat['id']}): {len(cat['columns'])} columns")
            else:
                print("Warning: No category structure to save")

            existing_file.update_count += 1
            # Log the updated counter
            print(f"Incremented update count to: {existing_file.update_count}")

            existing_file.save()

            print(
                f"Merge complete: {updated_count} records updated ({fuzzy_matched_count} fuzzy matched), {added_count} records added")
            print(f"Category mappings preserved: {len(category_structure)} categories")
            print(f"Sample of matches: {match_results[:10]}")

            serializer = self.get_serializer(existing_file)
            return Response({
                **serializer.data,
                'match_stats': {
                    'updated': updated_count,
                    'fuzzy_matched': fuzzy_matched_count,
                    'added': added_count,
                    'match_samples': match_results[:10]
                }
            })

        except Class.DoesNotExist:
            return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            print("Error during merge:", str(e))
            print("Traceback:", traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

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

    @extend_schema(
        description='Download Excel file',
        parameters=[
            OpenApiParameter(
                name='format',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='File format to download (xlsx or csv)',
                required=False,
                enum=['xlsx', 'csv'],
                default='xlsx'
            )
        ],
        responses={200: OpenApiTypes.BINARY}
    )
    @action(detail=True, methods=['GET'])
    def download(self, request, pk=None):
        try:
            excel_file = self.get_object()
            # Get the requested format (default to xlsx)
            file_format = request.query_params.get('format', 'xlsx').lower()

            # Validate format
            if file_format not in ['xlsx', 'csv']:
                return Response(
                    {'error': 'Invalid format. Must be xlsx or csv'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get the active sheet name
            sheet_name = request.query_params.get('sheet', excel_file.active_sheet)
            if sheet_name not in excel_file.all_sheets:
                return Response(
                    {'error': f'Sheet {sheet_name} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get sheet data for the selected sheet
            sheet_data = excel_file.all_sheets[sheet_name]

            # Convert to DataFrame
            df = pd.DataFrame(sheet_data.get('data', []))

            # Prepare the response based on format
            if file_format == 'csv':
                # CSV export
                csv_buffer = BytesIO()
                df.to_csv(csv_buffer, index=False)
                csv_buffer.seek(0)

                response = HttpResponse(csv_buffer.getvalue(), content_type='text/csv')
                filename = f"{os.path.splitext(excel_file.file_name)[0]}.csv"
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
            else:
                # XLSX export - create a workbook with the selected sheet
                buffer = BytesIO()
                with pd.ExcelWriter(buffer, engine='xlsxwriter') as writer:
                    df.to_excel(writer, sheet_name=sheet_name, index=False)

                buffer.seek(0)
                response = HttpResponse(
                    buffer.getvalue(),
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = f'attachment; filename="{excel_file.file_name}"'
                return response

        except Exception as e:
            import traceback
            print("Error downloading file:", str(e))
            print("Traceback:", traceback.format_exc())
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
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )