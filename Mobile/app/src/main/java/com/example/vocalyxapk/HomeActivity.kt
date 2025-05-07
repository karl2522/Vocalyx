package com.example.vocalyxapk

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
        Triple("Classes", Icons.Rounded.List, "Classes")
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

    // Observe imported classes
    val importedClasses = ClassRepository.classes
    val filteredClasses = importedClasses.filter {
        it.name.contains(searchQuery, ignoreCase = true) ||
        it.section.contains(searchQuery, ignoreCase = true)
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp)
        ) {
            // Header
            Text(
                "My Classes",
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
                placeholder = { Text("Search classes...", color = Color(0xFF666666)) },
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

            // Class Cards Grid
            if (filteredClasses.isEmpty()) {
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
                            Icons.Rounded.Upload,
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
                            "Import an Excel or CSV file to create your first class",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF666666),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(bottom = 80.dp), // Add padding for FAB
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(filteredClasses) { classData ->
                        ImportedClassCard(classData = classData)
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