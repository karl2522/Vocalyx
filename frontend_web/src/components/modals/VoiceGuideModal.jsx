import React from 'react';
import { Mic, X, User, Users, Hash, Plus, Settings, Download, Trash2 } from 'lucide-react';

const VoiceGuideModal = ({ showVoiceGuide, setShowVoiceGuide }) => {
  if (!showVoiceGuide) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowVoiceGuide(false)}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mic className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Voice Commands Guide</h2>
              <p className="text-sm text-slate-600">Complete reference for all voice commands</p>
            </div>
          </div>
          <button
            onClick={() => setShowVoiceGuide(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Quick Start */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Quick Start</span>
            </h3>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium text-blue-900 mb-2">🎯 Grade Entry</div>
                  <div className="text-blue-700 space-y-1">
                    <div>"[Student Name] [Column] [Score]"</div>
                    <div className="text-xs text-blue-600">Example: "Maria Quiz 1 eighty-five"</div>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-blue-900 mb-2">👥 Add Student</div>
                  <div className="text-blue-700 space-y-1">
                    <div>"Add student lastname [Last] firstname [First]"</div>
                    <div className="text-xs text-blue-600">Example: "Add student lastname Smith firstname John"</div>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-blue-900 mb-2">🗑️ Delete Student</div>
                  <div className="text-blue-700 space-y-1">
                    <div>"Delete student [Student Name]"</div>
                    <div className="text-xs text-blue-600">Example: "Delete student Maria"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Command Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Grade Entry Commands */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
                <h4 className="font-semibold text-slate-900">Grade Entry</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700 mb-2">By Student Name:</div>
                  <div className="bg-slate-50 rounded p-3 space-y-1 text-slate-600">
                    <div>"Maria Quiz 1 eighty-five"</div>
                    <div>"John Lab 2 score ninety"</div>
                    <div>"Sarah Assignment 3 seventy-five"</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Management */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="font-semibold text-slate-900">Student Management</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700 mb-2">Add Student:</div>
                  <div className="bg-slate-50 rounded p-3 space-y-1 text-slate-600">
                    <div>"Add student lastname Jane firstname Maria"</div>
                    <div>"Add student lastname Smith firstname John with student id 22-2711-726"</div>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-slate-700 mb-2">Delete Student:</div>
                  <div className="bg-red-50 rounded p-3 space-y-1 text-red-700 border border-red-200">
                    <div>"Delete student Maria"</div>
                    <div>"Remove student John"</div>
                    <div>"Delete student with id 22-2711-726"</div>
                    <div className="text-xs text-red-600 mt-2 italic">⚠️ This will permanently remove the student and compact remaining rows</div>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-slate-700 mb-2">Update Student ID:</div>
                  <div className="bg-slate-50 rounded p-3 space-y-1 text-slate-600">
                    <div>"Maria add student id 22-2711-726"</div>
                    <div>"Set student id 22-2711-726 for John"</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Deletion Commands - NEW DEDICATED SECTION */}
            <div className="bg-white border border-red-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <h4 className="font-semibold text-slate-900">Student Deletion</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700 mb-2">Delete by Name:</div>
                  <div className="bg-red-50 rounded p-3 space-y-1 text-red-700 border border-red-200">
                    <div>"Delete student Maria"</div>
                    <div>"Remove student John Doe"</div>
                    <div>"Drop student Sarah"</div>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-slate-700 mb-2">Delete by Student ID:</div>
                  <div className="bg-red-50 rounded p-3 space-y-1 text-red-700 border border-red-200">
                    <div>"Delete student with id 22-2711-726"</div>
                    <div>"Remove id 22-2711-726"</div>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-3">
                  <div className="font-medium text-amber-800 mb-1">⚡ Smart Features:</div>
                  <ul className="text-xs text-amber-700 space-y-1">
                    <li>• Automatically compacts remaining students</li>
                    <li>• Preserves formula columns (like Totals)</li>
                    <li>• Renumbers students sequentially</li>
                    <li>• Works with partial name matches</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Batch Commands */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <h4 className="font-semibold text-slate-900">Batch Grading</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700 mb-2">How to use Batch Grading:</div>
                  <div className="bg-slate-50 rounded p-3 space-y-2 text-slate-600">
                    <div className="flex items-start space-x-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">1</span>
                      <span>Click on <strong>Tools</strong> in the top menu</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">2</span>
                      <span>Select <strong>Batch Grading</strong> from the dropdown</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">3</span>
                      <span>Choose your target column (e.g., "Quiz 1", "Lab 2")</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">4</span>
                      <span>Start voice command and say: <strong>"Omen 50, Ogabang 50, Maria 85"</strong></span>
                    </div>
                  </div>
                </div>
                
                {/* Row Range Commands */}
                <div>
                  <div className="font-medium text-slate-700 mb-2">Row Range Commands:</div>
                  <div className="bg-emerald-50 rounded p-3 space-y-2 border border-emerald-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-emerald-800 font-medium text-xs">✅ WORKING COMMANDS</span>
                    </div>
                    <div className="space-y-1 text-emerald-700">
                      <div className="bg-emerald-100 px-2 py-1 rounded font-medium">
                        "Quiz 1: row 1 through 5 all get 50"
                      </div>
                      <div className="bg-emerald-100 px-2 py-1 rounded font-medium">
                        "Lab 2: row 1 through 10 score 85"
                      </div>
                      <div className="bg-emerald-100 px-2 py-1 rounded font-medium">
                        "Assignment 1: row 3 through 7 all score 75"
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Alternative Row Commands */}
                <div>
                  <div className="font-medium text-slate-700 mb-2">Alternative Row Patterns:</div>
                  <div className="bg-slate-50 rounded p-3 space-y-1 text-slate-600">
                    <div>"Quiz 1: row 1 to 5 all get 50"</div>
                    <div>"Lab 2: row 1 thru 10 score 85"</div>
                    <div>"Assignment 1: row 1 until 7 all score 75"</div>
                    <div>"Quiz 1 row 1 through 5 all get 50" <span className="text-xs text-slate-500">(without colon)</span></div>
                  </div>
                </div>
                
                {/* Everyone Commands */}
                <div>
                  <div className="font-medium text-slate-700 mb-2">Everyone Commands:</div>
                  <div className="bg-slate-50 rounded p-3 space-y-1 text-slate-600">
                    <div>"Quiz 1: everyone gets 50"</div>
                    <div>"Lab 2: all students present get 85"</div>
                    <div>"Assignment 1: entire class scores 75"</div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="font-medium text-blue-800 mb-1">💡 Pro Tip:</div>
                  <div className="text-xs text-blue-700">
                    Row range commands work great for giving the same score to consecutive students!
                  </div>
                </div>
              </div>
            </div>

            {/* Assignment Setup */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-orange-600" />
                </div>
                <h4 className="font-semibold text-slate-900">Assignment Setup</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700 mb-2">Set Max Scores:</div>
                  <div className="bg-slate-50 rounded p-3 space-y-1 text-slate-600">
                    <div>"Quiz 1 max score 30"</div>
                    <div>"Lab 2 total points 50"</div>
                    <div>"Assignment 3 out of 100"</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Utility Commands */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Hash className="w-4 h-4 text-indigo-600" />
                </div>
                <h4 className="font-semibold text-slate-900">Utility Commands</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700 mb-2">Sorting:</div>
                  <div className="bg-slate-50 rounded p-3 space-y-1 text-slate-600">
                    <div>"Sort students alphabetical"</div>
                    <div>"Sort by first name"</div>
                    <div>"Sort by last name"</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Commands */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Download className="w-4 h-4 text-green-600" />
                </div>
                <h4 className="font-semibold text-slate-900">Export Commands</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700 mb-2">Export Options:</div>
                  <div className="bg-slate-50 rounded p-3 space-y-1 text-slate-600">
                    <div>"Export PDF"</div>
                    <div>"Export Excel"</div>
                    <div>"Export CSV"</div>
                    <div>"Download PDF"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Tips */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span>Pro Tips & Best Practices</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <div className="font-medium text-amber-900 mb-2">💡 Accuracy Tips</div>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Speak clearly and at normal pace</li>
                  <li>• Use "twenty" instead of "20"</li>
                  <li>• Say "Quiz one" instead of "Quiz 1"</li>
                  <li>• Pause briefly between words</li>
                </ul>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="font-medium text-green-900 mb-2">⚡ Efficiency Tips</div>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Use batch commands for multiple entries</li>
                  <li>• Use Student ID for exact matching</li>
                  <li>• Set max scores before grade entry</li>
                  <li>• Check transcript for accuracy</li>
                </ul>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="font-medium text-blue-900 mb-2">🔧 Troubleshooting</div>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• If duplicate students, select from options</li>
                  <li>• Use "undo" if wrong entry</li>
                  <li>• Speak student names clearly</li>
                  <li>• Check microphone permissions</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Number Guidelines */}
          <div className="mt-6 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-4 border border-slate-200">
            <h4 className="font-medium text-slate-900 mb-3">📢 Number Speaking Guidelines</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-slate-700 mb-2">✅ Recommended:</div>
                <div className="text-slate-600 space-y-1">
                  <div>"eighty-five" (85)</div>
                  <div>"ninety-two" (92)</div>
                  <div>"seventy-five" (75)</div>
                  <div>"one hundred" (100)</div>
                </div>
              </div>
              <div>
                <div className="font-medium text-slate-700 mb-2">⚠️ Alternative (may work):</div>
                <div className="text-slate-600 space-y-1">
                  <div>"85" (eight five)</div>
                  <div>"92" (nine two)</div>
                  <div>"score 85"</div>
                  <div>"grade 92"</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-600">
            Press the floating microphone button to start voice commands
          </div>
          <button
            onClick={() => setShowVoiceGuide(false)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceGuideModal;