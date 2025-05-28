package com.example.vocalyxapk

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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

class ExcelImportActivity : ComponentActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val classId = intent.getIntExtra("CLASS_ID", -1)
        val className = intent.getStringExtra("CLASS_NAME") ?: "Import Excel"
        
        setContent {
            VOCALYXAPKTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ExcelImportScreen(
                        classId = classId,
                        className = className,
                        onBackPressed = { finish() },
                        onImportComplete = { finish() }
                    )
                }
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
    onImportComplete: () -> Unit,
    viewModel: ExcelImportViewModel = viewModel()
) {
    val importState by viewModel.importState.collectAsStateWithLifecycle()
    val currentStep = importState.currentStep
    
    // Effect to initialize with class ID
    LaunchedEffect(classId) {
        viewModel.setClassId(classId)
    }
    
    // File picker
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            viewModel.processSelectedFile(uri)
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(className) },
                navigationIcon = {
                    IconButton(onClick = onBackPressed) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
        ) {
            // Progress indicator
            LinearProgressIndicator(
                progress = when(currentStep) {
                    ImportStep.FILE_INFO -> 0.5f
                    ImportStep.PREVIEW_DATA -> 1.0f
                    else -> 0f
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp)
            )
            
            // Step title
            Text(
                text = when(currentStep) {
                    ImportStep.FILE_INFO -> "Step 1: File Information"
                    ImportStep.PREVIEW_DATA -> "Step 2: Preview Data"
                    else -> "Import Excel"
                },
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(bottom = 16.dp)
            )
            
            // Step content
            Box(modifier = Modifier.weight(1f)) {
                when(currentStep) {
                    ImportStep.FILE_INFO -> FileInfoStep(
                        fileName = importState.fileName,
                        onSelectFile = { filePickerLauncher.launch("application/*") }
                    )
                    ImportStep.PREVIEW_DATA -> PreviewDataStep(
                        previewData = importState.previewData
                    )
                    else -> Box { /* Handle fallback case */ }
                }
            }
            
            // Navigation buttons
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Button(
                    onClick = { 
                        if (currentStep == ImportStep.FILE_INFO) {
                            onBackPressed()
                        } else {
                            viewModel.previousStep()
                        }
                    },
                    modifier = Modifier.width(120.dp)
                ) {
                    Text(
                        if (currentStep == ImportStep.FILE_INFO) "Cancel" else "Back"
                    )
                }
                
                Button(
                    onClick = { 
                        if (currentStep == ImportStep.PREVIEW_DATA) {
                            viewModel.importFile()
                            onImportComplete()
                        } else {
                            viewModel.nextStep() 
                        }
                    },
                    modifier = Modifier.width(120.dp),
                    enabled = when(currentStep) {
                        ImportStep.FILE_INFO -> importState.fileName.isNotEmpty()
                        ImportStep.PREVIEW_DATA -> true
                        else -> false
                    }
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            if (currentStep == ImportStep.PREVIEW_DATA) "Import" else "Next"
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            if (currentStep == ImportStep.PREVIEW_DATA) 
                                Icons.Default.Check
                            else 
                                Icons.Default.ArrowForward,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
            
            // Skip column mapping option - for testing purposes
            if (currentStep == ImportStep.PREVIEW_DATA) {
                OutlinedButton(
                    onClick = { 
                        viewModel.skipColumnMapping()
                        onImportComplete()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                ) {
                    Text("Import Data")
                }
            }
        }
    }
}
