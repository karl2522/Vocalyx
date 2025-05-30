package com.example.vocalyxapk.composables

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
                    .size(36.dp)
                    .background(
                        color = Color(0xFFFFEBEE),
                        shape = RoundedCornerShape(18.dp)
                    )
            ) {
                Icon(
                    imageVector = Icons.Filled.Delete,
                    contentDescription = "Delete File",
                    tint = Color(0xFFE53935),
                    modifier = Modifier.size(18.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Fullscreen toggle button
            IconButton(
                onClick = { isFullscreen = !isFullscreen },
                modifier = Modifier
                    .size(36.dp)
                    .background(
                        color = Color(0xFFEEF2FF),
                        shape = RoundedCornerShape(18.dp)
                    )
            ) {
                Icon(
                    imageVector = if (isFullscreen) Icons.Filled.FullscreenExit else Icons.Filled.Fullscreen,
                    contentDescription = if (isFullscreen) "Exit Fullscreen" else "Fullscreen",
                    tint = Color(0xFF333D79),
                    modifier = Modifier.size(18.dp)
                )
            }
        }

        // Sheet selector for non-fullscreen mode
        if (excelFile.sheet_names.size > 1 && !isFullscreen) {
            SheetSelector(
                sheetNames = excelFile.sheet_names,
                selectedSheetName = selectedSheetName,
                onSelectSheet = onSelectSheet
            )
        }

        if (sheetData.isNotEmpty()) {

            // Display summary of data
            Text(
                text = "${sheetData.size - 1} rows, ${if (sheetData.isNotEmpty()) sheetData[0].size else 0} columns",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF666666),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            if (!isFullscreen) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        // Set a minimum height to show at least 5 rows (header + 4 data rows)
                        .heightIn(min = 300.dp)
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .border(1.dp, Color(0xFFEEEEEE), RoundedCornerShape(8.dp))
                ) {
                    // Use vertical and horizontal scrolling for better table navigation
                    val verticalScrollState = rememberScrollState()
                    val horizontalScrollState = rememberScrollState()
                    
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(verticalScrollState)
                            .horizontalScroll(horizontalScrollState)
                    ) {
                        // Header row with blue background
                        if (sheetData.isNotEmpty()) {
                            Row(modifier = Modifier.background(Color(0xFF333D79))) {
                                sheetData[0].forEach { header ->
                                    Box(
                                        modifier = Modifier
                                            .width(120.dp)
                                            .border(width = 0.5.dp, color = Color.White.copy(alpha = 0.3f))
                                            .padding(vertical = 12.dp, horizontal = 8.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = header,
                                            fontWeight = FontWeight.Bold,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis,
                                            textAlign = TextAlign.Center,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = Color.White
                                        )
                                    }
                                }
                            }
                            
                            // Data rows with alternating background
                            if (sheetData.size > 1) {
                                for (i in 1 until sheetData.size) {
                                    Row(modifier = Modifier.background(
                                        if (i % 2 == 0) Color.White else Color(0xFFF5F7FA)
                                    )) {
                                        sheetData[i].forEach { cell ->
                                            Box(
                                                modifier = Modifier
                                                    .width(120.dp)
                                                    .border(width = 0.5.dp, color = Color(0xFFDDDDDD))
                                                    .padding(vertical = 10.dp, horizontal = 8.dp),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(
                                                    text = cell,
                                                    maxLines = 2,
                                                    overflow = TextOverflow.Ellipsis,
                                                    textAlign = TextAlign.Center,
                                                    style = MaterialTheme.typography.bodySmall
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Show scrolling hint
                    if (sheetData.size > 5) {
                        Text(
                            text = "Scroll to view all data",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF333D79),
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .padding(bottom = 4.dp)
                                .background(Color(0xFFF5F7FA).copy(alpha = 0.8f))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            if (isFullscreen) {
                // Fullscreen mode with improved controls
                FullscreenExcelView(
                    excelFile = excelFile,
                    sheetData = sheetData,
                    selectedSheetName = selectedSheetName,
                    onSelectSheet = onSelectSheet,
                    onClose = { isFullscreen = false }
                )
            }
        } else {
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SheetSelector(
    sheetNames: List<String>,
    selectedSheetName: String?,
    onSelectSheet: (String) -> Unit
) {
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
            sheetNames.forEach { sheetName ->
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FullscreenExcelView(
    excelFile: ExcelFileItem,
    sheetData: List<List<String>>,
    selectedSheetName: String?,
    onSelectSheet: (String) -> Unit,
    onClose: () -> Unit
) {
    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false
        )
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Top bar with sheet selector
                TopAppBar(
                    title = {
                        Text(
                            text = excelFile.file_name,
                            style = MaterialTheme.typography.titleMedium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = onClose) {
                            Icon(Icons.Default.Close, contentDescription = "Close")
                        }
                    },
                    actions = {
                        // Sheet selector in the app bar
                        if (excelFile.sheet_names.size > 1) {
                            var expanded by remember { mutableStateOf(false) }

                            Box(modifier = Modifier.width(180.dp)) {
                                OutlinedTextField(
                                    value = selectedSheetName ?: "",
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Sheet", style = MaterialTheme.typography.bodySmall) },
                                    trailingIcon = {
                                        IconButton(onClick = { expanded = !expanded }) {
                                            Icon(
                                                imageVector = if (expanded) Icons.Default.Close else Icons.Default.FullscreenExit,
                                                contentDescription = "Select Sheet"
                                            )
                                        }
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 8.dp, horizontal = 8.dp),
                                    textStyle = MaterialTheme.typography.bodyMedium,
                                    singleLine = true
                                )

                                DropdownMenu(
                                    expanded = expanded,
                                    onDismissRequest = { expanded = false },
                                    modifier = Modifier.width(180.dp)
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
                    }
                )

                val verticalScrollState = rememberScrollState()
                val horizontalScrollState = rememberScrollState()

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                        .verticalScroll(verticalScrollState)
                ) {
                    Column {
                        Box(
                            modifier = Modifier
                                .horizontalScroll(horizontalScrollState)
                        ) {
                            ExcelTableContent(
                                sheetData = sheetData,
                                cellWidth = 150.dp,
                                cellPadding = 16.dp
                            )
                        }

                        // Add some space at the bottom to ensure last row is visible
                        Spacer(modifier = Modifier.height(60.dp))
                    }
                }

                // Optional: Add scroll hint at the bottom
                if (verticalScrollState.canScrollForward || verticalScrollState.canScrollBackward) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFEEF2FF))
                            .padding(4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "Scroll to see more rows",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF333D79)
                        )
                    }
                }
            }
        }
    }
}
