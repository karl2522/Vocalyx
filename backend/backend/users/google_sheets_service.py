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
                        'embedLink': f"https://docs.google.com/spreadsheets/d/{file_info.get('id')}/edit?usp=sharing&rm=embedded"
                    }
                }
            else:
                return {
                    'success': False,
                    'error': f'Failed to copy template: {response.status_code}',
                    'details': response.text
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Sheets copy template failed: {str(e)}")
            return {
                'success': False,
                'error': f'Request failed: {str(e)}'
            }
    
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
    
    def update_sheet_permissions(self, file_id: str, make_public_readable: bool = False) -> Dict:
        """
        Update sheet permissions.
        
        Args:
            file_id: ID of the sheet file
            make_public_readable: Whether to make sheet publicly readable
            
        Returns:
            Dict containing success status
        """
        try:
            permissions_url = f"{self.DRIVE_API_BASE_URL}/files/{file_id}/permissions"
            
            if make_public_readable:
                permission_data = {
                    "role": "reader",
                    "type": "anyone"
                }
                
                response = requests.post(
                    permissions_url,
                    headers=self.headers,
                    json=permission_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    return {
                        'success': True,
                        'message': 'Sheet made publicly readable'
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
                            'embedLink': f"https://docs.google.com/spreadsheets/d/{file.get('id')}/edit?usp=sharing&rm=embedded"
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