package com.example.vocalyxapk

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.*
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
                    color = MaterialTheme.colorScheme.background
                ) {
                    SplashScreen()
                }
            }
        }
    }
}

@Composable
fun SplashScreen() {
    val context = LocalContext.current
    val authState by AuthStateManager.authState.collectAsState()

    // Check if this is the first time opening the app
    val isFirstTime = remember {
        val prefs = context.getSharedPreferences("VocalyxAppState", android.content.Context.MODE_PRIVATE)
        val firstTime = !prefs.getBoolean("has_opened_before", false)
        if (firstTime) {
            // Mark that the app has been opened
            prefs.edit().putBoolean("has_opened_before", true).apply()
        }
        firstTime
    }

    // Animation states
    val infiniteTransition = rememberInfiniteTransition(label = "splash_animation")
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale_animation"
    )

    val progress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "progress_animation"
    )

    LaunchedEffect(key1 = true) {
        // First explicitly check auth state
        AuthStateManager.checkAuthState(context)

        // If it's first time, show splash for longer (3 seconds)
        // If not first time, show for shorter time (1 second)
        val splashDuration = if (isFirstTime) 3000L else 1000L
        delay(splashDuration)

        // After delay, recheck auth state to ensure we have the latest state
        AuthStateManager.checkAuthState(context)

        // Small additional delay to ensure state is collected
        delay(300)

        // Now navigate based on the collected auth state
        when (authState) {
            is AuthState.Authenticated -> NavigationUtils.navigateToHome(context)
            else -> NavigationUtils.navigateToLogin(context)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF333D79),
                        Color(0xFF4361EE),
                        Color(0xFF7209B7)
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        // Background decoration circles
        Box(
            modifier = Modifier
                .size(300.dp)
                .scale(scale * 0.8f)
                .clip(CircleShape)
                .background(
                    Color.White.copy(alpha = 0.1f)
                )
        )

        Box(
            modifier = Modifier
                .size(200.dp)
                .scale(scale)
                .clip(CircleShape)
                .background(
                    Color.White.copy(alpha = 0.15f)
                )
        )

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
                    // Logo with pulsing animation
                    Box(
                        modifier = Modifier
                            .size(120.dp)
                            .scale(scale)
                            .clip(CircleShape)
                            .background(
                                brush = Brush.radialGradient(
                                    colors = listOf(
                                        Color(0xFF333D79).copy(alpha = 0.1f),
                                        Color(0xFF333D79).copy(alpha = 0.05f)
                                    )
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.vocalyxlogo),
                            contentDescription = "Vocalyx Logo",
                            modifier = Modifier.size(80.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Text(
                        text = "VOCALYX",
                        color = Color(0xFF333D79),
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.sp,
                        textAlign = TextAlign.Center
                    )

                    Text(
                        text = if (isFirstTime) "Welcome to the Future of Voice Technology"
                        else "Welcome Back",
                        color = Color(0xFF666666),
                        fontSize = if (isFirstTime) 16.sp else 18.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
                    )

                    if (isFirstTime) {
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

                    // Enhanced progress indicator
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(Color(0xFFE0E0E0))
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .fillMaxWidth(progress)
                                    .clip(RoundedCornerShape(3.dp))
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

                        Text(
                            text = if (isFirstTime) "Setting up your experience..."
                            else "Loading...",
                            color = Color(0xFF666666),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // 3D Avatar with enhanced styling (only show on first time)
            if (isFirstTime) {
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

            Spacer(modifier = Modifier.weight(1f))

            // Footer with version info
            Text(
                text = "Powered by Advanced AI • Version 1.0",
                color = Color.White.copy(alpha = 0.8f),
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = 32.dp)
            )
        }
    }
}