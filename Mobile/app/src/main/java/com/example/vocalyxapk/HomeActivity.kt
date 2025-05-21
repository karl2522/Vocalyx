package com.example.vocalyxapk

import android.app.Application
import android.content.Intent
import android.os.Bundle
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme
import java.util.*
import androidx.compose.ui.graphics.Color
import kotlinx.coroutines.launch
import androidx.activity.result.contract.ActivityResultContracts
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.BorderStroke
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.FilterAlt
import androidx.compose.ui.text.font.FontWeight
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.composables.CourseCard
import com.example.vocalyxapk.composables.ScheduleTab
import com.example.vocalyxapk.data.ImportedClass
import com.example.vocalyxapk.models.CourseItem
import com.example.vocalyxapk.repository.AuthRepository
import com.example.vocalyxapk.utils.AuthStateManager
import com.example.vocalyxapk.viewmodel.CourseUIState
import com.example.vocalyxapk.viewmodel.ClassViewModel
import com.example.vocalyxapk.viewmodel.CourseCreationState
import com.example.vocalyxapk.viewmodel.CourseDeleteState
import com.example.vocalyxapk.viewmodel.CourseUpdateState
import com.example.vocalyxapk.viewmodel.ViewModelFactory

class HomeActivity : ComponentActivity(){

