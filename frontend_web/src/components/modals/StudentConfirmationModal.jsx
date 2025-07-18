// src/components/modals/StudentConfirmationModal.jsx
import React, { useState } from 'react';
import { X, User, Edit3, Plus, AlertCircle } from 'lucide-react';

const StudentConfirmationModal = ({ 
  isVisible, 
  studentData, 
  onConfirm, 
  onCancel, 
  onEdit 
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({
    lastName: studentData?.lastName || '',
    firstName: studentData?.firstName || '',
    studentId: studentData?.studentId || ''
  });

  if (!isVisible) return null;

  const handleEdit = () => {
    setEditMode(true);
    setEditedData({
      lastName: studentData?.lastName || '',
      firstName: studentData?.firstName || '',
      studentId: studentData?.studentId || ''
    });
  };

  const handleSaveEdit = () => {
    setEditMode(false);
    onEdit(editedData);
  };

  const handleConfirm = () => {
    const finalData = editMode ? editedData : {
      lastName: studentData?.lastName || '',
      firstName: studentData?.firstName || '',
      studentId: studentData?.studentId || ''
    };
    onConfirm(finalData);
  };

  const currentData = editMode ? editedData : studentData;

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Confirm Student</h2>
              <p className="text-sm text-slate-600">
                {editMode ? 'Edit student information' : 'Verify voice recognition result'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Voice Recognition Alert */}
          {!editMode && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Voice Recognition Result</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Please verify the information is correct. Click Edit to make changes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Student Information */}
          <div className="space-y-4">
            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Last Name
              </label>
              {editMode ? (
                <input
                  type="text"
                  value={editedData.lastName}
                  onChange={(e) => setEditedData({...editedData, lastName: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter last name"
                />
              ) : (
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-900 font-medium">
                    {currentData?.lastName || 'Not provided'}
                  </span>
                </div>
              )}
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                First Name
              </label>
              {editMode ? (
                <input
                  type="text"
                  value={editedData.firstName}
                  onChange={(e) => setEditedData({...editedData, firstName: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter first name"
                />
              ) : (
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-900 font-medium">
                    {currentData?.firstName || 'Not provided'}
                  </span>
                </div>
              )}
            </div>

            {/* Student ID */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Student ID
              </label>
              {editMode ? (
                <input
                  type="text"
                  value={editedData.studentId}
                  onChange={(e) => setEditedData({...editedData, studentId: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter student ID (optional)"
                />
              ) : (
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-900 font-medium">
                    {currentData?.studentId || 'Not provided'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Full Name Preview */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Full Name: </span>
              {`${currentData?.firstName || ''} ${currentData?.lastName || ''}`.trim() || 'Incomplete'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            
            {editMode ? (
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Save Changes
              </button>
            ) : (
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium flex items-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
          </div>
          
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
            disabled={!currentData?.lastName && !currentData?.firstName}
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentConfirmationModal;