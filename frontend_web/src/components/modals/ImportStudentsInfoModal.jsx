import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, X, Info } from 'lucide-react';

const ImportStudentsInfoModal = ({ showModal, onClose, onProceed }) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"> {/* 🔥 FIXED: Added flex flex-col */}
        {/* Header - Fixed */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0"> {/* 🔥 FIXED: Added flex-shrink-0 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Import Students</h2>
                <p className="text-sm text-slate-600">Upload an Excel file to add students to your class</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6"> {/* 🔥 FIXED: Added flex-1 overflow-y-auto */}
          {/* Requirements Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-2">File Requirements</h3>
                <p className="text-sm text-amber-800 mb-3">
                  Your Excel file must contain the following columns to match your Google Sheet structure:
                </p>
                
                {/* Required Columns */}
                <div className="bg-white rounded-lg border border-amber-200 p-3 mb-3">
                  <h4 className="font-medium text-slate-900 mb-2 text-sm">Required Columns:</h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">NO.</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">LASTNAME</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">FIRST NAME</span>
                    </div>
                  </div>
                </div>

                {/* Optional Column */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-slate-900 mb-2 text-sm">Optional Column:</h4>
                  <div className="flex items-center space-x-2 text-sm">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">STUDENT ID</span>
                    <span className="text-blue-700">(helps prevent duplicates)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Example Table */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Example Excel Format:</span>
            </h3>
            
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-700 border-r border-slate-200">NO.</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700 border-r border-slate-200">LASTNAME</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700 border-r border-slate-200">FIRST NAME</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">STUDENT ID</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-200">
                    <td className="px-4 py-2 border-r border-slate-200 text-slate-600">1</td>
                    <td className="px-4 py-2 border-r border-slate-200">Smith</td>
                    <td className="px-4 py-2 border-r border-slate-200">John</td>
                    <td className="px-4 py-2">2023001</td>
                  </tr>
                  <tr className="border-t border-slate-200 bg-slate-25">
                    <td className="px-4 py-2 border-r border-slate-200 text-slate-600">2</td>
                    <td className="px-4 py-2 border-r border-slate-200">Garcia</td>
                    <td className="px-4 py-2 border-r border-slate-200">Maria</td>
                    <td className="px-4 py-2">2023002</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="px-4 py-2 border-r border-slate-200 text-slate-600">3</td>
                    <td className="px-4 py-2 border-r border-slate-200">Johnson</td>
                    <td className="px-4 py-2 border-r border-slate-200">Michael</td>
                    <td className="px-4 py-2">2023003</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* What Happens Section */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">What happens during import:</h3>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>System will check for duplicate students using names and Student IDs</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>You'll be asked how to handle any duplicates found</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>New students will be added with auto-generated numbers</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>Your existing grades and data will be preserved</span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-900 mb-1">Important Notes:</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• Column names must match exactly (case-sensitive)</li>
                  <li>• Only Excel files (.xlsx, .xls) are supported</li>
                  <li>• Make sure to review duplicates carefully before proceeding</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0"> {/* 🔥 FIXED: Added flex-shrink-0 */}
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onProceed}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Choose Excel File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportStudentsInfoModal;