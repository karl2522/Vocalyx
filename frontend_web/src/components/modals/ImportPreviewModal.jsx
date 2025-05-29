import PropTypes from 'prop-types';
import { BsFileEarmarkSpreadsheet, BsFiletypeCsv, BsFiletypeXlsx } from 'react-icons/bs';
import { FiCheckCircle, FiEye, FiFileText, FiInfo, FiUpload, FiX } from 'react-icons/fi';
import { MdDragIndicator } from 'react-icons/md';

const ImportPreviewModal = ({ 
  showPreview, 
  previewInfo,
  previewData,
  previewError,
  cancelImport,
  processSelectedFile,
  teamAccess,
  isDragging,
  handleDragOver, 
  handleDragLeave, 
  handleDrop,
  handleFileInput
}) => {
  if (!showPreview || !previewInfo) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          cancelImport();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full animate-fadeIn max-h-[80vh] flex flex-col border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
              <FiFileText className="h-5 w-5 text-[#333D79]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">File Import</h3>
          </div>
          <button 
            onClick={cancelImport}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2 hover:bg-gray-100"
          >
            <FiX size={20} />
          </button>
        </div>
        
        {/* File Info Section */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            <div className="flex items-center justify-center flex-shrink-0 bg-[#F7F9FD] p-8 rounded-lg border border-gray-100 shadow-sm">
              {previewInfo.name.endsWith('.xlsx') || previewInfo.name.endsWith('.xls') ? (
                <BsFiletypeXlsx className="h-32 w-32 text-[#217346]" />
              ) : previewInfo.name.endsWith('.csv') ? (
                <BsFiletypeCsv className="h-32 w-32 text-[#333D79]" />
              ) : (
                <BsFileEarmarkSpreadsheet className="h-32 w-32 text-[#333D79]" />
              )}
            </div>
            
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-800 mb-2 flex items-center">
                <span className="truncate">{previewInfo.name}</span>
                <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                  {previewInfo.type.split(' ')[0]}
                </span>
              </h4>
              
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <h5 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">File Details</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Size:</span>
                      <span className="text-sm font-medium text-gray-700">{previewInfo.size}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Last modified:</span>
                      <span className="text-sm font-medium text-gray-700">{previewInfo.lastModified}</span>
                    </div>
                    {previewData && (
                      <>
                        <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                          <span className="text-sm text-gray-500">Total rows:</span>
                          <span className="text-sm font-medium text-gray-700 bg-gray-50 px-2.5 py-0.5 rounded-full">{previewData.totalRows.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Total columns:</span>
                          <span className="text-sm font-medium text-gray-700 bg-gray-50 px-2.5 py-0.5 rounded-full">{previewData.totalColumns}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <h5 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Import Information</h5>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center mt-0.5 mr-2">
                        <FiCheckCircle className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-600">Data will be loaded into the spreadsheet editor</span>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center mt-0.5 mr-2">
                        <FiCheckCircle className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-600">Student names will be automatically detected</span>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center mt-0.5 mr-2">
                        <FiCheckCircle className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-600">Quiz, Lab, and Exam columns will be automatically added</span>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center mt-0.5 mr-2">
                        <FiCheckCircle className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-600">Filter, sort, and modify data after import</span>
                    </li>
                  </ul>
                </div>
                
                {/* Category Preview Section */}
                {previewData && previewData.headers && (
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <h5 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Automatic Category Organization</h5>
                    <div className="space-y-3">
                      {/* Student Info Category */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                          <span className="text-sm font-medium text-blue-800">Student Info</span>
                          <span className="ml-auto text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                            {previewData.headers.length} columns
                          </span>
                        </div>
                        <div className="text-xs text-blue-700 bg-white bg-opacity-50 rounded p-2 max-h-16 overflow-y-auto">
                          {previewData.headers.join(', ')}
                        </div>
                      </div>
                      
                      {/* Quiz Category */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                          <span className="text-sm font-medium text-green-800">Quiz</span>
                          <span className="ml-auto text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                            5 columns
                          </span>
                        </div>
                        <div className="text-xs text-green-700 bg-white bg-opacity-50 rounded p-2">
                          Quiz 1, Quiz 2, Quiz 3, Quiz 4, Quiz 5
                        </div>
                      </div>
                      
                      {/* Laboratory Activities Category */}
                      <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-100">
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                          <span className="text-sm font-medium text-purple-800">Laboratory Activities</span>
                          <span className="ml-auto text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                            5 columns
                          </span>
                        </div>
                        <div className="text-xs text-purple-700 bg-white bg-opacity-50 rounded p-2">
                          Lab 1, Lab 2, Lab 3, Lab 4, Lab 5
                        </div>
                      </div>
                      
                      {/* Exams Category */}
                      <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg p-3 border border-red-100">
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                          <span className="text-sm font-medium text-red-800">Exams</span>
                          <span className="ml-auto text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                            4 columns
                          </span>
                        </div>
                        <div className="text-xs text-red-700 bg-white bg-opacity-50 rounded p-2">
                          PE - Prelim Exam, ME - Midterm Exam, PFE - PreFinal Exam, FE - Final Exam
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 flex items-center">
                        <FiInfo className="mr-1" size={12} />
                        All categories will be properly organized with merged header cells in the spreadsheet
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {previewData && previewData.sheetName && (
                <div className="text-xs bg-[#EEF0F8] text-[#333D79] px-3 py-1.5 rounded-md inline-block">
                  <span className="font-medium">Active Sheet:</span> {previewData.sheetName}
                </div>
              )}
            </div>
          </div>
          
          {previewError && (
            <div className="bg-red-50 border border-red-100 text-red-800 rounded-lg p-4 mt-4 flex items-start">
              <FiX className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Preview Error</p>
                <p className="text-sm text-red-700">{previewError}</p>
              </div>
            </div>
          )}
          
          {!previewData && (
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center mt-4 ${
                isDragging ? 'border-[#333D79] bg-[#EEF0F8]' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
                <div className={`mb-4 rounded-full bg-[#EEF0F8] p-4 ${isDragging ? 'animate-pulse-custom' : ''}`}>
                  <MdDragIndicator className="h-12 w-12 text-[#333D79]" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Import Students</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-md">
                  Upload a spreadsheet with your student data to get started
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  {(!teamAccess || teamAccess.accessLevel !== 'view') ? (
                    <label htmlFor="file-upload">
                      <div className="bg-[#333D79] hover:bg-[#4A5491] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer">
                        <FiUpload size={18} />
                        <span>Upload Students</span>
                      </div>
                      <input 
                        id="file-upload" 
                        type="file" 
                        accept=".xlsx,.xls,.csv" 
                        className="hidden"
                        onChange={handleFileInput}
                      />
                    </label>
                  ) : (
                    <div className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2">
                      <FiEye size={18} />
                      <span>View Student Data</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 flex items-center mt-2">
                  <FiInfo className="mr-1 text-[#333D79]" size={12} />
                  <span>Supported formats: .xlsx, .xls, .csv</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t p-4 flex justify-between space-x-3 bg-gray-50">
          <button 
            onClick={cancelImport}
            className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={processSelectedFile}
            className="px-4 py-2 text-white bg-[#333D79] hover:bg-[#4A5491] rounded-lg transition-colors flex items-center shadow-sm"
            disabled={!previewData && !previewInfo}
          >
            <FiCheckCircle className="mr-2" />
            <span>Import File</span>
          </button>
        </div>
      </div>
    </div>
  );
};

ImportPreviewModal.propTypes = {
  showPreview: PropTypes.bool,
  previewInfo: PropTypes.shape({
    name: PropTypes.string,
    type: PropTypes.string,
    size: PropTypes.string,
    lastModified: PropTypes.string
  }),
  previewData: PropTypes.shape({
    totalRows: PropTypes.number,
    totalColumns: PropTypes.number,
    headers: PropTypes.array,
    data: PropTypes.array,
    nestedHeaders: PropTypes.array,
    sheetName: PropTypes.string
  }),
  previewError: PropTypes.string,
  cancelImport: PropTypes.func.isRequired,
  processSelectedFile: PropTypes.func.isRequired,
  teamAccess: PropTypes.shape({
    accessLevel: PropTypes.string
  }),
  isDragging: PropTypes.bool,
  handleDragOver: PropTypes.func,
  handleDragLeave: PropTypes.func,
  handleDrop: PropTypes.func,
  handleFileInput: PropTypes.func
};

export default ImportPreviewModal;