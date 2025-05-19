import React from 'react';
import { FiInfo } from 'react-icons/fi';
import { BsFileEarmarkSpreadsheet } from 'react-icons/bs';

const ImportProgress = ({ fileLoading, importProgress, importStage }) => {
  if (!fileLoading) return null;

  return (
    <div className="flex flex-col items-center justify-center py-12 relative z-10">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="relative mb-6">
          <div className="w-20 h-20 border-4 border-[#EEF0F8] border-t-[#333D79] rounded-full animate-spin mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
              <BsFileEarmarkSpreadsheet className="h-8 w-8 text-[#333D79]" />
          </div>
        </div>
          <h3 className="text-lg font-medium text-gray-800 text-center mb-2">{importStage || 'Processing your file...'}</h3>
          <p className="text-sm text-gray-500 mb-4 text-center">This may take a moment for larger files</p>
          
          <div className="space-y-5 mb-4">
            <div className="flex items-center">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center ${importProgress >= 20 ? 'bg-[#333D79] text-white' : 'bg-gray-200 text-gray-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {importProgress >= 20 ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />}
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <div className="text-sm font-medium text-gray-700">Reading File</div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 my-1.5">
                  <div className="bg-gradient-to-r from-[#333D79] to-[#4A5491] h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(100, importProgress <= 20 ? importProgress * 5 : 100)}%` }}></div>
                </div>
              </div>
            </div>
            
            {/* Additional progress steps */}
          </div>

          <div className="flex justify-between items-center mt-4">
            <p className="text-xs text-gray-500">{Math.round(importProgress)}% complete</p>
            <div className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {importStage || 'Processing...'}
            </div>
          </div>
      </div>
    </div>
  );
};

export default ImportProgress;