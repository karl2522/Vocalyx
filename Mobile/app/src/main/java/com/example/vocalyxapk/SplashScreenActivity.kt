package com.example.vocalyxapk

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.clickable
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.layout.ContentScale
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme
import com.example.vocalyxapk.utils.AuthState
import com.example.vocalyxapk.utils.AuthStateManager
import com.example.vocalyxapk.utils.NavigationUtils
import kotlinx.coroutines.delay

class SplashScreenActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            VOCALYXAPKTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFFF9F9F9)
                ) {
                    ModernSplashScreen()
                }
            }
        }
    }
}

// Onboarding steps for new users
sealed class OnboardingStep {
    object PhoneticRecognition : OnboardingStep()
    object IntelligentGrading : OnboardingStep()
    object SecureProcessing : OnboardingStep()
    object Complete : OnboardingStep()
}

// App state
sealed class AppState {
    object Loading : AppState()
    object FirstTimeUser : AppState()
    object ReturningUser : AppState()
    object Ready : AppState()
}

@Composable
fun ModernSplashScreen() {
    val context = LocalContext.current
    val authState by AuthStateManager.authState.collectAsState()

    // App state management
    var appState by remember { mutableStateOf<AppState>(AppState.Loading) }
    var currentStep by remember { mutableStateOf<OnboardingStep>(OnboardingStep.PhoneticRecognition) }
    var progress by remember { mutableFloatStateOf(0f) }
    
    // Check if this is the first time opening the app
    val isFirstTime = remember {
        try {
            val prefs = context.getSharedPreferences("VocalyxAppState", android.content.Context.MODE_PRIVATE)
            val firstTime = !prefs.getBoolean("has_opened_before", false)
            if (firstTime) {
                prefs.edit().putBoolean("has_opened_before", true).apply()
            }
            firstTime
        } catch (e: Exception) {
            false
        }
    }

    // Logo animation states
    val infiniteTransition = rememberInfiniteTransition(label = "logo_animation")
    
    val logoScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.1f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "logo_scale_animation"
    )

    val logoRotation by infiniteTransition.animateFloat(
        initialValue = -5f,
        targetValue = 5f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "logo_rotation"
    )

    // Loading process
    LaunchedEffect(key1 = true) {
        try {
            // Initial loading
            progress = 0.3f
            delay(1000L)
            
            // Check auth state
            AuthStateManager.checkAuthState(context)
            progress = 0.7f
            delay(800L)
            
            // Determine app state
            appState = if (isFirstTime) AppState.FirstTimeUser else AppState.ReturningUser
            progress = 1.0f
            delay(500L)
            
            if (!isFirstTime) {
                // For returning users, navigate immediately
                appState = AppState.Ready
                delay(800L)
                when (authState) {
                    is AuthState.Authenticated -> NavigationUtils.navigateToHome(context)
                    else -> NavigationUtils.navigateToLogin(context)
                }
            }
        } catch (e: Exception) {
            delay(1000L)
            NavigationUtils.navigateToLogin(context)
        }
    }

    // Main UI with clean white background
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF9F9F9)),
        contentAlignment = Alignment.Center
    ) {
        when (appState) {
            AppState.Loading, AppState.ReturningUser -> {
                InitialSplashScreen(
                    logoScale = logoScale,
                    logoRotation = logoRotation,
                    progress = progress,
                    isReturningUser = appState == AppState.ReturningUser
                )
            }
            AppState.FirstTimeUser -> {
                OnboardingScreen(
                    currentStep = currentStep,
                    onStepChange = { newStep -> currentStep = newStep },
                    onGetStarted = {
                        appState = AppState.Ready
                        when (authState) {
                            is AuthState.Authenticated -> NavigationUtils.navigateToHome(context)
                            else -> NavigationUtils.navigateToLogin(context)
                        }
                    }
                )
            }
            AppState.Ready -> {
                InitialSplashScreen(logoScale, logoRotation, 1f, false)
            }
        }
    }
}

