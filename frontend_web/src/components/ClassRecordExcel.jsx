import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AlertCircle, ArrowLeft, Award, BarChart3, CheckCircle, CheckCircle2, ChevronDown, Clock, Edit, FileSpreadsheet, HelpCircle, Lightbulb, Menu, Mic, MicOff, MoreVertical, PieChart, Plus, RefreshCw, Star, Target, Trash2, Upload, Users, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiCheckCircle } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useAuth } from '../auth/AuthContext';
import { classRecordService } from '../services/api';
import googleDriveService from '../services/googleDriveService';
import { speakText, stopSpeaking } from '../utils/speechSynthesis';
import { showToast } from '../utils/toast';
import useVoiceRecognition from '../utils/useVoiceRecognition';
import { applyPhoneticCorrections, cleanName, findStudentRowSmart, parseVoiceCommand } from '../utils/voicecommandParser';
import FinalGradeOverview from './FinalGradeOverview';
import AddCategoryModal from './modals/AddCategoryModal.jsx';
import AddColumnToCategoryModal from './modals/AddColumnToCategoryModal.jsx';
import BatchGradingModal from './modals/BatchGradingModal';
import ColumnMappingModal from './modals/ColumnMappingModal';
import DeleteCategoryModal from './modals/DeleteCategoryModal.jsx';
import DeleteStudentModal from './modals/DeleteStudentModal.jsx';
import DriveFilePickerModal from './modals/DriveFilePickerModal.jsx';
import DuplicateStudentModal from './modals/DuplicateStudentModal.jsx';
import EditCategoryModal from './modals/EditCategoryModal.jsx';
import ImportProgressIndicator from './modals/ImportProgressIndicator';
import ImportReviewModal from './modals/ImportReviewModal.jsx';
import ImportScoresInfoModal from './modals/ImportScoresInfoModal.jsx';
import ImportStudentsInfoModal from './modals/ImportStudentsInfoModal.jsx';
import ImportStudentsModal from './modals/ImportStudentsModal';
import OverrideConfirmationModal from './modals/OverrideConfirmationModal';
import StudentConfirmationModal from './modals/StudentConfirmationModal.jsx';
import VoiceGuideModal from './modals/VoiceGuideModal';

const ClassRecordExcel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classRecord, setClassRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [headers, setHeaders] = useState([]);
  const [lastSaved] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [batchMode, setBatchMode] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [currentBatchColumn, setCurrentBatchColumn] = useState('');
  const [batchEntries, setBatchEntries] = useState([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [maxScores, setMaxScores] = useState({});
  const [newStudentsData, setNewStudentsData] = useState([]);
  const [showImportInfoModal, setShowImportInfoModal] = useState(false);
  const [showImportScoresInfoModal, setShowImportScoresInfoModal] = useState(false);
  const [batchSheetData, setBatchSheetData] = useState(null);
  const [processingEntries, setProcessingEntries] = useState(new Set());
  const [studentToConfirm, setStudentToConfirm] = useState({
    lastName: '',
    firstName: '',
    studentId: '',
    isVisible: false
  });
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showColumnImportModal, setShowColumnImportModal] = useState(false);
  const [columnAnalysis, setColumnAnalysis] = useState(null);
  const [pendingImportData, setPendingImportData] = useState(null);

  // Auto-mapping state
  const [showImportReviewModal, setShowImportReviewModal] = useState(false);
  const [autoMappingResult, setAutoMappingResult] = useState(null);
  const [availableCategories, setAvailableCategories] = useState([]); // Add this state

  const [deleteStudentModal, setDeleteStudentModal] = useState({
    isOpen: false,
    studentName: '',
    studentData: null,
    searchType: 'name',
    identifier: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importConflicts, setImportConflicts] = useState([]);
  const [tableData, setTableData] = useState([]);

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateModalData, setDuplicateModalData] = useState(null);
  const [showFinalGradeOverview, setShowFinalGradeOverview] = useState(false);

  const [availableSheets, setAvailableSheets] = useState([]);
  const [currentSheet, setCurrentSheet] = useState(null);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [showSheetSelector, setShowSheetSelector] = useState(false);

  // 🔥 NEW: Onboarding State with LocalStorage persistence
  const [onboardingStep, setOnboardingStep] = useState(() => {
    const completed = localStorage.getItem('classRecordOnboardingCompleted');
    return completed === 'true' ? 0 : 1;
  });

  const handleOnboardingComplete = () => {
    setOnboardingStep(0);
    localStorage.setItem('classRecordOnboardingCompleted', 'true');
  };

  const [overrideConfirmation, setOverrideConfirmation] = useState(null);

  // CLASS STANDING percentages state
  const [classStandingRemaining, setClassStandingRemaining] = useState(0);
  const [problematicSheets, setProblematicSheets] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const lastToastKeyRef = useRef(null);
  const classStandingToastIdRef = useRef(null);

  // Smart polling state for percentage change detection
  const [lastPercentageHash, setLastPercentageHash] = useState(null);

  // 🔥 OPTIMIZATION: Debouncing refs to prevent rapid API calls
  const percentageCheckInProgress = useRef(false);
  const lastPercentageCheckTime = useRef(0);
  const fetchInProgress = useRef(false);
  const hasShownInitialToast = useRef(false);
  const [isRefreshingAllocation, setIsRefreshingAllocation] = useState(false);

  // 🔥 PHASE 6: Sync status tracking
  const [syncStatus, setSyncStatus] = useState({}); // {sheetName: {isSynced: bool, differences: []}}

  // 🔄 AUTO-SYNC: Refs for tracking sync status
  const midtermFinalSyncInProgress = useRef(false);
  const lastMidtermHashRef = useRef(null);
  const lastSyncToastRef = useRef(null); // Track last toast to prevent duplicates
  const lastSyncResultRef = useRef({ syncCount: 0, clearCount: 0 }); // Track last sync result
  const toastDebounceTimeoutRef = useRef(null); // Debounce toast to prevent multiple toasts

  // 🔥 OPTIMIZATION: Calculate hash of STUDENT INFO data for change detection
  // This allows us to skip sync if no changes detected (reduces server load by 90%+)
  const calculateStudentInfoHash = useCallback((tableData, studentInfoCols) => {
    if (!tableData || !Array.isArray(tableData) || !studentInfoCols) {
      return null;
    }

    // Extract only STUDENT INFO columns (A-E: NO., LASTNAME, FIRST NAME, MIDDLE NAME, STUDENT ID)
    const studentInfoData = tableData.map(row => {
      const info = {};
      Object.entries(studentInfoCols).forEach(([colName, colIndex]) => {
        if (colIndex !== undefined && row && row.length > colIndex) {
          info[colName] = String(row[colIndex] || '').trim();
        } else {
          info[colName] = '';
        }
      });
      return info;
    });

    // Create hash from student info data (simple string hash)
    const hashString = JSON.stringify(studentInfoData);
    // Simple hash function (fast, not cryptographically secure - just for change detection)
    let hash = 0;
    for (let i = 0; i < hashString.length; i++) {
      const char = hashString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }, []);


  // Helper: sync remaining from backend mirror based on current sheet
  const syncRemaining = useCallback(async () => {
    try {
      if (!id || !currentSheet?.sheet_name) return;
      const res = await classRecordService.syncCategoryPercentages(id, currentSheet.sheet_name);
      const data = res.data || {};
      setClassStandingRemaining(Math.max(0, data.remaining || 0));

      // 🔥 NEW: Show SETTINGS tab sync feedback
      if (data.settings_synced && Object.keys(data.settings_synced).length > 0) {
        const sheetType = currentSheet.sheet_name?.toLowerCase().includes('midterm') ? 'Midterm' :
          currentSheet.sheet_name?.toLowerCase().includes('final') ? 'Final' : 'sheet';
        const syncedCount = Object.keys(data.settings_synced).length;
        toast.success(`✅ Synced ${syncedCount} categor${syncedCount === 1 ? 'y' : 'ies'} to SETTINGS_${sheetType.toUpperCase()} tab`, {
          duration: 3000
        });
      }

      if (data.settings_errors && Object.keys(data.settings_errors).length > 0) {
        const errorCount = Object.keys(data.settings_errors).length;
        toast.error(`⚠️ ${errorCount} categor${errorCount === 1 ? 'y' : 'ies'} failed to sync to SETTINGS tab`, {
          duration: 4000
        });
      }
    } catch (e) {
      // 🔥 PHASE 4: Fallback: Read from SETTINGS tab (source of truth) instead of fixed columns
      try {
        if (!id || !currentSheet?.sheet_name) return;

        // Try to read from SETTINGS tab directly
        const settingsRes = await classRecordService.getSettingsPercentages(id, currentSheet.sheet_name);
        const settingsData = settingsRes.data || {};

        if (settingsData.error) {
          console.warn('⚠️ Fallback: Failed to read SETTINGS tab:', settingsData.error);
          return;
        }

        const remaining = settingsData.remaining || 0;
        setClassStandingRemaining(remaining);
        console.log(`📊 Fallback: Read remaining from SETTINGS tab (${settingsData.source}): ${remaining}%`);
      } catch (ignored) {
        console.warn('⚠️ Fallback: Both sync and SETTINGS read failed:', ignored);
        // ignore - keep previous value
      }
    }
  }, [id, currentSheet?.sheet_name, classRecord?.google_sheet_id]);

  // 🔥 PHASE 1: Removed generatePercentageHash - no longer needed (SETTINGS tabs use formulas that auto-update)

  // 🔥 PHASE 1: Removed comparePercentages - no longer needed (SETTINGS tabs use formulas that auto-update)

  // 🔥 PHASE 1: Simplified checker - reads ONLY from SETTINGS tabs
  // Renamed from checkAllSheetsForPercentageChanges to checkAllSheetsAllocation
  const checkAllSheetsAllocation = useCallback(async () => {
    try {
      // Don't check if user is not authenticated
      if (!user) {
        console.log('🔔 User not authenticated, skipping allocation check');
        return;
      }

      if (!classRecord?.google_sheet_id) return;

      // 🔥 OPTIMIZATION: Debounce - prevent multiple simultaneous checks
      if (percentageCheckInProgress.current) {
        console.log('⏭️ Allocation check already in progress, skipping...');
        return;
      }

      // 🔥 OPTIMIZATION: Rate limiting - don't check more than once every 10 seconds
      const now = Date.now();
      const timeSinceLastCheck = now - lastPercentageCheckTime.current;
      if (timeSinceLastCheck < 10000) {
        console.log(`⏭️ Too soon since last check (${Math.round(timeSinceLastCheck / 1000)}s ago), skipping...`);
        return;
      }

      percentageCheckInProgress.current = true;
      lastPercentageCheckTime.current = now;

      // Get all sheets from the class record
      const sheetsList = await classRecordService.getSheetsList(classRecord.google_sheet_id);
      const sheets = sheetsList?.data?.sheets || [];

      // Filter for Midterm and Final sheets
      const midtermSheet = sheets.find(sheet => sheet.sheet_name?.toLowerCase().includes('midterm'));
      const finalSheet = sheets.find(sheet => sheet.sheet_name?.toLowerCase().includes('final'));

      const sheetsToCheck = [];
      if (midtermSheet) sheetsToCheck.push(midtermSheet);
      if (finalSheet) sheetsToCheck.push(finalSheet);

      if (sheetsToCheck.length === 0) {
        // Fallback to first sheet if no Midterm/Final found
        const firstSheet = sheets[0];
        if (firstSheet) sheetsToCheck.push(firstSheet);
      }

      const problematicSheets = [];
      let totalRemaining = 0;

      // 🔥 PHASE 1: Simplified - Read ONLY from SETTINGS tabs (no sheet reading needed)
      // SETTINGS tabs use formulas that auto-update, so no sync needed
      for (const sheet of sheetsToCheck) {
        try {
          // Read from SETTINGS tab only
          const settingsRes = await classRecordService.getSettingsPercentages(id, sheet.sheet_name);
          const settingsData = settingsRes.data || {};

          if (settingsData.error) {
            console.warn(`⚠️ Failed to read SETTINGS tab for ${sheet.sheet_name}:`, settingsData.error);
            continue;
          }

          const total = settingsData.total || 0;
          const remaining = settingsData.remaining || 0;
          const source = settingsData.source || 'SETTINGS';
          const sheetType = settingsData.sheet_type || 'unknown';
          const percentages = settingsData.percentages || {};

          console.log(`📊 SETTINGS tab (${source}): total=${total}%, remaining=${remaining}%`);

          // Only add to problematic sheets if there's an allocation issue
          if (remaining !== 0) {
            problematicSheets.push({
              sheetName: sheet.sheet_name,
              total,
              remaining,
              source: `SETTINGS_${sheetType.toUpperCase()}`,
              percentages
            });
            totalRemaining += remaining;
          }
        } catch (error) {
          console.error(`Failed to check ${sheet.sheet_name}:`, error);
        }
      }

      setProblematicSheets(problematicSheets);
      setClassStandingRemaining(totalRemaining);

      // Update the dashboard card with total and per-sheet details
      const breakdownPayload = {
        total: totalRemaining,
        sheets: problematicSheets
      };
      if (window.updateClassRecordRemaining) {
        window.updateClassRecordRemaining(classRecord.id, breakdownPayload);
      }
      try {
        // Persist so the list page can show detailed badges after navigating back
        localStorage.setItem(`cr_breakdown_${classRecord.id}`, JSON.stringify({
          ...breakdownPayload,
          updatedAt: Date.now()
        }));
      } catch { }

    } catch (error) {
      console.error('⚠️ Error checking allocation:', error);
    } finally {
      // 🔥 OPTIMIZATION: Always reset the in-progress flag
      percentageCheckInProgress.current = false;
    }
  }, [classRecord?.google_sheet_id, classRecord?.id, id, user]);

  // Legacy function name for backward compatibility
  const checkForPercentageChanges = useCallback(async () => {
    // Use the simplified function that checks all sheets
    await checkAllSheetsAllocation();
  }, [checkAllSheetsAllocation]);

  // Alias for backward compatibility (deprecated - use checkAllSheetsAllocation)
  const checkAllSheetsForPercentageChanges = checkAllSheetsAllocation;

  // 🔄 AUTO-SYNC: Identify STUDENT INFO columns in headers
  const identifyStudentInfoColumns = useCallback((headers) => {
    if (!headers || !Array.isArray(headers)) return {};

    const studentInfoPatterns = {
      'NO.': ['NO.', 'NO', 'NUMBER', '#'],
      'LASTNAME': ['LASTNAME', 'LAST NAME', 'LAST', 'SURNAME'],
      'FIRST NAME': ['FIRST NAME', 'FIRSTNAME', 'FIRST', 'GIVEN NAME'],
      'MIDDLE NAME': ['MIDDLE NAME', 'MIDDLENAME', 'MIDDLE', 'MI'],
      'STUDENT ID': ['STUDENT ID', 'STUDENTID', 'ID', 'STUDENT NUMBER']
    };

    const foundColumns = {};

    headers.forEach((header, index) => {
      const normalizedHeader = header.trim().toUpperCase();

      Object.entries(studentInfoPatterns).forEach(([colName, patterns]) => {
        if (!foundColumns[colName]) {
          const matches = patterns.some(pattern => {
            const patternUpper = pattern.toUpperCase();
            return normalizedHeader === patternUpper ||
              normalizedHeader.includes(patternUpper) ||
              patternUpper.includes(normalizedHeader);
          });

          if (matches) {
            foundColumns[colName] = index;
          }
        }
      });
    });

    return foundColumns;
  }, []);

  // 🔄 AUTO-SYNC: Find matching student in Final sheet
  const findMatchingStudent = useCallback((finalTableData, finalHeaders, midtermStudent, midtermRowIndex, finalStudentInfoCols) => {
    if (!finalTableData || !finalHeaders || !midtermStudent) return null;

    // Try matching by STUDENT ID first (most reliable)
    if (midtermStudent['STUDENT ID'] && finalStudentInfoCols['STUDENT ID'] !== undefined) {
      const studentIdCol = finalStudentInfoCols['STUDENT ID'];
      const midtermStudentId = String(midtermStudent['STUDENT ID'] || '').trim();

      if (midtermStudentId) {
        const match = finalTableData.find((row, index) => {
          if (row.length <= studentIdCol) return false;
          const finalStudentId = String(row[studentIdCol] || '').trim();
          return finalStudentId === midtermStudentId && finalStudentId !== '';
        });

        if (match) {
          return {
            rowIndex: finalTableData.indexOf(match),
            matchType: 'student_id'
          };
        }
      }
    }

    // Try matching by full name
    const midtermLastName = String(midtermStudent['LASTNAME'] || '').trim().toLowerCase();
    const midtermFirstName = String(midtermStudent['FIRST NAME'] || '').trim().toLowerCase();
    const midtermMiddleName = String(midtermStudent['MIDDLE NAME'] || '').trim().toLowerCase();

    if (midtermLastName && midtermFirstName) {
      const lastNameCol = finalStudentInfoCols['LASTNAME'];
      const firstNameCol = finalStudentInfoCols['FIRST NAME'];
      const middleNameCol = finalStudentInfoCols['MIDDLE NAME'];

      if (lastNameCol !== undefined && firstNameCol !== undefined) {
        const match = finalTableData.find((row, index) => {
          if (row.length <= Math.max(lastNameCol, firstNameCol)) return false;

          const finalLastName = String(row[lastNameCol] || '').trim().toLowerCase();
          const finalFirstName = String(row[firstNameCol] || '').trim().toLowerCase();
          const finalMiddleName = middleNameCol !== undefined && row.length > middleNameCol
            ? String(row[middleNameCol] || '').trim().toLowerCase()
            : '';

          // Match by last name + first name (required)
          if (finalLastName === midtermLastName && finalFirstName === midtermFirstName) {
            // If middle names exist, they should match (or one is empty)
            if (!midtermMiddleName || !finalMiddleName || finalMiddleName === midtermMiddleName) {
              return true;
            }
          }
          return false;
        });

        if (match) {
          return {
            rowIndex: finalTableData.indexOf(match),
            matchType: 'name'
          };
        }
      }
    }

    // Try matching by row number (same position) - only if row is empty
    if (midtermRowIndex < finalTableData.length) {
      const rowAtSameIndex = finalTableData[midtermRowIndex];
      if (rowAtSameIndex) {
        const lastNameCol = finalStudentInfoCols['LASTNAME'];
        const firstNameCol = finalStudentInfoCols['FIRST NAME'];

        if (lastNameCol !== undefined && firstNameCol !== undefined &&
          rowAtSameIndex.length > Math.max(lastNameCol, firstNameCol)) {
          const finalLastName = String(rowAtSameIndex[lastNameCol] || '').trim();
          const finalFirstName = String(rowAtSameIndex[firstNameCol] || '').trim();

          // Row is empty, can use same position
          if (!finalLastName && !finalFirstName) {
            return {
              rowIndex: midtermRowIndex,
              matchType: 'row_position'
            };
          }
        }
      }
    }

    return null; // No match found
  }, []);

  // 🔄 AUTO-SYNC: Generate hash for STUDENT INFO rows (for change detection)
  const generateStudentInfoHash = useCallback((tableData, headers) => {
    if (!tableData || !headers || !Array.isArray(tableData) || !Array.isArray(headers)) {
      return null;
    }

    const studentInfoCols = identifyStudentInfoColumns(headers);

    // Extract STUDENT INFO data for each row
    const studentInfoRows = tableData
      .map((row, index) => {
        const studentInfo = {};
        Object.entries(studentInfoCols).forEach(([colName, colIndex]) => {
          if (colIndex !== undefined && row.length > colIndex) {
            studentInfo[colName] = String(row[colIndex] || '').trim();
          } else {
            studentInfo[colName] = '';
          }
        });

        // Only include rows with actual student data
        if (studentInfo['LASTNAME'] || studentInfo['FIRST NAME']) {
          return {
            rowIndex: index,
            data: studentInfo
          };
        }
        return null;
      })
      .filter(Boolean);

    // Generate hash string
    const hashString = JSON.stringify(studentInfoRows);
    return hashString;
  }, [identifyStudentInfoColumns]);

  // 🔄 AUTO-SYNC: Helper to convert column index to A1 notation
  const columnIndexToLetter = useCallback((index) => {
    let result = '';
    let num = index;
    while (num >= 0) {
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26) - 1;
    }
    return result;
  }, []);

  // 🔄 AUTO-SYNC: Sync a single student's info from Midterm to Final
  // 🔥 OPTIMIZATION: Now collects updates into provided array instead of making individual API calls
  const syncStudentInfoToFinal = useCallback((
    sheetId,
    midtermStudent,
    midtermRowIndex,
    finalSheetName,
    finalTableData,
    finalHeaders,
    matchResult,
    finalStudentInfoCols,
    midtermStudentInfoCols,
    midtermHeaders,
    midtermTableData,
    updatesArray // 🔥 NEW: Array to collect updates for batching
  ) => {
    try {
      if (matchResult) {
        // Student exists - UPDATE
        const updates = [];
        // Row 1: Internal IDs, Row 2: Category names, Row 3: Subcategory headers, Row 4: Max scores
        const finalRowNumber = matchResult.rowIndex + 5; // +4 for header rows (Row 1-4), +1 for 1-based

        // 🔥 FIX: Use Final sheet's column indices, not Midterm's
        // This ensures we sync to the correct columns even if column positions differ
        Object.entries(finalStudentInfoCols).forEach(([colName, finalColIndex]) => {
          if (finalColIndex === undefined) return;

          // 🔥 CRITICAL: For STUDENT ID, verify we're using the correct column
          // Check that the header at this index actually says "STUDENT ID"
          if (colName === 'STUDENT ID') {
            const headerAtIndex = finalHeaders[finalColIndex];
            const normalizedHeader = headerAtIndex ? String(headerAtIndex).trim().toUpperCase() : '';
            const isStudentIdColumn = normalizedHeader.includes('STUDENT ID') ||
              normalizedHeader.includes('STUDENTID') ||
              (normalizedHeader === 'ID' && !normalizedHeader.includes('MIDDLE'));

            if (!isStudentIdColumn) {
              // 🔥 FIX: Find the correct STUDENT ID column index in Final sheet
              let correctStudentIdIndex = -1;
              for (let i = 0; i < finalHeaders.length; i++) {
                const header = String(finalHeaders[i] || '').trim().toUpperCase();
                if (header.includes('STUDENT ID') || header.includes('STUDENTID') ||
                  (header === 'ID' && !header.includes('MIDDLE'))) {
                  correctStudentIdIndex = i;
                  break;
                }
              }

              if (correctStudentIdIndex === -1) {
                console.error(`🔄 SYNC ERROR: STUDENT ID column not found in Final sheet headers!`);
                return; // Skip - can't find STUDENT ID column
              }

              // Use the correct index instead
              finalColIndex = correctStudentIdIndex;
            }
          }

          // Skip NO. column - handled separately
          if (colName === 'NO.') {
            const currentValue = finalTableData[matchResult.rowIndex]?.[finalColIndex];
            if (!currentValue || String(currentValue).trim() === '') {
              const midtermNo = midtermStudent['NO.'] || (midtermRowIndex + 1);
              const columnLetter = columnIndexToLetter(finalColIndex);
              updates.push({
                range: `'${finalSheetName}'!${columnLetter}${finalRowNumber}`,
                values: [[String(midtermNo)]]
              });
            }
            return;
          }

          // 🔥 CRITICAL FIX: Get Midterm value correctly
          // For STUDENT ID, use extracted value, but re-search if empty AND row has other data
          // This handles misalignment while respecting explicit clearing
          let midtermValue = midtermStudent[colName];

          // 🔥 SMART HANDLING FOR STUDENT ID:
          // 1. If extracted value exists → use it (STUDENT ID is in correct column)
          // 2. If extracted value is empty BUT row has other data → re-search (might be misaligned)
          // 3. If extracted value is empty AND row is empty → use empty (explicitly cleared)
          if (colName === 'STUDENT ID') {
            const extractedStudentId = String(midtermStudent[colName] || '').trim();

            // If extracted value is empty, check if row has other student data
            if (!extractedStudentId) {
              const hasOtherStudentData = (midtermStudent['LASTNAME'] && midtermStudent['LASTNAME'].trim() !== '') ||
                (midtermStudent['FIRST NAME'] && midtermStudent['FIRST NAME'].trim() !== '');

              // Only re-search if row has other data (might be misaligned)
              // If row is empty, STUDENT ID is explicitly cleared - respect empty value
              if (hasOtherStudentData) {
                // Re-search the row to find STUDENT ID (handles misalignment)
                const studentIdPattern = /^\d{2}-\d{4}-\d{3}$/;
                const originalRow = midtermTableData?.[midtermRowIndex];
                if (originalRow) {
                  midtermValue = '';
                  for (let i = 0; i < originalRow.length; i++) {
                    const cellValue = String(originalRow[i] || '').trim();
                    if (studentIdPattern.test(cellValue)) {
                      midtermValue = cellValue;
                      break;
                    }
                  }
                } else {
                  midtermValue = '';
                }
              } else {
                // Row is empty - STUDENT ID is explicitly cleared, use empty value
                midtermValue = '';
              }
            } else {
              // Extracted value exists - use it directly
              midtermValue = extractedStudentId;
            }
          }

          // Update other columns (including STUDENT ID, MIDDLE NAME, etc.)
          const midtermValueStr = midtermValue !== undefined && midtermValue !== null
            ? String(midtermValue).trim()
            : '';

          // 🔥 CRITICAL: For STUDENT ID, validate the value if it exists
          // But allow empty values to be synced (to clear Final if Midterm is empty)
          if (colName === 'STUDENT ID') {
            const studentIdPattern = /^\d{2}-\d{4}-\d{3}$/;
            // If the value exists but doesn't match STUDENT ID pattern, don't sync it
            // This prevents MIDDLE NAME or other values from being synced to STUDENT ID
            if (midtermValueStr && !studentIdPattern.test(midtermValueStr)) {
              return; // Skip - this is not a valid STUDENT ID, don't sync to STUDENT ID column
            }
            // If midtermValueStr is empty, we'll allow it to sync (to clear Final)
          }

          // Get current Final value - normalize to empty string if undefined/null/empty
          const finalRow = finalTableData[matchResult.rowIndex];
          const finalValue = finalRow && finalRow.length > finalColIndex &&
            finalRow[finalColIndex] !== undefined &&
            finalRow[finalColIndex] !== null &&
            String(finalRow[finalColIndex]).trim() !== ''
            ? String(finalRow[finalColIndex]).trim()
            : '';

          // 🔥 EFFICIENT & ROBUST: Sync if values are different
          // This handles ALL cases efficiently:
          // 1. Empty in Midterm, has value in Final → Clear Final (sync empty string)
          // 2. Has value in Midterm, empty in Final → Update Final (sync value)
          // 3. Different non-empty values → Update Final (sync new value)
          // 4. Both empty → Skip (no change needed, more efficient)
          if (midtermValueStr !== finalValue) {
            const columnLetter = columnIndexToLetter(finalColIndex);
            updates.push({
              range: `'${finalSheetName}'!${columnLetter}${finalRowNumber}`,
              values: [[midtermValueStr]] // Empty string will clear the cell in Final
            });
          }
        });

        // 🔥 OPTIMIZATION: Collect updates into provided array instead of making API call
        // All updates will be batched into single API call later
        if (updates.length > 0 && updatesArray) {
          updatesArray.push(...updates);
          return updates.length; // Return count of actual updates
        }
        return 0; // No updates made
      } else {
        // Student doesn't exist - this case is now handled in the caller
        // Return 0 as this function only handles updates, not additions
        return 0;
      }
    } catch (error) {
      console.error(`🔄 SYNC: Error syncing student ${midtermStudent['FIRST NAME']} ${midtermStudent['LASTNAME']}:`, error);
      return 0; // Return 0 on error
    }
  }, [columnIndexToLetter]);

  // 🔄 AUTO-SYNC: Main checker function - compares Midterm and Final sheets
  const checkMidtermFinalSync = useCallback(async () => {
    try {
      // Prevent overlapping checks
      if (midtermFinalSyncInProgress.current) {
        return;
      }

      midtermFinalSyncInProgress.current = true;

      if (!classRecord?.google_sheet_id) {
        midtermFinalSyncInProgress.current = false;
        return;
      }

      // Get all sheets
      const sheetsList = await classRecordService.getSheetsList(classRecord.google_sheet_id);
      const sheets = sheetsList?.data?.sheets || [];

      if (!sheets || sheets.length === 0) {
        midtermFinalSyncInProgress.current = false;
        return;
      }

      // Find Midterm and Final sheets
      const midtermSheet = sheets.find(sheet =>
        sheet.sheet_name?.toLowerCase().includes('midterm') &&
        !sheet.sheet_name?.toLowerCase().includes('premidterm')
      );

      const finalSheet = sheets.find(sheet =>
        sheet.sheet_name?.toLowerCase().includes('final') &&
        !sheet.sheet_name?.toLowerCase().includes('prefinal')
      );

      if (!midtermSheet || !finalSheet) {
        midtermFinalSyncInProgress.current = false;
        return;
      }

      // Get Midterm sheet data
      const midtermData = await classRecordService.getSpecificSheetData(
        classRecord.google_sheet_id,
        midtermSheet.sheet_name
      );

      if (!midtermData.data?.success) {
        console.error('🔄 SYNC: Failed to load Midterm sheet');
        midtermFinalSyncInProgress.current = false;
        return;
      }

      // Extract STUDENT INFO columns from Midterm to calculate hash
      const midtermStudentInfoCols = identifyStudentInfoColumns(midtermData.data.headers);

      // 🔥 OPTIMIZATION: Calculate hash of Midterm STUDENT INFO data
      // If hash hasn't changed, skip sync (no changes detected)
      const currentMidtermHash = calculateStudentInfoHash(
        midtermData.data.tableData,
        midtermStudentInfoCols
      );

      // Check if Midterm data has changed
      if (lastMidtermHashRef.current !== null &&
        lastMidtermHashRef.current === currentMidtermHash) {
        // No changes detected - skip sync to reduce server load
        midtermFinalSyncInProgress.current = false;
        return;
      }

      // Get Final sheet data (only if Midterm has changes)
      const finalData = await classRecordService.getSpecificSheetData(
        classRecord.google_sheet_id,
        finalSheet.sheet_name
      );

      if (!finalData.data?.success) {
        console.error('🔄 SYNC: Failed to load Final sheet');
        midtermFinalSyncInProgress.current = false;
        return;
      }

      // Extract STUDENT INFO from Final sheet
      const finalStudentInfoCols = identifyStudentInfoColumns(finalData.data.headers);

      // Validate required columns exist
      if (!midtermStudentInfoCols['LASTNAME'] || !midtermStudentInfoCols['FIRST NAME']) {
        console.warn('🔄 SYNC: Midterm sheet missing required STUDENT INFO columns');
        midtermFinalSyncInProgress.current = false;
        return;
      }

      if (!finalStudentInfoCols['LASTNAME'] || !finalStudentInfoCols['FIRST NAME']) {
        console.warn('🔄 SYNC: Final sheet missing required STUDENT INFO columns');
        midtermFinalSyncInProgress.current = false;
        return;
      }

      // 🔥 EFFICIENT & ROBUST: Extract ALL rows from Midterm (including empty ones)
      // This ensures we detect when rows are cleared/deleted and sync them to Final
      // We check all rows under STUDENT INFO category (columns A-E: NO., LASTNAME, FIRST NAME, MIDDLE NAME, STUDENT ID)
      const midtermRows = midtermData.data.tableData.map((row, index) => {
        const student = {};
        let hasAnyData = false;

        Object.entries(midtermStudentInfoCols).forEach(([colName, colIndex]) => {
          // 🔥 FIX: Handle sparse arrays - check if value exists, not just row length
          // Google Sheets API returns sparse arrays (empty cells are undefined, not included)
          if (colIndex !== undefined) {
            // Get raw value - may be undefined if cell is empty or row is sparse
            let rawValue = row[colIndex];
            let actualIndex = colIndex;

            // 🔥 FIX: If STUDENT ID is empty at identified index, search for it in the row
            // This handles cases where headers and data rows are misaligned
            if (colName === 'STUDENT ID' && (!rawValue || String(rawValue).trim() === '')) {
              // Pattern to match STUDENT ID format: XX-XXXX-XXX (e.g., 22-1234-567)
              const studentIdPattern = /^\d{2}-\d{4}-\d{3}$/;

              // Search the row for a value matching STUDENT ID pattern
              for (let i = 0; i < row.length; i++) {
                const cellValue = String(row[i] || '').trim();
                if (studentIdPattern.test(cellValue)) {
                  rawValue = cellValue;
                  actualIndex = i;
                  break;
                }
              }
            }

            // Convert to string, handling undefined/null/empty
            const stringValue = rawValue !== undefined && rawValue !== null
              ? String(rawValue)
              : '';
            student[colName] = stringValue.trim();

            // Check if this column has data (for STUDENT INFO columns A-E)
            if (student[colName] && student[colName] !== '') {
              hasAnyData = true;
            }
          } else {
            student[colName] = '';
          }
        });

        // Return ALL rows, including empty ones - mark if they have data
        return {
          rowIndex: index,
          data: student,
          hasData: hasAnyData || (student['LASTNAME'] || student['FIRST NAME'])
        };
      });

      // Use all rows for comparison, but filter for syncing (only sync rows with data)
      const midtermStudents = midtermRows.filter(row => row.hasData);

      if (midtermStudents.length === 0) {
        midtermFinalSyncInProgress.current = false;
        return;
      }

      // 🔥 OPTIMIZATION: Collect all updates first, then batch into single API call
      // This reduces API calls from N to 1, making it much more efficient
      let syncCount = 0;
      const allUpdates = []; // Collect ALL updates (syncs + clears) for batching
      const newStudentsToAdd = []; // Collect new students to add

      // Process syncs and collect updates
      for (const midtermStudent of midtermStudents) {
        const match = findMatchingStudent(
          finalData.data.tableData,
          finalData.data.headers,
          midtermStudent.data,
          midtermStudent.rowIndex,
          finalStudentInfoCols
        );

        // Check if sync is needed
        let needsSync = false;

        if (!match) {
          // New student - needs to be added
          needsSync = true;
        } else {
          // Student exists - check if info is different
          const finalRow = finalData.data.tableData[match.rowIndex];

          // 🔥 EFFICIENT & ROBUST: Check all columns for differences
          // This includes empty values - if Midterm is empty, Final should be empty too
          Object.entries(finalStudentInfoCols).forEach(([colName, colIndex]) => {
            if (colIndex === undefined) return;

            // 🔥 ROBUST: Normalize Midterm value - treat undefined/null/empty as empty string
            const midtermValue = midtermStudent.data[colName] !== undefined &&
              midtermStudent.data[colName] !== null &&
              String(midtermStudent.data[colName]).trim() !== ''
              ? String(midtermStudent.data[colName]).trim()
              : '';

            // 🔥 ROBUST: Normalize Final value - treat undefined/null/empty as empty string
            const finalValue = finalRow &&
              finalRow.length > colIndex &&
              finalRow[colIndex] !== undefined &&
              finalRow[colIndex] !== null &&
              String(finalRow[colIndex]).trim() !== ''
              ? String(finalRow[colIndex]).trim()
              : '';

            // Skip NO. column for comparison (can differ)
            // 🔥 EFFICIENT & ROBUST: For all other fields, sync if different
            // This includes:
            // - Empty in Midterm, has value in Final → needsSync = true (will clear Final)
            // - Has value in Midterm, empty in Final → needsSync = true (will update Final)
            // - Different non-empty values → needsSync = true (will update Final)
            // - Both empty → needsSync = false (no change needed, more efficient)
            if (colName !== 'NO.' && midtermValue !== finalValue) {
              needsSync = true;
            }
          });

        }

        if (needsSync) {
          if (!match) {
            // New student - collect for batch addition
            const studentData = {
              'LASTNAME': midtermStudent.data['LASTNAME'],
              'FIRST NAME': midtermStudent.data['FIRST NAME']
            };

            if (midtermStudent.data['MIDDLE NAME']) {
              studentData['MIDDLE NAME'] = midtermStudent.data['MIDDLE NAME'];
            }

            if (midtermStudent.data['STUDENT ID']) {
              studentData['STUDENT ID'] = midtermStudent.data['STUDENT ID'];
            }

            newStudentsToAdd.push(
              classRecordService.addStudentToGoogleSheetsWithAutoNumber(
                classRecord.google_sheet_id,
                studentData,
                finalSheet.sheet_name
              )
            );
          } else {
            // Existing student - collect updates for batching
            const updateCount = syncStudentInfoToFinal(
              classRecord.google_sheet_id,
              midtermStudent.data,
              midtermStudent.rowIndex,
              finalSheet.sheet_name,
              finalData.data.tableData,
              finalData.data.headers,
              match,
              finalStudentInfoCols,
              midtermStudentInfoCols,
              midtermData.data.headers,
              midtermData.data.tableData,
              allUpdates // Pass updates array to collect updates
            );

            if (updateCount && updateCount > 0) {
              syncCount++;
            }
          }
        }
      }

      // Wait for all new students to be added
      await Promise.all(newStudentsToAdd);
      if (newStudentsToAdd.length > 0) {
        syncCount += newStudentsToAdd.length;
      }

      // 🔥 EFFICIENT & ROBUST: Clear rows in Final that are empty/null in Midterm
      // Check ALL rows in Final against ALL rows in Midterm (by position and by matching)
      // This handles cases where data was deleted/cleared in Midterm
      // 🔥 OPTIMIZATION: Collect clear updates into allUpdates array for batching
      let clearCount = 0;

      // Get ALL rows from Final sheet (including empty ones)
      const finalRows = finalData.data.tableData.map((row, index) => {
        const student = {};
        let hasAnyStudentInfoData = false;

        Object.entries(finalStudentInfoCols).forEach(([colName, colIndex]) => {
          if (colIndex !== undefined && row.length > colIndex) {
            student[colName] = String(row[colIndex] || '').trim();
            if (student[colName] && student[colName] !== '') {
              hasAnyStudentInfoData = true;
            }
          } else {
            student[colName] = '';
          }
        });

        // Return ALL rows with their data state
        return {
          rowIndex: index,
          data: student,
          hasData: hasAnyStudentInfoData || (student['LASTNAME'] || student['FIRST NAME'])
        };
      });

      // 🔥 EFFICIENT & ROBUST: Check each Final row against ALL Midterm rows (including empty ones)
      // Verify that each Final row matches a Midterm row WITH DATA - if not, clear it
      for (const finalRow of finalRows) {
        // Only process rows that have data in Final
        if (!finalRow.hasData) continue;

        // 🔥 CRITICAL FIX: Match by IDENTIFIER first (STUDENT ID or name), then check if Midterm row has data
        // This detects when a Midterm row is empty but still has the same identifier
        let matchFound = false;
        let matchedMidtermRow = null;
        let matchedMidtermRowHasData = false;

        // First priority: Match by STUDENT ID (most reliable)
        // Check ALL Midterm rows, including empty ones, to find matching STUDENT ID
        if (finalRow.data['STUDENT ID'] && finalRow.data['STUDENT ID'] !== '') {
          for (const midtermRow of midtermRows) {
            // Match by STUDENT ID regardless of whether Midterm row has data
            if (midtermRow.data['STUDENT ID'] &&
              midtermRow.data['STUDENT ID'] === finalRow.data['STUDENT ID']) {
              matchFound = true;
              matchedMidtermRow = midtermRow;
              matchedMidtermRowHasData = midtermRow.hasData;
              break; // Found match, stop searching
            }
          }
        }

        // Second priority: Match by name (LASTNAME + FIRST NAME) if no STUDENT ID match
        // Check ALL Midterm rows, including empty ones, to find matching name
        if (!matchFound && finalRow.data['LASTNAME'] && finalRow.data['FIRST NAME']) {
          const finalLastName = finalRow.data['LASTNAME'].toLowerCase().trim();
          const finalFirstName = finalRow.data['FIRST NAME'].toLowerCase().trim();

          for (const midtermRow of midtermRows) {
            const midtermLastName = (midtermRow.data['LASTNAME'] || '').toLowerCase().trim();
            const midtermFirstName = (midtermRow.data['FIRST NAME'] || '').toLowerCase().trim();

            // Match by name regardless of whether Midterm row has data
            if (midtermLastName === finalLastName &&
              midtermFirstName === finalFirstName) {
              matchFound = true;
              matchedMidtermRow = midtermRow;
              matchedMidtermRowHasData = midtermRow.hasData;
              break; // Found match, stop searching
            }
          }
        }

        // 🔥 CLEAR LOGIC: Clear Final row if:
        // 1. No match found in Midterm (student doesn't exist), OR
        // 2. Match found but Midterm row is empty (student was deleted/cleared)
        const shouldClear = !matchFound || (matchFound && !matchedMidtermRowHasData);

        if (shouldClear) {
          // Row 1: Internal IDs, Row 2: Category names, Row 3: Subcategory headers, Row 4: Max scores
          const finalRowNumber = finalRow.rowIndex + 5; // +4 for header rows (Row 1-4), +1 for 1-based
          const clearUpdates = [];

          // Clear all STUDENT INFO columns (A-E: NO., LASTNAME, FIRST NAME, MIDDLE NAME, STUDENT ID)
          Object.entries(finalStudentInfoCols).forEach(([colName, colIndex]) => {
            if (colIndex !== undefined) {
              const columnLetter = columnIndexToLetter(colIndex);
              clearUpdates.push({
                range: `'${finalSheet.sheet_name}'!${columnLetter}${finalRowNumber}`,
                values: [['']] // Clear the cell - make it null/empty
              });
            }
          });

          if (clearUpdates.length > 0) {
            // 🔥 OPTIMIZATION: Collect clear updates into allUpdates array for batching
            allUpdates.push(...clearUpdates);
            clearCount++;
          }
        }
      }

      // 🔥 OPTIMIZATION: Batch ALL updates (syncs + clears) into single API call
      // This reduces API calls from N to 1, making it much more efficient
      if (allUpdates.length > 0) {
        try {
          await classRecordService.updateMultipleCells(classRecord.google_sheet_id, {
            updates: allUpdates,
            sheet_name: finalSheet.sheet_name
          });
        } catch (error) {
          console.error(`🔄 SYNC: Failed to batch update Final sheet:`, error);
          // Don't throw - continue to update hash even if some updates failed
        }
      }

      // 🔥 OPTIMIZATION: Update hash after successful sync
      // This ensures we don't re-sync the same data
      lastMidtermHashRef.current = currentMidtermHash;

      const totalChanges = syncCount + clearCount;

      // 🔥 PREVENT DUPLICATE TOASTS: Only show toast if result is different from last sync
      // This prevents showing the same toast multiple times for the same changes
      const currentSyncResult = { syncCount, clearCount, timestamp: Date.now() };
      const isDuplicateResult =
        lastSyncResultRef.current.syncCount === syncCount &&
        lastSyncResultRef.current.clearCount === clearCount &&
        (Date.now() - (lastSyncResultRef.current.timestamp || 0)) < 2000; // Same result within 2 seconds = duplicate

      if (totalChanges > 0 && !isDuplicateResult) {
        // Clear any pending toast debounce
        if (toastDebounceTimeoutRef.current) {
          clearTimeout(toastDebounceTimeoutRef.current);
          toastDebounceTimeoutRef.current = null;
        }

        // Dismiss any existing toast first
        if (lastSyncToastRef.current) {
          toast.dismiss(lastSyncToastRef.current);
        }

        let message = '';
        if (syncCount > 0 && clearCount > 0) {
          message = `Synced ${syncCount} student(s) and cleared ${clearCount} student(s) in Final sheet`;
        } else if (syncCount > 0) {
          message = `Synced ${syncCount} student(s) to Final sheet`;
        } else if (clearCount > 0) {
          message = `Cleared ${clearCount} student(s) in Final sheet`;
        }

        // Show toast immediately (no debounce)
        const toastId = toast.success(message, { duration: 3000 });
        lastSyncToastRef.current = toastId;

        // Update last sync result to prevent duplicates
        lastSyncResultRef.current = currentSyncResult;
      } else if (totalChanges === 0) {
        // No changes - reset last sync result so next change will show toast
        lastSyncResultRef.current = { syncCount: 0, clearCount: 0, timestamp: 0 };
      }

    } catch (error) {
      console.error('🔄 SYNC: Error checking Midterm-Final sync:', error);
      // Don't show error toast - this is background operation
    } finally {
      midtermFinalSyncInProgress.current = false;
    }
  }, [classRecord?.google_sheet_id, identifyStudentInfoColumns, findMatchingStudent, syncStudentInfoToFinal]);

  // 🔥 PHASE 5: Manual sync function - syncs to SETTINGS tab and checks allocation
  const manualSyncToSettings = useCallback(async (sheetName = null) => {
    if (isRefreshingAllocation || percentageCheckInProgress.current) {
      console.log('⏭️ Sync already in progress');
      return;
    }

    setIsRefreshingAllocation(true);
    try {
      const targetSheet = sheetName || currentSheet?.sheet_name;
      if (!targetSheet) {
        toast.error('No sheet selected for sync');
        return;
      }

      console.log(`🔄 Manual sync triggered for ${targetSheet}`);

      // Force sync to SETTINGS tab
      const syncRes = await classRecordService.syncCategoryPercentages(id, targetSheet, { force: true });
      const syncData = syncRes.data || {};

      // Show sync feedback
      if (syncData.settings_synced && Object.keys(syncData.settings_synced).length > 0) {
        const syncedCount = Object.keys(syncData.settings_synced).length;
        const sheetType = targetSheet?.toLowerCase().includes('midterm') ? 'SETTINGS_MIDTERM' :
          targetSheet?.toLowerCase().includes('final') ? 'SETTINGS_FINAL' : 'SETTINGS';
        toast.success(
          `✅ Synced ${syncedCount} categor${syncedCount === 1 ? 'y' : 'ies'} to ${sheetType} tab`,
          { duration: 3000 }
        );
      }

      if (syncData.settings_errors && Object.keys(syncData.settings_errors).length > 0) {
        const errorCount = Object.keys(syncData.settings_errors).length;
        toast.error(
          `⚠️ ${errorCount} categor${errorCount === 1 ? 'y' : 'ies'} failed to sync`,
          { duration: 4000 }
        );
      }

      // Wait a bit for sync to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Then check allocation (which reads from SETTINGS tab)
      lastPercentageCheckTime.current = 0; // Bypass rate limiting
      await checkAllSheetsForPercentageChanges();

      toast.success('Allocation status updated from SETTINGS tab', { duration: 2000 });
    } catch (error) {
      console.error('Failed to sync to SETTINGS:', error);
      toast.error('Failed to sync to SETTINGS tab');
    } finally {
      setIsRefreshingAllocation(false);
    }
  }, [isRefreshingAllocation, checkAllSheetsForPercentageChanges, currentSheet?.sheet_name, id]);

  // 🔥 PHASE 5: Manual refresh function for allocation status (kept for backward compatibility)
  const manualRefreshAllocation = useCallback(async () => {
    // This now calls manualSyncToSettings to ensure sync happens first
    await manualSyncToSettings();
  }, [manualSyncToSettings]);

  // No ref sync needed; we use state directly for simplicity

  // 🔥 OPTIMIZED: Smart toast - only show once on initial load, then rely on persistent badge
  useEffect(() => {
    // Require auth
    if (!user) {
      if (classStandingToastIdRef.current) {
        toast.dismiss(classStandingToastIdRef.current);
        classStandingToastIdRef.current = null;
      }
      lastToastKeyRef.current = null;
      hasShownInitialToast.current = false;
      return;
    }

    // If nothing missing, ensure toast is closed
    if (classStandingRemaining <= 0) {
      if (classStandingToastIdRef.current) {
        toast.dismiss(classStandingToastIdRef.current);
        classStandingToastIdRef.current = null;
      }
      lastToastKeyRef.current = null;
      return;
    }

    // 🔥 NEW LOGIC: Only show toast ONCE on initial load
    // After that, the persistent badge in the header will show the status
    if (hasShownInitialToast.current) {
      console.log('📊 Toast already shown, skipping (badge is visible)');
      return;
    }

    // Build message from problematic sheets
    let message;
    if (problematicSheets.length === 1) {
      message = `Class Standing allocation incomplete: ${classStandingRemaining}% remaining in ${problematicSheets[0].sheetName}`;
    } else if (problematicSheets.length > 1) {
      const sheetList = problematicSheets
        .map(s => `${s.sheetName} (${s.remaining}% remaining)`)
        .join(', ');
      message = `Class Standing allocation incomplete: ${classStandingRemaining}% total remaining across ${sheetList}`;
    } else {
      message = `Class Standing allocation incomplete: ${classStandingRemaining}% remaining`;
    }

    // Show toast with 8-second duration (not infinite)
    classStandingToastIdRef.current = showToast.info(
      message,
      'Class Standing Allocation',
      { duration: 8000 } // 🔥 Changed from Infinity to 8 seconds
    );

    hasShownInitialToast.current = true;
    lastToastKeyRef.current = JSON.stringify(problematicSheets.map(s => ({ n: s.sheetName, r: s.remaining })));
  }, [user, classStandingRemaining, problematicSheets]);

  // No-op: kept for backward compatibility with existing calls
  const resetToastDismissal = useCallback(() => { }, []);

  // Drive file picker state
  const [showDriveFilePicker, setShowDriveFilePicker] = useState(false);
  const [importType, setImportType] = useState('students'); // 'students' or 'scores'

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    clearTranscript,
    recentStudents,
    addRecentStudent,
    addCommandHistory,
    alternatives,
    buildContextDictionary,
    interimBatchCommand,
    setInterimBatchCommand
  } = useVoiceRecognition();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastVoiceCommand, setLastVoiceCommand] = useState('');
  const [duplicateOptions, setDuplicateOptions] = useState(null);
  const [dropdowns, setDropdowns] = useState({
    tools: false,
    voice: false,
    edit: false
  });
  const [showVoiceGuide, setShowVoiceGuide] = useState(false);
  // 🔥 NEW: Mode selection modal state
  const [showModeSelectionModal, setShowModeSelectionModal] = useState(false);
  // 🔊 Single-entry voice processing state
  const [voicePhase, setVoicePhase] = useState('idle'); // idle | listening | recognized | verifying | processing | writing | done | error
  const [voiceStatus, setVoiceStatus] = useState('');
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const voiceCancelRef = useRef(false);
  const slowTimerRef = useRef(null);
  const processingStartRef = useRef(null);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      console.log('🔥 FIRST RENDER: Component mounted');
    }
  }, []);

  // 🔥 OPTIMIZED: Check for percentage changes every 30 seconds (uses 30s backend cache)
  // This matches the backend cache duration perfectly - no wasted API calls!
  useEffect(() => {
    if (!classRecord?.google_sheet_id || !currentSheet?.sheet_name) return;

    // Initial check on mount
    checkForPercentageChanges();

    // Then poll every 30 seconds to align with backend cache expiration
    const interval = setInterval(() => {
      checkForPercentageChanges();
    }, 30000); // every 30s - matches backend cache duration

    return () => clearInterval(interval);
  }, [classRecord?.google_sheet_id, currentSheet?.sheet_name, checkForPercentageChanges]);

  // 🔄 AUTO-SYNC: Periodic checker for Midterm to Final sync (every 10 seconds for faster sync)
  useEffect(() => {
    if (!classRecord?.google_sheet_id) return;

    // Initial check after 3 seconds (let page load, but faster than before)
    const initialTimeout = setTimeout(() => {
      if (!midtermFinalSyncInProgress.current) {
        checkMidtermFinalSync();
      }
    }, 3000); // Reduced from 5s to 3s for faster initial sync

    // Then check every 10 seconds (faster polling for quicker sync detection)
    // This ensures changes are synced within 30 seconds (3 checks max)
    const interval = setInterval(() => {
      // Prevent overlapping checks
      if (midtermFinalSyncInProgress.current) {
        return;
      }

      checkMidtermFinalSync();
    }, 10000); // 10 seconds - faster polling for quicker sync

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [classRecord?.google_sheet_id, checkMidtermFinalSync]);

  const loadCategories = async () => {
    try {
      console.log('🔍 LOAD_CATEGORIES: Starting...');
      console.log('🔍 LOAD_CATEGORIES: sheet_id:', classRecord?.google_sheet_id);
      console.log('🔍 LOAD_CATEGORIES: currentSheet:', currentSheet);
      console.log('🔍 LOAD_CATEGORIES: currentSheet.sheet_name:', currentSheet?.sheet_name);

      if (!classRecord?.google_sheet_id) {
        console.log('❌ LOAD_CATEGORIES: No sheet ID');
        return;
      }

      if (!currentSheet?.sheet_name) {
        console.log('❌ LOAD_CATEGORIES: No current sheet name');
        return;
      }

      const response = await classRecordService.getCategoriesFromSheet(
        classRecord.google_sheet_id,
        currentSheet.sheet_name
      );

      console.log('✅ LOAD_CATEGORIES: Response:', response.data);

      if (response.data.success && response.data.categories.length > 0) {
        console.log('✅ LOAD_CATEGORIES: Categories found:', response.data.categories);

        // 🔥 FIX: Filter out any remaining percentages in frontend as backup
        const cleanCategories = response.data.categories.filter(cat =>
          !cat.includes('%') &&
          cat.trim() !== '' &&
          !['Total', 'TOTAL'].includes(cat.toUpperCase())
        );

        console.log('✅ LOAD_CATEGORIES: Clean categories:', cleanCategories);
        setAvailableCategories(cleanCategories);
      } else {
        console.log('❌ LOAD_CATEGORIES: No categories found, using fallback');
        setAvailableCategories(['Projects', 'Quizzes', 'Assignment', 'Seatwork', 'Laboratory Activities']);
      }
    } catch (error) {
      console.error('❌ LOAD_CATEGORIES Error:', error);
      setAvailableCategories(['Projects', 'Quizzes', 'Assignment', 'Seatwork', 'Laboratory Activities']);
    }
  };

  useEffect(() => {
    console.log('🔍 USEEFFECT: Checking conditions...');
    console.log('🔍 USEEFFECT: classRecord?.google_sheet_id:', classRecord?.google_sheet_id);
    console.log('🔍 USEEFFECT: currentSheet:', currentSheet);
    console.log('🔍 USEEFFECT: currentSheet?.sheet_name:', currentSheet?.sheet_name);

    if (classRecord?.google_sheet_id && currentSheet?.sheet_name) {
      console.log('✅ USEEFFECT: Loading categories...');
      loadCategories();
    }
    // 🔥 Don't clear categories when currentSheet becomes null temporarily
  }, [classRecord?.google_sheet_id, currentSheet?.sheet_name]);


  useEffect(() => {
    console.log('🔥 MAIN EFFECT: Checking conditions...');
    console.log('🔥 MAIN EFFECT: transcript:', transcript);
    console.log('🔥 MAIN EFFECT: transcript.trim().length:', transcript?.trim().length);
    console.log('🔥 MAIN EFFECT: isListening:', isListening);
    console.log('🔥 MAIN EFFECT: lastVoiceCommand:', lastVoiceCommand);
    console.log('🔥 MAIN EFFECT: batchMode:', batchMode);

    if (transcript &&
      transcript.trim() &&
      transcript.trim().length >= 3 &&
      !isListening &&
      transcript !== lastVoiceCommand) {

      console.log('🔥 MAIN EFFECT: ✅ All conditions met, processing...');
      console.log('🔥 MAIN EFFECT: batchMode:', batchMode);
      console.log('🔥 MAIN EFFECT: transcript:', transcript);

      if (batchMode) {
        console.log('🔥 MAIN EFFECT: 📦 BATCH MODE - Calling handleBatchVoiceCommand...');

        // 🔥 FIX: Only process if it's a command, not already processed interim
        if (!transcript.toLowerCase().includes('done') &&
          !transcript.toLowerCase().includes('finish') &&
          !transcript.toLowerCase().includes('exit')) {
          console.log('🔥 MAIN EFFECT: 🔄 Skipping main processing - using interim processing only');
          setLastVoiceCommand(transcript);
          // Keep transcript visible in batch mode
          return;
        }

        handleBatchVoiceCommand(transcript);
        setLastVoiceCommand(transcript);

        if (transcript.toLowerCase().includes('done') ||
          transcript.toLowerCase().includes('finish') ||
          transcript.toLowerCase().includes('exit')) {
          console.log('🔥 MAIN EFFECT: 🏁 FINISHING batch mode detected');
          window.batchModeFinishing = true;
          // Keep transcript visible in batch mode
        }

      } else {
        console.log('🔥 MAIN EFFECT: 🎯 NORMAL MODE - Calling handleVoiceCommand...');
        handleVoiceCommand(transcript);
        setLastVoiceCommand(transcript);
        setTimeout(() => clearTranscript(), 2000);
      }
    } else {
      console.log('🔥 MAIN EFFECT: ❌ Conditions not met, skipping...');
    }
  }, [transcript, isListening, lastVoiceCommand, clearTranscript, batchMode]);

  useEffect(() => {
    fetchClassRecord();
  }, [id]);

  useEffect(() => {
    console.log('🔥 BATCH MODE CHANGED:', batchMode);
    console.log('🔥 SHOWBATCHMODAL:', showBatchModal);
    console.log('🔥 CURRENT COLUMN:', currentBatchColumn);
    console.log('🔥 WINDOW FLAGS:', {
      batchModeActive: window.batchModeActive,
      batchModeFinishing: window.batchModeFinishing
    });

    // Get more detailed stack trace
    const stack = new Error().stack;
    const lines = stack.split('\n').slice(0, 8); // Get top 8 lines
    console.log('🔥 DETAILED STACK:', lines);

    // Check if it's being called from an unexpected place
    if (!batchMode && showBatchModal) {
      console.log('🚨 WARNING: batchMode is false but modal is still open!');
    }
  }, [batchMode, showBatchModal, currentBatchColumn]);

  useEffect(() => {
    if (interimBatchCommand && batchMode && currentBatchColumn) {
      console.log('🔥 REAL-TIME: Processing interim command:', interimBatchCommand);

      const studentScorePattern = /^(.+?)\s+(\d+(?:\.\d+)?)[)\].,!?:;-]*$/;
      const match = interimBatchCommand.trim().match(studentScorePattern);

      if (match) {
        const [, rawStudentName, score] = match;

        // 🔥 FIXED: Apply phonetic corrections here too!
        const correctedName = applyPhoneticCorrections(rawStudentName.toLowerCase().trim());
        const cleanedName = cleanName(correctedName);

        console.log('🔥 REAL-TIME: Raw name:', rawStudentName);
        console.log('🔥 REAL-TIME: Corrected name:', correctedName);
        console.log('🔥 REAL-TIME: Final cleaned name:', cleanedName);
        console.log('🔥 REAL-TIME: Calling processBatchEntry for:', cleanedName, score);

        // 🔥 Use the corrected name
        const cleanedScore = score.trim().replace(/[)\].,!?:;-]+$/g, '');
        processBatchEntry(cleanedName, cleanedScore);

        // 🔥 Clear interim command only (keep transcript visible)
        setInterimBatchCommand('');
      }
    }
  }, [interimBatchCommand, batchMode, currentBatchColumn]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && batchMode) {
        console.log('🔥 ESCAPE: Preventing escape key in batch mode');
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [batchMode]);

  const fetchClassRecord = async () => {
    // 🔥 OPTIMIZATION: Prevent multiple simultaneous fetches
    if (fetchInProgress.current) {
      console.log('⏭️ Fetch already in progress, skipping...');
      return;
    }

    try {
      fetchInProgress.current = true;
      setLoading(true);

      // Fetch basic class record info
      const response = await classRecordService.getClassRecord(id);
      console.log("📊 Fetched class record data:", response.data);
      setClassRecord(response.data);

      // 🔥 Load ALL sheets data for multi-sheet support
      if (response.data?.google_sheet_id) {
        console.log("📊 Fetching ALL Google Sheets data for multi-sheet support...");

        try {
          // 🔥 NEW: Get list of all sheets first
          const sheetsListResponse = await classRecordService.getSheetsList(response.data.google_sheet_id);
          console.log("🔥 DEBUG: sheetsListResponse:", sheetsListResponse);
          console.log("📋 Sheets list response:", sheetsListResponse.data);

          if (sheetsListResponse.data?.success && sheetsListResponse.data.sheets?.length > 0) {
            // Filter out Settings_Midterm and Settings_Final sheets from the dropdown
            const filteredSheets = sheetsListResponse.data.sheets.filter(sheet => {
              const sheetName = sheet.sheet_name?.toLowerCase() || '';
              return !sheetName.includes('settings_midterm') && !sheetName.includes('settings_final');
            });

            if (filteredSheets.length === 0) {
              console.warn('⚠️ No sheets available after filtering out Settings sheets');
              return;
            }

            setAvailableSheets(filteredSheets);

            // Set the first sheet as current by default
            const firstSheet = filteredSheets[0];
            setCurrentSheet(firstSheet);

            // Load data from the first sheet
            await loadSheetData(response.data.google_sheet_id, firstSheet.sheet_name);

            // Sync CLASS STANDING percentages from all sheets into backend mirror
            try {
              await checkAllSheetsForPercentageChanges();
            } catch (e) {
              console.warn('⚠️ Failed to sync category percentages:', e);
            }

            console.log("✅ Multi-sheet data loaded successfully!");
          } else {
            console.log("⚠️ Falling back to single sheet mode");
            // Fall back to original single sheet loading
            await loadSingleSheetData(response.data.google_sheet_id);
          }
        } catch (sheetsError) {
          console.error("❌ Failed to load multi-sheet data, falling back to single sheet:", sheetsError);
          // Fall back to original single sheet loading
          await loadSingleSheetData(response.data.google_sheet_id);
        }
      }

    } catch (error) {
      console.error('Error fetching class record:', error);
      toast.error('Failed to load class record');
      navigate('/class-records');
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  };

  const validateScore = (columnName, score) => {
    const maxScore = maxScores[columnName];

    if (!maxScore) {
      return { valid: true };
    }

    const numericScore = Number(score);

    if (isNaN(numericScore)) {
      return {
        valid: false,
        error: `"${score}" is not a valid number`,
        suggestion: `Please enter a number between 0 and ${maxScore}`
      };
    }

    if (numericScore > maxScore) {
      return {
        valid: false,
        error: `Score ${score} exceeds maximum of ${maxScore} for ${columnName}`,
        suggestion: `Please enter a score between 0 and ${maxScore}`
      };
    }

    if (numericScore < 0) {
      return {
        valid: false,
        error: `Score cannot be negative`,
        suggestion: `Please enter a score between 0 and ${maxScore}`
      };
    }

    return { valid: true };
  };

  const loadSheetData = async (sheetId, sheetName, silent = false) => {
    try {
      console.log(`📊 LOAD SHEET: Loading data from sheet: "${sheetName}" (silent: ${silent})`);
      console.trace('📊 LOAD SHEET: Call stack'); // Add call stack trace

      const sheetsResponse = await classRecordService.getSpecificSheetData(sheetId, sheetName);
      console.log(`📊 LOAD SHEET: API response success: ${sheetsResponse.data?.success}`);
      console.log(`📊 LOAD SHEET: Returned sheet name: ${sheetsResponse.data?.sheet_name}`);

      if (sheetsResponse.data?.success && sheetsResponse.data.headers?.length > 0) {
        setHeaders(sheetsResponse.data.headers);

        const maxScores = sheetsResponse.data.max_scores || [];
        console.log('📊 MAX SCORES:', maxScores);

        const maxScoreMap = {};
        sheetsResponse.data.headers.forEach((header, index) => {
          const maxScore = maxScores[index];
          if (maxScore && !isNaN(Number(maxScore)) && Number(maxScore) > 0) {
            maxScoreMap[header] = Number(maxScore);
          }
        });

        console.log('📊 MAX SCORE MAP:', maxScoreMap);

        setMaxScores(maxScoreMap);

        // Convert table data for voice commands context
        if (sheetsResponse.data.tableData?.length > 0) {
          const convertedTableData = sheetsResponse.data.tableData.map(row => {
            const rowObject = {};
            sheetsResponse.data.headers.forEach((header, index) => {
              rowObject[header] = row[index] || '';
            });
            return rowObject;
          });

          setTableData(convertedTableData);

          buildContextDictionary(convertedTableData, sheetsResponse.data.headers);

          // Update the sheet name in voice command context
          if (window.voiceCommandContext) {
            window.voiceCommandContext.activeSheet = sheetName;
            console.log(`📊 LOAD SHEET: Updated voice command context with sheet: "${sheetName}"`);
          }

          // 🔥 NEW: Auto-protect perfect score row when sheet loads
          try {
            console.log(`🔒 Auto-protecting perfect score row for sheet: ${sheetName}...`);
            await classRecordService.protectPerfectScoreRow(sheetId, sheetName);
            console.log("✅ Perfect score row protected successfully");
          } catch (protectionError) {
            console.log("⚠️ Could not protect perfect score row (may already be protected):", protectionError);
            // Don't show error to user as this is non-critical
          }
        }

        console.log(`✅ LOAD SHEET: Sheet "${sheetName}" data loaded successfully!`);
        if (!silent) {
          toast.success(`Switched to sheet: ${sheetName}`);
        }

        // After loading sheet data, refresh mirrored CLASS STANDING percentages
        await syncRemaining();
      } else {
        console.log(`⚠️ LOAD SHEET: No data available for sheet: "${sheetName}"`);
        toast(`No data found in sheet: ${sheetName}`);
      }
    } catch (error) {
      console.error(`❌ LOAD SHEET ERROR for "${sheetName}":`, error);
      toast.error(`Failed to load sheet: ${sheetName}`);
    }
  };

  const loadSingleSheetData = async (sheetId) => {
    try {
      const sheetsResponse = await classRecordService.getGoogleSheetsDataServiceAccount(sheetId);
      console.log("📊 Google Sheets API response (single sheet):", sheetsResponse.data);

      if (sheetsResponse.data?.success && sheetsResponse.data.headers?.length > 0) {
        setHeaders(sheetsResponse.data.headers);

        // Convert table data for voice commands context
        if (sheetsResponse.data.tableData?.length > 0) {
          const convertedTableData = sheetsResponse.data.tableData.map(row => {
            const rowObject = {};
            sheetsResponse.data.headers.forEach((header, index) => {
              rowObject[header] = row[index] || '';
            });
            return rowObject;
          });

          setTableData(convertedTableData);

          buildContextDictionary(convertedTableData, sheetsResponse.data.headers);

          // 🔥 NEW: Auto-protect perfect score row when sheet loads
          try {
            console.log("🔒 Auto-protecting perfect score row...");
            await classRecordService.protectPerfectScoreRow(sheetId);
            console.log("✅ Perfect score row protected successfully");
          } catch (protectionError) {
            console.log("⚠️ Could not protect perfect score row (may already be protected):", protectionError);
            // Don't show error to user as this is non-critical
          }
        }

        console.log("✅ Voice command data loaded successfully (single sheet)!");
      } else {
        console.log("⚠️ No Google Sheets data available for voice commands");
      }
    } catch (error) {
      console.error("❌ Failed to load Google Sheets data:", error);
    }
  };

  const switchToSheet = async (sheet) => {
    if (!classRecord?.google_sheet_id || !sheet) return;

    console.log(`🔄 SWITCHING SHEET: Attempting to switch to sheet "${sheet.sheet_name}"`);
    setLoadingSheets(true);

    try {
      console.log(`🔄 SWITCHING SHEET: Current sheet before load: ${currentSheet?.sheet_name}`);
      console.log(`🔄 SWITCHING SHEET: New sheet target: ${sheet.sheet_name}`);

      // IMPORTANT: Update state first and then wait for it to complete
      // Use the callback function to ensure we have the updated state value
      setCurrentSheet(sheet);

      // Store the sheet name in localStorage for persistence
      localStorage.setItem('activeSheetName', sheet.sheet_name);
      console.log(`🔄 SWITCHING SHEET: Saved active sheet to localStorage: ${sheet.sheet_name}`);

      // Add a global variable to track the current sheet name
      window.currentActiveSheet = sheet.sheet_name;
      console.log(`🔄 SWITCHING SHEET: Set global current sheet to: ${window.currentActiveSheet}`);

      await loadSheetData(classRecord.google_sheet_id, sheet.sheet_name);

      // After loading the data, set a flag in the voice command context
      if (window.voiceCommandContext) {
        window.voiceCommandContext.activeSheet = sheet.sheet_name;
      }
      console.log(`🔄 SWITCHING SHEET: Updated voice command context with sheet name: ${sheet.sheet_name}`);

      // Force-set the sheet again to make sure
      setCurrentSheet(sheet);

      // 🔥 If batch mode is active, we need to refresh the column options
      if (batchMode) {
        setCurrentBatchColumn(''); // Reset column selection
        toast('Column selection reset for new sheet');
      }

    } catch (error) {
      console.error('❌ SWITCHING SHEET ERROR:', error);
      toast.error('Failed to switch sheet');
    } finally {
      setLoadingSheets(false);
      setShowSheetSelector(false);

      // Check if the state was actually updated correctly
      setTimeout(() => {
        console.log(`🔄 SWITCHING SHEET: Final current sheet value: ${currentSheet?.sheet_name}`);

        // If it still didn't update correctly, force it one more time
        if (currentSheet?.sheet_name !== sheet.sheet_name) {
          console.log(`🔄 SWITCHING SHEET: State not updated correctly, forcing update...`);
          setCurrentSheet(sheet);
        }
      }, 100);
    }
  };

  const handleSheetSwitchVoiceCommand = (transcript) => {
    // Listen for commands like "switch to sheet 1", "go to testing sheet", etc.
    const sheetSwitchPattern = /(?:switch to|go to|use)\s+(?:sheet\s+)?(.+)/i;
    const match = transcript.trim().match(sheetSwitchPattern);

    if (match) {
      const targetSheetName = match[1].trim().toLowerCase();

      // Find matching sheet
      const matchingSheet = availableSheets.find(sheet =>
        sheet.sheet_name.toLowerCase().includes(targetSheetName) ||
        targetSheetName.includes(sheet.sheet_name.toLowerCase())
      );

      if (matchingSheet) {
        switchToSheet(matchingSheet);
        return true; // Command handled
      } else {
        toast.error(`Sheet "${targetSheetName}" not found`);
        if (voiceEnabled) {
          speakText(`Sheet ${targetSheetName} not found`);
        }
        return true; // Command handled (even if failed)
      }
    }

    return false; // Command not handled
  };

  // Function to fix permissions for existing sheets that are view-only
  const fixSheetPermissions = async () => {
    if (!classRecord?.google_sheet_id) {
      toast.error('No Google Sheet found for this record');
      return;
    }

    try {
      toast('Updating sheet permissions...', { duration: 2000 });

      const googleSheetsService = (await import('../services/googleSheetsService.js')).default;

      const result = await googleSheetsService.updatePermissions(
        classRecord.google_sheet_id,
        false, // make_public_readable
        true   // make_editable
      );

      if (result.success) {
        toast.success('Sheet permissions updated! Please refresh the page.');

        // Auto-refresh after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error('Failed to update permissions: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Error updating sheet permissions');
    }
  };

  const handleImportScores = () => {
    // Check if user has Google Drive access
    if (!googleDriveService.hasGoogleAccess()) {
      toast.error('Please sign in with Google to access Drive files');
      return;
    }

    // Set import type and open Drive file picker
    setImportType('scores');
    setShowDriveFilePicker(true);
  };

  const processScoresImportFile = async (file) => {
    if (!classRecord?.google_sheet_id) {
      toast.error('No Google Sheet connected');
      return;
    }

    try {
      setImportProgress({ status: 'reading', message: 'Reading Excel file...', entity: 'scores' });

      // Read Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (jsonData.length < 2) {
        throw new Error('Excel file must have at least a header row and one data row');
      }

      setImportProgress({ status: 'parsing', message: 'Parsing columns and scores...', entity: 'scores' });

      // Parse headers and data
      const headers = jsonData[0].map(h => String(h || '').trim());
      const dataRows = jsonData.slice(1);

      // Separate student info columns from score columns
      const studentColumns = ['NO.', 'NO', 'LASTNAME', 'LAST NAME', 'FIRSTNAME', 'FIRST NAME', 'STUDENT ID'];
      const scoreColumns = headers.filter(header =>
        !studentColumns.some(sc => header.toUpperCase().includes(sc.toUpperCase()))
      );

      // Create unique keys for duplicate import column names (e.g., QUIZ, QUIZ)
      const nameCounts = {};
      const uniqueScoreColumns = scoreColumns.map(orig => {
        const key = orig || '';
        const lower = key.toLowerCase();
        const n = (nameCounts[lower] || 0) + 1;
        nameCounts[lower] = n;
        // Append stable internal suffix when duplicated
        return nameCounts[lower] > 1 ? `${key}__${n}` : key;
      });

      if (scoreColumns.length === 0) {
        throw new Error('No score columns found in the Excel file');
      }

      // Find name column indices for student identification
      const lastNameIndex = findColumnIndex(headers, ['last name', 'lastname', 'surname']);
      const firstNameIndex = findColumnIndex(headers, ['first name', 'firstname', 'given name']);

      if (lastNameIndex === -1 || firstNameIndex === -1) {
        throw new Error('Could not find student name columns in the Excel file');
      }

      // Parse student scores for each column
      const columnData = {};
      const students = [];

      for (let idx = 0; idx < scoreColumns.length; idx++) {
        const scoreColumn = scoreColumns[idx];
        const uniqueKey = uniqueScoreColumns[idx];
        const columnIndex = headers.indexOf(scoreColumn);
        columnData[uniqueKey] = {};

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const lastName = String(row[lastNameIndex] || '').trim();
          const firstName = String(row[firstNameIndex] || '').trim();
          const score = String(row[columnIndex] || '').trim();

          if (lastName && firstName && score) {
            const studentKey = `${firstName} ${lastName}`;  // "Zachary Banks"

            columnData[uniqueKey][studentKey] = score;

            // Track students
            if (!students.find(s => s.key === studentKey)) {
              students.push({
                key: studentKey,
                firstName,
                lastName,
                originalRow: i + 2
              });
            }
          }
        }
      }

      const importData = {
        // Use unique keys to track duplicate import columns distinctly
        columns: uniqueScoreColumns,
        columnData,
        students,
        totalDataPoints: Object.values(columnData).reduce((sum, scores) => sum + Object.keys(scores).length, 0)
      };

      setImportProgress({ status: 'auto-mapping', message: 'Auto-mapping columns...', entity: 'scores' });

      // NEW: Use auto-mapping instead of manual mapping
      const autoMappingResponse = await classRecordService.autoMapColumns(
        classRecord.google_sheet_id,
        uniqueScoreColumns,
        classRecord.id,
        currentSheet?.sheet_name,
        // pass importData so server can preview exceeds-max
        importData
      );

      if (!autoMappingResponse.data?.success) {
        throw new Error(autoMappingResponse.data?.error || 'Auto-mapping failed');
      }

      // Store for review modal
      setAutoMappingResult(autoMappingResponse.data);
      setPendingImportData(importData);
      setShowImportReviewModal(true);
      setImportProgress(null);

    } catch (error) {
      console.error('Scores import error:', error);
      toast.error(`Import failed: ${error.message}`);
      setImportProgress(null);
    }
  };

  const handleConfirmColumnMapping = async (mappings) => {
    try {
      setImportProgress({ status: 'importing', message: 'Importing column data and renaming headers...', entity: 'scores' });

      const response = await classRecordService.executeColumnImportEnhanced(
        classRecord.google_sheet_id,
        mappings,
        pendingImportData,
        classRecord.id, // 🔥 NEW: Pass class record ID for history tracking
        currentSheet?.sheet_name
      );

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Import failed');
      }

      const { summary } = response.data;
      const sheetInfo = currentSheet ? ` in ${currentSheet.sheet_name}` : '';

      toast.success(`Scores import complete${sheetInfo}. ${summary}`, { duration: 4500 });
      if (voiceEnabled) {
        speakText(`Column import completed. ${summary}${sheetInfo}`);
      }

      // Warn if any scores exceeded max and were skipped
      const exceededTotal = response.data.exceedsMaxTotal || 0;
      if (exceededTotal > 0) {
        const as = response.data.actionSummary || {};
        const byColumn = Object.entries(as)
          .filter(([, v]) => (v && v.exceedsMax) > 0)
          .map(([k, v]) => `${k} (${v.exceedsMax})`)
          .join(', ');
        const detail = byColumn ? `: ${byColumn}` : '';
        toast(`Some scores exceeded the column max and were skipped${detail}`, { duration: 7000 });
      }

      // Clean up
      setImportProgress(null);
      setShowColumnImportModal(false);
      setColumnAnalysis(null);
      setPendingImportData(null);

    } catch (error) {
      console.error('Column import execution error:', error);
      toast.error(`Import failed: ${error.message}`);
      setImportProgress(null);
    }
  };

  // NEW: Auto-mapping handlers
  const handleConfirmAutoMapping = async (decisions) => {
    try {
      setImportProgress({ status: 'importing', message: 'Importing with auto-mapping...', entity: 'scores' });

      const response = await classRecordService.executeAutoMapping(
        classRecord.google_sheet_id,
        decisions,
        pendingImportData,
        classRecord.id,
        currentSheet?.sheet_name
      );

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Import failed');
      }

      const { summary } = response.data;
      const sheetInfo = currentSheet ? ` in ${currentSheet.sheet_name}` : '';

      toast.success(`Scores import complete${sheetInfo}. ${summary || ''}`.trim(), { duration: 4500 });
      if (voiceEnabled) {
        speakText(`Import completed with auto-mapping. ${summary}${sheetInfo}`);
      }

      // Warn if any scores exceeded max and were skipped
      const exceededTotal2 = response.data.exceedsMaxTotal || 0;
      if (exceededTotal2 > 0) {
        const as2 = response.data.actionSummary || {};
        const byColumn2 = Object.entries(as2)
          .filter(([, v]) => (v && v.exceedsMax) > 0)
          .map(([k, v]) => `${k} (${v.exceedsMax})`)
          .join(', ');
        const detail2 = byColumn2 ? `: ${byColumn2}` : '';
        toast(`Some scores exceeded the column max and were skipped${detail2}`, { duration: 7000 });
      }

      // Clean up
      setImportProgress(null);
      setShowImportReviewModal(false);
      setAutoMappingResult(null);
      setPendingImportData(null);

    } catch (error) {
      console.error('Auto-mapping execution error:', error);
      toast.error(`Import failed: ${error.message}`);
      setImportProgress(null);
    }
  };

  const handleEditMapping = () => {
    // From review → open manual mapping with analysis populated
    (async () => {
      try {
        setImportProgress({ status: 'analyzing', message: 'Analyzing mapping options...' });
        // Ensure we have columns from the pending import
        const importColumns = pendingImportData?.columns || [];
        const analysisResponse = await classRecordService.analyzeColumnsForMappingEnhanced(
          classRecord.google_sheet_id,
          importColumns,
          classRecord.id,
          currentSheet?.sheet_name
        );
        if (!analysisResponse.data?.success) {
          throw new Error(analysisResponse.data?.error || 'Failed to analyze columns');
        }
        setColumnAnalysis(analysisResponse.data);
        setShowImportReviewModal(false);
        setShowColumnImportModal(true);
      } catch (e) {
        console.error('Edit mapping analysis error:', e);
        toast.error(`Failed to open mapping editor: ${e.message}`);
      } finally {
        setImportProgress(null);
      }
    })();
  };

  const executeCommand = (command) => {
    switch (command.type) {
      case 'SMART_NAME_GRADE_ENTRY':
        handleSmartNameGradeEntryVoice(command.data);
        break;
      case 'ADD_STUDENT':
        handleAddStudentVoice(command.data);
        break;
      case 'DELETE_STUDENT_BY_NAME':
        handleDeleteStudentByName(command.data);
        break;
      case 'DELETE_STUDENT_BY_ID':
        handleDeleteStudentById(command.data);
        break;
      case 'UPDATE_MAX_SCORE':
        handleUpdateMaxScore(command.data);
        break;
      case 'UPDATE_BATCH_MAX_SCORE':
        handleBatchUpdateMaxScore(command.data);
        break;
      case 'STUDENT_ID_GRADE_ENTRY':
        console.log('🆔 Executing STUDENT_ID_GRADE_ENTRY handler');
        handleStudentIdGradeEntry(command.data);
        break;
      case 'SORT_STUDENTS':
        console.log('🔄 Executing SORT_STUDENTS handler');
        handleSortStudents(command.data);
        break;
      case 'EXPORT_EXCEL':
        handleExportToExcel();
        break;
      case 'EXPORT_PDF':
        handleExportToPDF();
        break;
      case 'EXPORT_CSV':
        handleExportToCSV();
        break;
      case 'UNDO_COMMAND':
        toast('🔄 Undo functionality not available in Google Sheets mode');
        break;
      case 'REDO_COMMAND':
        toast('🔄 Redo functionality not available in Google Sheets mode');
        break;
      case 'BATCH_EVERYONE':
        handleBatchEveryoneCommand(command.data);
        break;
      case 'UPDATE_STUDENT_ID':
        handleUpdateStudentId(command.data);
        break;
      case 'BATCH_STUDENT_LIST':
        handleBatchStudentListCommand(command.data);
        break;
      case 'BATCH_ROW_RANGE':
        handleBatchRowRangeCommand(command.data);
        break;
      case 'SCORE_EXCEEDS_MAX':
        // 🔥 NEW: Handle score exceeding maximum
        console.log('❌ SCORE_EXCEEDS_MAX detected:', command.data);
        const errorMessage = command.data.errorMessage ||
          `Score ${command.data.value} exceeds maximum of ${command.data.maxScore} for ${command.data.column}`;

        toast.error(`❌ ${errorMessage}`);
        if (voiceEnabled) {
          const voiceMessage = command.data.searchName
            ? `Cannot update ${command.data.searchName}. ${errorMessage}`
            : errorMessage;
          speakText(voiceMessage);
        }

        // Show error state in voice overlay
        setVoicePhase('error');
        setVoiceBusy(true);
        setVoiceStatus('Score exceeds maximum');

        // Auto-clear error state after 4 seconds
        setTimeout(() => {
          setVoiceBusy(false);
          setVoicePhase('idle');
          setVoiceStatus('');
        }, 4000);
        break;
      default:
        toast.error(`🎙️ Command not recognized: "${command.data?.originalText || 'Unknown command'}"`);
        if (voiceEnabled) {
          speakText('Sorry, I didn\'t understand that command. Please try again.');
        }
    }
  };

  const handleDeleteStudentByName = async (data) => {
    console.log('🗑️ Delete student by name:', data);

    if (!classRecord?.google_sheet_id) {
      toast.error('No Google Sheet connected');
      return;
    }

    try {
      // Get fresh data for student search
      let sheetsResponse;
      if (currentSheet) {
        sheetsResponse = await classRecordService.getSpecificSheetData(
          classRecord.google_sheet_id,
          currentSheet.sheet_name
        );
      } else {
        sheetsResponse = await classRecordService.getGoogleSheetsDataServiceAccount(classRecord.google_sheet_id);
      }

      if (!sheetsResponse.data?.success || !sheetsResponse.data.tableData?.length) {
        toast.error('Could not load student data');
        return;
      }

      // Convert data and find student
      const convertedTableData = [];
      sheetsResponse.data.tableData.forEach((row, originalIndex) => {
        const rowObject = {};
        sheetsResponse.data.headers.forEach((header, index) => {
          rowObject[header] = row[index] || '';
        });
        rowObject._originalTableIndex = originalIndex;
        convertedTableData.push(rowObject);
      });

      const result = findStudentRowSmart(convertedTableData, data.searchName, recentStudents);

      if (result.needsConfirmation && result.possibleMatches.length > 1) {
        // Show duplicate modal for deletion
        setDuplicateModalData({
          matches: result.possibleMatches,
          command: { ...data, type: 'DELETE_STUDENT_BY_NAME' },
          searchName: data.searchName,
          convertedTableData,
          isDeleteAction: true
        });
        setShowDuplicateModal(true);

        toast(
          `🤔 Multiple students found named "${data.searchName}". Please select which one to delete.`,
          { duration: 5000, icon: '🤔' }
        );

        if (voiceEnabled) {
          speakText(`Found multiple students named ${data.searchName}. Please select which student to delete.`);
        }
        return;
      }

      if (result.bestMatch !== -1) {
        const student = convertedTableData[result.bestMatch];
        const studentName = `${student['FIRST NAME']} ${student['LASTNAME']}`;

        // Show delete confirmation modal
        setDeleteStudentModal({
          isOpen: true,
          studentName: studentName,
          studentData: student,
          searchType: 'name',
          identifier: data.searchName
        });
      } else {
        toast.error(`Student "${data.searchName}" not found`);
        if (voiceEnabled) {
          speakText(`Student ${data.searchName} not found`);
        }
      }
    } catch (error) {
      console.error('Delete student error:', error);
      toast.error('Failed to find student for deletion');
      if (voiceEnabled) {
        speakText('Failed to find student. Please try again.');
      }
    }
  };

  const handleDeleteStudentById = async (data) => {
    console.log('🗑️ Delete student by ID:', data);

    if (!classRecord?.google_sheet_id) {
      toast.error('No Google Sheet connected');
      return;
    }

    // Show delete confirmation modal directly
    setDeleteStudentModal({
      isOpen: true,
      studentName: `Student ID: ${data.studentId}`,
      studentData: { 'STUDENT ID': data.studentId },
      searchType: 'id',
      identifier: data.studentId
    });
  };

  const confirmDeleteStudent = async () => {
    if (!deleteStudentModal.identifier) return;

    try {
      setIsDeleting(true);

      const response = await classRecordService.deleteStudentFromSheet(
        classRecord.google_sheet_id,
        {
          student_identifier: deleteStudentModal.identifier,
          search_type: deleteStudentModal.searchType,
          sheet_name: currentSheet?.sheet_name
        }
      );

      if (response.data.success) {
        const deletedStudent = response.data.deleted_student;
        toast.success(`Student "${deletedStudent.full_name}" deleted successfully!`);

        if (voiceEnabled) {
          speakText(`Student ${deletedStudent.full_name} has been deleted successfully.`);
        }

        // 🔥 CRITICAL: Add delay before refreshing data
        setTimeout(async () => {
          // 🔥 FORCE UPDATE: Clear any cached data
          setTableData([]);
          setHeaders([]);

          // Load fresh data once
          await loadSheetData(classRecord.google_sheet_id, currentSheet?.sheet_name);
        }, 1000);

        setDeleteStudentModal({ isOpen: false, studentName: '', studentData: null });
      } else {
        toast.error(`Failed to delete student: ${response.data.error}`);
        if (voiceEnabled) {
          speakText('Failed to delete student. Please try again.');
        }
      }
    } catch (error) {
      console.error('Delete student error:', error);
      toast.error('Failed to delete student');
      if (voiceEnabled) {
        speakText('Failed to delete student. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };


  const handleSortStudents = async (data) => {
    try {
      const { sortType, direction } = data;

      // 🔥 START LOADING STATE
      setIsSorting(true); // You'll need to add this state variable

      toast(`🔄 Sorting students by ${sortType} (${direction}ending)...`);

      if (voiceEnabled) {
        speakText(`Sorting students by ${sortType === 'firstName' ? 'first name' : sortType === 'lastName' ? 'last name' : 'alphabetical order'}`);
      }

      // Use your existing data instead of fetching fresh data
      if (!headers || !tableData || tableData.length === 0) {
        toast.error('No student data available to sort');
        return;
      }

      console.log('🔍 DEBUG: headers:', headers);
      console.log('🔍 DEBUG: tableData sample:', tableData.slice(0, 3));

      // 🔥 SHOW PROGRESS: Analyzing data
      toast.loading('📊 Analyzing student data...', { id: 'sort-progress' });

      // Find the column indices for sorting
      const firstNameIndex = headers.findIndex(h => h.toLowerCase().includes('first'));
      const lastNameIndex = headers.findIndex(h => h.toLowerCase().includes('lastname'));
      const noIndex = headers.findIndex(h => h.toLowerCase().includes('no') || h.toLowerCase() === 'no.');

      console.log('🔍 DEBUG: firstNameIndex:', firstNameIndex);
      console.log('🔍 DEBUG: lastNameIndex:', lastNameIndex);
      console.log('🔍 DEBUG: noIndex:', noIndex);

      if (firstNameIndex === -1 || lastNameIndex === -1) {
        toast.error('Could not find name columns for sorting');
        return;
      }

      // 🔥 IDENTIFY FORMULA COLUMNS (same logic as delete/add functions)
      const formulaColumnIndices = [];
      headers.forEach((header, index) => {
        const headerName = header.toUpperCase();
        const formula_keywords = ['TOTAL', 'SUM', 'AVERAGE', 'AVG', 'FORMULA'];
        const is_formula_column = formula_keywords.some(keyword => headerName.includes(keyword));

        if (is_formula_column) {
          formulaColumnIndices.push(index);
          console.log(`🔥 IDENTIFIED FORMULA COLUMN: ${header} at index ${index}`);
        }
      });

      // 🔥 SHOW PROGRESS: Filtering students
      toast.loading('🔍 Filtering student records...', { id: 'sort-progress' });

      // 🔥 FIXED: Better empty row filtering - check for student names specifically
      const nonEmptyRows = tableData.filter(row => {
        const lastName = row[headers[lastNameIndex]] || '';
        const firstName = row[headers[firstNameIndex]] || '';

        // Row is valid if it has either last name or first name
        return (lastName.trim() !== '' && lastName.trim() !== '0') ||
          (firstName.trim() !== '' && firstName.trim() !== '0');
      });

      console.log('🔍 Original rows:', tableData.length);
      console.log('🔍 Non-empty rows:', nonEmptyRows.length);

      if (nonEmptyRows.length === 0) {
        toast.error('No students found to sort');
        return;
      }

      // 🔥 SHOW PROGRESS: Sorting
      toast.loading(`📋 Sorting ${nonEmptyRows.length} students...`, { id: 'sort-progress' });

      // Sort the data
      const sortedData = [...nonEmptyRows].sort((a, b) => {
        let valueA, valueB;

        switch (sortType) {
          case 'firstName':
            valueA = (a[headers[firstNameIndex]] || '').toLowerCase();
            valueB = (b[headers[firstNameIndex]] || '').toLowerCase();
            break;
          case 'lastName':
            valueA = (a[headers[lastNameIndex]] || '').toLowerCase();
            valueB = (b[headers[lastNameIndex]] || '').toLowerCase();
            break;
          case 'alphabetical':
          default:
            // Sort by last name first, then first name
            const lastNameA = (a[headers[lastNameIndex]] || '').toLowerCase();
            const lastNameB = (b[headers[lastNameIndex]] || '').toLowerCase();
            const firstNameA = (a[headers[firstNameIndex]] || '').toLowerCase();
            const firstNameB = (b[headers[firstNameIndex]] || '').toLowerCase();

            if (lastNameA !== lastNameB) {
              valueA = lastNameA;
              valueB = lastNameB;
            } else {
              valueA = firstNameA;
              valueB = firstNameB;
            }
            break;
        }

        // Apply direction
        if (direction === 'desc') {
          return valueB.localeCompare(valueA);
        } else {
          return valueA.localeCompare(valueB);
        }
      });

      // 🔥 SHOW PROGRESS: Preparing updates
      toast.loading('🔧 Preparing sheet updates...', { id: 'sort-progress' });

      // 🔥 CRITICAL: Instead of updating entire range, update ONLY data columns
      const updates = [];

      // 🔥 Step 1: Clear existing data columns (preserve formulas)
      const originalSize = tableData.length;
      for (let rowIndex = 0; rowIndex < originalSize; rowIndex++) {
        // Row 1: Internal IDs, Row 2: Category names, Row 3: Subcategory headers, Row 4: Max scores
        const sheetRow = rowIndex + 5; // +4 for header rows (Row 1-4), +1 for 1-based indexing

        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
          // 🔥 SKIP formula columns
          if (!formulaColumnIndices.includes(colIndex)) {
            const columnLetter = String.fromCharCode(65 + colIndex);
            updates.push({
              range: `${currentSheet?.sheet_name ? `'${currentSheet.sheet_name}'!` : ''}${columnLetter}${sheetRow}`,
              values: [['']]
            });
          }
        }
      }

      // 🔥 Step 2: Place sorted students in new positions (only data columns)
      sortedData.forEach((student, newIndex) => {
        const studentNumber = newIndex + 1;
        const newSheetRow = newIndex + 4; // Start from row 4

        headers.forEach((header, colIndex) => {
          // 🔥 SKIP formula columns
          if (!formulaColumnIndices.includes(colIndex)) {
            const columnLetter = String.fromCharCode(65 + colIndex);
            let value = '';

            if (colIndex === noIndex) {
              // NO. column
              value = studentNumber.toString();
            } else {
              // Other data columns
              value = student[header] || '';
            }

            updates.push({
              range: `${currentSheet?.sheet_name ? `'${currentSheet.sheet_name}'!` : ''}${columnLetter}${newSheetRow}`,
              values: [[value]]
            });
          }
        });
      });

      console.log(`🔄 FORMULA-SAFE SORT: Prepared ${updates.length} updates (avoiding ${formulaColumnIndices.length} formula columns)`);

      // 🔥 Execute updates in batches to avoid Google Sheets limits
      const batchSize = 100;
      let totalUpdated = 0;
      const totalBatches = Math.ceil(updates.length / batchSize);

      for (let i = 0; i < updates.length; i += batchSize) {
        const batchNumber = Math.floor(i / batchSize) + 1;

        // 🔥 SHOW PROGRESS: Batch updates
        toast.loading(`📤 Updating Google Sheets (${batchNumber}/${totalBatches})...`, { id: 'sort-progress' });

        const batchUpdates = updates.slice(i, i + batchSize);

        const response = await classRecordService.updateMultipleCells(
          classRecord.google_sheet_id,
          {
            updates: batchUpdates,
            sheet_name: currentSheet?.sheet_name
          }
        );

        if (response.data?.success) {
          totalUpdated += batchUpdates.length;
          console.log(`🔄 SORT: Batch ${batchNumber} completed - ${batchUpdates.length} updates`);
        } else {
          throw new Error(response.data?.error || 'Batch update failed');
        }
      }

      // 🔥 SHOW PROGRESS: Refreshing data
      toast.loading('Refreshing data...', { id: 'sort-progress' });

      // 🔥 DISMISS LOADING TOAST
      toast.dismiss('sort-progress');

      toast.success(`Students sorted by ${sortType} successfully! (${totalUpdated} cells updated, formulas preserved)`);

      if (voiceEnabled) {
        speakText(`Students have been sorted by ${sortType === 'firstName' ? 'first name' : sortType === 'lastName' ? 'last name' : 'alphabetical order'} with formulas preserved`);
      }

      // Refresh your data
      setTimeout(async () => {
        if (currentSheet) {
          await loadSheetData(classRecord.google_sheet_id, currentSheet.sheet_name);
        } else {
          await loadSingleSheetData(classRecord.google_sheet_id);
        }
      }, 1000);

    } catch (error) {
      console.error('Sort error:', error);

      // 🔥 DISMISS LOADING TOAST ON ERROR
      toast.dismiss('sort-progress');

      toast.error('Failed to sort students');

      if (voiceEnabled) {
        speakText('Sorry, there was an error sorting the students. Please try again.');
      }
    } finally {
      // 🔥 END LOADING STATE
      setIsSorting(false);
    }
  };

  const handleStudentIdGradeEntry = async (data) => {
    try {
      toast('🆔 Finding student by ID...');

      // Ensure sheet data is loaded
      if (!classRecord?.google_sheet_id || !currentSheet?.sheet_name) {
        toast.error('No sheet selected');
        return;
      }

      // Load fresh sheet data if needed
      if (headers.length === 0 || tableData.length === 0) {
        await loadSheetData(classRecord.google_sheet_id, currentSheet.sheet_name);
      }

      // Use current state variables
      if (headers.length === 0 || tableData.length === 0) {
        toast.error('Could not load sheet data');
        return;
      }

      // Find student by ID
      const studentIdColumnIndex = headers.findIndex(h =>
        h.toLowerCase().includes('student') && h.toLowerCase().includes('id')
      );

      if (studentIdColumnIndex === -1) {
        toast.error('Student ID column not found');
        return;
      }

      // Find the student row
      const studentRowIndex = tableData.findIndex(row =>
        row[studentIdColumnIndex] === data.studentId
      );

      if (studentRowIndex === -1) {
        toast.error(`Student ID ${data.studentId} not found`);
        if (voiceEnabled) {
          speakText(`Student ID ${data.studentId} not found in the class record`);
        }
        return;
      }

      // Get student name for display
      const studentRow = tableData[studentRowIndex];
      const lastNameIndex = headers.findIndex(h => h.toLowerCase().includes('lastname'));
      const firstNameIndex = headers.findIndex(h => h.toLowerCase().includes('first'));

      const studentName = [
        studentRow[firstNameIndex] || '',
        studentRow[lastNameIndex] || ''
      ].filter(Boolean).join(' ');

      // Find target column
      const targetColumnIndex = headers.findIndex(h => h === data.column);

      if (targetColumnIndex === -1) {
        toast.error(`Column "${data.column}" not found`);
        return;
      }

      // Update the grade
      const updateResponse = await classRecordService.updateGoogleSheetsCellSpecific(
        classRecord.google_sheet_id,
        studentRowIndex,
        data.column,
        data.value,
        currentSheet?.sheet_name
      );

      if (!updateResponse.data?.success) {
        throw new Error(updateResponse.data?.error || 'Failed to update cell');
      }

      // Reset toast dismissal flag since user made changes
      resetToastDismissal();

      toast.success(`Updated ${studentName} (ID: ${data.studentId}) - ${data.column}: ${data.value}`);

      if (voiceEnabled) {
        speakText(`Successfully updated ${studentName} ${data.column} score to ${data.value}`);
      }

    } catch (error) {
      console.error('Student ID grade entry error:', error);
      toast.error('Failed to update grade by student ID');
    }
  };

  const handleUpdateMaxScore = async (data) => {
    console.log('🎯 Updating max score:', data);

    if (!classRecord?.google_sheet_id) {
      toast.error('No Google Sheet connected');
      return;
    }

    try {
      // Get the active sheet name
      const activeSheetName =
        window.currentActiveSheet ||
        localStorage.getItem('activeSheetName') ||
        (window.voiceCommandContext && window.voiceCommandContext.activeSheet) ||
        (currentSheet && currentSheet.sheet_name);

      console.log('🎯 Using active sheet for max score update:', activeSheetName);

      // Update the max score using the new API
      const response = await classRecordService.updateMaxScore(
        classRecord.google_sheet_id,
        data.column,
        data.maxScore.toString(),
        activeSheetName
      );

      console.log('🔧 Max score update response:', response);

      if (response.data?.success) {
        const sheetUsed = response.data.sheet_name || activeSheetName || 'spreadsheet';

        // Reset toast dismissal flag since user made changes
        resetToastDismissal();

        toast.success(`${data.column} max score updated to ${data.maxScore} in ${sheetUsed}`);
        if (voiceEnabled) {
          speakText(`Successfully updated ${data.column} maximum score to ${data.maxScore}`);
        }

        // 🔥 Optional: Trigger a refresh of the sheet data if you have that functionality
        // refreshSheetData();

      } else {
        throw new Error(response.data?.error || 'Failed to update max score');
      }
    } catch (error) {
      console.error('❌ Update max score error:', error);

      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      toast.error(`Failed to update max score: ${errorMessage}`);
      if (voiceEnabled) {
        speakText('Failed to update the maximum score. Please try again.');
      }
    }
  };

  const handleBatchUpdateMaxScore = async (data) => {
    console.log('🎯 Batch updating max scores:', data);

    if (!classRecord?.google_sheet_id) {
      toast.error('No Google Sheet connected');
      return;
    }

    try {
      // Get the active sheet name
      const activeSheetName =
        window.currentActiveSheet ||
        localStorage.getItem('activeSheetName') ||
        (window.voiceCommandContext && window.voiceCommandContext.activeSheet) ||
        (currentSheet && currentSheet.sheet_name);

      console.log('🎯 Using active sheet for batch max score update:', activeSheetName);
      console.log('🎯 Updating columns:', data.columns);
      console.log('🎯 New max score:', data.maxScore);

      // Update the batch max scores using the new API
      const response = await classRecordService.updateBatchMaxScores(
        classRecord.google_sheet_id,
        data.columns,
        data.maxScore.toString(),
        activeSheetName
      );

      console.log('🔧 Batch max score update response:', response);

      if (response.data?.success) {
        const results = response.data.results;
        const sheetUsed = activeSheetName || 'spreadsheet';

        if (results.updated_columns > 0) {
          const columnList = data.columns.slice(0, 3).join(', ') +
            (data.columns.length > 3 ? `... (${data.columns.length} total)` : '');

          toast.success(`Updated ${results.updated_columns} columns to max score ${data.maxScore}: ${columnList}`);
          if (voiceEnabled) {
            speakText(`Successfully updated ${results.updated_columns} ${data.category} columns to maximum score ${data.maxScore}`);
          }
        }

        if (results.failed_columns > 0) {
          console.warn('⚠️ Some columns failed to update:', results.errors);
          toast.warn(`⚠️ ${results.failed_columns} columns failed to update`);
        }

        // 🔥 Optional: Trigger a refresh of the sheet data if you have that functionality
        // refreshSheetData();

      } else {
        throw new Error(response.data?.error || 'Failed to update batch max scores');
      }
    } catch (error) {
      console.error('❌ Batch update max scores error:', error);

      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      toast.error(`Failed to update max scores: ${errorMessage}`);
      if (voiceEnabled) {
        speakText('Failed to update the maximum scores. Please try again.');
      }
    }
  };

  const handleBatchEveryoneCommand = async (data) => {
    console.log('🎯 Handling batch everyone command:', data);

    const validation = validateScore(data.column, data.score);
    if (!validation.valid) {
      toast.error(`❌ Batch command failed: ${validation.error}`);
      if (voiceEnabled) {
        speakText(`Batch command failed. ${validation.error}`);
      }
      return;
    }

    if (!classRecord?.google_sheet_id) {
      toast.error('No Google Sheet connected');
      return;
    }

    try {
      // Get fresh data for student search
      let sheetsResponse;
      if (currentSheet) {
        console.log('🔥 DEBUG: Using current sheet:', currentSheet.sheet_name);
        sheetsResponse = await classRecordService.getSpecificSheetData(
          classRecord.google_sheet_id,
          currentSheet.sheet_name
        );
      } else {
        console.log('🔥 DEBUG: Using default sheet data');
        sheetsResponse = await classRecordService.getGoogleSheetsDataServiceAccount(classRecord.google_sheet_id);
      }

      console.log('🔥 DEBUG: Sheets response:', sheetsResponse.data);

      if (!sheetsResponse.data?.success || !sheetsResponse.data.tableData?.length) {
        toast.error('Could not load student data');
        return;
      }

      console.log('🔥 DEBUG: Available headers:', sheetsResponse.data.headers);
      console.log('🔥 DEBUG: Looking for column:', data.column);

      // 🔥 ENHANCED: Find the column with fuzzy matching
      const targetColumn = sheetsResponse.data.headers.find(header =>
        header.toLowerCase().includes(data.column.toLowerCase()) ||
        data.column.toLowerCase().includes(header.toLowerCase())
      );

      console.log('🔥 DEBUG: Found target column:', targetColumn);

      if (!targetColumn) {
        toast.error(`Column "${data.column}" not found. Available columns: ${sheetsResponse.data.headers.join(', ')}`);
        return;
      }

      // Convert array data to objects for processing
      const convertedTableData = sheetsResponse.data.tableData.map(row => {
        const rowObject = {};
        sheetsResponse.data.headers.forEach((header, index) => {
          rowObject[header] = row[index] || '';
        });
        return rowObject;
      });

      console.log('🔥 DEBUG: Converted table data sample:', convertedTableData.slice(0, 3));

      // Filter students based on condition
      let studentsToUpdate = [];

      if (data.condition === 'present') {
        // Only students who are "present" (have some data in the row)
        studentsToUpdate = convertedTableData.filter((row, index) => {
          const hasData = row['FIRST NAME'] && row['LASTNAME'];
          console.log(`🔥 DEBUG: Student ${index}: ${row['FIRST NAME']} ${row['LASTNAME']} - hasData: ${hasData}`);
          return hasData;
        });
      } else {
        // All students
        studentsToUpdate = convertedTableData.filter((row, index) => {
          return row['FIRST NAME'] && row['LASTNAME'];
        });
      }

      console.log('🔥 DEBUG: Students to update:', studentsToUpdate.length);
      console.log('🔥 DEBUG: Students list:', studentsToUpdate.map(s => `${s['FIRST NAME']} ${s['LASTNAME']}`));

      if (studentsToUpdate.length === 0) {
        toast.error('No students found to update');
        return;
      }

      // Confirm with user
      const confirmMessage = `Update ${targetColumn} to ${data.score} for ${studentsToUpdate.length} students?`;
      console.log('🔥 DEBUG: Confirmation message:', confirmMessage);

      if (!window.confirm(confirmMessage)) {
        console.log('🔥 DEBUG: User cancelled update');
        return;
      }

      console.log('🔥 DEBUG: Starting updates...');

      // Update all students
      let successCount = 0;
      for (let i = 0; i < studentsToUpdate.length; i++) {
        const studentIndex = convertedTableData.indexOf(studentsToUpdate[i]);
        const studentName = `${studentsToUpdate[i]['FIRST NAME']} ${studentsToUpdate[i]['LASTNAME']}`;

        console.log(`🔥 DEBUG: Updating student ${i + 1}/${studentsToUpdate.length}: ${studentName} at index ${studentIndex}`);

        try {
          let updateResponse;
          if (currentSheet) {
            console.log('🔥 DEBUG: Using sheet-specific update');
            updateResponse = await classRecordService.updateGoogleSheetsCellSpecific(
              classRecord.google_sheet_id,
              studentIndex,
              targetColumn, // Use the found column name
              data.score,
              currentSheet.sheet_name
            );
          } else {
            console.log('🔥 DEBUG: Using default update');
            updateResponse = await classRecordService.updateGoogleSheetsCell(
              classRecord.google_sheet_id,
              studentIndex,
              targetColumn, // Use the found column name
              data.score
            );
          }

          console.log(`🔥 DEBUG: Update response for ${studentName}:`, updateResponse.data);

          if (updateResponse.data?.success) {
            successCount++;
            console.log(`✅ Successfully updated ${studentName}`);
          } else {
            console.error(`❌ Failed to update ${studentName}:`, updateResponse.data);
          }
        } catch (error) {
          console.error(`❌ Exception updating ${studentName}:`, error);
        }
      }

      console.log('🔥 DEBUG: Final results:', { successCount, totalAttempted: studentsToUpdate.length });

      const sheetInfo = currentSheet ? ` in ${currentSheet.sheet_name}` : '';
      toast.success(`Updated ${targetColumn} to ${data.score} for ${successCount} students${sheetInfo}`);

      if (voiceEnabled) {
        speakText(`Successfully updated ${targetColumn} to ${data.score} for ${successCount} students`);
      }

    } catch (error) {
      console.error('🔥 DEBUG: Batch everyone command error:', error);
      toast.error('Failed to process batch command');
      if (voiceEnabled) {
        speakText('Failed to process the batch command. Please try again.');
      }
    }
  };


  const handleBatchStudentListCommand = async (data) => {
    console.log('🎯 Handling batch student list command:', data);

    const { students, column } = data;

    try {
      // 🔥 STEP 1: Find the column by name from the voice command
      if (!column || column.trim() === '') {
        toast.error('No column specified in voice command');
        return;
      }

      const columnName = column.trim();
      const foundColumn = headers.find(header =>
        header.toLowerCase().includes(columnName.toLowerCase()) ||
        columnName.toLowerCase().includes(header.toLowerCase())
      );

      if (!foundColumn) {
        toast.error(`Column "${columnName}" not found`);
        return;
      }

      console.log(`🎯 Found column: "${foundColumn}" for "${columnName}"`);

      // 🔥 STEP 2: Validate all scores first
      const invalidScores = [];
      students.forEach(({ name, score }) => {
        const validation = validateScore(foundColumn, score);
        if (!validation.valid) {
          invalidScores.push({ name, score, error: validation.error });
        }
      });

      if (invalidScores.length > 0) {
        const errorMsg = invalidScores.map(e => `${e.name}: ${e.score} - ${e.error}`).join(', ');
        toast.error(`Cannot process batch: Invalid scores detected - ${errorMsg}`);
        if (voiceEnabled) {
          speakText(`Cannot process batch. ${invalidScores.length} invalid scores detected.`);
        }
        return;
      }

      // 🔥 STEP 3: Find and update students
      const updatedData = [...tableData];
      let updatedCount = 0;
      const updates = [];

      // Find name column indices
      const lastNameIndex = headers.findIndex(h => h.toLowerCase().includes('lastname'));
      const firstNameIndex = headers.findIndex(h => h.toLowerCase().includes('first'));

      students.forEach(({ name, score }) => {
        // Search for student by name (try matching against last name, first name, or full name)
        const nameLower = name.toLowerCase().trim();
        const studentIndex = tableData.findIndex((row, index) => {
          if (lastNameIndex !== -1 && firstNameIndex !== -1) {
            const lastName = String(row[lastNameIndex] || '').toLowerCase().trim();
            const firstName = String(row[firstNameIndex] || '').toLowerCase().trim();
            const fullName = `${firstName} ${lastName}`.trim();
            return lastName === nameLower ||
              firstName === nameLower ||
              fullName === nameLower ||
              fullName.includes(nameLower) ||
              nameLower.includes(fullName);
          } else if (lastNameIndex !== -1) {
            const lastName = String(row[lastNameIndex] || '').toLowerCase().trim();
            return lastName === nameLower || lastName.includes(nameLower) || nameLower.includes(lastName);
          } else if (firstNameIndex !== -1) {
            const firstName = String(row[firstNameIndex] || '').toLowerCase().trim();
            return firstName === nameLower || firstName.includes(nameLower) || nameLower.includes(firstName);
          }
          return false;
        });

        if (studentIndex !== -1) {
          updatedData[studentIndex][foundColumn] = score;
          updates.push({
            // Row 1: Internal IDs, Row 2: Category names, Row 3: Subcategory headers, Row 4: Max scores
            row: studentIndex + 5, // +4 for header rows (Row 1-4), +1 for 1-based
            column: foundColumn,
            value: score
          });
          updatedCount++;
          console.log(`✅ Updated ${name} = ${score}`);
        } else {
          console.log(`⚠️ Student "${name}" not found`);
        }
      });

      // 🔥 STEP 3: Save to Google Sheets
      if (updates.length > 0) {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL_DEV}/api/gradebook/update-scores/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            google_sheet_id: classRecord.google_sheet_id,
            updates: updates
          })
        });

        if (response.ok) {
          setTableData(updatedData);

          // Reset toast dismissal flag since user made changes
          resetToastDismissal();

          toast.success(`Updated ${updatedCount} students in ${foundColumn}`);

          if (voiceEnabled) {
            speakText(`Successfully updated ${updatedCount} students in ${foundColumn}`);
          }
        } else {
          toast.error('Failed to save batch updates to Google Sheets');
        }
      } else {
        toast.error('No students were found to update');
      }

    } catch (error) {
      console.error('❌ Batch student list error:', error);
      toast.error(`Batch student list failed: ${error.message}`);
    }
  };

  const handleBatchRowRangeCommand = async (data) => {
    console.log('🎯 Handling batch row range command:', data);

    const { startRow, endRow, score, column } = data;

    try {
      // 🔥 STEP 1: Find the column by name from the voice command
      if (!column || column.trim() === '') {
        toast.error('No column specified in voice command');
        return;
      }

      const columnName = column.trim();
      const foundColumn = headers.find(header =>
        header.toLowerCase().includes(columnName.toLowerCase()) ||
        columnName.toLowerCase().includes(header.toLowerCase())
      );

      if (!foundColumn) {
        toast.error(`Column "${columnName}" not found`);
        return;
      }

      console.log(`🎯 Found column: "${foundColumn}" for "${columnName}"`);

      // 🔥 STEP 2: Validate score against max score
      const validation = validateScore(foundColumn, score);
      if (!validation.valid) {
        toast.error(`❌ ${validation.error}`);
        if (voiceEnabled) {
          speakText(validation.error);
        }
        return;
      }

      // 🔥 STEP 3: Validate rows
      if (startRow < 0 || endRow < 0 || startRow > endRow) {
        toast.error('Invalid row range');
        return;
      }

      if (endRow >= tableData.length) {
        toast.error(`Row range exceeds table size (${tableData.length} rows)`);
        return;
      }

      // 🔥 STEP 3: Apply scores to the range (UPDATE LOCAL STATE FIRST)
      const updatedData = [...tableData];
      let updatedCount = 0;

      for (let i = startRow; i <= endRow; i++) {
        if (updatedData[i]) {
          updatedData[i][foundColumn] = score;
          updatedCount++;
          console.log(`Updated row ${i + 1}: ${updatedData[i]['FIRST NAME']} ${updatedData[i]['LASTNAME']} = ${score}`);
        }
      }

      // 🔥 STEP 4: Update local state IMMEDIATELY (so user sees changes)
      setTableData(updatedData);

      // 🔥 STEP 5: Show success feedback IMMEDIATELY
      toast.success(`Updated ${updatedCount} students in ${foundColumn} (rows ${startRow + 1}-${endRow + 1}) with score ${score}`);

      if (voiceEnabled) {
        speakText(`Successfully updated ${updatedCount} students in ${foundColumn} with score ${score}`);
      }

      // 🔥 STEP 6: Save to Google Sheets using YOUR EXISTING ENDPOINT
      console.log('💾 Saving batch row range updates to Google Sheets...');

      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL_DEV;

        // 🔥 FIXED: Let backend handle all the indexing - just pass the raw row index
        for (let i = startRow; i <= endRow; i++) {
          if (updatedData[i]) {
            console.log(`🔄 Updating local row ${i} (student ${i + 1}), column ${foundColumn}, value ${score}`);

            const updateResponse = await fetch(`${backendUrl}/api/sheets/service-account/${classRecord.google_sheet_id}/update-cell/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({
                row: i, // 🔥 FIXED: Just pass the raw index - backend handles all the header offset
                column: foundColumn,
                value: score
              })
            });

            if (!updateResponse.ok) {
              const errorText = await updateResponse.text();
              console.error(`❌ Failed to update row ${i}:`, updateResponse.status, errorText);
            } else {
              console.log(`✅ Synced local row ${i} successfully`);
            }
          }
        }

        toast.success(`🔄 All changes synced to Google Sheets`);
        console.log(`🎯 Batch row range complete: ${updatedCount} students updated in ${foundColumn}`);

      } catch (networkError) {
        console.error('❌ Network error during sync:', networkError);
        toast.error('⚠️ Local update successful, but sync failed (network error)');
      }

    } catch (error) {
      console.error('❌ Batch row range error:', error);
      toast.error(`Batch row range failed: ${error.message}`);
    }
  };

  const handleImportStudents = () => {
    // Check if user has Google Drive access
    if (!googleDriveService.hasGoogleAccess()) {
      toast.error('Please sign in with Google to access Drive files');
      return;
    }

    // Set import type and open Drive file picker
    setImportType('students');
    setShowDriveFilePicker(true);
  };

  const processImportFile = async (file) => {
    if (!classRecord?.google_sheet_id) {
      toast.error('No Google Sheet connected');
      return;
    }

    try {
      setImportProgress({ status: 'reading', message: 'Reading Excel file...', entity: 'students' });

      // Read Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (jsonData.length < 2) {
        throw new Error('Excel file must have at least a header row and one data row');
      }

      setImportProgress({ status: 'parsing', message: 'Parsing student data...', entity: 'students' });

      // Parse headers and find columns
      const headers = jsonData[0].map(h => String(h || '').trim());
      const students = [];

      // 🔥 ENHANCED: Smart column detection including Student ID
      const lastNameIndex = findColumnIndex(headers, ['last name', 'lastname', 'surname', 'family name']);
      const firstNameIndex = findColumnIndex(headers, ['first name', 'firstname', 'given name']);
      const middleNameIndex = findColumnIndex(headers, ['middle name', 'middlename', 'middle', 'mi']);  // 🔥 NEW
      const studentIdIndex = findColumnIndex(headers, ['student id', 'studentid', 'id', 'student_id', 'student number']);  // 🔥 NEW

      console.log('🔍 DEBUG: Column detection:');
      console.log(`   First Name: index ${firstNameIndex} (${headers[firstNameIndex]})`);
      console.log(`   Middle Name: index ${middleNameIndex} (${middleNameIndex >= 0 ? headers[middleNameIndex] : 'Not found'})`);  // 🔥 NEW
      console.log(`   Last Name: index ${lastNameIndex} (${headers[lastNameIndex]})`);
      console.log(`   Student ID: index ${studentIdIndex} (${studentIdIndex >= 0 ? headers[studentIdIndex] : 'Not found'})`);

      if (lastNameIndex === -1 || firstNameIndex === -1) {
        throw new Error('Could not find "Last Name" and "First Name" columns in the Excel file');
      }

      // Extract student data (skip header row)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const firstName = String(row[firstNameIndex] || '').trim();
        const middleName = middleNameIndex >= 0 ? String(row[middleNameIndex] || '').trim() : '';  // 🔥 NEW
        const lastName = String(row[lastNameIndex] || '').trim();
        const studentId = studentIdIndex >= 0 ? String(row[studentIdIndex] || '').trim() : '';

        if (lastName && firstName) {
          const student = {
            'FIRST NAME': firstName,
            LASTNAME: lastName,
            originalRow: i + 1
          };

          // 🔥 NEW: Include Middle Name if it exists
          if (middleName) {
            student['MIDDLE NAME'] = middleName;
            console.log(`🔤 DEBUG: Added Middle Name "${middleName}" for ${firstName} ${lastName}`);
          }

          // Include Student ID if it exists
          if (studentId) {
            student['STUDENT ID'] = studentId;
            console.log(`🆔 DEBUG: Added Student ID "${studentId}" for ${firstName} ${lastName}`);
          }

          students.push(student);
        }
      }

      if (students.length === 0) {
        throw new Error('No valid student records found in the Excel file');
      }

      console.log('🔍 DEBUG: Parsed students:', students);

      if (students.length > 10) {
        toast.success(`Ready to import ${students.length} students using optimized bulk import!`, {
          duration: 3000
        });
      }

      setImportProgress({ status: 'checking', message: 'Checking for duplicates...', entity: 'students' });

      // Check for conflicts with existing students
      await checkImportConflicts(students);

    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Import failed: ${error.message}`);
      setImportProgress(null);
    }
  };

  // Handle Drive file selection and processing (also handles computer files)
  const handleDriveFileSelect = async (fileOrDriveFile) => {
    try {
      // Check if file is from computer
      if (fileOrDriveFile.fromComputer && fileOrDriveFile.file) {
        // File is from computer, process directly
        const file = fileOrDriveFile.file;

        // Process based on import type
        if (importType === 'students') {
          await processImportFile(file);
        } else if (importType === 'scores') {
          await processScoresImportFile(file);
        }
        return;
      }

      // File is from Drive, download it first
      const driveFile = fileOrDriveFile;
      setImportProgress({ status: 'downloading', message: 'Downloading file from Drive...', entity: importType });

      // Download file from Drive
      const response = await fetch(`${import.meta.env.PROD
        ? 'http://127.0.0.1:8000'
        : 'http://127.0.0.1:8000'}/api/drive/download/${driveFile.id}/`, {
        headers: googleDriveService.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const file = new File([blob], driveFile.name, { type: blob.type });

      // Process based on import type
      if (importType === 'students') {
        await processImportFile(file);
      } else if (importType === 'scores') {
        await processScoresImportFile(file);
      }

    } catch (error) {
      console.error('File processing error:', error);
      toast.error(`Failed to process file: ${error.message}`);
      setImportProgress(null);
    }
  };

  const findColumnIndex = (headers, possibleNames) => {
    for (const name of possibleNames) {
      const index = headers.findIndex(h => {
        const headerLower = h.toLowerCase().trim();
        const nameLower = name.toLowerCase().trim();

        if (headerLower === nameLower) return true;

        const headerWords = headerLower.split(/\s+/);
        const nameWords = nameLower.split(/\s+/);

        return nameWords.every(nameWord =>
          headerWords.some(headerWord => headerWord === nameWord)
        );
      });
      if (index !== -1) return index;
    }
    return -1;
  };

  const checkImportConflicts = async (studentsToImport) => {
    try {
      setImportProgress({ status: 'checking', message: 'Checking for duplicates...' });

      const response = await classRecordService.importStudentsPreview(
        classRecord.google_sheet_id,
        studentsToImport,
        currentSheet?.sheet_name
      );

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Preview failed');
      }

      const { preview } = response.data;


      setNewStudentsData(preview.newStudents);

      setImportProgress({
        status: 'conflicts',
        message: `Found ${preview.conflictCount} conflicts, ${preview.newCount} new students`,
        entity: 'students'
      });

      if (preview.conflictCount > 0) {
        setImportConflicts(preview.conflicts);
        setShowImportModal(true);
      } else {
        // No conflicts, proceed with import
        await executeImport(preview.newStudents, []);
      }

    } catch (error) {
      throw new Error(`Conflict check failed: ${error.message}`);
    }
  };

  const executeImport = async (newStudents, resolvedConflicts) => {
    try {
      // 🔥 NEW: More detailed progress tracking for bulk import
      setImportProgress({
        status: 'importing',
        message: `Preparing to import ${newStudents.length} students in bulk...`,
        entity: 'students',
        current: 0,
        total: newStudents.length
      });

      // 🔥 ENHANCED: Add a small delay to show progress update
      await new Promise(resolve => setTimeout(resolve, 500));

      setImportProgress({
        status: 'importing',
        message: 'Executing bulk import to Google Sheets...',
        entity: 'students',
        current: 0,
        total: newStudents.length
      });

      // Record start time for performance measurement
      const startTime = Date.now();

      const response = await classRecordService.importStudentsExecute(
        classRecord.google_sheet_id,
        newStudents,
        resolvedConflicts,
        currentSheet?.sheet_name
      );

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Import failed');
      }

      const { results, summary } = response.data;
      const sheetInfo = currentSheet ? ` in ${currentSheet.sheet_name}` : '';

      // 🔥 ENHANCED: Show completion with performance info
      setImportProgress({
        status: 'completed',
        message: `Imported ${response.data.newStudentsAdded} student(s), overridden ${response.data.conflictsOverridden}, skipped ${response.data.conflictsSkipped}. (${duration}s)`,
        entity: 'students',
        current: newStudents.length,
        total: newStudents.length
      });

      // Show success message (clear, actionable)
      toast.success(`Students import complete${sheetInfo}: ${response.data.newStudentsAdded} added, ${response.data.conflictsOverridden} overridden, ${response.data.conflictsSkipped} skipped • ${duration}s`, { duration: 5000 });
      if (voiceEnabled) {
        speakText(`Import completed in ${duration} seconds. ${sheetInfo}`);
      }

      // Clean up after short delay
      setTimeout(() => {
        setImportProgress(null);
        setShowImportModal(false);
        setImportConflicts([]);
      }, 1500);

    } catch (error) {
      console.error('Import execution error:', error);
      toast.error(`Import failed: ${error.message}`);
      setImportProgress(null);
    }
  };

  const handleAddStudentVoice = async (data) => {
    console.log('🎯 Adding student:', data);

    if (!classRecord?.google_sheet_id) {
      toast.error('No Google Sheet connected');
      return;
    }

    try {
      // 🔧 ENHANCED: Handle multiple field name formats including Middle Name
      const studentData = {};

      // Last Name mapping
      const lastName = data['Last Name'] || data['LASTNAME'] || data.lastName || data['lastname'];
      if (lastName) {
        studentData['LASTNAME'] = lastName;
      }

      // First Name mapping
      const firstName = data['First Name'] || data['FIRST NAME'] || data.firstName || data['firstname'];
      if (firstName) {
        studentData['FIRST NAME'] = firstName;
      }

      // 🔥 NEW: Middle Name mapping
      const middleName = data['Middle Name'] || data['MIDDLE NAME'] || data.middleName || data['middlename'];
      if (middleName) {
        studentData['MIDDLE NAME'] = middleName;
      }

      // Student ID mapping
      const studentId = data['Student ID'] || data['STUDENT ID'] || data.studentId || data['studentid'];
      if (studentId) {
        studentData['STUDENT ID'] = studentId;
      }

      console.log('🔧 Raw data received:', JSON.stringify(data, null, 2));
      console.log('🔧 Mapped student data for sheets:', JSON.stringify(studentData, null, 2));

      // 🔧 VALIDATION: Check if we have minimum required data
      if (!studentData['LASTNAME'] && !studentData['FIRST NAME']) {
        throw new Error('Missing required student name data');
      }

      // 🔥 NEW: Show confirmation modal with Middle Name
      setStudentToConfirm({
        lastName: studentData['LASTNAME'] || '',
        firstName: studentData['FIRST NAME'] || '',
        middleName: studentData['MIDDLE NAME'] || '',  // 🔥 NEW
        studentId: studentData['STUDENT ID'] || '',
        isVisible: true
      });

      // 🎯 Speak confirmation request with Middle Name
      if (voiceEnabled) {
        const nameParts = [
          studentData['FIRST NAME'],
          studentData['MIDDLE NAME'],  // 🔥 NEW
          studentData['LASTNAME']
        ].filter(Boolean);
        const nameToSpeak = nameParts.join(' ');
        speakText(`I heard ${nameToSpeak}. Please confirm if this is correct.`);
      }

    } catch (error) {
      console.error('❌ Add student error details:', error);
      toast.error(`Failed to parse student data: ${error.message}`);
      if (voiceEnabled) {
        speakText('Failed to understand the student information. Please try again.');
      }
    }
  };

  const handleAddCategory = async (categoryData) => {
    setCategoryLoading(true);
    try {
      console.log('Creating category:', categoryData);
      // 🔥 DEBUG: Log currentSheet to trace sheet_name issue
      console.log('🔥 DEBUG: currentSheet:', currentSheet);
      console.log('🔥 DEBUG: currentSheet?.sheet_name:', currentSheet?.sheet_name);
      console.log('🔥 DEBUG: window.currentActiveSheet:', window.currentActiveSheet);

      // 🔥 FIX: Get the most up-to-date sheet name
      // Check multiple sources to ensure we have the correct sheet name
      let targetSheetName = currentSheet?.sheet_name;

      // Fallback 1: Check window.currentActiveSheet (set during sheet switch)
      if (!targetSheetName && window.currentActiveSheet) {
        console.log('🔥 FIX: Using window.currentActiveSheet:', window.currentActiveSheet);
        targetSheetName = window.currentActiveSheet;
      }

      // Fallback 2: Check localStorage (persisted during sheet switch)
      if (!targetSheetName) {
        const savedSheetName = localStorage.getItem('activeSheetName');
        if (savedSheetName) {
          console.log('🔥 FIX: Using localStorage activeSheetName:', savedSheetName);
          targetSheetName = savedSheetName;
        }
      }

      // Fallback 3: Check availableSheets state (if available)
      if (!targetSheetName && availableSheets.length > 0) {
        // Try to find Final sheet first, then Midterm
        const finalSheet = availableSheets.find(s => s.sheet_name?.toLowerCase().includes('final'));
        const midtermSheet = availableSheets.find(s => s.sheet_name?.toLowerCase().includes('midterm'));
        targetSheetName = finalSheet?.sheet_name || midtermSheet?.sheet_name || availableSheets[0]?.sheet_name;
        console.log('🔥 FIX: Using availableSheets fallback:', targetSheetName);
      }

      if (!targetSheetName) {
        throw new Error('Cannot determine target sheet name. Please switch to a sheet first.');
      }

      console.log('🔥 FINAL: Using sheet_name:', targetSheetName);

      const response = await classRecordService.addCategoryToSheet(
        classRecord.google_sheet_id,
        categoryData,
        targetSheetName
      );

      if (response.data?.success) {
        toast.success(`Successfully created "${categoryData.categoryName}" with ${categoryData.subCategoryCount} columns!`);

        // 🔥 FIX: Pass the required parameters to loadSheetData
        // Use the same targetSheetName we used for adding the category
        await loadSheetData(classRecord.google_sheet_id, targetSheetName);
        await syncRemaining();

        // 🔥 FIX: Refresh categories list so DeleteCategoryModal can detect the newly added category
        await loadCategories();

        // Reset percentage hash after category changes
        setLastPercentageHash(null);

        setShowAddCategoryModal(false);
      } else {
        throw new Error(response.data?.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error(`❌ Failed to create category: ${error.message}`);
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (deleteData) => {
    try {
      setIsLoading(true);

      console.log('🗑️ Deleting category:', deleteData);

      const response = await classRecordService.deleteCategoryFromSheet(
        classRecord.google_sheet_id,
        deleteData.categoryName,
        currentSheet?.sheet_name // 🔥 FIX: Use currentSheet.sheet_name
      );

      if (response.data.success) {
        toast.success(`Category "${deleteData.categoryName}" deleted successfully!`);
        setShowDeleteCategoryModal(false);

        // Reload the sheet data
        if (currentSheet?.sheet_name) {
          await loadSheetData(classRecord.google_sheet_id, currentSheet.sheet_name);
        }
        await loadCategories(); // Refresh categories list
      } else {
        toast.error(response.data.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Delete category error:', error);
      toast.error('Failed to delete category');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = async (editData) => {
    try {
      setIsLoading(true);

      console.log('✏️ Editing category:', editData);

      const response = await classRecordService.editCategoryInSheet(
        classRecord.google_sheet_id,
        editData,
        currentSheet?.sheet_name // 🔥 FIX: Use currentSheet.sheet_name
      );

      if (response.data.success) {
        toast.success(`Category updated to "${editData.newCategoryName}" successfully!`);
        setShowEditCategoryModal(false);

        // Reload the sheet data
        if (currentSheet?.sheet_name) {
          await loadSheetData(classRecord.google_sheet_id, currentSheet.sheet_name);
        }
        await loadCategories(); // Refresh categories list
        await syncRemaining();

        // Reset percentage hash after category changes
        setLastPercentageHash(null);
      } else {
        toast.error(response.data.error || 'Failed to edit category');
      }
    } catch (error) {
      console.error('Edit category error:', error);
      toast.error('Failed to edit category');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddColumnToCategory = async (columnData) => {
    try {
      setIsLoading(true);

      console.log('➕ Adding column to category:', columnData);

      const response = await classRecordService.addColumnToCategory(
        classRecord.google_sheet_id,
        columnData.categoryName,
        columnData.newColumnName,
        columnData.categoryWeight, // Pass category weight (required)
        currentSheet?.sheet_name
      );

      if (response.data.success) {
        // Show success message with SETTINGS sync status
        let successMessage = `Successfully added column to "${columnData.categoryName}"!`;

        if (response.data.settings_synced) {
          successMessage += ` Category registered in SETTINGS tab.`;
          toast.success(successMessage);
        } else if (response.data.settings_warning) {
          // Sheet operation succeeded but SETTINGS sync failed
          toast.success(successMessage);
          toast.warning(`Note: ${response.data.settings_warning}`);
        } else {
          toast.success(successMessage);
        }

        // Log internal ID for debugging
        if (response.data.internal_id) {
          console.log(`✅ Category registered with internal ID: ${response.data.internal_id}`);
        }

        setShowAddColumnModal(false);

        // Reload the sheet data
        if (currentSheet?.sheet_name) {
          await loadSheetData(classRecord.google_sheet_id, currentSheet.sheet_name);
        }
        await loadCategories(); // Refresh categories list
      } else {
        toast.error(response.data.error || 'Failed to add column to category');
      }
    } catch (error) {
      console.error('Add column to category error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to add column to category';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmStudent = async (finalData) => {
    console.log('✅ Confirmed student data:', finalData);

    try {
      // Prepare data for the backend
      const studentData = {
        'LASTNAME': finalData.lastName,
        'FIRST NAME': finalData.firstName,
        'STUDENT ID': finalData.studentId
      };

      if (finalData.middleName) {
        studentData['MIDDLE NAME'] = finalData.middleName;
      }

      console.log('🔧 Final student data being sent:', studentData);

      // Get the active sheet name
      const activeSheetName =
        window.currentActiveSheet ||
        localStorage.getItem('activeSheetName') ||
        (window.voiceCommandContext && window.voiceCommandContext.activeSheet) ||
        (currentSheet && currentSheet.sheet_name);

      // Add the student to Google Sheets
      const response = await classRecordService.addStudentToGoogleSheetsWithAutoNumber(
        classRecord.google_sheet_id,
        studentData,
        activeSheetName
      );

      console.log('🔧 API Response:', response);

      if (response.data?.success) {
        // 🔥 ENHANCED: Include Middle Name in success message
        const nameParts = [finalData.firstName, finalData.middleName, finalData.lastName].filter(Boolean);
        const studentName = nameParts.join(' ');
        const sheetUsed = response.data.sheet_name || 'unknown';

        toast.success(`Student added to ${sheetUsed} sheet: ${studentName} (Row ${response.data.rowNumber})`);
        if (voiceEnabled) {
          speakText(`Successfully added student ${studentName} as number ${response.data.rowNumber} to ${sheetUsed} sheet`);
        }

        // 🔥 ENHANCED: Reset modal with Middle Name field
        setStudentToConfirm({
          lastName: '',
          firstName: '',
          middleName: '',  // 🔥 NEW
          studentId: '',
          isVisible: false
        });
      }

    } catch (error) {
      console.error('❌ Add student error:', error);
      toast.error(`Failed to add student: ${error.response?.data?.error || error.message}`);
      if (voiceEnabled) {
        speakText('Failed to add the student. Please try again.');
      }
    }
  };

  const handleCancelStudent = () => {
    setStudentToConfirm({
      lastName: '',
      firstName: '',
      middleName: '',  // 🔥 NEW
      studentId: '',
      isVisible: false
    });

    if (voiceEnabled) {
      speakText('Student addition cancelled');
    }
  };

  const handleEditStudent = (editedData) => {
    setStudentToConfirm({
      ...studentToConfirm,
      lastName: editedData.lastName,
      firstName: editedData.firstName,
      middleName: editedData.middleName,  // 🔥 NEW
      studentId: editedData.studentId
    });

    if (voiceEnabled) {
      speakText('Student information updated');
    }
  };

  const handleUpdateStudentId = async (data) => {
    console.log('🆔 Updating student ID:', data);

    if (!classRecord?.google_sheet_id) {
      toast.error('No Google Sheet connected');
      return;
    }

    try {
      // Get fresh data for student search
      let sheetsResponse;
      if (currentSheet) {
        sheetsResponse = await classRecordService.getSpecificSheetData(
          classRecord.google_sheet_id,
          currentSheet.sheet_name
        );
      } else {
        sheetsResponse = await classRecordService.getGoogleSheetsDataServiceAccount(classRecord.google_sheet_id);
      }

      if (!sheetsResponse.data?.success || !sheetsResponse.data.tableData?.length) {
        toast.error('Could not load student data');
        return;
      }

      // Convert array data to objects for search
      const convertedTableData = [];

      sheetsResponse.data.tableData.forEach((row, originalIndex) => {
        const rowObject = {};
        sheetsResponse.data.headers.forEach((header, index) => {
          rowObject[header] = row[index] || '';
        });

        rowObject._originalTableIndex = originalIndex;
        convertedTableData.push(rowObject);
      });

      console.log('🔍 Searching for student to update ID:', data.searchName);

      const result = findStudentRowSmart(convertedTableData, data.searchName, recentStudents, 'STUDENT ID');

      console.log('🔍 Student search result:', result);

      if (result.bestMatch !== -1) {
        const student = convertedTableData[result.bestMatch];
        const studentName = `${student['FIRST NAME']} ${student['LASTNAME']}`;
        const correctRowIndex = student._originalTableIndex;

        // Check if student already has a Student ID
        const existingId = student['STUDENT ID'];
        const hasExistingId = existingId && String(existingId).trim() !== '';

        if (hasExistingId) {
          console.log('🆔 EXISTING ID DETECTED:', existingId);

          // Show override confirmation
          setOverrideConfirmation({
            studentName,
            columnName: 'STUDENT ID',
            currentScore: existingId,
            newScore: data.studentId,
            rowIndex: correctRowIndex,
            command: data,
            convertedTableData
          });

          toast(
            `${studentName} already has Student ID: ${existingId}. Confirm to override.`,
            { duration: 8000 }
          );

          if (voiceEnabled) {
            speakText(`${studentName} already has Student ID ${existingId}. Say yes to override or no to cancel.`);
          }
          return;
        }

        // No existing ID - proceed to update
        let response;
        if (currentSheet) {
          response = await classRecordService.updateGoogleSheetsCellSpecific(
            classRecord.google_sheet_id,
            correctRowIndex,
            'STUDENT ID',
            data.studentId,
            currentSheet.sheet_name
          );
        } else {
          response = await classRecordService.updateGoogleSheetsCell(
            classRecord.google_sheet_id,
            correctRowIndex,
            'STUDENT ID',
            data.studentId
          );
        }

        if (response.data?.success) {
          addRecentStudent(studentName);

          toast.success(`${studentName} - Student ID: ${data.studentId}`);
          if (voiceEnabled) {
            speakText(`Updated Student ID to ${data.studentId} for ${studentName}`);
          }
        } else {
          throw new Error(response.data?.error || 'Failed to update Student ID');
        }

      } else {
        toast.error(`Student "${data.searchName}" not found`);
        if (voiceEnabled) {
          speakText(`Student ${data.searchName} not found`);
        }
      }
    } catch (error) {
      console.error('Update Student ID error:', error);
      toast.error('Failed to update Student ID');
      if (voiceEnabled) {
        speakText('Failed to update the Student ID. Please try again.');
      }
    }
  };

  const handleAutoNumberStudents = async () => {
    if (!classRecord?.google_sheet_id) {
      toast.error('No Google Sheet connected');
      return;
    }

    try {
      toast('🔢 Auto-numbering students...');

      const response = await classRecordService.autoNumberGoogleSheetsStudents(
        classRecord.google_sheet_id
      );

      if (response.data?.success) {
        toast.success(`Auto-numbered ${response.data.count} students`);
        if (voiceEnabled) {
          speakText(`Successfully numbered ${response.data.count} students`);
        }
      } else {
        throw new Error(response.data?.error || 'Failed to auto-number students');
      }
    } catch (error) {
      console.error('Auto-number error:', error);
      toast.error('Failed to auto-number students');
    }
  };

  const handleSmartNameGradeEntryVoice = async (data) => {
    console.log('🎯 Smart name search for:', data);
    console.log('🎯 RECEIVED DATA FROM PARSER:', data);
    console.log('🎯 searchName:', data.searchName);
    console.log('🎯 column:', data.column);
    console.log('🎯 value:', data.value);

    if (!classRecord?.google_sheet_id) {
      toast.error('No Google Sheet connected');
      return;
    }

    const validation = validateScore(data.column, data.value);
    if (!validation.valid) {
      toast.error(`❌ ${validation.error}`);
      if (voiceEnabled) {
        speakText(validation.error);
      }
      return;
    }

    try {
      // 🔊 Verifying phase while resolving target student/column
      setVoiceBusy(true);
      setVoicePhase('verifying');
      setVoiceStatus(`Finding ${data.searchName} and validating "${data.column}"...`);

      // Get fresh data for student search
      let sheetsResponse;
      if (currentSheet) {
        sheetsResponse = await classRecordService.getSpecificSheetData(
          classRecord.google_sheet_id,
          currentSheet.sheet_name
        );
      } else {
        sheetsResponse = await classRecordService.getGoogleSheetsDataServiceAccount(classRecord.google_sheet_id);
      }

      if (!sheetsResponse.data?.success || !sheetsResponse.data.tableData?.length) {
        setVoicePhase('error');
        setVoiceBusy(true); // Keep overlay visible to show error
        setVoiceStatus('Could not load student data');
        toast.error('Could not load student data');
        // Auto-clear error state after 3 seconds
        setTimeout(() => {
          setVoiceBusy(false);
          setVoicePhase('idle');
          setVoiceStatus('');
        }, 3000);
        return;
      }

      // 🔥 FIXED: Don't filter - use original tableData indices
      const convertedTableData = [];

      sheetsResponse.data.tableData.forEach((row, originalIndex) => {
        const rowObject = {};
        sheetsResponse.data.headers.forEach((header, index) => {
          rowObject[header] = row[index] || '';
        });

        // 🔥 CRITICAL FIX: Always use the original index from tableData
        rowObject._originalTableIndex = originalIndex;  // This is the key!
        convertedTableData.push(rowObject);
      });

      console.log('🔍 Full table data (including empty rows):', convertedTableData);

      const result = findStudentRowSmart(convertedTableData, data.searchName, recentStudents, data.column);

      console.log('🔍 Search result:', result);

      // 🔥 Handle duplicates first
      if (result.needsConfirmation && result.possibleMatches.length > 1) {
        setDuplicateModalData({
          matches: result.possibleMatches,
          command: data,
          searchName: data.searchName,
          convertedTableData
        });
        setShowDuplicateModal(true);

        toast(
          `🤔 Multiple students found named "${data.searchName}". Please select from the modal.`,
          {
            duration: 5000,
            icon: '🤔'
          }
        );

        if (voiceEnabled) {
          speakText(`Found multiple students named ${data.searchName}. Please select the correct student from the options shown.`);
        }
        // Keep overlay visible while awaiting user selection
        setVoiceBusy(true);
        setVoicePhase('verifying');
        setVoiceStatus('Awaiting selection...');
        return;
      }

      if (result.bestMatch !== -1) {
        const student = convertedTableData[result.bestMatch];
        const studentName = `${student['FIRST NAME']} ${student['LASTNAME']}`;

        // 🔥 FIXED: Use the original table index
        const correctRowIndex = student._originalTableIndex;

        console.log('🔍 DEBUG: Using row index:', correctRowIndex);
        console.log('🔍 DEBUG: For student:', studentName);

        // 🔥 NEW: Check for existing score and show override confirmation
        const existingScore = student[data.column];
        const hasExistingScore = existingScore &&
          String(existingScore).trim() !== '' &&
          String(existingScore).trim() !== '0';

        if (hasExistingScore) {
          console.log('🔥 EXISTING SCORE DETECTED:', existingScore);

          const maxScore = maxScores[data.column];

          // Show override confirmation
          setOverrideConfirmation({
            studentName,
            columnName: data.column,
            currentScore: existingScore,
            newScore: data.value,
            maxScore: maxScore, // 🔥 FIXED: Use maxScores[data.column]
            rowIndex: correctRowIndex,
            command: data,
            convertedTableData
          });

          toast(
            `${studentName} already has a score of ${existingScore} for ${data.column}. Confirm to override.`,
            { duration: 8000 }
          );

          if (voiceEnabled) {
            speakText(`${studentName} already has a score of ${existingScore} for ${data.column}. Say yes to override or no to cancel.`);
          }
          return;
        }

        // 🔥 FIXED: Use correct row index
        if (voiceCancelRef.current) {
          setVoicePhase('idle');
          setVoiceBusy(false);
          setVoiceStatus('');
          return;
        }
        await performScoreUpdate(correctRowIndex, data, studentName, convertedTableData);

      } else {
        toast.error(`Student "${data.searchName}" not found`);
        if (voiceEnabled) {
          speakText(`Student ${data.searchName} not found`);
        }
        setVoicePhase('error');
        setVoiceBusy(true); // Keep overlay visible to show error
        setVoiceStatus('Student not found');
        // Auto-clear error state after 3 seconds
        setTimeout(() => {
          setVoiceBusy(false);
          setVoicePhase('idle');
          setVoiceStatus('');
        }, 3000);
      }
    } catch (error) {
      console.error('Voice command error:', error);
      toast.error('Failed to process voice command');
      if (voiceEnabled) {
        speakText('Failed to process the command. Please try again.');
      }
      setVoicePhase('error');
      setVoiceBusy(true); // Keep overlay visible to show error
      setVoiceStatus('Processing failed');
      // Auto-clear error state after 3 seconds
      setTimeout(() => {
        setVoiceBusy(false);
        setVoicePhase('idle');
        setVoiceStatus('');
      }, 3000);
    }
  };

  const performScoreUpdate = async (rowIndex, data, studentName, convertedTableData) => {
    try {
      if (voiceCancelRef.current) {
        setVoicePhase('idle');
        setVoiceBusy(false);
        setVoiceStatus('');
        return;
      }

      // 🔊 Writing phase indicator
      setVoiceBusy(true);
      setVoicePhase('writing');
      setVoiceStatus(`Writing ${data.value} to ${data.column} for ${studentName}...`);

      // 🔥 NEW: Validate max score again, even during override
      const validation = validateScore(data.column, data.value);
      if (!validation.valid) {
        toast.error(`❌ ${validation.error}`);
        if (voiceEnabled) {
          speakText(validation.error);
        }
        setVoicePhase('error');
        setVoiceBusy(false);
        setVoiceStatus(validation.error);
        return;
      }

      let response;
      if (currentSheet) {
        response = await classRecordService.updateGoogleSheetsCellSpecific(
          classRecord.google_sheet_id,
          rowIndex,
          data.column,
          data.value,
          currentSheet.sheet_name
        );
      } else {
        response = await classRecordService.updateGoogleSheetsCell(
          classRecord.google_sheet_id,
          rowIndex,
          data.column,
          data.value
        );
      }

      if (voiceCancelRef.current) {
        setVoicePhase('idle');
        setVoiceBusy(false);
        setVoiceStatus('');
        return;
      }

      if (response.data?.success) {
        addRecentStudent(studentName);

        // Reset toast dismissal flag since user made changes
        resetToastDismissal();

        toast.success(`${studentName} - ${data.column}: ${data.value}`);
        if (voiceEnabled) {
          speakText(`Updated ${data.column} to ${data.value} for ${studentName}`);
        }
        // 🔊 Complete and clear after a brief moment
        setVoicePhase('done');
        setVoiceStatus('Saved');
        if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
        setTimeout(() => {
          setVoiceBusy(false);
          setVoicePhase('idle');
          setVoiceStatus('');
          setIsSlow(false);
        }, 1200);
      } else {
        throw new Error(response.data?.error || 'Failed to update cell');
      }
    } catch (updateError) {
      console.error('Update error:', updateError);
      toast.error(`Failed to update Google Sheets: ${updateError.message}`);
      if (voiceEnabled) {
        speakText('Failed to update the grade. Please try again.');
      }
      setVoicePhase('error');
      setVoiceBusy(true); // Keep overlay visible to show error
      setVoiceStatus('Update failed');
      // Auto-clear error state after 3 seconds
      setTimeout(() => {
        setVoiceBusy(false);
        setVoicePhase('idle');
        setVoiceStatus('');
      }, 3000);
    }
  };

  const handleOverrideConfirm = async () => {
    if (!overrideConfirmation) return;

    const { rowIndex, command, studentName } = overrideConfirmation;

    await performScoreUpdate(rowIndex, command, studentName, overrideConfirmation.convertedTableData);
    setOverrideConfirmation(null);
  };

  const handleOverrideCancel = () => {
    if (overrideConfirmation && voiceEnabled) {
      speakText('Score update cancelled. Keeping existing score.');
    }
    setOverrideConfirmation(null);
    toast('Score update cancelled');
  };

  const handleDuplicateSelection = async (selectedOption) => {
    if (!duplicateOptions || !duplicateOptions.matches[selectedOption - 1]) {
      toast.error('Invalid selection');
      return;
    }

    const selectedMatch = duplicateOptions.matches[selectedOption - 1];
    const data = duplicateOptions.command;

    try {
      const response = await classRecordService.updateGoogleSheetsCell(
        classRecord.google_sheet_id,
        selectedMatch.index,
        data.column,
        data.value
      );

      if (response.data?.success) {
        addRecentStudent(selectedMatch.student);

        toast.success(`${selectedMatch.student} - ${data.column}: ${data.value}`);
        if (voiceEnabled) {
          speakText(`Updated ${data.column} to ${data.value} for ${selectedMatch.student}`);
        }
      } else {
        throw new Error(response.data?.error || 'Failed to update cell');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(`Failed to update Google Sheets: ${error.message}`);
    }

    setDuplicateOptions(null);
  };

  const handleDuplicateStudentSelect = async (selectedIndex) => {
    if (!duplicateModalData) return;

    const { matches, command, convertedTableData, isBatchMode } = duplicateModalData;
    const selectedMatch = matches[selectedIndex];

    // 🔥 FIXED: Use rowData instead of studentData
    const student = selectedMatch.rowData || {};
    const studentName = selectedMatch.student;
    const correctRowIndex = student._originalTableIndex;

    console.log('🎯 Selected student:', studentName);
    console.log('🎯 Student data:', student);
    console.log('🎯 Row index:', correctRowIndex);

    if (correctRowIndex === undefined) {
      toast.error('Could not determine student row. Please try again.');
      return;
    }

    // 🔥 SPECIAL HANDLING FOR BATCH MODE
    if (isBatchMode) {
      console.log('🔥 DUPLICATE SELECT: Handling batch mode selection');

      const entryId = `${command.searchName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const hasExistingScore = student[command.column] &&
        String(student[command.column]).trim() !== '' &&
        String(student[command.column]).trim() !== '0';

      const newEntry = {
        id: entryId,
        originalInput: command.searchName,
        studentName: studentName, // Use full resolved name
        score: command.value,
        status: 'found',
        rowIndex: correctRowIndex,
        hasExistingScore,
        existingValue: hasExistingScore ? student[command.column] : null,
        confidence: 'high',
        sheetName: currentSheet?.sheet_name
      };

      // Add to batch entries
      setBatchEntries(prev => {
        // Filter out any previous attempts for this student
        const filtered = prev.filter(entry =>
          !(entry.originalInput.toLowerCase() === command.searchName.toLowerCase() &&
            entry.score === command.value)
        );
        return [...filtered, newEntry];
      });

      addRecentStudent(studentName);
      toast.success(`Added ${studentName} to batch list`);

      // Close modal
      setShowDuplicateModal(false);
      setDuplicateModalData(null);
      return;
    }

    // Check for existing score (Normal Mode)
    const existingScore = student[command.column];
    const hasExistingScore = existingScore &&
      String(existingScore).trim() !== '' &&
      String(existingScore).trim() !== '0';

    if (hasExistingScore) {
      setOverrideConfirmation({
        studentName,
        columnName: command.column,
        currentScore: existingScore,
        newScore: command.value,
        rowIndex: correctRowIndex,
        command,
        convertedTableData
      });

      toast(
        `${studentName} already has a score of ${existingScore} for ${command.column}. Confirm to override.`,
        { duration: 8000 }
      );
      return;
    }

    // Update the score with writing indicator
    setVoiceBusy(true);
    setVoicePhase('writing');
    setVoiceStatus(`Writing ${command.value} to ${command.column} for ${studentName}...`);
    await performScoreUpdate(correctRowIndex, command, studentName, convertedTableData);
  };

  const handleDuplicateModalClose = () => {
    setShowDuplicateModal(false);
    setDuplicateModalData(null);
  };

  // Helper function to get user-friendly command names
  const getCommandDisplayName = (commandType) => {
    const commandNames = {
      'SMART_NAME_GRADE_ENTRY': 'Grade Entry',
      'ADD_STUDENT': 'Add Student',
      'DELETE_STUDENT_BY_NAME': 'Delete Student',
      'DELETE_STUDENT_BY_ID': 'Delete Student by ID',
      'UPDATE_MAX_SCORE': 'Update Max Score',
      'UPDATE_BATCH_MAX_SCORE': 'Update Batch Max Score',
      'STUDENT_ID_GRADE_ENTRY': 'Grade Entry by ID',
      'SORT_STUDENTS': 'Sort Students',
      'EXPORT_EXCEL': 'Export to Excel',
      'EXPORT_PDF': 'Export to PDF',
      'EXPORT_CSV': 'Export to CSV',
      'BATCH_EVERYONE': 'Batch Grade Everyone',
      'UPDATE_STUDENT_ID': 'Update Student ID',
      'BATCH_STUDENT_LIST': 'Batch Grade List',
      'BATCH_ROW_RANGE': 'Batch Grade Range'
    };
    return commandNames[commandType] || 'Unknown Command';
  };

  const handleVoiceCommand = (transcript) => {
    if (!transcript.trim()) return;
    if (voiceBusy) {
      // prevent overlapping operations in single entry mode
      return;
    }

    console.log('Voice command received:', transcript);

    if (batchMode) {
      handleBatchVoiceCommand(transcript);
      return;
    }

    // 🔊 Persist overlay and show processing state for single entry
    try {
      setVoiceBusy(true);
      setVoicePhase('processing');
      setVoiceStatus('Processing command...');
      setIsSlow(false);
      voiceCancelRef.current = false;
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      processingStartRef.current = Date.now();
      slowTimerRef.current = setTimeout(() => setIsSlow(true), 6000);
    } catch {
      // no-op safeguard
    }

    // 🔥 NEW: Handle override confirmation responses
    if (overrideConfirmation) {
      const lowerTranscript = transcript.toLowerCase().trim();
      if (/^(yes|yeah|yep|confirm|override|y)$/i.test(lowerTranscript)) {
        handleOverrideConfirm();
        return;
      } else if (/^(no|nope|cancel|n)$/i.test(lowerTranscript)) {
        handleOverrideCancel();
        return;
      } else {
        toast('Please say "yes" to override or "no" to cancel');
        if (voiceEnabled) {
          speakText('Please say yes to override or no to cancel');
        }
        return;
      }
    }

    // Rest of your existing voice command logic...
    if (handleSheetSwitchVoiceCommand(transcript)) {
      return;
    }

    const command = parseVoiceCommand(transcript, headers, [], {
      recentStudents,
      commandHistory: [],
      alternatives: [],
      maxScores: maxScores  // 🔥 NEW: Pass maxScores for validation
    });
    // If parser fails to recognize a meaningful command, surface an error and exit busy
    if (!command || !command.type || command.type === 'UNKNOWN_COMMAND') {
      setVoicePhase('error');
      setVoiceBusy(true); // Keep overlay visible to show error
      setVoiceStatus('Command not recognized');
      toast.error('Voice command not recognized');
      // Auto-clear error state after 3 seconds
      setTimeout(() => {
        setVoiceBusy(false);
        setVoicePhase('idle');
        setVoiceStatus('');
      }, 3000);
      return;
    }

    // Handle duplicate selection
    if (command.type === 'SELECT_DUPLICATE' && duplicateOptions) {
      handleDuplicateSelection(command.data.selectedOption);
      return;
    }

    executeCommand(command);

    addCommandHistory({
      transcript,
      command,
      timestamp: new Date(),
      executed: true
    });
  };

  const handleBatchVoiceCommand = async (transcript) => {
    console.log('🔥 BATCH VOICE: Processing:', transcript);

    // Handle "done" or "finish" commands
    if (/\b(done|finish|exit|complete)\b/i.test(transcript)) {
      console.log('🔥 BATCH VOICE: Finishing batch mode - calling executeBatchEntries');
      await executeBatchEntries();
      clearTranscript();
      return;
    }

    // Handle "clear" command
    if (/\b(clear|reset|empty)\b/i.test(transcript)) {
      console.log('🔥 BATCH VOICE: Clearing entries');
      setBatchEntries([]);
      toast.success('Batch entries cleared');
      clearTranscript();
      return;
    }

    // Parse student name + score pattern: "Capuras 50" or "John 85"
    const studentScorePattern = /^(.+?)\s+(\d+(?:\.\d+)?)$/;
    const match = transcript.trim().match(studentScorePattern);

    if (match) {
      const [, rawStudentName, score] = match;

      // 🔥 FIXED: Apply the same phonetic corrections as single entry!
      console.log('🔥 BATCH VOICE: Raw student name:', rawStudentName);

      // Step 1: Apply phonetic corrections (same as parseVoiceCommand)
      const correctedName = applyPhoneticCorrections(rawStudentName.toLowerCase().trim());
      console.log('🔥 BATCH VOICE: After phonetic corrections:', correctedName);

      // Step 2: Clean the name (same as parseVoiceCommand)
      const cleanedName = cleanName(correctedName);
      console.log('🔥 BATCH VOICE: Final cleaned name:', cleanedName);

      console.log('🔥 BATCH VOICE: Processing batch entry:', cleanedName, score);
      await processBatchEntry(cleanedName, score.trim());

      // Keep transcript visible in batch mode
    } else {
      console.log('🔥 BATCH VOICE: Pattern not matched:', transcript);
    }
  };

  const processBatchEntry = async (studentName, score) => {
    console.log('🔥 PROCESS BATCH: 🚀 Starting processBatchEntry');
    console.log('🔥 PROCESS BATCH: studentName:', studentName);
    console.log('🔥 PROCESS BATCH: score:', score);

    if (!currentBatchColumn) {
      console.log('🔥 PROCESS BATCH: ❌ No column selected');
      toast.error('Please select a column first');
      return;
    }

    // 🔥 VALIDATION: Check if score exceeds max score
    const validation = validateScore(currentBatchColumn, score);
    if (!validation.valid) {
      console.log('🔥 PROCESS BATCH: ❌ Validation failed:', validation.error);
      toast.error(`❌ ${validation.error}`);
      if (voiceEnabled) {
        speakText(validation.error);
      }
      return;
    }

    // 🔥 DUPLICATE PREVENTION: Create unique entry key
    const entryKey = `${studentName.toLowerCase()}_${score}`;

    // 🔥 DUPLICATE PREVENTION: Check if already processing this exact entry
    if (processingEntries.has(entryKey)) {
      console.log('🔥 DUPLICATE PREVENTION: Already processing:', entryKey);
      return;
    }

    // 🔥 DUPLICATE PREVENTION: Check if entry already exists in batch
    const existingEntry = batchEntries.find(entry =>
      entry.originalInput.toLowerCase() === studentName.toLowerCase() &&
      entry.score === score
    );

    if (existingEntry) {
      console.log('🔥 DUPLICATE PREVENTION: Entry already exists:', entryKey);
      return;
    }

    try {
      // 🔥 DUPLICATE PREVENTION: Mark as processing
      setProcessingEntries(prev => new Set([...prev, entryKey]));
      setIsProcessingBatch(true);

      // 🔥 SPEED OPTIMIZATION: Use cached data instead of fetching!
      if (!batchSheetData) {
        throw new Error('Batch session data not loaded. Please restart batch mode.');
      }

      console.log('🔥 PROCESS BATCH: ⚡ Using cached sheet data (SUPER FAST!)');
      const convertedTableData = batchSheetData;

      console.log('🔥 PROCESS BATCH: 🔍 Searching for student...');
      const result = findStudentRowSmart(convertedTableData, studentName, recentStudents, currentBatchColumn);
      console.log('🔥 PROCESS BATCH: 🔍 Search result:', result);

      // 🔥 Handle duplicate/ambiguous students in batch mode
      if (result.needsConfirmation && result.possibleMatches.length > 1) {
        console.log('🔥 PROCESS BATCH: 🤔 Ambiguous match detected, showing duplicate modal');

        // We need to pause batch processing and show the modal
        setDuplicateModalData({
          matches: result.possibleMatches,
          command: {
            column: currentBatchColumn,
            value: score,
            searchName: studentName
          },
          searchName: studentName,
          convertedTableData,
          isBatchMode: true // Flag to tell modal it's from batch mode
        });
        setShowDuplicateModal(true);

        // Speak to user
        if (voiceEnabled) {
          speakText(`Multiple students found for ${studentName}. Please select the correct one.`);
        }
        // Don't add to batch entries yet - wait for modal selection
        return;
      }

      const entryId = `${studentName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let newEntry;

      if (result.bestMatch !== -1) {
        console.log('🔥 PROCESS BATCH: ✅ Student found!');
        const student = convertedTableData[result.bestMatch];
        const fullStudentName = `${student['FIRST NAME']} ${student['LASTNAME']}`.trim();

        const hasExistingScore = student[currentBatchColumn] &&
          String(student[currentBatchColumn]).trim() !== '' &&
          String(student[currentBatchColumn]).trim() !== '0';

        newEntry = {
          id: entryId,
          originalInput: studentName,
          studentName: fullStudentName,
          score: score,
          status: 'found',
          rowIndex: result.bestMatch,
          hasExistingScore,
          existingValue: hasExistingScore ? student[currentBatchColumn] : null,
          confidence: result.confidence,
          sheetName: currentSheet?.sheet_name
        };

        addRecentStudent(fullStudentName);
        console.log('🔥 PROCESS BATCH: ✅ Student found, adding to UI');

      } else {
        console.log('🔥 PROCESS BATCH: ❌ Student not found');
        newEntry = {
          id: entryId,
          originalInput: studentName,
          studentName: studentName,
          score: score,
          status: 'not_found',
          rowIndex: -1,
          hasExistingScore: false,
          existingValue: null,
          confidence: 'none',
          sheetName: currentSheet?.sheet_name
        };
      }

      console.log('🔥 PROCESS BATCH: 📝 Adding entry to batch list:', newEntry);

      setBatchEntries(prev => {
        // 🔥 ENHANCED: Better duplicate filtering
        const filtered = prev.filter(entry =>
          !(entry.originalInput.toLowerCase() === studentName.toLowerCase() &&
            entry.score === score)
        );

        const newEntries = [...filtered, newEntry];
        console.log('🔥 SET BATCH ENTRIES: New total entries:', newEntries.length);

        return newEntries;
      });

    } catch (error) {
      console.error('🔥 PROCESS BATCH: ❌ Error:', error);
      toast.error(`Error processing ${studentName}: ${error.message}`);
    } finally {
      // 🔥 DUPLICATE PREVENTION: Remove from processing set
      setProcessingEntries(prev => {
        const newSet = new Set(prev);
        newSet.delete(entryKey);
        return newSet;
      });
      setIsProcessingBatch(false);
      console.log('🔥 PROCESS BATCH: 🏁 Finished processing');
    }
  };

  const executeBatchEntries = async () => {
    const validEntries = batchEntries.filter(entry => entry.status === 'found');

    if (validEntries.length === 0) {
      toast.error('No valid entries to save');
      return;
    }

    // 🔥 VALIDATION: Validate all scores before executing batch
    const invalidEntries = [];
    for (const entry of validEntries) {
      const validation = validateScore(currentBatchColumn, entry.score);
      if (!validation.valid) {
        invalidEntries.push({
          student: entry.studentName,
          score: entry.score,
          error: validation.error
        });
      }
    }

    if (invalidEntries.length > 0) {
      const errorMsg = invalidEntries.map(e => `${e.student}: ${e.score} - ${e.error}`).join('\n');
      toast.error(`Cannot execute batch: Invalid scores detected\n${errorMsg}`);
      if (voiceEnabled) {
        speakText(`Cannot execute batch. ${invalidEntries.length} invalid scores detected.`);
      }
      return;
    }

    try {
      window.batchModeFinishing = true;
      setIsProcessingBatch(true);

      console.log('🔥 BATCH EXECUTION: Starting batch update for', validEntries.length, 'entries');

      // 🔥 PERFORMANCE FIX: Use batch update instead of individual API calls
      // Prepare all updates in the correct format for batch API
      const updates = validEntries.map(entry => {
        // Calculate column index from headers
        const columnIndex = headers.indexOf(currentBatchColumn);
        if (columnIndex === -1) {
          throw new Error(`Column "${currentBatchColumn}" not found in headers`);
        }

        // Convert column index to letter (A, B, C, etc.)
        const columnLetter = String.fromCharCode(65 + columnIndex);

        // Calculate actual sheet row (skip 4 header rows, convert to 1-based)
        // Row 1: Internal IDs, Row 2: Category names, Row 3: Subcategory headers, Row 4: Max scores
        const sheetRow = entry.rowIndex + 5; // +4 for header rows (Row 1-4), +1 for 1-based indexing

        // Build cell range
        const sheetPrefix = currentSheet?.sheet_name ? `'${currentSheet.sheet_name}'!` : '';
        const range = `${sheetPrefix}${columnLetter}${sheetRow}`;

        console.log(`🔥 BATCH: Preparing update - ${range} = ${entry.score}`);

        return {
          range: range,
          values: [[entry.score]]
        };
      });

      console.log('🔥 BATCH EXECUTION: Prepared', updates.length, 'updates for batch API');

      // Execute single batch update
      const batchData = {
        updates: updates,
        sheet_name: currentSheet?.sheet_name
      };

      const response = await classRecordService.updateMultipleCells(
        classRecord.google_sheet_id,
        batchData
      );

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Batch update failed');
      }

      console.log('🔥 BATCH EXECUTION: ✅ Success! Updated', response.data.updated_cells, 'cells in', response.data.updated_ranges, 'ranges');

      const sheetInfo = currentSheet ? ` in ${currentSheet.sheet_name}` : '';

      // Reset toast dismissal flag since user made changes
      resetToastDismissal();

      toast.success(`Batch saved: ${validEntries.length} students updated${sheetInfo} (${response.data.updated_cells} cells)`);
      if (voiceEnabled) {
        speakText(`Batch complete. ${validEntries.length} students updated${sheetInfo}.`);
      }

      // Reset batch mode
      console.log('🔥 EXECUTE BATCH: Setting batchMode to false after completion');
      window.batchModeActive = false;
      // Ensure voice is fully stopped when closing batch modal
      window.batchDesiredListening = false;
      try {
        if (isListening) {
          stopListening();
        }
        clearTranscript && clearTranscript();
      } catch { }
      setBatchModeProtected(false, 'executeBatchEntries');
      setShowBatchModal(false);
      setBatchEntries([]);
      setCurrentBatchColumn('');

    } catch (error) {
      console.error('Batch execution error:', error);
      toast.error(`Failed to save batch entries: ${error.message}`);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const setBatchModeProtected = useCallback((value, reason = 'unknown') => {
    console.log(`🔥 SET BATCH MODE: ${value} - Reason: ${reason}`);
    console.log('🔥 CALL STACK:', new Error().stack.split('\n').slice(0, 5));
    setBatchMode(value);
  }, []);

  const startBatchMode = async () => {
    console.log('🔥 START BATCH: Setting batchMode to true');
    setBatchModeProtected(true, 'startBatchMode');
    setShowBatchModal(true);
    setBatchEntries([]);
    setCurrentBatchColumn('');

    window.batchModeActive = false;
    window.batchModeFinishing = false;
  };

  const cancelBatchMode = () => {
    console.log('🔥 CANCEL BATCH: Setting batchMode to false');
    // 🔥 Stop auto-restart before closing
    window.batchModeActive = false;
    window.batchModeFinishing = true;
    window.batchDesiredListening = false;

    setBatchModeProtected(false, 'cancelBatchMode');
    setShowBatchModal(false);
    setBatchEntries([]);
    setCurrentBatchColumn('');

    setBatchSheetData(null);
    setProcessingEntries(new Set());

    if (isListening) {
      stopListening();
    }
    try {
      clearTranscript && clearTranscript();
    } catch { }
  };

  const handleExportToExcel = async () => {
    try {
      if (!classRecord?.google_sheet_id) {
        toast.error('No Google Sheet connected');
        return;
      }

      toast('📊 Preparing Excel export...');

      // 🔥 IMPROVED: Choose the right data source based on current context
      let sheetsResponse;

      if (currentSheet?.sheet_name) {
        // Use specific sheet data (already updated with AM range)
        console.log('🔥 EXPORT: Using specific sheet data for:', currentSheet.sheet_name);
        sheetsResponse = await classRecordService.getSpecificSheetData(
          classRecord.google_sheet_id,
          currentSheet.sheet_name
        );
      } else {
        // Use general sheet data (now updated with AM range)
        console.log('🔥 EXPORT: Using general sheet data');
        sheetsResponse = await classRecordService.getGoogleSheetsDataServiceAccount(
          classRecord.google_sheet_id
        );
      }

      if (!sheetsResponse.data?.success || !sheetsResponse.data.tableData?.length) {
        toast.error('Could not load data for export');
        return;
      }

      // 🔥 DEBUG: Log the data we're getting
      console.log('🔥 EXPORT DEBUG: Headers received:', sheetsResponse.data.headers);
      console.log('🔥 EXPORT DEBUG: Main headers (Categories):', sheetsResponse.data.main_headers);
      console.log('🔥 EXPORT DEBUG: Sub headers (Column names):', sheetsResponse.data.sub_headers);
      console.log('🔥 EXPORT DEBUG: Max scores:', sheetsResponse.data.max_scores);

      // Prepare data for Excel with multi-row headers
      const worksheetData = [];

      // 🔥 NEW: Add the 3-row header structure just like Google Sheets

      // Row 1: Category headers (main_headers)
      if (sheetsResponse.data.main_headers && sheetsResponse.data.main_headers.length > 0) {
        const categoryRow = [...sheetsResponse.data.main_headers];
        // Ensure it matches the expected column count
        while (categoryRow.length < sheetsResponse.data.headers.length) {
          categoryRow.push('');
        }
        worksheetData.push(categoryRow);
      }

      // Row 2: Column names (sub_headers)
      if (sheetsResponse.data.sub_headers && sheetsResponse.data.sub_headers.length > 0) {
        const subHeaderRow = [...sheetsResponse.data.sub_headers];
        // Ensure it matches the expected column count
        while (subHeaderRow.length < sheetsResponse.data.headers.length) {
          subHeaderRow.push('');
        }
        worksheetData.push(subHeaderRow);
      }

      // Row 3: Max scores/totals
      if (sheetsResponse.data.max_scores && sheetsResponse.data.max_scores.length > 0) {
        const maxScoreRow = [...sheetsResponse.data.max_scores];
        // Ensure it matches the expected column count
        while (maxScoreRow.length < sheetsResponse.data.headers.length) {
          maxScoreRow.push('');
        }
        worksheetData.push(maxScoreRow);
      }

      // 🔥 IMPROVED: Add student data with proper padding
      sheetsResponse.data.tableData.forEach(row => {
        // Ensure row has same length as headers
        const paddedRow = [...row];
        while (paddedRow.length < sheetsResponse.data.headers.length) {
          paddedRow.push(''); // Fill missing columns
        }
        worksheetData.push(paddedRow);
      });

      console.log('🔥 EXPORT DEBUG: Total worksheet rows:', worksheetData.length);
      console.log('🔥 EXPORT DEBUG: Header structure rows:', worksheetData.slice(0, 3));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // 🔥 ENHANCED STYLING: Style the different header rows

      // Style Row 1 (Categories) - Blue background
      const categoryStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E40AF" } }, // Darker blue
        alignment: { horizontal: "center", vertical: "center" }, // 🔥 CENTER alignment
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };

      // Style Row 2 (Column Names) - Medium blue background
      const subHeaderStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "3B82F6" } }, // Medium blue
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };

      // Style Row 3 (Max Scores) - Light blue background
      const maxScoreStyle = {
        font: { bold: true, color: { rgb: "1F2937" } },
        fill: { fgColor: { rgb: "DBEAFE" } }, // Light blue
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };

      // Apply styling to header rows
      for (let col = 0; col < sheetsResponse.data.headers.length; col++) {
        // Row 1 (Categories)
        const categoryCell = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[categoryCell]) worksheet[categoryCell] = { v: '', t: 's' };
        worksheet[categoryCell].s = categoryStyle;

        // Row 2 (Column Names)
        const subHeaderCell = XLSX.utils.encode_cell({ r: 1, c: col });
        if (!worksheet[subHeaderCell]) worksheet[subHeaderCell] = { v: '', t: 's' };
        worksheet[subHeaderCell].s = subHeaderStyle;

        // Row 3 (Max Scores)
        const maxScoreCell = XLSX.utils.encode_cell({ r: 2, c: col });
        if (!worksheet[maxScoreCell]) worksheet[maxScoreCell] = { v: '', t: 's' };
        worksheet[maxScoreCell].s = maxScoreStyle;
      }

      // 🔥 NEW: Create merged cells for category headers
      const merges = [];

      // 🔥 SMART MERGE: Analyze the main_headers to find merge ranges
      if (sheetsResponse.data.main_headers && sheetsResponse.data.main_headers.length > 0) {
        let currentCategory = '';
        let startCol = 0;
        let endCol = 0;

        for (let col = 0; col < sheetsResponse.data.main_headers.length; col++) {
          const categoryName = sheetsResponse.data.main_headers[col] || '';

          if (categoryName && categoryName.trim() !== '') {
            // New category found
            if (currentCategory && currentCategory !== categoryName) {
              // Merge the previous category if it spans multiple columns
              if (endCol > startCol) {
                merges.push({
                  s: { r: 0, c: startCol }, // Start row 0, start column
                  e: { r: 0, c: endCol }    // End row 0, end column
                });
                console.log(`🔥 MERGE: "${currentCategory}" from col ${startCol} to ${endCol}`);
              }
              startCol = col;
            } else if (!currentCategory) {
              startCol = col;
            }

            currentCategory = categoryName;
            endCol = col;
          } else if (currentCategory) {
            // Empty cell, but continue the current category
            endCol = col;
          }
        }

        // Handle the last category
        if (currentCategory && endCol > startCol) {
          merges.push({
            s: { r: 0, c: startCol },
            e: { r: 0, c: endCol }
          });
          console.log(`🔥 MERGE: "${currentCategory}" from col ${startCol} to ${endCol}`);
        }
      }

      // 🔥 ALTERNATIVE: If smart merge doesn't work, use manual merge patterns
      if (merges.length === 0) {
        // Manual merge patterns based on common gradebook structures
        const manualMerges = [
          // STUDENT INFO (columns A-D: NO, LASTNAME, FIRSTNAME, STUDENT ID)
          { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },

          // QUIZZES (assume columns E-I: Quiz 1-5 + Total)
          { s: { r: 0, c: 4 }, e: { r: 0, c: 9 } },

          // ASSIGNMENTS (assume columns J-O: Assign 1-5 + Total)
          { s: { r: 0, c: 10 }, e: { r: 0, c: 15 } },

          // Add more patterns as needed based on your sheet structure
        ];

        // Only add merges that are within our column range
        manualMerges.forEach(merge => {
          if (merge.e.c < sheetsResponse.data.headers.length) {
            merges.push(merge);
          }
        });
      }

      // Apply merges to worksheet
      if (merges.length > 0) {
        worksheet['!merges'] = merges;
        console.log('🔥 APPLIED MERGES:', merges);
      }

      // 🔥 NEW: Set row heights for header rows
      worksheet['!rows'] = [
        { hpt: 25 }, // Row 1 height
        { hpt: 25 }, // Row 2 height  
        { hpt: 20 }, // Row 3 height
      ];

      // Set column widths
      const columnWidths = sheetsResponse.data.headers.map(() => ({ width: 15 }));
      worksheet['!cols'] = columnWidths;

      // 🔥 NEW: Freeze the header rows (first 3 rows)
      worksheet['!freeze'] = { xSplit: 0, ySplit: 3 };

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, classRecord.name || 'Class Record');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${classRecord.name || 'ClassRecord'}_${timestamp}.xlsx`;

      // Save file
      XLSX.writeFile(workbook, filename);

      // 🔥 IMPROVED: Better success message
      const message = `Excel exported: ${filename} (${sheetsResponse.data.headers.length} columns with merged category headers)`;
      toast.success(message);

      if (voiceEnabled) {
        speakText(`Excel file exported successfully with ${sheetsResponse.data.headers.length} columns including properly centered category headers`);
      }

    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel file');
      if (voiceEnabled) {
        speakText('Failed to export Excel file');
      }
    }
  };

  const handleExportToCSV = async () => {
    try {
      if (!classRecord?.google_sheet_id) {
        toast.error('No Google Sheet connected');
        return;
      }

      toast('📄 Preparing CSV export...');

      // Get fresh data from Google Sheets
      const sheetsResponse = await classRecordService.getGoogleSheetsDataServiceAccount(classRecord.google_sheet_id);

      if (!sheetsResponse.data?.success || !sheetsResponse.data.tableData?.length) {
        toast.error('Could not load data for export');
        return;
      }

      // Prepare CSV data
      const csvData = [];

      // Add headers
      csvData.push(sheetsResponse.data.headers);

      // Add student data
      sheetsResponse.data.tableData.forEach(row => {
        csvData.push(row);
      });

      // Convert to CSV format
      const csvContent = csvData.map(row => {
        return row.map(cell => {
          // Handle cells that contain commas, quotes, or line breaks
          const cellValue = String(cell || '');
          if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
            // Escape quotes by doubling them and wrap in quotes
            return `"${cellValue.replace(/"/g, '""')}"`;
          }
          return cellValue;
        }).join(',');
      }).join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${classRecord.name || 'ClassRecord'}_${timestamp}.csv`;

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`CSV file exported: ${filename}`);
      if (voiceEnabled) {
        speakText('CSV file has been exported successfully');
      }

    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV file');
      if (voiceEnabled) {
        speakText('Failed to export CSV file');
      }
    }
  };

  const handleExportToPDF = async () => {
    try {
      if (!classRecord?.google_sheet_id) {
        toast.error('No Google Sheet connected');
        return;
      }

      toast('📄 Preparing PDF export...');

      // Get data
      let sheetsResponse;

      if (currentSheet?.sheet_name) {
        console.log('🔥 PDF EXPORT: Using specific sheet data for:', currentSheet.sheet_name);
        sheetsResponse = await classRecordService.getSpecificSheetData(
          classRecord.google_sheet_id,
          currentSheet.sheet_name
        );
      } else {
        console.log('🔥 PDF EXPORT: Using general sheet data');
        sheetsResponse = await classRecordService.getGoogleSheetsDataServiceAccount(
          classRecord.google_sheet_id
        );
      }

      if (!sheetsResponse.data?.success || !sheetsResponse.data.tableData?.length) {
        toast.error('Could not load data for export');
        return;
      }

      // 🔥 FIX: Combine headers to get ALL columns including Total Score and Term Grade
      const allHeaders = [...sheetsResponse.data.headers];

      // Add missing headers from main_headers if they exist
      if (sheetsResponse.data.main_headers && sheetsResponse.data.main_headers.length > sheetsResponse.data.headers.length) {
        for (let i = sheetsResponse.data.headers.length; i < sheetsResponse.data.main_headers.length; i++) {
          if (sheetsResponse.data.main_headers[i]) {
            allHeaders.push(sheetsResponse.data.main_headers[i]);
            console.log(`🔥 ADDED MISSING HEADER: "${sheetsResponse.data.main_headers[i]}" at index ${i}`);
          }
        }
      }

      console.log('🔥 PDF DEBUG: Original headers:', sheetsResponse.data.headers.length);
      console.log('🔥 PDF DEBUG: All headers (with missing ones):', allHeaders.length);
      console.log('🔥 PDF DEBUG: Complete headers:', allHeaders);

      // Create PDF document
      const doc = new jsPDF('landscape');

      // 🔥 PAGE 1: Use complete headers for the table
      // Simple title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(classRecord.name || 'Class Record', 15, 20);

      // Simple metadata
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Teacher: ${classRecord.teacher_name || 'N/A'} | Semester: ${classRecord.semester || 'N/A'} | Date: ${new Date().toLocaleDateString()}`, 15, 30);

      // 🔥 PAGE 1: Use ALL headers including the missing ones
      const tableHeaders = [allHeaders];

      const tableData = sheetsResponse.data.tableData.map(row => {
        const paddedRow = [...row];
        // Ensure row matches the complete header count
        while (paddedRow.length < allHeaders.length) {
          paddedRow.push('');
        }
        return paddedRow;
      });

      console.log('🔥 PDF DEBUG: Table headers length:', tableHeaders[0].length);
      console.log('🔥 PDF DEBUG: First data row length:', tableData[0]?.length);

      // Page 1 table with ALL columns
      autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: 40,
        styles: {
          fontSize: 5,
          cellPadding: 0.5,
          overflow: 'linebreak',
          halign: 'center'
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 5
        },
        columnStyles: {
          0: { cellWidth: 6 },  // NO. column
          1: { cellWidth: 15 }, // LASTNAME
          2: { cellWidth: 15 }, // FIRST NAME
          3: { cellWidth: 12 }, // STUDENT ID
        },
        margin: { top: 40, right: 5, bottom: 20, left: 5 },
        theme: 'striped',
        tableWidth: 'auto'
      });

      // 🔥 PAGE 2: Now look for Total Score and Term Grade in the COMPLETE headers
      doc.addPage();

      // Page 2 title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${classRecord.name || 'Class Record'} - Final Grades`, 15, 20);

      // Page 2 metadata
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Score and Term Grade | Generated: ${new Date().toLocaleDateString()}`, 15, 30);

      // 🔥 SEARCH: Look for Total Score and Term Grade in COMPLETE headers
      const page2Headers = [];
      const page2HeaderIndices = [];

      // Student identification columns
      allHeaders.forEach((header, index) => {
        const headerLower = header.toLowerCase();
        if (headerLower.includes('no.') || headerLower === 'no' ||
          headerLower.includes('lastname') ||
          headerLower.includes('first name') || headerLower.includes('firstname')) {
          page2Headers.push(header);
          page2HeaderIndices.push(index);
        }
      });

      // Look for Total Score and Term Grade in complete headers
      allHeaders.forEach((header, index) => {
        if (header === 'Total Score' || header === 'Term Grade') {
          page2Headers.push(header);
          page2HeaderIndices.push(index);
          console.log(`🔥 FOUND FINAL GRADE: "${header}" at index ${index}`);
        }
      });

      console.log('🔥 PAGE 2 DEBUG: Headers:', page2Headers);
      console.log('🔥 PAGE 2 DEBUG: Header indices:', page2HeaderIndices);

      // Page 2 data using the complete data rows
      const page2Data = sheetsResponse.data.tableData.map(row => {
        return page2HeaderIndices.map(index => row[index] || '');
      });

      // Create Page 2 table with final grades
      if (page2Headers.length > 3) { // More than just student info
        autoTable(doc, {
          head: [page2Headers],
          body: page2Data,
          startY: 40,
          styles: {
            fontSize: 12,
            cellPadding: 4,
            overflow: 'linebreak',
            halign: 'center'
          },
          headStyles: {
            fillColor: [34, 197, 94], // Green for final grades
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 12
          },
          columnStyles: {
            0: { cellWidth: 20 }, // NO.
            1: { cellWidth: 50 }, // LASTNAME
            2: { cellWidth: 50 }, // FIRST NAME
            3: { cellWidth: 40 }, // Total Score
            4: { cellWidth: 40 }, // Term Grade
          },
          margin: { top: 40, right: 50, bottom: 20, left: 50 },
          theme: 'striped',
          tableWidth: 'auto'
        });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('Final computed grades for all students', 15, doc.lastAutoTable.finalY + 15);
      } else {
        doc.setFontSize(12);
        doc.text('Total Score and Term Grade columns still not found.', 15, 50);
        doc.text(`Found ${page2Headers.length} headers for Page 2`, 15, 65);
      }

      // Simple footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${pageCount} - Generated by Vocalyx Class Record System`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${classRecord.name || 'ClassRecord'}_${timestamp}.pdf`;

      // Save PDF
      doc.save(filename);

      toast.success(`PDF exported: ${filename} (${pageCount} pages, ${allHeaders.length} columns with Total Score & Term Grade)`);

      if (voiceEnabled) {
        speakText(`PDF file exported successfully with final grades on page 2`);
      }

    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF file');
      if (voiceEnabled) {
        speakText('Failed to export PDF file');
      }
    }
  };


  const handleVoiceRecord = () => {
    if (!isSupported) {
      toast.error('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    // If already recording, stop (existing behavior)
    if (isListening) {
      stopListening();
      stopSpeaking();
      return;
    }

    // 🔥 NEW: Show mode selection modal if not recording
    setShowModeSelectionModal(true);
  };

  // 🔥 NEW: Handle Single Mode Selection
  const handleSingleModeSelected = async () => {
    setShowModeSelectionModal(false);

    // If batch mode is already active, cancel it
    if (batchMode) {
      cancelBatchMode();
    }

    // Start recording
    startListening();
  };

  // 🔥 NEW: Handle Batch Mode Selection
  const handleBatchModeSelected = async () => {
    setShowModeSelectionModal(false);

    // 🔥 FIX: Start batch mode and wait for speech to complete
    await startBatchMode();

    // Listening will start after a column is selected inside the Batch modal
  };

  // Dropdown helper functions
  const toggleDropdown = (name) => {
    setDropdowns(prev => {
      const isCurrentlyOpen = prev[name];
      if (isCurrentlyOpen) {
        // If currently open, just close it
        return {
          ...prev,
          [name]: false
        };
      } else {
        // If currently closed, close all others and open this one
        // Also close sheet selector when opening a dropdown
        setShowSheetSelector(false);
        return {
          tools: false,
          voice: false,
          edit: false,
          [name]: true
        };
      }
    });
  };

  const closeAllDropdowns = () => {
    setDropdowns({ tools: false, voice: false, edit: false });
    setShowSheetSelector(false); // 🔥 ADD THIS LINE
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => closeAllDropdowns();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 🔥 Google Sheets Integration - Show embedded sheet if available
  if (classRecord?.google_sheet_id) {
    return (
      <div className="h-screen flex flex-col bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          {/* Top Bar */}
          <div className="px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-4">

              {/* Left Section - Navigation & Title (Always Visible) */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => navigate('/class-records')}
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors group flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="text-sm font-medium hidden sm:inline">Back</span>
                </button>
                <div className="h-5 w-px bg-slate-300 flex-shrink-0"></div>
                <div className="min-w-0 overflow-hidden">
                  <h1 className="text-lg sm:text-xl font-semibold text-slate-900 break-words">{classRecord?.name}</h1>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {classRecord?.academic_year && (
                      <span className="text-[11px] sm:text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-2 py-0.5 rounded-full font-medium border border-blue-200/50">
                        {classRecord.academic_year}
                      </span>
                    )}
                    {classRecord?.semester && (
                      <span className="text-[11px] sm:text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-2 py-0.5 rounded-full font-medium border border-blue-200/50">
                        {classRecord.semester}
                      </span>
                    )}
                    {classRecord?.section_name && (
                      <span className="text-[11px] sm:text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-2 py-0.5 rounded-full font-medium border border-blue-200/50">
                        {classRecord.section_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Section - Desktop (Hidden on Mobile/Tablet) */}
              <div className="hidden lg:flex items-center gap-3">
                {/* Save Status */}
                <div className="text-sm text-slate-600 mr-2">
                  {lastSaved && (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Saved {new Date(lastSaved).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {/* Allocation Badge */}
                <div className="relative">
                  {/* 🔥 PHASE 6: Sync Status Indicator */}
                  {currentSheet?.sheet_name && syncStatus[currentSheet.sheet_name] && (
                    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-sm border ${syncStatus[currentSheet.sheet_name].isSynced
                      ? 'bg-green-50 border-green-200'
                      : 'bg-orange-50 border-orange-200'
                      }`}>
                      {syncStatus[currentSheet.sheet_name].isSynced ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium text-green-700">
                            Synced with {syncStatus[currentSheet.sheet_name].source || 'SETTINGS'}
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          <span className="text-xs font-medium text-orange-700">
                            Not synced with SETTINGS
                          </span>
                          <button
                            onClick={() => manualSyncToSettings(currentSheet.sheet_name)}
                            disabled={isRefreshingAllocation}
                            className="ml-2 px-2 py-0.5 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:opacity-50"
                          >
                            Sync Now
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {classStandingRemaining > 0 ? (
                    <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg shadow-sm">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-semibold text-amber-700">
                          Class Standing: {classStandingRemaining}% remaining
                        </span>
                      </div>
                      <button
                        onClick={manualRefreshAllocation}
                        disabled={isRefreshingAllocation}
                        className="ml-1 p-1 hover:bg-amber-100 rounded transition-colors disabled:opacity-50"
                        title="Refresh allocation status"
                      >
                        <RefreshCw className={`w-3 h-3 text-amber-600 ${isRefreshingAllocation ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  ) : classStandingRemaining === 0 && user ? (
                    <div className="flex items-center space-x-2 bg-sky-50 border border-sky-200 px-3 py-2 rounded-lg shadow-sm min-h-[34px] text-sm font-medium text-sky-900">
                      <CheckCircle2 className={`w-4 h-4 ${isRefreshingAllocation ? 'text-sky-400 animate-pulse' : 'text-sky-600'}`} />
                      <span>
                        {isRefreshingAllocation ? 'Verifying...' : '100% Allocated'}
                      </span>
                    </div>
                  ) : null}

                  {/* Allocation Tooltip */}
                  {onboardingStep === 1 && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50">
                      <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-3 w-64">
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1">
                          <div className="w-3 h-3 bg-white border-l border-t border-slate-200 transform rotate-45"></div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                            <PieChart className="w-4 h-4 text-[#333D79]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 mb-2">Allocation Status</p>
                            <p className="text-xs text-slate-600 leading-relaxed mb-3">
                              Check the grade percentage allocation status here. For example, cell K2 shows the percentage column for quizzes. Ensure all category percentages total 100%.
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOnboardingStep(2);
                              }}
                              className="px-4 py-1.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white text-xs rounded-md hover:from-[#2A3366] hover:to-[#3E4677] transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sheet Selector */}
                {availableSheets.length > 1 && (
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        // Close tools dropdown (and other dropdowns) when opening sheet selector
                        if (!showSheetSelector) {
                          setDropdowns({ tools: false, voice: false, edit: false });
                        }
                        setShowSheetSelector(!showSheetSelector);
                      }}
                      disabled={loadingSheets}
                      className="flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-medium hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-200 disabled:opacity-50"
                    >
                      <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap max-w-[120px] truncate">
                        {loadingSheets ? 'Loading...' : (currentSheet?.sheet_name || 'Select Sheet')}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${showSheetSelector ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Sheet Selector Tooltip */}
                    {onboardingStep === 2 && (
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50">
                        <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-3 w-64">
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1">
                            <div className="w-3 h-3 bg-white border-l border-t border-slate-200 transform rotate-45"></div>
                          </div>

                          <div className="flex items-start space-x-3">
                            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                              <FileSpreadsheet className="w-4 h-4 text-[#333D79]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 mb-2">Switch Between Sheets</p>
                              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                                Click this button to switch between different grade sheets
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOnboardingStep(3);
                                }}
                                className="px-4 py-1.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white text-xs rounded-md hover:from-[#2A3366] hover:to-[#3E4677] transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sheet Dropdown */}
                    {showSheetSelector && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 max-h-60 overflow-y-auto">
                        <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                          Available Sheets ({availableSheets.length})
                        </div>
                        {availableSheets.map((sheet, index) => (
                          <button
                            key={sheet.sheet_id}
                            onClick={() => switchToSheet(sheet)}
                            disabled={loadingSheets}
                            className={`flex items-center space-x-3 px-4 py-2 text-sm w-full text-left transition-colors disabled:opacity-50 ${currentSheet?.sheet_name === sheet.sheet_name
                              ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-500'
                              : 'text-slate-700 hover:bg-slate-50'
                              }`}
                          >
                            <span className="w-6 h-6 bg-slate-100 rounded text-xs flex items-center justify-center font-medium">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{sheet.sheet_name}</div>
                            </div>
                            {currentSheet?.sheet_name === sheet.sheet_name && (
                              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tools Dropdown */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleDropdown('tools')}
                    className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors shadow-sm"
                  >
                    <MoreVertical className="w-4 h-4" />
                    <span>Tools</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${dropdowns.tools ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdowns.tools && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                      {/* Tool Items (Same as before) */}
                      <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        Import Options
                      </div>
                      <button
                        onClick={() => {
                          setShowImportInfoModal(true);
                          closeAllDropdowns();
                        }}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                      >
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span>Import Students</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowImportScoresInfoModal(true);
                          closeAllDropdowns();
                        }}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                      >
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                        <span>Import Scores</span>
                      </button>

                      <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        Grading Tools
                      </div>

                      <button
                        onClick={async () => {
                          await startBatchMode();
                          closeAllDropdowns();
                        }}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                      >
                        <Users className="w-4 h-4 text-purple-600" />
                        <span>Batch Grading</span>
                      </button>

                      <button
                        onClick={() => {
                          handleAutoNumberStudents();
                          closeAllDropdowns();
                        }}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                      >
                        <span className="w-4 h-4 text-blue-600 text-center font-bold">#</span>
                        <span>Auto-Number Students</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowFinalGradeOverview(true);
                          closeAllDropdowns();
                        }}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                      >
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Generate Final Grade</span>
                      </button>

                      <button
                        onClick={() => {
                          manualRefreshAllocation();
                          closeAllDropdowns();
                        }}
                        disabled={isRefreshingAllocation}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left disabled:opacity-60"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{isRefreshingAllocation ? 'Checking allocation...' : 'Run Allocation Checker'}</span>
                      </button>

                      <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        Sync Tools
                      </div>

                      <button
                        onClick={async () => {
                          closeAllDropdowns();
                          if (midtermFinalSyncInProgress.current) {
                            toast('Sync already in progress...');
                            return;
                          }
                          toast('Syncing Midterm to Final sheet...');
                          await checkMidtermFinalSync();
                        }}
                        disabled={midtermFinalSyncInProgress.current}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left disabled:opacity-60"
                      >
                        <RefreshCw className={`w-4 h-4 text-indigo-600 ${midtermFinalSyncInProgress.current ? 'animate-spin' : ''}`} />
                        <span>{midtermFinalSyncInProgress.current ? 'Syncing...' : 'Sync Midterm to Final'}</span>
                      </button>

                      <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        Category Tools
                      </div>

                      <button
                        onClick={() => {
                          setShowAddCategoryModal(true);
                          closeAllDropdowns();
                        }}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                      >
                        <Plus className="w-4 h-4 text-green-600" />
                        <span>Add Category</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowAddColumnModal(true);
                          closeAllDropdowns();
                        }}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                      >
                        <Plus className="w-4 h-4 text-emerald-600" />
                        <span>Add Column to Category</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowEditCategoryModal(true);
                          closeAllDropdowns();
                        }}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                        <span>Edit Category</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowDeleteCategoryModal(true);
                          closeAllDropdowns();
                        }}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-red-50 w-full text-left"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                        <span>Delete Category</span>
                      </button>
                    </div>
                  )}

                  {/* Tools Tooltip */}
                  {onboardingStep === 3 && (
                    <div className="absolute top-full right-0 mt-2 z-50">
                      <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-3 w-64">
                        <div className="absolute bottom-full right-4 mb-1">
                          <div className="w-3 h-3 bg-white border-l border-t border-slate-200 transform rotate-45"></div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                            <MoreVertical className="w-4 h-4 text-[#333D79]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 mb-2">Tools</p>
                            <p className="text-xs text-slate-600 leading-relaxed mb-3">
                              Access import, export, and grading tools here.
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOnboardingStep(4);
                              }}
                              className="px-4 py-1.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white text-xs rounded-md hover:from-[#2A3366] hover:to-[#3E4677] transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Open in Sheets Button */}
                <div className="relative">
                  <a
                    href={classRecord.google_sheet_url || `https://docs.google.com/spreadsheets/d/${classRecord.google_sheet_id}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg font-medium hover:bg-green-100 transition-colors shadow-sm border border-green-200 whitespace-nowrap"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Open in Sheets</span>
                  </a>

                  {/* Open in Sheets Tooltip */}
                  {onboardingStep === 4 && (
                    <div className="absolute top-full right-0 mt-2 z-50">
                      <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-3 w-64">
                        <div className="absolute bottom-full right-12 mb-1">
                          <div className="w-3 h-3 bg-white border-l border-t border-slate-200 transform rotate-45"></div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                            <FileSpreadsheet className="w-4 h-4 text-[#333D79]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 mb-2">Open in Sheets</p>
                            <p className="text-xs text-slate-600 leading-relaxed mb-3">
                              Open the full spreadsheet in Google Sheets.
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOnboardingComplete();
                              }}
                              className="px-4 py-1.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white text-xs rounded-md hover:from-[#2A3366] hover:to-[#3E4677] transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                            >
                              Got it!
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Menu Button (Visible on Mobile/Tablet) */}
              <div className="flex lg:hidden">
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Overlay */}
        {isDrawerOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setIsDrawerOpen(false)}
            />
            <div className="absolute inset-y-0 right-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-semibold text-slate-900">Class Tools</h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Status Section */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</div>

                  {/* Save Status */}
                  <div className="flex items-center justify-between text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-600">Save Status</span>
                    {lastSaved ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Saved
                      </span>
                    ) : null}
                  </div>

                  {/* 🔥 PHASE 6: SETTINGS Sync Status */}
                  {currentSheet?.sheet_name && syncStatus[currentSheet.sheet_name] && (
                    <div className={`text-sm p-3 rounded-lg border ${syncStatus[currentSheet.sheet_name].isSynced
                      ? 'bg-green-50 border-green-200'
                      : 'bg-orange-50 border-orange-200'
                      }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600 font-medium">SETTINGS Sync</span>
                        {syncStatus[currentSheet.sheet_name].isSynced ? (
                          <span className="text-green-600 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Synced
                          </span>
                        ) : (
                          <span className="text-orange-600 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3 h-3" />
                            Not Synced
                          </span>
                        )}
                      </div>
                      {!syncStatus[currentSheet.sheet_name].isSynced && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-orange-700">
                            Sheet percentages differ from {syncStatus[currentSheet.sheet_name].source || 'SETTINGS'} tab
                          </p>
                          {syncStatus[currentSheet.sheet_name].differences.length > 0 && (
                            <div className="text-xs text-orange-600 mt-1">
                              {syncStatus[currentSheet.sheet_name].differences.slice(0, 2).map((diff, idx) => (
                                <div key={idx}>
                                  {diff.category}: {diff.sheet}% → {diff.settings}%
                                </div>
                              ))}
                              {syncStatus[currentSheet.sheet_name].differences.length > 2 && (
                                <div>+{syncStatus[currentSheet.sheet_name].differences.length - 2} more</div>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => manualSyncToSettings(currentSheet.sheet_name)}
                            disabled={isRefreshingAllocation}
                            className="mt-2 w-full px-3 py-1.5 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:opacity-50 transition-colors"
                          >
                            Sync Now
                          </button>
                        </div>
                      )}
                      {syncStatus[currentSheet.sheet_name].isSynced && (
                        <p className="text-xs text-green-700 mt-1">
                          Using {syncStatus[currentSheet.sheet_name].source || 'SETTINGS'} tab
                        </p>
                      )}
                    </div>
                  )}

                  {/* Allocation Badge (Mobile) */}
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${classStandingRemaining > 0
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-sky-50 border-sky-200'
                    }`}>
                    {classStandingRemaining > 0 ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-amber-800">Class Standing: {classStandingRemaining}% remaining</span>
                        </div>
                        <button
                          onClick={manualRefreshAllocation}
                          className="p-1.5 bg-white rounded-md shadow-sm text-amber-600 hover:text-amber-800"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAllocation ? 'animate-spin' : ''}`} />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 w-full text-sky-900">
                        <CheckCircle2 className="w-4 h-4 text-sky-600" />
                        <span className="text-sm font-medium">Percentage Column: 100%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sheets Section */}
                {availableSheets.length > 1 && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sheets</div>
                    <div className="grid grid-cols-1 gap-2">
                      {availableSheets.map((sheet, index) => (
                        <button
                          key={sheet.sheet_id}
                          onClick={() => {
                            switchToSheet(sheet);
                            setIsDrawerOpen(false);
                          }}
                          className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all ${currentSheet?.sheet_name === sheet.sheet_name
                            ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                          <span className="w-6 h-6 flex items-center justify-center bg-white rounded border border-slate-200 text-xs">
                            {index + 1}
                          </span>
                          <span className="truncate">{sheet.sheet_name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions Section */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</div>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={async () => {
                        setIsDrawerOpen(false);
                        if (midtermFinalSyncInProgress.current) {
                          toast('Sync already in progress...');
                          return;
                        }
                        toast('Syncing Midterm to Final sheet...');
                        await checkMidtermFinalSync();
                      }}
                      disabled={midtermFinalSyncInProgress.current}
                      className="flex items-center space-x-3 px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <RefreshCw className={`w-4 h-4 text-indigo-600 ${midtermFinalSyncInProgress.current ? 'animate-spin' : ''}`} />
                      <span>{midtermFinalSyncInProgress.current ? 'Syncing...' : 'Sync Midterm to Final'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowImportInfoModal(true);
                        setIsDrawerOpen(false);
                      }}
                      className="flex items-center space-x-3 px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span>Import Students</span>
                    </button>

                    <button
                      onClick={async () => {
                        await startBatchMode();
                        setIsDrawerOpen(false);
                      }}
                      className="flex items-center space-x-3 px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>Batch Grading</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowFinalGradeOverview(true);
                        setIsDrawerOpen(false);
                      }}
                      className="flex items-center space-x-3 px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <span>Generate Final Grade</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowAddCategoryModal(true);
                        setIsDrawerOpen(false);
                      }}
                      className="flex items-center space-x-3 px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="w-4 h-4 text-green-600" />
                      <span>Add Category</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowAddColumnModal(true);
                        setIsDrawerOpen(false);
                      }}
                      className="flex items-center space-x-3 px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="w-4 h-4 text-emerald-600" />
                      <span>Add Column to Category</span>
                    </button>
                  </div>
                </div>

                {/* Footer Links */}
                <div className="pt-4 mt-4 border-t border-slate-200">
                  <a
                    href={classRecord.google_sheet_url || `https://docs.google.com/spreadsheets/d/${classRecord.google_sheet_id}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 w-full bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Open in Google Sheets</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Embedded Google Sheet */}
        <div className="flex-1 p-4">
          <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">

            {/* 🔥 ENHANCED: Dynamic iframe that switches sheets */}
            <iframe
              key={currentSheet?.sheet_id || 'default'} // 🔥 Force re-render when sheet changes
              src={currentSheet
                ? `https://docs.google.com/spreadsheets/d/${classRecord.google_sheet_id}/edit#gid=${currentSheet.sheet_id}&rm=minimal&widget=true&chrome=false&headers=false`
                : `https://docs.google.com/spreadsheets/d/${classRecord.google_sheet_id}/edit?usp=sharing&rm=minimal&widget=true&chrome=false&headers=false`
              }
              width="100%"
              height="100%"
              frameBorder="0"
              className="w-full h-full border-0 rounded-lg"
              title={`${classRecord.name} - ${currentSheet?.sheet_name || 'Class Record'} Sheet`}
              allowFullScreen
              style={{
                border: 'none',
                outline: 'none',
                borderRadius: '8px',
                boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.1)'
              }}
            />

            {/* 🔥 Loading overlay when switching sheets */}
            {loadingSheets && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  <span className="text-slate-700 font-medium">
                    Switching to {currentSheet?.sheet_name}...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {isSorting && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-lg">
            <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
              <p className="text-gray-700 font-medium">Sorting students...</p>
              <p className="text-gray-500 text-sm">Please wait while we rearrange the data</p>
            </div>
          </div>
        )}

        {/* 🎤 FLOATING VOICE RECORDING BUTTON - Embedded View */}
        {isSupported && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className="flex items-center space-x-3">
              {/* Voice Guide Button */}
              <button
                onClick={() => setShowVoiceGuide(true)}
                className="bg-white border border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
                title="Voice Commands Guide"
              >
                <HelpCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>

              {/* Main Voice Recording Button */}
              <button
                onClick={handleVoiceRecord}
                className={`relative p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 ${isListening
                  ? 'bg-red-500 text-white shadow-red-500/50 animate-pulse hover:bg-red-600'
                  : 'bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white shadow-blue-600/50 hover:bg-blue-[#4A5491]'
                  }`}
                title={isListening ? 'Stop voice recording' : 'Start voice recording'}
              >
                {isListening ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}

                {/* Listening indicator ring */}
                {isListening && (
                  <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></div>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 🔥 NEW: Mode Selection Modal */}
        {showModeSelectionModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setShowModeSelectionModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 overflow-hidden max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - match VoiceGuideModal colors */}
              <div className="bg-gradient-to-r from-[#333D79] to-[#4A5491] px-6 py-4 rounded-t-2xl flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Mic className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Choose Your Recording Mode</h3>
                      <p className="text-sm text-white/80">Pick the best way to record grades for your workflow</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModeSelectionModal(false)}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Close"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content - SIDE BY SIDE LAYOUT */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {/* Quick Guide - Compact */}
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 mb-5">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800">
                      <strong className="text-blue-900">Quick Guide:</strong> <strong>Single Mode:</strong> Best for grading 1-5 students.  <strong>Batch Mode:</strong> Best for grading 10+ students quickly!
                    </p>
                  </div>
                </div>

                {/* TWO COLUMN LAYOUT - SIDE BY SIDE */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  {/* LEFT SIDE: Single Mode */}
                  <button
                    onClick={handleSingleModeSelected}
                    className="p-5 rounded-xl border-2 border-blue-200 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 hover:shadow-lg transition-all duration-200 group text-left h-full"
                  >
                    {/* Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                          <Mic className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-900 group-hover:text-blue-700">Single Mode</h4>
                          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-semibold">One at a time</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                      Record <strong>one grade at a time</strong>. Click microphone → Speak → Done. Perfect for small classes or individual grade corrections.
                    </p>

                    {/* Example */}
                    <div className="bg-white rounded-lg p-3 border border-blue-200 mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">🎤 Example:</p>
                      <p className="text-xs font-mono text-blue-900 bg-blue-100 px-3 py-2 rounded">
                        "Quiz 1 Maria eighty-five"
                      </p>
                      <p className="text-xs text-gray-600 mt-1.5 flex items-center space-x-1">
                        <FiCheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                        <span>Records one grade, then stops</span>
                      </p>
                    </div>

                    {/* When to Use */}
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold text-gray-700">Best for:</span> Grading 1-5 students, fixing individual grades, or when you're new to voice commands
                      </p>
                    </div>
                  </button>

                  {/* RIGHT SIDE: Batch Mode */}
                  <button
                    onClick={handleBatchModeSelected}
                    className="p-5 rounded-xl border-2 border-purple-300 hover:border-purple-500 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 hover:shadow-xl transition-all duration-200 group relative text-left h-full"
                  >
                    {/* Recommended Badge - Top Right */}
                    <div className="absolute -top-2 -right-2 flex items-center space-x-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg z-10 animate-pulse">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>RECOMMENDED</span>
                    </div>

                    {/* Time Saver Badge - Top Left */}
                    <div className="absolute -top-2 -left-2 flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg z-10">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Saves Hours!</span>
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 mt-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-900 group-hover:text-purple-700">Batch Mode</h4>
                          <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-semibold">Grade many students</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                      Record <strong>multiple grades in one session</strong>.  Speak all student names and scores together, separated by commas. <span className="font-bold text-purple-700">Up to 3x faster!</span>
                    </p>

                    {/* Example */}
                    <div className="bg-white rounded-lg p-3 border border-purple-300 mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">🎤 Example:</p>
                      <p className="text-xs font-mono text-purple-900 bg-purple-100 px-3 py-2 rounded leading-relaxed">
                        "Maria 85, John 90, Sarah 78, Tom 92, Lisa 88"
                      </p>
                      <p className="text-xs text-gray-600 mt-1.5 flex items-center space-x-1">
                        <FiCheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                        <span>Records <strong className="text-green-600">5 grades instantly</strong> in one command!</span>
                      </p>
                    </div>

                    {/* Benefits List - Compact */}
                    <div className="space-y-1.5">
                      <div className="flex items-start space-x-2">
                        <Zap className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold">Super Fast:</span> Grade 20-30 students in under 2 minutes
                        </p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Target className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold">Perfect for:</span> Quizzes, homework, tests with whole-class grading
                        </p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Award className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold">Best for:</span> Grading 10+ students at once
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Comparison Table - Enhanced */}
                <div className="mt-5 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-5 border-2 border-gray-200 shadow-sm">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <h5 className="font-bold text-gray-900 text-base">Quick Comparison</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Single Mode */}
                    <div className="bg-white rounded-lg p-4 border-2 border-blue-200 shadow-sm">
                      <div className="flex items-center justify-center space-x-2 mb-3">
                        <Mic className="w-4 h-4 text-blue-600" />
                        <p className="font-bold text-blue-900 text-sm">Single Mode</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-center space-x-1.5">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <p className="text-blue-700 text-xs font-semibold">~20 seconds/student</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-200 mt-2">
                          <p className="text-gray-700 text-xs mb-0.5">For 20 students:</p>
                          <p className="text-blue-900 font-bold text-sm">~7 minutes</p>
                        </div>
                      </div>
                    </div>

                    {/* Batch Mode */}
                    <div className="bg-white rounded-lg p-4 border-2 border-purple-300 shadow-sm relative">
                      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                        3.5x FASTER
                      </div>
                      <div className="flex items-center justify-center space-x-2 mb-3">
                        <Users className="w-4 h-4 text-purple-600" />
                        <p className="font-bold text-purple-900 text-sm">Batch Mode</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-center space-x-1.5">
                          <Zap className="w-4 h-4 text-purple-600" />
                          <p className="text-purple-700 text-xs font-semibold">~6 seconds/student</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-2.5 border border-purple-200 mt-2">
                          <p className="text-gray-700 text-xs mb-0.5">For 20 students:</p>
                          <p className="text-purple-900 font-bold text-sm">~2 minutes</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time Savings Highlight */}
                  <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border-2 border-green-200">
                    <div className="flex items-center justify-center space-x-2">
                      <Zap className="w-4 h-4 text-green-600" />
                      <p className="text-green-900 text-xs font-bold">
                        <span className="text-sm">Save ~5 minutes</span> per assignment with Batch Mode!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Help Text - Compact */}
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-900 mb-0.5">Not sure which to choose?</p>
                      <p className="text-xs text-amber-800">
                        <strong>Try Batch Mode first!</strong> It's faster and easier for most teachers.  You can always switch back to Single Mode anytime.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Compact */}
              <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 flex items-center justify-between rounded-b-2xl flex-shrink-0">
                <p className="text-xs text-gray-600">
                  💡 <strong>Tip:</strong> You can change modes anytime!
                </p>
                <button
                  onClick={() => setShowModeSelectionModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg transition-all font-medium border border-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 NEW: Real-time Transcript / Processing Overlay */}
        {!batchMode && (isListening || transcript.trim() || (voiceBusy || ['processing', 'verifying', 'writing', 'done', 'error'].includes(voicePhase))) && (
          <div className="fixed bottom-6 left-6 z-50 max-w-md">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden backdrop-blur-sm">
              {/* Header */}
              <div className={`px-4 py-3 flex items-center justify-between ${isListening
                ? 'bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200'
                : (voicePhase === 'error'
                  ? 'bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200'
                  : (voicePhase === 'done'
                    ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-emerald-200'
                    : (voiceBusy
                      ? 'bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200'
                      : 'bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200')))
                }`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isListening
                    ? 'bg-red-500 animate-pulse'
                    : (voicePhase === 'error'
                      ? 'bg-red-500'
                      : (voicePhase === 'done'
                        ? 'bg-emerald-500'
                        : (voiceBusy ? 'bg-amber-500 animate-pulse' : 'bg-green-500')))
                    }`}></div>
                  <span className={`text-sm font-medium ${isListening
                    ? 'text-red-700'
                    : (voicePhase === 'error'
                      ? 'text-red-700'
                      : (voicePhase === 'done'
                        ? 'text-emerald-700'
                        : (voiceBusy ? 'text-amber-700' : 'text-green-700')))
                    }`}>
                    {isListening
                      ? '🎙️ Listening...'
                      : (voicePhase === 'error'
                        ? (voiceStatus ? `${voiceStatus}` : 'Error')
                        : (voicePhase === 'done'
                          ? '✅ Saved'
                          : (voiceBusy
                            ? (voicePhase === 'verifying' ? 'Verifying...' : voicePhase === 'writing' ? 'Writing…' : 'Processing…')
                            : '✅ Voice Input')))}
                  </span>
                  {batchMode && (
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                      Batch Mode
                    </span>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={() => {
                    if (voiceBusy) {
                      // cancel current operation
                      try {
                        voiceCancelRef.current = true;
                        if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
                        setIsSlow(false);
                        setVoiceBusy(false);
                        setVoicePhase('idle');
                        setVoiceStatus('');
                      } catch {
                        // no-op safeguard
                      }
                    } else {
                      if (isListening) {
                        stopListening();
                      }
                      clearTranscript();
                    }
                  }}
                  className={`p-1 rounded-full transition-colors ${isListening
                    ? 'hover:bg-red-200 text-red-600'
                    : (voiceBusy ? 'hover:bg-amber-200 text-amber-700' : 'hover:bg-green-200 text-green-600')
                    }`}
                  title={voiceBusy ? 'Cancel' : 'Clear transcript'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Transcript Content */}
              <div className="p-4">
                {transcript.trim() ? (
                  <div className="space-y-2">
                    {/* Current transcript */}
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="text-xs text-slate-500 mb-1">You said:</div>
                      <div className="text-slate-800 font-medium leading-relaxed">
                        "{transcript}"
                      </div>
                    </div>

                    {/* Processing status */}
                    {!isListening && transcript.trim() && (
                      <div className="flex items-center space-x-2 text-xs text-slate-600">
                        {(voiceBusy || ['processing', 'verifying', 'writing'].includes(voicePhase)) && (
                          <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                        )}
                        <span>{voiceStatus || 'Processing command...'}</span>
                        {isSlow && (
                          <button className="ml-2 text-amber-700 underline"
                            onClick={() => {
                              try {
                                voiceCancelRef.current = true;
                                if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
                                setIsSlow(false);
                                setVoiceBusy(false);
                                setVoicePhase('idle');
                                setVoiceStatus('');
                              } catch {
                                // no-op safeguard
                              }
                            }}
                          >
                            Still working… Cancel
                          </button>
                        )}
                      </div>
                    )}

                    {/* Batch mode hints */}
                    {batchMode && currentBatchColumn && (
                      <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                        <div className="text-xs text-purple-600 mb-1">
                          💡 Column: <span className="font-medium">{currentBatchColumn}</span>
                          {currentSheet && (
                            <span className="ml-2">• Sheet: <span className="font-medium">{currentSheet.sheet_name}</span></span>
                          )}
                        </div>
                        <div className="text-xs text-purple-600">
                          Say: "Student Name + Score" or "done" to finish
                        </div>
                      </div>
                    )}

                    {/* Regular mode hints */}
                    {!batchMode && (
                      <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                        <div className="text-xs text-blue-600">
                          💡 For numbered columns, say: <span className="font-semibold">"[Column] [Student] [Score]"</span>
                          <div className="mt-1">Examples: "Quiz 1 Maria eighty-five", "Lab 2 John ninety"</div>
                          {currentSheet && (
                            <div className="mt-1">Sheet: <span className="font-medium">{currentSheet.sheet_name}</span></div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Empty state */
                  <div className="text-center py-6">
                    <Mic className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <div className="text-sm text-slate-600 mb-1">
                      {isListening ? 'Speak now...' : (voiceBusy ? (voiceStatus || 'Processing…') : 'Start speaking to see transcript')}
                    </div>
                    <div className="text-xs text-slate-500">
                      {batchMode
                        ? 'Batch mode active - Say student names and scores'
                        : (voiceBusy ? (isSlow ? 'Still working… this may take a moment' : 'Processing your command') : 'Voice commands will appear here')
                      }
                    </div>
                  </div>
                )}
              </div>

              {/* Footer with alternatives (if available) */}
              {alternatives.length > 1 && (
                <div className="px-4 pb-3">
                  <div className="text-xs text-slate-500 mb-2">Alternative interpretations:</div>
                  <div className="space-y-1">
                    {alternatives.slice(1, 3).map((alt, index) => (
                      <div
                        key={index}
                        className="text-xs text-slate-600 bg-slate-100 rounded px-2 py-1 cursor-pointer hover:bg-slate-200 transition-colors"
                        onClick={() => {
                          clearTranscript();
                          handleVoiceCommand(alt.transcript);
                          toast(`Using alternative: "${alt.transcript}"`);
                        }}
                        title={`Confidence: ${(alt.confidence * 100).toFixed(1)}%`}
                      >
                        "{alt.transcript}" ({(alt.confidence * 100).toFixed(0)}%)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <ColumnMappingModal
          showMappingModal={showColumnImportModal}
          setShowMappingModal={setShowColumnImportModal}
          importData={pendingImportData}
          columnAnalysis={columnAnalysis}
          onConfirmMapping={handleConfirmColumnMapping}
          setImportProgress={setImportProgress}
          classRecordId={classRecord?.id}
          onBack={() => {
            // return to review modal when backing out of manual mapping
            if (autoMappingResult) {
              setShowImportReviewModal(true);
            }
          }}
        />

        <ImportReviewModal
          showModal={showImportReviewModal}
          setShowModal={setShowImportReviewModal}
          autoMappingResult={autoMappingResult}
          onConfirmImport={handleConfirmAutoMapping}
          onEditMapping={handleEditMapping}
        />

        <DuplicateStudentModal
          isOpen={showDuplicateModal}
          onClose={handleDuplicateModalClose}
          matches={duplicateModalData?.matches || []}
          searchName={duplicateModalData?.searchName || ''}
          command={duplicateModalData?.command}
          onSelectStudent={handleDuplicateStudentSelect}
        />

        <DeleteStudentModal
          isOpen={deleteStudentModal.isOpen}
          onClose={() => setDeleteStudentModal({ isOpen: false, studentName: '', studentData: null })}
          onConfirm={confirmDeleteStudent}
          studentName={deleteStudentModal.studentName}
          isDeleting={isDeleting}
        />

        <ImportStudentsModal
          showImportModal={showImportModal}
          importConflicts={importConflicts}
          setImportConflicts={setImportConflicts}
          setShowImportModal={setShowImportModal}
          setImportProgress={setImportProgress}
          executeImport={executeImport}
          newStudentsCount={newStudentsData.length}
          newStudentsData={newStudentsData}
        />

        <StudentConfirmationModal
          isVisible={studentToConfirm.isVisible}
          studentData={studentToConfirm}
          onConfirm={handleConfirmStudent}
          onCancel={handleCancelStudent}
          onEdit={handleEditStudent}
        />

        {showAddCategoryModal && (
          <AddCategoryModal
            isOpen={showAddCategoryModal}
            onClose={() => setShowAddCategoryModal(false)}
            onSubmit={handleAddCategory}
            isLoading={categoryLoading}
            remainingAvailable={classStandingRemaining}
          />
        )}

        <AddColumnToCategoryModal
          isOpen={showAddColumnModal}
          onClose={() => setShowAddColumnModal(false)}
          onSubmit={handleAddColumnToCategory}
          isLoading={isLoading}
          categories={availableCategories}
        />

        <DeleteCategoryModal
          isOpen={showDeleteCategoryModal}
          onClose={() => setShowDeleteCategoryModal(false)}
          onSubmit={handleDeleteCategory}
          isLoading={isLoading}
          categories={availableCategories} // Use dynamic categories
        />

        <EditCategoryModal
          isOpen={showEditCategoryModal}
          onClose={() => setShowEditCategoryModal(false)}
          onSubmit={handleEditCategory}
          isLoading={isLoading}
          categories={availableCategories} // Use dynamic categories
        />

        <ImportProgressIndicator
          importProgress={importProgress}
        />

        {/* Google Drive File Picker Modal */}
        <DriveFilePickerModal
          isOpen={showDriveFilePicker}
          onClose={() => setShowDriveFilePicker(false)}
          onFileSelect={handleDriveFileSelect}
          importType={importType}
        />

        {/* 📖 Voice Guide Modal */}
        <VoiceGuideModal
          showVoiceGuide={showVoiceGuide}
          setShowVoiceGuide={setShowVoiceGuide}
        />

        <OverrideConfirmationModal
          isOpen={!!overrideConfirmation}
          onClose={handleOverrideCancel}
          onConfirm={handleOverrideConfirm}
          studentName={overrideConfirmation?.studentName}
          columnName={overrideConfirmation?.columnName}
          currentScore={overrideConfirmation?.currentScore}
          newScore={overrideConfirmation?.newScore}
          maxScore={overrideConfirmation?.maxScore}
          isProcessing={false}
        />

        <ImportStudentsInfoModal
          showModal={showImportInfoModal}
          onClose={() => setShowImportInfoModal(false)}
          onProceed={() => {
            setShowImportInfoModal(false);
            handleImportStudents();
          }}
        />

        <ImportScoresInfoModal
          showModal={showImportScoresInfoModal}
          setShowModal={setShowImportScoresInfoModal}
          onProceed={handleImportScores}
        />


        {/* Batch Grading Modal */}
        <BatchGradingModal
          showBatchModal={showBatchModal}
          currentBatchColumn={currentBatchColumn}
          setCurrentBatchColumn={setCurrentBatchColumn}
          headers={headers}
          isListening={isListening}
          startListening={startListening}
          batchEntries={batchEntries}
          setBatchEntries={setBatchEntries}
          isProcessingBatch={isProcessingBatch}
          cancelBatchMode={cancelBatchMode}
          executeBatchEntries={executeBatchEntries}
          processBatchEntry={processBatchEntry}
          currentSheet={currentSheet}
          classRecord={classRecord}
          classRecordService={classRecordService}
          batchSheetData={batchSheetData}
          setBatchSheetData={setBatchSheetData}
          processingEntries={processingEntries}
          setProcessingEntries={setProcessingEntries}
          transcript={transcript}
          clearTranscript={clearTranscript}
        />

        {/* Final Grade Overview Modal */}
        <FinalGradeOverview
          isOpen={showFinalGradeOverview}
          onClose={() => setShowFinalGradeOverview(false)}
          classRecord={classRecord}
          sheetId={classRecord?.google_sheet_id}
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">No Google Sheet Connected</h2>
        <p className="text-slate-600 mb-4">This class record needs a Google Sheet to function.</p>
        <button
          onClick={() => navigate('/class-records')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to Records
        </button>
      </div>
    </div>
  );
};

export default ClassRecordExcel;