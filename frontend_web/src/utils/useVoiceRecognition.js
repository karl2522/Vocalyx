import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const useVoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [interimBatchCommand, setInterimBatchCommand] = useState('');
  
  // 🔥 ENHANCED: Advanced AI-powered features
  const [recentStudents, setRecentStudents] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.9);
  const [alternatives, setAlternatives] = useState([]);
  const [contextWords, setContextWords] = useState(new Set());
  const [adaptiveCorrections, setAdaptiveCorrections] = useState({});
  const [studentNames, setStudentNames] = useState(new Set());

  // 🚀 NEW: Google Speech backend integration (CONSOLE ONLY)
  const [googleTesting, setGoogleTesting] = useState(false);
  const [comparisonResults, setComparisonResults] = useState([]);
  
  // 🚀 Advanced AI features
  const [voiceProfile, setVoiceProfile] = useState(null);
  const [environmentNoise, setEnvironmentNoise] = useState('low');
  const [speakingRate, setSpeakingRate] = useState('normal');
  const [accentAdaptation, setAccentAdaptation] = useState({});
  const [realTimeCorrections, setRealTimeCorrections] = useState(new Map());
  const [contextualPredictions, setContextualPredictions] = useState([]);
  const [fallbackEngines, setFallbackEngines] = useState(['browser']); // 🔧 REMOVED 'google' from default
  const [currentEngine, setCurrentEngine] = useState('browser');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [googleStatus, setGoogleStatus] = useState('background'); // 🔧 CHANGED status

  // 🚀 PERFORMANCE: Advanced caching and optimization
  const lastProcessedCommand = useRef('');
  const processingCache = useRef(new Map());
  const audioContext = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const retryAttempts = useRef(0);

  // 🔥 Web Audio API for noise reduction and enhancement
  const initializeAudioProcessing = useCallback(() => {
    if (!audioContext.current) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext.current = new AudioContext();
        
        // Create audio processing pipeline
        const analyser = audioContext.current.createAnalyser();
        const filter = audioContext.current.createBiquadFilter();
        
        // Configure noise reduction
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(300, audioContext.current.currentTime);
        
        analyser.fftSize = 2048;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        console.log('🎵 Advanced audio processing pipeline initialized');
        return { analyser, filter, dataArray };
      } catch (error) {
        console.error('🎵 Audio processing fallback mode:', error);
        return null;
      }
    }
  }, []);

  // 🚀 SILENT: Google Speech backend integration (CONSOLE ONLY)
  const processWithGoogleSpeech = useCallback(async (audioBlob) => {
    try {
      console.log('🟢 [BACKGROUND] Processing with Google Speech backend...');
      setGoogleStatus('processing');
      
      // 🔧 FIX: Use correct token names from your AuthContext
      let accessToken = localStorage.getItem('authToken');
      
      // Check if we have a token
      if (!accessToken) {
        console.error('🔴 [BACKGROUND] No auth token found - user needs to login');
        setGoogleStatus('error');
        return null;
      }
      
      // Get backend URL
      const backendUrl = import.meta.env.MODE === 'development' 
        ? import.meta.env.VITE_BACKEND_URL_DEV 
        : import.meta.env.VITE_BACKEND_URL_PROD;

      // Create form data
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.wav');
      formData.append('language', 'en-US');
      
      // Add student names for better recognition
      if (studentNames.size > 0) {
        const studentNamesArray = Array.from(studentNames);
        formData.append('student_names', studentNamesArray.join(','));
      }

      console.log('🟢 [BACKGROUND] Sending to backend:', `${backendUrl}/api/speech/speech/transcribe/`);
      console.log('🔑 [BACKGROUND] Using token:', accessToken ? 'Present' : 'Missing');

      const response = await fetch(`${backendUrl}/api/speech/speech/transcribe/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData
      });

      console.log('🟢 [BACKGROUND] Response status:', response.status);

      if (response.status === 401) {
        console.log('🔄 [BACKGROUND] Token expired, trying to refresh...');
        
        // 🔧 FIX: Use correct refresh token name
        const refreshTokenStr = localStorage.getItem('refreshToken');
        if (refreshTokenStr) {
          try {
            const refreshResponse = await fetch(`${backendUrl}/api/token/refresh/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                refresh: refreshTokenStr
              })
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              localStorage.setItem('authToken', refreshData.access);
              console.log('🔄 [BACKGROUND] Token refreshed successfully');
              
              // Retry the original request with new token
              return await processWithGoogleSpeech(audioBlob);
            } else {
              console.error('🔴 [BACKGROUND] Token refresh failed - user needs to login again');
              setGoogleStatus('error');
              return null;
            }
          } catch (refreshError) {
            console.error('🔴 [BACKGROUND] Token refresh error:', refreshError);
            setGoogleStatus('error');
            return null;
          }
        } else {
          console.error('🔴 [BACKGROUND] No refresh token - user needs to login again');
          setGoogleStatus('error');
          return null;
        }
      }

      if (response.ok) {
        const result = await response.json();
        console.log('🟢 [BACKGROUND] Google Speech result:', result);
        
        if (result.success && result.text) {
          setGoogleStatus('active');
          return {
            transcript: result.text.trim(),
            confidence: result.confidence || 0.95,
            engine: 'google',
            enhanced: true
          };
        } else {
          console.log('🟢 [BACKGROUND] No speech recognized');
          setGoogleStatus('active');
          return null;
        }
      } else {
        const errorText = await response.text();
        console.error('🟢 [BACKGROUND] Google Speech error:', response.status, errorText);
        setGoogleStatus('error');
        return null;
      }
    } catch (error) {
      console.error('🟢 [BACKGROUND] Google Speech error:', error);
      setGoogleStatus('error');
      return null;
    }
  }, [studentNames]);

  // 🚀 SILENT: Google + Browser comparison system (CONSOLE ONLY)
  const processWithFallbackEngines = useCallback(async (audioBlob, transcript) => {
    const results = [];
    
    // Always include browser result if available (THIS IS THE MAIN RESULT)
    if (transcript && transcript.trim().length > 2) {
      results.push({
        transcript: transcript.trim(),
        confidence: 0.8,
        engine: 'browser',
        enhanced: false
      });
    }

    // 🔧 SILENT: Try Google Speech in background for comparison ONLY
    try {
      const googleResult = await processWithGoogleSpeech(audioBlob);
      if (googleResult && googleResult.transcript.trim().length > 2) {
        results.push(googleResult);
        
        // 🔧 CONSOLE ONLY: Log comparison for analysis
        console.log('📊 [COMPARISON] Engine Results:');
        console.log(`🌐 Browser: "${transcript}" (primary)`);
        console.log(`🟢 Google: "${googleResult.transcript}" (background analysis)`);
        
        // Store comparison data for future analysis
        setComparisonResults(prev => [...prev.slice(-9), {
          browser: transcript,
          google: googleResult.transcript,
          timestamp: new Date().toISOString(),
          browserConfidence: 0.8,
          googleConfidence: googleResult.confidence
        }]);
      }
    } catch (error) {
      console.error('🔄 [BACKGROUND] Google Speech fallback error:', error);
    }

    // 🔧 ALWAYS RETURN BROWSER RESULT (Google is just for comparison)
    return results.find(r => r.engine === 'browser') || null;
  }, [processWithGoogleSpeech]);

  // 🚀 SILENT: Real-time audio recording for Google Speech (BACKGROUND ONLY)
  const startAudioRecording = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) return;

    navigator.mediaDevices.getUserMedia({ 
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    })
    .then(stream => {
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm';
      }

      mediaRecorder.current = new MediaRecorder(stream, options);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        setAudioBuffer(audioBlob);
        
        // 🔧 SILENT: Process with Google Speech for comparison ONLY (no UI changes)
        if (audioBlob.size > 1000) {
          await processWithFallbackEngines(audioBlob, transcript);
          // 🔧 NO setTranscript call - Google is background only
        }
      };

      mediaRecorder.current.start(1000);
      setIsRecording(true);
      console.log('🎙️ [BACKGROUND] Audio recording started for Google Speech analysis');
    })
    .catch(error => {
      console.error('🎙️ [BACKGROUND] Audio recording failed:', error);
    });
  }, [processWithFallbackEngines, transcript]);

  const stopAudioRecording = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream?.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      console.log('🎙️ [BACKGROUND] Audio recording stopped');
    }
  }, [isRecording]);

  // 🚀 Advanced pattern recognition with AI
  const enhanceWithAIPatterns = useCallback((transcript) => {
    const patterns = [
      {
        name: 'student_grade',
        regex: /^(.+?)\s+(\d+(?:\.\d+)?)$/,
        confidence: 0.9,
        type: 'grade_entry'
      },
      {
        name: 'quiz_reference',
        regex: /\b(quiz|lab|exam|midterm|final)\s*(\d+)\b/i,
        confidence: 0.85,
        type: 'assessment'
      },
      {
        name: 'batch_command',
        regex: /\b(everyone|all students?|batch)\b/i,
        confidence: 0.8,
        type: 'batch_operation'
      }
    ];

    let enhanced = transcript;
    let recognizedPatterns = [];

    patterns.forEach(pattern => {
      const match = enhanced.match(pattern.regex);
      if (match) {
        recognizedPatterns.push({
          type: pattern.type,
          confidence: pattern.confidence,
          match: match[0]
        });
      }
    });

    if (recognizedPatterns.length > 0) {
      console.log('🧠 AI patterns recognized:', recognizedPatterns);
    }

    return { enhanced, patterns: recognizedPatterns };
  }, []);

  // 🚀 ENHANCED: Multi-layer similarity with phonetic matching
  const calculateAdvancedSimilarity = useMemo(() => (word1, word2) => {
    const levenshtein = calculateSimilarity(word1, word2);
    const soundex1 = generateSoundex(word1);
    const soundex2 = generateSoundex(word2);
    const phonetic = soundex1 === soundex2 ? 1.0 : 0.0;
    return (levenshtein * 0.7) + (phonetic * 0.3);
  }, []);

  const generateSoundex = useCallback((word) => {
    if (!word) return '';
    
    const soundexMap = {
      'b': '1', 'f': '1', 'p': '1', 'v': '1',
      'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
      'd': '3', 't': '3',
      'l': '4',
      'm': '5', 'n': '5',
      'r': '6'
    };
    
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!clean) return '';
    
    let soundex = clean[0].toUpperCase();
    
    for (let i = 1; i < clean.length && soundex.length < 4; i++) {
      const code = soundexMap[clean[i]];
      if (code && code !== soundex[soundex.length - 1]) {
        soundex += code;
      }
    }
    
    return soundex.padEnd(4, '0');
  }, []);

  // 🔥 UTILITY FUNCTIONS
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

  const contextWordsArray = useMemo(() => Array.from(contextWords), [contextWords]);
  const studentNamesArray = useMemo(() => Array.from(studentNames), [studentNames]);

  // 🚀 ENHANCED: AI-powered alternative selection
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

      if (current.enhanced) {
        score += 0.2;
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

  // 🚀 ENHANCED: Advanced student name recognition with phonetics
  const enhanceStudentNameRecognition = useCallback((transcript) => {
    if (!studentNames.size) return transcript;
    
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
        const similarity = calculateAdvancedSimilarity(cleanWord, studentName);
        
        if (similarity > bestScore && similarity > 0.6) {
          let bonusScore = similarity;
          if (cleanWord.startsWith(studentName.substring(0, 2))) bonusScore += 0.15;
          if (studentName.startsWith(cleanWord.substring(0, 2))) bonusScore += 0.1;
          
          if (accentAdaptation[cleanWord] === studentName) {
            bonusScore += 0.2;
          }
          
          if (bonusScore > bestScore) {
            bestMatch = studentName;
            bestScore = bonusScore;
          }
        }
      });
      
      if (bestMatch && bestScore > 0.75) {
        setAccentAdaptation(prev => ({
          ...prev,
          [cleanWord]: bestMatch
        }));
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🎯 Enhanced name correction: "${word}" → "${bestMatch}" (confidence: ${bestScore.toFixed(2)})`);
        }
        return word.replace(new RegExp(cleanWord, 'gi'), bestMatch);
      }
      
      return word;
    });
    
    const result = correctedWords.join(' ');
    processingCache.current.set(cacheKey, result);
    return result;
  }, [studentNamesArray, calculateAdvancedSimilarity, accentAdaptation]);

  // 🚀 ENHANCED: Advanced number recognition with context
  const enhanceNumberRecognition = useCallback((transcript) => {
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
    
    const contextualCorrections = {
      'ate': '8', 'too': '2', 'to': '2', 'for': '4', 'won': '1',
      'tree': '3', 'sex': '6', 'ate tea': '80', 'nine tea': '90',
      'sixty': '60', 'seventy': '70', 'eighty': '80', 'ninety': '90'
    };
    
    let enhanced = transcript;
    
    Object.entries({...numberWords, ...contextualCorrections}).forEach(([word, number]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      enhanced = enhanced.replace(regex, number);
    });
    
    enhanced = enhanced.replace(/\b(\d+)\s+(\d+)\b/g, (match, tens, ones) => {
      const tensNum = parseInt(tens);
      const onesNum = parseInt(ones);
      
      if (tensNum >= 20 && tensNum <= 90 && tensNum % 10 === 0 && onesNum <= 9) {
        const result = tensNum + onesNum;
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔢 Enhanced compound number: "${match}" → "${result}"`);
        }
        return result.toString();
      }
      
      return match;
    });
    
    enhanced = enhanced.replace(/\b(\d+)\s+hundred\s+(\d+)\b/gi, (match, hundreds, remainder) => {
      const result = parseInt(hundreds) * 100 + parseInt(remainder);
      return result.toString();
    });
    
    enhanced = enhanced.replace(/\b(\d+)\s+hundred\b/gi, (match, hundreds) => {
      const result = parseInt(hundreds) * 100;
      return result.toString();
    });
    
    processingCache.current.set(cacheKey, enhanced);
    return enhanced;
  }, []);

  // 🚀 ENHANCED: AI-powered confidence calculation
  const calculateSmartConfidence = useCallback((result, context = {}) => {
    let confidence = result.confidence || 0.8;
    
    const transcript = result.transcript.toLowerCase();
    
    if (/\b\w+\s+\d+\b/.test(transcript)) confidence += 0.1;
    if (context.recentStudents?.some(name => 
      transcript.includes(name.toLowerCase().split(' ')[0])
    )) confidence += 0.15;
    if (/\b(quiz|lab|exam|midterm|final)\b/.test(transcript)) confidence += 0.1;
    
    const hasKnownStudent = studentNamesArray.some(name => 
      transcript.includes(name) || calculateAdvancedSimilarity(transcript, name) > 0.7
    );
    if (hasKnownStudent) confidence += 0.2;
    
    const { patterns } = enhanceWithAIPatterns(transcript);
    confidence += patterns.length * 0.05;
    
    if (transcript.length < 4) confidence -= 0.2;
    if (/\b(um|uh|er|hmm)\b/.test(transcript)) confidence -= 0.1;
    if (!/\d/.test(transcript) && window.batchModeActive) confidence -= 0.15;
    
    return Math.min(confidence, 1.0);
  }, [studentNamesArray, calculateAdvancedSimilarity, enhanceWithAIPatterns]);

 const enhanceRowRangeRecognition = useCallback((transcript) => {
    console.log('🔧 BEFORE row range enhancement:', transcript);
    
    let enhanced = transcript;
    
    // 🔥 STEP 1: Fix "rowan" → "row 1"
    enhanced = enhanced.replace(/\browan\b/gi, 'row 1');
    enhanced = enhanced.replace(/\brow\s*and\b/gi, 'row 1');
    enhanced = enhanced.replace(/\broland\b/gi, 'row 1');
    enhanced = enhanced.replace(/\broman\b/gi, 'row 1');
    
    enhanced = enhanced.replace(/\bquiz\s*tree\b/gi, 'quiz 3');  
    enhanced = enhanced.replace(/\bquiz\s*free\b/gi, 'quiz 3');  
    
    enhanced = enhanced.replace(/\bforty.?five\b/gi, '95');      
    enhanced = enhanced.replace(/\bfor\s*tea\s*five\b/gi, '95'); 
    enhanced = enhanced.replace(/\bnight\s*tea\s*five\b/gi, '95'); 
    
    // 🔥 STEP 4: Fix range words
    enhanced = enhanced.replace(/\bthrew\b/gi, 'through');
    enhanced = enhanced.replace(/\bthru\b/gi, 'through');
    enhanced = enhanced.replace(/\btrue\b/gi, 'through');
    
    console.log('🔧 AFTER row range enhancement:', enhanced);
    return enhanced;
  }, []);

  // 🚀 ENHANCED: Multi-engine transcript correction
  const correctTranscriptWithContext = useCallback((rawTranscript) => {
    if (lastProcessedCommand.current === rawTranscript) {
      return rawTranscript;
    }
    
    let corrected = rawTranscript;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 BEFORE AI processing: "${rawTranscript}"`);
    }
    
    const { enhanced: aiEnhanced } = enhanceWithAIPatterns(corrected);
    corrected = aiEnhanced;
    
    corrected = enhanceStudentNameRecognition(corrected);
    corrected = enhanceNumberRecognition(corrected);

    corrected = enhanceRowRangeRecognition(corrected);
    
    realTimeCorrections.forEach((correction, mistake) => {
      const regex = new RegExp(`\\b${mistake}\\b`, 'gi');
      if (regex.test(corrected)) {
        corrected = corrected.replace(regex, correction);
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔧 Real-time correction: "${mistake}" → "${correction}"`);
        }
      }
    });
    
    if (corrected !== rawTranscript) {
      contextWordsArray.forEach(contextWord => {
        const words = corrected.split(' ');
        const correctedWords = words.map(word => {
          const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
          
          if (cleanWord.length > 2 && contextWord.length > 2) {
            const similarity = calculateAdvancedSimilarity(cleanWord, contextWord);
            if (similarity > 0.7) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`🔧 Enhanced context correction: "${word}" → "${contextWord}"`);
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
      console.log(`✅ FINAL AI-enhanced result: "${corrected}"`);
    }
    
    lastProcessedCommand.current = rawTranscript;
    return corrected;
  }, [contextWordsArray, enhanceStudentNameRecognition, enhanceNumberRecognition, calculateAdvancedSimilarity, enhanceWithAIPatterns, realTimeCorrections]);

  // 🚀 ENHANCED: Speech Recognition (Browser Primary, Google Background)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const speechRecognition = new SpeechRecognition();
      
      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;
      speechRecognition.lang = 'en-US';
      speechRecognition.maxAlternatives = 5;
      
      if (speechRecognition.grammars) {
        const grammar = '#JSGF V1.0; grammar education; public <command> = <name> <number> | quiz <number> | lab <number> | midterm | final;';
        const speechRecognitionList = new (window.SpeechGrammarList || window.webkitSpeechGrammarList)();
        speechRecognitionList.addFromString(grammar, 1);
        speechRecognition.grammars = speechRecognitionList;
      }

      initializeAudioProcessing();

      speechRecognition.onstart = () => {
        console.log('🎙️ Enhanced AI speech recognition started');
        setIsListening(true);
        setAlternatives([]);
        
        // 🔧 SILENT: Start background Google analysis
        startAudioRecording();
      };

      speechRecognition.onresult = async (event) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🎤 AI VOICE RESULT: Event received, results length:', event.results.length);
        }
        
        let finalTranscript = '';
        let interimTranscript = '';
        let hasNewFinalResult = false;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          
          if (result.isFinal) {
            hasNewFinalResult = true;
            
            const alternatives = [];
            for (let j = 0; j < Math.min(result.length, 5); j++) {
              let transcript = result[j].transcript.trim();
              
              if (transcript && transcript.length >= 3) {
                transcript = correctTranscriptWithContext(transcript);
                const smartConfidence = calculateSmartConfidence(
                  { transcript, confidence: result[j].confidence, engine: 'browser' }, 
                  { recentStudents }
                );
                
                alternatives.push({
                  transcript: transcript,
                  confidence: smartConfidence,
                  processed: true,
                  engine: 'browser'
                });
              }
            }

            // 🔧 SILENT: Process Google Speech in background (no UI impact)
            if (audioBuffer && audioBuffer.size > 5000) {
              await processWithFallbackEngines(audioBuffer, alternatives[0]?.transcript || '');
            }
            
            if (alternatives.length > 0) {
              const bestResult = selectBestAlternative(alternatives);
              if (bestResult.transcript && bestResult.transcript.trim().length >= 3) {
                finalTranscript += bestResult.transcript;
                if (process.env.NODE_ENV === 'development') {
                  console.log('🎯 AI-ENHANCED FINAL TRANSCRIPT:', finalTranscript);
                }
                setAlternatives(alternatives);
                learnFromCorrection(bestResult.transcript);
              }
            }
            
          } else {
            const interimText = result[0].transcript.trim();
            
            if (interimText && interimText.length >= 4) {
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
          }, 50);
        }
      };

      speechRecognition.onerror = (event) => {
        console.error('🔴 Enhanced speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          alert('🎙️ Microphone access denied. Please allow microphone access for enhanced voice commands.');
        } else if (event.error === 'no-speech') {
          console.log('🔇 No speech detected');
          retryAttempts.current++;
        } else if (event.error === 'audio-capture') {
          alert('🎙️ No microphone found. Please check your microphone connection.');
        } else if (event.error === 'network') {
          console.log('🌐 Network error - using browser only');
          setCurrentEngine('browser');
        }
      };

      speechRecognition.onend = () => {
        setIsListening(false);
        stopAudioRecording();
        retryAttempts.current = 0;
        
        if (window.batchModeActive && !window.batchModeFinishing) {
          setTimeout(() => {
            try {
              speechRecognition.start();
              setIsListening(true);
            } catch (error) {
              console.error('❌ AI AUTO-RESTART: Failed to restart:', error);
            }
          }, 200);
        }
      };

      setRecognition(speechRecognition);
    } else {
      setIsSupported(false);
    }
  }, []);

  useEffect(() => {
    const clearCache = () => {
      processingCache.current.clear();
    };
    
    const interval = setInterval(clearCache, 30000);
    return () => clearInterval(interval);
  }, []);

  // 🚀 Real-time learning from user corrections
  const learnFromUserCorrection = useCallback((original, corrected) => {
    const originalWords = original.toLowerCase().split(' ');
    const correctedWords = corrected.toLowerCase().split(' ');
    
    originalWords.forEach((word, index) => {
      if (correctedWords[index] && word !== correctedWords[index]) {
        setRealTimeCorrections(prev => new Map(prev.set(word, correctedWords[index])));
        console.log(`🧠 Learning correction: "${word}" → "${correctedWords[index]}"`);
      }
    });
  }, []);

  const toggleGoogleTesting = useCallback(() => {
    setGoogleTesting(prev => !prev);
    console.log(`🟢 [BACKGROUND] Google testing mode: ${!googleTesting ? 'ENABLED' : 'DISABLED'}`);
  }, [googleTesting]);

  const getComparisonStats = useCallback(() => {
    if (comparisonResults.length === 0) return null;
    
    return {
      totalComparisons: comparisonResults.length,
      recentComparisons: comparisonResults.slice(-5),
      averageAccuracy: {
        browser: 'Primary Engine',
        google: 'Background Analysis'
      }
    };
  }, [comparisonResults]);

  const adaptToUserVoice = useCallback((transcript, confidence) => {
    if (!voiceProfile) {
      setVoiceProfile({
        averageConfidence: confidence,
        commonWords: new Set([transcript.toLowerCase()]),
        sessionCount: 1
      });
    } else {
      setVoiceProfile(prev => ({
        averageConfidence: (prev.averageConfidence + confidence) / 2,
        commonWords: new Set([...prev.commonWords, transcript.toLowerCase()]),
        sessionCount: prev.sessionCount + 1
      }));
    }
  }, [voiceProfile]);

  // ALL YOUR EXISTING FUNCTIONS
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
          const utterance = new SpeechSynthesisUtterance('Voice ready');
          utterance.rate = 1.2;
          utterance.pitch = 1;
          utterance.volume = 0.6;
          window.speechSynthesis.speak(utterance);
        }
      } catch (error) {
        console.error('Error starting enhanced recognition:', error);
        setIsListening(false);
      }
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      try {
        recognition.stop();
        stopAudioRecording();
      } catch (error) {
        console.error('Error stopping enhanced recognition:', error);
      }
    }
  }, [recognition, isListening, stopAudioRecording]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setAlternatives([]);
  }, []);

  const setAccuracyLevel = useCallback((level = 'high') => {
    const thresholds = { high: 0.9, medium: 0.8, low: 0.6 };
    setConfidenceThreshold(thresholds[level] || 0.9);
    console.log(`🎯 Enhanced AI accuracy level set to ${level} (threshold: ${thresholds[level]})`);
  }, []);

  const switchEngine = useCallback((engine) => {
    setCurrentEngine(engine);
    console.log(`🔄 Switched to ${engine} engine`);
  }, []);

  const getEngineStatus = useCallback(() => {
    return {
      current: currentEngine,
      available: fallbackEngines,
      google: {
        configured: true,
        status: googleStatus
      },
      browser: isSupported
    };
  }, [currentEngine, fallbackEngines, isSupported, googleStatus]);

  return {
    // 🔥 ALL YOUR EXISTING EXPORTS
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
    studentNames: studentNamesArray,
    
    voiceProfile,
    environmentNoise,
    speakingRate,
    accentAdaptation,
    realTimeCorrections,
    contextualPredictions,
    currentEngine,
    isRecording,
    googleStatus,
    switchEngine,
    getEngineStatus,
    learnFromUserCorrection,
    adaptToUserVoice,
    processWithFallbackEngines,
    enhanceWithAIPatterns,
    calculateAdvancedSimilarity,
    googleTesting,
    toggleGoogleTesting,
    comparisonResults,
    getComparisonStats,
    
    // 🚀 ENGINE STATUS
    engines: {
      browser: isSupported,
      google: {
        configured: true,
        status: googleStatus
      }
    }
  };
};

export default useVoiceRecognition;