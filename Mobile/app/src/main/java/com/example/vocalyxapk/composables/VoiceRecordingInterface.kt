package com.example.vocalyxapk.composables

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import com.example.vocalyxapk.api.WhisperApiClient
import com.example.vocalyxapk.viewmodel.ExcelViewModel
import com.example.vocalyxapk.models.*
import com.example.vocalyxapk.utils.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.util.*

@Composable
fun VoiceRecordingInterface(
    excelViewModel: ExcelViewModel,
    columnName: String,
    onDismiss: () -> Unit,
    onSaveCompleted: (Int) -> Unit = {}
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var recordingState by remember { mutableStateOf(RecordingState.REQUESTING_PERMISSION) }
    var recognizedSpeech by remember { mutableStateOf<RecognizedSpeech?>(null) }
    var voiceEntries by remember { mutableStateOf<List<VoiceEntry>>(emptyList()) }
    var currentDuplicateMatches by remember { mutableStateOf<List<StudentMatch>>(emptyList()) }
    var currentOverrideEntry by remember { mutableStateOf<VoiceEntry?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var permissionGranted by remember { mutableStateOf(false) }
    var sessionComplete by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }

    // Speech Engine Toggle
    var selectedEngine by remember { mutableStateOf(SpeechEngine.ANDROID_NATIVE) }

    // TTS Engine
    var ttsEngine by remember { mutableStateOf<TextToSpeech?>(null) }

    // Audio recording variables (for Google Cloud)
    var audioRecord by remember { mutableStateOf<AudioRecord?>(null) }
    var isRecording by remember { mutableStateOf(false) }

    // Android SpeechRecognizer (for native)
    var speechRecognizer by remember { mutableStateOf<SpeechRecognizer?>(null) }

    // WhisperApiClient (for Google Cloud)
    val whisperClient = remember { WhisperApiClient(context) }

    // Get student data from ExcelViewModel
    val studentData = remember {
        val sheetData = excelViewModel.getSelectedSheetDataAsMap()
        val headers = sheetData["headers"] as? List<String> ?: emptyList()
        val data = sheetData["data"] as? List<Map<String, String>> ?: emptyList()

        // Find name columns
        val firstNameCol = headers.find { it.contains("first", ignoreCase = true) && it.contains("name", ignoreCase = true) }
        val lastNameCol = headers.find { it.contains("last", ignoreCase = true) && it.contains("name", ignoreCase = true) }
        val fullNameCol = headers.find { it.contains("name", ignoreCase = true) && !it.contains("first", ignoreCase = true) && !it.contains("last", ignoreCase = true) }

        data.mapNotNull { row ->
            val firstName = row[firstNameCol]?.trim() ?: ""
            val lastName = row[lastNameCol]?.trim() ?: ""
            val fullName = row[fullNameCol]?.trim() ?: "${firstName} ${lastName}".trim()

            if (fullName.isNotBlank()) {
                StudentData(
                    firstName = firstName,
                    lastName = lastName,
                    fullName = fullName,
                    rowData = row
                )
            } else {
                null
            }
        }
    }

    // Animation states
    val infiniteTransition = rememberInfiniteTransition(label = "voice_animation")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.3f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_scale"
    )

    // Permission launcher
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        permissionGranted = isGranted
        recordingState = if (isGranted) {
            RecordingState.READY_TO_RECORD
        } else {
            errorMessage = "Microphone permission is required for voice recording"
            RecordingState.REQUESTING_PERMISSION
        }
    }

    // Check if student already has a score in the column
    val checkExistingScore = remember(columnName) {
        { studentRowData: Map<String, String> ->
            val existingScore = studentRowData[columnName]?.trim()
            Log.d("VoiceRecording", "Checking existing score for column '$columnName': $existingScore")
            when {
                existingScore.isNullOrBlank() -> null
                else -> existingScore
            }
        }
    }

    // Process recognized speech and handle student matching - Create stable reference
    val processRecognizedSpeech = remember {
        { transcription: String ->
            // Check if user said "done" to end the session
            when {
                transcription.lowercase().contains("done") || transcription.lowercase().contains("finish") -> {
                    Log.d("VoiceRecording", "User said 'done' or 'finish', ending session with ${voiceEntries.size} entries")
                    recordingState = RecordingState.SESSION_SUMMARY
                }
                else -> {
                    // Parse the transcription for name and score
                    val parseResult = parseTranscription(transcription)

                    when {
                        parseResult.recognizedName == null || parseResult.score == null -> {
                            errorMessage = "Could not understand name and score. Please try again."
                            recordingState = RecordingState.READY_TO_RECORD
                        }
                        else -> {
                            // Find matching students
                            val matches = findStudentMatches(parseResult.recognizedName, studentData)

                            when {
                                matches.isEmpty() -> {
                                    errorMessage = "No matching student found for '${parseResult.recognizedName}'. Please try again."
                                    recordingState = RecordingState.READY_TO_RECORD
                                }
                                else -> {
                                    val speech = RecognizedSpeech(
                                        fullText = transcription,
                                        recognizedName = parseResult.recognizedName,
                                        score = parseResult.score,
                                        studentMatches = matches
                                    )

                                    recognizedSpeech = speech

                                    when {
                                        matches.size == 1 -> {
                                            // Single match - check for existing score
                                            val match = matches[0]
                                            val existingScore = checkExistingScore(match.rowData)

                                            Log.d("VoiceRecording", "Single match found: ${match.fullName}, checking for existing score in column '$columnName'")
                                            Log.d("VoiceRecording", "Student row data keys: ${match.rowData.keys}")
                                            Log.d("VoiceRecording", "Existing score result: $existingScore")

                                            when {
                                                existingScore != null -> {
                                                    // Student already has a score - show override confirmation
                                                    Log.d("VoiceRecording", "Student ${match.fullName} has existing score '$existingScore' in column '$columnName', showing override dialog")
                                                    val entry = VoiceEntry(
                                                        studentName = parseResult.recognizedName,
                                                        score = parseResult.score,
                                                        fullStudentName = match.fullName,
                                                        originalRecognition = transcription,
                                                        hasExistingScore = true,
                                                        existingScore = existingScore
                                                    )
                                                    currentOverrideEntry = entry
                                                    recordingState = RecordingState.SHOWING_OVERRIDE_CONFIRMATION
                                                }
                                                else -> {
                                                    // No existing score - add entry directly
                                                    Log.d("VoiceRecording", "Student ${match.fullName} has no existing score in column '$columnName', adding entry directly")
                                                    val entry = VoiceEntry(
                                                        studentName = parseResult.recognizedName,
                                                        score = parseResult.score,
                                                        fullStudentName = match.fullName,
                                                        originalRecognition = transcription,
                                                        confirmed = true
                                                    )
                                                    Log.d("VoiceRecording", "Adding entry directly: ${entry.fullStudentName} - ${entry.score} - Confirmed: ${entry.confirmed}")
                                                    voiceEntries = voiceEntries + entry
                                                    recordingState = RecordingState.SPEECH_RECOGNIZED

                                                    // Auto-continue after showing success message
                                                    coroutineScope.launch {
                                                        delay(1500)
                                                        recordingState = RecordingState.READY_TO_RECORD
                                                    }
                                                }
                                            }
                                        }
                                        else -> {
                                            // Multiple matches - show selection dialog
                                            currentDuplicateMatches = matches
                                            recordingState = RecordingState.SHOWING_DUPLICATE_SELECTION
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Unit
        }
    }

    // Handle duplicate selection - Create stable reference
    val handleDuplicateSelection = remember {
        { selectedMatch: StudentMatch ->
            val speech = recognizedSpeech
            when {
                speech == null -> Unit
                else -> {
                    val existingScore = checkExistingScore(selectedMatch.rowData)

                    Log.d("VoiceRecording", "Duplicate selection: ${selectedMatch.fullName}, checking for existing score in column '$columnName'")
                    Log.d("VoiceRecording", "Student row data keys: ${selectedMatch.rowData.keys}")
                    Log.d("VoiceRecording", "Existing score result: $existingScore")

                    when {
                        existingScore != null -> {
                            // Student already has a score - show override confirmation
                            Log.d("VoiceRecording", "Student ${selectedMatch.fullName} has existing score '$existingScore' in column '$columnName', showing override dialog")
                            val entry = VoiceEntry(
                                studentName = speech.recognizedName ?: "",
                                score = speech.score ?: "",
                                fullStudentName = selectedMatch.fullName,
                                originalRecognition = speech.fullText,
                                hasExistingScore = true,
                                existingScore = existingScore
                            )
                            currentOverrideEntry = entry
                            recordingState = RecordingState.SHOWING_OVERRIDE_CONFIRMATION
                        }
                        else -> {
                            // No existing score - add entry directly
                            Log.d("VoiceRecording", "Student ${selectedMatch.fullName} has no existing score in column '$columnName', adding entry directly")
                            val entry = VoiceEntry(
                                studentName = speech.recognizedName ?: "",
                                score = speech.score ?: "",
                                fullStudentName = selectedMatch.fullName,
                                originalRecognition = speech.fullText,
                                confirmed = true
                            )
                            Log.d("VoiceRecording", "Adding entry from duplicate selection: ${entry.fullStudentName} - ${entry.score} - Confirmed: ${entry.confirmed}")
                            voiceEntries = voiceEntries + entry
                            recordingState = RecordingState.SPEECH_RECOGNIZED

                            // Auto-continue after showing success message
                            coroutineScope.launch {
                                delay(1500)
                                recordingState = RecordingState.READY_TO_RECORD
                            }
                        }
                    }

                    currentDuplicateMatches = emptyList()
                }
            }
            Unit
        }
    }

    // Handle override confirmation - Create stable reference
    val handleOverrideConfirmation = remember {
        { override: Boolean ->
            val entry = currentOverrideEntry
            when {
                entry == null -> Unit
                else -> {
                    when {
                        override -> {
                            // User chose to override - existing logic
                            val confirmedEntry = entry.copy(confirmed = true)
                            Log.d("VoiceRecording", "Adding entry from override confirmation: ${confirmedEntry.fullStudentName} - ${confirmedEntry.score} - Confirmed: ${confirmedEntry.confirmed}")
                            voiceEntries = voiceEntries + confirmedEntry

                            // Save to backend immediately
                            Log.d("VoiceRecording", "Saving override entry to backend: ${confirmedEntry.fullStudentName} -> ${confirmedEntry.score} in column: $columnName")
                            excelViewModel.updateStudentValue(
                                studentName = confirmedEntry.fullStudentName,
                                columnName = columnName,
                                value = confirmedEntry.score
                            ) { success ->
                                coroutineScope.launch {
                                    when {
                                        success -> {
                                            Log.d("VoiceRecording", "✅ Override entry saved successfully to backend!")
                                        }
                                        else -> {
                                            Log.e("VoiceRecording", "❌ Failed to save override entry to backend")
                                        }
                                    }
                                }
                            }

                            // Show success screen for override
                            recordingState = RecordingState.SPEECH_RECOGNIZED

                            // Auto-continue after showing success message
                            coroutineScope.launch {
                                delay(1500)
                                currentOverrideEntry = null  // ✅ Clear after delay
                                recordingState = RecordingState.READY_TO_RECORD
                            }
                        }
                        else -> {
                            // User chose to keep current score - show "Score Kept" screen
                            Log.d("VoiceRecording", "🔍 DEBUG: User clicked Keep Current button")
                            Log.d("VoiceRecording", "🔍 DEBUG: About to set state to SCORE_KEPT")

                            // Change to a new state that shows the "Score Kept" screen
                            recordingState = RecordingState.SCORE_KEPT

                            Log.d("VoiceRecording", "🔍 DEBUG: State set to: $recordingState")

                            // Auto-continue after showing "Score Kept" message (maybe longer delay)
                            coroutineScope.launch {
                                delay(2000) // Give user more time to read the "Score Kept" message
                                currentOverrideEntry = null  // ✅ Clear after delay
                                recordingState = RecordingState.READY_TO_RECORD
                            }
                        }
                    }
                }
            }
            Unit
        }
    }

    // Save all entries to Excel - Create stable reference
    val saveAllEntries = remember {
        {
            coroutineScope.launch {
                try {
                    isSaving = true
                    val totalEntries = voiceEntries.filter { it.confirmed }

                    Log.d("VoiceRecording", "=== SAVE DEBUG ===")
                    Log.d("VoiceRecording", "Total voice entries: ${voiceEntries.size}")
                    Log.d("VoiceRecording", "Confirmed entries: ${totalEntries.size}")
                    voiceEntries.forEachIndexed { index, entry ->
                        Log.d("VoiceRecording", "Entry $index: ${entry.fullStudentName} - ${entry.score} - Confirmed: ${entry.confirmed}")
                    }

                    when {
                        totalEntries.isEmpty() -> {
                            Log.w("VoiceRecording", "No confirmed entries to save!")
                            isSaving = false
                            sessionComplete = true
                            // Still call onSaveCompleted with 0 to show the message
                            onSaveCompleted(0)
                        }
                        else -> {
                            Log.d("VoiceRecording", "Starting to save ${totalEntries.size} entries")

                            // Use a counter that's properly synchronized
                            var successCount = 0
                            var completedCount = 0

                            totalEntries.forEach { entry ->
                                try {
                                    Log.d("VoiceRecording", "Attempting to save: ${entry.fullStudentName} -> ${entry.score} in column: $columnName")

                                    excelViewModel.updateStudentValue(
                                        studentName = entry.fullStudentName,
                                        columnName = columnName,
                                        value = entry.score
                                    ) { success ->
                                        // This callback might be called from different threads
                                        coroutineScope.launch {
                                            completedCount++
                                            when {
                                                success -> {
                                                    successCount++
                                                    Log.d("VoiceRecording", "Successfully saved: ${entry.fullStudentName} -> ${entry.score} in column: $columnName")
                                                }
                                                else -> {
                                                    Log.e("VoiceRecording", "Failed to save: ${entry.fullStudentName} -> ${entry.score} in column: $columnName")
                                                }
                                            }

                                            // Check if all entries have been processed
                                            when {
                                                completedCount >= totalEntries.size -> {
                                                    Log.d("VoiceRecording", "All entries processed. Success: $successCount, Total: ${totalEntries.size}")
                                                    withContext(Dispatchers.Main) {
                                                        isSaving = false
                                                        sessionComplete = true

                                                        // Notify parent screen that saving is complete
                                                        onSaveCompleted(successCount)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } catch (e: Exception) {
                                    Log.e("VoiceRecording", "Exception saving entry: ${entry.fullStudentName} -> ${entry.score} in column: $columnName", e)
                                    coroutineScope.launch {
                                        completedCount++
                                        when {
                                            completedCount >= totalEntries.size -> {
                                                withContext(Dispatchers.Main) {
                                                    isSaving = false
                                                    sessionComplete = true
                                                    onSaveCompleted(successCount)
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Add a timeout mechanism in case callbacks don't fire
                            launch {
                                delay(10000) // 10 second timeout
                                when {
                                    !sessionComplete && isSaving -> {
                                        Log.w("VoiceRecording", "Timeout reached, forcing completion")
                                        withContext(Dispatchers.Main) {
                                            isSaving = false
                                            sessionComplete = true
                                            onSaveCompleted(successCount)
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e("VoiceRecording", "Error in saveAllEntries", e)
                    isSaving = false
                    sessionComplete = true // Complete even on error to prevent hanging
                    onSaveCompleted(0)
                }
            }
            Unit // Explicitly return Unit to fix type mismatch
        }
    }

    // Functions for speech recognition
    fun startAndroidSpeechRecognition() {
        try {
            recordingState = RecordingState.LISTENING
            errorMessage = null

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false) // Disable partial results
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                // Shorter timeouts to prevent long listening
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L) // 1.5 seconds
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1000L) // 1 second
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 2000L) // Minimum 2 seconds
                putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
            }

            val recognitionListener = object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {
                    Log.d("VoiceRecording", "Android STT: Ready for speech")
                }

                override fun onBeginningOfSpeech() {
                    Log.d("VoiceRecording", "Android STT: Beginning of speech")
                }

                override fun onRmsChanged(rmsdB: Float) {}

                override fun onBufferReceived(buffer: ByteArray?) {}

                override fun onEndOfSpeech() {
                    Log.d("VoiceRecording", "Android STT: End of speech")
                    recordingState = RecordingState.PROCESSING
                }

                override fun onError(error: Int) {
                    val errorMsg = when (error) {
                        SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                        SpeechRecognizer.ERROR_CLIENT -> "Client side error"
                        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
                        SpeechRecognizer.ERROR_NETWORK -> "Network error"
                        SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                        SpeechRecognizer.ERROR_NO_MATCH -> "No speech match found - try speaking more clearly"
                        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognition service busy"
                        SpeechRecognizer.ERROR_SERVER -> "Server error"
                        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Speech timeout - try speaking faster"
                        else -> "Unknown error ($error)"
                    }
                    Log.e("VoiceRecording", "Android STT Error: $errorMsg")

                    coroutineScope.launch {
                        errorMessage = errorMsg
                        recordingState = RecordingState.READY_TO_RECORD
                    }
                }

                override fun onResults(results: Bundle?) {
                    val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    when {
                        !matches.isNullOrEmpty() -> {
                            val transcription = matches[0]
                            Log.d("VoiceRecording", "Android STT Result: $transcription")
                            Log.d("VoiceRecording", "All results: $matches") // Log all alternatives

                            coroutineScope.launch {
                                processRecognizedSpeech(transcription)
                            }
                        }
                        else -> {
                            coroutineScope.launch {
                                errorMessage = "No speech detected - please try again"
                                recordingState = RecordingState.READY_TO_RECORD
                            }
                        }
                    }
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    // Log partial results for debugging
                    val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    when {
                        !matches.isNullOrEmpty() -> {
                            Log.d("VoiceRecording", "Partial result: ${matches[0]}")
                        }
                    }
                }

                override fun onEvent(eventType: Int, params: Bundle?) {}
            }

            speechRecognizer?.setRecognitionListener(recognitionListener)
            speechRecognizer?.startListening(intent)

            // Add a safety timeout to stop listening after 5 seconds
            coroutineScope.launch {
                delay(5000) // 5 seconds maximum
                when {
                    recordingState == RecordingState.LISTENING -> {
                        Log.d("VoiceRecording", "Forcing stop listening due to timeout")
                        speechRecognizer?.stopListening()
                    }
                }
            }

        } catch (e: Exception) {
            Log.e("VoiceRecording", "Android STT Error", e)
            coroutineScope.launch {
                errorMessage = "Speech recognition failed: ${e.message}"
                recordingState = RecordingState.READY_TO_RECORD
            }
        }
    }

    fun startGoogleCloudRecording() {
        coroutineScope.launch {
            try {
                recordingState = RecordingState.LISTENING
                isRecording = true
                errorMessage = null

                // Clean up any existing AudioRecord first
                audioRecord?.let { record ->
                    try {
                        when {
                            record.recordingState == AudioRecord.RECORDSTATE_RECORDING -> {
                                record.stop()
                            }
                        }
                        when {
                            record.state == AudioRecord.STATE_INITIALIZED -> {
                                record.release()
                            }

                            else -> {}
                        }
                    } catch (e: Exception) {
                        Log.e("VoiceRecording", "Error cleaning up previous AudioRecord", e)
                    }
                }

                // Audio recording setup
                val sampleRate = 16000
                val channelConfig = AudioFormat.CHANNEL_IN_MONO
                val audioFormat = AudioFormat.ENCODING_PCM_16BIT
                val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)

                audioRecord = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    sampleRate,
                    channelConfig,
                    audioFormat,
                    minBufferSize
                )

                // Check if AudioRecord was initialized properly
                when {
                    audioRecord?.state != AudioRecord.STATE_INITIALIZED -> {
                        Log.e("VoiceRecording", "AudioRecord failed to initialize")
                        audioRecord?.release()
                        audioRecord = null
                        throw IllegalStateException("AudioRecord failed to initialize")
                    }
                }

                audioRecord?.startRecording()

                // Check if recording actually started
                when {
                    audioRecord?.recordingState != AudioRecord.RECORDSTATE_RECORDING -> {
                        Log.e("VoiceRecording", "AudioRecord failed to start recording")
                        audioRecord?.release()
                        audioRecord = null
                        throw IllegalStateException("AudioRecord failed to start recording")
                    }
                }

                // Record for 3 seconds
                val recordingDuration = 3000L
                val buffer = ShortArray(minBufferSize)
                val outputStream = ByteArrayOutputStream()

                withContext(Dispatchers.IO) {
                    val startTime = System.currentTimeMillis()
                    while (isRecording && (System.currentTimeMillis() - startTime) < recordingDuration) {
                        val readResult = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                        when {
                            readResult > 0 -> {
                                val byteBuffer = ByteArray(readResult * 2)
                                for (i in 0 until readResult) {
                                    val sample = buffer[i]
                                    byteBuffer[i * 2] = (sample.toInt() and 0xFF).toByte()
                                    byteBuffer[i * 2 + 1] = ((sample.toInt() shr 8) and 0xFF).toByte()
                                }
                                outputStream.write(byteBuffer)
                            }
                        }
                    }
                }

                // Safely stop and release AudioRecord
                try {
                    audioRecord?.let { record ->
                        when {
                            record.recordingState == AudioRecord.RECORDSTATE_RECORDING -> {
                                record.stop()
                            }
                        }
                        when {
                            record.state == AudioRecord.STATE_INITIALIZED -> {
                                record.release()
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e("VoiceRecording", "Error stopping AudioRecord", e)
                } finally {
                    audioRecord = null
                    isRecording = false
                }

                recordingState = RecordingState.PROCESSING

                val audioBytes = outputStream.toByteArray()
                Log.d("VoiceRecording", "Google Cloud: Recorded ${audioBytes.size} bytes")

                val studentNames = studentData.map { "${it.firstName} ${it.lastName}".trim() }
                val result = whisperClient.transcribeAudioBytes(audioBytes, "en-US", studentNames)

                result.fold(
                    onSuccess = { transcription ->
                        Log.d("VoiceRecording", "Google Cloud Result: $transcription")
                        processRecognizedSpeech(transcription)
                    },
                    onFailure = { error ->
                        Log.e("VoiceRecording", "Google Cloud failed", error)
                        errorMessage = "Speech recognition failed: ${error.message}"
                        recordingState = RecordingState.READY_TO_RECORD
                    }
                )

            } catch (e: Exception) {
                Log.e("VoiceRecording", "Google Cloud recording failed", e)
                errorMessage = "Recording failed: ${e.message}"
                recordingState = RecordingState.READY_TO_RECORD

                // Clean up on error
                try {
                    audioRecord?.let { record ->
                        when {
                            record.recordingState == AudioRecord.RECORDSTATE_RECORDING -> {
                                record.stop()
                            }
                        }
                        when {
                            record.state == AudioRecord.STATE_INITIALIZED -> {
                                record.release()
                            }
                        }
                    }
                } catch (cleanupError: Exception) {
                    Log.e("VoiceRecording", "Error during cleanup", cleanupError)
                } finally {
                    audioRecord = null
                    isRecording = false
                }
            }
        }
    }

    fun startRecording() {
        errorMessage = null
        when (selectedEngine) {
            SpeechEngine.ANDROID_NATIVE -> startAndroidSpeechRecognition()
            SpeechEngine.GOOGLE_CLOUD -> startGoogleCloudRecording()
        }
    }

    // Initialize TTS
    LaunchedEffect(Unit) {
        ttsEngine = TextToSpeech(context) { status ->
            when {
                status == TextToSpeech.SUCCESS -> {
                    ttsEngine?.language = Locale.US
                    Log.d("VoiceRecording", "TTS initialized successfully")
                }
                else -> {
                    Log.e("VoiceRecording", "TTS initialization failed")
                }
            }
        }
    }

    // Initialize Android SpeechRecognizer
    LaunchedEffect(Unit) {
        when {
            SpeechRecognizer.isRecognitionAvailable(context) -> {
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
                Log.d("VoiceRecording", "Android SpeechRecognizer initialized")
            }
            else -> {
                Log.w("VoiceRecording", "Android SpeechRecognizer not available")
            }
        }
    }

    // Check permission on launch
    LaunchedEffect(Unit) {
        when (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)) {
            PackageManager.PERMISSION_GRANTED -> {
                permissionGranted = true
                recordingState = RecordingState.READY_TO_RECORD
            }
            else -> {
                permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            }
        }
    }

    // Add debugging for state changes
    LaunchedEffect(voiceEntries) {
        Log.d("VoiceRecording", "=== VOICE ENTRIES STATE CHANGED ===")
        Log.d("VoiceRecording", "Total entries: ${voiceEntries.size}")
        Log.d("VoiceRecording", "Confirmed entries: ${voiceEntries.filter { it.confirmed }.size}")
        voiceEntries.forEachIndexed { index, entry ->
            Log.d("VoiceRecording", "Entry $index: ID=${entry.id}, Student=${entry.fullStudentName}, Score=${entry.score}, Confirmed=${entry.confirmed}")
        }
    }

    // Cleanup
    DisposableEffect(Unit) {
        onDispose {
            try {
                // Safely stop AudioRecord if it exists and is recording
                audioRecord?.let { record ->
                    when {
                        record.recordingState == AudioRecord.RECORDSTATE_RECORDING -> {
                            record.stop()
                            Log.d("VoiceRecording", "AudioRecord stopped")
                        }
                    }
                    when {
                        record.state == AudioRecord.STATE_INITIALIZED -> {
                            record.release()
                            Log.d("VoiceRecording", "AudioRecord released")
                        }

                        else -> {}
                    }
                }
            } catch (e: Exception) {
                Log.e("VoiceRecording", "Error disposing AudioRecord", e)
            }

            try {
                speechRecognizer?.destroy()
            } catch (e: Exception) {
                Log.e("VoiceRecording", "Error destroying SpeechRecognizer", e)
            }

            try {
                ttsEngine?.stop()
                ttsEngine?.shutdown()
            } catch (e: Exception) {
                Log.e("VoiceRecording", "Error shutting down TTS", e)
            }

            // Clean up recording state
            isRecording = false
        }
    }

    // Log the column name and check if it exists in headers
    LaunchedEffect(columnName) {
        val headers = excelViewModel.getColumnNames()
        Log.d("VoiceRecordingInterface", "=== VOICE RECORDING INTERFACE STARTED ===")
        Log.d("VoiceRecordingInterface", "Target column: '$columnName'")
        Log.d("VoiceRecordingInterface", "Available headers: $headers")
        Log.d("VoiceRecordingInterface", "Column exists in headers: ${headers.contains(columnName)}")
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.8f)),
            contentAlignment = Alignment.Center
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth(0.95f)
                    .fillMaxHeight(0.9f),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(16.dp),
                shape = RoundedCornerShape(24.dp)
            ) {
                when (recordingState) {
                    RecordingState.REQUESTING_PERMISSION -> {
                        PermissionRequestScreen()
                    }

                    RecordingState.READY_TO_RECORD -> {
                        MainRecordingScreen(
                            selectedEngine = selectedEngine,
                            onEngineSelected = { selectedEngine = it },
                            onStartRecording = { startRecording() },
                            voiceEntries = voiceEntries.filter { it.confirmed },
                            columnName = columnName,
                            onDismiss = onDismiss,
                            onViewSummary = { recordingState = RecordingState.SESSION_SUMMARY },
                            errorMessage = errorMessage,
                            onClearError = { errorMessage = null }
                        )
                    }

                    RecordingState.LISTENING -> {
                        ListeningScreen(
                            selectedEngine = selectedEngine,
                            pulseScale = pulseScale
                        )
                    }

                    RecordingState.PROCESSING -> {
                        ProcessingScreen(selectedEngine = selectedEngine)
                    }

                    RecordingState.SPEECH_RECOGNIZED -> {
                        SpeechRecognizedScreen(
                            recognizedSpeech = recognizedSpeech,
                            onContinue = { recordingState = RecordingState.READY_TO_RECORD }
                        )
                    }

                    RecordingState.SHOWING_DUPLICATE_SELECTION -> {
                        DuplicateSelectionScreen(
                            matches = currentDuplicateMatches,
                            recognizedName = recognizedSpeech?.recognizedName ?: "",
                            onStudentSelected = handleDuplicateSelection,
                            onCancel = {
                                currentDuplicateMatches = emptyList()
                                recordingState = RecordingState.READY_TO_RECORD
                            }
                        )
                    }

                    RecordingState.SHOWING_OVERRIDE_CONFIRMATION -> {
                        OverrideConfirmationScreen(
                            entry = currentOverrideEntry,
                            onConfirm = handleOverrideConfirmation
                        )
                    }

                    RecordingState.SCORE_KEPT -> {
                        ScoreKeptScreen(
                            entry = currentOverrideEntry,
                            onContinue = {
                                recordingState = RecordingState.READY_TO_RECORD
                            }
                        )
                    }

                    RecordingState.SESSION_SUMMARY -> {
                        Log.d("VoiceRecording", "=== SESSION SUMMARY ===")
                        Log.d("VoiceRecording", "Total entries: ${voiceEntries.size}")
                        Log.d("VoiceRecording", "Confirmed entries: ${voiceEntries.filter { it.confirmed }.size}")
                        voiceEntries.forEachIndexed { index, entry ->
                            Log.d("VoiceRecording", "Entry $index: ${entry.fullStudentName} - ${entry.score} - Confirmed: ${entry.confirmed}")
                        }

                        SessionSummaryScreen(
                            voiceEntries = voiceEntries.filter { it.confirmed },
                            columnName = columnName,
                            onContinueRecording = { recordingState = RecordingState.READY_TO_RECORD },
                            onFinalValidation = {
                                Log.d("VoiceRecording", "Transitioning to FINAL_VALIDATION with ${voiceEntries.filter { it.confirmed }.size} confirmed entries")
                                recordingState = RecordingState.FINAL_VALIDATION
                            },
                            onRemoveEntry = { entryId ->
                                voiceEntries = voiceEntries.filter { it.id != entryId }
                            }
                        )
                    }

                    RecordingState.FINAL_VALIDATION -> {
                        Log.d("VoiceRecording", "=== FINAL VALIDATION ===")
                        Log.d("VoiceRecording", "Total entries: ${voiceEntries.size}")
                        Log.d("VoiceRecording", "Confirmed entries: ${voiceEntries.filter { it.confirmed }.size}")

                        FinalValidationScreen(
                            voiceEntries = voiceEntries.filter { it.confirmed },
                            columnName = columnName,
                            onSaveAll = {
                                Log.d("VoiceRecording", "=== SAVE ALL BUTTON CLICKED ===")
                                Log.d("VoiceRecording", "Current voiceEntries size: ${voiceEntries.size}")
                                Log.d("VoiceRecording", "Current confirmed entries: ${voiceEntries.filter { it.confirmed }.size}")
                                saveAllEntries()
                            },
                            onCancel = { recordingState = RecordingState.SESSION_SUMMARY },
                            sessionComplete = sessionComplete,
                            isSaving = isSaving,
                            onDismiss = onDismiss,
                            excelViewModel = excelViewModel
                        )
                    }
                }
            }
        }
    }
}