import { X } from 'lucide-react';
import { useState } from 'react';

const DuplicateStudentModal = ({ 
  isOpen, 
  onClose, 
  matches, 
  searchName, 
  onSelectStudent,
  command 
}) => {
  const [selectedIndex, setSelectedIndex] = useState(null);

  if (!isOpen) return null;

  const handleSelect = (index) => {
    setSelectedIndex(index);
  };

  const handleConfirm = () => {
    if (selectedIndex !== null) {
      onSelectStudent(selectedIndex);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedIndex(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Multiple Students Found
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Found multiple students named "{searchName}" for {command?.column}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-700 mb-4">
            Please select the correct student to assign score <strong>{command?.value}</strong>:
          </p>

          <div className="space-y-3">
            {matches && matches.length > 0 ? matches.map((match, index) => {
              // 🔥 FIXED: Use the correct data structure from console output
              const rowData = match.rowData || {};
              const studentName = match.student || `Student ${index + 1}`;
              
              return (
                <div
                  key={index}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedIndex === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelect(index)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {studentName}
                      </div>
                      <div className="text-sm text-gray-600">
                        Student ID: {rowData['STUDENT ID'] || 'Not Set'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Row Number: {rowData['NO.'] || 'N/A'}
                      </div>
                      {/* 🔥 FIXED: Show current score if exists */}
                      {command?.column && rowData[command.column] && rowData[command.column] !== '' && (
                        <div className="text-sm text-orange-600 mt-1">
                          Current {command.column}: {rowData[command.column]}
                        </div>
                      )}
                      {/* 🔥 Show the original table index */}
                      <div className="text-xs text-gray-400 mt-1">
                        Table Index: {rowData._originalTableIndex !== undefined ? rowData._originalTableIndex : 'Unknown'}
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedIndex === index
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedIndex === index && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                      )}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center text-gray-500 py-4">
                No students found
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIndex === null}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
              selectedIndex !== null
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Assign Score
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateStudentModal;