package com.example.vocalyxapk.api

import com.example.vocalyxapk.models.AuthResponse
import com.example.vocalyxapk.models.FirebaseAuthRequest
import com.example.vocalyxapk.models.LoginRequest
import com.example.vocalyxapk.models.LoginResponse
import com.example.vocalyxapk.models.MicrosoftAuthRequest
import com.example.vocalyxapk.models.RegisterRequest
import com.example.vocalyxapk.models.RegisterResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface ApiService {
    @POST("api/login/")
    suspend fun login(@Body loginRequest: LoginRequest): Response<LoginResponse>

    @POST("api/register/")
    suspend fun register(@Body registerRequest: RegisterRequest): Response<RegisterResponse>

    @POST("api/logout/")
    suspend fun logout(@Body refreshToken: Map<String, String>): Response<Map<String, String>>

    @POST("api/firebase-auth/")
    suspend fun firebaseAuth(@Body request: FirebaseAuthRequest): Response<AuthResponse>

    @POST("api/auth/microsoft/")
    suspend fun microsoftAuth(@Body request: MicrosoftAuthRequest): Response<AuthResponse>
}