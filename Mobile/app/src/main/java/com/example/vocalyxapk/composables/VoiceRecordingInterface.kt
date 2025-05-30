package com.example.vocalyxapk.composables

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.vocalyxapk.viewmodel.ExcelViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.random.Random

enum class RecordingState {
    LISTENING,
    PROCESSING,
    NAME_FOUND,
    NAME_NOT_FOUND,
    CONFIRMING
}

data class RecognizedStudent(
    val name: String,
    val confidence: Float,
    val isFirstName: Boolean
)

@Composable
fun VoiceRecordingInterface(
    excelViewModel: ExcelViewModel,
    columnName: String,
    onDismiss: () -> Unit
) {
    var recordingState by remember { mutableStateOf(RecordingState.LISTENING) }
    var recognizedStudent by remember { mutableStateOf<RecognizedStudent?>(null) }
    var currentScore by remember { mutableStateOf("") }
    var recordedStudents by remember { mutableStateOf(0) }
    var hasAutoStarted by remember { mutableStateOf(false) }
    
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
    
    // Get student names from Excel data
    val sheetData = excelViewModel.getSelectedSheetDataAsMap()
    val data = (sheetData["data"] as? List<Map<String, String>>) ?: emptyList()
    val studentNames = remember(data) {
        data.flatMap { row ->
            val firstName = row.values.elementAtOrNull(0)?.trim() ?: ""
            val lastName = row.values.elementAtOrNull(1)?.trim() ?: ""
            listOf(firstName, lastName).filter { it.isNotEmpty() }
        }.distinct()
    }
    
    // Auto-start recording when in listening state
    LaunchedEffect(recordingState) {
        if (recordingState == RecordingState.LISTENING && !hasAutoStarted) {
            hasAutoStarted = true
            delay(1000) // Small delay for UI to settle
            
            // Start voice recognition processing
            recordingState = RecordingState.PROCESSING
            
            delay(2000) // Simulate processing time
            
            // Simulate voice input parsing "Student Name - Score"
            val spokenName = studentNames.randomOrNull() // Replace with actual voice recognition
            val mockScore = (70..100).random() // Simulate score from voice
            
            if (spokenName != null && Random.nextFloat() > 0.3f) { // 70% success rate
                val isFirstName = data.any { row -> 
                    row.values.elementAtOrNull(0)?.equals(spokenName, ignoreCase = true) == true
                }
                
                recognizedStudent = RecognizedStudent(
                    name = spokenName,
                    confidence = Random.nextFloat() * 0.3f + 0.7f, // 70-100%
                    isFirstName = isFirstName
                )
                currentScore = mockScore.toString() // Set the score from voice
                recordingState = RecordingState.NAME_FOUND
            } else {
                recordingState = RecordingState.NAME_NOT_FOUND
            }
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
                    // Header
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Recording to: $columnName",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF333D79)
                            )
                            Text(
                                text = "$recordedStudents students recorded",
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
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    // Main content based on recording state
                    Box(
                        modifier = Modifier.weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        when (recordingState) {
                            RecordingState.LISTENING -> {
                                ListeningUI(
                                    pulseScale = pulseScale
                                )
                            }
                            
                            RecordingState.PROCESSING -> {
                                ProcessingUI()
                            }
                            
                            RecordingState.NAME_FOUND -> {
                                NameFoundUI(
                                    student = recognizedStudent!!,
                                    onConfirm = { recordingState = RecordingState.CONFIRMING },
                                    onRetry = { 
                                        hasAutoStarted = false
                                        recordingState = RecordingState.LISTENING 
                                    }
                                )
                            }
                            
                            RecordingState.NAME_NOT_FOUND -> {
                                NameNotFoundUI(
                                    onRetry = { 
                                        hasAutoStarted = false
                                        recordingState = RecordingState.LISTENING 
                                    },
                                    onManualSelect = { /* TODO: Implement manual selection */ }
                                )
                            }
                            
                            RecordingState.CONFIRMING -> {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(60.dp),
                                        color = Color(0xFF4CAF50),
                                        strokeWidth = 4.dp
                                    )
                                    
                                    Spacer(modifier = Modifier.height(16.dp))
                                    
                                    Text(
                                        text = "Saving...",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFF4CAF50)
                                    )
                                }
                                
                                // Auto-save and continue
                                LaunchedEffect(Unit) {
                                    delay(1500)
                                    // TODO: Save to Excel here
                                    recordedStudents++
                                    currentScore = ""
                                    recognizedStudent = null
                                    hasAutoStarted = false // Reset flag for next recording
                                    recordingState = RecordingState.LISTENING
                                }
                            }
                        }
                    }
                    
                    // Status text
                    Text(
                        text = when (recordingState) {
                            RecordingState.LISTENING -> "Say student name and score: \"Name - Score\""
                            RecordingState.PROCESSING -> "Processing your voice..."
                            RecordingState.NAME_FOUND -> "Student and score recognized! Confirm to save"
                            RecordingState.NAME_NOT_FOUND -> "Name not recognized. Try again"
                            RecordingState.CONFIRMING -> "Saving data..."
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

@Composable
fun ListeningUI(
    pulseScale: Float
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        // Main microphone display (no tap needed)
        Box(
            modifier = Modifier.size(200.dp),
            contentAlignment = Alignment.Center
        ) {
            // Main microphone icon with pulse animation
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .scale(pulseScale)
                    .background(
                        Color(0xFF333D79),
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
        
        // Sound wave visualization
        SoundWaveVisualization()
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "Listening... Say: \"Student Name - Score\"",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF333D79),
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "Example: \"John Smith - 85\"",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun ProcessingUI() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        CircularProgressIndicator(
            modifier = Modifier.size(80.dp),
            color = Color(0xFF333D79),
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
            text = "Please wait while we process your recording",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun NameFoundUI(
    student: RecognizedStudent,
    onConfirm: () -> Unit,
    onRetry: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        // Success icon
        Box(
            modifier = Modifier
                .size(100.dp)
                .background(Color(0xFF4CAF50).copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.CheckCircle,
                contentDescription = "Found",
                tint = Color(0xFF4CAF50),
                modifier = Modifier.size(48.dp)
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "Student Found!",
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
                horizontalAlignment = Alignment.Start
            ) {
                // Student name - centered and prominent
                Text(
                    text = student.name,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF333D79),
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Info rows with proper alignment
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Confidence:",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666),
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = "${(student.confidence * 100).toInt()}%",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF333D79),
                        fontWeight = FontWeight.SemiBold
                    )
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Matched by:",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666),
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = if (student.isFirstName) "First name" else "Last name",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF333D79),
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onRetry,
                modifier = Modifier.weight(1f)
            ) {
                Text("Try Again")
            }
            
            Button(
                onClick = onConfirm,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF4CAF50)
                )
            ) {
                Text("Save Score")
            }
        }
    }
}

@Composable
fun NameNotFoundUI(
    onRetry: () -> Unit,
    onManualSelect: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        // Error icon
        Box(
            modifier = Modifier
                .size(100.dp)
                .background(Color(0xFFFF5722).copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.ErrorOutline,
                contentDescription = "Not Found",
                tint = Color(0xFFFF5722),
                modifier = Modifier.size(48.dp)
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "Name Not Recognized",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color(0xFFFF5722)
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "We couldn't find that student in your class list. Please speak clearly or try again.",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666),
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onManualSelect,
                modifier = Modifier.weight(1f)
            ) {
                Text("Select Manually")
            }
            
            Button(
                onClick = onRetry,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF333D79)
                )
            ) {
                Text("Try Again")
            }
        }
    }
}

@Composable
fun SoundWaveVisualization() {
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
                        Color(0xFF333D79).copy(alpha = 0.7f),
                        RoundedCornerShape(2.dp)
                    )
            )
        }
    }
} 