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
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Error
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme
import com.example.vocalyxapk.utils.AuthState
import com.example.vocalyxapk.utils.AuthStateManager
import com.example.vocalyxapk.utils.NavigationUtils
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.*

class SplashScreenActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            VOCALYXAPKTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    SplashScreen()
                }
            }
        }
    }
}

// Loading states for progressive indicator
sealed class LoadingState {
    object Initializing : LoadingState()
    object CheckingAuth : LoadingState()
    object LoadingPreferences : LoadingState()
    object PreparingInterface : LoadingState()
    object Complete : LoadingState()
    data class Error(val message: String) : LoadingState()
}

@Composable
fun SplashScreen() {
    val context = LocalContext.current
    val authState by AuthStateManager.authState.collectAsState()

    // Progressive loading state
    var loadingState by remember { mutableStateOf<LoadingState>(LoadingState.Initializing) }
    var progress by remember { mutableFloatStateOf(0f) }

    // Error handling
    var hasError by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf("") }

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
            hasError = true
            errorMessage = "Failed to load app preferences"
            false
        }
    }

    // Animation states
    val infiniteTransition = rememberInfiniteTransition(label = "splash_animation")
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale_animation"
    )

    // Progressive loading with realistic steps
    LaunchedEffect(key1 = true) {
        try {
            // Step 1: Initializing
            loadingState = LoadingState.Initializing
            progress = 0.2f
            delay(if (isFirstTime) 800L else 300L)

            // Step 2: Checking Authentication
            loadingState = LoadingState.CheckingAuth
            progress = 0.4f
            AuthStateManager.checkAuthState(context)
            delay(if (isFirstTime) 600L else 200L)

            // Step 3: Loading User Preferences
            loadingState = LoadingState.LoadingPreferences
            progress = 0.7f
            delay(if (isFirstTime) 700L else 200L)

            // Step 4: Preparing Interface
            loadingState = LoadingState.PreparingInterface
            progress = 0.9f
            delay(if (isFirstTime) 600L else 200L)

            // Step 5: Complete
            loadingState = LoadingState.Complete
            progress = 1.0f
            delay(if (isFirstTime) 400L else 100L)

            // Final auth state check
            AuthStateManager.checkAuthState(context)
            delay(200)

            // Navigate based on auth state
            when (authState) {
                is AuthState.Authenticated -> NavigationUtils.navigateToHome(context)
                else -> NavigationUtils.navigateToLogin(context)
            }
        } catch (e: Exception) {
            hasError = true
            errorMessage = "Initialization failed: ${e.message}"
            loadingState = LoadingState.Error(errorMessage)

            // Even with error, still navigate after a delay
            delay(2000)
            NavigationUtils.navigateToLogin(context)
        }
    }

    // Get greeting based on time
    val greeting = remember {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        when (hour) {
            in 5..11 -> "Good Morning"
            in 12..16 -> "Good Afternoon"
            in 17..20 -> "Good Evening"
            else -> "Welcome"
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = if (hasError) listOf(
                        Color(0xFF8B0000),
                        Color(0xFFDC143C),
                        Color(0xFFFF6B6B)
                    ) else listOf(
                        Color(0xFF333D79),
                        Color(0xFF4361EE),
                        Color(0xFF7209B7)
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        // Background decoration circles
        if (!hasError) {
            Box(
                modifier = Modifier
                    .size(300.dp)
                    .scale(scale * 0.8f)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.1f))
            )

            Box(
                modifier = Modifier
                    .size(200.dp)
                    .scale(scale)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.15f))
            )
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            Spacer(modifier = Modifier.weight(1f))

            // Enhanced main content card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 32.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color.White.copy(alpha = 0.95f)
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 16.dp)
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp)
                ) {
                    // Logo with error handling
                    Box(
                        modifier = Modifier
                            .size(120.dp)
                            .scale(if (hasError) 1f else scale)
                            .clip(CircleShape)
                            .background(
                                if (hasError) {
                                    Color.Red.copy(alpha = 0.1f)
                                } else {
                                    Color.Transparent
                                }
                            )
                            .then(
                                if (!hasError) {
                                    Modifier.background(
                                        brush = Brush.radialGradient(
                                            colors = listOf(
                                                Color(0xFF333D79).copy(alpha = 0.1f),
                                                Color(0xFF333D79).copy(alpha = 0.05f)
                                            )
                                        )
                                    )
                                } else Modifier
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        if (hasError) {
                            Icon(
                                imageVector = Icons.Default.Error,
                                contentDescription = "Error",
                                modifier = Modifier.size(80.dp),
                                tint = Color.Red
                            )
                        } else {
                            Image(
                                painter = painterResource(id = R.drawable.vocalyxlogo),
                                contentDescription = "Vocalyx Logo",
                                modifier = Modifier.size(80.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Dynamic title based on state
                    Text(
                        text = if (hasError) "OOPS!" else "VOCALYX",
                        color = if (hasError) Color.Red else Color(0xFF333D79),
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.sp,
                        textAlign = TextAlign.Center
                    )

                    // Dynamic subtitle with time-based greeting
                    Text(
                        text = when {
                            hasError -> "Something went wrong"
                            isFirstTime -> "$greeting! Welcome to the Future of Voice Technology"
                            else -> "$greeting! Welcome Back"
                        },
                        color = Color(0xFF666666),
                        fontSize = if (isFirstTime) 16.sp else 18.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
                    )

                    if (isFirstTime && !hasError) {
                        Text(
                            text = "Revolutionizing grading with advanced voice recognition",
                            color = Color(0xFF888888),
                            fontSize = 14.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(bottom = 24.dp)
                        )
                    } else {
                        Spacer(modifier = Modifier.height(24.dp))
                    }

                    // Progressive loading indicator
                    if (!hasError) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            // Progress bar with smooth animation
                            val animatedProgress by animateFloatAsState(
                                targetValue = progress,
                                animationSpec = tween(durationMillis = 500, easing = FastOutSlowInEasing),
                                label = "progress_animation"
                            )

                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(8.dp)
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(Color(0xFFE0E0E0))
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxHeight()
                                        .fillMaxWidth(animatedProgress)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(
                                            brush = Brush.horizontalGradient(
                                                colors = listOf(
                                                    Color(0xFF333D79),
                                                    Color(0xFF4361EE)
                                                )
                                            )
                                        )
                                )
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Dynamic loading text
                            Text(
                                text = when (loadingState) {
                                    is LoadingState.Initializing -> "Initializing Vocalyx..."
                                    is LoadingState.CheckingAuth -> "Checking authentication..."
                                    is LoadingState.LoadingPreferences -> "Loading user preferences..."
                                    is LoadingState.PreparingInterface -> "Preparing interface..."
                                    is LoadingState.Complete -> "Ready!"
                                    is LoadingState.Error -> "Error: ${(loadingState as LoadingState.Error).message}"
                                },
                                color = if (loadingState is LoadingState.Error) Color.Red else Color(0xFF666666),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                textAlign = TextAlign.Center
                            )

                            // Progress percentage
                            Text(
                                text = "${(animatedProgress * 100).toInt()}%",
                                color = Color(0xFF888888),
                                fontSize = 12.sp,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    } else {
                        // Error state
                        Text(
                            text = errorMessage,
                            color = Color.Red,
                            fontSize = 14.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(bottom = 16.dp)
                        )

                        Text(
                            text = "Don't worry, we're taking you to the login screen",
                            color = Color(0xFF666666),
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Enhanced first-time experience with feature previews
            if (isFirstTime && !hasError) {
                AnimatedVisibility(
                    visible = progress > 0.5f,
                    enter = fadeIn(animationSpec = tween(1000)),
                    exit = fadeOut()
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Feature preview cards
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            FeatureCard(
                                icon = Icons.Default.Mic,
                                title = "Voice Recognition",
                                modifier = Modifier.weight(1f)
                            )
                            FeatureCard(
                                icon = Icons.Default.Speed,
                                title = "Fast Grading",
                                modifier = Modifier.weight(1f)
                            )
                            FeatureCard(
                                icon = Icons.Default.Security,
                                title = "Secure Data",
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        // 3D Avatar with enhanced styling
                        Card(
                            modifier = Modifier
                                .size(280.dp)
                                .scale(scale * 0.95f),
                            shape = CircleShape,
                            colors = CardDefaults.cardColors(
                                containerColor = Color.White.copy(alpha = 0.1f)
                            ),
                            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                        ) {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Image(
                                    painter = painterResource(id = R.drawable.avatar3d),
                                    contentDescription = "3D Avatar",
                                    modifier = Modifier.size(240.dp)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Footer with version info
            Text(
                text = if (hasError) "Please restart the app if problems persist"
                else "Powered by Advanced AI • Version 1.0",
                color = Color.White.copy(alpha = 0.8f),
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = 32.dp)
            )
        }
    }
}

@Composable
fun FeatureCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.height(80.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White.copy(alpha = 0.2f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = Color.White,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = title,
                color = Color.White,
                fontSize = 10.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center
            )
        }
    }
}