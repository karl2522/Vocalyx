package com.example.vocalyxapk

import android.app.Application
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SortByAlpha
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.School
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.models.ClassItem
import com.example.vocalyxapk.viewmodel.ClassCreationState
import com.example.vocalyxapk.viewmodel.ClassDeleteState
import com.example.vocalyxapk.viewmodel.ClassUIState
import com.example.vocalyxapk.viewmodel.ClassUpdateState
import com.example.vocalyxapk.viewmodel.ClassViewModel
import com.example.vocalyxapk.viewmodel.ViewModelFactory
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme

class MyClassesActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val courseId = intent.getIntExtra("COURSE_ID", -1)
        val courseName = intent.getStringExtra("COURSE_NAME") ?: "Course Classes"

        setContent {
            VOCALYXAPKTheme {
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
    val classUpdateState by classViewModel.classUpdateState.collectAsState()
    val classDeleteState by classViewModel.classDeleteState.collectAsState()

    var sortBy by remember { mutableStateOf("date") }

    var classStudentCount by remember { mutableStateOf("") }

    // Search and filter state
    var searchQuery by remember { mutableStateOf("") }
    var selectedStatusFilter by remember { mutableStateOf("all") }
    val statusFilters = listOf("all", "active", "completed", "archived")

    // Observe classes state
    val classUIState by classViewModel.classUIState.collectAsState()
    val classCreationState by classViewModel.classCreationState.collectAsState()

    LaunchedEffect(classUpdateState) {
        when (classUpdateState) {
            is ClassUpdateState.Success -> {
                Toast.makeText(
                    context,
                    "Class updated successfully",
                    Toast.LENGTH_SHORT
                ).show()
            }
            is ClassUpdateState.Error -> {
                Toast.makeText(
                    context,
                    "Error: ${(classUpdateState as ClassUpdateState.Error).message}",
                    Toast.LENGTH_LONG
                ).show()
            }
            else -> {} // Handle other states if needed
        }
    }

    LaunchedEffect(classDeleteState) {
        when (classDeleteState) {
            is ClassDeleteState.Success -> {
                Toast.makeText(
                    context,
                    "Class deleted successfully",
                    Toast.LENGTH_SHORT
                ).show()
            }
            is ClassDeleteState.Error -> {
                Toast.makeText(
                    context,
                    "Error: ${(classDeleteState as ClassDeleteState.Error).message}",
                    Toast.LENGTH_LONG
                ).show()
            }
            else -> {} // Handle other states if needed
        }
    }

    // Fetch classes for the selected course
    LaunchedEffect(courseId) {
        try {
            if (courseId > 0) {
                android.util.Log.d("MyClassesScreen", "Explicitly fetching classes for courseId: $courseId")
                classViewModel.fetchClasses(courseId)
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
            Column {
                TopAppBar(
                    title = { Text(courseName) },
                    navigationIcon = {
                        IconButton(onClick = { (context as? ComponentActivity)?.finish() }) {
                            Icon(imageVector = Icons.Rounded.ArrowBack, contentDescription = "Back")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color(0xFF333D79),
                        titleContentColor = Color.White,
                        navigationIconContentColor = Color.White
                    )
                )

                // Search bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    placeholder = { Text("Search classes...") },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Search",
                            tint = Color(0xFF333D79)
                        )
                    },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(
                                    imageVector = Icons.Default.Clear,
                                    contentDescription = "Clear search",
                                    tint = Color(0xFF333D79)
                                )
                            }
                        }
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF333D79),
                        unfocusedBorderColor = Color(0xFFDDDDDD),
                        unfocusedContainerColor = Color.White,
                        focusedContainerColor = Color.White
                    )
                )

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                ) {
                    // Status filters
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        statusFilters.forEach { status ->
                            val isSelected = selectedStatusFilter == status
                            val displayName = when(status) {
                                "all" -> "All"
                                "active" -> "Active"
                                "completed" -> "Completed"
                                "archived" -> "Archived"
                                else -> status.replaceFirstChar { it.uppercase() }
                            }

                            val containerColor = when {
                                isSelected && status == "active" -> Color(0xFF1B5E20).copy(alpha = 0.9f)  // Green
                                isSelected && status == "completed" -> Color(0xFF0D47A1).copy(alpha = 0.9f)  // Blue
                                isSelected && status == "archived" -> Color(0xFF616161).copy(alpha = 0.9f)  // Grey
                                isSelected -> Color(0xFF333D79)  // Default selected
                                else -> Color.White
                            }

                            val contentColor = if (isSelected) Color.White else Color(0xFF333D79)

                            val iconContent: @Composable (() -> Unit)? = when(status) {
                                "active" -> {
                                    {
                                        Icon(
                                            imageVector = Icons.Default.CheckCircle,
                                            contentDescription = null,
                                            tint = contentColor,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                                "completed" -> {
                                    {
                                        Icon(
                                            imageVector = Icons.Default.Done,
                                            contentDescription = null,
                                            tint = contentColor,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                                "archived" -> {
                                    {
                                        Icon(
                                            imageVector = Icons.Default.Archive,
                                            contentDescription = null,
                                            tint = contentColor,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                                else -> null
                            }

                            FilterChip(
                                selected = isSelected,
                                onClick = { selectedStatusFilter = status },
                                label = {
                                    Text(
                                        text = displayName,
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                },
                                leadingIcon = iconContent,
                                enabled = true,
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = containerColor,
                                    selectedLabelColor = contentColor,
                                    containerColor = Color.White
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = isSelected,
                                    borderColor = if (isSelected) containerColor else Color(0xFFDDDDDD),
                                    selectedBorderColor = containerColor,
                                    borderWidth = 1.dp
                                ),
                                modifier = Modifier.animateContentSize()
                            )
                        }
                    }

                    // Add Sort Controls
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Sort by:",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF666666),
                            modifier = Modifier.padding(end = 12.dp)
                        )

                        // Sort toggle buttons group
                        Row(
                            modifier = Modifier
                                .border(
                                    width = 1.dp,
                                    color = Color(0xFFDDDDDD),
                                    shape = RoundedCornerShape(8.dp)
                                )
                        ) {
                            // Newest (Date) button
                            Row(
                                modifier = Modifier
                                    .background(
                                        color = if (sortBy == "date") Color(0xFF333D79) else Color.White,
                                        shape = RoundedCornerShape(topStart = 8.dp, bottomStart = 8.dp)
                                    )
                                    .clickable { sortBy = "date" }
                                    .padding(horizontal = 16.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Schedule,
                                    contentDescription = null,
                                    tint = if (sortBy == "date") Color.White else Color(0xFF666666),
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Newest",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (sortBy == "date") Color.White else Color(0xFF666666)
                                )
                            }

                            // Divider between buttons
                            Box(
                                modifier = Modifier
                                    .width(1.dp)
                                    .height(36.dp)
                                    .background(Color(0xFFDDDDDD))
                            )

                            // A-Z (Name) button
                            Row(
                                modifier = Modifier
                                    .background(
                                        color = if (sortBy == "name") Color(0xFF333D79) else Color.White,
                                        shape = RoundedCornerShape(topEnd = 8.dp, bottomEnd = 8.dp)
                                    )
                                    .clickable { sortBy = "name" }
                                    .padding(horizontal = 16.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.SortByAlpha,
                                    contentDescription = null,
                                    tint = if (sortBy == "name") Color.White else Color(0xFF666666),
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "A-Z",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (sortBy == "name") Color.White else Color(0xFF666666)
                                )
                            }
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8F9FC))  // Light background for better contrast
        ) {
            // Add Class Dialog
            if (showAddClassDialog) {
                AddClassDialog(
                    courseName = courseName,
                    className = className,
                    onClassNameChange = { className = it },
                    classSection = classSection,
                    onClassSectionChange = { classSection = it },
                    classSchedule = classSchedule,
                    onClassScheduleChange = { classSchedule = it },
                    classSemester = classSemester,
                    onClassSemesterChange = { classSemester = it },
                    classDescription = classDescription,
                    onClassDescriptionChange = { classDescription = it },
                    classStudentCount = classStudentCount,
                    onClassStudentCountChange = { classStudentCount = it },
                    classCreationState = classCreationState,
                    onDismiss = { showAddClassDialog = false },
                    onCreateClass = {
                        if (className.isBlank()) {
                            Toast.makeText(context, "Please provide a class name", Toast.LENGTH_SHORT).show()
                        } else {
                            classViewModel.createClass(
                                name = className,
                                courseId = courseId,
                                section = classSection.ifBlank { null },
                                description = classDescription.ifBlank { null },
                                semester = classSemester.ifBlank { null },
                                schedule = classSchedule.ifBlank { null },
                                studentCount = classStudentCount.toIntOrNull()
                            )
                            // Reset all fields
                            className = ""
                            classSection = ""
                            classDescription = ""
                            classSemester = ""
                            classSchedule = ""
                            classStudentCount = ""
                            showAddClassDialog = false
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
                LoadingStateUI()
            }
            // Error message
            else if (classUIState is ClassUIState.Error) {
                ErrorStateUI(
                    errorMessage = (classUIState as ClassUIState.Error).message,
                    onRetry = { classViewModel.fetchClasses(courseId) }
                )
            }
            // Empty state
            else if ((classUIState as? ClassUIState.Success)?.classes?.isEmpty() == true) {
                EmptyStateUI(courseName)
            }
            // Display classes
            else {
                // Get all classes and apply filters
                val allClasses = (classUIState as? ClassUIState.Success)?.classes ?: emptyList()

                // Apply search filter
                val searchFilteredClasses = if (searchQuery.isBlank()) {
                    allClasses
                } else {
                    allClasses.filter { classItem ->
                        classItem.name.contains(searchQuery, ignoreCase = true) ||
                                (classItem.description?.contains(searchQuery, ignoreCase = true) ?: false) ||
                                (classItem.section?.contains(searchQuery, ignoreCase = true) ?: false)
                    }
                }

                // Apply status filter
                val statusFilteredClasses = if (selectedStatusFilter == "all") {
                    searchFilteredClasses
                } else {
                    searchFilteredClasses.filter { it.status == selectedStatusFilter }
                }

                val sortedAndFilteredClasses = when (sortBy) {
                    "name" -> statusFilteredClasses.sortedBy { it.name.lowercase() }
                    else -> statusFilteredClasses.sortedByDescending { it.updated_at ?: it.created_at }
                }

                // Display classes grid
                ClassesGridView(sortedAndFilteredClasses, courseName)
            }

            // Add FAB for adding a new class
            FloatingActionButton(
                onClick = { showAddClassDialog = true },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(24.dp),
                containerColor = Color(0xFF333D79),
                elevation = FloatingActionButtonDefaults.elevation(
                    defaultElevation = 6.dp,
                    pressedElevation = 8.dp
                )
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

@Composable
fun LoadingStateUI() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(
                color = Color(0xFF333D79),
                modifier = Modifier.size(48.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                "Loading classes...",
                style = MaterialTheme.typography.bodyLarge,
                color = Color(0xFF666666)
            )
        }
    }
}


@Composable
fun ErrorStateUI(errorMessage: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(24.dp)
        ) {
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
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF333D79)),
                modifier = Modifier.padding(top = 16.dp)
            ) {
                Icon(
                    Icons.Default.Refresh,
                    contentDescription = "Retry",
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Retry")
            }
        }
    }
}


@Composable
fun EmptyStateUI(courseName: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.85f)
                .padding(16.dp),
            elevation = CardDefaults.cardElevation(4.dp),
            colors = CardDefaults.cardColors(
                containerColor = Color.White
            )
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier.padding(24.dp)
            ) {
                Icon(
                    Icons.Rounded.School,
                    contentDescription = null,
                    modifier = Modifier
                        .size(80.dp)
                        .padding(bottom = 16.dp),
                    tint = Color(0xFF333D79)
                )
                Text(
                    "No classes found",
                    style = MaterialTheme.typography.headlineSmall,
                    color = Color(0xFF333D79),
                    modifier = Modifier.padding(bottom = 16.dp),
                    textAlign = TextAlign.Center
                )
                Text(
                    "This course doesn't have any classes yet. Create a class to get started with $courseName.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color(0xFF666666),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(bottom = 24.dp)
                )
                OutlinedButton(
                    onClick = { /* This will be handled by the FAB */ },
                    border = BorderStroke(1.dp, Color(0xFF333D79)),
                    modifier = Modifier.padding(top = 8.dp)
                ) {
                    Icon(
                        Icons.Rounded.Add,
                        contentDescription = "Add",
                        tint = Color(0xFF333D79),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Add Your First Class",
                        color = Color(0xFF333D79)
                    )
                }
            }
        }
    }
}

@Composable
fun ClassesGridView(classes: List<ClassItem>, courseName: String, classViewModel: ClassViewModel = viewModel()) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header with class count
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 16.dp)
        ) {
            Text(
                "Classes",
                style = MaterialTheme.typography.headlineSmall.copy(
                    color = Color(0xFF333D79),
                    fontWeight = FontWeight.Bold
                )
            )
            Spacer(modifier = Modifier.width(12.dp))
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFEEF0F8)
                ),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text(
                    "${classes.size} total",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF333D79),
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
        }

        // No results state
        if (classes.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White)
                    .border(1.dp, Color(0xFFEEEEEE), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.FilterList,
                        contentDescription = null,
                        tint = Color(0xFFAAAAAA),
                        modifier = Modifier
                            .size(48.dp)
                            .padding(bottom = 8.dp)
                    )
                    Text(
                        "No classes match your filters",
                        style = MaterialTheme.typography.bodyLarge,
                        color = Color(0xFF666666)
                    )
                    Text(
                        "Try adjusting your search or filters",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF999999)
                    )
                }
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(1),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(bottom = 80.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(classes) { classItem ->
                    EnhancedClassCard(classItem, classViewModel)
                }
            }
        }
    }
}

@Composable
fun EnhancedClassCard(
    classData: ClassItem,
    classViewModel: ClassViewModel = viewModel()
) {
    val context = LocalContext.current

    // State for the dropdown menu
    var showMenu by remember { mutableStateOf(false) }
    // State for delete confirmation dialog
    var showDeleteConfirmation by remember { mutableStateOf(false) }
    // State for edit class dialog
    var showEditDialog by remember { mutableStateOf(false) }

    // Delete confirmation dialog
    if (showDeleteConfirmation) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirmation = false },
            title = { Text("Delete Class") },
            text = { Text("Are you sure you want to delete the class '${classData.name}'? This action cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteConfirmation = false
                        classViewModel.deleteClass(classData.id)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Red)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showDeleteConfirmation = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Edit class dialog
    if (showEditDialog) {
        EditClassDialog(
            classData = classData,
            onDismiss = { showEditDialog = false },
            onUpdate = { name, section, description, semester, schedule ->
                classViewModel.updateClass(
                    classId = classData.id,
                    name = name,
                    section = section,
                    description = description,
                    semester = semester,
                    schedule = schedule
                )
                showEditDialog = false
            }
        )
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(140.dp) // Reduced height from 180dp to 140dp
            .clickable {
                // Preserve the navigation functionality
                val intent = android.content.Intent(context, com.example.vocalyxapk.MyStudentsActivity::class.java).apply {
                    putExtra("CLASS_ID", classData.id)
                    putExtra("CLASS_NAME", classData.name)
                    putExtra("CLASS_SECTION", classData.section)
                }
                context.startActivity(intent)
            },
        elevation = CardDefaults.cardElevation(2.dp), // Reduced elevation
        colors = CardDefaults.cardColors(
            containerColor = when(classData.status) {
                "active" -> Color(0xFFE8F5E9)  // Light green background for active
                "completed" -> Color(0xFFE3F2FD)  // Light blue background for completed
                "archived" -> Color(0xFFF5F5F5)  // Light grey background for archived
                else -> Color.White
            }
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Top section with status badge
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Status badge
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(
                                    color = when(classData.status) {
                                        "active" -> Color(0xFF4CAF50)  // Green
                                        "completed" -> Color(0xFF2196F3)  // Blue
                                        "archived" -> Color(0xFF9E9E9E)  // Grey
                                        else -> Color(0xFF333D79)  // Default
                                    },
                                    shape = CircleShape
                                )
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = classData.status?.replaceFirstChar { it.uppercase() } ?: "Unknown",
                            style = MaterialTheme.typography.bodySmall,
                            color = when(classData.status) {
                                "active" -> Color(0xFF1B5E20)  // Dark green
                                "completed" -> Color(0xFF0D47A1)  // Dark blue
                                "archived" -> Color(0xFF616161)  // Dark grey
                                else -> Color(0xFF333D79)  // Default
                            }
                        )
                    }

                    // Student count badge
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = Color(0xFF666666)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${classData.student_count ?: 0} students",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF666666)
                        )
                    }
                }

                // Center section with class name (highlighted)
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = classData.name,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF333D79),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (!classData.section.isNullOrBlank()) {
                        Text(
                            text = "Section ${classData.section}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF666666)
                        )
                    }
                }

                // Bottom section with schedule and actions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Schedule info
                    if (!classData.schedule.isNullOrBlank()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Filled.Schedule,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = Color(0xFF666666)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = classData.schedule,
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF666666)
                            )
                        }
                    }

                    // Action buttons
                    Row(
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Edit button
                        IconButton(
                            onClick = { showEditDialog = true },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                Icons.Default.Edit,
                                contentDescription = "Edit",
                                tint = Color(0xFF333D79),
                                modifier = Modifier.size(16.dp)
                            )
                        }

                        // Menu button
                        IconButton(
                            onClick = { showMenu = true },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                Icons.Default.MoreVert,
                                contentDescription = "More options",
                                tint = Color(0xFF333D79),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }

            // Dropdown menu
            Box(modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 8.dp, bottom = 8.dp)
            ) {
                DropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false }
                ) {
                    // Change status options based on current status
                    if (classData.status != "active") {
                        DropdownMenuItem(
                            text = { Text("Mark as Active") },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = Color(0xFF4CAF50)
                                )
                            },
                            onClick = {
                                showMenu = false
                                classViewModel.updateClassStatus(classData.id, "active")
                            }
                        )
                    }

                    if (classData.status != "completed") {
                        DropdownMenuItem(
                            text = { Text("Mark as Completed") },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.Done,
                                    contentDescription = null,
                                    tint = Color(0xFF2196F3)
                                )
                            },
                            onClick = {
                                showMenu = false
                                classViewModel.updateClassStatus(classData.id, "completed")
                            }
                        )
                    }

                    if (classData.status != "archived") {
                        DropdownMenuItem(
                            text = { Text("Archive") },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.Archive,
                                    contentDescription = null,
                                    tint = Color(0xFF9E9E9E)
                                )
                            },
                            onClick = {
                                showMenu = false
                                classViewModel.updateClassStatus(classData.id, "archived")
                            }
                        )
                    }

                    Divider()

                    // Delete option
                    DropdownMenuItem(
                        text = { Text("Delete", color = Color.Red) },
                        leadingIcon = {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = null,
                                tint = Color.Red
                            )
                        },
                        onClick = {
                            showMenu = false
                            showDeleteConfirmation = true
                        }
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditClassDialog(
    classData: ClassItem,
    onDismiss: () -> Unit,
    onUpdate: (name: String, section: String, description: String, semester: String, schedule: String) -> Unit
) {
    var className by remember { mutableStateOf(classData.name) }
    var classSection by remember { mutableStateOf(classData.section ?: "") }
    var classDescription by remember { mutableStateOf(classData.description ?: "") }
    var classSemester by remember { mutableStateOf(classData.semester ?: "") }
    var classSchedule by remember { mutableStateOf(classData.schedule ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit Class", style = MaterialTheme.typography.titleLarge) },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                // Class Name
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
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF333D79),
                        unfocusedBorderColor = Color(0xFFDDDDDD),
                        unfocusedContainerColor = Color.White,
                        focusedContainerColor = Color.White
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Section
                Text(
                    text = "Section",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
                OutlinedTextField(
                    value = classSection,
                    onValueChange = { classSection = it },
                    placeholder = { Text("e.g. A, B, C") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF333D79),
                        unfocusedBorderColor = Color(0xFFDDDDDD),
                        unfocusedContainerColor = Color.White,
                        focusedContainerColor = Color.White
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Schedule
                Text(
                    text = "Schedule",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
                OutlinedTextField(
                    value = classSchedule,
                    onValueChange = { classSchedule = it },
                    placeholder = { Text("e.g. MWF 1:30 - 3:00PM") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = { Icon(imageVector = Icons.Filled.Schedule, contentDescription = "Schedule") },
                    supportingText = { Text("Format: Days, Time Range", style = MaterialTheme.typography.bodySmall) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF333D79),
                        unfocusedBorderColor = Color(0xFFDDDDDD),
                        unfocusedContainerColor = Color.White,
                        focusedContainerColor = Color.White
                    )
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

                ExposedDropdownMenuBox(
                    expanded = semesterDropdownExpanded,
                    onExpandedChange = { semesterDropdownExpanded = it }
                ) {
                    OutlinedTextField(
                        value = classSemester,
                        onValueChange = { /* Read-only, handled by dropdown */ },
                        readOnly = true,
                        trailingIcon = {
                            ExposedDropdownMenuDefaults.TrailingIcon(expanded = semesterDropdownExpanded)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        placeholder = { Text("Select a semester") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFF333D79),
                            unfocusedBorderColor = Color(0xFFDDDDDD),
                            unfocusedContainerColor = Color.White,
                            focusedContainerColor = Color.White
                        )
                    )

                    ExposedDropdownMenu(
                        expanded = semesterDropdownExpanded,
                        onDismissRequest = { semesterDropdownExpanded = false }
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
                    minLines = 3,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF333D79),
                        unfocusedBorderColor = Color(0xFFDDDDDD),
                        unfocusedContainerColor = Color.White,
                        focusedContainerColor = Color.White
                    )
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onUpdate(
                        className,
                        classSection.ifBlank { null } ?: "",
                        classDescription.ifBlank { null } ?: "",
                        classSemester.ifBlank { null } ?: "",
                        classSchedule.ifBlank { null } ?: ""
                    )
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF333D79))
            ) {
                Text("Save Changes")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddClassDialog(
    courseName: String,
    className: String,
    onClassNameChange: (String) -> Unit,
    classSection: String,
    onClassSectionChange: (String) -> Unit,
    classSchedule: String,
    onClassScheduleChange: (String) -> Unit,
    classSemester: String,
    onClassSemesterChange: (String) -> Unit,
    classDescription: String,
    onClassDescriptionChange: (String) -> Unit,
    classStudentCount: String = "",
    onClassStudentCountChange: (String) -> Unit = {},
    classCreationState: ClassCreationState,
    onDismiss: () -> Unit,
    onCreateClass: () -> Unit
) {
    // Schedule handling matching web version exactly
    var selectedDays by remember { mutableStateOf(emptyList<String>()) }
    var startTime by remember { mutableStateOf("") }
    var endTime by remember { mutableStateOf("") }
    var formattedSchedule by remember { mutableStateOf(classSchedule) }

    // Update formatted schedule when components change
    LaunchedEffect(selectedDays, startTime, endTime) {
        if (selectedDays.isNotEmpty() && startTime.isNotEmpty() && endTime.isNotEmpty()) {
            val schedule = "${selectedDays.joinToString(",")} $startTime - $endTime"
            formattedSchedule = schedule
            onClassScheduleChange(schedule)
        }
    }

    // Day options exactly matching web version
    val dayOptions = listOf(
        "M" to "Monday (M)",
        "T" to "Tuesday (T)",
        "W" to "Wednesday (W)",
        "TH" to "Thursday (TH)",
        "F" to "Friday (F)"
    )

    // Common day patterns exactly matching web version
    val dayPatterns = listOf(
        "M,W,F" to "Monday, Wednesday, Friday (M,W,F)",
        "T,TH" to "Tuesday, Thursday (T,TH)",
        "M,W" to "Monday, Wednesday (M,W)",
        "M,T,W,TH,F" to "Every Day (M,T,W,TH,F)"
    )

    // Generate time options exactly matching web version (7:30 AM to 9:30 PM in 30-minute increments)
    val generateTimeOptions = {
        val options = mutableListOf<String>()
        var hour = 7
        var minute = 30
        var period = "AM"

        while (!(hour == 9 && minute == 30 && period == "PM")) {
            val formattedHour = if (hour > 12) hour - 12 else hour
            val formattedMinute = if (minute == 0) "00" else minute.toString()
            val timeString = "$formattedHour:$formattedMinute $period"
            options.add(timeString)

            // Increment by 30 minutes
            if (minute == 30) {
                minute = 0
                hour++
                if (hour == 12 && period == "AM") {
                    period = "PM"
                } else if (hour == 13) {
                    hour = 1
                }
            } else {
                minute = 30
            }
        }
        options.add("9:30 PM") // Add final option
        options
    }

    val timeOptions = generateTimeOptions()

    // Helper function to handle day pattern selection
    val handleDayPatternChange = { pattern: String ->
        if (pattern.isNotEmpty()) {
            selectedDays = pattern.split(",")
        }
    }

    // Helper function to handle individual day selection
    val handleDayChange = { day: String ->
        selectedDays = if (selectedDays.contains(day)) {
            selectedDays - day
        } else {
            selectedDays + day
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxWidth(0.98f),
        title = {
            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .background(
                                brush = androidx.compose.ui.graphics.Brush.linearGradient(
                                    colors = listOf(Color(0xFF333D79), Color(0xFF4A5491))
                                ),
                                shape = CircleShape
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Rounded.School,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            "Add Class to $courseName",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF111827)
                        )
                    }
                    Spacer(modifier = Modifier.weight(1f))
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Color(0xFF6B7280),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 650.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // Class Name
                OutlinedTextField(
                    value = className,
                    onValueChange = onClassNameChange,
                    label = { Text("Class Name", color = Color(0xFF374151)) },
                    placeholder = { Text("e.g. 'Section A', '1-B', 'Group 3'", color = Color(0xFF9CA3AF)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF333D79),
                        focusedLabelColor = Color(0xFF333D79),
                        unfocusedBorderColor = Color(0xFFD1D5DB),
                        unfocusedLabelColor = Color(0xFF6B7280),
                        focusedContainerColor = Color.White,
                        unfocusedContainerColor = Color.White
                    )
                )

                // Number of Students
                OutlinedTextField(
                    value = classStudentCount,
                    onValueChange = onClassStudentCountChange,
                    label = { Text("Number of Students", color = Color(0xFF374151)) },
                    placeholder = { Text("e.g. 30", color = Color(0xFF9CA3AF)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF333D79),
                        focusedLabelColor = Color(0xFF333D79),
                        unfocusedBorderColor = Color(0xFFD1D5DB),
                        unfocusedLabelColor = Color(0xFF6B7280),
                        focusedContainerColor = Color.White,
                        unfocusedContainerColor = Color.White
                    )
                )

                // Schedule Section - Enhanced design matching web version
                Column(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        "Schedule",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF374151),
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    // Display formatted schedule with better design
                    if (formattedSchedule.isNotEmpty()) {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF0F9FF)),
                            border = BorderStroke(1.dp, Color(0xFF333D79).copy(alpha = 0.2f)),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Schedule,
                                    contentDescription = null,
                                    tint = Color(0xFF333D79),
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    formattedSchedule,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFF333D79)
                                )
                            }
                        }
                    }

                    // Day pattern selection
                    Column(
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            "Class Days:",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF374151),
                            modifier = Modifier.padding(bottom = 8.dp)
                        )

                        var patternExpanded by remember { mutableStateOf(false) }
                        ExposedDropdownMenuBox(
                            expanded = patternExpanded,
                            onExpandedChange = { patternExpanded = it }
                        ) {
                            OutlinedTextField(
                                value = if (selectedDays.isNotEmpty()) {
                                    dayPatterns.find { it.first == selectedDays.joinToString(",") }?.second ?: "Custom pattern"
                                } else {
                                    "Choose common pattern"
                                },
                                onValueChange = { },
                                readOnly = true,
                                label = { Text("Day Pattern", color = Color(0xFF6B7280)) },
                                trailingIcon = {
                                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = patternExpanded)
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor(),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF333D79),
                                    focusedLabelColor = Color(0xFF333D79),
                                    unfocusedBorderColor = Color(0xFFD1D5DB),
                                    unfocusedLabelColor = Color(0xFF6B7280),
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                )
                            )
                            ExposedDropdownMenu(
                                expanded = patternExpanded,
                                onDismissRequest = { patternExpanded = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Choose common pattern", color = Color(0xFF9CA3AF)) },
                                    onClick = {
                                        selectedDays = emptyList()
                                        patternExpanded = false
                                    }
                                )
                                dayPatterns.forEach { (pattern, label) ->
                                    DropdownMenuItem(
                                        text = { Text(label) },
                                        onClick = {
                                            handleDayPatternChange(pattern)
                                            patternExpanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // Individual days selection
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFAFBFC)),
                        border = BorderStroke(1.dp, Color(0xFFE1E5E9)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp)
                        ) {
                            Text(
                                "Or select individual days:",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF6B7280),
                                modifier = Modifier.padding(bottom = 12.dp)
                            )

                            Row(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                dayOptions.forEach { (dayCode, dayName) ->
                                    val isSelected = selectedDays.contains(dayCode)
                                    OutlinedButton(
                                        onClick = { handleDayChange(dayCode) },
                                        modifier = Modifier
                                            .height(40.dp)
                                            .weight(1f),
                                        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 8.dp),
                                        colors = ButtonDefaults.outlinedButtonColors(
                                            containerColor = if (isSelected) Color(0xFF333D79) else Color.White,
                                            contentColor = if (isSelected) Color.White else Color(0xFF374151)
                                        ),
                                        border = BorderStroke(
                                            1.dp,
                                            if (isSelected) Color(0xFF333D79) else Color(0xFFD1D5DB)
                                        ),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text(
                                            text = dayCode,
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = if (isSelected) FontWeight.Medium else FontWeight.Normal,
                                            textAlign = TextAlign.Center,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Time selection
                    Column(
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            "Class Time:",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF374151),
                            modifier = Modifier.padding(bottom = 12.dp)
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            // Start Time
                            var startTimeExpanded by remember { mutableStateOf(false) }
                            Column(modifier = Modifier.weight(1f)) {
                                ExposedDropdownMenuBox(
                                    expanded = startTimeExpanded,
                                    onExpandedChange = { startTimeExpanded = it }
                                ) {
                                    OutlinedTextField(
                                        value = startTime.ifEmpty { "Start time" },
                                        onValueChange = { },
                                        readOnly = true,
                                        label = { Text("Start", color = Color(0xFF6B7280)) },
                                        trailingIcon = {
                                            ExposedDropdownMenuDefaults.TrailingIcon(expanded = startTimeExpanded)
                                        },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .menuAnchor(),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = Color(0xFF333D79),
                                            focusedLabelColor = Color(0xFF333D79),
                                            unfocusedBorderColor = Color(0xFFD1D5DB),
                                            unfocusedLabelColor = Color(0xFF6B7280),
                                            focusedContainerColor = Color.White,
                                            unfocusedContainerColor = Color.White
                                        )
                                    )
                                    ExposedDropdownMenu(
                                        expanded = startTimeExpanded,
                                        onDismissRequest = { startTimeExpanded = false }
                                    ) {
                                        timeOptions.forEach { time ->
                                            DropdownMenuItem(
                                                text = { Text(time) },
                                                onClick = {
                                                    startTime = time
                                                    startTimeExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }
                            }

                            // Separator
                            Box(
                                modifier = Modifier
                                    .padding(top = 28.dp)
                                    .height(24.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    "to",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Color(0xFF6B7280),
                                    fontWeight = FontWeight.Medium
                                )
                            }

                            // End Time
                            var endTimeExpanded by remember { mutableStateOf(false) }
                            Column(modifier = Modifier.weight(1f)) {
                                ExposedDropdownMenuBox(
                                    expanded = endTimeExpanded,
                                    onExpandedChange = { endTimeExpanded = it }
                                ) {
                                    OutlinedTextField(
                                        value = endTime.ifEmpty { "End time" },
                                        onValueChange = { },
                                        readOnly = true,
                                        label = { Text("End", color = Color(0xFF6B7280)) },
                                        trailingIcon = {
                                            ExposedDropdownMenuDefaults.TrailingIcon(expanded = endTimeExpanded)
                                        },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .menuAnchor(),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = Color(0xFF333D79),
                                            focusedLabelColor = Color(0xFF333D79),
                                            unfocusedBorderColor = Color(0xFFD1D5DB),
                                            unfocusedLabelColor = Color(0xFF6B7280),
                                            focusedContainerColor = Color.White,
                                            unfocusedContainerColor = Color.White
                                        )
                                    )
                                    ExposedDropdownMenu(
                                        expanded = endTimeExpanded,
                                        onDismissRequest = { endTimeExpanded = false }
                                    ) {
                                        timeOptions.forEach { time ->
                                            DropdownMenuItem(
                                                text = { Text(time) },
                                                onClick = {
                                                    endTime = time
                                                    endTimeExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Error message
                if (classCreationState is ClassCreationState.Error) {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = Color(0xFFFEF2F2)
                        ),
                        border = BorderStroke(1.dp, Color(0xFFFECACA))
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Error,
                                contentDescription = null,
                                tint = Color(0xFFDC2626),
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                classCreationState.message,
                                color = Color(0xFFDC2626),
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = Color(0xFF6B7280)
                    ),
                    border = BorderStroke(1.dp, Color(0xFFD1D5DB)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        "Cancel",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                }

                Button(
                    onClick = onCreateClass,
                    enabled = className.isNotBlank() &&
                            (classStudentCount.toIntOrNull() ?: 0) > 0 &&
                            selectedDays.isNotEmpty() &&
                            startTime.isNotEmpty() &&
                            endTime.isNotEmpty() &&
                            classCreationState !is ClassCreationState.Loading,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF333D79),
                        disabledContainerColor = Color(0xFFE5E7EB)
                    ),
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    if (classCreationState is ClassCreationState.Loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "Creating...",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                    } else {
                        Text(
                            "Add Class",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        },
        dismissButton = null
    )
}