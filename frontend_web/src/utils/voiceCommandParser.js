// Convert spoken numbers to digits
const wordsToNumbers = {
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
  'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
  'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15',
  'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19', 'twenty': '20',
  'twenty-one': '21', 'twenty-two': '22', 'twenty-three': '23', 'twenty-four': '24', 'twenty-five': '25',
  'thirty': '30', 'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70', 'eighty': '80', 'ninety': '90',
  'hundred': '100'
};

// Levenshtein Distance for fuzzy matching
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

// Clean and normalize names
const cleanName = (name) => {
  return name
    .toLowerCase()
    .replace(/[''""`]/g, '') // Remove apostrophes and quotes
    .replace(/[^a-z\s]/g, '') // Remove non-letter characters except spaces
    .trim();
};

// Smart name extraction
const extractNameFromText = (text) => {
  // Remove common words that aren't names
  const commonWords = ['quiz', 'lab', 'exam', 'midterm', 'final', 'test', 'and', 'the', 'a', 'an', 'basic', 'activity', 'html', 'css', 'javascript'];
  const words = text.split(/\s+/);
  
  return words
    .filter(word => word.length > 1 && !commonWords.includes(word.toLowerCase()))
    .filter(word => !/^\d+$/.test(word)) // Remove pure numbers
    .join(' ')
    .trim();
};

// 🔥 NEW: Identify gradeable columns (skip info columns)
const getGradeableColumns = (headers) => {
  const infoColumns = ['no', 'no.', 'number', 'last name', 'first name', 'student id', 'id', 'name', 'email'];
  
  return headers.filter(header => {
    const headerLower = header.toLowerCase().trim();
    return !infoColumns.some(info => 
      headerLower === info || 
      headerLower.startsWith(info + ' ') || 
      headerLower.endsWith(' ' + info)
    );
  });
};

// 🔥 NEW: Smart column matching with fuzzy logic
const findBestColumnMatch = (transcript, headers) => {
  console.log('🔍 Finding column match for:', transcript);
  console.log('📋 Available headers:', headers);
  
  const gradeableColumns = getGradeableColumns(headers);
  console.log('📊 Gradeable columns:', gradeableColumns);
  
  const transcriptLower = transcript.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;
  
  gradeableColumns.forEach(header => {
    const headerLower = header.toLowerCase();
    const headerWords = headerLower.split(/\s+/);
    const transcriptWords = transcriptLower.split(/\s+/);
    
    // Method 1: Exact substring match
    if (transcriptLower.includes(headerLower)) {
      console.log('✅ Exact match found:', header);
      return bestMatch = header;
    }
    
    // Method 2: All header words found in transcript
    const allWordsFound = headerWords.every(hw => 
      transcriptWords.some(tw => tw.includes(hw) || hw.includes(tw))
    );
    
    if (allWordsFound) {
      const score = headerWords.length / transcriptWords.length;
      if (score > bestScore) {
        bestMatch = header;
        bestScore = score;
        console.log('✅ All words match:', header, 'Score:', score);
      }
    }
    
    // Method 3: Fuzzy matching for each word
    let fuzzyScore = 0;
    headerWords.forEach(hw => {
      transcriptWords.forEach(tw => {
        if (hw.length > 2 && tw.length > 2) {
          const distance = levenshteinDistance(hw, tw);
          const similarity = 1 - (distance / Math.max(hw.length, tw.length));
          if (similarity > 0.7) { // 70% similarity
            fuzzyScore += similarity;
          }
        }
      });
    });
    
    const avgFuzzyScore = fuzzyScore / headerWords.length;
    if (avgFuzzyScore > bestScore && avgFuzzyScore > 0.5) {
      bestMatch = header;
      bestScore = avgFuzzyScore;
      console.log('✅ Fuzzy match:', header, 'Score:', avgFuzzyScore);
    }
  });
  
  // Method 4: If only one gradeable column, use it as fallback
  if (!bestMatch && gradeableColumns.length === 1) {
    bestMatch = gradeableColumns[0];
    console.log('✅ Single column fallback:', bestMatch);
  }
  
  console.log('🎯 Best column match:', bestMatch);
  return bestMatch;
};

// 🔥 NEW: Extract score from the end of transcript
const extractScoreFromEnd = (transcript) => {
  const scorePattern = /(\d+(?:\.\d+)?)\s*$/;
  const match = transcript.match(scorePattern);
  return match ? match[1] : null;
};

export const parseVoiceCommand = (transcript, headers, tableData) => {
  const normalizedTranscript = transcript.toLowerCase().trim();
  
  // Convert spoken numbers to digits
  let processedTranscript = normalizedTranscript;
  Object.keys(wordsToNumbers).forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    processedTranscript = processedTranscript.replace(regex, wordsToNumbers[word]);
  });

  // Clean up colons and extra spaces
  processedTranscript = processedTranscript.replace(/[:]/g, ' ').replace(/\s+/g, ' ').trim();

  console.log('🎙️ Processing voice command:', processedTranscript);
  console.log('📋 Available headers:', headers);

  // 🔥 NEW PATTERN: Smart Excel Column Pattern
  // "omen html basic activity 20" or "maria javascript 85"
  const score = extractScoreFromEnd(processedTranscript);
  
  if (score) {
    // Remove score from transcript to get name + column part
    const withoutScore = processedTranscript.replace(/\s*\d+(?:\.\d+)?\s*$/, '').trim();
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
      
      // Clean up extra spaces
      nameText = nameText.replace(/\s+/g, ' ').trim();
      
      const cleanedName = cleanName(nameText);
      
      console.log('✅ EXCEL_COLUMN pattern matched:', { 
        originalText: withoutScore,
        nameText, 
        cleanedName, 
        matchedColumn, 
        score 
      });

      return {
        type: 'SMART_NAME_GRADE_ENTRY',
        data: {
          searchName: cleanedName,
          column: matchedColumn,
          value: score
        }
      };
    }
  }

  // Pattern 1: Add new student
  const addStudentPattern = /add student (.+?)(?:\s+student\s+id\s+(\w+))?$/i;
  const addStudentMatch = processedTranscript.match(addStudentPattern);
  
  if (addStudentMatch) {
    const fullName = addStudentMatch[1].trim();
    const studentId = addStudentMatch[2] || '';
    const nameParts = fullName.split(' ');
    
    console.log('✅ ADD_STUDENT pattern matched:', { fullName, studentId, nameParts });
    return {
      type: 'ADD_STUDENT',
      data: {
        'Last Name': nameParts[0] || '',
        'First Name': nameParts.slice(1).join(' ') || '',
        'Student ID': studentId
      }
    };
  }

  // Pattern 2: Row-based entry with any column
  // "row 2 html basic activity 85"
  const rowPattern = /row\s+(\d+)\s+(.+?)\s+(\d+(?:\.\d+)?)$/i;
  const rowMatch = processedTranscript.match(rowPattern);
  
  if (rowMatch) {
    const [, rowNumber, columnText, score] = rowMatch;
    const matchedColumn = findBestColumnMatch(columnText, headers);
    
    if (matchedColumn) {
      console.log('✅ ROW pattern matched:', { rowNumber, columnText, matchedColumn, score });
      
      return {
        type: 'ROW_GRADE_ENTRY',
        data: {
          rowIndex: parseInt(rowNumber) - 1,
          column: matchedColumn,
          value: score
        }
      };
    }
  }

  // Pattern 3: Traditional template patterns (keep for backward compatibility)
  const traditionalPattern = /^(.+?)\s+(quiz|lab|midterm|final|exam)\s*(\d+)?\s*(\d+(?:\.\d+)?)$/i;
  const traditionalMatch = processedTranscript.match(traditionalPattern);
  
  if (traditionalMatch) {
    const [, nameText, category, number, score] = traditionalMatch;
    
    const extractedName = extractNameFromText(nameText);
    const cleanedName = cleanName(extractedName);
    
    let columnName = '';
    if (category.toLowerCase() === 'quiz') {
      columnName = `Quiz ${number || '1'}`;
    } else if (category.toLowerCase() === 'lab') {
      columnName = `Lab ${number || '1'}`;
    } else if (category.toLowerCase() === 'midterm') {
      columnName = 'Midterm';
    } else if (category.toLowerCase() === 'final' || category.toLowerCase() === 'exam') {
      columnName = 'Final Exam';
    }

    console.log('✅ TRADITIONAL pattern matched:', { 
      nameText, 
      extractedName, 
      cleanedName, 
      category, 
      number, 
      score 
    });

    return {
      type: 'SMART_NAME_GRADE_ENTRY',
      data: {
        searchName: cleanedName,
        column: columnName,
        value: score
      }
    };
  }

  // Pattern 4: Quick grade for selected row with any column
  // "html basic activity 85" (for selected row)
  const quickScore = extractScoreFromEnd(processedTranscript);
  if (quickScore) {
    const withoutScore = processedTranscript.replace(/\s*\d+(?:\.\d+)?\s*$/, '').trim();
    const matchedColumn = findBestColumnMatch(withoutScore, headers);
    
    if (matchedColumn) {
      console.log('✅ QUICK pattern matched:', { withoutScore, matchedColumn, quickScore });
      
      return {
        type: 'QUICK_GRADE_ENTRY',
        data: {
          column: matchedColumn,
          value: quickScore
        }
      };
    }
  }

  console.log('❌ No pattern matched for:', processedTranscript);
  return {
    type: 'UNKNOWN',
    data: { originalText: transcript }
  };
};

// Smart fuzzy student finder (keep existing)
export const findStudentRowSmart = (tableData, searchName) => {
  const cleanedSearchName = cleanName(searchName);
  console.log('🔍 Searching for student:', cleanedSearchName);
  
  let bestMatch = -1;
  let bestScore = Infinity;
  
  tableData.forEach((row, index) => {
    // Skip empty rows
    const hasData = Object.values(row).some(value => 
      value && typeof value === 'string' && value.trim() !== ''
    );
    if (!hasData) return;
    
    const firstName = cleanName(row['First Name'] || '');
    const lastName = cleanName(row['Last Name'] || '');
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Check various combinations
    const candidates = [firstName, lastName, fullName].filter(c => c);
    
    candidates.forEach(candidate => {
      // Exact match (best score)
      if (candidate === cleanedSearchName) {
        bestMatch = index;
        bestScore = 0;
        return;
      }
      
      // Partial match
      if (candidate.includes(cleanedSearchName) || cleanedSearchName.includes(candidate)) {
        const score = Math.abs(candidate.length - cleanedSearchName.length);
        if (score < bestScore) {
          bestMatch = index;
          bestScore = score;
        }
      }
      
      // Fuzzy match
      const distance = levenshteinDistance(candidate, cleanedSearchName);
      const similarity = 1 - (distance / Math.max(candidate.length, cleanedSearchName.length));
      
      if (similarity > 0.6 && distance < bestScore) {
        bestMatch = index;
        bestScore = distance;
      }
    });
  });
  
  if (bestMatch !== -1) {
    const matchedStudent = tableData[bestMatch];
    console.log('✅ Found student match:', {
      index: bestMatch,
      student: `${matchedStudent['First Name']} ${matchedStudent['Last Name']}`,
      score: bestScore
    });
  } else {
    console.log('❌ No student match found for:', cleanedSearchName);
  }
  
  return bestMatch;
};

// Keep compatibility functions
export const findStudentRow = (tableData, firstName, lastName) => {
  return tableData.findIndex(row => {
    const rowFirstName = (row['First Name'] || '').toLowerCase().trim();
    const rowLastName = (row['Last Name'] || '').toLowerCase().trim();
    const searchFirstName = (firstName || '').toLowerCase().trim();
    const searchLastName = (lastName || '').toLowerCase().trim();
    
    if (rowFirstName === searchFirstName && rowLastName === searchLastName) {
      return true;
    }
    
    if (searchFirstName && rowFirstName.includes(searchFirstName)) {
      return true;
    }
    
    if (searchLastName && rowLastName.includes(searchLastName)) {
      return true;
    }
    
    return false;
  });
};

export const findEmptyRow = (tableData) => {
  return tableData.findIndex(row => {
    return !row['First Name'] && !row['Last Name'];
  });
};