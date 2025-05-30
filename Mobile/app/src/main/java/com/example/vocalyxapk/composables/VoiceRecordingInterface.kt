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
import android.speech.tts.TextToSpeech
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import com.example.vocalyxapk.api.WhisperApiClient
import com.example.vocalyxapk.viewmodel.ExcelViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.util.*

enum class RecordingState {
    REQUESTING_PERMISSION,
    READY_TO_RECORD,
    LISTENING,
    PROCESSING,
    SPEECH_RECOGNIZED,
    TTS_SPEAKING
}

enum class SpeechEngine {
    GOOGLE_CLOUD,    // Your backend with Google Cloud Speech-to-Text
    ANDROID_NATIVE   // Android's built-in SpeechRecognizer
}

data class RecognizedSpeech(
    val fullText: String,
    val name: String?,
    val score: String?
)

@Composable
fun VoiceRecordingInterface(
    excelViewModel: ExcelViewModel,
    columnName: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var recordingState by remember { mutableStateOf(RecordingState.REQUESTING_PERMISSION) }
    var recognizedSpeech by remember { mutableStateOf<RecognizedSpeech?>(null) }
    var recordedCount by remember { mutableStateOf(0) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var permissionGranted by remember { mutableStateOf(false) }

    // 🎯 NEW: Speech Engine Toggle
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
        if (isGranted) {
            recordingState = RecordingState.READY_TO_RECORD
        } else {
            errorMessage = "Microphone permission is required for voice recording"
        }
    }

    // Initialize TTS
    LaunchedEffect(Unit) {
        ttsEngine = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                ttsEngine?.language = Locale.US
                Log.d("VoiceRecording", "TTS initialized successfully")
            } else {
                Log.e("VoiceRecording", "TTS initialization failed")
            }
        }
    }

    // Initialize Android SpeechRecognizer
    LaunchedEffect(Unit) {
        if (SpeechRecognizer.isRecognitionAvailable(context)) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
            Log.d("VoiceRecording", "Android SpeechRecognizer initialized")
        } else {
            Log.w("VoiceRecording", "Android SpeechRecognizer not available")
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

    // Cleanup
    DisposableEffect(Unit) {
        onDispose {
            audioRecord?.stop()
            audioRecord?.release()
            speechRecognizer?.destroy()
            ttsEngine?.stop()
            ttsEngine?.shutdown()
        }
    }

    // Functions - Define speakResponse FIRST
    fun speakResponse(text: String) {
        coroutineScope.launch {
            recordingState = RecordingState.TTS_SPEAKING
            ttsEngine?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "response")

            // Wait for TTS to finish (approximate)
            delay(text.length * 100L + 1500L)

            // Clear the recognized speech and return to ready state
            recognizedSpeech = null
            recordingState = RecordingState.READY_TO_RECORD
        }
    }

    // 🎯 NEW: Android Native Speech Recognition
    fun startAndroidSpeechRecognition() {
        try {
            recordingState = RecordingState.LISTENING

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 3000L)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 3000L)
            }

            val recognitionListener = object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {
                    Log.d("VoiceRecording", "Android STT: Ready for speech")
                }

                override fun onBeginningOfSpeech() {
                    Log.d("VoiceRecording", "Android STT: Beginning of speech")
                }

                override fun onRmsChanged(rmsdB: Float) {
                    // Audio level feedback
                }

                override fun onBufferReceived(buffer: ByteArray?) {
                    // Raw audio data (not used here)
                }

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
                        SpeechRecognizer.ERROR_NO_MATCH -> "No speech match found"
                        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognition service busy"
                        SpeechRecognizer.ERROR_SERVER -> "Server error"
                        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
                        else -> "Unknown error"
                    }
                    Log.e("VoiceRecording", "Android STT Error: $errorMsg")

                    coroutineScope.launch {
                        errorMessage = "Speech recognition failed: $errorMsg"
                        recordingState = RecordingState.READY_TO_RECORD
                    }
                }

                override fun onResults(results: Bundle?) {
                    val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    if (!matches.isNullOrEmpty()) {
                        val transcription = matches[0]
                        Log.d("VoiceRecording", "Android STT Result: $transcription")

                        coroutineScope.launch {
                            parseSimpleTranscription(transcription) { speech ->
                                recognizedSpeech = speech
                                recordingState = RecordingState.SPEECH_RECOGNIZED

                                // Automatically start TTS after showing result
                                launch {
                                    delay(2000)
                                    recordedCount++
                                    val response = "Yes, ${speech.fullText} done!"
                                    speakResponse(response)
                                }
                            }
                        }
                    } else {
                        coroutineScope.launch {
                            errorMessage = "No speech detected"
                            recordingState = RecordingState.READY_TO_RECORD
                        }
                    }
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    // Handle partial results if needed
                    val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    if (!matches.isNullOrEmpty()) {
                        Log.d("VoiceRecording", "Android STT Partial: ${matches[0]}")
                    }
                }

                override fun onEvent(eventType: Int, params: Bundle?) {
                    // Handle other events
                }
            }

            speechRecognizer?.setRecognitionListener(recognitionListener)
            speechRecognizer?.startListening(intent)

        } catch (e: Exception) {
            Log.e("VoiceRecording", "Android STT Error", e)
            coroutineScope.launch {
                errorMessage = "Speech recognition failed: ${e.message}"
                recordingState = RecordingState.READY_TO_RECORD
            }
        }
    }

    // Google Cloud Speech Recognition (existing function, slightly modified)
    fun startGoogleCloudRecording() {
        coroutineScope.launch {
            try {
                recordingState = RecordingState.LISTENING
                isRecording = true

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

                audioRecord?.startRecording()

                // Record for 3 seconds
                val recordingDuration = 3000L
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

                audioRecord?.stop()
                audioRecord?.release()
                isRecording = false

                recordingState = RecordingState.PROCESSING

                val audioBytes = outputStream.toByteArray()
                Log.d("VoiceRecording", "Google Cloud: Recorded ${audioBytes.size} bytes")

                val result = whisperClient.transcribeAudioBytes(audioBytes)

                result.fold(
                    onSuccess = { transcription ->
                        Log.d("VoiceRecording", "Google Cloud Result: $transcription")
                        parseSimpleTranscription(transcription) { speech ->
                            recognizedSpeech = speech
                            recordingState = RecordingState.SPEECH_RECOGNIZED

                            coroutineScope.launch {
                                delay(2000)
                                recordedCount++
                                val response = "Yes, ${speech.fullText} done!"
                                speakResponse(response)
                            }
                        }
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
                isRecording = false
                audioRecord?.stop()
                audioRecord?.release()
            }
        }
    }

    // 🎯 NEW: Smart start recording function
    fun startRecording() {
        errorMessage = null
        when (selectedEngine) {
            SpeechEngine.ANDROID_NATIVE -> startAndroidSpeechRecognition()
            SpeechEngine.GOOGLE_CLOUD -> startGoogleCloudRecording()
        }
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
                    .fillMaxWidth(0.9f)
                    .fillMaxHeight(0.8f),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(16.dp),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Header with Engine Selector
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Voice Test Mode",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF333D79)
                            )
                            Text(
                                text = "$recordedCount recordings tested",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF666666)
                            )
                        }

                        IconButton(onClick = onDismiss) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Close",
                                tint = Color(0xFF666666)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // 🎯 NEW: Speech Engine Selector
                    SpeechEngineSelector(
                        selectedEngine = selectedEngine,
                        onEngineSelected = { engine ->
                            selectedEngine = engine
                            errorMessage = null
                        }
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Error message display
                    if (errorMessage != null) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = Color(0xFFFFEBEE)
                            )
                        ) {
                            Text(
                                text = errorMessage!!,
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFFD32F2F),
                                modifier = Modifier.padding(16.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    // Main content based on recording state
                    Box(
                        modifier = Modifier.weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        when (recordingState) {
                            RecordingState.REQUESTING_PERMISSION -> {
                                PermissionRequestUI()
                            }

                            RecordingState.READY_TO_RECORD -> {
                                ReadyToRecordUI(
                                    selectedEngine = selectedEngine,
                                    onStartRecording = { startRecording() }
                                )
                            }

                            RecordingState.LISTENING -> {
                                ListeningUI(
                                    pulseScale = pulseScale,
                                    selectedEngine = selectedEngine
                                )
                            }

                            RecordingState.PROCESSING -> {
                                ProcessingUI(selectedEngine = selectedEngine)
                            }

                            RecordingState.SPEECH_RECOGNIZED -> {
                                SpeechRecognizedUI(
                                    speech = recognizedSpeech!!,
                                    onTryAgain = {
                                        recognizedSpeech = null
                                        recordingState = RecordingState.READY_TO_RECORD
                                    }
                                )
                            }

                            RecordingState.TTS_SPEAKING -> {
                                TTSSpeakingUI()
                            }
                        }
                    }

                    // Status text
                    Text(
                        text = when (recordingState) {
                            RecordingState.REQUESTING_PERMISSION -> "Requesting microphone permission..."
                            RecordingState.READY_TO_RECORD -> "Tap microphone to test voice recognition"
                            RecordingState.LISTENING -> when (selectedEngine) {
                                SpeechEngine.ANDROID_NATIVE -> "Listening... (Android STT) Say anything like \"John Doe 50\""
                                SpeechEngine.GOOGLE_CLOUD -> "Listening... (Google Cloud STT) Say anything like \"John Doe 50\""
                            }
                            RecordingState.PROCESSING -> "Processing your voice..."
                            RecordingState.SPEECH_RECOGNIZED -> "Speech recognized! TTS will start automatically..."
                            RecordingState.TTS_SPEAKING -> "Speaking response..."
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
        }
    }
}

// 🎯 NEW: Speech Engine Selector Component
@Composable
fun SpeechEngineSelector(
    selectedEngine: SpeechEngine,
    onEngineSelected: (SpeechEngine) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFF5F5F5)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Speech Recognition Engine",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF333D79)
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Android Native Option
                FilterChip(
                    selected = selectedEngine == SpeechEngine.ANDROID_NATIVE,
                    onClick = { onEngineSelected(SpeechEngine.ANDROID_NATIVE) },
                    label = {
                        Text("Android Native")
                    },
                    leadingIcon = {
                        Icon(
                            Icons.Default.Android,
                            contentDescription = "Android",
                            modifier = Modifier.size(18.dp)
                        )
                    },
                    modifier = Modifier.weight(1f)
                )

                // Google Cloud Option
                FilterChip(
                    selected = selectedEngine == SpeechEngine.GOOGLE_CLOUD,
                    onClick = { onEngineSelected(SpeechEngine.GOOGLE_CLOUD) },
                    label = {
                        Text("Google Cloud")
                    },
                    leadingIcon = {
                        Icon(
                            Icons.Default.Cloud,
                            contentDescription = "Cloud",
                            modifier = Modifier.size(18.dp)
                        )
                    },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = when (selectedEngine) {
                    SpeechEngine.ANDROID_NATIVE -> "✓ Fast • Works offline • Device-based"
                    SpeechEngine.GOOGLE_CLOUD -> "✓ High accuracy • Requires internet • Cloud-based"
                },
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF666666)
            )
        }
    }
}

