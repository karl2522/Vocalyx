import { Check, CheckCircle2, Mic, MicOff, Play, Volume2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const InteractiveTutorialModal = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [completedSteps, setCompletedSteps] = useState([]);
  const [simulatedData, setSimulatedData] = useState([
    { no: 1, name: 'Omen, John', quiz1: '', quiz2: '', quiz3: '', total: 0 },
    { no: 2, name: 'Santos, Maria', quiz1: '', quiz2: '', quiz3: '', total: 0 },
    { no: 3, name: 'Reyes, Pedro', quiz1: '', quiz2: '', quiz3: '', total: 0 },
  ]);
  const [batchRecordedStudents, setBatchRecordedStudents] = useState([]);
  const [isNarrating, setIsNarrating] = useState(false);
  const audioContextRef = useRef(null);
  const recognitionRef = useRef(null);

  const tutorialSteps = [
    {
      title: "Welcome to Vocalyx! 🎉",
      description: "Let me show you how easy it is to record grades using your voice!",
      narration: "Welcome to Vocalyx! I'm here to guide you through our voice-powered grading system. Let's make grading fun and efficient!",
      action: null,
      highlight: "welcome"
    },
    {
      title: "Step 1: Say the Student's Name",
      description: "Try saying: 'Omen' to select John Omen",
      narration: "First, simply say the student's last name. The system will automatically find them in your class list. Try saying Omen now!",
      action: "name",
      expectedText: "omen",
      highlight: "name"
    },
    {
      title: "Step 2: Say the Score",
      description: "Now say: '20' to record their score",
      narration: "Great! Now just say the score you want to record. Try saying twenty!",
      action: "score",
      expectedText: "20",
      highlight: "score"
    },
    {
      title: "Step 3: Complete Command",
      description: "Try the full command: 'Quiz 1 Omen 20'",
      narration: "Excellent! Now let's try a complete command. Say Quiz 1, then the student name, then the score. Try saying: Quiz 1 Omen 20",
      action: "complete",
      expectedText: "quiz 1 omen 20",
      highlight: "complete"
    },
    {
      title: "Step 4: Multiple Students (One at a Time)",
      description: "Try: 'Quiz 1 Santos 18' and then 'Quiz 1 Reyes 19'",
      narration: "Perfect! You can record multiple students quickly. Try recording scores for Santos and Reyes now!",
      action: "multiple",
      expectedText: ["quiz 1 santos 18", "quiz 1 reyes 19"],
      highlight: "multiple"
    },
    {
      title: "Step 5: Batch Mode! 🚀",
      description: "Say multiple students continuously: 'Omen 20, Santos 18, Reyes 19'",
      narration: "Amazing! Now let me show you the power of batch mode! You can say multiple students in one go. Try saying: Omen 20, Santos 18, Reyes 19. Just keep talking and the system will record them all!",
      action: "batch",
      expectedText: "batch",
      highlight: "batch"
    },
    {
      title: "You're Ready! 🎓",
      description: "You've mastered voice grading! Start using it with your real class records.",
      narration: "Congratulations! You're now ready to use Vocalyx with your real class records. Remember, you can use single mode for one student at a time, or batch mode to record multiple students continuously. It's that simple!",
      action: null,
      highlight: "complete"
    }
  ];

  useEffect(() => {
    if (isOpen) {
      // Initialize speech synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Clear any previous speech
      }
      
      // Narrate welcome message
      narrateStep(0);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen]);

  const narrateStep = (stepIndex) => {
    if (!('speechSynthesis' in window)) return;

    const step = tutorialSteps[stepIndex];
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(step.narration);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsNarrating(true);
    utterance.onend = () => setIsNarrating(false);

    // Use a friendly voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Female') || voice.name.includes('Samantha') || voice.name.includes('Google')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Check if we're in batch mode (Step 5)
    const isBatchMode = tutorialSteps[currentStep].action === 'batch';
    
    recognition.continuous = isBatchMode; // Continuous listening for batch mode
    recognition.interimResults = isBatchMode; // Show interim results in batch mode
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setRecognizedText('Listening...');
    };

    recognition.onresult = (event) => {
      if (isBatchMode) {
        // In batch mode, get the latest transcript
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript.toLowerCase().trim();
        setRecognizedText(transcript);
        
        // Only process if it's a final result
        if (event.results[lastResultIndex].isFinal) {
          processVoiceCommand(transcript);
        }
      } else {
        // Single mode - original behavior
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        setRecognizedText(transcript);
        processVoiceCommand(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (!isBatchMode) {
        setIsListening(false);
        toast.error('Could not hear you. Please try again!');
      }
    };

    recognition.onend = () => {
      if (isBatchMode && isListening) {
        // In batch mode, restart recognition automatically
        try {
          recognition.start();
        } catch (e) {
          console.log('Recognition already started');
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Helper function to convert number words to digits
  const convertNumberWords = (text) => {
    const numberWords = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
      'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
      'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
      'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
      'eighty': '80', 'ninety': '90', 'hundred': '100'
    };
    
    let converted = text;
    Object.keys(numberWords).forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      converted = converted.replace(regex, numberWords[word]);
    });
    
    return converted;
  };

  // Helper function for fuzzy name matching
  const fuzzyMatchName = (transcript, targetName) => {
    const target = targetName.toLowerCase();
    const words = transcript.toLowerCase().split(/\s+/);
    
    // Check each word in the transcript
    for (const word of words) {
      // Direct match
      if (word === target) return true;
      
      // Length difference check (must be close)
      if (Math.abs(word.length - target.length) > 3) continue;
      
      // Calculate Levenshtein distance
      const levenshteinDistance = (s1, s2) => {
        const len1 = s1.length, len2 = s2.length;
        const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
        
        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;
        
        for (let i = 1; i <= len1; i++) {
          for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
              matrix[i - 1][j] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j - 1] + cost
            );
          }
        }
        return matrix[len1][len2];
      };
      
      const distance = levenshteinDistance(word, target);
      const maxLength = Math.max(word.length, target.length);
      const similarity = 1 - (distance / maxLength);
      
      // Accept if similarity is 70% or higher
      if (similarity >= 0.7) return true;
      
      // Check common misspellings/phonetic variations
      const phonetic = word.replace(/k/g, 'c').replace(/ph/g, 'f');
      const targetPhonetic = target.replace(/k/g, 'c').replace(/ph/g, 'f');
      if (phonetic === targetPhonetic) return true;
      
      // Check if word starts with target or vice versa (for partial matches)
      if (word.length >= 4 && target.length >= 4) {
        if (word.startsWith(target.substring(0, 4)) || target.startsWith(word.substring(0, 4))) {
          return true;
        }
      }
    }
    
    return false;
  };

  const processVoiceCommand = (transcript) => {
    const step = tutorialSteps[currentStep];
    
    if (!step.action) return;

    // Convert number words to digits (e.g., "one" -> "1", "twenty" -> "20")
    const normalizedTranscript = convertNumberWords(transcript.toLowerCase().trim());
    const cleanTranscript = normalizedTranscript.toLowerCase().trim();

    if (step.action === 'name') {
      // Use fuzzy matching for Omen
      if (fuzzyMatchName(cleanTranscript, 'omen')) {
        playSuccessSound();
        toast.success('✅ Perfect! Student found!');
        setTimeout(() => {
          markStepComplete();
          nextStep();
        }, 1000);
      } else {
        toast.error('Try saying: Omen');
      }
    } else if (step.action === 'score') {
      if (cleanTranscript.includes('20')) {
        playSuccessSound();
        updateSimulatedScore(0, 'quiz1', '20');
        toast.success('✅ Score recorded!');
        setTimeout(() => {
          markStepComplete();
          nextStep();
        }, 1000);
      } else {
        toast.error('Try saying: 20 or twenty');
      }
    } else if (step.action === 'complete') {
      if (cleanTranscript.includes('quiz') && 
          (cleanTranscript.includes('1') || cleanTranscript.includes('quiz1')) &&
          fuzzyMatchName(cleanTranscript, 'omen') && 
          cleanTranscript.includes('20')) {
        playSuccessSound();
        updateSimulatedScore(0, 'quiz1', '20');
        toast.success('✅ Complete command recorded!');
        setTimeout(() => {
          markStepComplete();
          nextStep();
        }, 1000);
      } else {
        toast.error('Try saying: Quiz 1 Omen 20');
      }
    } else if (step.action === 'multiple') {
      if (cleanTranscript.includes('santos') && cleanTranscript.includes('18')) {
        playSuccessSound();
        updateSimulatedScore(1, 'quiz1', '18');
        toast.success('✅ Santos recorded!');
      } else if (cleanTranscript.includes('reyes') && cleanTranscript.includes('19')) {
        playSuccessSound();
        updateSimulatedScore(2, 'quiz1', '19');
        toast.success('✅ Reyes recorded!');
        
        // Check if both are recorded
        setTimeout(() => {
          if (simulatedData[1].quiz1 === '18' && simulatedData[2].quiz1 === '19') {
            markStepComplete();
            nextStep();
          }
        }, 1000);
      } else {
        toast.error('Try: Quiz 1 Santos 18, then Quiz 1 Reyes 19');
      }
    } else if (step.action === 'batch') {
      // Batch mode - process multiple students in one command
      const students = [
        { name: 'omen', index: 0 },
        { name: 'santos', index: 1 },
        { name: 'reyes', index: 2 }
      ];
      
      // Split by common separators (comma, and, then)
      const segments = cleanTranscript.split(/[,]|\band\b|\bthen\b/).map(s => s.trim());
      
      let newRecordings = [];
      
      segments.forEach(segment => {
        students.forEach(student => {
          // Check if student already recorded in this batch session
          if (batchRecordedStudents.includes(student.index)) return;
          
          if (fuzzyMatchName(segment, student.name)) {
            // Extract score near the name
            const scoreMatch = segment.match(/\d+/);
            if (scoreMatch) {
              const score = scoreMatch[0];
              updateSimulatedScore(student.index, 'quiz2', score);
              newRecordings.push(student.name);
            }
          }
        });
      });
      
      if (newRecordings.length > 0) {
        playSuccessSound();
        const names = newRecordings.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(', ');
        toast.success(`✅ Recorded ${names} in Quiz 2!`);
      }
      
      // Auto-advance when all 3 students recorded
      setTimeout(() => {
        const allRecorded = students.every(s => simulatedData[s.index].quiz2);
        if (allRecorded && batchRecordedStudents.length === 3) {
          markStepComplete();
          nextStep();
        }
      }, 500);
    }
  };

  const updateSimulatedScore = (studentIndex, column, score) => {
    setSimulatedData(prev => {
      const updated = [...prev];
      const currentTotal = updated[studentIndex].total || 0;
      const newScore = parseInt(score) || 0;
      
      updated[studentIndex] = {
        ...updated[studentIndex],
        [column]: score,
        total: currentTotal + newScore
      };
      return updated;
    });

    // Track batch recorded students
    if (currentStep === 5) { // Batch mode step (Step 5)
      setBatchRecordedStudents(prev => {
        if (!prev.includes(studentIndex)) {
          return [...prev, studentIndex];
        }
        return prev;
      });
    }
  };

  const playSuccessSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const markStepComplete = () => {
    setCompletedSteps(prev => [...prev, currentStep]);
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      setRecognizedText('');
      setBatchRecordedStudents([]); // Reset batch tracking
      narrateStep(nextStepIndex);
    } else {
      // Tutorial complete
      if (onComplete) onComplete();
      toast.success('🎉 Tutorial completed! You\'re ready to grade!');
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setRecognizedText('');
      narrateStep(currentStep - 1);
    }
  };

  const skipTutorial = () => {
    if (window.confirm('Are you sure you want to skip the tutorial? You can always restart it later.')) {
      if (onComplete) onComplete();
      onClose();
    }
  };

  const replayNarration = () => {
    narrateStep(currentStep);
  };

  if (!isOpen) return null;

  const currentStepData = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Interactive Tutorial</h2>
                <p className="text-sm text-indigo-100">Learn by doing!</p>
              </div>
            </div>
            <button
              onClick={skipTutorial}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-white font-medium">
                Step {currentStep + 1} of {tutorialSteps.length}
              </span>
              <span className="text-sm text-indigo-100">{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Instructions */}
            <div className="space-y-4">
              {/* Step Title */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">{currentStep + 1}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {currentStepData.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {currentStepData.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Narration Control */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">Voice Guide</span>
                  </div>
                  <button
                    onClick={() => narrateStep(currentStep)}
                    disabled={isNarrating}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isNarrating
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isNarrating ? '🔊 Speaking...' : '🔊 Play'}
                  </button>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed italic">
                  "{currentStepData.narration}"
                </p>
              </div>

              {/* Microphone Control */}
              {currentStepData.action && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <div className="text-center">
                    {currentStepData.action === 'batch' && (
                      <div className="mb-3 p-2 bg-orange-100 border border-orange-300 rounded-lg">
                        <p className="text-sm font-bold text-orange-800">🚀 Batch Mode Active!</p>
                        <p className="text-xs text-orange-700">Say all students continuously</p>
                      </div>
                    )}
                    
                    <button
                      onClick={isListening ? stopListening : startListening}
                      className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 transition-all ${
                        isListening
                          ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-200'
                          : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200'
                      }`}
                    >
                      {isListening ? (
                        <MicOff className="w-10 h-10 text-white" />
                      ) : (
                        <Mic className="w-10 h-10 text-white" />
                      )}
                    </button>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {isListening ? '🎤 Listening...' : 'Click to Start Speaking'}
                    </p>
                    {recognizedText && (
                      <div className="mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-600">You said:</p>
                        <p className="text-base font-semibold text-gray-900">"{recognizedText}"</p>
                      </div>
                    )}
                    
                    {currentStepData.action === 'batch' && batchRecordedStudents.length > 0 && (
                      <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-lg">
                        <p className="text-xs text-green-700 font-semibold">
                          ✅ {batchRecordedStudents.length}/3 students recorded!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Completed Steps */}
              {completedSteps.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">Completed Steps</span>
                  </div>
                  <div className="space-y-1">
                    {completedSteps.map(stepIndex => (
                      <div key={stepIndex} className="flex items-center space-x-2 text-sm text-green-700">
                        <Check className="w-4 h-4" />
                        <span>{tutorialSteps[stepIndex].title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Simulated Spreadsheet */}
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                  <span>📊</span>
                  <span>Practice Spreadsheet</span>
                </h4>
                
                {/* Simulated Table */}
                <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-indigo-600 text-white">
                        <th className="px-3 py-2 text-left font-semibold">No.</th>
                        <th className="px-3 py-2 text-left font-semibold">Student Name</th>
                        <th className="px-3 py-2 text-center font-semibold">Quiz 1</th>
                        <th className="px-3 py-2 text-center font-semibold">Quiz 2</th>
                        <th className="px-3 py-2 text-center font-semibold">Quiz 3</th>
                        <th className="px-3 py-2 text-center font-semibold bg-green-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulatedData.map((student, index) => (
                        <tr
                          key={index}
                          className={`border-b border-gray-100 hover:bg-indigo-50 transition-colors ${
                            student.quiz1 ? 'bg-green-50' : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-gray-700">{student.no}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{student.name}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-2 py-1 rounded ${
                              student.quiz1 ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-400'
                            }`}>
                              {student.quiz1 || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-2 py-1 rounded ${
                              student.quiz2 ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-gray-400'
                            }`}>
                              {student.quiz2 || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-gray-400">-</td>
                          <td className="px-3 py-2 text-center bg-green-50">
                            <span className="font-semibold text-green-800">{student.total}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Live Updates Indicator */}
                {simulatedData.some(s => s.quiz1 || s.quiz2) && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700 text-center font-medium">
                      ✨ Scores are being recorded in real-time!
                    </p>
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">💡 Pro Tips</h4>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• Speak clearly and at a normal pace</li>
                  <li>• You can use last names only</li>
                  <li>• Say numbers naturally (e.g., "twenty" or "20")</li>
                  <li>• The system auto-saves immediately</li>
                  <li>• Works with any assignment type (Quiz, Exam, Project, etc.)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={previousStep}
              disabled={currentStep === 0}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                {currentStep === tutorialSteps.length - 1 ? (
                  <span className="text-green-600 font-semibold">🎉 Tutorial Complete!</span>
                ) : (
                  `${tutorialSteps.length - currentStep - 1} steps remaining`
                )}
              </p>
            </div>

            {currentStep === tutorialSteps.length - 1 ? (
              <button
                onClick={() => {
                  if (onComplete) onComplete();
                  onClose();
                }}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-lg"
              >
                Start Grading! →
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveTutorialModal;
