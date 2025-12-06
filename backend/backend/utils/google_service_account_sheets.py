import logging
import re
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

    def _column_index_to_a1(self, index: int) -> str:
        """Convert a 0-based column index to A1 notation letters (A, ..., Z, AA, AB, ...)."""
        if index < 0:
            raise ValueError("Column index must be non-negative")
        result = []
        n = index
        while True:
            n, rem = divmod(n, 26)
            result.append(chr(ord('A') + rem))
            if n == 0:
                break
            n -= 1  # Excel-style base-26 (no zero digit)
        return ''.join(reversed(result))

    # ===== Helpers for category handling =====
    def _parse_category_and_index(self, header: str):
        if not header:
            return None, None
        name = str(header).strip().upper()
        
        # 🔥 ENHANCED: Skip if this looks like a student info field
        student_info_patterns = {
            'FIRSTNAME', 'FIRST NAME', 'LASTNAME', 'LAST NAME', 
            'MIDDLENAME', 'MIDDLE NAME', 'STUDENT ID', 'STUDENTID',
            'NO.', 'NUMBER', 'EMAIL', 'PHONE', 'ADDRESS'
        }
        
        if name in student_info_patterns:
            return None, None
            
        # normalize multiple spaces
        import re
        name = re.sub(r"\s+", " ", name)
        # Split into tokens
        tokens = name.split(" ")
        category = tokens[0]
        
        # 🔥 ENHANCED: Additional validation for category
        if not category or len(category) < 2:
            return None, None
            
        index = None
        if len(tokens) >= 2 and tokens[1].isdigit():
            index = int(tokens[1])
        return category, index

    def _is_exam_category(self, category: str) -> bool:
        if not category:
            return False
        return category in {"PRELIM", "MIDTERM", "PREFINAL", "FINAL"}

    def _is_non_exam_scored_category(self, category: str) -> bool:
        if not category:
            return False
        return category in {"QUIZ", "LAB", "LABORATORY", "SEAT", "SEATWORK", "ASSIGN", "ASSIGNMENT", "ASSIGNMENTS"}

    def _get_sheet_id_by_title(self, spreadsheet_id: str, title: str) -> int:
        meta = self.sheets_service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        for sheet in meta.get('sheets', []):
            props = sheet.get('properties', {})
            if props.get('title') == title:
                return props.get('sheetId')
        raise ValueError(f"Sheet title not found: {title}")

    def execute_auto_mapping(self, sheet_id: str, decisions: list, import_data: dict, sheet_name: str = None) -> dict:
        """Execute decisions including creating new non-exam columns after the last filled column in the category."""
        try:
            # Load current sheet data
            if sheet_name:
                sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            else:
                sheet_data = self.get_sheet_data(sheet_id)

            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers'][:]  # copy
            table_data = sheet_data['tableData']
            target_sheet_name = sheet_data['sheet_name']

            # Prepare category metrics
            column_data_counts = []  # per column data count
            for col_index, _ in enumerate(headers):
                count = 0
                for row in table_data:
                    if col_index < len(row) and row[col_index] and str(row[col_index]).strip():
                        count += 1
                column_data_counts.append(count)

            # Build category indices map
            category_to_indices = {}
            category_to_index_numbers = {}
            for idx, header in enumerate(headers):
                cat, cat_idx = self._parse_category_and_index(header)
                if not cat:
                    continue
                category_to_indices.setdefault(cat, []).append(idx)
                if cat_idx is not None:
                    category_to_index_numbers.setdefault(cat, []).append(cat_idx)

            # Plan structural inserts and final mappings
            inserts = []  # list of dicts: {insert_at, header}
            final_mappings = []  # importColumn -> targetColumn

            for decision in decisions:
                import_col = decision.get('importColumn')
                action = decision.get('action', 'merge')
                target_col = decision.get('targetColumn')

                if action != 'new':
                    # Keep existing mapping as-is
                    if target_col:
                        final_mappings.append({
                            'importColumn': import_col,
                            'targetColumn': target_col,
                            'action': action
                        })
                    continue

                # Handle new column creation for non-exam categories
                cat, idx_num = self._parse_category_and_index(import_col)
                if not cat:
                    # Fallback: append at end
                    cat = None

                if cat and self._is_exam_category(cat):
                    # Do not auto-add for exam columns
                    return {
                        'success': False,
                        'error': f"Cannot auto-add exam column for '{import_col}'."
                    }

                # Determine insertion point within category
                candidate_indices = category_to_indices.get(cat, []) if cat else list(range(len(headers)))
                if candidate_indices:
                    # last filled = max index with dataCount>0 among category indices
                    last_filled = -1
                    for ci in candidate_indices:
                        if column_data_counts[ci] > 0 and ci > last_filled:
                            last_filled = ci
                    # find first empty after last_filled within category
                    chosen_index = None
                    for ci in candidate_indices:
                        if ci > last_filled and column_data_counts[ci] == 0:
                            chosen_index = ci
                            break
                    if chosen_index is None:
                        # Insert after last_filled or at end of category group
                        insert_at = (max(candidate_indices) + 1) if last_filled < 0 else (last_filled + 1)
                        # Name header: preserve category; assign next index if category recognized
                        if cat:
                            existing_numbers = category_to_index_numbers.get(cat, [])
                            next_num = (max(existing_numbers) + 1) if existing_numbers else 1
                            header_title = f"{cat} {next_num}"
                        else:
                            header_title = import_col
                        inserts.append({'insert_at': insert_at, 'header': header_title})
                        # Track header state post-insert for subsequent decisions
                        headers.insert(insert_at, header_title)
                        column_data_counts.insert(insert_at, 0)
                        for indices in category_to_indices.values():
                            for k in range(len(indices)):
                                if indices[k] >= insert_at:
                                    indices[k] += 1
                        if cat:
                            category_to_indices.setdefault(cat, []).append(insert_at)
                            category_to_indices[cat].sort()
                            category_to_index_numbers.setdefault(cat, []).append(next_num)
                        # Final mapping to the new header
                        final_mappings.append({
                            'importColumn': import_col,
                            'targetColumn': header_title,
                            'action': 'replace'
                        })
                    else:
                        # Use the empty column: rename its header to the import title
                        header_title = import_col
                        final_mappings.append({
                            'importColumn': import_col,
                            'targetColumn': headers[chosen_index],
                            'action': 'replace'
                        })
                else:
                    # No category found; append to end
                    insert_at = len(headers)
                    header_title = import_col
                    inserts.append({'insert_at': insert_at, 'header': header_title})
                    headers.append(header_title)
                    column_data_counts.append(0)
                    final_mappings.append({
                        'importColumn': import_col,
                        'targetColumn': header_title,
                        'action': 'replace'
                    })

            # Apply structural inserts (from right to left to keep indices stable)
            if inserts:
                target_sheet_id = self._get_sheet_id_by_title(sheet_id, target_sheet_name)
                requests = []
                for ins in sorted(inserts, key=lambda x: x['insert_at'], reverse=True):
                    requests.append({
                        'insertDimension': {
                            'range': {
                                'sheetId': target_sheet_id,
                                'dimension': 'COLUMNS',
                                'startIndex': ins['insert_at'],
                                'endIndex': ins['insert_at'] + 1
                            },
                            'inheritFromBefore': True
                        }
                    })
                # Execute insertions
                self.sheets_service.spreadsheets().batchUpdate(
                    spreadsheetId=sheet_id,
                    body={'requests': requests}
                ).execute()
                # Set header values for inserted columns
                header_updates = []
                for ins in inserts:
                    col_letter = self._column_index_to_a1(ins['insert_at'])
                    header_updates.append({
                        'range': f"'{target_sheet_name}'!{col_letter}2",
                        'values': [[ins['header']]]
                    })
                if header_updates:
                    self.sheets_service.spreadsheets().values().batchUpdate(
                        spreadsheetId=sheet_id,
                        body={'valueInputOption': 'USER_ENTERED', 'data': header_updates}
                    ).execute()

            # Now perform data writes using existing bulk path
            import_result = self.import_column_data_bulk(
                sheet_id,
                final_mappings,
                import_data,
                target_sheet_name
            )

            # Attach structural info
            import_result.setdefault('structuralChanges', [])
            for ins in inserts:
                import_result['structuralChanges'].append({
                    'insertedAt': ins['insert_at'],
                    'header': ins['header'],
                    'sheet': target_sheet_name
                })

            return import_result

        except Exception as e:
            logger.error(f"Execute auto-mapping error: {str(e)}")
            return {'success': False, 'error': f'Failed to execute auto-mapping: {str(e)}'}

    def preview_exceeds_max(self, sheet_id: str, column_mappings: list, import_data: dict, sheet_name: str = None) -> dict:
        """Preview which mapped columns will have scores exceeding the max and count them.

        Returns {
          'success': True,
          'indexed': [ { 'exceeds': n, 'targetColumn': str, 'max': float|None } ... ],  # aligned to column_mappings order
          'preview': { importColumn: { 'exceeds': int, 'targetColumn': str } }  # legacy
        }
        """
        try:
            # Load current sheet data to resolve sheet name and columns
            if sheet_name:
                sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            else:
                sheet_data = self.get_sheet_data(sheet_id)

            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']
            target_sheet_name = sheet_data['sheet_name']

            result = {}
            indexed = []
            for idx, mapping in enumerate(column_mappings):
                import_column = mapping.get('importColumn')
                target_column = mapping.get('targetColumn')
                if not import_column or not target_column:
                    indexed.append({'exceeds': 0, 'targetColumn': target_column, 'max': None})
                    continue
                # Resolve target index
                try:
                    target_index = headers.index(target_column)
                except ValueError:
                    # target column not found; skip
                    result[import_column] = {'exceeds': 0, 'targetColumn': target_column}
                    continue
                col_letter = self._column_index_to_a1(target_index)
                # Get max value from row 3
                max_score_value = None
                try:
                    max_cell_range = f"'{target_sheet_name}'!{col_letter}3"
                    max_resp = self.sheets_service.spreadsheets().values().get(
                        spreadsheetId=sheet_id,
                        range=max_cell_range
                    ).execute()
                    values = max_resp.get('values', [])
                    if values and values[0]:
                        candidate = str(values[0][0]).strip()
                        try:
                            max_score_value = float(candidate)
                        except ValueError:
                            max_score_value = None
                except Exception:
                    max_score_value = None

                exceeds = 0
                if max_score_value is not None:
                    col_data = import_data.get('columnData', {}).get(import_column, {})
                    for _, v in col_data.items():
                        try:
                            num = float(str(v))
                            if num > max_score_value:
                                exceeds += 1
                        except Exception:
                            # ignore non-numeric
                            continue

                result[import_column] = {'exceeds': exceeds, 'targetColumn': target_column}

                indexed.append({'exceeds': exceeds, 'targetColumn': target_column, 'max': max_score_value})

            return {'success': True, 'preview': result, 'indexed': indexed}
        except Exception as e:
            logger.error(f"Preview exceeds max error: {str(e)}")
            return {'success': False, 'error': str(e)}

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
        Updated to handle 3-row header structure and extended column range.
        """
        try:
            # Get sheet metadata first
            spreadsheet = self.sheets_service.spreadsheets().get(spreadsheetId=sheet_id).execute()

            # Get the first sheet name
            first_sheet = spreadsheet['sheets'][0]['properties']['title']

            # 🔥 FIXED: Extended range to cover columns beyond Z
            range_name = f"{first_sheet}!A1:AM100"  # Changed from A1:Z100 to A1:AM100
            print(f"🔍 GET SHEET DATA: Requesting range: {range_name}")

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
            print(f"   Total Headers Count: {len(combined_headers)}")  # 🔥 NEW: Debug header count

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
            # 🔥 FIXED: Increased range from A1:AM100 to A1:ZZ100 to include columns beyond AM
            # This fixes formula column mismatch (AO2 vs AI2) when sheets have many categories
            range_name = f"'{sheet_name}'!A1:ZZ100"  # Use specific sheet name in quotes, wider range
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

    def update_cell_by_student_and_column(self, sheet_id: str, sheet_name: str, student_id: str, column_name: str, value: str) -> dict:
        """
        Find a student's row by Student ID and update the specified column with the provided value.

        Args:
            sheet_id: Spreadsheet ID
            sheet_name: Tab name (e.g., 'Midterm' or 'Final')
            student_id: Exact Student ID string to match
            column_name: Header name (must match one of the sub headers)
            value: Value to set (e.g., 'INC' or 'N/A')

        Returns: dict with success and details
        """
        try:
            data = self.get_specific_sheet_data(sheet_id, sheet_name)
            if not data.get('success'):
                return data

            headers = data.get('headers', [])
            table = data.get('tableData', [])

            # Locate Student ID column
            student_id_idx = None
            for idx, h in enumerate(headers):
                if isinstance(h, str) and 'STUDENT' in h.upper() and 'ID' in h.upper():
                    student_id_idx = idx
                    break
            if student_id_idx is None:
                return {'success': False, 'error': 'Student ID column not found'}

            # Locate Final Grade column index using MAIN HEADERS (Row 1)
            def norm(s: str) -> str:
                return ''.join(str(s or '').strip().upper().split())
            main_headers = data.get('main_headers', [])
            target_col_idx = None
            for idx, mh in enumerate(main_headers):
                if norm(mh) == norm('Final Grade'):
                    target_col_idx = idx
                    break
            if target_col_idx is None:
                return {'success': False, 'error': 'Final Grade column not found in main headers'}

            # Find row index by exact student id match
            row_index = None
            for i, row in enumerate(table):
                sid = ''
                if student_id_idx < len(row) and row[student_id_idx] is not None:
                    sid = str(row[student_id_idx]).strip()
                if sid == str(student_id).strip():
                    row_index = i
                    break

            if row_index is None:
                return {'success': False, 'error': f'Student ID {student_id} not found'}

            # Issue the update using the existing primitive (0-based row index)
            # Convert index to letter and write directly
            column_letter = chr(65 + target_col_idx)
            sheet_row = row_index + 4
            cell_range = f"'{sheet_name}'!{column_letter}{sheet_row}"
            body = { 'values': [[str(value)]] }
            result = self.sheets_service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=cell_range,
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            upd = { 'success': True, 'updated_cells': result.get('updatedCells', 0), 'cell_range': cell_range }
            return upd
        except Exception as e:
            logger.error(f"update_cell_by_student_and_column error: {str(e)}")
            return {'success': False, 'error': str(e)}

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
        IMPROVED: Now does TRUE batch import instead of one-by-one
        """
        try:
            # Collect ALL students to add (new + overrides)
            all_students_to_add = new_students.copy()

            # Process conflicts - collect override students
            students_to_override = []
            for conflict in resolved_conflicts:
                if conflict.get('action') == 'override':
                    students_to_override.append(conflict['importStudent'])

            # ADD ALL NEW STUDENTS AT ONCE - SINGLE API CALL
            if all_students_to_add:
                bulk_result = self.import_all_students_at_once(sheet_id, all_students_to_add, sheet_name)
                if not bulk_result['success']:
                    return bulk_result

            # Handle overrides separately (they need individual updates)
            override_results = self._handle_overrides(sheet_id, students_to_override, resolved_conflicts, sheet_name)

            return {
                'success': True,
                'newStudentsAdded': len(all_students_to_add),
                'conflictsOverridden': override_results['overridden'],
                'conflictsSkipped': len([c for c in resolved_conflicts if c.get('action') == 'skip']),
                'totalProcessed': len(all_students_to_add) + len(resolved_conflicts)
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _handle_overrides(self, sheet_id: str, students_to_override: list, resolved_conflicts: list,
                          sheet_name: str = None) -> dict:
        """
        Handle override conflicts by updating existing student data.
        🔥 ENHANCED: Now supports Middle Name updates
        """
        try:
            override_results = {
                'overridden': 0,
                'errors': []
            }

            # Process each conflict that has 'override' action
            for conflict in resolved_conflicts:
                action = conflict.get('action', 'skip')

                if action == 'override':
                    existing_student = conflict.get('existingStudent', {})
                    import_student = conflict.get('importStudent', {})

                    print(
                        f"🔍 Processing override: {import_student.get('FIRST NAME', '')} {import_student.get('MIDDLE NAME', '')} {import_student.get('LASTNAME', '')} - Action: {action}")

                    try:
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
                                    override_results['errors'].append(
                                        f"Failed to update first name: {update_result.get('error')}")

                            # 🔥 NEW: Update Middle Name if provided
                            if import_student.get('MIDDLE NAME'):
                                update_result = self.update_cell_in_sheet(
                                    sheet_id, existing_row_index, 'MIDDLE NAME',
                                    import_student['MIDDLE NAME'], sheet_name
                                )
                                if update_result['success']:
                                    updates_made += 1
                                    print(
                                        f"✅ Updated Middle Name: {existing_student.get('MIDDLE NAME', 'None')} → {import_student['MIDDLE NAME']}")
                                else:
                                    override_results['errors'].append(
                                        f"Failed to update middle name: {update_result.get('error')}")

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
                                    override_results['errors'].append(
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
                                    override_results['errors'].append(
                                        f"Failed to update student ID: {update_result.get('error')}")

                            if updates_made > 0:
                                override_results['overridden'] += 1
                                print(
                                    f"✅ Override completed: {import_student.get('FIRST NAME', '')} {import_student.get('MIDDLE NAME', '')} {import_student.get('LASTNAME', '')} ({updates_made} fields updated)")
                            else:
                                override_results['errors'].append(
                                    f"No updates made for {import_student.get('FIRST NAME', '')} {import_student.get('LASTNAME', '')}")
                        else:
                            override_results['errors'].append(
                                f"Could not find row index for existing student: {existing_student}")

                    except Exception as e:
                        override_results['errors'].append(
                            f"Error overriding student {import_student.get('FIRST NAME', '')} {import_student.get('LASTNAME', '')}: {str(e)}")
                        logger.error(f"Override error: {str(e)}")

            return override_results

        except Exception as e:
            logger.error(f"Handle overrides error: {str(e)}")
            return {
                'overridden': 0,
                'errors': [f'Failed to handle overrides: {str(e)}']
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

            # 🔥 FIXED: Find actual first empty row and count students properly
            first_empty_row = None
            actual_student_count = 0

            # Check each row in tableData to find first empty spot
            for row_index in range(len(current_data)):
                row = current_data[row_index]

                if self._has_student_data(row, headers):
                    actual_student_count += 1
                else:
                    # This row is empty, use it
                    if first_empty_row is None:
                        first_empty_row = row_index
                        break

            # If no empty row found in existing data, add at the end
            if first_empty_row is None:
                first_empty_row = len(current_data)

            # 🔥 FIXED: Calculate actual sheet row correctly
            next_row = first_empty_row + 4  # +3 for headers, +1 for 1-based indexing
            student_number = actual_student_count + 1

            print(f"🔍 DEBUG add_student_with_auto_number_to_sheet:")
            print(f"   Student data to add: {student_data}")
            print(f"   Current tableData length: {len(current_data)}")
            print(f"   Found {actual_student_count} existing students")
            print(f"   First empty row index in tableData: {first_empty_row}")
            print(f"   Target sheet row: {next_row}")
            print(f"   New student number: {student_number}")

            # Rest of your existing update logic stays the same...
            updates = []

            # Update NO. column (A)
            if len(headers) > 0:
                updates.append({
                    'range': f"'{sheet_name}'!A{next_row}",
                    'values': [[str(student_number)]]
                })

            # Update student data columns
            for key, value in student_data.items():
                if key in headers:
                    index = headers.index(key)
                    column_letter = chr(65 + index)

                    # Skip formula columns
                    header_name = headers[index].upper()
                    formula_keywords = ['TOTAL', 'SUM', 'AVERAGE', 'AVG', 'FORMULA']
                    is_formula_column = any(keyword in header_name for keyword in formula_keywords)

                    if not is_formula_column:
                        updates.append({
                            'range': f"'{sheet_name}'!{column_letter}{next_row}",
                            'values': [[str(value)]]
                        })
                        print(f"🔍 ADD STUDENT: Adding {key} to {column_letter}{next_row} = {value}")  # 🔥 NEW
                    else:
                        print(f"🔍 ADD STUDENT: SKIPPING formula column: {header_name}")

            # Batch update
            if updates:
                body = {
                    'valueInputOption': 'USER_ENTERED',
                    'data': updates
                }

                result = self.sheets_service.spreadsheets().values().batchUpdate(
                    spreadsheetId=sheet_id,
                    body=body
                ).execute()
            else:
                result = {'totalUpdatedCells': 0}

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
        🔥 ENHANCED: Now includes Middle Name and Student ID validation.
        """
        try:
            valid_students = []
            invalid_students = []

            for i, student in enumerate(import_data):
                row_number = student.get('originalRow', i + 1)

                # Check required fields
                first_name = student.get('FIRST NAME', '').strip()
                middle_name = student.get('MIDDLE NAME', '').strip()  # 🔥 NEW
                last_name = student.get('LASTNAME', '').strip()
                student_id = student.get('STUDENT ID', '').strip()

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
                    # 🔥 ENHANCED: Include Middle Name and Student ID in valid student data
                    valid_student = {
                        'FIRST NAME': first_name,
                        'LASTNAME': last_name
                    }

                    # 🔥 NEW: Add Middle Name if it exists
                    if middle_name:
                        valid_student['MIDDLE NAME'] = middle_name

                    # Add Student ID if it exists
                    if student_id:
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

    def import_all_students_at_once(self, sheet_id: str, all_students: list, sheet_name: str = None) -> dict:
        """
        Import ALL students in a single batch operation - MUCH FASTER!
        🔥 ENHANCED: Full Student ID support with debug logging
        """
        try:
            # Get current sheet data
            sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']
            current_data = sheet_data['tableData']

            # 🔥 NEW: Log what columns we found
            print(f"🔍 DEBUG: Available columns in sheet:")
            for idx, header in enumerate(headers):
                print(f"   Column {chr(65 + idx)}: {header}")

            # Find the actual first empty row, not just append to end
            first_empty_row = None
            actual_student_count = 0

            # Check each row in tableData to find first empty spot
            for row_index in range(len(current_data)):
                row = current_data[row_index]

                if self._has_student_data(row, headers):
                    actual_student_count += 1
                else:
                    # This row is empty, use it
                    if first_empty_row is None:
                        first_empty_row = row_index
                        break

            # If no empty row found in existing data, add at the end
            if first_empty_row is None:
                first_empty_row = len(current_data)

            print(f"🔍 DEBUG import_all_students_at_once:")
            print(f"   Current tableData length: {len(current_data)}")
            print(f"   Actual student count: {actual_student_count}")
            print(f"   First empty row in tableData: {first_empty_row}")

            # Prepare ALL student data at once
            all_updates = []

            for i, student in enumerate(all_students):
                # Use the correct row calculation
                tableData_row_index = first_empty_row + i
                sheet_row_number = tableData_row_index + 4  # +3 for headers, +1 for 1-based
                student_number = actual_student_count + i + 1

                print(
                    f"   Student {i + 1}: {student.get('FIRST NAME', '')} {student.get('LASTNAME', '')} (ID: {student.get('STUDENT ID', 'None')})")
                print(f"      → tableData[{tableData_row_index}] → sheet row {sheet_row_number}")

                # Add student number
                all_updates.append({
                    'range': f"'{sheet_name}'!A{sheet_row_number}",
                    'values': [[str(student_number)]]
                })

                # Add all student data including Student ID
                for key, value in student.items():
                    if key in headers:
                        column_index = headers.index(key)
                        column_letter = chr(65 + column_index)

                        # Skip formula columns
                        header_name = headers[column_index].upper()
                        formula_keywords = ['TOTAL', 'SUM', 'AVERAGE', 'AVG', 'FORMULA']
                        is_formula_column = any(keyword in header_name for keyword in formula_keywords)

                        if not is_formula_column:
                            all_updates.append({
                                'range': f"'{sheet_name}'!{column_letter}{sheet_row_number}",
                                'values': [[str(value)]]
                            })
                            print(
                                f"      → {key}: {column_letter}{sheet_row_number} = {value}")  # 🔥 NEW: Debug each field

            print(f"   Total updates to make: {len(all_updates)}")

            # SINGLE API CALL for ALL students
            body = {
                'valueInputOption': 'USER_ENTERED',
                'data': all_updates
            }

            result = self.sheets_service.spreadsheets().values().batchUpdate(
                spreadsheetId=sheet_id,
                body=body
            ).execute()

            return {
                'success': True,
                'students_added': len(all_students),
                'total_updates': len(all_updates),
                'updated_cells': result.get('totalUpdatedCells', 0),
                'first_empty_row': first_empty_row,
                'starting_sheet_row': first_empty_row + 4
            }

        except Exception as e:
            import traceback
            print(f"❌ import_all_students_at_once error: {str(e)}")
            print(f"   Traceback: {traceback.format_exc()}")
            return {'success': False, 'error': str(e)}

    def _has_student_data(self, row: list, headers: list) -> bool:
        """
        Check if a row contains actual student data (has name information OR student ID).
        🔥 ENHANCED: Now includes Middle Name and Student ID detection
        """
        try:
            # Find name and ID column indices
            first_name_idx = None
            middle_name_idx = None  # 🔥 NEW
            last_name_idx = None
            student_id_idx = None

            for idx, header in enumerate(headers):
                header_upper = header.upper()
                if 'FIRST NAME' in header_upper or 'FIRSTNAME' in header_upper:
                    first_name_idx = idx
                elif 'MIDDLE NAME' in header_upper or 'MIDDLENAME' in header_upper:  # 🔥 NEW
                    middle_name_idx = idx
                elif 'LAST NAME' in header_upper or 'LASTNAME' in header_upper:
                    last_name_idx = idx
                elif 'STUDENT ID' in header_upper or 'STUDENTID' in header_upper or 'ID' in header_upper:
                    student_id_idx = idx

            # Check if this row has name data OR student ID
            has_name_data = False
            has_student_id = False

            # Check name data (any name field counts)
            if first_name_idx is not None:
                first_name = row[first_name_idx].strip() if first_name_idx < len(row) and row[first_name_idx] else ''
                if first_name:
                    has_name_data = True

            if middle_name_idx is not None:  # 🔥 NEW
                middle_name = row[middle_name_idx].strip() if middle_name_idx < len(row) and row[
                    middle_name_idx] else ''
                if middle_name:
                    has_name_data = True

            if last_name_idx is not None:
                last_name = row[last_name_idx].strip() if last_name_idx < len(row) and row[last_name_idx] else ''
                if last_name:
                    has_name_data = True

            # Check student ID data
            if student_id_idx is not None:
                student_id = row[student_id_idx].strip() if student_id_idx < len(row) and row[student_id_idx] else ''
                has_student_id = bool(student_id)

            # Return True if row has either name data OR student ID
            return has_name_data or has_student_id

        except Exception:
            return False

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

    def import_column_data_bulk(self, sheet_id: str, column_mappings: list, import_data: dict,
                                sheet_name: str = None) -> dict:
        """
        🔥 NEW: BULK import column data with custom mappings - MUCH FASTER!
        Instead of updating each cell individually, batch all updates into single API call.
        """
        try:
            results = {
                'success': True,
                'columnsRenamed': 0,
                'studentsUpdated': 0,
                'cellsUpdated': 0,
                'cellsSkipped': 0,
                'cellsMerged': 0,
                'conflictsResolved': 0,
                'exceedsMaxTotal': 0,
                'errors': [],
                'warnings': [],
                'actionSummary': {}
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

            # 🔥 NEW: Collect ALL updates for batch processing
            all_header_updates = []
            all_data_updates = []

            # Process each column mapping
            for mapping in column_mappings:
                import_column = mapping['importColumn']
                target_column = mapping['targetColumn']
                action = mapping.get('action', 'replace')

                if action == 'skip':
                    continue

                try:
                    # Find target column index and convert to A1 letter(s)
                    target_index = headers.index(target_column)
                    column_letter = self._column_index_to_a1(target_index)

                    # Step 1: Do NOT rename existing headers. Keep template column names intact.
                    # (Header renames are only performed when inserting brand-new columns elsewhere.)

                    # Step 2: Prepare data updates for this column
                    column_data = import_data.get('columnData', {}).get(import_column, {})

                    if not column_data:
                        results['errors'].append(f"No data found for column {import_column}")
                        continue

                    action_stats = {
                        'studentsProcessed': 0,
                        'cellsUpdated': 0,
                        'cellsSkipped': 0,
                        'conflictsResolved': 0,
                        'studentsNotFound': [],
                        'exceedsMax': 0
                    }

                    print(f"🔥 BATCH: Processing {len(column_data)} students for column {import_column}")

                    # Robust: read max score by scanning rows 3-5, fallback to parse header
                    max_score_value = None
                    try:
                        # scan rows 3 to 5
                        for row_idx in [3, 4, 5]:
                            max_cell_range = f"'{target_sheet_name}'!{column_letter}{row_idx}"
                            max_resp = self.sheets_service.spreadsheets().values().get(
                                spreadsheetId=sheet_id,
                                range=max_cell_range
                            ).execute()
                            values = max_resp.get('values', [])
                            if values and values[0]:
                                candidate = str(values[0][0]).strip()
                                try:
                                    max_score_value = float(candidate)
                                    break
                                except ValueError:
                                    continue
                        if max_score_value is None:
                            # try parse from header text e.g. "Quiz 2 (20)"
                            import re
                            m = re.search(r"\((\d+(?:\.\d+)?)\)", str(import_column))
                            if m:
                                max_score_value = float(m.group(1))
                    except Exception as e:
                        logger.warning(f"Max score fetch failed for {target_column}: {str(e)}")

                    for student_key, import_score in column_data.items():
                        # Find student row by matching names
                        student_row_index = self.find_student_row_by_name(student_key, table_data, headers)

                        if student_row_index is None:
                            action_stats['studentsNotFound'].append(student_key)
                            continue

                        action_stats['studentsProcessed'] += 1

                        # Get existing value for merge strategies
                        existing_value = None
                        if student_row_index < len(table_data) and target_index < len(table_data[student_row_index]):
                            existing_cell = table_data[student_row_index][target_index]
                            existing_value = str(existing_cell).strip() if existing_cell else None

                        # Apply merge strategy (same logic as before)
                        should_update = False
                        final_score = import_score
                        conflict_resolved = False

                        if action == 'replace':
                            should_update = True
                            final_score = import_score
                            if existing_value:
                                conflict_resolved = True

                        elif action == 'merge_skip':
                            if existing_value:
                                action_stats['cellsSkipped'] += 1
                                should_update = False
                            else:
                                should_update = True
                                final_score = import_score

                        elif action == 'merge_update':
                            if existing_value:
                                action_stats['cellsSkipped'] += 1
                                should_update = False
                            else:
                                should_update = True
                                final_score = import_score

                        elif action == 'merge_add':
                            if existing_value and existing_value.replace('.', '').replace('-', '').isdigit():
                                try:
                                    existing_num = float(existing_value)
                                    import_num = float(str(import_score))
                                    final_score = existing_num + import_num
                                    should_update = True
                                    conflict_resolved = True
                                except ValueError:
                                    should_update = False
                            else:
                                should_update = True
                                final_score = import_score

                        elif action == 'merge':
                            if existing_value:
                                action_stats['cellsSkipped'] += 1
                                should_update = False
                            else:
                                should_update = True
                                final_score = import_score

                        # 🔥 NEW: Instead of individual update, add to batch
                        if should_update:
                            # Guard: skip writes that exceed max score (if numeric max exists)
                            try:
                                if max_score_value is not None and str(final_score).strip() != '':
                                    fnum = float(str(final_score))
                                    if fnum > max_score_value:
                                        action_stats['exceedsMax'] += 1
                                        results['exceedsMaxTotal'] += 1
                                        results['warnings'].append(
                                            f"{import_column}: score {fnum} exceeds max {max_score_value} for student '{student_key}'"
                                        )
                                        should_update = False
                            except Exception:
                                pass

                        if should_update:
                            sheet_row = student_row_index + 4  # +3 for headers, +1 for 1-based
                            all_data_updates.append({
                                'range': f"'{target_sheet_name}'!{column_letter}{sheet_row}",
                                'values': [[str(final_score)]]
                            })
                            action_stats['cellsUpdated'] += 1
                            if conflict_resolved:
                                action_stats['conflictsResolved'] += 1

                    # Update results
                    results['studentsUpdated'] += action_stats['studentsProcessed']
                    results['cellsUpdated'] += action_stats['cellsUpdated']
                    results['cellsSkipped'] += action_stats['cellsSkipped']
                    results['conflictsResolved'] += action_stats['conflictsResolved']
                    results['actionSummary'][import_column] = action_stats

                    print(
                        f"🔥 BATCH: Column '{import_column}' prepared: {action_stats['cellsUpdated']} updates, {action_stats['cellsSkipped']} skipped")

                except ValueError:
                    results['errors'].append(f"Target column {target_column} not found in sheet")
                except Exception as e:
                    results['errors'].append(f"Error preparing {import_column}: {str(e)}")

            # 🔥 EXECUTE ALL UPDATES IN 2 BATCH CALLS (headers + data)
            total_updates = 0

            # Batch 1: Update all headers at once
            if all_header_updates:
                print(f"🔥 BATCH: Executing {len(all_header_updates)} header updates...")
                header_body = {
                    'valueInputOption': 'USER_ENTERED',
                    'data': all_header_updates
                }
                header_result = self.sheets_service.spreadsheets().values().batchUpdate(
                    spreadsheetId=sheet_id,
                    body=header_body
                ).execute()
                total_updates += header_result.get('totalUpdatedCells', 0)
                print(f"✅ BATCH: Headers updated: {header_result.get('totalUpdatedCells', 0)} cells")

            # Batch 2: Update all data at once
            if all_data_updates:
                print(f"🔥 BATCH: Executing {len(all_data_updates)} data updates...")
                data_body = {
                    'valueInputOption': 'USER_ENTERED',
                    'data': all_data_updates
                }
                data_result = self.sheets_service.spreadsheets().values().batchUpdate(
                    spreadsheetId=sheet_id,
                    body=data_body
                ).execute()
                total_updates += data_result.get('totalUpdatedCells', 0)
                print(f"✅ BATCH: Data updated: {data_result.get('totalUpdatedCells', 0)} cells")

            print(
                f"🔥 BATCH COMPLETE: Total {total_updates} cells updated in 2 API calls instead of {len(all_data_updates) + len(all_header_updates)} individual calls!")

            # Generate summary
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
                'summary': f"Bulk import completed: {summary} across {total_actions} columns",
                'performance': {
                    'total_updates': total_updates,
                    'api_calls_used': (1 if all_header_updates else 0) + (1 if all_data_updates else 0),
                    'api_calls_saved': len(all_data_updates) + len(all_header_updates) - 2
                }
            }

        except Exception as e:
            logger.error(f"Bulk import column data error: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': f'Failed to bulk import column data: {str(e)}'
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

    def get_category_structure_with_scores(self, sheet_id: str, sheet_name: str = None) -> dict:
        """
        Get the category structure with current perfect scores for the management modal.
        
        Returns:
            Dict containing categories with their subcategories and perfect scores
        """
        try:
            # Get sheet data to analyze structure
            if sheet_name:
                sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            else:
                sheet_data = self.get_sheet_data(sheet_id)

            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']  # Row 2 (column names)
            max_scores = sheet_data['max_scores'] if 'max_scores' in sheet_data else []
            target_sheet_name = sheet_data['sheet_name']

            # Parse categories and subcategories
            categories = {}
            
            # 🔥 ENHANCED: Define columns that should NOT have perfect scores
            student_info_columns = {
                'NO.', 'NO', 'NUMBER', 
                'LASTNAME', 'LAST NAME', 'SURNAME',
                'FIRSTNAME', 'FIRST NAME', 'GIVEN NAME',
                'MIDDLENAME', 'MIDDLE NAME', 'MIDDLE INITIAL',
                'STUDENT ID', 'STUDENTID', 'ID', 'STUDENT_ID',
                'EMAIL', 'PHONE', 'ADDRESS', 'SECTION', 'YEAR'
            }
            
            for index, header in enumerate(headers):
                if not header:
                    continue
                    
                header_upper = str(header).strip().upper()
                
                # 🔥 Skip student info columns
                if header_upper in student_info_columns:
                    continue
                
                # 🔥 Skip columns that contain "TOTAL" (calculated totals)
                if 'TOTAL' in header_upper:
                    continue
                    
                # Parse category and subcategory
                category, subcategory_index = self._parse_category_and_index(header)
                
                if category:
                    # 🔥 ENHANCED: Only include gradeable categories
                    # Skip non-gradeable categories like student info
                    if category in student_info_columns:
                        continue
                    
                    # 🔥 Skip categories that are clearly not gradeable
                    non_gradeable_categories = {
                        'STUDENT', 'INFO', 'INFORMATION', 'PERSONAL', 'CONTACT',
                        'TOTAL', 'SUMMARY', 'AVERAGE', 'PERCENT', 'PERCENTAGE'
                    }
                    
                    if category in non_gradeable_categories:
                        continue
                    
                    # Get perfect score for this column
                    perfect_score = 100  # Default
                    if index < len(max_scores) and max_scores[index]:
                        try:
                            perfect_score = int(float(max_scores[index]))
                        except (ValueError, TypeError):
                            perfect_score = 100

                    # Initialize category if not exists
                    if category not in categories:
                        categories[category] = {
                            'name': category,
                            'subcategories': {}
                        }

                    # Add subcategory
                    categories[category]['subcategories'][header] = {
                        'column_name': header,
                        'perfect_score': perfect_score,
                        'column_index': index
                    }

            # Convert to list format for easier frontend handling
            category_list = []
            for cat_name, cat_data in categories.items():
                subcategories = list(cat_data['subcategories'].values())
                
                # 🔥 ENHANCED: Only include categories that have actual subcategories
                # and are clearly gradeable (have valid perfect scores > 0)
                valid_subcategories = [
                    sub for sub in subcategories 
                    if sub['perfect_score'] > 0 and 
                       not any(keyword in sub['column_name'].upper() 
                              for keyword in ['TOTAL', 'SUM', 'AVERAGE', 'PERCENT'])
                ]
                
                if valid_subcategories:
                    category_list.append({
                        'name': cat_name,
                        'subcategories': valid_subcategories
                    })

            # 🔥 ENHANCED: Log what we found for debugging
            logger.info(f"Perfect Score Manager: Found {len(category_list)} valid categories")
            for cat in category_list:
                logger.info(f"  Category '{cat['name']}': {len(cat['subcategories'])} subcategories")

            return {
                'success': True,
                'categories': category_list,
                'sheet_name': target_sheet_name
            }

        except Exception as e:
            logger.error(f"Get category structure error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to get category structure: {str(e)}'
            }

    def update_category_perfect_scores(self, sheet_id: str, updates: list, sheet_name: str = None) -> dict:
        """
        Update perfect scores for multiple subcategories independently.
        
        Args:
            sheet_id: ID of the spreadsheet
            updates: List of {column_name, perfect_score} objects
            sheet_name: Optional specific sheet name
            
        Returns:
            Dict containing update results
        """
        try:
            results = {
                'success': True,
                'updated_columns': 0,
                'failed_columns': 0,
                'errors': [],
                'updated_cells': 0
            }

            # Update each column individually using existing method
            for update in updates:
                column_name = update.get('column_name')
                perfect_score = update.get('perfect_score')
                
                if not column_name or perfect_score is None:
                    results['failed_columns'] += 1
                    results['errors'].append(f"Invalid update data: {update}")
                    continue

                try:
                    result = self.update_max_score_in_sheet(sheet_id, column_name, str(perfect_score), sheet_name)
                    
                    if result['success']:
                        results['updated_columns'] += 1
                        results['updated_cells'] += result.get('updated_cells', 0)
                        logger.info(f"✅ Updated {column_name} perfect score to {perfect_score}")
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

            summary = f"Updated {results['updated_columns']} subcategories"
            if results['failed_columns'] > 0:
                summary += f", {results['failed_columns']} failed"

            return {
                'success': results['success'],
                'results': results,
                'summary': summary
            }

        except Exception as e:
            logger.error(f"Update category perfect scores error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to update category perfect scores: {str(e)}'
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
        Updated with formula protection and fresh data handling.
        """
        try:
            import time

            # 🔥 CRITICAL: Add small delay to ensure Google Sheets propagation
            time.sleep(0.5)

            # Get FRESH sheet data (force refresh)
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

            # 🔥 DEBUG: Print all current students for debugging
            print("🗑️ DEBUG: Current students in sheet:")
            for idx, row in enumerate(current_data):
                if len(row) >= 3:
                    first_name = str(row[2]).strip() if len(row) > 2 and row[2] else ''
                    last_name = str(row[1]).strip() if len(row) > 1 and row[1] else ''
                    if first_name or last_name:
                        print(f"   Row {idx + 4}: {first_name} {last_name}")

            # Find student row with EXACT matching
            student_row_index = None
            student_info = {}

            for row_index, row in enumerate(current_data):
                if search_type == 'name':
                    # Search by name (first name + last name)
                    if len(row) >= 3:
                        first_name = str(row[2]).strip() if len(row) > 2 and row[2] else ''
                        last_name = str(row[1]).strip() if len(row) > 1 and row[1] else ''
                        full_name = f"{first_name} {last_name}".strip()

                        # 🔥 ENHANCED: More precise matching
                        name_matches = [
                            student_identifier.lower() in full_name.lower(),
                            full_name.lower() in student_identifier.lower(),
                            student_identifier.lower() == first_name.lower(),
                            student_identifier.lower() == last_name.lower(),
                            # 🔥 NEW: Try individual word matching
                            any(word.lower() == student_identifier.lower() for word in full_name.split()),
                            # 🔥 NEW: Try partial last name match
                            student_identifier.lower() in last_name.lower(),
                            student_identifier.lower() in first_name.lower()
                        ]

                        if any(name_matches):
                            student_row_index = row_index
                            student_info = {
                                'first_name': first_name,
                                'last_name': last_name,
                                'full_name': full_name,
                                'student_id': str(row[3]).strip() if len(row) > 3 and row[3] else 'N/A'
                            }
                            print(f"🗑️ FOUND MATCH: '{student_identifier}' -> '{full_name}' at row {row_index}")
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
                    'search_type': search_type,
                    'available_students': [
                        f"{str(row[2]).strip() if len(row) > 2 and row[2] else ''} {str(row[1]).strip() if len(row) > 1 and row[1] else ''}".strip()
                        for row in current_data if len(row) >= 3 and (str(row[2]).strip() or str(row[1]).strip())
                    ]
                }

            # Calculate actual sheet row (add 4 for header rows and 1-based indexing)
            sheet_row = student_row_index + 4

            print(f"🗑️ DELETE STUDENT: Found student at row index {student_row_index} (sheet row {sheet_row})")
            print(f"🗑️ DELETE STUDENT: Student info: {student_info}")

            # 🔥 FORMULA PROTECTION: Update only specific columns to avoid formula columns
            updates = []

            for col_index, header in enumerate(headers):
                # Convert column index to proper Excel column letter using existing helper
                column_letter = self._column_index_to_a1(col_index)

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

            # 🔥 CRITICAL: Add delay before compacting
            time.sleep(1.0)

            # 🔥 COMPACT STUDENT DATA
            compact_result = self.compact_student_data(sheet_id, target_sheet_name)
            if not compact_result['success']:
                print(f"⚠️ Warning: Failed to compact students: {compact_result.get('error')}")

            # 🔥 CRITICAL: Add final delay for data propagation
            time.sleep(0.5)

            logger.info(f"Successfully deleted student {student_info['full_name']} from {target_sheet_name}")

            return {
                'success': True,
                'deleted_student': student_info,
                'row_cleared': sheet_row,
                'sheet_name': target_sheet_name,
                'compacted': compact_result.get('success', False),
                'compacted_count': compact_result.get('compacted_count', 0),
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

    def compact_student_data(self, sheet_id: str, sheet_name: str) -> dict:
        """
        Compact student data by removing gaps and moving students up to fill empty rows.
        Preserves formulas in Total columns.
        """
        try:
            print(f"🔄 COMPACT: Starting compaction for sheet '{sheet_name}'")

            # Get current sheet data
            sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            if not sheet_data['success']:
                return sheet_data

            headers = sheet_data['headers']
            current_data = sheet_data['tableData']

            # 🔍 Find all students with actual data
            students_with_data = []

            for row_index, row in enumerate(current_data):
                # Check if row has student data
                has_student_data = False
                if len(row) >= 3:
                    first_name = str(row[2]).strip() if len(row) > 2 and row[2] else ''
                    last_name = str(row[1]).strip() if len(row) > 1 and row[1] else ''

                    if first_name or last_name:
                        has_student_data = True
                        # Store the complete row data
                        complete_row = row[:] + [''] * (len(headers) - len(row))  # Pad to match header length
                        students_with_data.append({
                            'original_index': row_index,
                            'data': complete_row[:len(headers)]  # Ensure it matches header length
                        })

            print(f"🔄 COMPACT: Found {len(students_with_data)} students with data")

            if len(students_with_data) == 0:
                return {
                    'success': True,
                    'message': 'No students to compact',
                    'compacted_count': 0
                }

            # 🔄 Create batch updates to compact the data
            updates = []

            # 🔥 Step 1: Clear all existing student rows (but keep formulas)
            total_rows_to_clear = len(current_data)
            for row_index in range(total_rows_to_clear):
                sheet_row = row_index + 4  # +3 for headers, +1 for 1-based indexing

                # Clear only data columns (not formula columns)
                for col_index, header in enumerate(headers):
                    # Convert column index to proper Excel column letter using existing helper
                    column_letter = self._column_index_to_a1(col_index)

                    # 🔥 SKIP formula columns
                    header_name = header.upper()
                    formula_keywords = ['TOTAL', 'SUM', 'AVERAGE', 'AVG', 'FORMULA']
                    is_formula_column = any(keyword in header_name for keyword in formula_keywords)

                    if not is_formula_column:
                        updates.append({
                            'range': f"'{sheet_name}'!{column_letter}{sheet_row}",
                            'values': [['']]
                        })

            # 🔥 Step 2: Place students in consecutive rows starting from row 4
            for new_index, student in enumerate(students_with_data):
                student_number = new_index + 1
                new_sheet_row = new_index + 4  # Start from row 4 (after 3 header rows)

                # Update each column for this student
                for col_index, header in enumerate(headers):
                    # Convert column index to proper Excel column letter using existing helper
                    column_letter = self._column_index_to_a1(col_index)

                    # 🔥 SKIP formula columns
                    header_name = header.upper()
                    formula_keywords = ['TOTAL', 'SUM', 'AVERAGE', 'AVG', 'FORMULA']
                    is_formula_column = any(keyword in header_name for keyword in formula_keywords)

                    if not is_formula_column:
                        if col_index == 0:  # NO. column
                            value = str(student_number)
                        else:
                            # Get the original data, handling missing columns
                            original_data = student['data']
                            if col_index < len(original_data):
                                value = str(original_data[col_index]) if original_data[col_index] else ''
                            else:
                                value = ''

                        updates.append({
                            'range': f"'{sheet_name}'!{column_letter}{new_sheet_row}",
                            'values': [[value]]
                        })

            print(f"🔄 COMPACT: Prepared {len(updates)} updates")

            # 🔥 Execute all updates in batches (Google Sheets has limits)
            batch_size = 100  # Process in smaller batches
            total_updated = 0

            for i in range(0, len(updates), batch_size):
                batch_updates = updates[i:i + batch_size]

                body = {
                    'valueInputOption': 'USER_ENTERED',
                    'data': batch_updates
                }

                result = self.sheets_service.spreadsheets().values().batchUpdate(
                    spreadsheetId=sheet_id,
                    body=body
                ).execute()

                batch_updated = result.get('totalUpdatedCells', 0)
                total_updated += batch_updated
                print(f"🔄 COMPACT: Batch {i // batch_size + 1} - Updated {batch_updated} cells")

            print(f"🔄 COMPACT: Successfully compacted {len(students_with_data)} students")
            print(f"🔄 COMPACT: Total cells updated: {total_updated}")

            return {
                'success': True,
                'compacted_count': len(students_with_data),
                'total_updated_cells': total_updated,
                'message': f'Successfully compacted {len(students_with_data)} students'
            }

        except Exception as e:
            logger.error(f"Error compacting student data: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': f'Failed to compact student data: {str(e)}'
            }

    def analyze_category_structure(self, sheet_id: str, category_name: str, sheet_name: str = None) -> dict:
        """
        Analyze an existing category to understand its complete structure
        """
        try:
            # Get sheet data
            if sheet_name:
                sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            else:
                sheet_data = self.get_sheet_data(sheet_id)
            
            if not sheet_data['success']:
                return {'success': False, 'error': 'Failed to get sheet data'}
            
            headers = sheet_data['headers']
            main_headers = sheet_data.get('main_headers', [])
            sub_headers = sheet_data.get('sub_headers', [])
            
            # Find category in main headers
            category_index = None
            for i, header in enumerate(main_headers):
                if header and str(header).strip().upper() == category_name.upper():
                    category_index = i
                    break
            
            if category_index is None:
                return {'success': False, 'error': f'Category "{category_name}" not found'}
            
            # Find the range of this category
            start_col = category_index
            end_col = start_col
            
            # Find where this category ends (next category or end of headers)
            for i in range(category_index + 1, len(main_headers)):
                if main_headers[i] and str(main_headers[i]).strip().upper() not in ['', category_name.upper()]:
                    end_col = i - 1
                    break
                elif i == len(main_headers) - 1:
                    end_col = len(main_headers) - 1
                    break
            
            # Extract subcategories
            subcategories = []
            for i in range(start_col, end_col + 1):
                if i < len(sub_headers) and sub_headers[i]:
                    subcategories.append(str(sub_headers[i]).strip())
            
            # Find Total column (usually after subcategories)
            total_col_index = end_col + 1
            if total_col_index < len(sub_headers) and 'total' in str(sub_headers[total_col_index]).lower():
                total_col = total_col_index
            else:
                total_col = None
            
            # Find Percentage column (usually after Total)
            percentage_col_index = total_col_index + 1 if total_col else end_col + 1
            percentage_col = percentage_col_index if percentage_col_index < len(headers) else None
            
            return {
                'success': True,
                'category_name': category_name,
                'start_col': start_col,
                'end_col': end_col,
                'total_col': total_col,
                'percentage_col': percentage_col,
                'subcategories': subcategories,
                'subcategory_count': len(subcategories),
                'structure': {
                    'has_total': total_col is not None,
                    'has_percentage': percentage_col is not None,
                    'column_count': end_col - start_col + 1,
                    'total_columns': (end_col - start_col + 1) + (1 if total_col else 0) + (1 if percentage_col else 0)
                }
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def find_best_category_to_copy(self, sheet_id: str, sheet_name: str = None) -> dict:
        """
        Find the CONSISTENT template category to use for ALL new categories
        This ensures all new categories have the same styling
        """
        try:
            # Get sheet data
            if sheet_name:
                sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            else:
                sheet_data = self.get_sheet_data(sheet_id)

            if not sheet_data['success']:
                return {'success': False, 'error': 'Failed to get sheet data'}
            
            main_headers = sheet_data.get('main_headers', [])
            
            # 🔥 FIXED: Always use the FIRST assessment category as template for consistency
            # Priority order for template categories (use first one found)
            template_priorities = [
                'LAB', 'LABORATORY', 'LABS',
                'QUIZ', 'QUIZZES', 'QUIZES', 
                'ASSIGNMENT', 'ASSIGNMENTS', 'SEATWORK',
                'TEST', 'TESTS',
                'PROJECT', 'PROJECTS',
                'EXAM', 'EXAMS'
            ]
            
            # Find the FIRST suitable template category (for consistency)
            template_category = None
            
            for i, header in enumerate(main_headers):
                if header:
                    header_upper = str(header).strip().upper()
                    
                    # Check if this is a template-worthy category
                    for template_name in template_priorities:
                        if template_name in header_upper:
                            template_category = str(header).strip()
                            print(f"🔥 TEMPLATE: Using '{template_category}' as consistent template for all new categories")
                            break
                    
                    if template_category:
                        break
            
            if template_category:
                # Analyze the template category structure
                analysis = self.analyze_category_structure(sheet_id, template_category, sheet_name)
                if analysis['success']:
                    return {
                        'success': True,
                        'template_category': template_category,
                        'structure': analysis,
                        'is_consistent_template': True
                    }
            
            return {'success': False, 'error': 'No suitable template category found'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def copy_category_layout(self, sheet_id: str, target_category_name: str, sub_categories: list,
                           percentage: str = "10.00%", sheet_name: str = None) -> dict:
        """
        Copy an existing category's layout and modify it for new category
        """
        try:
            print(f"🔥 COPY_CATEGORY: Starting to copy layout for '{target_category_name}' with {len(sub_categories)} subcategories")
            
            # Find best template category
            template_result = self.find_best_category_to_copy(sheet_id, sheet_name)
            if not template_result['success']:
                return template_result
            
            template_category = template_result['template_category']
            template_structure = template_result['structure']
            
            print(f"🔥 COPY_CATEGORY: Using '{template_category}' as CONSISTENT template for all new categories")
            print(f"🔥 COPY_CATEGORY: This ensures '{target_category_name}' will have identical styling to '{template_category}'")
            
            # Find insertion position (before Class Standing columns)
            insertion_position = self._find_insertion_position(sheet_id, sheet_name)
            print(f"🔥 COPY_CATEGORY: Will insert at position {insertion_position}")
            
            # Calculate number of columns needed (subcategories + Total only, percentage goes in Total column)
            num_subcategories = len(sub_categories)
            num_total_columns = num_subcategories + 1  # + Total (percentage goes in same column)
            
            # Insert new columns
            insert_result = self._insert_columns(sheet_id, sheet_name, insertion_position, num_total_columns)
            if not insert_result['success']:
                return insert_result

            print(f"✅ COPY_CATEGORY: Successfully inserted {num_total_columns} columns")
            
            # Copy and modify the layout
            copy_result = self._copy_modify_category_layout(
                sheet_id, template_structure, target_category_name, sub_categories, 
                percentage, insertion_position, sheet_name
            )
            
            if not copy_result['success']:
                return copy_result
            
            # 🔥 PHASE 2: Calculate column indices for formula reference
            # Category name is in Row 2 at insert_position
            category_column_index = insertion_position
            # Percentage is in Row 2 at insert_position + num_subcategories (Total column)
            total_column_index = insertion_position + num_subcategories
            
            return {
                'success': True,
                'category_name': target_category_name,
                'sub_categories': sub_categories,
                'percentage': percentage,
                'columns_added': num_total_columns,
                'insert_position': insertion_position,
                'template_used': template_category,
                'category_column_index': category_column_index,  # 🔥 PHASE 2: Column where category name starts (Row 2)
                'total_column_index': total_column_index,  # 🔥 PHASE 2: Total column where percentage is (Row 2)
                'num_sub_columns': num_subcategories,  # 🔥 PHASE 2: Number of sub-columns (for verification)
                'message': f"Successfully copied '{template_category}' layout for '{target_category_name}'"
            }
            
        except Exception as e:
            return {'success': False, 'error': f'Failed to copy category layout: {str(e)}'}
    
    def _find_insertion_position(self, sheet_id: str, sheet_name: str = None) -> int:
        """
        Find the best position to insert new categories (after the last category's Total column, before Class Standing)
        """
        try:
            # Get sheet data
            if sheet_name:
                sheet_data = self.get_specific_sheet_data(sheet_id, sheet_name)
            else:
                sheet_data = self.get_sheet_data(sheet_id)
            
            if not sheet_data['success']:
                return 5  # Fallback position
            
            # 🔥 FIXED: Use Row 2 headers (sub_headers) which contains category names and percentage values
            # Row 1 = Internal IDs (hidden), Row 2 = Category names and percentages (like "30.00%")
            headers = sheet_data.get('sub_headers', sheet_data.get('headers', []))
            if not headers:
                headers = sheet_data.get('headers', [])
            
            print(f"🔥 INSERTION: Using headers from Row 2 (category names/percentages): {headers[:30]}...")  # Print first 30 for debugging
            
            insert_position = len(headers)  # Default to end
            
            # 🔥 FIXED: Find Class Standing column first, then find last percentage column BEFORE it
            # Row 2 contains: category names, subcategory names, percentage values (like "30.00%"), then "Class Standing"
            # Insert AFTER the last percentage column, BEFORE Class Standing
            class_standing_keywords = ['CLASS STANDING', 'CLASS', 'FINAL GRADE', 'TERM GRADE', 'FINAL SCORE']
            class_standing_index = -1
            
            # Step 1: Find Class Standing column (scan from end to beginning)
            print(f"🔥 INSERTION: Scanning {len(headers)} headers for Class Standing...")
            for i in range(len(headers) - 1, -1, -1):
                header = headers[i]
                if header:
                    header_upper = str(header).upper().strip()
                    # Check for Class Standing keywords (but exclude "TOTAL SCORE" which might contain "SCORE")
                    if any(keyword in header_upper for keyword in class_standing_keywords):
                        # Make sure it's not "TOTAL SCORE" - that's not Class Standing
                        if 'TOTAL SCORE' not in header_upper:
                            class_standing_index = i
                            print(f"🔥 INSERTION: ✅ Found Class Standing column '{header}' at index {i}")
                            break
            
            # Step 2: If Class Standing found, find the last percentage column BEFORE it
            # Row 2 might have percentage values like "30.00%" or the word "Total"
            if class_standing_index != -1:
                print(f"🔥 INSERTION: Looking for last percentage column before Class Standing (searching indices {class_standing_index - 1} down to 0)")
                # Search backwards from Class Standing to find the last percentage column
                for i in range(class_standing_index - 1, -1, -1):
                    header = headers[i]
                    if header:
                        header_str = str(header).strip()
                        header_upper = header_str.upper()
                        print(f"🔥 INSERTION: Checking index {i}: '{header_str}' (upper: '{header_upper}')")
                        
                        # Look for percentage value (contains "%") OR the word "TOTAL" (but NOT "TOTAL SCORE")
                        is_percentage = '%' in header_str
                        is_total = header_upper == 'TOTAL' and 'TOTAL SCORE' not in header_upper
                        
                        if is_percentage or is_total:
                            insert_position = i + 1  # Insert AFTER the percentage/Total column, BEFORE Class Standing
                            print(f"🔥 INSERTION: ✅ Found last percentage column '{header_str}' at index {i}, will insert at {insert_position} (after percentage, before Class Standing)")
                            break
                
                # If no percentage found before Class Standing, insert at Class Standing position (will push it right)
                if insert_position == len(headers):
                    insert_position = class_standing_index
                    print(f"🔥 INSERTION: ⚠️ No percentage column found before Class Standing, will insert at {insert_position} (will push Class Standing right)")
            else:
                # No Class Standing found, look for the last percentage column
                print("🔥 INSERTION: ⚠️ No Class Standing found, looking for last percentage column")
                for i in range(len(headers) - 1, -1, -1):
                    header = headers[i]
                    if header:
                        header_str = str(header).strip()
                        header_upper = header_str.upper()
                        # Look for percentage value (contains "%") OR the word "TOTAL" (but NOT "TOTAL SCORE")
                        is_percentage = '%' in header_str
                        is_total = header_upper == 'TOTAL' and 'TOTAL SCORE' not in header_upper
                        
                        if is_percentage or is_total:
                            insert_position = i + 1  # Insert AFTER the percentage/Total column
                            print(f"🔥 INSERTION: ✅ Found last percentage column '{header_str}' at index {i}, will insert at {insert_position}")
                            break
            
            # If still no good position found, look for any calculation columns
            if insert_position == len(headers):
                print("🔥 INSERTION: No TOTAL found, looking for any calculation columns")
                calculation_keywords = ['GRADE', 'PERCENTAGE', 'PERCENT', 'FINAL']
                
                for i in range(len(headers) - 1, -1, -1):
                    header = headers[i]
                    if header:
                        header_upper = str(header).upper().strip()
                        if any(keyword in header_upper for keyword in calculation_keywords):
                            insert_position = i
                            print(f"🔥 INSERTION: Found calculation column '{header}' at index {i}")
                            break
            
            # If still no good position, look for the last assessment column
            if insert_position == len(headers):
                print("🔥 INSERTION: No calculation columns found, looking for last assessment column")
                for i in range(len(headers) - 1, -1, -1):
                    header = headers[i]
                    if header:
                        header_upper = str(header).upper().strip()
                        # Skip student info columns and empty columns
                        if not any(keyword in header_upper for keyword in ['NO', 'LASTNAME', 'FIRSTNAME', 'STUDENT ID', 'MIDDLE NAME']) and header_upper.strip():
                            insert_position = i + 1
                            print(f"🔥 INSERTION: Found last assessment column '{header}' at index {i}, will insert at {insert_position}")
                            break
            
            # Fallback
            if insert_position == len(headers):
                insert_position = max(5, len(headers))  # At least after student info
                print(f"🔥 INSERTION: Fallback - will insert at {insert_position}")
            
            print(f"🔥 INSERTION: Final insertion position: {insert_position}")
            return insert_position
            
        except Exception as e:
            print(f"🔥 INSERTION: Error finding insertion position: {str(e)}")
            return 5  # Safe fallback
    
    def _copy_modify_category_layout(self, sheet_id: str, template_structure: dict, target_category_name: str, 
                                   sub_categories: list, percentage: str, insert_position: int, sheet_name: str = None) -> dict:
        """
        Copy the template category layout and modify it for the new category
        """
        try:
            print(f"🔥 COPY_MODIFY: Copying template structure for '{target_category_name}'")
            
            # Get sheet data to find target sheet name
            if sheet_name:
                target_sheet_name = sheet_name
            else:
                sheet_data = self.get_sheet_data(sheet_id)
                if not sheet_data['success']:
                    return {'success': False, 'error': 'Failed to get sheet data'}
                target_sheet_name = sheet_data['sheet_name']
            
            num_subcategories = len(sub_categories)
            num_total_columns = num_subcategories + 1  # + Total (percentage goes in same column)
            
            # Calculate column letters
            start_col_letter = self._column_index_to_a1(insert_position)
            category_end_col_index = insert_position + num_subcategories - 1
            category_end_col = self._column_index_to_a1(category_end_col_index)
            total_col_letter = self._column_index_to_a1(insert_position + num_subcategories)
            
            print(f"🔥 COPY_MODIFY: Category spans {start_col_letter} to {category_end_col}, Total in {total_col_letter}")
            print(f"🔥 COPY_MODIFY: Layout - Row 1: Internal IDs (hidden, not used)")
            print(f"🔥 COPY_MODIFY: Layout - Row 2: Category header spans {start_col_letter}2:{category_end_col}2, Percentage in {total_col_letter}2")
            print(f"🔥 COPY_MODIFY: Layout - Row 3: Subcategory headers + 'Total' in {total_col_letter}3")
            print(f"🔥 COPY_MODIFY: Layout - Row 4: Max scores + total max score in {total_col_letter}4")
            
            # Step 1: Add percentage to Total column (Row 2) - same column as Total
            # 🔥 FIX: Remove quotes and any trailing apostrophes - percentage should be written as value
            # Clean percentage: remove any quotes or apostrophes that might be in the string
            clean_percentage = str(percentage).strip().rstrip("'").rstrip('"').rstrip("'")
            percentage_result = self._update_cell_range(
                sheet_id,
                target_sheet_name,
                f"{total_col_letter}2",
                [[clean_percentage]]  # No quotes - write as value directly
            )

            if not percentage_result['success']:
                return percentage_result

            # Step 2: Add category header (Row 2) - spans ONLY across subcategories (NOT Total column)
            category_header_range = f"{start_col_letter}2:{category_end_col}2"
            category_header_result = self._update_cell_range(
                sheet_id,
                target_sheet_name,
                category_header_range,
                [[target_category_name]]
            )
            
            if not category_header_result['success']:
                return category_header_result
            
            # Step 3: Merge the category header cells (ONLY subcategories, NOT Total)
            merge_result = self._merge_cells(
                sheet_id,
                target_sheet_name,
                start_row=1,  # Row 2 (0-based = 1)
                end_row=1,    # Row 2 (0-based = 1)
                start_col=insert_position,
                end_col=category_end_col_index
            )

            if not merge_result['success']:
                print(f"⚠️ COPY_MODIFY: Failed to merge header cells: {merge_result.get('error')}")

            # Step 4: Add individual column headers (Row 3)
            subcategory_headers = sub_categories + ["Total"]  # Only subcategories + Total
            subcategory_range = f"{start_col_letter}3:{total_col_letter}3"

            headers_result = self._update_cell_range(
                sheet_id,
                target_sheet_name,
                subcategory_range,
                [subcategory_headers]
            )

            if not headers_result['success']:
                return headers_result

            # Step 5: Add max scores (Row 4)
            individual_max_scores = ['100'] * num_subcategories
            total_max_score = str(100 * num_subcategories)
            all_max_scores = individual_max_scores + [total_max_score]
            max_scores_range = f"{start_col_letter}4:{total_col_letter}4"

            max_scores_result = self._update_cell_range(
                sheet_id,
                target_sheet_name,
                max_scores_range,
                [all_max_scores]
            )

            if not max_scores_result['success']:
                return max_scores_result

            # Step 6: Add SUM formulas to Total column
            formula_result = self._add_total_formulas(
                sheet_id,
                target_sheet_name,
                insert_position,
                num_subcategories
            )

            if not formula_result['success']:
                print(f"⚠️ COPY_MODIFY: Failed to add formulas: {formula_result.get('error')}")

            # Step 7: Apply formatting (copy from template exactly)
            format_result = self._copy_template_formatting(
                sheet_id,
                target_sheet_name,
                template_structure,
                insert_position,
                num_subcategories,
                target_category_name
            )

            if not format_result['success']:
                print(f"⚠️ COPY_MODIFY: Failed to apply formatting: {format_result.get('error')}")

            print(f"✅ COPY_MODIFY: Successfully created '{target_category_name}' with {num_subcategories} subcategories")

            return {
                'success': True,
                'category_name': target_category_name,
                'sub_categories': sub_categories,
                'percentage': percentage,
                'columns_added': num_total_columns,
                'insert_position': insert_position
            }
            
        except Exception as e:
            return {'success': False, 'error': f'Failed to copy-modify layout: {str(e)}'}
    
    def _copy_template_formatting(self, sheet_id: str, sheet_name: str, template_structure: dict, 
                                 insert_position: int, num_subcategories: int, target_category_name: str) -> dict:
        """
        Copy the EXACT formatting from the existing Quizzes category
        """
        try:
            print(f"🔥 COPY_FORMATTING: Copying EXACT formatting from Quizzes category for '{target_category_name}'")
            
            # Get sheet properties
            spreadsheet = self.sheets_service.spreadsheets().get(spreadsheetId=sheet_id).execute()
            target_sheet_id = None

            for sheet in spreadsheet['sheets']:
                if sheet['properties']['title'] == sheet_name:
                    target_sheet_id = sheet['properties']['sheetId']
                    break

            if target_sheet_id is None:
                return {'success': False, 'error': f'Sheet "{sheet_name}" not found'}

            # 🔥 FIXED: Copy EXACT columns F-J from Quizzes category (Quiz columns only, not Total)
            # Columns F-J = columns 5-9 (0-based indexing: F=5, G=6, H=7, I=8, J=9)
            quizzes_start_col = 5  # Column F
            quizzes_end_col = 9    # Column J (inclusive), NOT K
            
            print(f"🔥 COPY_FORMATTING: Copying EXACT columns F-J (columns {quizzes_start_col} to {quizzes_end_col}) from Quizzes category")
            
            # 🔥 FIXED: Read from Row 1 to get all formatting, then map correctly
            # Template structure might be: Row 1 = Category header, Row 2 = Subcategory headers, Row 3 = Max scores
            # New structure: Row 1 = Internal IDs, Row 2 = Category header, Row 3 = Subcategory headers, Row 4 = Max scores
            # We'll read from Row 1 and map: Template Row 1 → New Row 2, Template Row 2 → New Row 3, etc.
            quizzes_range = f"F1:J200"  # Read from Row 1 to get all formatting
            print(f"🔥 COPY_FORMATTING: Reading formatting from EXACT range {quizzes_range}")
            
            try:
                # 🔥 INVESTIGATE DEEPER: Try multiple approaches to get formatting
                print(f"🔥 COPY_FORMATTING: Attempting to read formatting from {quizzes_range}")
                
                # Method 1: Try with includeGridData (without valueRenderOption)
                format_request = {
                    'ranges': [f"{sheet_name}!{quizzes_range}"],
                    'includeGridData': True
                }
                
                format_response = self.sheets_service.spreadsheets().get(
                    spreadsheetId=sheet_id,
                    **format_request
                ).execute()
                
                print(f"🔥 COPY_FORMATTING: API Response keys: {list(format_response.keys())}")
                if 'sheets' in format_response:
                    print(f"🔥 COPY_FORMATTING: Sheets found: {len(format_response['sheets'])}")
                    if len(format_response['sheets']) > 0:
                        sheet_data = format_response['sheets'][0]
                        print(f"🔥 COPY_FORMATTING: Sheet data keys: {list(sheet_data.keys())}")
                        if 'data' in sheet_data:
                            print(f"🔥 COPY_FORMATTING: Data found: {len(sheet_data['data'])} ranges")
                
                if 'sheets' in format_response and len(format_response['sheets']) > 0:
                    format_data = format_response['sheets'][0]['data'][0]
                    format_rows = format_data.get('rowData', [])
                    
                    print(f"🔥 COPY_FORMATTING: Successfully read formatting data from Quizzes category")
                    
                    # Debug: Print what formatting we found
                    print(f"🔥 COPY_FORMATTING: Found {len(format_rows)} rows of formatting data")
                    for row_idx, format_row in enumerate(format_rows):
                        if 'values' in format_row:
                            print(f"🔥 COPY_FORMATTING: Row {row_idx + 1}: {len(format_row['values'])} cells")
                            for col_idx, cell in enumerate(format_row['values']):
                                if 'effectiveFormat' in cell:
                                    bg_color = cell['effectiveFormat'].get('backgroundColor', {})
                                    print(f"🔥 COPY_FORMATTING: Cell {row_idx + 1},{col_idx + 1}: background = {bg_color}")
                    
                    # Copy the exact formatting to new category
                    requests = []
                    new_total_col = insert_position + num_subcategories
                    
                    # Copy formatting row by row from Quizzes columns F-J
                    # 🔥 FIXED ROW MAPPING: We read from F1:J200, so:
                    # format_rows[0] = Template Row 1 (category header) → New Row 2 (idx 1) - SHIFT +1
                    # format_rows[1] = Template Row 2 (subcategory headers) → New Row 3 (idx 2) - SHIFT +1
                    # format_rows[2] = Template Row 3 (max scores) → New Row 4 (idx 3) - SHIFT +1
                    # format_rows[3+] = Template Row 4+ (data) → New Row 5+ (idx 4+) - SHIFT +1
                    # 🔥 CRITICAL FIX: Only format header rows (0-2) which map to New Rows 2-4. 
                    # Row 5+ should have data row formatting (peach/orange), NOT blue header formatting!
                    # Stop at row_idx == 2 to prevent unnecessary blue row in Row 5
                    for row_idx in range(min(3, len(format_rows))):  # ONLY rows 0-2 (category header, subcategory headers, max scores)
                        format_row = format_rows[row_idx]
                        if 'values' in format_row:
                            format_cells = format_row['values']
                            
                            # 🔥 ROW MAPPING: Shift template row to new category row
                            # format_rows[0] (Template Row 1) → New Row 2 (idx 1) - category header (skip, format explicitly)
                            # format_rows[1] (Template Row 2) → New Row 3 (idx 2) - subcategory headers (CRITICAL - fix white background!)
                            # format_rows[2] (Template Row 3) → New Row 4 (idx 3) - max scores
                            # format_rows[3+] (Template Row 4+) → New Row 5+ (idx 4+) - data rows (STOP HERE - don't copy formatting!)
                            target_row_idx = row_idx + 1  # Shift down by 1 row
                            
                            # 🔥 FIX: Skip Row 0 (category header) - format it explicitly later to avoid extra rows
                            if row_idx == 0:
                                continue
                            
                            # 🔥 CRITICAL: Stop after Row 2 (max scores). Row 3+ should NOT get blue formatting!
                            # This prevents the unnecessary blue row in Row 5
                            if row_idx > 2:
                                break  # Stop copying formatting - Row 5+ should have data row formatting (peach/orange)
                            
                            # 🔥 COPY EXACT FORMATTING FROM QUIZZES F-K:
                            # F, G, H, I, J = subcategory columns (columns 0,1,2,3,4 in format_cells)
                            # K = Total column (column 5 in format_cells)
                            
                            # Copy formatting for subcategory columns (F, G, H, I, J)
                            for col_idx in range(min(num_subcategories, 5)):  # Max 5 subcategories like Quizzes
                                if col_idx < len(format_cells) and 'effectiveFormat' in format_cells[col_idx]:
                                    quizzes_format = format_cells[col_idx]['effectiveFormat']
                                    
                                    requests.append({
                                        'repeatCell': {
                                            'range': {
                                                'sheetId': target_sheet_id,
                                                'startRowIndex': target_row_idx,  # Use shifted row index
                                                'endRowIndex': target_row_idx + 1,
                                                'startColumnIndex': insert_position + col_idx,
                                                'endColumnIndex': insert_position + col_idx + 1
                                            },
                                            'cell': {
                                                'userEnteredFormat': quizzes_format
                                            },
                                            'fields': 'userEnteredFormat'
                                        }
                                    })
                            
                            # Copy formatting for Total column (K = column 5 in format_cells)
                            if len(format_cells) > 5 and 'effectiveFormat' in format_cells[5]:
                                quizzes_total_format = format_cells[5]['effectiveFormat']
                                
                                requests.append({
                                    'repeatCell': {
                                        'range': {
                                            'sheetId': target_sheet_id,
                                            'startRowIndex': target_row_idx,  # Use shifted row index
                                            'endRowIndex': target_row_idx + 1,
                                            'startColumnIndex': new_total_col,
                                            'endColumnIndex': new_total_col + 1
                                        },
                                        'cell': {
                                            'userEnteredFormat': quizzes_total_format
                                        },
                                        'fields': 'userEnteredFormat'
                                    }
                                })
                    
                    # Execute formatting requests
                    if requests:
                        batch_update_request = {'requests': requests}
                        self.sheets_service.spreadsheets().batchUpdate(
                            spreadsheetId=sheet_id,
                            body=batch_update_request
                        ).execute()
                        
                        print(f"✅ COPY_FORMATTING: Applied {len(requests)} formatting requests")
                        print(f"✅ COPY_FORMATTING: '{target_category_name}' now has EXACT formatting from Quizzes category")
                        
                        # 🔥 FIX: Ensure sub-column headers (Row 3) have correct formatting (light blue background, bold, correct font size)
                        # This fixes the white background and font size issues
                        print(f"🔥 COPY_FORMATTING: Applying explicit formatting to sub-column headers (Row 3) for '{target_category_name}'")
                        subheader_format_requests = []
                        
                        # Format sub-column headers (Row 3) - should match template (light blue, bold, correct font)
                        # Get formatting from template Row 2 (subcategory headers) which is format_rows[1]
                        if len(format_rows) > 1 and 'values' in format_rows[1]:
                            template_subheader_format = None
                            template_subheader_cells = format_rows[1]['values']
                            # Get formatting from first subcategory column (F column, index 0)
                            if len(template_subheader_cells) > 0 and 'effectiveFormat' in template_subheader_cells[0]:
                                template_subheader_format = template_subheader_cells[0]['effectiveFormat']
                                
                                # Apply to all subcategory columns (Row 3)
                                for col_idx in range(num_subcategories):
                                    subheader_format_requests.append({
                                        'repeatCell': {
                                            'range': {
                                                'sheetId': target_sheet_id,
                                                'startRowIndex': 2,  # Row 3 (subcategory headers) - 0-based index 2
                                                'endRowIndex': 3,    # Row 3 end
                                                'startColumnIndex': insert_position + col_idx,
                                                'endColumnIndex': insert_position + col_idx + 1
                                            },
                                            'cell': {
                                                'userEnteredFormat': template_subheader_format
                                            },
                                            'fields': 'userEnteredFormat'
                                        }
                                    })
                        
                        # Apply subheader formatting if we have it
                        if subheader_format_requests:
                            subheader_batch = {'requests': subheader_format_requests}
                            self.sheets_service.spreadsheets().batchUpdate(
                                spreadsheetId=sheet_id,
                                body=subheader_batch
                            ).execute()
                            print(f"✅ COPY_FORMATTING: Applied explicit formatting to {len(subheader_format_requests)} sub-column headers")
                        
                        # 🔥 FIX: Ensure category header (Row 2) has correct formatting (light blue background, bold)
                        # Get formatting from template Row 1 (category header) which is format_rows[0]
                        if len(format_rows) > 0 and 'values' in format_rows[0]:
                            template_header_format = None
                            template_header_cells = format_rows[0]['values']
                            # Get formatting from first column (F column, index 0) - category header is merged
                            if len(template_header_cells) > 0 and 'effectiveFormat' in template_header_cells[0]:
                                template_header_format = template_header_cells[0]['effectiveFormat']
                                
                                # Apply to category header row (Row 2) - all subcategory columns ONLY
                                category_header_format_request = {
                                    'repeatCell': {
                                        'range': {
                                            'sheetId': target_sheet_id,
                                            'startRowIndex': 1,  # Row 2 (category header) - 0-based index 1
                                            'endRowIndex': 2,    # Row 2 end (exclusive, so only Row 2)
                                            'startColumnIndex': insert_position,
                                            'endColumnIndex': insert_position + num_subcategories
                                        },
                                        'cell': {
                                            'userEnteredFormat': template_header_format
                                        },
                                        'fields': 'userEnteredFormat'
                                    }
                                }
                                
                                header_batch = {'requests': [category_header_format_request]}
                                self.sheets_service.spreadsheets().batchUpdate(
                                    spreadsheetId=sheet_id,
                                    body=header_batch
                                ).execute()
                                print(f"✅ COPY_FORMATTING: Applied explicit formatting to category header (Row 2)")
                        
                        # 🔥 FIX: Ensure max scores row (Row 4) has correct formatting (not blue, should match template)
                        # Get formatting from template Row 3 (max scores) which is format_rows[2]
                        if len(format_rows) > 2 and 'values' in format_rows[2]:
                            template_maxscore_format = None
                            template_maxscore_cells = format_rows[2]['values']
                            # Get formatting from first subcategory column (F column, index 0)
                            if len(template_maxscore_cells) > 0 and 'effectiveFormat' in template_maxscore_cells[0]:
                                template_maxscore_format = template_maxscore_cells[0]['effectiveFormat']
                                
                                # Apply to max scores row (Row 4) - all subcategory columns
                                maxscore_format_requests = []
                                for col_idx in range(num_subcategories):
                                    maxscore_format_requests.append({
                                        'repeatCell': {
                                            'range': {
                                                'sheetId': target_sheet_id,
                                                'startRowIndex': 3,  # Row 4 (max scores) - 0-based index 3
                                                'endRowIndex': 4,    # Row 4 end (exclusive, so only Row 4)
                                                'startColumnIndex': insert_position + col_idx,
                                                'endColumnIndex': insert_position + col_idx + 1
                                            },
                                            'cell': {
                                                'userEnteredFormat': template_maxscore_format
                                            },
                                            'fields': 'userEnteredFormat'
                                        }
                                    })
                                
                                if maxscore_format_requests:
                                    maxscore_batch = {'requests': maxscore_format_requests}
                                    self.sheets_service.spreadsheets().batchUpdate(
                                        spreadsheetId=sheet_id,
                                        body=maxscore_batch
                                    ).execute()
                                    print(f"✅ COPY_FORMATTING: Applied explicit formatting to max scores row (Row 4) - prevents unnecessary blue row")
                        
                        # 🔥 OVERRIDE: Make Total column light green 2 (matching Quizzes template)
                        # Row 1 = Internal IDs (hidden), Row 2 = Category header, Row 3 = Subcategory headers, Row 4 = Max scores, Row 5+ = Student data
                        print(f"🔥 COPY_FORMATTING: Overriding Total column to light green 2 for '{target_category_name}'")
                        override_requests = []
                        
                        # 1. Header rows (2-4): Light green 2 with borders
                        # Row 2 = Category header/percentage, Row 3 = Subcategory headers, Row 4 = Max scores
                        override_requests.append({
                            'repeatCell': {
                                'range': {
                                    'sheetId': target_sheet_id,
                                    'startRowIndex': 1,  # Row 2 (category header/percentage) - 0-based index 1
                                    'endRowIndex': 4,    # Row 4 (max score) - 0-based index 3, endRowIndex is exclusive so 4
                                    'startColumnIndex': new_total_col,  # Total column
                                    'endColumnIndex': new_total_col + 1
                                },
                                'cell': {
                                    'userEnteredFormat': {
                                        'backgroundColor': {'red': 0.713, 'green': 0.843, 'blue': 0.659},  # Light green 2 (#b6d7a8)
                                        'textFormat': {'bold': True, 'fontSize': 10},
                                        'horizontalAlignment': 'CENTER',
                                        'verticalAlignment': 'MIDDLE',
                                        'borders': {
                                            'top': {'style': 'SOLID', 'width': 2, 'color': {'red': 0.0, 'green': 0.0, 'blue': 0.0}},    # Bold top border
                                            'bottom': {'style': 'SOLID', 'width': 2, 'color': {'red': 0.0, 'green': 0.0, 'blue': 0.0}}, # Bold bottom border
                                            'left': {'style': 'SOLID', 'width': 2, 'color': {'red': 0.0, 'green': 0.0, 'blue': 0.0}},  # Bold left border (separator)
                                            'right': {'style': 'SOLID', 'width': 2, 'color': {'red': 0.0, 'green': 0.0, 'blue': 0.0}}   # Bold right border
                                        }
                                    }
                                },
                                'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)'
                            }
                        })
                        
                        # 2. Data rows (5+): Light green 2 WITHOUT borders, RIGHT-aligned
                        # Row 5+ = Student data rows
                        override_requests.append({
                            'repeatCell': {
                                'range': {
                                    'sheetId': target_sheet_id,
                                    'startRowIndex': 4,  # Row 5 (data rows start) - 0-based index 4
                                    'endRowIndex': 200,  # All data rows (extended range)
                                    'startColumnIndex': new_total_col,  # Total column
                                    'endColumnIndex': new_total_col + 1
                                },
                                'cell': {
                                    'userEnteredFormat': {
                                        'backgroundColor': {'red': 0.713, 'green': 0.843, 'blue': 0.659},  # Light green 2 (#b6d7a8)
                                        'textFormat': {'fontSize': 10},
                                        'horizontalAlignment': 'RIGHT',  # 🔥 FIX: Right-align numbers in Total column data rows
                                        'verticalAlignment': 'MIDDLE'
                                        # No borders for data rows
                                    }
                                },
                                'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
                            }
                        })
                        
                        # 🔥 FIX: Apply #fae2d5 color to subcategory data rows (Row 5+)
                        # This ensures newly added categories match the color of existing categories
                        # #fae2d5 = rgb(250, 226, 213) = (0.980, 0.886, 0.835)
                        print(f"🔥 COPY_FORMATTING: Applying #fae2d5 color to subcategory data rows (Row 5+) for '{target_category_name}'")
                        subcategory_data_format_request = {
                            'repeatCell': {
                                'range': {
                                    'sheetId': target_sheet_id,
                                    'startRowIndex': 4,  # Row 5 (data rows start) - 0-based index 4
                                    'endRowIndex': 200,  # All data rows (extended range)
                                    'startColumnIndex': insert_position,  # First subcategory column
                                    'endColumnIndex': insert_position + num_subcategories  # Last subcategory column (exclude Total)
                                },
                                'cell': {
                                    'userEnteredFormat': {
                                        'backgroundColor': {'red': 0.980, 'green': 0.886, 'blue': 0.835},  # #fae2d5 (light orange/peach)
                                        'textFormat': {'fontSize': 10},
                                        'horizontalAlignment': 'RIGHT',  # Right-align numbers
                                        'verticalAlignment': 'MIDDLE'
                                    }
                                },
                                'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
                            }
                        }
                        override_requests.append(subcategory_data_format_request)
                        
                        # Apply the dark green override
                        if override_requests:
                            batch_update_request = {'requests': override_requests}
                            self.sheets_service.spreadsheets().batchUpdate(
                                spreadsheetId=sheet_id,
                                body=batch_update_request
                            ).execute()
                            print(f"✅ COPY_FORMATTING: Override applied - Total column is now light green 2")
                        
                        return {'success': True, 'formats_applied': len(requests)}
                    else:
                        print("⚠️ COPY_FORMATTING: No formatting requests generated")
                        return {'success': True, 'formats_applied': 0}
                        
            except Exception as e:
                print(f"⚠️ COPY_FORMATTING: Could not copy Quizzes formatting: {str(e)}")
                
                # 🔥 FALLBACK: Try alternative method using copyPaste
                print(f"🔥 COPY_FORMATTING: Trying alternative copy method...")
                try:
                    return self._copy_formatting_alternative_method(
                        sheet_id, target_sheet_id, 5, 10,  # F=5, K=10
                        insert_position, num_subcategories, target_category_name
                    )
                except Exception as fallback_error:
                    print(f"⚠️ COPY_FORMATTING: Alternative method also failed: {str(fallback_error)}")
                    return {'success': False, 'error': f'Failed to copy Quizzes formatting: {str(e)}'}
            
        except Exception as e:
            return {'success': False, 'error': f'Failed to copy template formatting: {str(e)}'}
    
    def _copy_formatting_alternative_method(self, sheet_id: str, target_sheet_id: int, 
                                          source_start_col: int, source_end_col: int,
                                          dest_start_col: int, num_subcategories: int, 
                                          target_category_name: str) -> dict:
        """
        Alternative method: Use copyPaste to copy formatting from source to destination
        """
        try:
            print(f"🔥 ALTERNATIVE_FORMATTING: Using copyPaste method for '{target_category_name}'")
            
            requests = []
            
            # Calculate destination positions
            dest_total_col = dest_start_col + num_subcategories
            
            # 🔥 FIXED: Copy formatting from source range F1:J4, but map to new structure
            # Template: Row 1 = Category header, Row 2 = Subcategory headers, Row 3 = Max scores, Row 4 = First data row
            # New: Row 1 = Internal IDs, Row 2 = Category header, Row 3 = Subcategory headers, Row 4 = Max scores, Row 5 = First data row
            # 🔥 CRITICAL: Only copy formatting for header rows (Template Rows 1-3 → New Rows 2-4)
            # Do NOT copy Row 4 formatting (which would apply to New Row 5) - Row 5 should have data row formatting!
            source_range = {
                'sheetId': target_sheet_id,  # Same sheet, but from existing Quizzes columns
                'startRowIndex': 0,  # Template Row 1 (category header)
                'endRowIndex': 3,   # Template Row 3 (max scores) - STOP HERE, don't copy Row 4!
                'startColumnIndex': source_start_col,  # Column F (5) - Quizzes columns
                'endColumnIndex': source_end_col       # Column J (9), NOT K
            }
            
            dest_range = {
                'sheetId': target_sheet_id,
                'startRowIndex': 1,  # New Row 2 (shift +1 from Template Row 1)
                'endRowIndex': 4,    # New Row 4 (shift +1 from Template Row 3) - STOP HERE, don't format Row 5!
                'startColumnIndex': dest_start_col,    # New category start
                'endColumnIndex': dest_total_col       # New category end (exclude Total column)
            }
            
            print(f"🔥 ALTERNATIVE_FORMATTING: Copying from range {source_start_col}:{source_end_col} to {dest_start_col}:{dest_total_col}")
            print(f"🔥 ALTERNATIVE_FORMATTING: Source range: {source_range}")
            print(f"🔥 ALTERNATIVE_FORMATTING: Destination range: {dest_range}")
            print(f"🔥 ALTERNATIVE_FORMATTING: This should copy from Quizzes columns F-J to new category columns")
            
            # Use copyPaste to copy formatting only
            requests.append({
                'copyPaste': {
                    'source': source_range,
                    'destination': dest_range,
                    'pasteType': 'PASTE_FORMAT_ONLY',  # Only copy formatting, not values
                    'pasteOrientation': 'NORMAL'
                }
            })
            
            # Execute the copyPaste request
            if requests:
                batch_update_request = {'requests': requests}
                result = self.sheets_service.spreadsheets().batchUpdate(
                    spreadsheetId=sheet_id,
                    body=batch_update_request
                ).execute()
                
                print(f"✅ ALTERNATIVE_FORMATTING: Applied copyPaste formatting for '{target_category_name}'")
                print(f"🔥 ALTERNATIVE_FORMATTING: CopyPaste result: {result}")
                
                # 🔥 ADDITIONAL: Ensure Total column has dark green throughout (as requested)
                print(f"🔥 ALTERNATIVE_FORMATTING: Applying dark green to Total column for '{target_category_name}'")
                total_format_requests = []
                
                # Apply dark green to Total column for all rows (as requested)
                total_format_requests.append({
                    'repeatCell': {
                        'range': {
                            'sheetId': target_sheet_id,
                            'startRowIndex': 0,  # Row 1 (percentage)
                            'endRowIndex': 100,  # All rows
                            'startColumnIndex': dest_total_col,  # Total column
                            'endColumnIndex': dest_total_col + 1
                        },
                        'cell': {
                            'userEnteredFormat': {
                                'backgroundColor': {'red': 0.0, 'green': 0.5, 'blue': 0.0},  # Dark green (as requested)
                                'textFormat': {'bold': True, 'fontSize': 10},
                                'horizontalAlignment': 'CENTER',
                                'verticalAlignment': 'MIDDLE'
                            }
                        },
                        'fields': 'userEnteredFormat'
                    }
                })
                
                # Apply the dark green formatting to Total column only
                if total_format_requests:
                    batch_update_request = {'requests': total_format_requests}
                    self.sheets_service.spreadsheets().batchUpdate(
                        spreadsheetId=sheet_id,
                        body=batch_update_request
                    ).execute()
                    print(f"✅ ALTERNATIVE_FORMATTING: Applied dark green to Total column")
                
                return {'success': True, 'formats_applied': 1, 'method': 'copyPaste'}
            else:
                print("⚠️ ALTERNATIVE_FORMATTING: No copyPaste requests generated")
                return {'success': True, 'formats_applied': 0}
                
        except Exception as e:
            print(f"⚠️ ALTERNATIVE_FORMATTING: copyPaste method failed: {str(e)}")
            # Fallback: Apply manual formatting
            return self._apply_manual_formatting_fallback(sheet_id, target_sheet_id, dest_start_col, dest_total_col, num_subcategories, target_category_name)
                
        except Exception as e:
            return {'success': False, 'error': f'Alternative formatting method failed: {str(e)}'}

    def _apply_manual_formatting_fallback(self, sheet_id: str, target_sheet_id: int, 
                                        dest_start_col: int, dest_total_col: int, 
                                        num_subcategories: int, target_category_name: str) -> dict:
        """
        Manual formatting fallback when copyPaste fails
        """
        try:
            print(f"🔥 MANUAL_FORMATTING: Applying manual formatting for '{target_category_name}'")
            
            requests = []
            
            # 1. Apply light orange to sub-column data rows (Row 4+)
            sub_column_data_range = {
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 3,  # Row 4 (data rows start)
                        'endRowIndex': 100,  # All data rows
                        'startColumnIndex': dest_start_col,  # First sub-column
                        'endColumnIndex': dest_total_col     # Last sub-column (exclude Total)
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'backgroundColor': {'red': 1.0, 'green': 0.9, 'blue': 0.8},  # Light orange/peach
                            'textFormat': {'fontSize': 10},
                            'horizontalAlignment': 'CENTER',
                            'verticalAlignment': 'MIDDLE'
                        }
                    },
                    'fields': 'userEnteredFormat'
                }
            }
            requests.append(sub_column_data_range)
            
            # 2. Apply dark green to Total column (all rows)
            total_column_range = {
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 0,  # Row 1 (percentage)
                        'endRowIndex': 100,  # All rows
                        'startColumnIndex': dest_total_col,  # Total column
                        'endColumnIndex': dest_total_col + 1
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'backgroundColor': {'red': 0.0, 'green': 0.5, 'blue': 0.0},  # Dark green
                            'textFormat': {'bold': True, 'fontSize': 10},
                            'horizontalAlignment': 'CENTER',
                            'verticalAlignment': 'MIDDLE'
                        }
                    },
                    'fields': 'userEnteredFormat'
                }
            }
            requests.append(total_column_range)
            
            # Apply all formatting
            if requests:
                batch_update_request = {'requests': requests}
                self.sheets_service.spreadsheets().batchUpdate(
                    spreadsheetId=sheet_id,
                    body=batch_update_request
                ).execute()
                print(f"✅ MANUAL_FORMATTING: Applied manual formatting for '{target_category_name}'")
                print(f"🔥 MANUAL_FORMATTING: Sub-columns data rows: Light orange")
                print(f"🔥 MANUAL_FORMATTING: Total column: Dark green")
                
                return {'success': True, 'formats_applied': len(requests), 'method': 'manual'}
            else:
                return {'success': False, 'error': 'No manual formatting requests generated'}
                
        except Exception as e:
            return {'success': False, 'error': f'Manual formatting failed: {str(e)}'}

    def add_category_to_sheet(self, sheet_id: str, category_name: str, sub_categories: list,
                              sheet_name: str = None, percentage: str = "10.00%") -> dict:
        """
        Add a new category using the copy-modify approach.
        Uses existing category as template and modifies for new category.
        """
        try:
            print(f"🔥 ADD_CATEGORY: Using copy-modify approach for '{category_name}' with {len(sub_categories)} subcategories")

            # Validate inputs
            if not category_name or not category_name.strip():
                return {'success': False, 'error': 'category_name is required and cannot be empty'}
            
            if not sub_categories or len(sub_categories) == 0:
                return {'success': False, 'error': 'sub_categories array is required and cannot be empty'}
            
            if len(sub_categories) > 20:
                return {'success': False, 'error': 'sub_categories count cannot exceed 20'}

            # Use the copy-modify approach
            result = self.copy_category_layout(sheet_id, category_name, sub_categories, percentage, sheet_name)
            
            if result['success']:
                print(f"🎉 ADD_CATEGORY: Successfully created '{category_name}' using template '{result.get('template_used', 'unknown')}'")
                # 🔥 PHASE 2: Log column indices for formula calculation
                if 'category_column_index' in result and 'total_column_index' in result:
                    print(f"📊 ADD_CATEGORY: Category column index: {result['category_column_index']}, Total column index: {result['total_column_index']}")
            
            return result

        except Exception as e:
            logger.error(f"Add category to sheet error: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': f'Failed to add category: {str(e)}'
            }

    def _add_total_formulas(self, sheet_id: str, sheet_name: str, start_col: int, num_subcategories: int) -> dict:
        """Add SUM formulas to the Total column for all student rows"""
        try:
            # Total column is at start_col + num_subcategories
            total_col_index = start_col + num_subcategories
            total_col_letter = self._column_index_to_a1(total_col_index)

            # Create formula range letters for subcategories
            first_subcol_letter = self._column_index_to_a1(start_col)
            last_subcol_letter = self._column_index_to_a1(start_col + num_subcategories - 1)

            print(
                f"🧮 FORMULAS: Adding SUM formulas to column {total_col_letter} (range {first_subcol_letter}:{last_subcol_letter})")

            # Add formulas for rows 5-200 (student data rows)
            # Row 1 = Internal IDs, Row 2 = Category header, Row 3 = Subcategory headers, Row 4 = Max scores, Row 5+ = Student data
            formula_updates = []
            for row in range(5, 201):  # Rows 5-200 (1-based indexing) - student data starts at Row 5
                formula = f"=SUM({first_subcol_letter}{row}:{last_subcol_letter}{row})"
                formula_updates.append({
                    'range': f"'{sheet_name}'!{total_col_letter}{row}",
                    'values': [[formula]]
                })

            # Batch update all formulas
            if formula_updates:
                body = {
                    'valueInputOption': 'USER_ENTERED',  # This processes formulas
                    'data': formula_updates
                }

                result = self.sheets_service.spreadsheets().values().batchUpdate(
                    spreadsheetId=sheet_id,
                    body=body
                ).execute()

                print(f"✅ FORMULAS: Added {len(formula_updates)} SUM formulas")
                return {'success': True, 'formulas_added': len(formula_updates)}
            else:
                return {'success': True, 'formulas_added': 0}

        except Exception as e:
            logger.error(f"Add total formulas error: {str(e)}")
            return {'success': False, 'error': str(e)}

    def _format_new_category_columns_with_total(self, sheet_id: str, sheet_name: str, start_col: int,
                                                num_subcategories: int, total_columns: int) -> dict:
        """Apply formatting to new category columns including Total column"""
        try:
            # Get sheet properties
            spreadsheet = self.sheets_service.spreadsheets().get(spreadsheetId=sheet_id).execute()
            target_sheet_id = None

            for sheet in spreadsheet['sheets']:
                if sheet['properties']['title'] == sheet_name:
                    target_sheet_id = sheet['properties']['sheetId']
                    break

            if target_sheet_id is None:
                return {'success': False, 'error': f'Sheet "{sheet_name}" not found'}

            requests = []

            # Calculate column positions
            total_col_index = start_col + num_subcategories

            # Format category header (Row 1) - only for the category columns (not Total)
            requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 0,
                        'endRowIndex': 1,
                        'startColumnIndex': start_col,
                        'endColumnIndex': start_col + num_subcategories  # Only subcategories, not Total
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'textFormat': {'bold': True, 'fontSize': 10},
                            'horizontalAlignment': 'CENTER',
                            'verticalAlignment': 'MIDDLE',
                            'backgroundColor': {'red': 0.8, 'green': 0.8, 'blue': 1.0},  # Light purple like Projects
                            'borders': {
                                'top': {'style': 'SOLID', 'width': 1},
                                'bottom': {'style': 'SOLID', 'width': 1},
                                'left': {'style': 'SOLID', 'width': 1},
                                'right': {'style': 'SOLID', 'width': 1}
                            }
                        }
                    },
                    'fields': 'userEnteredFormat'
                }
            })

            # Format Total column header (Row 1) - Yellow like existing percentage columns
            requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 0,
                        'endRowIndex': 1,
                        'startColumnIndex': total_col_index,
                        'endColumnIndex': total_col_index + 1
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'textFormat': {'bold': True, 'fontSize': 10},
                            'horizontalAlignment': 'CENTER',
                            'verticalAlignment': 'MIDDLE',
                            'backgroundColor': {'red': 1.0, 'green': 0.9, 'blue': 0.6},
                            # Yellow like existing percentage
                            'borders': {
                                'top': {'style': 'SOLID', 'width': 1},
                                'bottom': {'style': 'SOLID', 'width': 1},
                                'left': {'style': 'SOLID', 'width': 1},
                                'right': {'style': 'SOLID', 'width': 1}
                            }
                        }
                    },
                    'fields': 'userEnteredFormat'
                }
            })

            # Format subcategory headers (Row 2) - blue
            requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 1,
                        'endRowIndex': 2,
                        'startColumnIndex': start_col,
                        'endColumnIndex': start_col + num_subcategories
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'textFormat': {'bold': True, 'fontSize': 10},
                            'horizontalAlignment': 'CENTER',
                            'verticalAlignment': 'MIDDLE',
                            'backgroundColor': {'red': 0.7, 'green': 0.85, 'blue': 1.0},  # Light blue like Quiz columns
                            'borders': {
                                'top': {'style': 'SOLID', 'width': 1},
                                'bottom': {'style': 'SOLID', 'width': 1},
                                'left': {'style': 'SOLID', 'width': 1},
                                'right': {'style': 'SOLID', 'width': 1}
                            }
                        }
                    },
                    'fields': 'userEnteredFormat'
                }
            })

            # Format Total column header (Row 2) - GREEN like existing Total columns
            requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 1,
                        'endRowIndex': 2,
                        'startColumnIndex': total_col_index,
                        'endColumnIndex': total_col_index + 1
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'textFormat': {'bold': True, 'fontSize': 10},
                            'horizontalAlignment': 'CENTER',
                            'verticalAlignment': 'MIDDLE',
                            'backgroundColor': {'red': 0.6, 'green': 0.9, 'blue': 0.6},  # Green like existing Total
                            'borders': {
                                'top': {'style': 'SOLID', 'width': 1},
                                'bottom': {'style': 'SOLID', 'width': 1},
                                'left': {'style': 'SOLID', 'width': 1},
                                'right': {'style': 'SOLID', 'width': 1}
                            }
                        }
                    },
                    'fields': 'userEnteredFormat'
                }
            })

            # Format max scores row (Row 3) for subcategories
            requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 2,
                        'endRowIndex': 3,
                        'startColumnIndex': start_col,
                        'endColumnIndex': start_col + num_subcategories
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'horizontalAlignment': 'CENTER',
                            'verticalAlignment': 'MIDDLE',
                            'backgroundColor': {'red': 0.9, 'green': 0.95, 'blue': 1.0},  # Very light blue
                            'borders': {
                                'top': {'style': 'SOLID', 'width': 1},
                                'bottom': {'style': 'SOLID', 'width': 1},
                                'left': {'style': 'SOLID', 'width': 1},
                                'right': {'style': 'SOLID', 'width': 1}
                            }
                        }
                    },
                    'fields': 'userEnteredFormat'
                }
            })

            # Format Total column max score (Row 3) - Light green
            requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 2,
                        'endRowIndex': 3,
                        'startColumnIndex': total_col_index,
                        'endColumnIndex': total_col_index + 1
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'horizontalAlignment': 'CENTER',
                            'verticalAlignment': 'MIDDLE',
                            'backgroundColor': {'red': 0.8, 'green': 0.95, 'blue': 0.8},  # Light green
                            'borders': {
                                'top': {'style': 'SOLID', 'width': 1},
                                'bottom': {'style': 'SOLID', 'width': 1},
                                'left': {'style': 'SOLID', 'width': 1},
                                'right': {'style': 'SOLID', 'width': 1}
                            }
                        }
                    },
                    'fields': 'userEnteredFormat'
                }
            })

            # Format data cells for Total column (Row 4 onwards) - light green
            requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 3,
                        'endRowIndex': 50,
                        'startColumnIndex': total_col_index,
                        'endColumnIndex': total_col_index + 1
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'horizontalAlignment': 'CENTER',
                            'verticalAlignment': 'MIDDLE',
                            'backgroundColor': {'red': 0.9, 'green': 1.0, 'blue': 0.9},  # Very light green
                            'borders': {
                                'top': {'style': 'SOLID', 'width': 1},
                                'bottom': {'style': 'SOLID', 'width': 1},
                                'left': {'style': 'SOLID', 'width': 1},
                                'right': {'style': 'SOLID', 'width': 1}
                            }
                        }
                    },
                    'fields': 'userEnteredFormat'
                }
            })

            if requests:
                result = self.sheets_service.spreadsheets().batchUpdate(
                    spreadsheetId=sheet_id,
                    body={'requests': requests}
                ).execute()
                return {'success': True, 'result': result}
            else:
                return {'success': True, 'message': 'No formatting applied'}

        except Exception as e:
            logger.error(f"Format category columns with total error: {str(e)}")
            return {'success': False, 'error': str(e)}

    def _insert_columns(self, sheet_id: str, sheet_name: str, start_index: int, count: int) -> dict:
        """Insert new columns into the sheet"""
        try:
            # Get sheet properties to get the sheet ID (different from spreadsheet ID)
            spreadsheet = self.sheets_service.spreadsheets().get(spreadsheetId=sheet_id).execute()
            target_sheet_id = None

            for sheet in spreadsheet['sheets']:
                if sheet['properties']['title'] == sheet_name:
                    target_sheet_id = sheet['properties']['sheetId']
                    break

            if target_sheet_id is None:
                return {'success': False, 'error': f'Sheet "{sheet_name}" not found'}

            # Insert columns request
            request = {
                'insertDimension': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'dimension': 'COLUMNS',
                        'startIndex': start_index,
                        'endIndex': start_index + count
                    },
                    'inheritFromBefore': False
                }
            }

            result = self.sheets_service.spreadsheets().batchUpdate(
                spreadsheetId=sheet_id,
                body={'requests': [request]}
            ).execute()

            return {'success': True, 'result': result}

        except Exception as e:
            logger.error(f"Insert columns error: {str(e)}")
            return {'success': False, 'error': str(e)}

    def _merge_cells(self, sheet_id: str, sheet_name: str, start_row: int, end_row: int, start_col: int,
                     end_col: int) -> dict:
        """Merge cells in the specified range"""
        try:
            # Get sheet properties to get the sheet ID
            spreadsheet = self.sheets_service.spreadsheets().get(spreadsheetId=sheet_id).execute()
            target_sheet_id = None

            for sheet in spreadsheet['sheets']:
                if sheet['properties']['title'] == sheet_name:
                    target_sheet_id = sheet['properties']['sheetId']
                    break

            if target_sheet_id is None:
                return {'success': False, 'error': f'Sheet "{sheet_name}" not found'}

            # Merge cells request
            request = {
                'mergeCells': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': start_row,
                        'endRowIndex': end_row + 1,  # endRowIndex is exclusive
                        'startColumnIndex': start_col,
                        'endColumnIndex': end_col + 1  # endColumnIndex is exclusive
                    },
                    'mergeType': 'MERGE_ALL'
                }
            }

            result = self.sheets_service.spreadsheets().batchUpdate(
                spreadsheetId=sheet_id,
                body={'requests': [request]}
            ).execute()

            return {'success': True, 'result': result}

        except Exception as e:
            logger.error(f"Merge cells error: {str(e)}")
            return {'success': False, 'error': str(e)}

    def _update_cell_range(self, sheet_id: str, sheet_name: str, range_name: str, values: list) -> dict:
        """Update a range of cells with values"""
        try:
            full_range = f"'{sheet_name}'!{range_name}"

            body = {
                'values': values
            }

            result = self.sheets_service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=full_range,
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()

            return {'success': True, 'result': result}

        except Exception as e:
            logger.error(f"Update cell range error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def write_internal_id_to_row1(self, sheet_id: str, sheet_name: str, internal_id: str, 
                                  insert_position: int, num_subcategories: int) -> dict:
        """
        Write internal ID to Row 1 for subcategory columns only (NOT Total column).
        
        Format: Same ID in all subcategory columns, Total column is left empty/blank.
        Uses the exact ID that Apps Script wrote to SETTINGS tab.
        
        Args:
            sheet_id: Google Sheet ID
            sheet_name: Sheet name (e.g., "Midterm")
            internal_id: Internal ID from Apps Script response (e.g., "ORAL_RECITATION")
                         This should match what's in SETTINGS tab Column B
            insert_position: Column index where category starts (0-based)
            num_subcategories: Number of subcategory columns
        
        Returns:
            dict with 'success' and optional 'error'
        
        Example:
            For "Oral Recitation" with 5 subcategories:
            - Row 1: ["ORAL_RECITATION", "ORAL_RECITATION", "ORAL_RECITATION", 
                      "ORAL_RECITATION", "ORAL_RECITATION", ""]
            - 5 subcategory columns have the ID, Total column (6th) is empty
        """
        try:
            # Calculate column letters
            start_col_letter = self._column_index_to_a1(insert_position)
            # End at last subcategory column (NOT Total column)
            last_subcol_index = insert_position + num_subcategories - 1
            last_subcol_letter = self._column_index_to_a1(last_subcol_index)
            
            # ✅ Format: Same ID in subcategory columns only, Total column is empty
            # This ensures consistency with what Apps Script wrote to SETTINGS tab
            internal_id_row = [internal_id] * num_subcategories  # Only subcategories, NOT Total
            internal_id_range = f"{start_col_letter}1:{last_subcol_letter}1"
            
            result = self._update_cell_range(
                sheet_id,
                sheet_name,
                internal_id_range,
                [internal_id_row]
            )
            
            if result['success']:
                print(f"✅ Wrote internal ID '{internal_id}' to Row 1 ({internal_id_range}) - same ID in {num_subcategories} subcategory columns (Total column left empty)")
                logger.info(f"✅ Wrote internal ID '{internal_id}' to Row 1 for '{sheet_name}' - {num_subcategories} subcategory columns")
                
                # 🔥 PHASE 3: Verify consistency - Check Row 1 and SETTINGS tab match
                try:
                    verify_result = self._verify_internal_id_in_row1(
                        sheet_id,
                        sheet_name,
                        internal_id,
                        insert_position,
                        num_subcategories
                    )
                    
                    if verify_result.get('verified'):
                        logger.info(f"✅ PHASE 3: Complete verification passed - Row 1 and SETTINGS tab both match '{internal_id}'")
                        result['verification_status'] = 'verified'
                    else:
                        # Log detailed verification results
                        row1_status = "✅" if verify_result.get('row1_verified') else "❌"
                        settings_status = "✅" if verify_result.get('settings_verified') else "❌"
                        logger.warning(f"⚠️ PHASE 3: Verification incomplete - Row 1: {row1_status}, SETTINGS: {settings_status}")
                        
                        if verify_result.get('mismatches'):
                            logger.warning(f"   Row 1 mismatches: {verify_result.get('mismatches')}")
                        if verify_result.get('settings_error'):
                            logger.warning(f"   SETTINGS error: {verify_result.get('settings_error')}")
                        
                        result['verification_status'] = 'partial'
                        result['verification_warning'] = verify_result.get('error')
                        result['row1_verified'] = verify_result.get('row1_verified', False)
                        result['settings_verified'] = verify_result.get('settings_verified', False)
                except Exception as verify_error:
                    logger.warning(f"⚠️ PHASE 3: Verification error (non-critical): {str(verify_error)}")
                    result['verification_status'] = 'error'
                    result['verification_error'] = str(verify_error)
                    # Don't fail the whole operation if verification fails
            else:
                logger.warning(f"⚠️ Failed to write internal ID to Row 1: {result.get('error')}")
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to write internal ID to Row 1: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {'success': False, 'error': str(e)}
    
    def _verify_internal_id_in_row1(self, sheet_id: str, sheet_name: str, expected_internal_id: str,
                                    insert_position: int, num_subcategories: int) -> dict:
        """
        🔥 PHASE 3: Verify that the internal ID written to Row 1 matches:
        1. The expected value (what we wrote)
        2. What's in the SETTINGS tab (source of truth)
        
        This ensures consistency between Row 1, expected value, and SETTINGS tab.
        
        Args:
            sheet_id: Google Sheet ID
            sheet_name: Sheet name (e.g., "Midterm")
            expected_internal_id: The internal ID that should be in Row 1 (e.g., "ORAL_RECITATION")
            insert_position: Column index where category starts (0-based)
            num_subcategories: Number of subcategory columns
        
        Returns:
            dict with 'verified' (bool), 'row1_verified' (bool), 'settings_verified' (bool), and optional 'error'
        """
        try:
            # Calculate column letters
            start_col_letter = self._column_index_to_a1(insert_position)
            last_subcol_index = insert_position + num_subcategories - 1
            last_subcol_letter = self._column_index_to_a1(last_subcol_index)
            
            # Read Row 1 from subcategory columns
            verify_range = f"'{sheet_name}'!{start_col_letter}1:{last_subcol_letter}1"
            
            read_result = self.sheets_service.spreadsheets().values().get(
                spreadsheetId=sheet_id,
                range=verify_range,
                valueRenderOption='UNFORMATTED_VALUE'
            ).execute()
            
            values = read_result.get('values', [])
            
            if not values or len(values) == 0:
                return {
                    'verified': False,
                    'error': 'No values found in Row 1 for verification'
                }
            
            row1_values = values[0] if len(values) > 0 else []
            
            # Check if all subcategory columns have the expected internal ID
            expected_normalized = expected_internal_id.upper().strip()
            all_match = True
            mismatches = []
            
            for col_idx, cell_value in enumerate(row1_values):
                if col_idx >= num_subcategories:
                    break  # Only check subcategory columns, not Total
                
                cell_normalized = str(cell_value).upper().strip() if cell_value else ''
                
                if cell_normalized != expected_normalized:
                    all_match = False
                    mismatches.append({
                        'column_index': insert_position + col_idx,
                        'expected': expected_normalized,
                        'actual': cell_normalized
                    })
            
            row1_verified = all_match
            
            if row1_verified:
                logger.info(f"✅ PHASE 3: All {num_subcategories} subcategory columns in Row 1 match expected ID '{expected_normalized}'")
            else:
                error_msg = f"Mismatch in {len(mismatches)} column(s). Expected '{expected_normalized}' but found: {mismatches}"
                logger.warning(f"⚠️ PHASE 3 (Row 1): {error_msg}")
            
            # 🔥 PHASE 3: Also verify against SETTINGS tab (source of truth)
            settings_verified = False
            settings_id = None
            settings_error = None
            
            try:
                # Determine which SETTINGS tab to check
                from utils.google_apps_script_service import determine_sheet_type
                sheet_type = determine_sheet_type(sheet_name)
                
                if sheet_type:
                    settings_tab_name = 'SETTINGS_MIDTERM' if sheet_type == 'midterm' else 'SETTINGS_FINAL'
                    
                    # Read from SETTINGS tab - Column B = INTERNAL_ID, Column C = DISPLAY_NAME
                    # We need to find the row where DISPLAY_NAME matches the category
                    # For now, we'll check if the expected_internal_id exists in SETTINGS tab Column B
                    settings_range = f"'{settings_tab_name}'!B2:B100"  # Column B = INTERNAL_ID
                    
                    settings_result = self.sheets_service.spreadsheets().values().get(
                        spreadsheetId=sheet_id,
                        range=settings_range,
                        valueRenderOption='UNFORMATTED_VALUE'
                    ).execute()
                    
                    settings_values = settings_result.get('values', [])
                    settings_ids = [str(row[0]).upper().strip() if row and len(row) > 0 else '' 
                                   for row in settings_values]
                    
                    # Check if expected_internal_id exists in SETTINGS tab
                    if expected_normalized in settings_ids:
                        settings_verified = True
                        settings_id = expected_normalized
                        logger.info(f"✅ PHASE 3 (SETTINGS): Internal ID '{expected_normalized}' found in {settings_tab_name} tab")
                    else:
                        settings_error = f"Internal ID '{expected_normalized}' not found in {settings_tab_name} tab Column B"
                        logger.warning(f"⚠️ PHASE 3 (SETTINGS): {settings_error}")
                        logger.warning(f"   Available IDs in SETTINGS: {[id for id in settings_ids if id]}")
                else:
                    settings_error = f"Cannot determine sheet type for '{sheet_name}' - skipping SETTINGS verification"
                    logger.warning(f"⚠️ PHASE 3 (SETTINGS): {settings_error}")
                    
            except Exception as settings_ex:
                settings_error = f"Error reading SETTINGS tab: {str(settings_ex)}"
                logger.warning(f"⚠️ PHASE 3 (SETTINGS): {settings_error}")
            
            # Overall verification: Both Row 1 and SETTINGS must match
            overall_verified = row1_verified and settings_verified
            
            if overall_verified:
                logger.info(f"✅ PHASE 3: Complete verification passed - Row 1 and SETTINGS tab both match '{expected_normalized}'")
            else:
                issues = []
                if not row1_verified:
                    issues.append("Row 1 mismatch")
                if not settings_verified:
                    issues.append(f"SETTINGS tab mismatch: {settings_error}")
                
                logger.warning(f"⚠️ PHASE 3: Verification incomplete - {', '.join(issues)}")
            
            return {
                'verified': overall_verified,
                'row1_verified': row1_verified,
                'settings_verified': settings_verified,
                'settings_id': settings_id,
                'error': None if overall_verified else f"Verification issues: Row 1={row1_verified}, SETTINGS={settings_verified}",
                'mismatches': mismatches if not row1_verified else None,
                'settings_error': settings_error
            }
                
        except Exception as e:
            logger.error(f"PHASE 3: Verification error: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                'verified': False,
                'error': f'Verification failed: {str(e)}'
            }

    def _format_new_category_columns(self, sheet_id: str, sheet_name: str, start_col: int, count: int) -> dict:
        """Apply formatting to new category columns"""
        try:
            # Get sheet properties
            spreadsheet = self.sheets_service.spreadsheets().get(spreadsheetId=sheet_id).execute()
            target_sheet_id = None

            for sheet in spreadsheet['sheets']:
                if sheet['properties']['title'] == sheet_name:
                    target_sheet_id = sheet['properties']['sheetId']
                    break

            if target_sheet_id is None:
                return {'success': False, 'error': f'Sheet "{sheet_name}" not found'}

            requests = []

            # Format category header (Row 1) - bold and centered
            requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 0,
                        'endRowIndex': 1,
                        'startColumnIndex': start_col,
                        'endColumnIndex': start_col + count
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'textFormat': {'bold': True},
                            'horizontalAlignment': 'CENTER',
                            'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 1.0}  # Light blue
                        }
                    },
                    'fields': 'userEnteredFormat(textFormat,horizontalAlignment,backgroundColor)'
                }
            })

            # Format column headers (Row 2) - bold and centered
            requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 1,
                        'endRowIndex': 2,
                        'startColumnIndex': start_col,
                        'endColumnIndex': start_col + count
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'textFormat': {'bold': True},
                            'horizontalAlignment': 'CENTER',
                            'backgroundColor': {'red': 0.95, 'green': 0.95, 'blue': 1.0}  # Lighter blue
                        }
                    },
                    'fields': 'userEnteredFormat(textFormat,horizontalAlignment,backgroundColor)'
                }
            })

            # Format max scores (Row 3) - centered
            requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 2,
                        'endRowIndex': 3,
                        'startColumnIndex': start_col,
                        'endColumnIndex': start_col + count
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'horizontalAlignment': 'CENTER',
                            'backgroundColor': {'red': 1.0, 'green': 1.0, 'blue': 0.9}  # Light yellow
                        }
                    },
                    'fields': 'userEnteredFormat(horizontalAlignment,backgroundColor)'
                }
            })

            if requests:
                result = self.sheets_service.spreadsheets().batchUpdate(
                    spreadsheetId=sheet_id,
                    body={'requests': requests}
                ).execute()

                return {'success': True, 'result': result}
            else:
                return {'success': True, 'message': 'No formatting applied'}

        except Exception as e:
            logger.error(f"Format category columns error: {str(e)}")
            return {'success': False, 'error': str(e)}

    def delete_category_from_sheet(self, sheet_id: str, category_name: str, sheet_name: str = None) -> dict:
        """Delete a category and all its columns from Google Sheet"""
        try:
            print(f"DELETE_CATEGORY: Starting to delete '{category_name}' from sheet: {sheet_name}")

            # FIX: Get RAW sheet data directly, just like in get_categories
            # FIXED: Use wider range to include columns beyond AM
            if sheet_name:
                # Call the Google Sheets API directly to get raw data
                range_name = f"'{sheet_name}'!A1:ZZ10"  # Get first 10 rows, wider range to include more columns
                print(f"DELETE_CATEGORY: Requesting raw range: {range_name}")

                result = self.sheets_service.spreadsheets().values().get(
                    spreadsheetId=sheet_id,
                    range=range_name,
                    valueRenderOption='UNFORMATTED_VALUE'
                ).execute()

                raw_data = result.get('values', [])

                if not raw_data or len(raw_data) < 1:
                    return {'success': False, 'error': 'Sheet has no data to analyze'}

                all_data = raw_data
                target_sheet_name = sheet_name

                # Create headers from the second row (column names)
                headers = all_data[1] if len(all_data) > 1 else []

            else:
                # Use the original method for default sheet
                sheet_data = self.get_sheet_data(sheet_id)
                if not sheet_data['success']:
                    return sheet_data

                if 'data' not in sheet_data or not sheet_data['data']:
                    return {'success': False, 'error': 'Sheet has no data to analyze'}

                all_data = sheet_data['data']
                headers = sheet_data['headers']
                target_sheet_name = sheet_data['sheet_name']

            print(f"DELETE_CATEGORY: Target sheet: {target_sheet_name}")
            print(f"DELETE_CATEGORY: Headers count: {len(headers)}")
            print(f"DELETE_CATEGORY: First 20 headers: {headers[:20]}")

            # FIXED: Find the category in Row 2 (category names row), not Row 1 (internal IDs)
            # Row 1 = Internal IDs (hidden), Row 2 = Category names and percentages
            if not all_data or len(all_data) < 2:
                return {'success': False, 'error': 'Sheet has no data to analyze'}

            # Use Row 2 (index 1) for category names, Row 1 (index 0) for internal IDs
            if len(all_data) < 2:
                return {'success': False, 'error': 'Sheet has less than 2 rows - cannot find category names row'}
            
            row1 = all_data[0]  # Row 1 contains internal IDs
            categories_row = all_data[1]  # Row 2 contains category names (display names)
            print(f"DELETE_CATEGORY: Row 1 (internal IDs) length: {len(row1)}")
            print(f"DELETE_CATEGORY: Categories row (Row 2) length: {len(categories_row)}")
            print(f"DELETE_CATEGORY: Categories row (Row 2) first 30: {categories_row[:30]}")
            print(f"DELETE_CATEGORY: Looking for category: '{category_name}' (normalized: '{category_name.upper()}')")

            # Find category start and end indices
            category_start = None
            category_end = None

            # Strategy 1: Try to find by display name in Row 2
            for i, cell in enumerate(categories_row):
                cell_str = str(cell).strip().upper() if cell else ""
                if cell_str == category_name.upper():
                    category_start = i
                    print(f"DELETE_CATEGORY: Found category by display name '{category_name}' at column {i}")
                    break
            
            # Strategy 2: If not found, try to find by internal ID in Row 1
            if category_start is None:
                print(f"DELETE_CATEGORY: Not found by display name, trying to find by internal ID in Row 1")
                for i, cell in enumerate(row1):
                    cell_str = str(cell).strip().upper() if cell else ""
                    if cell_str == category_name.upper():
                        category_start = i
                        print(f"DELETE_CATEGORY: Found category by internal ID '{category_name}' in Row 1 at column {i}")
                        # Verify there's a display name in Row 2 at this position
                        if i < len(categories_row) and categories_row[i]:
                            display_name = str(categories_row[i]).strip()
                            print(f"DELETE_CATEGORY: Corresponding display name in Row 2: '{display_name}'")
                        break
            
            if category_start is not None:
                print(f"DELETE_CATEGORY: Category found at column {category_start}")

                # Find the end of this category
                # Category structure: [Category Name | Sub1 | Sub2 | ... | SubN | Total (with %)]
                # We need to find the Total column (which contains the percentage)
                for j in range(category_start + 1, len(categories_row)):
                        if j >= len(categories_row):
                            break

                        next_cell = categories_row[j] if j < len(categories_row) else ""

                        # If we find a percentage, that's the Total column - include it in deletion
                        if next_cell and str(next_cell).strip():
                            next_cell_str = str(next_cell).strip()

                            # Check if it's a percentage (ends with % or contains %)
                            # This is the Total column - we need to include it in the deletion
                            if '%' in next_cell_str:
                                category_end = j  # Include the Total column
                                print(f"DELETE_CATEGORY: Found Total column (with %) at column {j}, will include in deletion")
                                break

                            # Check if it's another category name
                            category_keywords = ['PROJECTS', 'QUIZZES', 'ASSIGNMENT', 'SEATWORK',
                                                 'LABORATORY', 'ACTIVITIES', 'TEST', 'EXAM', 'HOMEWORK',
                                                 'CLASS STANDING', 'CLASS', 'FINAL GRADE']
                            if any(keyword in next_cell_str.upper() for keyword in category_keywords):
                                # Found next category, so previous category ends at j-1
                                # But we need to check if there's a Total column before this
                                # Look backwards from j-1 to find percentage
                                found_total = False
                                for k in range(j - 1, category_start, -1):
                                    if k < len(categories_row) and categories_row[k]:
                                        cell_str = str(categories_row[k]).strip()
                                        if '%' in cell_str:
                                            category_end = k  # Include Total column
                                            found_total = True
                                            print(f"DELETE_CATEGORY: Found Total column (with %) at column {k} before next category")
                                            break
                                
                                if not found_total:
                                    # No Total found, but we still need to include it
                                    # Assume Total is at j-1 (last column before next category)
                                    category_end = j - 1
                                    print(f"DELETE_CATEGORY: No percentage found, assuming Total at column {category_end}")
                                break

                # If no clear end found, look for percentage in remaining columns
                if category_end is None:
                    # Search for percentage column
                    for j in range(category_start + 1, min(category_start + 10, len(categories_row))):
                        if j < len(categories_row) and categories_row[j]:
                            cell_str = str(categories_row[j]).strip()
                            if '%' in cell_str:
                                category_end = j
                                print(f"DELETE_CATEGORY: Found Total column (with %) at column {j}")
                                break
                    
                    # If still no percentage found, use a reasonable default
                    if category_end is None:
                        # Assume standard pattern: category + 5 subcategories + 1 Total = 7 columns
                        category_end = min(category_start + 6, len(categories_row) - 1)
                        print(f"DELETE_CATEGORY: No percentage found, using default end at column {category_end}")

            if category_start is None:
                # Log all category names found for debugging
                found_categories_row2 = [str(cell).strip() for cell in categories_row if cell and str(cell).strip()]
                found_internal_ids_row1 = [str(cell).strip() for cell in row1 if cell and str(cell).strip()]
                print(f"DELETE_CATEGORY: Category '{category_name}' not found in Row 2 (display names) or Row 1 (internal IDs)")
                print(f"DELETE_CATEGORY: Found display names in Row 2: {found_categories_row2[:20]}")
                print(f"DELETE_CATEGORY: Found internal IDs in Row 1: {found_internal_ids_row1[:20]}")
                return {'success': False, 'error': f'Category "{category_name}" not found in the sheet. Available display names: {", ".join(found_categories_row2[:10])}. Available internal IDs: {", ".join(found_internal_ids_row1[:10])}'}

            # Read internal ID from Row 1 (where we wrote it when adding the category)
            internal_id = None
            if len(all_data) > 0:
                row1 = all_data[0]  # Row 1 contains internal IDs
                if category_start < len(row1):
                    internal_id = str(row1[category_start]).strip().upper()
                    if internal_id:
                        print(f"DELETE_CATEGORY: Found internal ID '{internal_id}' in Row 1 at column {category_start}")
                    else:
                        print(f"DELETE_CATEGORY: No internal ID found in Row 1, will try to generate from category name")
                else:
                    print(f"DELETE_CATEGORY: Row 1 doesn't have enough columns, will try to generate internal ID")
            
            # If no internal ID found in Row 1, generate it from category name
            if not internal_id:
                from utils.id_generator import generate_category_id
                internal_id = generate_category_id(category_name)
                print(f"DELETE_CATEGORY: Generated internal ID '{internal_id}' from category name")

            print(f"DELETE_CATEGORY: Category spans from column {category_start} to {category_end} (inclusive)")

            # Calculate how many columns to delete (including Total column)
            # category_end is inclusive, so we need to delete from category_start to category_end (inclusive)
            columns_to_delete = (category_end - category_start + 1)
            print(f"DELETE_CATEGORY: Will delete {columns_to_delete} columns starting at {category_start} (includes Total column at {category_end})")

            # Get sheet properties to get the sheet ID
            spreadsheet = self.sheets_service.spreadsheets().get(spreadsheetId=sheet_id).execute()
            target_sheet_id = None

            for sheet in spreadsheet['sheets']:
                if sheet['properties']['title'] == target_sheet_name:
                    target_sheet_id = sheet['properties']['sheetId']
                    break

            if target_sheet_id is None:
                return {'success': False, 'error': f'Sheet "{target_sheet_name}" not found'}

            # Delete the columns (including Total column)
            # Google Sheets API: endIndex is exclusive, so we use category_end + 1
            delete_request = {
                'deleteDimension': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'dimension': 'COLUMNS',
                        'startIndex': category_start,
                        'endIndex': category_end + 1  # +1 because endIndex is exclusive
                    }
                }
            }

            try:
                result = self.sheets_service.spreadsheets().batchUpdate(
                    spreadsheetId=sheet_id,
                    body={'requests': [delete_request]}
                ).execute()

                print(f"DELETE_CATEGORY: Successfully deleted {columns_to_delete} columns for category '{category_name}' (including Total column)")
            except Exception as delete_error:
                logger.error(f"DELETE_CATEGORY: Failed to delete columns: {str(delete_error)}")
                import traceback
                logger.error(f"DELETE_CATEGORY: Traceback: {traceback.format_exc()}")
                return {
                    'success': False,
                    'error': f'Failed to delete columns: {str(delete_error)}'
                }

            return {
                'success': True,
                'category_name': category_name,
                'internal_id': internal_id,  # Return internal ID so it can be used to delete from SETTINGS
                'columns_deleted': columns_to_delete,
                'start_column': category_start,
                'end_column': category_end,
                'sheet_name': target_sheet_name,
                'message': f"Successfully deleted category '{category_name}' and its {columns_to_delete} columns"
            }

        except Exception as e:
            logger.error(f"Delete category error: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': f'Failed to delete category: {str(e)}'
            }

    def add_column_to_category(self, sheet_id: str, category_name: str, new_column_name: str = None,
                               sheet_name: str = None) -> dict:
        """Add a new column to an existing category"""
        try:
            print(f"➕ ADD_COLUMN: Adding column to category '{category_name}'")

            # Get sheet data
            if sheet_name:
                range_name = f"'{sheet_name}'!A1:AM10"
                print(f"➕ ADD_COLUMN: Requesting raw range: {range_name}")

                result = self.sheets_service.spreadsheets().values().get(
                    spreadsheetId=sheet_id,
                    range=range_name,
                    valueRenderOption='UNFORMATTED_VALUE'
                ).execute()

                raw_data = result.get('values', [])

                if not raw_data or len(raw_data) < 3:
                    return {'success': False, 'error': 'Sheet has insufficient data'}

                all_data = raw_data
                target_sheet_name = sheet_name
            else:
                sheet_data = self.get_sheet_data(sheet_id)
                if not sheet_data['success']:
                    return sheet_data

                if 'data' not in sheet_data or not sheet_data['data']:
                    return {'success': False, 'error': 'Sheet has no data to analyze'}

                all_data = sheet_data['data']
                target_sheet_name = sheet_data['sheet_name']

            print(f"➕ ADD_COLUMN: Target sheet: {target_sheet_name}")

            # Row 1: Category headers
            # Row 2: Column headers (Quiz 1, Quiz 2, etc., Total)
            # Row 3: Max scores
            categories_row = all_data[0]
            columns_row = all_data[1] if len(all_data) > 1 else []
            max_scores_row = all_data[2] if len(all_data) > 2 else []

            # Find the category and its range
            category_start = None
            category_end = None
            total_col = None

            for i, cell in enumerate(categories_row):
                if cell and str(cell).strip().upper() == category_name.upper():
                    category_start = i
                    print(f"➕ ADD_COLUMN: Found category '{category_name}' starting at column {i}")
                    
                    # Find where this category ends (look for next category or Total column)
                    for j in range(i + 1, len(columns_row)):
                        if j < len(columns_row) and columns_row[j]:
                            col_header = str(columns_row[j]).strip().upper()
                            if col_header == 'TOTAL':
                                total_col = j
                                category_end = j - 1
                                print(f"➕ ADD_COLUMN: Found Total column at {j}, category ends at {category_end}")
                                break
                        
                        # Check if we hit another category
                        if j < len(categories_row) and categories_row[j] and j > i:
                            category_end = j - 1
                            print(f"➕ ADD_COLUMN: Category ends at {category_end} (next category starts)")
                            break
                    
                    if category_end is None:
                        category_end = len(columns_row) - 1
                    break

            if category_start is None:
                return {'success': False, 'error': f'Category "{category_name}" not found'}

            if total_col is None:
                return {'success': False, 'error': f'Total column for category "{category_name}" not found'}

            # Count existing subcategories
            existing_subcategories = []
            for i in range(category_start, total_col):
                if i < len(columns_row) and columns_row[i]:
                    col_name = str(columns_row[i]).strip()
                    if col_name and col_name.upper() != 'TOTAL':
                        existing_subcategories.append(col_name)

            print(f"➕ ADD_COLUMN: Existing subcategories: {existing_subcategories}")

            # Generate new column name
            if not new_column_name:
                # Auto-generate based on pattern (e.g., Quiz 1, Quiz 2, ... -> Quiz 6)
                base_name = category_name
                if existing_subcategories:
                    first_col = existing_subcategories[0]
                    # Extract pattern (e.g., "Quiz 1" -> "Quiz")
                    import re
                    match = re.match(r'^(.+?)\s*\d+$', first_col)
                    if match:
                        base_name = match.group(1).strip()
                
                new_number = len(existing_subcategories) + 1
                new_column_name = f"{base_name} {new_number}"
            
            print(f"➕ ADD_COLUMN: New column name: {new_column_name}")

            # Insert 1 column at the Total position (before Total)
            insert_position = total_col
            print(f"➕ ADD_COLUMN: Inserting column at position {insert_position} (before Total)")

            # Step 1: Insert the column
            insert_result = self._insert_columns(sheet_id, target_sheet_name, insert_position, 1)
            if not insert_result['success']:
                return insert_result

            print(f"✅ ADD_COLUMN: Successfully inserted 1 column")

            # Step 2: Update the merged category header to include the new column
            # The category header should now span from category_start to total_col (inclusive of new column)
            new_category_end = total_col  # Now includes the new column
            merge_result = self._merge_cells(
                sheet_id,
                target_sheet_name,
                start_row=0,
                end_row=0,
                start_col=category_start,
                end_col=new_category_end
            )

            if not merge_result['success']:
                print(f"⚠️ ADD_COLUMN: Failed to update merged header: {merge_result.get('error')}")

            # Step 3: Add the new column header in Row 2
            new_col_letter = self._column_index_to_a1(insert_position)
            header_result = self._update_cell_range(
                sheet_id,
                target_sheet_name,
                f"{new_col_letter}2",
                [[new_column_name]]
            )

            if not header_result['success']:
                return header_result

            # Step 4: Add max score (100) in Row 3
            max_score_result = self._update_cell_range(
                sheet_id,
                target_sheet_name,
                f"{new_col_letter}3",
                [['100']]
            )

            if not max_score_result['success']:
                return max_score_result

            # Step 5: Update the Total column formula to include the new column
            # Total column is now at position total_col + 1
            new_total_col = total_col + 1
            new_total_col_letter = self._column_index_to_a1(new_total_col)
            
            # Get the range of subcategory columns
            first_subcol_letter = self._column_index_to_a1(category_start)
            last_subcol_letter = self._column_index_to_a1(new_total_col - 1)

            print(f"🧮 ADD_COLUMN: Updating Total formulas from {first_subcol_letter} to {last_subcol_letter}")

            # Update Total column formulas for rows 4-50
            formula_updates = []
            for row in range(4, 51):
                formula = f"=SUM({first_subcol_letter}{row}:{last_subcol_letter}{row})"
                formula_updates.append({
                    'range': f"'{target_sheet_name}'!{new_total_col_letter}{row}",
                    'values': [[formula]]
                })

            # Update max score in Total column (Row 3)
            new_total_max = str(100 * (len(existing_subcategories) + 1))
            formula_updates.append({
                'range': f"'{target_sheet_name}'!{new_total_col_letter}3",
                'values': [[new_total_max]]
            })

            # Batch update all formulas
            if formula_updates:
                body = {
                    'valueInputOption': 'USER_ENTERED',
                    'data': formula_updates
                }

                self.sheets_service.spreadsheets().values().batchUpdate(
                    spreadsheetId=sheet_id,
                    body=body
                ).execute()

                print(f"✅ ADD_COLUMN: Updated {len(formula_updates)} formulas")

            # Step 6: Apply formatting to the new column
            format_result = self._format_new_column(sheet_id, target_sheet_name, insert_position)
            if not format_result['success']:
                print(f"⚠️ ADD_COLUMN: Failed to format column: {format_result.get('error')}")

            return {
                'success': True,
                'category_name': category_name,
                'new_column_name': new_column_name,
                'column_position': insert_position,
                'message': f"Successfully added '{new_column_name}' to category '{category_name}'"
            }

        except Exception as e:
            logger.error(f"Add column to category error: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': f'Failed to add column to category: {str(e)}'
            }

    def _format_new_column(self, sheet_id: str, sheet_name: str, col_index: int) -> dict:
        """Apply formatting to a newly added column - matches existing category columns"""
        try:
            # Get sheet properties
            spreadsheet = self.sheets_service.spreadsheets().get(spreadsheetId=sheet_id).execute()
            target_sheet_id = None

            for sheet in spreadsheet['sheets']:
                if sheet['properties']['title'] == sheet_name:
                    target_sheet_id = sheet['properties']['sheetId']
                    break

            if target_sheet_id is None:
                return {'success': False, 'error': f'Sheet "{sheet_name}" not found'}

            # Create formatting requests
            requests = []

            # Format the column header (Row 2) - Light blue like other quiz columns
            requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 1,
                        'endRowIndex': 2,
                        'startColumnIndex': col_index,
                        'endColumnIndex': col_index + 1
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'textFormat': {'bold': True, 'fontSize': 10},
                            'horizontalAlignment': 'CENTER',
                            'verticalAlignment': 'MIDDLE',
                            'backgroundColor': {'red': 0.7, 'green': 0.85, 'blue': 1.0},  # Light blue like Quiz columns
                            'borders': {
                                'top': {'style': 'SOLID', 'width': 1},
                                'bottom': {'style': 'SOLID', 'width': 1},
                                'left': {'style': 'SOLID', 'width': 1},
                                'right': {'style': 'SOLID', 'width': 1}
                            }
                        }
                    },
                    'fields': 'userEnteredFormat'
                }
            })

            # Format max score row (Row 3) - Very light blue
            requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 2,
                        'endRowIndex': 3,
                        'startColumnIndex': col_index,
                        'endColumnIndex': col_index + 1
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'horizontalAlignment': 'CENTER',
                            'verticalAlignment': 'MIDDLE',
                            'backgroundColor': {'red': 0.9, 'green': 0.95, 'blue': 1.0},  # Very light blue
                            'borders': {
                                'top': {'style': 'SOLID', 'width': 1},
                                'bottom': {'style': 'SOLID', 'width': 1},
                                'left': {'style': 'SOLID', 'width': 1},
                                'right': {'style': 'SOLID', 'width': 1}
                            }
                        }
                    },
                    'fields': 'userEnteredFormat'
                }
            })

            # Format data cells (Row 4 onwards) - Peach/salmon color like other quiz columns
            requests.append({
                'repeatCell': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 3,
                        'endRowIndex': 50,
                        'startColumnIndex': col_index,
                        'endColumnIndex': col_index + 1
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'horizontalAlignment': 'CENTER',
                            'verticalAlignment': 'MIDDLE',
                            'backgroundColor': {'red': 1.0, 'green': 0.9, 'blue': 0.8}  # Peach/salmon color
                        }
                    },
                    'fields': 'userEnteredFormat'
                }
            })

            # Apply left border only (solid black line on left side like Quiz 3, Quiz 4)
            requests.append({
                'updateBorders': {
                    'range': {
                        'sheetId': target_sheet_id,
                        'startRowIndex': 3,
                        'endRowIndex': 50,
                        'startColumnIndex': col_index,
                        'endColumnIndex': col_index + 1
                    },
                    'left': {'style': 'SOLID', 'width': 1, 'color': {'red': 0.0, 'green': 0.0, 'blue': 0.0}}
                }
            })

            # Execute formatting
            body = {'requests': requests}
            self.sheets_service.spreadsheets().batchUpdate(
                spreadsheetId=sheet_id,
                body=body
            ).execute()

            print(f"✅ FORMAT_COLUMN: Applied peach/salmon formatting to column {col_index}")
            return {'success': True}

        except Exception as e:
            logger.error(f"Format column error: {str(e)}")
            return {'success': False, 'error': str(e)}

    def edit_category_in_sheet(self, sheet_id: str, old_category_name: str, new_category_name: str, new_percentage: str,
                               sheet_name: str = None) -> dict:
        """Edit a category name and percentage in Google Sheet"""
        try:
            print(f"✏️ EDIT_CATEGORY: Editing '{old_category_name}' to '{new_category_name}' with {new_percentage}")

            # 🔥 FIX: Get RAW sheet data directly, same pattern as delete and get_categories
            if sheet_name:
                # Call the Google Sheets API directly to get raw data
                range_name = f"'{sheet_name}'!A1:AM10"  # Get first 10 rows to have enough data
                print(f"✏️ EDIT_CATEGORY: Requesting raw range: {range_name}")

                result = self.sheets_service.spreadsheets().values().get(
                    spreadsheetId=sheet_id,
                    range=range_name,
                    valueRenderOption='UNFORMATTED_VALUE'
                ).execute()

                raw_data = result.get('values', [])

                if not raw_data or len(raw_data) < 1:
                    return {'success': False, 'error': 'Sheet has no data to analyze'}

                all_data = raw_data
                target_sheet_name = sheet_name

                # Create headers from the second row (column names)
                headers = all_data[1] if len(all_data) > 1 else []

            else:
                # Use the original method for default sheet
                sheet_data = self.get_sheet_data(sheet_id)
                if not sheet_data['success']:
                    return sheet_data

                if 'data' not in sheet_data or not sheet_data['data']:
                    return {'success': False, 'error': 'Sheet has no data to analyze'}

                all_data = sheet_data['data']
                headers = sheet_data['headers']
                target_sheet_name = sheet_data['sheet_name']

            print(f"✏️ EDIT_CATEGORY: Target sheet: {target_sheet_name}")
            print(f"✏️ EDIT_CATEGORY: Headers: {headers}")

            # Find the category in Row 1 (categories row)
            if not all_data or len(all_data) < 1:
                return {'success': False, 'error': 'Sheet has no data to analyze'}

            categories_row = all_data[0]  # Row 1 contains category names
            print(f"✏️ EDIT_CATEGORY: Categories row: {categories_row}")

            # Find category position and percentage position
            category_col = None
            percentage_col = None

            for i, cell in enumerate(categories_row):
                if cell and str(cell).strip().upper() == old_category_name.upper():
                    category_col = i
                    print(f"✏️ EDIT_CATEGORY: Found category '{old_category_name}' at column {i}")

                    # Look for the percentage column (usually a few columns after the category)
                    for j in range(i + 1, min(i + 10, len(categories_row))):
                        if j < len(categories_row) and categories_row[j]:
                            cell_value = str(categories_row[j]).strip()
                            if '%' in cell_value:
                                percentage_col = j
                                print(f"✏️ EDIT_CATEGORY: Found percentage at column {j}: '{cell_value}'")
                                break
                    break

            if category_col is None:
                return {'success': False, 'error': f'Category "{old_category_name}" not found in the sheet'}

            # Prepare update requests
            updates = []

            # 🔥 FIX: Handle column letters properly for columns beyond Z
            def get_column_letter(col_index):
                """Convert column index to Excel column letter(s) - supports A-Z, AA-ZZ, AAA-ZZZ, etc."""
                return self._column_index_to_a1(col_index)

            # Update category name in Row 1
            category_col_letter = get_column_letter(category_col)
            updates.append({
                'range': f"'{target_sheet_name}'!{category_col_letter}1",
                'values': [[new_category_name]]
            })
            print(f"✏️ EDIT_CATEGORY: Will update category at {category_col_letter}1")

            # Update percentage if found
            if percentage_col is not None:
                percentage_col_letter = get_column_letter(percentage_col)
                # 🔥 FIX: Format percentage properly
                formatted_percentage = f"{new_percentage}%" if not new_percentage.endswith('%') else new_percentage
                updates.append({
                    'range': f"'{target_sheet_name}'!{percentage_col_letter}1",
                    'values': [[formatted_percentage]]
                })
                print(
                    f"✏️ EDIT_CATEGORY: Will update percentage at {percentage_col_letter}1 to '{formatted_percentage}'")
            else:
                print(f"✏️ EDIT_CATEGORY: No percentage column found for category '{old_category_name}'")

            # Execute batch update
            if updates:
                body = {
                    'valueInputOption': 'USER_ENTERED',
                    'data': updates
                }

                result = self.sheets_service.spreadsheets().values().batchUpdate(
                    spreadsheetId=sheet_id,
                    body=body
                ).execute()

                print(
                    f"✅ EDIT_CATEGORY: Successfully updated category '{old_category_name}' to '{new_category_name}' with {new_percentage}")

                return {
                    'success': True,
                    'old_category_name': old_category_name,
                    'new_category_name': new_category_name,
                    'new_percentage': new_percentage,
                    'category_column': category_col,
                    'percentage_column': percentage_col,
                    'sheet_name': target_sheet_name,
                    'updates_made': len(updates),
                    'message': f"Successfully updated category to '{new_category_name}' with {new_percentage}"
                }
            else:
                return {'success': False, 'error': 'No updates to make'}

        except Exception as e:
            logger.error(f"Edit category error: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': f'Failed to edit category: {str(e)}'
            }

    def get_categories_from_sheet(self, sheet_id: str, sheet_name: str = None) -> dict:
        """Get all categories from Google Sheet"""
        try:
            print(f"📋 GET_CATEGORIES: Getting categories from sheet: {sheet_name}")

            # Call the Google Sheets API directly to get raw data
            range_name = f"'{sheet_name}'!A1:AM3"  # Get first 3 rows
            print(f"📋 GET_CATEGORIES: Requesting raw range: {range_name}")

            result = self.sheets_service.spreadsheets().values().get(
                spreadsheetId=sheet_id,
                range=range_name,
                valueRenderOption='UNFORMATTED_VALUE'
            ).execute()

            raw_data = result.get('values', [])

            if not raw_data or len(raw_data) < 1:
                return {'success': False, 'error': 'Sheet has no data to analyze'}

            categories_row = raw_data[0]  # Row 1 contains category names
            print(f"📋 GET_CATEGORIES: Raw categories row: {categories_row}")

            # Extract unique categories
            categories = []
            seen_categories = set()

            for i, cell in enumerate(categories_row):
                if cell and str(cell).strip():
                    cell_value = str(cell).strip()

                    # 🔥 FIX: Remove quotes if present (both single and double)
                    if (cell_value.startswith("'") and cell_value.endswith("'")) or \
                            (cell_value.startswith('"') and cell_value.endswith('"')):
                        cell_value = cell_value[1:-1]

                    # 🔥 FIX: Skip percentage values (end with % OR contain %)
                    if '%' in cell_value:
                        print(f"📋 GET_CATEGORIES: Skipping percentage: '{cell_value}' at column {i}")
                        continue

                    # Skip numeric values
                    try:
                        float(cell_value)
                        print(f"📋 GET_CATEGORIES: Skipping numeric value: '{cell_value}' at column {i}")
                        continue
                    except ValueError:
                        pass

                    # Skip empty strings after cleaning
                    if not cell_value:
                        continue

                    # Skip system headers
                    skip_headers = ['STUDENT INFO', 'NO.', 'LASTNAME', 'FIRST NAME', 'MIDDLE NAME',
                                    'STUDENT ID', 'CLASS STANDING', 'PRELIM', 'MIDTERM', 'FINAL',
                                    'TOTAL SCORE', 'TERM GRADE', 'Total', 'TOTAL']

                    if cell_value.upper() in [h.upper() for h in skip_headers]:
                        print(f"📋 GET_CATEGORIES: Skipping system header: '{cell_value}' at column {i}")
                        continue

                    # Add category if not already seen
                    if cell_value.upper() not in seen_categories:
                        categories.append(cell_value)
                        seen_categories.add(cell_value.upper())
                        print(f"📋 GET_CATEGORIES: ✅ Found category: '{cell_value}' at column {i}")

            print(f"📋 GET_CATEGORIES: Final categories found: {categories}")

            return {
                'success': True,
                'categories': categories,
                'total_categories': len(categories),
                'sheet_name': sheet_name,
                'message': f"Found {len(categories)} categories in sheet"
            }

        except Exception as e:
            logger.error(f"Get categories error: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': f'Failed to get categories: {str(e)}'
            }

    # ===== AUTO-MAPPING SYSTEM =====
    
    def auto_map_columns_with_confidence(self, sheet_id: str, import_columns: list, 
                                       sheet_name: str = None, user_id: int = None) -> dict:
        """
        Automatically map import columns to target columns with confidence scoring.
        Returns decisions that can be auto-applied or reviewed by user.
        """
        try:
            # Get existing columns with analysis
            existing_analysis = self.analyze_columns_for_mapping(sheet_id, import_columns, sheet_name, user_id)
            
            if not existing_analysis['success']:
                return existing_analysis
            
            # Auto-mapping algorithm
            decisions = []
            used_targets = set()
            
            for import_col in import_columns:
                decision = self._find_best_mapping(
                    import_col, existing_analysis['columnAnalysis'], used_targets
                )
                decisions.append(decision)
                if decision['targetColumn']:
                    used_targets.add(decision['targetColumn'])
            
            # Calculate overall confidence
            overall_confidence = self._calculate_overall_confidence(decisions)
            
            # Generate warnings and summary
            warnings = self._generate_warnings(decisions)
            summary = self._generate_summary(decisions)
            
            return {
                'success': True,
                'decisions': decisions,
                'overallConfidence': overall_confidence,
                'confidenceLevel': 'high' if overall_confidence >= 0.8 else 'medium' if overall_confidence >= 0.6 else 'low',
                'autoApply': overall_confidence >= 0.8,
                'warnings': warnings,
                'summary': summary,
                'totalColumns': len(import_columns),
                'mappedColumns': len([d for d in decisions if d['targetColumn']]),
                'newColumns': len([d for d in decisions if d['action'] == 'new'])
            }
            
        except Exception as e:
            logger.error(f"Auto-map columns error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to auto-map columns: {str(e)}'
            }
    
    def _normalize_header(self, header: str) -> str:
        """Advanced header normalization with synonyms"""
        if not header:
            return ""
            
        # Remove punctuation, extra spaces, convert case
        clean = re.sub(r'[^\w\s]', '', header.lower().strip())
        clean = re.sub(r'\s+', ' ', clean)
        
        # Handle common variations with synonyms
        synonyms = {
            'student id': ['sid', 'id', 'student number', 'student_id', 'studentid'],
            'first name': ['firstname', 'given name', 'first', 'fn', 'first_name'],
            'last name': ['lastname', 'surname', 'family name', 'last', 'ln', 'last_name'],
            'middle name': ['middlename', 'middle', 'mi', 'middle_name'],
            'quiz': ['qz', 'q', 'quiz exam'],
            'midterm': ['mid term', 'midterm exam', 'mid exam', 'midterm test'],
            'final': ['final exam', 'final test', 'fin', 'final assessment'],
            'assignment': ['ass', 'assign', 'homework', 'hw', 'assignment work'],
            'project': ['proj', 'project work', 'project assignment'],
            'exam': ['test', 'assessment', 'evaluation', 'examination'],
            'lab': ['laboratory', 'lab work', 'lab exercise'],
            'attendance': ['att', 'attend', 'presence'],
            'participation': ['part', 'class participation', 'class part'],
            'total': ['tot', 'sum', 'grand total', 'final total'],
            'average': ['avg', 'mean', 'overall average'],
            'grade': ['gr', 'final grade', 'letter grade']
        }
        
        # Find synonym match
        for canonical, variants in synonyms.items():
            if any(variant in clean for variant in variants + [canonical]):
                return canonical
        
        return clean
    
    def _find_best_mapping(self, import_col: str, existing_columns: list, used_targets: set) -> dict:
        """Find best mapping for an import column using multi-layer matching"""
        # Layer 1: Exact & Normalized Matching
        exact_match = self._exact_match(import_col, existing_columns, used_targets)
        if exact_match:
            return exact_match
        
        # Layer 2: Semantic Similarity Matching
        semantic_match = self._semantic_match(import_col, existing_columns, used_targets)
        if semantic_match and semantic_match['confidence'] >= 0.8:
            return semantic_match
        
        # Layer 3: Pattern-Based Assessment Matching
        pattern_match = self._pattern_match_assessments(import_col, existing_columns, used_targets)
        if pattern_match and pattern_match['confidence'] >= 0.7:
            return pattern_match
        
        # Layer 4: Fuzzy Matching (fallback)
        fuzzy_match = self._fuzzy_match(import_col, existing_columns, used_targets)
        if fuzzy_match and fuzzy_match['confidence'] >= 0.6:
            return fuzzy_match
        
        # No suitable match found - create new column
        return {
            'importColumn': import_col,
            'targetColumn': None,
            'action': 'new',
            'newColumnTitle': import_col.title(),
            'confidence': 1.0,
            'risk': 'none',
            'method': 'new_column',
            'reason': 'No suitable match found - creating new column'
        }
    
    def _exact_match(self, import_col: str, existing_columns: list, used_targets: set) -> dict:
        """Exact matches after normalization"""
        normalized_import = self._normalize_header(import_col)
        
        # If the import is a bare category (no index) for non-exam categories,
        # avoid mapping onto filled columns; prefer new/empty columns later.
        cat, idx_num = self._parse_category_and_index(import_col)
        is_non_exam = self._is_non_exam_scored_category(cat)

        for col_info in existing_columns:
            if col_info['columnName'] in used_targets:
                continue
                
            normalized_target = self._normalize_header(col_info['columnName'])
            
            if normalized_import == normalized_target:
                # For non-exam categories, never map onto filled columns; always prefer new.
                if is_non_exam and not col_info.get('isEmpty', False):
                    continue
                # Determine action based on existing data
                action = 'replace' if col_info['isEmpty'] else 'merge'
                risk = 'none' if col_info['isEmpty'] else col_info['availability']
                
                return {
                    'importColumn': import_col,
                    'targetColumn': col_info['columnName'],
                    'action': action,
                    'confidence': 1.0,
                    'risk': risk,
                    'method': 'exact_match',
                    'reason': f'Exact match: {import_col} → {col_info["columnName"]}'
                }
        
        return None
    
    def _semantic_match(self, import_col: str, existing_columns: list, used_targets: set) -> dict:
        """Use string similarity for fuzzy matching"""
        from difflib import SequenceMatcher
        
        cat, idx_num = self._parse_category_and_index(import_col)
        is_non_exam = self._is_non_exam_scored_category(cat)

        best_match = None
        best_score = 0
        
        for col_info in existing_columns:
            if col_info['columnName'] in used_targets:
                continue
            
            # Calculate similarity using SequenceMatcher
            similarity = SequenceMatcher(None, import_col.lower(), col_info['columnName'].lower()).ratio()
            
            # Token-based similarity
            import_tokens = set(self._normalize_header(import_col).split())
            target_tokens = set(self._normalize_header(col_info['columnName']).split())
            
            if import_tokens or target_tokens:
                token_overlap = len(import_tokens & target_tokens) / len(import_tokens | target_tokens)
                # Weighted score: 60% string similarity, 40% token overlap
                combined_score = 0.6 * similarity + 0.4 * token_overlap
            else:
                combined_score = similarity
            
            # For non-exam categories, never map onto filled columns via semantic
            if is_non_exam and not col_info.get('isEmpty', False):
                continue

            if combined_score > best_score and combined_score >= 0.7:
                best_score = combined_score
                best_match = col_info
        
        if best_match:
            action = 'replace' if best_match['isEmpty'] else 'merge'
            risk = 'none' if best_match['isEmpty'] else best_match['availability']
            
            return {
                'importColumn': import_col,
                'targetColumn': best_match['columnName'],
                'action': action,
                'confidence': best_score,
                'risk': risk,
                'method': 'semantic_match',
                'reason': f'Semantic match: {import_col} → {best_match["columnName"]} (similarity: {best_score:.2f})'
            }
        
        return None
    
    def _pattern_match_assessments(self, import_col: str, existing_columns: list, used_targets: set) -> dict:
        """Match assessment patterns (Quiz 1, Midterm, etc.)"""
        import_patterns = {
            'quiz': r'(quiz|qz|q)\s*(\d+)',
            'midterm': r'(midterm|mid)\s*(\d+)?',
            'final': r'(final|fin)\s*(\d+)?',
            'assignment': r'(assignment|ass|assign|hw|homework)\s*(\d+)',
            'project': r'(project|proj)\s*(\d+)?',
            'exam': r'(exam|test)\s*(\d+)',
            'lab': r'(lab|laboratory)\s*(\d+)'
        }
        
        for pattern_type, pattern in import_patterns.items():
            match = re.search(pattern, import_col.lower())
            if match:
                # Find matching pattern in targets
                for col_info in existing_columns:
                    if col_info['columnName'] in used_targets:
                        continue
                        
                    target_match = re.search(pattern, col_info['columnName'].lower())
                    if target_match:
                        # Check if numbers match (if present)
                        import_num = match.group(2) if match.group(2) else None
                        target_num = target_match.group(2) if target_match.group(2) else None
                        
                        if import_num == target_num or (not import_num and not target_num):
                            confidence = 0.95 if import_num == target_num else 0.85
                            action = 'replace' if col_info['isEmpty'] else 'merge'
                            risk = 'none' if col_info['isEmpty'] else col_info['availability']
                            
                            return {
                                'importColumn': import_col,
                                'targetColumn': col_info['columnName'],
                                'action': action,
                                'confidence': confidence,
                                'risk': risk,
                                'method': f'pattern_{pattern_type}',
                                'reason': f'Pattern match: {pattern_type} {import_num or ""} → {col_info["columnName"]}'
                            }
        
        return None
    
    def _fuzzy_match(self, import_col: str, existing_columns: list, used_targets: set) -> dict:
        """Fallback fuzzy matching for remaining columns"""
        best_match = None
        best_score = 0
        
        for col_info in existing_columns:
            if col_info['columnName'] in used_targets:
                continue
            
            # Simple fuzzy matching based on common substrings
            import_lower = import_col.lower()
            target_lower = col_info['columnName'].lower()
            
            # Check for common words
            import_words = set(import_lower.split())
            target_words = set(target_lower.split())
            
            common_words = import_words & target_words
            if common_words:
                # Calculate score based on common words and length similarity
                word_score = len(common_words) / max(len(import_words), len(target_words))
                length_score = 1 - abs(len(import_lower) - len(target_lower)) / max(len(import_lower), len(target_lower))
                
                combined_score = 0.7 * word_score + 0.3 * length_score
                
                if combined_score > best_score and combined_score >= 0.5:
                    best_score = combined_score
                    best_match = col_info
        
        if best_match:
            action = 'replace' if best_match['isEmpty'] else 'merge'
            risk = 'none' if best_match['isEmpty'] else best_match['availability']
            
            return {
                'importColumn': import_col,
                'targetColumn': best_match['columnName'],
                'action': action,
                'confidence': best_score,
                'risk': risk,
                'method': 'fuzzy_match',
                'reason': f'Fuzzy match: {import_col} → {best_match["columnName"]} (score: {best_score:.2f})'
            }
        
        return None
    
    def _calculate_overall_confidence(self, decisions: list) -> float:
        """Calculate overall confidence score for all mappings"""
        if not decisions:
            return 0.0
        
        # Weight by importance (exact matches > semantic > pattern > fuzzy > new)
        weights = {
            'exact_match': 1.0,
            'semantic_match': 0.9,
            'pattern_quiz': 0.85,
            'pattern_midterm': 0.85,
            'pattern_final': 0.85,
            'pattern_assignment': 0.8,
            'pattern_project': 0.8,
            'pattern_exam': 0.8,
            'pattern_lab': 0.8,
            'fuzzy_match': 0.7,
            'new_column': 0.6
        }
        
        weighted_sum = 0.0
        total_weight = 0.0
        
        for decision in decisions:
            weight = weights.get(decision['method'], 0.5)
            weighted_sum += decision['confidence'] * weight
            total_weight += weight
        
        return weighted_sum / total_weight if total_weight > 0 else 0.0
    
    def _generate_warnings(self, decisions: list) -> list:
        """Generate warnings for risky mappings"""
        warnings = []
        
        for decision in decisions:
            if decision['action'] == 'replace' and decision['risk'] in ['medium', 'high']:
                warnings.append(f"High risk: '{decision['importColumn']}' will overwrite existing data in '{decision['targetColumn']}'")
            
            if decision['confidence'] < 0.6:
                warnings.append(f"Low confidence: '{decision['importColumn']}' mapping may not be accurate")
            
            if decision['method'] == 'new_column':
                warnings.append(f"New column: '{decision['importColumn']}' will be created as '{decision['newColumnTitle']}'")
        
        return warnings
    
    def _generate_summary(self, decisions: list) -> list:
        """Generate summary of import actions"""
        summary = []
        
        mapped_count = len([d for d in decisions if d['targetColumn']])
        new_count = len([d for d in decisions if d['action'] == 'new'])
        replace_count = len([d for d in decisions if d['action'] == 'replace'])
        merge_count = len([d for d in decisions if d['action'] == 'merge'])
        
        if mapped_count > 0:
            summary.append(f"{mapped_count} columns will be mapped to existing columns")
        
        if new_count > 0:
            summary.append(f"{new_count} new columns will be created")
        
        if replace_count > 0:
            summary.append(f"{replace_count} columns will be replaced")
        
        if merge_count > 0:
            summary.append(f"{merge_count} columns will be merged (fill blanks only)")
        
        return summary

