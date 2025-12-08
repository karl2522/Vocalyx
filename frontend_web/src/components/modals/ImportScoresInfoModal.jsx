import {
    BarChart3,
    CheckCircle,
    FileSpreadsheet,
    Lightbulb,
    Shield,
    Shuffle,
    Target,
    X
} from 'lucide-react';
import PropTypes from 'prop-types';

const ImportScoresInfoModal = ({ showModal, setShowModal, onProceed }) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-slate-200 flex-shrink-0" style={{ backgroundColor: '#333D79' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">Import Your Scores</h2>
                <p className="text-xs sm:text-sm text-white/90">Follow 3 easy steps to add scores from Excel</p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 sm:p-2 transition-all"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 md:space-y-5">

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
                  <FileSpreadsheet className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2 text-green-600 flex-shrink-0" />
                  <span className="truncate">Prepare Your Excel File</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 mb-2 sm:mb-3 md:mb-4 leading-relaxed">
                  Your Excel file needs student names and their scores. Here's what to include:
                </p>

                {/* Required Columns */}
                <div className="bg-white rounded-lg border-2 border-green-300 p-2 sm:p-3 md:p-4 mb-2 sm:mb-3 md:mb-4 shadow-sm">
                  <h4 className="font-bold text-slate-900 mb-2 sm:mb-3 text-xs sm:text-sm">Required Columns:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <div className="flex items-center space-x-2 sm:space-x-3 bg-green-50 rounded-lg p-2 sm:p-2.5 md:p-3 border border-green-200">
                      <CheckCircle className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-green-900 text-xs sm:text-sm">First Name</span>
                        <p className="text-xs text-green-700 mt-0.5">or "FirstName"</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 bg-green-50 rounded-lg p-2 sm:p-2.5 md:p-3 border border-green-200">
                      <CheckCircle className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-green-900 text-xs sm:text-sm">Last Name</span>
                        <p className="text-xs text-green-700 mt-0.5">or "LastName"</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 bg-green-50 rounded-lg p-2 sm:p-2.5 md:p-3 border border-green-200 sm:col-span-2">
                      <CheckCircle className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-green-900 text-xs sm:text-sm">Score Columns</span>
                        <p className="text-xs text-green-700 mt-0.5">Any names like "Quiz 1", "Assignment 1", "Lab Activity", etc.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Example Table */}
                <div className="bg-white rounded-lg border-2 border-green-300 overflow-x-auto shadow-sm">
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-2 sm:px-3 py-2 border-b border-green-300">
                    <p className="text-xs font-semibold text-green-900">Example:</p>
                  </div>
                  <div className="p-2 sm:p-3">
                    <table className="w-full text-xs sm:text-sm font-mono min-w-[450px]">
                      <thead className="bg-gradient-to-r from-slate-100 to-slate-200">
                        <tr>
                          <th className="px-2 sm:px-3 py-2 text-left font-bold text-slate-800 border-r border-slate-300">First Name</th>
                          <th className="px-2 sm:px-3 py-2 text-left font-bold text-slate-800 border-r border-slate-300">Last Name</th>
                          <th className="px-2 sm:px-3 py-2 text-left font-bold text-slate-800 border-r border-slate-300 whitespace-nowrap">Quiz 1</th>
                          <th className="px-2 sm:px-3 py-2 text-left font-bold text-slate-800 whitespace-nowrap">Lab Activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-slate-200 hover:bg-green-50 transition-colors">
                          <td className="px-2 sm:px-3 py-2 border-r border-slate-200">John</td>
                          <td className="px-2 sm:px-3 py-2 border-r border-slate-200">Smith</td>
                          <td className="px-2 sm:px-3 py-2 border-r border-slate-200 text-blue-600 font-semibold">85</td>
                          <td className="px-2 sm:px-3 py-2 text-blue-600 font-semibold">92</td>
                        </tr>
                        <tr className="border-t border-slate-200 hover:bg-green-50 transition-colors">
                          <td className="px-2 sm:px-3 py-2 border-r border-slate-200">Jane</td>
                          <td className="px-2 sm:px-3 py-2 border-r border-slate-200">Doe</td>
                          <td className="px-2 sm:px-3 py-2 border-r border-slate-200 text-blue-600 font-semibold">90</td>
                          <td className="px-2 sm:px-3 py-2 text-blue-600 font-semibold">88</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-2 sm:space-x-3 md:space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm sm:text-base md:text-lg shadow-md">
                  2
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 mb-2 sm:mb-3 flex items-center">
                  <Shuffle className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2 text-blue-600 flex-shrink-0" />
                  <span className="truncate">Map Your Columns (We'll Help!)</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 mb-2 sm:mb-3 md:mb-4 leading-relaxed">
                  After uploading, you'll choose where to put each score column. Don't worry - we make it easy!
                </p>

                <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
                  {/* Smart Matching */}
                  <div className="bg-white rounded-lg border-2 border-blue-300 p-2 sm:p-2.5 md:p-3 shadow-sm">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm mb-0.5 sm:mb-1">🎯 Smart Suggestions</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          We'll automatically suggest the best columns to use and warn you if something might overwrite existing scores!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Merge Strategies */}
                  <div className="bg-white rounded-lg border-2 border-blue-300 p-2 sm:p-2.5 md:p-3 shadow-sm">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm mb-1">🛡️ Choose How to Add Scores:</h4>
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs">
                          <div className="bg-slate-50 rounded p-2 border border-slate-200">
                            <span className="font-semibold text-slate-900">Replace All:</span>
                            <p className="text-slate-600 mt-0.5">Overwrite everything</p>
                          </div>
                          <div className="bg-slate-50 rounded p-2 border border-slate-200">
                            <span className="font-semibold text-slate-900">Skip Existing:</span>
                            <p className="text-slate-600 mt-0.5">Keep current scores</p>
                          </div>
                          <div className="bg-slate-50 rounded p-2 border border-slate-200">
                            <span className="font-semibold text-slate-900">Fill Empty:</span>
                            <p className="text-slate-600 mt-0.5">Only add to blanks</p>
                          </div>
                          <div className="bg-slate-50 rounded p-2 border border-slate-200">
                            <span className="font-semibold text-slate-900">Add Numbers:</span>
                            <p className="text-slate-600 mt-0.5">Sum with existing</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-2 sm:space-x-3 md:space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm sm:text-base md:text-lg shadow-md">
                  3
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 mb-2 sm:mb-3 flex items-center">
                  <CheckCircle className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2 text-purple-600 flex-shrink-0" />
                  <span className="truncate">Preview & Import Safely</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 mb-2 sm:mb-3 md:mb-4 leading-relaxed">
                  Before anything happens, you'll see a preview. Here's what we do automatically:
                </p>

                <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
                  <div className="flex items-start space-x-2 sm:space-x-3 bg-white rounded-lg p-2 sm:p-2.5 md:p-3 border border-purple-200">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-xs sm:text-sm">Match students by name</p>
                      <p className="text-xs text-slate-600 mt-0.5 sm:mt-1">Works even if your Excel has names in a different format!</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 sm:space-x-3 bg-white rounded-lg p-2 sm:p-2.5 md:p-3 border border-purple-200">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-xs sm:text-sm">Only update existing students</p>
                      <p className="text-xs text-slate-600 mt-0.5 sm:mt-1">Students not in your class are safely ignored</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 sm:space-x-3 bg-white rounded-lg p-2 sm:p-2.5 md:p-3 border border-purple-200">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-xs sm:text-sm">Rename column headers</p>
                      <p className="text-xs text-slate-600 mt-0.5 sm:mt-1">Headers will match your Excel exactly (e.g., "Quiz 1")</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 sm:space-x-3 bg-white rounded-lg p-2 sm:p-2.5 md:p-3 border border-purple-200">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-xs sm:text-sm">Preserve everything else</p>
                      <p className="text-xs text-slate-600 mt-0.5 sm:mt-1">Formulas, formatting, and other data stay untouched!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pro Tips Section */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-amber-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm mb-1.5 sm:mb-2">💡 Pro Tips for Success:</h4>
                <ul className="space-y-1 text-xs text-slate-700">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Use empty columns</strong> when possible - it's the safest option!</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Always check the preview</strong> before confirming the import</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Choose "Skip Existing"</strong> to protect scores already in your sheet</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Save your Excel file as <strong>.xlsx or .xls</strong> format</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex justify-between items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowModal(false)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              Cancel
            </button>

            <button
              onClick={() => {
                setShowModal(false);
                onProceed();
              }}
              className="px-4 sm:px-5 md:px-6 py-1.5 sm:py-2 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-md flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap"
              style={{ backgroundColor: '#333D79' }}
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Choose Excel File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

ImportScoresInfoModal.propTypes = {
  showModal: PropTypes.bool.isRequired,
  setShowModal: PropTypes.func.isRequired,
  onProceed: PropTypes.func.isRequired,
};

export default ImportScoresInfoModal;