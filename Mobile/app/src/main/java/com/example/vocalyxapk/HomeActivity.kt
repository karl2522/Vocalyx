package com.example.vocalyxapk

import android.content.Intent
import android.os.Bundle
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme
import java.util.*
import androidx.compose.ui.viewinterop.AndroidView
import android.widget.Button
import androidx.compose.ui.graphics.Color

class HomeActivity : ComponentActivity(), TextToSpeech.OnInitListener {

    private lateinit var textToSpeech: TextToSpeech
    private lateinit var speechRecognizer: SpeechRecognizer
    private val REQUEST_CODE_SPEECH_INPUT = 100

    // Add state holders
    private var currentText by mutableStateOf("")
    private var isVoiceRecognitionActive by mutableStateOf(false)

    private val speechRecognizerListener = object : android.speech.RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
            isVoiceRecognitionActive = true
        }

        override fun onResults(results: Bundle?) {
            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            if (!matches.isNullOrEmpty()) {
                currentText = matches[0]
                isVoiceRecognitionActive = false
            }
        }

        override fun onError(error: Int) {
            isVoiceRecognitionActive = false
            val message = when (error) {
                SpeechRecognizer.ERROR_NO_MATCH -> "No speech was recognized. Please try again."
                SpeechRecognizer.ERROR_NETWORK -> "Network error. Please check your internet connection."
                SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout. Please try again."
                SpeechRecognizer.ERROR_AUDIO -> "Audio recording error. Please try again."
                SpeechRecognizer.ERROR_SERVER -> "Server error. Please try again later."
                SpeechRecognizer.ERROR_CLIENT -> "Client side error. Please try again."
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input detected. Please try again."
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Please grant microphone permission."
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Speech recognizer is busy. Please try again."
                else -> "Error occurred during recognition. Error code: $error"
            }
            Toast.makeText(this@HomeActivity, message, Toast.LENGTH_SHORT).show()
        }

        // Required overrides with empty implementations
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {}
        override fun onPartialResults(partialResults: Bundle?) {}
        override fun onEvent(eventType: Int, params: Bundle?) {}
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            VOCALYXAPKTheme {
                HomePage(
                    text = currentText,
                    onTextChange = { newText -> currentText = newText },
                    onStartVoiceRecognition = {
                        isVoiceRecognitionActive = true
                        startVoiceRecognition()
                    },
                    onSpeakOut = { speakOut(currentText) },
                    isVoiceRecognitionActive = isVoiceRecognitionActive
                )
            }
        }

        // Initialize TextToSpeech
        textToSpeech = TextToSpeech(this, this)

        // Initialize SpeechRecognizer with the listener
        if (SpeechRecognizer.isRecognitionAvailable(this)) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
            speechRecognizer.setRecognitionListener(speechRecognizerListener)
        } else {
            Toast.makeText(this, "Speech recognition is not supported on this device.", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = textToSpeech.setLanguage(Locale.getDefault())
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Toast.makeText(this, "Language not supported", Toast.LENGTH_SHORT).show()
            }
        } else {
            Toast.makeText(this, "Initialization failed", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::textToSpeech.isInitialized) {
            textToSpeech.stop()
            textToSpeech.shutdown()
        }
        if (::speechRecognizer.isInitialized) {
            speechRecognizer.destroy()
        }
    }

    private fun startVoiceRecognition() {
        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(android.Manifest.permission.RECORD_AUDIO), 1)
            return
        }

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak now...")
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 1000L)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 3000L)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2000L)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }

        try {
            // Stop any existing recognition
            if (::speechRecognizer.isInitialized) {
                speechRecognizer.cancel()
            }

            // Start listening
            speechRecognizer.startListening(intent)
            Toast.makeText(this, "Listening... Please speak", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            isVoiceRecognitionActive = false
            Toast.makeText(this, "Speech recognition failed to start: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun speakOut(text: String) {
        textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, null)
    }

    // Add permission result handling
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1 && grantResults.isNotEmpty() && grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            startVoiceRecognition()
        } else {
            Toast.makeText(this, "Microphone permission is required for voice recognition", Toast.LENGTH_SHORT).show()
        }
    }
}

@Composable
fun HomePage(
    text: String,
    onTextChange: (String) -> Unit,
    onStartVoiceRecognition: () -> Unit,
    onSpeakOut: (String) -> Unit,
    isVoiceRecognitionActive: Boolean
) {
    val buttonColor = Color(0xFF333D79) // Deep blue color

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Center
    ) {
        OutlinedTextField(
            value = text,
            onValueChange = onTextChange,
            label = { Text("Enter text here") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Color.Gray.copy(alpha = 0.3f),
                focusedBorderColor = buttonColor
            )
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = onStartVoiceRecognition,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = buttonColor
            )
        ) {
            Text(
                if (isVoiceRecognitionActive) "Listening..." else "Start Voice Recognition",
                color = Color.White
            )
        }
        if (isVoiceRecognitionActive) {
            Text(
                "Speak now...",
                modifier = Modifier.padding(8.dp),
                color = buttonColor
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = { onSpeakOut(text) },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = buttonColor
            )
        ) {
            Text("Speak Text", color = Color.White)
        }
    }
}

@Preview(showBackground = true)
@Composable
fun HomePagePreview() {
    VOCALYXAPKTheme {
        HomePage(
            text = "",
            onTextChange = {},
            onStartVoiceRecognition = {},
            onSpeakOut = {},
            isVoiceRecognitionActive = false
        )
    }
} 