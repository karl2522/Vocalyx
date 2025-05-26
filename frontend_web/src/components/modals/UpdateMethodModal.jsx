import React from 'react';
import { FiUpload, FiEdit2, FiX } from 'react-icons/fi';
import { BsFileSpreadsheet } from 'react-icons/bs';

const UpdateMethodModal = ({ isOpen, onClose, onSelectImport, onSelectManual }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full animate-fadeIn">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
              <BsFileSpreadsheet className="h-5 w-5 text-[#333D79]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">Update Class Record</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2 hover:bg-gray-100"
          >
            <FiX size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Choose how you would like to update your class record:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Import File Option */}
            <button 
              onClick={onSelectImport}
              className="p-6 border border-gray-200 rounded-lg hover:border-[#333D79] hover:bg-[#EEF0F8] transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-lg bg-[#EEF0F8] group-hover:bg-white flex items-center justify-center mb-4">
                <FiUpload size={24} className="text-[#333D79]" />
              </div>
              <h4 className="text-lg font-medium text-gray-800 mb-2">Update with File</h4>
              <p className="text-sm text-gray-500">
                Upload a spreadsheet file to update your class record with new data.
              </p>
            </button>
            
            {/* Manual Update Option */}
            <button 
              onClick={onSelectManual}
              className="p-6 border border-gray-200 rounded-lg hover:border-[#333D79] hover:bg-[#EEF0F8] transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-lg bg-[#EEF0F8] group-hover:bg-white flex items-center justify-center mb-4">
                <FiEdit2 size={24} className="text-[#333D79]" />
              </div>
              <h4 className="text-lg font-medium text-gray-800 mb-2">Update Manually</h4>
              <p className="text-sm text-gray-500">
                Add or edit columns and categories in your existing class record directly.
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateMethodModal;