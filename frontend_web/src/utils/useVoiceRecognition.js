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
      
      // 🔥 FIXED: Remove the problematic grammars line
      // speechRecognition.grammars = null; // ❌ This was causing the error!

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
            // 🔥 NEW: Collect alternatives with confidence scores
            const alternatives = [];
            for (let j = 0; j < Math.min(result.length, 3); j++) {
              alternatives.push({
                transcript: result[j].transcript,
                confidence: result[j].confidence || 0.8 // Default confidence if not available
              });
            }
            
            // Choose best alternative above confidence threshold
            const bestResult = alternatives.find(alt => alt.confidence >= confidenceThreshold) || alternatives[0];
            finalTranscript += bestResult.transcript;
            
            console.log('🎯 Voice alternatives:', alternatives);
            console.log('✅ Selected:', bestResult);
            
            setAlternatives(alternatives);
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        // Update transcript with final + interim results
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
  }, [confidenceThreshold]);

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
    // 🔥 NEW: Enhanced features
    recentStudents,
    commandHistory,
    alternatives,
    addRecentStudent,
    addCommandHistory,
    setAccuracyLevel,
    confidenceThreshold
  };
};

export default useVoiceRecognition;