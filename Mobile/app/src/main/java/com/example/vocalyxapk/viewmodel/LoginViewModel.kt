package com.example.vocalyxapk.viewmodel

import android.annotation.SuppressLint
import android.app.Activity
import android.app.Application
import android.util.Base64
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.R
import com.example.vocalyxapk.repository.AuthRepository
import com.example.vocalyxapk.utils.AuthStateManager
import com.example.vocalyxapk.utils.TokenManager
import com.example.vocalyxapk.utils.BiometricAuthManager
import com.google.firebase.auth.AuthCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.OAuthProvider
import com.microsoft.identity.client.AcquireTokenParameters
import com.microsoft.identity.client.AcquireTokenSilentParameters
import com.microsoft.identity.client.AuthenticationCallback
import com.microsoft.identity.client.IAccount
import com.microsoft.identity.client.IAuthenticationResult
import com.microsoft.identity.client.IMultipleAccountPublicClientApplication
import com.microsoft.identity.client.IPublicClientApplication
import com.microsoft.identity.client.Prompt
import com.microsoft.identity.client.PublicClientApplication
import com.microsoft.identity.client.PublicClientApplicationConfigurationFactory
import com.microsoft.identity.client.SilentAuthenticationCallback
import com.microsoft.identity.client.exception.MsalClientException
import com.microsoft.identity.client.exception.MsalException
import com.microsoft.identity.client.exception.MsalServiceException
import com.microsoft.identity.client.exception.MsalUiRequiredException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.SecureRandom

sealed class LoginUIState {
    object Idle : LoginUIState()
    object Loading : LoginUIState()
    data class Success(val message: String) : LoginUIState()
    data class Error(val message: String) : LoginUIState()
}

class LoginViewModel(application: Application) : AndroidViewModel(application) {
    private val authRepository = AuthRepository(application)
    private val firebaseAuth = FirebaseAuth.getInstance()
    private var msalPublicClientApp: IPublicClientApplication? = null

    private val clientId = "5a7221d3-d167-4f9d-b62e-79c987bb5d5f"

    private val scopes = arrayOf("user.read", "openid", "profile", "email")

    @SuppressLint("StaticFieldLeak")
    private val context = getApplication<Application>().applicationContext

    private val _uiState = MutableStateFlow<LoginUIState>(LoginUIState.Idle)
    val uiState: StateFlow<LoginUIState> = _uiState

    init {
        configureMSAL()
    }