    private val REQUEST_CODE_SPEECH_INPUT = 100


    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)


        setContent {
            VOCALYXAPKTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    var drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
                    val scope = rememberCoroutineScope()
                    var selectedTab by remember { mutableStateOf(0) }
                    val context = LocalContext.current
                    
                    val navigationItems = listOf(
                        Triple("Home", Icons.Rounded.Home, "Home"),
                        Triple("Schedule", Icons.Rounded.CalendarToday, "Schedule"),
                        Triple("Manual", Icons.Rounded.Edit, "Manual"),
                        Triple("Classes", Icons.Rounded.List, "Classes")
                    )
                    
                    ModalNavigationDrawer(
                        drawerState = drawerState,
                        drawerContent = {
                            ModalDrawerSheet {
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    "Vocalyx Menu",
                                    modifier = Modifier.padding(16.dp),
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Divider(color = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f))
                                
                                // Drawer Menu Items
                                NavigationDrawerItem(
                                    icon = { Icon(Icons.Rounded.Notifications, contentDescription = "Notifications", tint = MaterialTheme.colorScheme.primary) },
                                    label = { Text("Notifications", color = MaterialTheme.colorScheme.onSurface) },
                                    selected = false,
                                    onClick = { /* TODO: Implement notifications */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    )
                                )
                                
                                NavigationDrawerItem(
                                    icon = { Icon(Icons.Rounded.Download, contentDescription = "Export Reports", tint = MaterialTheme.colorScheme.primary) },
                                    label = { Text("Export Reports", color = MaterialTheme.colorScheme.onSurface) },
                                    selected = false,
                                    onClick = { /* TODO: Implement export */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    )
                                )
                                
                                NavigationDrawerItem(
                                    icon = { Icon(Icons.Rounded.Person, contentDescription = "Profile", tint = MaterialTheme.colorScheme.primary) },
                                    label = { Text("Profile", color = MaterialTheme.colorScheme.onSurface) },
                                    selected = false,
                                    onClick = { /* TODO: Implement profile */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    )
                                )
                                
                                NavigationDrawerItem(
                                    icon = { Icon(Icons.Rounded.Settings, contentDescription = "Settings", tint = MaterialTheme.colorScheme.primary) },
                                    label = { Text("Settings", color = MaterialTheme.colorScheme.onSurface) },
                                    selected = false,
                                    onClick = { /* TODO: Implement settings */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    )
                                )
                                
                                NavigationDrawerItem(
                                    icon = { Icon(Icons.Rounded.Info, contentDescription = "About/Help", tint = MaterialTheme.colorScheme.primary) },
                                    label = { Text("About/Help", color = MaterialTheme.colorScheme.onSurface) },
                                    selected = false,
                                    onClick = { /* TODO: Implement about/help */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    )
                                )
                                
                                Divider(color = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f))

                                NavigationDrawerItem(
                                    icon = { Icon(Icons.Rounded.Logout, contentDescription = "Logout", tint = MaterialTheme.colorScheme.primary) },
                                    label = { Text("Logout", color = MaterialTheme.colorScheme.onSurface) },
                                    selected = false,
                                    onClick = {
                                        val authRepository = AuthRepository(context)

                                        scope.launch {
                                            try {
                                                Toast.makeText(context, "Logging out...", Toast.LENGTH_SHORT).show()

                                                val result = authRepository.logout()

                                                AuthStateManager.setLoggedOut(context)

                                                val intent = Intent(this@HomeActivity, LoginActivity::class.java)
                                                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                                                startActivity(intent)
                                                finish()
                                            } catch (e: Exception) {
                                                AuthStateManager.setLoggedOut(context)

                                                Toast.makeText(context, "Logout failed on server but you're logged out locally", Toast.LENGTH_SHORT).show()

                                                val intent = Intent(this@HomeActivity, LoginActivity::class.java)
                                                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                                                startActivity(intent)
                                                finish()
                                            }
                                        }
                                    },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    )
                                )
                            }
                        }
                    ) {
                        Scaffold(
                            topBar = {
                                TopAppBar(
                                    title = { 
                                        Text(
                                            "Vocalyx",
                                            color = MaterialTheme.colorScheme.onPrimary
                                        ) 
                                    },
                                    colors = TopAppBarDefaults.topAppBarColors(
                                        containerColor = MaterialTheme.colorScheme.primary
                                    ),
                                    navigationIcon = {
                                        IconButton(onClick = { 
                                            scope.launch {
                                                drawerState.open()
                                            }
                                        }) {
                                            Icon(
                                                Icons.Rounded.Menu,
                                                contentDescription = "Menu",
                                                tint = MaterialTheme.colorScheme.onPrimary
                                            )
                                        }
                                    }
                                )
                            },
                            bottomBar = {
                                NavigationBar(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(64.dp)
                                ) {
                                    navigationItems.forEachIndexed { index, (title, icon, label) ->
                                        NavigationBarItem(
                                            icon = {
                                                Icon(
                                                    imageVector = icon,
                                                    contentDescription = title,
                                                    tint = if (selectedTab == index)
                                                        MaterialTheme.colorScheme.onPrimary
                                                    else
                                                        MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
                                                    modifier = Modifier.size(24.dp)
                                                )
                                            },
                                            label = {
                                                Text(
                                                    label,
                                                    color = if (selectedTab == index)
                                                        MaterialTheme.colorScheme.onPrimary
                                                    else
                                                        MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
                                                    style = MaterialTheme.typography.labelSmall
                                                )
                                            },
                                            selected = selectedTab == index,
                                            onClick = { selectedTab = index },
                                            colors = NavigationBarItemDefaults.colors(
                                                selectedIconColor = MaterialTheme.colorScheme.onPrimary,
                                                unselectedIconColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
                                                selectedTextColor = MaterialTheme.colorScheme.onPrimary,
                                                unselectedTextColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
                                                indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
                                            )
                                        )
                                    }
                                }
                            }
                        ) { paddingValues ->
                            when (selectedTab) {
                                0 -> HomeTab()
                                1 -> ScheduleTab()
                                2 -> ManualInputTab(modifier = Modifier.padding(paddingValues))
                                3 -> ClassesTab(modifier = Modifier.padding(paddingValues))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HomeScreen(
) {
    var selectedTab by remember { mutableStateOf(0) }
    
    val navigationItems = listOf(
        Triple("Home", Icons.Rounded.Home, "Home"),
        Triple("Schedule", Icons.Rounded.CalendarToday, "Schedule"),
        Triple("Manual", Icons.Rounded.Edit, "Manual"),
        Triple("Courses", Icons.Rounded.List, "Courses")
    )
    
    Scaffold(
        bottomBar = {
            NavigationBar {
                navigationItems.forEachIndexed { index, (title, icon, label) ->
                    NavigationBarItem(
                        icon = { Icon(imageVector = icon, contentDescription = title) },
                        label = { Text(label) },
                        selected = selectedTab == index,
                        onClick = { selectedTab = index }
                    )
                }
            }
        }
    ) { paddingValues ->
        when (selectedTab) {
            0 -> HomeTab()
            1 -> ScheduleTab(modifier = Modifier.padding(paddingValues))
            2 -> ManualInputTab(modifier = Modifier.padding(paddingValues))
            3 -> ClassesTab(modifier = Modifier.padding(paddingValues))
        }
    }
}

@Composable
fun HomeTab() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Welcome to Vocalyx",
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        Text("Select an option from the bottom navigation to get started.")
    }
}

@Composable
fun ManualInputTab(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text("Manual Input", style = MaterialTheme.typography.headlineMedium)
        // Add manual input UI here
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClassesTab(modifier: Modifier = Modifier) {
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

    // File picker launcher
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            val intent = Intent(context, FileViewerActivity::class.java).apply {
                data = uri
            }
            context.startActivity(intent)
        }
    }

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
            android.util.Log.d("ClassesTab", "Attempting to fetch courses")
            classViewModel.fetchCourses()
        } catch (e: Exception) {
            android.util.Log.e("ClassesTab", "Error fetching courses", e)
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

    // Determine if we have courses to show (either backend or imported)
    val hasCourses = filteredCourses.isNotEmpty() || filteredImportedClasses.isNotEmpty()
    // Calculate total course count for display
    val totalCourseCount = allCourses.size

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8F9FC)) // Light background for better contrast
    ) {
        // Add Course Dialog
        if (showAddCourseDialog) {
            AlertDialog(
                onDismissRequest = { showAddCourseDialog = false },
                title = { Text("Add New Course", style = MaterialTheme.typography.titleLarge) },
                text = {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp)
                    ) {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            // Course Code
                            Text(
                                text = "Course Code *",
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                            OutlinedTextField(
                                value = courseCode,
                                onValueChange = { courseCode = it },
                                placeholder = { Text("e.g. CS101") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                isError = courseCode.isBlank() && courseCreationState !is CourseCreationState.Idle,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF333D79),
                                    unfocusedBorderColor = Color(0xFFDDDDDD)
                                )
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            // Course Name
                            Text(
                                text = "Course Name *",
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
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )

                            var semesterDropdownExpanded by remember { mutableStateOf(false) }
                            val semesterOptions = listOf("Fall", "Spring", "Summer", "Winter")

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
                                    isError = courseSemester.isBlank() && courseCreationState !is CourseCreationState.Idle,
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = Color(0xFF333D79),
                                        unfocusedBorderColor = Color(0xFFDDDDDD)
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
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )

                            OutlinedTextField(
                                value = courseAcademicYear,
                                onValueChange = { courseAcademicYear = it },
                                placeholder = { Text("e.g. 2023-2024") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                isError = courseAcademicYear.isBlank() && courseCreationState !is CourseCreationState.Idle,
                                supportingText = { Text("Format: YYYY-YYYY", style = MaterialTheme.typography.bodySmall) },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF333D79),
                                    unfocusedBorderColor = Color(0xFFDDDDDD)
                                )
                            )

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
                            if (courseName.isBlank() || courseCode.isBlank() || courseSemester.isBlank()) {
                                Toast.makeText(context, "Please fill in all required fields", Toast.LENGTH_SHORT).show()
                            } else {
                                classViewModel.createCourse(
                                    name = courseName,
                                    courseCode = courseCode,
                                    semester = courseSemester,
                                    description = courseDescription.ifBlank { null },
                                    academicYear = courseAcademicYear.ifBlank { null }
                                )
                                courseName = ""
                                courseCode = ""
                                courseSemester = ""
                                courseDescription = ""
                                courseAcademicYear = ""
                                showAddCourseDialog = false
                            }
                        },
                        enabled = courseCreationState !is CourseCreationState.Loading,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF333D79))
                    ) {
                        if (courseCreationState is CourseCreationState.Loading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Creating...")
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
                    .padding(bottom = 16.dp),
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
                                    val intent = android.content.Intent(context, MyClassesActivity::class.java).apply {
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
                .align(Alignment.BottomStart)
                .padding(16.dp),
            containerColor = Color(0xFF333D79)
        ) {
            Icon(
                imageVector = Icons.Rounded.Add,
                contentDescription = "Add Course",
                tint = Color.White
            )
        }

        // Import FAB
        FloatingActionButton(
            onClick = { filePickerLauncher.launch("*/*") },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 20.dp, bottom = 20.dp)
                .size(56.dp),
            containerColor = Color(0xFF333D79),
            shape = CircleShape
        ) {
            Icon(
                Icons.Rounded.Upload,
                contentDescription = "Import Excel/CSV",
                tint = Color.White,
                modifier = Modifier.size(24.dp)
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
                        listOf("Fall", "Spring", "Summer", "Winter").forEach { option ->
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

                OutlinedTextField(
                    value = academicYear,
                    onValueChange = { academicYear = it },
                    label = { Text("Academic Year") },
                    placeholder = { Text("YYYY-YYYY") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp)
                )

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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImportedClassCard(classData: ImportedClass) {
    val context = LocalContext.current
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(120.dp)
            .clickable {
                val fileTableData = FileTableData(
                    fileData = classData.fileData,
                    fileName = classData.name,
                    section = classData.section
                )
                val intent = Intent(context, FileViewerActivity::class.java).apply {
                    putExtra("file_table_data", fileTableData)
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
                classData.section,
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF666666),
                maxLines = 1
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                "Imported file rows: ${classData.fileData.size}",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF666666)
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun HomeScreenPreview() {
    VOCALYXAPKTheme {
        HomeScreen()
    }
}