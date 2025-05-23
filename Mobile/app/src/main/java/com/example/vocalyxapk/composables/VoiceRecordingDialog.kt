// Updated VoiceRecordingDialog.kt with custom recording UI
package com.example.vocalyxapk.composables

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import com.example.vocalyxapk.models.VoiceParseResult
import com.example.vocalyxapk.viewmodel.ExcelViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Locale

@Composable
fun VoiceRecordingDialog(
    excelViewModel: ExcelViewModel,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    // Dialog state
    var currentStep by remember { mutableStateOf(1) }
    var selectedColumn by remember { mutableStateOf<String?>(null) }
    var isAddingNewColumn by remember { mutableStateOf(false) }
    var newColumnName by remember { mutableStateOf("") }
    var recognizedText by remember { mutableStateOf("") }
    var parsedResult by remember { mutableStateOf<VoiceParseResult?>(null) }
    var isRecording by remember { mutableStateOf(false) }
    var suggestedStudents by remember { mutableStateOf<List<String>>(emptyList()) }
    var selectedStudent by remember { mutableStateOf("") }
    var saveSuccess by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var recordingVolume by remember { mutableStateOf(0f) }
    var hasRecordingPermission by remember { mutableStateOf(
        ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    )}

    // Get columns
    val columns = excelViewModel.getColumnNames()

    // Speech recognizer
    var speechRecognizer: SpeechRecognizer? by remember { mutableStateOf(null) }

    val startRecordingFunction = remember { mutableStateOf<((Context) -> Unit)?>(null) }

    // Permission launcher - defined before any function that uses it
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasRecordingPermission = isGranted
        if (isGranted) {
            // Use the function reference instead of direct call
            startRecordingFunction.value?.invoke(context)
        }
    }

    fun getErrorMessage(errorCode: Int): String {
        return when (errorCode) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_CLIENT -> "Client side error"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
            SpeechRecognizer.ERROR_NETWORK -> "Network error"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
            SpeechRecognizer.ERROR_NO_MATCH -> "No match found"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy"
            SpeechRecognizer.ERROR_SERVER -> "Server error"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
            else -> "Unknown error"
        }
    }

    // Stop recording function
    fun stopRecording() {
        speechRecognizer?.stopListening()
        isRecording = false
    }

    // Define the start recording function and store it in the mutable state
    startRecordingFunction.value = { ctx ->
        if (!hasRecordingPermission) {
            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        } else {
            // Only execute this part if we have permission
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                // Hide system UI by NOT setting EXTRA_PROMPT
            }

            try {
                recognizedText = ""
                recordingVolume = 0f
                isRecording = true
                speechRecognizer?.startListening(intent)
            } catch (e: Exception) {
                isRecording = false
                errorMessage = "Error: ${e.message}"
            }
        }
    }

    // Convenience function to call the stored function
    fun startRecording(ctx: Context) {
        startRecordingFunction.value?.invoke(ctx)
    }

    // Initialize speech recognizer
    DisposableEffect(Unit) {
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)

        onDispose {
            speechRecognizer?.destroy()
        }
    }

    // Setup speech recognizer listener
    LaunchedEffect(speechRecognizer) {
        speechRecognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                isRecording = true
            }

            override fun onBeginningOfSpeech() {
                // Recording started
            }

            override fun onRmsChanged(rmsdB: Float) {
                // Update volume indicator - normalize RMS to 0-1 range
                // RMS normally ranges from 0 to about -10 dB for speech
                val normalizedVolume = if (rmsdB < 0) 0f else (rmsdB / 10f).coerceAtMost(1f)
                recordingVolume = normalizedVolume
            }

            override fun onBufferReceived(buffer: ByteArray?) {
                // Buffer received
            }

            override fun onEndOfSpeech() {
                isRecording = false
                recordingVolume = 0f
            }

            override fun onError(error: Int) {
                isRecording = false
                recordingVolume = 0f
                errorMessage = "Error: ${getErrorMessage(error)}"
            }

            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val spokenText = matches?.firstOrNull() ?: ""

                recognizedText = spokenText

                // Process the recognized speech
                parsedResult = excelViewModel.parseVoiceInput(spokenText)

                // Get matching students
                parsedResult?.studentName?.let { name ->
                    suggestedStudents = excelViewModel.findMatchingStudents(name)
                    if (suggestedStudents.size == 1) {
                        selectedStudent = suggestedStudents[0]
                    }
                }

                isRecording = false
                recordingVolume = 0f
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val spokenText = matches?.firstOrNull() ?: ""

                recognizedText = spokenText
            }

            override fun onEvent(eventType: Int, params: Bundle?) {
                // Event
            }
        })
    }

    Dialog(
        onDismissRequest = {
            stopRecording()
            onDismiss()
        },
        properties = DialogProperties(dismissOnBackPress = true, dismissOnClickOutside = true)
    ) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 8.dp,
            shadowElevation = 8.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .animateContentSize(
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioMediumBouncy,
                        stiffness = Spring.StiffnessLow
                    )
                )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Dialog title
                Text(
                    "Record Student Data",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF333D79)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Step indicator
                StepIndicator(currentStep = currentStep)

                Spacer(modifier = Modifier.height(24.dp))

                // Different content based on current step
                when (currentStep) {
                    1 -> {
                        // Step 1: Column Selection
                        Text(
                            "Select a column to update",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        if (!isAddingNewColumn) {
                            // Display existing columns
                            LazyColumn(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(max = 250.dp)
                            ) {
                                items(columns) { column ->
                                    ColumnSelectionItem(
                                        columnName = column,
                                        isSelected = selectedColumn == column,
                                        onSelect = { selectedColumn = column }
                                    )
                                }

                                item {
                                    Spacer(modifier = Modifier.height(8.dp))

                                    // Add new column option
                                    Button(
                                        onClick = { isAddingNewColumn = true },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 8.dp),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = Color(0xFF333D79)
                                        )
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = null)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Add New Column")
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            Button(
                                onClick = {
                                    if (selectedColumn != null) currentStep = 2
                                },
                                enabled = selectedColumn != null,
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF333D79),
                                    disabledContainerColor = Color(0xFF9E9E9E)
                                )
                            ) {
                                Text("Next")
                            }
                        } else {
                            // Add new column UI
                            OutlinedTextField(
                                value = newColumnName,
                                onValueChange = { newColumnName = it },
                                label = { Text("New Column Name") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                OutlinedButton(
                                    onClick = { isAddingNewColumn = false }
                                ) {
                                    Text("Cancel")
                                }

                                Button(
                                    onClick = {
                                        // Add the new column
                                        excelViewModel.addColumnToExcelFile(newColumnName)
                                        selectedColumn = newColumnName
                                        isAddingNewColumn = false
                                        currentStep = 2
                                    },
                                    enabled = newColumnName.isNotBlank(),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFF333D79),
                                        disabledContainerColor = Color(0xFF9E9E9E)
                                    )
                                ) {
                                    Text("Add & Continue")
                                }
                            }
                        }
                    }

                    2 -> {
                        // Step 2: Voice Recording
                        Text(
                            "Record for: ${selectedColumn}",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = Color(0xFFF5F7FA)
                            )
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    "Say: \"[Student Name] [Value]\"",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold
                                )

                                Spacer(modifier = Modifier.height(8.dp))

                                Text(
                                    "Examples:",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Medium
                                )

                                Text(
                                    "• \"Amparo 8\" (sets ${selectedColumn} to 8 for student Amparo)",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF666666)
                                )

                                Text(
                                    "• \"Joemarie absent\" (marks student as absent)",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF666666)
                                )

                                Spacer(modifier = Modifier.height(8.dp))

                                Text(
                                    "You can use first name, last name, or full name.",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                                    color = Color(0xFF333D79)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        // Custom recording visualization
                        Box(
                            modifier = Modifier
                                .size(100.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF333D79))
                                .clickable {
                                    if (isRecording) {
                                        stopRecording()
                                    } else {
                                        startRecording(context)
                                    }
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            // Pulsating circle animation when recording
                            if (isRecording) {
                                val infiniteTransition = rememberInfiniteTransition()
                                val scale by infiniteTransition.animateFloat(
                                    initialValue = 1f,
                                    targetValue = 1.2f,
                                    animationSpec = infiniteRepeatable(
                                        animation = tween(800, easing = FastOutSlowInEasing),
                                        repeatMode = RepeatMode.Reverse
                                    )
                                )

                                // Volume visualization - outer circle
                                Box(
                                    modifier = Modifier
                                        .size(100.dp * scale * (0.5f + 0.5f * recordingVolume))
                                        .clip(CircleShape)
                                        .background(Color(0xFF333D79).copy(alpha = 0.3f))
                                )

                                // Recording indicator - inner circle with icon
                                Box(
                                    modifier = Modifier
                                        .size(80.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF333D79))
                                        .scale(scale * 0.8f),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Mic,
                                        contentDescription = "Stop Recording",
                                        modifier = Modifier.size(40.dp),
                                        tint = Color.White
                                    )
                                }
                            } else {
                                Icon(
                                    imageVector = Icons.Default.Mic,
                                    contentDescription = "Start Recording",
                                    modifier = Modifier.size(40.dp),
                                    tint = Color.White
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Recording status text
                        Text(
                            text = if (isRecording) "Listening..." else "Tap to start recording",
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (isRecording) Color(0xFF333D79) else Color(0xFF666666)
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // If text has been recognized, show it
                        AnimatedVisibility(visible = recognizedText.isNotBlank()) {
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    "Recognized: \"$recognizedText\"",
                                    style = MaterialTheme.typography.bodyMedium,
                                    textAlign = TextAlign.Center
                                )

                                Spacer(modifier = Modifier.height(16.dp))

                                Button(
                                    onClick = {
                                        // First parse the recognized text
                                        parsedResult = excelViewModel.parseVoiceInput(recognizedText)

                                        // Check if the student name needs phonetic correction
                                        if (parsedResult?.studentName != null) {
                                            val originalName = parsedResult?.studentName!!
                                            val correctedName = excelViewModel.correctCommonPhoneticMismatches(originalName)

                                            // Check if name was corrected and if it differs from original
                                            if (correctedName != originalName) {
                                                // Offer suggestion by updating the UI
                                                suggestedStudents = listOf(correctedName)
                                                // In step 3, you'll already be showing the suggestion as a clickable option
                                            } else {
                                                // Use regular matching
                                                suggestedStudents = excelViewModel.findMatchingStudents(originalName)
                                            }
                                        }

                                        currentStep = 3
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFF333D79)
                                    )
                                ) {
                                    Text("Continue")
                                }
                            }
                        }

                        if (recognizedText.isBlank() && !isRecording) {
                            Spacer(modifier = Modifier.height(16.dp))

                            OutlinedButton(
                                onClick = { currentStep = 1 },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Back")
                            }
                        }


                    }

                    3 -> {
                        // Step 3: Confirmation with enhanced validation
                        Text(
                            "Confirm Details",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Score validation check - NEW
                        if (parsedResult?.value?.toDoubleOrNull() != null && selectedColumn != null) {
                            val scoreValue = parsedResult?.value?.toDoubleOrNull() ?: 0.0
                            val validationResult = excelViewModel.validateScore(selectedColumn!!, scoreValue)

                            when (validationResult) {
                                is ExcelViewModel.ValidationResult.ExceedsMaximum -> {
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 8.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3E0))
                                    ) {
                                        Column(modifier = Modifier.padding(16.dp)) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                modifier = Modifier.padding(bottom = 8.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Warning,
                                                    contentDescription = null,
                                                    tint = Color(0xFFFF9800)
                                                )
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text(
                                                    "Score exceeds maximum",
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color(0xFFE65100)
                                                )
                                            }
                                            Text(
                                                "The value ${parsedResult?.value} exceeds the maximum score of ${validationResult.maxScore} for this column.",
                                                style = MaterialTheme.typography.bodyMedium
                                            )

                                            Spacer(modifier = Modifier.height(8.dp))

                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.End
                                            ) {
                                                TextButton(onClick = {
                                                    // Use maximum score instead
                                                    parsedResult = VoiceParseResult(
                                                        parsedResult?.studentName,
                                                        validationResult.maxScore.toString()
                                                    )
                                                }) {
                                                    Text("Use Max (${validationResult.maxScore})")
                                                }

                                                TextButton(onClick = {
                                                    // Keep original value
                                                    // No action needed
                                                }) {
                                                    Text("Keep Value")
                                                }
                                            }
                                        }
                                    }
                                }

                                is ExcelViewModel.ValidationResult.NearMaximum -> {
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 8.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(16.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Info,
                                                contentDescription = null,
                                                tint = Color(0xFF4CAF50)
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                "Value ${parsedResult?.value} is close to the maximum score of ${validationResult.maxScore}",
                                                style = MaterialTheme.typography.bodyMedium
                                            )
                                        }
                                    }
                                }

                                else -> { /* No special UI for valid scores */ }
                            }

                            Spacer(modifier = Modifier.height(8.dp))
                        }

                        if (suggestedStudents.size == 1 && parsedResult?.studentName != null &&
                            parsedResult?.studentName != suggestedStudents[0]) {

                            Card(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFE3F2FD)) // Light blue for suggestions
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(bottom = 8.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Info,
                                            contentDescription = null,
                                            tint = Color(0xFF2196F3)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            "Did you mean this student?",
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF0D47A1)
                                        )
                                    }

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                selectedStudent = suggestedStudents[0]
                                            }
                                            .padding(8.dp)
                                            .background(
                                                color = Color(0xFFBBDEFB),
                                                shape = RoundedCornerShape(4.dp)
                                            )
                                            .padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            "\"${parsedResult?.studentName}\" → \"${suggestedStudents[0]}\"",
                                            style = MaterialTheme.typography.bodyLarge,
                                            fontWeight = FontWeight.Medium
                                        )

                                        Spacer(modifier = Modifier.weight(1f))

                                        Icon(
                                            imageVector = Icons.Default.Check,
                                            contentDescription = "Select this name",
                                            tint = Color(0xFF2196F3)
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))

                                    Text(
                                        "The student name might have been misheard. Click the suggestion to use this name instead.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color(0xFF666666)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))
                        }

                        // Student selection (if multiple matches)
                        if (suggestedStudents.size > 1 && selectedStudent.isEmpty()) {
                            Text(
                                "Select correct student:",
                                style = MaterialTheme.typography.bodyMedium
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            LazyColumn(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(max = 150.dp)
                            ) {
                                items(suggestedStudents) { student ->
                                    StudentSelectionItem(
                                        studentName = student,
                                        onSelect = { selectedStudent = student }
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))
                        } else if (suggestedStudents.isEmpty() && parsedResult?.studentName != null) {
                            // ENHANCED No matching students found with suggestions
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3F2)),
                                border = BorderStroke(1.dp, Color(0xFFFEE4E2))
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(bottom = 8.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Warning,
                                            contentDescription = null,
                                            tint = Color(0xFFD32F2F)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            "No matching student found",
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFFB71C1C)
                                        )
                                    }

                                    Text(
                                        "No student found matching \"${parsedResult?.studentName}\"",
                                        style = MaterialTheme.typography.bodyMedium
                                    )

                                    // Show fuzzy match suggestions if available
                                    val suggestions = excelViewModel.getSuggestedNames()
                                    if (suggestions.isNotEmpty()) {
                                        Spacer(modifier = Modifier.height(12.dp))
                                        Text(
                                            "Did you mean:",
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Medium
                                        )

                                        LazyColumn(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .heightIn(max = 150.dp)
                                                .padding(top = 4.dp)
                                        ) {
                                            items(suggestions) { suggestion ->
                                                Row(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .clickable {
                                                            selectedStudent = suggestion
                                                        }
                                                        .padding(vertical = 8.dp, horizontal = 16.dp),
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.Person,
                                                        contentDescription = null,
                                                        tint = Color(0xFF666666),
                                                        modifier = Modifier.size(16.dp)
                                                    )
                                                    Spacer(modifier = Modifier.width(8.dp))
                                                    Text(suggestion)
                                                }
                                            }
                                        }
                                    } else {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            "Try using a different name or add this student manually.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color(0xFF912018),
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))
                        }

                        // Display parsed details
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = Color(0xFFF5F7FA)
                            )
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                DetailsRow("Student Name", selectedStudent.ifEmpty { parsedResult?.studentName ?: "" })
                                DetailsRow("Column", selectedColumn ?: "")
                                DetailsRow("Value", parsedResult?.value ?: "")
                            }
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        // Saving indicator
                        AnimatedVisibility(
                            visible = excelViewModel.isSaving || excelViewModel.lastSaveStatus != null
                        ) {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 16.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = when (excelViewModel.lastSaveStatus) {
                                        ExcelViewModel.SaveStatus.SUCCESS -> Color(0xFFE8F5E9)
                                        ExcelViewModel.SaveStatus.ERROR -> Color(0xFFFFEBEE)
                                        null -> Color(0xFFF5F5F5)
                                    }
                                )
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    when {
                                        excelViewModel.isSaving -> {
                                            CircularProgressIndicator(
                                                modifier = Modifier.size(20.dp),
                                                strokeWidth = 2.dp,
                                                color = Color(0xFF333D79)
                                            )
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Text("Saving changes...", color = Color(0xFF555555))
                                        }
                                        excelViewModel.lastSaveStatus == ExcelViewModel.SaveStatus.SUCCESS -> {
                                            Icon(
                                                imageVector = Icons.Default.Check,
                                                contentDescription = null,
                                                tint = Color(0xFF4CAF50),
                                                modifier = Modifier.size(20.dp)
                                            )
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Text("Changes saved successfully", color = Color(0xFF2E7D32))
                                        }
                                        excelViewModel.lastSaveStatus == ExcelViewModel.SaveStatus.ERROR -> {
                                            Icon(
                                                imageVector = Icons.Default.Warning,
                                                contentDescription = null,
                                                tint = Color(0xFFF44336),
                                                modifier = Modifier.size(20.dp)
                                            )
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Text("Failed to save changes", color = Color(0xFFD32F2F))
                                        }
                                    }
                                }
                            }
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            OutlinedButton(
                                onClick = {
                                    // Reset state for step 2
                                    recognizedText = ""
                                    parsedResult = null
                                    suggestedStudents = emptyList()
                                    selectedStudent = ""
                                    excelViewModel.resetAttemptedNames() // Reset attempted names
                                    currentStep = 2
                                }
                            ) {
                                Text("Try Again")
                            }

                            Button(
                                onClick = {
                                    // Apply changes
                                    val studentName = selectedStudent.ifEmpty { parsedResult?.studentName ?: "" }
                                    val value = parsedResult?.value ?: ""

                                    if (studentName.isNotBlank() && selectedColumn != null) {
                                        excelViewModel.updateStudentValue(
                                            studentName,
                                            selectedColumn!!,
                                            value
                                        ) { success ->
                                            if (success) {
                                                // Record successful entry for stats
                                                excelViewModel.recordSuccessfulEntry(studentName, selectedColumn!!, value)
                                                saveSuccess = true
                                                currentStep = 4
                                            } else {
                                                // Record failed entry for stats
                                                excelViewModel.recordFailedEntry(studentName, selectedColumn!!, value)
                                                errorMessage = "Failed to update data"
                                            }
                                        }
                                    } else {
                                        errorMessage = "Student name or column is missing"
                                    }
                                },
                                enabled = (selectedStudent.isNotBlank() || parsedResult?.studentName?.isNotBlank() == true) &&
                                        selectedColumn != null && !excelViewModel.isSaving,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF333D79),
                                    disabledContainerColor = Color(0xFF9E9E9E)
                                )
                            ) {
                                if (excelViewModel.isSaving) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(16.dp),
                                        color = Color.White,
                                        strokeWidth = 2.dp
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                }
                                Text("Confirm")
                            }
                        }

                        // Error message
                        AnimatedVisibility(visible = errorMessage != null) {
                            Text(
                                text = errorMessage ?: "",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color.Red,
                                modifier = Modifier.padding(top = 16.dp)
                            )
                        }
                    }

                    4 -> {
                        // Step 4: Success (unchanged)
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = Color(0xFF4CAF50)
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            "Success!",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )

                        AnimatedVisibility(
                            visible = excelViewModel.isSaving || excelViewModel.lastSaveStatus != null
                        ) {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 8.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = when (excelViewModel.lastSaveStatus) {
                                        ExcelViewModel.SaveStatus.SUCCESS -> Color(0xFFE8F5E9)
                                        ExcelViewModel.SaveStatus.ERROR -> Color(0xFFFFEBEE)
                                        null -> Color(0xFFF5F5F5)
                                    }
                                )
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    when {
                                        excelViewModel.isSaving -> {
                                            CircularProgressIndicator(
                                                modifier = Modifier.size(20.dp),
                                                strokeWidth = 2.dp,
                                                color = Color(0xFF333D79)
                                            )
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Text("Saving changes...", color = Color(0xFF555555))
                                        }
                                        excelViewModel.lastSaveStatus == ExcelViewModel.SaveStatus.SUCCESS -> {
                                            Icon(
                                                imageVector = Icons.Default.Check,
                                                contentDescription = null,
                                                tint = Color(0xFF4CAF50),
                                                modifier = Modifier.size(20.dp)
                                            )
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Text("Changes saved successfully", color = Color(0xFF2E7D32))
                                        }
                                        excelViewModel.lastSaveStatus == ExcelViewModel.SaveStatus.ERROR -> {
                                            Icon(
                                                imageVector = Icons.Default.Warning,
                                                contentDescription = null,
                                                tint = Color(0xFFF44336),
                                                modifier = Modifier.size(20.dp)
                                            )
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Text("Failed to save changes", color = Color(0xFFD32F2F))
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            "Student data has been updated successfully.",
                            style = MaterialTheme.typography.bodyMedium,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            OutlinedButton(
                                onClick = onDismiss
                            ) {
                                Text("Close")
                            }

                            Button(
                                onClick = {
                                    // Reset for a new recording
                                    currentStep = 1
                                    recognizedText = ""
                                    parsedResult = null
                                    suggestedStudents = emptyList()
                                    selectedStudent = ""
                                    saveSuccess = false
                                    errorMessage = null
                                    selectedColumn = null
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF333D79)
                                )
                            ) {
                                Text("Record Another")
                            }
                        }

                        // Auto-close after a delay
                        LaunchedEffect(saveSuccess) {
                            if (saveSuccess) {
                                delay(3000)
                                onDismiss()
                            }
                        }
                    }
                }
            }
        }
    }
}

// Rest of the helper composables remain the same
@Composable
private fun StepIndicator(currentStep: Int) {
    val totalSteps = 4

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center
    ) {
        for (step in 1..totalSteps) {
            Box(
                modifier = Modifier
                    .padding(horizontal = 4.dp)
                    .size(if (step == currentStep) 12.dp else 8.dp)
                    .background(
                        color = if (step <= currentStep) Color(0xFF333D79) else Color(0xFFDDDDDD),
                        shape = CircleShape
                    )
            )
        }
    }
}

@Composable
private fun ColumnSelectionItem(
    columnName: String,
    isSelected: Boolean,
    onSelect: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onSelect)
            .padding(vertical = 12.dp, horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(
            selected = isSelected,
            onClick = onSelect,
            colors = RadioButtonDefaults.colors(
                selectedColor = Color(0xFF333D79)
            )
        )

        Spacer(modifier = Modifier.width(8.dp))

        Text(
            text = columnName,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun StudentSelectionItem(
    studentName: String,
    onSelect: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onSelect)
            .padding(vertical = 8.dp, horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.Person,
            contentDescription = null,
            tint = Color(0xFF666666),
            modifier = Modifier.size(16.dp)
        )

        Spacer(modifier = Modifier.width(8.dp))

        Text(
            text = studentName,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun DetailsRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "$label:",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.width(120.dp),
            color = Color(0xFF666666)
        )

        Spacer(modifier = Modifier.width(8.dp))

        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Normal
        )
    }
}