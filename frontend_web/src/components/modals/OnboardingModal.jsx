import { ArrowLeft, ArrowRight, BookOpen, Cloud, FileSpreadsheet, FileText, HelpCircle, Mic, MousePointerClick, Upload, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const OnboardingModal = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  // Add floating animation styles
  const floatingAnimation = `
    @keyframes gentleFloat {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-10px);
      }
    }
    .animate-gentle-float {
      animation: gentleFloat 3s ease-in-out infinite;
    }
  `;

  const steps = [
    {
      title: 'Let\'s Get You Started',
      description: 'Learn the basics of managing your class records with voice commands',
      icon: BookOpen,
      content: (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-6">
            <img 
              src="/assets/vocalyxPerson.png" 
              alt="Vocalyx Person" 
              className="w-40 h-40 md:w-44 md:h-44 lg:w-56 lg:h-56 object-contain mb-6 animate-gentle-float"
            />
            <div className="text-center space-y-3 max-w-xl">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Let's Get You Started!
              </h3>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                We'll guide you through creating records, adding students, recording scores, and exporting grades using voice commands.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Create Class Records',
      description: 'Get started by creating your first class record',
      icon: BookOpen,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-900 mb-4 font-medium">
              You can create class records in three ways:
            </p>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-start sm:items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MousePointerClick className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-900 block">Manual Entry</span>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Fill out the form with class name, semester, teacher name, and section details.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-start sm:items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Upload className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-900 block">From Computer</span>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Upload an Excel file from your computer to create a class record.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-start sm:items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Cloud className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-900 block">From Google Drive</span>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Select an existing Google Sheets file from your Drive.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Add Students',
      description: 'Import your student list to the class record',
      icon: Users,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm text-green-900 mb-4 font-medium">
              Add students to your class record in three ways:
            </p>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex items-start sm:items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MousePointerClick className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-900 block">Manual Entry</span>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Add students one by one using voice commands or the entry form.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex items-start sm:items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Upload className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-900 block">From Computer</span>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Upload an Excel file with your student list from your computer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex items-start sm:items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Cloud className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-900 block">From Google Drive</span>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Select a student list file from your Google Drive.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Note:</span> Excel file must include LASTNAME, FIRSTNAME, and STUDENT ID. MIDDLENAME is optional.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Record Scores',
      description: 'Use the voice floating icon to record student scores',
      icon: Mic,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <p className="text-sm text-purple-900 mb-4 font-medium">
              Use the voice floating icon at the bottom right corner to record scores:
            </p>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-purple-200">
                <div className="flex items-start sm:items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mic className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-900 block">Single Mode</span>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Record one score at a time. Best for occasional updates.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3 border-2 border-emerald-300">
                <div className="flex items-start sm:items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">Batch Mode</span>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Recommended</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 font-medium">
                      Record multiple scores continuously without stopping. Faster and more efficient for bulk grading!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800">
                <span className="font-semibold">Tip:</span> Use Batch Mode for continuous recording. Select a column, then say scores like "John eighty-five" without stopping.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Export Final Grade',
      description: 'Generate and export final grades for your students',
      icon: FileSpreadsheet,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
            <p className="text-sm text-indigo-900 mb-4 font-medium">
              Export final grades from the Tools button in the top navbar:
            </p>
            <div className="bg-white rounded-lg p-3 border border-indigo-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="font-semibold text-slate-900">Export Requirements</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 mb-3">
                Before exporting, make sure your student information includes:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">LASTNAME</span>
                  <span className="text-slate-600">(Required)</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">FIRSTNAME</span>
                  <span className="text-slate-600">(Required)</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">STUDENT ID</span>
                  <span className="text-slate-600">(Required)</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">MIDDLENAME</span>
                  <span className="text-slate-600">(Optional)</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Note:</span> Export requires LASTNAME, FIRSTNAME, and STUDENT ID. MIDDLENAME is optional.
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Mark onboarding as completed in localStorage
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const IconComponent = currentStepData.icon;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: floatingAnimation }} />
      <div className="fixed inset-0 z-[200]">
        {/* Backdrop - Full screen blur - covers entire viewport including top nav */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 199
          }}
        />
      
      {/* Modal Container */}
      <div 
        className="fixed inset-0 flex items-center justify-center p-2 sm:p-4"
        onClick={(e) => {
          // Only close on backdrop click, not on modal content
          if (e.target === e.currentTarget) {
            // Don't close on backdrop click for onboarding
          }
        }}
        style={{ zIndex: 200 }}
      >
        <div 
          className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col mx-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-gradient-to-r from-[#333D79] to-[#4A5491] flex-shrink-0 rounded-t-xl sm:rounded-t-2xl">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-semibold text-white truncate">
                  {currentStepData.title}
                </h2>
                <p className="text-xs sm:text-sm text-white/80 line-clamp-2">{currentStepData.description}</p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-white/80 hover:text-white transition-colors flex-shrink-0 p-1"
              title="Skip onboarding"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-50 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-xs font-medium text-slate-600 hidden sm:inline">
              How It Works
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-[#333D79] to-[#4A5491] h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-full">
            {currentStepData.content}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                currentStep === 0
                  ? 'text-slate-400 cursor-not-allowed'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Step Indicators */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-center">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-6 sm:w-8 bg-gradient-to-r from-[#333D79] to-[#4A5491]'
                      : index < currentStep
                      ? 'w-2 bg-[#4A5491]'
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg font-medium hover:from-[#2A2F66] hover:to-[#3A4080] transition-all shadow-md hover:shadow-lg text-sm sm:text-base"
            >
              <span className="hidden sm:inline">{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
              <span className="sm:hidden">{currentStep === steps.length - 1 ? 'Start' : 'Next'}</span>
              {currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default OnboardingModal;

