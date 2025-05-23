package com.example.vocalyxapk

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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

    LaunchedEffect(key1 = true) {
        // First explicitly check auth state
        AuthStateManager.checkAuthState(context)
        
        // Always show splash screen for at least 2 seconds
        delay(2000)
        
        // After delay, recheck auth state to ensure we have the latest state
        AuthStateManager.checkAuthState(context) 
        
        // Small additional delay to ensure state is collected
        delay(500)
        
        // Now navigate based on the collected auth state
        when (authState) {
            is AuthState.Authenticated -> NavigationUtils.navigateToHome(context)
            else -> NavigationUtils.navigateToLogin(context)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF2F5FF)), // Light blue background
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            Spacer(modifier = Modifier.weight(1f))
            
            Text(
                text = "Welcome to Vocalyx",
                color = Color(0xFF333D79),
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            Text(
                text = "One voice away to better way of grading",
                color = Color(0xFF333D79).copy(alpha = 0.7f),
                fontSize = 16.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = 36.dp)
            )
            
            // 3D Avatar with transparent background to match the light blue background
            Image(
                painter = painterResource(id = R.drawable.avatar3d),
                contentDescription = "3D Avatar",
                modifier = Modifier
                    .size(width = 260.dp, height = 260.dp)
                    .padding(16.dp)
            )
            
            Spacer(modifier = Modifier.weight(1f))
            
            LinearProgressIndicator(
                modifier = Modifier
                    .padding(horizontal = 48.dp, vertical = 24.dp)
                    .fillMaxWidth()
                    .height(4.dp),
                color = Color(0xFF4361EE),
                trackColor = Color(0xFF4361EE).copy(alpha = 0.2f)
            )
            
            Text(
                text = "Loading resources...",
                color = Color(0xFF333D79).copy(alpha = 0.6f),
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = 48.dp)
            )
        }
    }
}