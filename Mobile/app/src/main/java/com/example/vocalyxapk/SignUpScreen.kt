package com.example.vocalyxapk

import android.content.Intent
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.Color
import com.example.vocalyxapk.viewmodel.SignUpUIState
import com.example.vocalyxapk.viewmodel.SignUpViewModel
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun SignUpScreen(
    viewModel: SignUpViewModel = viewModel()
) {
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var isError by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()

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
                context.startActivity(Intent(context, LoginActivity::class.java))
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
                .size(64.dp) // Even smaller logo to match design
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
                color = Color(0xFF0C43EF)
            )
        }

        // Input Fields with updated styling
        OutlinedTextField(
            value = firstName,
            onValueChange = { firstName = it },
            label = { Text("First Name", color = Color.Gray) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Color.Gray.copy(alpha = 0.3f),
                focusedBorderColor = Color(0xFF0C43EF)
            ),
            singleLine = true
        )

        OutlinedTextField(
            value = lastName,
            onValueChange = { lastName = it },
            label = { Text("Last Name", color = Color.Gray) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Color.Gray.copy(alpha = 0.3f),
                focusedBorderColor = Color(0xFF0C43EF)
            ),
            singleLine = true
        )

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email", color = Color.Gray) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Color.Gray.copy(alpha = 0.3f),
                focusedBorderColor = Color(0xFF0C43EF)
            ),
            singleLine = true
        )

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password", color = Color.Gray) },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Color.Gray.copy(alpha = 0.3f),
                focusedBorderColor = Color(0xFF0C43EF)
            ),
            singleLine = true
        )

        OutlinedTextField(
            value = confirmPassword,
            onValueChange = { confirmPassword = it },
            label = { Text("Confirm Password", color = Color.Gray) },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp),
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Color.Gray.copy(alpha = 0.3f),
                focusedBorderColor = Color(0xFF0C43EF)
            ),
            singleLine = true
        )

        // Sign Up Button
        Button(
            onClick = {
                if (firstName.isEmpty() || lastName.isEmpty() || email.isEmpty() ||
                    password.isEmpty() || confirmPassword.isEmpty()) {
                    isError = true
                } else if (password != confirmPassword) {
                    Toast.makeText(context, "Passwords don't match", Toast.LENGTH_LONG).show()
                } else {
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
                containerColor = Color(0xFF0C43EF)
            )
        ) {
            Text("Signup")
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
                color = Color(0xFF0C43EF),
                modifier = Modifier
                    .padding(start = 4.dp)
                    .clickable { 
                        context.startActivity(Intent(context, LoginActivity::class.java))
                    }
            )
        }
    }
} 