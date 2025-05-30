package com.example.vocalyxapk.repository

import com.example.vocalyxapk.api.RetrofitClient
import com.example.vocalyxapk.models.UpdateProfileRequest
import com.example.vocalyxapk.models.UserProfile
import com.example.vocalyxapk.utils.TokenManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class ProfileRepository {
    private val apiService = RetrofitClient.apiService

    suspend fun getProfile(): Result<UserProfile> {
        return withContext(Dispatchers.IO) {
            try {
                println("🔍 Making API call to getProfile()")
                val response = apiService.getProfile()
                println("🔍 Response code: ${response.code()}")
                println("🔍 Response successful: ${response.isSuccessful}")

                if (response.isSuccessful) {
                    val responseBody = response.body()
                    println("🔍 Response body: $responseBody")

                    if (responseBody != null) {
                        println("🔍 User data: ${responseBody.user}")
                        Result.success(responseBody.user)
                    } else {
                        println("🔍 Response body is null")
                        Result.failure(Exception("Empty profile response"))
                    }
                } else {
                    val errorBody = response.errorBody()?.string()
                    println("🔍 Error response: $errorBody")
                    Result.failure(Exception("Failed to fetch profile: ${response.code()} ${response.message()}"))
                }
            } catch (e: Exception) {
                println("🔍 Exception in getProfile: ${e.message}")
                e.printStackTrace()
                Result.failure(e)
            }
        }
    }

    suspend fun updateProfile(updateRequest: UpdateProfileRequest): Result<UserProfile> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.updateProfile(updateRequest)
                if (response.isSuccessful) {
                    val updateResponse = response.body()
                    if (updateResponse != null) {
                        // 🎯 FIXED: Extract user with explicit type checking
                        Result.success(updateResponse.user)
                    } else {
                        Result.failure(Exception("Empty update response"))
                    }
                } else {
                    Result.failure(Exception("Failed to update profile: ${response.code()} ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}