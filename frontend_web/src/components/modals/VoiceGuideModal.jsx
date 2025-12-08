import { AlertTriangle, BookOpen, CheckCircle, Download, Hash, Lightbulb, Megaphone, Mic, Plus, Settings, Target, Trash2, User, Users, Wrench, X, Zap, Volume2, HelpCircle, Award } from 'lucide-react';
import React, { useState } from 'react';
import {
  FaMicrophoneAlt,
  FaEdit,
  FaBullseye,
  FaRocket,
  FaLightbulb,
  FaCheckCircle,
  FaInfoCircle,
  FaTimesCircle,
  FaTrash,
  FaExclamationTriangle,
  FaChartBar,
} from 'react-icons/fa';

const VoiceGuideModal = ({ showVoiceGuide, setShowVoiceGuide }) => {
  const [activeTab, setActiveTab] = useState('basics');

  if (!showVoiceGuide) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={() => setShowVoiceGuide(false)}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - match InteractiveTutorialModal colors */}
        <div className="bg-gradient-to-r from-[#333D79] to-[#4A5491] px-6 py-4 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Voice Command Guide</h2>
                <p className="text-sm text-white/80">Grade faster by speaking naturally - no typing needed!</p>
              </div>
            </div>
            <button
              onClick={() => setShowVoiceGuide(false)}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation - Enhanced */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 flex-shrink-0">
          <div className="flex space-x-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('basics')}
              className={`px-6 py-3 font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === 'basics'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span>Getting Started</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('grading')}
              className={`px-6 py-3 font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === 'grading'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center space-x-2">
                <Award className="w-4 h-4" />
                <span>Recording Grades</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-6 py-3 font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === 'students'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Managing Students</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`px-6 py-3 font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === 'tips'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center space-x-2">
                <Lightbulb className="w-4 h-4" />
                <span>Tips & Troubleshooting</span>
              </span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white custom-scrollbar">
          
          {/* BASICS TAB - Enhanced */}
          {activeTab === 'basics' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Welcome Message - Enhanced */}
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200 shadow-sm">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center space-x-2">
                      <span>Welcome to Voice Grading!</span>
                    </h3>
                    <p className="text-gray-700 text-base leading-relaxed mb-3">
                      Our voice command system lets you <strong className="text-indigo-600">record grades, manage students, and update your gradebook</strong> by simply <strong className="text-indigo-600">speaking</strong> instead of typing.  
                    </p>
                    <p className="text-gray-700 text-base leading-relaxed">
                      It's like having a <strong>personal grading assistant</strong> that listens to you!  Perfect for when you're grading papers, reviewing assignments, or need to work hands-free.
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Benefits - NEW */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span>Why Use Voice Commands?</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3 bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">3x Faster Grading</p>
                      <p className="text-sm text-gray-600">Grade 30+ students in minutes, not hours</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Fewer Mistakes</p>
                      <p className="text-sm text-gray-600">No more typos or wrong cells</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Hands-Free</p>
                      <p className="text-sm text-gray-600">Grade while holding papers or walking around</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Natural & Easy</p>
                      <p className="text-sm text-gray-600">Just speak like you normally would</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How to Start - Enhanced */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <FaMicrophoneAlt className="w-5 h-5 text-indigo-600" />
                  <span>How to Get Started in 4 Easy Steps</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-lg shadow-md group-hover:scale-110 transition-transform">1</div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-semibold mb-1 text-base">Find the microphone button</p>
                      <p className="text-gray-600 leading-relaxed">Look for the <strong className="text-blue-600">floating blue circular button</strong> at the bottom-right corner of your screen</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-lg shadow-md group-hover:scale-110 transition-transform">2</div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-semibold mb-1 text-base">Click to start listening</p>
                      <p className="text-gray-600 leading-relaxed">The button will turn <strong className="text-red-600">red</strong> and pulse when it's actively listening to your voice</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-lg shadow-md group-hover:scale-110 transition-transform">3</div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-semibold mb-1 text-base">Speak your command clearly</p>
                      <p className="text-gray-600 leading-relaxed">Use a normal speaking voice - no need to shout or speak too slowly!  Just talk naturally and clearly</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-lg shadow-md group-hover:scale-110 transition-transform">✓</div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-semibold mb-1 text-base">That's it! Grade recorded automatically</p>
                      <p className="text-gray-600 leading-relaxed">You'll see a <strong className="text-green-600">success message</strong> and the grade appears instantly in your gradebook.  No save button needed!</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* What Can You Do - NEW */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  <span>What Can You Do with Voice Commands? </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Record grades for individual students</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Grade multiple students at once</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Add new students to your class</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Remove students from class</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Update student information</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Set assignment max scores</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Sort and organize student lists</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Export grades to PDF</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GRADING TAB - Enhanced */}
          {activeTab === 'grading' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              
              {/* Quick Reference Card - NEW */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <h3 className="text-xl font-bold mb-3 flex items-center space-x-2">
                  <Target className="w-6 h-6" />
                  <span>Quick Reference: Grading Formula</span>
                </h3>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                  <p className="text-lg font-bold mb-2">Say these 3 things in order:</p>
                  <div className="flex items-center justify-center space-x-3 text-center flex-wrap">
                    <div className="bg-white text-indigo-900 px-4 py-2 rounded-lg font-bold shadow-md">
                      1. Assignment Name
                    </div>
                    <span className="text-2xl">→</span>
                    <div className="bg-white text-indigo-900 px-4 py-2 rounded-lg font-bold shadow-md">
                      2. Student Name
                    </div>
                    <span className="text-2xl">→</span>
                    <div className="bg-white text-indigo-900 px-4 py-2 rounded-lg font-bold shadow-md">
                      3. Score
                    </div>
                  </div>
                </div>
              </div>

              {/* Simple Grade Entry - Enhanced */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Recording One Student's Grade</h3>
                    <p className="text-sm text-gray-600">The most common way to grade</p>
                  </div>
                </div>
                
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-5 mb-5">
                  <p className="text-gray-800 font-bold mb-3 text-base flex items-center space-x-2">
                    <FaEdit className="w-4 h-4 text-green-600" />
                    <span>Basic Pattern:</span>
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full font-bold text-sm shadow-sm">1st</span>
                      <div className="flex-1">
                        <span className="text-gray-900 font-semibold">Assignment name</span>
                        <p className="text-sm text-gray-600 mt-0.5">Like "Quiz 1", "Lab 2", "Homework 3", "Midterm", etc.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full font-bold text-sm shadow-sm">2nd</span>
                      <div className="flex-1">
                        <span className="text-gray-900 font-semibold">Student name</span>
                        <p className="text-sm text-gray-600 mt-0.5">Last name works best!  Like "Smith", "Garcia", "Maria"</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full font-bold text-sm shadow-sm">3rd</span>
                      <div className="flex-1">
                        <span className="text-gray-900 font-semibold">The score</span>
                        <p className="text-sm text-gray-600 mt-0. 5">Say it as a number: "eighty-five", "ninety", "seventy-eight"</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="font-bold text-gray-900 text-base flex items-center space-x-2">
                    <FaBullseye className="w-4 h-4 text-indigo-600" />
                    <span>Real Examples You Can Try Right Now:</span>
                  </p>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border-2 border-blue-300 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">1</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-600 text-sm mb-2">Say exactly this:</p>
                        <p className="text-xl font-mono font-bold text-indigo-900 bg-blue-100 px-4 py-3 rounded-lg">"Quiz 1 Maria eighty-five"</p>
                      </div>
                    </div>
                    <div className="ml-11 bg-white rounded-lg p-3 border border-blue-200">
                      <p className="text-sm text-gray-700">
                        <strong className="text-green-600">Result:</strong> Maria gets 85 points in Quiz 1
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-5 border-2 border-purple-300 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">2</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-600 text-sm mb-2">Say exactly this:</p>
                        <p className="text-xl font-mono font-bold text-purple-900 bg-purple-100 px-4 py-3 rounded-lg">"Lab 2 John ninety"</p>
                      </div>
                    </div>
                    <div className="ml-11 bg-white rounded-lg p-3 border border-purple-200">
                      <p className="text-sm text-gray-700">
                        <strong className="text-green-600">Result:</strong> John gets 90 points in Lab 2
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-5 border-2 border-orange-300 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">3</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-600 text-sm mb-2">Say exactly this:</p>
                        <p className="text-xl font-mono font-bold text-orange-900 bg-orange-100 px-4 py-3 rounded-lg">"Midterm Sarah seventy-eight"</p>
                      </div>
                    </div>
                    <div className="ml-11 bg-white rounded-lg p-3 border border-orange-200">
                      <p className="text-sm text-gray-700">
                        <strong className="text-green-600">Result:</strong> Sarah gets 78 points in Midterm
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch Grading - Enhanced */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Batch Grading: Grade Many Students at Once</h3>
                    <p className="text-sm text-gray-600">The fastest way to grade an entire class! </p>
                  </div>
                </div>

                <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-5 mb-5">
                  <p className="text-gray-800 font-bold mb-4 text-base flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <FaRocket className="w-4 h-4 text-yellow-500" />
                    <span>Perfect for grading 10-30+ students in one go!</span>
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <span className="bg-purple-500 text-white px-3 py-1. 5 rounded-full font-bold text-sm shadow-sm flex-shrink-0">Step 1</span>
                      <div>
                        <p className="text-gray-900 font-semibold">Open Batch Grading Mode</p>
                        <p className="text-sm text-gray-600 mt-1">Click <strong>"Tools"</strong> button → Select <strong>"Batch Grading"</strong> from the menu</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="bg-purple-500 text-white px-3 py-1. 5 rounded-full font-bold text-sm shadow-sm flex-shrink-0">Step 2</span>
                      <div>
                        <p className="text-gray-900 font-semibold">Select the assignment</p>
                        <p className="text-sm text-gray-600 mt-1">Pick which assignment you're grading (e.g., "Quiz 1", "Lab 2", "Homework 3")</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="bg-purple-500 text-white px-3 py-1.5 rounded-full font-bold text-sm shadow-sm flex-shrink-0">Step 3</span>
                      <div>
                        <p className="text-gray-900 font-semibold">Click microphone and speak all grades</p>
                        <p className="text-sm text-gray-600 mt-1">Say student name, then score, separated by commas</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="font-bold text-gray-900 text-base flex items-center space-x-2">
                    <FaBullseye className="w-4 h-4 text-purple-600" />
                    <span>Real Batch Grading Examples:</span>
                  </p>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-5 border-2 border-purple-300">
                    <p className="text-gray-600 text-sm mb-2">Example 1: Grade 3 students</p>
                    <p className="text-lg font-mono font-bold text-purple-900 bg-purple-100 px-4 py-3 rounded-lg mb-3">
                      "Maria 85, John 90, Sarah 78"
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <p className="text-sm text-gray-700">
                        <strong className="text-green-600">Result:</strong> All three grades recorded instantly! 
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-5 border-2 border-blue-300">
                    <p className="text-gray-600 text-sm mb-2">Example 2: Grade 5 students</p>
                    <p className="text-lg font-mono font-bold text-blue-900 bg-blue-100 px-4 py-3 rounded-lg mb-3">
                      "Tom 88, Lisa 92, Mike 75, Emma 95, David 82"
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <p className="text-sm text-gray-700">
                        <strong className="text-green-600">Result:</strong> 5 grades in seconds!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Lightbulb className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900 mb-2 flex items-center space-x-2">
                        <FaLightbulb className="w-4 h-4 text-yellow-600" />
                        <span>Super Quick Tip: Same Score for Everyone</span>
                      </p>
                      <p className="text-sm text-gray-700 mb-2">If all students got the same grade, use this shortcut:</p>
                      <p className="text-base font-mono bg-yellow-100 px-4 py-2 rounded-lg text-yellow-900 font-bold">
                        "Quiz 1: everyone gets 50"
                      </p>
                      <p className="text-xs text-gray-600 mt-2">Gives all students 50 points on Quiz 1 in one command!</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Speaking Numbers - Enhanced */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                    <Hash className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">How to Say Numbers Correctly</h3>
                    <p className="text-sm text-gray-600">Important for accurate grade recording!</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-5">
                    <div className="flex items-center space-x-2 mb-4">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <p className="font-bold text-gray-900 text-base flex items-center space-x-2">
                        <FaCheckCircle className="w-4 h-4 text-green-600" />
                        <span>Best Way (Recommended)</span>
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Speak numbers as full words:</p>
                    <div className="space-y-2. 5">
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-green-200">
                        <span className="font-mono font-bold text-green-800">eighty-five</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-bold text-gray-700">85</span>
                      </div>
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-green-200">
                        <span className="font-mono font-bold text-green-800">ninety-two</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-bold text-gray-700">92</span>
                      </div>
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-green-200">
                        <span className="font-mono font-bold text-green-800">one hundred</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-bold text-gray-700">100</span>
                      </div>
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-green-200">
                        <span className="font-mono font-bold text-green-800">seventy</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-bold text-gray-700">70</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-5">
                    <div className="flex items-center space-x-2 mb-4">
                      <AlertTriangle className="w-6 h-6 text-blue-600" />
                      <p className="font-bold text-gray-900 text-base flex items-center space-x-2">
                        <FaInfoCircle className="w-4 h-4 text-blue-600" />
                        <span>Also Works (Alternative)</span>
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Add "score", "grade", or "points":</p>
                    <div className="space-y-2. 5">
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200">
                        <span className="font-mono font-bold text-blue-800">score 85</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-bold text-gray-700">85</span>
                      </div>
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200">
                        <span className="font-mono font-bold text-blue-800">grade 92</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-bold text-gray-700">92</span>
                      </div>
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200">
                        <span className="font-mono font-bold text-blue-800">points 100</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-bold text-gray-700">100</span>
                      </div>
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200">
                        <span className="font-mono font-bold text-blue-800">got 70</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-bold text-gray-700">70</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900 mb-1 flex items-center space-x-2">
                        <FaTimesCircle className="w-4 h-4 text-red-600" />
                        <span>Avoid These (May Not Work):</span>
                      </p>
                      <p className="text-sm text-gray-700">Don't say digits individually: <span className="font-mono bg-red-100 px-2 py-1 rounded">"eight five"</span> or <span className="font-mono bg-red-100 px-2 py-1 rounded">"9 2"</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STUDENTS TAB - Enhanced */}
          {activeTab === 'students' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              
              {/* Adding Students - Enhanced */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Adding a New Student to Your Class</h3>
                    <p className="text-sm text-gray-600">Enroll students by voice</p>
                  </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-5 mb-5">
                  <p className="text-gray-800 font-bold mb-3 text-base flex items-center space-x-2">
                    <FaEdit className="w-4 h-4 text-blue-600" />
                    <span>Command Pattern:</span>
                  </p>
                  <p className="text-xl font-mono font-bold text-blue-900 bg-blue-100 px-5 py-4 rounded-lg">
                    "Add student lastname [Last Name] firstname [First Name]"
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="font-bold text-gray-900 text-base flex items-center space-x-2">
                    <FaBullseye className="w-4 h-4 text-blue-600" />
                    <span>Real Examples:</span>
                  </p>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border-2 border-blue-300">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">1</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-600 text-sm mb-2">Say this:</p>
                        <p className="text-lg font-mono font-bold text-indigo-900 bg-blue-100 px-4 py-3 rounded-lg">
                          "Add student lastname Smith firstname John"
                        </p>
                      </div>
                    </div>
                    <div className="ml-11 bg-white rounded-lg p-3 border border-blue-200">
                      <p className="text-sm text-gray-700">
                        <strong className="text-green-600">Result:</strong> John Smith is added to your class roster
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-5 border-2 border-purple-300">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">2</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-600 text-sm mb-2">Say this:</p>
                        <p className="text-lg font-mono font-bold text-purple-900 bg-purple-100 px-4 py-3 rounded-lg">
                          "Add student lastname Garcia firstname Maria"
                        </p>
                      </div>
                    </div>
                    <div className="ml-11 bg-white rounded-lg p-3 border border-purple-200">
                      <p className="text-sm text-gray-700">
                        <strong className="text-green-600">Result:</strong> Maria Garcia is added to your class roster
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 bg-indigo-50 border-2 border-indigo-300 rounded-lg p-5">
                  <p className="font-bold text-gray-900 mb-3 flex items-center space-x-2">
                    <User className="w-5 h-5 text-indigo-600" />
                    <FaLightbulb className="w-4 h-4 text-indigo-600" />
                    <span>Adding with Student ID Number</span>
                  </p>
                  <p className="text-sm text-gray-700 mb-3">You can also include their student ID when adding them:</p>
                  <p className="text-base font-mono font-bold bg-indigo-100 px-4 py-3 rounded-lg text-indigo-900 mb-3">
                    "Add student lastname Smith firstname John with student id 22-2711-726"
                  </p>
                  <div className="bg-white rounded-lg p-3 border border-indigo-200">
                    <p className="text-sm text-gray-700">
                      <strong className="text-green-600">Result:</strong> John Smith added with ID 22-2711-726
                    </p>
                  </div>
                </div>
              </div>

              {/* Deleting Students - Enhanced */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Removing a Student from Your Class</h3>
                    <p className="text-sm text-gray-600">Permanently delete a student record</p>
                  </div>
                </div>

                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-5 mb-5">
                  <div className="flex items-start space-x-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-900 font-bold text-base flex items-center space-x-2">
                        <span>Warning: This Cannot Be Undone!</span>
                      </p>
                      <p className="text-red-800 text-sm mt-1">This permanently removes the student and all their grades from your gradebook.</p>
                    </div>
                  </div>
                  <p className="text-gray-800 font-bold mb-3 text-base flex items-center space-x-2">
                    <FaTrash className="w-4 h-4 text-red-600" />
                    <span>Command Pattern:</span>
                  </p>
                  <p className="text-xl font-mono font-bold text-red-900 bg-red-100 px-5 py-4 rounded-lg">
                    "Delete student [Name]"
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="font-bold text-gray-900 text-base flex items-center space-x-2">
                    <FaBullseye className="w-4 h-4 text-red-600" />
                    <span>Examples:</span>
                  </p>
                  
                  <div className="bg-red-50 rounded-lg p-5 border-2 border-red-300">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <X className="w-4 h-4 text-white font-bold" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-600 text-sm mb-2">Say this:</p>
                        <p className="text-lg font-mono font-bold text-red-900 bg-red-100 px-4 py-3 rounded-lg">
                          "Delete student Maria"
                        </p>
                      </div>
                    </div>
                    <div className="ml-11 bg-white rounded-lg p-3 border border-red-200">
                      <p className="text-sm text-gray-700">
                        <strong className="text-red-600">Result:</strong> Maria is removed from your class permanently
                      </p>
                    </div>
                  </div>

                  <div className="bg-red-50 rounded-lg p-5 border-2 border-red-300">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <X className="w-4 h-4 text-white font-bold" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-600 text-sm mb-2">Or say this:</p>
                        <p className="text-lg font-mono font-bold text-red-900 bg-red-100 px-4 py-3 rounded-lg">
                          "Remove student John Smith"
                        </p>
                      </div>
                    </div>
                    <div className="ml-11 bg-white rounded-lg p-3 border border-red-200">
                      <p className="text-sm text-gray-700">
                        <strong className="text-red-600">Result:</strong> John Smith is removed from your class permanently
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Updating Student Info - Enhanced */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Adding or Updating Student ID Numbers</h3>
                    <p className="text-sm text-gray-600">Update student information</p>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">Add or change a student's ID number for better tracking and accuracy:</p>

                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-5 border-2 border-indigo-300">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">1</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-600 text-sm mb-2">Method 1:</p>
                        <p className="text-lg font-mono font-bold text-indigo-900 bg-indigo-100 px-4 py-3 rounded-lg">
                          "Maria add student id 22-2711-726"
                        </p>
                      </div>
                    </div>
                    <div className="ml-11 bg-white rounded-lg p-3 border border-indigo-200">
                      <p className="text-sm text-gray-700">
                        <strong className="text-green-600">Result:</strong> ID number 22-2711-726 is added to Maria's record
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-5 border-2 border-purple-300">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">2</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-600 text-sm mb-2">Method 2:</p>
                        <p className="text-lg font-mono font-bold text-purple-900 bg-purple-100 px-4 py-3 rounded-lg">
                          "Set student id 22-2711-726 for John"
                        </p>
                      </div>
                    </div>
                    <div className="ml-11 bg-white rounded-lg p-3 border border-purple-200">
                      <p className="text-sm text-gray-700">
                        <strong className="text-green-600">Result:</strong> ID number 22-2711-726 is added to John's record
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900 mb-1 flex items-center space-x-2">
                        <span>Why use Student IDs?</span>
                      </p>
                      <p className="text-sm text-gray-700">Student IDs help when you have students with similar names (like two "John Smith"s).  Using IDs ensures you grade the right student every time! </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TIPS TAB - Enhanced */}
          {activeTab === 'tips' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              
              {/* Speaking Tips - Enhanced */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                    <Megaphone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Best Practices for Clear Voice Recognition</h3>
                    <p className="text-sm text-gray-600">Follow these tips for better accuracy</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-4 bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base">Speak at a normal, relaxed pace</p>
                      <p className="text-sm text-gray-600 mt-1">Don't rush or speak too slowly.  Talk like you're having a conversation with a colleague - natural and clear. </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base">Pause slightly between key words</p>
                      <p className="text-sm text-gray-600 mt-1">Give the system time to process each part: "Quiz 1 <em className="text-gray-400">... pause...</em> Maria <em className="text-gray-400">...pause...</em> eighty-five"</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base">Use full words for numbers</p>
                      <p className="text-sm text-gray-600 mt-1">Say "eighty-five" not "8-5".  Say "ninety-two" not "nine-two".  Full words work best! </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base">Find a quiet environment</p>
                      <p className="text-sm text-gray-600 mt-1">Background noise (fans, conversations, music) can interfere with recognition. A quiet room gives best results.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base">Check the microphone permission</p>
                      <p className="text-sm text-gray-600 mt-1">Make sure your browser has permission to use your microphone. Look for the microphone icon in your browser's address bar.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time-Saving Tips - Enhanced */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Work Faster & Smarter</h3>
                    <p className="text-sm text-gray-600">Power user tips to save hours of time</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-5 border-2 border-green-300">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FaRocket className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 mb-2 text-base">Use Batch Grading for groups</p>
                        <p className="text-sm text-gray-700">Instead of saying 20 individual commands, use batch grading to record 10-30 students in one voice command. Can save you 10+ minutes per assignment!</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-5 border-2 border-blue-300">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 mb-2 text-base">Last names are usually enough</p>
                        <p className="text-sm text-gray-700">Unless you have duplicate names, just saying "Maria" or "John" works perfectly.  No need for full names every time - save your breath!</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-5 border-2 border-purple-300">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FaChartBar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-gray -900 mb-2 text-base">Check the transcript after speaking</p> 
                        <p className="text-sm text-gray-700">After you speak, review what the system heard to make sure it understood correctly. If it got something wrong, just say it again!</p>
                      </div>
                    </div>
                  </div><div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-5 border-2 border-amber-300">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FaBullseye className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-2 text-base">Use assignment shortcuts</p>
                    <p className="text-sm text-gray-700">Once you're grading the same assignment repeatedly, the system learns your pattern.   "Quiz 1" becomes easier to recognize after first use. </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Troubleshooting - Enhanced */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Common Problems & Solutions</h3>
                <p className="text-sm text-gray-600">Quick fixes when things go wrong</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-5">
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaTimesCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 mb-2">Problem: "It recorded the wrong grade"</p>
                    <p className="text-sm text-gray-700 mb-3">Don't worry!  Just say the command again with the correct score.  The new grade will replace the old one.</p>
                    <div className="bg-white rounded-lg p-3 border border-red-300">
                      <p className="text-sm font-mono text-gray-800 mb-1">Say:</p>
                      <p className="text-base font-mono font-bold text-red-900">"Quiz 1 Maria ninety"</p>
                      <p className="text-xs text-gray-600 mt-2">This will replace Maria's old Quiz 1 score with 90</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-5">
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaTimesCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 mb-2">Problem: "The system can't hear me"</p>
                    <p className="text-sm text-gray-700 mb-3"><strong>Solution:</strong> Check your microphone permissions</p>
                    <div className="bg-white rounded-lg p-3 border border-orange-300">
                      <p className="text-sm text-gray-800 mb-2"><strong>Steps to fix:</strong></p>
                      <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                        <li>Look for a microphone icon in your browser's address bar</li>
                        <li>Click it and select "Allow" for microphone access</li>
                        <li>Refresh the page if needed</li>
                        <li>Try clicking the microphone button again</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-5">
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaTimesCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 mb-2">Problem: "It found the wrong student"</p>
                    <p className="text-sm text-gray-700 mb-3">This happens when multiple students have similar names (like "Maria Garcia" and "Maria Rodriguez")</p>
                    <div className="bg-white rounded-lg p-3 border border-yellow-300">
                      <p className="text-sm text-gray-800 mb-2"><strong>Solution:</strong> Use their full name or student ID</p>
                      <p className="text-sm font-mono text-gray-800 mb-2">Option 1: Use full name:</p>
                      <p className="text-base font-mono font-bold text-yellow-900 mb-3">"Quiz 1 Maria Garcia eighty-five"</p>
                      <p className="text-sm font-mono text-gray-800 mb-2">Option 2: Use student ID (most accurate):</p>
                      <p className="text-base font-mono font-bold text-yellow-900">"Quiz 1 student id 22-2711-726 score 85"</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaTimesCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 mb-2">Problem: "It doesn't understand the assignment name"</p>
                    <p className="text-sm text-gray-700 mb-3">Sometimes complex assignment names are hard to recognize</p>
                    <div className="bg-white rounded-lg p-3 border border-blue-300">
                      <p className="text-sm text-gray-800 mb-2"><strong>Tips:</strong></p>
                      <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                        <li>Use simple, short names like "Quiz 1" instead of "First Quiz of Module 3"</li>
                        <li>Spell out numbers: say "Quiz One" not "Quiz 1" if it's not working</li>
                        <li>Be consistent - use the same name every time</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-5">
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaTimesCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 mb-2">Problem: "The microphone button isn't responding"</p>
                    <p className="text-sm text-gray-700 mb-3"><strong>Solution:</strong> Try these steps:</p>
                    <div className="bg-white rounded-lg p-3 border border-purple-300">
                      <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                        <li>Refresh the page (press F5 or Ctrl+R)</li>
                        <li>Try a different browser (Chrome works best)</li>
                        <li>Check if another application is using your microphone</li>
                        <li>Restart your browser completely</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Other Useful Commands - Enhanced */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Other Useful Voice Commands</h3>
                <p className="text-sm text-gray-600">Additional features you can control by voice</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border-2 border-indigo-200">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaChartBar className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Sort students alphabetically:</p>
                    <p className="text-base font-mono bg-indigo-100 px-3 py-2 rounded font-bold text-indigo-900">"Sort students alphabetical"</p>
                    <p className="text-xs text-gray-600 mt-1">Organizes your class roster from A to Z</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border-2 border-blue-200">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Download className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Export gradebook to PDF:</p>
                    <p className="text-base font-mono bg-blue-100 px-3 py-2 rounded font-bold text-blue-900">"Export PDF"</p>
                    <p className="text-xs text-gray-600 mt-1">Creates a downloadable PDF file of all grades</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Set maximum points for an assignment:</p>
                    <p className="text-base font-mono bg-green-100 px-3 py-2 rounded font-bold text-green-900">"Quiz 1 max score 30"</p>
                    <p className="text-xs text-gray-600 mt-1">Sets the total possible points for Quiz 1 to 30</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Modal Footer - Enhanced */}
    <div className="border-t border-gray-200 px-6 py-5 bg-gradient-to-r from-gray-50 to-white rounded-b-2xl flex-shrink-0">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md animate-pulse">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              Ready to start grading with your voice?
            </p>
            <p className="text-xs text-gray-600">
              Click the <strong className="text-blue-600">blue microphone button</strong> at the bottom-right corner to begin! 
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowVoiceGuide(false)}
          className="px-6 py-2.5 bg-[#333D79] text-white rounded-lg hover:bg-[#2A2F66] transition-all font-medium text-sm shadow-lg hover:shadow-xl"
        >
          Let's Start Grading →
        </button>
      </div>
    </div>
  </div>
</div>
); };

export default VoiceGuideModal;