    private fun configureMSAL() {
        try {
            val packageName = context.packageName
            Log.d("MicrosoftAuth", "Package name: $packageName")

            PublicClientApplication.createMultipleAccountPublicClientApplication(
                context,
                R.raw.msal_config,
                object : IPublicClientApplication.IMultipleAccountApplicationCreatedListener {
                    override fun onCreated(application: IMultipleAccountPublicClientApplication) {
                        msalPublicClientApp = application

                        try {
                            val config = application.configuration
                            Log.d("MicrosoftAuth", "MSAL redirect URI: ${config.redirectUri}")
                            Log.d("MicrosoftAuth", "MSAL application created successfully")
                        } catch (e: Exception) {
                            Log.e("MicrosoftAuth", "Error getting configuration", e)
                        }
                    }

                    override fun onError(exception: MsalException) {
                        Log.e("MicrosoftAuth", "Error creating MSAL application", exception)

                        if (exception is MsalClientException) {
                            Log.e("MicrosoftAuth", "Client exception code: ${exception.errorCode}")
                        }
                    }
                }
            )
        } catch (e: Exception) {
            Log.e("MicrosoftAuth", "Error configuring MSAL", e)
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = LoginUIState.Loading

            try {
                val result = authRepository.login(email, password)
                result.fold(
                    onSuccess = {
                        AuthStateManager.setLoggedIn(getApplication())
                        _uiState.value = LoginUIState.Success("Login successful")
                    },
                    onFailure = { exception ->
                        _uiState.value = LoginUIState.Error(exception.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                _uiState.value = LoginUIState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun firebaseAuthWithGoogle(idToken: String) {
        viewModelScope.launch {
            _uiState.value = LoginUIState.Loading

            try {
                val credential = GoogleAuthProvider.getCredential(idToken, null)
                authenticateWithFirebase(credential)
            } catch (e: Exception) {
                _uiState.value = LoginUIState.Error(e.message ?: "Google authentication failed")
            }
        }
    }

    fun startMicrosoftSignIn(activity: Activity) {
        _uiState.value = LoginUIState.Loading
        Log.d("MicrosoftAuth", "Starting Microsoft sign-in with MSAL")

        val app = msalPublicClientApp
        if (app == null) {
            _uiState.value = LoginUIState.Error("Microsoft authentication not initialized")
            Log.e("MicrosoftAuth", "MSAL not initialized")
            return
        }

        if (app is IMultipleAccountPublicClientApplication) {
            acquireTokenInteractively(app, activity)
        } else {
            _uiState.value = LoginUIState.Error("Microsoft authentication client is of incorrect type")
            Log.e("MicrosoftAuth", "MSAL app is not IMultipleAccountPublicClientApplication")
        }
    }

    private fun acquireTokenInteractively(app: IPublicClientApplication, activity: Activity?) {
        if (activity == null) {
            _uiState.value = LoginUIState.Error("Activity reference lost")
            return
        }

        app.acquireToken(
            activity,
            scopes,
            object : AuthenticationCallback {
                override fun onSuccess(authenticationResult: IAuthenticationResult) {
                    Log.d("MicrosoftAuth", "Interactive authentication successful")
                    processAuthenticationResult(authenticationResult)
                }

                override fun onError(exception: MsalException) {
                    Log.e("MicrosoftAuth", "Interactive authentication error", exception)
                    when(exception) {
                        is MsalClientException -> {
                            _uiState.value = LoginUIState.Error("Client error: ${exception.message}")
                        }
                        is MsalServiceException -> {
                            _uiState.value = LoginUIState.Error("Service error: ${exception.message}")
                        }
                        is MsalUiRequiredException -> {
                            _uiState.value = LoginUIState.Error("UI required: ${exception.message}")
                        }
                        else -> {
                            _uiState.value = LoginUIState.Error("Authentication error: ${exception.message}")
                        }
                    }
                }

                override fun onCancel() {
                    Log.d("MicrosoftAuth", "User canceled authentication")
                    _uiState.value = LoginUIState.Error("Authentication canceled by user")
                }
            }
        )
    }

    private fun processAuthenticationResult(authResult: IAuthenticationResult) {
        viewModelScope.launch {
            try {
                val accessToken = authResult.accessToken

                Log.d("MicrosoftAuth", "Got Microsoft access token: ${accessToken.take(10)}...")

                val result = authRepository.loginWithMicrosoft(accessToken)
                result.fold(
                    onSuccess = {
                        Log.d("MicrosoftAuth", "Backend login successful")
                        AuthStateManager.setLoggedIn(getApplication())
                        _uiState.value = LoginUIState.Success("Microsoft login successful")
                    },
                    onFailure = { exception ->
                        Log.e("MicrosoftAuth", "Backend verification failed", exception)
                        _uiState.value = LoginUIState.Error("Backend verification failed: ${exception.message}")
                    }
                )
            } catch (e: Exception) {
                Log.e("MicrosoftAuth", "Error processing authentication result", e)
                _uiState.value = LoginUIState.Error("Error processing authentication: ${e.message}")
            }
        }
    }

    private suspend fun authenticateWithFirebase(credential: AuthCredential) {
        try {
            val authResult = firebaseAuth.signInWithCredential(credential).await()
            val user = authResult.user

            if (user != null) {
                sendFirebaseTokenToBackend(user.uid)
                _uiState.value = LoginUIState.Success("Authentication successful")
            } else {
                _uiState.value = LoginUIState.Error("Authentication failed")
            }
        } catch (e: Exception) {
            _uiState.value = LoginUIState.Error(e.message ?: "Firebase authentication failed")
        }
    }

    private suspend fun sendFirebaseTokenToBackend(uid: String) {
        try {
            val token = firebaseAuth.currentUser?.getIdToken(true)?.await()?.token

            if (token != null) {
                println("Sending token to backend: ${token.take(10)}...")
                val result = authRepository.loginWithFirebase(token)
                result.fold(
                    onSuccess = {
                        println("Backend authentication successful")
                        AuthStateManager.setLoggedIn(getApplication())
                    },
                    onFailure = { exception ->
                        println("Backend authentication failed: ${exception.message}")
                        _uiState.value = LoginUIState.Error(exception.message ?: "Backend verification failed")
                    }
                )
            } else {
                _uiState.value = LoginUIState.Error("Failed to get Firebase token")
            }
        } catch (e: Exception) {
            println("Backend communication failed: ${e.message}")
            _uiState.value = LoginUIState.Error(e.message ?: "Backend communication failed")
        }
    }

    // 🎯 FIXED: Complete implementation of biometric login
    suspend fun loginWithStoredTokens(accessToken: String, refreshToken: String, userEmail: String) {
        try {
            _uiState.value = LoginUIState.Loading
            Log.d("BiometricAuth", "Starting biometric login for user: $userEmail")

            // 🎯 NEW: Validate tokens with backend before proceeding
            val isValid = authRepository.validateTokens(accessToken, refreshToken)

            if (isValid) {
                TokenManager.saveTokens(context, accessToken, refreshToken)


                // Try to get user info from current TokenManager first
                val existingUserId = TokenManager.getUserId(context)
                val existingFirstName = TokenManager.getFirstName(context)
                val existingLastName = TokenManager.getLastName(context)

                if (existingFirstName.isNullOrEmpty() || existingLastName.isNullOrEmpty()) {
                    val emailName = userEmail.split("@")[0]
                    val fallbackName = emailName.split(".").joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }

                    Log.d("BiometricAuth", "Using fallback name: $fallbackName for $userEmail")

                    TokenManager.saveUserInfo(
                        context,
                        existingUserId ?: "unknown",
                        userEmail,
                        fallbackName.split(" ").getOrNull(0) ?: fallbackName,
                        fallbackName.split(" ").getOrNull(1) ?: ""
                    )
                } else {
                    TokenManager.saveUserInfo(
                        context,
                        existingUserId ?: "unknown",
                        userEmail,
                        existingFirstName,
                        existingLastName
                    )
                }

                // Update auth state
                AuthStateManager.setLoggedIn(context)

                Log.d("BiometricAuth", "Biometric login successful for user: $userEmail")
                _uiState.value = LoginUIState.Success("Welcome back!")
            } else {
                // Tokens are invalid - disable biometric and force regular login
                Log.w("BiometricAuth", "Stored tokens are invalid, disabling biometric login")
                BiometricAuthManager.disableBiometricLogin(context)
                _uiState.value = LoginUIState.Error("Your session has expired. Please sign in again.")
            }

        } catch (e: Exception) {
            Log.e("BiometricAuth", "Biometric login failed", e)
            // Disable biometric on error to prevent repeated failures
            BiometricAuthManager.disableBiometricLogin(context)
            _uiState.value = LoginUIState.Error("Biometric login failed. Please sign in with your credentials.")
        }
    }

    // 🎯 NEW: Method to offer biometric setup after successful login
    fun offerBiometricSetup(): Boolean {
        return authRepository.shouldOfferBiometricSetup(context)
    }

    // 🎯 NEW: Enable biometric login for current user
    fun enableBiometricLogin() {
        try {
            authRepository.enableBiometricForUser(context)
            Log.d("BiometricAuth", "Biometric login enabled for current user")
        } catch (e: Exception) {
            Log.e("BiometricAuth", "Failed to enable biometric login", e)
        }
    }
}