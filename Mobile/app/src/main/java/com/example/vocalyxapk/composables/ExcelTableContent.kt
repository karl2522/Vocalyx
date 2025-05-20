package com.example.vocalyxapk.composables

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Excel table content component that displays the data in a table format
 */
@Composable
fun ExcelTableContent(
    sheetData: List<List<String>>,
    cellWidth: Dp = 120.dp,
    cellPadding: Dp = 8.dp
) {
    // Limit the overall height to approximately half the screen
    Column(modifier = Modifier.heightIn(max = 350.dp)) {
        // Table header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF333D79))
        ) {
            if (sheetData.isNotEmpty() && sheetData[0].isNotEmpty()) {
                sheetData[0].forEach { headerCell ->
                    Text(
                        text = headerCell,
                        modifier = Modifier
                            .padding(cellPadding)
                            .width(cellWidth),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        overflow = TextOverflow.Ellipsis,
                        maxLines = 1
                    )
                }
            }
        }
        
        // Table content
        LazyColumn(
            modifier = Modifier.fillMaxSize()
        ) {
            if (sheetData.size > 1) {
                items(sheetData.size - 1) { index ->
                    val rowIndex = index + 1  // Skip header row
                    val row = sheetData[rowIndex]
                    
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                if (rowIndex % 2 == 0) Color(0xFFF5F7FA)
                                else Color.White
                            )
                    ) {
                        row.forEach { cell ->
                            Text(
                                text = cell,
                                modifier = Modifier
                                    .padding(cellPadding)
                                    .width(cellWidth),
                                overflow = TextOverflow.Ellipsis,
                                maxLines = 1
                            )
                        }
                    }
                    
                    Divider(color = Color(0xFFEEEEEE))
                }
            }
        }
    }
}
