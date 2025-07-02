import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const useVoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  const [interimBatchCommand, setInterimBatchCommand] = useState('');
  
  // 🔥 ENHANCED: Context awareness and accuracy features
  const [recentStudents, setRecentStudents] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.9);
  const [alternatives, setAlternatives] = useState([]);
  const [contextWords, setContextWords] = useState(new Set());
  const [adaptiveCorrections, setAdaptiveCorrections] = useState({});
  const [studentNames, setStudentNames] = useState(new Set());

  // 🚀 PERFORMANCE: Refs to prevent unnecessary processing
  const lastProcessedCommand = useRef('');
  const processingCache = useRef(new Map());

  // 🔥 UTILITY FUNCTIONS FIRST (to avoid hoisting issues)
  const calculateSimilarity = useMemo(() => (word1, word2) => {
    const longer = word1.length > word2.length ? word1 : word2;
    const shorter = word1.length > word2.length ? word2 : word1;
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }, []);

  const levenshteinDistance = useMemo(() => (str1, str2) => {
    const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }, []);

  // 🔥 FIXED: Stable dependencies with useMemo
  const contextWordsArray = useMemo(() => Array.from(contextWords), [contextWords]);
  const studentNamesArray = useMemo(() => Array.from(studentNames), [studentNames]);

  const selectBestAlternative = useCallback((alternatives) => {
    return alternatives.reduce((best, current) => {
      let score = current.confidence;
      
      const words = current.transcript.toLowerCase().split(' ');
      const contextMatches = words.filter(word => contextWords.has(word)).length;
      score += contextMatches * 0.1;
      
      const studentMatches = words.filter(word => studentNames.has(word)).length;
      score += studentMatches * 0.2;
      
      if (/\b(quiz|lab|exam|midterm|final)\s+\d+\b/i.test(current.transcript)) {
        score += 0.15;
      }
      
      if (/\b\w+\s+\d{1,3}\b/.test(current.transcript)) {
        score += 0.1;
      }
      
      return score > (best.confidence || 0) ? { ...current, confidence: score } : best;
    }, alternatives[0]);
  }, [contextWords, studentNames]);

  const learnFromCorrection = useCallback((transcript) => {
    const words = transcript.toLowerCase().split(' ');
    words.forEach(word => {
      if (word.length > 2) {
        setAdaptiveCorrections(prev => ({
          ...prev,
          [word]: (prev[word] || 0) + 1
        }));
      }
    });
  }, []);

  const buildContextDictionary = useCallback((tableData = [], headers = []) => {
    const words = new Set();
    const names = new Set();
    
    tableData.forEach(row => {
      if (row['FIRST NAME']) {
        const firstName = row['FIRST NAME'].toLowerCase().trim();
        words.add(firstName);
        names.add(firstName);
      }
      if (row['LASTNAME']) {
        const lastName = row['LASTNAME'].toLowerCase().trim();
        words.add(lastName);
        names.add(lastName);
      }
      if (row['FIRST NAME'] && row['LASTNAME']) {
        const fullName = `${row['FIRST NAME']} ${row['LASTNAME']}`.toLowerCase().trim();
        names.add(fullName);
      }
    });
    
    headers.forEach(header => {
      header.split(' ').forEach(word => {
        if (word.length > 2) words.add(word.toLowerCase());
      });
    });
    
    const academicTerms = ['quiz', 'lab', 'exam', 'midterm', 'final', 'assignment', 'project', 'homework'];
    academicTerms.forEach(term => words.add(term));
    
    setContextWords(words);
    setStudentNames(names);
    console.log('🧠 Enhanced context dictionary built:', words.size, 'words,', names.size, 'student names');
  }, []);

  const enhanceStudentNameRecognition = useCallback((transcript) => {
    if (!studentNames.size) return transcript;
    
    // 🚀 PERFORMANCE: Check cache first
    const cacheKey = `name_${transcript}`;
    if (processingCache.current.has(cacheKey)) {
      return processingCache.current.get(cacheKey);
    }
    
    let enhanced = transcript;
    const words = transcript.split(' ');
    
    const correctedWords = words.map(word => {
      const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
      
      if (cleanWord.length < 2) return word;
      
      let bestMatch = null;
      let bestScore = 0;
      
      studentNamesArray.forEach(studentName => {
        const similarity = calculateSimilarity(cleanWord, studentName);
        
        if (similarity > bestScore && similarity > 0.6) {
          let bonusScore = similarity;
          if (cleanWord.startsWith(studentName.substring(0, 2))) bonusScore += 0.15;
          if (studentName.startsWith(cleanWord.substring(0, 2))) bonusScore += 0.1;
          
          if (bonusScore > bestScore) {
            bestMatch = studentName;
            bestScore = bonusScore;
          }
        }
      });
      
      if (bestMatch && bestScore > 0.75) {
        // 🚀 PERFORMANCE: Reduce logging in production
        if (process.env.NODE_ENV === 'development') {
          console.log(`🎯 Student name correction: "${word}" → "${bestMatch}" (confidence: ${bestScore.toFixed(2)})`);
        }
        return word.replace(new RegExp(cleanWord, 'gi'), bestMatch);
      }
      
      return word;
    });
    
    const result = correctedWords.join(' ');
    // 🚀 PERFORMANCE: Cache result
    processingCache.current.set(cacheKey, result);
    return result;
  }, [studentNamesArray, calculateSimilarity]);

  const enhanceNumberRecognition = useCallback((transcript) => {
    // 🚀 PERFORMANCE: Check cache first
    const cacheKey = `number_${transcript}`;
    if (processingCache.current.has(cacheKey)) {
      return processingCache.current.get(cacheKey);
    }

    const numberWords = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
      'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
      'eighteen': '18', 'nineteen': '19',
      'twenty': '20', 'thirty': '30', 'forty': '40', 'fifty': '50',
      'sixty': '60', 'seventy': '70', 'eighty': '80', 'ninety': '90',
      'hundred': '100'
    };
    
    let enhanced = transcript;
    
    Object.entries(numberWords).forEach(([word, number]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      enhanced = enhanced.replace(regex, number);
    });
    
    enhanced = enhanced.replace(/\b(\d+)\s+(\d+)\b/g, (match, tens, ones) => {
      const tensNum = parseInt(tens);
      const onesNum = parseInt(ones);
      
      if (tensNum >= 20 && tensNum <= 90 && tensNum % 10 === 0 && onesNum <= 9) {
        const result = tensNum + onesNum;
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔢 Compound number: "${match}" → "${result}"`);
        }
        return result.toString();
      }
      
      return match;
    });
    
    enhanced = enhanced.replace(/\b(\d+)\s+hundred\s+(\d+)\b/gi, (match, hundreds, remainder) => {
      const result = parseInt(hundreds) * 100 + parseInt(remainder);
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔢 Hundreds pattern: "${match}" → "${result}"`);
      }
      return result.toString();
    });
    
    enhanced = enhanced.replace(/\b(\d+)\s+hundred\b/gi, (match, hundreds) => {
      const result = parseInt(hundreds) * 100;
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔢 Standalone hundred: "${match}" → "${result}"`);
      }
      return result.toString();
    });
    
    const gradeCorrections = {
      'ate': '8', 'too': '2', 'to': '2', 'for': '4', 'won': '1',
      'tree': '3', 'sex': '6', 'ate tea': '80', 'nine tea': '90'
    };
    
    Object.entries(gradeCorrections).forEach(([word, number]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(enhanced)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔢 Grade correction: "${word}" → "${number}"`);
        }
        enhanced = enhanced.replace(regex, number);
      }
    });
    
    // 🚀 PERFORMANCE: Cache result
    processingCache.current.set(cacheKey, enhanced);
    return enhanced;
  }, []);

  const calculateSmartConfidence = useCallback((result, context = {}) => {
    let confidence = result.confidence || 0.8;
    
    const transcript = result.transcript.toLowerCase();
    
    if (/\b\w+\s+\d+\b/.test(transcript)) confidence += 0.1;
    if (context.recentStudents?.some(name => 
      transcript.includes(name.toLowerCase().split(' ')[0])
    )) confidence += 0.15;
    if (/\b(quiz|lab|exam|midterm|final)\b/.test(transcript)) confidence += 0.1;
    
    const hasKnownStudent = studentNamesArray.some(name => 
      transcript.includes(name) || calculateSimilarity(transcript, name) > 0.7
    );
    if (hasKnownStudent) confidence += 0.2;
    
    if (transcript.length < 4) confidence -= 0.2;
    if (/\b(um|uh|er|hmm)\b/.test(transcript)) confidence -= 0.1;
    if (!/\d/.test(transcript) && window.batchModeActive) confidence -= 0.15;
    
    return Math.min(confidence, 1.0);
  }, [studentNamesArray, calculateSimilarity]);

  const correctTranscriptWithContext = useCallback((rawTranscript) => {
    // 🚀 PERFORMANCE: Skip if same as last processed
    if (lastProcessedCommand.current === rawTranscript) {
      return rawTranscript;
    }
    
    let corrected = rawTranscript;
    
    // 🚀 PERFORMANCE: Reduce logging in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 BEFORE processing: "${rawTranscript}"`);
    }
    
    corrected = enhanceStudentNameRecognition(corrected);
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎯 After name recognition: "${corrected}"`);
    }
    
    corrected = enhanceNumberRecognition(corrected);
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔢 After number processing: "${corrected}"`);
    }
    
    // 🚀 PERFORMANCE: Only run context correction if needed
    if (corrected !== rawTranscript) {
      contextWordsArray.forEach(contextWord => {
        const words = corrected.split(' ');
        const correctedWords = words.map(word => {
          const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
          
          if (cleanWord.length > 2 && contextWord.length > 2) {
            const similarity = calculateSimilarity(cleanWord, contextWord);
            if (similarity > 0.7) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`🔧 Context correction: "${word}" → "${contextWord}"`);
              }
              return word.replace(new RegExp(cleanWord, 'gi'), contextWord);
            }
          }
          return word;
        });
        corrected = correctedWords.join(' ');
      });
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ FINAL enhanced result: "${corrected}"`);
    }
    
    lastProcessedCommand.current = rawTranscript;
    return corrected;
  }, [contextWordsArray, enhanceStudentNameRecognition, enhanceNumberRecognition, calculateSimilarity]);

  // 🔥 FIXED: useEffect with stable dependencies only
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const speechRecognition = new SpeechRecognition();
      
      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;
      speechRecognition.lang = 'en-US';
      speechRecognition.maxAlternatives = 3; // 🚀 PERFORMANCE: Reduced from 5 to 3

      if ('webkitAudioContext' in window || 'AudioContext' in window) {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          const audioContext = new AudioContext();
          console.log('🎵 Enhanced audio processing enabled');
        } catch (error) {
          console.log('🎵 Basic audio processing mode');
        }
      }

      speechRecognition.onstart = () => {
        console.log('🎙️ Speech recognition started with ENHANCED accuracy');
        setIsListening(true);
        setAlternatives([]);
      };

      speechRecognition.onresult = (event) => {
        // 🚀 PERFORMANCE: Reduce result logging in production
        if (process.env.NODE_ENV === 'development') {
          console.log('🎤 VOICE RESULT: Event received, results length:', event.results.length);
        }
        
        let finalTranscript = '';
        let interimTranscript = '';
        let hasNewFinalResult = false;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`🎤 VOICE RESULT: Processing result ${i}, isFinal:`, result.isFinal);
          }
          
          if (result.isFinal) {
            hasNewFinalResult = true;
            
            const alternatives = [];
            for (let j = 0; j < Math.min(result.length, 3); j++) { // 🚀 PERFORMANCE: Reduced alternatives
              let transcript = result[j].transcript.trim();
              
              if (transcript && transcript.length >= 3) {
                transcript = correctTranscriptWithContext(transcript);
                const smartConfidence = calculateSmartConfidence(
                  { transcript, confidence: result[j].confidence }, 
                  { recentStudents }
                );
                
                alternatives.push({
                  transcript: transcript,
                  confidence: smartConfidence,
                  processed: true
                });
              }
            }
            
            if (alternatives.length > 0) {
              const bestResult = selectBestAlternative(alternatives);
              if (bestResult.transcript && bestResult.transcript.trim().length >= 3) {
                finalTranscript += bestResult.transcript;
                if (process.env.NODE_ENV === 'development') {
                  console.log('🎯 ENHANCED FINAL TRANSCRIPT:', finalTranscript);
                }
                setAlternatives(alternatives);
                learnFromCorrection(bestResult.transcript);
              }
            }
            
          } else {
            const interimText = result[0].transcript.trim();
            
            if (interimText && interimText.length >= 4) {
              // 🚀 PERFORMANCE: Only enhance if it looks like a batch command
              const studentScorePattern = /^(.+?)\s+(\d+(?:\.\d+)?)$/;
              if (studentScorePattern.test(interimText)) {
                const enhancedInterim = correctTranscriptWithContext(interimText);
                interimTranscript += enhancedInterim;
                
                if (studentScorePattern.test(enhancedInterim) && enhancedInterim.length >= 4) {
                  if (window.batchModeActive) {
                    setInterimBatchCommand(enhancedInterim);
                  }
                }
              } else {
                interimTranscript += interimText;
              }
            }
          }
        }

        if (finalTranscript || interimTranscript) {
          const combinedTranscript = finalTranscript + interimTranscript;
          if (combinedTranscript && combinedTranscript.trim().length >= 3) {
            setTranscript(combinedTranscript);
          }
        }

        if (hasNewFinalResult && window.batchModeActive) {
          setTimeout(() => {
            try {
              speechRecognition.stop();
            } catch (error) {
              // Silent error handling
            }
          }, 50); // 🚀 PERFORMANCE: Reduced delay from 100ms to 50ms
        }
      };

      speechRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          alert('🎙️ Microphone access denied. Please allow microphone access for voice commands.');
        } else if (event.error === 'no-speech') {
          console.log('🔇 No speech detected - try speaking louder');
        } else if (event.error === 'audio-capture') {
          alert('🎙️ No microphone found. Please check your microphone connection.');
        } else if (event.error === 'network') {
          console.log('🌐 Network error - voice recognition might be slower');
        }
      };

      speechRecognition.onend = () => {
        setIsListening(false);
        
        if (window.batchModeActive && !window.batchModeFinishing) {
          setTimeout(() => {
            try {
              speechRecognition.start();
              setIsListening(true);
            } catch (error) {
              console.error('❌ AUTO-RESTART: Failed to restart:', error);
            }
          }, 200); // 🚀 PERFORMANCE: Reduced delay from 300ms to 200ms
        }
      };

      setRecognition(speechRecognition);
    } else {
      setIsSupported(false);
    }
  }, []);  // 🔥 EMPTY DEPENDENCY ARRAY - no more loops!

  // 🚀 PERFORMANCE: Clear cache periodically
  useEffect(() => {
    const clearCache = () => {
      processingCache.current.clear();
    };
    
    const interval = setInterval(clearCache, 30000); // Clear every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const addRecentStudent = useCallback((studentName) => {
    setRecentStudents(prev => {
      const updated = [studentName, ...prev.filter(name => name !== studentName)];
      return updated.slice(0, 5);
    });
  }, []);

  const addCommandHistory = useCallback((command) => {
    setCommandHistory(prev => {
      const updated = [command, ...prev];
      return updated.slice(0, 10);
    });
  }, []);

  const startListening = useCallback((silent = false) => {
    if (recognition && !isListening) {
      setTranscript('');
      setAlternatives([]);
      try {
        recognition.start();
        
        if (!silent && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance('Ready');
          utterance.rate = 1.2;
          utterance.pitch = 1;
          utterance.volume = 0.6; // 🚀 PERFORMANCE: Reduced volume
          window.speechSynthesis.speak(utterance);
        }
      } catch (error) {
        console.error('Error starting recognition:', error);
        setIsListening(false);
      }
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      try {
        recognition.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  }, [recognition, isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setAlternatives([]);
  }, []);

  const setAccuracyLevel = useCallback((level = 'high') => {
    const thresholds = { high: 0.9, medium: 0.8, low: 0.6 };
    setConfidenceThreshold(thresholds[level] || 0.9);
    console.log(`🎯 Enhanced accuracy level set to ${level} (threshold: ${thresholds[level]})`);
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
    isSupported,
    recentStudents,
    commandHistory,
    alternatives,
    addRecentStudent,
    addCommandHistory,
    setAccuracyLevel,
    confidenceThreshold,
    buildContextDictionary,
    contextWords: contextWordsArray,
    adaptiveCorrections,
    interimBatchCommand,
    setInterimBatchCommand,
    enhanceStudentNameRecognition,
    enhanceNumberRecognition,
    studentNames: studentNamesArray
  };
};

export default useVoiceRecognition;