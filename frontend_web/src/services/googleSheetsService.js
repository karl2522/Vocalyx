const BACKEND_URL = import.meta.env.PROD 
  ? 'https://vocalyx-backend-64846917574.asia-southeast1.run.app/api'
  : 'http://127.0.0.1:8000';

import googleDriveService from './googleDriveService';

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
  async updatePermissions(sheetId, makePublic = false, makeEditable = false) {
    try {
      const response = await fetch(`${this.baseURL}/sheets/permissions/${sheetId}/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          make_public_readable: makePublic,
          make_editable: makeEditable
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
    return `https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing&rm=minimal&chrome=false&widget=true&headers=false`;
  }

  /**
   * Generate view URL for Google Sheet
   */
  getViewUrl(sheetId) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
  }


  /**
   * Get final grade preview with missing score details
   */
  async getFinalGradePreview(sheetId, { classRecordId, force = false } = {}) {
    try {
      // Ensure we have a fresh Google access token before calling
      if (!localStorage.getItem('googleAccessToken')) {
        await googleDriveService.ensureGoogleAccessToken();
      }

      // 🔥 FIXED: Use fetch with this.getHeaders() to include X-Google-Access-Token
      const response = await fetch(`${this.baseURL}/sheets/${sheetId}/final-grade-preview/`, {
        method: 'POST',
        headers: this.getHeaders(), // 🔥 This includes both Authorization and X-Google-Access-Token
        body: JSON.stringify({
          class_record_id: classRecordId,
          force: force
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Final grade preview error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get final grade preview:', error);
      throw error;
    }
  }

  /**
   * Mark missing scores as N/A or INC
   */
  async markMissingScores(sheetId, { sheetName, studentId, column, value }) {
    try {
      const response = await fetch(`${this.baseURL}/sheets/${sheetId}/mark-missing-scores/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          sheet_name: sheetName,
          student_id: studentId,
          column: column,
          value: value
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to mark missing scores:', error);
      throw error;
    }
  }

  /**
   * Mark multiple missing scores as N/A or INC (batch)
   */
  async markMissingScoresBatch(sheetId, updates) {
    try {
      const response = await fetch(`${this.baseURL}/sheets/${sheetId}/mark-missing-scores-batch/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          updates: updates
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to mark missing scores batch:', error);
      throw error;
    }
  }

  /**
   * Export final grades to Excel
   */
  async exportFinalGrades(sheetId, { classRecordId }) {
    try {
      const response = await fetch(`${this.baseURL}/sheets/${sheetId}/final-grade-export/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          class_record_id: classRecordId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinalGrades_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true };
    } catch (error) {
      console.error('Failed to export final grades:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new GoogleSheetsService(); 