import React, { useState, useEffect } from 'react';
import { FiTrash2 } from 'react-icons/fi';


const DeleteStudentModal = ({ isOpen, onClose, onConfirm, studentName, isDeleting }) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isConfirmationValid, setIsConfirmationValid] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfirmationText('');
      setIsConfirmationValid(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setIsConfirmationValid(confirmationText.trim().toLowerCase() === studentName.trim().toLowerCase());
  }, [confirmationText, studentName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative z-[101] w-full max-w-lg mx-auto bg-white rounded-xl shadow-2xl border">
        <div className="flex items-start gap-4 p-6 pb-4 border-b border-red-100">
          <div className="w-12 h-12 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center">
            <FiTrash2 className="h-6 w-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Student</h3>
            <p className="text-sm text-red-600 font-medium">⚠️ This action cannot be undone</p>
          </div>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed mb-4">
              You are about to permanently delete the student{' '}
              <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                "{studentName}"
              </span>
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-red-800 mb-2">This will delete:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• All student grades and scores</li>
                <li>• Student personal information</li>
                <li>• All associated data from Google Sheets</li>
                <li>• Student number will be reassigned</li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To confirm deletion, type the student name:
            </label>
            <code className="block text-sm bg-gray-100 text-gray-800 px-3 py-2 rounded border font-mono mb-2">
              {studentName}
            </code>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Type the student name to confirm"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                confirmationText === '' 
                  ? 'border-gray-300 focus:ring-blue-500'
                  : isConfirmationValid
                  ? 'border-green-300 focus:ring-green-500 bg-green-50'
                  : 'border-red-300 focus:ring-red-500 bg-red-50'
              }`}
              disabled={isDeleting}
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting || !isConfirmationValid}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <FiTrash2 className="w-4 h-4" />
                  <span>Delete Student</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteStudentModal;