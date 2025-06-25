package com.example.vocalyxapk.composables

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.example.vocalyxapk.models.BatchEntryStatus
import com.example.vocalyxapk.models.BatchProcessingState
import com.example.vocalyxapk.models.BatchVoiceEntry
import com.example.vocalyxapk.models.SpeechEngine

@Composable
fun BatchRecordingModeSelector(
    isBatchMode: Boolean,
    onBatchModeToggled: (Boolean) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF0F7FF))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Batch Recording Mode",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF333D79)
                    )
                    Text(
                        text = if (isBatchMode) "Record multiple students at once" else "Record one student at a time",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF666666)
                    )
                }

                Switch(
                    checked = isBatchMode,
                    onCheckedChange = onBatchModeToggled,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Color(0xFF4CAF50),
                        uncheckedThumbColor = Color.White,
                        uncheckedTrackColor = Color(0xFF999999)
                    )
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = if (isBatchMode) {
                    "💡 Say multiple students: \"Capuras 50, John Doe 45, Maria 38\""
                } else {
                    "💡 Say one student: \"Capuras 50\""
                },
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF4CAF50),
                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
            )
        }
    }
}
@Composable
fun BatchEntrySummaryCard(
    batchState: BatchProcessingState,
    onViewDetails: () -> Unit
) {
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
                    text = "Batch Entries",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF333D79)
                )
                TextButton(onClick = onViewDetails) {
                    Text("View All")
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                BatchMiniStat("Total", batchState.totalEntries, Color(0xFF2196F3))
                BatchMiniStat("Valid", batchState.validEntries, Color(0xFF4CAF50))
                BatchMiniStat("Ready", batchState.confirmedEntries, Color(0xFF333D79))
            }

            if (batchState.entries.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Latest: ${batchState.entries.lastOrNull()?.parsedName} - ${batchState.entries.lastOrNull()?.parsedScore}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF666666)
                )
            }
        }
    }
}

@Composable
fun BatchMiniStat(label: String, count: Int, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = count.toString(),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = color.copy(alpha = 0.7f)
        )
    }
}


@Composable
fun BatchListeningScreen(
    selectedEngine: SpeechEngine,
    pulseScale: Float,
    batchState: BatchProcessingState,
    onStopRecording: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Recording indicator
        Box(
            modifier = Modifier.size(200.dp),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .scale(pulseScale)
                    .background(
                        Color(0xFF4CAF50),
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

        Spacer(modifier = Modifier.height(24.dp))

        SoundWaveVisualization(selectedEngine)

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Batch Recording...",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF4CAF50)
        )

        Text(
            text = "Say multiple students and scores",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666),
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Live batch statistics
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            BatchStatChip(
                icon = Icons.Default.Person,
                label = "Entries",
                count = batchState.totalEntries,
                color = Color(0xFF2196F3)
            )
            BatchStatChip(
                icon = Icons.Default.CheckCircle,
                label = "Valid",
                count = batchState.validEntries,
                color = Color(0xFF4CAF50)
            )
            BatchStatChip(
                icon = Icons.Default.Error,
                label = "Invalid",
                count = batchState.invalidEntries,
                color = Color(0xFFFF5722)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Live entries preview
        if (batchState.entries.isNotEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8F9FA))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Live Entries",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF333D79)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    batchState.entries.takeLast(3).forEach { entry ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                if (entry.isValidStudent) Icons.Default.CheckCircle else Icons.Default.Error,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = if (entry.isValidStudent) Color(0xFF4CAF50) else Color(0xFFFF5722)
                            )

                            Text(
                                text = "${entry.parsedName}: ${entry.parsedScore}",
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.weight(1f).padding(start = 8.dp)
                            )

                            Text(
                                text = "${(entry.confidence * 100).toInt()}%",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF666666)
                            )
                        }
                    }

                    if (batchState.entries.size > 3) {
                        Text(
                            text = "... and ${batchState.entries.size - 3} more",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF999999),
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Stop recording button
        OutlinedButton(
            onClick = onStopRecording,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = Color(0xFFFF5722)
            ),
            border = BorderStroke(2.dp, Color(0xFFFF5722))
        ) {
            Icon(Icons.Default.Stop, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Stop Recording")
        }
    }
}

@Composable
fun BatchStatChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    count: Int,
    color: Color
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f))
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = count.toString(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = color.copy(alpha = 0.7f)
            )
        }
    }
}

@Composable
fun BatchValidationScreen(
    batchState: BatchProcessingState,
    columnName: String,
    onEditEntry: (String, String, String) -> Unit,
    onRemoveEntry: (String) -> Unit,
    onConfirmEntry: (String) -> Unit,
    onSaveAll: () -> Unit,
    onCancel: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        // Header
        Text(
            text = "Batch Validation",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF333D79)
        )

        Text(
            text = "Review ${batchState.totalEntries} entries for $columnName",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666)
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Statistics row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            BatchStatChip(Icons.Default.CheckCircle, "Valid", batchState.validEntries, Color(0xFF4CAF50))
            BatchStatChip(Icons.Default.Error, "Invalid", batchState.invalidEntries, Color(0xFFFF5722))
            BatchStatChip(Icons.Default.Done, "Ready", batchState.confirmedEntries, Color(0xFF2196F3))
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Entries list
        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            itemsIndexed(batchState.entries) { index, entry ->
                BatchEntryCard(
                    entry = entry,
                    index = index + 1,
                    onEdit = { name, score -> onEditEntry(entry.id, name, score) },
                    onRemove = { onRemoveEntry(entry.id) },
                    onConfirm = { onConfirmEntry(entry.id) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Action buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onCancel,
                modifier = Modifier.weight(1f)
            ) {
                Text("Cancel")
            }

            Button(
                onClick = onSaveAll,
                modifier = Modifier.weight(1f),
                enabled = batchState.readyToSave,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF4CAF50)
                )
            ) {
                Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Save All (${batchState.confirmedEntries})")
            }
        }
    }
}

@Composable
fun BatchEntryCard(
    entry: BatchVoiceEntry,
    index: Int,
    onEdit: (String, String) -> Unit,
    onRemove: () -> Unit,
    onConfirm: () -> Unit
) {
    var showEditDialog by remember { mutableStateOf(false) }
    var editName by remember { mutableStateOf(entry.parsedName) }
    var editScore by remember { mutableStateOf(entry.parsedScore) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = when (entry.status) {
                BatchEntryStatus.VALIDATED -> Color(0xFF4CAF50).copy(alpha = 0.1f)
                BatchEntryStatus.CONFIRMED -> Color(0xFF2196F3).copy(alpha = 0.1f)
                BatchEntryStatus.EDITED -> Color(0xFFFF9800).copy(alpha = 0.1f)
                BatchEntryStatus.INVALID -> Color(0xFFFF5722).copy(alpha = 0.1f)
                BatchEntryStatus.PENDING -> Color(0xFFF5F5F5)
            }
        ),
        border = BorderStroke(
            width = 2.dp,
            color = when (entry.status) {
                BatchEntryStatus.VALIDATED -> Color(0xFF4CAF50)
                BatchEntryStatus.CONFIRMED -> Color(0xFF2196F3)
                BatchEntryStatus.EDITED -> Color(0xFFFF9800)
                BatchEntryStatus.INVALID -> Color(0xFFFF5722)
                BatchEntryStatus.PENDING -> Color(0xFFE0E0E0)
            }
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Header row with status and actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Entry number and status icon
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "#$index",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF666666),
                        modifier = Modifier
                            .background(
                                Color(0xFFE0E0E0),
                                RoundedCornerShape(12.dp)
                            )
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    )

                    Icon(
                        imageVector = when (entry.status) {
                            BatchEntryStatus.VALIDATED -> Icons.Default.CheckCircle
                            BatchEntryStatus.CONFIRMED -> Icons.Default.Verified
                            BatchEntryStatus.EDITED -> Icons.Default.Edit
                            BatchEntryStatus.INVALID -> Icons.Default.Error
                            BatchEntryStatus.PENDING -> Icons.Default.HourglassEmpty
                        },
                        contentDescription = entry.status.name,
                        tint = when (entry.status) {
                            BatchEntryStatus.VALIDATED -> Color(0xFF4CAF50)
                            BatchEntryStatus.CONFIRMED -> Color(0xFF2196F3)
                            BatchEntryStatus.EDITED -> Color(0xFFFF9800)
                            BatchEntryStatus.INVALID -> Color(0xFFFF5722)
                            BatchEntryStatus.PENDING -> Color(0xFF999999)
                        },
                        modifier = Modifier.size(20.dp)
                    )

                    Text(
                        text = when (entry.status) {
                            BatchEntryStatus.VALIDATED -> "Valid Match"
                            BatchEntryStatus.CONFIRMED -> "Confirmed"
                            BatchEntryStatus.EDITED -> "Edited"
                            BatchEntryStatus.INVALID -> "No Match"
                            BatchEntryStatus.PENDING -> "Pending"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = when (entry.status) {
                            BatchEntryStatus.VALIDATED -> Color(0xFF4CAF50)
                            BatchEntryStatus.CONFIRMED -> Color(0xFF2196F3)
                            BatchEntryStatus.EDITED -> Color(0xFFFF9800)
                            BatchEntryStatus.INVALID -> Color(0xFFFF5722)
                            BatchEntryStatus.PENDING -> Color(0xFF999999)
                        }
                    )
                }

                // Action buttons
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    // Edit button
                    IconButton(
                        onClick = {
                            editName = entry.parsedName
                            editScore = entry.parsedScore
                            showEditDialog = true
                        },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "Edit",
                            tint = Color(0xFF666666),
                            modifier = Modifier.size(16.dp)
                        )
                    }

                    // Remove button
                    IconButton(
                        onClick = onRemove,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "Remove",
                            tint = Color(0xFFFF5722),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Original speech text
            Text(
                text = "🎤 \"${entry.recognizedText}\"",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF666666),
                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Color(0xFFF0F0F0),
                        RoundedCornerShape(8.dp)
                    )
                    .padding(8.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Parsed data
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Student:",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF666666)
                    )
                    Text(
                        text = entry.parsedName,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF333D79)
                    )

                    // Show matched name if different
                    if (entry.matchedStudentName != null && entry.matchedStudentName != entry.parsedName) {
                        Text(
                            text = "→ ${entry.matchedStudentName}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF4CAF50),
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "Score:",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF666666)
                    )
                    Text(
                        text = entry.parsedScore,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF333D79)
                    )
                }
            }

            // Confidence and match info
            if (entry.isValidStudent) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Match Confidence: ${(entry.confidence * 100).toInt()}%",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF4CAF50)
                    )

                    if (entry.status != BatchEntryStatus.CONFIRMED) {
                        TextButton(
                            onClick = onConfirm,
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = Color(0xFF4CAF50)
                            )
                        ) {
                            Icon(
                                Icons.Default.Check,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Confirm", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            } else {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "⚠️ Student not found - please edit or remove",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFFFF5722),
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }

    // Edit dialog
    if (showEditDialog) {
        AlertDialog(
            onDismissRequest = { showEditDialog = false },
            title = {
                Text(
                    text = "Edit Entry #$index",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column {
                    OutlinedTextField(
                        value = editName,
                        onValueChange = { editName = it },
                        label = { Text("Student Name") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = editScore,
                        onValueChange = { editScore = it },
                        label = { Text("Score") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onEdit(editName.trim(), editScore.trim())
                        showEditDialog = false
                    },
                    enabled = editName.isNotBlank() && editScore.isNotBlank()
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showEditDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}