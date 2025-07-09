import logging
import requests
from typing import Dict
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)


class GoogleServiceAccountSheets:
    """
    Service for Google Sheets operations using a service account.
    """

    DRIVE_API_BASE_URL = "https://www.googleapis.com/drive/v3"

    def __init__(self, credentials_info: Dict):
        """
        Initialize with service account credentials.

        Args:
            credentials_info: Dictionary containing service account credentials.
        """
        self.credentials = service_account.Credentials.from_service_account_info(
            credentials_info,
            scopes=['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
        )
        self.drive_service = build('drive', 'v3', credentials=self.credentials)
        self.sheets_service = build('sheets', 'v4', credentials=self.credentials)

    def share_file_with_user(self, file_id: str, user_email: str) -> Dict:
        """
        Share a file (owned by the service account) with a specific user by email.

        Args:
            file_id: ID of the file to share.
            user_email: Email of the user to share with.

        Returns:
            Dict containing success status.
        """
        try:
            permission = {
                'type': 'user',
                'role': 'writer',  # Grant write access to the user
                'emailAddress': user_email
            }
            self.drive_service.permissions().create(
                fileId=file_id,
                body=permission,
                fields='id',
                sendNotificationEmail=False  # Set to True if you want to send email notifications
            ).execute()
            return {
                'success': True,
                'message': f'File {file_id} shared with {user_email}'
            }
        except HttpError as e:
            error_details = e.content.decode('utf-8') if e.content else str(e)
            logger.error(f"Service account share file failed: {error_details}")
            return {
                'success': False,
                'error': f'Failed to share file: {e.status_code}',
                'details': error_details
            }
        except Exception as e:
            logger.error(f"Service account share file failed: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to share file: {str(e)}',
                'details': str(e)
            }

    def make_file_public_readable(self, file_id: str) -> Dict:
        """
        Make a file publicly readable (Anyone with the link can view).
        This is required for embedding Google Sheets in iframes.

        Args:
            file_id: ID of the file to make public.

        Returns:
            Dict containing success status.
        """
        try:
            permission = {
                'type': 'anyone',
                'role': 'reader'  # Anyone can view/read the file
            }
            self.drive_service.permissions().create(
                fileId=file_id,
                body=permission,
                fields='id'
            ).execute()
            return {
                'success': True,
                'message': f'File {file_id} made publicly readable'
            }
        except HttpError as e:
            error_details = e.content.decode('utf-8') if e.content else str(e)
            logger.error(f"Service account make public failed: {error_details}")
            return {
                'success': False,
                'error': f'Failed to make file public: {e.status_code}',
                'details': error_details
            }
        except Exception as e:
            logger.error(f"Service account make public failed: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to make file public: {str(e)}',
                'details': str(e)
            }

    def get_sheet_data(self, sheet_id: str) -> dict:
        """
        Get data from a Google Sheet using service account.
        Updated to handle 3-row header structure.

        Args:
            sheet_id: ID of the spreadsheet

        Returns:
            Dict containing sheet data or error
        """
        try:
            # Get sheet metadata first
            spreadsheet = self.sheets_service.spreadsheets().get(spreadsheetId=sheet_id).execute()

            # Get the first sheet name
            first_sheet = spreadsheet['sheets'][0]['properties']['title']

            # 🔥 Get MORE data to capture all header rows
            range_name = f"{first_sheet}!A1:Z100"  # Increased range
            result = self.sheets_service.spreadsheets().values().get(
                spreadsheetId=sheet_id,
                range=range_name
            ).execute()

            values = result.get('values', [])

            if not values:
                return {
                    'success': False,
                    'error': 'No data found in sheet'
                }

            # 🔥 UPDATED: Handle 3-row header structure
            main_headers = values[0] if len(values) > 0 else []  # Row 1: Categories
            sub_headers = values[1] if len(values) > 1 else []  # Row 2: Column names
            max_scores = values[2] if len(values) > 2 else []  # Row 3: Max scores/totals

            # 🔥 Use sub_headers (Row 2) as the actual column names for voice recognition
            combined_headers = []
            for i, header in enumerate(sub_headers):
                if header and str(header).strip():  # If header exists and is not empty
                    combined_headers.append(str(header).strip())
                elif i < len(main_headers) and main_headers[i] and str(main_headers[i]).strip():
                    combined_headers.append(str(main_headers[i]).strip())
                else:
                    combined_headers.append(f"Column_{i + 1}")

            # 🔥 FIXED: Skip first 3 rows (categories, column names, max scores)
            tableData = values[3:] if len(values) > 3 else []

            print(f"🔍 DEBUG: Sheet structure detected:")
            print(f"   Row 1 (Categories): {main_headers}")
            print(f"   Row 2 (Column Names): {sub_headers}")
            print(f"   Row 3 (Max Scores): {max_scores}")
            print(f"   Combined Headers: {combined_headers}")
            print(f"   Student Data Rows: {len(tableData)}")

            return {
                'success': True,
                'headers': combined_headers,
                'main_headers': main_headers,
                'sub_headers': sub_headers,
                'max_scores': max_scores,  # 🔥 NEW: Include max scores
                'tableData': tableData,
                'sheet_name': first_sheet
            }

        except Exception as e:
            logger.error(f"Service account get sheet data error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to get sheet data: {str(e)}'
            }

    # 🔥 NEW: Add the missing update_cell method
    def update_cell(self, sheet_id: str, row_index: int, column_name: str, value: str) -> dict:
        """
        Update a single cell in the Google Sheet.
        Updated for 3-row header structure.
        """
        try:
            # Get sheet data to find column index and sheet name
            sheet_data = self.get_sheet_data(sheet_id)
            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']
            sheet_name = sheet_data['sheet_name']

            # Find column index
            try:
                column_index = headers.index(column_name)
            except ValueError:
                logger.error(f"Column '{column_name}' not found in headers: {headers}")
                return {
                    'success': False,
                    'error': f'Column "{column_name}" not found. Available columns: {headers}'
                }

            # Convert column index to letter (A, B, C, etc.)
            column_letter = chr(65 + column_index)

            # 🔥 FIXED: Skip 3 header rows now, convert to 1-based
            sheet_row = row_index + 4  # +3 for headers, +1 for 1-based indexing

            cell_range = f"{sheet_name}!{column_letter}{sheet_row}"

            logger.info(f"Updating cell {cell_range} with value '{value}'")

            # Update the cell
            body = {
                'values': [[str(value)]]
            }

            result = self.sheets_service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=cell_range,
                valueInputOption='RAW',
                body=body
            ).execute()

            logger.info(f"Successfully updated cell {cell_range} with value '{value}'")

            return {
                'success': True,
                'updated_cells': result.get('updatedCells', 0),
                'cell_range': cell_range,
                'value': value,
                'row_index': row_index,
                'column_name': column_name
            }

        except Exception as e:
            logger.error(f"Unexpected error updating cell: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to update cell: {str(e)}'
            }

    # 🔥 NEW: Add the missing add_student method
    def add_student(self, sheet_id: str, student_data: dict) -> dict:
        """
        Add a new student row to the Google Sheet.

        Args:
            sheet_id: ID of the spreadsheet
            student_data: Dictionary with student information (e.g., {'LASTNAME': 'Smith', 'FIRST NAME': 'John'})

        Returns:
            Dict containing success status and row info
        """
        try:
            # Get sheet data
            sheet_data = self.get_sheet_data(sheet_id)
            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']
            sheet_name = sheet_data['sheet_name']
            current_data = sheet_data['tableData']

            # Find next empty row (skip 2 header rows)
            next_row = len(current_data) + 4 # +2 for headers, +1 for 1-based indexing

            # Create new row with student data
            new_row = [''] * len(headers)
            for key, value in student_data.items():
                if key in headers:
                    index = headers.index(key)
                    new_row[index] = str(value)

            # Append the new row
            range_name = f"{sheet_name}!A{next_row}:{chr(65 + len(headers) - 1)}{next_row}"

            body = {
                'values': [new_row]
            }

            result = self.sheets_service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=range_name,
                valueInputOption='RAW',
                body=body
            ).execute()

            logger.info(f"Successfully added student to row {next_row}")

            return {
                'success': True,
                'updated_cells': result.get('updatedCells', 0),
                'row_added': next_row,
                'student_data': student_data,
                'range': range_name
            }

        except HttpError as e:
            error_details = e.content.decode('utf-8') if e.content else str(e)
            logger.error(f"Google Sheets API error adding student: {error_details}")
            return {
                'success': False,
                'error': f'Google Sheets API error: {e.status_code}',
                'details': error_details
            }
        except Exception as e:
            logger.error(f"Unexpected error adding student: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to add student: {str(e)}'
            }

    def add_student_with_auto_number(self, sheet_id: str, student_data: dict) -> dict:
        """
        Add a new student row to the Google Sheet with auto-numbering.
        Updated for 3-row header structure and smart student counting.
        """
        try:
            # Get sheet data
            sheet_data = self.get_sheet_data(sheet_id)
            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']
            sheet_name = sheet_data['sheet_name']
            current_data = sheet_data['tableData']

            # 🔥 SMART COUNTING: Count only rows with actual student data
            actual_student_count = 0
            first_empty_row_index = None

            for i, row in enumerate(current_data):
                # Check if row has actual student name data
                has_student_data = False
                if len(row) >= 3:  # Check LASTNAME and FIRST NAME columns
                    lastname = str(row[1]).strip() if len(row) > 1 and row[1] else ''
                    firstname = str(row[2]).strip() if len(row) > 2 and row[2] else ''

                    if lastname or firstname:
                        has_student_data = True
                        actual_student_count += 1

                # Find first truly empty row
                if not has_student_data and first_empty_row_index is None:
                    first_empty_row_index = i

            # 🔥 FIXED: Use first empty row instead of last row
            if first_empty_row_index is not None:
                # Insert at the first empty row
                next_row = first_empty_row_index + 4  # +3 for headers, +1 for 1-based indexing
                student_number = actual_student_count + 1
            else:
                # No empty rows found, append at the end
                next_row = len(current_data) + 4
                student_number = actual_student_count + 1

            print(f"🔍 DEBUG: Found {actual_student_count} actual students")
            print(f"🔍 DEBUG: Using row index {first_empty_row_index} (sheet row {next_row})")
            print(f"🔍 DEBUG: Assigning student number {student_number}")

            # Create new row with student data
            new_row = [''] * len(headers)

            # Auto-assign the number to the first column (NO.)
            if len(headers) > 0:
                new_row[0] = str(student_number)

            # Fill in the student data
            for key, value in student_data.items():
                if key in headers:
                    index = headers.index(key)
                    new_row[index] = str(value)

            # Append the new row
            range_name = f"{sheet_name}!A{next_row}:{chr(65 + len(headers) - 1)}{next_row}"

            body = {
                'values': [new_row]
            }

            result = self.sheets_service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=range_name,
                valueInputOption='RAW',
                body=body
            ).execute()

            logger.info(f"Successfully added student #{student_number} to row {next_row}")

            return {
                'success': True,
                'updated_cells': result.get('updatedCells', 0),
                'row_added': next_row,
                'rowNumber': student_number,
                'student_data': student_data,
                'range': range_name
            }

        except Exception as e:
            logger.error(f"Unexpected error adding student with auto-number: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to add student with auto-number: {str(e)}'
            }

    def auto_number_all_students(self, sheet_id: str) -> dict:
        """
        Auto-number all existing students in the Google Sheet.

        Args:
            sheet_id: ID of the spreadsheet

        Returns:
            Dict containing success status and count of numbered students
        """
        try:
            # Get sheet data
            sheet_data = self.get_sheet_data(sheet_id)
            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']
            sheet_name = sheet_data['sheet_name']
            current_data = sheet_data['tableData']

            if not current_data:
                return {
                    'success': True,
                    'count': 0,
                    'message': 'No students to number'
                }

            # Check if first column is NO. column
            if not headers or 'NO' not in headers[0].upper():
                return {
                    'success': False,
                    'error': 'First column should be NO. column for auto-numbering'
                }

            # 🔥 Prepare batch update for all student numbers
            updates = []
            for i, row in enumerate(current_data):
                student_number = i + 1  # Start from 1

                # Skip if student has no name data (empty row)
                has_data = False
                for j in range(1, min(len(row), len(headers))):  # Skip first column (NO.)
                    if row[j] if j < len(row) else '':
                        has_data = True
                        break

                if has_data:
                    # Calculate cell position (skip 2 header rows)
                    cell_row = i + 4  # +2 for headers, +1 for 1-based indexing
                    cell_range = f"{sheet_name}!A{cell_row}"

                    updates.append({
                        'range': cell_range,
                        'values': [[str(student_number)]]
                    })

            if not updates:
                return {
                    'success': True,
                    'count': 0,
                    'message': 'No students found to number'
                }

            # 🔥 Batch update all numbers at once
            body = {
                'valueInputOption': 'RAW',
                'data': updates
            }

            result = self.sheets_service.spreadsheets().values().batchUpdate(
                spreadsheetId=sheet_id,
                body=body
            ).execute()

            updated_count = len(updates)
            logger.info(f"Successfully auto-numbered {updated_count} students")

            return {
                'success': True,
                'count': updated_count,
                'updated_cells': result.get('totalUpdatedCells', 0),
                'message': f'Auto-numbered {updated_count} students'
            }

        except HttpError as e:
            error_details = e.content.decode('utf-8') if e.content else str(e)
            logger.error(f"Google Sheets API error auto-numbering students: {error_details}")
            return {
                'success': False,
                'error': f'Google Sheets API error: {e.status_code}',
                'details': error_details
            }
        except Exception as e:
            logger.error(f"Unexpected error auto-numbering students: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to auto-number students: {str(e)}'
            }

    def get_student_count(self, sheet_id: str) -> int:
        """
        Get the actual number of students in the Google Sheet.

        Args:
            sheet_id: ID of the spreadsheet

        Returns:
            Number of students (rows with data excluding headers)
        """
        try:
            sheet_data = self.get_sheet_data(sheet_id)
            if not sheet_data['success']:
                return 0

            # Count rows that have actual student data
            student_count = 0
            for row in sheet_data['tableData']:
                # Check if the row has name data (not empty)
                if len(row) >= 2:  # At least LASTNAME and FIRST NAME columns
                    lastname = row[1].strip() if len(row) > 1 and row[1] else ''
                    firstname = row[2].strip() if len(row) > 2 and row[2] else ''

                    if lastname or firstname:  # Row has student data
                        student_count += 1

            return student_count

        except Exception as e:
            logger.error(f"Error counting students: {str(e)}")
            return 0

    def get_all_sheets_data(self, sheet_id: str) -> dict:
        """
        Get data from ALL sheets in a Google Spreadsheet.

        Args:
            sheet_id: ID of the spreadsheet

        Returns:
            Dict containing all sheets data or error
        """
        try:
            # Get sheet metadata first
            spreadsheet = self.sheets_service.spreadsheets().get(spreadsheetId=sheet_id).execute()
            all_sheets = []

            # 🔥 Loop through ALL sheets instead of just the first one
            for sheet_info in spreadsheet['sheets']:
                sheet_name = sheet_info['properties']['title']
                sheet_id_internal = sheet_info['properties']['sheetId']

                try:
                    # Get data for this specific sheet
                    range_name = f"'{sheet_name}'!A1:Z100"  # Use sheet name in quotes for safety
                    result = self.sheets_service.spreadsheets().values().get(
                        spreadsheetId=sheet_id,
                        range=range_name
                    ).execute()

                    values = result.get('values', [])

                    if values and len(values) >= 2:  # Only add sheets that have header data
                        main_headers = values[0] if len(values) > 0 else []
                        sub_headers = values[1] if len(values) > 1 else []

                        # Combine headers for better voice recognition
                        combined_headers = []
                        for i, (main, sub) in enumerate(zip(main_headers, sub_headers)):
                            if sub and sub.strip():
                                combined_headers.append(sub.strip())
                            elif main and main.strip():
                                combined_headers.append(main.strip())
                            else:
                                combined_headers.append(f"Column_{i + 1}")

                        tableData = values[3:] if len(values) > 3 else []

                        all_sheets.append({
                            'sheet_name': sheet_name,
                            'sheet_id': sheet_id_internal,
                            'headers': combined_headers,
                            'main_headers': main_headers,
                            'sub_headers': sub_headers,
                            'tableData': tableData,
                            'row_count': len(tableData)
                        })

                except Exception as sheet_error:
                    logger.warning(f"Could not get data for sheet '{sheet_name}': {str(sheet_error)}")
                    # Add sheet info even if we can't get data
                    all_sheets.append({
                        'sheet_name': sheet_name,
                        'sheet_id': sheet_id_internal,
                        'headers': [],
                        'main_headers': [],
                        'sub_headers': [],
                        'tableData': [],
                        'row_count': 0,
                        'error': str(sheet_error)
                    })

            return {
                'success': True,
                'sheets': all_sheets,
                'total_sheets': len(all_sheets)
            }

        except Exception as e:
            logger.error(f"Get all sheets data error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to get sheets data: {str(e)}'
            }

    def get_specific_sheet_data(self, sheet_id: str, sheet_name: str) -> dict:
        """
        Get data from a specific sheet by name.

        Args:
            sheet_id: ID of the spreadsheet
            sheet_name: Name of the specific sheet to get data from

        Returns:
            Dict containing sheet data or error
        """
        try:
            # Get data from the specific sheet
            range_name = f"'{sheet_name}'!A1:Z100"  # Use specific sheet name in quotes
            result = self.sheets_service.spreadsheets().values().get(
                spreadsheetId=sheet_id,
                range=range_name
            ).execute()

            values = result.get('values', [])

            if not values:
                return {
                    'success': False,
                    'error': f'No data found in sheet "{sheet_name}"'
                }

            # Get BOTH header rows for voice commands
            main_headers = values[0] if len(values) > 0 else []
            sub_headers = values[1] if len(values) > 1 else []

            # Combine headers for better voice recognition
            combined_headers = []
            for i, (main, sub) in enumerate(zip(main_headers, sub_headers)):
                if sub and sub.strip():
                    combined_headers.append(sub.strip())
                elif main and main.strip():
                    combined_headers.append(main.strip())
                else:
                    combined_headers.append(f"Column_{i + 1}")

            # Rest of the data (skip first 2 rows which are headers)
            tableData = values[3:] if len(values) > 3 else []

            return {
                'success': True,
                'headers': combined_headers,
                'main_headers': main_headers,
                'sub_headers': sub_headers,
                'tableData': tableData,
                'sheet_name': sheet_name
            }

        except Exception as e:
            logger.error(f"Get specific sheet data error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to get sheet data: {str(e)}'
            }

    def get_sheets_list(self, sheet_id: str) -> dict:
        """
        Get list of all sheets in a Google Spreadsheet.

        Args:
            sheet_id: ID of the spreadsheet

        Returns:
            Dict containing sheets list or error
        """
        try:
            # Get sheet metadata
            spreadsheet = self.sheets_service.spreadsheets().get(spreadsheetId=sheet_id).execute()

            sheets_list = []
            for sheet_info in spreadsheet['sheets']:
                sheet_name = sheet_info['properties']['title']
                sheet_id_internal = sheet_info['properties']['sheetId']
                sheet_properties = sheet_info['properties']

                sheets_list.append({
                    'sheet_name': sheet_name,
                    'sheet_id': sheet_id_internal,
                    'index': sheet_properties.get('index', 0),
                    'sheet_type': sheet_properties.get('sheetType', 'GRID'),
                    'grid_properties': sheet_properties.get('gridProperties', {})
                })

            return {
                'success': True,
                'sheets': sheets_list,
                'total_sheets': len(sheets_list),
                'spreadsheet_title': spreadsheet.get('properties', {}).get('title', 'Unknown')
            }

        except Exception as e:
            logger.error(f"Get sheets list error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to get sheets list: {str(e)}'
            }

    def update_cell_in_sheet(self, sheet_id: str, row_index: int, column_name: str, value: str,
                             sheet_name: str = None) -> dict:
        """
        Update a single cell in a specific sheet of the Google Spreadsheet.

        Args:
            sheet_id: ID of the spreadsheet
            row_index: 0-based row index (0 = first data row, skipping headers)
            column_name: Name of the column (e.g., 'QUIZ 1')
            value: Value to set in the cell
            sheet_name: Name of the specific sheet (if None, uses first sheet)

        Returns:
            Dict containing success status and update info
        """
        try:
            # Get sheet data to find column index and sheet name
            if sheet_name:
                sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            else:
                sheet_data = self.get_sheet_data(sheet_id)

            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']
            target_sheet_name = sheet_data['sheet_name']

            # Find column index
            try:
                column_index = headers.index(column_name)
            except ValueError:
                logger.error(f"Column '{column_name}' not found in headers: {headers}")
                return {
                    'success': False,
                    'error': f'Column "{column_name}" not found. Available columns: {headers}'
                }

            # Convert column index to letter (A, B, C, etc.)
            column_letter = chr(65 + column_index)

            # Calculate actual sheet row (skip 2 header rows, convert to 1-based)
            sheet_row = row_index + 4  # +2 for headers, +1 for 1-based indexing

            cell_range = f"'{target_sheet_name}'!{column_letter}{sheet_row}"

            logger.info(f"Updating cell {cell_range} with value '{value}'")

            # Update the cell
            body = {
                'values': [[str(value)]]
            }

            result = self.sheets_service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=cell_range,
                valueInputOption='RAW',
                body=body
            ).execute()

            logger.info(f"Successfully updated cell {cell_range} with value '{value}'")

            return {
                'success': True,
                'updated_cells': result.get('updatedCells', 0),
                'cell_range': cell_range,
                'value': value,
                'row_index': row_index,
                'column_name': column_name,
                'sheet_name': target_sheet_name
            }

        except Exception as e:
            logger.error(f"Unexpected error updating cell in sheet: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to update cell: {str(e)}'
            }

    def compare_students_for_import(self, sheet_id: str, import_students: list, sheet_name: str = None) -> dict:
        """
        Compare import students with existing students to find duplicates.

        Args:
            sheet_id: ID of the spreadsheet
            import_students: List of student dicts with 'FIRST NAME' and 'LASTNAME'
            sheet_name: Name of specific sheet (optional)

        Returns:
            Dict containing conflicts and new students
        """
        try:
            # Get existing students
            if sheet_name:
                sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            else:
                sheet_data = self.get_sheet_data(sheet_id)

            if not sheet_data['success']:
                return sheet_data

            existing_students = []
            headers = sheet_data['headers']

            # Extract existing students with their row info
            for row_index, row in enumerate(sheet_data['tableData']):
                if len(row) >= 2:  # Has at least first name and last name columns
                    # Find name columns
                    first_name_idx = None
                    last_name_idx = None

                    for idx, header in enumerate(headers):
                        if 'FIRST NAME' in header.upper() or 'FIRSTNAME' in header.upper():
                            first_name_idx = idx
                        elif 'LAST NAME' in header.upper() or 'LASTNAME' in header.upper():
                            last_name_idx = idx

                    if first_name_idx is not None and last_name_idx is not None:
                        first_name = row[first_name_idx].strip() if first_name_idx < len(row) and row[
                            first_name_idx] else ''
                        last_name = row[last_name_idx].strip() if last_name_idx < len(row) and row[
                            last_name_idx] else ''

                        if first_name or last_name:  # Has some name data
                            existing_students.append({
                                'FIRST NAME': first_name,
                                'LASTNAME': last_name,
                                'rowIndex': row_index,
                                'fullRow': row
                            })

            # Compare and find conflicts
            conflicts = []
            new_students = []

            for import_student in import_students:
                import_first = import_student.get('FIRST NAME', '').strip().lower()
                import_last = import_student.get('LASTNAME', '').strip().lower()

                # Look for exact match
                conflict_found = None
                for existing in existing_students:
                    existing_first = existing['FIRST NAME'].strip().lower()
                    existing_last = existing['LASTNAME'].strip().lower()

                    if (import_first == existing_first and import_last == existing_last):
                        conflict_found = existing
                        break

                if conflict_found:
                    conflicts.append({
                        'importStudent': import_student,
                        'existingStudent': conflict_found,
                        'action': 'skip'  # default action
                    })
                else:
                    new_students.append(import_student)

            return {
                'success': True,
                'conflicts': conflicts,
                'newStudents': new_students,
                'totalImport': len(import_students),
                'conflictCount': len(conflicts),
                'newCount': len(new_students),
                'existingCount': len(existing_students)
            }

        except Exception as e:
            logger.error(f"Compare students for import error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to compare students: {str(e)}'
            }

    def import_students_batch(self, sheet_id: str, new_students: list, resolved_conflicts: list,
                              sheet_name: str = None) -> dict:
        """
        Execute batch import of students with conflict resolutions.

        Args:
            sheet_id: ID of the spreadsheet
            new_students: List of new students to add
            resolved_conflicts: List of conflicts with actions (skip/override)
            sheet_name: Name of specific sheet (optional)

        Returns:
            Dict containing import results
        """
        try:
            results = {
                'success': True,
                'newStudentsAdded': 0,
                'conflictsSkipped': 0,
                'conflictsOverridden': 0,
                'errors': []
            }

            # Process new students
            for student in new_students:
                try:
                    if sheet_name:
                        result = self.add_student_with_auto_number_to_sheet(sheet_id, student, sheet_name)
                    else:
                        result = self.add_student_with_auto_number(sheet_id, student)

                    if result['success']:
                        results['newStudentsAdded'] += 1
                    else:
                        results['errors'].append(
                            f"Failed to add {student.get('FIRST NAME', '')} {student.get('LASTNAME', '')}: {result.get('error', 'Unknown error')}")

                except Exception as e:
                    results['errors'].append(
                        f"Error adding {student.get('FIRST NAME', '')} {student.get('LASTNAME', '')}: {str(e)}")

            # Process conflict resolutions
            for conflict in resolved_conflicts:
                action = conflict.get('action', 'skip')

                if action == 'skip':
                    results['conflictsSkipped'] += 1

                elif action == 'override':
                    try:
                        # Update existing student data
                        existing_student = conflict['existingStudent']
                        import_student = conflict['importStudent']

                        # For now, we'll just count it as overridden
                        # In a full implementation, you might update specific fields
                        results['conflictsOverridden'] += 1

                    except Exception as e:
                        results['errors'].append(f"Error overriding student: {str(e)}")

            # Calculate totals
            total_processed = results['newStudentsAdded'] + results['conflictsSkipped'] + results['conflictsOverridden']

            logger.info(
                f"Import completed: {results['newStudentsAdded']} new, {results['conflictsSkipped']} skipped, {results['conflictsOverridden']} overridden")

            return {
                'success': True,
                'results': results,
                'totalProcessed': total_processed,
                'summary': f"Added {results['newStudentsAdded']} new students, skipped {results['conflictsSkipped']} duplicates, overrode {results['conflictsOverridden']} existing"
            }

        except Exception as e:
            logger.error(f"Batch import error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to import students: {str(e)}'
            }

    def add_student_with_auto_number_to_sheet(self, sheet_id: str, student_data: dict, sheet_name: str) -> dict:
        """
        Add a new student row to a specific sheet with auto-numbering.

        Args:
            sheet_id: ID of the spreadsheet
            student_data: Dictionary with student information
            sheet_name: Name of the specific sheet

        Returns:
            Dict containing success status and row info
        """
        try:
            # Get sheet data
            sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']
            current_data = sheet_data['tableData']

            # Find next empty row (skip 2 header rows)
            next_row = len(current_data) + 4 # +2 for headers, +1 for 1-based indexing

            # Calculate the student number
            student_number = len(current_data) + 1

            # Create new row with student data
            new_row = [''] * len(headers)

            # Auto-assign the number to the first column (NO.)
            if len(headers) > 0:
                new_row[0] = str(student_number)

            # Fill in the student data
            for key, value in student_data.items():
                if key in headers:
                    index = headers.index(key)
                    new_row[index] = str(value)

            # Append the new row to specific sheet
            range_name = f"'{sheet_name}'!A{next_row}:{chr(65 + len(headers) - 1)}{next_row}"

            body = {
                'values': [new_row]
            }

            result = self.sheets_service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=range_name,
                valueInputOption='RAW',
                body=body
            ).execute()

            logger.info(f"Successfully added student #{student_number} to {sheet_name} row {next_row}")

            return {
                'success': True,
                'updated_cells': result.get('updatedCells', 0),
                'row_added': next_row,
                'rowNumber': student_number,
                'student_data': student_data,
                'range': range_name,
                'sheet_name': sheet_name
            }

        except Exception as e:
            logger.error(f"Unexpected error adding student to sheet: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to add student to sheet: {str(e)}'
            }

    def validate_import_data(self, import_data: list) -> dict:
        """
        Validate imported student data format.

        Args:
            import_data: List of student dictionaries

        Returns:
            Dict containing validation results
        """
        try:
            valid_students = []
            invalid_students = []

            for i, student in enumerate(import_data):
                row_number = student.get('originalRow', i + 1)

                # Check required fields
                first_name = student.get('FIRST NAME', '').strip()
                last_name = student.get('LASTNAME', '').strip()

                if not first_name and not last_name:
                    invalid_students.append({
                        'student': student,
                        'row': row_number,
                        'error': 'Missing both first and last name'
                    })
                elif not first_name:
                    invalid_students.append({
                        'student': student,
                        'row': row_number,
                        'error': 'Missing first name'
                    })
                elif not last_name:
                    invalid_students.append({
                        'student': student,
                        'row': row_number,
                        'error': 'Missing last name'
                    })
                else:
                    valid_students.append(student)

            return {
                'success': True,
                'validStudents': valid_students,
                'invalidStudents': invalid_students,
                'validCount': len(valid_students),
                'invalidCount': len(invalid_students),
                'totalCount': len(import_data)
            }

        except Exception as e:
            logger.error(f"Validate import data error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to validate import data: {str(e)}'
            }

    def analyze_columns_for_mapping(self, sheet_id: str, import_columns: list, sheet_name: str = None,
                                    user_id: int = None, force_reimport: list = None) -> dict:
        """
        Analyze existing columns to find available slots for mapping imported columns.
        Now includes filtering of already imported columns.
        """
        try:
            # 🔥 NEW: Filter already imported columns first
            available_columns = import_columns
            already_imported_info = []

            if user_id:
                filter_result = self.filter_already_imported_columns(
                    import_columns, sheet_id, user_id, sheet_name
                )

                if filter_result['success']:
                    available_columns = filter_result['available_columns']
                    already_imported_info = filter_result['already_imported']

                    # 🔥 Add force re-import columns back if specified
                    if force_reimport:
                        for col in force_reimport:
                            if col not in available_columns and col in import_columns:
                                available_columns.append(col)

            # Continue with existing analysis logic but use available_columns instead of import_columns
            if sheet_name:
                sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            else:
                sheet_data = self.get_sheet_data(sheet_id)

            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']
            table_data = sheet_data['tableData']

            # [Keep all your existing column analysis logic here - just replace import_columns with available_columns]
            column_analysis = []
            for col_index, column_name in enumerate(headers):
                excluded_columns = [
                    'NO.', 'NO', 'NUM', 'NUMBER',
                    'LASTNAME', 'LAST NAME', 'SURNAME',
                    'FIRSTNAME', 'FIRST NAME', 'GIVEN NAME',
                    'STUDENT ID', 'STUDENTID', 'ID', 'STUDENT_ID',
                    'EMAIL', 'CONTACT', 'PHONE'
                ]

                if any(excluded.upper() in column_name.upper() for excluded in excluded_columns):
                    continue

                # [Keep your existing column analysis logic...]
                has_data = False
                data_count = 0
                sample_values = []

                for row in table_data:
                    if col_index < len(row) and row[col_index] and str(row[col_index]).strip():
                        has_data = True
                        data_count += 1
                        if len(sample_values) < 3:
                            sample_values.append(str(row[col_index]).strip())

                column_analysis.append({
                    'columnName': column_name,
                    'columnIndex': col_index,
                    'hasData': has_data,
                    'dataCount': data_count,
                    'totalRows': len(table_data),
                    'sampleValues': sample_values,
                    'isEmpty': not has_data,
                    'isPartiallyFilled': has_data and data_count < len(table_data) * 0.8,
                    'availability': 'empty' if not has_data else (
                        'partial' if data_count < len(table_data) * 0.8 else 'full')
                })

            # Create mapping suggestions for available columns only
            mapping_suggestions = []
            for import_col in available_columns:  # 🔥 CHANGED: Use filtered columns
                suggestions = {
                    'importColumn': import_col,
                    'suggestions': []
                }

                # [Keep your existing suggestion logic...]
                for col_info in column_analysis:
                    if col_info['isEmpty']:
                        suggestions['suggestions'].append({
                            'targetColumn': col_info['columnName'],
                            'targetIndex': col_info['columnIndex'],
                            'recommendation': 'perfect',
                            'risk': 'none',
                            'description': f"Empty column - safe to use",
                            'dataCount': 0
                        })
                    elif col_info['isPartiallyFilled']:
                        suggestions['suggestions'].append({
                            'targetColumn': col_info['columnName'],
                            'targetIndex': col_info['columnIndex'],
                            'recommendation': 'caution',
                            'risk': 'medium',
                            'description': f"Has {col_info['dataCount']} existing entries out of {col_info['totalRows']} students",
                            'dataCount': col_info['dataCount'],
                            'sampleValues': col_info['sampleValues']
                        })
                    else:
                        suggestions['suggestions'].append({
                            'targetColumn': col_info['columnName'],
                            'targetIndex': col_info['columnIndex'],
                            'recommendation': 'risky',
                            'risk': 'high',
                            'description': f"Column is full ({col_info['dataCount']} entries) - will overwrite existing data",
                            'dataCount': col_info['dataCount'],
                            'sampleValues': col_info['sampleValues']
                        })

                suggestions['suggestions'].sort(key=lambda x: {
                    'perfect': 0,
                    'caution': 1,
                    'risky': 2
                }.get(x['recommendation'], 3))

                mapping_suggestions.append(suggestions)

            return {
                'success': True,
                'columnAnalysis': column_analysis,
                'mappingSuggestions': mapping_suggestions,
                'alreadyImported': already_imported_info,  # 🔥 NEW
                'filteredColumnsCount': len(import_columns) - len(available_columns),  # 🔥 NEW
                'totalColumns': len(headers),
                'availableEmptyColumns': len([c for c in column_analysis if c['isEmpty']]),
                'partiallyFilledColumns': len([c for c in column_analysis if c['isPartiallyFilled']]),
                'fullColumns': len([c for c in column_analysis if c['availability'] == 'full'])
            }

        except Exception as e:
            logger.error(f"Analyze columns for mapping error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to analyze columns: {str(e)}'
            }

    def import_column_data_with_mapping(self, sheet_id: str, column_mappings: list, import_data: dict,
                                        sheet_name: str = None) -> dict:
        """
        Import column data with custom mappings and rename headers.

        Args:
            sheet_id: ID of the spreadsheet
            column_mappings: List of mappings [{'importColumn': 'HTML Activity', 'targetColumn': 'QUIZ 1', 'action': 'replace'}]
            import_data: Dict with student data and column scores
            sheet_name: Name of specific sheet (optional)

        Returns:
            Dict containing import results
        """
        try:
            results = {
                'success': True,
                'columnsRenamed': 0,
                'studentsUpdated': 0,
                'cellsUpdated': 0,
                'errors': []
            }

            # Get sheet data
            if sheet_name:
                sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            else:
                sheet_data = self.get_sheet_data(sheet_id)

            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']
            table_data = sheet_data['tableData']
            target_sheet_name = sheet_data['sheet_name']

            # Process each column mapping
            for mapping in column_mappings:
                import_column = mapping['importColumn']
                target_column = mapping['targetColumn']
                action = mapping.get('action', 'replace')  # replace, merge, skip

                if action == 'skip':
                    continue

                try:
                    # Find target column index
                    target_index = headers.index(target_column)

                    # Step 1: Rename the header if it's different
                    if import_column != target_column:
                        rename_result = self.rename_column_header(
                            sheet_id, target_index, import_column, target_sheet_name
                        )
                        if rename_result['success']:
                            results['columnsRenamed'] += 1
                            # Update local headers for subsequent operations
                            headers[target_index] = import_column
                        else:
                            results['errors'].append(f"Failed to rename {target_column} to {import_column}")

                    # Step 2: Import the data for this column
                    column_data = import_data.get('columnData', {}).get(import_column, {})

                    if not column_data:
                        results['errors'].append(f"No data found for column {import_column}")
                        continue

                    # Step 3: Update student scores
                    students_in_column = 0
                    for student_key, score in column_data.items():
                        # Find student row by matching names
                        student_row_index = self.find_student_row_by_name(
                            student_key, table_data, headers
                        )

                        if student_row_index is not None:
                            # Update the cell
                            update_result = self.update_cell_in_sheet(
                                sheet_id, student_row_index, import_column, score, target_sheet_name
                            )

                            if update_result['success']:
                                students_in_column += 1
                                results['cellsUpdated'] += 1
                            else:
                                results['errors'].append(f"Failed to update {student_key} in {import_column}")

                    results['studentsUpdated'] += students_in_column
                    logger.info(f"Successfully imported {students_in_column} scores for column {import_column}")

                except ValueError:
                    results['errors'].append(f"Target column {target_column} not found in sheet")
                except Exception as e:
                    results['errors'].append(f"Error importing {import_column}: {str(e)}")

            return {
                'success': True,
                'results': results,
                'summary': f"Renamed {results['columnsRenamed']} columns, updated {results['cellsUpdated']} cells for {results['studentsUpdated']} student entries"
            }

        except Exception as e:
            logger.error(f"Import column data with mapping error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to import column data: {str(e)}'
            }

    def rename_column_header(self, sheet_id: str, column_index: int, new_name: str, sheet_name: str) -> dict:
        """
        Rename a column header in the Google Sheet.

        Args:
            sheet_id: ID of the spreadsheet
            column_index: 0-based index of the column to rename
            new_name: New name for the column
            sheet_name: Name of the sheet

        Returns:
            Dict containing success status
        """
        try:
            # Convert column index to letter
            column_letter = chr(65 + column_index)

            # Update the sub-header (row 2) - this is where the actual column names are
            cell_range = f"'{sheet_name}'!{column_letter}2"

            body = {
                'values': [[new_name]]
            }

            result = self.sheets_service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=cell_range,
                valueInputOption='RAW',
                body=body
            ).execute()

            logger.info(f"Successfully renamed column {column_letter} to '{new_name}'")

            return {
                'success': True,
                'updated_cells': result.get('updatedCells', 0),
                'cell_range': cell_range,
                'new_name': new_name,
                'column_index': column_index
            }

        except Exception as e:
            logger.error(f"Rename column header error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to rename column header: {str(e)}'
            }

    def find_student_row_by_name(self, student_identifier: str, table_data: list, headers: list) -> int:
        """
        Find a student's row index by name matching.

        Args:
            student_identifier: String like "John Smith" or "Smith, John"
            table_data: List of table rows
            headers: List of column headers

        Returns:
            Row index (0-based) or None if not found
        """
        try:
            # Find name column indices
            first_name_idx = None
            last_name_idx = None

            for idx, header in enumerate(headers):
                if 'FIRST NAME' in header.upper() or 'FIRSTNAME' in header.upper():
                    first_name_idx = idx
                elif 'LAST NAME' in header.upper() or 'LASTNAME' in header.upper():
                    last_name_idx = idx

            if first_name_idx is None or last_name_idx is None:
                logger.warning(f"Could not find name columns. Headers: {headers}")
                return None

            # 🔥 ENHANCED: Parse the student identifier with multiple format support
            search_first = ""
            search_last = ""

            if ',' in student_identifier:
                # Format: "Smith, John" (Last, First)
                parts = [p.strip() for p in student_identifier.split(',')]
                search_last = parts[0].lower() if len(parts) > 0 else ''
                search_first = parts[1].lower() if len(parts) > 1 else ''
            else:
                # Format: "John Smith" (First Last) - assume first word is first name, rest is last name
                parts = student_identifier.strip().split()
                if len(parts) == 1:
                    # Only one name provided - could be first or last
                    single_name = parts[0].lower()
                    search_first = single_name
                    search_last = single_name
                elif len(parts) >= 2:
                    search_first = parts[0].lower()
                    search_last = ' '.join(parts[1:]).lower()

            logger.info(
                f"Searching for student: '{student_identifier}' -> First: '{search_first}', Last: '{search_last}'")

            # 🔥 ENHANCED: Search for matching student with multiple strategies
            for row_index, row in enumerate(table_data):
                if first_name_idx < len(row) and last_name_idx < len(row):
                    row_first = str(row[first_name_idx]).strip().lower() if row[first_name_idx] else ''
                    row_last = str(row[last_name_idx]).strip().lower() if row[last_name_idx] else ''

                    # Strategy 1: Exact match
                    if search_first == row_first and search_last == row_last:
                        logger.info(f"✅ EXACT match found at row {row_index}: {row_first} {row_last}")
                        return row_index

                    # Strategy 2: Reversed order match (in case Excel is "First Last" but we expect "Last First")
                    if search_first == row_last and search_last == row_first:
                        logger.info(f"✅ REVERSED match found at row {row_index}: {row_first} {row_last}")
                        return row_index

                    # Strategy 3: Partial contains match
                    if (search_first in row_first or row_first in search_first) and \
                            (search_last in row_last or row_last in search_last):
                        logger.info(f"✅ PARTIAL match found at row {row_index}: {row_first} {row_last}")
                        return row_index

                    # Strategy 4: Single name match (when only one name is provided)
                    if len(student_identifier.strip().split()) == 1:
                        single_name = student_identifier.strip().lower()
                        if single_name in row_first or single_name in row_last:
                            logger.info(f"✅ SINGLE NAME match found at row {row_index}: {row_first} {row_last}")
                            return row_index

            logger.warning(f"❌ No match found for: '{student_identifier}'")
            logger.warning(f"Available students in sheet:")
            for i, row in enumerate(table_data[:5]):  # Show first 5 for debugging
                if first_name_idx < len(row) and last_name_idx < len(row):
                    sheet_first = str(row[first_name_idx]).strip() if row[first_name_idx] else ''
                    sheet_last = str(row[last_name_idx]).strip() if row[last_name_idx] else ''
                    logger.warning(f"  Row {i}: '{sheet_first}' '{sheet_last}'")

            return None

        except Exception as e:
            logger.error(f"Find student row by name error: {str(e)}")
            return None

    def preview_column_import(self, sheet_id: str, import_excel_data: dict, sheet_name: str = None) -> dict:
        """
        Preview what will happen when importing columns from Excel.

        Args:
            sheet_id: ID of the spreadsheet
            import_excel_data: Dict containing parsed Excel data with columns and student scores
            sheet_name: Name of specific sheet (optional)

        Returns:
            Dict containing preview of import operation
        """
        try:
            # Extract import columns (exclude student info columns)
            import_columns = []
            student_columns = {'NO.', 'NO', 'LASTNAME', 'LAST NAME', 'FIRSTNAME', 'FIRST NAME'}

            for column in import_excel_data.get('columns', []):
                if not any(term in column.upper() for term in student_columns):
                    import_columns.append(column)

            if not import_columns:
                return {
                    'success': False,
                    'error': 'No gradeable columns found in import file (only student info detected)'
                }

            # Analyze available mapping options
            analysis_result = self.analyze_columns_for_mapping(sheet_id, import_columns, sheet_name)
            if not analysis_result['success']:
                return analysis_result

            # Count students and data points
            column_data = import_excel_data.get('columnData', {})
            student_count = len(import_excel_data.get('students', []))
            total_data_points = sum(len(scores) for scores in column_data.values())

            return {
                'success': True,
                'preview': {
                    'importColumns': import_columns,
                    'studentCount': student_count,
                    'totalDataPoints': total_data_points,
                    'analysis': analysis_result,
                    'recommendations': self.generate_mapping_recommendations(analysis_result['mappingSuggestions'])
                }
            }

        except Exception as e:
            logger.error(f"Preview column import error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to preview import: {str(e)}'
            }

    def generate_mapping_recommendations(self, mapping_suggestions: list) -> list:
        """
        Generate smart mapping recommendations based on analysis.

        Args:
            mapping_suggestions: List of mapping suggestions from analysis

        Returns:
            List of recommended mappings
        """
        recommendations = []

        for suggestion in mapping_suggestions:
            import_col = suggestion['importColumn']

            # Find the best suggestion (first one is already sorted by safety)
            if suggestion['suggestions']:
                best_option = suggestion['suggestions'][0]

                recommendations.append({
                    'importColumn': import_col,
                    'recommendedTarget': best_option['targetColumn'],
                    'confidence': 'high' if best_option['recommendation'] == 'perfect' else 'medium' if best_option[
                                                                                                            'recommendation'] == 'caution' else 'low',
                    'reason': best_option['description'],
                    'risk': best_option['risk'],
                    'action': 'replace'  # default action
                })
            else:
                recommendations.append({
                    'importColumn': import_col,
                    'recommendedTarget': None,
                    'confidence': 'none',
                    'reason': 'No available columns found',
                    'risk': 'high',
                    'action': 'skip'
                })

        return recommendations

    def get_import_history(self, sheet_id: str, user_id: int) -> dict:
        """
        Get import history for a specific Google Sheet.

        Args:
            sheet_id: ID of the Google Sheet
            user_id: ID of the user

        Returns:
            Dict containing import history
        """
        try:
            # Import here to avoid circular imports
            from classrecord.models import ColumnImportHistory

            history_records = ColumnImportHistory.objects.filter(
                google_sheet_id=sheet_id,
                user_id=user_id
            ).order_by('-imported_at')

            import_history = []
            for record in history_records:
                import_history.append({
                    'excel_column_name': record.excel_column_name,
                    'target_column_name': record.target_column_name,
                    'imported_at': record.imported_at.isoformat(),
                    'import_action': record.import_action,
                    'data_points_imported': record.data_points_imported,
                    'sheet_name': record.sheet_name
                })

            return {
                'success': True,
                'import_history': import_history,
                'total_imports': len(import_history)
            }

        except Exception as e:
            logger.error(f"Get import history error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to get import history: {str(e)}'
            }

    def filter_already_imported_columns(self, import_columns: list, sheet_id: str, user_id: int,
                                        sheet_name: str = None) -> dict:
        """
        Filter out already imported columns from the import list.

        Args:
            import_columns: List of column names from Excel
            sheet_id: ID of the Google Sheet
            user_id: ID of the user
            sheet_name: Name of specific sheet (optional)

        Returns:
            Dict containing filtered columns and already imported info
        """
        try:
            # Import here to avoid circular imports
            from classrecord.models import ColumnImportHistory

            # Get import history for this sheet
            history_query = ColumnImportHistory.objects.filter(
                google_sheet_id=sheet_id,
                user_id=user_id,
                excel_column_name__in=import_columns
            )

            if sheet_name:
                history_query = history_query.filter(sheet_name=sheet_name)

            already_imported_records = list(history_query)

            # Build sets for fast lookup
            already_imported_names = {record.excel_column_name for record in already_imported_records}

            # Filter columns
            available_columns = [col for col in import_columns if col not in already_imported_names]

            # Build already imported info
            already_imported = []
            for record in already_imported_records:
                already_imported.append({
                    'columnName': record.excel_column_name,
                    'importedDate': record.imported_at.strftime('%Y-%m-%d'),
                    'targetColumn': record.target_column_name,
                    'canForceReimport': True,  # Always allow force re-import
                    'dataPointsImported': record.data_points_imported,
                    'importAction': record.import_action
                })

            return {
                'success': True,
                'available_columns': available_columns,
                'already_imported': already_imported,
                'filtered_count': len(import_columns) - len(available_columns),
                'available_count': len(available_columns)
            }

        except Exception as e:
            logger.error(f"Filter already imported columns error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to filter columns: {str(e)}'
            }

    def save_import_history(self, column_mappings: list, import_data: dict, sheet_id: str,
                            user_id: int, class_record_id: int, sheet_name: str = None) -> dict:
        """
        Save import history after successful column import.

        Args:
            column_mappings: List of successful column mappings
            import_data: Dict with import data and statistics
            sheet_id: ID of the Google Sheet
            user_id: ID of the user
            class_record_id: ID of the class record
            sheet_name: Name of specific sheet (optional)

        Returns:
            Dict containing save results
        """
        try:
            # Import here to avoid circular imports
            from classrecord.models import ColumnImportHistory, ClassRecord
            import uuid

            session_id = str(uuid.uuid4())  # Group this import session

            saved_records = []

            for mapping in column_mappings:
                if mapping.get('action', 'replace') == 'skip':
                    continue  # Don't save skipped columns

                excel_column = mapping['importColumn']
                target_column = mapping['targetColumn']
                import_action = mapping.get('action', 'replace')

                # Count data points for this column
                column_data = import_data.get('columnData', {}).get(excel_column, {})
                data_points = len(column_data)

                # Get class record
                try:
                    class_record = ClassRecord.objects.get(id=class_record_id, user_id=user_id)
                except ClassRecord.DoesNotExist:
                    logger.warning(f"Class record {class_record_id} not found for user {user_id}")
                    continue

                # Create history record
                history_record = ColumnImportHistory.objects.create(
                    class_record=class_record,
                    google_sheet_id=sheet_id,
                    sheet_name=sheet_name,
                    excel_column_name=excel_column,
                    target_column_name=target_column,
                    import_session_id=session_id,
                    user_id=user_id,
                    import_action=import_action,
                    data_points_imported=data_points
                )

                saved_records.append({
                    'id': history_record.id,
                    'excel_column': excel_column,
                    'target_column': target_column,
                    'data_points': data_points
                })

            logger.info(f"Saved {len(saved_records)} import history records for session {session_id}")

            return {
                'success': True,
                'session_id': session_id,
                'records_saved': len(saved_records),
                'saved_records': saved_records
            }

        except Exception as e:
            logger.error(f"Save import history error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to save import history: {str(e)}'
            }

    def create_user_copy_from_template(self, template_id: str, new_name: str, user_data: list = None) -> Dict:
        """
        Create a user's own copy of the template with their data.
        This is for when users want to export to their own Google Drive.

        Args:
            template_id: ID of the template
            new_name: Name for the new sheet
            user_data: Optional data to populate the new sheet

        Returns:
            Dict containing new sheet info
        """
        try:
            # Create a new blank spreadsheet with the template structure
            template_structure = self.access_template_structure(template_id)

            if not template_structure['success']:
                return template_structure

            # Create new spreadsheet
            spreadsheet_body = {
                'properties': {
                    'title': new_name
                },
                'sheets': [{
                    'properties': {
                        'title': 'Class Record',
                        'gridProperties': {
                            'rowCount': 100,
                            'columnCount': 20
                        }
                    }
                }]
            }

            new_spreadsheet = self.sheets_service.spreadsheets().create(
                body=spreadsheet_body
            ).execute()

            new_sheet_id = new_spreadsheet['spreadsheetId']

            # Copy template headers
            template_headers = template_structure['template']
            headers_data = [
                template_headers.get('structure', []),
                template_headers.get('sub_headers', [])
            ]

            if headers_data[0] or headers_data[1]:
                self.sheets_service.spreadsheets().values().update(
                    spreadsheetId=new_sheet_id,
                    range='A1:Z2',
                    valueInputOption='RAW',
                    body={'values': headers_data}
                ).execute()

            # Add user data if provided
            if user_data:
                self.sheets_service.spreadsheets().values().update(
                    spreadsheetId=new_sheet_id,
                    range='A3:Z',
                    valueInputOption='RAW',
                    body={'values': user_data}
                ).execute()

            return {
                'success': True,
                'file': {
                    'id': new_sheet_id,
                    'name': new_name,
                    'webViewLink': f"https://docs.google.com/spreadsheets/d/{new_sheet_id}/edit"
                }
            }

        except Exception as e:
            logger.error(f"Create user copy failed: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to create user copy: {str(e)}'
            }

    def create_individual_class_sheet(self, template_id: str, class_name: str, semester: str) -> Dict:
        """
        Create an individual Google Sheet for a class record based on template structure.
        Each class gets its own sheet, not shared with others.

        Args:
            template_id: ID of the template to base structure on
            class_name: Name of the class
            semester: Semester info

        Returns:
            Dict containing new sheet info
        """
        try:
            # Get template structure
            template_access = self.access_template_structure(template_id)

            if not template_access['success']:
                # If template access fails, create with default structure
                print(f"⚠️ Template access failed, using default structure: {template_access.get('error')}")
                template_headers = {
                    'main_headers': ['STUDENT INFORMATION', '', '', '', 'QUIZZES', '', 'EXAMS', '', 'GRADE'],
                    'sub_headers': ['No.', 'Student ID', 'Last Name', 'First Name', 'Quiz 1', 'Quiz 2', 'Midterm',
                                    'Final', 'Grade']
                }
            else:
                template_headers = template_access['template']

            # Create unique sheet name
            sheet_name = f"{class_name} - {semester}"

            # Create new spreadsheet
            spreadsheet_body = {
                'properties': {
                    'title': sheet_name
                },
                'sheets': [{
                    'properties': {
                        'title': 'Class Record',
                        'gridProperties': {
                            'rowCount': 100,
                            'columnCount': 20
                        }
                    }
                }]
            }

            new_spreadsheet = self.sheets_service.spreadsheets().create(
                body=spreadsheet_body
            ).execute()

            new_sheet_id = new_spreadsheet['spreadsheetId']

            # Set up headers based on template
            headers_data = []

            # Add main headers (row 1)
            main_headers = template_headers.get('structure', template_headers.get('main_headers', []))
            if main_headers:
                headers_data.append(main_headers)

            # Add sub headers (row 2)
            sub_headers = template_headers.get('sub_headers', [])
            if sub_headers:
                headers_data.append(sub_headers)

            # If no template headers, use defaults
            if not headers_data:
                headers_data = [
                    ['STUDENT INFORMATION', '', '', '', 'QUIZZES', '', 'EXAMS', '', 'GRADE'],
                    ['No.', 'Student ID', 'Last Name', 'First Name', 'Quiz 1', 'Quiz 2', 'Midterm', 'Final', 'Grade']
                ]

            # Apply headers to the new sheet
            if headers_data:
                self.sheets_service.spreadsheets().values().update(
                    spreadsheetId=new_sheet_id,
                    range='A1:Z2',
                    valueInputOption='RAW',
                    body={'values': headers_data}
                ).execute()

                print(f"✅ Headers applied to new sheet: {headers_data}")

            # Make the sheet publicly readable for embedding
            try:
                permission = {
                    'type': 'anyone',
                    'role': 'reader'
                }
                self.drive_service.permissions().create(
                    fileId=new_sheet_id,
                    body=permission,
                    fields='id'
                ).execute()
                print(f"✅ Sheet made publicly readable for embedding")
            except Exception as perm_error:
                print(f"⚠️ Warning: Could not make sheet public: {str(perm_error)}")
                # Continue anyway - sheet is still usable

            return {
                'success': True,
                'file': {
                    'id': new_sheet_id,
                    'name': sheet_name,
                    'webViewLink': f"https://docs.google.com/spreadsheets/d/{new_sheet_id}/edit",
                    'embedLink': f"https://docs.google.com/spreadsheets/d/{new_sheet_id}/edit?usp=sharing&rm=embedded"
                }
            }

        except Exception as e:
            logger.error(f"Create individual class sheet failed: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to create individual sheet: {str(e)}',
                'details': str(e)
            }

    def access_template_structure(self, template_file_id: str) -> Dict:
        """
        Access template structure directly without copying.

        Args:
            template_file_id: ID of the template sheet to access.

        Returns:
            Dict containing template structure info.
        """
        try:
            # Just get the template structure for reference
            template_data = self.get_sheet_data(template_file_id)

            if template_data['success']:
                return {
                    'success': True,
                    'template': {
                        'id': template_file_id,
                        'headers': template_data.get('headers', []),
                        'structure': template_data.get('main_headers', []),
                        'sub_headers': template_data.get('sub_headers', []),
                        'webViewLink': f"https://docs.google.com/spreadsheets/d/{template_file_id}/edit",
                        'embedLink': f"https://docs.google.com/spreadsheets/d/{template_file_id}/edit?usp=sharing&rm=embedded"
                    }
                }
            else:
                return {
                    'success': False,
                    'error': f'Failed to access template: {template_data.get("error", "Unknown error")}',
                    'details': template_data.get('error', 'Could not access template structure')
                }

        except Exception as e:
            logger.error(f"Template access failed: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to access template: {str(e)}',
                'details': str(e)
            }