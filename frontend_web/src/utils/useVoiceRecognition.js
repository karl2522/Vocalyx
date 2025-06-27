import { useState, useEffect, useCallback } from 'react';

const useVoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const speechRecognition = new SpeechRecognition();
      
      // Configure recognition
      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;
      speechRecognition.lang = 'en-US';
      speechRecognition.maxAlternatives = 1;

      speechRecognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
      };

      speechRecognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update transcript with final + interim results
        setTranscript(finalTranscript + interimTranscript);
      };

      speechRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Handle specific errors
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          console.log('No speech detected');
        }
      };

      speechRecognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };

      setRecognition(speechRecognition);
    } else {
      console.log('Speech recognition not supported');
      setIsSupported(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      setTranscript('');
      try {
        recognition.start();
        // Speak feedback using native Speech Synthesis
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance('Voice recording started. Please speak your command.');
          utterance.rate = 1.2;
          utterance.pitch = 1;
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
        // Speak feedback
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance('Voice recording stopped.');
          utterance.rate = 1.2;
          utterance.pitch = 1;
          window.speechSynthesis.speak(utterance);
        }
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  }, [recognition, isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
    isSupported
  };
};

export default useVoiceRecognition;