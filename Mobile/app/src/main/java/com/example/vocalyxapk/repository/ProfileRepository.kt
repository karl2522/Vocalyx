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
                val response = apiService.getProfile()
                if (response.isSuccessful) {
                    response.body()?.let { profile ->
                        Result.success(profile)
                    } ?: Result.failure(Exception("Empty profile response"))
                } else {
                    Result.failure(Exception("Failed to fetch profile: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun updateProfile(updateRequest: UpdateProfileRequest): Result<UserProfile> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.updateProfile(updateRequest)
                if (response.isSuccessful) {
                    response.body()?.user?.let { updatedProfile ->
                        Result.success(updatedProfile)
                    } ?: Result.failure(Exception("Empty update response"))
                } else {
                    Result.failure(Exception("Failed to update profile: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}