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