# Module 2: Real-Time Speech-to-Text Score Recording

## Overview
Module 2 implements advanced speech recognition capabilities for real-time score recording in educational environments. This module enables teachers to verbally input student scores using natural language processing, fuzzy matching algorithms, and intelligent error correction systems.

## Front-end component(s) 

### Mobile App Components (Android Kotlin)

#### Assessment Column Selection Interface
**Description and purpose**: Provides a multi-step dialog interface that allows teachers to either select existing assessment columns from Excel sheets or create new columns for score recording. Features dynamic column discovery from imported Excel files, column categorization (Quiz, Lab, Exam), and validation to ensure teachers can only record scores into properly configured assessment columns.
**Component type or format**: Kotlin Jetpack Compose UI component (`VoiceRecordingDialog.kt` - Steps 1-2)
**Location**: `Mobile/app/src/main/java/com/example/vocalyxapk/composables/VoiceRecordingDialog.kt` lines 50-120

#### Dual-Engine Voice Recording Interface  
**Description and purpose**: Manages real-time voice recording sessions with support for both Android Native Speech Recognition and Google Cloud Speech-to-Text. Features automatic silence detection, audio preprocessing, volume visualization, and intelligent engine fallback. Supports both single-entry mode (one student-score pair per recording) and batch mode (multiple entries per session) with automatic speech-to-silence detection for session termination.
**Component type or format**: Kotlin Jetpack Compose UI component (`VoiceRecordingInterface.kt`)
**Location**: `Mobile/app/src/main/java/com/example/vocalyxapk/composables/VoiceRecordingInterface.kt` lines 40-150

#### Advanced Student Name Validation and Fuzzy Matching
**Description and purpose**: Implements sophisticated student name matching using multiple algorithms including exact matching, Levenshtein distance calculation, phonetic similarity (Soundex), and fuzzy string matching with confidence scoring. Handles duplicate student detection, provides similarity-based suggestions, and manages disambiguation through interactive selection dialogs when multiple matches are found.
**Component type or format**: Kotlin Jetpack Compose UI components (`SpeechRecognizedScreen`, `DuplicateStudentSelectionDialog`)
**Location**: `Mobile/app/src/main/java/com/example/vocalyxapk/composables/VoiceRecordingDialog.kt` lines 200-350, `VoiceRecordingScreens.kt`

#### Excel Integration and Score Management
**Description and purpose**: Handles comprehensive Excel file management including loading sheet data, validating score ranges against maximum scores, performing optimistic local updates, and synchronizing with backend APIs. Features real-time data validation, rollback capabilities on failures, batch processing for multiple score entries, and intelligent caching to minimize API calls during voice recording sessions.
**Component type or format**: Kotlin business logic in ViewModel and Repository classes
**Location**: `Mobile/app/src/main/java/com/example/vocalyxapk/viewmodel/ExcelViewModel.kt` and `repository/ExcelRepository.kt`

### Web Frontend Components (React)

#### Real-Time Voice Command Processing Interface
**Description and purpose**: Provides advanced voice recognition capabilities with dual-engine support (Browser SpeechRecognition API + Google Cloud Speech-to-Text for comparison). Features real-time transcript processing, phonetic corrections for common classroom names, contextual student name enhancement, and intelligent command parsing for various grading scenarios including single entries, batch operations, and row range commands.
**Component type or format**: React custom hook and utility functions
**Location**: `frontend_web/src/utils/useVoiceRecognition.js`, `frontend_web/src/utils/voiceCommandParser.js`

#### Google Sheets Integration and Score Validation
**Description and purpose**: Manages direct integration with Google Sheets through service account authentication, providing real-time score updates, column mapping, student name fuzzy matching, and comprehensive validation. Features override confirmation for existing scores, maximum score validation, batch processing capabilities, and duplicate student resolution through interactive modals.
**Component type or format**: React component with Google Sheets API integration
**Location**: `frontend_web/src/components/ClassRecordExcel.jsx` lines 280-2500

## Back-end component(s) 

#### Enhanced Speech-to-Text API with Context Awareness
**Description and purpose**: RESTful API endpoint that processes audio files using Google Cloud Speech-to-Text with advanced audio preprocessing, student name context injection, and multi-alternative transcript analysis. Features noise reduction for classroom environments, WEBM OPUS format support, phonetic variation handling for common name mishearings, and intelligent confidence scoring based on student roster matching.
**Component type or format**: Django REST Framework ViewSet with Google Cloud Speech API integration
**Location**: `backend/backend/speech_services/views.py`, `backend/backend/speech_services/utils.py`

#### Intelligent Audio Preprocessing and Enhancement Engine
**Description and purpose**: Advanced audio signal processing pipeline that enhances speech recognition accuracy in noisy classroom environments. Applies noise reduction filters, normalization, silence detection, and format-specific optimizations. Includes specialized preprocessing for different audio formats and adaptive enhancement based on recording quality.
**Component type or format**: Python signal processing utility functions
**Location**: `backend/backend/speech_services/utils.py` lines 14-50 (`preprocess_audio()`)

#### AI-Powered Transcript Post-Processing System
**Description and purpose**: Sophisticated natural language processing engine that applies fuzzy matching algorithms, phonetic corrections, and contextual student name resolution to improve speech recognition accuracy. Features a learning system that tracks common recognition errors, applies real-time corrections based on student roster data, and provides multiple transcript alternatives with confidence scoring.
**Component type or format**: Python NLP and fuzzy matching utility functions
**Location**: `backend/backend/speech_services/utils.py` lines 95-280 (`post_process_transcript()`, `smart_transcript_selection()`)

