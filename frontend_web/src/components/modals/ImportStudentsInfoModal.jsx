import { AlertTriangle, CheckCircle, FileText, Info, Upload, X } from 'lucide-react';
import React from 'react';

const ImportStudentsInfoModal = ({ showModal, onClose, onProceed }) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col"> {/* rounded + overflow for proper clipping */}
        {/* Header - Fixed */}
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-slate-200 flex-shrink-0" style={{ backgroundColor: '#333D79' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">Import Your Students</h2>
                <p className="text-xs sm:text-sm text-white/90">Follow 3 easy steps to add students from Excel</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 sm:p-2 transition-all"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">

          {/* Step 1 */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-2 sm:space-x-3 md:space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm sm:text-base md:text-lg shadow-md">
                  1
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 mb-2 sm:mb-3 flex items-center">
                  <FileText className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2 text-green-600 flex-shrink-0" />
                  <span className="truncate">Prepare Your Excel File</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 mb-2 sm:mb-3 md:mb-4 leading-relaxed">
                  Open your Excel file and make sure it has these column headers in the <strong>first row</strong>:
                </p>

                {/* Column Headers Visual */}
                <div className="bg-white rounded-lg border-2 border-green-300 p-2 sm:p-3 md:p-4 mb-2 sm:mb-3 md:mb-4 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <div className="flex items-center space-x-2 sm:space-x-3 bg-green-50 rounded-lg p-2 sm:p-2.5 md:p-3 border border-green-200">
                      <CheckCircle className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-green-900 text-xs sm:text-sm">NO.</span>
                        <p className="text-xs text-green-700 mt-0.5">Student number (1, 2, 3...)</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 bg-green-50 rounded-lg p-2 sm:p-2.5 md:p-3 border border-green-200">
                      <CheckCircle className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-green-900 text-xs sm:text-sm">LASTNAME</span>
                        <p className="text-xs text-green-700 mt-0.5">Student's last name</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 bg-green-50 rounded-lg p-2 sm:p-2.5 md:p-3 border border-green-200">
                      <CheckCircle className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-green-900 text-xs sm:text-sm">FIRST NAME</span>
                        <p className="text-xs text-green-700 mt-0.5">Student's first name</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 bg-blue-50 rounded-lg p-2 sm:p-2.5 md:p-3 border border-blue-200">
                      <Info className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-blue-900 text-xs sm:text-sm">STUDENT ID</span>
                        <p className="text-xs text-blue-700 mt-0.5">Optional - for tracking</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 sm:p-2.5 md:p-3 flex items-start space-x-2 sm:space-x-3">
                  <AlertTriangle className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs sm:text-sm min-w-0">
                    <p className="font-semibold text-amber-900 mb-0.5 sm:mb-1">Important!</p>
                    <p className="text-amber-800">The column names must be typed <strong>EXACTLY</strong> as shown above (including uppercase letters and spacing).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 - Example */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-2 sm:space-x-3 md:space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm sm:text-base md:text-lg shadow-md">
                  2
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 mb-2 sm:mb-3 flex items-center">
                  <CheckCircle className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2 text-blue-600 flex-shrink-0" />
                  <span className="truncate">Check Your Format</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 mb-2 sm:mb-3 md:mb-4 leading-relaxed">
                  Your Excel file should look like this example. Each student gets one row:
                </p>

                {/* Example Table with better styling */}
                <div className="bg-white rounded-lg border-2 border-blue-300 overflow-x-auto shadow-sm">
                  <table className="w-full text-xs sm:text-sm min-w-[500px]">
                    <thead className="bg-gradient-to-r from-slate-100 to-slate-200">
                      <tr>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-left font-bold text-slate-800 border-r border-slate-300 whitespace-nowrap">NO.</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-left font-bold text-slate-800 border-r border-slate-300 whitespace-nowrap">LASTNAME</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-left font-bold text-slate-800 border-r border-slate-300 whitespace-nowrap">FIRST NAME</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-left font-bold text-slate-800 whitespace-nowrap">STUDENT ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t-2 border-slate-200 bg-white hover:bg-blue-50 transition-colors">
                        <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-r border-slate-200 text-slate-600 font-medium">1</td>
                        <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-r border-slate-200 text-slate-900">Smith</td>
                        <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-r border-slate-200 text-slate-900">John</td>
                        <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-slate-600">2023001</td>
                      </tr>
                      <tr className="border-t border-slate-200 bg-slate-50 hover:bg-blue-50 transition-colors">
                        <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-r border-slate-200 text-slate-600 font-medium">2</td>
                        <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-r border-slate-200 text-slate-900">Garcia</td>
                        <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-r border-slate-200 text-slate-900">Maria</td>
                        <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-slate-600">2023002</td>
                      </tr>
                      <tr className="border-t border-slate-200 bg-white hover:bg-blue-50 transition-colors">
                        <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-r border-slate-200 text-slate-600 font-medium">3</td>
                        <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-r border-slate-200 text-slate-900">Johnson</td>
                        <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-r border-slate-200 text-slate-900">Michael</td>
                        <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-slate-600">2023003</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 sm:mt-3 md:mt-4 bg-blue-100 border border-blue-300 rounded-lg p-2 sm:p-2.5 md:p-3 flex items-start space-x-2 sm:space-x-3">
                  <Info className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs sm:text-sm text-blue-900 min-w-0">
                    <p className="font-semibold mb-0.5 sm:mb-1">Pro Tip:</p>
                    <p>Save your file as an Excel file (.xlsx or .xls). CSV files won't work!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 - What Will Happen */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-2 sm:space-x-3 md:space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm sm:text-base md:text-lg shadow-md">
                  3
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 mb-2 sm:mb-3 flex items-center">
                  <Upload className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2 text-purple-600 flex-shrink-0" />
                  <span className="truncate">Upload & We'll Handle the Rest!</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 mb-2 sm:mb-3 md:mb-4 leading-relaxed">
                  Click "Choose Excel File" below. Here's what happens automatically:
                </p>

                <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
                  <div className="flex items-start space-x-2 sm:space-x-3 bg-white rounded-lg p-2 sm:p-2.5 md:p-3 border border-purple-200">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-xs sm:text-sm">We check for duplicates</p>
                      <p className="text-xs text-slate-600 mt-0.5 sm:mt-1">If a student already exists, we'll ask you what to do</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 sm:space-x-3 bg-white rounded-lg p-2 sm:p-2.5 md:p-3 border border-purple-200">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-xs sm:text-sm">New students are added safely</p>
                      <p className="text-xs text-slate-600 mt-0.5 sm:mt-1">They'll appear in your class list right away</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 sm:space-x-3 bg-white rounded-lg p-2 sm:p-2.5 md:p-3 border border-purple-200">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-xs sm:text-sm">Your existing data stays safe</p>
                      <p className="text-xs text-slate-600 mt-0.5 sm:mt-1">All grades, quizzes, and attendance remain unchanged</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Need Help Section */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-300 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-slate-600" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Need Help?</h4>
                <p className="text-xs text-slate-600 mt-0.5 sm:mt-1">
                  Make sure your Excel file is saved and closed before uploading. If you get an error, check that your column names match exactly!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0"> {/* 🔥 FIXED: Added flex-shrink-0 */}
          <div className="flex justify-between items-center gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              onClick={onProceed}
              className="px-4 sm:px-5 md:px-6 py-1.5 sm:py-2 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-md flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap"
              style={{ backgroundColor: '#333D79' }}
            >
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Choose Excel File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportStudentsInfoModal;