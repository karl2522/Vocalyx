package com.example.vocalyxapk

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme
import com.example.vocalyxapk.viewmodel.ExcelUIState
import com.example.vocalyxapk.viewmodel.ExcelViewModel
import kotlinx.coroutines.delay

data class StudentScore(
    val assessmentName: String,
    val score: String,
    val maxScore: String,
    val percentage: Double,
    val date: String,
    val category: AssessmentCategory
)

enum class AssessmentCategory(val displayName: String, val icon: ImageVector, val color: Color) {
    QUIZ("Quizzes", Icons.Default.Quiz, Color(0xFF2196F3)),
    LAB("Laboratory Activities", Icons.Default.Science, Color(0xFF4CAF50)),
    EXAM("Exams", Icons.Default.School, Color(0xFFFF5722))
}

class StudentDetailActivity : ComponentActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val studentName = intent.getStringExtra("STUDENT_NAME") ?: "Unknown Student"
        val studentFirstName = intent.getStringExtra("STUDENT_FIRST_NAME") ?: ""
        val studentLastName = intent.getStringExtra("STUDENT_LAST_NAME") ?: ""
        val classId = intent.getIntExtra("CLASS_ID", -1)
        val className = intent.getStringExtra("CLASS_NAME") ?: "Class"
        val selectedExcelFileId = intent.getIntExtra("SELECTED_EXCEL_FILE_ID", -1)
        
        setContent {
            VOCALYXAPKTheme {
                StudentDetailScreen(
                    studentName = studentName,
                    studentFirstName = studentFirstName,
                    studentLastName = studentLastName,
                    classId = classId,
                    className = className,
                    selectedExcelFileId = if (selectedExcelFileId != -1) selectedExcelFileId else null,
                    onBackPressed = { finish() }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentDetailScreen(
    studentName: String,
    studentFirstName: String,
    studentLastName: String,
    classId: Int,
    className: String,
    selectedExcelFileId: Int?,
    onBackPressed: () -> Unit,
    excelViewModel: ExcelViewModel = viewModel()
) {
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }
    
    // State for selected category tab
    var selectedCategory by remember { mutableStateOf(AssessmentCategory.QUIZ) }
    
    // Add refresh trigger to force UI updates
    var refreshTrigger by remember { mutableStateOf(0) }
    
    // Helper functions defined at the top to ensure they're available throughout the composable
    
    // Function to categorize assessments based on column name
    fun categorizeAssessment(columnName: String): AssessmentCategory {
        val lowerName = columnName.lowercase()
        return when {
            // Quiz patterns - be more specific
            lowerName.contains("quiz") || 
            (lowerName.startsWith("q") && lowerName.length <= 3 && lowerName.matches(Regex("q\\d*"))) ||
            lowerName.matches(Regex("quiz\\s*\\d+")) -> AssessmentCategory.QUIZ
            
            // Lab patterns
            lowerName.contains("lab") || 
            lowerName.contains("laboratory") || 
            lowerName.contains("activity") ||
            lowerName.contains("practical") -> AssessmentCategory.LAB
            
            // Exam patterns
            lowerName.contains("exam") || 
            lowerName.contains("test") || 
            lowerName.contains("midterm") || 
            lowerName.contains("final") ||
            lowerName.contains("assessment") -> AssessmentCategory.EXAM
            
            // Default to LAB for unknown assessment types (more neutral than Quiz)
            else -> AssessmentCategory.LAB
        }
    }
    
    // Function to get exam order priority for sorting
    fun getExamOrder(examName: String): Int {
        val lowerName = examName.lowercase()
        return when {
            lowerName.contains("prelim") -> 1
            lowerName.contains("midterm") -> 2
            lowerName.contains("prefinal") -> 3
            lowerName.contains("final") -> 4
            else -> 5 // Any other exam types go last
        }
    }
    
    // Function to sort assessment scores by category logic
    fun sortAssessmentScores(scores: List<StudentScore>, category: AssessmentCategory): List<StudentScore> {
        return when (category) {
            AssessmentCategory.EXAM -> {
                // Sort exams by logical order: Prelim -> Midterm -> Prefinal -> Final
                scores.sortedBy { getExamOrder(it.assessmentName) }
            }
            AssessmentCategory.QUIZ -> {
                // Sort quizzes by number
                scores.sortedBy { score ->
                    val numberRegex = "\\d+".toRegex()
                    val match = numberRegex.find(score.assessmentName)
                    match?.value?.toIntOrNull() ?: 0
                }
            }
            AssessmentCategory.LAB -> {
                // Sort labs by number
                scores.sortedBy { score ->
                    val numberRegex = "\\d+".toRegex()
                    val match = numberRegex.find(score.assessmentName)
                    match?.value?.toIntOrNull() ?: 0
                }
            }
        }
    }
    
    // Function to parse score string
    fun parseScore(scoreStr: String): Triple<String, String, Double>? {
        return try {
            when {
                scoreStr.contains("/") -> {
                    val parts = scoreStr.split("/")
                    val score = parts[0].trim().toDoubleOrNull() ?: return null
                    val maxScore = parts[1].trim().toDoubleOrNull() ?: return null
                    val percentage = (score / maxScore) * 100
                    Triple(parts[0].trim(), parts[1].trim(), percentage)
                }
                scoreStr.contains("%") -> {
                    val percentage = scoreStr.replace("%", "").trim().toDoubleOrNull() ?: return null
                    Triple(percentage.toString(), "100", percentage)
                }
                else -> {
                    val score = scoreStr.trim().toDoubleOrNull() ?: return null
                    // Assume out of 100 if no max score provided
                    Triple(score.toString(), "100", score)
                }
            }
        } catch (e: Exception) {
            null
        }
    }
    
    // Add debugging for Midterm Exam specifically
    fun debugMidtermExamData(data: List<Map<String, String>>) {
        Log.d("StudentDetailActivity", "=== DEBUGGING MIDTERM EXAM DATA ===")
        if (data.isEmpty()) {
            Log.d("StudentDetailActivity", "No data available")
            return
        }
        
        // Check headers for Midterm Exam column
        val headers = data.firstOrNull()?.keys ?: emptySet()
        val midtermColumns = headers.filter { it.contains("midterm", ignoreCase = true) }
        Log.d("StudentDetailActivity", "Found Midterm columns: $midtermColumns")
        
        // Check all exam-related columns
        val examColumns = headers.filter { 
            it.contains("exam", ignoreCase = true) || 
            it.contains("midterm", ignoreCase = true) ||
            it.contains("prelim", ignoreCase = true) ||
            it.contains("final", ignoreCase = true)
        }
        Log.d("StudentDetailActivity", "Found exam-related columns: $examColumns")
        
        // For each exam column, check if there's any data
        examColumns.forEach { column ->
            val valuesInColumn = data.mapNotNull { row -> row[column] }.filter { it.isNotBlank() }
            Log.d("StudentDetailActivity", "Column '$column' has ${valuesInColumn.size} non-empty values: $valuesInColumn")
        }
    }
    
    // Function to extract student scores
    fun extractStudentScores(
        data: List<Map<String, String>>,
        targetStudentName: String
    ): List<StudentScore> {
        Log.d("StudentDetailActivity", "=== EXTRACTING SCORES FOR: $targetStudentName ===")
        Log.d("StudentDetailActivity", "Total records in data: ${data.size}")
        
        // Debug Midterm Exam data specifically
        debugMidtermExamData(data)
        
        // Try multiple matching strategies
        var studentData: Map<String, String>? = null
        
        // Strategy 1: Exact match
        studentData = data.find { student ->
            val studentValues = student.values.filter { it.isNotBlank() }
            val fullName = studentValues.take(2).joinToString(" ").trim()
            Log.d("StudentDetailActivity", "Checking exact match: '$fullName' vs '$targetStudentName'")
            fullName.equals(targetStudentName, ignoreCase = true)
        }
        
        // Strategy 2: Reversed name format (First Last vs Last First)
        if (studentData == null) {
            val nameParts = targetStudentName.split(" ").filter { it.isNotBlank() }
            if (nameParts.size >= 2) {
                val reversedName = "${nameParts.last()} ${nameParts.dropLast(1).joinToString(" ")}"
                Log.d("StudentDetailActivity", "Trying reversed name: '$reversedName'")
                
                studentData = data.find { student ->
                    val studentValues = student.values.filter { it.isNotBlank() }
                    val fullName = studentValues.take(2).joinToString(" ").trim()
                    Log.d("StudentDetailActivity", "Checking reversed match: '$fullName' vs '$reversedName'")
                    fullName.equals(reversedName, ignoreCase = true)
                }
            }
        }
        
        // Strategy 3: Partial match (contains)
        if (studentData == null) {
            studentData = data.find { student ->
                val studentValues = student.values.filter { it.isNotBlank() }
                val fullName = studentValues.take(2).joinToString(" ").trim()
                Log.d("StudentDetailActivity", "Checking contains match: '$fullName' contains parts of '$targetStudentName'")
                
                val targetParts = targetStudentName.split(" ").filter { it.isNotBlank() }
                targetParts.any { part ->
                    if (part.length > 2) {
                        fullName.contains(part, ignoreCase = true)
                    } else false
                }
            }
        }
        
        // Strategy 4: Check individual values for any match
        if (studentData == null) {
            studentData = data.find { student ->
                Log.d("StudentDetailActivity", "Checking individual values for: ${student.values.filter { it.isNotBlank() }.take(3)}")
                student.values.any { value ->
                    value.equals(targetStudentName, ignoreCase = true) ||
                    (value.isNotBlank() && targetStudentName.contains(value, ignoreCase = true))
                }
            }
        }
        
        if (studentData == null) {
            Log.w("StudentDetailActivity", "No matching student found for: $targetStudentName")
            Log.d("StudentDetailActivity", "Available students:")
            data.forEachIndexed { index, student ->
                val studentValues = student.values.filter { it.isNotBlank() }
                val fullName = studentValues.take(2).joinToString(" ").trim()
                Log.d("StudentDetailActivity", "  $index: '$fullName' (${studentValues.take(3)})")
            }
            return emptyList()
        }
        
        Log.d("StudentDetailActivity", "Found matching student data: ${studentData.values.filter { it.isNotBlank() }.take(3)}")
        Log.d("StudentDetailActivity", "All student columns and values:")
        studentData.forEach { (key, value) ->
            Log.d("StudentDetailActivity", "  Column: '$key' = '$value'")
        }
        
        val scores = mutableListOf<StudentScore>()
        studentData.forEach { (columnName, value) ->
            try {
                Log.d("StudentDetailActivity", "=== PROCESSING COLUMN: '$columnName' ===")
                Log.d("StudentDetailActivity", "Raw value: '$value'")
                Log.d("StudentDetailActivity", "Value isEmpty: ${value.isEmpty()}")
                Log.d("StudentDetailActivity", "Value equals '0': ${value == "0"}")
                Log.d("StudentDetailActivity", "Value equals '-': ${value == "-"}")
                
                // Check if column should be skipped
                val containsName = columnName.contains("name", ignoreCase = true)
                val containsId = columnName.equals("id", ignoreCase = true) || 
                                columnName.endsWith("id", ignoreCase = true) || 
                                columnName.contains("_id", ignoreCase = true) ||
                                columnName.contains("id_", ignoreCase = true)
                val equalsNo = columnName.equals("no.", ignoreCase = true)
                val equalsNoSimple = columnName.equals("no", ignoreCase = true)
                val equalsHash = columnName.equals("#", ignoreCase = true)
                val equalsNumber = columnName.equals("number", ignoreCase = true)
                val containsIndex = columnName.contains("index", ignoreCase = true)
                val containsRow = columnName.contains("row", ignoreCase = true)
                
                val shouldSkipColumn = containsName || containsId || equalsNo || equalsNoSimple || equalsHash || equalsNumber || containsIndex || containsRow
                
                Log.d("StudentDetailActivity", "Column skip analysis for '$columnName':")
                Log.d("StudentDetailActivity", "  containsName: $containsName")
                Log.d("StudentDetailActivity", "  containsId: $containsId") 
                Log.d("StudentDetailActivity", "  equalsNo: $equalsNo")
                Log.d("StudentDetailActivity", "  equalsNoSimple: $equalsNoSimple")
                Log.d("StudentDetailActivity", "  equalsHash: $equalsHash")
                Log.d("StudentDetailActivity", "  equalsNumber: $equalsNumber")
                Log.d("StudentDetailActivity", "  containsIndex: $containsIndex")
                Log.d("StudentDetailActivity", "  containsRow: $containsRow")
                Log.d("StudentDetailActivity", "Should skip column: $shouldSkipColumn")
                
                val shouldSkipValue = value.isEmpty() || value == "-"
                Log.d("StudentDetailActivity", "Should skip value: $shouldSkipValue (temporarily allowing '0' scores for debugging)")
                
                // Skip name columns, ID columns, row numbers, and empty values
                if (!shouldSkipColumn && !shouldSkipValue) {
                    
                    Log.d("StudentDetailActivity", "Processing column '$columnName' with value '$value'")
                    
                    // Try to parse as score (could be "85/100", "85%", "85", etc.)
                    val scoreInfo = parseScore(value.toString())
                    Log.d("StudentDetailActivity", "Parse score result: $scoreInfo")
                    
                    if (scoreInfo != null) {
                        val category = categorizeAssessment(columnName)
                        Log.d("StudentDetailActivity", "Categorized '$columnName' as: $category")
                        
                        val score = StudentScore(
                            assessmentName = columnName,
                            score = scoreInfo.first,
                            maxScore = scoreInfo.second,
                            percentage = scoreInfo.third,
                            date = "N/A", // Could be extracted if date column exists
                            category = category
                        )
                        scores.add(score)
                        Log.d("StudentDetailActivity", "Successfully added score: $columnName = ${scoreInfo.first}/${scoreInfo.second} (${scoreInfo.third}%) - Category: $category")
                    } else {
                        Log.w("StudentDetailActivity", "Failed to parse score for column '$columnName' with value '$value'")
                    }
                } else {
                    Log.d("StudentDetailActivity", "Skipped column '$columnName' - shouldSkipColumn: $shouldSkipColumn, shouldSkipValue: $shouldSkipValue")
                }
            } catch (e: Exception) {
                // Skip this column if there's any issue processing it
                Log.w("StudentDetailActivity", "Error processing column $columnName: ${e.message}")
            }
        }
        
        Log.d("StudentDetailActivity", "=== FINAL SCORE SUMMARY ===")
        Log.d("StudentDetailActivity", "Total scores found: ${scores.size}")
        scores.forEach { score ->
            Log.d("StudentDetailActivity", "  ${score.assessmentName} (${score.category}) = ${score.score}/${score.maxScore} (${score.percentage}%)")
        }
        return scores
    }
    
    // Fetch Excel files when the screen is first displayed
    LaunchedEffect(classId) {
        if (classId > 0) {
            Log.d("StudentDetailActivity", "Initial fetch for classId: $classId")
            excelViewModel.fetchExcelFiles(classId)
        }
    }
    
    // Refresh when returning to this screen (e.g., from voice recording)
    LaunchedEffect(Unit) {
        Log.d("StudentDetailActivity", "Screen composed, fetching fresh data...")
        if (classId > 0) {
            excelViewModel.fetchExcelFiles(classId)
        }
    }
    
    // Force refresh when activity becomes visible (e.g., returning from voice recording)
    DisposableEffect(Unit) {
        onDispose {
            // When this effect is disposed and recreated, it means the screen is being recomposed
            // This can happen when returning from another activity
            Log.d("StudentDetailActivity", "Screen recomposed, triggering refresh")
            refreshTrigger++
        }
    }
    
    // Add aggressive refresh to catch updates from voice recording
    LaunchedEffect(classId, selectedExcelFileId) {
        var refreshCount = 0
        while (refreshCount < 10) { // Try 10 times over 30 seconds
            delay(3000) // Check every 3 seconds
            if (classId > 0) {
                refreshCount++
                Log.d("StudentDetailActivity", "Refresh attempt $refreshCount/10...")
                excelViewModel.fetchExcelFiles(classId)
                
                // If we have data, check if the student has scores
                val currentData = excelViewModel.getSelectedSheetDataAsMap()
                val data = currentData["data"] as? List<Map<String, String>> ?: emptyList()
                val studentScores = extractStudentScores(data, studentName)
                Log.d("StudentDetailActivity", "Student $studentName has ${studentScores.size} scores after refresh $refreshCount")
                
                if (studentScores.isNotEmpty()) {
                    Log.d("StudentDetailActivity", "Found scores, stopping aggressive refresh and triggering UI update")
                    refreshTrigger++ // Force UI refresh
                    break
                }
            }
        }
    }
    
    // Get current Excel UI state with refresh trigger
    val excelUIState = excelViewModel.excelUIState
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text(
                            studentName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            className,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.7f)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackPressed) {
                        Icon(Icons.Rounded.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
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
                    
                    if (selectedExcelFile != null) {
                        val sheetData = excelViewModel.getSelectedSheetDataAsMap()
                        val data = sheetData["data"] as? List<Map<String, String>> ?: emptyList()
                        val studentScores = remember(refreshTrigger, data, studentName) { 
                            extractStudentScores(data, studentName) 
                        }
                        
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp)
                        ) {
                            // Student header card
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = Color.White
                                ),
                                elevation = CardDefaults.cardElevation(2.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Student avatar
                                    Surface(
                                        color = Color(0xFF333D79),
                                        shape = CircleShape,
                                        modifier = Modifier.size(56.dp)
                                    ) {
                                        Box(
                                            contentAlignment = Alignment.Center,
                                            modifier = Modifier.fillMaxSize()
                                        ) {
                                            Text(
                                                text = "${studentFirstName.take(1)}${studentLastName.take(1)}".uppercase(),
                                                style = MaterialTheme.typography.titleLarge,
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                    
                                    Spacer(modifier = Modifier.width(16.dp))
                                    
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            studentName,
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF333D79)
                                        )
                                        Text(
                                            "${studentScores.size} assessments recorded",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = Color(0xFF666666)
                                        )
                                    }
                                    
                                    // Overall average
                                    if (studentScores.isNotEmpty()) {
                                        val averageScore = studentScores.map { it.percentage }.average()
                                        Surface(
                                            color = when {
                                                averageScore >= 90 -> Color(0xFF4CAF50).copy(alpha = 0.1f)
                                                averageScore >= 75 -> Color(0xFFFF9800).copy(alpha = 0.1f)
                                                else -> Color(0xFFFF5722).copy(alpha = 0.1f)
                                            },
                                            shape = RoundedCornerShape(12.dp)
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(12.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Text(
                                                    "%.1f%%".format(averageScore),
                                                    style = MaterialTheme.typography.titleMedium,
                                                    fontWeight = FontWeight.Bold,
                                                    color = when {
                                                        averageScore >= 90 -> Color(0xFF4CAF50)
                                                        averageScore >= 75 -> Color(0xFFFF9800)
                                                        else -> Color(0xFFFF5722)
                                                    }
                                                )
                                                Text(
                                                    "Average",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = Color(0xFF666666)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // Category tabs
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
                                        .padding(8.dp),
                                    horizontalArrangement = Arrangement.SpaceEvenly
                                ) {
                                    AssessmentCategory.values().forEach { category ->
                                        val categoryScores = studentScores.filter { it.category == category }
                                        val isSelected = selectedCategory == category
                                        
                                        FilterChip(
                                            selected = isSelected,
                                            onClick = { selectedCategory = category },
                                            label = {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.Center,
                                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                                ) {
                                                    Icon(
                                                        category.icon,
                                                        contentDescription = null,
                                                        modifier = Modifier.size(18.dp),
                                                        tint = if (isSelected) Color.White else category.color
                                                    )
                                                    Spacer(modifier = Modifier.width(6.dp))
                                                    Column(
                                                        horizontalAlignment = Alignment.Start
                                                    ) {
                                                        Text(
                                                            when (category) {
                                                                AssessmentCategory.QUIZ -> "Quizzes"
                                                                AssessmentCategory.LAB -> "Lab Activities"
                                                                AssessmentCategory.EXAM -> "Exams"
                                                            },
                                                            style = MaterialTheme.typography.bodySmall,
                                                            fontWeight = FontWeight.Medium,
                                                            maxLines = 1
                                                        )
                                                        Text(
                                                            "(${categoryScores.size})",
                                                            style = MaterialTheme.typography.bodySmall,
                                                            color = if (isSelected) Color.White.copy(alpha = 0.8f) else Color(0xFF666666)
                                                        )
                                                    }
                                                }
                                            },
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = category.color,
                                                selectedLabelColor = Color.White,
                                                containerColor = category.color.copy(alpha = 0.1f),
                                                labelColor = category.color
                                            ),
                                            modifier = Modifier
                                                .weight(1f)
                                                .padding(horizontal = 2.dp)
                                        )
                                    }
                                }
                            }
                            
                            // Assessment list for selected category
                            val categoryScores = sortAssessmentScores(
                                studentScores.filter { it.category == selectedCategory },
                                selectedCategory
                            )
                            
                            if (categoryScores.isNotEmpty()) {
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                    contentPadding = PaddingValues(vertical = 8.dp)
                                ) {
                                    items(categoryScores) { score ->
                                        Card(
                                            modifier = Modifier.fillMaxWidth(),
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
                                                // Category icon
                                                Surface(
                                                    color = selectedCategory.color.copy(alpha = 0.1f),
                                                    shape = CircleShape,
                                                    modifier = Modifier.size(40.dp)
                                                ) {
                                                    Box(
                                                        contentAlignment = Alignment.Center,
                                                        modifier = Modifier.fillMaxSize()
                                                    ) {
                                                        Icon(
                                                            selectedCategory.icon,
                                                            contentDescription = null,
                                                            tint = selectedCategory.color,
                                                            modifier = Modifier.size(20.dp)
                                                        )
                                                    }
                                                }
                                                
                                                Spacer(modifier = Modifier.width(16.dp))
                                                
                                                // Assessment details
                                                Column(modifier = Modifier.weight(1f)) {
                                                    Text(
                                                        score.assessmentName,
                                                        style = MaterialTheme.typography.titleSmall,
                                                        fontWeight = FontWeight.SemiBold,
                                                        color = Color(0xFF333D79)
                                                    )
                                                    Text(
                                                        "${score.score}/${score.maxScore}",
                                                        style = MaterialTheme.typography.bodyMedium,
                                                        color = Color(0xFF666666)
                                                    )
                                                }
                                                
                                                // Score percentage
                                                Surface(
                                                    color = when {
                                                        score.percentage >= 90 -> Color(0xFF4CAF50).copy(alpha = 0.1f)
                                                        score.percentage >= 75 -> Color(0xFFFF9800).copy(alpha = 0.1f)
                                                        else -> Color(0xFFFF5722).copy(alpha = 0.1f)
                                                    },
                                                    shape = RoundedCornerShape(8.dp)
                                                ) {
                                                    Text(
                                                        "%.1f%%".format(score.percentage),
                                                        style = MaterialTheme.typography.titleSmall,
                                                        fontWeight = FontWeight.Bold,
                                                        color = when {
                                                            score.percentage >= 90 -> Color(0xFF4CAF50)
                                                            score.percentage >= 75 -> Color(0xFFFF9800)
                                                            else -> Color(0xFFFF5722)
                                                        },
                                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                // Empty state for category
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
                                                .padding(32.dp)
                                                .fillMaxWidth(),
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            Icon(
                                                selectedCategory.icon,
                                                contentDescription = null,
                                                tint = selectedCategory.color.copy(alpha = 0.5f),
                                                modifier = Modifier.size(48.dp)
                                            )
                                            
                                            Spacer(modifier = Modifier.height(16.dp))
                                            
                                            Text(
                                                "No ${selectedCategory.displayName}",
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                                textAlign = TextAlign.Center,
                                                color = Color(0xFF666666)
                                            )
                                            
                                            Spacer(modifier = Modifier.height(8.dp))
                                            
                                            Text(
                                                "This student doesn't have any ${selectedCategory.displayName.lowercase()} recorded yet.",
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = Color(0xFF999999),
                                                textAlign = TextAlign.Center
                                            )
                                        }
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
                                text = "No data available",
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
} 