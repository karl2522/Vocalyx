package com.example.vocalyxapk.composables

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun HomeTab(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Welcome Header
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(Color(0xFFF0F4FF))
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Welcome to Vocalyx",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF333D79),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            Text(
                text = "Your comprehensive teaching assistant",
                style = MaterialTheme.typography.bodyLarge,
                color = Color(0xFF666666),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // App Description
        Text(
            text = "About Vocalyx",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .align(Alignment.Start)
                .padding(bottom = 8.dp)
        )
        
        Text(
            text = "Vocalyx is an educational tool designed to help teachers manage student records, schedule classes, and record student performances efficiently. Using voice recognition technology, Vocalyx makes it easy to input and track student data.",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(bottom = 24.dp)
        )
        
        // Feature Highlights
        Text(
            text = "Key Features",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .align(Alignment.Start)
                .padding(bottom = 8.dp)
        )
        
        // Feature Cards
        FeatureCard(
            icon = Icons.Filled.FileUpload,
            title = "Excel Import",
            description = "Import student records from Excel files with custom column mapping"
        )
        
        FeatureCard(
            icon = Icons.Filled.Mic,
            title = "Voice Recording",
            description = "Record student performance with voice recognition for easier grading"
        )
        
        FeatureCard(
            icon = Icons.Filled.CalendarToday,
            title = "Class Scheduler",
            description = "Manage your class schedule with daily, weekly, and monthly views"
        )
        
        FeatureCard(
            icon = Icons.Filled.Group,
            title = "Team Collaboration",
            description = "Share class data and collaborate with other teachers"
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Getting Started
        Text(
            text = "Getting Started",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .align(Alignment.Start)
                .padding(bottom = 8.dp)
        )
        
        Text(
            text = "1. Create a course and add classes\n2. Import student records from Excel\n3. Use the scheduler to organize your classes\n4. Record student performances with voice input",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        // Version Info
        Text(
            text = "Version 1.0.5 • Last Updated: May 20, 2025",
            style = MaterialTheme.typography.bodySmall,
            color = Color(0xFF666666),
            modifier = Modifier.padding(top = 24.dp, bottom = 16.dp)
        )
    }
}

@Composable
fun FeatureCard(
    icon: ImageVector,
    title: String,
    description: String
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFFE1E5F2)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = Color(0xFF333D79),
                    modifier = Modifier.size(24.dp)
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF333D79)
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF666666)
                )
            }
        }
    }
}
