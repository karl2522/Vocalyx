package com.example.vocalyxapk

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.composables.VoiceRecordingDialog
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme
import com.example.vocalyxapk.viewmodel.ExcelUIState
import com.example.vocalyxapk.viewmodel.ExcelViewModel
import kotlinx.coroutines.launch

class FriendlyStudentsActivity : ComponentActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val classId = intent.getIntExtra("CLASS_ID", -1)
        val className = intent.getStringExtra("CLASS_NAME") ?: "My Students"
        val classSection = intent.getStringExtra("CLASS_SECTION")
        
        setContent {
            VOCALYXAPKTheme {
                FriendlyStudentsScreen(
                    classId = classId,
                    className = className,
                    classSection = classSection,
                    onBackPressed = { finish() }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendlyStudentsScreen(
    classId: Int,
    className: String,
    classSection: String?,
    onBackPressed: () -> Unit,
    excelViewModel: ExcelViewModel = viewModel()
) {
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()
    
    // State variables
    var searchQuery by remember { mutableStateOf("") }
    var selectedNameColumn by remember { mutableStateOf<String?>(null) }
    var showFileSelectionDialog by remember { mutableStateOf(false) }
    var showStudentDetailDialog by remember { mutableStateOf(false) }
    var selectedStudentForDetail by remember { mutableStateOf<Map<String, String>?>(null) }
    var showColumnSelectionDialog by remember { mutableStateOf(false) }
    var selectedStudentForVoice by remember { mutableStateOf<Map<String, String>?>(null) }
    var selectedColumnForVoice by remember { mutableStateOf<String?>(null) }
    var showVoiceRecordingDialog by remember { mutableStateOf(false) }
    
    // Fetch Excel files when the screen is first displayed
    LaunchedEffect(classId) {
        if (classId > 0) {
            excelViewModel.fetchExcelFiles(classId)
        }
    }
    
    // Get current Excel UI state
    val excelUIState = excelViewModel.excelUIState
    
    // Main screen scaffold
    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text(className)
                        if (classSection != null) {
                            Text(
                                classSection,
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackPressed) {
                        Icon(Icons.Rounded.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    // File selection button
                    IconButton(
                        onClick = { showFileSelectionDialog = true }
                    ) {
                        Icon(Icons.Default.Description, contentDescription = "Select Excel file")
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
                .background(Color(0xFFF8F9FC))
        ) {
            when (excelUIState) {
                is ExcelUIState.Loading -> {
                    // Show loading indicator
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF333D79))
                    }
                }
                
                is ExcelUIState.Success -> {
                    val excelFiles = (excelUIState as ExcelUIState.Success).excelFiles
                    val selectedExcelFile = excelViewModel.selectedExcelFile
                    
                    if (selectedExcelFile == null && excelFiles.isNotEmpty()) {
                        // Auto-select the first file if none is selected
                        LaunchedEffect(excelFiles) {
                            excelViewModel.selectExcelFile(excelFiles.first().id)
                        }
                    }
                    
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp)
                    ) {
                        // Student List title with Voice Input badge
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 16.dp, bottom = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Student List",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF333D79),
                                modifier = Modifier.weight(1f)
                            )
                            
                            // Voice Input badge - matching the reference image
                            Surface(
                                color = Color(0xFFB0BEC5).copy(alpha = 0.5f), // Light blue/gray color with transparency
                                shape = RoundedCornerShape(50.dp), // More rounded corners
                                modifier = Modifier.padding(end = 4.dp)
                            ) {
                                Text(
                                    "Voice Input",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFF333D79),  // Using the app's primary blue color
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                                )
                            }
                        }
                        
                        // Search bar
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            placeholder = { Text("Student List") },
                            leadingIcon = { 
                                Icon(
                                    Icons.Default.Search, 
                                    contentDescription = "Search",
                                    tint = Color.Gray
                                ) 
                            },
                            trailingIcon = {
                                if (searchQuery.isNotEmpty()) {
                                    IconButton(onClick = { searchQuery = "" }) {
                                        Icon(
                                            Icons.Default.Clear,
                                            contentDescription = "Clear search"
                                        )
                                    }
                                }
                            },
                            shape = RoundedCornerShape(50.dp),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                            keyboardActions = KeyboardActions(onSearch = {
                                // Handle search
                            }),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFF333D79),
                                unfocusedBorderColor = Color.LightGray,
                                focusedContainerColor = Color.White,
                                unfocusedContainerColor = Color.White
                            )
                        )
                        
                        if (selectedExcelFile != null) {
                            val sheetData = excelViewModel.getSelectedSheetDataAsMap()
                            val headers = sheetData["headers"] as? List<String> ?: emptyList()
                            val data = sheetData["data"] as? List<Map<String, String>> ?: emptyList()
                            
                            // Find the name column
                            val nameColumn = headers.find { 
                                it.contains("name", ignoreCase = true) || 
                                it.contains("student", ignoreCase = true) 
                            }
                            
                            if (nameColumn == null && selectedNameColumn == null) {
                                // No name column found, show confirmation dialog
                                Box(
                                    modifier = Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth(0.9f)
                                            .padding(16.dp),
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .padding(16.dp)
                                                .fillMaxWidth(),
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            Icon(
                                                Icons.Default.Warning,
                                                contentDescription = null,
                                                tint = Color(0xFFFF8F00),
                                                modifier = Modifier.size(48.dp)
                                            )
                                            
                                            Spacer(modifier = Modifier.height(16.dp))
                                            
                                            Text(
                                                "No Name Column Detected",
                                                style = MaterialTheme.typography.titleLarge,
                                                fontWeight = FontWeight.Bold
                                            )
                                            
                                            Spacer(modifier = Modifier.height(8.dp))
                                            
                                            Text(
                                                "We couldn't find a column containing student names. Please select which column to display as student names:",
                                                style = MaterialTheme.typography.bodyMedium,
                                                textAlign = TextAlign.Center
                                            )
                                            
                                            Spacer(modifier = Modifier.height(16.dp))
                                            
                                            LazyColumn(
                                                modifier = Modifier.heightIn(max = 200.dp)
                                            ) {
                                                items(headers) { column ->
                                                    Column {
                                                        Row(
                                                            modifier = Modifier
                                                                .fillMaxWidth()
                                                                .padding(vertical = 12.dp, horizontal = 16.dp),
                                                            verticalAlignment = Alignment.CenterVertically
                                                        ) {
                                                            Text(
                                                                column,
                                                                style = MaterialTheme.typography.bodyLarge
                                                            )
                                                            
                                                            Spacer(modifier = Modifier.weight(1f))
                                                            
                                                            Button(
                                                                onClick = { 
                                                                    selectedNameColumn = column 
                                                                    searchQuery = ""
                                                                },
                                                                colors = ButtonDefaults.buttonColors(
                                                                    containerColor = Color(0xFF333D79)
                                                                )
                                                            ) {
                                                                Text("Use This Column")
                                                            }
                                                        }
                                                        
                                                        Divider()
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                // Use the selected or automatically detected name column
                                val displayNameColumn = selectedNameColumn ?: nameColumn
                                
                                // Find the ID column (usually contains "id", "no", or "#")
                                val idColumn = headers.find { 
                                    it.contains("id", ignoreCase = true) || 
                                    it.contains("no", ignoreCase = true) || 
                                    it.contains("#", ignoreCase = true) 
                                }
                                
                                // Filter data based on search query
                                val filteredData = if (searchQuery.isEmpty()) {
                                    data
                                } else {
                                    data.filter { record ->
                                        record[displayNameColumn]?.contains(searchQuery, ignoreCase = true) == true ||
                                        (idColumn != null && record[idColumn]?.contains(searchQuery, ignoreCase = true) == true)
                                    }
                                }
                                
                                // Student list
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    items(filteredData) { student ->
                                        val studentName = student[displayNameColumn] ?: "Unknown Student"
                                        val studentId = if (idColumn != null) student[idColumn] else null
                                        
                                        Card(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable {
                                                    // Show student detail dialog when card is clicked
                                                    selectedStudentForDetail = student
                                                    showStudentDetailDialog = true
                                                },
                                            colors = CardDefaults.cardColors(
                                                containerColor = Color.White
                                            ),
                                            elevation = CardDefaults.cardElevation(
                                                defaultElevation = 2.dp
                                            )
                                        ) {
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(16.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                // Avatar circle with first letter of name
                                                Box(
                                                    modifier = Modifier
                                                        .size(48.dp)
                                                        .clip(CircleShape)
                                                        .background(Color(0xFF333D79)),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Text(
                                                        text = studentName.take(1).uppercase(),
                                                        style = MaterialTheme.typography.titleMedium,
                                                        color = Color.White,
                                                        fontWeight = FontWeight.Bold
                                                    )
                                                }
                                                
                                                Spacer(modifier = Modifier.width(16.dp))
                                                
                                                // Student info
                                                Column(
                                                    modifier = Modifier.weight(1f)
                                                ) {
                                                    Text(
                                                        text = studentName,
                                                        style = MaterialTheme.typography.titleMedium,
                                                        fontWeight = FontWeight.SemiBold
                                                    )
                                                    
                                                    if (studentId != null) {
                                                        Text(
                                                            text = studentId,
                                                            style = MaterialTheme.typography.bodyMedium,
                                                            color = Color.Gray
                                                        )
                                                    }
                                                }
                                                
                                                // Microphone icon
                                                IconButton(
                                                    onClick = {
                                                        selectedStudentForVoice = student
                                                        showColumnSelectionDialog = true
                                                    },
                                                    modifier = Modifier
                                                        .size(40.dp)
                                                        .clip(CircleShape)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.Mic,
                                                        contentDescription = "Record voice for ${studentName}",
                                                        tint = Color(0xFF333D79)
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            // No file selected or no files available
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(
                                        Icons.Default.Description,
                                        contentDescription = null,
                                        modifier = Modifier.size(64.dp),
                                        tint = Color.Gray
                                    )
                                    
                                    Spacer(modifier = Modifier.height(16.dp))
                                    
                                    Text(
                                        text = if (excelFiles.isEmpty()) 
                                            "No Excel files available. Please upload a file in the standard view." 
                                        else 
                                            "Please select an Excel file to view students.",
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = Color.Gray,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.padding(horizontal = 32.dp)
                                    )
                                    
                                    if (excelFiles.isNotEmpty()) {
                                        Spacer(modifier = Modifier.height(16.dp))
                                        
                                        Button(
                                            onClick = {
                                                showFileSelectionDialog = true
                                            },
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = Color(0xFF333D79)
                                            )
                                        ) {
                                            Text("Select Excel File")
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
                    // Show empty state
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.Description,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = Color.Gray
                            )
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            Text(
                                text = "No Excel files available. Please upload a file in the standard view.",
                                style = MaterialTheme.typography.bodyLarge,
                                color = Color.Gray,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(horizontal = 32.dp)
                            )
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            Button(
                                onClick = onBackPressed,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF333D79)
                                )
                            ) {
                                Icon(Icons.Default.ArrowBack, contentDescription = "Go back")
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Go to Standard View")
                            }
                        }
                    }
                }
            }
        }
    }
    // Student details dialog
    if (showStudentDetailDialog && selectedStudentForDetail != null) {
        val sheetData = excelViewModel.getSelectedSheetDataAsMap()
        val headers = sheetData["headers"] as? List<String> ?: emptyList()
        val displayNameColumn = selectedNameColumn ?: headers.find { 
            it.contains("name", ignoreCase = true) || 
            it.contains("student", ignoreCase = true) 
        } ?: ""
        val studentName = selectedStudentForDetail!![displayNameColumn] ?: "Unknown Student"
        
        Dialog(
            onDismissRequest = { 
                showStudentDetailDialog = false 
                selectedStudentForDetail = null
            },
            properties = DialogProperties(
                dismissOnBackPress = true,
                dismissOnClickOutside = true
            )
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .padding(16.dp)
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Student avatar and name
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF333D79)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = studentName.take(1).uppercase(),
                            style = MaterialTheme.typography.headlineMedium,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Text(
                        studentName,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    // Display all student data
                    Text(
                        "Student Information",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color(0xFF333D79),
                        modifier = Modifier.align(Alignment.Start)
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Divider()
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    // Show all fields except name (which is already shown above)
                    headers.forEach { column ->
                        if (column != displayNameColumn) {
                            val value = selectedStudentForDetail!![column] ?: ""
                            if (value.isNotEmpty()) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        column,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        modifier = Modifier.width(120.dp)
                                    )
                                    
                                    Spacer(modifier = Modifier.width(8.dp))
                                    
                                    Text(
                                        value,
                                        style = MaterialTheme.typography.bodyLarge
                                    )
                                }
                                
                                Divider(modifier = Modifier.padding(vertical = 4.dp))
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Voice record button
                    Button(
                        onClick = { 
                            selectedStudentForVoice = selectedStudentForDetail
                            showStudentDetailDialog = false
                            showColumnSelectionDialog = true
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF333D79)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Mic, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Record Data for this Student")
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    // Close button
                    OutlinedButton(
                        onClick = { 
                            showStudentDetailDialog = false
                            selectedStudentForDetail = null
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Close")
                    }
                }
            }
        }
    }
    
    // File selection dialog
    if (showFileSelectionDialog) {
        val excelFiles = when (excelViewModel.excelUIState) {
            is ExcelUIState.Success -> (excelViewModel.excelUIState as ExcelUIState.Success).excelFiles
            else -> emptyList()
        }
        
        Dialog(
            onDismissRequest = { showFileSelectionDialog = false },
            properties = DialogProperties(
                dismissOnBackPress = true,
                dismissOnClickOutside = true
            )
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .padding(16.dp)
                        .fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "Select Excel File",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    if (excelFiles.isEmpty()) {
                        Text(
                            "No Excel files available",
                            style = MaterialTheme.typography.bodyMedium,
                            textAlign = TextAlign.Center
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier.heightIn(max = 300.dp)
                        ) {
                            items(excelFiles) { file ->
                                Column {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                excelViewModel.selectExcelFile(file.id)
                                                showFileSelectionDialog = false
                                                // Reset name column when changing files
                                                selectedNameColumn = null
                                            }
                                            .padding(vertical = 12.dp, horizontal = 16.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            Icons.Default.Description,
                                            contentDescription = null,
                                            tint = Color(0xFF333D79),
                                            modifier = Modifier.size(24.dp)
                                        )
                                        
                                        Spacer(modifier = Modifier.width(16.dp))
                                        
                                        Column {
                                            Text(
                                                file.file_name,
                                                style = MaterialTheme.typography.bodyLarge
                                            )
                                            
                                            Text(
                                                "Uploaded: ${file.uploaded_at.take(10)}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = Color.Gray
                                            )
                                        }
                                        
                                        Spacer(modifier = Modifier.weight(1f))
                                        
                                        if (excelViewModel.selectedExcelFile?.id == file.id) {
                                            Icon(
                                                Icons.Default.Check,
                                                contentDescription = "Selected",
                                                tint = Color(0xFF4CAF50),
                                                modifier = Modifier.size(24.dp)
                                            )
                                        }
                                    }
                                    
                                    Divider()
                                }
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Button(
                        onClick = { showFileSelectionDialog = false },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF333D79)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Close")
                    }
                }
            }
        }
    }
    
    // Column selection dialog
    if (showColumnSelectionDialog && selectedStudentForVoice != null) {
        val sheetData = excelViewModel.getSelectedSheetDataAsMap()
        val headers = sheetData["headers"] as? List<String> ?: emptyList()
        val displayNameColumn = selectedNameColumn ?: headers.find { 
            it.contains("name", ignoreCase = true) || 
            it.contains("student", ignoreCase = true) 
        } ?: ""
        val studentName = selectedStudentForVoice!![displayNameColumn] ?: "this student"
        
        Dialog(
            onDismissRequest = { 
                showColumnSelectionDialog = false 
                selectedStudentForVoice = null
            },
            properties = DialogProperties(
                dismissOnBackPress = true,
                dismissOnClickOutside = true
            )
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .padding(16.dp)
                        .fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "Voice Input for $studentName",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Text(
                        "Select which data field you want to record:",
                        style = MaterialTheme.typography.bodyMedium,
                        textAlign = TextAlign.Center
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    LazyColumn(
                        modifier = Modifier.heightIn(max = 300.dp)
                    ) {
                        items(headers) { column ->
                            if (column != displayNameColumn) {
                                Column {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                selectedColumnForVoice = column
                                                showColumnSelectionDialog = false
                                                showVoiceRecordingDialog = true
                                            }
                                            .padding(vertical = 12.dp, horizontal = 16.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            column,
                                            style = MaterialTheme.typography.bodyLarge
                                        )
                                        
                                        Spacer(modifier = Modifier.weight(1f))
                                        
                                        Icon(
                                            Icons.Default.Mic,
                                            contentDescription = "Record for $column",
                                            tint = Color(0xFF333D79)
                                        )
                                    }
                                    
                                    Divider()
                                }
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Button(
                        onClick = { 
                            showColumnSelectionDialog = false
                            selectedStudentForVoice = null
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF333D79)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Cancel")
                    }
                }
            }
        }
    }
    
    // Voice recording dialog
    if (showVoiceRecordingDialog && selectedStudentForVoice != null && selectedColumnForVoice != null) {
        VoiceRecordingDialog(
            excelViewModel = excelViewModel,
            onDismiss = {
                showVoiceRecordingDialog = false
                selectedColumnForVoice = null
                selectedStudentForVoice = null
            }
        )
    }
}
