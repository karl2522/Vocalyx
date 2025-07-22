import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, FileText, Users, Eye, EyeOff } from 'lucide-react';

const ImportStudentsModal = ({ 
  showImportModal, 
  importConflicts, 
  setImportConflicts,
  setShowImportModal,
  setImportProgress,
  executeImport,
  newStudentsCount = 0,
  newStudentsData = [],
}) => {
  const [showDetails, setShowDetails] = useState(true);
  const [selectedTab, setSelectedTab] = useState('conflicts'); // 'conflicts' or 'summary'
  
  if (!showImportModal) return null;
  
  const handleConflictAction = (index, action) => {
    setImportConflicts(prev => prev.map((conflict, i) => 
      i === index ? { ...conflict, action } : conflict
    ));
  };
  
  const handleProceedImport = () => {
    const newStudents = newStudentsData; 
    const resolvedConflicts = importConflicts;
    
    // 🔥 FIXED: Close modal immediately for better UX
    setShowImportModal(false);
    setImportConflicts([]);
    
    // 🔥 FIXED: Set importing status right away
    setImportProgress({ 
      status: 'importing', 
      message: 'Processing import... Please wait.' 
    });
    
    // Execute import (this will update progress as it goes)
    executeImport(newStudents, resolvedConflicts);
  };
  
  const handleCancel = () => {
    setShowImportModal(false);
    setImportConflicts([]);
    setImportProgress(null);
  };
  
  const skipCount = importConflicts.filter(c => c.action === 'skip').length;
  const overrideCount = importConflicts.filter(c => c.action === 'override').length;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Enhanced Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-6 h-6 text-blue-600" />
                <span>Import Students - Resolve Conflicts</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Found {importConflicts.length} duplicate students. Review and decide how to handle them.
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Stats Cards */}
              <div className="flex space-x-3">
                <div className="bg-green-100 px-3 py-2 rounded-lg text-center">
                  <div className="text-lg font-bold text-green-800">{newStudentsCount}</div>
                  <div className="text-xs text-green-600">New Students</div>
                </div>
                <div className="bg-yellow-100 px-3 py-2 rounded-lg text-center">
                  <div className="text-lg font-bold text-yellow-800">{importConflicts.length}</div>
                  <div className="text-xs text-yellow-600">Conflicts</div>
                </div>
              </div>
              
              {/* Toggle Details */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center space-x-1 text-slate-600 hover:text-slate-800 transition-colors"
              >
                {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="text-sm">{showDetails ? 'Hide' : 'Show'} Details</span>
              </button>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => setSelectedTab('conflicts')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === 'conflicts'
                  ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Resolve Conflicts ({importConflicts.length})
            </button>
            <button
              onClick={() => setSelectedTab('summary')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === 'summary'
                  ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Import Summary
            </button>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {selectedTab === 'conflicts' ? (
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {showDetails ? (
                /* 🔥 ENHANCED: Side-by-side comparison table */
                <div className="space-y-6">
                  {importConflicts.map((conflict, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                      {/* Conflict Header */}
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-3 border-b border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            <div>
                              <h3 className="font-semibold text-slate-900">
                                Duplicate Student #{index + 1}
                              </h3>
                              <p className="text-sm text-slate-600">
                                Name: <span className="font-medium">{conflict.importStudent['FIRST NAME']} {conflict.importStudent.LASTNAME}</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleConflictAction(index, 'skip')}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                conflict.action === 'skip'
                                  ? 'bg-yellow-200 text-yellow-900 border-2 border-yellow-400 shadow-md'
                                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-yellow-50 hover:border-yellow-300'
                              }`}
                            >
                              <XCircle className="w-4 h-4 inline mr-1" />
                              Skip Import
                            </button>
                            <button
                              onClick={() => handleConflictAction(index, 'override')}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                conflict.action === 'override'
                                  ? 'bg-red-200 text-red-900 border-2 border-red-400 shadow-md'
                                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-red-50 hover:border-red-300'
                              }`}
                            >
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              Override
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* 🔥 Side-by-Side Comparison */}
                      <div className="grid grid-cols-2 gap-0">
                        {/* Existing Student (Left) */}
                        <div className="p-4 bg-blue-50/50 border-r border-slate-200">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <h4 className="font-semibold text-blue-900">Existing in Google Sheets</h4>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="bg-white rounded-lg p-3 border border-blue-200">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-slate-500">First Name:</span>
                                  <div className="font-medium text-slate-900">
                                    {conflict.existingStudent['FIRST NAME']}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-slate-500">Last Name:</span>
                                  <div className="font-medium text-slate-900">
                                    {conflict.existingStudent['LASTNAME']}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-slate-500">Row Number:</span>
                                  <div className="font-medium text-blue-700">
                                    #{conflict.existingStudent.rowIndex + 1}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-slate-500">Student ID:</span>
                                  <div className="font-medium text-slate-900">
                                    {conflict.existingStudent['STUDENT ID'] || 'Not set'}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Show existing grades if any */}
                            <div className="text-xs text-slate-600 bg-blue-100 p-2 rounded">
                              📊 <strong>Has existing data:</strong> This student already has grades and information in your sheet.
                            </div>
                          </div>
                        </div>
                        
                        {/* Import Student (Right) */}
                        <div className="p-4 bg-green-50/50">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <h4 className="font-semibold text-green-900">From Import File</h4>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="bg-white rounded-lg p-3 border border-green-200">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-slate-500">First Name:</span>
                                  <div className="font-medium text-slate-900">
                                    {conflict.importStudent['FIRST NAME']}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-slate-500">Last Name:</span>
                                  <div className="font-medium text-slate-900">
                                    {conflict.importStudent.LASTNAME}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-slate-500">From Row:</span>
                                  <div className="font-medium text-green-700">
                                    #{conflict.importStudent.originalRow}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-slate-500">Student ID:</span>
                                  <div className="font-medium text-slate-900">
                                    {conflict.importStudent['STUDENT ID'] || 'Not provided'}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action explanation */}
                            <div className={`text-xs p-2 rounded ${
                              conflict.action === 'skip' 
                                ? 'text-yellow-800 bg-yellow-100' 
                                : 'text-red-800 bg-red-100'
                            }`}>
                              {conflict.action === 'skip' ? (
                                <>🚫 <strong>Will be skipped:</strong> Import data will be ignored, existing student remains unchanged.</>
                              ) : (
                                <>⚠️ <strong>Will override:</strong> Existing student data may be updated with import data.</>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Simple List View */
                <div className="space-y-3">
                  {importConflicts.map((conflict, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center space-x-4">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <div>
                          <h3 className="font-medium text-slate-900">
                            {conflict.importStudent['FIRST NAME']} {conflict.importStudent.LASTNAME}
                          </h3>
                          <p className="text-sm text-slate-600">
                            Exists in row {conflict.existingStudent.rowIndex + 1}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleConflictAction(index, 'skip')}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            conflict.action === 'skip'
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Skip
                        </button>
                        <button
                          onClick={() => handleConflictAction(index, 'override')}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            conflict.action === 'override'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Override
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Summary Tab */
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* New Students */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h3 className="font-semibold text-green-900">New Students</h3>
                  </div>
                  <div className="text-2xl font-bold text-green-800 mb-1">{newStudentsCount}</div>
                  <p className="text-sm text-green-700">Will be added to your sheet with auto-generated numbers</p>
                </div>
                
                {/* Skipped */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <XCircle className="w-6 h-6 text-yellow-600" />
                    <h3 className="font-semibold text-yellow-900">Will Skip</h3>
                  </div>
                  <div className="text-2xl font-bold text-yellow-800 mb-1">{skipCount}</div>
                  <p className="text-sm text-yellow-700">Duplicates that will be ignored during import</p>
                </div>
                
                {/* Overrides */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <h3 className="font-semibold text-red-900">Will Override</h3>
                  </div>
                  <div className="text-2xl font-bold text-red-800 mb-1">{overrideCount}</div>
                  <p className="text-sm text-red-700">Existing students that will be updated</p>
                </div>
              </div>
              
              {/* Action Summary */}
              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-2">What will happen:</h4>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>• {newStudentsCount} new students will be added with auto-generated numbers</li>
                  <li>• {skipCount} duplicate students will be skipped (no changes)</li>
                  <li>• {overrideCount} existing students will be updated</li>
                  <li>• Your existing template structure will be preserved</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        
        {/* Enhanced Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex justify-between items-center">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
            >
              Cancel Import
            </button>
            
            <div className="flex items-center space-x-4">
              {/* Action Summary */}
              <div className="text-sm text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200">
                <span className="font-medium">{newStudentsCount} new</span>, 
                <span className="font-medium text-yellow-700"> {skipCount} skip</span>, 
                <span className="font-medium text-red-700"> {overrideCount} override</span>
              </div>
              
              <button
                onClick={handleProceedImport}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
              >
                Proceed with Import
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportStudentsModal;