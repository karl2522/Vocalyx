import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ArrowLeft, BarChart3, ChevronDown, Download, FileSpreadsheet, FileText, HelpCircle, Mic, MicOff, MoreVertical, Upload, Users, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { classRecordService } from '../services/api';
import { speakText, stopSpeaking } from '../utils/speechSynthesis';
import useVoiceRecognition from '../utils/useVoiceRecognition';
import { findStudentRowSmart, parseVoiceCommand, applyPhoneticCorrections, cleanName} from '../utils/voicecommandParser';
import BatchGradingModal from './modals/BatchGradingModal';
import ColumnMappingModal from './modals/ColumnMappingModal';
import ImportProgressIndicator from './modals/ImportProgressIndicator';
import ImportStudentsModal from './modals/ImportStudentsModal';
import OverrideConfirmationModal from './modals/OverrideConfirmationModal';
import VoiceGuideModal from './modals/VoiceGuideModal';
import DuplicateStudentModal from './modals/DuplicateStudentModal.jsx';
import ImportStudentsInfoModal from './modals/ImportStudentsInfoModal.jsx';
import ImportScoresInfoModal from './modals/ImportScoresInfoModal.jsx';
import StudentConfirmationModal from './modals/StudentConfirmationModal.jsx';
import DeleteStudentModal from './modals/DeleteStudentModal.jsx';


const ClassRecordExcel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classRecord, setClassRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [headers, setHeaders] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);

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

  const [showColumnImportModal, setShowColumnImportModal] = useState(false);
  const [columnAnalysis, setColumnAnalysis] = useState(null);
  const [pendingImportData, setPendingImportData] = useState(null);

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

  const [availableSheets, setAvailableSheets] = useState([]);
  const [currentSheet, setCurrentSheet] = useState(null);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [showSheetSelector, setShowSheetSelector] = useState(false);

  const [overrideConfirmation, setOverrideConfirmation] = useState(null);

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

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      console.log('🔥 FIRST RENDER: Component mounted');
    }
  }, []);

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
            setTimeout(() => {
              console.log('🔥 MAIN EFFECT: 🧹 Clearing transcript (batch mode)');
              clearTranscript();
            }, 1000);
            return; // 🔥 EARLY RETURN - Don't process again
          }
          
          handleBatchVoiceCommand(transcript);
          setLastVoiceCommand(transcript);
          
          if (transcript.toLowerCase().includes('done') || 
              transcript.toLowerCase().includes('finish') ||
              transcript.toLowerCase().includes('exit')) {
            console.log('🔥 MAIN EFFECT: 🏁 FINISHING batch mode detected');
            window.batchModeFinishing = true;
            setTimeout(() => {
              console.log('🔥 MAIN EFFECT: 🧹 Clearing transcript after done command');
              clearTranscript();
            }, 2000);
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
      
      const studentScorePattern = /^(.+?)\s+(\d+(?:\.\d+)?)$/;
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
        processBatchEntry(cleanedName, score.trim());
        
        // 🔥 Clear immediately
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
    try {
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
            setAvailableSheets(sheetsListResponse.data.sheets);
            
            // Set the first sheet as current by default
            const firstSheet = sheetsListResponse.data.sheets[0];
            setCurrentSheet(firstSheet);
            
            // Load data from the first sheet
            await loadSheetData(response.data.google_sheet_id, firstSheet.sheet_name);
            
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

  const loadSheetData = async (sheetId, sheetName) => {
    try {
      console.log(`📊 LOAD SHEET: Loading data from sheet: "${sheetName}"`);
      
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
        }
        
        console.log(`✅ LOAD SHEET: Sheet "${sheetName}" data loaded successfully!`);
        toast.success(`Switched to sheet: ${sheetName}`);
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
    // Create hidden file input for scores
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.style.display = 'none';
    
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (file) {
        await processScoresImportFile(file);
      }
    };
    
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  const processScoresImportFile = async (file) => {
    if (!classRecord?.google_sheet_id) {
      toast.error('No Google Sheet connected');
      return;
    }

    try {
      setImportProgress({ status: 'reading', message: 'Reading Excel file...' });
      
      // Read Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      if (jsonData.length < 2) {
        throw new Error('Excel file must have at least a header row and one data row');
      }
      
      setImportProgress({ status: 'parsing', message: 'Parsing columns and scores...' });
      
      // Parse headers and data
      const headers = jsonData[0].map(h => String(h || '').trim());
      const dataRows = jsonData.slice(1);
      
      // Separate student info columns from score columns
      const studentColumns = ['NO.', 'NO', 'LASTNAME', 'LAST NAME', 'FIRSTNAME', 'FIRST NAME', 'STUDENT ID'];
      const scoreColumns = headers.filter(header => 
        !studentColumns.some(sc => header.toUpperCase().includes(sc.toUpperCase()))
      );
      
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
      
      for (const scoreColumn of scoreColumns) {
        const columnIndex = headers.indexOf(scoreColumn);
        columnData[scoreColumn] = {};
        
        for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const lastName = String(row[lastNameIndex] || '').trim();
        const firstName = String(row[firstNameIndex] || '').trim();
        const score = String(row[columnIndex] || '').trim();
        
        if (lastName && firstName && score) {
          const studentKey1 = `${firstName} ${lastName}`;  // "Zachary Banks"
          const studentKey2 = `${lastName}, ${firstName}`; // "Banks, Zachary" 
          const studentKey3 = `${lastName} ${firstName}`;  // "Banks Zachary"
          
          // Use the first format as primary, but log all for debugging
          const studentKey = studentKey1;
          
          columnData[scoreColumn][studentKey] = score;
          
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
        columns: scoreColumns,
        columnData,
        students,
        totalDataPoints: Object.values(columnData).reduce((sum, scores) => sum + Object.keys(scores).length, 0)
      };
      
      setImportProgress({ status: 'analyzing', message: 'Analyzing column mapping options...' });
      
      // Analyze columns for mapping
      const analysisResponse = await classRecordService.analyzeColumnsForMappingEnhanced(
        classRecord.google_sheet_id,
        scoreColumns,
        classRecord.id, // 🔥 NEW: Pass class record ID for history tracking
        currentSheet?.sheet_name
      );
      
      if (!analysisResponse.data?.success) {
        throw new Error(analysisResponse.data?.error || 'Failed to analyze columns');
      }
      
      setPendingImportData(importData);
      setColumnAnalysis(analysisResponse.data);
      setShowColumnImportModal(true);
      setImportProgress(null);
      
    } catch (error) {
      console.error('Scores import error:', error);
      toast.error(`Import failed: ${error.message}`);
      setImportProgress(null);
    }
  };

  const handleConfirmColumnMapping = async (mappings) => {
    try {
      setImportProgress({ status: 'importing', message: 'Importing column data and renaming headers...' });
      
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
      
      const { results, summary } = response.data;
      const sheetInfo = currentSheet ? ` in ${currentSheet.sheet_name}` : '';
      
      toast.success(`✅ ${summary}${sheetInfo}`);
      if (voiceEnabled) {
        speakText(`Column import completed. ${summary}${sheetInfo}`);
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
      toast.success(`🗑️ Student "${deletedStudent.full_name}" deleted successfully!`);
      
      if (voiceEnabled) {
        speakText(`Student ${deletedStudent.full_name} has been deleted successfully.`);
      }

      // 🔥 CRITICAL: Add delay before refreshing data
      setTimeout(async () => {
        // Refresh the data with fresh fetch
        await loadSheetData(classRecord.google_sheet_id, currentSheet?.sheet_name);
        
        // 🔥 FORCE UPDATE: Clear any cached data
        setTableData([]);
        setHeaders([]);
        
        // Load fresh data again
        setTimeout(async () => {
          await loadSheetData(classRecord.google_sheet_id, currentSheet?.sheet_name);
        }, 500);
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
      const sheetRow = rowIndex + 4; // +3 for headers, +1 for 1-based indexing
      
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
    toast.loading('🔄 Refreshing data...', { id: 'sort-progress' });
    
    // 🔥 DISMISS LOADING TOAST
    toast.dismiss('sort-progress');
    
    toast.success(`✅ Students sorted by ${sortType} successfully! (${totalUpdated} cells updated, formulas preserved)`);
    
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
    
    // Get fresh sheet data
    const sheetsResponse = await getSheetDataCached();
    
    if (!sheetsResponse.data?.success) {
      toast.error('Could not load sheet data');
      return;
    }
    
    const { headers, tableData } = sheetsResponse.data;
    
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
    await updateStudentGradeByPosition(studentRowIndex, targetColumnIndex, data.value);
    
    toast.success(`✅ Updated ${studentName} (ID: ${data.studentId}) - ${data.column}: ${data.value}`);
    
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
            
            toast.success(`✅ ${data.column} max score updated to ${data.maxScore} in ${sheetUsed}`);
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
                
                toast.success(`✅ Updated ${results.updated_columns} columns to max score ${data.maxScore}: ${columnList}`);
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
    toast.success(`✅ Updated ${targetColumn} to ${data.score} for ${successCount} students${sheetInfo}`);
    
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
    
    // 🔥 STEP 2: Find and update students
    const updatedData = [...tableData];
    let updatedCount = 0;
    const updates = [];
    
    students.forEach(({ name, score }) => {
      const studentIndex = findStudentIndex(name);
      if (studentIndex !== -1) {
        updatedData[studentIndex][foundColumn] = score;
        updates.push({
          row: studentIndex + 3, // +3 for header rows
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
        toast.success(`✅ Updated ${updatedCount} students in ${foundColumn}`);
        
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
    
    // 🔥 STEP 2: Validate rows
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
        console.log(`✅ Updated row ${i + 1}: ${updatedData[i]['FIRST NAME']} ${updatedData[i]['LASTNAME']} = ${score}`);
      }
    }
    
    // 🔥 STEP 4: Update local state IMMEDIATELY (so user sees changes)
    setTableData(updatedData);
    
    // 🔥 STEP 5: Show success feedback IMMEDIATELY
    toast.success(`✅ Updated ${updatedCount} students in ${foundColumn} (rows ${startRow + 1}-${endRow + 1}) with score ${score}`);
    
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
  // Create hidden file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls,.csv';
  input.style.display = 'none';
  
  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      await processImportFile(file);
    }
  };
  
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
};

const processImportFile = async (file) => {
  if (!classRecord?.google_sheet_id) {
    toast.error('No Google Sheet connected');
    return;
  }

  try {
    setImportProgress({ status: 'reading', message: 'Reading Excel file...' });
    
    // Read Excel file
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    
    if (jsonData.length < 2) {
      throw new Error('Excel file must have at least a header row and one data row');
    }
    
    setImportProgress({ status: 'parsing', message: 'Parsing student data...' });
    
    // Parse headers and find columns
    const headers = jsonData[0].map(h => String(h || '').trim());
    const students = [];
    
    // 🔥 ENHANCED: Smart column detection including Student ID
    const lastNameIndex = findColumnIndex(headers, ['last name', 'lastname', 'surname', 'family name']);
    const firstNameIndex = findColumnIndex(headers, ['first name', 'firstname', 'given name']);
    const studentIdIndex = findColumnIndex(headers, ['student id', 'studentid', 'id', 'student_id', 'student number']);  // 🔥 NEW
    
    console.log('🔍 DEBUG: Column detection:');
    console.log(`   Last Name: index ${lastNameIndex} (${headers[lastNameIndex]})`);
    console.log(`   First Name: index ${firstNameIndex} (${headers[firstNameIndex]})`);
    console.log(`   Student ID: index ${studentIdIndex} (${studentIdIndex >= 0 ? headers[studentIdIndex] : 'Not found'})`);
    
    if (lastNameIndex === -1 || firstNameIndex === -1) {
      throw new Error('Could not find "Last Name" and "First Name" columns in the Excel file');
    }
    
    // Extract student data (skip header row)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const lastName = String(row[lastNameIndex] || '').trim();
      const firstName = String(row[firstNameIndex] || '').trim();
      const studentId = studentIdIndex >= 0 ? String(row[studentIdIndex] || '').trim() : '';  // 🔥 NEW
      
      if (lastName && firstName) {
        const student = {
          LASTNAME: lastName,
          'FIRST NAME': firstName,
          originalRow: i + 1
        };
        
        // 🔥 NEW: Include Student ID if it exists
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
    
    setImportProgress({ status: 'checking', message: 'Checking for duplicates...' });
    
    // Check for conflicts with existing students
    await checkImportConflicts(students);
    
  } catch (error) {
    console.error('Import error:', error);
    toast.error(`Import failed: ${error.message}`);
    setImportProgress(null);
  }
};

const findColumnIndex = (headers, possibleNames) => {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => 
      h.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(h.toLowerCase())
    );
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
      message: `Found ${preview.conflictCount} conflicts, ${preview.newCount} new students` 
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
    setImportProgress({ status: 'importing', message: 'Adding students to Google Sheets...' });
    
    const response = await classRecordService.importStudentsExecute(
      classRecord.google_sheet_id,
      newStudents,
      resolvedConflicts,
      currentSheet?.sheet_name
    );
    
    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Import failed');
    }
    
    const { results, summary } = response.data;
    const sheetInfo = currentSheet ? ` in ${currentSheet.sheet_name}` : '';
    
    toast.success(`✅ ${summary}${sheetInfo}`);
    if (voiceEnabled) {
      speakText(`Import completed. ${summary}${sheetInfo}`);
    }
    
    // Clean up
    setImportProgress(null);
    setShowImportModal(false);
    setImportConflicts([]);
    
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
    // 🔧 ENHANCED: Handle multiple field name formats
    const studentData = {};
    
    // Last Name mapping (handle all possible variations)
    const lastName = data['Last Name'] || data['LASTNAME'] || data.lastName || data['lastname'];
    if (lastName) {
      studentData['LASTNAME'] = lastName;
    }
    
    // First Name mapping (handle all possible variations)
    const firstName = data['First Name'] || data['FIRST NAME'] || data.firstName || data['firstname'];
    if (firstName) {
      studentData['FIRST NAME'] = firstName;
    }
    
    // Student ID mapping (handle all possible variations)
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
    
    // 🔥 NEW: Instead of adding immediately, show confirmation modal
    setStudentToConfirm({
      lastName: studentData['LASTNAME'] || '',
      firstName: studentData['FIRST NAME'] || '',
      studentId: studentData['STUDENT ID'] || '',
      isVisible: true
    });
    
    // 🎯 Speak confirmation request
    if (voiceEnabled) {
      const nameToSpeak = `${studentData['FIRST NAME'] || ''} ${studentData['LASTNAME'] || ''}`.trim();
      speakText(`I heard ${nameToSpeak}. Please confirm if this is correct.`);
    }
    
  } catch (error) {
    console.error('❌ Add student error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      originalData: data
    });
    
    toast.error(`Failed to parse student data: ${error.message}`);
    if (voiceEnabled) {
      speakText('Failed to understand the student information. Please try again.');
    }
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
      const studentName = `${finalData.firstName} ${finalData.lastName}`.trim();
      const sheetUsed = response.data.sheet_name || 'unknown';
      
      toast.success(`✅ Student added to ${sheetUsed} sheet: ${studentName} (Row ${response.data.rowNumber})`);
      if (voiceEnabled) {
        speakText(`Successfully added student ${studentName} as number ${response.data.rowNumber} to ${sheetUsed} sheet`);
      }
      
      // Close the modal
      setStudentToConfirm({
        lastName: '',
        firstName: '',
        studentId: '',
        isVisible: false
      });
      
    } else {
      throw new Error(response.data?.error || 'Failed to add student');
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
                
                toast.success(`✅ ${studentName} - Student ID: ${data.studentId}`);
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
            toast.success(`✅ Auto-numbered ${response.data.count} students`);
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
          await performScoreUpdate(correctRowIndex, data, studentName, convertedTableData);
          
      } else {
          toast.error(`Student "${data.searchName}" not found`);
          if (voiceEnabled) {
              speakText(`Student ${data.searchName} not found`);
          }
      }
  } catch (error) {
      console.error('Voice command error:', error);
      toast.error('Failed to process voice command');
      if (voiceEnabled) {
          speakText('Failed to process the command. Please try again.');
      }
  }
};

  const performScoreUpdate = async (rowIndex, data, studentName, convertedTableData) => {
    try {
        // 🔥 NEW: Validate max score again, even during override
        const validation = validateScore(data.column, data.value);
        if (!validation.valid) {
          toast.error(`❌ ${validation.error}`);
          if (voiceEnabled) {
            speakText(validation.error);
          }
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

        if (response.data?.success) {
            addRecentStudent(studentName);
            
            toast.success(`✅ ${studentName} - ${data.column}: ${data.value}`);
            if (voiceEnabled) {
                speakText(`Updated ${data.column} to ${data.value} for ${studentName}`);
            }
        } else {
            throw new Error(response.data?.error || 'Failed to update cell');
        }
    } catch (updateError) {
        console.error('Update error:', updateError);
        toast.error(`Failed to update Google Sheets: ${updateError.message}`);
        if (voiceEnabled) {
            speakText('Failed to update the grade. Please try again.');
        }
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
            
            toast.success(`✅ ${selectedMatch.student} - ${data.column}: ${data.value}`);
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
    
    const { matches, command, convertedTableData } = duplicateModalData;
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
    
    // Check for existing score
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

    // Update the score
    await performScoreUpdate(correctRowIndex, command, studentName, convertedTableData);
};

const handleDuplicateModalClose = () => {
    setShowDuplicateModal(false);
    setDuplicateModalData(null);
};

   const handleVoiceCommand = (transcript) => {
  if (!transcript.trim()) return;

  console.log('Voice command received:', transcript);

  if (batchMode) {
      handleBatchVoiceCommand(transcript);
      return;
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
      alternatives: []
  });
  
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
    return;
  }

  // Handle "clear" command
  if (/\b(clear|reset|empty)\b/i.test(transcript)) {
    console.log('🔥 BATCH VOICE: Clearing entries');
    setBatchEntries([]);
    toast.success('Batch entries cleared');
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

    try {
      window.batchModeFinishing = true;
      setIsProcessingBatch(true);
      
      // Process each valid entry
      for (const entry of validEntries) {
        // 🔥 NEW: Use sheet-specific update if we have a current sheet
        if (currentSheet) {
          await classRecordService.updateGoogleSheetsCellSpecific(
            classRecord.google_sheet_id,
            entry.rowIndex,
            currentBatchColumn,
            entry.score,
            currentSheet.sheet_name
          );
        } else {
          // Fall back to original method
          await classRecordService.updateGoogleSheetsCell(
            classRecord.google_sheet_id,
            entry.rowIndex,
            currentBatchColumn,
            entry.score
          );
        }
      }

      const sheetInfo = currentSheet ? ` in ${currentSheet.sheet_name}` : '';
      toast.success(`✅ Batch saved: ${validEntries.length} students updated${sheetInfo}`);
      if (voiceEnabled) {
        speakText(`Batch complete. ${validEntries.length} students updated${sheetInfo}.`);
      }

      // Reset batch mode
      console.log('🔥 EXECUTE BATCH: Setting batchMode to false after completion');
      window.batchModeActive = false;
      setBatchModeProtected(false, 'executeBatchEntries');
      setShowBatchModal(false);
      setBatchEntries([]);
      setCurrentBatchColumn('');
      
    } catch (error) {
      console.error('Batch execution error:', error);
      toast.error('Failed to save batch entries');
    } finally {
      setIsProcessingBatch(false);
    }
  };

const setBatchModeProtected = useCallback((value, reason = 'unknown') => {
  console.log(`🔥 SET BATCH MODE: ${value} - Reason: ${reason}`);
  console.log('🔥 CALL STACK:', new Error().stack.split('\n').slice(0, 5));
  setBatchMode(value);
}, []);

const startBatchMode = () => {
  console.log('🔥 START BATCH: Setting batchMode to true');
  setBatchModeProtected(true, 'startBatchMode');
  setShowBatchModal(true);
  setBatchEntries([]);
  setCurrentBatchColumn('');
  
  window.batchModeActive = false; 
  window.batchModeFinishing = false;
  
  if (voiceEnabled) {
    speakText('Batch mode started. Please select a column.');
  }
};

const cancelBatchMode = () => {
  console.log('🔥 CANCEL BATCH: Setting batchMode to false');
  // 🔥 Stop auto-restart before closing
  window.batchModeActive = false;
  window.batchModeFinishing = true;
  
  setBatchModeProtected(false, 'cancelBatchMode');
  setShowBatchModal(false);
  setBatchEntries([]);
  setCurrentBatchColumn('');

  setBatchSheetData(null);
  setProcessingEntries(new Set());
  
  if (isListening) {
    stopListening();
  }
  
  if (voiceEnabled) {
    speakText('Batch mode cancelled');
  }
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
    const message = `✅ Excel exported: ${filename} (${sheetsResponse.data.headers.length} columns with merged category headers)`;
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
    
    toast.success(`✅ CSV file exported: ${filename}`);
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
    
    toast.success(`✅ PDF exported: ${filename} (${pageCount} pages, ${allHeaders.length} columns with Total Score & Term Grade)`);
    
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

    if (isListening) {
      stopListening();
      stopSpeaking();
    } else {
      startListening();
    }
  };
  
  const toggleVoiceFeedback = () => {
    setVoiceEnabled(!voiceEnabled);
    if (!voiceEnabled) {
      speakText('Voice feedback enabled');
    } else {
      stopSpeaking();
      toast.success('Voice feedback disabled');
    }
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
          <div className="px-6 py-3">
            <div className="flex items-center justify-between">
              {/* Left Section - Navigation & Title */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/class-records')}
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="text-sm font-medium">Back to Records</span>
                </button>
                <div className="h-5 w-px bg-slate-300"></div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">{classRecord?.name}</h1>
                  <div className="flex items-center space-x-3 text-sm text-slate-500">
                    <span>{classRecord?.semester}</span>
                    <span>{classRecord?.teacher_name}</span>

                    {lastSaved && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600">
                          Last saved {new Date(lastSaved).toLocaleTimeString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Section */}
              <div className="flex items-center space-x-3">
                {/* Save Button */}
                <div className="text-sm text-slate-600">
                  Data is saved automatically in Google Sheets
                </div>


                {/* 🔥 NEW: Sheet Selector Dropdown */}
              {availableSheets.length > 1 && (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setShowSheetSelector(!showSheetSelector)}
                    disabled={loadingSheets}
                    className="flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-medium hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-200 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="max-w-24 truncate">
                      {loadingSheets ? 'Loading...' : (currentSheet?.sheet_name || 'Select Sheet')}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSheetSelector ? 'rotate-180' : ''}`} />
                  </button>
                  
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
                          className={`flex items-center space-x-3 px-4 py-2 text-sm w-full text-left transition-colors disabled:opacity-50 ${
                            currentSheet?.sheet_name === sheet.sheet_name
                              ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-500'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="w-6 h-6 bg-slate-100 rounded text-xs flex items-center justify-center font-medium">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{sheet.sheet_name}</div>
                            <div className="text-xs text-slate-500">
                              Sheet {index + 1}
                              {currentSheet?.sheet_name === sheet.sheet_name && (
                                <span className="ml-1 text-indigo-600">• Active</span>
                              )}
                            </div>
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
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                  {/* Export options */}
                  <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    Export Options
                  </div>
                  <button
                    onClick={() => {
                      handleExportToExcel();
                      closeAllDropdowns();
                    }}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span>Export to Excel (clean)</span>
                  </button>
                  <button
                    onClick={() => {
                      handleExportToPDF();
                      closeAllDropdowns();
                    }}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                  >
                    <Download className="w-4 h-4 text-red-600" />
                    <span>Export to PDF (clean)</span>
                  </button>

                  <button
                    onClick={() => {
                      handleExportToCSV();
                      closeAllDropdowns();
                    }}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                  >
                    <FileText className="w-4 h-4 text-green-600" />
                    <span>Export to CSV (clean)</span>
                  </button>
                  
                  <hr className="my-2 border-slate-200" />

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
                  
                  {/* Batch Mode & Auto-number options */}
                  <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    Grading Tools
                  </div>
                  
                  {/* 🔥 NEW: Batch Mode Button */}
                  <button
                    onClick={() => {
                      startBatchMode();
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

                  {/* Troubleshooting section */}
                  <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    Troubleshooting
                  </div>
                  
                  <button
                    onClick={() => {
                      fixSheetPermissions();
                      closeAllDropdowns();
                    }}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                  >
                    <span className="w-4 h-4 text-orange-600 text-center font-bold">🔧</span>
                    <span>Fix "View Only" Issue</span>
                  </button>
                </div>
              )}
              </div>

                                {/* Open in Google Sheets Button */}
                <a
                  href={classRecord.google_sheet_url || `https://docs.google.com/spreadsheets/d/${classRecord.google_sheet_id}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg font-medium hover:bg-green-100 transition-colors shadow-sm border border-green-200"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Open in Sheets</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Embedded Google Sheet */}
        <div className="flex-1 p-4">
          <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                className={`relative p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 ${
                  isListening
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

        {/* 🔥 NEW: Real-time Transcript Display */}
        {(isListening || transcript.trim()) && (
          <div className="fixed bottom-6 left-6 z-50 max-w-md">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden backdrop-blur-sm">
              {/* Header */}
              <div className={`px-4 py-3 flex items-center justify-between ${
                isListening 
                  ? 'bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200' 
                  : 'bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isListening ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    isListening ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {isListening ? '🎙️ Listening...' : '✅ Voice Input'}
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
                    if (isListening) {
                      stopListening();
                    }
                    clearTranscript();
                  }}
                  className={`p-1 rounded-full transition-colors ${
                    isListening 
                      ? 'hover:bg-red-200 text-red-600' 
                      : 'hover:bg-green-200 text-green-600'
                  }`}
                  title="Clear transcript"
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
                        <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing command...</span>
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
                          💡 Try: "Maria Quiz 1 eighty-five" or "John Lab 2 ninety"
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
                      {isListening ? 'Speak now...' : 'Start speaking to see transcript'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {batchMode 
                        ? 'Batch mode active - Say student names and scores'
                        : 'Voice commands will appear here'
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

         <ImportProgressIndicator 
          importProgress={importProgress}
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