package com.example.vocalyxapk.composables

import android.app.Application
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.FileViewerActivity
import com.example.vocalyxapk.FileTableData
import com.example.vocalyxapk.MyClassesActivity
import com.example.vocalyxapk.data.ImportedClass
import com.example.vocalyxapk.models.CourseItem
import com.example.vocalyxapk.viewmodel.*
import java.util.Calendar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoursesTab(modifier: Modifier = Modifier) {
    var searchQuery by remember { mutableStateOf("") }
    val context = LocalContext.current
    val application = context.applicationContext as Application
    val classViewModel: ClassViewModel = viewModel(factory = ViewModelFactory(application))
    val scope = rememberCoroutineScope()
    val courseUpdateState by classViewModel.courseUpdateState.collectAsState()
    val courseDeleteState by classViewModel.courseDeleteState.collectAsState()

    // Filter state
    var selectedStatusFilter by remember { mutableStateOf("all") }
    val statusFilters = listOf("all", "active", "completed", "archived")

    var showAddCourseDialog by remember { mutableStateOf(false) }
    var courseName by remember { mutableStateOf("") }
    var courseCode by remember { mutableStateOf("") }
    var courseSemester by remember { mutableStateOf("") }
    var courseDescription by remember { mutableStateOf("") }
    var courseAcademicYear by remember { mutableStateOf("") }

    val courseCreationState by classViewModel.courseCreationState.collectAsState()
    val classUIState by classViewModel.classUIState.collectAsState()
    val courseUIState by classViewModel.courseUIState.collectAsState()
    val importedClasses = com.example.vocalyxapk.data.ClassRepository.getClasses()
    var courseToEdit by remember { mutableStateOf<CourseItem?>(null) }

    LaunchedEffect(courseUpdateState) {
        when (courseUpdateState) {
            is CourseUpdateState.Success -> {
                Toast.makeText(
                    context,
                    "Course updated successfully",
                    Toast.LENGTH_SHORT
                ).show()
            }
            is CourseUpdateState.Error -> {
                Toast.makeText(
                    context,
                    "Error: ${(courseUpdateState as CourseUpdateState.Error).message}",
                    Toast.LENGTH_LONG
                ).show()
            }
            else -> {}
        }
    }

    LaunchedEffect(courseDeleteState) {
        when (courseDeleteState) {
            is CourseDeleteState.Success -> {
                Toast.makeText(
                    context,
                    "Course deleted successfully",
                    Toast.LENGTH_SHORT
                ).show()
            }
            is CourseDeleteState.Error -> {
                Toast.makeText(
                    context,
                    "Error: ${(courseDeleteState as CourseDeleteState.Error).message}",
                    Toast.LENGTH_LONG
                ).show()
            }
            else -> {}
        }
    }

    // Fetch courses when the tab is displayed
    LaunchedEffect(Unit) {
        try {
            android.util.Log.d("CoursesTab", "Attempting to fetch courses")
            classViewModel.fetchCourses()
        } catch (e: Exception) {
            android.util.Log.e("CoursesTab", "Error fetching courses", e)
            android.widget.Toast.makeText(
                context,
                "Error loading courses: ${e.message}",
                android.widget.Toast.LENGTH_LONG
            ).show()
        }
    }

    // Get all courses
    val allCourses = when (courseUIState) {
        is CourseUIState.Success -> (courseUIState as CourseUIState.Success).courses
        else -> emptyList()
    }

    courseToEdit?.let { course ->
        showEditCourseDialog(
            courseData = course,
            classViewModel = classViewModel, // Pass the view model
            onDismiss = { courseToEdit = null } // Set to null to close dialog
        )
    }

    // Filter courses based on search query and status filter
    val filteredCourses = allCourses.filter { course ->
        (course.name.contains(searchQuery, ignoreCase = true) ||
                course.courseCode.contains(searchQuery, ignoreCase = true)) &&
                (selectedStatusFilter == "all" || course.status == selectedStatusFilter)
    }

    val filteredImportedClasses = importedClasses.filter {
        it.name.contains(searchQuery, ignoreCase = true) ||
                it.section.contains(searchQuery, ignoreCase = true)
    }

    val hasCourses = filteredCourses.isNotEmpty() || filteredImportedClasses.isNotEmpty()
    val totalCourseCount = allCourses.size

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8F9FC)) // Light background for better contrast
    ) {
        // Add Course Dialog
        if (showAddCourseDialog) {

            val isDuplicate = remember { mutableStateOf(false) }
            val duplicateDetails = remember { mutableStateOf<CourseItem?>(null) }
            val forceSubmit = remember { mutableStateOf(false) }

            val academicYearOptions = remember {
                val currentYear = Calendar.getInstance().get(Calendar.YEAR)
                (0 until 5).map { i ->
                    val startYear = currentYear + i
                    val endYear = startYear + 1
                    "$startYear-$endYear"
                }
            }

            val checkForDuplicates = {
                if (courseCode.isNotBlank() && courseSemester.isNotBlank() && courseAcademicYear.isNotBlank()) {
                    val normalizedCourseCode = courseCode.trim().lowercase()

                    // Filter out current course if in edit mode
                    val coursesToCheck = allCourses

                    val duplicate = coursesToCheck.find { course ->
                        val existingCode = course.courseCode.trim().lowercase()
                        existingCode == normalizedCourseCode &&
                                course.semester == courseSemester &&
                                course.academic_year == courseAcademicYear
                    }

                    isDuplicate.value = duplicate != null
                    duplicateDetails.value = duplicate
                } else {
                    isDuplicate.value = false
                }
            }

            LaunchedEffect(courseCode, courseSemester, courseAcademicYear) {
                checkForDuplicates()
            }

            AlertDialog(
                onDismissRequest = { showAddCourseDialog = false },
                title = { Text("Add New Course", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color(0xFF333D79) ) },
                text = {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp)
                    ) {
                        Column(modifier = Modifier.fillMaxWidth()) {

                            if (isDuplicate.value && !forceSubmit.value) {
                                Card(
                                    colors = CardDefaults.cardColors(
                                        containerColor = Color(0xFFFFF8E1) // Amber 50
                                    ),
                                    border = BorderStroke(1.dp, Color(0xFFFFCC80)), // Amber 200
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 16.dp)
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = Icons.Default.Warning,
                                                contentDescription = null,
                                                tint = Color(0xFFFF8F00) // Amber 800
                                            )
                                            Text(
                                                text = "Duplicate Course Detected",
                                                style = MaterialTheme.typography.titleMedium,
                                                color = Color(0xFFF57C00), // Amber 800
                                                modifier = Modifier.padding(start = 8.dp)
                                            )
                                        }

                                        Text(
                                            text = "A course with the same code (${duplicateDetails.value?.courseCode}), " +
                                                    "semester (${duplicateDetails.value?.semester}), and " +
                                                    "academic year (${duplicateDetails.value?.academic_year}) already exists:",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = Color(0xFFF57C00), // Amber 700
                                            modifier = Modifier.padding(top = 8.dp)
                                        )

                                        Text(
                                            text = duplicateDetails.value?.name ?: "",
                                            style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold),
                                            color = Color(0xFFF57C00), // Amber 800
                                            modifier = Modifier.padding(top = 4.dp)
                                        )

                                        Button(
                                            onClick = {
                                                forceSubmit.value = true
                                                isDuplicate.value = false
                                            },
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = Color(0xFFF57C00) // Amber 700
                                            ),
                                            modifier = Modifier.padding(top = 8.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Check,
                                                contentDescription = null,
                                                tint = Color.White,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Create anyway", color = Color.White)
                                        }
                                    }
                                }
                            }

                            // Course Code
                            Text(
                                text = "Course Code *",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                            OutlinedTextField(
                                value = courseCode,
                                onValueChange = { courseCode = it },
                                placeholder = { Text("e.g. CSIT-101") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                isError = courseCode.isBlank() && courseCreationState !is CourseCreationState.Idle ||
                                        isDuplicate.value && !forceSubmit.value,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF333D79),
                                    unfocusedBorderColor = if (isDuplicate.value && !forceSubmit.value)
                                        Color(0xFFFFB74D) else Color(0xFFDDDDDD)
                                )
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            // Course Name
                            Text(
                                text = "Course Name",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                            OutlinedTextField(
                                value = courseName,
                                onValueChange = { courseName = it },
                                placeholder = { Text("e.g. Introduction to Computer Science") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                isError = courseName.isBlank() && courseCreationState !is CourseCreationState.Idle,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF333D79),
                                    unfocusedBorderColor = Color(0xFFDDDDDD)
                                )
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            // Description field
                            Text(
                                text = "Description",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                            OutlinedTextField(
                                value = courseDescription,
                                onValueChange = { courseDescription = it },
                                placeholder = { Text("Describe the course content and objectives") },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(100.dp),
                                minLines = 2,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF333D79),
                                    unfocusedBorderColor = Color(0xFFDDDDDD)
                                )
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            // Semester Dropdown
                            Text(
                                text = "Semester *",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )

                            var semesterDropdownExpanded by remember { mutableStateOf(false) }
                            val semesterOptions = listOf("1st Semester", "2nd Semester", "Mid Year")

                            ExposedDropdownMenuBox(
                                expanded = semesterDropdownExpanded,
                                onExpandedChange = { semesterDropdownExpanded = it }
                            ) {
                                OutlinedTextField(
                                    value = courseSemester,
                                    onValueChange = { /* Read-only */ },
                                    readOnly = true,
                                    trailingIcon = {
                                        ExposedDropdownMenuDefaults.TrailingIcon(expanded = semesterDropdownExpanded)
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .menuAnchor(),
                                    placeholder = { Text("Select a semester") },
                                    isError = (courseSemester.isBlank() && courseCreationState !is CourseCreationState.Idle) ||
                                            (isDuplicate.value && !forceSubmit.value),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = Color(0xFF333D79),
                                        unfocusedBorderColor = if (isDuplicate.value && !forceSubmit.value)
                                            Color(0xFFFFB74D) else Color(0xFFDDDDDD)
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
                                                courseSemester = semester
                                                semesterDropdownExpanded = false
                                            }
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Academic Year field
                            Text(
                                text = "Academic Year *",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )

                            var academicYearDropdownExpanded by remember { mutableStateOf(false) }

                            ExposedDropdownMenuBox(
                                expanded = academicYearDropdownExpanded,
                                onExpandedChange = { academicYearDropdownExpanded = it }
                            ) {
                                OutlinedTextField(
                                    value = courseAcademicYear,
                                    onValueChange = { /* Read-only */ },
                                    readOnly = true,
                                    trailingIcon = {
                                        ExposedDropdownMenuDefaults.TrailingIcon(expanded = academicYearDropdownExpanded)
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .menuAnchor(),
                                    placeholder = { Text("Select academic year") },
                                    isError = (courseAcademicYear.isBlank() && courseCreationState !is CourseCreationState.Idle) ||
                                            (isDuplicate.value && !forceSubmit.value),
                                    supportingText = { Text("Format: YYYY-YYYY", style = MaterialTheme.typography.bodySmall) },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = Color(0xFF333D79),
                                        unfocusedBorderColor = if (isDuplicate.value && !forceSubmit.value)
                                            Color(0xFFFFB74D) else Color(0xFFDDDDDD)
                                    )
                                )

                                ExposedDropdownMenu(
                                    expanded = academicYearDropdownExpanded,
                                    onDismissRequest = { academicYearDropdownExpanded = false }
                                ) {
                                    academicYearOptions.forEach { year ->
                                        DropdownMenuItem(
                                            text = { Text(year) },
                                            onClick = {
                                                courseAcademicYear = year
                                                academicYearDropdownExpanded = false
                                            }
                                        )
                                    }
                                }
                            }

                            // Show error message
                            if (courseCreationState is CourseCreationState.Error) {
                                Text(
                                    text = (courseCreationState as CourseCreationState.Error).message,
                                    color = Color.Red,
                                    modifier = Modifier.padding(vertical = 8.dp)
                                )
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            if (courseName.isBlank() || courseCode.isBlank() || courseSemester.isBlank() || courseAcademicYear.isBlank()) {
                                Toast.makeText(context, "Please fill in all required fields", Toast.LENGTH_SHORT).show()
                            } else if (isDuplicate.value && !forceSubmit.value) {
                                // Do nothing - user needs to use "Create anyway" button
                            } else {
                                classViewModel.createCourse(
                                    name = courseName,
                                    courseCode = courseCode,
                                    semester = courseSemester,
                                    description = courseDescription.ifBlank { null },
                                    academicYear = courseAcademicYear
                                )
                                courseName = ""
                                courseCode = ""
                                courseSemester = ""
                                courseDescription = ""
                                courseAcademicYear = ""
                                showAddCourseDialog = false
                            }
                        },
                        enabled = courseCreationState !is CourseCreationState.Loading &&
                                !(isDuplicate.value && !forceSubmit.value),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isDuplicate.value && !forceSubmit.value)
                                Color.Gray else Color(0xFF333D79),
                            disabledContainerColor = Color.Gray
                        )
                    ) {
                        if (courseCreationState is CourseCreationState.Loading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Creating...")
                        } else if (isDuplicate.value && !forceSubmit.value) {
                            Text("Duplicate Detected")
                        } else {
                            Text("Create Course")
                        }
                    }
                },
                dismissButton = {
                    OutlinedButton(
                        onClick = { showAddCourseDialog = false },
                        border = BorderStroke(1.dp, Color(0xFF666666))
                    ) {
                        Text("Cancel", color = Color(0xFF666666))
                    }
                }
            )
        }

        // Success message when course is created
        LaunchedEffect(courseCreationState) {
            if (courseCreationState is CourseCreationState.Success) {
                Toast.makeText(
                    context,
                    "Course '${(courseCreationState as CourseCreationState.Success).course.name}' created successfully",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp)
        ) {
            // Header with course count
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 24.dp, bottom = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    "My Courses",
                    style = MaterialTheme.typography.headlineMedium.copy(
                        color = Color(0xFF333D79),
                        fontWeight = FontWeight.Bold
                    )
                )

                // Course count badge
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFEEF0F8)
                    ),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text(
                        text = "$totalCourseCount total",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF333D79),
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .height(52.dp),
                placeholder = { Text("Search courses...", color = Color(0xFF666666)) },
                leadingIcon = {
                    Icon(
                        Icons.Rounded.Search,
                        contentDescription = "Search",
                        tint = Color(0xFF666666)
                    )
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(
                                imageVector = Icons.Default.Clear,
                                contentDescription = "Clear search",
                                tint = Color(0xFF666666)
                            )
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = TextFieldDefaults.outlinedTextFieldColors(
                    focusedBorderColor = Color(0xFF333D79),
                    unfocusedBorderColor = Color(0xFFE0E0E0),
                    containerColor = Color.White
                )
            )

            // Status filters
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp, end = 8.dp)
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Add start spacer to prevent edge cutting
                Spacer(modifier = Modifier.width(0.dp))
                
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
                
                // Add end spacer to ensure no overlap with any UI elements on the right
                Spacer(modifier = Modifier.width(16.dp))
            }

            // Loading indicator
            if (courseUIState is CourseUIState.Loading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF333D79))
                }
            }
            // Error message
            else if (courseUIState is CourseUIState.Error) {
                val errorMessage = (courseUIState as CourseUIState.Error).message
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Rounded.Error,
                            contentDescription = null,
                            modifier = Modifier
                                .size(64.dp)
                                .padding(bottom = 16.dp),
                            tint = Color.Red
                        )
                        Text(
                            "Error loading courses",
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
                            onClick = { classViewModel.fetchCourses() },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF333D79)),
                            modifier = Modifier.padding(top = 16.dp)
                        ) {
                            Text("Retry")
                        }
                    }
                }
            }
            // Empty state
            else if (!hasCourses) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(bottom = 80.dp), // Add padding for FAB
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
                            "No courses found",
                            style = MaterialTheme.typography.titleMedium,
                            color = Color(0xFF666666),
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                        Text(
                            if (searchQuery.isNotEmpty() || selectedStatusFilter != "all")
                                "No courses match your current filters"
                            else
                                "You don't have any courses yet. Create a course to get started with classes and import data.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF666666),
                            textAlign = TextAlign.Center
                        )

                        if (searchQuery.isNotEmpty() || selectedStatusFilter != "all") {
                            OutlinedButton(
                                onClick = {
                                    searchQuery = ""
                                    selectedStatusFilter = "all"
                                },
                                modifier = Modifier.padding(top = 16.dp)
                            ) {
                                Icon(
                                    Icons.Default.FilterAlt,
                                    contentDescription = "Clear filters"
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Clear Filters")
                            }
                        }
                    }
                }
            }
            // Display courses
            else {
                // Show courses in a grid with 1 column (wider cards)
                LazyVerticalGrid(
                    columns = GridCells.Fixed(1), // Changed to 1 column for wider cards
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(bottom = 80.dp), // Add padding for FAB
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // Backend courses
                    if (filteredCourses.isNotEmpty()) {
                        items(filteredCourses) { courseData ->
                            CourseCard(
                                courseData = courseData,
                                onClick = {
                                    // Navigate to MyClassesActivity with course data
                                    val intent = Intent(context, MyClassesActivity::class.java).apply {
                                        putExtra("COURSE_ID", courseData.id)
                                        putExtra("COURSE_NAME", courseData.name)
                                    }
                                    context.startActivity(intent)
                                },
                                onStatusChange = { newStatus ->
                                    classViewModel.updateCourseStatus(courseData.id, newStatus)
                                    Toast.makeText(context, "Changed status to $newStatus", Toast.LENGTH_SHORT).show()
                                },
                                onDelete = {
                                    classViewModel.deleteCourse(courseData.id)
                                    Toast.makeText(context, "Delete course: ${courseData.name}", Toast.LENGTH_SHORT).show()
                                },
                                onEdit = {
                                    courseToEdit = courseData
                                }
                            )
                        }
                    }

                    // Imported classes
                    if (filteredImportedClasses.isNotEmpty()) {
                        items(filteredImportedClasses) { classData ->
                            ImportedClassCard(classData = classData)
                        }
                    }
                }
            }
        }

        // Add FAB for adding course
        FloatingActionButton(
            onClick = { showAddCourseDialog = true },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
            containerColor = Color(0xFF333D79)
        ) {
            Icon(
                imageVector = Icons.Rounded.Add,
                contentDescription = "Add Course",
                tint = Color.White
            )
        }
    }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
