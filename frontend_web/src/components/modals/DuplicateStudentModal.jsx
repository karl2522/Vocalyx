import { X, User, Hash, Trophy, AlertCircle } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header - align with Batch Grading modal (neutral, minimal) */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Multiple Students Found</h3>
              <p className="text-sm text-slate-600">
                Choose the correct "{searchName}" for <span className="font-medium text-purple-600">{command?.column}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Assignment Info - subtle bar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
            <Trophy className="w-4 h-4 text-slate-500" />
            <span>Assigning score</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 font-semibold">{command?.value}</span>
            <span>to</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 font-medium">{command?.column}</span>
          </div>
        </div>

        {/* 🏞️ Landscape Grid Layout */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {matches && matches.length > 0 ? matches.map((match, index) => {
              const rowData = match.rowData || {};
              const studentName = match.student || `Student ${index + 1}`;
              const hasCurrentScore = command?.column && rowData[command.column] && rowData[command.column] !== '';
              
              return (
                <div
                  key={index}
                  className={`relative p-4 rounded-lg cursor-pointer transition-all duration-150 ${
                    selectedIndex === index
                      ? 'bg-slate-50 border border-purple-300 ring-2 ring-purple-200'
                      : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                  onClick={() => handleSelect(index)}
                >
                  {/* 🎯 Selection Indicator */}
                  <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 transition-all ${
                    selectedIndex === index
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-slate-300'
                  }`}>
                    {selectedIndex === index && (
                      <div className="w-2.5 h-2.5 bg-white rounded-full mx-auto mt-0.5" />
                    )}
                  </div>

                  {/* 👤 Student Info */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-base">
                        {studentName}
                      </h4>
                    </div>

                    {/* 📊 Student Details */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Hash size={14} className="text-slate-400" />
                        <span>Row: {rowData['NO.'] || 'N/A'}</span>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <User size={14} className="text-slate-400" />
                        <span>ID: {rowData['STUDENT ID'] || 'Not Set'}</span>
                      </div>

                      {/* 🚨 Current Score Warning */}
                      {hasCurrentScore && (
                        <div className="flex items-center space-x-2 p-2 rounded-md bg-amber-50 text-amber-700">
                          <AlertCircle size={14} className="text-amber-600" />
                          <span className="text-xs font-medium">
                            Current: {rowData[command.column]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full text-center text-gray-500 py-8">
                <User size={48} className="mx-auto text-gray-300 mb-4" />
                <p>No students found</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - align with Batch Grading modal */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-slate-200">
          <div className="text-sm text-gray-600">
            {matches?.length || 0} student{matches?.length !== 1 ? 's' : ''} found
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIndex === null}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedIndex !== null
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              Assign Score
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuplicateStudentModal;