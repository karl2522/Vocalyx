package com.example.vocalyxapk.composables

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.vocalyxapk.viewmodel.ExcelViewModel

enum class RecordingCategory(
    val displayName: String, 
    val icon: ImageVector, 
    val color: Color,
    val baseColumnName: String,
    val alternativePatterns: List<String> = emptyList()
) {
    QUIZ("Quizzes", Icons.Default.Quiz, Color(0xFF2196F3), "Quiz"),
    LAB("Laboratory Activities", Icons.Default.Science, Color(0xFF4CAF50), "Laboratory Activity", listOf("Lab")),
    EXAM("Exams", Icons.Default.School, Color(0xFFFF5722), "Exam")
}

@Composable
fun CategorySelectionDialog(
    excelViewModel: ExcelViewModel,
    onDismiss: () -> Unit,
    onCategorySelected: (category: RecordingCategory, subcategory: String?) -> Unit
) {
    // Get current sheet data to analyze existing columns
    val sheetData = excelViewModel.getSelectedSheetDataAsMap()
    val headers = (sheetData["headers"] as? List<String>) ?: emptyList()
    
    // Add debug logging to help investigate data fetching issues
    Log.d("CategorySelectionDialog", "=== DEBUGGING EXAM COLUMNS ===")
    Log.d("CategorySelectionDialog", "Total headers received: ${headers.size}")
    Log.d("CategorySelectionDialog", "Headers: $headers")
    
    // Function to get existing subcategories for a category
    fun getExistingSubcategories(category: RecordingCategory): List<String> {
        return when (category) {
            RecordingCategory.EXAM -> {
                // More flexible exam detection
                val examKeywords = listOf(
                    "prelim", "midterm", "prefinal", "pre-final", "final", "finals",
                    "exam", "examination", "test"
                )
                
                val matchingColumns = headers.filter { header ->
                    val lowerHeader = header.lowercase()
                    examKeywords.any { keyword ->
                        lowerHeader.contains(keyword)
                    }
                }.sortedBy { header ->
                    // Sort by predefined order for exams
                    when {
                        header.contains("prelim", ignoreCase = true) -> 1
                        header.contains("midterm", ignoreCase = true) -> 2
                        header.contains("prefinal", ignoreCase = true) || 
                        header.contains("pre-final", ignoreCase = true) -> 3
                        header.contains("final", ignoreCase = true) -> 4
                        else -> 5
                    }
                }
                
                Log.d("CategorySelectionDialog", "Found exam columns: $matchingColumns")
                matchingColumns
            }
            else -> {
                // For Quiz and Lab, find incrementally numbered columns
                // Check both base column name and alternative patterns
                val allPatterns = listOf(category.baseColumnName) + category.alternativePatterns
                
                val matchingColumns = headers.filter { header ->
                    allPatterns.any { pattern ->
                        header.contains(pattern, ignoreCase = true)
                    }
                }.sortedBy { header ->
                    // Extract number from the column name for proper sorting
                    val numberRegex = "\\d+".toRegex()
                    val match = numberRegex.find(header)
                    match?.value?.toIntOrNull() ?: 0
                }
                
                Log.d("CategorySelectionDialog", "Found ${category.displayName} columns: $matchingColumns")
                matchingColumns
            }
        }
    }
    
    // Function to get next available column name
    fun getNextColumnName(category: RecordingCategory): String {
        val existing = getExistingSubcategories(category)
        
        return when (category) {
            RecordingCategory.EXAM -> {
                val examTypes = listOf("Prelim Exam", "Midterm Exam", "Prefinal Exam", "Final Exam")
                val existingLower = existing.map { it.lowercase() }
                
                examTypes.firstOrNull { examType -> 
                    val examTypeLower = examType.lowercase()
                    !existingLower.any { existing ->
                        existing.contains("prelim") && examTypeLower.contains("prelim") ||
                        existing.contains("midterm") && examTypeLower.contains("midterm") ||
                        (existing.contains("prefinal") || existing.contains("pre-final")) && examTypeLower.contains("prefinal") ||
                        existing.contains("final") && !existing.contains("prefinal") && examTypeLower.contains("final") && !examTypeLower.contains("prefinal")
                    }
                } ?: "Final Exam"
            }
            RecordingCategory.LAB -> {
                // For Lab, use "Lab X" format
                val maxNumber = existing.mapNotNull { column ->
                    val numberRegex = "\\d+".toRegex()
                    numberRegex.find(column)?.value?.toIntOrNull()
                }.maxOrNull() ?: 0
                
                "Lab ${maxNumber + 1}"
            }
            else -> {
                // For Quiz and other categories, use base column name
                val maxNumber = existing.mapNotNull { column ->
                    val numberRegex = "\\d+".toRegex()
                    numberRegex.find(column)?.value?.toIntOrNull()
                }.maxOrNull() ?: 0
                
                "${category.baseColumnName} ${maxNumber + 1}"
            }
        }
    }

    var selectedCategory by remember { mutableStateOf<RecordingCategory?>(null) }
    
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = true,
            usePlatformDefaultWidth = false
        )
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(8.dp),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Category,
                        contentDescription = null,
                        tint = Color(0xFF333D79),
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        "Select Recording Category",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF333D79)
                    )
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    "Choose the type of assessment you want to record",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF666666)
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                
                if (selectedCategory == null) {
                    // Show category selection
                    RecordingCategory.values().forEach { category ->
                        CategoryCard(
                            category = category,
                            existingCount = getExistingSubcategories(category).size,
                            onCategoryClick = { selectedCategory = category }
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                } else {
                    // Show subcategory selection
                    SubcategorySelection(
                        category = selectedCategory!!,
                        existingSubcategories = getExistingSubcategories(selectedCategory!!),
                        nextColumnName = getNextColumnName(selectedCategory!!),
                        onSubcategorySelected = { subcategory ->
                            onCategorySelected(selectedCategory!!, subcategory)
                        },
                        onBack = { selectedCategory = null }
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Cancel button
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = Color(0xFF666666)
                    )
                ) {
                    Text("Cancel")
                }
            }
        }
    }
}

