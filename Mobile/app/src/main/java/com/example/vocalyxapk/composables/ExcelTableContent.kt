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

        Row(modifier = Modifier.background(Color(0xFFF5F7FA))) {
            headers.forEach { header ->
                Box(
                    modifier = Modifier
                        .width(cellWidth)
                        .border(width = 1.dp, color = Color(0xFFDDDDDD))
                        .padding(cellPadding)
                        .background(Color(0xFFF5F7FA)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = header,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        textAlign = TextAlign.Center,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }

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
                            .border(width = 1.dp, color = Color(0xFFDDDDDD))
                            .padding(cellPadding),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = cell,
                            maxLines = 3,
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