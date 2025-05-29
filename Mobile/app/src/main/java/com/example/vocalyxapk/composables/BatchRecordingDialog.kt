package com.example.vocalyxapk.composables

import android.Manifest
import android.content.Context
import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.example.vocalyxapk.models.BatchEntry
import com.example.vocalyxapk.utils.AudioRecorder
import com.example.vocalyxapk.viewmodel.ExcelViewModel
import kotlinx.coroutines.launch

@Composable
fun BatchRecordingDialog(
    excelViewModel: ExcelViewModel,
    onDismiss: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    var showConfirmExit by remember { mutableStateOf(false) }
    var processingEntries by remember { mutableStateOf(false) }
    var processingProgress by remember { mutableStateOf(0) }
    var processingTotal by remember { mutableStateOf(0) }
    var operationComplete by remember { mutableStateOf(false) }
    var successCount by remember { mutableStateOf(0) }
    var failureCount by remember { mutableStateOf(0) }
    var selectedColumn by remember { mutableStateOf<String?>(null) }

    // Column selection step
    var showColumnSelection by remember { mutableStateOf(true) }

    // Get columns
    val columns = excelViewModel.getColumnNames()

    Dialog(
        onDismissRequest = {
            // Don't dismiss if entries are being processed
            if (!processingEntries) {
                if (excelViewModel.batchEntries.isNotEmpty() && !operationComplete) {
                    showConfirmExit = true
                } else {
                    excelViewModel.stopBatchMode()
                    onDismiss()
                }
            }
        }
    ) {
        Surface(
            shape = MaterialTheme.shapes.large,
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 8.dp,
            shadowElevation = 8.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            if (showConfirmExit) {
                // Exit confirmation dialog
                AlertDialog(
                    onDismissRequest = { showConfirmExit = false },
                    title = { Text("Discard Batch?") },
                    text = { Text("You have unsaved entries. Are you sure you want to exit?") },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                excelViewModel.stopBatchMode()
                                showConfirmExit = false
                                onDismiss()
                            }
                        ) {
                            Text("Yes, Discard")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showConfirmExit = false }) {
                            Text("No, Keep Editing")
                        }
                    }
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Dialog title
                Text(
                    "Batch Recording Mode",
                    style = MaterialTheme.typography.titleLarge,
                    color = Color(0xFF333D79)
                )

                Spacer(modifier = Modifier.height(16.dp))

                if (showColumnSelection) {
                    // Column selection UI
                    Text(
                        "Select a column for all batch entries:",
                        style = MaterialTheme.typography.bodyMedium
                    )

                    Spacer(modifier = Modifier.height(8.dp))

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
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            if (selectedColumn != null) {
                                excelViewModel.startBatchMode(selectedColumn!!)
                                showColumnSelection = false
                            }
                        },
                        enabled = selectedColumn != null,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Start Batch Recording")
                    }
                } else if (processingEntries) {
                    // Processing UI
                    CircularProgressIndicator(
                        modifier = Modifier.size(64.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        "Processing entries...",
                        style = MaterialTheme.typography.bodyLarge
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    LinearProgressIndicator(
                        progress = { processingProgress.toFloat() / processingTotal.toFloat() },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Text(
                        "$processingProgress of $processingTotal entries",
                        style = MaterialTheme.typography.bodyMedium,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                } else if (operationComplete) {
                    // Completion UI
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = Color(0xFF4CAF50)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        "Batch Processing Complete",
                        style = MaterialTheme.typography.headlineSmall
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        "Successfully updated: $successCount\nFailed updates: $failureCount",
                        style = MaterialTheme.typography.bodyLarge,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = {
                            onDismiss()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Close")
                    }
                } else {
                    // Batch recording UI
                    BatchRecordingContent(
                        excelViewModel = excelViewModel,
                        selectedColumn = selectedColumn ?: "",
                        onFinishBatch = {
                            processingEntries = true
                            excelViewModel.processAllBatchEntries(
                                onProgress = { progress, total ->
                                    processingProgress = progress
                                    processingTotal = total
                                },
                                onComplete = { success, failure ->
                                    processingEntries = false
                                    operationComplete = true
                                    successCount = success
                                    failureCount = failure
                                }
                            )
                        },
                        onCancel = {
                            showConfirmExit = true
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun BatchRecordingContent(
    excelViewModel: ExcelViewModel,
    selectedColumn: String,
    onFinishBatch: () -> Unit,
    onCancel: () -> Unit
) {
    // Add state for recording
    var isRecording by remember { mutableStateOf(false) }
    var recognizedText by remember { mutableStateOf("") }
    var isProcessingAudio by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val audioRecorder = remember { AudioRecorder(context) }

    val batchEntries = excelViewModel.batchEntries
    val batchSummary = excelViewModel.getBatchSummary()

    Column(modifier = Modifier.fillMaxWidth()) {
        // Selected column info
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFF5F7FA))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    "Recording for: $selectedColumn",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    "Record multiple entries one after another. Each entry will be queued for review before saving.",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Recording button
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center
        ) {
            RecordButton(
                isRecording = isRecording,
                isProcessing = isProcessingAudio,
                onStartRecording = {
                    recognizedText = ""
                    isRecording = true
                    errorMessage = null

                    val success = audioRecorder.startRecording()
                    if (!success) {
                        isRecording = false
                        errorMessage = "Failed to start recording"
                    }
                },
                onStopRecording = {
                    isRecording = false
                    isProcessingAudio = true

                    coroutineScope.launch {
                        try {
                            val audioBytes = audioRecorder.stopRecording()
                            if (audioBytes != null && audioBytes.isNotEmpty()) {
                                val result = excelViewModel.performAdvancedSpeechRecognition(audioBytes)

                                result.fold(
                                    onSuccess = { text ->
                                        recognizedText = text
                                        if (text.isNotBlank()) {
                                            excelViewModel.addBatchEntry(text)
                                        }
                                    },
                                    onFailure = { error ->
                                        errorMessage = "Recognition failed: ${error.message}"
                                    }
                                )
                            } else {
                                errorMessage = "No audio captured"
                            }
                        } catch (e: Exception) {
                            errorMessage = "Error: ${e.message}"
                        } finally {
                            isProcessingAudio = false
                        }
                    }
                }
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Recognized text
        if (recognizedText.isNotBlank()) {
            Text(
                "Last recognized: \"$recognizedText\"",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }

        // Error message
        if (errorMessage != null) {
            Text(
                errorMessage!!,
                color = Color.Red,
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Batch entries list
        if (batchEntries.isEmpty()) {
            EmptyBatchState()
        } else {
            // Batch summary
            BatchSummary(batchSummary)

            Spacer(modifier = Modifier.height(8.dp))

            // List of entries
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 250.dp)
            ) {
                items(batchEntries, key = { it.id }) { entry ->
                    BatchEntryItem(
                        entry = entry,
                        onConfirm = { useSuggested ->
                            excelViewModel.confirmBatchEntry(entry.id, useSuggested)
                        },
                        onEdit = { studentName, value ->
                            excelViewModel.updateBatchEntry(entry.id, studentName, value)
                        },
                        onRemove = {
                            excelViewModel.removeBatchEntry(entry.id)
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                OutlinedButton(
                    onClick = onCancel
                ) {
                    Text("Cancel")
                }

                Button(
                    onClick = onFinishBatch,
                    enabled = batchEntries.isNotEmpty() &&
                            batchEntries.all { it.confirmed || it.suggestedName == null }
                ) {
                    Text("Process All (${batchEntries.size})")
                }
            }
        }
    }
}

@Composable
fun RecordButton(
    isRecording: Boolean,
    isProcessing: Boolean,
    onStartRecording: () -> Unit,
    onStopRecording: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(80.dp)
            .clip(CircleShape)
            .background(
                if (isRecording) Color.Red else Color(0xFF333D79)
            )
            .clickable {
                if (!isProcessing) {
                    if (isRecording) onStopRecording() else onStartRecording()
                }
            },
        contentAlignment = Alignment.Center
    ) {
        if (isProcessing) {
            CircularProgressIndicator(
                modifier = Modifier.size(40.dp),
                color = Color.White,
                strokeWidth = 2.dp
            )
        } else {
            Icon(
                imageVector = if (isRecording) Icons.Default.Stop else Icons.Default.Mic,
                contentDescription = if (isRecording) "Stop Recording" else "Start Recording",
                tint = Color.White,
                modifier = Modifier.size(36.dp)
            )
        }
    }
}

@Composable
fun BatchEntryItem(
    entry: BatchEntry,
    onConfirm: (Boolean) -> Unit,
    onEdit: (String, String) -> Unit,
    onRemove: () -> Unit
) {
    var showEditDialog by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (entry.confirmed) Color(0xFFE8F5E9) else Color(0xFFFFFDE7)
        )
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Original recognized text
            Text(
                "\"${entry.originalText}\"",
                style = MaterialTheme.typography.bodySmall,
                color = Color.Gray,
                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
            )

            Spacer(modifier = Modifier.height(4.dp))

            // Student and value
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "Student: ${entry.studentName}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )

                    Text(
                        "Value: ${entry.value}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                // Actions
                Row {
                    IconButton(onClick = { showEditDialog = true }) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit")
                    }

                    IconButton(onClick = onRemove) {
                        Icon(Icons.Default.Delete, contentDescription = "Remove")
                    }
                }
            }

            // Suggested name UI
            if (!entry.confirmed && entry.suggestedName != null && entry.suggestedName != entry.studentName) {
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Suggested: ${entry.suggestedName}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF1976D2)
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    TextButton(onClick = { onConfirm(true) }) {
                        Text("Use This")
                    }

                    TextButton(onClick = { onConfirm(false) }) {
                        Text("Keep Original")
                    }
                }
            }
        }
    }

    if (showEditDialog) {
        EditBatchEntryDialog(
            entry = entry,
            onConfirm = { studentName, value ->
                onEdit(studentName, value)
                showEditDialog = false
            },
            onDismiss = { showEditDialog = false }
        )
    }
}

@Composable
fun EditBatchEntryDialog(
    entry: BatchEntry,
    onConfirm: (String, String) -> Unit,
    onDismiss: () -> Unit
) {
    var studentName by remember { mutableStateOf(entry.studentName) }
    var value by remember { mutableStateOf(entry.value) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit Entry") },
        text = {
            Column {
                TextField(
                    value = studentName,
                    onValueChange = { studentName = it },
                    label = { Text("Student Name") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                TextField(
                    value = value,
                    onValueChange = { value = it },
                    label = { Text("Value") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(studentName, value) }
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
fun BatchSummary(summary: Map<String, Int>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFE3F2FD))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "${summary["total"] ?: 0}",
                    style = MaterialTheme.typography.titleMedium
                )
                Text("Total", style = MaterialTheme.typography.bodySmall)
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "${summary["confirmed"] ?: 0}",
                    style = MaterialTheme.typography.titleMedium
                )
                Text("Confirmed", style = MaterialTheme.typography.bodySmall)
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "${summary["needsReview"] ?: 0}",
                    style = MaterialTheme.typography.titleMedium
                )
                Text("Need Review", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
fun EmptyBatchState() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.Default.Mic,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = Color.Gray
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                "Tap the mic button to record your first entry",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.Gray,
                textAlign = TextAlign.Center
            )
        }
    }
}