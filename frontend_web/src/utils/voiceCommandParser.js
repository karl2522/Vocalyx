// 🚀 ENHANCED: More comprehensive name variations with phonetic patterns
const nameVariations = {
  'maria': ['maria', 'mariah', 'mariya', 'marea', 'marie', 'mary'],
  'john': ['john', 'jon', 'johnathan', 'johnny', 'jonny', 'jonathan'],
  'michael': ['michael', 'mike', 'mikhael', 'mikael', 'mick', 'mikey'],
  'sarah': ['sarah', 'sara', 'serah', 'sera'],
  'christopher': ['christopher', 'chris', 'kristopher', 'cristopher', 'kris'],
  'elizabeth': ['elizabeth', 'liz', 'beth', 'lizzy', 'betty', 'eliza'],
  'david': ['david', 'dave', 'daveed', 'davy'],
  'jennifer': ['jennifer', 'jen', 'jenny', 'jenifer', 'jenna'],
  'james': ['james', 'jim', 'jimmy', 'jaimes', 'jamie'],
  'jessica': ['jessica', 'jess', 'jesica', 'jessie'],
  'jared': ['jared', 'jarod', 'jerrod', 'jarrod'],
  'owen': ['owen', 'owin', 'owain', 'owen\'s', 'owens'],        
  'omen': ['omen', 'omein', 'omens', 'omen\'s'],             
  'bikada': ['bikada', 'because', 'because of the', 'be cada', 'picked up'],
  'carl': ['carl', 'karl', 'carlos'],
  'ana': ['ana', 'anna', 'anne', 'ann'],
  'jose': ['jose', 'josep', 'joseph', 'joey'],
  'marie': ['marie', 'maria', 'mary', 'mari'],
  'capuras': ['capuras', 'kapuras', 'copperas', 'copras', 'cabras'],
  'michelle': ['michelle', 'michel', 'mitchell', 'mishelle'],
  'vaness': ['vaness', 'vanessa', 'vanesa', 'venetia'],
  'angelo': ['angelo', 'angel', 'anjelo', 'angela'],
  'christian': ['christian', 'cristian', 'kristen', 'kristian'],
  'patricia': ['patricia', 'patty', 'pat', 'tricia']
};

// 🚀 ENHANCED: More batch pattern recognition
const batchPatterns = {
  // Batch keywords with variations
  'everyone': 'EVERYONE',
  'all students': 'ALL_STUDENTS', 
  'entire class': 'ALL_STUDENTS',
  'whole class': 'ALL_STUDENTS',
  'everybody': 'EVERYONE',
  'all pupils': 'ALL_STUDENTS',
  'complete class': 'ALL_STUDENTS',
  'full class': 'ALL_STUDENTS',
  'total class': 'ALL_STUDENTS',
  'the class': 'ALL_STUDENTS',
  
  // Range keywords with more variations
  'through': 'THROUGH',
  'to': 'TO',
  'thru': 'THROUGH',
  'from': 'FROM',
  'rows': 'ROWS',
  'until': 'TO',
  'up to': 'TO',
  'down to': 'TO',
  'between': 'BETWEEN',
  'range': 'RANGE',
  
  // Conditional keywords
  'present': 'PRESENT',
  'absent': 'ABSENT',
  'empty': 'EMPTY',
  'filled': 'FILLED',
  'blank': 'EMPTY',
  'completed': 'FILLED',
  'done': 'FILLED',
  'missing': 'EMPTY',
  'unfinished': 'EMPTY'
};

// 🚀 MASSIVELY ENHANCED: Comprehensive phonetic corrections
const phoneticCorrections = {
  // 🔥 Lab variations (super comprehensive)
  'love': 'lab', 'lover': 'lab', 'loved': 'lab', 'loves': 'lab', 'loving': 'lab', 'lovely': 'lab',
  'live': 'lab', 'lived': 'lab', 'living': 'lab', 'leave': 'lab', 'left': 'lab', 'let': 'lab',
  'laboratory': 'lab', 'laboratories': 'lab', 'lab': 'lab',
  'love one': 'lab 1', 'love to': 'lab 2', 'love tree': 'lab 3', 'love for': 'lab 4', 'love five': 'lab 5',
  'level': 'lab', 'label': 'lab', 'lap': 'lab', 'liberal': 'lab',
  
  // 🔥 Quiz variations (enhanced)
  'quizzes': 'quiz', 'quick': 'quiz', 'quite': 'quiz', 'quiet': 'quiz', 'quest': 'quiz', 'question': 'quiz',
  'kids': 'quiz', 'chris': 'quiz', 'quests': 'quiz', 'queries': 'quiz',
  'quiz one': 'quiz 1', 'quiz to': 'quiz 2', 'quiz tree': 'quiz 3', 'quiz for': 'quiz 4', 'quiz five': 'quiz 5',
  'queens': 'quiz', 'quill': 'quiz', 'quit': 'quiz', 'quotes': 'quiz',
  
  // 🔥 Exam variations (enhanced)
  'example': 'exam', 'examine': 'exam', 'exact': 'exam', 'exit': 'exam', 'eggs am': 'exam',
  'examination': 'exam', 'examinations': 'exam', 'eggs': 'exam',
  'exam one': 'exam 1', 'exam to': 'exam 2', 'exam tree': 'exam 3',
  
  // 🔥 Midterm variations (enhanced)
  'midterm': 'midterm', 'mid': 'midterm', 'middle': 'midterm', 'medium': 'midterm',
  'mid term': 'midterm', 'middle term': 'midterm', 'meet term': 'midterm',
  'midnight': 'midterm', 'midday': 'midterm',

  // 🔥 ENHANCED: Student ID dash corrections
  'dash': '-', 'dashed': '-', 'hyphen': '-', 'minus': '-', 'dash dash': '--',
  'with dash': '-', 'and dash': '-', 'then dash': '-', 'plus dash': '-',
  'stroke': '-', 'line': '-', 'bar': '-', 'separator': '-',

  // 🔥 ENHANCED: Complex number combinations
  'twenty two': '22', 'twenty-two': '22',
  'twenty seven': '27', 'twenty-seven': '27',
  'seven twenty six': '726', 'seven two six': '726',
  'twenty twenty': '2020', 'twenty twenty one': '2021',
  'nineteen ninety': '1990', 'two thousand': '2000',
  
  // 🔥 Final variations (enhanced)
  'final': 'final', 'finale': 'final', 'find': 'final', 'file': 'final', 'fine': 'final',
  'finals': 'final', 'finding': 'final', 'finally': 'final',
  'finished': 'final', 'finish': 'final',

  // 🔥 Academic terms (enhanced)
  'assessment': 'quiz', 'assessments': 'quiz', 'evaluation': 'exam', 'evaluations': 'exam',
  'practicum': 'lab', 'practical': 'lab', 'activity': 'lab', 'activities': 'lab',
  'assignment': 'quiz', 'assignments': 'quiz', 'homework': 'quiz',
  'project': 'assignment', 'projects': 'assignment', 'task': 'assignment',
  'test': 'quiz', 'tests': 'quiz', 'testing': 'quiz',
  
  // 🔥 Numbers with phonetic mishearings (massively enhanced)
  'want': '1', 'once': '1', 'won': '1', 'one': '1', 'wand': '1', 'wine': '1',
  'to': '2', 'too': '2', 'two': '2', 'tune': '2', 'tooth': '2', 'true': '2',
  'tree': '3', 'free': '3', 'three': '3', 'tea': '3', 'the': '3', 'see': '3',
  'for': '4', 'fore': '4', 'four': '4', 'floor': '4', 'door': '4', 'more': '4',
  'five': '5', 'dive': '5', 'hive': '5', 'life': '5', 'wife': '5',
  'six': '6', 'sick': '6', 'sex': '6', 'fix': '6', 'mix': '6',
  'seven': '7', 'heaven': '7', 'eleven': '7', 'even': '7',
  'ate': '8', 'eight': '8', 'late': '8', 'gate': '8', 'hate': '8', 'rate': '8',
  'night': '9', 'nine': '9', 'line': '9', 'mine': '9', 'fine': '9', 'wine': '9',
  'teen': '10', 'ten': '10', 'hen': '10', 'pen': '10',

  // 🔥 Name corrections (FIXED - separate Owen and Omen)
  'marry': 'mary', 'marie': 'mary', 'maria': 'maria', 'mary': 'mary',
  'jon': 'john', 'johny': 'johnny', 'johnny': 'johnny', 'jonathan': 'john',
  'mike': 'michael', 'mick': 'michael', 'mikey': 'michael',
  'dave': 'david', 'davy': 'david', 'daveed': 'david',
  'chris': 'christopher', 'kris': 'christopher', 'kristopher': 'christopher',
  'liz': 'elizabeth', 'beth': 'elizabeth', 'lizzy': 'elizabeth', 'betty': 'elizabeth',
  'jen': 'jennifer', 'jenny': 'jennifer', 'jenna': 'jennifer',
  'jim': 'james', 'jimmy': 'james', 'jamie': 'james',
  'jess': 'jessica', 'jessie': 'jessica',
  
  'jarred': 'jared', 'jarod': 'jared', 'jerrod': 'jared',
  'owin': 'owen', 'owain': 'owen', 'open': 'owen', 'ocean': 'owen',
  'because': 'bikada', 'because of the': 'bikada', 'be cada': 'bikada', 'picked up': 'bikada',
  'karl': 'carl', 'carlos': 'carl', 'carla': 'carl',
  'anna': 'ana', 'anne': 'ana', 'ann': 'ana', 'hannah': 'ana',
  'joseph': 'jose', 'joey': 'jose', 'josep': 'jose', 'jos': 'jose',
  'michelle': 'michelle', 'michel': 'michelle', 'mitchell': 'michelle',
  'vanessa': 'vaness', 'vanesa': 'vaness', 'venetia': 'vaness',

  // 🔥 ENHANCED: Row corrections
  'rowan': 'row 1', 'row and': 'row 1', 'roland': 'row 1', 'roman': 'row 1',
  'rowing': 'row 1', 'ro one': 'row 1', 'roe one': 'row 1', 'road': 'row',
  'row to': 'row 2', 'row tree': 'row 3', 'row for': 'row 4', 'row five': 'row 5',

  // 🔥 ENHANCED: Direction words
  'true': 'through', 'tru': 'through', 'threw': 'through', 'thru': 'through',
  'through': 'through', 'throw': 'through', 'throne': 'through',

  // 🔥 NEW: Score-related corrections
  'score': 'score', 'store': 'score', 'scored': 'score', 'scores': 'score',
  'points': 'score', 'point': 'score', 'grade': 'score', 'grades': 'score',
  'mark': 'score', 'marks': 'score', 'rating': 'score',

  // 🔥 NEW: Common voice recognition errors (CAREFUL - don't remove important words!)
  'please': '', 'thank you': '', 'thanks': '', 'okay': '', 'ok': '', 'yes': '', 'no': '',

  // 🔥 NEW: Subject variations
  'mathematics': 'math', 'maths': 'math', 'mathematical': 'math',
  'english': 'english', 'literature': 'english', 'writing': 'english',
  'science': 'science', 'physics': 'science', 'chemistry': 'science', 'biology': 'science',
  'history': 'history', 'social studies': 'history', 'geography': 'history',
};

