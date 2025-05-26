import React from 'react';
import ExcelGradeViewer from './ExcelGradeViewer';

const ExcelViewer = ({ 
  fileData: currentFileData, 
  classData: classInfo, 
  isFullScreen, 
  setIsFullScreen, 
  onExport,
  onSave // Add this new prop
}) => {
  const fileData = currentFileData || null;

  const classData = classInfo || { name: 'Class' };

  const handleExport = onExport || (() => {
    alert('Export functionality would be implemented here');
  });

  // Handler for saving changes
  const handleSave = onSave || ((updatedData) => {
    alert('Save functionality would be implemented here');
    console.log('Data to save:', updatedData);
  });

  if (!fileData) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No data available. Please upload an Excel file.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isFullScreen ? 'fixed inset-0 z-50 bg-white' : 'w-full h-full'}`}>
      <div className={`${isFullScreen ? 'h-screen' : 'h-full'} flex flex-col`}>
        <ExcelGradeViewer
          fileData={fileData}
          classData={classData}
          isFullScreen={isFullScreen}
          setIsFullScreen={setIsFullScreen}
          onExport={handleExport}
          onSave={handleSave} // Pass the onSave prop to ExcelGradeViewer
        />
      </div>
    </div>
  );
};

export default ExcelViewer;