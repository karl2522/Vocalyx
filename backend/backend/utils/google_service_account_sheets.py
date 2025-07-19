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

    def copy_template_sheet(self, template_file_id: str, new_name: str) -> Dict:
        """
        Copy a template Google Sheet to the service account's Drive.

        Args:
            template_file_id: ID of the template sheet to copy.
            new_name: Name for the copied sheet.

        Returns:
            Dict containing copied file info or error.
        """
        try:
            copied_file = self.drive_service.files().copy(
                fileId=template_file_id,
                body={'name': new_name}
            ).execute()

            return {
                'success': True,
                'file': {
                    'id': copied_file.get('id'),
                    'name': copied_file.get('name'),
                    'webViewLink': copied_file.get('webViewLink'),
                    'embedLink': f"https://docs.google.com/spreadsheets/d/{copied_file.get('id')}/edit?usp=sharing&rm=embedded"
                }
            }
        except HttpError as e:
            error_details = e.content.decode('utf-8') if e.content else str(e)
            logger.error(f"Service account sheets copy template failed: {error_details}")
            return {
                'success': False,
                'error': f'Failed to copy template: {e.status_code}',
                'details': error_details
            }
        except Exception as e:
            logger.error(f"Service account sheets copy template failed: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to copy template: {str(e)}',
                'details': str(e)
            }

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
                valueInputOption='USER_ENTERED',
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
            next_row = len(current_data) + 4  # +2 for headers, +1 for 1-based indexing

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
                valueInputOption='USER_ENTERED',
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

    def add_student_with_auto_number(self, sheet_id: str, student_data: dict, sheet_name: str = None) -> dict:
        """
        Add a new student row to the Google Sheet with auto-numbering.
        Updated for 3-row header structure and smart student counting with formula protection.
        """
        try:
            # Get sheet data - use specific sheet if provided
            print(f"🔍 ADD STUDENT: Starting with sheet_id={sheet_id}, sheet_name={sheet_name}")

            if sheet_name:
                print(f"🔍 ADD STUDENT: Using specific sheet: {sheet_name}")
                sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            else:
                print(f"🔍 ADD STUDENT: No sheet name provided, using default sheet")
                sheet_data = self.get_sheet_data(sheet_id)

            if not sheet_data['success']:
                print(f"🔍 ADD STUDENT: Failed to get sheet data: {sheet_data.get('error')}")
                return sheet_data

            headers = sheet_data['headers']

            # CRITICAL FIX: Use the explicitly passed sheet_name if provided, otherwise use the one from sheet_data
            active_sheet_name = sheet_name if sheet_name else sheet_data['sheet_name']
            print(f"🔍 ADD STUDENT: CRITICAL - Using active sheet: {active_sheet_name}")

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

            print(f"🔍 ADD STUDENT: Found {actual_student_count} actual students")
            print(f"🔍 ADD STUDENT: Using row index {first_empty_row_index} (sheet row {next_row})")
            print(f"🔍 ADD STUDENT: Assigning student number {student_number}")

            # 🔥 NEW: Update only specific columns to avoid formula columns
            updates = []

            # Update NO. column (A)
            if len(headers) > 0:
                updates.append({
                    'range': f"'{active_sheet_name}'!A{next_row}",
                    'values': [[str(student_number)]]
                })
                print(f"🔍 ADD STUDENT: Adding NO. column update: A{next_row} = {student_number}")

            # Update student data columns
            for key, value in student_data.items():
                if key in headers:
                    index = headers.index(key)
                    column_letter = chr(65 + index)

                    # 🔥 SKIP formula columns
                    header_name = headers[index].upper()
                    formula_keywords = ['TOTAL', 'SUM', 'AVERAGE', 'AVG', 'FORMULA']
                    is_formula_column = any(keyword in header_name for keyword in formula_keywords)

                    if not is_formula_column:
                        updates.append({
                            'range': f"'{active_sheet_name}'!{column_letter}{next_row}",
                            'values': [[str(value)]]
                        })
                        print(f"🔍 ADD STUDENT: Adding data column update: {column_letter}{next_row} = {value}")
                    else:
                        print(f"🔍 ADD STUDENT: SKIPPING formula column: {header_name}")

            print(f"🔍 ADD STUDENT: Total updates to make: {len(updates)}")

            # 🔥 Batch update only the data columns
            if updates:
                body = {
                    'valueInputOption': 'USER_ENTERED',
                    'data': updates
                }

                result = self.sheets_service.spreadsheets().values().batchUpdate(
                    spreadsheetId=sheet_id,
                    body=body
                ).execute()

                print(f"🔍 ADD STUDENT: Batch update successful, updated {result.get('totalUpdatedCells', 0)} cells")
            else:
                print("🔍 ADD STUDENT: No updates to make")
                result = {'totalUpdatedCells': 0}

            print(
                f"🔍 ADD STUDENT: Successfully added student #{student_number} to sheet '{active_sheet_name}' row {next_row}")

            return {
                'success': True,
                'updated_cells': result.get('totalUpdatedCells', 0),
                'row_added': next_row,
                'rowNumber': student_number,
                'student_data': student_data,
                'sheet_name': active_sheet_name,
                'first_empty_row_index': first_empty_row_index,
                'actual_student_count': actual_student_count,
                'updates_made': len(updates)
            }

        except Exception as e:
            logger.error(f"Unexpected error adding student with auto-number: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
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
                'valueInputOption': 'USER_ENTERED',
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
        Updated to handle 3-row header structure.
        """
        try:
            # Log the input parameters for debugging
            print(f"🔍 GET SPECIFIC SHEET: sheet_id={sheet_id}, sheet_name={sheet_name}")

            # Get data from the specific sheet
            range_name = f"'{sheet_name}'!A1:Z100"  # Use specific sheet name in quotes
            print(f"🔍 GET SPECIFIC SHEET: Requesting range: {range_name}")

            result = self.sheets_service.spreadsheets().values().get(
                spreadsheetId=sheet_id,
                range=range_name
            ).execute()

            values = result.get('values', [])

            if not values:
                print(f"🔍 GET SPECIFIC SHEET: No data found in sheet '{sheet_name}'")
                return {
                    'success': False,
                    'error': f'No data found in sheet "{sheet_name}"'
                }

            # 🔥 UPDATED: Handle 3-row header structure (same as main get_sheet_data)
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

            print(f"🔍 DEBUG get_specific_sheet_data: {sheet_name}")
            print(f"   Row 1 (Categories): {main_headers}")
            print(f"   Row 2 (Column Names): {sub_headers}")
            print(f"   Row 3 (Max Scores): {max_scores}")
            print(f"   Combined Headers: {combined_headers}")
            print(f"   Student Data Rows: {len(tableData)}")
            print(f"🔍 GET SPECIFIC SHEET: Successfully got data from '{sheet_name}'")

            return {
                'success': True,
                'headers': combined_headers,
                'main_headers': main_headers,
                'sub_headers': sub_headers,
                'max_scores': max_scores,  # 🔥 NEW: Include max scores
                'tableData': tableData,
                'sheet_name': sheet_name  # IMPORTANT: Return the requested sheet name, not a derived one
            }

        except Exception as e:
            print(f"🔍 GET SPECIFIC SHEET ERROR: {str(e)}")
            import traceback
            print(f"🔍 GET SPECIFIC SHEET TRACEBACK: {traceback.format_exc()}")
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
            sheet_row = row_index + 4 # +2 for headers, +1 for 1-based indexing

            cell_range = f"'{target_sheet_name}'!{column_letter}{sheet_row}"

            logger.info(f"Updating cell {cell_range} with value '{value}'")
            logger.info(f"🔍 DEBUG: Using valueInputOption: USER_ENTERED")
            logger.info(f"🔍 DEBUG: Target column: {column_name}")
            logger.info(f"🔍 DEBUG: Row index: {row_index}")

            # Update the cell
            body = {
                'values': [[str(value)]]
            }

            result = self.sheets_service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=cell_range,
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()

            logger.info(f"🔍 DEBUG: Update result: {result}")

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
        FIXED: Now uses fuzzy name matching for better duplicate detection.
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
                    # Find name and ID columns
                    first_name_idx = None
                    last_name_idx = None
                    student_id_idx = None

                    for idx, header in enumerate(headers):
                        if 'FIRST NAME' in header.upper() or 'FIRSTNAME' in header.upper():
                            first_name_idx = idx
                        elif 'LAST NAME' in header.upper() or 'LASTNAME' in header.upper():
                            last_name_idx = idx
                        elif 'STUDENT ID' in header.upper() or 'STUDENTID' in header.upper():
                            student_id_idx = idx

                    if first_name_idx is not None and last_name_idx is not None:
                        first_name = row[first_name_idx].strip() if first_name_idx < len(row) and row[
                            first_name_idx] else ''
                        last_name = row[last_name_idx].strip() if last_name_idx < len(row) and row[
                            last_name_idx] else ''
                        student_id = row[student_id_idx].strip() if student_id_idx is not None and student_id_idx < len(
                            row) and row[student_id_idx] else ''

                        if first_name or last_name:  # Has some name data
                            existing_students.append({
                                'FIRST NAME': first_name,
                                'LASTNAME': last_name,
                                'STUDENT ID': student_id,
                                'rowIndex': row_index,
                                'fullRow': row
                            })

            # Compare and find conflicts
            conflicts = []
            new_students = []

            for import_student in import_students:
                import_first = import_student.get('FIRST NAME', '').strip().lower()
                import_last = import_student.get('LASTNAME', '').strip().lower()
                import_id = import_student.get('STUDENT ID', '').strip().lower()

                # Look for match (exact ID or similar name)
                conflict_found = None
                for existing in existing_students:
                    existing_first = existing['FIRST NAME'].strip().lower()
                    existing_last = existing['LASTNAME'].strip().lower()
                    existing_id = existing['STUDENT ID'].strip().lower()

                    # 🔥 FIXED: Better name matching logic
                    # 1. ID match (exact)
                    id_match = (import_id and existing_id and import_id == existing_id)

                    # 2. Last name match (exact) AND first name match (either contains the other)
                    last_name_exact = (import_last == existing_last)
                    first_name_similar = (
                            import_first in existing_first or
                            existing_first in import_first or
                            import_first.split()[0] == existing_first.split()[0]  # Match first word
                    )

                    # 3. First name match (exact) AND last name match (similar)
                    first_name_exact = (import_first == existing_first)
                    last_name_similar = (
                            import_last in existing_last or
                            existing_last in import_last
                    )

                    # 4. Full name combination check (for cases like "Jared Omen" vs "Jared Karl Omen")
                    import_full = f"{import_first} {import_last}".lower()
                    existing_full = f"{existing_first} {existing_last}".lower()
                    full_name_match = (
                            import_full in existing_full or
                            existing_full in import_full
                    )

                    if id_match or (last_name_exact and first_name_similar) or (
                            first_name_exact and last_name_similar) or full_name_match:
                        conflict_found = existing
                        print(
                            f"🔍 DUPLICATE found: '{import_first} {import_last}' matches '{existing_first} {existing_last}'")
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
        FIXED: Now properly implements override functionality.
        """
        try:
            results = {
                'success': True,
                'newStudentsAdded': 0,
                'conflictsSkipped': 0,
                'conflictsOverridden': 0,
                'errors': []
            }

            # Process new students (no conflicts)
            for student in new_students:
                try:
                    if sheet_name:
                        result = self.add_student_with_auto_number_to_sheet(sheet_id, student, sheet_name)
                    else:
                        result = self.add_student_with_auto_number(sheet_id, student)

                    if result['success']:
                        results['newStudentsAdded'] += 1
                        print(f"✅ Added new student: {student.get('FIRST NAME', '')} {student.get('LASTNAME', '')}")
                    else:
                        results['errors'].append(
                            f"Failed to add {student.get('FIRST NAME', '')} {student.get('LASTNAME', '')}: {result.get('error', 'Unknown error')}")

                except Exception as e:
                    results['errors'].append(
                        f"Error adding {student.get('FIRST NAME', '')} {student.get('LASTNAME', '')}: {str(e)}")

            # 🔥 FIXED: Process conflict resolutions with ACTUAL override implementation
            for conflict in resolved_conflicts:
                action = conflict.get('action', 'skip')
                existing_student = conflict.get('existingStudent', {})
                import_student = conflict.get('importStudent', {})

                print(
                    f"🔍 Processing conflict: {import_student.get('FIRST NAME', '')} {import_student.get('LASTNAME', '')} - Action: {action}")

                if action == 'skip':
                    results['conflictsSkipped'] += 1
                    print(
                        f"⏭️ Skipped duplicate: {import_student.get('FIRST NAME', '')} {import_student.get('LASTNAME', '')}")

                elif action == 'override':
                    try:
                        # 🔥 FIXED: Actually update the existing student row with new data
                        existing_row_index = existing_student.get('rowIndex')

                        if existing_row_index is not None:
                            # Update each field that has new data
                            updates_made = 0

                            # Update First Name if different
                            if import_student.get('FIRST NAME'):
                                update_result = self.update_cell_in_sheet(
                                    sheet_id, existing_row_index, 'FIRST NAME',
                                    import_student['FIRST NAME'], sheet_name
                                )
                                if update_result['success']:
                                    updates_made += 1
                                    print(
                                        f"✅ Updated First Name: {existing_student.get('FIRST NAME', '')} → {import_student['FIRST NAME']}")
                                else:
                                    results['errors'].append(
                                        f"Failed to update first name: {update_result.get('error')}")

                            # Update Last Name if different
                            if import_student.get('LASTNAME'):
                                update_result = self.update_cell_in_sheet(
                                    sheet_id, existing_row_index, 'LASTNAME',
                                    import_student['LASTNAME'], sheet_name
                                )
                                if update_result['success']:
                                    updates_made += 1
                                    print(
                                        f"✅ Updated Last Name: {existing_student.get('LASTNAME', '')} → {import_student['LASTNAME']}")
                                else:
                                    results['errors'].append(
                                        f"Failed to update last name: {update_result.get('error')}")

                            # Update Student ID if provided and different
                            if import_student.get('STUDENT ID'):
                                update_result = self.update_cell_in_sheet(
                                    sheet_id, existing_row_index, 'STUDENT ID',
                                    import_student['STUDENT ID'], sheet_name
                                )
                                if update_result['success']:
                                    updates_made += 1
                                    print(
                                        f"✅ Updated Student ID: {existing_student.get('STUDENT ID', 'None')} → {import_student['STUDENT ID']}")
                                else:
                                    results['errors'].append(
                                        f"Failed to update student ID: {update_result.get('error')}")

                            if updates_made > 0:
                                results['conflictsOverridden'] += 1
                                print(
                                    f"✅ Override completed: {import_student.get('FIRST NAME', '')} {import_student.get('LASTNAME', '')} ({updates_made} fields updated)")
                            else:
                                results['errors'].append(
                                    f"No updates made for {import_student.get('FIRST NAME', '')} {import_student.get('LASTNAME', '')}")
                        else:
                            results['errors'].append(
                                f"Could not find row index for existing student: {existing_student}")

                    except Exception as e:
                        results['errors'].append(
                            f"Error overriding student {import_student.get('FIRST NAME', '')} {import_student.get('LASTNAME', '')}: {str(e)}")
                        logger.error(f"Override error: {str(e)}")

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
        Updated for 3-row header structure and formula protection.
        """
        try:
            # Get sheet data
            sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']
            current_data = sheet_data['tableData']

            # 🔥 FIXED: Don't skip any rows in tableData - it already excludes headers
            first_empty_row = None
            actual_student_count = 0

            # 🔥 NEW: tableData already starts from row 4 (student data), so check all rows
            for row_index in range(len(current_data)):  # Check ALL rows in tableData
                row = current_data[row_index]
                has_student_data = False

                # Find name column indices
                first_name_idx = None
                last_name_idx = None

                for idx, header in enumerate(headers):
                    if 'FIRST NAME' in header.upper() or 'FIRSTNAME' in header.upper():
                        first_name_idx = idx
                    elif 'LAST NAME' in header.upper() or 'LASTNAME' in header.upper():
                        last_name_idx = idx

                # Check if this row has name data
                if first_name_idx is not None and last_name_idx is not None:
                    first_name = row[first_name_idx].strip() if first_name_idx < len(row) and row[
                        first_name_idx] else ''
                    last_name = row[last_name_idx].strip() if last_name_idx < len(row) and row[last_name_idx] else ''

                    if first_name or last_name:  # Row has student data
                        has_student_data = True
                        actual_student_count += 1

                # If this row doesn't have student data, it's our target for new student
                if not has_student_data and first_empty_row is None:
                    first_empty_row = row_index
                    break

            # If no empty row found, add at the end
            if first_empty_row is None:
                first_empty_row = len(current_data)

            # 🔥 FIXED: Calculate actual sheet row correctly
            # tableData[0] corresponds to sheet row 4 (after 3 header rows)
            next_row = first_empty_row + 4  # +3 for headers, +1 for 1-based indexing

            # 🔥 FIXED: Student number is based on actual student count + 1
            student_number = actual_student_count + 1

            print(f"🔍 DEBUG add_student_with_auto_number_to_sheet:")
            print(f"   Found {actual_student_count} existing students")
            print(f"   First empty row index in tableData: {first_empty_row}")
            print(f"   Target sheet row: {next_row}")
            print(f"   New student number: {student_number}")

            # 🔥 NEW: Update only specific columns to avoid formula columns
            updates = []

            # Update NO. column (A)
            if len(headers) > 0:
                updates.append({
                    'range': f"'{sheet_name}'!A{next_row}",
                    'values': [[str(student_number)]]
                })
                print(f"🔍 ADD STUDENT: Adding NO. column update: A{next_row} = {student_number}")

            # Update student data columns
            for key, value in student_data.items():
                if key in headers:
                    index = headers.index(key)
                    column_letter = chr(65 + index)

                    # 🔥 SKIP formula columns
                    header_name = headers[index].upper()
                    formula_keywords = ['TOTAL', 'SUM', 'AVERAGE', 'AVG', 'FORMULA']
                    is_formula_column = any(keyword in header_name for keyword in formula_keywords)

                    if not is_formula_column:
                        updates.append({
                            'range': f"'{sheet_name}'!{column_letter}{next_row}",
                            'values': [[str(value)]]
                        })
                        print(f"🔍 ADD STUDENT: Adding data column update: {column_letter}{next_row} = {value}")
                    else:
                        print(f"🔍 ADD STUDENT: SKIPPING formula column: {header_name}")

            print(f"🔍 ADD STUDENT: Total updates to make: {len(updates)}")

            # 🔥 Batch update only the data columns
            if updates:
                body = {
                    'valueInputOption': 'USER_ENTERED',
                    'data': updates
                }

                result = self.sheets_service.spreadsheets().values().batchUpdate(
                    spreadsheetId=sheet_id,
                    body=body
                ).execute()

                print(f"🔍 ADD STUDENT: Batch update successful, updated {result.get('totalUpdatedCells', 0)} cells")
            else:
                print("🔍 ADD STUDENT: No updates to make")
                result = {'totalUpdatedCells': 0}

            logger.info(f"Successfully added student #{student_number} to {sheet_name} row {next_row}")

            return {
                'success': True,
                'updated_cells': result.get('totalUpdatedCells', 0),
                'row_added': next_row,
                'rowNumber': student_number,
                'student_data': student_data,
                'sheet_name': sheet_name,
                'first_empty_row_index': first_empty_row,
                'actual_student_count': actual_student_count,
                'updates_made': len(updates)
            }

        except Exception as e:
            logger.error(f"Unexpected error adding student to sheet: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': f'Failed to add student to sheet: {str(e)}'
            }

    def validate_import_data(self, import_data: list) -> dict:
        """
        Validate imported student data format.
        Updated to include Student ID validation.
        """
        try:
            valid_students = []
            invalid_students = []

            for i, student in enumerate(import_data):
                row_number = student.get('originalRow', i + 1)

                # Check required fields
                first_name = student.get('FIRST NAME', '').strip()
                last_name = student.get('LASTNAME', '').strip()
                student_id = student.get('STUDENT ID', '').strip()  # 🔥 NEW

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
                    # 🔥 ENHANCED: Include Student ID in valid student data
                    valid_student = {
                        'FIRST NAME': first_name,
                        'LASTNAME': last_name
                    }
                    if student_id:  # Only add if Student ID exists
                        valid_student['STUDENT ID'] = student_id

                    valid_students.append(valid_student)

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
        ENHANCED: Now shows ALL columns (empty, partial, full) with detailed risk analysis.
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

            # 🔥 ENHANCED: Analyze ALL columns (not just empty ones)
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

                # 🔥 ENHANCED: Detailed column analysis with student-level data
                has_data = False
                data_count = 0
                sample_values = []
                student_data = []  # 🔥 NEW: Track which students have scores

                for row_index, row in enumerate(table_data):
                    if col_index < len(row) and row[col_index] and str(row[col_index]).strip():
                        has_data = True
                        data_count += 1
                        value = str(row[col_index]).strip()

                        if len(sample_values) < 3:
                            sample_values.append(value)

                        # 🔥 NEW: Track student names with existing scores
                        if len(student_data) < 5:  # Only store first 5 for preview
                            first_name_idx = None
                            last_name_idx = None

                            for idx, header in enumerate(headers):
                                if 'FIRST NAME' in header.upper() or 'FIRSTNAME' in header.upper():
                                    first_name_idx = idx
                                elif 'LAST NAME' in header.upper() or 'LASTNAME' in header.upper():
                                    last_name_idx = idx

                            if (first_name_idx is not None and last_name_idx is not None and
                                    first_name_idx < len(row) and last_name_idx < len(row)):
                                first_name = str(row[first_name_idx]).strip() if row[first_name_idx] else ''
                                last_name = str(row[last_name_idx]).strip() if row[last_name_idx] else ''

                                if first_name or last_name:
                                    student_data.append({
                                        'name': f"{first_name} {last_name}".strip(),
                                        'score': value,
                                        'rowIndex': row_index
                                    })

                # 🔥 ENHANCED: More detailed availability classification
                total_students = len(
                    [row for row in table_data if any(str(cell).strip() for cell in row[:2])])  # Count non-empty rows
                fill_percentage = (data_count / total_students) if total_students > 0 else 0

                availability = 'empty'
                if data_count == 0:
                    availability = 'empty'
                elif data_count >= total_students * 0.8:  # 80% or more filled
                    if total_students <= 2:  # 🔥 NEW: For small classes, be more lenient
                        availability = 'partial' if data_count < total_students else 'full'
                    else:
                        availability = 'full'
                elif data_count >= total_students * 0.3:  # 30% or more filled
                    availability = 'partial'
                else:
                    availability = 'empty'

                column_analysis.append({
                    'columnName': column_name,
                    'columnIndex': col_index,
                    'hasData': has_data,
                    'dataCount': data_count,
                    'totalStudents': total_students,
                    'fillPercentage': fill_percentage,
                    'sampleValues': sample_values,
                    'studentData': student_data,  # 🔥 NEW
                    'isEmpty': not has_data,
                    'isPartiallyFilled': availability == 'partial',
                    'availability': availability
                })

            # 🔥 ENHANCED: Create mapping suggestions for available columns with ALL options
            mapping_suggestions = []
            for import_col in available_columns:
                suggestions = {
                    'importColumn': import_col,
                    'suggestions': []
                }

                # 🔥 ENHANCED: Show ALL columns with detailed risk assessment
                for col_info in column_analysis:
                    if col_info['isEmpty']:
                        suggestions['suggestions'].append({
                            'targetColumn': col_info['columnName'],
                            'targetIndex': col_info['columnIndex'],
                            'recommendation': 'perfect',
                            'risk': 'none',
                            'description': f"Empty column - safe to use",
                            'dataCount': 0,
                            'sampleValues': [],
                            'studentData': [],
                            'fillPercentage': 0,
                            'conflictPreview': 'No existing data will be affected'
                        })
                    elif col_info['dataCount'] <= 2:  # 🔥 FIXED: Complete suggestion object
                        suggestions['suggestions'].append({
                            'targetColumn': col_info['columnName'],  # 🔥 FIX: Added missing fields
                            'targetIndex': col_info['columnIndex'],
                            'recommendation': 'caution',
                            'risk': 'low',
                            'description': f"Has {col_info['dataCount']} existing score(s) - low risk",
                            'dataCount': col_info['dataCount'],
                            'sampleValues': col_info['sampleValues'],
                            'studentData': col_info['studentData'],
                            'fillPercentage': col_info['fillPercentage'],
                            'conflictPreview': f"Will affect {col_info['dataCount']} existing score(s)"
                        })
                    elif col_info['isPartiallyFilled']:
                        suggestions['suggestions'].append({
                            'targetColumn': col_info['columnName'],
                            'targetIndex': col_info['columnIndex'],
                            'recommendation': 'caution',
                            'risk': 'medium',
                            'description': f"Has {col_info['dataCount']} existing entries ({col_info['fillPercentage']:.1%} filled)",
                            'dataCount': col_info['dataCount'],
                            'sampleValues': col_info['sampleValues'],
                            'studentData': col_info['studentData'],
                            'fillPercentage': col_info['fillPercentage'],
                            'conflictPreview': f"Will affect {col_info['dataCount']} existing scores"
                        })
                    else:
                        suggestions['suggestions'].append({
                            'targetColumn': col_info['columnName'],
                            'targetIndex': col_info['columnIndex'],
                            'recommendation': 'risky',
                            'risk': 'high',
                            'description': f"Column is full ({col_info['dataCount']} entries) - will overwrite existing data",
                            'dataCount': col_info['dataCount'],
                            'sampleValues': col_info['sampleValues'],
                            'studentData': col_info['studentData'],
                            'fillPercentage': col_info['fillPercentage'],
                            'conflictPreview': f"Will overwrite ALL {col_info['dataCount']} existing scores"
                        })

                # 🔥 ENHANCED: Sort by safety (empty first, then low risk, then partial, then full)
                suggestions['suggestions'].sort(key=lambda x: {
                    'perfect': 0,
                    'caution': 1 if x['risk'] == 'low' else 2,
                    'risky': 3
                }.get(x['recommendation'], 4))

                mapping_suggestions.append(suggestions)

            return {
                'success': True,
                'columnAnalysis': column_analysis,
                'mappingSuggestions': mapping_suggestions,
                'alreadyImported': already_imported_info,
                'filteredColumnsCount': len(import_columns) - len(available_columns),
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
        Import column data with custom mappings and enhanced merge strategies.
        ENHANCED: Supports multiple merge strategies for handling existing data.
        """
        try:
            results = {
                'success': True,
                'columnsRenamed': 0,
                'studentsUpdated': 0,
                'cellsUpdated': 0,
                'cellsSkipped': 0,  # 🔥 NEW
                'cellsMerged': 0,  # 🔥 NEW
                'conflictsResolved': 0,  # 🔥 NEW
                'errors': [],
                'actionSummary': {}  # 🔥 NEW: Track what happened per action
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
                action = mapping.get('action', 'replace')  # 🔥 ENHANCED: More action types

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
                            print(f"✅ Renamed column '{target_column}' → '{import_column}'")
                        else:
                            results['errors'].append(f"Failed to rename {target_column} to {import_column}")

                    # Step 2: Import the data for this column
                    column_data = import_data.get('columnData', {}).get(import_column, {})

                    if not column_data:
                        results['errors'].append(f"No data found for column {import_column}")
                        continue

                    # 🔥 ENHANCED: Step 3 - Process with different merge strategies
                    action_stats = {
                        'studentsProcessed': 0,
                        'cellsUpdated': 0,
                        'cellsSkipped': 0,
                        'conflictsResolved': 0,
                        'studentsNotFound': []
                    }

                    for student_key, import_score in column_data.items():
                        # Find student row by matching names
                        student_row_index = self.find_student_row_by_name(
                            student_key, table_data, headers
                        )

                        if student_row_index is None:
                            action_stats['studentsNotFound'].append(student_key)
                            print(f"⚠️ Student '{student_key}' not found in sheet - skipping")
                            continue

                        action_stats['studentsProcessed'] += 1

                        # 🔥 ENHANCED: Get existing value for merge strategies
                        existing_value = None
                        if student_row_index < len(table_data) and target_index < len(table_data[student_row_index]):
                            existing_cell = table_data[student_row_index][target_index]
                            existing_value = str(existing_cell).strip() if existing_cell else None

                        # 🔥 ENHANCED: Apply merge strategy
                        should_update = False
                        final_score = import_score
                        conflict_resolved = False

                        if action == 'replace':
                            # Replace all data (original behavior)
                            should_update = True
                            final_score = import_score
                            if existing_value:
                                conflict_resolved = True

                        elif action == 'merge_skip':
                            # Skip students with existing scores
                            if existing_value:
                                print(f"🔄 MERGE_SKIP: Skipping {student_key} - has existing score '{existing_value}'")
                                action_stats['cellsSkipped'] += 1
                                should_update = False
                            else:
                                should_update = True
                                final_score = import_score

                        elif action == 'merge_update':
                            # Only update empty cells
                            if existing_value:
                                print(f"🔄 MERGE_UPDATE: Keeping existing score for {student_key}: '{existing_value}'")
                                action_stats['cellsSkipped'] += 1
                                should_update = False
                            else:
                                should_update = True
                                final_score = import_score

                        elif action == 'merge_add':
                            # Add to existing scores (sum)
                            if existing_value and existing_value.replace('.', '').replace('-', '').isdigit():
                                try:
                                    existing_num = float(existing_value)
                                    import_num = float(str(import_score))
                                    final_score = existing_num + import_num
                                    should_update = True
                                    conflict_resolved = True
                                    print(
                                        f"🔄 MERGE_ADD: {student_key}: {existing_value} + {import_score} = {final_score}")
                                except ValueError:
                                    print(f"⚠️ MERGE_ADD: Cannot add non-numeric values for {student_key}")
                                    should_update = False
                            else:
                                should_update = True
                                final_score = import_score

                        elif action == 'merge':
                            # Default merge behavior (same as merge_skip for backward compatibility)
                            if existing_value:
                                action_stats['cellsSkipped'] += 1
                                should_update = False
                            else:
                                should_update = True
                                final_score = import_score

                        # 🔥 ENHANCED: Execute the update if needed
                        if should_update:
                            update_result = self.update_cell_in_sheet(
                                sheet_id, student_row_index, import_column, final_score, target_sheet_name
                            )

                            if update_result['success']:
                                action_stats['cellsUpdated'] += 1
                                if conflict_resolved:
                                    action_stats['conflictsResolved'] += 1
                                print(
                                    f"✅ Updated {student_key}: '{existing_value}' → '{final_score}' in {import_column}")
                            else:
                                results['errors'].append(f"Failed to update {student_key} in {import_column}")

                    # 🔥 NEW: Aggregate action statistics
                    results['studentsUpdated'] += action_stats['studentsProcessed']
                    results['cellsUpdated'] += action_stats['cellsUpdated']
                    results['cellsSkipped'] += action_stats['cellsSkipped']
                    results['conflictsResolved'] += action_stats['conflictsResolved']
                    results['actionSummary'][import_column] = action_stats

                    logger.info(
                        f"✅ Column '{import_column}' ({action}): {action_stats['cellsUpdated']} updated, {action_stats['cellsSkipped']} skipped, {action_stats['conflictsResolved']} conflicts resolved")

                    if action_stats['studentsNotFound']:
                        logger.info(f"Students not found for '{import_column}': {action_stats['studentsNotFound']}")

                except ValueError:
                    results['errors'].append(f"Target column {target_column} not found in sheet")
                except Exception as e:
                    results['errors'].append(f"Error importing {import_column}: {str(e)}")
                    logger.error(f"Import error for {import_column}: {str(e)}")

            # 🔥 ENHANCED: Detailed summary
            total_actions = len([m for m in column_mappings if m.get('action') != 'skip'])
            summary_parts = []

            if results['columnsRenamed'] > 0:
                summary_parts.append(f"renamed {results['columnsRenamed']} columns")
            if results['cellsUpdated'] > 0:
                summary_parts.append(f"updated {results['cellsUpdated']} cells")
            if results['cellsSkipped'] > 0:
                summary_parts.append(f"skipped {results['cellsSkipped']} existing values")
            if results['conflictsResolved'] > 0:
                summary_parts.append(f"resolved {results['conflictsResolved']} conflicts")

            summary = ", ".join(summary_parts) if summary_parts else "no changes made"

            return {
                'success': True,
                'results': results,
                'summary': f"Import completed: {summary} across {total_actions} columns"
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
                valueInputOption='USER_ENTERED',
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
        FIXED: More strict matching to prevent false positives.
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
                f"🔍 Searching for student: '{student_identifier}' -> First: '{search_first}', Last: '{search_last}'")

            # 🔥 FIXED: More strict matching strategies
            for row_index, row in enumerate(table_data):
                if first_name_idx < len(row) and last_name_idx < len(row):
                    row_first = str(row[first_name_idx]).strip().lower() if row[first_name_idx] else ''
                    row_last = str(row[last_name_idx]).strip().lower() if row[last_name_idx] else ''

                    # Skip empty rows
                    if not row_first and not row_last:
                        continue

                    # 🔥 STRATEGY 1: Exact match (highest priority)
                    if search_first == row_first and search_last == row_last:
                        logger.info(f"✅ EXACT match found at row {row_index}: {row_first} {row_last}")
                        return row_index

                    # 🔥 STRATEGY 2: Reversed order match
                    if search_first == row_last and search_last == row_first:
                        logger.info(f"✅ REVERSED match found at row {row_index}: {row_first} {row_last}")
                        return row_index

                    # 🔥 STRATEGY 3: Last name exact + first name contains (STRICTER)
                    # This handles "Jared" in sheet matching "Jared Karl" in import
                    if (search_last == row_last and
                            len(search_first) >= 3 and len(row_first) >= 3 and
                            (search_first in row_first or row_first in search_first)):

                        # Additional validation: ensure it's a reasonable match
                        first_similarity = len(set(search_first) & set(row_first)) / max(len(search_first),
                                                                                         len(row_first))
                        if first_similarity >= 0.6:  # At least 60% character overlap
                            logger.info(
                                f"✅ LAST EXACT + FIRST CONTAINS match found at row {row_index}: {row_first} {row_last}")
                            return row_index

                    # 🔥 STRATEGY 4: First name exact + last name contains (STRICTER)
                    if (search_first == row_first and
                            len(search_last) >= 3 and len(row_last) >= 3 and
                            (search_last in row_last or row_last in search_last)):

                        # Additional validation
                        last_similarity = len(set(search_last) & set(row_last)) / max(len(search_last), len(row_last))
                        if last_similarity >= 0.6:  # At least 60% character overlap
                            logger.info(
                                f"✅ FIRST EXACT + LAST CONTAINS match found at row {row_index}: {row_first} {row_last}")
                            return row_index

                    # 🔥 STRATEGY 5: Full name matching (for cases like "Jared Karl" vs "Jared Karl Omen")
                    import_full = f"{search_first} {search_last}".strip()
                    sheet_full = f"{row_first} {row_last}".strip()

                    # Check if one full name is contained in the other (with minimum length requirement)
                    if (len(import_full) >= 6 and len(sheet_full) >= 6 and
                            (import_full in sheet_full or sheet_full in import_full)):

                        # Ensure it's not a coincidental substring match
                        word_overlap = len(set(import_full.split()) & set(sheet_full.split()))
                        total_words = max(len(import_full.split()), len(sheet_full.split()))

                        if word_overlap >= 2 or (total_words <= 2 and word_overlap >= 1):
                            logger.info(f"✅ FULL NAME CONTAINS match found at row {row_index}: {row_first} {row_last}")
                            return row_index

            # 🔥 NO MATCH FOUND - Log available students for debugging
            logger.warning(f"❌ No match found for: '{student_identifier}'")
            logger.warning(f"Available students in sheet (first 5):")
            for i, row in enumerate(table_data[:5]):
                if first_name_idx < len(row) and last_name_idx < len(row):
                    sheet_first = str(row[first_name_idx]).strip() if row[first_name_idx] else ''
                    sheet_last = str(row[last_name_idx]).strip() if row[last_name_idx] else ''
                    if sheet_first or sheet_last:  # Only show non-empty rows
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

    def update_max_score_in_sheet(self, sheet_id: str, column_name: str, max_score: str,
                                  sheet_name: str = None) -> dict:
        """
        Update the max score for a specific column in Row 3 of the Google Sheet.

        Args:
            sheet_id: ID of the spreadsheet
            column_name: Name of the column (e.g., 'QUIZ 1')
            max_score: New max score value (e.g., '30')
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

            headers = sheet_data['headers']  # This is Row 2 (column names)
            target_sheet_name = sheet_data['sheet_name']

            # Find column index by matching column name
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

            # 🔥 CRITICAL: Row 3 is the max scores row (1-based indexing)
            max_score_row = 3
            cell_range = f"'{target_sheet_name}'!{column_letter}{max_score_row}"

            logger.info(f"Updating max score cell {cell_range} with value '{max_score}'")

            # Update the max score cell
            body = {
                'values': [[str(max_score)]]
            }

            result = self.sheets_service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=cell_range,
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()

            logger.info(f"Successfully updated max score {cell_range} with value '{max_score}'")

            return {
                'success': True,
                'updated_cells': result.get('updatedCells', 0),
                'cell_range': cell_range,
                'max_score': max_score,
                'column_name': column_name,
                'sheet_name': target_sheet_name
            }

        except Exception as e:
            logger.error(f"Unexpected error updating max score in sheet: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to update max score: {str(e)}'
            }

    def update_batch_max_scores_in_sheet(self, sheet_id: str, column_names: list, max_score: str,
                                         sheet_name: str = None) -> dict:
        """
        Update max scores for multiple columns (batch operation).

        Args:
            sheet_id: ID of the spreadsheet
            column_names: List of column names (e.g., ['QUIZ 1', 'QUIZ 2'])
            max_score: New max score value for all columns
            sheet_name: Name of the specific sheet

        Returns:
            Dict containing batch update results
        """
        try:
            results = {
                'success': True,
                'updated_columns': 0,
                'failed_columns': 0,
                'errors': [],
                'updated_cells': 0
            }

            # Update each column individually
            for column_name in column_names:
                try:
                    result = self.update_max_score_in_sheet(sheet_id, column_name, max_score, sheet_name)

                    if result['success']:
                        results['updated_columns'] += 1
                        results['updated_cells'] += result.get('updated_cells', 0)
                        logger.info(f"✅ Updated {column_name} max score to {max_score}")
                    else:
                        results['failed_columns'] += 1
                        results['errors'].append(f"{column_name}: {result.get('error', 'Unknown error')}")
                        logger.error(f"❌ Failed to update {column_name}: {result.get('error')}")

                except Exception as e:
                    results['failed_columns'] += 1
                    results['errors'].append(f"{column_name}: {str(e)}")
                    logger.error(f"❌ Exception updating {column_name}: {str(e)}")

            # Determine overall success
            if results['failed_columns'] > 0:
                results['success'] = results['updated_columns'] > 0  # Partial success if some worked

            summary = f"Updated {results['updated_columns']} columns"
            if results['failed_columns'] > 0:
                summary += f", {results['failed_columns']} failed"

            return {
                'success': results['success'],
                'results': results,
                'summary': summary
            }

        except Exception as e:
            logger.error(f"Batch max score update error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to update batch max scores: {str(e)}'
            }

    def update_range(self, sheet_id, range_name, values, sheet_name=None):
        """Update a range of cells in the sheet"""
        try:
            # If sheet_name is provided, prepend it to the range
            if sheet_name:
                range_name = f"'{sheet_name}'!{range_name}"

            body = {
                'values': values
            }

            # 🔥 FIXED: Use self.sheets_service instead of self.service
            result = self.sheets_service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=range_name,
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()

            return {
                'success': True,
                'updated_cells': result.get('updatedCells', 0),
                'updated_rows': result.get('updatedRows', 0),
                'updated_columns': result.get('updatedColumns', 0)
            }

        except Exception as e:
            logger.error(f"Failed to update range: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def delete_student_from_sheet(self, sheet_id: str, student_identifier: str, search_type: str = 'name',
                                  sheet_name: str = None) -> dict:
        """
        Delete a student from the Google Sheet by name or ID.
        Updated with formula protection - only clears data columns, not formula columns.

        Args:
            sheet_id: ID of the spreadsheet
            student_identifier: Student name or ID to search for
            search_type: 'name' or 'id'
            sheet_name: Name of the specific sheet (if None, uses first sheet)

        Returns:
            Dict containing success status and deletion info
        """
        try:
            # Get sheet data
            if sheet_name:
                sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            else:
                sheet_data = self.get_sheet_data(sheet_id)

            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']
            target_sheet_name = sheet_data['sheet_name']
            current_data = sheet_data['tableData']

            print(f"🗑️ DELETE STUDENT: Searching for {search_type}: '{student_identifier}'")
            print(f"🗑️ DELETE STUDENT: Total rows to search: {len(current_data)}")

            # Find student row
            student_row_index = None
            student_info = {}

            for row_index, row in enumerate(current_data):
                if search_type == 'name':
                    # Search by name (first name + last name)
                    if len(row) >= 3:
                        first_name = str(row[2]).strip() if len(row) > 2 and row[2] else ''
                        last_name = str(row[1]).strip() if len(row) > 1 and row[1] else ''
                        full_name = f"{first_name} {last_name}".strip()

                        # Flexible name matching
                        if (student_identifier.lower() in full_name.lower() or
                                full_name.lower() in student_identifier.lower() or
                                student_identifier.lower() == first_name.lower() or
                                student_identifier.lower() == last_name.lower()):
                            student_row_index = row_index
                            student_info = {
                                'first_name': first_name,
                                'last_name': last_name,
                                'full_name': full_name,
                                'student_id': str(row[3]).strip() if len(row) > 3 and row[3] else 'N/A'
                            }
                            break

                elif search_type == 'id':
                    # Search by student ID
                    if len(row) > 3 and row[3]:
                        row_student_id = str(row[3]).strip()
                        if row_student_id == student_identifier:
                            student_row_index = row_index
                            student_info = {
                                'first_name': str(row[2]).strip() if len(row) > 2 and row[2] else '',
                                'last_name': str(row[1]).strip() if len(row) > 1 and row[1] else '',
                                'student_id': row_student_id
                            }
                            student_info[
                                'full_name'] = f"{student_info['first_name']} {student_info['last_name']}".strip()
                            break

            if student_row_index is None:
                return {
                    'success': False,
                    'error': f'Student not found: {student_identifier}',
                    'search_type': search_type
                }

            # Calculate actual sheet row (add 4 for header rows and 1-based indexing)
            sheet_row = student_row_index + 4

            print(f"🗑️ DELETE STUDENT: Found student at row index {student_row_index} (sheet row {sheet_row})")
            print(f"🗑️ DELETE STUDENT: Student info: {student_info}")

            # 🔥 FORMULA PROTECTION: Update only specific columns to avoid formula columns
            updates = []

            for col_index, header in enumerate(headers):
                column_letter = chr(65 + col_index)

                # 🔥 SKIP formula columns - same logic as add_student
                header_name = header.upper()
                formula_keywords = ['TOTAL', 'SUM', 'AVERAGE', 'AVG', 'FORMULA']
                is_formula_column = any(keyword in header_name for keyword in formula_keywords)

                if not is_formula_column:
                    updates.append({
                        'range': f"'{target_sheet_name}'!{column_letter}{sheet_row}",
                        'values': [['']]  # Clear with empty string
                    })
                    print(f"🗑️ DELETE STUDENT: Clearing data column: {column_letter}{sheet_row} ({header})")
                else:
                    print(f"🗑️ DELETE STUDENT: SKIPPING formula column: {header}")

            print(f"🗑️ DELETE STUDENT: Total columns to clear: {len(updates)}")

            # 🔥 Batch update only the data columns (same pattern as add_student)
            if updates:
                body = {
                    'valueInputOption': 'USER_ENTERED',
                    'data': updates
                }

                result = self.sheets_service.spreadsheets().values().batchUpdate(
                    spreadsheetId=sheet_id,
                    body=body
                ).execute()

                print(f"🗑️ DELETE STUDENT: Batch update successful, cleared {result.get('totalUpdatedCells', 0)} cells")
            else:
                print("🗑️ DELETE STUDENT: No columns to clear")
                result = {'totalUpdatedCells': 0}

            # 🔥 RE-NUMBER ALL STUDENTS to maintain sequence
            renumber_result = self.renumber_all_students(sheet_id, target_sheet_name)
            if not renumber_result['success']:
                print(f"⚠️ Warning: Failed to renumber students: {renumber_result.get('error')}")

            logger.info(f"Successfully deleted student {student_info['full_name']} from {target_sheet_name}")

            return {
                'success': True,
                'deleted_student': student_info,
                'row_cleared': sheet_row,
                'sheet_name': target_sheet_name,
                'renumbered': renumber_result.get('success', False),
                'cleared_columns': len(updates)
            }

        except Exception as e:
            logger.error(f"Unexpected error deleting student: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': f'Failed to delete student: {str(e)}'
            }

    def renumber_all_students(self, sheet_id: str, sheet_name: str) -> dict:
        """
        Renumber all students after deletion to maintain sequence.
        """
        try:
            # Get fresh sheet data
            sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']
            current_data = sheet_data['tableData']

            updates = []
            student_number = 1

            for row_index, row in enumerate(current_data):
                # Check if row has student data
                has_student_data = False
                if len(row) >= 3:
                    first_name = str(row[2]).strip() if len(row) > 2 and row[2] else ''
                    last_name = str(row[1]).strip() if len(row) > 1 and row[1] else ''

                    if first_name or last_name:
                        has_student_data = True

                if has_student_data:
                    # Calculate sheet row
                    sheet_row = row_index + 4  # +3 for headers, +1 for 1-based indexing

                    updates.append({
                        'range': f"'{sheet_name}'!A{sheet_row}",
                        'values': [[str(student_number)]]
                    })

                    student_number += 1

            # Batch update all numbers
            if updates:
                body = {
                    'valueInputOption': 'USER_ENTERED',
                    'data': updates
                }

                result = self.sheets_service.spreadsheets().values().batchUpdate(
                    spreadsheetId=sheet_id,
                    body=body
                ).execute()

                print(f"🔢 RENUMBER: Updated {len(updates)} student numbers")
                return {
                    'success': True,
                    'updated_count': len(updates)
                }
            else:
                return {
                    'success': True,
                    'updated_count': 0
                }

        except Exception as e:
            logger.error(f"Error renumbering students: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