@Composable
fun InitialSplashScreen(
    logoScale: Float,
    logoRotation: Float,
    progress: Float,
    isReturningUser: Boolean
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp)
    ) {
        Spacer(modifier = Modifier.weight(0.4f))

        // Logo with Android splash screen compatible animation
        Box(
            modifier = Modifier
                .size(120.dp)
                .padding(bottom = 24.dp),
            contentAlignment = Alignment.Center
        ) {
            Image(
                                    painter = painterResource(id = R.drawable.vocalyxlogo),
                contentDescription = "Vocalyx Logo",
                modifier = Modifier
                    .size(100.dp)
                    .graphicsLayer {
                        scaleX = logoScale
                        scaleY = logoScale
                        rotationZ = logoRotation
                    }
            )
        }

        // Brand text with clean typography
        Text(
            text = "VOCALYX",
            color = Color(0xFF333D79),
            fontSize = 28.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 2.sp,
            textAlign = TextAlign.Center
        )

        Text(
            text = if (isReturningUser) "Welcome back" else "Voice Recognition Technology",
            color = Color(0xFF666666),
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 8.dp, bottom = 48.dp)
        )

        // Progress indicator
        if (progress > 0f) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Simple progress bar
                val animatedProgress by animateFloatAsState(
                    targetValue = progress,
                    animationSpec = tween(durationMillis = 600, easing = FastOutSlowInEasing),
                    label = "progress_animation"
                )

                Box(
                    modifier = Modifier
                        .width(200.dp)
                        .height(3.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(Color(0xFFE0E0E0))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(animatedProgress)
                            .clip(RoundedCornerShape(2.dp))
                            .background(Color(0xFF333D79))
                    )
                }

                // Loading text
                Text(
                    text = when {
                        progress < 0.4f -> "Initializing..."
                        progress < 0.8f -> "Loading systems..."
                        else -> "Ready"
                    },
                    color = Color(0xFF666666),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(top = 16.dp)
                )
            }
        }

        Spacer(modifier = Modifier.weight(0.6f))

        // Footer
        Text(
            text = "Advanced AI Technology",
            color = Color(0xFF999999),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun OnboardingScreen(
    currentStep: OnboardingStep,
    onStepChange: (OnboardingStep) -> Unit,
    onGetStarted: () -> Unit
) {
    // Step progress
    val stepProgress = when (currentStep) {
        OnboardingStep.PhoneticRecognition -> 1
        OnboardingStep.IntelligentGrading -> 2
        OnboardingStep.SecureProcessing -> 3
        OnboardingStep.Complete -> 3
    }

    // Auto-advance onboarding steps every 3 seconds
    LaunchedEffect(currentStep) {
        if (currentStep != OnboardingStep.Complete) {
            delay(3000L) // Wait 3 seconds
            when (currentStep) {
                OnboardingStep.PhoneticRecognition -> onStepChange(OnboardingStep.IntelligentGrading)
                OnboardingStep.IntelligentGrading -> onStepChange(OnboardingStep.SecureProcessing)
                OnboardingStep.SecureProcessing -> onStepChange(OnboardingStep.Complete)
                OnboardingStep.Complete -> {} // Do nothing
            }
        }
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp)
    ) {
        Spacer(modifier = Modifier.height(60.dp))

        // Progress indicators
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.padding(bottom = 40.dp)
        ) {
            repeat(3) { index ->
                val isActive = index < stepProgress
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(
                            if (isActive) Color(0xFF333D79) else Color(0xFFE0E0E0)
                        )
                )
            }
        }

        Spacer(modifier = Modifier.weight(0.2f))

        // Feature image with smooth transitions
        Box(
            modifier = Modifier
                .size(280.dp)
                .padding(bottom = 32.dp),
            contentAlignment = Alignment.Center
        ) {
            // Show appropriate image based on current step
            val currentImageRes = when (currentStep) {
                OnboardingStep.PhoneticRecognition -> R.drawable.splashbro
                OnboardingStep.IntelligentGrading -> R.drawable.splashpana
                OnboardingStep.SecureProcessing -> R.drawable.splashamico
                OnboardingStep.Complete -> R.drawable.splashwelcome
            }
            
            val currentDescription = when (currentStep) {
                OnboardingStep.PhoneticRecognition -> "Phonetic Recognition"
                OnboardingStep.IntelligentGrading -> "Intelligent Grading"
                OnboardingStep.SecureProcessing -> "Secure Processing"
                OnboardingStep.Complete -> "Ready to Start"
            }

            Card(
                modifier = Modifier
                    .size(260.dp)
                    .shadow(12.dp, RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color.White
                )
            ) {
                Image(
                    painter = painterResource(id = currentImageRes),
                    contentDescription = currentDescription,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }
        }

        // Content based on step
        when (currentStep) {
            OnboardingStep.PhoneticRecognition -> {
                OnboardingContent(
                    title = "Phonetic Voice Recognition",
                    description = "Advanced algorithms that handle mispronunciations, accents, and partial names. \"Mike\" automatically matches \"Michael\" with confidence scoring.",
                    showButton = false,
                    onNext = { }
                )
            }
            OnboardingStep.IntelligentGrading -> {
                OnboardingContent(
                    title = "Intelligent Grading System",
                    description = "Automated grade extraction from speech with confidence thresholds. System knows uncertainty levels and provides fallback options.",
                    showButton = false,
                    onNext = { }
                )
            }
            OnboardingStep.SecureProcessing -> {
                OnboardingContent(
                    title = "Secure Processing",
                    description = "Fast phonetic matching with caching for large classes. Performance-optimized algorithms ensure quick response times.",
                    showButton = false,
                    onNext = { }
                )
            }
            OnboardingStep.Complete -> {
                GetStartedContent(onGetStarted = onGetStarted)
            }
        }

        Spacer(modifier = Modifier.weight(0.4f))
    }
}

@Composable
fun OnboardingContent(
    title: String,
    description: String,
    showButton: Boolean,
    onNext: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = title,
            color = Color(0xFF1A1A1A),
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        Text(
            text = description,
            color = Color(0xFF666666),
            fontSize = 14.sp,
            fontWeight = FontWeight.Normal,
            textAlign = TextAlign.Center,
            lineHeight = 20.sp,
            modifier = Modifier.padding(bottom = 32.dp, start = 16.dp, end = 16.dp)
        )

        // Only show button if specified (for manual navigation)
        if (showButton) {
            Button(
                onClick = onNext,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF333D79)
                )
            ) {
                Text(
                    text = "Continue",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    imageVector = Icons.Default.ArrowForward,
                    contentDescription = "Next",
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@Composable
fun GetStartedContent(onGetStarted: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = "Ready to Get Started?",
            color = Color(0xFF1A1A1A),
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        Text(
            text = "Experience the power of phonetic voice recognition with intelligent grading and secure processing.",
            color = Color(0xFF666666),
            fontSize = 14.sp,
            fontWeight = FontWeight.Normal,
            textAlign = TextAlign.Center,
            lineHeight = 20.sp,
            modifier = Modifier.padding(bottom = 32.dp, start = 16.dp, end = 16.dp)
        )

        // Get Started button - simplified text
        Button(
            onClick = onGetStarted,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF4CAF50)
            )
        ) {
            Text(
                text = "Get Started",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }
    }
}