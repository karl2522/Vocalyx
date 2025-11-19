export const speakText = (text, options = {}) => {
  return new Promise((resolve) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || 1.2;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 0.8;
      utterance.lang = options.lang || 'en-US';
      
      // Resolve promise when speech completes
      utterance.onend = () => {
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.warn('Speech synthesis error:', event);
        resolve(); // Still resolve on error to prevent hanging
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      // If speech synthesis not supported, resolve immediately
      resolve();
    }
  });
};

export const stopSpeaking = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};