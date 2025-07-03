const nameVariations = {
  'maria': ['maria', 'mariah', 'mariya', 'marea'],
  'john': ['john', 'jon', 'johnathan', 'johnny'],
  'michael': ['michael', 'mike', 'mikhael', 'mikael'],
  'sarah': ['sarah', 'sara', 'serah'],
  'christopher': ['christopher', 'chris', 'kristopher', 'cristopher'],
  'elizabeth': ['elizabeth', 'liz', 'beth', 'lizzy'],
  'david': ['david', 'dave', 'daveed'],
  'jennifer': ['jennifer', 'jen', 'jenny', 'jenifer'],
  'james': ['james', 'jim', 'jimmy', 'jaimes'],
  'jessica': ['jessica', 'jess', 'jesica']
};

const batchPatterns = {
  // Batch keywords
  'everyone': 'EVERYONE',
  'all students': 'ALL_STUDENTS', 
  'entire class': 'ALL_STUDENTS',
  'whole class': 'ALL_STUDENTS',
  'everybody': 'EVERYONE',
  
  // Range keywords  
  'through': 'THROUGH',
  'to': 'TO',
  'thru': 'THROUGH',
  'from': 'FROM',
  'rows': 'ROWS',
  
  // Conditional keywords
  'present': 'PRESENT',
  'absent': 'ABSENT',
  'empty': 'EMPTY',
  'filled': 'FILLED'
};

const phoneticCorrections = {
  // Lab variations
  'love': 'lab',
  'lover': 'lab',
  'loved': 'lab',
  'loves': 'lab',
  'loving': 'lab',
  'lovely': 'lab',
  'live': 'lab',
  'lived': 'lab',
  'living': 'lab',
  'leave': 'lab',
  'left': 'lab',
  'let': 'lab',
  'lab': 'lab', // Keep original
  
  // Quiz variations
  'quizzes': 'quiz',
  'quick': 'quiz',
  'quite': 'quiz',
  'quiet': 'quiz',
  'quest': 'quiz',
  'question': 'quiz',
  
  // Exam variations
  'example': 'exam',
  'examine': 'exam',
  'exact': 'exam',
  'exit': 'exam',
  
  // Midterm variations
  'midterm': 'midterm',
  'mid': 'midterm',
  'middle': 'midterm',
  'medium': 'midterm',
  
  // Final variations
  'final': 'final',
  'finale': 'final',
  'find': 'final',
  'file': 'final',
  'fine': 'final',

  'laboratory': 'lab',
  'laboratories': 'lab',
  'examination': 'exam',
  'examinations': 'exam',
  'assessment': 'quiz',
  'assessments': 'quiz',
  'evaluation': 'exam',
  'evaluations': 'exam',
  'practicum': 'lab',
  'practical': 'lab',
  
  'want': '1',
  'once': '1',
  'won': '1',
  'to': '2',
  'too': '2',
  'tree': '3',
  'free': '3',
  'for': '4',
  'fore': '4',
  'ate': '8',
  'night': '9',
  'teen': '10',

  'marry': 'mary',
  'marie': 'mary',
  'maria': 'maria',
  'jon': 'john',
  'johny': 'johnny',
  'mike': 'michael',
  'dave': 'david',
  'chris': 'christopher',
  'liz': 'elizabeth',
  'beth': 'elizabeth',
  'jen': 'jennifer',
  'jenny': 'jennifer',
  'jim': 'james',
  'jimmy': 'james'
};

const wordsToNumbers = {
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
  'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
  'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15',
  'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19', 'twenty': '20',
  'twenty-one': '21', 'twenty-two': '22', 'twenty-three': '23', 'twenty-four': '24', 'twenty-five': '25',
  'thirty': '30', 'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70', 'eighty': '80', 'ninety': '90',
  'hundred': '100',
  'oh': '0', 'zip': '0', 'nil': '0',
  'twenty one': '21', 'twenty two': '22', 'twenty three': '23', 'twenty four': '24', 'twenty five': '25',
  'thirty five': '35', 'forty five': '45', 'fifty five': '55', 'sixty five': '65',
  'seventy five': '75', 'eighty five': '85', 'ninety five': '95'
};

const undoRedoPatterns = {
  undo: ['undo', 'undo that', 'cancel', 'cancel that', 'go back', 'reverse', 'take back'],
  redo: ['redo', 'redo that', 'do again', 'repeat that', 'restore']
};

