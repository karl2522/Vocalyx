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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.vocalyxapk.viewmodel.LoginUIState
import com.example.vocalyxapk.viewmodel.LoginViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.utils.NavigationUtils
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.CloudSync
import com.example.vocalyxapk.viewmodel.ViewModelFactory
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.auth.api.signin.GoogleSignInStatusCodes
import com.google.android.gms.common.api.ApiException

@Composable
fun LoginScreen() {
    val context = LocalContext.current
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
    val activity = context as Activity
    val scrollState = rememberScrollState()

    val uiState by viewModel.uiState.collectAsState()

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

    if (uiState is LoginUIState.Loading) {
        AlertDialog(
            onDismissRequest = { },
            title = { Text("Loading") },
            text = { CircularProgressIndicator() },
            confirmButton = { }
        )
    }

    LaunchedEffect(uiState) {
        when (uiState) {
            is LoginUIState.Success -> {
                NavigationUtils.navigateToHome(context)
            }
            is LoginUIState.Error -> {
                Toast.makeText(
                    context,
                    (uiState as LoginUIState.Error).message,
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
            Spacer(modifier = Modifier.height(60.dp))

            // Header Section with Logo and Branding
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 32.dp),
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
                        text = "Welcome Back!",
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
                            text = "Sign in to ",
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
                    }

                    Text(
                        text = "Access your personalized voice experience",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.Gray,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
            }

            // Quick Features Info
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
                        text = "Why Vocalyx?",
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
                            imageVector = Icons.Default.Security,
                            contentDescription = null,
                            tint = Color(0xFF333D79),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Secure voice authentication",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF4A4A4A)
                        )
                    }

                    Row(
                        modifier = Modifier.padding(bottom = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Speed,
                            contentDescription = null,
                            tint = Color(0xFF333D79),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Lightning-fast processing",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF4A4A4A)
                        )

                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.CloudSync,
                                contentDescription = null,
                                tint = Color(0xFF333D79),
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = "Cross-platform synchronization",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFF4A4A4A)
                            )
                        }
                    }
                }

                // Login Form Card
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
                            text = "Choose your sign-in method:",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.SemiBold
                            ),
                            color = Color(0xFF1A1A1A),
                            modifier = Modifier.padding(bottom = 16.dp)
                        )

                        // Social Login Buttons
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 24.dp),
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
                                modifier = Modifier.weight(1f).height(52.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = Color(0xFF1A1A1A)
                                ),
                                border = BorderStroke(
                                    width = 1.5.dp,
                                    color = Color(0xFFE0E0E0)
                                )
                            ) {
                                Image(
                                    painter = painterResource(id = R.drawable.google_logo),
                                    contentDescription = "Google",
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Google",
                                    fontWeight = FontWeight.Medium
                                )
                            }

                            OutlinedButton(
                                onClick = {
                                    viewModel.startMicrosoftSignIn(activity)
                                },
                                modifier = Modifier.weight(1f).height(52.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = Color(0xFF1A1A1A)
                                ),
                                border = BorderStroke(
                                    width = 1.5.dp,
                                    color = Color(0xFFE0E0E0)
                                )
                            ) {
                                Image(
                                    painter = painterResource(id = R.drawable.microsoft_logo),
                                    contentDescription = "Microsoft",
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Microsoft",
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }

                        // Divider
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Divider(
                                modifier = Modifier.weight(1f),
                                color = Color(0xFFE0E0E0)
                            )
                            Text(
                                text = "  or continue with email  ",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color.Gray
                            )
                            Divider(
                                modifier = Modifier.weight(1f),
                                color = Color(0xFFE0E0E0)
                            )
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
                            },
                            placeholder = { Text("Enter your password", color = Color.Gray.copy(alpha = 0.7f)) },
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
                                .height(52.dp),
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

                // Sign up section
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
                            "New to Vocalyx? ",
                            style = MaterialTheme.typography.bodyLarge,
                            color = Color(0xFF4A4A4A)
                        )
                        Text(
                            "Create Account",
                            style = MaterialTheme.typography.bodyLarge.copy(
                                fontWeight = FontWeight.Bold
                            ),
                            color = Color(0xFF333D79),
                            modifier = Modifier.clickable {
                                NavigationUtils.navigateToSignUp(context)
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}