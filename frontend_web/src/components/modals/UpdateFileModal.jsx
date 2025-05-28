import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { BsCheckCircle, BsFileEarmarkSpreadsheet, BsUpload } from 'react-icons/bs';
import { FiAlertCircle, FiArrowLeft, FiCheck, FiChevronRight, FiUpload, FiX } from 'react-icons/fi';
import { MdQuiz, MdSchool, MdScience } from 'react-icons/md';

const UpdateFileModal = ({ 
  isOpen, 
  onClose, 
  currentFile, // eslint-disable-line no-unused-vars
  onSave,
  teamAccess // eslint-disable-line no-unused-vars
}) => {
  const [step, setStep] = useState('selectCategory'); // selectCategory, uploadFile, confirm
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const categoryOptions = [
    {
      id: 'quiz',
      name: 'Quiz',
      description: 'Upload quiz scores and add new quiz columns',
      icon: MdQuiz,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'laboratory',
      name: 'Laboratory Activities',
      description: 'Upload lab work scores and add new lab columns',
      icon: MdScience,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'exams',
      name: 'Exams',
      description: 'Upload exam scores and add new exam columns',
      icon: MdSchool,
      color: 'bg-green-100 text-green-600'
    }
  ];

  if (!isOpen) return null;

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setStep('uploadFile');
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setUploadError('');
    
    // Process file preview (simplified)
    const reader = new FileReader();
    reader.onload = () => {
      try {
        // Basic file validation
        if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
          setPreviewData({
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type,
            lastModified: new Date(file.lastModified).toLocaleString()
          });
          setStep('confirm');
        } else {
          setUploadError('Please select a valid spreadsheet file (.xlsx, .xls, or .csv)');
        }
      } catch {
        setUploadError('Error reading file. Please try again.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleConfirmUpload = () => {
    // This will be implemented to merge the file data with the selected category
    if (onSave) {
      onSave({
        category: selectedCategory,
        file: selectedFile,
        action: 'merge'
      });
    }
    handleClose();
  };

  const handleClose = () => {
    setStep('selectCategory');
    setSelectedCategory('');
    setSelectedFile(null);
    setPreviewData(null);
    setUploadError('');
    setIsDragging(false);
    onClose();
  };

  const renderCategorySelection = () => (
    <>
      <div className="text-center mb-3 sm:mb-6">
        <h4 className="text-sm sm:text-lg font-medium text-gray-800 mb-1 sm:mb-2">Select Category</h4>
        <p className="text-xs sm:text-base text-gray-600">Choose which category you want to update with your file</p>
      </div>

      <div className="space-y-2 sm:space-y-4 mb-3 sm:mb-6">
        {categoryOptions.map((category) => {
          const IconComponent = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              className="w-full p-2.5 sm:p-4 border border-gray-200 rounded-lg hover:border-[#333D79] hover:bg-[#EEF0F8] transition-all text-left group"
            >
              <div className="flex items-start">
                <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg ${category.color} group-hover:bg-white flex items-center justify-center mr-2.5 sm:mr-4 transition-colors flex-shrink-0`}>
                  <IconComponent size={16} className="sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm sm:text-lg font-medium text-gray-800 mb-0.5 sm:mb-1">{category.name}</h5>
                  <p className="text-xs sm:text-sm text-gray-500 leading-tight">{category.description}</p>
                </div>
                <FiChevronRight className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-gray-400 group-hover:text-[#333D79] transition-colors flex-shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );

  const renderFileUpload = () => (
    <>
      <div className="text-center mb-3 sm:mb-6">
        <h4 className="text-sm sm:text-lg font-medium text-gray-800 mb-1 sm:mb-2">Upload File</h4>
        <p className="text-xs sm:text-base text-gray-600">
          Upload a file to add to the <span className="font-medium text-[#333D79]">
            {categoryOptions.find(cat => cat.id === selectedCategory)?.name}
          </span> category
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-3 sm:p-8 text-center transition-all ${
          isDragging 
            ? 'border-[#333D79] bg-[#EEF0F8]' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mx-auto flex justify-center">
          <BsUpload className="h-6 w-6 sm:h-12 sm:w-12 text-gray-400" />
        </div>
        <div className="mt-2 sm:mt-4">
          <p className="text-sm sm:text-lg text-gray-700">Drag and drop your file here</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">or</p>
          <label htmlFor="file-upload" className="mt-1.5 sm:mt-2 cursor-pointer">
            <span className="inline-flex items-center px-2.5 sm:px-4 py-1.5 sm:py-2 bg-[#333D79] text-white rounded-lg hover:bg-[#4A5491] transition-colors text-xs sm:text-base">
              <FiUpload className="mr-1 sm:mr-2" size={12} />
              Browse Files
            </span>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileInput}
            />
          </label>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 sm:mt-2">
          Supported formats: Excel (.xlsx, .xls) and CSV files
        </p>
      </div>

      {uploadError && (
        <div className="mt-2.5 sm:mt-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <FiAlertCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-red-500 mr-1.5 sm:mr-2 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-red-700">{uploadError}</p>
        </div>
      )}
    </>
  );

  const renderConfirmation = () => (
    <>
      <div className="text-center mb-3 sm:mb-6">
        <h4 className="text-sm sm:text-lg font-medium text-gray-800 mb-1 sm:mb-2">Confirm Upload</h4>
        <p className="text-xs sm:text-base text-gray-600">Review your selections before proceeding</p>
      </div>

      <div className="space-y-2.5 sm:space-y-4 mb-3 sm:mb-6">
        {/* Category Info */}
        <div className="p-2.5 sm:p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-2.5 sm:mr-3 flex-shrink-0">
              {React.createElement(categoryOptions.find(cat => cat.id === selectedCategory)?.icon, {
                size: 16,
                className: 'text-[#333D79] sm:w-5 sm:h-5'
              })}
            </div>
            <div className="min-w-0">
              <h5 className="text-xs sm:text-base font-medium text-gray-800">Target Category</h5>
              <p className="text-xs sm:text-sm text-gray-600">
                {categoryOptions.find(cat => cat.id === selectedCategory)?.name}
              </p>
            </div>
          </div>
        </div>

        {/* File Info */}
        {previewData && (
          <div className="p-2.5 sm:p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-2.5 sm:mr-3 flex-shrink-0">
                <BsFileEarmarkSpreadsheet className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-[#333D79]" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs sm:text-base font-medium text-gray-800 truncate">{previewData.name}</h5>
                <p className="text-xs sm:text-sm text-gray-600">{previewData.size} • {previewData.type}</p>
              </div>
              <BsCheckCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
            </div>
          </div>
        )}
      </div>

      <div className="p-2.5 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <FiAlertCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-blue-500 mr-1.5 sm:mr-2 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-blue-700 font-medium">What will happen:</p>
            <ul className="text-xs sm:text-sm text-blue-600 mt-0.5 sm:mt-1 space-y-0.5 sm:space-y-1">
              <li>• New columns from your file will be added to the {categoryOptions.find(cat => cat.id === selectedCategory)?.name} category</li>
              <li>• Existing data will be preserved</li>
              <li>• Student information will be automatically matched</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999] p-1 sm:p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-full max-h-screen sm:h-auto sm:max-h-[96vh] flex flex-col animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 sm:p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0 rounded-t-lg">
          <div className="flex items-center">
            <div className="h-7 w-7 sm:h-10 sm:w-10 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-2 sm:mr-3">
              <FiUpload className="h-3 w-3 sm:h-5 sm:w-5 text-[#333D79]" />
            </div>
            <h3 className="text-base sm:text-xl font-semibold text-gray-800">Update with File</h3>
          </div>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1.5 sm:p-2 hover:bg-gray-100"
          >
            <FiX size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content - Make scrollable on mobile if needed */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-6">
            {/* Step Indicator - Make more compact on mobile */}
            <div className="flex items-center justify-center mb-3 sm:mb-6">
              <div className="flex items-center space-x-1.5 sm:space-x-4">
                <div className={`flex items-center justify-center w-5 h-5 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-medium ${
                  step === 'selectCategory' ? 'bg-[#333D79] text-white' : 
                  step === 'uploadFile' || step === 'confirm' ? 'bg-green-500 text-white' : 
                  'bg-gray-200 text-gray-600'
                }`}>
                  1
                </div>
                <div className={`h-0.5 sm:h-1 w-6 sm:w-12 rounded-full ${
                  step === 'uploadFile' || step === 'confirm' ? 'bg-green-500' : 'bg-gray-200'
                }`}></div>
                <div className={`flex items-center justify-center w-5 h-5 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-medium ${
                  step === 'uploadFile' ? 'bg-[#333D79] text-white' :
                  step === 'confirm' ? 'bg-green-500 text-white' : 
                  'bg-gray-200 text-gray-600'
                }`}>
                  2
                </div>
                <div className={`h-0.5 sm:h-1 w-6 sm:w-12 rounded-full ${
                  step === 'confirm' ? 'bg-green-500' : 'bg-gray-200'
                }`}></div>
                <div className={`flex items-center justify-center w-5 h-5 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-medium ${
                  step === 'confirm' ? 'bg-[#333D79] text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  3
                </div>
              </div>
            </div>

            {/* Step Content */}
            {step === 'selectCategory' && renderCategorySelection()}
            {step === 'uploadFile' && renderFileUpload()}
            {step === 'confirm' && renderConfirmation()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-6 border-t border-gray-100 bg-gray-50 flex justify-between flex-shrink-0 rounded-b-lg">
          <div>
            {step !== 'selectCategory' && (
              <button
                onClick={() => {
                  if (step === 'uploadFile') {
                    setStep('selectCategory');
                    setSelectedFile(null);
                    setPreviewData(null);
                    setUploadError('');
                  } else if (step === 'confirm') {
                    setStep('uploadFile');
                  }
                }}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center text-xs sm:text-base rounded-lg hover:bg-gray-200"
              >
                <FiArrowLeft className="mr-1 sm:mr-2" size={14} />
                Back
              </button>
            )}
          </div>

          <div className="flex space-x-1.5 sm:space-x-3">
            <button
              onClick={handleClose}
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-gray-600 hover:text-gray-800 transition-colors text-xs sm:text-base rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            {step === 'confirm' && (
              <button
                onClick={handleConfirmUpload}
                className="px-3 sm:px-6 py-1.5 sm:py-2 bg-[#333D79] text-white rounded-lg hover:bg-[#4A5491] transition-colors flex items-center text-xs sm:text-base"
              >
                <FiCheck className="mr-1 sm:mr-2" size={14} />
                <span className="hidden sm:inline">Upload & Merge</span>
                <span className="sm:hidden">Upload</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

UpdateFileModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentFile: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  teamAccess: PropTypes.object
};

export default UpdateFileModal; 