package com.example.vocalyxapk

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme
import com.opencsv.CSVReader
import org.apache.poi.ss.usermodel.WorkbookFactory
import java.io.InputStreamReader
import android.content.ContentResolver
import android.webkit.MimeTypeMap
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material.icons.filled.Delete
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.TextField
import androidx.compose.material3.OutlinedTextField
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.window.DialogProperties
import androidx.compose.runtime.saveable.rememberSaveable
import android.content.Intent
import android.os.Parcelable
import kotlinx.parcelize.Parcelize
import kotlinx.coroutines.launch
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.foundation.lazy.itemsIndexed
import com.example.vocalyxapk.ClassRepository
import com.example.vocalyxapk.ImportedClass

// Helper for passing file data as Parcelable
@Parcelize
data class FileTableData(
    val fileData: List<List<String>>,
    val fileName: String,
    val section: String
) : Parcelable

class FileViewerActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val fileUri = intent?.data
        val fileTableData = intent?.getParcelableExtra<FileTableData>("file_table_data")
        setContent {
            VOCALYXAPKTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    FileViewerScreen(
                        initialFileUri = if (fileTableData == null) fileUri else null,
                        initialFileTableData = fileTableData
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FileViewerScreen(
    initialFileUri: Uri? = null,
    initialFileTableData: FileTableData? = null
) {
    val activity = LocalContext.current as? ComponentActivity
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    // State variables
    var fileData by remember { mutableStateOf<List<List<String>>>(emptyList()) }
    var fileName by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var selectedFileUri by remember { mutableStateOf(initialFileUri) }

    // Upload dialog state
    var showUploadDialog by remember { mutableStateOf(false) }
    var className by rememberSaveable { mutableStateOf("") }
    var classSection by rememberSaveable { mutableStateOf("") }
    var classNameError by remember { mutableStateOf(false) }
    var classSectionError by remember { mutableStateOf(false) }

    // Initialize state from initialFileTableData if available
    LaunchedEffect(initialFileTableData) {
        initialFileTableData?.let {
            fileData = it.fileData
            fileName = it.fileName
        }
    }

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            selectedFileUri = it
        }
    }

    // Only load file if not viewing a class
    LaunchedEffect(selectedFileUri) {
        if (initialFileTableData == null) {
            selectedFileUri?.let { uri ->
                try {
                    val contentResolver: ContentResolver = context.contentResolver
                    val mimeType = contentResolver.getType(uri)
                    val extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType)
                    fileName = getFileNameFromUri(contentResolver, uri)
                    when (extension?.lowercase()) {
                        "xlsx", "xls" -> {
                            contentResolver.openInputStream(uri)?.use { inputStream ->
                                val workbook = WorkbookFactory.create(inputStream)
                                val sheet = workbook.getSheetAt(0)
                                val data = mutableListOf<MutableList<String>>()
                                val headerRow = sheet.getRow(0)
                                val headers = headerRow.map { it.toString() }.toMutableList()
                                data.add(headers)
                                for (rowIndex in 1..sheet.lastRowNum) {
                                    val row = sheet.getRow(rowIndex) ?: continue
                                    val rowData = row.map { it.toString() }.toMutableList()
                                    data.add(rowData)
                                }
                                fileData = data
                                errorMessage = null
                            }
                        }
                        "csv" -> {
                            contentResolver.openInputStream(uri)?.use { inputStream ->
                                val reader = CSVReader(InputStreamReader(inputStream))
                                val data = reader.readAll().map { it.toMutableList() }.toMutableList()
                                fileData = data
                                errorMessage = null
                            }
                        }
                        else -> {
                            errorMessage = "Unsupported file format. Please select an Excel (.xlsx, .xls) or CSV (.csv) file."
                        }
                    }
                } catch (e: Exception) {
                    errorMessage = "Error reading file: ${e.message}"
                }
            }
        }
    }

    // Function to handle class creation
    fun handleCreateClass() {
        classNameError = className.isBlank()
        classSectionError = classSection.isBlank()

        if (!classNameError && !classSectionError) {
            // Create new class
            val newClass = ImportedClass(
                name = className,
                section = classSection,
                fileData = fileData
            )
            ClassRepository.addClass(newClass)
            
            // Show success message
            coroutineScope.launch {
                snackbarHostState.showSnackbar("Class created successfully!")
            }
            
            // Close dialog and return to classes page
            showUploadDialog = false
            activity?.finish()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(fileName ?: "File Viewer") },
                navigationIcon = {
                    IconButton(onClick = { activity?.finish() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (initialFileTableData == null && selectedFileUri == null) {
                Button(
                    onClick = { filePickerLauncher.launch("*/*") },
                    modifier = Modifier.padding(16.dp)
                ) {
                    Icon(Icons.Default.Upload, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Select File")
                }
            } else {
                Text(
                    text = "File: $fileName",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                if (errorMessage != null) {
                    Text(
                        text = errorMessage!!,
                        color = Color.Red,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                } else if (fileData.isNotEmpty()) {
                    // Improved File preview with horizontal scroll and better cell width
                    val horizontalScrollState = rememberScrollState()
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .horizontalScroll(horizontalScrollState)
                    ) {
                        Column {
                            fileData.forEachIndexed { rowIndex, row ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(
                                            if (rowIndex == 0)
                                                Color(0xFFE1D7F0)
                                            else
                                                Color.Transparent
                                        )
                                ) {
                                    row.forEach { cell ->
                                        Text(
                                            text = cell,
                                            modifier = Modifier
                                                .padding(8.dp)
                                                .widthIn(min = 120.dp, max = 200.dp),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            fontWeight = if (rowIndex == 0) FontWeight.Bold else FontWeight.Normal,
                                            color = if (rowIndex == 0) Color(0xFF333D79) else Color.Unspecified
                                        )
                                    }
                                }
                                Divider()
                            }
                        }
                    }

                    // Only show Upload to Class button and dialog in import mode
                    if (initialFileTableData == null) {
                        Button(
                            onClick = { showUploadDialog = true },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 16.dp)
                        ) {
                            Icon(Icons.Default.Upload, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Upload to Class")
                        }
                    }
                }
            }
        }

        // Only show Create Class Dialog in import mode
        if (showUploadDialog && initialFileTableData == null) {
            AlertDialog(
                onDismissRequest = { showUploadDialog = false },
                title = { Text("Create New Class") },
                text = {
                    Column {
                        OutlinedTextField(
                            value = className,
                            onValueChange = { 
                                className = it
                                classNameError = false
                            },
                            label = { Text("Class Name") },
                            isError = classNameError,
                            supportingText = {
                                if (classNameError) {
                                    Text("Class name is required")
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 8.dp)
                        )
                        OutlinedTextField(
                            value = classSection,
                            onValueChange = { 
                                classSection = it
                                classSectionError = false
                            },
                            label = { Text("Section") },
                            isError = classSectionError,
                            supportingText = {
                                if (classSectionError) {
                                    Text("Section is required")
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                },
                confirmButton = {
                    TextButton(
                        onClick = { handleCreateClass() }
                    ) {
                        Text("Create")
                    }
                },
                dismissButton = {
                    TextButton(
                        onClick = { showUploadDialog = false }
                    ) {
                        Text("Cancel")
                    }
                }
            )
        }
    }
}

private fun getFileNameFromUri(contentResolver: ContentResolver, uri: Uri): String {
    val cursor = contentResolver.query(uri, null, null, null, null)
    return cursor?.use {
        val nameIndex = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
        it.moveToFirst()
        it.getString(nameIndex)
    } ?: "Unknown file"
}

// Helper extension for highlighting edited rows
inline fun <T> List<T>.withIndex(): List<Pair<Int, T>> {
    return this.mapIndexed { index, element -> index to element }
} 