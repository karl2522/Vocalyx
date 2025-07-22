package com.example.vocalyxapk.composables

import android.util.Log
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import com.example.vocalyxapk.models.*
import com.example.vocalyxapk.viewmodel.ExcelViewModel
import kotlinx.coroutines.launch

@Composable
fun PermissionRequestScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.Mic,
            contentDescription = "Microphone",
            modifier = Modifier.size(80.dp),
            tint = Color(0xFF666666)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Requesting Microphone Permission...",
            style = MaterialTheme.typography.titleMedium,
            color = Color(0xFF333D79)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Please allow microphone access to continue",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun MainRecordingScreen(
    selectedEngine: SpeechEngine,
    onEngineSelected: (SpeechEngine) -> Unit,
    onStartRecording: () -> Unit,
    onStartBatchRecording: () -> Unit,
    voiceEntries: List<VoiceEntry>,
    columnName: String,
    onDismiss: () -> Unit,
    onViewSummary: () -> Unit,
    errorMessage: String?,
    onClearError: () -> Unit,
    isBatchMode: Boolean = false, // 🆕 NEW
    onBatchModeToggled: (Boolean) -> Unit, // 🆕 NEW
    batchState: BatchProcessingState = BatchProcessingState() // 🆕 NEW
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
                    text = "Voice Recording",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF333D79)
                )
                Text(
                    text = "${voiceEntries.size} entries recorded (${voiceEntries.filter { it.confirmed }.size} confirmed)",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF666666)
                )
                Text(
                    text = "Column: $columnName",
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

        BatchRecordingModeSelector(
            isBatchMode = isBatchMode,
            onBatchModeToggled = onBatchModeToggled
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Speech Engine Selector
        SpeechEngineSelector(
            selectedEngine = selectedEngine,
            onEngineSelected = onEngineSelected
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
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = errorMessage,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFFD32F2F),
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(onClick = onClearError) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Clear error",
                            tint = Color(0xFFD32F2F),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        // Main recording button
        Box(
            modifier = Modifier.weight(1f),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Action buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center
                ) {
                    Button(
                        onClick = if (isBatchMode) onStartBatchRecording else onStartRecording,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isBatchMode) Color(0xFF4CAF50) else when (selectedEngine) {
                                SpeechEngine.ANDROID_NATIVE -> Color(0xFF4CAF50)
                                SpeechEngine.GOOGLE_CLOUD -> Color(0xFF333D79)
                            }
                        ),
                        shape = RoundedCornerShape(12.dp),
                        contentPadding = PaddingValues(horizontal = 32.dp, vertical = 16.dp)
                    ) {
                        Icon(
                            Icons.Default.Mic,
                            contentDescription = "Start Recording",
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            if (isBatchMode) "Start Batch Recording" else "Start Recording",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = if (isBatchMode) "Tap to Start Batch Recording" else "Tap to Start Recording",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF333D79)
                )

                Text(
                    text = if (isBatchMode) {
                        "Say multiple students: \"Capuras 50, John Doe 45, Maria 38\""
                    } else {
                        "Say: \"[Student Name] [Score]\""
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF666666),
                    textAlign = TextAlign.Center
                )

                if (isBatchMode) {
                    Text(
                        text = "Separate entries with commas or \"and\"",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF999999),
                        textAlign = TextAlign.Center
                    )
                } else {
                    Text(
                        text = "Examples: \"John Doe 85\" or \"85 John Doe\"",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF999999),
                        textAlign = TextAlign.Center
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Say \"done\" when finished",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF999999),
                    textAlign = TextAlign.Center
                )
            }
        }

        // Quick summary of recorded entries
        if (isBatchMode && batchState.entries.isNotEmpty()) {
            BatchEntrySummaryCard(
                batchState = batchState,
                onViewDetails = onViewSummary
            )
        } else if (!isBatchMode && voiceEntries.isNotEmpty()) {
            // Keep existing single mode summary
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFF4CAF50).copy(alpha = 0.1f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Recorded Entries",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF333D79)
                        )
                        TextButton(onClick = onViewSummary) {
                            Text("View All")
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    LazyColumn(
                        modifier = Modifier.heightIn(max = 120.dp)
                    ) {
                        items(voiceEntries.take(3)) { entry ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 2.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = entry.fullStudentName,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF666666),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = entry.score,
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFF333D79)
                                )
                            }
                        }
                    }

                    if (voiceEntries.size > 3) {
                        Text(
                            text = "... and ${voiceEntries.size - 3} more",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF999999),
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            }
        }
        if (isBatchMode) {
            Text(
                text = "🎤 Ready for next entry...",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF4CAF50),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(8.dp)
            )
        }
    }
}

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
                FilterChip(
                    selected = selectedEngine == SpeechEngine.ANDROID_NATIVE,
                    onClick = { onEngineSelected(SpeechEngine.ANDROID_NATIVE) },
                    label = { Text("Android Native") },
                    leadingIcon = {
                        Icon(
                            Icons.Default.Android,
                            contentDescription = "Android",
                            modifier = Modifier.size(18.dp)
                        )
                    },
                    modifier = Modifier.weight(1f)
                )

                FilterChip(
                    selected = selectedEngine == SpeechEngine.GOOGLE_CLOUD,
                    onClick = { onEngineSelected(SpeechEngine.GOOGLE_CLOUD) },
                    label = { Text("Google Cloud") },
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

@Composable
fun ListeningScreen(
    selectedEngine: SpeechEngine,
    pulseScale: Float
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
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
                            SpeechEngine.ANDROID_NATIVE -> Color(0xFF4CAF50)
                            SpeechEngine.GOOGLE_CLOUD -> Color(0xFFFF5722)
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
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
            color = when (selectedEngine) {
                SpeechEngine.ANDROID_NATIVE -> Color(0xFF4CAF50)
                SpeechEngine.GOOGLE_CLOUD -> Color(0xFFFF5722)
            }
        )

        Text(
            text = "Say the student's name and score",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun ProcessingScreen(selectedEngine: SpeechEngine) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
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
            text = "Processing Speech...",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF333D79)
        )

        Text(
            text = when (selectedEngine) {
                SpeechEngine.ANDROID_NATIVE -> "Using Android Speech Recognition"
                SpeechEngine.GOOGLE_CLOUD -> "Using Google Cloud Speech-to-Text"
            },
            style = MaterialTheme.typography.bodySmall,
            color = Color(0xFF666666)
        )
    }
}

@Composable
fun SpeechRecognizedScreen(
    recognizedSpeech: RecognizedSpeech?,
    onContinue: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
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
            text = "Entry Recorded!",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF4CAF50)
        )

        Spacer(modifier = Modifier.height(16.dp))

        if (recognizedSpeech != null) {
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
                        text = "\"${recognizedSpeech.fullText}\"",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF333D79),
                        textAlign = TextAlign.Center
                    )

                    if (recognizedSpeech.recognizedName != null && recognizedSpeech.score != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Student: ${recognizedSpeech.recognizedName}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF666666)
                        )
                        Text(
                            text = "Score: ${recognizedSpeech.score}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF666666)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Continuing in a moment...",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun DuplicateSelectionScreen(
    matches: List<StudentMatch>,
    recognizedName: String,
    onStudentSelected: (StudentMatch) -> Unit,
    onCancel: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Multiple Students Found",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF333D79)
            )
            IconButton(onClick = onCancel) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = "Cancel",
                    tint = Color(0xFF666666)
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "You said \"$recognizedName\". Please select the correct student:",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666)
        )

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(matches) { match ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = Color.White
                    ),
                    elevation = CardDefaults.cardElevation(2.dp),
                    onClick = { onStudentSelected(match) }
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = match.fullName,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF333D79)
                            )
                            Text(
                                text = "${(match.similarity * 100).toInt()}% match",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF666666)
                            )
                        }
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = "Select",
                            tint = Color(0xFF333D79)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedButton(
            onClick = onCancel,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Cancel and Try Again")
        }
    }
}

