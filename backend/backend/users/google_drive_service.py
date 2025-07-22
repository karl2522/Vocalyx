import logging
import requests
from typing import List, Dict, Optional, BinaryIO
from django.conf import settings

logger = logging.getLogger(__name__)

class GoogleDriveService:
    """
    Service class for interacting with Google Drive API using user access tokens.
    """
    
    DRIVE_API_BASE_URL = "https://www.googleapis.com/drive/v3"
    UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files"
    
    def __init__(self, access_token: str):
        """
        Initialize the service with a user's access token.
        
        Args:
            access_token: Google OAuth2 access token with Drive scope
        """
        self.access_token = access_token
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
    
    def test_connection(self) -> Dict:
        """
        Test the connection by getting user's Drive info.
        
        Returns:
            Dict containing success status and user info or error message
        """
        try:
            response = requests.get(
                f"{self.DRIVE_API_BASE_URL}/about",
                headers=self.headers,
                params={'fields': 'user'},
                timeout=10
            )
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'user_info': response.json()
                }
            else:
                return {
                    'success': False,
                    'error': f'Drive API error: {response.status_code}',
                    'details': response.text
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Drive API connection test failed: {str(e)}")
            return {
                'success': False,
                'error': f'Connection failed: {str(e)}'
            }
    
    def list_files(self, 
                   query: Optional[str] = None, 
                   page_size: int = 10,
                   folder_id: Optional[str] = None) -> Dict:
        """
        List files in the user's Drive.
        
        Args:
            query: Search query (optional)
            page_size: Number of files to return (max 1000)
            folder_id: ID of folder to search in (optional)
            
        Returns:
            Dict containing files list or error message
        """
        try:
            params = {
                'pageSize': min(page_size, 1000),
                'fields': 'files(id,name,mimeType,size,createdTime,modifiedTime,parents)',
            }
            
            # Build query string
            query_parts = []
            if query:
                query_parts.append(f"name contains '{query}'")
            if folder_id:
                query_parts.append(f"'{folder_id}' in parents")
            
            if query_parts:
                params['q'] = ' and '.join(query_parts)
            
            response = requests.get(
                f"{self.DRIVE_API_BASE_URL}/files",
                headers=self.headers,
                params=params,
                timeout=15
            )
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'files': response.json().get('files', [])
                }
            else:
                return {
                    'success': False,
                    'error': f'Failed to list files: {response.status_code}',
                    'details': response.text
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Drive API list files failed: {str(e)}")
            return {
                'success': False,
                'error': f'Request failed: {str(e)}'
            }
    
    def upload_file(self, 
                    file_content: bytes,
                    filename: str,
                    mime_type: str = 'application/octet-stream',
                    folder_id: Optional[str] = None) -> Dict:
        """
        Upload a file to Google Drive.
        
        Args:
            file_content: File content as bytes
            filename: Name for the file
            mime_type: MIME type of the file
            folder_id: ID of folder to upload to (optional)
            
        Returns:
            Dict containing file info or error message
        """
        try:
            # Prepare metadata
            metadata = {
                'name': filename,
            }
            
            if folder_id:
                metadata['parents'] = [folder_id]
            
            # Use multipart upload
            files = {
                'metadata': (None, str(metadata).replace("'", '"'), 'application/json'),
                'media': (filename, file_content, mime_type)
            }
            
            # Remove Content-Type header for multipart request
            upload_headers = {'Authorization': f'Bearer {self.access_token}'}
            
            response = requests.post(
                f"{self.UPLOAD_URL}?uploadType=multipart",
                headers=upload_headers,
                files=files,
                timeout=30
            )
            
            if response.status_code == 200:
                file_info = response.json()
                return {
                    'success': True,
                    'file': {
                        'id': file_info.get('id'),
                        'name': file_info.get('name'),
                        'webViewLink': f"https://drive.google.com/file/d/{file_info.get('id')}/view"
                    }
                }
            else:
                return {
                    'success': False,
                    'error': f'Upload failed: {response.status_code}',
                    'details': response.text
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Drive API upload failed: {str(e)}")
            return {
                'success': False,
                'error': f'Upload request failed: {str(e)}'
            }
    
    def create_folder(self, 
                      folder_name: str,
                      parent_folder_id: Optional[str] = None) -> Dict:
        """
        Create a folder in Google Drive.
        
        Args:
            folder_name: Name for the new folder
            parent_folder_id: ID of parent folder (optional)
            
        Returns:
            Dict containing folder info or error message
        """
        try:
            metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            
            if parent_folder_id:
                metadata['parents'] = [parent_folder_id]
            
            response = requests.post(
                f"{self.DRIVE_API_BASE_URL}/files",
                headers=self.headers,
                json=metadata,
                timeout=15
            )
            
            if response.status_code == 200:
                folder_info = response.json()
                return {
                    'success': True,
                    'folder': {
                        'id': folder_info.get('id'),
                        'name': folder_info.get('name'),
                        'webViewLink': f"https://drive.google.com/drive/folders/{folder_info.get('id')}"
                    }
                }
            else:
                return {
                    'success': False,
                    'error': f'Folder creation failed: {response.status_code}',
                    'details': response.text
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Drive API create folder failed: {str(e)}")
            return {
                'success': False,
                'error': f'Request failed: {str(e)}'
            }
    
    def get_file_content(self, file_id: str) -> Dict:
        """
        Download file content from Google Drive.
        
        Args:
            file_id: ID of the file to download
            
        Returns:
            Dict containing file content or error message
        """
        try:
            response = requests.get(
                f"{self.DRIVE_API_BASE_URL}/files/{file_id}",
                headers=self.headers,
                params={'alt': 'media'},
                timeout=30
            )
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'content': response.content,
                    'content_type': response.headers.get('content-type')
                }
            else:
                return {
                    'success': False,
                    'error': f'Download failed: {response.status_code}',
                    'details': response.text
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Drive API download failed: {str(e)}")
            return {
                'success': False,
                'error': f'Download request failed: {str(e)}'
            }
    
    def delete_file(self, file_id: str) -> Dict:
        """
        Permanently delete a file from Google Drive.

        Args:
            file_id: The ID of the file to delete.

        Returns:
            Dict containing success status or error message.
        """
        try:
            response = requests.delete(
                f"{self.DRIVE_API_BASE_URL}/files/{file_id}",
                headers=self.headers,
                timeout=15
            )

            if response.status_code == 204:
                return {'success': True}
            else:
                return {
                    'success': False,
                    'error': f'File deletion failed: {response.status_code}',
                    'details': response.text
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"Drive API delete file failed: {str(e)}")
            return {
                'success': False,
                'error': f'Request failed: {str(e)}'
            } 