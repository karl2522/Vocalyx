const BACKEND_URL = import.meta.env.NODE_ENV === 'production' 
  ? 'https://vocalyx-c61a072bf25a.herokuapp.com' 
  : 'http://127.0.0.1:8000';

class GoogleDriveService {
  constructor() {
    this.baseURL = `${BACKEND_URL}/api`;
  }

  /**
   * Get headers with authentication and Google access token
   */
  getHeaders() {
    const authToken = localStorage.getItem('authToken');
    const googleAccessToken = localStorage.getItem('googleAccessToken');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (googleAccessToken) {
      headers['X-Google-Access-Token'] = googleAccessToken;
    }
    
    return headers;
  }

  /**
   * Test Google Drive connection
   */
  async testConnection() {
    try {
      const googleAccessToken = localStorage.getItem('googleAccessToken');
      if (!googleAccessToken) {
        throw new Error('No Google access token found. Please sign in with Google again.');
      }

      const response = await fetch(`${this.baseURL}/drive/test/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          access_token: googleAccessToken
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Drive connection test failed:', error);
      throw error;
    }
  }

  /**
   * List files in Google Drive
   */
  async listFiles(options = {}) {
    try {
      const { query, pageSize = 10, folderId } = options;
      
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (pageSize) params.append('page_size', pageSize.toString());
      if (folderId) params.append('folder_id', folderId);

      const response = await fetch(`${this.baseURL}/drive/files/?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to list Drive files:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(file, options = {}) {
    try {
      const { folderId } = options;
      
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) {
        formData.append('folder_id', folderId);
      }

      // Get headers without Content-Type for FormData
      const headers = this.getHeaders();
      delete headers['Content-Type']; // Let browser set it for FormData

      const response = await fetch(`${this.baseURL}/drive/upload/`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to upload file to Drive:', error);
      throw error;
    }
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(folderName, parentFolderId = null) {
    try {
      const response = await fetch(`${this.baseURL}/drive/folder/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          folder_name: folderName,
          parent_folder_id: parentFolderId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create Drive folder:', error);
      throw error;
    }
  }

  /**
   * Download a file from Google Drive
   */
  async downloadFile(fileId, filename = null) {
    try {
      const response = await fetch(`${this.baseURL}/drive/download/${fileId}/`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Create blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `drive_file_${fileId}`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'File downloaded successfully' };
    } catch (error) {
      console.error('Failed to download file from Drive:', error);
      throw error;
    }
  }

  /**
   * Check if user has Google Drive access
   */
  hasGoogleAccess() {
    return !!localStorage.getItem('googleAccessToken');
  }

  /**
   * Get stored Google access token
   */
  getAccessToken() {
    return localStorage.getItem('googleAccessToken');
  }

  /**
   * Clear stored Google access token
   */
  clearAccessToken() {
    localStorage.removeItem('googleAccessToken');
  }
}

// Export singleton instance
export default new GoogleDriveService(); 