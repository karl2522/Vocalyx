package com.example.vocalyxapk.repository

import android.content.Context
import com.example.vocalyxapk.api.RetrofitClient
import com.example.vocalyxapk.models.LoginRequest
import com.example.vocalyxapk.models.RegisterRequest
import com.example.vocalyxapk.utils.TokenManager

class AuthRepository(private val context: Context) {
    private val apiService = RetrofitClient.apiService

    suspend fun login(email: String, password: String): Result<Unit> {
        return try {
            val response = apiService.login(LoginRequest(email, password))
            if (response.isSuccessful) {
                response.body()?.let { loginResponse ->
                    TokenManager.saveTokens(
                        context,
                        loginResponse.tokens.access,
                        loginResponse.tokens.refresh
                    )
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
}