// 🚀 ENHANCED: More comprehensive word-to-number mapping (FIXED - removed ordinals)
const wordsToNumbers = {
  // Basic numbers
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
  'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
  'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15',
  'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19', 'twenty': '20',
  
  // Compound numbers (with and without hyphens)
  'twenty-one': '21', 'twenty-two': '22', 'twenty-three': '23', 'twenty-four': '24', 'twenty-five': '25',
  'twenty-six': '26', 'twenty-seven': '27', 'twenty-eight': '28', 'twenty-nine': '29',
  'twenty one': '21', 'twenty two': '22', 'twenty three': '23', 'twenty four': '24', 'twenty five': '25',
  'twenty six': '26', 'twenty seven': '27', 'twenty eight': '28', 'twenty nine': '29',
  'thirty': '30', 'thirty-one': '31', 'thirty-five': '35', 'thirty one': '31', 'thirty five': '35',
  'forty': '40', 'forty-five': '45', 'forty five': '45', 'forty-one': '41', 'forty one': '41',
  'fifty': '50', 'fifty-five': '55', 'fifty five': '55', 'fifty-one': '51', 'fifty one': '51',
  'sixty': '60', 'sixty-five': '65', 'sixty five': '65', 'sixty-one': '61', 'sixty one': '61',
  'seventy': '70', 'seventy-five': '75', 'seventy five': '75', 'seventy-one': '71', 'seventy one': '71',
  'eighty': '80', 'eighty-five': '85', 'eighty five': '85', 'eighty-one': '81', 'eighty one': '81',
  'ninety': '90', 'ninety-five': '95', 'ninety five': '95', 'ninety-one': '91', 'ninety one': '91',
  'hundred': '100', 'one hundred': '100',
  
  // Alternative words for zero
  'oh': '0', 'zip': '0', 'nil': '0', 'nothing': '0', 'nada': '0', 'blank': '0', 'empty': '0',
  
  // 🔥 ENHANCED: Phonetic number variations
  'won': '1', 'want': '1', 'wand': '1', 'wine': '1', 'when': '1',
  'too': '2', 'to': '2', 'tune': '2', 'true': '2', 'tooth': '2',
  'tree': '3', 'free': '3', 'tea': '3', 'see': '3', 'the': '3',
  'for': '4', 'fore': '4', 'floor': '4', 'more': '4', 'door': '4',
  'ate': '8', 'late': '8', 'gate': '8', 'hate': '8', 'rate': '8',
  'night': '9', 'line': '9', 'mine': '9', 'fine': '9', 'wine': '9',
  
  // ❌ REMOVED ORDINALS - they were breaking student name parsing!
  // 'first': '1st', 'second': '2nd', etc. - REMOVED!
  
  // 🔥 NEW: Decimal numbers (spoken)
  'point five': '.5', 'point zero': '.0', 'point one': '.1', 'point two': '.2',
  'point three': '.3', 'point four': '.4', 'point six': '.6', 'point seven': '.7',
  'point eight': '.8', 'point nine': '.9', 'half': '0.5', 'quarter': '0.25'
};

// 🚀 ENHANCED: More undo/redo patterns
const undoRedoPatterns = {
  undo: [
    'undo', 'undo that', 'cancel', 'cancel that', 'go back', 'reverse', 'take back',
    'wrong', 'mistake', 'error', 'oops', 'delete that', 'remove that', 'clear that',
    'not that', 'incorrect', 'fix that', 'change that back', 'revert', 'rollback',
    'that was wrong', 'my mistake', 'wrong student', 'wrong score', 'delete', 'remove'
  ],
  redo: [
    'redo', 'redo that', 'do again', 'repeat that', 'restore', 'bring back',
    'put back', 'return', 'again', 'once more', 'try again', 'do it again',
    'repeat', 'restore that', 'bring that back'
  ]
}

