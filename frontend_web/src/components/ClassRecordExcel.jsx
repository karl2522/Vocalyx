import { AlertCircle, ArrowLeft, ChevronDown, Download, Edit2, FileSpreadsheet, HelpCircle, Mic, MicOff, MoreVertical, Plus, RotateCcw, RotateCw, Save, Target, Upload, Users, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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

  const [batchMode, setBatchMode] = useState(false);

  // 🔥 NEW: Duplicate handling state
  const [duplicateOptions, setDuplicateOptions] = useState(null);

  // 🔥 NEW: Dropdown state management
  const [dropdowns, setDropdowns] = useState({
    tools: false,
    voice: false,
    edit: false
  });

  // 🔥 NEW: Voice guide modal state
  const [showVoiceGuide, setShowVoiceGuide] = useState(false);

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
    fetchClassRecord();
  }, [id]);

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
    
    // 🔥 REMOVE THIS DISABLED MESSAGE:
    // toast.error(`🎙️ Voice commands are temporarily disabled. Please use the Google Sheets interface directly.`);
    // if (voiceEnabled) {
    //   speakText('Voice commands are temporarily disabled. Please use the Google Sheets interface directly.');
    // }

    // 🔥 ADD THIS INSTEAD:
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
                  
                  {/* 🔥 NEW: Auto-number option */}
                  <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    Sheet Tools
                  </div>
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