package com.example.vocalyxapk

import android.content.Intent
import com.example.vocalyxapk.composables.ExcelImportModal
import com.example.vocalyxapk.composables.CategorySelectionDialog
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
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
import com.example.vocalyxapk.composables.RecordingCategory
import com.example.vocalyxapk.composables.VoiceRecordingInterface
import kotlinx.coroutines.delay
import android.util.Log

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
    var showImportModal by remember { mutableStateOf(false) }
    var showCategoryDialog by remember { mutableStateOf(false) }
    var showVoiceRecording by remember { mutableStateOf(false) }
    var selectedColumnName by remember { mutableStateOf<String?>(null) }
    var refreshTrigger by remember { mutableStateOf(0) }
    
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
                        Icon(imageVector = Icons.Rounded.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    // Refresh button
                    IconButton(onClick = { excelViewModel.fetchExcelFiles(classId) }) {
                        Icon(imageVector = Icons.Default.Refresh, contentDescription = "Refresh")
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
                                                    { Icon(imageVector = Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) }
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
                                        onClick = { showImportModal = true },
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
                        
                        // Display selected file as card preview
                        if (selectedExcelFile != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            
                            // Excel File Preview Card
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = Color.White
                                ),
                                elevation = CardDefaults.cardElevation(4.dp),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(20.dp)
                                ) {
                                    // Header with file icon and title
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(48.dp)
                                                .background(
                                                    Color(0xFF333D79).copy(alpha = 0.1f),
                                                    shape = RoundedCornerShape(12.dp)
                                                ),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                Icons.Default.List,
                                                contentDescription = null,
                                                tint = Color(0xFF333D79),
                                                modifier = Modifier.size(24.dp)
                                            )
                                        }
                                        
                                        Spacer(modifier = Modifier.width(16.dp))
                                        
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = selectedExcelFile.file_name,
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFF333D79),
                                                maxLines = 2,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = "Imported Excel File",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = Color(0xFF666666)
                                            )
                                        }
                                    }
                                    
                                    Spacer(modifier = Modifier.height(20.dp))
                                    
                                    // File statistics
                                    val sheetData = remember(refreshTrigger) { excelViewModel.getSelectedSheetData() }
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                                    ) {
                                        // Rows count
                                        Card(
                                            modifier = Modifier.weight(1f),
                                            colors = CardDefaults.cardColors(
                                                containerColor = Color(0xFFF0F9FF)
                                            ),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(16.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Text(
                                                    text = "${sheetData?.size ?: 0}",
                                                    style = MaterialTheme.typography.titleLarge,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color(0xFF333D79)
                                                )
                                                Text(
                                                    text = "Rows",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = Color(0xFF666666)
                                                )
                                            }
                                        }
                                        
                                        // Columns count
                                        Card(
                                            modifier = Modifier.weight(1f),
                                            colors = CardDefaults.cardColors(
                                                containerColor = Color(0xFFF0FDF4)
                                            ),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(16.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Text(
                                                    text = "${sheetData?.firstOrNull()?.size ?: 0}",
                                                    style = MaterialTheme.typography.titleLarge,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color(0xFF16A34A)
                                                )
                                                Text(
                                                    text = "Columns",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = Color(0xFF666666)
                                                )
                                            }
                                        }
                                    }
                                    
                                    Spacer(modifier = Modifier.height(16.dp))
                                    
                                    // Action button to view full data
                                    Button(
                                        onClick = {
                                            // Ensure the selected Excel file is maintained
                                            if (selectedExcelFile != null) {
                                                val intent = Intent(context, StudentListActivity::class.java).apply {
                                                    putExtra("CLASS_ID", classId)
                                                    putExtra("CLASS_NAME", className)
                                                    putExtra("CLASS_SECTION", classSection)
                                                    // Pass the selected Excel file ID to ensure it's selected in the target activity
                                                    putExtra("SELECTED_EXCEL_FILE_ID", selectedExcelFile.id)
                                                }
                                                context.startActivity(intent)
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = Color(0xFF333D79)
                                        ),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.List,
                                            contentDescription = null,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("View Student List")
                                    }
                                }
                            }
                            
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
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = Color.White
                            ),
                            elevation = CardDefaults.cardElevation(4.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                // Header content
                                Column(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = "Class Recordings",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF333D79),
                                        textAlign = TextAlign.Center
                                    )
                                    
                                    Spacer(modifier = Modifier.height(4.dp))
                                    
                                    Text(
                                        text = if (selectedExcelFile != null)
                                            "Record grades using voice commands"
                                        else
                                            "Select an Excel file first",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color(0xFF666666),
                                        textAlign = TextAlign.Center
                                    )
                                }

                                Spacer(modifier = Modifier.height(16.dp))

                                // Start Recording button
                                Button(
                                    onClick = {
                                        if (selectedExcelFile != null) {
                                            showCategoryDialog = true
                                        } else {
                                            coroutineScope.launch {
                                                snackbarHostState.showSnackbar("Please select an Excel file first")
                                            }
                                        }
                                    },
                                    enabled = selectedExcelFile != null,
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFF333D79),
                                        disabledContainerColor = Color(0xFF9E9E9E)
                                    ),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Mic,
                                        contentDescription = "Start Recording",
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        "Start Recording",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium
                                    )
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
                            Icon(imageVector = Icons.Default.Refresh, contentDescription = "Retry")
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
                        ImportExcelCard(onImportClick = { showImportModal = true })
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
    
    if (showImportModal) {
        ExcelImportModal(
            classId = classId,
            className = className,
            onDismiss = { showImportModal = false },
            onImportComplete = {
                showImportModal = false
                excelViewModel.fetchExcelFiles(classId)
            }
        )
    }

    if (showCategoryDialog) {
        CategorySelectionDialog(
            excelViewModel = excelViewModel,
            onDismiss = { showCategoryDialog = false },
            onCategorySelected = { category, subcategory ->
                Log.d("MyStudentsActivity", "=== CATEGORY SELECTED ===")
                Log.d("MyStudentsActivity", "Category: ${category.displayName}")
                Log.d("MyStudentsActivity", "Subcategory: $subcategory")
                
                showCategoryDialog = false
                
                if (subcategory != null) {
                    // User selected an existing column
                    Log.d("MyStudentsActivity", "User selected existing column: $subcategory")
                    selectedColumnName = subcategory
                    showVoiceRecording = true
                } else {
                    // User wants to create a new column
                    Log.d("MyStudentsActivity", "User wants to create new column for category: ${category.displayName}")
                    
                    val newColumnName = when (category) {
                        RecordingCategory.QUIZ -> {
                            Log.d("MyStudentsActivity", "Processing QUIZ category")
                            // Find existing quiz columns and get next number
                            val headers = excelViewModel.getColumnNames()
                            Log.d("MyStudentsActivity", "Current headers for QUIZ: $headers")
                            val quizColumns = headers.filter { it.contains("quiz", ignoreCase = true) }
                            Log.d("MyStudentsActivity", "Found quiz columns: $quizColumns")
                            val maxNumber = quizColumns.mapNotNull { column ->
                                val numberRegex = "\\d+".toRegex()
                                numberRegex.find(column)?.value?.toIntOrNull()
                            }.maxOrNull() ?: 0
                            Log.d("MyStudentsActivity", "Max quiz number: $maxNumber")
                            "Quiz ${maxNumber + 1}"
                        }
                        RecordingCategory.LAB -> {
                            Log.d("MyStudentsActivity", "Processing LAB category")
                            // Find existing lab columns and get next number
                            val headers = excelViewModel.getColumnNames()
                            Log.d("MyStudentsActivity", "Current headers for LAB: $headers")
                            val labColumns = headers.filter { 
                                it.contains("lab", ignoreCase = true) || 
                                it.contains("laboratory", ignoreCase = true) 
                            }
                            Log.d("MyStudentsActivity", "Found lab columns: $labColumns")
                            val maxNumber = labColumns.mapNotNull { column ->
                                val numberRegex = "\\d+".toRegex()
                                numberRegex.find(column)?.value?.toIntOrNull()
                            }.maxOrNull() ?: 0
                            Log.d("MyStudentsActivity", "Max lab number: $maxNumber")
                            "Lab ${maxNumber + 1}"
                        }
                        RecordingCategory.EXAM -> {
                            Log.d("MyStudentsActivity", "Processing EXAM category")
                            // For exams, use predefined sequence
                            val headers = excelViewModel.getColumnNames()
                            Log.d("MyStudentsActivity", "Current headers for EXAM: $headers")
                            val examTypes = listOf("Prelim Exam", "Midterm Exam", "Prefinal Exam", "Final Exam")
                            Log.d("MyStudentsActivity", "Checking exam types: $examTypes")
                            
                            examTypes.forEach { examType ->
                                val exists = headers.any { it.contains(examType, ignoreCase = true) }
                                Log.d("MyStudentsActivity", "Exam type '$examType' exists: $exists")
                            }
                            
                            val selectedExamType = examTypes.firstOrNull { examType -> 
                                val exists = headers.any { it.contains(examType, ignoreCase = true) }
                                !exists
                            } ?: "Final Exam"
                            Log.d("MyStudentsActivity", "Selected exam type: $selectedExamType")
                            Log.d("MyStudentsActivity", "Current headers: $headers")
                            selectedExamType
                        }
                    }
                    
                    Log.d("MyStudentsActivity", "Final column name determined: $newColumnName")
                    
                    // Create the new column first
                    Log.d("MyStudentsActivity", "Creating new column: $newColumnName")
                    excelViewModel.addColumnToExcelFile(newColumnName)
                    
                    // Set the column name and start voice recording
                    selectedColumnName = newColumnName
                    showVoiceRecording = true
                    
                    Log.d("MyStudentsActivity", "Column creation complete, starting voice recording with column: $selectedColumnName")
                }
            }
        )
    }

    if (showVoiceRecording && selectedColumnName != null) {
        VoiceRecordingInterface(
            excelViewModel = excelViewModel,
            columnName = selectedColumnName!!,
            onDismiss = { 
                showVoiceRecording = false 
                selectedColumnName = null
            },
            onSaveCompleted = { savedCount ->
                // Refresh the Excel data to show updated scores
                coroutineScope.launch {
                    // Show success message
                    snackbarHostState.showSnackbar("Successfully saved $savedCount entries")
                    
                    // Force immediate refresh of data from backend
                    Log.d("MyStudentsActivity", "Voice recording completed, refreshing data...")
                    excelViewModel.fetchExcelFiles(classId)
                    
                    // Wait a moment for the fetch to complete, then force UI refresh
                    delay(1000)
                    refreshTrigger++
                    Log.d("MyStudentsActivity", "UI refresh triggered: $refreshTrigger")
                    
                    // Additional refresh after another delay to ensure consistency
                    delay(2000)
                    excelViewModel.fetchExcelFiles(classId)
                    refreshTrigger++
                    Log.d("MyStudentsActivity", "Secondary UI refresh triggered: $refreshTrigger")
                }
            }
        )
    }
}
