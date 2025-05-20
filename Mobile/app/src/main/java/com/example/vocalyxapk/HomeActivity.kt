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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme
import java.util.*
import androidx.compose.ui.viewinterop.AndroidView
import android.widget.Button
import androidx.compose.ui.graphics.Color
import kotlinx.coroutines.launch
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.result.ActivityResultLauncher
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.composables.BackendClassCard
import com.example.vocalyxapk.composables.CourseCard
import com.example.vocalyxapk.data.ClassRepository
import com.example.vocalyxapk.data.ImportedClass
import com.example.vocalyxapk.viewmodel.ClassUIState
import com.example.vocalyxapk.viewmodel.CourseUIState
import com.example.vocalyxapk.viewmodel.ClassViewModel
import com.example.vocalyxapk.viewmodel.CourseCreationState
import com.example.vocalyxapk.viewmodel.ViewModelFactory
import kotlinx.parcelize.Parcelize

class HomeActivity : ComponentActivity(), TextToSpeech.OnInitListener {

    private lateinit var textToSpeech: TextToSpeech
    private lateinit var speechRecognizer: SpeechRecognizer
    private val REQUEST_CODE_SPEECH_INPUT = 100

    // Add state holders
    private var currentText by mutableStateOf("")
    private var isVoiceRecognitionActive by mutableStateOf(false)

    private val speechRecognizerListener = object : android.speech.RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
            isVoiceRecognitionActive = true
        }

        override fun onResults(results: Bundle?) {
            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            if (!matches.isNullOrEmpty()) {
                currentText = matches[0]
                isVoiceRecognitionActive = false
            }
        }

        override fun onError(error: Int) {
            isVoiceRecognitionActive = false
            val message = when (error) {
                SpeechRecognizer.ERROR_NO_MATCH -> "No speech was recognized. Please try again."
                SpeechRecognizer.ERROR_NETWORK -> "Network error. Please check your internet connection."
                SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout. Please try again."
                SpeechRecognizer.ERROR_AUDIO -> "Audio recording error. Please try again."
                SpeechRecognizer.ERROR_SERVER -> "Server error. Please try again later."
                SpeechRecognizer.ERROR_CLIENT -> "Client side error. Please try again."
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input detected. Please try again."
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Please grant microphone permission."
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Speech recognizer is busy. Please try again."
                else -> "Error occurred during recognition. Error code: $error"
            }
            Toast.makeText(this@HomeActivity, message, Toast.LENGTH_SHORT).show()
        }

        // Required overrides with empty implementations
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {}
        override fun onPartialResults(partialResults: Bundle?) {}
        override fun onEvent(eventType: Int, params: Bundle?) {}
    }

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize TextToSpeech
        textToSpeech = TextToSpeech(this, this)

        // Initialize SpeechRecognizer
        if (SpeechRecognizer.isRecognitionAvailable(this)) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
            speechRecognizer.setRecognitionListener(speechRecognizerListener)
        } else {
            Toast.makeText(this, "Speech recognition is not supported on this device.", Toast.LENGTH_SHORT).show()
        }

        setContent {
            VOCALYXAPKTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    var drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
                    val scope = rememberCoroutineScope()
                    var selectedTab by remember { mutableStateOf(0) }
                    
                    val navigationItems = listOf(
                        Triple("Home", Icons.Rounded.Home, "Home"),
                        Triple("Voice", Icons.Rounded.Mic, "Voice"),
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
                                        // Navigate to login screen
                                        val intent = Intent(this@HomeActivity, LoginActivity::class.java)
                                        startActivity(intent)
                                        finish()
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
                                    modifier = Modifier.height(64.dp)
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
                                                indicatorColor = MaterialTheme.colorScheme.primary
                                            )
                                        )
                                    }
                                }
                            }
                        ) { paddingValues ->
                            when (selectedTab) {
                                0 -> HomeTab()
                                1 -> VoiceInputTab(
                                    text = currentText,
                                    onTextChange = { newText -> currentText = newText },
                                    onStartVoiceRecognition = {
                                        isVoiceRecognitionActive = true
                                        startVoiceRecognition()
                                    },
                                    onSpeakOut = { speakOut(currentText) },
                                    isVoiceRecognitionActive = isVoiceRecognitionActive,
                                    modifier = Modifier.padding(paddingValues)
                                )
                                2 -> ManualInputTab(modifier = Modifier.padding(paddingValues))
                                3 -> ClassesTab(modifier = Modifier.padding(paddingValues))
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = textToSpeech.setLanguage(Locale.getDefault())
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Toast.makeText(this, "Language not supported", Toast.LENGTH_SHORT).show()
            }
        } else {
            Toast.makeText(this, "Initialization failed", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::textToSpeech.isInitialized) {
            textToSpeech.stop()
            textToSpeech.shutdown()
        }
        if (::speechRecognizer.isInitialized) {
            speechRecognizer.destroy()
        }
    }

    private fun startVoiceRecognition() {
        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(android.Manifest.permission.RECORD_AUDIO), 1)
            return
        }

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak now...")
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 1000L)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 3000L)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2000L)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }

        try {
            // Stop any existing recognition
            if (::speechRecognizer.isInitialized) {
                speechRecognizer.cancel()
            }

            // Start listening
            speechRecognizer.startListening(intent)
            Toast.makeText(this, "Listening... Please speak", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            isVoiceRecognitionActive = false
            Toast.makeText(this, "Speech recognition failed to start: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun speakOut(text: String) {
        textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, null)
    }

    // Add permission result handling
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1 && grantResults.isNotEmpty() && grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            startVoiceRecognition()
        } else {
            Toast.makeText(this, "Microphone permission is required for voice recognition", Toast.LENGTH_SHORT).show()
        }
    }
}

