import React, { useState } from 'react';
import { FiX, FiFileText, FiCheckCircle, FiInfo, FiEye, FiUpload } from 'react-icons/fi';
import { BsFiletypeXlsx, BsFiletypeCsv, BsFileEarmarkSpreadsheet } from 'react-icons/bs';
import { HiSwitchHorizontal } from 'react-icons/hi';
import { MdDragIndicator } from 'react-icons/md';
import CategorySelectionTab from '../CategorySelectionTab';

const ImportPreviewModal = ({ 
  showPreview, 
  previewInfo,
  previewData,
  previewError,
  previewTab,
  setPreviewTab,
  previewRowsToShow,
  handleShowMoreRows,
  cancelImport,
  processSelectedFile,
  detectedNameColumn,
  teamAccess,
  isDragging,
  handleDragOver, 
  handleDragLeave, 
  handleDrop,
  handleFileInput,
  customColumns = [],
  setCustomColumns = () => {},
  setShowAddColumnModal = () => {},
  handleAddColumnTemplate = () => {},
  selectedCategory,
  setSelectedCategory
}) => {
  if (!showPreview || !previewInfo) return null;

  const [existingCategories, setExistingCategories] = useState([]);

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
  };

  const handleCreateCategory = (newCategory) => {
    // Add the new category to the existing list
    setExistingCategories(prev => [...prev, newCategory]);
    
    // Select the newly created category
    setSelectedCategory(newCategory);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          cancelImport();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full animate-fadeIn h-[80vh] flex flex-col border border-gray-100">
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
        
        {/* Progress Steps */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${previewTab === 'info' ? 'bg-[#333D79] text-white' : 'bg-gray-100 text-gray-500'} mb-2`}>
                <span className="font-medium">1</span>
              </div>
              <span className={`text-xs ${previewTab === 'info' ? 'text-[#333D79] font-medium' : 'text-gray-500'}`}>File Info</span>
            </div>
            
            <div className={`flex-1 h-1 mx-2 ${previewTab === 'info' ? 'bg-gray-200' : 'bg-[#333D79]'}`}></div>
            
            <div className="flex flex-col items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${previewTab === 'data' ? 'bg-[#333D79] text-white' : previewTab === 'category' || previewTab === 'columns' ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-400'} mb-2`}>
                <span className="font-medium">2</span>
              </div>
              <span className={`text-xs ${previewTab === 'data' ? 'text-[#333D79] font-medium' : 'text-gray-500'}`}>Preview Data</span>
            </div>
            
            <div className={`flex-1 h-1 mx-2 ${previewTab === 'category' || previewTab === 'columns' ? 'bg-[#333D79]' : 'bg-gray-200'}`}></div>
            
            <div className="flex flex-col items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${previewTab === 'category' ? 'bg-[#333D79] text-white' : previewTab === 'columns' ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-400'} mb-2`}>
                <span className="font-medium">3</span>
              </div>
              <span className={`text-xs ${previewTab === 'category' ? 'text-[#333D79] font-medium' : 'text-gray-500'}`}>Select Category</span>
            </div>
            
            <div className={`flex-1 h-1 mx-2 ${previewTab === 'columns' ? 'bg-[#333D79]' : 'bg-gray-200'}`}></div>
            
            <div className="flex flex-col items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${previewTab === 'columns' ? 'bg-[#333D79] text-white' : 'bg-gray-100 text-gray-400'} mb-2`}>
                <span className="font-medium">4</span>
              </div>
              <span className={`text-xs ${previewTab === 'columns' ? 'text-[#333D79] font-medium' : 'text-gray-500'}`}>Map Columns</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
                      {previewTab === 'info' ? (
                        <div className="h-full overflow-y-auto p-6">
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
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                                        <span className="text-xs text-blue-600 font-bold">1</span>
                                      </div>
                                      <span className="text-sm text-gray-600">Data will be loaded into the spreadsheet editor</span>
                                    </li>
                                    <li className="flex items-start">
                                      <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center mt-0.5 mr-2">
                                        <span className="text-xs text-blue-600 font-bold">2</span>
                                      </div>
                                      <span className="text-sm text-gray-600">Filter, sort, and modify columns and rows</span>
                                    </li>
                                    <li className="flex items-start">
                                      <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center mt-0.5 mr-2">
                                        <span className="text-xs text-blue-600 font-bold">3</span>
                                      </div>
                                      <span className="text-sm text-gray-600">Save changes or export to a new file</span>
                                    </li>
                                  </ul>
                                </div>
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
                        </div>
                      ) : previewTab === 'data' ? (
                        <div className="h-full flex flex-col">
                          {previewError ? (
                            <div className="flex-1 flex items-center justify-center p-6">
                              <div className="bg-red-50 border border-red-100 text-red-800 rounded-lg p-6 max-w-lg shadow-sm">
                                <div className="flex items-center mb-4">
                                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mr-4">
                                    <FiX className="h-5 w-5 text-red-600" />
                                  </div>
                                  <h4 className="text-lg font-medium text-red-800">Data Preview Unavailable</h4>
                                </div>
                                <p className="text-sm mb-4 text-red-700">{previewError}</p>
                                <p className="text-sm text-red-700 italic">You can still proceed with the import, but preview is not available.</p>
                              </div>
                            </div>
                          ) : !previewData ? (
                            <div 
                              className={`border-2 border-dashed rounded-lg p-8 text-center ${
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
                                    <label htmlFor="file-upload" className="...">
                                      <div className="bg-[#333D79] hover:bg-[#4A5491] text-white px-5 py-2.5 rounded-lg flex items-center gap-2">
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
                                    // For view-only users, show data viewer without upload/edit
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
                          ) : (
                            <div className="flex-1 overflow-auto p-6">
                              <div className="mb-4 flex justify-between items-center">
                                <div className="flex items-center">
                                  <div className="mr-2 bg-[#EEF0F8] text-[#333D79] text-xs font-medium px-2.5 py-1 rounded-full">
                                    {Math.min(previewRowsToShow, previewData.data.length)} of {previewData.totalRows.toLocaleString()} rows
                                  </div>
                                  <span className="text-xs text-gray-500">showing preview only</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {previewData.sheetName && (
                                    <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
                                      {previewData.sheetName}
                                    </div>
                                  )}
                                  <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
                                    {previewData.totalColumns} columns
                                  </div>
                                </div>
                              </div>
                              
                              <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                      <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 border-r border-gray-200">
                                          #
                                        </th>
                                        {previewData.headers.map((header, idx) => (
                                          <th 
                                            key={idx}
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-200 last:border-r-0"
                                            style={{ maxWidth: '200px', minWidth: '150px' }}
                                          >
                                            {header}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                      {previewData.data.slice(0, previewRowsToShow).map((row, rowIdx) => (
                                        <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                                          <td className="px-4 py-2.5 text-sm text-gray-500 font-medium border-r border-gray-200">
                                            {rowIdx + 1}
                                          </td>
                                          {row.map((cell, cellIdx) => (
                                            <td
                                              key={cellIdx}
                                              className="px-4 py-2.5 text-sm text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-200 last:border-r-0"
                                              style={{ maxWidth: '200px', minWidth: '150px' }}
                                            >
                                              {String(cell)}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              
                              <div className="mt-4 flex items-center justify-center">
                                {previewRowsToShow < previewData.data.length ? (
                                  <button 
                                    onClick={handleShowMoreRows}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#EEF0F8] text-[#333D79] rounded-lg hover:bg-[#DDE3F2] transition-colors shadow-sm"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Show {Math.min(10, previewData.data.length - previewRowsToShow)} More Rows
                                  </button>
                                ) : (
                                  <div className="text-center text-xs text-gray-500 mt-2">
                                    Showing all available preview rows. Import the file to see all {previewData.totalRows.toLocaleString()} rows.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : previewTab === 'category' ? (
                        <CategorySelectionTab
                          existingCategories={existingCategories || []}
                          selectedCategory={selectedCategory}
                          onSelectCategory={handleSelectCategory}
                          onCreateCategory={handleCreateCategory}
                        />
                      ) : previewTab === 'columns' ? (
                        <div className="h-full overflow-y-auto p-6">
                          <div className="mb-4">
                            <h4 className="text-base font-medium text-gray-800 mb-2">Customize Column Mapping</h4>
                            <p className="text-sm text-gray-600 mb-4">
                              Map columns from your spreadsheet to student data fields. Student names will be automatically detected.
                            </p>
                            
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-6">
                              <div className="flex items-start">
                                <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 mr-3">
                                  <FiInfo className="h-3 w-3 text-blue-700" />
                                </div>
                                <div>
                                  <p className="text-sm text-blue-800 font-medium mb-1">Column Mapping Tips</p>
                                  <p className="text-xs text-blue-700">
                                    You can add additional columns for grading categories or student information. 
                                    Click on <strong>Add Default Columns</strong> to quickly add standard educational categories.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {previewData && (
                            <div className="border rounded-lg shadow-sm bg-white mb-6">
                              <div className="p-4 border-b bg-gray-50">
                                <h5 className="font-medium text-gray-700">Source Columns from File</h5>
                              </div>
                              <div className="p-4">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  {previewData.headers.map((header, idx) => (
                                    <div key={idx} className={`flex items-center border rounded-lg p-3 ${
                                      idx === detectedNameColumn 
                                        ? 'bg-[#EEF0F8] border-[#333D79]' 
                                        : 'bg-gray-50'
                                    }`}>
                                      <div className="h-8 w-8 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
                                        <span className="text-xs text-[#333D79] font-bold">{idx + 1}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{header}</p>
                                        <p className="text-xs text-gray-500">
                                          {idx === detectedNameColumn 
                                            ? 'Student Name (Auto-detected)' 
                                            : `Column ${idx + 1}`}
                                        </p>
                                      </div>
                                      {idx === detectedNameColumn && (
                                        <div className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                          Student Name
                        </div>
                      )}
                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                    
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="font-medium text-gray-700">Add Default Column Templates</h5>
                      <button
                              onClick={() => setShowAddColumnModal(true)}
                              className="text-sm bg-[#EEF0F8] text-[#333D79] px-3 py-1.5 rounded-md hover:bg-[#DCE3F9] transition-colors flex items-center"
                      >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add Custom Column
                      </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div 
                              onClick={() => handleAddColumnTemplate('quizzes')}
                              className={`border rounded-lg shadow-sm bg-white p-4 hover:border-[#333D79] cursor-pointer transition-colors relative ${
                                customColumns.some(col => col.id.includes('quiz')) ? 'border-[#333D79] bg-[#F8F9FF]' : ''
                              }`}
                            >
                              <div className="flex items-center mb-3">
                                <div className="h-8 w-8 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <h6 className="font-medium text-gray-800">Quizzes</h6>
                              </div>
                              <div className="text-xs text-gray-600 mb-2">
                                Adds columns for quiz scores with auto-calculated averages
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Quiz 1</span>
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Quiz 2</span>
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Quiz 3</span>
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Quiz Avg</span>
                              </div>
                              {customColumns.some(col => col.id.includes('quiz')) && (
                                <div className="absolute top-2 right-2">
                                  <div className="h-5 w-5 rounded-full bg-[#333D79] flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div 
                              onClick={() => handleAddColumnTemplate('labs')}
                              className={`border rounded-lg shadow-sm bg-white p-4 hover:border-[#333D79] cursor-pointer transition-colors relative ${
                                customColumns.some(col => col.id.includes('lab')) ? 'border-[#333D79] bg-[#F8F9FF]' : ''
                              }`}
                            >
                              <div className="flex items-center mb-3">
                                <div className="h-8 w-8 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                  </svg>
                                </div>
                                <h6 className="font-medium text-gray-800">Lab Activities</h6>
                              </div>
                              <div className="text-xs text-gray-600 mb-2">
                                Adds columns for tracking laboratory work and activities
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Lab 1</span>
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Lab 2</span>
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Lab 3</span>
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Lab Avg</span>
                              </div>
                              {customColumns.some(col => col.id.includes('lab')) && (
                                <div className="absolute top-2 right-2">
                                  <div className="h-5 w-5 rounded-full bg-[#333D79] flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div 
                              onClick={() => handleAddColumnTemplate('exams')}
                              className={`border rounded-lg shadow-sm bg-white p-4 hover:border-[#333D79] cursor-pointer transition-colors relative ${
                                customColumns.some(col => col.id.includes('exam') || col.id.includes('midterm') || col.id.includes('final')) ? 'border-[#333D79] bg-[#F8F9FF]' : ''
                              }`}
                            >
                              <div className="flex items-center mb-3">
                                <div className="h-8 w-8 rounded-full bg-[#EEF0F8] flex items-center justify-center mr-3">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                </div>
                                <h6 className="font-medium text-gray-800">Exams</h6>
                              </div>
                              <div className="text-xs text-gray-600 mb-2">
                                Adds columns for midterm, final and other examination scores
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Midterm</span>
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Final</span>
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Total</span>
                              </div>
                              {customColumns.some(col => col.id.includes('exam') || col.id.includes('midterm') || col.id.includes('final')) && (
                                <div className="absolute top-2 right-2">
                                  <div className="h-5 w-5 rounded-full bg-[#333D79] flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {customColumns.length > 0 && (
                            <div className="mb-6">
                              <div className="border rounded-lg shadow-sm bg-white">
                                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                                  <h5 className="font-medium text-gray-700">Added Custom Columns</h5>
                      <button
                                    onClick={() => setCustomColumns([])}
                                    className="text-xs text-red-600 hover:text-red-800"
                      >
                                    Clear All
                      </button>
                                </div>
                                <div className="p-4">
                                  <div className="flex flex-wrap gap-2">
                                    {customColumns.map((column, idx) => (
                                      <div key={idx} className="px-3 py-1.5 bg-[#EEF0F8] text-[#333D79] text-sm rounded-lg flex items-center gap-2">
                                        {column.name}
                      <button
                                          onClick={() => setCustomColumns(prev => prev.filter((_, i) => i !== idx))}
                                          className="text-[#333D79] hover:text-red-600"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="border-t pt-4 flex justify-end">
                            <div className="flex items-center text-xs text-gray-500 mr-auto">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Selected columns will be added to your spreadsheet
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
        
        <div className="border-t p-4 flex justify-between space-x-3 bg-gray-50">
          <div className="flex space-x-3">
            {previewTab !== 'info' && (
              <button
                onClick={() => setPreviewTab(previewTab === 'data' ? 'info' : 'data')}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            {previewTab === 'columns' && (
              <button
                onClick={() => {
                  setPreviewTab('info');
                  processSelectedFile();
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Skip Column Mapping
              </button>
            )}
            <button
              onClick={
                previewTab === 'info' ? () => setPreviewTab('data') : 
                previewTab === 'data' ? () => setPreviewTab('category') :
                previewTab === 'category' ? () => setPreviewTab('columns') :
                () => processSelectedFile(selectedCategory)
              }
              className="px-4 py-2 text-white bg-[#333D79] hover:bg-[#4A5491] rounded-lg transition-colors flex items-center shadow-sm"
              disabled={previewTab === 'category' && !selectedCategory}
            >
              {previewTab === 'columns' ? (
                <>
                  <FiCheckCircle className="mr-2" />
                  <span>Import File</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportPreviewModal;