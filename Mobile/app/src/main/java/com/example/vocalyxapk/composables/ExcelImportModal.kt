package com.example.vocalyxapk.composables

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.models.ImportStep
import com.example.vocalyxapk.viewmodel.ExcelImportViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExcelImportModal(
    classId: Int,
    className: String,
    onDismiss: () -> Unit,
    onImportComplete: () -> Unit
) {
    val viewModel: ExcelImportViewModel = viewModel()
    val importState by viewModel.importState.collectAsStateWithLifecycle()
    
    // Set class ID for import
    LaunchedEffect(classId) {
        if (classId > 0) {
            viewModel.setClassId(classId)
        }
    }
    
    // File picker launcher
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            viewModel.processSelectedFile(it)
        }
    }
    
    val steps = listOf("File Info", "Preview Data")
    val currentStepIndex = when (importState.currentStep) {
        ImportStep.FILE_INFO -> 0
        ImportStep.PREVIEW_DATA -> 1
    }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxWidth(0.95f),
        title = {
            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(Color(0xFFEEF0F8), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Description,
                            contentDescription = null,
                            tint = Color(0xFF333D79),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            "File Import",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF111827)
                        )
                        Text(
                            "Class: $className",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF6B7280)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Progress indicator matching web version
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    steps.forEachIndexed { index, step ->
                        val isActive = index == currentStepIndex
                        val isCompleted = index < currentStepIndex
                        
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .background(
                                        color = when {
                                            isActive -> Color(0xFF333D79)
                                            isCompleted -> Color(0xFF333D79)
                                            else -> Color(0xFFF3F4F6)
                                        },
                                        shape = CircleShape
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    "${index + 1}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium,
                                    color = when {
                                        isActive || isCompleted -> Color.White
                                        else -> Color(0xFF6B7280)
                                    }
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                step,
                                style = MaterialTheme.typography.bodySmall,
                                color = if (isActive) Color(0xFF333D79) else Color(0xFF6B7280),
                                fontWeight = if (isActive) FontWeight.Medium else FontWeight.Normal
                            )
                        }
                        
                        if (index < steps.size - 1) {
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(2.dp)
                                    .padding(horizontal = 8.dp)
                                    .background(
                                        if (index < currentStepIndex) Color(0xFF333D79) else Color(0xFFE5E7EB)
                                    )
                            )
                        }
                    }
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 400.dp, max = 600.dp)
            ) {
                when (importState.currentStep) {
                    ImportStep.FILE_INFO -> {
                        FileSelectionStep(
                            onSelectFile = { filePickerLauncher.launch("application/*") }
                        )
                    }
                    ImportStep.PREVIEW_DATA -> {
                        PreviewStep(
                            fileName = importState.fileName,
                            previewData = importState.previewData,
                            onNext = { viewModel.nextStep() }
                        )
                    }
                }
            }
        },
        confirmButton = {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Back button (except for first step)
                if (currentStepIndex > 0) {
                    OutlinedButton(
                        onClick = { viewModel.previousStep() },
                        modifier = Modifier.height(48.dp)
                    ) {
                        Icon(
                            Icons.Default.ArrowBack,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Back")
                    }
                }
                
                // Primary action button
                when (importState.currentStep) {
                    ImportStep.FILE_INFO -> {
                        Button(
                            onClick = { filePickerLauncher.launch("application/*") },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF333D79)),
                            modifier = Modifier.height(48.dp)
                        ) {
                            Icon(imageVector = Icons.Default.Upload, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Select File")
                        }
                    }
                    ImportStep.PREVIEW_DATA -> {
                        Button(
                            onClick = { 
                                viewModel.importFile { success ->
                                    if (success) {
                                        onImportComplete()
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF333D79)),
                            modifier = Modifier.height(48.dp),
                            enabled = !importState.isImporting
                        ) {
                            if (importState.isImporting) {
                                CircularProgressIndicator(
                                    color = Color.White,
                                    modifier = Modifier.size(16.dp),
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Importing...")
                            } else {
                                Icon(imageVector = Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Import File")
                            }
                        }
                    }
                }
            }
        },
        dismissButton = {
            OutlinedButton(
                onClick = onDismiss,
                modifier = Modifier.height(48.dp)
            ) {
                Text("Cancel", color = Color(0xFF6B7280))
            }
        }
    )
}

@Composable
private fun FileSelectionStep(onSelectFile: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // Upload area
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .clickable { onSelectFile() },
            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8F9FC)),
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(2.dp, Color(0xFFE0E0E0))
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    Icons.Default.CloudUpload,
                    contentDescription = null,
                    modifier = Modifier.size(56.dp),
                    tint = Color(0xFF333D79)
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    "Upload Excel File",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF333D79)
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    "Drag & drop or click to browse",
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color(0xFF666666)
                )
                
                Text(
                    "Supports .xlsx and .xls files",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF999999)
                )
            }
        }
        
        // Features list
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "What you can import:",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF333D79)
            )
            
            val features = listOf(
                "Student names and IDs",
                "Test scores and grades", 
                "Assignment records",
                "Custom data fields"
            )
            
            features.forEach { feature ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = null,
                        tint = Color(0xFF4CAF50),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        feature,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666)
                    )
                }
            }
        }
    }
}

@Composable
private fun PreviewStep(
    fileName: String,
    previewData: List<List<String>>,
    onNext: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
    ) {
        // File icon and name - matching web design
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF7F9FD)),
                border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.size(80.dp)
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.fillMaxSize()
                ) {
                    Icon(
                        if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) 
                            Icons.Default.Description 
                        else 
                            Icons.Default.Description,
                        contentDescription = null,
                        tint = if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) 
                            Color(0xFF217346) 
                        else 
                            Color(0xFF333D79),
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        fileName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF111827),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xDCF2FD)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            "Excel",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF1D4ED8),
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
                
                // File details
                Row(
                    modifier = Modifier.padding(top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        "Total rows: ${previewData.size}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF6B7280)
                    )
                    Text(
                        "Total columns: ${previewData.firstOrNull()?.size ?: 0}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF6B7280)
                    )
                }
            }
        }
        
        // Mobile-friendly data preview
        if (previewData.isNotEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(2.dp),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Data Preview",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF111827)
                        )
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFEEF0F8)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(
                                "Showing 5 of ${previewData.size} rows",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF333D79),
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Mobile-friendly card layout for data
                    val previewRows = previewData.take(6) // Headers + 5 data rows
                    val headers = if (previewRows.isNotEmpty()) previewRows[0] else emptyList()
                    val dataRows = previewRows.drop(1)
                    
                    LazyColumn(
                        modifier = Modifier.heightIn(max = 300.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(dataRows) { row ->
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFFAFAFA)),
                                border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(12.dp)
                                ) {
                                    row.take(3).forEachIndexed { index, cellValue ->
                                        if (index < headers.size) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Text(
                                                    "Col ${index + 1}: ${headers[index]}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = Color(0xFF6B7280),
                                                    fontWeight = FontWeight.Medium,
                                                    modifier = Modifier.weight(1f)
                                                )
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text(
                                                    cellValue.ifEmpty { "-" },
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = Color(0xFF111827),
                                                    textAlign = TextAlign.End,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis,
                                                    modifier = Modifier.weight(1f)
                                                )
                                            }
                                            if (index < 2 && index < row.size - 1) {
                                                Spacer(modifier = Modifier.height(4.dp))
                                            }
                                        }
                                    }
                                    
                                    if (row.size > 3) {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            "... and ${row.size - 3} more columns",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color(0xFF9CA3AF),
                                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                                        )
                                    }
                                }
                            }
                        }
                    }
                    
                    if (dataRows.size < previewData.size - 1) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF3F4F6)),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Info,
                                    contentDescription = null,
                                    tint = Color(0xFF6B7280),
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "Import the file to see all ${previewData.size} rows",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF6B7280)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
} 