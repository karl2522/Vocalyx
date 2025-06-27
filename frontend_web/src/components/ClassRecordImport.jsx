import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, Mic, MicOff, Volume2, VolumeX, Save } from 'lucide-react';
import { classRecordService } from '../services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import useVoiceRecognition from '../utils/useVoiceRecognition';
import { parseVoiceCommand, findStudentRowSmart } from '../utils/voicecommandParser';
import { speakText, stopSpeaking } from '../utils/speechSynthesis';
import axios from 'axios';

const ClassRecordImport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classRecord, setClassRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isFileLoaded, setIsFileLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Voice recognition
  const { isListening, transcript, startListening, stopListening, isSupported, clearTranscript } = useVoiceRecognition();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastVoiceCommand, setLastVoiceCommand] = useState('');
  const [selectedRow, setSelectedRow] = useState(0);

  useEffect(() => {
    fetchClassRecord();
  }, [id]);

  // Voice command processing
  useEffect(() => {
    if (transcript && !isListening && transcript !== lastVoiceCommand) {
      handleVoiceCommand(transcript);
      setLastVoiceCommand(transcript);
      setTimeout(() => {
        clearTranscript();
      }, 3000);
    }
  }, [transcript, isListening, lastVoiceCommand, clearTranscript]);

  useEffect(() => {
    const loadExistingData = async () => {
        if (classRecord) {
        try {
            const response = await classRecordService.getImportedExcel(id);
            
            if (response.data.status === 'success' && response.data.is_excel_imported) {
            // Load existing Excel data
            setHeaders(response.data.headers);
            setTableData(response.data.data);
            setFileName(response.data.fileName);
            setIsFileLoaded(true);
            toast.success('Existing Excel data loaded!');
            }
        } catch (error) {
            console.log('No existing Excel data found');
        }
        }
    };

    loadExistingData();
    }, [classRecord, id]);

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

  const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  setFileName(file.name);
  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length === 0) {
        toast.error('The Excel file appears to be empty');
        return;
      }

      const fileHeaders = jsonData[0];
      setHeaders(fileHeaders);

      const rows = jsonData.slice(1).map((row, index) => {
        const rowObj = {};
        fileHeaders.forEach((header, colIndex) => {
          rowObj[header] = row[colIndex] || '';
        });
        return rowObj;
      });

      setTableData(rows);
      setIsFileLoaded(true);

      await classRecordService.saveImportedExcel(id, {
        headers: fileHeaders,
        data: rows,
        fileName: file.name
      });

      toast.success(`✅ Excel file loaded and saved! ${rows.length} rows imported`);
      
      if (voiceEnabled) {
        speakText(`Excel file loaded successfully with ${rows.length} rows of data`);
      }
    } catch (error) {
      console.error('Error reading Excel file:', error);
      toast.error('Failed to read Excel file. Please check the format.');
    }
  };

  reader.readAsArrayBuffer(file);
};

  const handleVoiceCommand = (transcript) => {
    if (!transcript.trim()) return;
    if (!isFileLoaded) {
      toast.error('Please import an Excel file first');
      return;
    }

    console.log('Voice command received:', transcript);
    
    const command = parseVoiceCommand(transcript, headers, tableData);
    console.log('Parsed command:', command);
    
    switch (command.type) {
      case 'SMART_NAME_GRADE_ENTRY':
        handleSmartNameGradeEntryVoice(command.data);
        break;
      case 'ROW_GRADE_ENTRY':
        handleRowGradeEntryVoice(command.data);
        break;
      case 'QUICK_GRADE_ENTRY':
        handleQuickGradeEntryVoice(command.data);
        break;
      default:
        toast.error(`🎙️ Command not recognized: "${transcript}"`);
        if (voiceEnabled) {
          speakText(`Sorry, I didn't understand that command. Please try again.`);
        }
    }
  };

  const handleSmartNameGradeEntryVoice = (data) => {
    const targetRowIndex = findStudentRowSmart(tableData, data.searchName);
    
    if (targetRowIndex !== -1) {
      // Check if the column exists in our imported data
      if (!headers.includes(data.column)) {
        toast.error(`Column "${data.column}" not found in imported Excel file`);
        if (voiceEnabled) {
          speakText(`Column ${data.column} not found in the imported file`);
        }
        return;
      }

      handleCellChange(targetRowIndex, data.column, data.value);
      setSelectedRow(targetRowIndex);
      const student = tableData[targetRowIndex];
      const studentName = Object.values(student).filter(v => v && typeof v === 'string').slice(0, 2).join(' ');
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

  const handleRowGradeEntryVoice = (data) => {
    if (data.rowIndex >= 0 && data.rowIndex < tableData.length) {
      if (!headers.includes(data.column)) {
        toast.error(`Column "${data.column}" not found in imported Excel file`);
        return;
      }

      handleCellChange(data.rowIndex, data.column, data.value);
      setSelectedRow(data.rowIndex);
      toast.success(`✅ Row ${data.rowIndex + 1} - ${data.column}: ${data.value}`);
      if (voiceEnabled) {
        speakText(`Updated row ${data.rowIndex + 1} ${data.column} to ${data.value}`);
      }
    } else {
      toast.error('Invalid row number');
    }
  };

  const handleQuickGradeEntryVoice = (data) => {
    if (selectedRow >= 0 && selectedRow < tableData.length) {
      if (!headers.includes(data.column)) {
        toast.error(`Column "${data.column}" not found in imported Excel file`);
        return;
      }

      handleCellChange(selectedRow, data.column, data.value);
      const student = tableData[selectedRow];
      const studentName = Object.values(student).filter(v => v && typeof v === 'string').slice(0, 2).join(' ') || `Row ${selectedRow + 1}`;
      toast.success(`✅ ${studentName} - ${data.column}: ${data.value}`);
      if (voiceEnabled) {
        speakText(`Updated ${data.column} to ${data.value} for ${studentName}`);
      }
    } else {
      toast.error('Please select a row first');
    }
  };

 const handleCellChange = async (rowIndex, column, value) => {
  const newData = [...tableData];
  newData[rowIndex][column] = value;
  setTableData(newData);

  try {
    await classRecordService.updateImportedExcel(id, newData);
  } catch (error) {
    console.error('Auto-save failed:', error);
  }
};

  const handleVoiceRecord = () => {
    if (!isSupported) {
      toast.error('Speech recognition is not supported in your browser');
      return;
    }

    if (!isFileLoaded) {
      toast.error('Please import an Excel file first');
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

    const handleSave = async () => {
    if (!isFileLoaded) {
        toast.error('No data to save. Please import an Excel file first.');
        return;
    }

    try {
        setIsSaving(true);
        await classRecordService.updateImportedExcel(id, tableData);
        toast.success('Data saved successfully!');
    } catch (error) {
        console.error('Error saving:', error);
        toast.error('Failed to save data');
    } finally {
        setIsSaving(false);
    }
    };

  const handleExport = () => {
    if (!isFileLoaded) {
      toast.error('No data to export');
      return;
    }

    try {
      const ws = XLSX.utils.json_to_sheet(tableData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, `${classRecord.name}_updated.xlsx`);
      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export data');
    }
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
              <h1 className="text-xl font-semibold text-gray-800">{classRecord?.name} - Excel Import</h1>
              <p className="text-sm text-gray-600">
                {classRecord?.semester} • Import your own Excel file and use voice commands
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {isFileLoaded && (
              <>
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
                  <span>{isSaving ? 'Saving...' : 'Save Data'}</span>
                </button>

                <button
                  onClick={handleExport}
                  className="flex items-center space-x-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Voice Status Bar */}
      {isSupported && isFileLoaded && (
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
      {isListening && isFileLoaded && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">🎙️ Voice Commands for Your Excel Data:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <span>• "StudentName ColumnName Score" (e.g., "John Math 95")</span>
              <span>• "Row 5 English 88"</span>
              <span>• Available columns: {headers.slice(0, 5).join(', ')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {!isFileLoaded ? (
          /* File Upload Section */
          <div className="max-w-2xl mx-auto mt-12 p-8">
            <div className="bg-white rounded-lg shadow-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Import Your Excel File</h3>
              <p className="text-gray-600 mb-6">
                Upload your existing Excel file to use with voice commands. Supported formats: .xlsx, .xls
              </p>
              
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors inline-flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span>Choose Excel File</span>
                </div>
              </label>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="text-left">
                    <h4 className="font-medium text-blue-800">Voice Commands Work With Your Data!</h4>
                    <p className="text-sm text-blue-600 mt-1">
                      Once uploaded, you can use voice commands like "John Math 95" or "Row 5 English 88" 
                      based on your Excel column names.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Excel Data Table */
          <div className="p-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <h3 className="font-medium text-gray-800">File Loaded: {fileName}</h3>
                    <p className="text-sm text-gray-600">{tableData.length} rows • {headers.length} columns</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Columns: {headers.join(', ')}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      {headers.map((header, index) => (
                        <th
                          key={index}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.map((row, rowIndex) => (
                      <tr 
                        key={rowIndex} 
                        className={`hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
                          selectedRow === rowIndex ? 'bg-blue-50 border-l-4 border-blue-500 shadow-sm' : ''
                        }`}
                        onClick={() => setSelectedRow(rowIndex)}
                      >
                        {headers.map((header, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-4 py-2 text-sm border-r border-gray-100 last:border-r-0"
                          >
                            <input
                              type="text"
                              value={row[header] || ''}
                              onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                              onFocus={() => setSelectedRow(rowIndex)}
                              className="w-full border-none outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 transition-all"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassRecordImport;