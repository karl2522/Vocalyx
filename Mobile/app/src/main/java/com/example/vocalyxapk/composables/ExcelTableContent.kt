package com.example.vocalyxapk.composables

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp


@Composable
fun ExcelTableContent(
    sheetData: List<List<String>>,
    cellWidth: Dp = 120.dp,
    cellPadding: Dp = 8.dp
) {
    Column(
        modifier = Modifier.padding(bottom = 1.dp)
    ) {
        val headers = if (sheetData.isNotEmpty()) sheetData[0] else emptyList()
        val dataRows = if (sheetData.size > 1) sheetData.subList(1, sheetData.size) else emptyList()

        // Header row with sticky styling
        Row(modifier = Modifier
            .background(Color(0xFF333D79))
        ) {
            headers.forEach { header ->
                Box(
                    modifier = Modifier
                        .width(cellWidth)
                        .border(width = 0.5.dp, color = Color.White.copy(alpha = 0.3f))
                        .padding(cellPadding),
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

        // Display all data rows (increased from previous implementation which may have been limited)
        dataRows.forEachIndexed { index, row ->
            Row(
                modifier = Modifier.background(
                    if (index % 2 == 0) Color.White else Color(0xFFF9FAFC)
                )
            ) {
                row.forEach { cell ->
                    Box(
                        modifier = Modifier
                            .width(cellWidth)
                            .border(width = 0.5.dp, color = Color(0xFFDDDDDD))
                            .padding(cellPadding),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = cell,
                            maxLines = 2, // Reduced from 3 to make rows more compact
                            overflow = TextOverflow.Ellipsis,
                            textAlign = TextAlign.Center,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }
        
        // Add hint for more data if available
        if (dataRows.size > 5) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFF5F7FA))
                    .padding(vertical = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Scroll to see ${dataRows.size} total rows",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF333D79)
                )
            }
        }
    }
}