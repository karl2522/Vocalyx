package com.example.vocalyxapk

import android.content.Intent
import androidx.compose.foundation.Image
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.text.style.TextAlign
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme
import androidx.compose.ui.graphics.Color

@Composable
fun LoginScreen() {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isError by remember { mutableStateOf(false) }
    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Top
    ) {
        Spacer(modifier = Modifier.height(64.dp))
        
        // Logo
        Image(
            painter = painterResource(id = R.drawable.vocalyxlogo),
            contentDescription = "Logo",
            modifier = Modifier
                .size(64.dp)
                .padding(bottom = 16.dp)
        )

        // Welcome Text
        Row(
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.padding(bottom = 16.dp)
        ) {
            Text(
                text = "Log In to ",
                style = MaterialTheme.typography.titleLarge
            )
            Text(
                text = "Vocalyx",
                style = MaterialTheme.typography.titleLarge,
                color = Color(0xFF0C43EF)
            )
        }

        Text(
            text = "Login with:",
            style = MaterialTheme.typography.bodyMedium,
            color = Color.Gray,
            modifier = Modifier
                .align(Alignment.Start)
                .padding(bottom = 8.dp)
        )

        // Social Login Buttons Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = { /* Google login */ },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = Color.Black
                ),
                border = BorderStroke(
                    width = 1.dp,
                    color = Color.Gray.copy(alpha = 0.3f)
                )
            ) {
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.google_logo),
                        contentDescription = "Google",
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Google")
                }
            }

            OutlinedButton(
                onClick = { /* Microsoft login */ },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = Color.Black
                ),
                border = BorderStroke(
                    width = 1.dp,
                    color = Color.Gray.copy(alpha = 0.3f)
                )
            ) {
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.microsoft_logo),
                        contentDescription = "Microsoft",
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Microsoft")
                }
            }
        }

        Text(
            text = "or continue with email",
            style = MaterialTheme.typography.bodyMedium,
            color = Color.Gray,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        // Email field
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

        // Password field
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password", color = Color.Gray) },
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

        // Login Button
        Button(
            onClick = {
                if (email.isEmpty() || password.isEmpty()) {
                    isError = true
                } else {
                    context.startActivity(Intent(context, HomeActivity::class.java))
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
            Text("Login")
        }

        // Temporary Direct Access Button
        Button(
            onClick = { context.startActivity(Intent(context, HomeActivity::class.java)) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp)
                .height(48.dp),
            shape = RoundedCornerShape(8.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color.Gray
            )
        ) {
            Text("Skip to Home (Temporary)")
        }

        // Sign up link
        Row(
            modifier = Modifier.padding(top = 16.dp),
            horizontalArrangement = Arrangement.Center
        ) {
            Text(
                "Don't have an account? ",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.Gray
            )
            Text(
                "Create an Account",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF0C43EF),
                modifier = Modifier
                    .padding(start = 4.dp)
                    .clickable { 
                        context.startActivity(Intent(context, SignUpActivity::class.java))
                    }
            )
        }
    }
} 