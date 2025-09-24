import React from 'react';

const ImportProgressIndicator = ({ importProgress }) => {
  if (!importProgress) return null;
  
  const getProgressColor = () => {
    switch (importProgress.status) {
      case 'conflicts':
        return 'border-yellow-500';
      case 'importing':
        return 'border-green-500';
      case 'completed':
        return 'border-green-600';
      default:
        return 'border-blue-500';
    }
  };
  
  return (
    <div className={`fixed top-4 right-4 bg-white rounded-lg shadow-lg border-2 ${getProgressColor()} p-4 z-50 min-w-80`}>
      <div className="flex items-center space-x-3">
        <div className="flex items-center">
          {importProgress.status !== 'completed' && (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-blue-600"></div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium text-slate-900">
            {importProgress.status === 'completed' 
              ? 'Import Complete' 
              : (importProgress.entity === 'scores' 
                  ? 'Importing Scores' 
                  : importProgress.entity === 'students' 
                    ? 'Importing Students' 
                    : 'Importing')}
          </p>
          <p className="text-sm text-slate-600">{importProgress.message}</p>
          
          {/* Progress bar */}
          <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                importProgress.status === 'completed' ? 'bg-green-600' :
                importProgress.status === 'importing' ? 'bg-green-500' :
                importProgress.status === 'conflicts' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}
              style={{ 
                width: `${getProgressPercentage(importProgress.status)}%` 
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getProgressPercentage = (status) => {
  switch (status) {
    case 'reading': return 20;
    case 'parsing': return 40;
    case 'checking': return 60;
    case 'conflicts': return 80;
    case 'importing': return 100;
    case 'completed': return 100;
    default: return 10;
  }
};

export default ImportProgressIndicator;