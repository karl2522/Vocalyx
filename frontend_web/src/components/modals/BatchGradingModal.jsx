import { Mic, Pause, Play, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import BatchEntryItem from '../BatchEntryItem';

const BatchGradingModal = ({
  showBatchModal,
  currentBatchColumn,
  setCurrentBatchColumn,
  headers,
  isListening,
  startListening,
  batchEntries,
  setBatchEntries,
  isProcessingBatch,
  cancelBatchMode,
  executeBatchEntries,
  processBatchEntry,
  currentSheet,
  classRecord,
  classRecordService,
  setBatchSheetData,
  stopListening,
  transcript
}) => {
  const transcriptEndRef = useRef(null);
  const [desiredListening, setDesiredListening] = useState(false); // user-intended On/Off
  const [readiness, setReadiness] = useState('idle'); // idle | readying | ready
  const [isToggling, setIsToggling] = useState(false); // 200ms debounce
  const prevEntriesLenRef = useRef(batchEntries?.length || 0);

  // Auto-scroll to newest entry when a new batch entry is appended
  useEffect(() => {
    const prevLen = prevEntriesLenRef.current;
    const currLen = batchEntries?.length || 0;
    if (currLen > prevLen) {
      // Wait for DOM to paint then scroll the sentinel into view
      setTimeout(() => {
        try {
          transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } catch {}
      }, 30);
    }
    prevEntriesLenRef.current = currLen;
  }, [batchEntries]);

  // Cleanup on modal close/unmount (must be before any early return to keep hook order stable)
  useEffect(() => {
    return () => {
      try {
        window.batchDesiredListening = false;
        stopListening();
      } catch {}
    };
  }, [stopListening]);

  if (!showBatchModal) return null;

  const handleEditEntry = (entryId, newScore) => {
    console.log('🔥 EDIT ENTRY:', entryId, 'New score:', newScore);
    const entry = batchEntries.find(e => e.id === entryId);
    setBatchEntries(prev =>
      prev.map(e =>
        e.id === entryId
          ? { ...e, score: newScore.toString() }
          : e
      )
    );
    toast.success(`Updated ${entry?.studentName}'s score to ${newScore}`);
  };

  const handleDeleteEntry = (entryId) => {
    console.log('🔥 DELETE ENTRY:', entryId);
    const entryToDelete = batchEntries.find(e => e.id === entryId);
    setBatchEntries(prev => prev.filter(e => e.id !== entryId));
    toast.success(`Removed ${entryToDelete?.studentName || 'entry'} from batch`);
  };

  const handleRetryEntry = (entryId, originalInput) => {
    console.log('🔥 RETRY ENTRY:', entryId, originalInput);
    setBatchEntries(prev => prev.filter(e => e.id !== entryId));
    setTimeout(() => {
      const match = originalInput.match(/^(.+?)\s+(\d+(?:\.\d+)?)[)\].,!?:;-]*$/);
      if (match) {
        const [, studentName, score] = match;
        const cleanedScore = score.trim().replace(/[)\].,!?:;-]+$/g, '');
        processBatchEntry(studentName.trim(), cleanedScore);
      }
    }, 100);
  };

  const handleColumnSelect = async (header) => {
    console.log('🔥 COLUMN SELECT: 🎯 Column selected:', header);
    setCurrentBatchColumn(header);
    window.batchModeActive = true;
    window.batchModeFinishing = false;
    setReadiness('readying');

    // 🔥 SPEED OPTIMIZATION: Cache sheet data for entire batch session
    console.log('🔥 CACHING: Loading sheet data for batch session...');
    toast('Loading student data for batch session...');

    try {
      let sheetsResponse;
      if (currentSheet) {
        console.log('🔥 DEBUG: Using getSpecificSheetData for sheet:', currentSheet.sheet_name);
        sheetsResponse = await classRecordService.getSpecificSheetData(
          classRecord.google_sheet_id,
          currentSheet.sheet_name,
          { force_refresh: true }  // 🔥 FIX: Force refresh to bypass cache
        );
      } else {
        console.log('🔥 DEBUG: Using getGoogleSheetsDataServiceAccount for default sheet');
        sheetsResponse = await classRecordService.getGoogleSheetsDataServiceAccount(
          classRecord.google_sheet_id
        );
      }

      // 🔥 DEBUG: Log the complete API response
      console.log('🔥 DEBUG: Complete API Response:', sheetsResponse);
      console.log('🔥 DEBUG: Response data:', sheetsResponse.data);
      console.log('🔥 DEBUG: Success status:', sheetsResponse.data?.success);
      console.log('🔥 DEBUG: Headers:', sheetsResponse.data?.headers);
      console.log('🔥 DEBUG: TableData type:', typeof sheetsResponse.data?.tableData);
      console.log('🔥 DEBUG: TableData value:', sheetsResponse.data?.tableData);
      console.log('🔥 DEBUG: Is tableData array?', Array.isArray(sheetsResponse.data?.tableData));

      if (!sheetsResponse.data?.success) {
        throw new Error('Could not load student data');
      }

      // 🔥 FIX: Add proper validation for tableData and headers
      if (!sheetsResponse.data.tableData || !Array.isArray(sheetsResponse.data.tableData)) {
        console.error('🔥 CACHING: ❌ tableData is missing or not an array:', sheetsResponse.data.tableData);
        throw new Error('Student data is not available in the expected format');
      }

      if (!sheetsResponse.data.headers || !Array.isArray(sheetsResponse.data.headers)) {
        console.error('🔥 CACHING: ❌ headers is missing or not an array:', sheetsResponse.data.headers);
        throw new Error('Column headers are not available');
      }

      const convertedTableData = sheetsResponse.data.tableData.map((row, originalIndex) => {
        const rowObject = {};
        sheetsResponse.data.headers.forEach((header, index) => {
          rowObject[header] = row[index] || '';
        });

        // 🔥 CRITICAL: Preserve the original index for accurate row tracking
        rowObject._originalTableIndex = originalIndex;

        return rowObject;
      });

      setBatchSheetData(convertedTableData);
      console.log('🔥 CACHING: ✅ Sheet data cached for batch session');
      console.log('🔥 CACHING: 📊 Cached', convertedTableData.length, 'student records');

      toast.success(`Column set to: ${header}. Ready to record! 🎤`);

      // One-time auto-start after "Voice ready"
      console.log('🔥 COLUMN SELECT: 🎤 Starting voice recognition (with TTS)...');
      setReadiness('ready');
      setDesiredListening(true);
      window.batchDesiredListening = true;
      if (!isListening) {
        startListening(false); // speaks "Voice ready"
      }

    } catch (error) {
      console.error('🔥 CACHING: ❌ Error loading data:', error);
      toast.error('Failed to load student data for batch session');
      setBatchSheetData(null);
    }
  };

  const handleToggleVoice = () => {
    if (isToggling) return;
    setIsToggling(true);
    setTimeout(() => setIsToggling(false), 200);

    if (desiredListening) {
      // Pause
      setDesiredListening(false);
      window.batchDesiredListening = false;
      try {
        stopListening();
      } finally {
        // Voice paused - TTS removed
      }
    } else {
      // Resume
      setDesiredListening(true);
      window.batchDesiredListening = true;
      try {
        startListening(true); // silent resume
      } finally {
        // Voice resumed - TTS removed
      }
    }
  };

  const handleShowAverage = () => {
    const validEntries = batchEntries.filter(e => e.status === 'found');
    if (validEntries.length > 0) {
      const avgScore = Math.round(validEntries.reduce((sum, e) => sum + parseFloat(e.score), 0) / validEntries.length);
      toast(`Average score: ${avgScore}%`);
    }
  };

  const handleRemoveNotFound = () => {
    const notFoundEntries = batchEntries.filter(e => e.status === 'not_found');
    setBatchEntries(prev => prev.filter(e => e.status === 'found'));
    toast.success(`Removed ${notFoundEntries.length} not found entries`);
  };

  const handleClearAll = () => {
    setBatchEntries([]);
    toast('Cleared all entries');
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        console.log('🔥 MODAL BACKGROUND: Click prevented');
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Local spinner keyframes to ensure rotation even if global motion settings reduce animations */}
      <style>{`
        @keyframes loader-spin { to { transform: rotate(360deg); } }
      `}</style>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] md:h-[75vh] max-h-[90vh] overflow-hidden flex flex-col"
        onMouseDown={(e) => {
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
        <div className="flex-1 overflow-hidden flex flex-col relative">
          {!currentBatchColumn ? (
            /* Column Selection */
            <div className="p-6 overflow-y-auto">
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
                  {headers.filter(h => {
                    // Normalize header for case-insensitive comparison
                    const normalizedHeader = h.trim().toUpperCase();
                    
                    // Exclude student info columns (case-insensitive)
                    const excludedColumns = ['NO.', 'LASTNAME', 'FIRST NAME', 'STUDENT ID', 'MIDDLE NAME', 'TOTAL'];
                    if (excludedColumns.some(col => normalizedHeader === col.toUpperCase())) return false;
                    
                    // Exclude columns with percentage symbol (%)
                    if (h.includes('%')) return false;
                    
                    return true;
                  }).map(header => (
                    <button
                      key={header}
                      onClick={() => handleColumnSelect(header)}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-800 px-4 py-3 rounded-lg transition-colors border border-purple-200 font-medium"
                    >
                      {header}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Batch Entries Display */
            <div className="flex flex-col h-full">
              {/* Quick Actions Bar */}
              {batchEntries.length > 0 && (
                <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>Quick Actions:</span>
                    <button
                      onClick={handleShowAverage}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                    >
                      📊 Show Average
                    </button>
                    <button
                      onClick={handleRemoveNotFound}
                      disabled={batchEntries.filter(e => e.status === 'not_found').length === 0}
                      className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 disabled:opacity-50"
                    >
                      🗑️ Remove Not Found
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium text-purple-700">{batchEntries.filter(e => e.status === 'found').length} valid</span>
                    <span className="mx-1">•</span>
                    <span className="text-red-600">{batchEntries.filter(e => e.status === 'not_found').length} not found</span>
                  </div>
                </div>
              )}

              {/* Entries List */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                {batchEntries.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                    <div className="mb-8">
                      <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${desiredListening ? 'bg-purple-100 animate-pulse' : 'bg-slate-100'}`}>
                        <Mic className={`w-10 h-10 ${desiredListening ? 'text-purple-600' : 'text-slate-400'}`} />
                      </div>
                      <h3 className="text-xl font-medium text-slate-900 mb-2">
                        {desiredListening ? 'Listening...' : 'Ready to Record'}
                      </h3>
                      <p className="text-slate-500 max-w-xs mx-auto">
                        Say "Student Name + Score" (e.g., "Capuras 85")
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3"> {/* Padding bottom for sticky footer */}
                    {batchEntries.map((entry, index) => (
                      <BatchEntryItem
                        key={entry.id}
                        entry={entry}
                        index={index}
                        onEdit={handleEditEntry}
                        onDelete={handleDeleteEntry}
                        onRetry={handleRetryEntry}
                      />
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                )}
              </div>

              {/* 🔥 NEW: Voice Interaction Footer (Sticky) */}
              <div className="border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
                {/* Real-Time Transcript Section */}
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50">
                  {transcript && transcript.trim() ? (
                    /* Show transcript when available */
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="text-xs text-slate-500 mb-1">You said:</div>
                      <div className="text-slate-800 font-medium leading-relaxed">
                        "{transcript}"
                      </div>
                    </div>
                  ) : (
                    /* Show listening state when no transcript */
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></div>
                      <span className="text-sm text-slate-600">
                        {isListening ? 'Speak now...' : 'Ready to listen'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Controls Area */}
                <div className="px-6 py-4 flex items-center justify-between bg-white">
                  <div className="flex items-center space-x-4">
                    {/* Play/Pause Button */}
                    <button
                      onClick={handleToggleVoice}
                      disabled={isToggling || readiness === 'readying'}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                        desiredListening
                          ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                          : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {desiredListening ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          <span>Pause Voice</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Resume Voice</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setCurrentBatchColumn('')}
                      className="text-sm text-slate-500 hover:text-slate-800 font-medium underline decoration-slate-300 hover:decoration-slate-800 underline-offset-2 transition-all"
                    >
                      Change Column
                    </button>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleClearAll}
                      disabled={batchEntries.length === 0}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      Clear All
                    </button>

                    <div className="h-8 w-px bg-slate-200 mx-2"></div>

                    <button
                      onClick={cancelBatchMode}
                      className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeBatchEntries}
                      disabled={batchEntries.filter(e => e.status === 'found').length === 0 || isProcessingBatch}
                      className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center space-x-2 shadow-sm transition-all"
                    >
                      {isProcessingBatch ? (
                        <>
                          <span className="relative inline-block w-4 h-4" aria-hidden="true">
                            <span
                              className="absolute inset-0 rounded-full border-2 border-white/70 border-t-transparent animate-[loader-spin_0.8s_linear_infinite]"
                              style={{ animation: 'loader-spin 0.8s linear infinite' }}
                            ></span>
                          </span>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchGradingModal;

// Prop types validation
BatchGradingModal.propTypes = {
  showBatchModal: PropTypes.bool.isRequired,
  currentBatchColumn: PropTypes.string,
  setCurrentBatchColumn: PropTypes.func.isRequired,
  headers: PropTypes.arrayOf(PropTypes.string).isRequired,
  isListening: PropTypes.bool,
  startListening: PropTypes.func.isRequired,
  batchEntries: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    studentName: PropTypes.string,
    score: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    status: PropTypes.string
  })).isRequired,
  setBatchEntries: PropTypes.func.isRequired,
  isProcessingBatch: PropTypes.bool,
  cancelBatchMode: PropTypes.func.isRequired,
  executeBatchEntries: PropTypes.func.isRequired,
  processBatchEntry: PropTypes.func.isRequired,
  currentSheet: PropTypes.object,
  classRecord: PropTypes.object,
  classRecordService: PropTypes.object,
  setBatchSheetData: PropTypes.func.isRequired,
  stopListening: PropTypes.func.isRequired,
  transcript: PropTypes.string
};

BatchGradingModal.defaultProps = {
  currentBatchColumn: '',
  isListening: false,
  isProcessingBatch: false,
  currentSheet: null,
  classRecord: null,
  classRecordService: null,
  transcript: ''
};