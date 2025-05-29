import React from 'react';
import { BsFileEarmarkSpreadsheet, BsFiletypeXlsx, BsFiletypeCsv } from 'react-icons/bs';
import { FiUpload } from 'react-icons/fi';

/**
 * FileDropzone component for handling file uploads in the ClassDetails view
 * Supports drag-and-drop and click-to-select functionality for Excel files
 */
const FileDropzone = ({ 
  teamAccess, 
  isDragging, 
  handleDragOver, 
  handleDragLeave, 
  handleDrop, 
  handleFileInput 
}) => {
  // Check if user has appropriate access to upload files
  const canUpload = !teamAccess || teamAccess.accessLevel !== 'view';
  
  // If user has view-only access, show a message instead of the dropzone
  if (!canUpload) {
    return (
      <div className="border border-gray-200 border-dashed rounded-lg p-6 bg-gray-50 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center">
          <BsFileEarmarkSpreadsheet className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-500 mb-1">View-Only Access</h3>
        <p className="text-sm text-gray-500 mb-2">
          You don't have permission to upload files to this class.
        </p>
        <p className="text-xs text-gray-400">
          Contact your team administrator if you need upload access.
        </p>
      </div>
    );
  }

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
        isDragging
          ? 'border-[#333D79] bg-[#EEF0F8]'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`text-center ${isDragging ? 'animate-pulse-custom' : ''}`}>
        <div className="w-20 h-20 rounded-full bg-[#EEF0F8] mx-auto mb-4 flex items-center justify-center">
          <FiUpload className="h-8 w-8 text-[#333D79]" />
        </div>
        
        <h3 className="text-xl font-medium text-gray-800 mb-2">
          {isDragging ? 'Drop to Import' : 'Import Excel Data'}
        </h3>
        
        <p className="text-gray-500 mb-5">
          {isDragging 
            ? 'Release to upload your file' 
            : 'Drag & drop your Excel file here or click to browse'
          }
        </p>
        
        <div className="flex justify-center gap-3 mb-5">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center mb-1">
              <BsFiletypeXlsx className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-xs text-gray-500">XLSX</span>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-1">
              <BsFileEarmarkSpreadsheet className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500">XLS</span>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-lg bg-yellow-50 flex items-center justify-center mb-1">
              <BsFiletypeCsv className="h-6 w-6 text-yellow-600" />
            </div>
            <span className="text-xs text-gray-500">CSV</span>
          </div>
        </div>
        
        <label htmlFor="dropzone-file" className="cursor-pointer">
          <div className="inline-flex items-center px-4 py-2 bg-[#333D79] text-white rounded-lg hover:bg-[#4A5491] transition-colors">
            <FiUpload className="mr-2" />
            <span>Browse Files</span>
          </div>
          <input 
            id="dropzone-file" 
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInput}
            className="hidden" 
          />
        </label>
        
        <p className="text-xs text-gray-400 mt-5">
          Supported formats: .xlsx, .xls, .csv • Max size: 10MB
        </p>
      </div>
    </div>
  );
};

export default FileDropzone;