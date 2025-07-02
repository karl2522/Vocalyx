import { AlertCircle, ArrowLeft, ChevronDown, Download, Edit2, FileSpreadsheet, HelpCircle, Mic, MicOff, MoreVertical, Plus, RotateCcw, RotateCw, Save, Target, Upload, Users, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { classRecordService } from '../services/api';
import { speakText, stopSpeaking } from '../utils/speechSynthesis';
import useVoiceRecognition from '../utils/useVoiceRecognition';
import { findEmptyRow, findStudentRow, findStudentRowSmart, parseVoiceCommand } from '../utils/voicecommandParser';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ClassRecordExcel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classRecord, setClassRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [headers, setHeaders] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);

   const [batchMode, setBatchMode] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [currentBatchColumn, setCurrentBatchColumn] = useState('');
    const [batchEntries, setBatchEntries] = useState([]);
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);

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
          const [, studentName, score] = match;
          console.log('🔥 REAL-TIME: Calling processBatchEntry for:', studentName, score);
          
          // 🔥 SIMPLIFIED: Just process it once
          processBatchEntry(studentName.trim(), score.trim());
          
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
      
      // 🔥 Load Google Sheets data for voice commands only
      if (response.data?.google_sheet_id) {
        console.log("📊 Fetching Google Sheets data for voice commands...");
        
        try {
          const sheetsResponse = await classRecordService.getGoogleSheetsDataServiceAccount(response.data.google_sheet_id);
          console.log("📊 Google Sheets API response:", sheetsResponse.data);
          
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
              
              buildContextDictionary(convertedTableData, sheetsResponse.data.headers);
            }
            
            console.log("✅ Voice command data loaded successfully!");
          } else {
            console.log("⚠️ No Google Sheets data available for voice commands");
          }
        } catch (sheetsError) {
          console.error("❌ Failed to load Google Sheets data:", sheetsError);
        }
      }
      
    } catch (error) {
      console.error('Error fetching class record:', error);
      toast.error('Failed to load class record');
      navigate('/dashboard/class-records/view');
    } finally {
      setLoading(false);
    }
  };

  const startVoiceTraining = () => {
    toast.success('🎯 Voice training started! Speak the phrases clearly.');
  };

 const executeCommand = (command) => {
    switch (command.type) {
      case 'SMART_NAME_GRADE_ENTRY':
        handleSmartNameGradeEntryVoice(command.data);
        break;
      case 'ADD_STUDENT':
        handleAddStudentVoice(command.data);
        break;
      case 'EXPORT_EXCEL':
        handleExportToExcel();
        break;
      case 'EXPORT_PDF':
        handleExportToPDF();
        break;
      case 'UNDO_COMMAND':
        toast('🔄 Undo functionality not available in Google Sheets mode');
        break;
      case 'REDO_COMMAND':
        toast('🔄 Redo functionality not available in Google Sheets mode');
        break;
      default:
        toast.error(`🎙️ Command not recognized: "${command.data.originalText}"`);
        if (voiceEnabled) {
          speakText('Sorry, I didn\'t understand that command. Please try again.');
        }
    }
};

