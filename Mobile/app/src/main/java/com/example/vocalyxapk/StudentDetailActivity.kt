package com.example.vocalyxapk

import android.os.Bundle
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
    
    // Fetch Excel files when the screen is first displayed
    LaunchedEffect(classId) {
        if (classId > 0) {
            excelViewModel.fetchExcelFiles(classId)
        }
    }
    
    // Get current Excel UI state
    val excelUIState = excelViewModel.excelUIState
    
    // Function to categorize assessments based on column name
    fun categorizeAssessment(columnName: String): AssessmentCategory {
        val lowerName = columnName.lowercase()
        return when {
            lowerName.contains("quiz") || lowerName.contains("q") && lowerName.length <= 3 -> AssessmentCategory.QUIZ
            lowerName.contains("lab") || lowerName.contains("laboratory") || lowerName.contains("activity") -> AssessmentCategory.LAB
            lowerName.contains("exam") || lowerName.contains("test") || lowerName.contains("midterm") || lowerName.contains("final") -> AssessmentCategory.EXAM
            else -> AssessmentCategory.QUIZ // Default to quiz
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
    
    // Function to extract student scores
    fun extractStudentScores(
        data: List<Map<String, String>>,
        targetStudentName: String
    ): List<StudentScore> {
        val studentData = data.find { student ->
            val fullName = "${student.values.elementAtOrNull(0)} ${student.values.elementAtOrNull(1)}".trim()
            fullName.equals(targetStudentName, ignoreCase = true) ||
            student.values.any { it.equals(targetStudentName, ignoreCase = true) }
        } ?: return emptyList()
        
        val scores = mutableListOf<StudentScore>()
        studentData.forEach { (columnName, value) ->
            // Skip name columns and empty values
            if (!columnName.contains("name", ignoreCase = true) && 
                !columnName.contains("id", ignoreCase = true) && 
                value.isNotEmpty() && 
                value != "0" && 
                value != "-") {
                
                // Try to parse as score (could be "85/100", "85%", "85", etc.)
                val scoreInfo = parseScore(value)
                if (scoreInfo != null) {
                    scores.add(
                        StudentScore(
                            assessmentName = columnName,
                            score = scoreInfo.first,
                            maxScore = scoreInfo.second,
                            percentage = scoreInfo.third,
                            date = "N/A", // Could be extracted if date column exists
                            category = categorizeAssessment(columnName)
                        )
                    )
                }
            }
        }
        return scores
    }
    
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
                        val studentScores = extractStudentScores(data, studentName)
                        
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
                            val categoryScores = studentScores.filter { it.category == selectedCategory }
                            
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