// 🚀 MASSIVELY ENHANCED: Batch command parsing with more patterns
const parseBatchCommand = (transcript) => {
  console.log('🎯 Parsing batch command:', transcript);
  
  // 🔥 Pattern 1: "Quiz 1: John 85, Maria 92, Carlos 88" (enhanced)
  const studentListPattern = /^(.+?):\s*(.+)$/;
  const studentListMatch = transcript.match(studentListPattern);
  
  if (studentListMatch) {
    const columnPart = studentListMatch[1].trim();
    const studentsPart = studentListMatch[2].trim();
    
    // 🔥 ENHANCED: Better parsing of student entries
    const studentEntries = studentsPart.split(/[,;]/).map(entry => {
      const parts = entry.trim().split(/\s+/);
      if (parts.length >= 2) {
        const score = parts[parts.length - 1];
        const name = parts.slice(0, -1).join(' ');
        // Validate score is actually a number
        if (/^\d+(\.\d+)?$/.test(score)) {
          return { name: name.trim(), score: score.trim() };
        }
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
  
  // 🔥 Pattern 2: Enhanced row range patterns
  const rowRangePatterns = [
    // 🔥 NEW: Handle "rowan" → "row 1" phonetic correction
    /^(.+?):\s*(?:rowan|row\s*one|row\s*1)\s*(?:through|to|thru|until)\s*(\d+).*?(?:all\s*(?:score|get|gets?))?\s*(\d+)$/i,
    /^(.+?)\s+(?:rowan|row\s*one|row\s*1)\s*(?:through|to|thru|until)\s*(\d+).*?(?:all\s*(?:score|get|gets?))?\s*(\d+)$/i,
    
    // 🔥 EXISTING: Standard row range patterns (keep these)
    /^(.+?):\s*row\s*(\d+)\s*(?:through|to|thru|until)\s*(\d+).*?(?:all\s*(?:score|get|gets?))?\s*(\d+)$/i,
    /^(.+?):\s*(?:row|rows)\s*(\d+)\s*(?:through|to|thru|until)\s*(\d+).*?(\d+)$/i,
    /^(.+?):\s*students?\s*(\d+)\s*(?:through|to|thru|until)\s*(\d+).*?(\d+)$/i,
    
    // 🔥 NEW: Handle cases without colon
    /^(.+?)\s+row\s*(\d+)\s*(?:through|to|thru|until)\s*(\d+).*?(?:all\s*(?:score|get|gets?))?\s*(\d+)$/i,
    /^(.+?)\s+(?:rowan|row\s*one)\s*(?:through|to|thru|until)\s*(\d+).*?(?:all\s*(?:score|get|gets?))?\s*(\d+)$/i
  ];
  
  for (const pattern of rowRangePatterns) {
  const match = transcript.match(pattern);
  if (match) {
    console.log('🔍 Row range match found:', match);
    
    let column, startRow, endRow, score;
    
    // Handle "rowan" special case patterns (first 2 patterns)
    if (pattern.source.includes('rowan')) {
      column = match[1].trim();
      startRow = 1; // "rowan" always means "row 1"
      endRow = parseInt(match[2]);
      score = match[3];
    } else {
      // Standard patterns
      column = match[1].trim();
      startRow = parseInt(match[2]);
      endRow = parseInt(match[3]);
      score = match[4];
    }
    
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
}
  
  // 🔥 Pattern 3: Enhanced "everyone" patterns
  const everyonePatterns = [
    /^(.+?)\s+(?:everyone|all students|entire class|everybody|whole class)\s*(?:present|presents|filled|here)?\s*(?:gets?|get|scores?|score|receives?)\s*(\d+)$/i,
    /^(?:everyone|all students|entire class|everybody|whole class)\s*(?:present|presents|filled|here)?\s*(?:gets?|get|scores?|score|receives?)\s*(\d+)\s*(?:for|in|on)\s*(.+?)$/i,
    /^(?:give|set)\s+(?:everyone|all students|entire class|everybody|whole class)\s*(?:present|presents|filled|here)?\s*(\d+)\s*(?:for|in|on)\s*(.+?)$/i
  ];
  
  for (const pattern of everyonePatterns) {
    const match = transcript.match(pattern);
    if (match) {
      let column, score, condition;
      
      if (match[1] && match[2]) { // Pattern 1
        column = match[1].trim();
        score = match[2];
        condition = transcript.includes('present') ? 'present' : 'all';
      } else if (match[2] && match[3]) { // Pattern 2
        score = match[2];
        column = match[3].trim();
        condition = transcript.includes('present') ? 'present' : 'all';
      } else if (match[1] && match[2]) { // Pattern 3
        score = match[1];
        column = match[2].trim();
        condition = transcript.includes('present') ? 'present' : 'all';
      }
      
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
  }
  
  // 🔥 NEW Pattern 4: Percentage-based batch commands
  const percentagePattern = /^(.+?):\s*(?:everyone|all students|entire class|everybody)\s*(?:gets?|get|scores?|score)\s*(\d+)\s*(?:percent|%|percentage)$/i;
  const percentageMatch = transcript.match(percentagePattern);
  
  if (percentageMatch) {
    const column = percentageMatch[1].trim();
    const percentage = percentageMatch[2];
    
    console.log('✅ Percentage batch detected:', { column, percentage });
    return {
      type: 'BATCH_PERCENTAGE',
      data: {
        column,
        percentage,
        confidence: 'high'
      }
    };
  }
  
  // 🔥 NEW Pattern 5: Conditional batch commands
  const conditionalPattern = /^(.+?):\s*(?:all|everyone)\s*(present|absent|empty|filled|blank|completed)\s*(?:gets?|get|scores?|score)\s*(\d+)$/i;
  const conditionalMatch = transcript.match(conditionalPattern);
  
  if (conditionalMatch) {
    const column = conditionalMatch[1].trim();
    const condition = conditionalMatch[2].toLowerCase();
    const score = conditionalMatch[3];
    
    console.log('✅ Conditional batch detected:', { column, condition, score });
    return {
      type: 'BATCH_CONDITIONAL',
      data: {
        column,
        condition,
        score,
        confidence: 'high'
      }
    };
  }
  
  return null;
};

const parseStudentId = (idText) => {
  console.log('🆔 Parsing Student ID:', idText);
  
  // Clean the text
  let cleanId = idText.trim();
  
  // Replace dash words with actual dashes
  cleanId = cleanId.replace(/\b(dash|dashed|hyphen|minus)\b/gi, '-');
  
  // Handle multiple dash patterns
  cleanId = cleanId.replace(/\s*-\s*/g, '-'); // Remove spaces around dashes
  cleanId = cleanId.replace(/\s+/g, ''); // Remove all remaining spaces
  
  // Convert word numbers to digits in ID context
  const idNumberMap = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
    'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14',
    'fifteen': '15', 'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19',
    'twenty': '20', 'thirty': '30', 'forty': '40', 'fifty': '50'
  };
  
  // Handle compound numbers for years (like "twenty two" -> "22")
  cleanId = cleanId.replace(/twenty[\s-]?two/gi, '22');
  cleanId = cleanId.replace(/twenty[\s-]?one/gi, '21');
  cleanId = cleanId.replace(/twenty[\s-]?three/gi, '23');
  cleanId = cleanId.replace(/twenty[\s-]?four/gi, '24');
  cleanId = cleanId.replace(/twenty[\s-]?five/gi, '25');
  cleanId = cleanId.replace(/twenty[\s-]?six/gi, '26');
  cleanId = cleanId.replace(/twenty[\s-]?seven/gi, '27');
  cleanId = cleanId.replace(/twenty[\s-]?eight/gi, '28');
  cleanId = cleanId.replace(/twenty[\s-]?nine/gi, '29');
  
  // Replace individual word numbers
  Object.entries(idNumberMap).forEach(([word, digit]) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleanId = cleanId.replace(regex, digit);
  });
  
  // Validate the format (should be like XX-XXXX-XXX)
  const idPattern = /^(\d{2})-?(\d{4})-?(\d{3})$/;
  const match = cleanId.match(idPattern);
  
  if (match) {
    const formattedId = `${match[1]}-${match[2]}-${match[3]}`;
    console.log('✅ Formatted Student ID:', formattedId);
    return formattedId;
  }
  
  // If no exact match, try to extract numbers and format them
  const numbers = cleanId.match(/\d+/g);
  if (numbers && numbers.length >= 3) {
    const formattedId = `${numbers[0]}-${numbers[1]}-${numbers[2]}`;
    console.log('✅ Constructed Student ID:', formattedId);
    return formattedId;
  }
  
  console.log('⚠️ Could not parse Student ID, returning as-is:', cleanId);
  return cleanId;
};

// 🚀 ENHANCED: Levenshtein with better performance
const levenshteinDistance = (str1, str2) => {
  // Early return for identical strings
  if (str1 === str2) return 0;
  
  // Early return for empty strings
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;
  
  // Ensure str1 is the shorter string for optimization
  if (str1.length > str2.length) {
    [str1, str2] = [str2, str1];
  }
  
  const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,    // insertion
        track[j - 1][i] + 1,    // deletion
        track[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  
  return track[str2.length][str1.length];
};

// 🚀 NEW: Advanced phonetic matching using Soundex
const generateSoundex = (word) => {
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
};

// 🚀 MASSIVELY ENHANCED: Context-aware phonetic corrections
const applyContextPhoneticCorrections = (transcript, contextWords = []) => {
  console.log('🔧 BEFORE context phonetic correction:', transcript);
  
  let corrected = transcript;
  let changesFound = false;
  
  // 🔥 ENHANCED: Apply standard phonetic corrections first
  Object.keys(phoneticCorrections).forEach(misheard => {
    const correct = phoneticCorrections[misheard];
    const regex = new RegExp(`\\b${misheard}\\b`, 'gi');
    
    if (regex.test(corrected)) {
      console.log(`🎯 PHONETIC CORRECTION: "${misheard}" → "${correct}"`);
      corrected = corrected.replace(regex, correct);
      changesFound = true;
    }
  });
  
  // 🔧 FIXED: More intelligent context corrections with better validation
  const words = corrected.split(' ');
  const correctedWords = words.map((word, index) => {
    const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (cleanWord.length < 2) return word;
    
    // 🔧 CRITICAL FIX: Don't correct words that are already part of valid patterns
    const currentPhrase = words.slice(Math.max(0, index - 1), index + 2).join(' ').toLowerCase();
    
    // Skip correction if word is part of a valid quiz/lab pattern
    if (/\b(quiz|lab|exam)\s+\d+\b/.test(currentPhrase)) {
      console.log(`🛡️ SKIPPING context correction for "${word}" - part of valid pattern: "${currentPhrase}"`);
      return word;
    }
    
    // Skip correction if word is a number or part of a name + number pattern
    if (/^\d+$/.test(cleanWord) || /\b\w+\s+\d+\b/.test(currentPhrase)) {
      console.log(`🛡️ SKIPPING context correction for "${word}" - number or name+number pattern`);
      return word;
    }
    
    // Find best context match using multiple algorithms
    let bestMatch = null;
    let bestScore = 0;
    let matchMethod = '';
    
    contextWords.forEach(contextWord => {
      if (cleanWord.length > 2 && contextWord.length > 2) {
        // 🔧 HIGHER THRESHOLD: Only correct if very confident
        const levenshteinSim = calculateWordSimilarity(cleanWord, contextWord);
        
        // Method 2: Soundex phonetic matching
        const soundex1 = generateSoundex(cleanWord);
        const soundex2 = generateSoundex(contextWord);
        const phoneticSim = soundex1 === soundex2 ? 1.0 : 0.0;
        
        // Method 3: Substring matching (be more careful)
        const substringSim = (cleanWord.includes(contextWord) || contextWord.includes(cleanWord)) ? 0.6 : 0.0;
        
        // Method 4: Starting characters similarity
        const startingSim = cleanWord.substring(0, 2) === contextWord.substring(0, 2) ? 0.5 : 0.0;
        
        // Combined score with weights (more conservative)
        const combinedScore = (levenshteinSim * 0.5) + (phoneticSim * 0.3) + (substringSim * 0.1) + (startingSim * 0.1);
        
        // 🔧 MUCH HIGHER THRESHOLD: Only correct if 90%+ confident AND not conflicting
        if (combinedScore > bestScore && combinedScore > 0.90) {
          // Additional check: make sure we're not corrupting existing valid patterns
          const potentialResult = word.replace(new RegExp(cleanWord, 'gi'), contextWord);
          const newPhrase = words.slice(Math.max(0, index - 1), index + 2).join(' ').toLowerCase()
                                 .replace(word.toLowerCase(), potentialResult.toLowerCase());
          
          // Don't apply if it would create invalid patterns
          if (!newPhrase.includes('quiz 1 4') && !newPhrase.includes('lab 1 2')) {
            bestMatch = contextWord;
            bestScore = combinedScore;
            matchMethod = phoneticSim > 0 ? 'phonetic' : 'similarity';
          }
        }
      }
    });
    
    if (bestMatch) {
      console.log(`🧠 CONTEXT CORRECTION: "${word}" → "${bestMatch}" (${bestScore.toFixed(2)}, ${matchMethod})`);
      changesFound = true;
      return word.replace(new RegExp(cleanWord, 'gi'), bestMatch);
    }
    
    return word;
  });
  
  corrected = correctedWords.join(' ');
  
  console.log('🔧 AFTER context phonetic correction:', corrected);
  console.log('🔧 Changes made:', changesFound);
  
  return corrected;
};

// 🚀 ENHANCED: Better word similarity calculation
const calculateWordSimilarity = (word1, word2) => {
  if (word1 === word2) return 1.0;
  
  const longer = word1.length > word2.length ? word1 : word2;
  const shorter = word1.length > word2.length ? word2 : word1;
  const editDistance = levenshteinDistance(longer, shorter);
  
  return (longer.length - editDistance) / longer.length;
};

// 🚀 ENHANCED: Standard phonetic corrections with logging
export const applyPhoneticCorrections = (transcript) => {
  console.log('🔧 BEFORE phonetic correction:', transcript);
  
  let corrected = transcript;
  let changesFound = false;
  
  // Apply corrections word by word with priority order
  const sortedCorrections = Object.entries(phoneticCorrections)
    .sort(([a], [b]) => b.length - a.length); // Longer phrases first
  
  sortedCorrections.forEach(([misheard, correct]) => {
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

// 🚀 ENHANCED: Better name cleaning with more edge cases
export const cleanName = (name) => {
  return name
    .toLowerCase()
    .replace(/[''""`]/g, '') // Remove apostrophes and quotes
    .replace(/[^a-z\s]/g, '') // Remove non-letter characters except spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\b(the|a|an|and|or|of|in|on|at|by|for|with|to)\b/g, '') // Remove common words
    .replace(/\s+/g, ' ') // Normalize spaces again
    .trim();
};

// 🚀 MASSIVELY ENHANCED: Advanced phonetic and similarity matching
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
  
  // 🔥 ENHANCED: Multi-layer phonetic similarity
  if (clean1.length > 2 && clean2.length > 2) {
    // Method 1: Soundex matching
    const soundex1 = generateSoundex(clean1);
    const soundex2 = generateSoundex(clean2);
    if (soundex1 === soundex2) return true;
    
    // Method 2: Starting consonants
    const start1 = clean1.substring(0, 2);
    const start2 = clean2.substring(0, 2);
    if (start1 === start2) return true;
    
    // Method 3: High similarity score
    const similarity = calculateWordSimilarity(clean1, clean2);
    if (similarity > 0.8) return true;
  }
  
  return false;
};

// 🚀 ENHANCED: Smarter name extraction with context awareness
const extractNameFromText = (text, recentStudents = []) => {
  const commonWords = [
    'quiz', 'lab', 'exam', 'midterm', 'final', 'test', 'and', 'the', 'a', 'an', 
    'basic', 'activity', 'html', 'css', 'javascript', 'score', 'grade', 'points',
    'assignment', 'homework', 'project', 'assessment', 'evaluation'
  ];
  
  const words = text.split(/\s+/).filter(word => word.length > 1);
  
  // 🔥 FIXED: Check recent students with MUCH HIGHER threshold and better logic
  for (const recent of recentStudents) {
    const recentWords = recent.toLowerCase().split(' ');
    
    // 🔥 NEW: Check if the ENTIRE input text closely matches a recent student
    const fullTextSimilarity = calculateWordSimilarity(text.toLowerCase().trim(), recent.toLowerCase());
    
    if (fullTextSimilarity > 0.85) {
      console.log('🎯 Found EXACT recent student match:', recent);
      return recent;
    }
    
    // 🔥 FIXED: Only match if MOST words match, not just ANY word
    let matchingWords = 0;
    let totalRecentWords = recentWords.length;
    
    recentWords.forEach(rw => {
      const hasWordMatch = words.some(w => {
        const similarity = calculateWordSimilarity(w.toLowerCase(), rw);
        return similarity > 0.90;  // 🔥 MUCH HIGHER THRESHOLD (was 0.7)
      });
      
      if (hasWordMatch) {
        matchingWords++;
      }
    });
    
    // 🔥 FIXED: Only return recent student if MAJORITY of words match
    const matchRatio = matchingWords / totalRecentWords;
    if (matchRatio > 0.7 && matchingWords >= 2) {  // Need at least 70% match AND at least 2 words
      console.log(`🎯 Found recent student with ${matchingWords}/${totalRecentWords} words matching:`, recent);
      return recent;
    }
  }
  
  // 🔥 ENHANCED: Filter out common words and numbers more intelligently
  const nameWords = words
    .filter(word => {
      const lowerWord = word.toLowerCase();
      return !commonWords.includes(lowerWord) && 
             !/^\d+$/.test(word) && // Remove pure numbers
             word.length > 1 &&
             !/^(one|two|three|four|five|six|seven|eight|nine|ten)$/i.test(word); // Remove number words
    });
  
  // 🔥 FIXED: Return the ORIGINAL filtered text, not a recent student
  const extractedName = nameWords.join(' ').trim();
  console.log(`🔍 Extracted name from text "${text}": "${extractedName}"`);
  
  return extractedName;
};

// 🚀 ENHANCED: Better gradeable column detection
const getGradeableColumns = (headers) => {
  const infoColumns = [
    'no', 'no.', 'number', 'last name', 'lastname', 'first name', 'firstname', 
    'student id', 'id', 'name', 'email', 'total', 'grade', 'average', 'sum',
    'phone', 'contact', 'address', 'birthday', 'age', 'gender', 'section',
    'year', 'course', 'department', 'status', 'remarks', 'notes'
  ];
  
  return headers.filter(header => {
    const headerLower = header.toLowerCase().trim();
    return !infoColumns.some(info => 
      headerLower === info || 
      headerLower.startsWith(info + ' ') || 
      headerLower.endsWith(' ' + info) ||
      headerLower.includes('total') ||
      headerLower.includes('average')
    );
  });
};

// 🚀 MASSIVELY ENHANCED: Advanced column matching with multiple algorithms
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
    let matchMethod = '';
    
    // 🔧 PRIORITY 1: Exact full match (like "quiz 4" matching "QUIZ 4")
    if (transcriptLower.includes(headerLower)) {
      score = 100;
      matchMethod = 'exact_full';
      console.log('✅ Exact full match found:', header);
    }
    
    // 🔧 PRIORITY 2: Look for specific number matches (quiz 4, lab 2, etc.)
    else {
      const numberPattern = /(\w+)\s+(\d+)/;
      const transcriptMatch = transcriptLower.match(numberPattern);
      const headerMatch = headerLower.match(numberPattern);
      
      if (transcriptMatch && headerMatch) {
        const [, transcriptType, transcriptNum] = transcriptMatch;
        const [, headerType, headerNum] = headerMatch;
        
        if (transcriptType === headerType && transcriptNum === headerNum) {
          score = 95; // Very high score for exact type+number match
          matchMethod = 'type_number_match';
          console.log('✅ Exact type+number match:', header, 'Score:', score);
        }
        else if (transcriptType === headerType) {
          score = 70; // Good score for type match but wrong number
          matchMethod = 'type_match';
          console.log('✅ Type match (wrong number):', header, 'Score:', score);
        }
      }
      
      // 🔧 PRIORITY 3: All header words found in transcript
      if (score < 90) {
        const allWordsFound = headerWords.every(hw => 
          transcriptWords.some(tw => tw.includes(hw) || hw.includes(tw))
        );
        
        if (allWordsFound) {
          const newScore = 85 + (headerWords.length / transcriptWords.length) * 5;
          if (newScore > score) {
            score = newScore;
            matchMethod = 'all_words';
            console.log('✅ All words match:', header, 'Score:', score);
          }
        }
      }
      
      // Lower priority methods only if no good match found
      if (score < 80) {
        // Phonetic matching
        let phoneticScore = 0;
        headerWords.forEach(hw => {
          transcriptWords.forEach(tw => {
            const soundex1 = generateSoundex(hw);
            const soundex2 = generateSoundex(tw);
            if (soundex1 === soundex2) {
              phoneticScore += 50;
            }
            else if (hw.length > 2 && tw.length > 2) {
              const similarity = calculateWordSimilarity(hw, tw);
              if (similarity > 0.75) {
                phoneticScore += similarity * 40;
              }
            }
          });
        });
        
        const avgPhoneticScore = phoneticScore / headerWords.length;
        if (avgPhoneticScore > score) {
          score = avgPhoneticScore;
          matchMethod = 'phonetic';
          if (score > 40) {
            console.log('✅ Phonetic match:', header, 'Score:', score);
          }
        }
      }
    }
    
    matches.push({ header, score, matchMethod });
    
    if (score > bestScore) {
      bestMatch = header;
      bestScore = score;
    }
  });
  
  console.log('🎯 All matches:', matches.sort((a, b) => b.score - a.score));
  console.log('🏆 Best column match:', bestMatch, 'Score:', bestScore);
  
  return bestScore >= 25 ? bestMatch : null;
};

// 🚀 ENHANCED: Better score extraction with more patterns
const extractScoreFromEnd = (transcript) => {
  const patterns = [
    // 🔥 NEW: Score keyword patterns (highest priority)
    /score\s+(\d+(?:\.\d+)?)\s*$/i,                      // "score 30"
    /score\s+is\s+(\d+(?:\.\d+)?)\s*$/i,                 // "score is 30"  
    /score\s+of\s+(\d+(?:\.\d+)?)\s*$/i,                 // "score of 30"
    /gets?\s+score\s+(\d+(?:\.\d+)?)\s*$/i,              // "gets score 30"
    /has\s+score\s+(\d+(?:\.\d+)?)\s*$/i,                // "has score 30"
    /received\s+score\s+(\d+(?:\.\d+)?)\s*$/i,           // "received score 30"
    /earned\s+score\s+(\d+(?:\.\d+)?)\s*$/i,             // "earned score 30"
    
    // 🔥 NEW: Grade keyword patterns  
    /grade\s+(\d+(?:\.\d+)?)\s*$/i,                      // "grade 30"
    /grade\s+is\s+(\d+(?:\.\d+)?)\s*$/i,                 // "grade is 30"
    /grade\s+of\s+(\d+(?:\.\d+)?)\s*$/i,                 // "grade of 30"
    /gets?\s+grade\s+(\d+(?:\.\d+)?)\s*$/i,              // "gets grade 30"
    
    // 🔥 Existing patterns (keep these for compatibility)
    /(\d+(?:\.\d+)?)\s*$/,                               // "30" (plain number)
    /(\d+)\s*(?:percent|%)\s*$/,                         // "30 percent"
    /(\d+)\s*(?:points?|pts?)\s*$/,                      // "30 points"
    /(\d+)\s*out\s*of\s*\d+\s*$/,                        // "30 out of 100"
    /got\s*(\d+(?:\.\d+)?)\s*$/,                         // "got 30"
    /received\s*(\d+(?:\.\d+)?)\s*$/,                    // "received 30"
    /earned\s*(\d+(?:\.\d+)?)\s*$/                       // "earned 30"
  ];
  
  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match) {
      const score = parseFloat(match[1]);
      if (score >= 0 && score <= 100) { // Validate score range
        console.log('✅ Score found with pattern:', pattern, 'Score:', match[1]);
        return match[1];
      }
    }
  }
  
  return null;
};

// 🚀 MASSIVELY ENHANCED: Main parsing function with improved logic flow
export const parseVoiceCommand = (transcript, headers, tableData, context = {}) => {
  const { recentStudents = [], commandHistory = [], alternatives = [] } = context;
  
  // 🔥 ENHANCED: Multi-stage transcript processing 
  let normalizedTranscript = transcript.toLowerCase().trim();
  
  // Stage 1: Apply basic phonetic corrections
  normalizedTranscript = applyPhoneticCorrections(normalizedTranscript);
  console.log('🎙️ After phonetic corrections:', normalizedTranscript);

  // Stage 2: Check for batch commands first (highest priority)
  const batchCommand = parseBatchCommand(normalizedTranscript);
  if (batchCommand) {
    console.log('🔥 Batch command detected:', batchCommand);
    return batchCommand;
  }

  // Stage 3: Check for undo/redo commands
  for (const undoWord of undoRedoPatterns.undo) {
    if (normalizedTranscript.includes(undoWord)) {
      console.log('✅ UNDO command detected');
      return {
        type: 'UNDO_COMMAND',
        data: { originalText: transcript, confidence: 'high' }
      };
    }
  }
  
  for (const redoWord of undoRedoPatterns.redo) {
    if (normalizedTranscript.includes(redoWord)) {
      console.log('✅ REDO command detected');
      return {
        type: 'REDO_COMMAND',
        data: { originalText: transcript, confidence: 'high' }
      };
    }
  }
  
  // Stage 4: Check for row selection commands
  const rowSelectPattern = /(?:row|option|choice|number|select)\s+(\d+)/i;
  const rowSelectMatch = normalizedTranscript.match(rowSelectPattern);
  
  if (rowSelectMatch) {
    const selectedOption = parseInt(rowSelectMatch[1]);
    console.log('✅ ROW_SELECTION command detected:', selectedOption);
    return {
      type: 'SELECT_DUPLICATE',
      data: { 
        selectedOption,
        originalText: transcript,
        confidence: 'high'
      }
    };
  }

  // Stage 5: Convert spoken numbers to digits
  let processedTranscript = normalizedTranscript;
  
  // Sort by length (longer phrases first) to avoid partial replacements
  const sortedNumbers = Object.entries(wordsToNumbers)
    .sort(([a], [b]) => b.length - a.length);
  
  sortedNumbers.forEach(([word, number]) => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    processedTranscript = processedTranscript.replace(regex, number);
  });

  // Clean up formatting
  processedTranscript = processedTranscript.replace(/[:]/g, ' ').replace(/\s+/g, ' ').trim();

  // Stage 6: Check for sorting commands
  const sortPatterns = [
    /(?:sort|arrange|order)\s+(?:students?\s+)?(?:by\s+)?(alphabetical|name|first\s+name|last\s+name|a\s+to\s+z|z\s+to\s+a)/i,
    /(?:alphabetize|alphabetical)\s*(?:order)?/i,
    /(?:reverse|descending)\s*(?:order|sort)?/i
  ];

  for (const pattern of sortPatterns) {
    const sortMatch = processedTranscript.match(pattern);
    if (sortMatch) {
      const sortType = sortMatch[1]?.toLowerCase() || 'alphabetical';
      let command = 'alphabetical';
      let direction = 'asc';
      
      if (sortType.includes('z to a') || sortType.includes('reverse') || 
          processedTranscript.includes('reverse') || processedTranscript.includes('descending')) {
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
  }

  const maxScorePatterns = [
    // Primary patterns
    /(.+?)\s+max\s+score\s+(\d+(?:\.\d+)?)\s*$/i,           // "Quiz 1 max score 30"
    /(.+?)\s+maximum\s+(\d+(?:\.\d+)?)\s*$/i,               // "Quiz 1 maximum 30"
    /(.+?)\s+total\s+points?\s+(\d+(?:\.\d+)?)\s*$/i,       // "Quiz 1 total points 30"
    /(.+?)\s+max\s+points?\s+(\d+(?:\.\d+)?)\s*$/i,         // "Quiz 1 max points 30"
    /set\s+(.+?)\s+max\s+score\s+(\d+(?:\.\d+)?)\s*$/i,    // "Set Quiz 1 max score 30"
    /change\s+(.+?)\s+max\s+(?:score|points?)\s+to\s+(\d+(?:\.\d+)?)\s*$/i, // "Change Quiz 1 max score to 30"
    /(.+?)\s+out\s+of\s+(\d+(?:\.\d+)?)\s*$/i,              // "Quiz 1 out of 30"
  ];

  for (const pattern of maxScorePatterns) {
    const maxScoreMatch = processedTranscript.match(pattern);
    if (maxScoreMatch) {
      const columnText = maxScoreMatch[1].trim();
      const maxScore = parseFloat(maxScoreMatch[2]);
      
      // Find the best matching column
      const matchedColumn = findBestColumnMatch(columnText, headers);
      
      if (matchedColumn && maxScore >= 0) {
        console.log('✅ MAX_SCORE command detected:', { 
          columnText,
          matchedColumn, 
          maxScore 
        });
        
        return {
          type: 'UPDATE_MAX_SCORE',
          data: {
            column: matchedColumn,
            maxScore: maxScore,
            originalText: transcript,
            confidence: 'high'
          }
        };
      }
    }
  }

  const batchMaxScorePatterns = [
    /set\s+all\s+(.+?)\s+max\s+score\s+(\d+(?:\.\d+)?)\s*$/i,     // "Set all quizzes max score 20"
    /all\s+(.+?)\s+maximum\s+(\d+(?:\.\d+)?)\s*$/i,               // "All labs maximum 15"
    /(.+?)\s+all\s+max\s+(\d+(?:\.\d+)?)\s*$/i,                   // "Quizzes all max 20"
  ];

  for (const pattern of batchMaxScorePatterns) {
    const batchMatch = processedTranscript.match(pattern);
    if (batchMatch) {
      const categoryText = batchMatch[1].trim();
      const maxScore = parseFloat(batchMatch[2]);
      
      // Find columns that match the category
      const matchingColumns = findColumnsByCategory(categoryText, headers);
      
      if (matchingColumns.length > 0 && maxScore >= 0) {
        console.log('✅ BATCH_MAX_SCORE command detected:', { 
          categoryText,
          matchingColumns, 
          maxScore 
        });
        
        return {
          type: 'UPDATE_BATCH_MAX_SCORE',
          data: {
            category: categoryText,
            columns: matchingColumns,
            maxScore: maxScore,
            originalText: transcript,
            confidence: 'high'
          }
        };
      }
    }
  }

  console.log('🎙️ Processing voice command:', processedTranscript);
  console.log('📋 Available headers:', headers);
  console.log('👥 Recent students:', recentStudents);

  // Stage 7: Extract score and process grade entry
  const score = extractScoreFromEnd(processedTranscript);
  
  if (score) {
    // Remove score from transcript to get name + column part
    const withoutScore = processedTranscript.replace(
      /\s*(?:score\s+(?:is\s+|of\s+)?|grade\s+(?:is\s+|of\s+)?|gets?\s+(?:score\s+|grade\s+)?|has\s+score\s+|received\s+(?:score\s+)?|earned\s+(?:score\s+)?|got\s+)?\d+(?:\.\d+)?(?:\s*(?:percent|%|points?|pts?|out\s*of\s*\d+))?\s*$/i,
      ''
    ).trim();
    console.log('📝 Text without score:', withoutScore);
    
    // Apply context-aware corrections
    const contextWords = [
      ...headers.map(h => h.toLowerCase()),
      ...recentStudents.map(s => s.toLowerCase())
    ];
    const enhancedText = applyContextPhoneticCorrections(withoutScore, contextWords);
    
    // Try to find column in the transcript
    const matchedColumn = findBestColumnMatch(enhancedText, headers);
    
    if (matchedColumn) {
      // Remove column words from transcript to get name
      const columnWords = matchedColumn.toLowerCase().split(/\s+/);
      let nameText = enhancedText;
      
      // Smart column word removal
      columnWords.forEach(colWord => {
        const regex = new RegExp(`\\b${colWord}\\b`, 'gi');
        nameText = nameText.replace(regex, '').trim();
      });
      
      // Remove grade-related words
      const gradeWords = [
        'math', 'science', 'english', 'quiz', 'test', 'exam', 'lab', 
        'laboratory', 'midterm', 'final', 'assignment', 'homework', 
        'activity', 'assessment', 'evaluation', 'grade', 'score'
      ];
      gradeWords.forEach(gradeWord => {
        const regex = new RegExp(`\\b${gradeWord}\\b`, 'gi');
        nameText = nameText.replace(regex, '').trim();
      });
      
      // Clean up extra spaces and limit words
      nameText = nameText.replace(/\s+/g, ' ').trim();
      const nameWords = nameText.split(' ').filter(word => word.length > 0);
      if (nameWords.length > 2) {
        nameText = nameWords.slice(0, 2).join(' '); // Take first 2 words max
      }
      
      // Enhanced name extraction with context
      const extractedName = extractNameFromText(nameText, recentStudents);
      const cleanedName = cleanName(extractedName);
      
      console.log('✅ EXCEL_COLUMN pattern matched:', { 
        originalText: withoutScore,
        enhancedText,
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

  // Stage 8: Check for confirmation/rejection patterns
  const confirmPattern = /(?:yes|yeah|yep|correct|right|that's\s*right|confirm|okay|ok|good|perfect)/i;
  if (confirmPattern.test(processedTranscript)) {
    console.log('✅ CONFIRMATION detected');
    return {
      type: 'CONFIRM_COMMAND',
      data: { originalText: transcript, confidence: 'high' }
    };
  }

  const rejectPattern = /(?:no|nope|wrong|incorrect|cancel|not\s*that|false|negative)/i;
  if (rejectPattern.test(processedTranscript)) {
    console.log('✅ REJECTION detected');
    return {
      type: 'REJECT_COMMAND',
      data: { originalText: transcript, confidence: 'high' }
    };
  }

  // 🔥 FIXED: Stage 9 - Enhanced student addition patterns (MOVED UP - HIGHEST PRIORITY!)
  const addStudentPatterns = [
    // 🔥 NEW: Patterns with Student ID
    /(?:add|new|create)\s+student\s+(.+?)\s+(?:with\s+)?(?:student\s+)?id\s+(.+)$/i,
    /(?:add|new|create)\s+student\s+(.+)$/i,
    /(?:register|enroll)\s+(.+?)(?:\s+as\s+(?:new\s+)?student)?$/i,
    /(?:student|pupil)\s+(.+?)(?:\s+(?:add|new|create))?$/i
  ];

  for (const pattern of addStudentPatterns) {
    const addStudentMatch = processedTranscript.match(pattern);
    if (addStudentMatch) {
      const fullCommand = addStudentMatch[1].trim();
      const studentIdPart = addStudentMatch[2] ? addStudentMatch[2].trim() : '';
      
      console.log('🔥 Full student command to parse:', fullCommand);
      console.log('🔥 Student ID part:', studentIdPart);
      
      // 🔧 ENHANCED: Better field extraction logic
      let lastName = '';
      let firstName = '';
      let studentId = '';
      
      // 🔥 NEW: Parse Student ID if provided in the pattern
      if (studentIdPart) {
        studentId = parseStudentId(studentIdPart);
        console.log('🆔 Parsed Student ID from pattern:', studentId);
      }
      
      // 🔧 METHOD 1: Handle "lastname X firstname Y" pattern
      const lastFirstPattern = /(?:last\s*name|lastname)\s+([^\s]+)(?:\s+(?:first\s*name|firstname)\s+([^\s]+))?/i;
      const lastFirstMatch = fullCommand.match(lastFirstPattern);
      
      if (lastFirstMatch) {
        lastName = lastFirstMatch[1];
        if (lastFirstMatch[2]) {
          firstName = lastFirstMatch[2];
        }
        console.log('🎯 Method 1 - Last First pattern:', { lastName, firstName });
      }
      
      // 🔧 METHOD 2: Handle "firstname X lastname Y" pattern  
      const firstLastPattern = /(?:first\s*name|firstname)\s+([^\s]+)(?:\s+(?:last\s*name|lastname)\s+([^\s]+))?/i;
      const firstLastMatch = fullCommand.match(firstLastPattern);
      
      if (firstLastMatch && !lastName && !firstName) {
        firstName = firstLastMatch[1];
        if (firstLastMatch[2]) {
          lastName = firstLastMatch[2];
        }
        console.log('🎯 Method 2 - First Last pattern:', { firstName, lastName });
      }
      
      // 🔧 METHOD 3: Handle mixed patterns - extract both separately
      if (!lastName || !firstName) {
        // Extract last name separately
        const lastNameOnlyPattern = /(?:last\s*name|lastname)\s+([^\s]+)/i;
        const lastNameMatch = fullCommand.match(lastNameOnlyPattern);
        if (lastNameMatch) {
          lastName = lastNameMatch[1];
        }
        
        // Extract first name separately  
        const firstNameOnlyPattern = /(?:first\s*name|firstname)\s+([^\s]+)/i;
        const firstNameMatch = fullCommand.match(firstNameOnlyPattern);
        if (firstNameMatch) {
          firstName = firstNameMatch[1];
        }
        
        console.log('🎯 Method 3 - Separate extraction:', { lastName, firstName });
      }
      
      // 🔧 METHOD 4: Simple "name X Y" format fallback
      if (!lastName && !firstName) {
        const simpleNamePattern = /(?:name)\s+([^\s]+)\s+([^\s]+)/i;
        const simpleMatch = fullCommand.match(simpleNamePattern);
        if (simpleMatch) {
          firstName = simpleMatch[1];
          lastName = simpleMatch[2];
          console.log('🎯 Method 4 - Simple name pattern:', { firstName, lastName });
        }
      }
      
      // 🔥 NEW: Extract Student ID if not already found
      if (!studentId) {
        // Look for ID patterns in the full command
        const idPatterns = [
          /(?:with\s+)?(?:student\s+)?id\s+(.+?)(?:\s|$)/i,
          /(?:student\s+)?(?:id|number)\s+(.+?)(?:\s|$)/i,
          /id\s*[:=]\s*(.+?)(?:\s|$)/i
        ];
        
        for (const idPattern of idPatterns) {
          const idMatch = fullCommand.match(idPattern);
          if (idMatch) {
            studentId = parseStudentId(idMatch[1]);
            console.log('🆔 Extracted Student ID:', studentId);
            break;
          }
        }
      }
      
      console.log('✅ ADD_STUDENT final result:', { 
        fullCommand, 
        lastName, 
        firstName, 
        studentId 
      });
      
      return {
        type: 'ADD_STUDENT',
        data: {
          'LASTNAME': lastName,      // ✅ Always use these exact field names
          'FIRST NAME': firstName,   // ✅ Always use these exact field names
          'STUDENT ID': studentId,   // ✅ Always use these exact field names
          confidence: 'high'
        }
      };
    }
  }

  // 🔥 FIXED: Stage 10 - Student ID addition patterns (MOVED DOWN - LOWER PRIORITY!)
  const studentIdPatterns = [
    /^(?!.*add\s+student)(.+?)\s+(?:add|set)\s+(?:student\s+)?id\s+(.+)$/i,  // 🔥 Exclude "add student"
    /^(?!.*add\s+student)(.+?)\s+(?:student\s+)?id\s+(.+)$/i,                // 🔥 Exclude "add student"  
    /^(?!.*add\s+student)(.+?)\s+(?:with\s+)?(?:student\s+)?id\s+(.+)$/i,    // 🔥 Exclude "add student"
    /^(?:set|add)\s+(?:student\s+)?id\s+(.+?)\s+(?:for|to)\s+(.+)$/i
  ];

  for (const pattern of studentIdPatterns) {
    const studentIdMatch = processedTranscript.match(pattern);
    if (studentIdMatch) {
      let studentName = '';
      let studentIdValue = '';
      
      // Different patterns have different group arrangements
      if (pattern.toString().includes('(?:for|to)')) {
        // Pattern: "set student id 22-2711-726 for Owen"
        studentIdValue = parseStudentId(studentIdMatch[1].trim());
        studentName = studentIdMatch[2].trim();
      } else {
        // Pattern: "Owen add student id 22-2711-726"
        studentName = studentIdMatch[1].trim();
        studentIdValue = parseStudentId(studentIdMatch[2].trim());
      }
      
      console.log('🆔 STUDENT_ID_UPDATE detected:', { studentName, studentIdValue });
      
      // Apply context-aware corrections to student name
      const contextWords = [
        ...headers.map(h => h.toLowerCase()),
        ...recentStudents.map(s => s.toLowerCase())
      ];
      const enhancedName = applyContextPhoneticCorrections(studentName, contextWords);
      const cleanedName = cleanName(enhancedName);
      
      return {
        type: 'UPDATE_STUDENT_ID',
        data: {
          searchName: cleanedName,
          studentId: studentIdValue,
          column: 'STUDENT ID',
          value: studentIdValue,
          confidence: 'high',
          extractedName: enhancedName
        }
      };
    }
  }

  // 🔥 If no patterns matched, this is likely a fallback case
  console.log('❌ No specific pattern matched, falling back to basic processing');
  
  return {
    type: 'UNKNOWN_COMMAND',
    data: {
      originalText: transcript,
      processedText: processedTranscript,
      confidence: 'low'
    }
  };
};

// 🚀 MASSIVELY ENHANCED: Super intelligent student search with multi-algorithm approach
export const findStudentRowSmart = (tableData, searchName, recentStudents = [], targetColumn = null) => {
  const cleanedSearchName = cleanName(searchName);
  console.log('🔍 Searching for student:', cleanedSearchName);
  console.log('👥 Recent context:', recentStudents);
  console.log('🎯 Target column:', targetColumn);
  
  let allMatches = [];
  
  tableData.forEach((row, index) => {
    // Skip empty rows more intelligently
    const hasData = Object.values(row).some(value => 
      value && typeof value === 'string' && value.trim() !== '' && value.trim() !== '0'
    );
    if (!hasData) return;
    
    const firstName = cleanName(row['FIRST NAME'] || '');
    const lastName = cleanName(row['LASTNAME'] || '');
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Enhanced candidate generation
    const candidates = [
      firstName, 
      lastName, 
      fullName,
      `${lastName} ${firstName}`, // Reversed order
      firstName.split(' ')[0], // First word of first name
      lastName.split(' ')[0]   // First word of last name
    ].filter(c => c && c.length > 1);
    
    candidates.forEach(candidate => {
      let score = Infinity;
      let matchType = '';
      let confidence = 0;
      
      // 🔥 Algorithm 1: Exact match (highest priority)
      if (candidate === cleanedSearchName) {
        score = 0;
        matchType = 'exact';
        confidence = 1.0;
      }
      
      // 🔥 Algorithm 2: Soundex phonetic matching
      else if (soundsLike(candidate, cleanedSearchName)) {
        score = 1;
        matchType = 'phonetic';
        confidence = 0.9;
      }
      
      // 🔥 Algorithm 3: Substring matching
      else if (candidate.includes(cleanedSearchName) || cleanedSearchName.includes(candidate)) {
        score = Math.abs(candidate.length - cleanedSearchName.length);
        matchType = 'substring';
        confidence = 0.8;
      }
      
      // 🔥 Algorithm 4: Levenshtein distance with adaptive threshold
      else {
        const distance = levenshteinDistance(candidate, cleanedSearchName);
        const maxLength = Math.max(candidate.length, cleanedSearchName.length);
        const similarity = 1 - (distance / maxLength);
        
        if (similarity > 0.65) { // Adaptive threshold
          score = distance;
          matchType = 'fuzzy';
          confidence = similarity;
        }
      }
      
      if (score < 15) { // Collect good matches
        // Check if this column already has a score
        const hasExistingScore = targetColumn && row[targetColumn] && 
                                String(row[targetColumn]).trim() !== '' && 
                                String(row[targetColumn]).trim() !== '0';
        
        allMatches.push({
          index,
          student: `${row['FIRST NAME']} ${row['LASTNAME']}`,
          score,
          matchType,
          candidate,
          confidence,
          hasExistingScore,
          existingValue: hasExistingScore ? row[targetColumn] : null,
          rowData: row
        });
      }
    });
  });
  
  // Enhanced sorting: primary by score, secondary by confidence
  allMatches.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return b.confidence - a.confidence;
  });
  
  // 🔥 🔥 🔥 DEDUPLICATE BY ROW INDEX - Keep only the best match per student row
  const deduplicatedMatches = [];
  const seenIndices = new Set();
  
  allMatches.forEach(match => {
    if (!seenIndices.has(match.index)) {
      deduplicatedMatches.push(match);
      seenIndices.add(match.index);
    }
  });
  
  console.log('🔧 Before deduplication:', allMatches.length, 'matches');
  console.log('🔧 After deduplication:', deduplicatedMatches.length, 'matches');
  
  // Replace allMatches with deduplicated version
  allMatches = deduplicatedMatches;
  
  // 🔥 ENHANCED: Smart resolution strategies
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
    const match = allMatches[0];
    console.log('✅ Single student match:', match);
    return {
      bestMatch: match.index,
      possibleMatches: [match],
      confidence: match.confidence > 0.9 ? 'high' : match.confidence > 0.7 ? 'medium' : 'low',
      hasDuplicates: false,
      needsConfirmation: false
    };
  }
  
  console.log('🔍 Multiple matches found:', allMatches);
  
  // 🔥 Strategy 1: Single exact match resolution
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
  
  // 🔥 Strategy 2: Smart duplicate detection - check if they're the SAME person
  if (exactMatches.length > 1) {
    // Check if all exact matches are actually the same student (duplicate entries)
    const uniqueStudents = new Set(exactMatches.map(match => 
      `${match.rowData['FIRST NAME']}|${match.rowData['LASTNAME']}`
    ));
    
    console.log('🔥 EXACT MATCHES DETECTED:', exactMatches.length);
    console.log('🔥 UNIQUE STUDENTS:', uniqueStudents.size);
    console.log('🔥 STUDENT NAMES:', Array.from(uniqueStudents));
    
    if (uniqueStudents.size === 1) {
      // 🔥 🔥 🔥 CRITICAL CHANGE: ALWAYS force modal for same person duplicates
      console.log('🚨 SAME PERSON WITH MULTIPLE EXACT MATCHES - FORCING MODAL');
      return {
        bestMatch: -1,
        possibleMatches: exactMatches,
        confidence: 'ambiguous',
        hasDuplicates: true,
        needsConfirmation: true,
        resolvedBy: 'same_person_exact_matches_forced_modal'
      };
    }
    
    // Different people with same search term - still need confirmation
    console.log('🤔 Multiple different people need confirmation:', exactMatches);
    return {
      bestMatch: -1,
      possibleMatches: exactMatches,
      confidence: 'ambiguous',
      hasDuplicates: true,
      needsConfirmation: true
    };
  }
  
  // 🔥 🔥 🔥 PRIORITY DUPLICATE DETECTION - Check for both different people AND same person duplicates
  const uniqueStudentNames = new Set(allMatches.map(match => match.student.toLowerCase()));
  
  // Case 1: Different people (like Michelle Capuras vs Vaness Capuras)
  if (uniqueStudentNames.size > 1) {
    console.log('🚨 DIFFERENT PEOPLE DETECTED - FORCING CONFIRMATION:', Array.from(uniqueStudentNames));
    return {
      bestMatch: -1,
      possibleMatches: allMatches.slice(0, 5),
      confidence: 'ambiguous',
      hasDuplicates: true,
      needsConfirmation: true,
      resolvedBy: 'forced_different_people_confirmation'
    };
  }
  
  // Case 2: Same person but multiple entries (like Owen Jared appears twice)
  // 🔥 🔥 🔥 CRITICAL FIX: ALWAYS force modal for multiple entries, ignore recent context
  if (uniqueStudentNames.size === 1 && allMatches.length > 1) {
    console.log('🚨 SAME PERSON - MULTIPLE ENTRIES DETECTED:', allMatches[0].student);
    console.log('📋 All entries:', allMatches.map(m => `Row ${m.index}: ${m.student}`));
    console.log('🚨 FORCING DUPLICATE MODAL - BYPASSING ALL OTHER STRATEGIES');
    
    // ALWAYS show modal for multiple entries of the same person
    return {
      bestMatch: -1,
      possibleMatches: allMatches.slice(0, 5),
      confidence: 'ambiguous',
      hasDuplicates: true,
      needsConfirmation: true,
      resolvedBy: 'same_person_multiple_entries_forced_modal'
    };
  }
  
  // 🔥 Strategy 3: Recent context resolution - MOVED AFTER duplicate detection
  if (recentStudents.length > 0) {
    // Only use recent context if we haven't detected multiple entries above
    for (const recent of recentStudents) {
      const recentMatch = allMatches.find(match => 
        match.student.toLowerCase() === recent.toLowerCase() ||
        soundsLike(match.student, recent)
      );
      if (recentMatch && recentMatch.confidence > 0.7) {
        console.log('✅ Found recent context match (no duplicates detected):', recentMatch);
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
  
  // 🔥 Strategy 4: Empty score preference
  if (targetColumn) {
    const emptyMatches = allMatches.filter(match => !match.hasExistingScore);
    
    if (emptyMatches.length === 1 && emptyMatches[0].confidence > 0.7) {
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
  
  // 🔥 Strategy 5: High confidence single match
  const highConfidenceMatches = allMatches.filter(match => match.confidence > 0.85);
  if (highConfidenceMatches.length === 1) {
    console.log('✅ Found high confidence match:', highConfidenceMatches[0]);
    return {
      bestMatch: highConfidenceMatches[0].index,
      possibleMatches: allMatches.slice(0, 3),
      confidence: 'high',
      hasDuplicates: false,
      needsConfirmation: false,
      resolvedBy: 'high_confidence'
    };
  }
  
  // Strategy 6: Best available match
  const bestMatch = allMatches[0];
  if (bestMatch.confidence > 0.6) {
    console.log('✅ Using best available match:', bestMatch);
    return {
      bestMatch: bestMatch.index,
      possibleMatches: allMatches.slice(0, 3),
      confidence: bestMatch.confidence > 0.8 ? 'medium' : 'low',
      hasDuplicates: false,
      needsConfirmation: false
    };
  }
  
  // Last resort - ask for confirmation
  console.log('🤔 Low confidence matches found:', allMatches.slice(0, 3));
  return {
    bestMatch: -1,
    possibleMatches: allMatches.slice(0, 3),
    confidence: 'low',
    hasDuplicates: false,
    needsConfirmation: true
  };
};

const findColumnsByCategory = (categoryText, headers) => {
  const categoryLower = categoryText.toLowerCase();
  const gradeableColumns = getGradeableColumns(headers);
  
  const categoryPatterns = {
    'quiz': /quiz/i,
    'lab': /lab/i,
    'exam': /exam|midterm|final/i,
    'assignment': /assignment|homework/i,
    'activity': /activity/i
  };
  
  // Find which category matches
  let matchingPattern = null;
  for (const [category, pattern] of Object.entries(categoryPatterns)) {
    if (pattern.test(categoryLower)) {
      matchingPattern = pattern;
      break;
    }
  }
  
  if (!matchingPattern) return [];
  
  // Find all columns that match this category
  return gradeableColumns.filter(header => 
    matchingPattern.test(header.toLowerCase())
  );
};

// Keep compatibility functions
export const findStudentRow = (tableData, firstName, lastName) => {
  const result = findStudentRowSmart(tableData, `${firstName} ${lastName}`);
  return result.bestMatch;
};

export const findEmptyRow = (tableData) => {
  return tableData.findIndex(row => {
    return !row['FIRST NAME'] && !row['LASTNAME'];
  });
};