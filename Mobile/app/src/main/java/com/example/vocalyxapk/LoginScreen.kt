package com.example.vocalyxapk

import android.app.Activity
import android.app.Application
import android.content.Context
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.vocalyxapk.viewmodel.LoginUIState
import com.example.vocalyxapk.viewmodel.LoginViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.utils.NavigationUtils
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.Fingerprint
import androidx.fragment.app.FragmentActivity
import com.example.vocalyxapk.utils.BiometricAuthManager
import com.example.vocalyxapk.utils.BiometricAuthResult
import com.example.vocalyxapk.utils.BiometricAuthStatus
import com.example.vocalyxapk.viewmodel.ViewModelFactory
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.auth.api.signin.GoogleSignInStatusCodes
import com.google.android.gms.common.api.ApiException
import androidx.compose.animation.core.*
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.graphicsLayer

@Composable
fun LoginScreen() {
    val context = LocalContext.current
    val configuration = LocalConfiguration.current
    val density = LocalDensity.current
    val screenHeight = configuration.screenHeightDp.dp
    val screenWidth = configuration.screenWidthDp.dp
    
    val application = context.applicationContext as Application
    val viewModel: LoginViewModel = viewModel(
        factory = ViewModelFactory(application)
    )
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var isError by remember { mutableStateOf(false) }
    var passwordVisible by remember { mutableStateOf(false) }
    val activity = context as FragmentActivity
    val scrollState = rememberScrollState()
    val coroutineScope = rememberCoroutineScope()

    val uiState by viewModel.uiState.collectAsState()

    var showBiometricPrompt by remember { mutableStateOf(false) }
    val biometricStatus = BiometricAuthManager.isBiometricAvailable(context)
    val isBiometricEnabled = BiometricAuthManager.isBiometricEnabled(context)

    // Responsive values
    val horizontalPadding = when {
        screenWidth < 360.dp -> 16.dp
        screenWidth < 400.dp -> 20.dp
        else -> 24.dp
    }
    
    val logoSize = when {
        screenWidth < 360.dp -> 70.dp
        screenWidth < 400.dp -> 80.dp
        else -> 90.dp
    }

    LaunchedEffect(Unit) {
        android.util.Log.d("BiometricDebug", "=== LOGIN SCREEN DEBUG ===")
        android.util.Log.d("BiometricDebug", "Biometric status: $biometricStatus")
        android.util.Log.d("BiometricDebug", "Biometric enabled: $isBiometricEnabled")
        android.util.Log.d("BiometricDebug", "Should show button: ${biometricStatus == BiometricAuthStatus.AVAILABLE && isBiometricEnabled}")
    }

    val gso = remember {
        GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken("541901084386-1d9jgpf864fdi77iar1ili0ohogpv9kg.apps.googleusercontent.com")
            .requestEmail()
            .requestProfile()
            .build()
    }
    val googleSignInClient = remember { GoogleSignIn.getClient(context, gso) }

    val googleSignInLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val resultCode = result.resultCode
        Toast.makeText(context, "Sign in result code: $resultCode", Toast.LENGTH_SHORT).show()

        if (result.resultCode == Activity.RESULT_OK) {
            try {
                val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
                Toast.makeText(context, "Processing sign-in data", Toast.LENGTH_SHORT).show()

                val account = task.getResult(ApiException::class.java)
                account?.idToken?.let { idToken ->
                    Toast.makeText(context, "Got ID token: ${idToken.take(10)}...", Toast.LENGTH_SHORT).show()
                    viewModel.firebaseAuthWithGoogle(idToken)
                } ?: run {
                    Toast.makeText(context, "Google Sign-In failed: null idToken", Toast.LENGTH_SHORT).show()
                }
            } catch (e: ApiException) {
                val statusCode = e.statusCode
                Toast.makeText(context, "Google Sign-In error: code $statusCode - ${e.message}", Toast.LENGTH_LONG).show()
            }
        } else if (result.resultCode == Activity.RESULT_CANCELED) {
            Toast.makeText(context, "Google Sign-In cancelled", Toast.LENGTH_SHORT).show()
        }
    }

    LaunchedEffect(showBiometricPrompt) {
        if (showBiometricPrompt) {
            try {
                val result = BiometricAuthManager.authenticateWithBiometric(
                    activity = activity,
                    title = "Sign in to Vocalyx",
                    subtitle = "Use your fingerprint to access your account"
                )

                when (result) {
                    is BiometricAuthResult.Success -> {
                        // Login with stored tokens
                        viewModel.loginWithStoredTokens(
                            result.tokens.accessToken,
                            result.tokens.refreshToken,
                            result.tokens.userEmail
                        )
                    }
                    is BiometricAuthResult.Error -> {
                        Toast.makeText(context, "Biometric authentication failed: ${result.message}", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Biometric authentication error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                showBiometricPrompt = false
            }
        }
    }

    LaunchedEffect(uiState) {
        when (val currentState = uiState) {
            is LoginUIState.Success -> {
                // Add debug logging
                android.util.Log.d("LoginScreen", "Login successful, navigating to home")
                NavigationUtils.navigateToHome(context)
            }
            is LoginUIState.Error -> {
                android.util.Log.d("LoginScreen", "Login error: ${currentState.message}")
                Toast.makeText(
                    context,
                    currentState.message,
                    Toast.LENGTH_LONG
                ).show()
            }
            is LoginUIState.Loading -> {
                android.util.Log.d("LoginScreen", "Login loading state")
            }
            else -> {
                android.util.Log.d("LoginScreen", "Login idle state")
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFF8F9FF),
                        Color.White
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = horizontalPadding),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Logo Section - Enhanced with animations and effects (No background circle)
            val infiniteTransition = rememberInfiniteTransition(label = "logo_animation")
            val logoScale by infiniteTransition.animateFloat(
                initialValue = 1f,
                targetValue = 1.05f,
                animationSpec = infiniteRepeatable(
                    animation = tween(3000, easing = FastOutSlowInEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "logo_scale"
            )
            
            val logoRotation by infiniteTransition.animateFloat(
                initialValue = -2f,
                targetValue = 2f,
                animationSpec = infiniteRepeatable(
                    animation = tween(4000, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "logo_rotation"
            )

            Box(
                modifier = Modifier
                    .size(logoSize + 20.dp)
                    .padding(bottom = 40.dp),
                contentAlignment = Alignment.Center
            ) {
                // Glow effect layers (keeping subtle glow but no background circle)
                Box(
                    modifier = Modifier
                        .size(logoSize + 15.dp)
                        .graphicsLayer {
                            scaleX = logoScale
                            scaleY = logoScale
                            alpha = 0.2f
                        }
                        .clip(CircleShape)
                        .background(
                            brush = Brush.radialGradient(
                                colors = listOf(
                                    Color(0xFF333D79).copy(alpha = 0.3f),
                                    Color.Transparent
                                ),
                                radius = with(density) { logoSize.toPx() / 2 }
                            )
                        )
                )

                // Main logo with enhanced effects (no background)
                Image(
                    painter = painterResource(id = R.drawable.vocalyxlogo),
                    contentDescription = "Vocalyx Logo",
                    modifier = Modifier
                        .size(logoSize)
                        .graphicsLayer {
                            scaleX = logoScale
                            scaleY = logoScale
                            rotationZ = logoRotation
                        }
                        .shadow(
                            elevation = 12.dp,
                            shape = CircleShape,
                            ambientColor = Color(0xFF333D79),
                            spotColor = Color(0xFF4361EE)
                        )
                )
            }

            // Login Form Card - Main focus
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color.White
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp)
                ) {
                    // Welcome text
                    Text(
                        text = "Welcome to Vocalyx",
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 22.sp
                        ),
                        color = Color(0xFF1A1A1A),
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp)
                    )

                    Text(
                        text = "Sign in to access your account",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666),
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 24.dp)
                    )

                    // Biometric button if available
                    if (biometricStatus == BiometricAuthStatus.AVAILABLE && isBiometricEnabled) {
                        Button(
                            onClick = { showBiometricPrompt = true },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .padding(bottom = 16.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF4CAF50)
                            )
                        ) {
                            Icon(
                                Icons.Default.Fingerprint,
                                contentDescription = "Fingerprint",
                                modifier = Modifier.size(20.dp),
                                tint = Color.White
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Sign in with Fingerprint",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontWeight = FontWeight.SemiBold
                                ),
                                color = Color.White
                            )
                        }

                        // Divider after biometric button
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Divider(
                                modifier = Modifier.weight(1f),
                                color = Color(0xFFE0E0E0)
                            )
                            Text(
                                text = "  or  ",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color.Gray
                            )
                            Divider(
                                modifier = Modifier.weight(1f),
                                color = Color(0xFFE0E0E0)
                            )
                        }
                    }

                    // "Continue with:" text
                    Text(
                        text = "Continue with:",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.SemiBold
                        ),
                        color = Color(0xFF1A1A1A),
                        modifier = Modifier.padding(bottom = 16.dp)
                    )

                    // Social Login Buttons - Fixed text wrapping
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 20.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = {
                                try {
                                    googleSignInClient.signOut().addOnCompleteListener {
                                        val signInIntent = googleSignInClient.signInIntent
                                        Toast.makeText(context, "Launching Google Sign-In", Toast.LENGTH_SHORT).show()
                                        googleSignInLauncher.launch(signInIntent)
                                    }
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Error launching sign-in: ${e.message}", Toast.LENGTH_LONG).show()
                                }
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = Color(0xFF1A1A1A)
                            ),
                            border = BorderStroke(
                                width = 1.5.dp,
                                color = Color(0xFFE0E0E0)
                            ),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 12.dp)
                        ) {
                            Image(
                                painter = painterResource(id = R.drawable.google_logo),
                                contentDescription = "Google",
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Google",
                                fontWeight = FontWeight.Medium,
                                fontSize = 13.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }

                        OutlinedButton(
                            onClick = {
                                viewModel.startMicrosoftSignIn(activity)
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = Color(0xFF1A1A1A)
                            ),
                            border = BorderStroke(
                                width = 1.5.dp,
                                color = Color(0xFFE0E0E0)
                            ),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 12.dp)
                        ) {
                            Image(
                                painter = painterResource(id = R.drawable.microsoft_logo),
                                contentDescription = "Microsoft",
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Microsoft",
                                fontWeight = FontWeight.Medium,
                                fontSize = 13.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    // Divider
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Divider(
                            modifier = Modifier.weight(1f),
                            color = Color(0xFFE0E0E0)
                        )
                        Text(
                            text = "  or use email  ",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.Gray
                        )
                        Divider(
                            modifier = Modifier.weight(1f),
                            color = Color(0xFFE0E0E0)
                        )
                    }

                    // Email field
                    OutlinedTextField(
                        value = email,
                        onValueChange = {
                            email = it
                            emailError = null
                        },
                        label = { Text("Email Address") },
                        placeholder = { Text("Enter your email") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = if (emailError != null) 4.dp else 12.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = if (emailError != null) Color.Red.copy(alpha = 0.5f) else Color(0xFFE0E0E0),
                            focusedBorderColor = if (emailError != null) Color.Red else Color(0xFF333D79),
                            errorBorderColor = Color.Red,
                            focusedContainerColor = Color(0xFFF8F9FF).copy(alpha = 0.5f)
                        ),
                        singleLine = true,
                        isError = emailError != null
                    )
                    if (emailError != null) {
                        Text(
                            text = emailError!!,
                            color = Color.Red,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier
                                .padding(start = 4.dp, bottom = 12.dp)
                                .fillMaxWidth()
                        )
                    }

                    // Password field
                    OutlinedTextField(
                        value = password,
                        onValueChange = {
                            password = it
                            passwordError = null
                        },
                        label = { Text("Password") },
                        placeholder = { Text("Enter your password") },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                    contentDescription = if (passwordVisible) "Hide password" else "Show password",
                                    tint = Color(0xFF333D79)
                                )
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = if (passwordError != null) 4.dp else 24.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = if (passwordError != null) Color.Red.copy(alpha = 0.5f) else Color(0xFFE0E0E0),
                            focusedBorderColor = if (passwordError != null) Color.Red else Color(0xFF333D79),
                            errorBorderColor = Color.Red,
                            focusedContainerColor = Color(0xFFF8F9FF).copy(alpha = 0.5f)
                        ),
                        singleLine = true,
                        isError = passwordError != null
                    )
                    if (passwordError != null) {
                        Text(
                            text = passwordError!!,
                            color = Color.Red,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier
                                .padding(start = 4.dp, bottom = 24.dp)
                                .fillMaxWidth()
                        )
                    }

                    // Login Button
                    Button(
                        onClick = {
                            var hasError = false

                            if (email.isEmpty()) {
                                emailError = "Email is required"
                                hasError = true
                            } else if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                                emailError = "Please enter a valid email address"
                                hasError = true
                            }

                            if (password.isEmpty()) {
                                passwordError = "Password is required"
                                hasError = true
                            }

                            if (!hasError) {
                                viewModel.login(email, password)
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF333D79)
                        )
                    ) {
                        Text(
                            text = "Sign In",
                            style = MaterialTheme.typography.bodyLarge.copy(
                                fontWeight = FontWeight.SemiBold
                            )
                        )
                    }
                }
            }

            // Sign up section - Minimal
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "New to Vocalyx? ",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF4A4A4A)
                )
                Text(
                    "Create Account",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.Bold
                    ),
                    color = Color(0xFF333D79),
                    modifier = Modifier.clickable {
                        NavigationUtils.navigateToSignUp(context)
                    }
                )
            }
        }

        // Modern Loading Overlay - Inside the main Box for proper layering
        if (uiState is LoginUIState.Loading) {
            android.util.Log.d("LoginScreen", "Showing loading overlay")
            ModernLoadingOverlay()
        }
    }
}

@Composable
fun ModernLoadingOverlay() {
    // Simple rotation animation
    val infiniteTransition = rememberInfiniteTransition(label = "loading_animation")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )

    // Simple overlay
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.5f))
            .clickable(enabled = false) { }, // Prevent interaction
        contentAlignment = Alignment.Center
    ) {
        // Simple loading card
        Card(
            modifier = Modifier
                .wrapContentSize()
                .padding(32.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier.padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Simple circular progress indicator
                CircularProgressIndicator(
                    modifier = Modifier
                        .size(40.dp)
                        .graphicsLayer { rotationZ = rotation },
                    color = Color(0xFF333D79),
                    strokeWidth = 3.dp
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = "Signing you in...",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.Medium
                    ),
                    color = Color(0xFF333D79)
                )
            }
        }
    }
}