private fun showEditCourseDialog(
    courseData: CourseItem,
    classViewModel: ClassViewModel, // Add this parameter
    onDismiss: () -> Unit // Add this to handle dismissal from outside
) {
    var courseName by remember { mutableStateOf(courseData.name) }
    var courseCode by remember { mutableStateOf(courseData.courseCode) }
    var semester by remember { mutableStateOf(courseData.semester) }
    var academicYear by remember { mutableStateOf(courseData.academic_year ?: "") }
    var description by remember { mutableStateOf(courseData.description ?: "") }

    val academicYearOptions = remember {
        val currentYear = Calendar.getInstance().get(Calendar.YEAR)
        (0 until 5).map { i ->
            val startYear = currentYear + i
            val endYear = startYear + 1
            "$startYear-$endYear"
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit Course", style = MaterialTheme.typography.titleLarge) },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = courseCode,
                    onValueChange = { courseCode = it },
                    label = { Text("Course Code") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp)
                )

                OutlinedTextField(
                    value = courseName,
                    onValueChange = { courseName = it },
                    label = { Text("Course Name") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp)
                )

                // Add dropdown for semester
                var semesterExpanded by remember { mutableStateOf(false) }
                val semesterOptions = listOf("1st Semester", "2nd Semester", "Mid Year")

                ExposedDropdownMenuBox(
                    expanded = semesterExpanded,
                    onExpandedChange = { semesterExpanded = it },
                    modifier = Modifier.padding(vertical = 8.dp)
                ) {
                    OutlinedTextField(
                        value = semester,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Semester") },
                        trailingIcon = {
                            ExposedDropdownMenuDefaults.TrailingIcon(expanded = semesterExpanded)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor()
                    )

                    ExposedDropdownMenu(
                        expanded = semesterExpanded,
                        onDismissRequest = { semesterExpanded = false }
                    ) {
                        semesterOptions.forEach { option ->
                            DropdownMenuItem(
                                text = { Text(option) },
                                onClick = {
                                    semester = option
                                    semesterExpanded = false
                                }
                            )
                        }
                    }
                }

                var academicYearExpanded by remember { mutableStateOf(false) }

                ExposedDropdownMenuBox(
                    expanded = academicYearExpanded,
                    onExpandedChange = { academicYearExpanded = it },
                    modifier = Modifier.padding(vertical = 8.dp)
                ) {
                    OutlinedTextField(
                        value = academicYear,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Academic Year") },
                        trailingIcon = {
                            ExposedDropdownMenuDefaults.TrailingIcon(expanded = academicYearExpanded)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor()
                    )

                    ExposedDropdownMenu(
                        expanded = academicYearExpanded,
                        onDismissRequest = { academicYearExpanded = false }
                    ) {
                        academicYearOptions.forEach { year ->
                            DropdownMenuItem(
                                text = { Text(year) },
                                onClick = {
                                    academicYear = year
                                    academicYearExpanded = false
                                }
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                        .padding(vertical = 8.dp),
                    minLines = 3
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onDismiss()
                    classViewModel.updateCourse(
                        courseId = courseData.id,
                        name = courseName,
                        courseCode = courseCode,
                        semester = semester,
                        academicYear = academicYear.ifBlank { null },
                        description = description.ifBlank { null }
                    )
                }
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

@Composable
fun ImportedClassCard(classData: ImportedClass) {
    val context = LocalContext.current
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(100.dp) // Compact height like the CourseCard
            .clickable {
                // Navigate to view the imported class data
                val intent = Intent(context, FileViewerActivity::class.java).apply {
                    putExtra("file_table_data", FileTableData(
                        fileData = classData.fileData,
                        fileName = classData.name,
                        section = classData.section
                    ))
                }
                context.startActivity(intent)
            },
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 2.dp
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Top row with class icon and imported badge
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    // Class icon
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .background(
                                color = Color(0xFFEEF0F8),
                                shape = RoundedCornerShape(6.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Rounded.InsertDriveFile,
                            contentDescription = null,
                            tint = Color(0xFF333D79),
                            modifier = Modifier.size(14.dp)
                        )
                    }
                    
                    // Imported badge - smaller and more subtle
                    Box(
                        modifier = Modifier
                            .background(
                                color = Color(0xFF2196F3).copy(alpha = 0.1f),
                                shape = RoundedCornerShape(8.dp)
                            )
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "Imported",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF2196F3)
                        )
                    }
                }
                
                // Class name - The main highlight
                Text(
                    text = classData.name,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = Color(0xFF333D79),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(vertical = 2.dp)
                )
                
                // Bottom row with section and student count
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Section
                    Text(
                        text = "Section ${classData.section}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF666666),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    
                    // Students count
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Group,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = Color(0xFF666666)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${maxOf(0, classData.fileData.size - 1)} students", // Subtract 1 for header row
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF666666)
                        )
                    }
                }
            }
        }
    }
}
