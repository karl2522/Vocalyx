package com.example.vocalyxapk.repository

import android.content.Context
import android.util.Log
import com.example.vocalyxapk.api.RetrofitClient
import com.example.vocalyxapk.models.AuthResponse
import com.example.vocalyxapk.models.FirebaseAuthRequest
import com.example.vocalyxapk.models.LoginRequest
import com.example.vocalyxapk.models.MicrosoftAuthRequest
import com.example.vocalyxapk.models.RegisterRequest
import com.example.vocalyxapk.utils.AuthStateManager
import com.example.vocalyxapk.utils.TokenManager
import com.example.vocalyxapk.utils.BiometricAuthManager
import com.example.vocalyxapk.utils.BiometricAuthStatus

class AuthRepository(private val context: Context) {
    private val apiService = RetrofitClient.apiService

    suspend fun login(email: String, password: String): Result<Unit> {
        return try {
            val response = apiService.login(LoginRequest(email, password))
            if (response.isSuccessful) {
                response.body()?.let { loginResponse ->
                    // Save tokens
                    TokenManager.saveTokens(
                        context,
                        loginResponse.tokens.access,
                        loginResponse.tokens.refresh
                    )

                    // Save user info
                    TokenManager.saveUserInfo(
                        context,
                        loginResponse.user.id,
                        loginResponse.user.email,
                        loginResponse.user.first_name,
                        loginResponse.user.last_name
                    )

                    // Update auth state
                    AuthStateManager.setLoggedIn(context)

                    Result.success(Unit)
                } ?: Result.failure(Exception("Empty response body"))
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Unknown error"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(
        email: String,
        password: String,
        confirmPassword: String,
        firstName: String,
        lastName: String
    ): Result<Unit> {
        return try {
            val response = apiService.register(
                RegisterRequest(
                    email,
                    password,
                    confirmPassword,
                    firstName,
                    lastName
                )
            )
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Unknown error"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout(): Result<Unit> {
        return try {
            val refreshToken = TokenManager.getRefreshToken(context)
            if (refreshToken != null) {
                val response = apiService.logout(mapOf("refresh_token" to refreshToken))
                if (response.isSuccessful) {
                    TokenManager.clearTokens(context)
                    AuthStateManager.setLoggedOut(context)
                    Result.success(Unit)
                } else {
                    Result.failure(Exception(response.errorBody()?.string() ?: "Unknown error"))
                }
            } else {
                Result.failure(Exception("No refresh token found"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun loginWithFirebase(firebaseToken: String): Result<Unit> {
        return try {
            println("Sending Firebase token request to backend...")
            val request = FirebaseAuthRequest(firebaseToken)
            val response = apiService.firebaseAuth(request)

            if (response.isSuccessful) {
                val authResponse = response.body()
                println("Firebase auth response received: $authResponse")
                if (authResponse != null) {
                    // Save tokens
                    TokenManager.saveTokens(
                        context,
                        authResponse.token,
                        authResponse.refresh
                    )

                    // Save user info
                    TokenManager.saveUserInfo(
                        context,
                        authResponse.user.id,
                        authResponse.user.email,
                        authResponse.user.first_name,
                        authResponse.user.last_name
                    )

                    // Update auth state
                    AuthStateManager.setLoggedIn(context)

                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Empty response from server"))
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                println("Firebase auth failed: $errorBody")
                Result.failure(Exception("Firebase authentication failed: $errorBody"))
            }
        } catch (e: Exception) {
            println("Firebase auth exception: ${e.message}")
            Result.failure(e)
        }
    }

    suspend fun loginWithMicrosoft(accessToken: String): Result<Unit> {
        return try {
            val request = MicrosoftAuthRequest(access_token = accessToken)
            val response = apiService.microsoftAuth(request)

            if (response.isSuccessful) {
                val authResponse = response.body()
                if (authResponse != null) {
                    // Save tokens using TokenManager
                    TokenManager.saveTokens(
                        context,
                        authResponse.token,
                        authResponse.refresh
                    )

                    // Save user info using TokenManager
                    TokenManager.saveUserInfo(
                        context,
                        authResponse.user.id,
                        authResponse.user.email,
                        authResponse.user.first_name,
                        authResponse.user.last_name
                    )

                    // Update auth state
                    AuthStateManager.setLoggedIn(context)

                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Empty response"))
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                Result.failure(Exception("Microsoft authentication failed: $errorBody"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // 🎯 NEW: Validate stored tokens with backend
    suspend fun validateTokens(accessToken: String, refreshToken: String): Boolean {
        return try {
            Log.d("BiometricAuth", "Validating stored tokens with backend")

            // Try to call the validation endpoint with the access token
            val response = apiService.validateToken("Bearer $accessToken")

            if (response.isSuccessful) {
                Log.d("BiometricAuth", "Access token is valid")
                true
            } else if (response.code() == 401) {
                // Access token expired, try to refresh
                Log.d("BiometricAuth", "Access token expired, attempting refresh")
                refreshTokens(refreshToken)
            } else {
                Log.w("BiometricAuth", "Token validation failed with code: ${response.code()}")
                false
            }
        } catch (e: Exception) {
            Log.e("BiometricAuth", "Token validation failed", e)
            false
        }
    }

    // 🎯 NEW: Refresh tokens
    private suspend fun refreshTokens(refreshToken: String): Boolean {
        return try {
            // Use the existing Django SimpleJWT refresh endpoint
            val response = apiService.refreshToken(mapOf("refresh" to refreshToken))

            if (response.isSuccessful) {
                response.body()?.let { refreshResponse ->
                    // Update stored tokens
                    TokenManager.saveTokens(
                        context,
                        refreshResponse.access,  // Django SimpleJWT returns "access"
                        refreshToken  // Keep the same refresh token
                    )

                    // Update biometric stored tokens too
                    val userEmail = TokenManager.getUserEmail(context)
                    if (userEmail != null) {
                        BiometricAuthManager.updateStoredTokens(
                            context,
                            refreshResponse.access,
                            refreshToken
                        )
                    }

                    Log.d("BiometricAuth", "Tokens refreshed successfully")
                    true
                } ?: false
            } else {
                Log.w("BiometricAuth", "Token refresh failed with code: ${response.code()}")
                false
            }
        } catch (e: Exception) {
            Log.e("BiometricAuth", "Token refresh failed", e)
            false
        }
    }

    // 🎯 NEW: Check if biometric setup should be offered
    fun shouldOfferBiometricSetup(context: Context): Boolean {
        return BiometricAuthManager.isBiometricAvailable(context) == BiometricAuthStatus.AVAILABLE &&
                !BiometricAuthManager.isBiometricEnabled(context)
    }

    // 🎯 FIXED: Fixed method name from enableBiometricForUse to enableBiometricForUser
    fun enableBiometricForUser(context: Context) {
        val accessToken = TokenManager.getToken(context)
        val refreshToken = TokenManager.getRefreshToken(context)
        val userEmail = TokenManager.getUserEmail(context)

        if (accessToken != null && refreshToken != null && userEmail != null) {
            BiometricAuthManager.enableBiometricLogin(context, accessToken, refreshToken, userEmail)
            Log.d("BiometricAuth", "Biometric login enabled for user: $userEmail")
        } else {
            Log.w("BiometricAuth", "Cannot enable biometric - missing user data")
        }
    }
}