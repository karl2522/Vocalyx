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

  const { isListening, transcript, startListening, stopListening, isSupported, clearTranscript } = useVoiceRecognition();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastVoiceCommand, setLastVoiceCommand] = useState('');
  const [selectedRow, setSelectedRow] = useState(0);

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


  const handleSmartNameGradeEntryVoice = (data) => {
  console.log('🎯 Smart name search for:', data);
  
  const targetRowIndex = findStudentRowSmart(tableData, data.searchName);
  
  if (targetRowIndex !== -1) {
    handleCellChange(targetRowIndex, data.column, data.value);
    setSelectedRow(targetRowIndex);
    const student = tableData[targetRowIndex];
    toast.success(`✅ ${student['First Name']} ${student['Last Name']} - ${data.column}: ${data.value}`);
    if (voiceEnabled) {
      speakText(`Updated ${data.column} to ${data.value} for ${student['First Name']} ${student['Last Name']}`);
    }
  } else {
    toast.error(`Student "${data.searchName}" not found`);
    if (voiceEnabled) {
      speakText(`Student ${data.searchName} not found`);
    }
  }
};

  const handleVoiceCommand = (transcript) => {
  if (!transcript.trim()) return;

  console.log('Voice command received:', transcript);
  
  const command = parseVoiceCommand(transcript, headers, tableData);
  
  console.log('Parsed command:', command);
  
  switch (command.type) {
    case 'ADD_STUDENT':
      console.log('Executing ADD_STUDENT');
      handleAddStudentVoice(command.data);
      break;
    case 'GRADE_ENTRY':
      console.log('Executing GRADE_ENTRY');
      handleGradeEntryVoice(command.data);
      break;
    case 'ROW_GRADE_ENTRY':
      console.log('Executing ROW_GRADE_ENTRY');
      handleRowGradeEntryVoice(command.data);
      break;
    case 'NAME_GRADE_ENTRY':
      console.log('Executing NAME_GRADE_ENTRY');
      handleNameGradeEntryVoice(command.data);
      break;
    case 'SMART_NAME_GRADE_ENTRY': // New case
      console.log('Executing SMART_NAME_GRADE_ENTRY');
      handleSmartNameGradeEntryVoice(command.data);
      break;
    case 'QUICK_GRADE_ENTRY':
      console.log('Executing QUICK_GRADE_ENTRY');
      handleQuickGradeEntryVoice(command.data);
      break;
    default:
      console.log('Command not recognized:', command);
      toast.error(`🎙️ Command not recognized: "${transcript}"`);
      if (voiceEnabled) {
        speakText(`Sorry, I didn't understand that command. Please try again.`);
      }
  }
};

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
              onClick={handleExport}
              className="flex items-center space-x-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <span>• "Last name Capuras first name Vaness Quiz 1 twenty"</span>
              <span>• "John Doe Quiz 2 eighty-five"</span>
              <span>• "Row 5 Midterm ninety-two"</span>
              <span>• "Add student Maria Santos ID 12345"</span>
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

      {/* Voice Recording Tip */}
      {isRecording && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2">
          <p className="text-sm text-red-700 animate-pulse">
            🎙️ <strong>Recording:</strong> Say "John Doe Quiz 1 85" to add grades, or "Add student Mary Smith ID 12345"
          </p>
        </div>
      )}

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
                    <tr key={rowIndex} className="hover:bg-gray-50">
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