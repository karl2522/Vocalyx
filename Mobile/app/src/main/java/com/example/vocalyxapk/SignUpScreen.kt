package com.example.vocalyxapk

import android.widget.Toast
import androidx.compose.foundation.Image
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.vocalyxapk.viewmodel.SignUpUIState
import com.example.vocalyxapk.viewmodel.SignUpViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.utils.NavigationUtils
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.animation.core.*

@Composable
fun SignUpScreen(
    viewModel: SignUpViewModel = viewModel()
) {
    val context = LocalContext.current
    val configuration = LocalConfiguration.current
    val density = LocalDensity.current
    val screenHeight = configuration.screenHeightDp.dp
    val screenWidth = configuration.screenWidthDp.dp
    
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }

    var firstNameError by remember { mutableStateOf<String?>(null) }
    var lastNameError by remember { mutableStateOf<String?>(null) }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var confirmPasswordError by remember { mutableStateOf<String?>(null) }

    var passwordVisible by remember { mutableStateOf(false) }
    var confirmPasswordVisible by remember { mutableStateOf(false) }
    val uiState by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

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

    // Modern Loading Overlay for Sign Up
    if (uiState is SignUpUIState.Loading) {
        ModernSignUpLoadingOverlay()
    }

    LaunchedEffect(uiState) {
        when (uiState) {
            is SignUpUIState.Success -> {
                Toast.makeText(
                    context,
                    "Account created successfully!",
                    Toast.LENGTH_LONG
                ).show()
                NavigationUtils.navigateToLogin(context)
            }
            is SignUpUIState.Error -> {
                Toast.makeText(
                    context,
                    (uiState as SignUpUIState.Error).message,
                    Toast.LENGTH_LONG
                ).show()
            }
            else -> {}
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
            // Logo Section - Same as login screen
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

            // Sign Up Form Card - Main focus
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
                        text = "Create Account",
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
                        text = "Join the Vocalyx community",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666),
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 24.dp)
                    )

                    // Name fields in a row
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // First Name
                        Column(modifier = Modifier.weight(1f)) {
                            OutlinedTextField(
                                value = firstName,
                                onValueChange = {
                                    firstName = it
                                    firstNameError = null
                                },
                                label = { Text("First Name") },
                                placeholder = { Text("First") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    unfocusedBorderColor = if (firstNameError != null) Color.Red.copy(alpha = 0.5f) else Color(0xFFE0E0E0),
                                    focusedBorderColor = if (firstNameError != null) Color.Red else Color(0xFF333D79),
                                    errorBorderColor = Color.Red,
                                    focusedContainerColor = Color(0xFFF8F9FF).copy(alpha = 0.5f)
                                ),
                                singleLine = true,
                                isError = firstNameError != null
                            )
                            if (firstNameError != null) {
                                Text(
                                    text = firstNameError!!,
                                    color = Color.Red,
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.padding(start = 4.dp, top = 4.dp)
                                )
                            }
                        }

                        // Last Name
                        Column(modifier = Modifier.weight(1f)) {
                            OutlinedTextField(
                                value = lastName,
                                onValueChange = {
                                    lastName = it
                                    lastNameError = null
                                },
                                label = { Text("Last Name") },
                                placeholder = { Text("Last") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    unfocusedBorderColor = if (lastNameError != null) Color.Red.copy(alpha = 0.5f) else Color(0xFFE0E0E0),
                                    focusedBorderColor = if (lastNameError != null) Color.Red else Color(0xFF333D79),
                                    errorBorderColor = Color.Red,
                                    focusedContainerColor = Color(0xFFF8F9FF).copy(alpha = 0.5f)
                                ),
                                singleLine = true,
                                isError = lastNameError != null
                            )
                            if (lastNameError != null) {
                                Text(
                                    text = lastNameError!!,
                                    color = Color.Red,
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.padding(start = 4.dp, top = 4.dp)
                                )
                            }
                        }
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
                            // Also clear confirm password error if it was a match error
                            if (confirmPasswordError == "Passwords don't match") {
                                confirmPasswordError = null
                            }
                        },
                        label = { Text("Password") },
                        placeholder = { Text("Create password") },
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
                            .padding(bottom = if (passwordError != null) 4.dp else 12.dp),
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
                                .padding(start = 4.dp, bottom = 12.dp)
                                .fillMaxWidth()
                        )
                    }

                    // Confirm Password field
                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = {
                            confirmPassword = it
                            confirmPasswordError = null
                        },
                        label = { Text("Confirm Password") },
                        placeholder = { Text("Confirm password") },
                        visualTransformation = if (confirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        trailingIcon = {
                            IconButton(onClick = { confirmPasswordVisible = !confirmPasswordVisible }) {
                                Icon(
                                    imageVector = if (confirmPasswordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                    contentDescription = if (confirmPasswordVisible) "Hide password" else "Show password",
                                    tint = Color(0xFF333D79)
                                )
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = if (confirmPasswordError != null) 4.dp else 24.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = if (confirmPasswordError != null) Color.Red.copy(alpha = 0.5f) else Color(0xFFE0E0E0),
                            focusedBorderColor = if (confirmPasswordError != null) Color.Red else Color(0xFF333D79),
                            errorBorderColor = Color.Red,
                            focusedContainerColor = Color(0xFFF8F9FF).copy(alpha = 0.5f)
                        ),
                        singleLine = true,
                        isError = confirmPasswordError != null
                    )
                    if (confirmPasswordError != null) {
                        Text(
                            text = confirmPasswordError!!,
                            color = Color.Red,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier
                                .padding(start = 4.dp, bottom = 24.dp)
                                .fillMaxWidth()
                        )
                    }

                    // Create Account Button
                    Button(
                        onClick = {
                            var hasError = false

                            if (firstName.isEmpty()) {
                                firstNameError = "First name is required"
                                hasError = true
                            }

                            if (lastName.isEmpty()) {
                                lastNameError = "Last name is required"
                                hasError = true
                            }

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
                            } else if (password.length < 6) {
                                passwordError = "Password must be at least 6 characters"
                                hasError = true
                            }

                            if (confirmPassword.isEmpty()) {
                                confirmPasswordError = "Please confirm your password"
                                hasError = true
                            } else if (password != confirmPassword) {
                                confirmPasswordError = "Passwords don't match"
                                hasError = true
                            }

                            if (!hasError) {
                                viewModel.register(
                                    email = email,
                                    password = password,
                                    confirmPassword = confirmPassword,
                                    firstName = firstName,
                                    lastName = lastName
                                )
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
                            text = "Create Account",
                            style = MaterialTheme.typography.bodyLarge.copy(
                                fontWeight = FontWeight.SemiBold
                            )
                        )
                    }
                }
            }

            // Sign in section - Minimal
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Already have an account? ",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF4A4A4A)
                )
                Text(
                    "Sign In",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.Bold
                    ),
                    color = Color(0xFF333D79),
                    modifier = Modifier.clickable {
                        NavigationUtils.navigateToLogin(context)
                    }
                )
            }
        }
    }
}

@Composable
fun ModernSignUpLoadingOverlay() {
    // Simple rotation animation
    val infiniteTransition = rememberInfiniteTransition(label = "signup_loading_animation")
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
                // Simple circular progress indicator with green color for signup
                CircularProgressIndicator(
                    modifier = Modifier
                        .size(40.dp)
                        .graphicsLayer { rotationZ = rotation },
                    color = Color(0xFF4CAF50),
                    strokeWidth = 3.dp
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = "Creating your account...",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.Medium
                    ),
                    color = Color(0xFF333D79)
                )
            }
        }
    }
}