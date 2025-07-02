import React from 'react';
import { Mic, X } from 'lucide-react';

const VoiceGuideModal = ({ showVoiceGuide, setShowVoiceGuide }) => {
  if (!showVoiceGuide) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowVoiceGuide(false)}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden"
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
              <p className="text-sm text-slate-600">Learn how to use voice commands efficiently</p>
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
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
          {/* Quick Start */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Quick Start</span>
            </h3>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-blue-900 mb-2">🎯 Basic Pattern</div>
                  <div className="text-blue-700 space-y-1">
                    <div>"[Student Name] [Column] [Score]"</div>
                    <div className="text-xs text-blue-600">Example: "Maria Quiz 1 eighty-five"</div>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-blue-900 mb-2">🔧 Controls</div>
                  <div className="text-blue-700 space-y-1">
                    <div>"undo" - Undo last action</div>
                    <div>"cancel" - Cancel current operation</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Command Types */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Single Entry */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <span className="text-emerald-600 font-bold text-sm">1</span>
                </div>
                <h4 className="font-semibold text-slate-900">Single Entry</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700 mb-1">Examples:</div>
                  <div className="bg-slate-50 rounded p-2 space-y-1 text-slate-600">
                    <div>"Maria Quiz 3 twenty"</div>
                    <div>"John Lab 2 eighty-five"</div>
                    <div>"Sarah Midterm seventy-five"</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Perfect for entering individual student grades quickly
                </div>
              </div>
            </div>

            {/* Batch List */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">N</span>
                </div>
                <h4 className="font-semibold text-slate-900">Batch List</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700 mb-1">Examples:</div>
                  <div className="bg-slate-50 rounded p-2 space-y-1 text-slate-600">
                    <div>"Quiz 1: John 85, Maria 92"</div>
                    <div>"Lab 2: Alice 90, Bob 85"</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Enter multiple students for the same assignment at once
                </div>
              </div>
            </div>

            {/* Batch Range */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-sm">∞</span>
                </div>
                <h4 className="font-semibold text-slate-900">Batch Range</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700 mb-1">Examples:</div>
                  <div className="bg-slate-50 rounded p-2 space-y-1 text-slate-600">
                    <div>"Midterm: Row 1 through 5, all score 90"</div>
                    <div>"Quiz 2: Everyone present gets 85"</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Assign the same grade to multiple students in a range
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span>Pro Tips</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <div className="font-medium text-amber-900 mb-2">💡 Accuracy Tips</div>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Speak clearly and at normal pace</li>
                  <li>• Use "twenty" instead of "20"</li>
                  <li>• Say "Quiz one" instead of "Quiz 1"</li>
                </ul>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="font-medium text-green-900 mb-2">⚡ Efficiency Tips</div>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Use batch commands for repeated grades</li>
                  <li>• Train voice recognition for better results</li>
                  <li>• Check transcript display for accuracy</li>
                </ul>
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceGuideModal;