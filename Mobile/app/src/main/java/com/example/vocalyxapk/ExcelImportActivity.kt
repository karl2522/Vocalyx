package com.example.vocalyxapk

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.vocalyxapk.composables.FileInfoStep
import com.example.vocalyxapk.composables.MapColumnsStep
import com.example.vocalyxapk.composables.PreviewDataStep
import com.example.vocalyxapk.models.ImportStep
import com.example.vocalyxapk.models.ExcelImportState
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme
import com.example.vocalyxapk.viewmodel.ExcelImportViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ExcelImportActivity : ComponentActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val classId = intent.getIntExtra("CLASS_ID", -1)
        val className = intent.getStringExtra("CLASS_NAME") ?: "Class"
        
        setContent {
            VOCALYXAPKTheme {
                ExcelImportScreen(
                    classId = classId,
                    className = className,
                    onBackPressed = { finish() },
                    onImportComplete = {
                        setResult(RESULT_OK)
                        finish()
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExcelImportScreen(
    classId: Int,
    className: String,
    onBackPressed: () -> Unit,
    onImportComplete: () -> Unit
) {
    val viewModel: ExcelImportViewModel = viewModel()
    val importState by viewModel.importState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    
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
    
    // If no file is selected on first launch, open file picker automatically
    LaunchedEffect(Unit) {
        if (importState.fileName.isEmpty()) {
            filePickerLauncher.launch("application/*")
        }
    }
    
    val currentStep = importState.currentStep
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Import Data",
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = className,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackPressed) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    // Help button
                    IconButton(onClick = { /* Show help info */ }) {
                        Icon(
                            Icons.Default.Help,
                            contentDescription = "Help"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF333D79),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Progress indicator
            LinearProgressIndicator(
                progress = when(currentStep) {
                    ImportStep.FILE_INFO -> 0.33f
                    ImportStep.PREVIEW_DATA -> 0.66f
                    else -> 1f
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            )
            
            // Step indicators
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                StepIndicator(
                    title = "File Info",
                    isActive = currentStep == ImportStep.FILE_INFO,
                    isCompleted = currentStep.ordinal > ImportStep.FILE_INFO.ordinal
                )
                
                StepIndicator(
                    title = "Preview Data",
                    isActive = currentStep == ImportStep.PREVIEW_DATA,
                    isCompleted = currentStep.ordinal > ImportStep.PREVIEW_DATA.ordinal
                )
                
                StepIndicator(
                    title = "Map Columns",
                    isActive = currentStep.ordinal > ImportStep.PREVIEW_DATA.ordinal,
                    isCompleted = false
                )
            }
            
            // Step content
            Box(modifier = Modifier.weight(1f)) {
                when(currentStep) {
                    ImportStep.FILE_INFO -> {
                        // Extract file size and date if available
                        val fileSize = ""
                        val fileDate = if (importState.fileName.isNotEmpty()) {
                            SimpleDateFormat("MMM dd, yyyy", Locale.getDefault()).format(Date())
                        } else {
                            ""
                        }
                        
                        FileInfoStep(
                            fileName = importState.fileName,
                            fileSize = fileSize,
                            fileDate = fileDate,
                            onSelectFile = { filePickerLauncher.launch("application/*") }
                        )
                    }
                    ImportStep.PREVIEW_DATA -> {
                        PreviewDataStep(
                            previewData = importState.previewData,
                            // Detect name column (first column with "name" in it)
                            detectedNameColumn = importState.allColumns.indexOfFirst { 
                                it.contains("name", ignoreCase = true) 
                            },
                            // Detect ID column (first column with "id" or "no" in it)
                            detectedIdColumn = importState.allColumns.indexOfFirst { 
                                it.contains("id", ignoreCase = true) || it.contains("no", ignoreCase = true)
                            }
                        )
                    }
                    else -> {
                        MapColumnsStep(
                            allColumns = importState.allColumns,
                            columnMappings = importState.columnMappings,
                            onMapColumn = { field, column ->
                                viewModel.mapColumn(field, column)
                            },
                            selectedTemplate = importState.selectedTemplate,
                            onSelectTemplate = { template ->
                                viewModel.selectTemplate(template)
                            }
                        )
                    }
                }
            }
            
            // Navigation buttons
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Back/Cancel button
                Button(
                    onClick = { 
                        if (currentStep == ImportStep.FILE_INFO) {
                            onBackPressed()
                        } else {
                            viewModel.previousStep()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF666666)
                    ),
                    modifier = Modifier.width(120.dp)
                ) {
                    Text(
                        if (currentStep == ImportStep.FILE_INFO) "Cancel" else "Back"
                    )
                }
                
                // Next/Import button
                Button(
                    onClick = { 
                        if (currentStep.ordinal > ImportStep.PREVIEW_DATA.ordinal) {
                            viewModel.importFile()
                            onImportComplete()
                        } else {
                            viewModel.nextStep() 
                        }
                    },
                    modifier = Modifier.width(150.dp),
                    enabled = when(currentStep) {
                        ImportStep.FILE_INFO -> importState.fileName.isNotEmpty()
                        ImportStep.PREVIEW_DATA -> true
                        else -> importState.columnMappings.isNotEmpty()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF333D79)
                    )
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            if (currentStep.ordinal > ImportStep.PREVIEW_DATA.ordinal) "Import Data" else "Continue"
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            if (currentStep.ordinal > ImportStep.PREVIEW_DATA.ordinal) 
                                Icons.Default.Check
                            else 
                                Icons.Default.ArrowForward,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun StepIndicator(
    title: String,
    isActive: Boolean,
    isCompleted: Boolean
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Step circle
        Box(
            modifier = Modifier
                .size(32.dp)
                .padding(4.dp),
            contentAlignment = Alignment.Center
        ) {
            Surface(
                shape = ShapeDefaults.Small,
                color = when {
                    isActive -> Color(0xFF333D79)
                    isCompleted -> Color(0xFF4CAF50)
                    else -> Color(0xFFE0E0E0)
                },
                modifier = Modifier.fillMaxSize()
            ) {
                Box(contentAlignment = Alignment.Center) {
                    if (isCompleted) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    } else {
                        // Show number
                        Text(
                            text = when (title) {
                                "File Info" -> "1"
                                "Preview Data" -> "2"
                                else -> "3"
                            },
                            color = if (isActive) Color.White else Color(0xFF757575),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }
        
        // Step title
        Text(
            text = title,
            style = MaterialTheme.typography.bodySmall,
            color = if (isActive) Color(0xFF333D79) else Color(0xFF757575),
            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal
        )
    }
}