#### Class Record and Google Sheets Management API
**Description and purpose**: Comprehensive class management system that handles Google Sheets integration through user authentication, Excel file import/export, student roster management, and grade tracking. Features automatic sheet creation from templates, permission management, real-time data synchronization, and support for both template-based and import-based workflows.
**Component type or format**: Django REST Framework ViewSet with Google Sheets and Drive API integration
**Location**: `backend/backend/classrecord/views.py`, `backend/backend/classrecord/models.py`

### Data Flow Architecture

#### 1. Voice Input Flow
```
Teacher Speech → Audio Recording → Preprocessing → Speech Recognition → Post-processing → Validation → Confirmation → Excel Update
```

#### 2. Student Name Matching Flow
```
Recognized Name → Fuzzy Matching → Similarity Scoring → Threshold Check → Best Match Selection → Duplicate Handling → Final Selection
```

#### 3. Score Validation Flow
```
Recognized Score → Number Validation → Range Checking → Format Standardization → Excel Cell Update → Success/Failure Feedback
```

### Error Handling and Recovery

#### 1. Speech Recognition Errors
- **No Speech Detected:** Automatic retry with visual feedback
- **Low Confidence:** Present alternatives for manual selection
- **Network Issues:** Fallback to local Android speech recognition
- **Audio Quality:** Preprocessing attempts to improve signal

#### 2. Student Name Ambiguity
- **Multiple Matches:** Present selection dialog with similarity scores
- **No Matches:** Allow manual entry with suggestions
- **Partial Matches:** Fuzzy matching with confidence indicators
- **Typical Errors:** Learning system tracks and corrects common mistakes

#### 3. Score Validation Errors
- **Invalid Numbers:** Real-time validation with error messages
- **Out of Range:** Configurable min/max score limits
- **Format Issues:** Automatic standardization (e.g., "85.5" → "85.5")
- **Duplicate Entries:** Override confirmation with existing score display

### Performance Optimizations

#### 1. Audio Processing
- **Format Detection:** Skip unnecessary preprocessing for compressed formats
- **Buffer Management:** Efficient memory usage for large audio files
- **Parallel Processing:** Background audio analysis while UI remains responsive

#### 2. Speech Recognition
- **Context Loading:** Pre-load student names for improved accuracy
- **Caching:** Store recent recognition results for faster processing
- **Engine Selection:** Automatic fallback between speech engines

#### 3. Data Updates
- **Batch Operations:** Single API calls for multiple updates when possible
- **Error Recovery:** Automatic retry with exponential backoff
- **State Management:** Optimistic updates with rollback capability

### Security and Privacy

#### 1. Audio Data Handling
- **Temporary Storage:** Audio files deleted after processing
- **Secure Transmission:** HTTPS encryption for all API calls
- **Access Control:** Authentication required for all speech services

#### 2. Student Data Protection
- **Local Processing:** Sensitive data processed on-device when possible
- **Minimal Exposure:** Only necessary student names sent to backend
- **Audit Logging:** Track all voice recognition attempts and corrections

### Integration Points

#### 1. Frontend-Backend Communication
- **RESTful APIs:** Standard HTTP methods for all operations
- **Real-time Updates:** WebSocket connections for live feedback
- **Error Handling:** Consistent error response formats

#### 2. External Services
- **Google Cloud Speech-to-Text:** Primary speech recognition engine
- **Android Speech Recognizer:** Fallback for offline operation
- **Excel/Google Sheets:** Target data storage systems

#### 3. Data Persistence
- **Local Storage:** Temporary audio and recognition data
- **Cloud Storage:** Permanent score records and usage analytics
- **Cache Management:** Intelligent caching for frequently accessed data

### Testing and Quality Assurance

#### 1. Unit Testing
- **Audio Processing:** Test preprocessing with various audio formats
- **Fuzzy Matching:** Validate student name matching algorithms
- **Error Handling:** Test all error scenarios and recovery paths

#### 2. Integration Testing
- **End-to-End Flow:** Complete voice recording to Excel update
- **API Testing:** Validate all speech service endpoints
- **Performance Testing:** Measure response times and accuracy rates

#### 3. User Acceptance Testing
- **Classroom Scenarios:** Real-world testing in educational environments
- **Noise Testing:** Validate performance with background noise
- **Accessibility Testing:** Ensure usability for diverse user needs

### Future Enhancements

#### 1. Advanced Features
- **Multi-language Support:** Expand beyond English
- **Accent Adaptation:** Learn and adapt to teacher speech patterns
- **Context Awareness:** Understand subject-specific terminology

#### 2. Performance Improvements
- **Offline Processing:** Full offline speech recognition capability
- **Real-time Streaming:** Continuous speech recognition without pauses
- **Adaptive Learning:** Improve accuracy based on usage patterns

#### 3. User Experience
- **Voice Commands:** Support for complex voice commands
- **Gesture Control:** Combine voice with gesture recognition
- **Accessibility:** Enhanced support for users with disabilities

This comprehensive implementation provides a robust, user-friendly system for real-time speech-to-text score recording, with advanced error handling, learning capabilities, and seamless integration with existing educational data management systems. 