// Update your OverrideConfirmationModal.jsx
import { AlertCircle, AlertTriangle } from "lucide-react";

const OverrideConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  studentName, 
  columnName, 
  currentScore, 
  newScore,
  isProcessing,
  maxScore 
}) => {
  if (!isOpen) return null;

  const exceedsMax = maxScore && parseFloat(newScore) > parseFloat(maxScore);
  const isValidScore = maxScore ? parseFloat(newScore) <= parseFloat(maxScore) : true;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            exceedsMax ? 'bg-red-100' : 'bg-yellow-100'
          }`}>
            {exceedsMax ? (
              <AlertTriangle className="h-6 w-6 text-red-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {exceedsMax ? 'Score Exceeds Maximum!' : 'Override Existing Score?'}
            </h3>
            <p className="text-sm text-gray-500">
              {exceedsMax 
                ? `Maximum score for ${columnName} is ${maxScore}`
                : 'This student already has a score'
              }
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 mb-2">{studentName}</p>
              <p className="text-sm text-gray-600 mb-3">{columnName}</p>
              
              <div className="flex items-center justify-center space-x-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Current Score</p>
                  <p className="text-2xl font-bold text-red-600">{currentScore}</p>
                </div>
                <div className="text-gray-400">
                  <span className="text-2xl">→</span>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">New Score</p>
                  <p className={`text-2xl font-bold ${exceedsMax ? 'text-red-600' : 'text-green-600'}`}>
                    {newScore}
                  </p>
                </div>
              </div>

              {/* 🔥 NEW: Show max score info */}
              {maxScore && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Maximum Score: <span className="font-semibold text-blue-600">{maxScore}</span>
                  </p>
                  {exceedsMax && (
                    <p className="text-sm text-red-600 mt-1">
                      ⚠️ New score exceeds maximum by {(parseFloat(newScore) - parseFloat(maxScore)).toFixed(1)} points
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <p className="text-gray-700 text-center">
            {exceedsMax ? (
              <>
                <strong className="text-red-600">Warning:</strong> The new score of 
                <span className="text-red-600 font-semibold"> {newScore}</span> exceeds the maximum of 
                <span className="text-blue-600 font-semibold"> {maxScore}</span>.
                <br />
                <span className="text-sm text-gray-600 mt-2 block">
                  Are you sure you want to proceed?
                </span>
              </>
            ) : (
              <>
                Are you sure you want to change <strong>{studentName}'s</strong> score from 
                <span className="text-red-600 font-semibold"> {currentScore}</span> to 
                <span className="text-green-600 font-semibold"> {newScore}</span>?
              </>
            )}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing || !isValidScore}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
              exceedsMax 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-yellow-600 hover:bg-yellow-700'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Updating...
              </>
            ) : (
              exceedsMax ? 'Override Anyway' : 'Yes, Override'
            )}
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            💡 You can also say "yes" or "no" to confirm
          </p>
        </div>
      </div>
    </div>
  );
};

export default OverrideConfirmationModal;