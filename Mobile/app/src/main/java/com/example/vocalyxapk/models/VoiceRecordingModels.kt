package com.example.vocalyxapk.models

import java.util.UUID

enum class RecordingState {
    REQUESTING_PERMISSION,
    READY_TO_RECORD,
    LISTENING,
    BATCH_LISTENING,
    PROCESSING,
    SPEECH_RECOGNIZED,
    SHOWING_DUPLICATE_SELECTION,
    SHOWING_OVERRIDE_CONFIRMATION,
    SCORE_KEPT,
    SESSION_SUMMARY,
    FINAL_VALIDATION,
    BATCH_VALIDATION
}

enum class SpeechEngine {
    GOOGLE_CLOUD,    // Your backend with Google Cloud Speech-to-Text
    ANDROID_NATIVE   // Android's built-in SpeechRecognizer
}

data class RecognizedSpeech(
    val fullText: String,
    val recognizedName: String?,
    val score: String?,
    val studentMatches: List<StudentMatch> = emptyList()
)

data class StudentMatch(
    val fullName: String,
    val firstName: String,
    val lastName: String,
    val similarity: Double,
    val rowData: Map<String, String>
)

data class VoiceEntry(
    val id: String = UUID.randomUUID().toString(),
    val studentName: String,
    val score: String,
    val fullStudentName: String,
    val originalRecognition: String,
    val hasExistingScore: Boolean = false,
    val existingScore: String? = null,
    val confirmed: Boolean = false
)

data class StudentData(
    val firstName: String,
    val lastName: String,
    val fullName: String,
    val rowData: Map<String, String>
)

data class ParseResult(
    val recognizedName: String?, 
    val score: String?
) 