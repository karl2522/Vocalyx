package com.example.vocalyxapk.composables

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.text.TextStyle
import com.example.vocalyxapk.models.ImportTemplates
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.vocalyxapk.models.ImportTemplate

/**
 * Step 1: File Information
 */
@Composable
fun FileInfoStep(
    fileName: String?,
    onSelectFile: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // File selection area
        Box(
            modifier = Modifier
                .fillMaxWidth(0.8f)
                .height(200.dp)
                .border(
                    width = 2.dp,
                    color = Color(0xFF333D79),
                    shape = RoundedCornerShape(12.dp)
                )
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFFF5F7FA)),
            contentAlignment = Alignment.Center
        ) {
            if (fileName == null) {
                // Show upload prompt
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.CloudUpload,
                        contentDescription = "Upload",
                        modifier = Modifier.size(48.dp),
                        tint = Color(0xFF333D79)
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Text(
                        "Select an Excel file to import",
                        style = MaterialTheme.typography.bodyLarge,
                        color = Color(0xFF333D79)
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Button(
                        onClick = onSelectFile,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF333D79)
                        )
                    ) {
                        Text("Browse Files")
                    }
                }
            } else {
                // Show selected file info
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "File Preview",
                        modifier = Modifier.size(48.dp),
                        tint = Color(0xFF333D79)
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Text(
                        "Selected File:",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666)
                    )
                    
                    Text(
                        fileName,
                        style = MaterialTheme.typography.titleMedium,
                        color = Color(0xFF333D79),
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Button(
                        onClick = onSelectFile,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF333D79)
                        )
                    ) {
                        Text("Change File")
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            "Step 1: Select an Excel file containing your student records",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666),
            textAlign = TextAlign.Center
        )
        
        Text(
            "Supported formats: .xlsx, .xls",
            style = MaterialTheme.typography.bodySmall,
            color = Color(0xFF666666),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}

