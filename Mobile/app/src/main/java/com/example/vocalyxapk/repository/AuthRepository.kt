package com.example.vocalyxapk.repository

import android.content.Context
import com.example.vocalyxapk.api.RetrofitClient
import com.example.vocalyxapk.models.AuthResponse
import com.example.vocalyxapk.models.FirebaseAuthRequest
import com.example.vocalyxapk.models.LoginRequest
import com.example.vocalyxapk.models.MicrosoftAuthRequest
import com.example.vocalyxapk.models.RegisterRequest
import com.example.vocalyxapk.utils.AuthStateManager
import com.example.vocalyxapk.utils.TokenManager

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

                    // 🎯 NEW: Save user info
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

                    // 🎯 NEW: Save user info
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

                    // 🎯 NEW: Save user info using TokenManager
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
}