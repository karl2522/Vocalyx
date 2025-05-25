from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
import pandas as pd
from django.http import HttpResponse
from io import BytesIO
from .models import ExcelFile
from .serializers import ExcelFileSerializer
from drf_spectacular.utils import extend_schema
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import datetime


# Create a custom permission class to check team permissions
class HasTeamEditPermission(BasePermission):

    def has_permission(self, request, view):
        # Allow GET requests for any authenticated user
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # For modifying requests, check if user has proper permissions
        class_id = view.kwargs.get('pk') or request.data.get('class_id')
        if not class_id:
            return False

        try:
            from classes.models import Class
            class_obj = Class.objects.get(id=class_id)

            # If user is the owner, they have full permissions
            if class_obj.user == request.user:
                return True

            # If there's a course associated with this class, check team permissions
            if class_obj.course:
                from teams.models import TeamCourse, TeamMember

                team_member = TeamMember.objects.filter(
                    team__courses__course_id=class_obj.course.id,
                    user=request.user,
                    is_active=True
                ).first()

                # Only allow edit/delete if user has edit or full permissions
                if team_member and team_member.permissions in ['edit', 'full']:
                    return True

            return False
        except Class.DoesNotExist:
            return False

    def has_object_permission(self, request, view, obj):
        # For object-level permissions (for existing objects)
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # If user is the owner, they have full permissions
        if obj.user == request.user:
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
                return True

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
                    'category_mappings': {'type': 'string'}  # JSON string of category mappings
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

            # Build lookup dictionaries for quick access
            existing_lookup = {}
            for record in existing_data['data']:
                if existing_name_col and existing_name_col in record:
                    name = str(record[existing_name_col]).strip().lower()
                    existing_lookup[name] = record

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

            for record in new_data['data']:
                if not new_name_col or new_name_col not in record:
                    continue

                name = str(record[new_name_col]).strip().lower()
                if name in existing_lookup:
                    # Update existing record
                    existing_record = existing_lookup[name]
                    if override_names and new_name_col and existing_name_col:
                        existing_record[existing_name_col] = record[new_name_col]

                    # Add all new columns from new record
                    for key, value in record.items():
                        if key != new_name_col or key not in existing_record:
                            existing_record[key] = value

                    updated_count += 1
                else:
                    # Add new record
                    new_record = {key: None for key in merged_data['headers']}
                    for key, value in record.items():
                        new_record[key] = value

                    merged_data['data'].append(new_record)
                    added_count += 1

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

            existing_file.save()

            print(f"Merge complete: {updated_count} records updated, {added_count} records added")
            print(f"Category mappings preserved: {len(category_structure)} categories")

            serializer = self.get_serializer(existing_file)
            return Response(serializer.data)

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
                    # Add custom column headers
                    custom_column_headers = [col['name'] for col in custom_columns]
                    headers.extend(custom_column_headers)

                    for record in records:
                        for header in custom_column_headers:
                            record[header] = None

                all_sheets_data[sheet_name] = {
                    'headers': headers,
                    'data': records
                }

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
            if 'excel_file' in locals():
                excel_file.delete()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description='Download Excel file',
        responses={200: {'type': 'string', 'format': 'binary'}}
    )
    @action(detail=True, methods=['GET'])
    def download(self, request, pk=None):
        excel_file = self.get_object()

        try:
            writer = pd.ExcelWriter(BytesIO(), engine='xlsxwriter')

            for sheet_name, sheet_data in excel_file.all_sheets.items():
                df = pd.DataFrame(sheet_data['data'])
                df.to_excel(writer, sheet_name=sheet_name, index=False)

            writer.close()
            buffer = writer.handles.handle
            buffer.seek(0)

            response = HttpResponse(
                buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{excel_file.file_name}"'
            return response

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['PATCH'], permission_classes=[IsAuthenticated])
    def update_data(self, request, pk=None):
        try:
            excel_file = ExcelFile.objects.get(pk=pk)
            sheet_data = request.data.get('sheet_data')
            sheet_name = request.data.get('sheet_name', excel_file.active_sheet)

            # Add a simple permission check to ensure user owns the file or is in the right team
            if excel_file.user.id != request.user.id:
                # Simple log to debug permission issues
                print(f"Permission check: File owner: {excel_file.user.id}, Request user: {request.user.id}")

                # Only allow if user is a team member with appropriate access (optional)
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

            existing_headers = excel_file.all_sheets[sheet_name]['headers']

            all_keys = set()
            for row in sheet_data:
                all_keys.update(row.keys())

            new_headers = existing_headers.copy()
            for key in all_keys:
                if key not in new_headers:
                    print(f"Adding new column: {key}")
                    new_headers.append(key)

            excel_file.all_sheets[sheet_name]['headers'] = new_headers

            formatted_data = []
            for row in sheet_data:
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

            excel_file.save()
            print(f"Updated Excel file with new headers: {new_headers}")

            return Response({
                'message': f'Data updated successfully for sheet {sheet_name}',
                'sheet_data': formatted_data,
                'sheet_name': sheet_name,
                'headers': new_headers
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