const parseBatchCommand = (transcript) => {
  console.log('🎯 Parsing batch command:', transcript);
  
  // Pattern 1: "Quiz 1: John 85, Maria 92, Carlos 88"
  const studentListPattern = /^(.+?):\s*(.+)$/;
  const studentListMatch = transcript.match(studentListPattern);
  
  if (studentListMatch) {
    const columnPart = studentListMatch[1].trim();
    const studentsPart = studentListMatch[2].trim();
    
    // Parse individual student entries
    const studentEntries = studentsPart.split(',').map(entry => {
      const parts = entry.trim().split(/\s+/);
      if (parts.length >= 2) {
        const score = parts[parts.length - 1];
        const name = parts.slice(0, -1).join(' ');
        return { name: name.trim(), score: score.trim() };
      }
      return null;
    }).filter(Boolean);
    
    if (studentEntries.length > 0) {
      console.log('✅ Student list batch detected:', { columnPart, studentEntries });
      return {
        type: 'BATCH_STUDENT_LIST',
        data: {
          column: columnPart,
          students: studentEntries,
          confidence: 'high'
        }
      };
    }
  }
  
  // Pattern 2: "Lab 2: Row 1 through 5, all score 90"
  const rowRangePattern = /^(.+?):\s*row\s*(\d+)\s*(?:through|to|thru)\s*(\d+).*?(?:all\s*(?:score|get|gets?))?\s*(\d+)$/i;
  const rowRangeMatch = transcript.match(rowRangePattern);
  
  if (rowRangeMatch) {
    const column = rowRangeMatch[1].trim();
    const startRow = parseInt(rowRangeMatch[2]);
    const endRow = parseInt(rowRangeMatch[3]);
    const score = rowRangeMatch[4];
    
    console.log('✅ Row range batch detected:', { column, startRow, endRow, score });
    return {
      type: 'BATCH_ROW_RANGE',
      data: {
        column,
        startRow: startRow - 1, // Convert to 0-based index
        endRow: endRow - 1,
        score,
        confidence: 'high'
      }
    };
  }
  
  // Pattern 3: "Midterm: Everyone present gets 85"
  const everyonePattern = /^(.+?)\s+(?:everyone|all students|entire class|everybody)\s*(?:present|presents|filled)?\s*(?:gets?|get|scores?|score)\s*(\d+)$/i;
  const everyoneMatch = transcript.match(everyonePattern);
  
  if (everyoneMatch) {
    const column = everyoneMatch[1].trim();
    const score = everyoneMatch[2];
    const condition = transcript.includes('present') ? 'present' : 'all';
    
    console.log('✅ Everyone batch detected:', { column, score, condition });
    return {
      type: 'BATCH_EVERYONE',
      data: {
        column,
        score,
        condition,
        confidence: 'high'
      }
    };
  }
  
  return null;
};



// Levenshtein Distance for fuzzy matching (enhanced)
const levenshteinDistance = (str1, str2) => {
  const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator,
      );
    }
  }
  return track[str2.length][str1.length];
};

const applyContextPhoneticCorrections = (transcript, contextWords = []) => {
  console.log('🔧 BEFORE context phonetic correction:', transcript);
  
  let corrected = transcript;
  let changesFound = false;
  
  // Apply enhanced corrections
  Object.keys(enhancedPhoneticCorrections).forEach(misheard => {
    const correct = enhancedPhoneticCorrections[misheard];
    const regex = new RegExp(`\\b${misheard}\\b`, 'gi');
    
    if (regex.test(corrected)) {
      console.log(`🎯 ENHANCED CORRECTION: "${misheard}" → "${correct}"`);
      corrected = corrected.replace(regex, correct);
      changesFound = true;
    }
  });
  
  // 🔥 NEW: Context-specific corrections
  const words = corrected.split(' ');
  const correctedWords = words.map(word => {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    
    // Find best context match
    let bestMatch = null;
    let bestScore = 0;
    
    contextWords.forEach(contextWord => {
      if (cleanWord.length > 2 && contextWord.length > 2) {
        const similarity = calculateWordSimilarity(cleanWord, contextWord);
        if (similarity > bestScore && similarity > 0.75) {
          bestMatch = contextWord;
          bestScore = similarity;
        }
      }
    });
    
    if (bestMatch) {
      console.log(`🧠 CONTEXT CORRECTION: "${word}" → "${bestMatch}" (${bestScore.toFixed(2)})`);
      return word.replace(new RegExp(cleanWord, 'gi'), bestMatch);
    }
    
    return word;
  });
  
  corrected = correctedWords.join(' ');
  
  console.log('🔧 AFTER context phonetic correction:', corrected);
  console.log('🔧 Changes made:', changesFound);
  
  return corrected;
};

const calculateWordSimilarity = (word1, word2) => {
  const longer = word1.length > word2.length ? word1 : word2;
  const shorter = word1.length > word2.length ? word2 : word1;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

const applyPhoneticCorrections = (transcript) => {
  console.log('🔧 BEFORE phonetic correction:', transcript);
  
  let corrected = transcript;
  let changesFound = false;
  
  // Apply corrections word by word
  Object.keys(phoneticCorrections).forEach(misheard => {
    const correct = phoneticCorrections[misheard];
    const regex = new RegExp(`\\b${misheard}\\b`, 'gi');
    
    if (regex.test(corrected)) {
      console.log(`🎯 FOUND "${misheard}" - will replace with "${correct}"`);
      corrected = corrected.replace(regex, correct);
      changesFound = true;
    }
  });
  
  console.log('🔧 AFTER phonetic correction:', corrected);
  console.log('🔧 Changes made:', changesFound);
  
  return corrected;
};

const cleanName = (name) => {
  return name
    .toLowerCase()
    .replace(/[''""`]/g, '') // Remove apostrophes and quotes
    .replace(/[^a-z\s]/g, '') // Remove non-letter characters except spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
};

const soundsLike = (name1, name2) => {
  const clean1 = cleanName(name1);
  const clean2 = cleanName(name2);
  
  // Check exact match first
  if (clean1 === clean2) return true;
  
  // Check name variations
  for (const [key, variations] of Object.entries(nameVariations)) {
    if (variations.includes(clean1) && variations.includes(clean2)) {
      return true;
    }
  }
  
  // Phonetic similarity (starts with same sound)
  if (clean1.length > 2 && clean2.length > 2) {
    const start1 = clean1.substring(0, 2);
    const start2 = clean2.substring(0, 2);
    if (start1 === start2) return true;
  }
  
  return false;
};

const extractNameFromText = (text, recentStudents = []) => {
  const commonWords = ['quiz', 'lab', 'exam', 'midterm', 'final', 'test', 'and', 'the', 'a', 'an', 'basic', 'activity', 'html', 'css', 'javascript'];
  const words = text.split(/\s+/);
  
  // Check if any recent students are mentioned
  for (const recent of recentStudents) {
    const recentWords = recent.toLowerCase().split(' ');
    if (recentWords.some(rw => words.some(w => soundsLike(w, rw)))) {
      console.log('🎯 Found recent student context:', recent);
      return recent;
    }
  }
  
  return words
    .filter(word => word.length > 1 && !commonWords.includes(word.toLowerCase()))
    .filter(word => !/^\d+$/.test(word)) // Remove pure numbers
    .join(' ')
    .trim();
};

const getGradeableColumns = (headers) => {
  const infoColumns = ['no', 'no.', 'number', 'last name', 'first name', 'student id', 'id', 'name', 'email', 'total', 'grade', 'average'];
  
  return headers.filter(header => {
    const headerLower = header.toLowerCase().trim();
    return !infoColumns.some(info => 
      headerLower === info || 
      headerLower.startsWith(info + ' ') || 
      headerLower.endsWith(' ' + info)
    );
  });
};

const findBestColumnMatch = (transcript, headers) => {
  console.log('🔍 Finding column match for:', transcript);
  console.log('📋 Available headers:', headers);
  
  const gradeableColumns = getGradeableColumns(headers);
  console.log('📊 Gradeable columns:', gradeableColumns);
  
  const transcriptLower = transcript.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;
  let matches = [];
  
  gradeableColumns.forEach(header => {
    const headerLower = header.toLowerCase();
    const headerWords = headerLower.split(/\s+/);
    const transcriptWords = transcriptLower.split(/\s+/);
    let score = 0;
    
    // Method 1: Exact substring match (highest score)
    if (transcriptLower.includes(headerLower)) {
      score = 100;
      console.log('✅ Exact match found:', header);
    }
    
    // Method 2: All header words found in transcript
    else {
      const allWordsFound = headerWords.every(hw => 
        transcriptWords.some(tw => tw.includes(hw) || hw.includes(tw))
      );
      
      if (allWordsFound) {
        score = 80 + (headerWords.length / transcriptWords.length) * 10;
        console.log('✅ All words match:', header, 'Score:', score);
      }
      
      // Method 3: Fuzzy matching for each word
      else {
        let fuzzyScore = 0;
        headerWords.forEach(hw => {
          transcriptWords.forEach(tw => {
            if (hw.length > 2 && tw.length > 2) {
              const distance = levenshteinDistance(hw, tw);
              const similarity = 1 - (distance / Math.max(hw.length, tw.length));
              if (similarity > 0.7) { // 70% similarity
                fuzzyScore += similarity * 50;
              }
            }
          });
        });
        
        score = fuzzyScore / headerWords.length;
        if (score > 30) {
          console.log('✅ Fuzzy match:', header, 'Score:', score);
        }
      }
    }
    
    matches.push({ header, score });
    
    if (score > bestScore) {
      bestMatch = header;
      bestScore = score;
    }
  });
  
  // Method 4: If only one gradeable column, use it as fallback
  if (!bestMatch && gradeableColumns.length === 1) {
    bestMatch = gradeableColumns[0];
    bestScore = 50;
    console.log('✅ Single column fallback:', bestMatch);
  }
  
  console.log('🎯 All matches:', matches.sort((a, b) => b.score - a.score));
  console.log('🏆 Best column match:', bestMatch, 'Score:', bestScore);
  
  return bestScore >= 30 ? bestMatch : null;
};

const extractScoreFromEnd = (transcript) => {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*$/,           // "85"
    /(\d+)\s*(?:percent|%)\s*$/,     // "85 percent"
    /(\d+)\s*(?:points?|pts?)\s*$/,  // "85 points"
    /(\d+)\s*out\s*of\s*\d+\s*$/     // "85 out of 100"
  ];
  
  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match) {
      console.log('✅ Score found:', match[1]);
      return match[1];
    }
  }
  
  return null;
};

export const parseVoiceCommand = (transcript, headers, tableData, context = {}) => {
  const { recentStudents = [], commandHistory = [], alternatives = [] } = context;
  
  let normalizedTranscript = transcript.toLowerCase().trim();
  normalizedTranscript = applyPhoneticCorrections(normalizedTranscript);
  console.log('🎙️ After phonetic corrections:', normalizedTranscript);

  const batchCommand = parseBatchCommand(normalizedTranscript);
  if (batchCommand) {
    console.log('🔥 Batch command detected:', batchCommand);
    return batchCommand;
  }

  for (const undoWord of undoRedoPatterns.undo) {
    if (normalizedTranscript.includes(undoWord)) {
      console.log('✅ UNDO command detected');
      return {
        type: 'UNDO_COMMAND',
        data: { originalText: transcript }
      };
    }
  }
  
  for (const redoWord of undoRedoPatterns.redo) {
    if (normalizedTranscript.includes(redoWord)) {
      console.log('✅ REDO command detected');
      return {
        type: 'REDO_COMMAND',
        data: { originalText: transcript }
      };
    }
  }
  
  const rowSelectPattern = /(?:row|option|choice)\s+(\d+)/i;
  const rowSelectMatch = normalizedTranscript.match(rowSelectPattern);
  
  if (rowSelectMatch) {
    const selectedOption = parseInt(rowSelectMatch[1]);
    console.log('✅ ROW_SELECTION command detected:', selectedOption);
    return {
      type: 'SELECT_DUPLICATE',
      data: { 
        selectedOption,
        originalText: transcript 
      }
    };
  }

  // Convert spoken numbers to digits with enhanced coverage
  let processedTranscript = normalizedTranscript;
  processedTranscript = applyPhoneticCorrections(processedTranscript);
  Object.keys(wordsToNumbers).forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    processedTranscript = processedTranscript.replace(regex, wordsToNumbers[word]);
  });

  // Clean up colons and extra spaces
  processedTranscript = processedTranscript.replace(/[:]/g, ' ').replace(/\s+/g, ' ').trim();

  const sortPattern = /(?:sort|arrange|order)\s+(?:students?\s+)?(?:by\s+)?(alphabetical|name|first\s+name|last\s+name|a\s+to\s+z|z\s+to\s+a)/i;
  const sortMatch = processedTranscript.match(sortPattern);

  if (sortMatch) {
    const sortType = sortMatch[1].toLowerCase();
    let command = 'alphabetical';
    let direction = 'asc';
    
    if (sortType.includes('z to a') || sortType.includes('reverse')) {
      direction = 'desc';
    }
    
    if (sortType.includes('first')) {
      command = 'firstName';
    } else if (sortType.includes('last')) {
      command = 'lastName';
    }
    
    console.log('✅ SORT command detected:', { command, direction });
    return {
      type: 'SORT_STUDENTS',
      data: {
        sortType: command,
        direction: direction,
        confidence: 'high'
      }
    };
  }

  console.log('🎙️ Processing voice command:', processedTranscript);
  console.log('📋 Available headers:', headers);
  console.log('👥 Recent students:', recentStudents);

  const score = extractScoreFromEnd(processedTranscript);
  
  if (score) {
    // Remove score from transcript to get name + column part
    const withoutScore = processedTranscript.replace(/\s*\d+(?:\.\d+)?(?:\s*(?:percent|%|points?|pts?|out\s*of\s*\d+))?\s*$/, '').trim();
    console.log('📝 Text without score:', withoutScore);
    
    // Try to find column in the transcript
    const matchedColumn = findBestColumnMatch(withoutScore, headers);
    
    if (matchedColumn) {
      // Remove column words from transcript to get name
      const columnWords = matchedColumn.toLowerCase().split(/\s+/);
      let nameText = withoutScore;
      
      // Remove column words from name text
      columnWords.forEach(colWord => {
        const regex = new RegExp(`\\b${colWord}\\b`, 'gi');
        nameText = nameText.replace(regex, '').trim();
      });
      
      const gradeWords = ['math', 'science', 'english', 'quiz', 'test', 'exam', 'lab', 'laboratory', 'midterm', 'final', 'assignment', 'homework', 'activity'];
      gradeWords.forEach(gradeWord => {
        const regex = new RegExp(`\\b${gradeWord}\\b`, 'gi');
        nameText = nameText.replace(regex, '').trim();
      });
      
      // Clean up extra spaces
      nameText = nameText.replace(/\s+/g, ' ').trim();

      const nameWords = nameText.split(' ').filter(word => word.length > 0);
      if (nameWords.length > 2) {
        nameText = nameWords.slice(0, 2).join(' '); // Take first 2 words max
      }
      
      // 🔥 ENHANCED: Use context-aware name extraction
      const extractedName = extractNameFromText(nameText, recentStudents);
      const cleanedName = cleanName(extractedName);
      
      console.log('✅ EXCEL_COLUMN pattern matched:', { 
        originalText: withoutScore,
        nameText, 
        extractedName,
        cleanedName, 
        matchedColumn, 
        score,
        usedContext: recentStudents.length > 0
      });

      return {
        type: 'SMART_NAME_GRADE_ENTRY',
        data: {
          searchName: cleanedName,
          column: matchedColumn,
          value: score,
          confidence: 'high',
          extractedName: extractedName
        }
      };
    }
  }

  // 🔥 NEW: Confirmation request pattern
  const confirmPattern = /(?:yes|yeah|yep|correct|right|that's right|confirm)/i;
  if (confirmPattern.test(processedTranscript)) {
    console.log('✅ CONFIRMATION detected');
    return {
      type: 'CONFIRM_COMMAND',
      data: { originalText: transcript }
    };
  }

  const rejectPattern = /(?:no|nope|wrong|incorrect|cancel|not that)/i;
  if (rejectPattern.test(processedTranscript)) {
    console.log('✅ REJECTION detected');
    return {
      type: 'REJECT_COMMAND',
      data: { originalText: transcript }
    };
  }

  // Pattern 1: Add new student (enhanced)
  const addStudentPattern = /(?:add|new)\s+student\s+(.+)$/i;
  const addStudentMatch = processedTranscript.match(addStudentPattern);

  if (addStudentMatch) {
    const fullCommand = addStudentMatch[1].trim();
    console.log('🔥 Full command to parse:', fullCommand);
    
    // 🔥 NEW: Smart field extraction
    let lastName = '';
    let firstName = '';
    let studentId = '';
    
    // Pattern: "last name kaporas first name vaness"
    const fieldPattern = /(?:last\s+name|lastname)\s+([^\s]+)(?:\s+(?:first\s+name|firstname)\s+([^\s]+))?|(?:first\s+name|firstname)\s+([^\s]+)(?:\s+(?:last\s+name|lastname)\s+([^\s]+))?/gi;
    
    let match;
    while ((match = fieldPattern.exec(fullCommand)) !== null) {
      if (match[1]) { // last name first
        lastName = match[1];
        if (match[2]) firstName = match[2];
      } else if (match[3]) { // first name first
        firstName = match[3];
        if (match[4]) lastName = match[4];
      }
    }
    
    // Extract student ID if present
    const idPattern = /(?:student\s+)?id\s+(\w+)/i;
    const idMatch = fullCommand.match(idPattern);
    if (idMatch) {
      studentId = idMatch[1];
    }
    
    console.log('✅ ADD_STUDENT pattern matched:', { 
      fullCommand, 
      lastName, 
      firstName, 
      studentId 
    });
    
    return {
      type: 'ADD_STUDENT',
      data: {
        'Last Name': lastName,
        'First Name': firstName,
        'Student ID': studentId,
        confidence: 'high'
      }
    };
  }

  // Continue with other patterns...
  // (Keep all your existing patterns but add confidence scores)

  console.log('❌ No pattern matched for:', processedTranscript);
  
  // 🔥 NEW: Suggest alternatives if available
  if (alternatives.length > 1) {
    console.log('🤔 Found alternatives:', alternatives.map(alt => alt.transcript));
    // Just log alternatives, don't process them recursively
    return {
      type: 'UNKNOWN',
      data: { 
        originalText: transcript,
        alternatives: alternatives.map(alt => alt.transcript),
        confidence: 'low',
        hasAlternatives: true
      }
    };
  }
  
  return {
    type: 'UNKNOWN',
    data: { 
      originalText: transcript,
      alternatives: alternatives.map(alt => alt.transcript),
      confidence: 'low'
    }
  };
};

// 🔥 FIXED: Better logic for when to show duplicates
export const findStudentRowSmart = (tableData, searchName, recentStudents = [], targetColumn = null) => {
  const cleanedSearchName = cleanName(searchName);
  console.log('🔍 Searching for student:', cleanedSearchName);
  console.log('👥 Recent context:', recentStudents);
  console.log('🎯 Target column:', targetColumn);
  
  let allMatches = [];
  
  tableData.forEach((row, index) => {
    // Skip empty rows
    const hasData = Object.values(row).some(value => 
      value && typeof value === 'string' && value.trim() !== ''
    );
    if (!hasData) return;
    
    const firstName = cleanName(row['FIRST NAME'] || '');
    const lastName = cleanName(row['LASTNAME'] || '');
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Check various combinations
    const candidates = [firstName, lastName, fullName].filter(c => c);
    
    candidates.forEach(candidate => {
      let score = Infinity;
      let matchType = '';
      
      // Exact match (best score)
      if (candidate === cleanedSearchName) {
        score = 0;
        matchType = 'exact';
      }
      
      // 🔥 NEW: Phonetic similarity check
      else if (soundsLike(candidate, cleanedSearchName)) {
        score = 1;
        matchType = 'phonetic';
      }
      
      // Partial match
      else if (candidate.includes(cleanedSearchName) || cleanedSearchName.includes(candidate)) {
        score = Math.abs(candidate.length - cleanedSearchName.length);
        matchType = 'partial';
      }
      
      // Fuzzy match
      else {
        const distance = levenshteinDistance(candidate, cleanedSearchName);
        const similarity = 1 - (distance / Math.max(candidate.length, cleanedSearchName.length));
        
        if (similarity > 0.6) { // 60% similarity threshold
          score = distance;
          matchType = 'fuzzy';
        }
      }
      
      if (score < 10) { // Collect all good matches
        // 🔥 NEW: Check if this column already has a score
        const hasExistingScore = targetColumn && row[targetColumn] && 
                                String(row[targetColumn]).trim() !== '' && 
                                String(row[targetColumn]).trim() !== '0';
        
        allMatches.push({
          index,
          student: `${row['FIRST NAME']} ${row['LASTNAME']}`,
          score,
          matchType,
          candidate,
          hasExistingScore,
          existingValue: hasExistingScore ? row[targetColumn] : null,
          rowData: row
        });
      }
    });
  });
  
  // Sort matches by score (best first)
  allMatches.sort((a, b) => a.score - b.score);
  
  // 🔥 FIXED: Better duplicate detection
  if (allMatches.length === 0) {
    console.log('❌ No student match found for:', cleanedSearchName);
    return {
      bestMatch: -1,
      possibleMatches: [],
      confidence: 'none',
      hasDuplicates: false,
      needsConfirmation: false
    };
  }
  
  if (allMatches.length === 1) {
    // Single match - use it
    const match = allMatches[0];
    console.log('✅ Single student match:', match);
    return {
      bestMatch: match.index,
      possibleMatches: [match],
      confidence: match.score === 0 ? 'high' : match.score < 3 ? 'medium' : 'low',
      hasDuplicates: false,
      needsConfirmation: false
    };
  }
  
  // 🔥 FIXED: Multiple matches found - apply smart resolution
  console.log('🔍 Multiple matches found:', allMatches);
  
  // Strategy 1: If we have a clear exact match (score 0), use it unless there are multiple exact matches
  const exactMatches = allMatches.filter(match => match.score === 0);
  if (exactMatches.length === 1) {
    console.log('✅ Single exact match found:', exactMatches[0]);
    return {
      bestMatch: exactMatches[0].index,
      possibleMatches: allMatches.slice(0, 3),
      confidence: 'high',
      hasDuplicates: false,
      needsConfirmation: false
    };
  }
  
  // Strategy 2: Multiple exact matches - need user confirmation
  if (exactMatches.length > 1) {
    console.log('🤔 Multiple exact matches need confirmation:', exactMatches);
    return {
      bestMatch: -1,
      possibleMatches: exactMatches,
      confidence: 'ambiguous',
      hasDuplicates: true,
      needsConfirmation: true
    };
  }
  
  // Strategy 3: Prefer empty score cells over filled ones
  if (targetColumn) {
    const emptyMatches = allMatches.filter(match => !match.hasExistingScore);
    if (emptyMatches.length === 1) {
      console.log('✅ Found single empty score match:', emptyMatches[0]);
      return {
        bestMatch: emptyMatches[0].index,
        possibleMatches: allMatches.slice(0, 3),
        confidence: 'high',
        hasDuplicates: false,
        needsConfirmation: false,
        resolvedBy: 'empty_score'
      };
    }
  }
  
  // Strategy 4: Check recent context
  if (recentStudents.length > 0) {
    for (const recent of recentStudents) {
      const recentMatch = allMatches.find(match => 
        match.student.toLowerCase() === recent.toLowerCase()
      );
      if (recentMatch) {
        console.log('✅ Found recent context match:', recentMatch);
        return {
          bestMatch: recentMatch.index,
          possibleMatches: allMatches.slice(0, 3),
          confidence: 'high',
          hasDuplicates: false,
          needsConfirmation: false,
          resolvedBy: 'recent_context'
        };
      }
    }
  }
  
  // Strategy 5: If we have significantly different scores, show options
  const bestScore = allMatches[0].score;
  const similarMatches = allMatches.filter(match => match.score <= bestScore + 2);
  
  if (similarMatches.length > 1) {
    console.log('🤔 Multiple similar matches need confirmation:', similarMatches);
    return {
      bestMatch: -1,
      possibleMatches: similarMatches,
      confidence: 'ambiguous',
      hasDuplicates: true,
      needsConfirmation: true
    };
  }
  
  // Strategy 6: Best score wins
  const bestMatch = allMatches[0];
  console.log('✅ Using best score match:', bestMatch);
  return {
    bestMatch: bestMatch.index,
    possibleMatches: allMatches.slice(0, 3),
    confidence: bestMatch.score === 0 ? 'high' : bestMatch.score < 3 ? 'medium' : 'low',
    hasDuplicates: false,
    needsConfirmation: false
  };
};

// Keep compatibility functions but enhance them
export const findStudentRow = (tableData, firstName, lastName) => {
  const result = findStudentRowSmart(tableData, `${firstName} ${lastName}`);
  return result.bestMatch;
};

export const findEmptyRow = (tableData) => {
  return tableData.findIndex(row => {
    return !row['FIRST NAME'] && !row['LASTNAME']; // 🔥 Updated keys
  });
};