@Composable
fun OverrideConfirmationScreen(
    entry: VoiceEntry?,
    onConfirm: (Boolean) -> Unit
) {
    if (entry == null) return

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.Warning,
            contentDescription = "Warning",
            modifier = Modifier.size(64.dp),
            tint = Color(0xFFFF9800)
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Student Already Has Score",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF333D79),
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = Color(0xFFFFF3E0)
            )
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = entry.fullStudentName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF333D79)
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Current Score",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF666666)
                        )
                        Text(
                            text = entry.existingScore ?: "",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFD32F2F)
                        )
                    }

                    Icon(
                        Icons.Default.ArrowForward,
                        contentDescription = "To",
                        tint = Color(0xFF666666)
                    )

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "New Score",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF666666)
                        )
                        Text(
                            text = entry.score,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF4CAF50)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Do you want to override the existing score?",
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
                onClick = { onConfirm(false) }, // 🎯 This means "Keep Current" - don't override
                modifier = Modifier.weight(1f)
            ) {
                Text("Keep Current")
            }

            Button(
                onClick = { onConfirm(true) }, // 🎯 This means "Override" - replace with new score
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFFF9800)
                )
            ) {
                Text("Override")
            }
        }
    }
}

@Composable
fun ScoreKeptScreen(
    entry: VoiceEntry?,
    onContinue: () -> Unit
) {
    if (entry == null) return

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(100.dp)
                .background(Color(0xFF2196F3).copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.Shield,
                contentDescription = "Protected",
                tint = Color(0xFF2196F3),
                modifier = Modifier.size(48.dp)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Score Preserved",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF2196F3)
        )

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = Color(0xFF2196F3).copy(alpha = 0.1f)
            )
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = entry.fullStudentName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF333D79),
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "Current score (${entry.existingScore}) was kept",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF666666),
                    textAlign = TextAlign.Center
                )

                Text(
                    text = "New score (${entry.score}) was discarded",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF999999),
                    textAlign = TextAlign.Center
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "No changes were made to the spreadsheet",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666),
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Continuing in a moment...",
            style = MaterialTheme.typography.bodySmall,
            color = Color(0xFF999999),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun SessionSummaryScreen(
    voiceEntries: List<VoiceEntry>,
    columnName: String,
    onContinueRecording: () -> Unit,
    onFinalValidation: () -> Unit,
    onRemoveEntry: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        Text(
            text = "Recording Summary",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF333D79)
        )

        Text(
            text = "${voiceEntries.size} entries for $columnName",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666)
        )

        Spacer(modifier = Modifier.height(16.dp))

        if (voiceEntries.isEmpty()) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        Icons.Default.MicNone,
                        contentDescription = "No entries",
                        modifier = Modifier.size(64.dp),
                        tint = Color(0xFF999999)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "No entries recorded yet",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color(0xFF999999)
                    )
                    Text(
                        text = "Start recording to add entries",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF999999)
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                itemsIndexed(voiceEntries) { index, entry ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = Color.White
                        ),
                        elevation = CardDefaults.cardElevation(2.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${index + 1}. ${entry.fullStudentName}",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF333D79)
                                )
                                Text(
                                    text = "Score: ${entry.score}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Color(0xFF666666)
                                )
                                Text(
                                    text = "\"${entry.originalRecognition}\"",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF999999),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }

                            IconButton(onClick = { onRemoveEntry(entry.id) }) {
                                Icon(
                                    Icons.Default.Delete,
                                    contentDescription = "Remove",
                                    tint = Color(0xFFD32F2F)
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Action buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onContinueRecording,
                modifier = Modifier.weight(1f)
            ) {
                Icon(
                    Icons.Default.Mic,
                    contentDescription = "Continue",
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Continue")
            }

            Button(
                onClick = onFinalValidation,
                modifier = Modifier.weight(1f),
                enabled = voiceEntries.isNotEmpty()
            ) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = "Done",
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Done")
            }
        }
    }
}

@Composable
fun FinalValidationScreen(
    voiceEntries: List<VoiceEntry>,
    columnName: String,
    onSaveAll: () -> Unit,
    onCancel: () -> Unit,
    sessionComplete: Boolean,
    isSaving: Boolean,
    onDismiss: () -> Unit,
    excelViewModel: ExcelViewModel? = null // 🎯 NEW: Add ExcelViewModel parameter
) {
    val coroutineScope = rememberCoroutineScope()
    var localSaving by remember { mutableStateOf(false) }
    var localSessionComplete by remember { mutableStateOf(false) }

    // Use local state if provided, otherwise use parent state
    val isCurrentlySaving = localSaving || isSaving
    val isCurrentlyComplete = localSessionComplete || sessionComplete

    if (isCurrentlyComplete) {
        // Auto-close after showing success for 2 seconds
        LaunchedEffect(isCurrentlyComplete) {
            delay(2000)
            onDismiss()
        }

        // Show completion screen
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                Icons.Default.CheckCircle,
                contentDescription = "Complete",
                modifier = Modifier.size(80.dp),
                tint = Color(0xFF4CAF50)
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "All Entries Saved!",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF4CAF50)
            )

            Text(
                text = "${voiceEntries.size} entries saved to $columnName",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF666666)
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Closing in a moment...",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF999999),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Close Now")
            }
        }
    } else if (isCurrentlySaving) {
        // Show saving progress screen
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(80.dp),
                color = Color(0xFF4CAF50),
                strokeWidth = 6.dp
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "Saving Entries...",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF333D79)
            )

            Text(
                text = "Please wait while we save ${voiceEntries.size} entries to $columnName",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF666666),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "This may take a few moments...",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF999999),
                textAlign = TextAlign.Center
            )
        }
    } else {
        // Show validation screen
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
        ) {
            Text(
                text = "Final Validation",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF333D79)
            )

            Text(
                text = "Review and save ${voiceEntries.size} entries to $columnName",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF666666)
            )

            Spacer(modifier = Modifier.height(16.dp))

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
                        text = "⚠️ Important",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFFF9800)
                    )
                    Text(
                        text = "Once saved, these scores will be written to the Excel file. Make sure all entries are correct.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF666666)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                itemsIndexed(voiceEntries) { index, entry ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Color.White,
                                RoundedCornerShape(8.dp)
                            )
                            .border(
                                1.dp,
                                Color(0xFFE0E0E0),
                                RoundedCornerShape(8.dp)
                            )
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "${index + 1}. ${entry.fullStudentName}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF333D79),
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            text = entry.score,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF4CAF50)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onCancel,
                    modifier = Modifier.weight(1f),
                    enabled = !isCurrentlySaving
                ) {
                    Text("Back")
                }

                Button(
                    onClick = {
                        // 🎯 NEW: Check if ExcelViewModel is available for direct saving
                        if (excelViewModel != null && voiceEntries.isNotEmpty()) {
                            Log.d("FinalValidationScreen", "🎯 Using ExcelViewModel to save ${voiceEntries.size} entries")
                            localSaving = true

                            coroutineScope.launch {
                                try {
                                    var successCount = 0
                                    var completedCount = 0
                                    val totalEntries = voiceEntries.size

                                    voiceEntries.forEach { entry ->
                                        excelViewModel.updateStudentValue(
                                            studentName = entry.fullStudentName,
                                            columnName = columnName,
                                            value = entry.score
                                        ) { success ->
                                            coroutineScope.launch {
                                                completedCount++
                                                if (success) {
                                                    successCount++
                                                    Log.d("FinalValidationScreen", "✅ Saved: ${entry.fullStudentName} -> ${entry.score}")
                                                } else {
                                                    Log.e("FinalValidationScreen", "❌ Failed: ${entry.fullStudentName} -> ${entry.score}")
                                                }

                                                // Check if all entries are processed
                                                if (completedCount >= totalEntries) {
                                                    Log.d("FinalValidationScreen", "🎯 All entries processed: $successCount/$totalEntries successful")
                                                    localSaving = false
                                                    localSessionComplete = true
                                                }
                                            }
                                        }

                                        // Small delay between saves
                                        delay(200)
                                    }
                                } catch (e: Exception) {
                                    Log.e("FinalValidationScreen", "❌ Exception during save", e)
                                    localSaving = false
                                    localSessionComplete = true
                                }
                            }
                        } else {
                            // Fallback to parent onSaveAll
                            Log.d("FinalValidationScreen", "🎯 Using parent onSaveAll")
                            onSaveAll()
                        }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = !isCurrentlySaving && voiceEntries.isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF4CAF50)
                    )
                ) {
                    Icon(
                        Icons.Default.Save,
                        contentDescription = "Save",
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Save All")
                }
            }
        }
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