const BACKEND_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_BACKEND_URL_PROD || 'https://vocalyx-backend-64846917574.asia-southeast1.run.app') + '/api'
  : (import.meta.env.VITE_BACKEND_URL_DEV || 'http://127.0.0.1:8000');

import { showToast } from '../utils/toast';
import googleDriveService from './googleDriveService';

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
      headers['X-Access-Token'] = googleAccessToken;
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
        console.error('Google access token missing. Please reconnect your Google account.');
        throw new Error('Google access token missing');
      }

      const headers = this.getHeaders();
      const requestBody = {
        class_record_id: classRecordId,
        force: force
      };

      console.log('🔍 Final Grade Preview Request:', {
        url: `${this.baseURL}/sheets/${sheetId}/final-grade-preview/`,
        headers: {
          'Authorization': headers['Authorization'] ? 'Bearer [TOKEN]' : 'MISSING',
          'X-Access-Token': headers['X-Access-Token'] ? `[TOKEN-${headers['X-Access-Token'].length}chars]` : 'MISSING',
          'Content-Type': headers['Content-Type']
        },
        body: requestBody
      });

      const response = await fetch(`${this.baseURL}/sheets/${sheetId}/final-grade-preview/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // 🔥 If token expired, try to refresh once
        if (response.status === 400 && errorText.includes('Google access token')) {
          console.log('Google token expired. Refreshing...');
          
          // Clear old token and get fresh one
          localStorage.removeItem('googleAccessToken');
          await googleDriveService.ensureGoogleAccessToken();
          
          // Retry with fresh token
          const freshHeaders = this.getHeaders();
          const retryResponse = await fetch(`${this.baseURL}/sheets/${sheetId}/final-grade-preview/`, {
            method: 'POST',
            headers: freshHeaders,
            body: JSON.stringify(requestBody)
          });
          
          if (!retryResponse.ok) {
            const retryErrorText = await retryResponse.text();
            showToast.error(`🔥 API Error ${retryResponse.status} (After Refresh):\n${retryErrorText}`);
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          console.log('Token refreshed successfully!');
          return await retryResponse.json();
        }
        
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
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      console.log('🔍 Content-Disposition header:', contentDisposition);
      console.log('🔍 All response headers:', [...response.headers.entries()]);
      
      let filename = `FinalGrades_${new Date().toISOString().split('T')[0]}.xlsx`; // fallback
      
      if (contentDisposition) {
        console.log('🔍 Parsing Content-Disposition:', contentDisposition);
        
        // Try multiple parsing approaches
        let extractedFilename = null;
        
        // Method 1: Standard filename="..." format
        const standardMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (standardMatch) {
          extractedFilename = standardMatch[1];
          console.log('🔍 Method 1 (standard) found:', extractedFilename);
        }
        
        // Method 2: filename*=UTF-8''... format
        if (!extractedFilename) {
          const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
          if (utf8Match) {
            extractedFilename = decodeURIComponent(utf8Match[1]);
            console.log('🔍 Method 2 (UTF-8) found:', extractedFilename);
          }
        }
        
        // Method 3: Simple filename=... format
        if (!extractedFilename) {
          const simpleMatch = contentDisposition.match(/filename=([^;]+)/);
          if (simpleMatch) {
            extractedFilename = simpleMatch[1].replace(/['"]/g, '');
            console.log('🔍 Method 3 (simple) found:', extractedFilename);
          }
        }
        
        if (extractedFilename) {
          filename = extractedFilename;
          console.log('🔍 Final extracted filename:', filename);
        } else {
          console.log('🔍 No filename found in Content-Disposition');
        }
      } else {
        console.log('🔍 No Content-Disposition header found');
      }
      
      console.log('🔍 Final filename to use:', filename);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
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