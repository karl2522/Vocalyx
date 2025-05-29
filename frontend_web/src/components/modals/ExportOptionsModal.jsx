import React from 'react';
import { FiX, FiDownload, FiFileText, FiInfo } from 'react-icons/fi';
import { BsFiletypeXlsx, BsFiletypeCsv, BsFiletypePdf } from 'react-icons/bs';

const ExportOptionsModal = ({
  showExportOptions,
  setShowExportOptions,
  exportFormat,
  setExportFormat,
  exportFileName,
  setExportFileName,
  exportPreviewData,
  cancelExport,
  processExport
}) => {
  // Hooks at top level before any conditionals
  React.useEffect(() => {
    if (showExportOptions) {
      if (!exportFileName || exportFileName.trim() === '') {
        const defaultFileName = exportPreviewData?.defaultFileName || 'Export';
        setExportFileName(defaultFileName);
      }
    }
  }, [showExportOptions, exportFileName, exportPreviewData, setExportFileName]);

  if (!showExportOptions) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowExportOptions(false);
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full animate-fadeIn border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white relative z-10">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
              <FiDownload className="h-5 w-5 text-[#333D79]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">Export Data</h3>
          </div>
          <button 
            onClick={cancelExport}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2 hover:bg-gray-100"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 bg-white relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left Column - Export Settings - Wider now (2/5 instead of 1/3) */}
            <div className="md:col-span-2">
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 shadow-sm mb-6">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Export Settings</h4>
                
                {/* File Name - Improved spacing and layout */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Name
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={exportFileName}
                      onChange={(e) => setExportFileName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent bg-white pr-16"
                      placeholder="Enter file name"
                      aria-label="File name for export"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                      <span className="text-gray-500 text-sm font-medium">.{exportFormat}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 flex items-center">
                    <FiInfo className="mr-1" />
                    Recommended: Use descriptive names like "Course - Class"
                  </p>
                </div>
                
                {/* Format Selector - Enhanced styling with PDF option */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Format
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportFormat('xlsx')}
                      className={`p-3 rounded-lg border transition-all ${
                        exportFormat === 'xlsx' 
                          ? 'bg-[#EEF0F8] border-[#333D79] ring-2 ring-[#EEF0F8] shadow-sm transform scale-[1.02]' 
                          : 'border-gray-200 hover:bg-gray-50 bg-white'
                      }`}
                      aria-pressed={exportFormat === 'xlsx'}
                    >
                      <div className="flex flex-col items-center">
                        <BsFiletypeXlsx className={`h-8 w-8 mb-2 ${exportFormat === 'xlsx' ? 'text-[#217346]' : 'text-gray-400'}`} />
                        <span className={`text-sm ${exportFormat === 'xlsx' ? 'font-medium text-[#333D79]' : 'text-gray-600'}`}>Excel</span>
                        <span className="text-xs text-gray-500 mt-1">Full formatting</span>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setExportFormat('csv')}
                      className={`p-3 rounded-lg border transition-all ${
                        exportFormat === 'csv' 
                          ? 'bg-[#EEF0F8] border-[#333D79] ring-2 ring-[#EEF0F8] shadow-sm transform scale-[1.02]' 
                          : 'border-gray-200 hover:bg-gray-50 bg-white'
                      }`}
                      aria-pressed={exportFormat === 'csv'}
                    >
                      <div className="flex flex-col items-center">
                        <BsFiletypeCsv className={`h-8 w-8 mb-2 ${exportFormat === 'csv' ? 'text-[#333D79]' : 'text-gray-400'}`} />
                        <span className={`text-sm ${exportFormat === 'csv' ? 'font-medium text-[#333D79]' : 'text-gray-600'}`}>CSV</span>
                        <span className="text-xs text-gray-500 mt-1">Universal</span>
                      </div>
                    </button>
                    
                    {/* New PDF option */}
                    <button
                      type="button"
                      onClick={() => setExportFormat('pdf')}
                      className={`p-3 rounded-lg border transition-all ${
                        exportFormat === 'pdf' 
                          ? 'bg-[#EEF0F8] border-[#333D79] ring-2 ring-[#EEF0F8] shadow-sm transform scale-[1.02]' 
                          : 'border-gray-200 hover:bg-gray-50 bg-white'
                      }`}
                      aria-pressed={exportFormat === 'pdf'}
                    >
                      <div className="flex flex-col items-center">
                        <BsFiletypePdf className={`h-8 w-8 mb-2 ${exportFormat === 'pdf' ? 'text-[#e74c3c]' : 'text-gray-400'}`} />
                        <span className={`text-sm ${exportFormat === 'pdf' ? 'font-medium text-[#333D79]' : 'text-gray-600'}`}>PDF</span>
                        <span className="text-xs text-gray-500 mt-1">Print-ready</span>
                      </div>
                    </button>
                  </div>
                  
                  {/* Format-specific information */}
                  <div className="mt-3 p-2 rounded-lg bg-blue-50 border border-blue-100">
                    {exportFormat === 'xlsx' && (
                      <div className="text-xs text-blue-700 flex items-start">
                        <FiInfo className="h-3.5 w-3.5 mt-0.5 mr-1 flex-shrink-0" />
                        <span>Excel format preserves all formatting and categories. Best for further editing.</span>
                      </div>
                    )}
                    {exportFormat === 'csv' && (
                      <div className="text-xs text-blue-700 flex items-start">
                        <FiInfo className="h-3.5 w-3.5 mt-0.5 mr-1 flex-shrink-0" />
                        <span>CSV format is compatible with all spreadsheet applications, but loses formatting.</span>
                      </div>
                    )}
                    {exportFormat === 'pdf' && (
                      <div className="text-xs text-blue-700 flex items-start">
                        <FiInfo className="h-3.5 w-3.5 mt-0.5 mr-1 flex-shrink-0" />
                        <span>PDF format is perfect for printing and sharing. Creates a professional document with category headers.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Data Summary Card - Enhanced with animation */}
              <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100 transition-all hover:shadow-md">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <FiFileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Data Summary</h4>
                    <p className="text-xs text-blue-600">All data will be exported</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-800">{exportPreviewData?.totalRows.toLocaleString()} rows</div>
                  <div className="text-xs text-blue-600">{exportPreviewData?.totalColumns} columns</div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Data Preview - Now 3/5 width */}
            <div className="md:col-span-3">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Data Preview</h4>
              <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                <div className="p-3 bg-[#f8f9fc] border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-600">PREVIEW OF EXPORT DATA</div>
                    <div className="text-xs text-gray-500">Showing 5 of {exportPreviewData?.totalRows} rows</div>
                  </div>
                </div>
                <div className="overflow-x-auto bg-white max-h-[350px]">
                  <table className="w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="bg-gray-50 py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 border-r border-gray-200 sticky left-0 z-10">
                          #
                        </th>
                        {exportPreviewData?.headers.map((header, idx) => (
                          <th 
                            key={idx}
                            className="bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            style={{ minWidth: '120px' }}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {exportPreviewData?.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 text-sm text-gray-500 font-medium border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
                            {rowIdx + 1}
                          </td>
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap"
                            >
                              {String(cell || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {exportPreviewData?.totalRows > exportPreviewData?.rows.length && (
                        <tr className="border-t border-gray-200 border-dashed">
                          <td colSpan={exportPreviewData.headers.length + 1} className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-0.5 animate-pulse"></div>
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-0.5 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-0.5 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {exportPreviewData?.totalRows > exportPreviewData?.rows.length && (
                  <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-center">
                    <div className="flex items-center text-xs text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      <span>{(exportPreviewData.totalRows - exportPreviewData.rows.length).toLocaleString()} more rows not shown in preview</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center mt-4 bg-blue-50 p-2 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-blue-600">All {exportPreviewData?.totalRows} rows will be included in the exported file</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t p-4 flex justify-between items-center bg-gray-50 relative z-10">
          <div className="flex items-center">
            <div className="flex items-center justify-center p-2 bg-blue-50 rounded-md mr-2">
              <FiFileText className="h-5 w-5 text-blue-700" />
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{exportPreviewData?.totalRows.toLocaleString()}</span> rows × 
              <span className="font-medium"> {exportPreviewData?.totalColumns}</span> columns
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={cancelExport}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={processExport}
              className="px-5 py-2.5 text-white bg-[#333D79] hover:bg-[#4A5491] rounded-lg transition-colors flex items-center shadow-sm"
            >
              <FiDownload className="mr-2" />
              <span>Export File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportOptionsModal;