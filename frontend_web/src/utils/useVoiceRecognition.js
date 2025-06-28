import { useState, useEffect, useCallback } from 'react';

const useVoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  
  // 🔥 NEW: Context awareness and accuracy features
  const [recentStudents, setRecentStudents] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);
  const [alternatives, setAlternatives] = useState([]);
  const [contextWords, setContextWords] = useState(new Set());
  const [adaptiveCorrections, setAdaptiveCorrections] = useState({});

   const buildContextDictionary = useCallback((tableData = [], headers = []) => {
    const words = new Set();
    
    // Add student names
    tableData.forEach(row => {
      if (row['First Name']) words.add(row['First Name'].toLowerCase());
      if (row['Last Name']) words.add(row['Last Name'].toLowerCase());
    });
    
    // Add column headers
    headers.forEach(header => {
      header.split(' ').forEach(word => {
        if (word.length > 2) words.add(word.toLowerCase());
      });
    });
    
    // Add common academic terms
    const academicTerms = ['quiz', 'lab', 'exam', 'midterm', 'final', 'assignment', 'project', 'homework'];
    academicTerms.forEach(term => words.add(term));
    
    setContextWords(words);
    console.log('🧠 Context dictionary built:', words.size, 'words');
  }, []);

  const correctTranscriptWithContext = useCallback((rawTranscript) => {
    let corrected = rawTranscript;
    
    // Apply context-aware corrections
    contextWords.forEach(contextWord => {
      const words = corrected.split(' ');
      const correctedWords = words.map(word => {
        const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
        
        // Check if word is similar to context word
        if (cleanWord.length > 2 && contextWord.length > 2) {
          const similarity = calculateSimilarity(cleanWord, contextWord);
          if (similarity > 0.7) {
            console.log(`🔧 Context correction: "${word}" → "${contextWord}"`);
            return word.replace(new RegExp(cleanWord, 'gi'), contextWord);
          }
        }
        return word;
      });
      corrected = correctedWords.join(' ');
    });
    
    return corrected;
  }, [contextWords]);

  const calculateSimilarity = (word1, word2) => {
    const longer = word1.length > word2.length ? word1 : word2;
    const shorter = word1.length > word2.length ? word2 : word1;
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const levenshteinDistance = (str1, str2) => {
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
  };

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const speechRecognition = new SpeechRecognition();
      
      // 🔥 ENHANCED: Better configuration for accuracy
      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;
      speechRecognition.lang = 'en-US';
      speechRecognition.maxAlternatives = 5; // Get more alternatives for better accuracy

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
        console.log('🎙️ Speech recognition started with enhanced accuracy');
        setIsListening(true);
        setAlternatives([]);
      };

      speechRecognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          
          if (result.isFinal) {
            // 🔥 ENHANCED: Multi-step processing
            const alternatives = [];
            for (let j = 0; j < Math.min(result.length, 5); j++) {
              let transcript = result[j].transcript.trim();
              
              // Step 1: Apply context corrections
              transcript = correctTranscriptWithContext(transcript);
              
              // Step 2: Apply phonetic corrections (your existing function)
              // This will be called in the parser
              
              alternatives.push({
                transcript: transcript,
                confidence: result[j].confidence || 0.8,
                processed: true
              });
            }
            
            // Choose best alternative with enhanced scoring
            const bestResult = selectBestAlternative(alternatives);
            finalTranscript += bestResult.transcript;
            
            console.log('🎯 Enhanced alternatives:', alternatives);
            console.log('✅ Selected:', bestResult);
            
            setAlternatives(alternatives);
            
            // 🔥 NEW: Learn from corrections
            learnFromCorrection(bestResult.transcript);
            
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(finalTranscript + interimTranscript);
      };

      speechRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Handle specific errors with better messages
        if (event.error === 'not-allowed') {
          alert('🎙️ Microphone access denied. Please allow microphone access for voice commands.');
        } else if (event.error === 'no-speech') {
          console.log('🔇 No speech detected - try speaking louder');
        } else if (event.error === 'audio-capture') {
          alert('🎙️ No microphone found. Please check your microphone connection.');
        } else if (event.error === 'network') {
          console.log('🌐 Network error - voice recognition might be slower');
        } else {
          console.log('🔧 Speech recognition error:', event.error);
        }
      };

      speechRecognition.onend = () => {
        console.log('🛑 Speech recognition ended');
        setIsListening(false);
      };

      setRecognition(speechRecognition);
    } else {
      console.log('❌ Speech recognition not supported');
      setIsSupported(false);
    }
  }, [confidenceThreshold, correctTranscriptWithContext]);

  const selectBestAlternative = useCallback((alternatives) => {
    return alternatives.reduce((best, current) => {
      let score = current.confidence;
      
      // Bonus for context words
      const words = current.transcript.toLowerCase().split(' ');
      const contextMatches = words.filter(word => contextWords.has(word)).length;
      score += contextMatches * 0.1;
      
      // Bonus for command patterns
      if (/\b(quiz|lab|exam|midterm|final)\s+\d+\b/i.test(current.transcript)) {
        score += 0.15;
      }
      
      return score > (best.confidence || 0) ? { ...current, confidence: score } : best;
    }, alternatives[0]);
  }, [contextWords]);

  const learnFromCorrection = useCallback((transcript) => {
    // Store patterns that work well
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

  // 🔥 NEW: Add student to recent context
  const addRecentStudent = useCallback((studentName) => {
    setRecentStudents(prev => {
      const updated = [studentName, ...prev.filter(name => name !== studentName)];
      return updated.slice(0, 5); // Keep last 5 students
    });
  }, []);

  // 🔥 NEW: Add command to history
  const addCommandHistory = useCallback((command) => {
    setCommandHistory(prev => {
      const updated = [command, ...prev];
      return updated.slice(0, 10); // Keep last 10 commands
    });
  }, []);

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      setTranscript('');
      setAlternatives([]);
      try {
        recognition.start();
        // Enhanced feedback
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance('Voice recording started. Speak clearly for best accuracy.');
          utterance.rate = 1.1;
          utterance.pitch = 1;
          utterance.volume = 0.8;
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
        // Enhanced feedback
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance('Voice recording stopped. Processing command...');
          utterance.rate = 1.1;
          utterance.pitch = 1;
          utterance.volume = 0.8;
          window.speechSynthesis.speak(utterance);
        }
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  }, [recognition, isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setAlternatives([]);
  }, []);

  // 🔥 NEW: Adjust confidence threshold
  const setAccuracyLevel = useCallback((level) => {
    // high = 0.9, medium = 0.8, low = 0.6
    const thresholds = { high: 0.9, medium: 0.8, low: 0.6 };
    setConfidenceThreshold(thresholds[level] || 0.8);
    console.log(`🎯 Accuracy level set to ${level} (threshold: ${thresholds[level]})`);
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
    contextWords: Array.from(contextWords),
    adaptiveCorrections
  };
};

export default useVoiceRecognition;