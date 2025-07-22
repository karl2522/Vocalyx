# Phonetic Voice Recognition Implementation Guide

## Quick Setup

### 1. Add Core Files
Copy these files to your Android project:
- `PhoneticMatcher.kt` - Core phonetic algorithms
- `VoiceGradingHelper.kt` - Voice processing logic
- `EnhancedVoiceRecognition.kt` - Speech recognition integration

### 2. Basic Implementation

```kotlin
// Initialize with student names
val studentNames = listOf("Sarah Johnson", "Michael Chen", "Emma Rodriguez")
val voiceHelper = VoiceGradingHelper()

// Process voice input
val result = voiceHelper.processVoiceInput(recognizedText, studentNames)

// Handle results based on confidence
when {
    result.isConfident -> recordGrade(result.studentName!!, result.extractedGrade!!)
    result.confidence > 0.6 -> showConfirmation(result)
    else -> showAlternatives(recognizedText, studentNames)
}
```

### 3. Core Methods

**Find best name match:**
```kotlin
val (bestMatch, confidence) = PhoneticMatcher.findBestMatch("Sara", studentNames)
```

**Get similarity score:**
```kotlin
val score = PhoneticMatcher.getPhoneticSimilarity("Mikael", "Michael") // Returns 0.8
```

**Get multiple matches:**
```kotlin
val matches = PhoneticMatcher.getAllMatches("Jon", studentNames, threshold = 0.4)
```

### 4. Integration with Speech Recognition

```kotlin
override fun onResults(results: Bundle?) {
    val recognizedText = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.get(0)
    val result = voiceHelper.processVoiceInput(recognizedText, studentNames)
    
    if (result.isConfident) {
        // Auto-record grade
        recordGrade(result.studentName!!, result.extractedGrade ?: "A")
    } else {
        // Show confirmation dialog
        showConfirmationDialog(result)
    }
}
```

### 5. Configuration

**Adjust confidence thresholds:**
```kotlin
val highConfidence = 0.8  // Auto-accept
val mediumConfidence = 0.6  // Ask confirmation  
val lowConfidence = 0.4  // Show alternatives
```

**Customize phonetic weights:**
```kotlin
// In PhoneticMatcher.getPhoneticSimilarity()
return (soundexScore * 0.3 + metaphoneScore * 0.5 + levenshteinScore * 0.2)
```


### 7. Error Handling

```kotlin
when (result.confidence) {
    in 0.8..1.0 -> autoProcess(result)
    in 0.6..0.8 -> askConfirmation(result)
    in 0.4..0.6 -> showAlternatives(result)
    else -> askRepeat()
}
```

## Key Benefits

- **Handles mispronunciations**: "Kristine" matches "Christine"
- **Accent tolerance**: Various pronunciations work
- **Partial names**: "Mike" matches "Michael"
- **Confidence scoring**: System knows uncertainty level
- **Grade extraction**: Automatically finds grades in speech

## Usage Notes

1. **Student name preparation**: Load student names at activity start
2. **Threshold tuning**: Adjust confidence thresholds based on your needs
3. **Fallback UI**: Always provide manual selection for low-confidence matches
4. **Testing**: Test with various pronunciations and accents
5. **Performance**: Phonetic matching is fast but cache results for large classes