package com.example.vocalyxapk.composables

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import androidx.core.content.ContextCompat
import com.example.vocalyxapk.api.WhisperApiClient
import com.example.vocalyxapk.models.*
import com.example.vocalyxapk.viewmodel.ExcelViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.util.*

class BatchRecordingManager(
    private val context: Context,
    private val coroutineScope: CoroutineScope,
    private val excelViewModel: ExcelViewModel
) {

    // Callbacks
    var onStateChanged: ((RecordingState) -> Unit)? = null
    var onErrorMessage: ((String?) -> Unit)? = null
    var onBatchStateUpdated: ((BatchProcessingState) -> Unit)? = null

    // Speech Recognition
    private var speechRecognizer: SpeechRecognizer? = null
    private var audioRecord: AudioRecord? = null
    private var isRecording = false

    private var timeoutJob: Job? = null
    private var isRestarting = false

    // WhisperAPI
    private val whisperClient = WhisperApiClient(context)

    init {
        // Initialize SpeechRecognizer
        if (SpeechRecognizer.isRecognitionAvailable(context)) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
        }
    }

    fun startBatchAndroidSpeechRecognition() {
        // 🔧 PREVENT MULTIPLE CONCURRENT STARTS
        if (isRestarting) {
            Log.w("BatchRecordingManager", "Already restarting, skipping...")
            return
        }

        isRestarting = true
        onStateChanged?.invoke(RecordingState.BATCH_LISTENING)
        onErrorMessage?.invoke(null)

        // 🔧 CANCEL ANY EXISTING TIMEOUT
        timeoutJob?.cancel()
        timeoutJob = null

        // 🔧 DO CLEANUP IN BACKGROUND COROUTINE - DON'T BLOCK MAIN THREAD!
        coroutineScope.launch(Dispatchers.IO) {
            try {
                // Cleanup old recognizer
                try {
                    speechRecognizer?.stopListening()
                    delay(200)
                    speechRecognizer?.destroy()
                    speechRecognizer = null
                } catch (e: Exception) {
                    Log.w("BatchRecordingManager", "Error destroying previous recognizer: ${e.message}")
                }

                // Wait for cleanup to complete
                delay(1000) // Use delay() instead of Thread.sleep()

                // Switch back to main thread for UI operations
                withContext(Dispatchers.Main) {
                    try {
                        // Create new recognizer on main thread
                        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)

                        if (speechRecognizer == null) {
                            Log.e("BatchRecordingManager", "Failed to create SpeechRecognizer")
                            onErrorMessage?.invoke("Speech recognition unavailable")
                            isRestarting = false
                            return@withContext
                        }

                        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
                            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2000L)
                            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L)
                            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 3000L)
                            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
                        }

                        val recognitionListener = object : RecognitionListener {
                            override fun onReadyForSpeech(params: Bundle?) {
                                Log.d("BatchRecordingManager", "Ready for speech")
                                isRestarting = false // 🔧 RESET FLAG HERE
                            }

                            override fun onBeginningOfSpeech() {
                                Log.d("BatchRecordingManager", "Beginning of speech")
                                timeoutJob?.cancel()
                            }

                            override fun onRmsChanged(rmsdB: Float) {}
                            override fun onBufferReceived(buffer: ByteArray?) {}

                            override fun onEndOfSpeech() {
                                Log.d("BatchRecordingManager", "End of speech")
                                onStateChanged?.invoke(RecordingState.PROCESSING)
                            }

                            override fun onError(error: Int) {
                                val errorMsg = when (error) {
                                    SpeechRecognizer.ERROR_NO_MATCH -> "No speech detected"
                                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Speech timeout"
                                    SpeechRecognizer.ERROR_CLIENT -> "Recognition busy"
                                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognition busy"
                                    else -> "Recognition error"
                                }
                                Log.e("BatchRecordingManager", "STT Error: $errorMsg (code: $error)")

                                isRestarting = false
                                timeoutJob?.cancel()

                                coroutineScope.launch {
                                    delay(2000)
                                    onErrorMessage?.invoke("Error - Try speaking again")
                                    onStateChanged?.invoke(RecordingState.BATCH_LISTENING)
                                }
                            }

                            override fun onResults(results: Bundle?) {
                                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)

                                timeoutJob?.cancel()
                                isRestarting = false

                                when {
                                    !matches.isNullOrEmpty() -> {
                                        val transcription = matches[0]
                                        Log.d("BatchRecordingManager", "STT Result: $transcription")

                                        coroutineScope.launch {
                                            processBatchSpeech(transcription)
                                        }
                                    }
                                    else -> {
                                        coroutineScope.launch {
                                            onErrorMessage?.invoke("No speech detected")
                                            onStateChanged?.invoke(RecordingState.BATCH_LISTENING)
                                        }
                                    }
                                }
                            }

                            override fun onPartialResults(partialResults: Bundle?) {}
                            override fun onEvent(eventType: Int, params: Bundle?) {}
                        }

                        speechRecognizer?.setRecognitionListener(recognitionListener)
                        speechRecognizer?.startListening(intent)

                        // 🔧 TIMEOUT JOB
                        timeoutJob = coroutineScope.launch {
                            delay(6000)
                            if (!isRestarting) {
                                Log.d("BatchRecordingManager", "Recording timeout")
                                try {
                                    speechRecognizer?.stopListening()
                                } catch (e: Exception) {
                                    Log.w("BatchRecordingManager", "Error stopping on timeout: ${e.message}")
                                }
                            }
                        }

                    } catch (e: Exception) {
                        Log.e("BatchRecordingManager", "Setup Error", e)
                        isRestarting = false
                        timeoutJob?.cancel()
                        onErrorMessage?.invoke("Setup failed: ${e.message}")
                        onStateChanged?.invoke(RecordingState.BATCH_LISTENING)
                    }
                }

            } catch (e: Exception) {
                Log.e("BatchRecordingManager", "Background setup error", e)
                // Switch back to main thread to update UI
                withContext(Dispatchers.Main) {
                    isRestarting = false
                    timeoutJob?.cancel()
                    onErrorMessage?.invoke("Setup failed: ${e.message}")
                    onStateChanged?.invoke(RecordingState.BATCH_LISTENING)
                }
            }
        }
    }

    fun startBatchGoogleCloudRecording(studentData: List<StudentData>) {
        // 🔧 Check permission first
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            onErrorMessage?.invoke("Microphone permission required")
            onStateChanged?.invoke(RecordingState.READY_TO_RECORD)
            return
        }

        coroutineScope.launch {
            try {
                onStateChanged?.invoke(RecordingState.BATCH_LISTENING)
                isRecording = true
                onErrorMessage?.invoke(null)

                // Audio recording setup
                val sampleRate = 16000
                val channelConfig = AudioFormat.CHANNEL_IN_MONO
                val audioFormat = AudioFormat.ENCODING_PCM_16BIT
                val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)

                // 🔧 Wrap AudioRecord creation in try-catch for permission handling
                audioRecord = try {
                    AudioRecord(
                        MediaRecorder.AudioSource.MIC,
                        sampleRate,
                        channelConfig,
                        audioFormat,
                        minBufferSize
                    )
                } catch (e: SecurityException) {
                    Log.e("BatchRecordingManager", "Permission denied for audio recording", e)
                    onErrorMessage?.invoke("Microphone permission denied")
                    onStateChanged?.invoke(RecordingState.READY_TO_RECORD)
                    return@launch
                }

                // Check if AudioRecord was initialized properly
                if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                    Log.e("BatchRecordingManager", "AudioRecord failed to initialize")
                    audioRecord?.release()
                    audioRecord = null
                    onErrorMessage?.invoke("Failed to initialize audio recording")
                    onStateChanged?.invoke(RecordingState.READY_TO_RECORD)
                    return@launch
                }

                try {
                    audioRecord?.startRecording()
                } catch (e: SecurityException) {
                    Log.e("BatchRecordingManager", "Permission denied when starting recording", e)
                    onErrorMessage?.invoke("Microphone permission denied")
                    audioRecord?.release()
                    audioRecord = null
                    onStateChanged?.invoke(RecordingState.READY_TO_RECORD)
                    return@launch
                }

                val recordingDuration = 5000L // 5 seconds
                val buffer = ShortArray(minBufferSize)
                val outputStream = ByteArrayOutputStream()

                withContext(Dispatchers.IO) {
                    val startTime = System.currentTimeMillis()
                    while (isRecording && (System.currentTimeMillis() - startTime) < recordingDuration) {
                        val readResult = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                        if (readResult > 0) {
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

                // Clean up audio recording
                audioRecord?.stop()
                audioRecord?.release()
                audioRecord = null
                isRecording = false

                onStateChanged?.invoke(RecordingState.PROCESSING)

                val audioBytes = outputStream.toByteArray()
                Log.d("BatchRecordingManager", "Recorded ${audioBytes.size} bytes")

                val studentNames = studentData.map { "${it.firstName} ${it.lastName}".trim() }
                val result = whisperClient.transcribeAudioBytes(audioBytes, "en-US", studentNames)

                result.fold(
                    onSuccess = { transcription ->
                        Log.d("BatchRecordingManager", "Google Cloud Result: $transcription")
                        processBatchSpeech(transcription)
                    },
                    onFailure = { error ->
                        Log.e("BatchRecordingManager", "Google Cloud failed", error)
                        onErrorMessage?.invoke("Recognition failed: ${error.message}")
                        onStateChanged?.invoke(RecordingState.READY_TO_RECORD)
                    }
                )

            } catch (e: Exception) {
                Log.e("BatchRecordingManager", "Recording failed", e)
                onErrorMessage?.invoke("Recording failed: ${e.message}")
                onStateChanged?.invoke(RecordingState.READY_TO_RECORD)
                // Clean up on error
                try {
                    audioRecord?.stop()
                    audioRecord?.release()
                } catch (cleanupError: Exception) {
                    Log.e("BatchRecordingManager", "Error during cleanup", cleanupError)
                } finally {
                    audioRecord = null
                    isRecording = false
                }
            }
        }
    }

    private suspend fun processBatchSpeech(transcription: String) {
        Log.d("BatchRecordingManager", "🎯 Processing batch speech: '$transcription'")

        when {
            transcription.lowercase().contains("done") || transcription.lowercase().contains("finish") -> {
                Log.d("BatchRecordingManager", "User said 'done', showing batch validation")
                onStateChanged?.invoke(RecordingState.BATCH_VALIDATION)
            }
            else -> {
                // Process the batch speech through ExcelViewModel
                excelViewModel.processBatchSpeechInput(transcription)

                // Update batch state
                onBatchStateUpdated?.invoke(excelViewModel.batchProcessingState)

                // 🔧 LONGER delay before auto-restart
                delay(2000)

                Log.d("BatchRecordingManager", "🎯 Auto-restarting batch recording...")

                // 🔧 CLEAN restart
                try {
                    startBatchAndroidSpeechRecognition()
                } catch (e: Exception) {
                    Log.e("BatchRecordingManager", "Error auto-restarting", e)
                    onErrorMessage?.invoke("Auto-restart failed - tap to continue")
                    onStateChanged?.invoke(RecordingState.BATCH_LISTENING)
                }
            }
        }
    }

    fun stopRecording() {
        timeoutJob?.cancel()
        isRestarting = false
        speechRecognizer?.stopListening()
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
        isRecording = false
    }

    fun destroy() {
        try {
            timeoutJob?.cancel()
            isRestarting = false
            speechRecognizer?.destroy()
            audioRecord?.release()
        } catch (e: Exception) {
            Log.e("BatchRecordingManager", "Error destroying", e)
        }
    }
}