const BACKEND_URL = import.meta.env.PROD 
  ? 'https://vocalyx-backend-64846917574.asia-southeast1.run.app/api'
  : 'http://127.0.0.1:8000';

import googleDriveService from './googleDriveService';
import { showToast } from '../utils/toast';

class GoogleSheetsService {
  constructor() {
    this.baseURL = BACKEND_URL; // 🔥 FIXED: Remove the extra /api
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
      // 🔥 FIXED: Force refresh Google token before making the request
      await googleDriveService.ensureGoogleAccessToken();
      
      // Double-check we have a valid token
      const googleToken = localStorage.getItem('googleAccessToken');
      if (!googleToken) {
        showToast.error('Google access token missing. Please reconnect your Google account.');
        throw new Error('Google access token missing');
      }

      // 🔥 DEBUG: Show actual token values for debugging
      const authToken = localStorage.getItem('authToken');
      showToast.info(`🔍 Token Debug:\nAuth Token: ${authToken ? `${authToken.substring(0, 20)}...` : 'MISSING'}\nGoogle Token: ${googleToken ? `${googleToken.substring(0, 20)}...` : 'MISSING'}`);

      const headers = this.getHeaders();
      const requestBody = {
        class_record_id: classRecordId,
        force: force
      };

      // 🔥 MANUAL HEADERS: Let's manually build headers to be 100% sure
      const manualHeaders = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        manualHeaders['Authorization'] = `Bearer ${authToken}`;
      }
      
      if (googleToken) {
        manualHeaders['X-Google-Access-Token'] = googleToken;
      }

      // 🔥 DEBUG: Compare manual vs getHeaders()
      showToast.info(`🔍 Headers Comparison:\nManual X-Google: ${manualHeaders['X-Google-Access-Token'] ? 'YES' : 'NO'}\ngetHeaders X-Google: ${headers['X-Google-Access-Token'] ? 'YES' : 'NO'}\nSame? ${manualHeaders['X-Google-Access-Token'] === headers['X-Google-Access-Token']}`);

      console.log('🔍 Final Grade Preview Request with manual headers:', {
        url: `${this.baseURL}/sheets/${sheetId}/final-grade-preview/`,
        headers: manualHeaders,
        body: requestBody
      });

      // 🔥 USE MANUAL HEADERS instead of this.getHeaders()
      const response = await fetch(`${this.baseURL}/sheets/${sheetId}/final-grade-preview/`, {
        method: 'POST',
        headers: manualHeaders,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        showToast.error(`🔥 API Error ${response.status}:\n${errorText}`);
        console.error('🔥 Final grade preview error:', errorText);
        console.error('🔥 Response status:', response.status);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      showToast.error('Failed to get final grade preview: ' + error.message);
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