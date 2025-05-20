package com.example.vocalyxapk.composables

import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.vocalyxapk.FileViewerActivity
import com.example.vocalyxapk.models.ClassItem

@Composable
fun BackendClassCard(classData: ClassItem) {
    val context = LocalContext.current
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(120.dp)
            .clickable {
                // Launch MyStudentsActivity with class data
                val intent = android.content.Intent(context, com.example.vocalyxapk.MyStudentsActivity::class.java).apply {
                    putExtra("CLASS_ID", classData.id)
                    putExtra("CLASS_NAME", classData.name)
                    putExtra("CLASS_SECTION", classData.section)
                }
                context.startActivity(intent)
            },
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFF8F9FA)
        ),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier
                .padding(12.dp)
                .fillMaxWidth()
        ) {
            Text(
                classData.name,
                style = MaterialTheme.typography.titleMedium.copy(
                    color = Color(0xFF333D79)
                ),
                maxLines = 1
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                classData.section ?: "No section",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF666666),
                maxLines = 1
            )
            Spacer(modifier = Modifier.weight(1f))
            
            // Show relevant class details
            val recordingText = if (classData.recordings_count != null && classData.recordings_count > 0) {
                "${classData.recordings_count} recordings"
            } else {
                "No recordings"
            }
            
            Text(
                recordingText,
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF666666)
            )
        }
    }
}
