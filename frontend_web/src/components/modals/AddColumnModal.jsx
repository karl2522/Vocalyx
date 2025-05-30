import React from 'react';

const AddColumnModal = ({
  showAddColumnModal,
  setShowAddColumnModal,
  newColumnName,
  setNewColumnName,
  newColumnType,
  setNewColumnType,
  newColumnMaxScore,
  setNewColumnMaxScore,
  handleAddCustomColumn
}) => {
  if (!showAddColumnModal) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001] p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowAddColumnModal(false);
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-fadeIn">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-800">Add Custom Column</h3>
          <button 
            onClick={() => setShowAddColumnModal(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-5">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Column Name</label>
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Enter column name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Column Type</label>
            <select
              value={newColumnType}
              onChange={(e) => setNewColumnType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
            >
              <option value="text">Text</option>
              <option value="number">Number (Score)</option>
              <option value="date">Date</option>
              <option value="checkbox">Checkbox</option>
            </select>
          </div>
          
          {newColumnType === 'number' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Score</label>
              <input
                type="number"
                value={newColumnMaxScore}
                onChange={(e) => setNewColumnMaxScore(e.target.value)}
                placeholder="Enter maximum points (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
              />
            </div>
          )}
        </div>
        
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end space-x-3">
          <button
            onClick={() => setShowAddColumnModal(false)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddCustomColumn}
            className="px-4 py-2 text-white bg-[#333D79] hover:bg-[#4A5491] rounded-lg transition-colors"
          >
            Add Column
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddColumnModal;