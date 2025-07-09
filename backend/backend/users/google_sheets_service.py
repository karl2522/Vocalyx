import logging
import requests
from typing import Dict, Optional
from django.conf import settings

logger = logging.getLogger(__name__)


class GoogleSheetsService:
    """
    Service for Google Sheets operations using user access tokens.
    """

    SHEETS_API_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets"
    DRIVE_API_BASE_URL = "https://www.googleapis.com/drive/v3"

    def __init__(self, access_token: str):
        """
        Initialize with user's access token.

        Args:
            access_token: Google OAuth2 access token with drive.file scope
        """
        self.access_token = access_token
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

    def copy_template_sheet(self, template_file_id: str, new_name: str) -> Dict:
        """
        Copy a template Google Sheet to user's Drive.

        Args:
            template_file_id: ID of the template sheet to copy
            new_name: Name for the copied sheet

        Returns:
            Dict containing copied file info or error
        """
        try:
            copy_url = f"{self.DRIVE_API_BASE_URL}/files/{template_file_id}/copy"

            copy_data = {
                "name": new_name
            }

            response = requests.post(
                copy_url,
                headers=self.headers,
                json=copy_data,
                timeout=15
            )

            if response.status_code == 200:
                file_info = response.json()
                return {
                    'success': True,
                    'file': {
                        'id': file_info.get('id'),
                        'name': file_info.get('name'),
                        'webViewLink': file_info.get('webViewLink'),
                        'embedLink': f"https://docs.google.com/spreadsheets/d/{file_info.get('id')}/edit?usp=sharing&rm=minimal&chrome=false&widget=true&headers=false"
                    }
                }
            else:
                # If direct copy fails (e.g., due to scope limitations), try alternative approach
                logger.warning(f"Direct copy failed with {response.status_code}, trying alternative approach")
                print(f"🔄 Direct copy failed with {response.status_code}, trying alternative approach to copy template content")
                return self.create_from_template_content(template_file_id, new_name)

        except requests.exceptions.RequestException as e:
            logger.error(f"Sheets copy template failed: {str(e)}")
            return {
                'success': False,
                'error': f'Request failed: {str(e)}'
            }

    def create_from_template_content(self, template_file_id: str, new_name: str) -> Dict:
        """
        Alternative approach: Create a new spreadsheet and copy template content.
        This works with drive.file scope when direct file copying doesn't.

        Args:
            template_file_id: ID of the template sheet to copy content from
            new_name: Name for the new sheet

        Returns:
            Dict containing new file info or error
        """
        try:
            # Step 1: Create a new blank spreadsheet
            create_url = "https://sheets.googleapis.com/v4/spreadsheets"
            create_data = {
                "properties": {
                    "title": new_name
                }
            }

            response = requests.post(
                create_url,
                headers=self.headers,
                json=create_data,
                timeout=15
            )

            if response.status_code != 200:
                return {
                    'success': False,
                    'error': f'Failed to create new spreadsheet: {response.status_code}',
                    'details': response.text
                }

            new_sheet_info = response.json()
            new_sheet_id = new_sheet_info.get('spreadsheetId')
            print(f"📝 Created new blank spreadsheet: {new_sheet_id}")

            # Step 2: Read template content directly using public access
            # Try to read the template as a public sheet (no authentication required)
            template_values_url = f"https://sheets.googleapis.com/v4/spreadsheets/{template_file_id}/values/A1:ZZ1000"
            print(f"🔍 Attempting to read template content from: {template_file_id}")
            
            # Try with user token first
            template_response = requests.get(
                template_values_url,
                headers=self.headers,
                timeout=15
            )
            
            template_values = []
            if template_response.status_code == 200:
                template_data = template_response.json()
                template_values = template_data.get('values', [])
                print(f"✅ Successfully read template content with user auth: {len(template_values)} rows")
            else:
                # Try without authentication (public sheet)
                print(f"⚠️ Reading template with user auth failed ({template_response.status_code}), trying public API key access")
                print(f"   Error details: {template_response.text[:200]}...")
                
                api_key = self._get_api_key()
                if api_key:
                    template_response = requests.get(
                        f"{template_values_url}?key={api_key}",
                        timeout=15
                    )
                    
                    if template_response.status_code == 200:
                        template_data = template_response.json()
                        template_values = template_data.get('values', [])
                        print(f"✅ Successfully read template content via public API: {len(template_values)} rows")
                    else:
                        print(f"❌ Failed to read template content via API key: {template_response.status_code}")
                        print(f"   Error details: {template_response.text[:200]}...")
                else:
                    print("❌ No Google API key configured - cannot read public template")

            # Step 3: Write template content to new sheet (if we have any content)
            if template_values:
                print(f"📋 Writing {len(template_values)} rows to new spreadsheet")
                update_url = f"https://sheets.googleapis.com/v4/spreadsheets/{new_sheet_id}/values/A1"
                update_data = {
                    "values": template_values,
                    "majorDimension": "ROWS"
                }

                update_response = requests.put(
                    update_url,
                    headers=self.headers,
                    json=update_data,
                    params={'valueInputOption': 'RAW'},
                    timeout=15
                )
                
                if update_response.status_code == 200:
                    print("✅ Successfully wrote template content to new sheet")
                else:
                    print(f"❌ Failed to write template content: {update_response.status_code}")
                    print(f"   Error details: {update_response.text[:200]}...")
            else:
                print("⚠️ No template content found or accessible - created blank sheet")

            # Step 4: Get the web view link
            file_info_url = f"{self.DRIVE_API_BASE_URL}/files/{new_sheet_id}"
            file_response = requests.get(
                file_info_url,
                headers=self.headers,
                params={'fields': 'webViewLink'},
                timeout=10
            )

            web_view_link = None
            if file_response.status_code == 200:
                web_view_link = file_response.json().get('webViewLink')

            return {
                'success': True,
                'file': {
                    'id': new_sheet_id,
                    'name': new_name,
                    'webViewLink': web_view_link or f"https://docs.google.com/spreadsheets/d/{new_sheet_id}/edit",
                    'embedLink': f"https://docs.google.com/spreadsheets/d/{new_sheet_id}/edit?usp=sharing&rm=minimal&chrome=false&widget=true&headers=false"
                }
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"Create from template content failed: {str(e)}")
            return {
                'success': False,
                'error': f'Request failed: {str(e)}'
            }

    def _get_api_key(self):
        """
        Get Google API key for public sheet access.
        This should be configured in Django settings.
        """
        from django.conf import settings
        return getattr(settings, 'GOOGLE_API_KEY', None)

    def get_sheet_info(self, spreadsheet_id: str) -> Dict:
        """
        Get basic information about a spreadsheet.

        Args:
            spreadsheet_id: ID of the spreadsheet

        Returns:
            Dict containing sheet info or error
        """
        try:
            url = f"{self.SHEETS_API_BASE_URL}/{spreadsheet_id}"
            params = {
                'fields': 'spreadsheetId,properties.title,sheets.properties'
            }

            response = requests.get(
                url,
                headers=self.headers,
                params=params,
                timeout=10
            )

            if response.status_code == 200:
                sheet_data = response.json()
                return {
                    'success': True,
                    'sheet': {
                        'id': sheet_data.get('spreadsheetId'),
                        'title': sheet_data.get('properties', {}).get('title'),
                        'sheets': [
                            {
                                'title': sheet.get('properties', {}).get('title'),
                                'sheetId': sheet.get('properties', {}).get('sheetId')
                            }
                            for sheet in sheet_data.get('sheets', [])
                        ]
                    }
                }
            else:
                return {
                    'success': False,
                    'error': f'Failed to get sheet info: {response.status_code}',
                    'details': response.text
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"Get sheet info failed: {str(e)}")
            return {
                'success': False,
                'error': f'Request failed: {str(e)}'
            }

    def update_sheet_permissions(self, file_id: str, make_public_readable: bool = False, make_editable: bool = False) -> Dict:
        """
        Update sheet permissions.

        Args:
            file_id: ID of the sheet file
            make_public_readable: Whether to make sheet publicly readable (view-only)
            make_editable: Whether to make sheet publicly editable (for embedded editing)

        Returns:
            Dict containing success status
        """
        try:
            permissions_url = f"{self.DRIVE_API_BASE_URL}/files/{file_id}/permissions"

            if make_public_readable or make_editable:
                # Use 'writer' role for editing, 'reader' for view-only
                role = "writer" if make_editable else "reader"
                
                permission_data = {
                    "role": role,
                    "type": "anyone"
                }

                response = requests.post(
                    permissions_url,
                    headers=self.headers,
                    json=permission_data,
                    timeout=10
                )

                if response.status_code == 200:
                    message = 'Sheet made publicly editable' if make_editable else 'Sheet made publicly readable'
                    return {
                        'success': True,
                        'message': message
                    }
                else:
                    return {
                        'success': False,
                        'error': f'Failed to update permissions: {response.status_code}',
                        'details': response.text
                    }
            else:
                return {
                    'success': True,
                    'message': 'No permission changes needed'
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"Update permissions failed: {str(e)}")
            return {
                'success': False,
                'error': f'Request failed: {str(e)}'
            }

    def get_user_sheets(self) -> Dict:
        """
        Get list of user's Google Sheets.

        Returns:
            Dict containing sheets list or error
        """
        try:
            url = f"{self.DRIVE_API_BASE_URL}/files"
            params = {
                'q': "mimeType='application/vnd.google-apps.spreadsheet'",
                'fields': 'files(id,name,createdTime,modifiedTime,webViewLink)',
                'pageSize': 50
            }

            response = requests.get(
                url,
                headers=self.headers,
                params=params,
                timeout=15
            )

            if response.status_code == 200:
                files_data = response.json()
                return {
                    'success': True,
                    'sheets': [
                        {
                            'id': file.get('id'),
                            'name': file.get('name'),
                            'createdTime': file.get('createdTime'),
                            'modifiedTime': file.get('modifiedTime'),
                            'webViewLink': file.get('webViewLink'),
                            'embedLink': f"https://docs.google.com/spreadsheets/d/{file.get('id')}/edit?usp=sharing&rm=minimal&chrome=false&widget=true&headers=false"
                        }
                        for file in files_data.get('files', [])
                    ]
                }
            else:
                return {
                    'success': False,
                    'error': f'Failed to get sheets: {response.status_code}',
                    'details': response.text
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"Get user sheets failed: {str(e)}")
            return {
                'success': False,
                'error': f'Request failed: {str(e)}'
            }

    def get_sheet_data(self, sheet_id: str, sheet_name: Optional[str] = None) -> Dict:
        """
        Get data from a Google Sheet for voice commands.

        Args:
            sheet_id: ID of the spreadsheet
            sheet_name: Optional name of specific sheet (if None, uses first sheet)

        Returns:
            Dict containing sheet data or error
        """
        try:
            if sheet_name:
                # Get specific sheet data
                return self.get_specific_sheet_data(sheet_id, sheet_name)

            # Original behavior - get first sheet
            url = f"{self.SHEETS_API_BASE_URL}/{sheet_id}"

            response = requests.get(
                url,
                headers=self.headers,
                timeout=10
            )

            if response.status_code != 200:
                return {
                    'success': False,
                    'error': f'Failed to get sheet metadata: {response.status_code}',
                    'details': response.text
                }

            spreadsheet = response.json()

            # Get the first sheet name
            first_sheet = spreadsheet['sheets'][0]['properties']['title']

            # Use the specific sheet method
            return self.get_specific_sheet_data(sheet_id, first_sheet)

        except Exception as e:
            logger.error(f"Get sheet data error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to get sheet data: {str(e)}'
            }

    def get_all_sheets_data(self, sheet_id: str) -> Dict:
        """
        Get data from ALL sheets in a Google Spreadsheet.

        Args:
            sheet_id: ID of the spreadsheet

        Returns:
            Dict containing all sheets data or error
        """
        try:
            # Get sheet metadata first
            url = f"{self.SHEETS_API_BASE_URL}/{sheet_id}"

            response = requests.get(
                url,
                headers=self.headers,
                timeout=10
            )

            if response.status_code != 200:
                return {
                    'success': False,
                    'error': f'Failed to get sheet metadata: {response.status_code}',
                    'details': response.text
                }

            spreadsheet = response.json()
            all_sheets = []

            # 🔥 Loop through ALL sheets instead of just the first one
            for sheet_info in spreadsheet['sheets']:
                sheet_name = sheet_info['properties']['title']
                sheet_id_internal = sheet_info['properties']['sheetId']

                # Get data for this specific sheet
                range_name = f"'{sheet_name}'!A:Z"  # 🔥 Use sheet name in quotes for safety
                values_url = f"{self.SHEETS_API_BASE_URL}/{sheet_id}/values/{range_name}"

                values_response = requests.get(
                    values_url,
                    headers=self.headers,
                    timeout=10
                )

                if values_response.status_code == 200:
                    values_data = values_response.json()
                    values = values_data.get('values', [])

                    if values:  # Only add sheets that have data
                        headers = values[0] if values else []
                        tableData = values[1:] if len(values) > 1 else []

                        all_sheets.append({
                            'sheet_name': sheet_name,
                            'sheet_id': sheet_id_internal,
                            'headers': headers,
                            'tableData': tableData,
                            'row_count': len(tableData)
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

    def get_specific_sheet_data(self, sheet_id: str, sheet_name: str) -> Dict:
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
            range_name = f"'{sheet_name}'!A:Z"  # 🔥 Use specific sheet name
            values_url = f"{self.SHEETS_API_BASE_URL}/{sheet_id}/values/{range_name}"

            values_response = requests.get(
                values_url,
                headers=self.headers,
                timeout=10
            )

            if values_response.status_code != 200:
                return {
                    'success': False,
                    'error': f'Failed to get sheet data: {values_response.status_code}',
                    'details': values_response.text
                }

            values_data = values_response.json()
            values = values_data.get('values', [])

            if not values:
                return {
                    'success': False,
                    'error': f'No data found in sheet "{sheet_name}"'
                }

            # First row as headers
            headers = values[0] if values else []
            # Rest as table data
            tableData = values[1:] if len(values) > 1 else []

            return {
                'success': True,
                'headers': headers,
                'tableData': tableData,
                'sheet_name': sheet_name
            }

        except Exception as e:
            logger.error(f"Get specific sheet data error: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to get sheet data: {str(e)}'
            }