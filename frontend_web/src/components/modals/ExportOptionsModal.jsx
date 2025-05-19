import React from 'react';
import { FiX, FiDownload, FiFileText } from 'react-icons/fi';
import { BsFiletypeXlsx, BsFiletypeCsv } from 'react-icons/bs';

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
  if (!showExportOptions) return null;
  
  return (
    <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm"
          onClick={(e) => {
            // Close modal when clicking the backdrop (outside the modal)
            if (e.target === e.currentTarget) {
              setShowExportOptions(false);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full animate-fadeIn border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white relative z-10">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
                  <FiDownload className="h-5 w-5 text-[#333D79]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Export Data</h3>
              </div>
              <button 
                onClick={cancelExport}
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2 hover:bg-gray-100"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="p-6 bg-white relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 shadow-sm mb-6">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Export Settings</h4>
                    
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        File Name
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <input 
                          type="text"
                          value={exportFileName}
                          onChange={(e) => setExportFileName(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent bg-white"
                          placeholder="Enter file name"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-gray-400 text-sm">.{exportFormat}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Format
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setExportFormat('xlsx')}
                          className={`p-3 rounded-lg border ${
                            exportFormat === 'xlsx' 
                              ? 'bg-[#EEF0F8] border-[#333D79] ring-2 ring-[#EEF0F8]' 
                              : 'border-gray-200 hover:bg-gray-50 bg-white'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <BsFiletypeXlsx className={`h-9 w-9 mb-2 ${exportFormat === 'xlsx' ? 'text-[#217346]' : 'text-gray-400'}`} />
                            <span className={`text-sm ${exportFormat === 'xlsx' ? 'font-medium text-[#333D79]' : 'text-gray-600'}`}>Excel (.xlsx)</span>
                            <span className="text-xs text-gray-500 mt-1">Full features</span>
                          </div>
                        </button>
                        <button
                          onClick={() => setExportFormat('csv')}
                          className={`p-3 rounded-lg border ${
                            exportFormat === 'csv' 
                              ? 'bg-[#EEF0F8] border-[#333D79] ring-2 ring-[#EEF0F8]' 
                              : 'border-gray-200 hover:bg-gray-50 bg-white'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <BsFiletypeCsv className={`h-9 w-9 mb-2 ${exportFormat === 'csv' ? 'text-[#333D79]' : 'text-gray-400'}`} />
                            <span className={`text-sm ${exportFormat === 'csv' ? 'font-medium text-[#333D79]' : 'text-gray-600'}`}>CSV (.csv)</span>
                            <span className="text-xs text-gray-500 mt-1">Simple format</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between bg-blue-50 px-4 py-3 rounded-lg">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                        <FiFileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">Data Summary</h4>
                        <p className="text-xs text-blue-600">What will be exported</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-blue-800">{exportPreviewData?.totalRows.toLocaleString()} rows</div>
                      <div className="text-xs text-blue-600">{exportPreviewData?.totalColumns} columns</div>
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Data Preview</h4>
                  <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                    <div className="p-2 bg-[#f8f9fc] border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-gray-600">DATA PREVIEW</div>
                        <div className="text-xs text-gray-500">Showing 5 of {exportPreviewData?.totalRows} rows</div>
                      </div>
                    </div>
                    <div className="overflow-x-auto bg-white">
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
                          {/* Placeholder rows to show there's more data */}
                          {exportPreviewData?.totalRows > exportPreviewData?.rows.length && (
                            <tr className="border-t border-gray-200 border-dashed">
                              <td colSpan={exportPreviewData.headers.length + 1} className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-0.5"></div>
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-0.5"></div>
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-0.5"></div>
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
                          <span>{(exportPreviewData.totalRows - exportPreviewData.rows.length).toLocaleString()} more rows not shown</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center mt-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-gray-600">All {exportPreviewData?.totalRows} rows will be included in the exported file</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t p-4 flex justify-between items-center bg-gray-50 relative z-10">
              <div className="flex items-center">
                <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                  <FiFileText className="h-3.5 w-3.5 text-gray-600" />
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{exportPreviewData?.totalRows.toLocaleString()}</span> rows × 
                  <span className="font-medium"> {exportPreviewData?.totalColumns}</span> columns
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={cancelExport}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processExport}
                  className="px-4 py-2 text-white bg-[#333D79] hover:bg-[#4A5491] rounded-lg transition-colors flex items-center shadow-sm"
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