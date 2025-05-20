package com.example.vocalyxapk

import android.app.Application
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.ArrowDropDown
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.School
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.composables.BackendClassCard
import com.example.vocalyxapk.viewmodel.ClassCreationState
import com.example.vocalyxapk.viewmodel.ClassUIState
import com.example.vocalyxapk.viewmodel.ClassViewModel
import com.example.vocalyxapk.viewmodel.ViewModelFactory

class MyClassesActivity : ComponentActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val courseId = intent.getIntExtra("COURSE_ID", -1)
        val courseName = intent.getStringExtra("COURSE_NAME") ?: "Course Classes"
        
        setContent {
            MaterialTheme {
                MyClassesScreen(courseId, courseName)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyClassesScreen(courseId: Int, courseName: String) {
    val context = LocalContext.current
    val application = context.applicationContext as Application
    val classViewModel: ClassViewModel = viewModel(factory = ViewModelFactory(application))
    
    // Dialog state for adding a new class
    var showAddClassDialog by remember { mutableStateOf(false) }
    var className by remember { mutableStateOf("") }
    var classSection by remember { mutableStateOf("") }
    var classDescription by remember { mutableStateOf("") }
    var classSemester by remember { mutableStateOf("") }
    var classSchedule by remember { mutableStateOf("") }
    
    // Observe classes state
    val classUIState by classViewModel.classUIState.collectAsState()
    val classCreationState by classViewModel.classCreationState.collectAsState()
    
    // Fetch classes for the selected course
    LaunchedEffect(courseId) {
        try {
            if (courseId > 0) {
                android.util.Log.d("MyClassesScreen", "Explicitly fetching classes for courseId: $courseId")
                // Ensure we only show classes for this specific course
                classViewModel.fetchClasses(courseId)
                
                // Store the current course ID for filtering
                classViewModel.setCurrentCourseContext(courseId)
            } else {
                android.util.Log.e("MyClassesScreen", "Invalid course ID: $courseId")
                Toast.makeText(context, "Invalid course ID", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            android.util.Log.e("MyClassesScreen", "Error fetching classes", e)
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(courseName) },
                navigationIcon = {
                    IconButton(onClick = { (context as? ComponentActivity)?.finish() }) {
                        Icon(Icons.Rounded.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF333D79),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color.White)
        ) {
            // Add Class Dialog
            if (showAddClassDialog) {
                AlertDialog(
                    onDismissRequest = { showAddClassDialog = false },
                    title = { Text("Add Class to $courseName", style = MaterialTheme.typography.titleLarge) },
                    text = {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            // Class Name with title above field
                            Text(
                                text = "Class Name *",
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                            OutlinedTextField(
                                value = className,
                                onValueChange = { className = it },
                                placeholder = { Text("Enter class name") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                isError = className.isBlank() && classCreationState !is ClassCreationState.Idle
                            )
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            // Section with title above field
                            Text(
                                text = "Section *",
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                            OutlinedTextField(
                                value = classSection,
                                onValueChange = { classSection = it },
                                placeholder = { Text("e.g. A, B, C") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            // Schedule field
                            Text(
                                text = "Schedule *",
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                            OutlinedTextField(
                                value = classSchedule,
                                onValueChange = { classSchedule = it },
                                placeholder = { Text("e.g. MWF 1:30 - 3:00PM") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                leadingIcon = { Icon(Icons.Filled.Schedule, contentDescription = "Schedule") },
                                supportingText = { Text("Format: Days, Time Range", style = MaterialTheme.typography.bodySmall) }
                            )
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            // Semester Dropdown (Optional)
                            var semesterDropdownExpanded by remember { mutableStateOf(false) }
                            val semesterOptions = listOf("Fall", "Spring", "Summer", "Winter")
                            
                            Text(
                                text = "Semester (Optional)",
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                            
                            Box(modifier = Modifier.fillMaxWidth()) {
                                OutlinedTextField(
                                    value = classSemester,
                                    onValueChange = { /* Read-only, handled by dropdown */ },
                                    readOnly = true,
                                    trailingIcon = {
                                        Icon(Icons.Rounded.ArrowDropDown, contentDescription = "Expand dropdown")
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    placeholder = { Text("Select a semester") }
                                )
                                
                                // Overlay a transparent clickable box to handle the dropdown click
                                Box(
                                    modifier = Modifier
                                        .matchParentSize()
                                        .background(Color.Transparent)
                                        .clickable(onClick = { semesterDropdownExpanded = true })
                                )
                                
                                DropdownMenu(
                                    expanded = semesterDropdownExpanded,
                                    onDismissRequest = { semesterDropdownExpanded = false },
                                    modifier = Modifier.fillMaxWidth(0.9f) // Slightly smaller than parent
                                ) {
                                    semesterOptions.forEach { semester ->
                                        DropdownMenuItem(
                                            text = { Text(semester) },
                                            onClick = {
                                                classSemester = semester
                                                semesterDropdownExpanded = false
                                            }
                                        )
                                    }
                                }
                            }
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            // Description (Optional)
                            Text(
                                text = "Description (Optional)",
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                            OutlinedTextField(
                                value = classDescription,
                                onValueChange = { classDescription = it },
                                placeholder = { Text("Enter class description") },
                                modifier = Modifier.fillMaxWidth(),
                                minLines = 2
                            )
                            
                            // Show error message if there was an error in class creation
                            if (classCreationState is ClassCreationState.Error) {
                                Text(
                                    text = (classCreationState as ClassCreationState.Error).message,
                                    color = Color.Red,
                                    modifier = Modifier.padding(vertical = 8.dp)
                                )
                            }
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                if (className.isBlank()) {
                                    // Show error toast for missing fields
                                    Toast.makeText(context, "Please provide a class name", Toast.LENGTH_SHORT).show()
                                } else {
                                    // Create class
                                    classViewModel.createClass(
                                        name = className,
                                        courseId = courseId,
                                        section = classSection.ifBlank { null },
                                        description = classDescription.ifBlank { null },
                                        semester = classSemester.ifBlank { null },
                                        schedule = classSchedule.ifBlank { null }
                                    )
                                    // Reset fields
                                    className = ""
                                    classSection = ""
                                    classDescription = ""
                                    classSemester = ""
                                    classSchedule = ""
                                    showAddClassDialog = false
                                }
                            },
                            enabled = classCreationState !is ClassCreationState.Loading
                        ) {
                            if (classCreationState is ClassCreationState.Loading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text("Create")
                            }
                        }
                    },
                    dismissButton = {
                        Button(
                            onClick = { showAddClassDialog = false },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.Gray)
                        ) {
                            Text("Cancel")
                        }
                    }
                )
            }
            
            // Success message when class is created
            LaunchedEffect(classCreationState) {
                if (classCreationState is ClassCreationState.Success) {
                    Toast.makeText(
                        context,
                        "Class '${(classCreationState as ClassCreationState.Success).classItem.name}' created successfully",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
            
            // Loading indicator
            if (classUIState is ClassUIState.Loading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF333D79))
                }
            }
            // Error message
            else if (classUIState is ClassUIState.Error) {
                val errorMessage = (classUIState as ClassUIState.Error).message
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Filled.Error,
                            contentDescription = null,
                            modifier = Modifier
                                .size(64.dp)
                                .padding(bottom = 16.dp),
                            tint = Color.Red
                        )
                        Text(
                            "Error loading classes",
                            style = MaterialTheme.typography.titleMedium,
                            color = Color.Red,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                        Text(
                            errorMessage,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF666666),
                            textAlign = TextAlign.Center
                        )
                        Button(
                            onClick = { classViewModel.fetchClasses(courseId) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF333D79)),
                            modifier = Modifier.padding(top = 16.dp)
                        ) {
                            Text("Retry")
                        }
                    }
                }
            }
            // Empty state
            else if ((classUIState as? ClassUIState.Success)?.classes?.isEmpty() == true) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Rounded.School,
                            contentDescription = null,
                            modifier = Modifier
                                .size(64.dp)
                                .padding(bottom = 16.dp),
                            tint = Color(0xFF666666)
                        )
                        Text(
                            "No classes found",
                            style = MaterialTheme.typography.titleMedium,
                            color = Color(0xFF666666),
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                        Text(
                            "This course doesn't have any classes yet. Create a class to get started.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF666666),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
            // Display classes
            else {
                val classes = (classUIState as? ClassUIState.Success)?.classes ?: emptyList()
                
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                ) {
                    Text(
                        "Classes in ${courseName}",
                        style = MaterialTheme.typography.headlineMedium.copy(
                            color = Color(0xFF333D79)
                        ),
                        modifier = Modifier.padding(vertical = 16.dp)
                    )
                    
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        contentPadding = PaddingValues(bottom = 16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(classes) { classItem ->
                            BackendClassCard(classData = classItem)
                        }
                    }
                }
            }
            
            // Add FAB for adding a new class
            FloatingActionButton(
                onClick = { showAddClassDialog = true },
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(16.dp),
                containerColor = Color(0xFF333D79)
            ) {
                Icon(
                    imageVector = Icons.Rounded.Add,
                    contentDescription = "Add Class",
                    tint = Color.White
                )
            }
        }
    }
}
