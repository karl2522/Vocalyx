import {
  BarChart3,
  CheckCircle,
  FileSpreadsheet,
  Lightbulb,
  Shield,
  Shuffle,
  Target
} from 'lucide-react';
import PropTypes from 'prop-types';

const ImportScoresInfoModal = ({ showModal, setShowModal, onProceed }) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header - Subtle gradient, icons, extra padding */}
        <div className="px-7 py-6 border-b border-slate-200 bg-gradient-to-r from-[#E6E9F7] to-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E6E9F7' }}>
                <BarChart3 className="w-5 h-5" style={{ color: '#333D79' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Import Scores</h2>
                <p className="text-sm text-slate-600">Upload an Excel file to add scores to your class</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#E6E9F7', color: '#333D79' }}>
                <Shield className="w-3.5 h-3.5" />
                Safe Import
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#E6E9F7', color: '#333D79' }}>
                <Shuffle className="w-3.5 h-3.5" />
                Auto-mapping
              </span>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-6">
            {/* How it Works */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center space-x-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span>How Score Import Works</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600 mb-2">1</div>
                  <h4 className="font-medium text-blue-900 mb-1">Upload Excel File</h4>
                  <p className="text-sm text-blue-700">Choose an Excel file with student names and their scores</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600 mb-2">2</div>
                  <h4 className="font-medium text-purple-900 mb-1">Map Columns</h4>
                  <p className="text-sm text-purple-700">Choose which template columns to update with your scores</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600 mb-2">3</div>
                  <h4 className="font-medium text-green-900 mb-1">Smart Import</h4>
                  <p className="text-sm text-green-700">Scores are automatically matched to existing students</p>
                </div>
              </div>
            </div>

            {/* Excel Format Requirements */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <span>Excel File Format</span>
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm text-slate-700 mb-3">Your Excel file should have these columns:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Required Columns:</h4>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li>• <strong>First Name</strong> or <strong>FirstName</strong></li>
                      <li>• <strong>Last Name</strong> or <strong>LastName</strong></li>
                      <li>• One or more <strong>score columns</strong> (Quiz 1, Assignment 1, etc.)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Example:</h4>
                    <div className="bg-white border rounded p-2 text-xs font-mono">
                      <div className="grid grid-cols-4 gap-2 border-b pb-1 font-bold">
                        <span>First Name</span>
                        <span>Last Name</span>
                        <span>Quiz 1</span>
                        <span>Lab Activity</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        <span>John</span>
                        <span>Smith</span>
                        <span>85</span>
                        <span>92</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <span>Jane</span>
                        <span>Doe</span>
                        <span>90</span>
                        <span>88</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Mapping Features */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center space-x-2">
                <Shuffle className="w-5 h-5 text-indigo-600" />
                <span>Smart Column Mapping</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-medium text-indigo-900 mb-2">🎯 Intelligent Matching</h4>
                  <ul className="space-y-1 text-sm text-indigo-700">
                    <li>• Automatically suggests the best columns to use</li>
                    <li>• Shows risk levels (Safe, Caution, High Risk)</li>
                    <li>• Prevents overwriting important data accidentally</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">🛡️ Merge Strategies</h4>
                  <ul className="space-y-1 text-sm text-yellow-700">
                    <li>• <strong>Replace All:</strong> Overwrite existing scores</li>
                    <li>• <strong>Skip Existing:</strong> Keep current scores, add new ones</li>
                    <li>• <strong>Fill Empty:</strong> Only update empty cells</li>
                    <li>• <strong>Add Numbers:</strong> Sum with existing scores</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* What Happens */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>What Will Happen</span>
              </h3>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <ul className="space-y-2 text-sm text-emerald-700">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Column headers will be renamed</strong> to match your Excel file (e.g., &quot;QUIZ 1&quot; becomes &quot;Quiz 1&quot;)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Students are matched by name</strong> - works with different name formats</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Only existing students get scores</strong> - new students in Excel are ignored</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Your template structure is preserved</strong> - formulas and formatting remain intact</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Import history is tracked</strong> - prevents accidental duplicate imports</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Safety Features */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-red-600" />
                <span>Safety Features</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">🔒 Data Protection</h4>
                  <ul className="space-y-1 text-sm text-red-700">
                    <li>• Preview before any changes are made</li>
                    <li>• Choose how to handle existing data</li>
                    <li>• See exactly which students will be affected</li>
                  </ul>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-900 mb-2">⚠️ Conflict Resolution</h4>
                  <ul className="space-y-1 text-sm text-orange-700">
                    <li>• Clear warnings for risky operations</li>
                    <li>• Smart suggestions for safe columns</li>
                    <li>• Option to skip columns with existing data</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                <span>Pro Tips</span>
              </h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <ul className="space-y-2 text-sm text-amber-700">
                  <li className="flex items-start space-x-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Start with empty columns</strong> when possible for the safest import</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Use &quot;Merge - Skip Existing&quot;</strong> to protect scores already in your sheet</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Check the preview</strong> before confirming to ensure everything looks correct</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Column names will be renamed</strong> to match your Excel headers exactly</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={() => {
                setShowModal(false);
                onProceed();
              }}
              className="px-6 py-2 text-white rounded-lg font-medium transition-colors shadow-md flex items-center space-x-2"
              style={{ backgroundColor: '#333D79' }}
            >
              <BarChart3 className="w-4 h-4" />
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