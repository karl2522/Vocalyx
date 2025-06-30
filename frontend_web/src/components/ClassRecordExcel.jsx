import { AlertCircle, ArrowLeft, ChevronDown, Download, Edit2, FileSpreadsheet, HelpCircle, Mic, MicOff, MoreVertical, Plus, RotateCcw, RotateCw, Save, Target, Upload, Users, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { classRecordService } from '../services/api';
import { speakText, stopSpeaking } from '../utils/speechSynthesis';
import useVoiceRecognition from '../utils/useVoiceRecognition';
import { findEmptyRow, findStudentRow, findStudentRowSmart, parseVoiceCommand } from '../utils/voicecommandParser';

const ClassRecordExcel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classRecord, setClassRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [customColumns, setCustomColumns] = useState({});
  const [headers, setHeaders] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [interimBatchCommand, setInterimBatchCommand] = useState('');

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
  } = useVoiceRecognition();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastVoiceCommand, setLastVoiceCommand] = useState('');
  const [selectedRow, setSelectedRow] = useState(0);

  const [commandHistory] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);

  const [batchMode, setBatchMode] = useState(false);
  const [batchEntries, setBatchEntries] = useState([]);
  const [currentBatchColumn, setCurrentBatchColumn] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showSortModal, setShowSortModal] = useState(false);



  // 🔥 NEW: Duplicate handling state
  const [duplicateOptions, setDuplicateOptions] = useState(null);
  const [pendingCommand, setPendingCommand] = useState(null);

  // Column management state
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newColumnName, setNewColumnName] = useState('');

  // 🔥 NEW: Dropdown state management
  const [dropdowns, setDropdowns] = useState({
    tools: false,
    voice: false,
    edit: false
  });

  // 🔥 NEW: Voice guide modal state
  const [showVoiceGuide, setShowVoiceGuide] = useState(false);

  // 🔥 NEW: Import modal state
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (transcript && 
        transcript.trim() && 
        transcript.trim().length >= 3 && 
        !isListening && 
        transcript !== lastVoiceCommand) {
      
      console.log('🔥 DEBUG: useEffect triggered - batchMode:', batchMode);
      console.log('🔥 DEBUG: transcript:', transcript);
      
      if (batchMode) {
        console.log('🔥 DEBUG: Calling handleBatchVoiceCommand...');
        handleBatchVoiceCommand(transcript);
        setLastVoiceCommand(transcript);
        
        if (!transcript.toLowerCase().includes('done') && 
            !transcript.toLowerCase().includes('finish') &&
            !transcript.toLowerCase().includes('exit')) {
          
          setTimeout(() => {
            clearTranscript();
            setTimeout(() => {
              if (batchMode && !isListening) {
                console.log('🔄 Restarting voice for batch mode...');
                startListening(true);
              }
            }, 500);
          }, 1000);
        } else {
          setTimeout(() => clearTranscript(), 2000);
        }
        
      } else {
        console.log('🔥 DEBUG: Calling handleVoiceCommand (normal mode)...');
        handleVoiceCommand(transcript);
        setLastVoiceCommand(transcript);
        setTimeout(() => clearTranscript(), 2000);
      }
    }
  }, [transcript, isListening, lastVoiceCommand, clearTranscript, batchMode, startListening]);

  useEffect(() => {
    console.log('🔥 DEBUG: interimBatchCommand changed:', interimBatchCommand);
    console.log('🔥 DEBUG: batchMode:', batchMode);
    console.log('🔥 DEBUG: currentBatchColumn:', currentBatchColumn);
    
    if (interimBatchCommand && batchMode && currentBatchColumn) {
      const studentScorePattern = /^(.+?)\s+(\d+)$/;
      const match = interimBatchCommand.trim().match(studentScorePattern);
      
      if (match) {
        const studentName = match[1].trim();
        const score = match[2];
        
        console.log('🔥 REAL-TIME BATCH: Processing', studentName, score);
        
        // 🔥 IMMEDIATELY find and add student without waiting for voice to stop
        const result = findStudentRowSmart(tableData, studentName, recentStudents, currentBatchColumn);
        
        if (result.bestMatch !== -1) {
          const student = tableData[result.bestMatch];
          const fullName = `${student['First Name']} ${student['Last Name']}`;
          
          // Check if already in batch
          const existingIndex = batchEntries.findIndex(entry => entry.rowIndex === result.bestMatch);
          
          if (existingIndex !== -1) {
            // Update existing entry
            const newEntries = [...batchEntries];
            newEntries[existingIndex] = {
              ...newEntries[existingIndex],
              score,
              status: 'updated'
            };
            setBatchEntries(newEntries);
            console.log('🔥 REAL-TIME: Updated existing entry for', fullName);
          } else {
            // Add new entry IMMEDIATELY
            const newEntry = {
              rowIndex: result.bestMatch,
              studentName: fullName,
              originalName: studentName,
              score,
              status: 'ready',
              hasExistingScore: result.possibleMatches[0]?.hasExistingScore || false,
              existingValue: result.possibleMatches[0]?.existingValue || null
            };
            
            setBatchEntries(prev => [...prev, newEntry]);
            console.log('🔥 REAL-TIME: Added new entry for', fullName);
          }
          
          // ✅ INSTANT feedback without stopping voice
          toast.success(`✅ ${fullName}: ${score}`, { 
            duration: 2000,
            position: 'top-right'
          });
          
          // Optional: Brief audio feedback (very short so it doesn't interfere)
          if (voiceEnabled) {
            const utterance = new SpeechSynthesisUtterance('Added');
            utterance.rate = 2.0; // Very fast
            utterance.volume = 0.3; // Quiet
            window.speechSynthesis.speak(utterance);
          }
          
        } else {
          console.log('🔥 REAL-TIME: Student not found for', studentName);
          toast.error(`❌ Student "${studentName}" not found`, {
            duration: 2000,
            position: 'top-right'
          });
        }
        
        // Clear the interim command to prevent reprocessing
        setInterimBatchCommand('');
      }
    }
  }, [interimBatchCommand, batchMode, currentBatchColumn, tableData, batchEntries, recentStudents, voiceEnabled]);

  useEffect(() => {
    // Build context dictionary when data loads
    if (tableData.length > 0 && headers.length > 0) {
      buildContextDictionary(tableData, headers);
    }
  }, [tableData, headers, buildContextDictionary]);

  const defaultColumns = {
    student_info: ['No', 'Last Name', 'First Name', 'Student ID'],
    quizzes: ['Quiz 1', 'Quiz 2', 'Quiz 3', 'Quiz 4', 'Quiz 5'],
    labs: ['Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5'],
    exams: ['Midterm', 'Final Exam'],
    calculations: ['Total', 'Grade']
  };

  useEffect(() => {
    fetchClassRecord();
  }, [id]);

  useEffect(() => {
    if (classRecord) {
      loadSpreadsheetData();
    }
  }, [classRecord]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (tableData.length > 0) {
        handleAutoSave();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [tableData]);

  const fetchClassRecord = async () => {
    try {
      const response = await classRecordService.getClassRecord(id);
      console.log("DEBUG: Fetched class record data:", response.data);
      setClassRecord(response.data);
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

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(tableData))]);
      setRedoStack(prev => prev.slice(0, -1));
      setTableData(nextState);
      
      toast.success('↷ Redid last action');
      if (voiceEnabled) {
        speakText('Redid last action');
      }
    } else {
      toast('Nothing to redo', { icon: 'ℹ️' });
      if (voiceEnabled) {
        speakText('Nothing to redo');
      }
    }
  };

  const handleQuickSort = (type) => {
    switch (type) {
      case 'az':
        sortStudents('alphabetical', 'asc');
        break;
      case 'za':
        sortStudents('alphabetical', 'desc');
        break;
      default:
        break;
    }
    setShowSortModal(false);
  };

  const saveStateForUndo = () => {
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(tableData))].slice(-10));
    setRedoStack([]); // Clear redo stack when new action is performed
  };

  const sortStudents = useCallback((key, direction = 'asc') => {
    const sortedData = [...tableData].sort((a, b) => {
      let aValue, bValue;
      
      if (key === 'alphabetical') {
        // Sort by Last Name, then First Name
        const aName = `${a['Last Name'] || ''} ${a['First Name'] || ''}`.trim().toLowerCase();
        const bName = `${b['Last Name'] || ''} ${b['First Name'] || ''}`.trim().toLowerCase();
        aValue = aName;
        bValue = bName;
      } else if (key === 'firstName') {
        aValue = (a['First Name'] || '').toLowerCase();
        bValue = (b['First Name'] || '').toLowerCase();
      } else if (key === 'lastName') {
        aValue = (a['Last Name'] || '').toLowerCase();
        bValue = (b['Last Name'] || '').toLowerCase();
      } else if (key === 'total') {
        aValue = parseFloat(a['Total'] || 0);
        bValue = parseFloat(b['Total'] || 0);
      } else if (key === 'studentId') {
        aValue = (a['Student ID'] || '').toLowerCase();
        bValue = (b['Student ID'] || '').toLowerCase();
      }
      
      // Handle empty rows (keep them at bottom)
      const aIsEmpty = !a['First Name'] && !a['Last Name'];
      const bIsEmpty = !b['First Name'] && !b['Last Name'];
      
      if (aIsEmpty && !bIsEmpty) return 1;
      if (!aIsEmpty && bIsEmpty) return -1;
      if (aIsEmpty && bIsEmpty) return 0;
      
      // Sort actual data
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    // 🔥 NEW: Re-number the "No" column to stay sequential (1,2,3,4,5...)
    const reNumberedData = sortedData.map((row, index) => ({
      ...row,
      'No': index + 1  // 🔥 This keeps numbers sequential!
    }));
    
    // Save state for undo
    saveStateForUndo();
    
    // Update table data
    setTableData(reNumberedData);
    setSortConfig({ key, direction });
    
    // Update selected row to follow the sorted data
    if (selectedRow >= 0 && selectedRow < tableData.length) {
      const selectedStudent = tableData[selectedRow];
      if (selectedStudent['First Name'] || selectedStudent['Last Name']) {
        const newIndex = reNumberedData.findIndex(row => 
          row['First Name'] === selectedStudent['First Name'] && 
          row['Last Name'] === selectedStudent['Last Name'] &&
          row['Student ID'] === selectedStudent['Student ID']
        );
        if (newIndex !== -1) {
          setSelectedRow(newIndex);
        }
      }
    }
    
    toast.success(`✅ Students sorted by ${key} (${direction === 'asc' ? 'A-Z' : 'Z-A'})`);
    if (voiceEnabled) {
      speakText(`Students sorted by ${key}`);
    }
  }, [tableData, selectedRow, saveStateForUndo, voiceEnabled]);

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(tableData))]);
      setUndoStack(prev => prev.slice(0, -1));
      setTableData(previousState);
      
      toast.success('↶ Undid last action');
      if (voiceEnabled) {
        speakText('Undid last action');
      }
    } else {
      toast('Nothing to undo', { icon: 'ℹ️' });
      if (voiceEnabled) {
        speakText('Nothing to undo');
      }
    }
  };

  // 🔥 ENHANCED: Smart name handler with duplicate detection
  const handleSmartNameGradeEntryVoice = (data) => {
    console.log('🎯 Smart name search for:', data);
    
    const result = findStudentRowSmart(tableData, data.searchName, recentStudents, data.column);
    
    console.log('🔍 Search result:', result);

    if (result.bestMatch !== -1 && !result.hasDuplicates) {
      // Single clear match - execute immediately
      saveStateForUndo();
      handleCellChange(result.bestMatch, data.column, data.value);
      setSelectedRow(result.bestMatch);
      
      const student = tableData[result.bestMatch];
      const studentName = `${student['First Name']} ${student['Last Name']}`;
      
      // Add to recent students
      addRecentStudent(studentName);
      
      toast.success(`✅ ${studentName} - ${data.column}: ${data.value}`);
      if (voiceEnabled) {
        speakText(`Updated ${data.column} to ${data.value} for ${studentName}`);
      }
    } else if (result.needsConfirmation && result.possibleMatches.length > 1) {
      // 🔥 NEW: Handle duplicates
      setDuplicateOptions({
        matches: result.possibleMatches,
        command: data,
        searchName: data.searchName
      });
      setPendingCommand(data);
      
      // Create voice-friendly options list
      const optionsText = result.possibleMatches
        .map((match, index) => `Option ${index + 1}: ${match.student} in row ${match.index + 1}${match.hasExistingScore ? ` (current score: ${match.existingValue})` : ' (empty)'}`)
        .join('. ');
      
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
        speakText(`Found multiple students named ${data.searchName}. ${optionsText}. Say option 1, option 2, etc. to choose.`);
      }
    } else if (result.bestMatch !== -1) {
      // Single match but might need confirmation for other reasons
      saveStateForUndo();
      handleCellChange(result.bestMatch, data.column, data.value);
      setSelectedRow(result.bestMatch);
      
      const student = tableData[result.bestMatch];
      const studentName = `${student['First Name']} ${student['Last Name']}`;
      
      addRecentStudent(studentName);
      
      toast.success(`✅ ${studentName} - ${data.column}: ${data.value}`);
      if (voiceEnabled) {
        speakText(`Updated ${data.column} to ${data.value} for ${studentName}`);
      }
    } else {
      toast.error(`Student "${data.searchName}" not found`);
      if (voiceEnabled) {
        speakText(`Student ${data.searchName} not found`);
      }
    }
  };

  // 🔥 NEW: Handle duplicate selection
  const handleDuplicateSelection = (selectedOption) => {
    if (!duplicateOptions || !pendingCommand) return;

    const selectedMatch = duplicateOptions.matches[selectedOption - 1];
    if (!selectedMatch) {
      toast.error('Invalid option selected');
      return;
    }

    // Execute the command with the selected student
    saveStateForUndo();
    handleCellChange(selectedMatch.index, pendingCommand.column, pendingCommand.value);
    setSelectedRow(selectedMatch.index);

    const studentName = selectedMatch.student;
    addRecentStudent(studentName);

    // Clear duplicate state
    setDuplicateOptions(null);
    setPendingCommand(null);

    toast.success(`✅ ${studentName} - ${pendingCommand.column}: ${pendingCommand.value}`);
    if (voiceEnabled) {
      speakText(`Updated ${pendingCommand.column} to ${pendingCommand.value} for ${studentName}`);
    }
  };

  const handleBatchStudentList = (data) => {
    console.log('🔥 Processing batch student list:', data);
    
    saveStateForUndo();
    
    const { column, students } = data;
    let successCount = 0;
    let failures = [];
    
    // Find the column
    const matchedColumn = headers.find(header => 
      header.toLowerCase().includes(column.toLowerCase()) ||
      column.toLowerCase().includes(header.toLowerCase())
    );
    
    if (!matchedColumn) {
      toast.error(`Column "${column}" not found`);
      return;
    }
    
    const newData = [...tableData];
    
    students.forEach(({ name, score }) => {
      const result = findStudentRowSmart(newData, name, recentStudents, matchedColumn);
      
      if (result.bestMatch !== -1) {
        newData[result.bestMatch][matchedColumn] = score;
        
        // Auto-calculate totals
        const gradeColumns = [
          ...(customColumns.quizzes || []),
          ...(customColumns.labs || []),
          ...(customColumns.exams || [])
        ];
        
        if (gradeColumns.includes(matchedColumn)) {
          const total = calculateRowTotal(newData[result.bestMatch], gradeColumns);
          newData[result.bestMatch]['Total'] = total;
          newData[result.bestMatch]['Grade'] = calculateLetterGrade(total);
        }
        
        successCount++;
        addRecentStudent(result.possibleMatches[0]?.student || name);
      } else {
        failures.push(name);
      }
    });
    
    setTableData(newData);
    
    // Show results
    toast.success(`✅ Updated ${successCount} students in ${matchedColumn}`);
    
    if (failures.length > 0) {
      toast.error(`❌ Could not find: ${failures.join(', ')}`);
    }
    
    if (voiceEnabled) {
      speakText(`Updated ${successCount} students in ${matchedColumn}. ${failures.length > 0 ? `Could not find ${failures.length} students.` : ''}`);
    }
  };

  const handleBatchRowRange = (data) => {
    console.log('🔥 Processing batch row range:', data);
    
    saveStateForUndo();
    
    const { column, startRow, endRow, score } = data;
    
    // Find the column
    const matchedColumn = headers.find(header => 
      header.toLowerCase().includes(column.toLowerCase()) ||
      column.toLowerCase().includes(header.toLowerCase())
    );
    
    if (!matchedColumn) {
      toast.error(`Column "${column}" not found`);
      return;
    }
    
    const newData = [...tableData];
    let updatedCount = 0;
    
    for (let i = startRow; i <= endRow && i < newData.length; i++) {
      // Skip empty rows
      if (newData[i]['First Name'] || newData[i]['Last Name']) {
        newData[i][matchedColumn] = score;
        
        // Auto-calculate totals
        const gradeColumns = [
          ...(customColumns.quizzes || []),
          ...(customColumns.labs || []),
          ...(customColumns.exams || [])
        ];
        
        if (gradeColumns.includes(matchedColumn)) {
          const total = calculateRowTotal(newData[i], gradeColumns);
          newData[i]['Total'] = total;
          newData[i]['Grade'] = calculateLetterGrade(total);
        }
        
        updatedCount++;
      }
    }
    
    setTableData(newData);
    
    toast.success(`✅ Updated ${updatedCount} students (rows ${startRow + 1}-${endRow + 1}) in ${matchedColumn}: ${score}`);
    
    if (voiceEnabled) {
      speakText(`Updated ${updatedCount} students in rows ${startRow + 1} through ${endRow + 1} for ${matchedColumn} with score ${score}`);
    }
  };

  const handleBatchEveryone = (data) => {
    console.log('🔥 Processing batch everyone:', data);
    
    saveStateForUndo();
    
    const { column, score, condition } = data;
    
    // Find the column
    const matchedColumn = headers.find(header => 
      header.toLowerCase().includes(column.toLowerCase()) ||
      column.toLowerCase().includes(header.toLowerCase())
    );
    
    if (!matchedColumn) {
      toast.error(`Column "${column}" not found`);
      return;
    }
    
    const newData = [...tableData];
    let updatedCount = 0;
    
    newData.forEach((row, index) => {
      // Check if student exists (has name)
      const hasStudent = row['First Name'] || row['Last Name'];
      
      if (hasStudent) {
        // Apply condition
        let shouldUpdate = true;
        
        if (condition === 'present') {
          // Only update if current cell is empty (student is "present" for this assignment)
          shouldUpdate = !row[matchedColumn] || row[matchedColumn].toString().trim() === '';
        }
        
        if (shouldUpdate) {
          row[matchedColumn] = score;
          
          // Auto-calculate totals
          const gradeColumns = [
            ...(customColumns.quizzes || []),
            ...(customColumns.labs || []),
            ...(customColumns.exams || [])
          ];
          
          if (gradeColumns.includes(matchedColumn)) {
            const total = calculateRowTotal(row, gradeColumns);
            row['Total'] = total;
            row['Grade'] = calculateLetterGrade(total);
          }
          
          updatedCount++;
        }
      }
    });
    
    setTableData(newData);
    
    const conditionText = condition === 'present' ? ' (present students only)' : '';
    toast.success(`✅ Updated ${updatedCount} students${conditionText} in ${matchedColumn}: ${score}`);
    
    if (voiceEnabled) {
      speakText(`Updated ${updatedCount} students in ${matchedColumn} with score ${score}`);
    }
  };

  const executeCommand = (command) => {
    switch (command.type) {
      case 'SMART_NAME_GRADE_ENTRY':
        handleSmartNameGradeEntryVoice(command.data);
        break;
      case 'BATCH_STUDENT_LIST':
        handleBatchStudentList(command.data);
        break;
      case 'BATCH_ROW_RANGE':
        handleBatchRowRange(command.data);
        break;
      case 'BATCH_EVERYONE':
        handleBatchEveryone(command.data);
        break;
      case 'ADD_STUDENT':
        saveStateForUndo();
        handleAddStudentVoice(command.data);
        break;
      case 'ROW_GRADE_ENTRY':
        saveStateForUndo();
        handleRowGradeEntryVoice(command.data);
        break;
      case 'QUICK_GRADE_ENTRY':
        saveStateForUndo();
        handleQuickGradeEntryVoice(command.data);
        break;
      case 'SELECT_DUPLICATE':
        handleDuplicateSelection(command.data.selectedOption);
        break;
      case 'SORT_STUDENTS':
        sortStudents(command.data.sortType, command.data.direction);
        break;
      default:
        toast.error(`🎙️ Command not recognized: "${command.data.originalText}"`);
        if (voiceEnabled) {
          speakText('Sorry, I didn\'t understand that command. Please try again.');
        }
    }
  };

  const executeConfirmedCommand = (confirmation) => {
    const { command, suggestedStudent } = confirmation;
    
    if (command.type === 'SMART_NAME_GRADE_ENTRY') {
      // Find the confirmed student
      const studentIndex = tableData.findIndex(row => 
        `${row['First Name']} ${row['Last Name']}` === suggestedStudent
      );
      
      if (studentIndex !== -1) {
        saveStateForUndo();
        handleCellChange(studentIndex, command.data.column, command.data.value);
        setSelectedRow(studentIndex);
        
        const student = tableData[studentIndex];
        addRecentStudent(suggestedStudent);
        
        toast.success(`✅ ${suggestedStudent} - ${command.data.column}: ${command.data.value}`);
        if (voiceEnabled) {
          speakText(`Updated ${command.data.column} to ${command.data.value} for ${suggestedStudent}`);
        }
      }
    }
  };

  const requestConfirmation = (command, originalTranscript) => {
    if (command.type === 'SMART_NAME_GRADE_ENTRY') {
      const { searchName, column, value } = command.data;
      
      // Try to find student with fuzzy matching
      const result = findStudentRowSmart(tableData, searchName, recentStudents);
      
      if (result.possibleMatches.length > 0) {
        const topMatch = result.possibleMatches[0];
        setPendingConfirmation({
          command,
          originalTranscript,
          suggestedStudent: topMatch.student,
          alternatives: result.possibleMatches.slice(1, 3)
        });
        
        toast(
          `🤔 Did you mean "${topMatch.student}"? Say "yes" to confirm or "no" to cancel.`,
          { 
            duration: 8000,
            icon: '🤔',
            style: {
              background: '#fef3c7',
              color: '#92400e'
            }
          }
        );
        
        if (voiceEnabled) {
          speakText(`Did you mean ${topMatch.student}? Say yes to confirm or no to cancel.`);
        }
      } else {
        toast.error(`Student "${searchName}" not found. Please try again.`);
        if (voiceEnabled) {
          speakText(`Student ${searchName} not found. Please try again.`);
        }
      }
    }
  };

  const handleVoiceCommand = (transcript) => {
    if (!transcript.trim()) return;

    console.log('Voice command received:', transcript);

    if (batchMode) {
      handleBatchVoiceCommand(transcript);
      return;
    }
    
    const command = parseVoiceCommand(transcript, headers, tableData, {
      recentStudents,
      commandHistory,
      alternatives
    });
    
    console.log('Parsed command:', command);
    console.log('🔥 PARSED COMMAND TYPE:', command.type); 
    console.log('🔥 PARSED COMMAND DATA:', command.data);
    
    // Handle confirmation commands
    if (command.type === 'CONFIRM_COMMAND' && pendingConfirmation) {
      executeConfirmedCommand(pendingConfirmation);
      setPendingConfirmation(null);
      return;
    }
    
    if (command.type === 'REJECT_COMMAND') {
      if (pendingConfirmation) {
        setPendingConfirmation(null);
        toast('Command cancelled', { icon: 'ℹ️' });
        if (voiceEnabled) {
          speakText('Command cancelled');
        }
        return;
      }
      if (duplicateOptions) {
        setDuplicateOptions(null);
        setPendingCommand(null);
        toast('Duplicate selection cancelled', { icon: 'ℹ️' });
        if (voiceEnabled) {
          speakText('Selection cancelled');
        }
        return;
      }
    }
    
    // Handle undo/redo
    if (command.type === 'UNDO_COMMAND') {
      handleUndo();
      return;
    }
    
    if (command.type === 'REDO_COMMAND') {
      handleRedo();
      return;
    }
    
    // Check if confirmation is needed for low confidence commands
    if (command.data?.confidence === 'low' || command.data?.usedAlternative) {
      requestConfirmation(command, transcript);
      return;
    }
    
    // Execute command directly for high confidence
    executeCommand(command);
    
    // Add to history
    addCommandHistory({
      transcript,
      command,
      timestamp: new Date(),
      executed: true
    });
  };

  // Keep all your existing handlers...
  const handleAddStudentVoice = (data) => {
    const emptyRowIndex = findEmptyRow(tableData);
    if (emptyRowIndex !== -1) {
      const newData = [...tableData];
      newData[emptyRowIndex] = {
        ...newData[emptyRowIndex],
        'Last Name': data['Last Name'],
        'First Name': data['First Name'],
        'Student ID': data['Student ID']
      };
      setTableData(newData);
      setSelectedRow(emptyRowIndex);
      toast.success(`✅ Added student: ${data['First Name']} ${data['Last Name']}`);
      if (voiceEnabled) {
        speakText(`Added student ${data['First Name']} ${data['Last Name']}`);
      }
    } else {
      toast.error('No empty rows available. Please add a new row first.');
      if (voiceEnabled) {
        speakText('No empty rows available. Please add a new row first.');
      }
    }
  };

  const handleNameGradeEntryVoice = (data) => {
    console.log('Looking for student:', data);
    
    // Try to find by full name first
    let targetRowIndex = findStudentRow(tableData, data.firstName, data.lastName);
    
    // If not found and we have only one name, try searching more flexibly
    if (targetRowIndex === -1 && (data.firstName || data.lastName)) {
      const searchName = data.firstName || data.lastName;
      targetRowIndex = tableData.findIndex(row => {
        const fullName = `${row['First Name']} ${row['Last Name']}`.toLowerCase().trim();
        const firstName = (row['First Name'] || '').toLowerCase().trim();
        const lastName = (row['Last Name'] || '').toLowerCase().trim();
        
        return firstName.includes(searchName.toLowerCase()) || 
               lastName.includes(searchName.toLowerCase()) ||
               fullName.includes(searchName.toLowerCase());
      });
    }
    
    if (targetRowIndex !== -1) {
      handleCellChange(targetRowIndex, data.column, data.value);
      setSelectedRow(targetRowIndex);
      const student = tableData[targetRowIndex];
      toast.success(`✅ ${student['First Name']} ${student['Last Name']} - ${data.column}: ${data.value}`);
      if (voiceEnabled) {
        speakText(`Updated ${data.column} to ${data.value} for ${student['First Name']} ${student['Last Name']}`);
      }
    } else {
      toast.error(`Student "${data.firstName || ''} ${data.lastName || ''}".trim() not found`);
      if (voiceEnabled) {
        speakText(`Student ${data.firstName || ''} ${data.lastName || ''} not found`);
      }
    }
  };

  const handleGradeEntryVoice = (data) => {
    let targetRowIndex = -1;

    // Find student by name
    if (data.firstName || data.lastName) {
      targetRowIndex = findStudentRow(tableData, data.firstName, data.lastName);
      
      if (targetRowIndex === -1) {
        // Student not found, add to empty row
        const emptyRowIndex = findEmptyRow(tableData);
        if (emptyRowIndex !== -1) {
          const newData = [...tableData];
          newData[emptyRowIndex] = {
            ...newData[emptyRowIndex],
            'Last Name': data.lastName,
            'First Name': data.firstName,
            'Student ID': data.studentId || '',
            [data.column]: data.value
          };
          
          // Auto-calculate totals
          const gradeColumns = [
            ...(customColumns.quizzes || []),
            ...(customColumns.labs || []),
            ...(customColumns.exams || [])
          ];
          
          if (gradeColumns.includes(data.column)) {
            const total = calculateRowTotal(newData[emptyRowIndex], gradeColumns);
            newData[emptyRowIndex]['Total'] = total;
            newData[emptyRowIndex]['Grade'] = calculateLetterGrade(total);
          }
          
          setTableData(newData);
          setSelectedRow(emptyRowIndex);
          toast.success(`✅ Added ${data.firstName} ${data.lastName} with ${data.column}: ${data.value}`);
          if (voiceEnabled) {
            speakText(`Added ${data.firstName} ${data.lastName} with ${data.column} score ${data.value}`);
          }
          return;
        } else {
          toast.error('No empty rows available');
          if (voiceEnabled) {
            speakText('No empty rows available');
          }
          return;
        }
      }
    }

    if (targetRowIndex !== -1) {
      handleCellChange(targetRowIndex, data.column, data.value);
      setSelectedRow(targetRowIndex);
      const student = tableData[targetRowIndex];
      toast.success(`✅ Updated ${student['First Name']} ${student['Last Name']} - ${data.column}: ${data.value}`);
      if (voiceEnabled) {
        speakText(`Updated ${data.column} to ${data.value} for ${student['First Name']} ${student['Last Name']}`);
      }
    }
  };

  const handleRowGradeEntryVoice = (data) => {
    if (data.rowIndex >= 0 && data.rowIndex < tableData.length) {
      handleCellChange(data.rowIndex, data.column, data.value);
      setSelectedRow(data.rowIndex);
      toast.success(`✅ Row ${data.rowIndex + 1} - ${data.column}: ${data.value}`);
      if (voiceEnabled) {
        speakText(`Updated row ${data.rowIndex + 1} ${data.column} to ${data.value}`);
      }
    } else {
      toast.error('Invalid row number');
      if (voiceEnabled) {
        speakText('Invalid row number');
      }
    }
  };

  const handleQuickGradeEntryVoice = (data) => {
    if (selectedRow >= 0 && selectedRow < tableData.length) {
      handleCellChange(selectedRow, data.column, data.value);
      const student = tableData[selectedRow];
      const studentName = `${student['First Name']} ${student['Last Name']}`.trim() || `Row ${selectedRow + 1}`;
      toast.success(`✅ ${studentName} - ${data.column}: ${data.value}`);
      if (voiceEnabled) {
        speakText(`Updated ${data.column} to ${data.value} for ${studentName}`);
      }
    } else {
      toast.error('Please select a row first');
      if (voiceEnabled) {
        speakText('Please select a row first');
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

  // Keep all your existing data loading and management functions...
  const loadSpreadsheetData = async () => {
    try {
      // Load both spreadsheet data and custom columns
      const [spreadsheetResponse, columnsResponse] = await Promise.all([
        classRecordService.getSpreadsheetData(id),
        classRecordService.getCustomColumns(id)
      ]);

      const { spreadsheet_data, last_modified } = spreadsheetResponse.data;
      const { custom_columns, all_headers } = columnsResponse.data;

      setCustomColumns(custom_columns || defaultColumns);
      setHeaders(all_headers || generateHeadersFromColumns(custom_columns || defaultColumns));
      setLastSaved(last_modified);

      if (spreadsheet_data && spreadsheet_data.length > 0) {
        setTableData(spreadsheet_data);
        toast.success('Class record data loaded!');
      } else {
        // Initialize with empty template
        initializeEmptyTable(all_headers || generateHeadersFromColumns(custom_columns || defaultColumns));
      }
    } catch (error) {
      console.error('Error loading spreadsheet data:', error);
      // Initialize with default template if loading fails
      const defaultHeaders = generateHeadersFromColumns(defaultColumns);
      setHeaders(defaultHeaders);
      setCustomColumns(defaultColumns);
      initializeEmptyTable(defaultHeaders);
    }
  };

  const generateHeadersFromColumns = (columns) => {
    const headers = [];
    headers.push(...(columns.student_info || []));
    headers.push(...(columns.quizzes || []));
    headers.push(...(columns.labs || []));
    headers.push(...(columns.exams || []));
    headers.push(...(columns.calculations || []));
    return headers;
  };

  const initializeEmptyTable = (headerList) => {
    const data = [];
    
    // Create 25 empty rows for students
    for (let i = 0; i < 25; i++) {
      const row = {};
      headerList.forEach((header, index) => {
        if (header === 'No') {
          row[header] = i + 1;
        } else {
          row[header] = '';
        }
      });
      data.push(row);
    }
    
    setTableData(data);
  };

  const handleCellChange = (rowIndex, column, value) => {
    const newData = [...tableData];
    newData[rowIndex][column] = value;
    
    // Auto-calculate total if it's a grade column
    const gradeColumns = [
      ...(customColumns.quizzes || []),
      ...(customColumns.labs || []),
      ...(customColumns.exams || [])
    ];
    
    if (gradeColumns.includes(column)) {
      const total = calculateRowTotal(newData[rowIndex], gradeColumns);
      newData[rowIndex]['Total'] = total;
      newData[rowIndex]['Grade'] = calculateLetterGrade(total);
    }
    
    setTableData(newData);
  };

  const calculateRowTotal = (row, gradeColumns) => {
    let total = 0;
    let count = 0;
    
    gradeColumns.forEach(column => {
      const value = parseFloat(row[column]);
      if (!isNaN(value)) {
        total += value;
        count++;
      }
    });
    
    return count > 0 ? (total / count).toFixed(2) : '';
  };

  const calculateLetterGrade = (average) => {
    const avg = parseFloat(average);
    if (isNaN(avg)) return '';
    
    if (avg >= 90) return 'A';
    if (avg >= 80) return 'B';
    if (avg >= 70) return 'C';
    if (avg >= 60) return 'D';
    return 'F';
  };

  const startBatchMode = () => {
    setBatchMode(true);
    setShowBatchModal(true);
    setBatchEntries([]);
    setCurrentBatchColumn('');

    window.batchModeActive = true;
    console.log('🔥 DEBUG: window.batchModeActive set to:', window.batchModeActive);
    
    toast.success('🎯 Batch Mode activated! Say a column name first (e.g., "Quiz 1")');
    if (voiceEnabled) {
      speakText('Batch mode activated');
    }
    
    setTimeout(() => {
      if (!isListening) {
        startListening(true); 
      }
    }, 2000); 
  };

  const handleBatchVoiceCommand = (transcript) => {
    if (!transcript.trim()) return;

    console.log('🔥 DEBUG: === BATCH COMMAND START ===');
    console.log('🔥 DEBUG: batchMode =', batchMode);
    console.log('🔥 DEBUG: currentBatchColumn =', currentBatchColumn);
    console.log('🔥 DEBUG: transcript =', transcript);
    console.log('🔥 DEBUG: current batchEntries count =', batchEntries.length);
    
    // If no column is set, try to detect column name
    if (!currentBatchColumn) {
      console.log('🔥 DEBUG: No column set, trying to detect...');
      const detectedColumn = headers.find(header => 
        transcript.toLowerCase().includes(header.toLowerCase()) ||
        header.toLowerCase().includes(transcript.toLowerCase()) 
      );
      
      if (detectedColumn) {
        console.log('🔥 DEBUG: Column detected:', detectedColumn);
        setCurrentBatchColumn(detectedColumn);
        toast.success(`✅ Column set to: ${detectedColumn}. Now say student names and scores!`);
        if (voiceEnabled) {
          speakText(`Column set to ${detectedColumn}. Now say student names and scores like Maria 85`);
        }
        return;
      } else {
        console.log('🔥 DEBUG: No column detected in headers:', headers);
        toast.error('Column not found. Please say a valid column name.');
        return;
      }
    }

    // Parse student name and score: "Maria 85"
    const studentScorePattern = /^(.+?)\s+(\d+)$/;
    const match = transcript.trim().match(studentScorePattern);
    
    console.log('🔥 DEBUG: Pattern match result:', match);
    
    if (match) {
      const studentName = match[1].trim();
      const score = match[2];
      
      console.log('🔥 DEBUG: Parsed - studentName:', studentName, 'score:', score);
      
      // Check if student exists
      const result = findStudentRowSmart(tableData, studentName, recentStudents, currentBatchColumn);
      
      console.log('🔥 DEBUG: Student search result:', result);
      
      if (result.bestMatch !== -1) {
        const student = tableData[result.bestMatch];
        const fullName = `${student['First Name']} ${student['Last Name']}`;
        
        console.log('🔥 DEBUG: Found student:', fullName, 'at index:', result.bestMatch);
        
        // Check if already in batch
        const existingIndex = batchEntries.findIndex(entry => entry.rowIndex === result.bestMatch);
        
        console.log('🔥 DEBUG: Existing entry index:', existingIndex);
        console.log('🔥 DEBUG: Current batchEntries before update:', batchEntries);
        
        if (existingIndex !== -1) {
          // Update existing entry
          const newEntries = [...batchEntries];
          newEntries[existingIndex] = {
            ...newEntries[existingIndex],
            score,
            status: 'updated'
          };
          console.log('🔥 DEBUG: Updating existing entry. New entries:', newEntries);
          setBatchEntries(newEntries);
          
          toast.success(`✅ Updated ${fullName}: ${score}`);
          if (voiceEnabled) {
            speakText(`Updated ${fullName} to ${score}`);
          }
        } else {
          // Add new entry
          const newEntry = {
            rowIndex: result.bestMatch,
            studentName: fullName,
            originalName: studentName,
            score,
            status: 'ready',
            hasExistingScore: result.possibleMatches[0]?.hasExistingScore || false,
            existingValue: result.possibleMatches[0]?.existingValue || null
          };
          
          console.log('🔥 DEBUG: Adding new entry:', newEntry);
          console.log('🔥 DEBUG: Previous batchEntries:', batchEntries);
          
          setBatchEntries(prev => {
            const updated = [...prev, newEntry];
            console.log('🔥 DEBUG: Updated batchEntries:', updated);
            return updated;
          });
          
          toast.success(`✅ Added ${fullName}: ${score}`);
          if (voiceEnabled) {
            speakText(`Added ${fullName} with score ${score}`);
          }
        }
        
        console.log('🔥 DEBUG: ⚠️ IMPORTANT: Did we modify tableData directly? NO - only batchEntries should be modified!');
        
      } else {
        console.log('🔥 DEBUG: Student not found for:', studentName);
        toast.error(`❌ Student "${studentName}" not found`);
        if (voiceEnabled) {
          speakText(`Student ${studentName} not found`);
        }
      }
    } else {
      console.log('🔥 DEBUG: No pattern match, checking control commands...');
      // Check for control commands
      if (transcript.toLowerCase().includes('done') || transcript.toLowerCase().includes('finish')) {
        console.log('🔥 DEBUG: DONE command detected');
        if (batchEntries.length > 0) {
          console.log('🔥 DEBUG: Executing batch entries...');
          executeBatchEntries();
          setBatchMode(false);
          setShowBatchModal(false);
        } else {
          toast.error('No entries to save');
        }
      } else if (transcript.toLowerCase().includes('clear') || transcript.toLowerCase().includes('reset')) {
        console.log('🔥 DEBUG: CLEAR command detected');
        setBatchEntries([]);
        toast.success('Batch entries cleared');
      } else {
        console.log('🔥 DEBUG: Unknown command');
        toast.error('Say student name and score (e.g., "Maria 85") or "done" to finish');
      }
    }
    
    console.log('🔥 DEBUG: === BATCH COMMAND END ===');
  };

  const executeBatchEntries = () => {
    console.log('🔥 DEBUG: === EXECUTING BATCH ENTRIES ===');
    console.log('🔥 DEBUG: batchEntries.length =', batchEntries.length);
    console.log('🔥 DEBUG: batchEntries =', batchEntries);
    
    if (batchEntries.length === 0) {
      console.log('🔥 DEBUG: No entries to execute, returning...');
      return;
    }
    
    saveStateForUndo();
    
    const newData = [...tableData];
    let successCount = 0;
    
    batchEntries.forEach((entry, index) => {
      console.log(`🔥 DEBUG: Processing entry ${index}:`, entry);
      if (entry.status === 'ready' || entry.status === 'updated') {
        console.log(`🔥 DEBUG: Updating tableData[${entry.rowIndex}][${currentBatchColumn}] = ${entry.score}`);
        newData[entry.rowIndex][currentBatchColumn] = entry.score;
        
        // Auto-calculate totals
        const gradeColumns = [
          ...(customColumns.quizzes || []),
          ...(customColumns.labs || []),
          ...(customColumns.exams || [])
        ];
        
        if (gradeColumns.includes(currentBatchColumn)) {
          const total = calculateRowTotal(newData[entry.rowIndex], gradeColumns);
          newData[entry.rowIndex]['Total'] = total;
          newData[entry.rowIndex]['Grade'] = calculateLetterGrade(total);
          console.log(`🔥 DEBUG: Updated totals - Total: ${total}, Grade: ${newData[entry.rowIndex]['Grade']}`);
        }
        
        successCount++;
        addRecentStudent(entry.studentName);
      }
    });
    
    console.log('🔥 DEBUG: Setting new tableData...');
    setTableData(newData);
    
    // Close batch mode
    setBatchMode(false);
    setShowBatchModal(false);
    setBatchEntries([]);
    setCurrentBatchColumn('');

    window.batchModeActive = false;
    console.log('🔥 DEBUG: Cleared window.batchModeActive');
    
    console.log(`🔥 DEBUG: Batch completed! Updated ${successCount} students`);
    toast.success(`🎉 Batch completed! Updated ${successCount} students in ${currentBatchColumn}`);
    if (voiceEnabled) {
      speakText(`Batch completed. Updated ${successCount} students in ${currentBatchColumn}`);
    }
    
    console.log('🔥 DEBUG: === BATCH EXECUTION END ===');
  };

  const cancelBatchMode = () => {
    setBatchMode(false);
    setShowBatchModal(false);
    setBatchEntries([]);
    setCurrentBatchColumn('');
    
    toast('Batch mode cancelled');
    if (voiceEnabled) {
      speakText('Batch mode cancelled');
    }
  };

  const removeBatchEntry = (index) => {
    setBatchEntries(prev => prev.filter((_, i) => i !== index));
  };

  const getColumnColor = (column) => {
    if (customColumns.student_info?.includes(column)) return 'bg-slate-50';
    if (customColumns.quizzes?.includes(column)) return 'bg-blue-50';
    if (customColumns.labs?.includes(column)) return 'bg-emerald-50';
    if (customColumns.exams?.includes(column)) return 'bg-amber-50';
    if (customColumns.calculations?.includes(column)) return 'bg-purple-50';
    return 'bg-slate-50';
  };

  const getCategoryFromColumn = (column) => {
    if (customColumns.student_info?.includes(column)) return 'student_info';
    if (customColumns.quizzes?.includes(column)) return 'quizzes';
    if (customColumns.labs?.includes(column)) return 'labs';
    if (customColumns.exams?.includes(column)) return 'exams';
    if (customColumns.calculations?.includes(column)) return 'calculations';
    return null;
  };

  const handleAutoSave = useCallback(async () => {
    try {
      await classRecordService.saveSpreadsheetData(id, tableData);
      setLastSaved(new Date().toISOString());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [id, tableData]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await classRecordService.saveSpreadsheetData(id, tableData);
      setLastSaved(new Date().toISOString());
      toast.success('Class record saved successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save class record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddColumn = async () => {
    if (!selectedCategory || !newColumnName.trim()) {
      toast.error('Please select a category and enter a column name');
      return;
    }

    try {
      // Generate smart column name based on category
      let columnName = newColumnName.trim();
      
      if (selectedCategory === 'quizzes' && !columnName.toLowerCase().includes('quiz')) {
        const quizCount = customColumns.quizzes?.length || 0;
        columnName = `Quiz ${quizCount + 1}`;
      } else if (selectedCategory === 'labs' && !columnName.toLowerCase().includes('lab')) {
        const labCount = customColumns.labs?.length || 0;
        columnName = `Lab ${labCount + 1}`;
      }

      const response = await classRecordService.addColumn(id, selectedCategory, columnName);
      
      if (response.data.status === 'success') {
        const { custom_columns, all_headers } = response.data;
        setCustomColumns(custom_columns);
        setHeaders(all_headers);
        
        // Update table data to include new column
        const updatedTableData = tableData.map(row => ({
          ...row,
          [columnName]: ''
        }));
        setTableData(updatedTableData);
        
        toast.success(`Column "${columnName}" added successfully!`);
        setShowAddColumnModal(false);
        setNewColumnName('');
        setSelectedCategory('');
      }
    } catch (error) {
      console.error('Error adding column:', error);
      toast.error('Failed to add column');
    }
  };

  const handleRemoveColumn = async (category, columnName) => {
    if (window.confirm(`Are you sure you want to remove "${columnName}"?`)) {
      try {
        const response = await classRecordService.removeColumn(id, category, columnName);
        
        if (response.data.status === 'success') {
          const { custom_columns, all_headers } = response.data;
          setCustomColumns(custom_columns);
          setHeaders(all_headers);
          
          // Remove column from table data
          const updatedTableData = tableData.map(row => {
            const newRow = { ...row };
            delete newRow[columnName];
            return newRow;
          });
          setTableData(updatedTableData);
          
          toast.success(`Column "${columnName}" removed successfully!`);
        }
      } catch (error) {
        console.error('Error removing column:', error);
        toast.error('Failed to remove column');
      }
    }
  };

  const handleExport = () => {
    try {
      // Convert to CSV
      const csvContent = [
        headers.join(','),
        ...tableData.map(row => headers.map(header => row[header] || '').join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${classRecord.name}_${classRecord.semester}.csv`;
      link.click();
      
      toast.success('Class record exported successfully!');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export class record');
    }
  };

  const addNewStudent = () => {
    const newRow = {};
    headers.forEach(header => {
      if (header === 'No') {
        newRow[header] = tableData.length + 1;
      } else {
        newRow[header] = '';
      }
    });
    setTableData([...tableData, newRow]);
    toast.success('New student row added!');
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
    console.log('🔍 Google Sheets data:', {
      google_sheet_id: classRecord.google_sheet_id,
      google_sheet_url: classRecord.google_sheet_url,
      embed_url: `https://docs.google.com/spreadsheets/d/${classRecord.google_sheet_id}/edit?usp=sharing&rm=embedded`
    });

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
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center space-x-2 bg-emerald-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>

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
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Professional Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-slate-100">
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

            {/* Right Section - Action Menu */}
            <div className="flex items-center space-x-2">
              {/* Primary Save */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-600/25"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </button>

              <button
                onClick={() => setShowSortModal(true)}
                className="flex items-center space-x-2 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
                title="Sort students"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <span>Sort Students</span>
              </button>

              {/* Edit Tools Dropdown */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleDropdown('edit')}
                  className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-3 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${dropdowns.edit ? 'rotate-180' : ''}`} />
                </button>
                
                {dropdowns.edit && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                    <button
                      onClick={() => {
                        addNewStudent();
                        closeAllDropdowns();
                      }}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Student</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAddColumnModal(true);
                        closeAllDropdowns();
                      }}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Column</span>
                    </button>
                    <hr className="my-2 border-slate-200" />
                    <button
                      onClick={() => {
                        handleUndo();
                        closeAllDropdowns();
                      }}
                      disabled={undoStack.length === 0}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Undo</span>
                    </button>
                    <button
                      onClick={() => {
                        handleRedo();
                        closeAllDropdowns();
                      }}
                      disabled={redoStack.length === 0}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Redo</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Voice Tools Dropdown */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleDropdown('voice')}
                  className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-3 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>Voice</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${dropdowns.voice ? 'rotate-180' : ''}`} />
                </button>
                
                {dropdowns.voice && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      Voice Settings
                    </div>
                    <button
                      onClick={() => {
                        toggleVoiceFeedback();
                        closeAllDropdowns();
                      }}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                    >
                      {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      <span>{voiceEnabled ? 'Disable' : 'Enable'} Voice Feedback</span>
                    </button>
                    <button
                      onClick={() => {
                        startVoiceTraining();
                        closeAllDropdowns();
                      }}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                    >
                      <Target className="w-4 h-4" />
                      <span>Train Voice Recognition</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Tools Dropdown */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleDropdown('tools')}
                  className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-3 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                  <span>Tools</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${dropdowns.tools ? 'rotate-180' : ''}`} />
                </button>
                
                {dropdowns.tools && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                    <button
                      onClick={() => {
                        startBatchMode();
                        closeAllDropdowns();
                      }}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                    >
                      <Users className="w-4 h-4" />
                      <span>Batch Grading</span>
                    </button>
                    <button
                      onClick={() => {
                        handleExport();
                        closeAllDropdowns();
                      }}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowImportModal(true);
                        closeAllDropdowns();
                      }}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Import CSV</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-slate-600">Students: <span className="font-semibold text-slate-900">{tableData.filter(row => row['Last Name'] || row['First Name']).length}</span></span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-slate-600">Columns: <span className="font-semibold text-slate-900">{headers.length}</span></span>
              </div>
              {isListening && (
                <div className="flex items-center space-x-2 text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Listening...</span>
                </div>
              )}
            </div>
            
            <div className="text-slate-500">
              Selected Row: <span className="font-semibold text-slate-900">{selectedRow + 1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Browser Support Warning - Minimal */}
      {!isSupported && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2">
          <div className="flex items-center space-x-2 text-sm text-amber-800">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span>Voice recognition requires Chrome, Edge, or Safari browser</span>
          </div>
        </div>
      )}

      {/* Voice Transcript Display - Only when active */}
      {transcript && isListening && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2">
          <div className="flex items-center space-x-3 text-sm">
            <div className="flex items-center space-x-2 text-blue-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Voice Input:</span>
            </div>
            <div className="bg-white rounded px-3 py-1 text-slate-700 font-mono text-xs">
              "{transcript}"
            </div>
          </div>
        </div>
      )}

      {/* Voice Commands Help - Collapsible */}
      {isListening && (
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-3">
          <details className="text-sm">
            <summary className="cursor-pointer text-slate-700 font-medium hover:text-slate-900 flex items-center space-x-2">
              <Mic className="w-4 h-4" />
              <span>Voice Commands Guide</span>
            </summary>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="font-medium text-slate-700 mb-2">Single Entry</div>
                <div className="space-y-1">
                  <div>"Maria Quiz 3 twenty"</div>
                  <div>"John Lab 2 eighty-five"</div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="font-medium text-slate-700 mb-2">Batch List</div>
                <div className="space-y-1">
                  <div>"Quiz 1: John 85, Maria 92"</div>
                  <div>"Lab 2: Alice 90, Bob 85"</div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="font-medium text-slate-700 mb-2">Batch Range</div>
                <div className="space-y-1">
                  <div>"Midterm: Row 1 through 5, all score 90"</div>
                  <div>"Quiz 2: Everyone present gets 85"</div>
                </div>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Duplicate Selection UI - Clean */}
      {duplicateOptions && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                Multiple students found for "{duplicateOptions.searchName}"
              </h3>
              <div className="space-y-2">
                {duplicateOptions.matches.map((match, index) => (
                  <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{match.student}</div>
                        <div className="text-xs text-slate-500">Row {match.index + 1}</div>
                      </div>
                      {match.hasExistingScore ? (
                        <div className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                          Current: {match.existingValue}
                        </div>
                      ) : (
                        <div className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                          Empty
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDuplicateSelection(index + 1)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-blue-700 bg-blue-100 rounded-lg px-3 py-2">
                Say "option 1", "option 2", etc. or click Select buttons. Say "cancel" to abort.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Confirmation UI - Clean */}
      {pendingConfirmation && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Edit2 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-900 mb-2">Confirmation Required</h3>
              <div className="bg-white rounded-lg p-3 border border-amber-200">
                <p className="text-sm text-slate-700">
                  Did you mean <span className="font-semibold text-slate-900">{pendingConfirmation.suggestedStudent}</span>?
                </p>
                {pendingConfirmation.alternatives.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-amber-200">
                    <p className="text-xs text-slate-500">
                      Other matches: {pendingConfirmation.alternatives.map(alt => alt.student).join(', ')}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-3 text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2">
                Say "yes" to confirm or "no" to cancel
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Overview Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-slate-400 rounded-sm"></div>
              <span className="text-slate-600">Info <span className="text-slate-400">({customColumns.student_info?.length || 0})</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
              <span className="text-slate-600">Quizzes <span className="text-slate-400">({customColumns.quizzes?.length || 0})</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
              <span className="text-slate-600">Labs <span className="text-slate-400">({customColumns.labs?.length || 0})</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
              <span className="text-slate-600">Exams <span className="text-slate-400">({customColumns.exams?.length || 0})</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
              <span className="text-slate-600">Totals <span className="text-slate-400">({customColumns.calculations?.length || 0})</span></span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-slate-500">
            <span>{headers.length} columns</span>
            <span>•</span>
            <span>{tableData.filter(row => row['Last Name'] || row['First Name']).length} students</span>
          </div>
        </div>
      </div>

      {/* Professional Table Container */}
      <div className="flex-1 overflow-auto bg-slate-50">
        <div className="p-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        className={`px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider min-w-[120px] ${getColumnColor(header)} relative group border-r border-slate-200 last:border-r-0`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{header}</span>
                          {!['No', 'Total', 'Grade'].includes(header) && (
                            <button
                              onClick={() => handleRemoveColumn(getCategoryFromColumn(header), header)}
                              className="opacity-0 group-hover:opacity-100 ml-2 text-slate-400 hover:text-red-500 transition-all duration-200 hover:scale-110"
                              title={`Remove ${header}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {tableData.map((row, rowIndex) => (
                    <tr 
                      key={rowIndex} 
                      className={`hover:bg-slate-50 transition-colors ${
                        duplicateOptions?.matches.some(match => match.index === rowIndex) 
                          ? 'bg-blue-50 border-l-4 border-blue-400' 
                          : selectedRow === rowIndex 
                            ? 'bg-blue-50/50 border-l-4 border-blue-300'
                            : ''
                      }`}
                    >
                      {headers.map((header, colIndex) => (
                        <td
                          key={colIndex}
                          className={`px-4 py-3 text-sm ${getColumnColor(header)} border-r border-slate-100 last:border-r-0`}
                        >
                          {header === 'No' || header === 'Total' || header === 'Grade' ? (
                            <span className="text-slate-900 font-medium">{row[header]}</span>
                          ) : (
                            <input
                              type="text"
                              value={row[header] || ''}
                              onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                              onFocus={() => setSelectedRow(rowIndex)}
                              className="w-full border-none outline-none bg-transparent focus:bg-blue-50 focus:ring-2 focus:ring-blue-500 rounded-lg px-2 py-1.5 transition-all"
                              placeholder={
                                customColumns.student_info?.includes(header) 
                                  ? 'Enter info...' 
                                  : '0'
                              }
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Batch Mode Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Batch Grading Mode</h2>
                  {currentBatchColumn && (
                    <p className="text-sm text-slate-600">Column: <span className="font-medium text-blue-600">{currentBatchColumn}</span></p>
                  )}
                </div>
              </div>
              <button
                onClick={cancelBatchMode}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {!currentBatchColumn ? (
              <div className="text-center py-8">
                <div className="mb-4">
                  <Mic className={`w-16 h-16 mx-auto ${isListening ? 'text-red-500 animate-pulse' : 'text-blue-500'}`} />
                </div>
                <h3 className="text-lg font-medium mb-2">Step 1: Choose Column</h3>
                <p className="text-gray-600 mb-4">
                  Say a column name to start batch grading
                </p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {headers.filter(h => !['No', 'Last Name', 'First Name', 'Student ID', 'Total', 'Grade'].includes(h)).map(header => (
                    <button
                      key={header}
                      onClick={() => {
                        setCurrentBatchColumn(header);
                        toast.success(`Column set to: ${header}`);
                      }}
                      className="bg-blue-100 text-blue-800 px-3 py-2 rounded hover:bg-blue-200 transition-colors"
                    >
                      {header}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-blue-800">
                        {isListening ? '🎙️ Listening for entries...' : '✅ Ready for voice input'}
                      </h3>
                      <p className="text-blue-600 text-sm">
                        Say: "Maria 85" or "John 92" • Say "done" when finished
                      </p>
                    </div>
                    <div className="text-blue-600 font-medium">
                      {batchEntries.length} students ready
                    </div>
                  </div>
                </div>
                
                {/* Batch Entries List */}
                <div className="flex-1 overflow-auto">
                  {batchEntries.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No students added yet</p>
                      <p className="text-sm">Start saying student names and scores</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {batchEntries.map((entry, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {entry.status === 'ready' ? (
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              ) : entry.status === 'updated' ? (
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              ) : (
                                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{entry.studentName}</div>
                              <div className="text-sm text-gray-500">
                                {currentBatchColumn}: {entry.score}
                                {entry.hasExistingScore && (
                                  <span className="ml-2 text-amber-600">
                                    (was: {entry.existingValue})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeBatchEntry(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-3 mt-4 pt-4 border-t">
                  <button
                    onClick={cancelBatchMode}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setBatchEntries([]);
                      toast.success('Entries cleared');
                    }}
                    disabled={batchEntries.length === 0}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={executeBatchEntries}
                    disabled={batchEntries.length === 0}
                    className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    Save {batchEntries.length} Students
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Professional Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Add New Column</h2>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="">Select Category</option>
                  <option value="quizzes">📝 Quizzes</option>
                  <option value="labs">🧪 Lab Activities</option>
                  <option value="exams">📋 Exams</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Column Name</label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder={
                    selectedCategory === 'quizzes' ? 'Quiz 6' :
                    selectedCategory === 'labs' ? 'Lab 6' :
                    selectedCategory === 'exams' ? 'Practical Exam' :
                    'Enter column name...'
                  }
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowAddColumnModal(false);
                  setSelectedCategory('');
                  setNewColumnName('');
                }}
                className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-600/25"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎤 FLOATING VOICE RECORDING BUTTON */}
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

      {/* 📖 PROFESSIONAL VOICE GUIDE MODAL */}
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
                Need help? The voice button is in the bottom-right corner
              </div>
              <button
                onClick={() => setShowVoiceGuide(false)}
                className="bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-600/25"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 NEW: Sort Students Modal */}
      {showSortModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                📋 Sort Students
              </h3>
              <button
                onClick={() => setShowSortModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Choose how to sort your students. All grades and data will stay with each student.
              </p>
              
              {/* 🔥 Alphabetical Sorting */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  🔤 Alphabetical Sorting
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleQuickSort('az')}
                    className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    🔽 A → Z
                  </button>
                  <button
                    onClick={() => handleQuickSort('za')}
                    className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    🔼 Z → A
                  </button>
                </div>
              </div>
              
              {/* 🔥 Custom Sorting Options */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  🎯 Custom Sorting
                </h4>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      sortStudents('firstName', 'asc');
                      setShowSortModal(false);
                    }}
                    className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm"
                  >
                    <span>👤 First Name (A-Z)</span>
                    <span className="text-gray-400">→</span>
                  </button>
                  <button
                    onClick={() => {
                      sortStudents('lastName', 'asc');
                      setShowSortModal(false);
                    }}
                    className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm"
                  >
                    <span>📛 Last Name (A-Z)</span>
                    <span className="text-gray-400">→</span>
                  </button>
                  <button
                    onClick={() => {
                      sortStudents('total', 'desc');
                      setShowSortModal(false);
                    }}
                    className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm"
                  >
                    <span>📊 Total Score (High-Low)</span>
                    <span className="text-gray-400">→</span>
                  </button>
                  <button
                    onClick={() => {
                      sortStudents('studentId', 'asc');
                      setShowSortModal(false);
                    }}
                    className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm"
                  >
                    <span>🆔 Student ID (A-Z)</span>
                    <span className="text-gray-400">→</span>
                  </button>
                </div>
              </div>
              
              {/* Current Sort Status */}
              {sortConfig.key && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700 text-sm">
                    <span>✅ Currently sorted by:</span>
                    <strong>
                      {sortConfig.key === 'alphabetical' ? 'Full Name' : 
                      sortConfig.key === 'firstName' ? 'First Name' :
                      sortConfig.key === 'lastName' ? 'Last Name' :
                      sortConfig.key === 'total' ? 'Total Score' :
                      sortConfig.key === 'studentId' ? 'Student ID' : sortConfig.key}
                    </strong>
                    <span>({sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'})</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSortModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📁 PROFESSIONAL IMPORT MODAL */}
      {showImportModal && (
        <div 
          className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImportModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[75vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Import CSV File</h2>
                  <p className="text-sm text-slate-600">Upload student data to update your class records</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-slate-900 mb-1">Choose a CSV file</h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Drag and drop your CSV file here, or click to browse
                    </p>
                    <label className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Browse Files
                      <input type="file" accept=".csv" className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Format Requirements */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">CSV Format Requirements</h4>
                    <ul className="text-sm text-blue-800 space-y-0.5">
                      <li>• First row should contain column headers</li>
                      <li>• Include columns: Last Name, First Name, Student ID</li>
                      <li>• Additional columns will be imported as grade columns</li>
                      <li>• Use comma (,) as separator</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Import Options */}
              <div className="space-y-3">
                <h4 className="font-medium text-slate-900">Import Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                    <input type="radio" name="importMode" value="merge" defaultChecked className="text-blue-600" />
                    <div>
                      <div className="font-medium text-slate-900">Merge with existing</div>
                      <div className="text-sm text-slate-600">Update existing students, add new ones</div>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                    <input type="radio" name="importMode" value="replace" className="text-blue-600" />
                    <div>
                      <div className="font-medium text-slate-900">Replace all data</div>
                      <div className="text-sm text-slate-600">Clear existing data and import new</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
              <div className="text-sm text-slate-600">
                Supported format: CSV files only
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg hover:opacity-90 transition-opacity font-medium shadow-lg"
                  disabled
                >
                  Import Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassRecordExcel;