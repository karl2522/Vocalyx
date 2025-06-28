import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Mic, MicOff, Download, Users, Plus, X, Edit2, Volume2, VolumeX} from 'lucide-react';
import { classRecordService } from '../services/api';
import toast from 'react-hot-toast';
import useVoiceRecognition from '../utils/useVoiceRecognition';
import { parseVoiceCommand, findStudentRow, findEmptyRow, findStudentRowSmart} from '../utils/voicecommandParser';
import { speakText, stopSpeaking } from '../utils/speechSynthesis';

const ClassRecordExcel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classRecord, setClassRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [customColumns, setCustomColumns] = useState({});
  const [headers, setHeaders] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

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
    setAccuracyLevel: setVoiceAccuracy,
    alternatives,
    buildContextDictionary,
    contextWords
  } = useVoiceRecognition();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastVoiceCommand, setLastVoiceCommand] = useState('');
  const [selectedRow, setSelectedRow] = useState(0);

  const [commandHistory, setCommandHistory] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [accuracyLevel, setAccuracyLevel] = useState('medium');

  const [batchMode, setBatchMode] = useState(false);
  const [batchEntries, setBatchEntries] = useState([]);
  const [currentBatchColumn, setCurrentBatchColumn] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);

  const [trainingMode, setTrainingMode] = useState(false);
  const [trainingPhrases] = useState([
    "Maria Quiz 1 eighty-five",
    "John Lab 2 ninety",
    "Sarah Midterm seventy-five",
    "Michael Final Exam ninety-two"
  ]);

  // 🔥 NEW: Duplicate handling state
  const [duplicateOptions, setDuplicateOptions] = useState(null);
  const [pendingCommand, setPendingCommand] = useState(null);

  // Column management state
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newColumnName, setNewColumnName] = useState('');

  useEffect(() => {
    if (transcript && !isListening && transcript !== lastVoiceCommand) {
      handleVoiceCommand(transcript);
      setLastVoiceCommand(transcript);
      // Clear transcript after processing
      setTimeout(() => {
        clearTranscript();
      }, 3000);
    }
  }, [transcript, isListening, lastVoiceCommand, clearTranscript]);

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
    setTrainingMode(true);
    toast.success('🎯 Voice training started! Speak the phrases clearly.');
  };

  const handleAccuracyChange = (level) => {
    setAccuracyLevel(level);
    setVoiceAccuracy(level);
    toast.success(`Voice accuracy set to ${level}`);
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

  const saveStateForUndo = () => {
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(tableData))].slice(-10));
    setRedoStack([]); // Clear redo stack when new action is performed
  };

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

     const contextCorrectedTranscript = applyContextPhoneticCorrections(
      transcript, 
      contextWords
    );

    console.log('🧠 Context corrected:', contextCorrectedTranscript);

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
    
    toast.success('🎯 Batch Mode activated! Say a column name first (e.g., "Quiz 1")');
    if (voiceEnabled) {
      speakText('Batch mode activated. Say a column name first, like Quiz 1');
    }
  };

  const handleBatchVoiceCommand = (transcript) => {
  if (!transcript.trim()) return;

  console.log('🎯 Batch voice command:', transcript);
  
  // If no column is set, try to detect column name
  if (!currentBatchColumn) {
    const detectedColumn = headers.find(header => 
      transcript.toLowerCase().includes(header.toLowerCase()) ||
      header.toLowerCase().includes(transcript.toLowerCase())
    );
    
    if (detectedColumn) {
      setCurrentBatchColumn(detectedColumn);
      toast.success(`✅ Column set to: ${detectedColumn}. Now say student names and scores!`);
      if (voiceEnabled) {
        speakText(`Column set to ${detectedColumn}. Now say student names and scores like Maria 85`);
      }
      return;
    } else {
      toast.error('Column not found. Please say a valid column name.');
      return;
    }
  }
  
  // Parse student name and score: "Maria 85"
  const studentScorePattern = /^(.+?)\s+(\d+)$/;
    const match = transcript.trim().match(studentScorePattern);
    
    if (match) {
      const studentName = match[1].trim();
      const score = match[2];
      
      // Check if student exists
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
          
          setBatchEntries(prev => [...prev, newEntry]);
          
          toast.success(`✅ Added ${fullName}: ${score}`);
          if (voiceEnabled) {
            speakText(`Added ${fullName} with score ${score}`);
          }
        }
      } else {
        toast.error(`❌ Student "${studentName}" not found`);
        if (voiceEnabled) {
          speakText(`Student ${studentName} not found`);
        }
      }
    } else {
      // Check for control commands
      if (transcript.toLowerCase().includes('done') || transcript.toLowerCase().includes('finish')) {
        if (batchEntries.length > 0) {
          executeBatchEntries();
        } else {
          toast.error('No entries to save');
        }
      } else if (transcript.toLowerCase().includes('clear') || transcript.toLowerCase().includes('reset')) {
        setBatchEntries([]);
        toast.success('Batch entries cleared');
      } else {
        toast.error('Say student name and score (e.g., "Maria 85") or "done" to finish');
      }
    }
  };

  const executeBatchEntries = () => {
    if (batchEntries.length === 0) return;
    
    saveStateForUndo();
    
    const newData = [...tableData];
    let successCount = 0;
    
    batchEntries.forEach(entry => {
      if (entry.status === 'ready' || entry.status === 'updated') {
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
        }
        
        successCount++;
        addRecentStudent(entry.studentName);
      }
    });
    
    setTableData(newData);
    
    // Close batch mode
    setBatchMode(false);
    setShowBatchModal(false);
    setBatchEntries([]);
    setCurrentBatchColumn('');
    
    toast.success(`🎉 Batch completed! Updated ${successCount} students in ${currentBatchColumn}`);
    if (voiceEnabled) {
      speakText(`Batch completed. Updated ${successCount} students in ${currentBatchColumn}`);
    }
  };

  const cancelBatchMode = () => {
    setBatchMode(false);
    setShowBatchModal(false);
    setBatchEntries([]);
    setCurrentBatchColumn('');
    
    toast.info('Batch mode cancelled');
    if (voiceEnabled) {
      speakText('Batch mode cancelled');
    }
  };

  const removeBatchEntry = (index) => {
    setBatchEntries(prev => prev.filter((_, i) => i !== index));
  };

  const getColumnColor = (column) => {
    if (customColumns.student_info?.includes(column)) return 'bg-blue-50';
    if (customColumns.quizzes?.includes(column)) return 'bg-green-50';
    if (customColumns.labs?.includes(column)) return 'bg-orange-50';
    if (customColumns.exams?.includes(column)) return 'bg-red-50';
    if (customColumns.calculations?.includes(column)) return 'bg-purple-50';
    return 'bg-white';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard/class-records/view')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Records</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">{classRecord?.name}</h1>
              <p className="text-sm text-gray-600">
                {classRecord?.semester} • {classRecord?.teacher_name}
                {lastSaved && (
                  <span className="ml-2 text-gray-400">
                    • Last saved: {new Date(lastSaved).toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Accuracy Level Selector */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <span className="text-xs text-gray-600 px-2">Accuracy:</span>
              {['high', 'medium', 'low'].map((level) => (
                <button
                  key={level}
                  onClick={() => handleAccuracyChange(level)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    accuracyLevel === level
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>

            {/* Undo/Redo Buttons */}
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="flex items-center space-x-2 bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              title="Undo last action (or say 'undo')"
            >
              ↶ Undo
            </button>

            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="flex items-center space-x-2 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              title="Redo last action (or say 'redo')"
            >
              ↷ Redo
            </button>

            <button
              onClick={addNewStudent}
              className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Student</span>
            </button>

            <button
              onClick={() => setShowAddColumnModal(true)}
              className="flex items-center space-x-2 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Column</span>
            </button>

            <button
              onClick={toggleVoiceFeedback}
              className="flex items-center space-x-2 bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
              title={voiceEnabled ? 'Disable voice feedback' : 'Enable voice feedback'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={handleVoiceRecord}
              disabled={!isSupported}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isListening
                  ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isListening ? 'Stop Recording' : 'Voice Record'}</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>

            <button
              onClick={startBatchMode}
              className="flex items-center space-x-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
              title="Start batch grading mode"
            >
              <Users className="w-4 h-4" />
              <span>Batch Mode</span>
            </button>

            <button
              onClick={startVoiceTraining}
              className="flex items-center space-x-2 bg-purple-500 text-white px-3 py-2 rounded-lg hover:bg-purple-600 transition-colors"
              title="Train voice recognition"
            >
              <span>🎯</span>
              <span>Train Voice</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center space-x-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Voice Status Bar */}
      {isSupported && (
        <div className={`transition-all duration-300 ${
          isListening ? 'bg-gradient-to-r from-red-500 to-pink-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
        } text-white px-6 py-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isListening ? (
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                ) : (
                  <div className="w-3 h-3 bg-white bg-opacity-50 rounded-full"></div>
                )}
                <span className="font-medium">
                  {isListening ? '🎙️ Listening...' : '✅ Voice Commands Ready'}
                </span>
              </div>
              
              {transcript && (
                <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1 max-w-md">
                  <span className="text-sm truncate">"{transcript}"</span>
                </div>
              )}
            </div>

            <div className="text-sm bg-white bg-opacity-20 rounded-lg px-3 py-1">
              Selected Row: {selectedRow + 1}
            </div>
          </div>
        </div>
      )}

      {/* Voice Commands Help */}
      {isListening && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">🎙️ Voice Commands Examples:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div>
                <strong>Single:</strong>
                <br />• "Maria Quiz 3 twenty"
                <br />• "John Lab 2 eighty-five"
              </div>
              <div>
                <strong>Batch List:</strong>
                <br />• "Quiz 1: John 85, Maria 92, Carlos 88"
                <br />• "Lab 2: Alice 90, Bob 85"
              </div>
              <div>
                <strong>Batch Range:</strong>
                <br />• "Midterm: Row 1 through 5, all score 90"
                <br />• "Quiz 2: Everyone present gets 85"
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Browser Support Warning */}
      {!isSupported && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <p className="text-sm text-yellow-800">
            ⚠️ Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari for voice commands.
          </p>
        </div>
      )}

      {/* 🔥 NEW: Duplicate Selection UI */}
      {duplicateOptions && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-2">🤔 Multiple students found named "{duplicateOptions.searchName}":</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {duplicateOptions.matches.map((match, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded p-2 border border-amber-200">
                  <div>
                    <span className="font-medium">Option {index + 1}:</span> {match.student} (Row {match.index + 1})
                    {match.hasExistingScore && (
                      <span className="text-xs text-amber-600 ml-2">Current: {match.existingValue}</span>
                    )}
                    {!match.hasExistingScore && (
                      <span className="text-xs text-green-600 ml-2">Empty ✓</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDuplicateSelection(index + 1)}
                    className="bg-amber-500 text-white px-3 py-1 rounded text-xs hover:bg-amber-600 transition-colors"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs mt-2 text-amber-600">
              Say "option 1", "option 2", etc. or click Select buttons above. Say "cancel" to abort.
            </p>
          </div>
        </div>
      )}

      {/* Pending Confirmation UI */}
      {pendingConfirmation && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">🤔 Confirmation Required:</p>
            <p>Did you mean <strong>{pendingConfirmation.suggestedStudent}</strong>? Say "yes" to confirm or "no" to cancel.</p>
            {pendingConfirmation.alternatives.length > 0 && (
              <p className="text-xs mt-1">
                Other possibilities: {pendingConfirmation.alternatives.map(alt => alt.student).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Keep all your existing components... */}
      {/* Category Management Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-gray-600">Student Info ({customColumns.student_info?.length || 0})</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-600">Quizzes ({customColumns.quizzes?.length || 0})</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-gray-600">Labs ({customColumns.labs?.length || 0})</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-gray-600">Exams ({customColumns.exams?.length || 0})</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-gray-600">Calculations ({customColumns.calculations?.length || 0})</span>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            Total Columns: {headers.length} | Students: {tableData.filter(row => row['Last Name'] || row['First Name']).length}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] ${getColumnColor(header)} relative group`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{header}</span>
                          {!['No', 'Total', 'Grade'].includes(header) && (
                            <button
                              onClick={() => handleRemoveColumn(getCategoryFromColumn(header), header)}
                              className="opacity-0 group-hover:opacity-100 ml-2 text-red-500 hover:text-red-700 transition-opacity"
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
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData.map((row, rowIndex) => (
                    <tr 
                      key={rowIndex} 
                      className={`hover:bg-gray-50 ${
                        duplicateOptions?.matches.some(match => match.index === rowIndex) 
                          ? 'bg-amber-50 border-2 border-amber-300' 
                          : ''
                      }`}
                    >
                      {headers.map((header, colIndex) => (
                        <td
                          key={colIndex}
                          className={`px-4 py-2 text-sm ${getColumnColor(header)} border-r border-gray-100 last:border-r-0`}
                        >
                          {header === 'No' || header === 'Total' || header === 'Grade' ? (
                            <span className="text-gray-900 font-medium">{row[header]}</span>
                          ) : (
                            <input
                              type="text"
                              value={row[header] || ''}
                              onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                              className="w-full border-none outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 transition-all"
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

      {/* Batch Mode Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                🎯 Batch Grading Mode
                {currentBatchColumn && (
                  <span className="ml-2 text-blue-600">({currentBatchColumn})</span>
                )}
              </h2>
              <button
                onClick={cancelBatchMode}
                className="text-gray-400 hover:text-gray-600"
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

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Add New Column</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  <option value="quizzes">Quizzes</option>
                  <option value="labs">Lab Activities</option>
                  <option value="exams">Exams</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Column Name</label>
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddColumn}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add Column
              </button>
              <button
                onClick={() => {
                  setShowAddColumnModal(false);
                  setSelectedCategory('');
                  setNewColumnName('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassRecordExcel;