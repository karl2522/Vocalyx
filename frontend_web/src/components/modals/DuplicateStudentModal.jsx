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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 🎨 Modern Header with Gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <User size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  Multiple Students Found
                </h3>
                <p className="text-blue-100 mt-1">
                  Choose the correct "{searchName}" for <span className="font-semibold">{command?.column}</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 🎯 Score Assignment Info */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 border-b">
          <div className="flex items-center justify-center space-x-2">
            <Trophy className="text-green-600" size={20} />
            <span className="text-gray-700">Assigning score:</span>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold text-lg">
              {command?.value}
            </span>
            <span className="text-gray-700">to</span>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
              {command?.column}
            </span>
          </div>
        </div>

        {/* 🏞️ Landscape Grid Layout */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {matches && matches.length > 0 ? matches.map((match, index) => {
              const rowData = match.rowData || {};
              const studentName = match.student || `Student ${index + 1}`;
              const hasCurrentScore = command?.column && rowData[command.column] && rowData[command.column] !== '';
              
              return (
                <div
                  key={index}
                  className={`relative p-5 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${
                    selectedIndex === index
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg ring-4 ring-blue-300'
                      : 'bg-white border-2 border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                  onClick={() => handleSelect(index)}
                >
                  {/* 🎯 Selection Indicator */}
                  <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 transition-all ${
                    selectedIndex === index
                      ? 'border-white bg-white'
                      : 'border-gray-300'
                  }`}>
                    {selectedIndex === index && (
                      <div className="w-3 h-3 bg-blue-600 rounded-full mx-auto mt-0.5" />
                    )}
                  </div>

                  {/* 👤 Student Info */}
                  <div className="space-y-3">
                    <div>
                      <h4 className={`font-bold text-lg ${
                        selectedIndex === index ? 'text-white' : 'text-gray-900'
                      }`}>
                        {studentName}
                      </h4>
                    </div>

                    {/* 📊 Student Details */}
                    <div className="space-y-2">
                      <div className={`flex items-center space-x-2 text-sm ${
                        selectedIndex === index ? 'text-blue-100' : 'text-gray-600'
                      }`}>
                        <Hash size={14} />
                        <span>Row: {rowData['NO.'] || 'N/A'}</span>
                      </div>

                      <div className={`flex items-center space-x-2 text-sm ${
                        selectedIndex === index ? 'text-blue-100' : 'text-gray-600'
                      }`}>
                        <User size={14} />
                        <span>ID: {rowData['STUDENT ID'] || 'Not Set'}</span>
                      </div>

                      {/* 🚨 Current Score Warning */}
                      {hasCurrentScore && (
                        <div className={`flex items-center space-x-2 p-2 rounded-lg ${
                          selectedIndex === index 
                            ? 'bg-white/20 text-yellow-100' 
                            : 'bg-orange-50 text-orange-700'
                        }`}>
                          <AlertCircle size={14} />
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

        {/* 🎨 Modern Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {matches?.length || 0} student{matches?.length !== 1 ? 's' : ''} found
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIndex === null}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                selectedIndex !== null
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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