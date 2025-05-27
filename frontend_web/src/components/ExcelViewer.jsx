import React, { useState, useEffect } from 'react';
import { AlertTriangle, FileX, Upload, RefreshCw } from 'lucide-react';
import ExcelGradeViewer from './ExcelGradeViewer';

const ExcelViewer = ({ 
  fileData: currentFileData, 
  classData: classInfo, 
  isFullScreen, 
  setIsFullScreen, 
  onExport,
  onSave,
  onRetry // Add retry functionality
}) => {
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const fileData = currentFileData || null;
  const classData = classInfo || { name: 'Class' };

  // Enhanced error handling
  useEffect(() => {
    if (currentFileData === undefined) {
      setError('Data is still loading...');
    } else if (currentFileData === null) {
      setError('No file data available');
    } else {
      setError(null);
    }
  }, [currentFileData]);

  const handleExport = onExport || (() => {
    console.log('Export functionality would be implemented here');
    // Could show a toast notification here
  });

  // Enhanced save handler with error handling
  const handleSave = onSave || ((updatedData) => {
    console.log('Save functionality would be implemented here');
    console.log('Data to save:', updatedData);
    // Could show a toast notification here
    return Promise.resolve();
  });

  // Retry functionality
  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
        setError(null);
      } catch (err) {
        setError('Failed to reload data. Please try again.');
      } finally {
        setIsRetrying(false);
      }
    }
  };

  // Enhanced loading state
  if (error === 'Data is still loading...') {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-50">
        <div className="text-center p-8">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#333D79] rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-2 bg-[#333D79] rounded-full opacity-10"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Spreadsheet</h3>
          <p className="text-gray-600 mb-4">Please wait while we prepare your data...</p>
          <div className="w-48 bg-gray-200 rounded-full h-2 mx-auto">
            <div className="bg-gradient-to-r from-[#333D79] to-[#2a3168] h-2 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced error state
  if (!fileData || error) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            {error === 'No file data available' ? (
              <FileX className="w-8 h-8 text-red-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-600" />
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {error === 'No file data available' ? 'No Spreadsheet Data' : 'Unable to Load Data'}
          </h3>
          
          <p className="text-gray-600 mb-6">
            {error === 'No file data available' 
              ? 'Please upload an Excel file to view and edit your data.'
              : 'There was an issue loading your spreadsheet. Please try again.'
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {error !== 'No file data available' && onRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-4 py-2 bg-[#333D79] text-white rounded-lg hover:bg-[#2a3168] flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <RefreshCw size={16} className={isRetrying ? 'animate-spin' : ''} />
                <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
              </button>
            )}
            
            <button
              onClick={() => {
                // This could trigger a file upload dialog
                console.log('Upload new file');
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center space-x-2 transition-all"
            >
              <Upload size={16} />
              <span>Upload File</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main viewer with enhanced container
  return (
    <div className={`${
      isFullScreen 
        ? 'fixed inset-0 z-50 bg-white' 
        : 'w-full h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden'
    }`}>
      <div className={`${isFullScreen ? 'h-screen' : 'h-full'} flex flex-col`}>
        <ExcelGradeViewer
          fileData={fileData}
          classData={classData}
          isFullScreen={isFullScreen}
          setIsFullScreen={setIsFullScreen}
          onExport={handleExport}
          onSave={handleSave}
        />
      </div>
    </div>
  );
};

export default ExcelViewer;