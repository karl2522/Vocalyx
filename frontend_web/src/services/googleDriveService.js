import { refreshToken as refreshJwt } from './api';

const BACKEND_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_BACKEND_URL_PROD || 'https://vocalyx-backend-64846917574.asia-southeast1.run.app')
  : (import.meta.env.VITE_BACKEND_URL_DEV || 'http://127.0.0.1:8000');

class GoogleDriveService {
  constructor() {
    this.baseURL = BACKEND_URL;
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
      headers['X-Access-Token'] = googleAccessToken;
    }
    
    return headers;
  }

  async ensureGoogleAccessToken() {
    try {
      const resp = await fetch(`${this.baseURL}/google-drive/token/`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!resp.ok) {
        return null;
      }
      const data = await resp.json();
      if (data && data.access_token) {
        localStorage.setItem('googleAccessToken', data.access_token);
        return data.access_token;
      }
      return null;
    } catch {
      return null;
    }
  }

  async requestWithAuth(input, init = {}) {
    // First attempt
    let response = await fetch(input, { ...init, headers: { ...(init.headers || {}), ...this.getHeaders() } });
    if (response.status !== 401) return response;

    // Try refresh JWT using stored refresh token
    try {
      const refreshStr = localStorage.getItem('refreshToken') || localStorage.getItem('refresh_token');
      if (!refreshStr) return response; // no refresh token
      const data = await refreshJwt(refreshStr);
      if (data && data.access) {
        localStorage.setItem('authToken', data.access);
        localStorage.setItem('access_token', data.access);
        // retry once with new token
        response = await fetch(input, { ...init, headers: { ...(init.headers || {}), ...this.getHeaders() } });
      }
    } catch {
      // swallow and return original/failed response
    }
    if (response.status !== 401) return response;

    // Try to refresh Google Drive access token and retry once more
    try {
      const newGoogleToken = await this.ensureGoogleAccessToken();
      if (newGoogleToken) {
        response = await fetch(input, { ...init, headers: { ...(init.headers || {}), ...this.getHeaders() } });
      }
    } catch {}
    return response;
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

      const response = await this.requestWithAuth(`${this.baseURL}/drive/test/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: googleAccessToken })
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
      
      console.log('🔍 GoogleDriveService.listFiles called with options:', options);
      
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (pageSize) params.append('page_size', pageSize.toString());
      if (folderId) params.append('folder_id', folderId);

      const url = `${this.baseURL}/drive/files/?${params}`;
      console.log('🔍 Making request to:', url);
      // Ensure we have a valid Google token first
      if (!localStorage.getItem('googleAccessToken')) {
        await this.ensureGoogleAccessToken();
      }
      const response = await this.requestWithAuth(url, { method: 'GET' });

      console.log('🔍 Drive API response status:', response.status);
      console.log('🔍 Drive API response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Drive API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🔍 Drive API response data:', result);
      return result;
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
      const headers = {}; // Let browser set content-type for FormData
      const response = await this.requestWithAuth(`${this.baseURL}/drive/upload/`, {
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
      const response = await this.requestWithAuth(`${this.baseURL}/drive/folder/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_name: folderName, parent_folder_id: parentFolderId })
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
      const response = await this.requestWithAuth(`${this.baseURL}/drive/download/${fileId}/`, { method: 'GET' });

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