// SIMPLIFIED: Parse transcription without Excel matching (unchanged)
fun parseSimpleTranscription(
    transcription: String,
    onResult: (RecognizedSpeech) -> Unit
) {
    val scorePattern = Regex("""(\d+)""")
    val scoreMatch = scorePattern.find(transcription)

    val score = scoreMatch?.value
    val nameText = if (score != null) {
        transcription.replace(score, "").trim().removeSuffix(".").trim()
    } else {
        transcription.trim().removeSuffix(".").trim()
    }

    val speech = RecognizedSpeech(
        fullText = transcription.trim().removeSuffix(".").trim(),
        name = if (nameText.isNotEmpty()) nameText else null,
        score = score
    )

    onResult(speech)
}

// Updated UI Components with engine awareness
@Composable
fun PermissionRequestUI() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(
            Icons.Default.Mic,
            contentDescription = "Microphone",
            modifier = Modifier.size(80.dp),
            tint = Color(0xFF666666)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Requesting Permission...",
            style = MaterialTheme.typography.titleMedium,
            color = Color(0xFF333D79)
        )
    }
}

@Composable
fun ReadyToRecordUI(
    selectedEngine: SpeechEngine,
    onStartRecording: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        Button(
            onClick = onStartRecording,
            modifier = Modifier.size(120.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = when (selectedEngine) {
                    SpeechEngine.ANDROID_NATIVE -> Color(0xFF4CAF50)  // Green for Android
                    SpeechEngine.GOOGLE_CLOUD -> Color(0xFF333D79)    // Blue for Google
                }
            ),
            shape = CircleShape
        ) {
            Icon(
                Icons.Default.Mic,
                contentDescription = "Start Recording",
                modifier = Modifier.size(48.dp),
                tint = Color.White
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Ready to Test Voice",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF333D79)
        )

        Text(
            text = "Try saying: \"John Doe 85\"",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666),
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Using: ${when (selectedEngine) {
                SpeechEngine.ANDROID_NATIVE -> "Android Native STT"
                SpeechEngine.GOOGLE_CLOUD -> "Google Cloud STT"
            }}",
            style = MaterialTheme.typography.bodySmall,
            color = Color(0xFF999999),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun ListeningUI(
    pulseScale: Float,
    selectedEngine: SpeechEngine
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        Box(
            modifier = Modifier.size(200.dp),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .scale(pulseScale)
                    .background(
                        when (selectedEngine) {
                            SpeechEngine.ANDROID_NATIVE -> Color(0xFF4CAF50)  // Green for Android
                            SpeechEngine.GOOGLE_CLOUD -> Color(0xFFFF5722)    // Orange for Google
                        },
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Mic,
                    contentDescription = "Recording",
                    modifier = Modifier.size(48.dp),
                    tint = Color.White
                )
            }
        }

        Spacer(modifier = Modifier.height(32.dp))
        SoundWaveVisualization(selectedEngine)
        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Listening...",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = when (selectedEngine) {
                SpeechEngine.ANDROID_NATIVE -> Color(0xFF4CAF50)
                SpeechEngine.GOOGLE_CLOUD -> Color(0xFFFF5722)
            }
        )
    }
}

