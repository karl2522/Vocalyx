package com.example.vocalyxapk.composables

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Info
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
import androidx.compose.ui.unit.sp
import com.example.vocalyxapk.models.ImportTemplate
import com.example.vocalyxapk.models.SystemField

/**
 * Step 1: File Information
 */
@Composable
fun FileInfoStep(
    fileName: String,
    fileSize: String = "",
    fileDate: String = "",
    sheetNames: List<String> = emptyList(),
    selectedSheet: String = "",
    onSheetSelect: (String) -> Unit = {},
    onSelectFile: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        if (fileName.isEmpty()) {
            // Show empty state when no file is selected
            EmptyFileState(onSelectFile)
        } else {
            // Show file information
            FileInfoContent(
                fileName = fileName,
                fileSize = fileSize,
                fileDate = fileDate,
                sheetNames = sheetNames,
                selectedSheet = selectedSheet,
                onSheetSelect = onSheetSelect
            )
        }
    }
}

@Composable
private fun EmptyFileState(onSelectFile: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1.33f)
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFF5F5F5))
            .border(1.dp, Color(0xFFE0E0E0), RoundedCornerShape(12.dp)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(24.dp)
        ) {
            Icon(
                Icons.Default.CloudUpload,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = Color(0xFF333D79)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                "No File Selected",
                style = MaterialTheme.typography.titleLarge,
                color = Color(0xFF333D79),
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                "Upload an Excel file to import data",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF666666),
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Button(
                onClick = onSelectFile,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF333D79)
                ),
                modifier = Modifier.padding(horizontal = 16.dp)
            ) {
                Icon(
                    Icons.Default.Upload,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Select Excel File")
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                "Supported formats: .xlsx, .xls",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF666666)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FileInfoContent(
    fileName: String,
    fileSize: String,
    fileDate: String,
    sheetNames: List<String>,
    selectedSheet: String,
    onSheetSelect: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        ),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // File header with icon
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                // File icon based on extension
                Card(
                    modifier = Modifier.size(48.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFEEF0F8)
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        when {
                            fileName.endsWith(".xlsx", ignoreCase = true) -> {
                                Icon(
                                    Icons.Default.Description,
                                    contentDescription = null,
                                    tint = Color(0xFF333D79),
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                            fileName.endsWith(".xls", ignoreCase = true) -> {
                                Icon(
                                    Icons.Default.Description,
                                    contentDescription = null,
                                    tint = Color(0xFF333D79),
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                            fileName.endsWith(".csv", ignoreCase = true) -> {
                                Icon(
                                    Icons.Default.TextSnippet,
                                    contentDescription = null,
                                    tint = Color(0xFF333D79),
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                            else -> {
                                Icon(
                                    Icons.Default.InsertDriveFile,
                                    contentDescription = null,
                                    tint = Color(0xFF333D79),
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }
                    }
                }
                
                Spacer(modifier = Modifier.width(16.dp))
                
                // File name and details
                Column {
                    Text(
                        text = fileName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF333333)
                    )
                    
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (fileSize.isNotEmpty()) {
                            Text(
                                text = fileSize,
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF666666)
                            )
                        }
                        
                        if (fileDate.isNotEmpty()) {
                            if (fileSize.isNotEmpty()) {
                                Box(
                                    modifier = Modifier
                                        .size(4.dp)
                                        .background(Color(0xFFCCCCCC), CircleShape)
                                )
                            }
                            
                            Text(
                                text = fileDate,
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF666666)
                            )
                        }
                    }
                }
            }
            
            Divider(color = Color(0xFFEEEEEE))
            
            // Sheet selection if multiple sheets exist
            if (sheetNames.isNotEmpty()) {
                Column(
                    modifier = Modifier.padding(vertical = 16.dp)
                ) {
                    Text(
                        text = "Select Worksheet",
                        style = MaterialTheme.typography.titleSmall,
                        color = Color(0xFF333333),
                        fontWeight = FontWeight.Medium
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    var sheetMenuExpanded by remember { mutableStateOf(false) }
                    
                    ExposedDropdownMenuBox(
                        expanded = sheetMenuExpanded,
                        onExpandedChange = { sheetMenuExpanded = it }
                    ) {
                        OutlinedTextField(
                            value = selectedSheet.ifEmpty { "Select a worksheet" },
                            onValueChange = { },
                            readOnly = true,
                            trailingIcon = {
                                ExposedDropdownMenuDefaults.TrailingIcon(expanded = sheetMenuExpanded)
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFF333D79),
                                unfocusedBorderColor = Color(0xFFDDDDDD)
                            )
                        )
                        
                        ExposedDropdownMenu(
                            expanded = sheetMenuExpanded,
                            onDismissRequest = { sheetMenuExpanded = false }
                        ) {
                            sheetNames.forEach { sheet ->
                                DropdownMenuItem(
                                    text = { Text(sheet) },
                                    onClick = {
                                        onSheetSelect(sheet)
                                        sheetMenuExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }
                
                Divider(color = Color(0xFFEEEEEE))
            }
            
            // Import information
            Column(
                modifier = Modifier.padding(vertical = 16.dp)
            ) {
                Text(
                    text = "Import Information",
                    style = MaterialTheme.typography.titleSmall,
                    color = Color(0xFF333333),
                    fontWeight = FontWeight.Medium
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFF8F9FC)
                    ),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, Color(0xFFEEEEEE))
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        StepItem(
                            number = 1,
                            text = "Data will be loaded into the spreadsheet editor"
                        )
                        
                        Spacer(modifier = Modifier.height(12.dp))
                        
                        StepItem(
                            number = 2,
                            text = "You can map columns to specific data fields"
                        )
                        
                        Spacer(modifier = Modifier.height(12.dp))
                        
                        StepItem(
                            number = 3,
                            text = "Save changes to update class records"
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StepItem(number: Int, text: String) {
    Row(
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .background(
                    color = Color(0xFFEEF0F8),
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = number.toString(),
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF333D79)
            )
        }
        
        Spacer(modifier = Modifier.width(12.dp))
        
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666)
        )
    }
}

/**
 * Step 2: Preview Data
 */
@Composable
fun PreviewDataStep(
    previewData: List<List<String>>,
    detectedNameColumn: Int = -1,
    detectedIdColumn: Int = -1
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Preview info card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            colors = CardDefaults.cardColors(
                containerColor = Color(0xFFEEF0F8)
            ),
            shape = RoundedCornerShape(8.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Outlined.Info,
                    contentDescription = null,
                    tint = Color(0xFF333D79),
                    modifier = Modifier.size(24.dp)
                )
                
                Spacer(modifier = Modifier.width(12.dp))
                
                Column {
                    Text(
                        text = "Data Preview",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF333D79)
                    )
                    
                    Text(
                        text = "This is a preview of your data. In the next step, you'll be able to map columns to specific fields.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF666666)
                    )
                }
            }
        }
        
        // Data table
        if (previewData.isEmpty()) {
            // Empty state
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .background(Color.White, RoundedCornerShape(8.dp))
                    .border(1.dp, Color(0xFFEEEEEE), RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No data available for preview",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF666666)
                )
            }
        } else {
            // Scrollable table with header and data
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                colors = CardDefaults.cardColors(
                    containerColor = Color.White
                ),
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(1.dp)  // Border effect
                ) {
                    // Header row (if available)
                    if (previewData.size > 0) {
                        val headers = previewData[0]
                        
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF5F5F5))
                                .padding(vertical = 8.dp)
                                .horizontalScroll(rememberScrollState())
                        ) {
                            headers.forEachIndexed { index, header ->
                                val isNameColumn = index == detectedNameColumn
                                val isIdColumn = index == detectedIdColumn
                                
                                Box(
                                    modifier = Modifier
                                        .width(120.dp)
                                        .padding(horizontal = 8.dp)
                                ) {
                                    Text(
                                        text = header,
                                        style = MaterialTheme.typography.bodyMedium.copy(
                                            fontWeight = FontWeight.Bold
                                        ),
                                        color = when {
                                            isNameColumn -> Color(0xFF388E3C)  // Green for name column
                                            isIdColumn -> Color(0xFF1976D2)    // Blue for ID column
                                            else -> Color(0xFF333333)
                                        },
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    
                                    if (isNameColumn || isIdColumn) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(top = 4.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(
                                                Icons.Outlined.CheckCircle,
                                                contentDescription = null,
                                                tint = if (isNameColumn) Color(0xFF388E3C) else Color(0xFF1976D2),
                                                modifier = Modifier.size(12.dp)
                                            )
                                            
                                            Spacer(modifier = Modifier.width(4.dp))
                                            
                                            Text(
                                                text = if (isNameColumn) "Name" else "ID",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = if (isNameColumn) Color(0xFF388E3C) else Color(0xFF1976D2)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Data rows (limited to 10 rows for preview)
                    LazyColumn(
                        modifier = Modifier.weight(1f)
                    ) {
                        val dataRows = if (previewData.size > 1) {
                            previewData.subList(1, minOf(previewData.size, 11))
                        } else {
                            emptyList()
                        }
                        
                        items(dataRows) { row ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp)
                                    .horizontalScroll(rememberScrollState())
                            ) {
                                row.forEachIndexed { index, cell ->
                                    Box(
                                        modifier = Modifier
                                            .width(120.dp)
                                            .padding(horizontal = 8.dp)
                                    ) {
                                        Text(
                                            text = cell,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = Color(0xFF666666),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                            
                            Divider(color = Color(0xFFEEEEEE))
                        }
                    }
                    
                    // Show all rows message
                    if (previewData.size > 11) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF5F5F5))
                                .padding(vertical = 8.dp, horizontal = 16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Showing 10 of ${previewData.size - 1} rows",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF666666)
                            )
                        }
                    }
                }
            }
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
    columnMappings: Map<String, String>,
    onMapColumn: (field: String, column: String) -> Unit,
    selectedTemplate: ImportTemplate? = null,
    onSelectTemplate: (ImportTemplate?) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
    ) {
        // Template selection
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            colors = CardDefaults.cardColors(
                containerColor = Color.White
            ),
            shape = RoundedCornerShape(8.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Select Import Template",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF333333),
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                
                Text(
                    text = "Choose a template to automatically map common columns",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF666666),
                    modifier = Modifier.padding(bottom = 16.dp)
                )
                
                // Template chips
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // "None" option
                    FilterChip(
                        selected = selectedTemplate == null,
                        onClick = { onSelectTemplate(null) },
                        label = { Text("None") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFF333D79),
                            selectedLabelColor = Color.White
                        )
                    )
                    
                    // Template options
                    ImportTemplates.ALL_TEMPLATES.forEach { template ->
                        FilterChip(
                            selected = selectedTemplate?.name == template.name,
                            onClick = { onSelectTemplate(template) },
                            label = { Text(template.name) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFF333D79),
                                selectedLabelColor = Color.White
                            )
                        )
                    }
                }
            }
        }
        
        // Column mappings
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = Color.White
            ),
            shape = RoundedCornerShape(8.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Map Columns to Fields",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF333333),
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                
                Text(
                    text = "Connect your spreadsheet columns to the appropriate student data fields",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF666666),
                    modifier = Modifier.padding(bottom = 16.dp)
                )
                
                // Info card
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFEDF7FF)
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Outlined.Info,
                            contentDescription = null,
                            tint = Color(0xFF1976D2),
                            modifier = Modifier.size(20.dp)
                        )
                        
                        Spacer(modifier = Modifier.width(8.dp))
                        
                        Text(
                            text = "Student name columns will be automatically detected. Map additional columns as needed.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF1976D2)
                        )
                    }
                }
                
                // Field mappings
                Column(
                    modifier = Modifier.padding(bottom = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Required fields
                    Text(
                        text = "Required Fields",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF333333),
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                    
                    SystemField.values().filter { 
                        it == SystemField.STUDENT_ID || it == SystemField.STUDENT_NAME 
                    }.forEach { field ->
                        MappingDropdown(
                            fieldName = field.displayName,
                            allColumns = allColumns,
                            selectedColumn = columnMappings[field.displayName] ?: "",
                            onColumnSelected = { column ->
                                onMapColumn(field.displayName, column)
                            },
                            isRequired = true
                        )
                    }
                    
                    Divider(color = Color(0xFFEEEEEE))
                    
                    // Optional fields
                    Text(
                        text = "Additional Fields",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF333333),
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                    
                    SystemField.values().filter { 
                        it != SystemField.STUDENT_ID && it != SystemField.STUDENT_NAME 
                    }.forEach { field ->
                        MappingDropdown(
                            fieldName = field.displayName,
                            allColumns = allColumns,
                            selectedColumn = columnMappings[field.displayName] ?: "",
                            onColumnSelected = { column ->
                                onMapColumn(field.displayName, column)
                            },
                            isRequired = false
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MappingDropdown(
    fieldName: String,
    allColumns: List<String>,
    selectedColumn: String,
    onColumnSelected: (String) -> Unit,
    isRequired: Boolean = false
) {
    var expanded by remember { mutableStateOf(false) }
    
    Column {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 4.dp)
        ) {
            Text(
                text = fieldName,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF333333)
            )
            
            if (isRequired) {
                Text(
                    text = " *",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.Red
                )
            }
        }
        
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = it }
        ) {
            OutlinedTextField(
                value = selectedColumn.ifEmpty { "Select a column" },
                onValueChange = { },
                readOnly = true,
                trailingIcon = {
                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF333D79),
                    unfocusedBorderColor = Color(0xFFDDDDDD),
                    unfocusedContainerColor = Color.White,
                    focusedContainerColor = Color.White
                ),
                supportingText = if (isRequired && selectedColumn.isEmpty()) {
                    { Text("This field is required") }
                } else null
            )
            
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
                modifier = Modifier.heightIn(max = 240.dp)
            ) {
                allColumns.forEach { column ->
                    DropdownMenuItem(
                        text = { Text(column) },
                        onClick = {
                            onColumnSelected(column)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}
