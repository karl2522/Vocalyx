import React, { useState } from 'react';
import { Edit3, Trash2, RefreshCw, Check, X } from 'lucide-react';

const BatchEntryItem = ({ entry, index, onEdit, onDelete, onRetry }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editScore, setEditScore] = useState(entry.score);

  const handleSaveEdit = () => {
    const score = parseFloat(editScore);
    if (isNaN(score) || score < 0 || score > 100) {
      toast.error('Please enter a valid score (0-100)');
      return;
    }
    onEdit(entry.id, score);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditScore(entry.score);
    setIsEditing(false);
  };

  return (
    <div
      className={`flex items-center justify-between rounded-lg p-4 border-2 transition-all ${
        entry.status === 'found' 
          ? 'bg-green-50 border-green-200 hover:bg-green-100' 
          : 'bg-red-50 border-red-200 hover:bg-red-100'
      }`}
    >
      <div className="flex items-center space-x-3 flex-1">
        {/* Status Icon */}
        {entry.status === 'found' ? (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">✓</span>
          </div>
        ) : (
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">✗</span>
          </div>
        )}
        
        {/* Student Info */}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{entry.studentName}</span>
            <span className="text-gray-400">-</span>
            
            {/* 🔥 NEW: Editable Score */}
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={editScore}
                  onChange={(e) => setEditScore(e.target.value)}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min="0"
                  max="100"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <button
                  onClick={handleSaveEdit}
                  className="p-1 text-green-600 hover:text-green-800"
                  title="Save"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-red-600 hover:text-red-800"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="font-semibold text-lg">{entry.score}</span>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            {entry.status === 'found' ? (
              <>
                Found student
                {entry.hasExistingScore && (
                  <span className="ml-2 text-amber-600">
                    (was: {entry.existingValue})
                  </span>
                )}
              </>
            ) : (
              `"${entry.originalInput}" not found in sheet`
            )}
          </div>
        </div>
      </div>
      
      {/* 🔥 NEW: Action Buttons */}
      <div className="flex items-center space-x-1">
        {entry.status === 'found' && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            title="Edit Score"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
        
        {entry.status === 'not_found' && (
          <button
            onClick={() => onRetry(entry.id, entry.originalInput)}
            className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors"
            title="Retry Processing"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        
        <button
          onClick={() => onDelete(entry.id)}
          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
          title="Delete Entry"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default BatchEntryItem;