@Composable
fun HomeScreen(
    text: String,
    onTextChange: (String) -> Unit,
    onStartVoiceRecognition: () -> Unit,
    onSpeakOut: (String) -> Unit,
    isVoiceRecognitionActive: Boolean
) {
    var selectedTab by remember { mutableStateOf(0) }
    
    val navigationItems = listOf(
        Triple("Home", Icons.Rounded.Home, "Home"),
        Triple("Voice", Icons.Rounded.Mic, "Voice"),
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
            1 -> VoiceInputTab(
                text = text,
                onTextChange = onTextChange,
                onStartVoiceRecognition = onStartVoiceRecognition,
                onSpeakOut = onSpeakOut,
                isVoiceRecognitionActive = isVoiceRecognitionActive,
                modifier = Modifier.padding(paddingValues)
            )
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
fun VoiceInputTab(
    text: String,
    onTextChange: (String) -> Unit,
    onStartVoiceRecognition: () -> Unit,
    onSpeakOut: (String) -> Unit,
    isVoiceRecognitionActive: Boolean,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        OutlinedTextField(
            value = text,
            onValueChange = onTextChange,
            label = { Text("Enter text here") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = onStartVoiceRecognition,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (isVoiceRecognitionActive) "Listening..." else "Start Voice Recognition")
        }
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = { onSpeakOut(text) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Speak Text")
        }
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
    
    // Dialog state for adding a new course
    var showAddCourseDialog by remember { mutableStateOf(false) }
    var courseName by remember { mutableStateOf("") }
    var courseCode by remember { mutableStateOf("") }
    var courseSemester by remember { mutableStateOf("") }
    var courseDescription by remember { mutableStateOf("") }
    var courseAcademicYear by remember { mutableStateOf("") }
    
    // Course creation state
    val courseCreationState by classViewModel.courseCreationState.collectAsState()
    
    // Observe backend data
    val classUIState by classViewModel.classUIState.collectAsState()
    val courseUIState by classViewModel.courseUIState.collectAsState()
    
    // Local data (for imported files)
    val importedClasses = com.example.vocalyxapk.data.ClassRepository.getClasses()
    
    // File picker launcher
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            // Start FileViewerActivity with the selected file URI
            val intent = Intent(context, FileViewerActivity::class.java).apply {
                data = uri
            }
            context.startActivity(intent)
        }
    }
    
    // Fetch courses when the tab is displayed
    LaunchedEffect(Unit) {
        try {
            android.util.Log.d("ClassesTab", "Attempting to fetch courses")
            classViewModel.fetchCourses()
        } catch (e: Exception) {
            android.util.Log.e("ClassesTab", "Error fetching courses", e)
            // Show an error toast instead of crashing
            android.widget.Toast.makeText(
                context,
                "Error loading courses: ${e.message}",
                android.widget.Toast.LENGTH_LONG
            ).show()
        }
    }
    
    // Filter courses based on search query and combine backend + local data
    val courses = when (courseUIState) {
        is CourseUIState.Success -> (courseUIState as CourseUIState.Success).courses
        else -> emptyList()
    }
    
    val filteredCourses = courses.filter {
        it.name.contains(searchQuery, ignoreCase = true) ||
        it.courseCode.contains(searchQuery, ignoreCase = true)
    }
    
    val filteredImportedClasses = importedClasses.filter {
        it.name.contains(searchQuery, ignoreCase = true) ||
        it.section.contains(searchQuery, ignoreCase = true)
    }
    
    // Determine if we have courses to show (either backend or imported)
    val hasCourses = filteredCourses.isNotEmpty() || filteredImportedClasses.isNotEmpty()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.White)
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
                            // Course Code with title above field
                            Text(
                                text = "Course Code *",
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                            OutlinedTextField(
                                value = courseCode,
                                onValueChange = { courseCode = it },
                                placeholder = { Text("e.g. CS101") },
                                modifier = Modifier
                                    .fillMaxWidth(),
                                singleLine = true,
                                isError = courseCode.isBlank() && courseCreationState !is CourseCreationState.Idle
                            )
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            // Course Name with title above field
                            Text(
                                text = "Course Name *",
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                            OutlinedTextField(
                                value = courseName,
                                onValueChange = { courseName = it },
                                placeholder = { Text("e.g. Introduction to Computer Science") },
                                modifier = Modifier
                                    .fillMaxWidth(),
                                singleLine = true,
                                isError = courseName.isBlank() && courseCreationState !is CourseCreationState.Idle
                            )
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            // Description field with title above
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
                                    .height(100.dp), // Match the height in the screenshot
                                minLines = 2
                            )
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            // Semester Dropdown
                            Text(
                                text = "Semester *",
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                            
                            // Semester dropdown implementation
                            var semesterDropdownExpanded by remember { mutableStateOf(false) }
                            val semesterOptions = listOf("Fall", "Spring", "Summer", "Winter")
                            
                            Box(modifier = Modifier.fillMaxWidth()) {
                                OutlinedTextField(
                                    value = courseSemester,
                                    onValueChange = { },
                                    readOnly = true,
                                    trailingIcon = {
                                        Icon(Icons.Rounded.ArrowDropDown, "Expand dropdown")
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    placeholder = { Text("Select a semester") },
                                    isError = courseSemester.isBlank() && courseCreationState !is CourseCreationState.Idle
                                )
                                
                                // Overlay a transparent clickable box
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
                                supportingText = { Text("Format: YYYY-YYYY", style = MaterialTheme.typography.bodySmall) }
                            )
                            
                            // Show error message if there was an error in course creation
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
                                // Show error toast for missing fields
                                Toast.makeText(context, "Please fill in all required fields", Toast.LENGTH_SHORT).show()
                            } else {
                                // Create course
                                classViewModel.createCourse(
                                    name = courseName,
                                    courseCode = courseCode,
                                    semester = courseSemester,
                                    description = courseDescription.ifBlank { null },
                                    academicYear = courseAcademicYear.ifBlank { null }
                                )
                                // Reset fields
                                courseName = ""
                                courseCode = ""
                                courseSemester = ""
                                courseDescription = ""
                                courseAcademicYear = ""
                                showAddCourseDialog = false
                            }
                        },
                        enabled = courseCreationState !is CourseCreationState.Loading
                    ) {
                        if (courseCreationState is CourseCreationState.Loading) {
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
                        onClick = { showAddCourseDialog = false },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Gray)
                    ) {
                        Text("Cancel")
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
        // Add FloatingActionButton (on left side)
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
        
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp)
        ) {
            // Header
            Text(
                "My Courses",
                style = MaterialTheme.typography.headlineMedium.copy(
                    color = Color(0xFF333D79)
                ),
                modifier = Modifier.padding(top = 24.dp, bottom = 16.dp)
            )

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 20.dp)
                    .height(52.dp),
                placeholder = { Text("Search courses...", color = Color(0xFF666666)) },
                leadingIcon = {
                    Icon(
                        Icons.Rounded.Search,
                        contentDescription = "Search",
                        tint = Color(0xFF666666),
                        modifier = Modifier.padding(start = 8.dp)
                    )
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = TextFieldDefaults.outlinedTextFieldColors(
                    focusedBorderColor = Color(0xFFE0E0E0),
                    unfocusedBorderColor = Color(0xFFE0E0E0),
                    containerColor = Color.White
                )
            )
            
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
                            "You don't have any courses yet. Create a course to get started with classes and import data.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF666666),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
            // Display courses
            else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
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
                                }
                            )
                        }
                    }
                    
                    // Still showing imported classes (keeping this functionality as specified)
                    if (filteredImportedClasses.isNotEmpty()) {
                        items(filteredImportedClasses) { classData ->
                            ImportedClassCard(classData = classData)
                        }
                    }
                }
            }
        }
        
        // Floating Action Button for Import
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
        HomeScreen(
            text = "",
            onTextChange = {},
            onStartVoiceRecognition = {},
            onSpeakOut = {},
            isVoiceRecognitionActive = false
        )
    }
} 