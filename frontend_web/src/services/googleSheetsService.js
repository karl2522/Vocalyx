const BACKEND_URL = import.meta.env.NODE_ENV === 'production' 
  ? 'https://vocalyx-c61a072bf25a.herokuapp.com' 
  : 'http://127.0.0.1:8000';

class GoogleSheetsService {
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
   * Copy a template Google Sheet to user's Drive
   */
  async copyTemplate(templateId, sheetName) {
    try {
      const response = await fetch(`${this.baseURL}/sheets/copy-template/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          template_id: templateId,
          name: sheetName
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to copy template sheet:', error);
      throw error;
    }
  }

  /**
   * Get information about a specific sheet
   */
  async getSheetInfo(sheetId) {
    try {
      const response = await fetch(`${this.baseURL}/sheets/info/${sheetId}/`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get sheet info:', error);
      throw error;
    }
  }

  /**
   * List user's Google Sheets
   */
  async listUserSheets() {
    try {
      const response = await fetch(`${this.baseURL}/sheets/list/`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to list user sheets:', error);
      throw error;
    }
  }

  /**
   * Update sheet permissions
   */
  async updatePermissions(sheetId, makePublic = false) {
    try {
      const response = await fetch(`${this.baseURL}/sheets/permissions/${sheetId}/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          make_public_readable: makePublic
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update sheet permissions:', error);
      throw error;
    }
  }

  /**
   * Check if user has Google access
   */
  hasGoogleAccess() {
    return !!localStorage.getItem('googleAccessToken');
  }

  /**
   * Generate embed URL for Google Sheet
   */
  getEmbedUrl(sheetId) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing&rm=embedded`;
  }

  /**
   * Generate view URL for Google Sheet
   */
  getViewUrl(sheetId) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
  }
}

// Export singleton instance
export default new GoogleSheetsService(); 