const handleAddStudentVoice = async (data) => {
    console.log('🎯 Adding student:', data);
    
    if (!classRecord?.google_sheet_id) {
        toast.error('No Google Sheet connected');
        return;
    }

    try {
        // Prepare student data for Google Sheets
        const studentData = {};
        
        // 🔥 ADD AUTO-NUMBERING - we'll let the backend handle this
        if (data['Last Name'] || data.lastName) {
            studentData['LASTNAME'] = data['Last Name'] || data.lastName;
        }
        if (data['First Name'] || data.firstName) {
            studentData['FIRST NAME'] = data['First Name'] || data.firstName;
        }
        if (data['Student ID'] || data.studentId) {
            studentData['STUDENT ID'] = data['Student ID'] || data.studentId;
        }

        console.log('🔧 Mapped student data for sheets:', studentData);
        
        // 🔥 NEW: Call the API with auto-numbering flag
        const response = await classRecordService.addStudentToGoogleSheetsWithAutoNumber(
            classRecord.google_sheet_id,
            studentData
        );

        if (response.data?.success) {
            const studentName = `${studentData['FIRST NAME'] || ''} ${studentData['LASTNAME'] || ''}`.trim();
            
            toast.success(`✅ Student added: ${studentName} (Row ${response.data.rowNumber})`);
            if (voiceEnabled) {
                speakText(`Successfully added student ${studentName} as number ${response.data.rowNumber}`);
            }
            
        } else {
            throw new Error(response.data?.error || 'Failed to add student');
        }
    } catch (error) {
        console.error('Add student error:', error);
        toast.error(`Failed to add student: ${error.message}`);
        if (voiceEnabled) {
            speakText('Failed to add the student. Please try again.');
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
    
    if (!classRecord?.google_sheet_id) {
        toast.error('No Google Sheet connected');
        return;
    }

    try {
        // Get fresh data for student search
        const sheetsResponse = await classRecordService.getGoogleSheetsDataServiceAccount(classRecord.google_sheet_id);
        
        if (!sheetsResponse.data?.success || !sheetsResponse.data.tableData?.length) {
            toast.error('Could not load student data');
            return;
        }

        // Convert array data to objects for search
        const convertedTableData = sheetsResponse.data.tableData.map(row => {
            const rowObject = {};
            sheetsResponse.data.headers.forEach((header, index) => {
                rowObject[header] = row[index] || '';
            });
            return rowObject;
        });

        const result = findStudentRowSmart(convertedTableData, data.searchName, recentStudents, data.column);
        
        console.log('🔍 Search result:', result);

        // 🔥 FIX: Check for needsConfirmation FIRST, then bestMatch
        if (result.needsConfirmation && result.possibleMatches.length > 1) {
            // Handle duplicates that need user confirmation
            setDuplicateOptions({
                matches: result.possibleMatches,
                command: data,
                searchName: data.searchName,
                convertedTableData // Store for later use
            });
            
            toast(
                `🤔 Multiple students found named "${data.searchName}". Say "option 1", "option 2", etc. to choose.`,
                { 
                    duration: 10000,
                    icon: '🤔',
                    style: {
                        background: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #f59e0b'
                    }
                }
            );
            
            if (voiceEnabled) {
                const optionsText = result.possibleMatches
                    .map((match, index) => `Option ${index + 1}: ${match.student}`)
                    .slice(0, 3)
                    .join('. ');
                speakText(`Found multiple students named ${data.searchName}. ${optionsText}. Say option 1, option 2, etc. to choose.`);
            }
        } else if (result.bestMatch !== -1) {
            // 🔥 FIX: Use bestMatch regardless of hasDuplicates flag
            try {
                const response = await classRecordService.updateGoogleSheetsCell(
                    classRecord.google_sheet_id,
                    result.bestMatch,
                    data.column,
                    data.value
                );

                if (response.data?.success) {
                    const student = convertedTableData[result.bestMatch];
                    const studentName = `${student['FIRST NAME']} ${student['LASTNAME']}`;
                    
                    // Add to recent students
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
        } else {
            // Only show "not found" if no bestMatch AND no confirmation needed
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



  const handleVoiceCommand = (transcript) => {
    if (!transcript.trim()) return;

    console.log('Voice command received:', transcript);

    if (batchMode) {
        handleBatchVoiceCommand(transcript);
        return;
    }

    const command = parseVoiceCommand(transcript, headers, [], {
        recentStudents,
        commandHistory: [],
        alternatives: []
    });
    
    console.log('Parsed command:', command);
    console.log('🔥 PARSED COMMAND TYPE:', command.type); 
    console.log('🔥 PARSED COMMAND DATA:', command.data);
    
    // Handle duplicate selection
    if (command.type === 'SELECT_DUPLICATE' && duplicateOptions) {
        handleDuplicateSelection(command.data.selectedOption);
        return;
    }
    
    // Execute command directly
    executeCommand(command);
    
    // Add to history
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
    const [, studentName, score] = match;
    console.log('🔥 BATCH VOICE: Processing batch entry:', studentName, score);
    await processBatchEntry(studentName.trim(), score.trim());
  } else {
    console.log('🔥 BATCH VOICE: Pattern not matched:', transcript);
  }
};

const processBatchEntry = async (studentName, score) => {
  console.log('🔥 PROCESS BATCH: 🚀 Starting processBatchEntry');
  console.log('🔥 PROCESS BATCH: studentName:', studentName);
  console.log('🔥 PROCESS BATCH: score:', score);
  console.log('🔥 PROCESS BATCH: currentBatchColumn:', currentBatchColumn);
  
  if (!currentBatchColumn) {
    console.log('🔥 PROCESS BATCH: ❌ No column selected');
    toast.error('Please select a column first');
    return;
  }

  // 🔥 REMOVE ALL DUPLICATE PREVENTION - LET IT PROCESS EVERYTHING
  try {
    console.log('🔥 PROCESS BATCH: 🔄 Setting isProcessingBatch to true');
    setIsProcessingBatch(true);
    
    console.log('🔥 PROCESS BATCH: 📊 Fetching sheet data...');
    const sheetsResponse = await classRecordService.getGoogleSheetsDataServiceAccount(classRecord.google_sheet_id);
    
    if (!sheetsResponse.data?.success) {
      throw new Error('Could not load student data');
    }

    console.log('🔥 PROCESS BATCH: ✅ Sheet data loaded');
    const convertedTableData = sheetsResponse.data.tableData.map(row => {
      const rowObject = {};
      sheetsResponse.data.headers.forEach((header, index) => {
        rowObject[header] = row[index] || '';
      });
      return rowObject;
    });

    console.log('🔥 PROCESS BATCH: 🔍 Searching for student...');
    const result = findStudentRowSmart(convertedTableData, studentName, recentStudents, currentBatchColumn);
    console.log('🔥 PROCESS BATCH: 🔍 Search result:', result);
    
    const entryId = `${studentName}_${Date.now()}`;
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
        confidence: result.confidence
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
        confidence: 'none'
      };
      console.log('🔥 PROCESS BATCH: ❌ Student not found, adding to UI');
    }

    console.log('🔥 PROCESS BATCH: 📝 Adding entry to batch list:', newEntry);
    
    // 🔥 SIMPLIFIED: Just add to the list - React will handle duplicates
    setBatchEntries(prev => {
      console.log('🔥 SET BATCH ENTRIES: Current entries:', prev.length);
      console.log('🔥 SET BATCH ENTRIES: Adding entry:', newEntry.studentName);
      
      // 🔥 SIMPLE: Filter out any existing entry with same name, then add new one
      const filtered = prev.filter(entry => 
        entry.originalInput.toLowerCase() !== studentName.toLowerCase()
      );
      
      const newEntries = [...filtered, newEntry];
      console.log('🔥 SET BATCH ENTRIES: New total entries:', newEntries.length);
      
      return newEntries;
    });

  } catch (error) {
    console.error('🔥 PROCESS BATCH: ❌ Error:', error);
    toast.error(`Error processing ${studentName}: ${error.message}`);
  } finally {
    console.log('🔥 PROCESS BATCH: 🏁 Setting isProcessingBatch to false');
    setIsProcessingBatch(false);
  }
};

const executeBatchEntries = async () => {
  const validEntries = batchEntries.filter(entry => entry.status === 'found');
  
  if (validEntries.length === 0) {
    toast.error('No valid entries to save');
    return;
  }

  try {
    // 🔥 Stop continuous listening
    window.batchModeFinishing = true;
    
    setIsProcessingBatch(true);
    
    // Process each valid entry
    for (const entry of validEntries) {
      await classRecordService.updateGoogleSheetsCell(
        classRecord.google_sheet_id,
        entry.rowIndex,
        currentBatchColumn,
        entry.score
      );
    }

    toast.success(`✅ Batch saved: ${validEntries.length} students updated`);
    if (voiceEnabled) {
      speakText(`Batch complete. ${validEntries.length} students updated.`);
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

    // Get fresh data from Google Sheets
    const sheetsResponse = await classRecordService.getGoogleSheetsDataServiceAccount(classRecord.google_sheet_id);
    
    if (!sheetsResponse.data?.success || !sheetsResponse.data.tableData?.length) {
      toast.error('Could not load data for export');
      return;
    }

    // Prepare data for Excel
    const worksheetData = [];
    
    // Add headers
    worksheetData.push(sheetsResponse.data.headers);
    
    // Add student data
    sheetsResponse.data.tableData.forEach(row => {
      worksheetData.push(row);
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Style the headers
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } },
      alignment: { horizontal: "center" }
    };

    // Apply header styling
    for (let col = 0; col < sheetsResponse.data.headers.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellRef]) worksheet[cellRef] = {};
      worksheet[cellRef].s = headerStyle;
    }

    // Set column widths
    const columnWidths = sheetsResponse.data.headers.map(() => ({ width: 15 }));
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, classRecord.name || 'Class Record');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${classRecord.name || 'ClassRecord'}_${timestamp}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, filename);
    
    toast.success(`✅ Excel file exported: ${filename}`);
    if (voiceEnabled) {
      speakText('Excel file has been exported successfully');
    }

  } catch (error) {
    console.error('Excel export error:', error);
    toast.error('Failed to export Excel file');
    if (voiceEnabled) {
      speakText('Failed to export Excel file');
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

    // Get fresh data from Google Sheets
    const sheetsResponse = await classRecordService.getGoogleSheetsDataServiceAccount(classRecord.google_sheet_id);
    
    if (!sheetsResponse.data?.success || !sheetsResponse.data.tableData?.length) {
      toast.error('Could not load data for export');
      return;
    }

    // Create PDF document
    const doc = new jsPDF('landscape');

    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(classRecord.name || 'Class Record', 15, 20);

    // Add metadata
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Semester: ${classRecord.semester || 'N/A'}`, 15, 30);
    doc.text(`Teacher: ${classRecord.teacher_name || 'N/A'}`, 15, 35);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 40);

    // Prepare table data
    const tableHeaders = sheetsResponse.data.headers;
    const tableData = sheetsResponse.data.tableData;

    // 🔥 Use autoTable function directly (not doc.autoTable)
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 50,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        1: { cellWidth: 25 }, // LASTNAME
        2: { cellWidth: 25 }, // FIRST NAME
      },
      margin: { top: 50, right: 10, bottom: 20, left: 10 },
      theme: 'striped'
    });

    // Add footer
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

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${classRecord.name || 'ClassRecord'}_${timestamp}.pdf`;

    // Save PDF
    doc.save(filename);
    
    toast.success(`✅ PDF file exported: ${filename}`);
    if (voiceEnabled) {
      speakText('PDF file has been exported successfully');
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
                  onClick={() => navigate('/dashboard/class-records/view')}
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
                    <span>•</span>
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

                {/* Voice Controls */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleDropdown('voice')}
                    className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors shadow-sm"
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span>Voice</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${dropdowns.voice ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {dropdowns.voice && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                      <button
                        onClick={() => {
                          handleVoiceRecord();
                          closeAllDropdowns();
                        }}
                        className={`flex items-center space-x-3 px-4 py-2 text-sm w-full text-left ${
                          isListening 
                            ? 'text-red-700 bg-red-50 hover:bg-red-100' 
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        <span>{isListening ? 'Stop Recording' : 'Start Recording'}</span>
                      </button>
                      <button
                        onClick={() => {
                          toggleVoiceFeedback();
                          closeAllDropdowns();
                        }}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                      >
                        {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        <span>{voiceEnabled ? 'Disable Voice' : 'Enable Voice'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowVoiceGuide(true);
                          closeAllDropdowns();
                        }}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                      >
                        <HelpCircle className="w-4 h-4" />
                        <span>Voice Guide</span>
                      </button>
                    </div>
                  )}
                </div>
                {/* 🔥 ADD THE TOOLS DROPDOWN HERE! */}
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
                  
                  <hr className="my-2 border-slate-200" />
                  
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
        <div className="flex-1 p-0">
          <div className="h-full bg-white overflow-hidden">
            {/* Keep the iframe - it's working! */}
            <iframe
              src={`https://docs.google.com/spreadsheets/d/${classRecord.google_sheet_id}/edit?usp=sharing&widget=true&headers=false&rm=embedded`}
              width="100%"
              height="100%"
              frameBorder="0"
              className="w-full h-full border-0"
              title={`${classRecord.name} - Class Record Sheet`}
              allowFullScreen
              style={{
                border: 'none',
                outline: 'none'
              }}
            />
          </div>
        </div>

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

        {/* 📖 VOICE GUIDE MODAL - Embedded View */}
        {showVoiceGuide && (
          <div 
            className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowVoiceGuide(false)}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mic className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Voice Commands Guide</h2>
                    <p className="text-sm text-slate-600">Learn how to use voice commands efficiently</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVoiceGuide(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
                {/* Quick Start */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Quick Start</span>
                  </h3>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-blue-900 mb-2">🎯 Basic Pattern</div>
                        <div className="text-blue-700 space-y-1">
                          <div>"[Student Name] [Column] [Score]"</div>
                          <div className="text-xs text-blue-600">Example: "Maria Quiz 1 eighty-five"</div>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-blue-900 mb-2">🔧 Controls</div>
                        <div className="text-blue-700 space-y-1">
                          <div>"undo" - Undo last action</div>
                          <div>"cancel" - Cancel current operation</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Command Types */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Single Entry */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <span className="text-emerald-600 font-bold text-sm">1</span>
                      </div>
                      <h4 className="font-semibold text-slate-900">Single Entry</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="font-medium text-slate-700 mb-1">Examples:</div>
                        <div className="bg-slate-50 rounded p-2 space-y-1 text-slate-600">
                          <div>"Maria Quiz 3 twenty"</div>
                          <div>"John Lab 2 eighty-five"</div>
                          <div>"Sarah Midterm seventy-five"</div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        Perfect for entering individual student grades quickly
                      </div>
                    </div>
                  </div>

                  {/* Batch List */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">N</span>
                      </div>
                      <h4 className="font-semibold text-slate-900">Batch List</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="font-medium text-slate-700 mb-1">Examples:</div>
                        <div className="bg-slate-50 rounded p-2 space-y-1 text-slate-600">
                          <div>"Quiz 1: John 85, Maria 92"</div>
                          <div>"Lab 2: Alice 90, Bob 85"</div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        Enter multiple students for the same assignment at once
                      </div>
                    </div>
                  </div>

                  {/* Batch Range */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-sm">∞</span>
                      </div>
                      <h4 className="font-semibold text-slate-900">Batch Range</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="font-medium text-slate-700 mb-1">Examples:</div>
                        <div className="bg-slate-50 rounded p-2 space-y-1 text-slate-600">
                          <div>"Midterm: Row 1 through 5, all score 90"</div>
                          <div>"Quiz 2: Everyone present gets 85"</div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        Assign the same grade to multiple students in a range
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span>Pro Tips</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <div className="font-medium text-amber-900 mb-2">💡 Accuracy Tips</div>
                      <ul className="text-sm text-amber-800 space-y-1">
                        <li>• Speak clearly and at normal pace</li>
                        <li>• Use "twenty" instead of "20"</li>
                        <li>• Say "Quiz one" instead of "Quiz 1"</li>
                      </ul>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="font-medium text-green-900 mb-2">⚡ Efficiency Tips</div>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Use batch commands for repeated grades</li>
                        <li>• Train voice recognition for better results</li>
                        <li>• Check transcript display for accuracy</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
                <div className="text-sm text-slate-600">
                  Press the floating microphone button to start voice commands
                </div>
                <button
                  onClick={() => setShowVoiceGuide(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 NEW: Batch Mode Modal */}
        {showBatchModal && (
          <div 
            className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4"
            onMouseDown={(e) => {
              // 🔥 PREVENT closing when clicking background
              console.log('🔥 MODAL BACKGROUND: Click prevented');
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
              onMouseDown={(e) => {
                // 🔥 PREVENT event bubbling
                console.log('🔥 MODAL CONTENT: Click prevented from bubbling');
                e.stopPropagation();
              }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Batch Grading Mode</h2>
                    {currentBatchColumn ? (
                      <p className="text-sm text-slate-600">Column: <span className="font-medium text-purple-600">{currentBatchColumn}</span></p>
                    ) : (
                      <p className="text-sm text-slate-600">Select a column to start batch grading</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    console.log('🔥 CLOSE BUTTON: Clicked - calling cancelBatchMode');
                    e.preventDefault();
                    e.stopPropagation();
                    cancelBatchMode();
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="flex-1 overflow-hidden flex flex-col p-6">
                {!currentBatchColumn ? (
                  /* Column Selection */
                  <div className="text-center py-8">
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">Choose a Column</h3>
                      <p className="text-gray-600 mb-6">
                        Select which column you want to grade in batch mode
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {headers.filter(h => !['NO.', 'LASTNAME', 'FIRST NAME', 'STUDENT ID'].includes(h)).map(header => (
                        <button
                          key={header}
                            onClick={() => {
                            console.log('🔥 COLUMN SELECT: 🎯 Column selected:', header);
                            setCurrentBatchColumn(header);
                            window.batchModeActive = true;
                            window.batchModeFinishing = false;
                            console.log('🔥 COLUMN SELECT: 🚀 Set window.batchModeActive = true');
                            console.log('🔥 COLUMN SELECT: 🚀 Set window.batchModeFinishing = false');
                            toast.success(`Column set to: ${header}. Start speaking!`);
                            
                            // Start listening with a slight delay
                            setTimeout(() => {
                              console.log('🔥 COLUMN SELECT: 🎤 Checking if should start listening...');
                              console.log('🔥 COLUMN SELECT: isListening:', isListening);
                              if (!isListening) {
                                console.log('🔥 COLUMN SELECT: 🎤 Starting voice recognition...');
                                startListening(true);
                              } else {
                                console.log('🔥 COLUMN SELECT: 🎤 Already listening');
                              }
                            }, 800);
                          }}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-800 px-4 py-3 rounded-lg transition-colors border border-purple-200 font-medium"
                        >
                          {header}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Batch Entries Display */
                  <>
                    {/* Status Bar */}
                    <div className="bg-purple-50 rounded-lg p-4 mb-6 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                          <div>
                            <h3 className="font-medium text-purple-800">
                              {isListening ? '🎙️ Listening...' : '✅ Ready for voice input'}
                            </h3>
                            <p className="text-purple-600 text-sm">
                              Say: "Capuras 85" or "Maria 92" • Say "done" when finished
                            </p>
                          </div>
                          {/* 🔥 DEBUG: Manual restart button */}
                          <button
                            onClick={() => {
                              console.log('🔥 DEBUG: Manual restart clicked');
                              console.log('🔥 DEBUG: Current isListening:', isListening);
                              if (!isListening && window.batchModeActive) {
                                console.log('🔥 DEBUG: Starting voice recognition manually');
                                startListening(true);
                              }
                            }}
                            className="px-3 py-1 bg-purple-200 text-purple-800 rounded text-xs"
                          >
                            🔄 Restart Voice
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="text-purple-800 font-medium">
                            {batchEntries.filter(e => e.status === 'found').length} valid entries
                          </div>
                          <div className="text-purple-600 text-sm">
                            {batchEntries.filter(e => e.status === 'not_found').length} not found
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 rounded-lg p-2 mb-4 border border-yellow-200">
                      <div className="text-yellow-800 text-sm">
                        🐛 DEBUG: batchEntries.length = {batchEntries.length}
                        {batchEntries.length > 0 && (
                          <div className="mt-1">
                            Entries: {batchEntries.map(e => `${e.studentName}(${e.status})`).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Entries List */}
                    <div className="flex-1 overflow-auto">

                      <div className="text-xs text-gray-500 mb-2">
                        Debug: {batchEntries.length} entries total
                      </div>
                      {batchEntries.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Mic className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-lg mb-2">Start speaking to add entries</p>
                          <p className="text-sm">Example: "Capuras 85", "Maria 92"</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {batchEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className={`flex items-center justify-between rounded-lg p-4 border-2 transition-all ${
                                entry.status === 'found' 
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-red-50 border-red-200'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                {/* Status Icon */}
                                {entry.status === 'found' ? (
                                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm">✓</span>
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm">✗</span>
                                  </div>
                                )}
                                
                                {/* Student Info */}
                                <div>
                                  <div className="font-medium">
                                    {entry.studentName} - {entry.score}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {entry.status === 'found' ? (
                                      <>
                                        Found student
                                        {entry.hasExistingScore && (
                                          <span className="ml-2 text-amber-600">
                                            (was: {entry.existingValue})
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      `"${entry.originalInput}" not found in sheet`
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Remove Button */}
                              <button
                                onClick={() => setBatchEntries(prev => prev.filter(e => e.id !== entry.id))}
                                className="text-gray-400 hover:text-red-500 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setCurrentBatchColumn('')}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                        >
                          ← Change Column
                        </button>
                        <button
                          onClick={() => setBatchEntries([])}
                          disabled={batchEntries.length === 0}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                        >
                          Clear All
                        </button>
                      </div>
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={cancelBatchMode}
                          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={executeBatchEntries}
                          disabled={batchEntries.filter(e => e.status === 'found').length === 0 || isProcessingBatch}
                          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
                        >
                          {isProcessingBatch ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <span>Save {batchEntries.filter(e => e.status === 'found').length} Students</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">No Google Sheet Connected</h2>
        <p className="text-slate-600 mb-4">This class record needs a Google Sheet to function.</p>
        <button
          onClick={() => navigate('/dashboard/class-records/view')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to Records
        </button>
      </div>
    </div>
  );
};

export default ClassRecordExcel;