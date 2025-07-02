import React from 'react';
import { Users, X, Mic } from 'lucide-react';
import BatchEntryItem from '../BatchEntryItem';
import toast from 'react-hot-toast';

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
  processBatchEntry
}) => {
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
      const match = originalInput.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
      if (match) {
        const [, studentName, score] = match;
        processBatchEntry(studentName.trim(), score.trim());
      }
    }, 100);
  };

  const handleColumnSelect = (header) => {
    console.log('🔥 COLUMN SELECT: 🎯 Column selected:', header);
    setCurrentBatchColumn(header);
    window.batchModeActive = true;
    window.batchModeFinishing = false;
    console.log('🔥 COLUMN SELECT: 🚀 Set window.batchModeActive = true');
    console.log('🔥 COLUMN SELECT: 🚀 Set window.batchModeFinishing = false');
    toast.success(`Column set to: ${header}. Start speaking!`);
    
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
  };

  const handleRestartVoice = () => {
    console.log('🔥 DEBUG: Manual restart clicked');
    console.log('🔥 DEBUG: Current isListening:', isListening);
    if (!isListening && window.batchModeActive) {
      console.log('🔥 DEBUG: Starting voice recognition manually');
      startListening(true);
    }
  };

  const handleShowAverage = () => {
    const validEntries = batchEntries.filter(e => e.status === 'found');
    if (validEntries.length > 0) {
      const avgScore = Math.round(validEntries.reduce((sum, e) => sum + parseFloat(e.score), 0) / validEntries.length);
      toast.info(`Average score: ${avgScore}%`);
    }
  };

  const handleRemoveNotFound = () => {
    const notFoundEntries = batchEntries.filter(e => e.status === 'not_found');
    setBatchEntries(prev => prev.filter(e => e.status === 'found'));
    toast.success(`Removed ${notFoundEntries.length} not found entries`);
  };

  const handleClearAll = () => {
    setBatchEntries([]);
    toast.info('Cleared all entries');
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
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
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
                    onClick={() => handleColumnSelect(header)}
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
                    <button
                      onClick={handleRestartVoice}
                      className="px-3 py-1 bg-purple-200 text-purple-800 rounded text-xs hover:bg-purple-300 transition-colors"
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

              {/* Quick Actions Bar */}
              {batchEntries.length > 0 && (
                <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg border">
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
                    Total: {batchEntries.length} entries
                  </div>
                </div>
              )}

              {/* Entries List */}
              <div className="flex-1 overflow-auto">
                {batchEntries.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Mic className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg mb-2">Start speaking to add entries</p>
                    <p className="text-sm">Example: "Capuras 85", "Maria 92"</p>
                  </div>
                ) : (
                  <div className="space-y-3">
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
                    onClick={handleClearAll}
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
  );
};

export default BatchGradingModal;