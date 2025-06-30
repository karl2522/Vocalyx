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