@Composable
fun CategoryCard(
    category: RecordingCategory,
    existingCount: Int,
    onCategoryClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onCategoryClick() },
        colors = CardDefaults.cardColors(
            containerColor = category.color.copy(alpha = 0.1f)
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
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(category.color.copy(alpha = 0.2f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    category.icon,
                    contentDescription = null,
                    tint = category.color,
                    modifier = Modifier.size(24.dp)
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            // Category info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    category.displayName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = category.color
                )
                Text(
                    if (existingCount > 0) "$existingCount existing columns" else "No existing columns",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF666666)
                )
            }
            
            // Arrow icon
            Icon(
                Icons.Default.ArrowForward,
                contentDescription = null,
                tint = category.color
            )
        }
    }
}

@Composable
fun SubcategorySelection(
    category: RecordingCategory,
    existingSubcategories: List<String>,
    nextColumnName: String,
    onSubcategorySelected: (String?) -> Unit,
    onBack: () -> Unit
) {
    Column {
        // Back button
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onBack() }
                .padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.ArrowBack,
                contentDescription = "Back",
                tint = Color(0xFF666666),
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                "Back to categories",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF666666)
            )
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Category header
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                category.icon,
                contentDescription = null,
                tint = category.color,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                category.displayName,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = category.color
            )
        }
        
        Spacer(modifier = Modifier.height(16.dp))


        // Existing subcategories
        if (existingSubcategories.isNotEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                "Or record to existing:",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF666666),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.heightIn(max = 200.dp)
            ) {
                items(existingSubcategories) { subcategory ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSubcategorySelected(subcategory) },
                        colors = CardDefaults.cardColors(
                            containerColor = Color(0xFFF8F9FC)
                        ),
                        elevation = CardDefaults.cardElevation(1.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                category.icon,
                                contentDescription = null,
                                tint = category.color.copy(alpha = 0.7f),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                subcategory,
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFF333333),
                                modifier = Modifier.weight(1f)
                            )
                            Icon(
                                Icons.Default.Edit,
                                contentDescription = null,
                                tint = Color(0xFF999999),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }
        } else {
            Spacer(modifier = Modifier.height(16.dp))
            
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFF0F0F0)
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "No existing columns",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666),
                        textAlign = TextAlign.Center
                    )
                    Text(
                        "This will be your first ${category.displayName.lowercase()} record",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF999999),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
} 