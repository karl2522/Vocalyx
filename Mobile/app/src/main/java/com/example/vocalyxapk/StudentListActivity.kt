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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme
import com.example.vocalyxapk.viewmodel.ExcelUIState
import com.example.vocalyxapk.viewmodel.ExcelViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class StudentName(
    val firstName: String,
    val lastName: String,
    val fullName: String
)

class StudentListActivity : ComponentActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val classId = intent.getIntExtra("CLASS_ID", -1)
        val className = intent.getStringExtra("CLASS_NAME") ?: "Student List"
        val classSection = intent.getStringExtra("CLASS_SECTION")
        val selectedExcelFileId = intent.getIntExtra("SELECTED_EXCEL_FILE_ID", -1)
        
        setContent {
            VOCALYXAPKTheme {
                StudentListScreen(
                    classId = classId,
                    className = className,
                    classSection = classSection,
                    selectedExcelFileId = if (selectedExcelFileId != -1) selectedExcelFileId else null,
                    onBackPressed = { finish() }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentListScreen(
    classId: Int,
    className: String,
    classSection: String?,
    selectedExcelFileId: Int?,
    onBackPressed: () -> Unit,
    excelViewModel: ExcelViewModel = viewModel()
) {
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()
    
    // State variables
    var searchQuery by remember { mutableStateOf("") }
    var showColumnSelectionDialog by remember { mutableStateOf(false) }
    var detectedFirstNameColumn by remember { mutableStateOf<String?>(null) }
    var detectedLastNameColumn by remember { mutableStateOf<String?>(null) }
    var manualFirstNameColumn by remember { mutableStateOf<String?>(null) }
    var manualLastNameColumn by remember { mutableStateOf<String?>(null) }
    
    // Fetch Excel files when the screen is first displayed
    LaunchedEffect(classId) {
        if (classId > 0) {
            excelViewModel.fetchExcelFiles(classId)
        }
    }
    
    // Auto-refresh when activity resumes (e.g., after import)
    LaunchedEffect(Unit) {
        if (selectedExcelFileId != null) {
            // Small delay to allow import to complete on backend
            kotlinx.coroutines.delay(500)
            excelViewModel.fetchExcelFiles(classId)
            coroutineScope.launch {
                snackbarHostState.showSnackbar("Student list updated!")
            }
        }
    }
    
    // Get current Excel UI state
    val excelUIState = excelViewModel.excelUIState
    
    // Function to detect name columns
    fun detectNameColumns(headers: List<String>): Pair<String?, String?> {
        // Filter out assessment-related columns first
        val assessmentKeywords = listOf(
            "quiz", "lab", "laboratory", "exam", "test", "midterm", "final", 
            "assignment", "activity", "score", "grade", "points", "pts",
            "percentage", "%", "completion", "prelim", "prefinal"
        )
        
        val filteredHeaders = headers.filter { header ->
            val lowerHeader = header.lowercase()
            // Only include headers that don't contain assessment keywords
            assessmentKeywords.none { keyword -> lowerHeader.contains(keyword) }
        }
        
        val firstNamePatterns = listOf(
            "first name", "firstname", "first_name", "fname", "given name", "givenname",
            "name_first", "student_first", "first", "prenom", "nombre"
        )
        val lastNamePatterns = listOf(
            "last name", "lastname", "last_name", "lname", "surname", "family name",
            "familyname", "name_last", "student_last", "last", "apellido", "nom"
        )
        
        val firstNameCol = filteredHeaders.find { header ->
            firstNamePatterns.any { pattern ->
                header.contains(pattern, ignoreCase = true)
            }
        }
        
        val lastNameCol = filteredHeaders.find { header ->
            lastNamePatterns.any { pattern ->
                header.contains(pattern, ignoreCase = true)
            }
        }
        
        return Pair(firstNameCol, lastNameCol)
    }
    
    // Function to extract student names
    fun extractStudentNames(
        data: List<Map<String, String>>,
        firstNameCol: String?,
        lastNameCol: String?
    ): List<StudentName> {
        return data.mapNotNull { student ->
            try {
                // Safely extract first name with null checks and type conversion
                val firstName = if (firstNameCol != null) {
                    student[firstNameCol]?.toString()?.trim() ?: ""
                } else ""
                
                // Safely extract last name with null checks and type conversion
                val lastName = if (lastNameCol != null) {
                    student[lastNameCol]?.toString()?.trim() ?: ""
                } else ""
                
                // Only create StudentName if we have at least one name component
                if (firstName.isNotEmpty() || lastName.isNotEmpty()) {
                    val fullName = when {
                        firstName.isNotEmpty() && lastName.isNotEmpty() -> "$firstName $lastName"
                        firstName.isNotEmpty() -> firstName
                        lastName.isNotEmpty() -> lastName
                        else -> "Unknown Student"
                    }
                    StudentName(firstName, lastName, fullName)
                } else null
            } catch (e: Exception) {
                // Skip this row if there's any issue processing it
                // This handles cases where assessment data might cause type issues
                null
            }
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text("Student List")
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
                    // Column mapping button
                    IconButton(
                        onClick = { showColumnSelectionDialog = true }
                    ) {
                        Icon(Icons.Default.Settings, contentDescription = "Configure columns")
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
                .background(Color(0xFFF8F9FC))
        ) {
            when (excelUIState) {
                is ExcelUIState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF333D79))
                    }
                }
                
                is ExcelUIState.Success -> {
                    val excelFiles = (excelUIState as ExcelUIState.Success).excelFiles
                    val selectedExcelFile = excelViewModel.selectedExcelFile
                    
                    if (selectedExcelFile == null && excelFiles.isNotEmpty()) {
                        LaunchedEffect(excelFiles) {
                            if (selectedExcelFileId != null && excelFiles.any { it.id == selectedExcelFileId }) {
                                excelViewModel.selectExcelFile(selectedExcelFileId)
                            } else {
                                excelViewModel.selectExcelFile(excelFiles.first().id)
                            }
                        }
                    }
                    
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp)
                    ) {
                        if (selectedExcelFile != null) {
                            val sheetData = excelViewModel.getSelectedSheetDataAsMap()
                            val headers = sheetData["headers"] as? List<String> ?: emptyList()
                            val data = sheetData["data"] as? List<Map<String, String>> ?: emptyList()
                            
                            // Auto-detect name columns if not manually set
                            LaunchedEffect(headers) {
                                if (manualFirstNameColumn == null && manualLastNameColumn == null) {
                                    val (detectedFirst, detectedLast) = detectNameColumns(headers)
                                    detectedFirstNameColumn = detectedFirst
                                    detectedLastNameColumn = detectedLast
                                    
                                    // Log for debugging
                                    android.util.Log.d("StudentListActivity", 
                                        "Total headers: ${headers.size}, " +
                                        "Detected first name: $detectedFirst, " +
                                        "Detected last name: $detectedLast"
                                    )
                                }
                            }
                            
                            val activeFirstNameCol = manualFirstNameColumn ?: detectedFirstNameColumn
                            val activeLastNameCol = manualLastNameColumn ?: detectedLastNameColumn
                            
                            // Header section
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = Color.White
                                ),
                                elevation = CardDefaults.cardElevation(1.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            "${data.size} Students",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color(0xFF333D79)
                                        )
                                        if (activeFirstNameCol != null || activeLastNameCol != null) {
                                            Text(
                                                "From: ${activeFirstNameCol ?: "N/A"} | ${activeLastNameCol ?: "N/A"}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = Color(0xFF666666)
                                            )
                                        }
                                    }
                                    
                                    Surface(
                                        color = if (activeFirstNameCol != null && activeLastNameCol != null) 
                                            Color(0xFF4CAF50).copy(alpha = 0.1f) 
                                        else 
                                            Color(0xFFFF9800).copy(alpha = 0.1f),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Text(
                                            if (activeFirstNameCol != null && activeLastNameCol != null) 
                                                "✓ Ready" 
                                            else 
                                                "⚙ Setup",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = if (activeFirstNameCol != null && activeLastNameCol != null) 
                                                Color(0xFF4CAF50) 
                                            else 
                                                Color(0xFFFF9800),
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        )
                                    }
                                }
                            }
                            
                            // Search bar
                            OutlinedTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp),
                                placeholder = { Text("Search students...") },
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
                                shape = RoundedCornerShape(25.dp),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF333D79),
                                    unfocusedBorderColor = Color.LightGray,
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                )
                            )
                            
                            // Student list
                            if (activeFirstNameCol != null || activeLastNameCol != null) {
                                val students = extractStudentNames(data, activeFirstNameCol, activeLastNameCol)
                                val filteredStudents = if (searchQuery.isEmpty()) {
                                    students
                                } else {
                                    students.filter { student ->
                                        student.fullName.contains(searchQuery, ignoreCase = true) ||
                                        student.firstName.contains(searchQuery, ignoreCase = true) ||
                                        student.lastName.contains(searchQuery, ignoreCase = true)
                                    }
                                }
                                
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                    contentPadding = PaddingValues(vertical = 8.dp)
                                ) {
                                    itemsIndexed(filteredStudents) { index, student ->
                                        Card(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable {
                                                    val intent = Intent(context, StudentDetailActivity::class.java).apply {
                                                        putExtra("STUDENT_NAME", student.fullName)
                                                        putExtra("STUDENT_FIRST_NAME", student.firstName)
                                                        putExtra("STUDENT_LAST_NAME", student.lastName)
                                                        putExtra("CLASS_ID", classId)
                                                        putExtra("CLASS_NAME", className)
                                                        putExtra("SELECTED_EXCEL_FILE_ID", selectedExcelFile.id)
                                                    }
                                                    context.startActivity(intent)
                                                },
                                            colors = CardDefaults.cardColors(
                                                containerColor = Color.White
                                            ),
                                            elevation = CardDefaults.cardElevation(2.dp),
                                            shape = RoundedCornerShape(12.dp)
                                        ) {
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(16.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                // Student number
                                                Surface(
                                                    color = Color(0xFF333D79),
                                                    shape = CircleShape,
                                                    modifier = Modifier.size(40.dp)
                                                ) {
                                                    Box(
                                                        contentAlignment = Alignment.Center,
                                                        modifier = Modifier.fillMaxSize()
                                                    ) {
                                                        Text(
                                                            text = "${index + 1}",
                                                            style = MaterialTheme.typography.bodyMedium,
                                                            color = Color.White,
                                                            fontWeight = FontWeight.Bold
                                                        )
                                                    }
                                                }
                                                
                                                Spacer(modifier = Modifier.width(16.dp))
                                                
                                                // Student name
                                                Column(
                                                    modifier = Modifier.weight(1f)
                                                ) {
                                                    Text(
                                                        text = student.fullName,
                                                        style = MaterialTheme.typography.titleMedium,
                                                        fontWeight = FontWeight.SemiBold,
                                                        color = Color(0xFF333D79)
                                                    )
                                                    
                                                    if (student.firstName.isNotEmpty() && student.lastName.isNotEmpty()) {
                                                        Text(
                                                            text = "First: ${student.firstName} • Last: ${student.lastName}",
                                                            style = MaterialTheme.typography.bodySmall,
                                                            color = Color(0xFF666666)
                                                        )
                                                    }
                                                }
                                                
                                                // Avatar with initials
                                                Surface(
                                                    color = Color(0xFF333D79).copy(alpha = 0.1f),
                                                    shape = CircleShape,
                                                    modifier = Modifier.size(48.dp)
                                                ) {
                                                    Box(
                                                        contentAlignment = Alignment.Center,
                                                        modifier = Modifier.fillMaxSize()
                                                    ) {
                                                        Text(
                                                            text = "${student.firstName.take(1)}${student.lastName.take(1)}".uppercase(),
                                                            style = MaterialTheme.typography.titleMedium,
                                                            color = Color(0xFF333D79),
                                                            fontWeight = FontWeight.Bold
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                // No name columns detected
                                Box(
                                    modifier = Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        colors = CardDefaults.cardColors(
                                            containerColor = Color.White
                                        )
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .padding(24.dp)
                                                .fillMaxWidth(),
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            Icon(
                                                Icons.Default.Warning,
                                                contentDescription = null,
                                                tint = Color(0xFFFF9800),
                                                modifier = Modifier.size(48.dp)
                                            )
                                            
                                            Spacer(modifier = Modifier.height(16.dp))
                                            
                                            Text(
                                                "Name Columns Not Detected",
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                                textAlign = TextAlign.Center
                                            )
                                            
                                            Spacer(modifier = Modifier.height(8.dp))
                                            
                                            Text(
                                                "We couldn't automatically detect first name and last name columns. Please configure them manually.",
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = Color(0xFF666666),
                                                textAlign = TextAlign.Center
                                            )
                                            
                                            Spacer(modifier = Modifier.height(16.dp))
                                            
                                            Button(
                                                onClick = { showColumnSelectionDialog = true },
                                                colors = ButtonDefaults.buttonColors(
                                                    containerColor = Color(0xFF333D79)
                                                )
                                            ) {
                                                Icon(Icons.Default.Settings, contentDescription = null)
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text("Configure Name Columns")
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            // No file selected
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
                                        text = "No Excel file available",
                                        style = MaterialTheme.typography.titleMedium,
                                        color = Color.Gray,
                                        textAlign = TextAlign.Center
                                    )
                                    
                                    Text(
                                        text = "Please upload an Excel file first",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = Color.Gray,
                                        textAlign = TextAlign.Center
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
                                        Text("Go Back")
                                    }
                                }
                            }
                        }
                    }
                }
                
                is ExcelUIState.Error -> {
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
                                text = "No Excel files available",
                                style = MaterialTheme.typography.titleMedium,
                                color = Color.Gray,
                                textAlign = TextAlign.Center
                            )
                            
                            Button(
                                onClick = onBackPressed,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF333D79)
                                )
                            ) {
                                Icon(Icons.Default.ArrowBack, contentDescription = "Go back")
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Go Back")
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Column selection dialog
    if (showColumnSelectionDialog) {
        val sheetData = excelViewModel.getSelectedSheetDataAsMap()
        val allHeaders = sheetData["headers"] as? List<String> ?: emptyList()
        
        // Filter out assessment-related columns for cleaner selection
        val assessmentKeywords = listOf(
            "quiz", "lab", "laboratory", "exam", "test", "midterm", "final", 
            "assignment", "activity", "score", "grade", "points", "pts",
            "percentage", "%", "completion", "prelim", "prefinal"
        )
        
        val nameHeaders = allHeaders.filter { header ->
            val lowerHeader = header.lowercase()
            // Only include headers that don't contain assessment keywords
            assessmentKeywords.none { keyword -> lowerHeader.contains(keyword) }
        }
        
        Dialog(
            onDismissRequest = { showColumnSelectionDialog = false },
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
                        .padding(20.dp)
                        .fillMaxWidth()
                ) {
                    Text(
                        "Configure Name Columns",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF333D79)
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Text(
                        "Select which columns contain first and last names:",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666)
                    )
                    
                    if (nameHeaders.size < allHeaders.size) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Note: Assessment columns are hidden for clarity",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF999999),
                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(20.dp))
                    
                    // First Name Selection
                    Text(
                        "First Name Column:",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    LazyColumn(
                        modifier = Modifier.heightIn(max = 150.dp)
                    ) {
                        items(nameHeaders) { column ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                RadioButton(
                                    selected = (manualFirstNameColumn ?: detectedFirstNameColumn) == column,
                                    onClick = { manualFirstNameColumn = column },
                                    colors = RadioButtonDefaults.colors(
                                        selectedColor = Color(0xFF333D79)
                                    )
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    column,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Last Name Selection
                    Text(
                        "Last Name Column:",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    LazyColumn(
                        modifier = Modifier.heightIn(max = 150.dp)
                    ) {
                        items(nameHeaders) { column ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                RadioButton(
                                    selected = (manualLastNameColumn ?: detectedLastNameColumn) == column,
                                    onClick = { manualLastNameColumn = column },
                                    colors = RadioButtonDefaults.colors(
                                        selectedColor = Color(0xFF333D79)
                                    )
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    column,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(20.dp))
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = { showColumnSelectionDialog = false },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Cancel")
                        }
                        
                        Button(
                            onClick = { showColumnSelectionDialog = false },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF333D79)
                            ),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Apply")
                        }
                    }
                }
            }
        }
    }
} 