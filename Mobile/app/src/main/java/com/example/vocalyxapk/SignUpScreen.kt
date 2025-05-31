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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
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

@Composable
fun SignUpScreen(
    viewModel: SignUpViewModel = viewModel()
) {
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
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val themeColor = Color(0xFF333D79)
    val scrollState = rememberScrollState()

    if (uiState is SignUpUIState.Loading) {
        AlertDialog(
            onDismissRequest = { },
            title = { Text("Creating Account") },
            text = { CircularProgressIndicator() },
            confirmButton = { }
        )
    }

    LaunchedEffect(uiState) {
        when (uiState) {
            is SignUpUIState.Success -> {
                Toast.makeText(
                    context,
                    (uiState as SignUpUIState.Success).message,
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
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(48.dp))

            // Header Section with Logo and Branding
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color.White
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Logo with background circle
                    Box(
                        modifier = Modifier
                            .size(80.dp)
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
                            modifier = Modifier.size(50.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Welcome Text
                    Text(
                        text = "Join Vocalyx!",
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 28.sp
                        ),
                        color = Color(0xFF1A1A1A)
                    )

                    Row(
                        horizontalArrangement = Arrangement.Center,
                        modifier = Modifier.padding(top = 4.dp)
                    ) {
                        Text(
                            text = "Create your ",
                            style = MaterialTheme.typography.bodyLarge,
                            color = Color.Gray
                        )
                        Text(
                            text = "Vocalyx",
                            style = MaterialTheme.typography.bodyLarge.copy(
                                fontWeight = FontWeight.Bold
                            ),
                            color = Color(0xFF333D79)
                        )
                        Text(
                            text = " account",
                            style = MaterialTheme.typography.bodyLarge,
                            color = Color.Gray
                        )
                    }

                    Text(
                        text = "Start your personalized voice journey today",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.Gray,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
            }

            // Benefits Info Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFF8F9FF)
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp)
                ) {
                    Text(
                        text = "What you'll get:",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold
                        ),
                        color = Color(0xFF333D79),
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    Row(
                        modifier = Modifier.padding(bottom = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.PersonAdd,
                            contentDescription = null,
                            tint = Color(0xFF333D79),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Personalized voice profile",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF4A4A4A)
                        )
                    }

                    Row(
                        modifier = Modifier.padding(bottom = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Shield,
                            contentDescription = null,
                            tint = Color(0xFF333D79),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Secure data encryption",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF4A4A4A)
                        )

                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.VerifiedUser,
                                contentDescription = null,
                                tint = Color(0xFF333D79),
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = "Premium features access",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFF4A4A4A)
                            )
                        }
                    }
                }

                // Sign Up Form Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
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
                        Text(
                            text = "Account Information",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.SemiBold
                            ),
                            color = Color(0xFF1A1A1A),
                            modifier = Modifier.padding(bottom = 20.dp)
                        )

                        // Name fields in a row
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // First Name
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "First Name",
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        fontWeight = FontWeight.Medium
                                    ),
                                    color = Color(0xFF1A1A1A),
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )

                                OutlinedTextField(
                                    value = firstName,
                                    onValueChange = {
                                        firstName = it
                                        firstNameError = null
                                    },
                                    placeholder = { Text("First name", color = Color.Gray.copy(alpha = 0.7f)) },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        unfocusedBorderColor = if (firstNameError != null) Color.Red.copy(alpha = 0.5f) else Color(0xFFE0E0E0),
                                        focusedBorderColor = if (firstNameError != null) Color.Red else themeColor,
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
                                Text(
                                    text = "Last Name",
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        fontWeight = FontWeight.Medium
                                    ),
                                    color = Color(0xFF1A1A1A),
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )

                                OutlinedTextField(
                                    value = lastName,
                                    onValueChange = {
                                        lastName = it
                                        lastNameError = null
                                    },
                                    placeholder = { Text("Last name", color = Color.Gray.copy(alpha = 0.7f)) },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        unfocusedBorderColor = if (lastNameError != null) Color.Red.copy(alpha = 0.5f) else Color(0xFFE0E0E0),
                                        focusedBorderColor = if (lastNameError != null) Color.Red else themeColor,
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
                        Text(
                            text = "Email Address",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = FontWeight.Medium
                            ),
                            color = Color(0xFF1A1A1A),
                            modifier = Modifier.padding(bottom = 8.dp)
                        )

                        OutlinedTextField(
                            value = email,
                            onValueChange = {
                                email = it
                                emailError = null
                            },
                            placeholder = { Text("Enter your email", color = Color.Gray.copy(alpha = 0.7f)) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = if (emailError != null) 4.dp else 16.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                unfocusedBorderColor = if (emailError != null) Color.Red.copy(alpha = 0.5f) else Color(0xFFE0E0E0),
                                focusedBorderColor = if (emailError != null) Color.Red else themeColor,
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
                                    .padding(start = 4.dp, bottom = 16.dp)
                                    .fillMaxWidth()
                            )
                        }

                        // Password field
                        Text(
                            text = "Password",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = FontWeight.Medium
                            ),
                            color = Color(0xFF1A1A1A),
                            modifier = Modifier.padding(bottom = 8.dp)
                        )

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
                            placeholder = { Text("Create a password", color = Color.Gray.copy(alpha = 0.7f)) },
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
                                .padding(bottom = if (passwordError != null) 4.dp else 16.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                unfocusedBorderColor = if (passwordError != null) Color.Red.copy(alpha = 0.5f) else Color(0xFFE0E0E0),
                                focusedBorderColor = if (passwordError != null) Color.Red else themeColor,
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
                                    .padding(start = 4.dp, bottom = 16.dp)
                                    .fillMaxWidth()
                            )
                        }

                        // Confirm Password field
                        Text(
                            text = "Confirm Password",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = FontWeight.Medium
                            ),
                            color = Color(0xFF1A1A1A),
                            modifier = Modifier.padding(bottom = 8.dp)
                        )

                        OutlinedTextField(
                            value = confirmPassword,
                            onValueChange = {
                                confirmPassword = it
                                confirmPasswordError = null
                            },
                            placeholder = { Text("Confirm your password", color = Color.Gray.copy(alpha = 0.7f)) },
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
                                focusedBorderColor = if (confirmPasswordError != null) Color.Red else themeColor,
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

                        // Sign Up Button
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
                                .height(52.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = themeColor
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

                // Sign in section
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFF8F9FF)
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Already have an account? ",
                            style = MaterialTheme.typography.bodyLarge,
                            color = Color(0xFF4A4A4A)
                        )
                        Text(
                            "Sign In",
                            style = MaterialTheme.typography.bodyLarge.copy(
                                fontWeight = FontWeight.Bold
                            ),
                            color = themeColor,
                            modifier = Modifier.clickable {
                                NavigationUtils.navigateToLogin(context)
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}