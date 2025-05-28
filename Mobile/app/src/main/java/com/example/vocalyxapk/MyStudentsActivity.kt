package com.example.vocalyxapk

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.composables.BatchRecordingDialog
import com.example.vocalyxapk.composables.ExcelDataDisplay
import com.example.vocalyxapk.composables.ImportExcelCard
import com.example.vocalyxapk.composables.VoiceRecordingDialog
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme
import com.example.vocalyxapk.viewmodel.ExcelUIState
import com.example.vocalyxapk.viewmodel.ExcelViewModel
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream

class MyStudentsActivity : ComponentActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val classId = intent.getIntExtra("CLASS_ID", -1)
        val className = intent.getStringExtra("CLASS_NAME") ?: "My Students"
        val classSection = intent.getStringExtra("CLASS_SECTION")
        
        setContent {
            VOCALYXAPKTheme {
                StudentsScreen(
                    classId = classId,
                    className = className,
                    classSection = classSection,
                    onBackPressed = { finish() }
                )
            }
        }
    }
}


fun Modifier.dashedBorder(
    color: Color,
    strokeWidth: Dp,
    cornerRadius: Dp,
    dashWidth: Dp,
    dashGap: Dp
) = drawBehind {
    val strokeWidthPx = strokeWidth.toPx()
    val cornerRadiusPx = cornerRadius.toPx()
    val dashWidthPx = dashWidth.toPx()
    val dashGapPx = dashGap.toPx()
    
    val path = Path().apply {
        addRoundRect(
            RoundRect(
                rect = Rect(
                    left = 0f,
                    top = 0f,
                    right = size.width,
                    bottom = size.height
                ),
                cornerRadius = CornerRadius(cornerRadiusPx, cornerRadiusPx)
            )
        )
    }
    
    val pathEffect = PathEffect.dashPathEffect(
        intervals = floatArrayOf(dashWidthPx, dashGapPx),
        phase = 0f
    )
    
    drawPath(
        path = path,
        color = color,
        style = Stroke(
            width = strokeWidthPx,
            pathEffect = pathEffect
        )
    )
}
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentsScreen(
    classId: Int,
    className: String,
    classSection: String?,
    onBackPressed: () -> Unit,
    excelViewModel: ExcelViewModel = viewModel()
) {
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()
    var showDeleteConfirmation by remember { mutableStateOf(false) }
    var excelFileToDelete by remember { mutableStateOf<Int?>(null) }

    var showBatchDialog by remember { mutableStateOf(false) }
    
    // Fetch Excel files when the screen is first displayed
    LaunchedEffect(classId) {
        if (classId > 0) {
            excelViewModel.fetchExcelFiles(classId)
        }
    }
    
    // Get current Excel UI state
    val excelUIState = excelViewModel.excelUIState
    
    // File picker
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            try {
                // Create a temporary file from the URI
                val inputStream = context.contentResolver.openInputStream(uri)
                val tempFile = File.createTempFile("excel_", ".xlsx", context.cacheDir)
                
                inputStream?.use { input ->
                    FileOutputStream(tempFile).use { output ->
                        input.copyTo(output)
                    }
                }
                
                // Upload the file
                excelViewModel.uploadExcelFile(tempFile, classId)
                
                // Show success message
                coroutineScope.launch {
                    snackbarHostState.showSnackbar("Uploading Excel file...")
                }
            } catch (e: Exception) {
                coroutineScope.launch {
                    snackbarHostState.showSnackbar("Error: ${e.message}")
                }
            }
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(className) },
                navigationIcon = {
                    IconButton(onClick = onBackPressed) {
                        Icon(Icons.Rounded.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    // Eye icon for mobile-friendly view
                    IconButton(
                        onClick = {
                            val intent = Intent(context, FriendlyStudentsActivity::class.java).apply {
                                putExtra("CLASS_ID", classId)
                                putExtra("CLASS_NAME", className)
                                putExtra("CLASS_SECTION", classSection)
                            }
                            context.startActivity(intent)
                        }
                    ) {
                        Icon(Icons.Default.Visibility, contentDescription = "Mobile-friendly view")
                    }
                    
                    // Refresh button
                    IconButton(onClick = { excelViewModel.fetchExcelFiles(classId) }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF333D79),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (excelUIState) {
                is ExcelUIState.Loading -> {
                    // Show loading indicator
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF333D79))
                    }
                }
                
                is ExcelUIState.Success -> {
                    // Get the list of Excel files
                    val excelFiles = (excelUIState as ExcelUIState.Success).excelFiles
                    val selectedExcelFile = excelViewModel.selectedExcelFile
                    
                    // Make the entire screen scrollable to allow the table to expand without affecting Class Recordings
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                    ) {
                        // File selector section
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = Color(0xFFF5F7FA)
                            )
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    "Student Records",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                
                                Text(
                                    "${excelFiles.size} file(s) available",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF666666)
                                )
                                
                                Spacer(modifier = Modifier.height(12.dp))
                                
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .horizontalScroll(rememberScrollState()),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    excelFiles.forEach { excelFile ->
                                        Box(
                                            modifier = Modifier.height(32.dp)
                                        ) {
                                            FilterChip(
                                                selected = selectedExcelFile?.id == excelFile.id,
                                                onClick = { excelViewModel.selectExcelFile(excelFile.id) },
                                                label = { Text(excelFile.file_name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                                leadingIcon = if (selectedExcelFile?.id == excelFile.id) {
                                                    { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) }
                                                } else null,
                                            )

                                            IconButton(
                                                onClick = {
                                                    excelFileToDelete = excelFile.id
                                                    showDeleteConfirmation = true
                                                },
                                                modifier = Modifier
                                                    .size(24.dp)
                                                    .align(Alignment.TopEnd)
                                                    .offset(x = 12.dp, y = (-6).dp)
                                                    .alpha(0.7f)
                                            ) {
                                                Icon(
                                                    Icons.Default.Delete,
                                                    contentDescription = "Delete Excel File",
                                                    tint = Color.Red,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                            }
                                        }
                                    }
                                    
                                    // Import new file button
                                    Button(
                                        onClick = {
                                            // Launch the import wizard activity
                                            val intent = Intent(context, ExcelImportActivity::class.java).apply {
                                                putExtra("CLASS_ID", classId)
                                                putExtra("CLASS_NAME", className)
                                            }
                                            context.startActivity(intent)
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF333D79)),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                        modifier = Modifier.height(32.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.Add,
                                            contentDescription = "Import New",
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Import New")
                                    }
                                }
                            }
                        }
                        
                        // Display selected file with fixed height for the table
                        if (selectedExcelFile != null) {
                            // Add a spacer to push content down
                            Spacer(modifier = Modifier.height(8.dp))
                            
                            // Title for student records table
                            Text(
                                text = "Student Records",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )
                            
                            // Make the container for Excel data explicitly tall
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(350.dp) // Fixed height to ensure enough space for multiple rows
                                    .padding(horizontal = 16.dp)
                            ) {
                                ExcelDataDisplay(
                                    excelFile = selectedExcelFile,
                                    sheetData = excelViewModel.getSelectedSheetData(),
                                    selectedSheetName = excelViewModel.selectedSheetName,
                                    onSelectSheet = { excelViewModel.selectSheet(it) },
                                    onDelete = { excelId ->
                                        // Show confirmation dialog
                                        coroutineScope.launch {
                                            val result = snackbarHostState.showSnackbar(
                                                message = "Delete this Excel file?",
                                                actionLabel = "Delete",
                                                duration = SnackbarDuration.Long
                                            )
                                            if (result == SnackbarResult.ActionPerformed) {
                                                // User confirmed deletion
                                                excelViewModel.deleteExcelFile(excelId, classId)
                                            }
                                        }
                                    }
                                )
                            }
                            
                            // Add spacer between student records and recordings section
                            Spacer(modifier = Modifier.height(16.dp))
                        } else if (excelFiles.isNotEmpty()) {
                            // Select a file message
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    "Select a file to view student records",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = Color(0xFF666666),
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                        
                        // Class Recordings section
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 16.dp)
                        ) {
                            // Section title
                            Text(
                                "Class  Recordings",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                /*color = Color(0xFF333D79),*/
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )

                            // Class Recordings section
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp)
                            ) {
                                // Section title
                                /*Text(
                                    "Class Recordings",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF333D79),
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )*/

                                // Recordings container
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(
                                        containerColor = Color(0xFFF5F7FA)
                                    )
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        // State for showing the recording dialog
                                        var showRecordingDialog by remember { mutableStateOf(false) }

                                        // Voice recording illustration
                                        Box(
                                            modifier = Modifier
                                                .size(80.dp)
                                                .dashedBorder(
                                                    color = Color(0xFF9E9E9E),
                                                    strokeWidth = 2.dp,
                                                    cornerRadius = 12.dp,
                                                    dashWidth = 8.dp,
                                                    dashGap = 4.dp
                                                ),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                Icon(
                                                    imageVector = Icons.Default.Mic,
                                                    contentDescription = "Record with voice",
                                                    modifier = Modifier.size(32.dp),
                                                    tint = if (selectedExcelFile != null) Color(0xFF333D79) else Color(0xFF9E9E9E)
                                                )
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Text(
                                                    "Voice Input",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = if (selectedExcelFile != null) Color(0xFF333D79) else Color(0xFF9E9E9E)
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(16.dp))

                                        // Choose recording mode text
                                        Text(
                                            text = if (selectedExcelFile != null)
                                                "Choose your recording mode:"
                                            else
                                                "Select an Excel file first",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = Color(0xFF666666),
                                            modifier = Modifier.padding(bottom = 8.dp)
                                        )

                                        // Side-by-side recording options
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                                        ) {
                                            // Single entry button
                                            FilledTonalButton(
                                                onClick = {
                                                    if (selectedExcelFile != null) {
                                                        showRecordingDialog = true
                                                    } else {
                                                        coroutineScope.launch {
                                                            snackbarHostState.showSnackbar("Please select an Excel file first")
                                                        }
                                                    }
                                                },
                                                colors = ButtonDefaults.filledTonalButtonColors(
                                                    containerColor = Color(0xFFE8F5E9),
                                                    contentColor = Color(0xFF1B5E20)
                                                ),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Mic,
                                                    contentDescription = "Record Single",
                                                    modifier = Modifier.size(18.dp)
                                                )
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text(
                                                    "Single Entry",
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }

                                            Spacer(modifier = Modifier.width(12.dp))

                                            // Batch recording button - more prominent
                                            Button(
                                                onClick = {
                                                    if (selectedExcelFile != null) {
                                                        showBatchDialog = true
                                                    } else {
                                                        coroutineScope.launch {
                                                            snackbarHostState.showSnackbar("Please select an Excel file first")
                                                        }
                                                    }
                                                },
                                                colors = ButtonDefaults.buttonColors(
                                                    containerColor = Color(0xFF333D79)
                                                ),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.List,
                                                    contentDescription = "Batch Recording",
                                                    modifier = Modifier.size(18.dp)
                                                )
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text(
                                                    "Batch Mode",
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                        }

                                        // Add explanatory text
                                        Text(
                                            text = "Use Batch Mode to record multiple student entries at once",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color(0xFF666666),
                                            textAlign = TextAlign.Center,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(top = 8.dp)
                                        )

                                        // Show dialog when activated
                                        if (showRecordingDialog) {
                                            VoiceRecordingDialog(
                                                excelViewModel = excelViewModel,
                                                onDismiss = { showRecordingDialog = false }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                is ExcelUIState.Error -> {
                    // Show error message
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            "Error: ${(excelUIState as ExcelUIState.Error).message}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.Red,
                            textAlign = TextAlign.Center
                        )
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        Button(
                            onClick = { excelViewModel.fetchExcelFiles(classId) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF333D79))
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = "Retry")
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Retry")
                        }
                    }
                }
                
                is ExcelUIState.Empty -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        ImportExcelCard(onImportClick = {
                            val intent = Intent(context, ExcelImportActivity::class.java).apply {
                                putExtra("CLASS_ID", classId)
                                putExtra("CLASS_NAME", className)
                            }
                            context.startActivity(intent)
                        })
                    }
                }
            }
        }
    }

    if (showDeleteConfirmation && excelFileToDelete != null) {
        AlertDialog(
            onDismissRequest = {
                showDeleteConfirmation = false
                excelFileToDelete = null
            },
            title = { Text("Confirm Deletion") },
            text = {
                Text("Are you sure you want to delete this Excel file? This action cannot be undone.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        // Delete the file
                        excelViewModel.deleteExcelFile(excelFileToDelete!!, classId)
                        showDeleteConfirmation = false
                        excelFileToDelete = null
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.Red
                    )
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = {
                        showDeleteConfirmation = false
                        excelFileToDelete = null
                    }
                ) {
                    Text("Cancel")
                }
            }
        )
    }

    if (showBatchDialog) {
        BatchRecordingDialog(
            excelViewModel = excelViewModel,
            onDismiss = { showBatchDialog = false }
        )
    }
}