@Composable
fun ProcessingUI(selectedEngine: SpeechEngine) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        CircularProgressIndicator(
            modifier = Modifier.size(80.dp),
            color = when (selectedEngine) {
                SpeechEngine.ANDROID_NATIVE -> Color(0xFF4CAF50)
                SpeechEngine.GOOGLE_CLOUD -> Color(0xFF333D79)
            },
            strokeWidth = 6.dp
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Analyzing voice...",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF333D79)
        )

        Text(
            text = when (selectedEngine) {
                SpeechEngine.ANDROID_NATIVE -> "Android STT Processing"
                SpeechEngine.GOOGLE_CLOUD -> "Google Cloud STT Processing"
            },
            style = MaterialTheme.typography.bodySmall,
            color = Color(0xFF666666)
        )
    }
}

@Composable
fun SpeechRecognizedUI(
    speech: RecognizedSpeech,
    onTryAgain: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        Box(
            modifier = Modifier
                .size(100.dp)
                .background(Color(0xFF4CAF50).copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.CheckCircle,
                contentDescription = "Success",
                tint = Color(0xFF4CAF50),
                modifier = Modifier.size(48.dp)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Speech Recognized!",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF4CAF50)
        )

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = Color(0xFF4CAF50).copy(alpha = 0.1f)
            )
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "\"${speech.fullText}\"",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF333D79),
                    textAlign = TextAlign.Center
                )

                if (speech.name != null && speech.score != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Name: ${speech.name}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666)
                    )
                    Text(
                        text = "Score: ${speech.score}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onTryAgain,
            modifier = Modifier.fillMaxWidth(0.6f),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF666666)
            )
        ) {
            Icon(
                Icons.Default.Refresh,
                contentDescription = "Try Again",
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Try Again")
        }
    }
}

