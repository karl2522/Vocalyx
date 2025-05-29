package com.example.vocalyxapk

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme

class ClassDetailActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val classIndex = intent?.getIntExtra("class_index", -1) ?: -1
        setContent {
            VOCALYXAPKTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ClassDetailScreen(classIndex = classIndex)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClassDetailScreen(classIndex: Int) {
    val activity = LocalContext.current as? ComponentActivity
    val importedClass = if (classIndex >= 0 && classIndex < ClassRepository.classes.size)
        ClassRepository.classes[classIndex]
    else
        null

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(importedClass?.name ?: "Class Detail") },
                navigationIcon = {
                    IconButton(onClick = { activity?.finish() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        if (importedClass == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Text("Class not found.", color = Color.Gray)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Section: ${importedClass.section}",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
                val data = importedClass.fileData
                if (data.isNotEmpty()) {
                    val horizontalScrollState = rememberScrollState()
                    LazyColumn {
                        items(data) { row ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(horizontalScrollState)
                                    .background(
                                        if (row == data.first())
                                            MaterialTheme.colorScheme.primaryContainer
                                        else
                                            Color.Transparent
                                    )
                            ) {
                                row.forEach { cell ->
                                    Text(
                                        text = cell,
                                        modifier = Modifier
                                            .padding(8.dp)
                                            .width(200.dp),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        fontWeight = if (row == data.first()) FontWeight.Bold else FontWeight.Normal
                                    )
                                }
                            }
                        }
                    }
                } else {
                    Text("No data found in file")
                }
            }
        }
    }
} 