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

            # 🔥 Get MORE data to capture both header rows
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

            # 🔥 Get BOTH header rows for voice commands
            main_headers = values[0] if len(values) > 0 else []  # Row 1: Categories
            sub_headers = values[1] if len(values) > 1 else []  # Row 2: Column names

            # 🔥 Combine headers for better voice recognition
            combined_headers = []
            for i, (main, sub) in enumerate(zip(main_headers, sub_headers)):
                if sub and sub.strip():  # If sub-header exists and is not empty
                    combined_headers.append(sub.strip())
                elif main and main.strip():  # Fall back to main header
                    combined_headers.append(main.strip())
                else:
                    combined_headers.append(f"Column_{i + 1}")

            # Rest of the data (skip first 2 rows which are headers)
            tableData = values[2:] if len(values) > 2 else []

            return {
                'success': True,
                'headers': combined_headers,
                'main_headers': main_headers,
                'sub_headers': sub_headers,
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

        Args:
            sheet_id: ID of the spreadsheet
            row_index: 0-based row index (0 = first data row, skipping headers)
            column_name: Name of the column (e.g., 'QUIZ 1')
            value: Value to set in the cell

        Returns:
            Dict containing success status and update info
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
            column_letter = chr(65 + column_index)  # A=65, B=66, etc.

            # Calculate actual sheet row (skip 2 header rows, convert to 1-based)
            sheet_row = row_index + 3  # +2 for headers, +1 for 1-based indexing

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

        except HttpError as e:
            error_details = e.content.decode('utf-8') if e.content else str(e)
            logger.error(f"Google Sheets API error updating cell: {error_details}")
            return {
                'success': False,
                'error': f'Google Sheets API error: {e.status_code}',
                'details': error_details
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
            next_row = len(current_data) + 3  # +2 for headers, +1 for 1-based indexing

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
            next_row = len(current_data) + 3  # +2 for headers, +1 for 1-based indexing

            # 🔥 Calculate the student number (how many students currently exist + 1)
            student_number = len(current_data) + 1

            # Create new row with student data
            new_row = [''] * len(headers)

            # 🔥 Auto-assign the number to the first column (NO.)
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
                'rowNumber': student_number,  # 🔥 Return the assigned number
                'student_data': student_data,
                'range': range_name
            }

        except HttpError as e:
            error_details = e.content.decode('utf-8') if e.content else str(e)
            logger.error(f"Google Sheets API error adding student with auto-number: {error_details}")
            return {
                'success': False,
                'error': f'Google Sheets API error: {e.status_code}',
                'details': error_details
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
                    cell_row = i + 3  # +2 for headers, +1 for 1-based indexing
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