@Composable
fun TTSSpeakingUI() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        Box(
            modifier = Modifier
                .size(100.dp)
                .background(Color(0xFF2196F3).copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.VolumeUp,
                contentDescription = "Speaking",
                tint = Color(0xFF2196F3),
                modifier = Modifier.size(48.dp)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Speaking Response...",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF2196F3)
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "🔊 Listen for the confirmation",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun SoundWaveVisualization(selectedEngine: SpeechEngine = SpeechEngine.GOOGLE_CLOUD) {
    val infiniteTransition = rememberInfiniteTransition(label = "sound_wave")

    Row(
        modifier = Modifier.height(40.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(8) { index ->
            val animatedHeight by infiniteTransition.animateFloat(
                initialValue = 0.3f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(
                        durationMillis = 800 + (index * 100),
                        easing = FastOutSlowInEasing
                    ),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "wave_$index"
            )

            Box(
                modifier = Modifier
                    .width(4.dp)
                    .fillMaxHeight(animatedHeight)
                    .background(
                        when (selectedEngine) {
                            SpeechEngine.ANDROID_NATIVE -> Color(0xFF4CAF50).copy(alpha = 0.7f)
                            SpeechEngine.GOOGLE_CLOUD -> Color(0xFFFF5722).copy(alpha = 0.7f)
                        },
                        RoundedCornerShape(2.dp)
                    )
            )
        }
    }
}