/**
 * Step 2: Preview Data
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreviewDataStep(
    previewData: List<List<String>>
) {
    // State for the currently selected column index
    var selectedColumnIndex by remember { mutableStateOf(0) }
    var showColumnSelector by remember { mutableStateOf(false) }
    
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        Text(
            "Preview Data by Column:",
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        if (previewData.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "No data available for preview",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF666666)
                )
            }
        } else {
            // Column selector dropdown
            val headers = previewData.firstOrNull() ?: emptyList()
            
            // Dropdown selector for columns
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Selected Column: ",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(end = 8.dp)
                )
                
                ExposedDropdownMenuBox(
                    expanded = showColumnSelector,
                    onExpandedChange = { showColumnSelector = it },
                    modifier = Modifier.weight(1f)
                ) {
                    OutlinedTextField(
                        readOnly = true,
                        value = headers.getOrNull(selectedColumnIndex)?.ifEmpty { "Column ${selectedColumnIndex + 1}" } 
                               ?: "Column ${selectedColumnIndex + 1}",
                        onValueChange = { },
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth(),
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = showColumnSelector) },
                        colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(
                            focusedBorderColor = Color(0xFF333D79),
                            unfocusedBorderColor = Color(0xFFDDDDDD)
                        ),
                        singleLine = true
                    )
                    
                    ExposedDropdownMenu(
                        expanded = showColumnSelector,
                        onDismissRequest = { showColumnSelector = false },
                        modifier = Modifier.heightIn(max = 250.dp)
                    ) {
                        headers.forEachIndexed { index, header ->
                            DropdownMenuItem(
                                text = { Text(header.ifEmpty { "Column ${index + 1}" }) },
                                onClick = {
                                    selectedColumnIndex = index
                                    showColumnSelector = false
                                }
                            )
                        }
                    }
                }
            }
            
            // Column preview
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 300.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF5F7FA)),
                border = BorderStroke(1.dp, Color(0xFFEEEEEE))
            ) {
                Column {
                    // Column header
                    Surface(
                        color = Color(0xFF333D79),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = headers.getOrNull(selectedColumnIndex)?.ifEmpty { "Column ${selectedColumnIndex + 1}" } 
                                  ?: "Column ${selectedColumnIndex + 1}",
                            modifier = Modifier.padding(12.dp),
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleMedium
                        )
                    }
                    
                    // Column data preview
                    val dataRows = if (previewData.size > 1) previewData.subList(1, minOf(15, previewData.size)) else emptyList()
                    
                    LazyColumn(
                        modifier = Modifier.heightIn(max = 250.dp)
                    ) {
                        items(dataRows) { row ->
                            val cellValue = row.getOrNull(selectedColumnIndex) ?: ""
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 8.dp)
                            ) {
                                Text(
                                    text = cellValue,
                                    modifier = Modifier.fillMaxWidth(),
                                    overflow = TextOverflow.Ellipsis,
                                    maxLines = 1
                                )
                            }
                            Divider(color = Color(0xFFEEEEEE))
                        }
                    }
                }
            }
        }
        
        // Note: Providing help text below the column preview
        if (previewData.isNotEmpty()) {
            Text(
                "Tip: Use the dropdown to preview different columns from your Excel file.",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF666666),
                modifier = Modifier.padding(top = 12.dp)
            )
        }
    }
}

/**
 * Step 3: Map Columns
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapColumnsStep(
    allColumns: List<String>,
    selectedTemplate: ImportTemplate?,
    columnMappings: Map<String, String>,
    customColumns: List<String>,
    onSelectTemplate: (ImportTemplate?) -> Unit,
    onMapColumn: (String, String) -> Unit,
    onAddCustomColumn: (String) -> Unit,
    onDeleteCustomColumn: (String) -> Unit,
    onDeleteFile: () -> Unit
) {
    var customColumnName by remember { mutableStateOf("") }
    
    Column(modifier = Modifier.fillMaxSize()) {
        // Template selection section
        Text(
            "Select a template:",
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ImportTemplates.ALL_TEMPLATES.forEach { template ->
                FilterChip(
                    selected = selectedTemplate == template,
                    onClick = { onSelectTemplate(template) },
                    label = { Text(template.name) },
                    modifier = Modifier.height(32.dp)
                )
            }
            
            // Option to clear template selection
            if (selectedTemplate != null) {
                FilterChip(
                    selected = false,
                    onClick = { onSelectTemplate(null) },
                    label = { Text("Clear") },
                    modifier = Modifier.height(32.dp)
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Column mapping section
        Text(
            "Map columns to system fields:",
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            // System fields that need to be mapped
            val systemFields = selectedTemplate?.columns ?: listOf("Student ID", "Student Name", "Score")
            
            items(systemFields) { fieldName ->
                val selectedColumn = columnMappings[fieldName]
                
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = fieldName,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(0.4f)
                    )
                    
                    var expanded by remember { mutableStateOf(false) }
                    
                    ExposedDropdownMenuBox(
                        expanded = expanded,
                        onExpandedChange = { expanded = it },
                        modifier = Modifier.weight(0.6f)
                    ) {
                        OutlinedTextField(
                            value = selectedColumn ?: "Select column",
                            onValueChange = {},
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                            modifier = Modifier.menuAnchor(),
                            colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors()
                        )
                        
                        ExposedDropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false }
                        ) {
                            allColumns.forEach { column ->
                                DropdownMenuItem(
                                    text = { Text(column.ifEmpty { "Column ${allColumns.indexOf(column) + 1}" }) },
                                    onClick = {
                                        onMapColumn(fieldName, column)
                                        expanded = false
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
        
        // Display added custom columns
        if (customColumns.isNotEmpty()) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFEEF2FF)
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Custom Columns",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF333D79)
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    customColumns.forEach { column ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = column,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.weight(1f)
                            )
                            
                            IconButton(
                                onClick = { onDeleteCustomColumn(column) },
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "Delete",
                                    tint = Color(0xFFE53935),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                        
                        if (column != customColumns.last()) {
                            Divider(modifier = Modifier.padding(vertical = 4.dp))
                        }
                    }
                }
            }
        }
        
        // Add custom column section
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp),
            colors = CardDefaults.cardColors(
                containerColor = Color(0xFFF5F7FA)
            )
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    "Add Custom Column",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = customColumnName,
                        onValueChange = { customColumnName = it },
                        label = { Text("Column Name") },
                        modifier = Modifier.weight(1f)
                    )
                    
                    Spacer(modifier = Modifier.width(8.dp))
                    
                    IconButton(
                        onClick = {
                            if (customColumnName.isNotEmpty()) {
                                onAddCustomColumn(customColumnName)
                                customColumnName = ""
                            }
                        },
                        modifier = Modifier
                            .size(40.dp)
                            .background(
                                color = Color(0xFF333D79),
                                shape = RoundedCornerShape(20.dp)
                            )
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = "Add",
                            tint = Color.White
                        )
                    }
                }
            }
        }
        
        // Delete file option
        OutlinedButton(
            onClick = onDeleteFile,
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = Color(0xFFE53935)
            ),
            border = BorderStroke(1.dp, Color(0xFFE53935)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Delete,
                contentDescription = "Delete File",
                tint = Color(0xFFE53935),
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Delete File", color = Color(0xFFE53935))
        }
    }
}

/**
 * Helper function to find key fields in the data
 */
private fun findKeyFields(data: List<List<String>>): Map<String, String> {
    if (data.isEmpty() || data[0].isEmpty()) return emptyMap()
    
    val keyFields = mutableMapOf<String, String>()
    val keyFieldNames = listOf("Project Name", "Developer", "Tester", "Test Suite ID", "Description")
    
    // Look for key fields in the first column
    data.forEach { row ->
        if (row.size >= 2) {
            val potentialField = row[0]
            val value = row.getOrNull(1) ?: ""
            
            keyFieldNames.forEach { keyField ->
                if (potentialField.contains(keyField, ignoreCase = true) && value.isNotBlank()) {
                    keyFields[keyField] = value
                }
            }
        }
    }
    
    return keyFields
}
