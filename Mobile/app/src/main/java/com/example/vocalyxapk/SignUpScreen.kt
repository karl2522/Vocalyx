package com.example.vocalyxapk

import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.Color
import com.example.vocalyxapk.viewmodel.SignUpUIState
import com.example.vocalyxapk.viewmodel.SignUpViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.utils.NavigationUtils
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff

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

    if (uiState is SignUpUIState.Loading) {
        AlertDialog(
            onDismissRequest = { },
            title = { Text("Loading") },
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Top
    ) {
        Spacer(modifier = Modifier.height(64.dp))
        
        // Logo - adjusted size
        Image(
            painter = painterResource(id = R.drawable.vocalyxlogo),
            contentDescription = "Logo",
            modifier = Modifier
                .size(64.dp)
                .padding(bottom = 16.dp)
        )

        // Welcome Text - single line with different color for "Vocalyx!"
        Row(
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.padding(bottom = 24.dp)
        ) {
            Text(
                text = "Welcome to ",
                style = MaterialTheme.typography.titleLarge
            )
            Text(
                text = "Vocalyx!",
                style = MaterialTheme.typography.titleLarge,
                color = themeColor
            )
        }

        // Input Fields with error handling
        OutlinedTextField(
            value = firstName,
            onValueChange = { 
                firstName = it
                firstNameError = null
            },
            label = { Text("First Name", color = Color.Gray) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = if (firstNameError != null) 4.dp else 16.dp),
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = if (firstNameError != null) Color.Red.copy(alpha = 0.5f) else Color.Gray.copy(alpha = 0.3f),
                focusedBorderColor = if (firstNameError != null) Color.Red else themeColor,
                errorBorderColor = Color.Red
            ),
            singleLine = true,
            isError = firstNameError != null
        )
        if (firstNameError != null) {
            Text(
                text = firstNameError!!,
                color = Color.Red,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier
                    .padding(start = 4.dp, bottom = 16.dp)
                    .align(Alignment.Start)
            )
        }

        OutlinedTextField(
            value = lastName,
            onValueChange = { 
                lastName = it
                lastNameError = null
            },
            label = { Text("Last Name", color = Color.Gray) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = if (lastNameError != null) 4.dp else 16.dp),
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = if (lastNameError != null) Color.Red.copy(alpha = 0.5f) else Color.Gray.copy(alpha = 0.3f),
                focusedBorderColor = if (lastNameError != null) Color.Red else themeColor,
                errorBorderColor = Color.Red
            ),
            singleLine = true,
            isError = lastNameError != null
        )
        if (lastNameError != null) {
            Text(
                text = lastNameError!!,
                color = Color.Red,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier
                    .padding(start = 4.dp, bottom = 16.dp)
                    .align(Alignment.Start)
            )
        }

        OutlinedTextField(
            value = email,
            onValueChange = { 
                email = it
                emailError = null
            },
            label = { Text("Email", color = Color.Gray) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = if (emailError != null) 4.dp else 16.dp),
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = if (emailError != null) Color.Red.copy(alpha = 0.5f) else Color.Gray.copy(alpha = 0.3f),
                focusedBorderColor = if (emailError != null) Color.Red else themeColor,
                errorBorderColor = Color.Red
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
                    .align(Alignment.Start)
            )
        }

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
            label = { Text("Password", color = Color.Gray) },
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            trailingIcon = {
                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                    Icon(
                        imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                        contentDescription = if (passwordVisible) "Hide password" else "Show password",
                        tint = Color.Gray
                    )
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = if (passwordError != null) 4.dp else 16.dp),
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = if (passwordError != null) Color.Red.copy(alpha = 0.5f) else Color.Gray.copy(alpha = 0.3f),
                focusedBorderColor = if (passwordError != null) Color.Red else themeColor,
                errorBorderColor = Color.Red
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
                    .align(Alignment.Start)
            )
        }

        OutlinedTextField(
            value = confirmPassword,
            onValueChange = { 
                confirmPassword = it
                confirmPasswordError = null
            },
            label = { Text("Confirm Password", color = Color.Gray) },
            visualTransformation = if (confirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            trailingIcon = {
                IconButton(onClick = { confirmPasswordVisible = !confirmPasswordVisible }) {
                    Icon(
                        imageVector = if (confirmPasswordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                        contentDescription = if (confirmPasswordVisible) "Hide password" else "Show password",
                        tint = Color.Gray
                    )
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = if (confirmPasswordError != null) 4.dp else 24.dp),
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = if (confirmPasswordError != null) Color.Red.copy(alpha = 0.5f) else Color.Gray.copy(alpha = 0.3f),
                focusedBorderColor = if (confirmPasswordError != null) Color.Red else themeColor,
                errorBorderColor = Color.Red
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
                    .align(Alignment.Start)
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
                .height(48.dp),
            shape = RoundedCornerShape(8.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = themeColor
            )
        ) {
            Text("Sign Up")
        }

        // Sign in link
        Row(
            modifier = Modifier.padding(top = 16.dp),
            horizontalArrangement = Arrangement.Center
        ) {
            Text(
                "Already have an account? ",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.Gray
            )
            Text(
                "Sign In",
                style = MaterialTheme.typography.bodyMedium,
                color = themeColor,
                modifier = Modifier
                    .padding(start = 4.dp)
                    .clickable { 
                        NavigationUtils.navigateToLogin(context)
                    }
            )
        }
    }
} 