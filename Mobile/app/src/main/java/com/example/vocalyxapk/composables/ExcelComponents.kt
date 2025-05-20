package com.example.vocalyxapk.composables

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.vocalyxapk.composables.ExcelTableContent
import com.example.vocalyxapk.models.ExcelFileItem
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun ImportExcelCard(onImportClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth(0.9f)
            .height(280.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF5F7FA))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Upload icon
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(40.dp))
                    .background(Color(0xFFE1E5F2))
                    .border(
                        width = 2.dp,
                        color = Color(0xFF333D79),
                        shape = RoundedCornerShape(40.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Upload,
                    contentDescription = "Upload",
                    modifier = Modifier.size(40.dp),
                    tint = Color(0xFF333D79)
                )
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Text(
                "No student records found",
                style = MaterialTheme.typography.titleMedium,
                color = Color(0xFF333D79),
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                "Import an Excel file with your student data to get started",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF666666),
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Button(
                onClick = onImportClick,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF333D79)),
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(
                    Icons.Default.Upload,
                    contentDescription = "Import",
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Import Excel Data")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExcelDataDisplay(
    excelFile: ExcelFileItem,
    sheetData: List<List<String>>,
    selectedSheetName: String?,
    onSelectSheet: (String) -> Unit,
    onDelete: (Int) -> Unit
) {
    // Track fullscreen state
    var isFullscreen by remember { mutableStateOf(false) }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // File info header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = excelFile.file_name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF333D79)
                )
                
                val dateFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
                val formattedDate = try {
                    val date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
                        .parse(excelFile.uploaded_at)
                    dateFormat.format(date!!)
                } catch (e: Exception) {
                    "Unknown date"
                }
                
                Text(
                    text = "Uploaded on $formattedDate",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF666666)
                )
            }
            
            // Delete button
            IconButton(
                onClick = { onDelete(excelFile.id) },
                modifier = Modifier
                    .size(40.dp)
                    .background(
                        color = Color(0xFFFEE8E8),
                        shape = RoundedCornerShape(20.dp)
                    )
            ) {
                Icon(
                    imageVector = Icons.Filled.Delete,
                    contentDescription = "Delete File",
                    tint = Color(0xFFE53935)
                )
            }
            
            Spacer(modifier = Modifier.width(8.dp))
            
            // Fullscreen toggle button
            IconButton(
                onClick = { isFullscreen = !isFullscreen },
                modifier = Modifier
                    .size(40.dp)
                    .background(
                        color = Color(0xFFEEF2FF),
                        shape = RoundedCornerShape(20.dp)
                    )
            ) {
                Icon(
                    imageVector = if (isFullscreen) Icons.Filled.FullscreenExit else Icons.Filled.Fullscreen,
                    contentDescription = if (isFullscreen) "Exit Fullscreen" else "Fullscreen",
                    tint = Color(0xFF333D79)
                )
            }
        }
        
        // Sheet selector
        if (excelFile.sheet_names.size > 1) {
            var expanded by remember { mutableStateOf(false) }
            
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp)
            ) {
                OutlinedTextField(
                    value = selectedSheetName ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Sheet") },
                    trailingIcon = {
                        ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                    },
                    colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
                    modifier = Modifier
                        .menuAnchor()
                        .fillMaxWidth()
                )
                
                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    excelFile.sheet_names.forEach { sheetName ->
                        DropdownMenuItem(
                            text = { Text(sheetName) },
                            onClick = {
                                onSelectSheet(sheetName)
                                expanded = false
                            }
                        )
                    }
                }
            }
        }
        
        // Excel data table
        if (sheetData.isNotEmpty()) {
            // Table header and content
            val horizontalScrollState = rememberScrollState()
            
            Text(
                text = "Student Records",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(vertical = 8.dp)
            )
            
            // Regular table view
            if (!isFullscreen) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .horizontalScroll(horizontalScrollState)
                ) {
                    ExcelTableContent(sheetData = sheetData)
                }
            }

            // Fullscreen dialog for enlarged table view
            if (isFullscreen) {
                Dialog(
                    onDismissRequest = { isFullscreen = false },
                    properties = DialogProperties(dismissOnBackPress = true, dismissOnClickOutside = false, usePlatformDefaultWidth = false)
                ) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        Column(modifier = Modifier.fillMaxSize()) {
                            // Dialog header
                            TopAppBar(
                                title = { 
                                    Column {
                                        Text(
                                            text = excelFile.file_name,
                                            style = MaterialTheme.typography.titleMedium
                                        )
                                        Text(
                                            text = selectedSheetName ?: "",
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }
                                },
                                navigationIcon = {
                                    IconButton(onClick = { isFullscreen = false }) {
                                        Icon(Icons.Default.Close, contentDescription = "Close")
                                    }
                                }
                            )
                            
                            // Full-screen table
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(horizontal = 4.dp)
                                    .horizontalScroll(rememberScrollState())
                            ) {
                                ExcelTableContent(
                                    sheetData = sheetData,
                                    cellWidth = 150.dp,
                                    cellPadding = 12.dp
                                )
                            }
                        }
                    }
                }
            }
        } else {
            // Empty sheet message
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "This sheet contains no data",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF666666),
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
