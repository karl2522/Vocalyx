package com.example.vocalyxapk.api

import com.example.vocalyxapk.models.LoginRequest
import com.example.vocalyxapk.models.LoginResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface ApiService {
    @POST("login")  // This will be added to your base URL
    suspend fun login(@Body loginRequest: LoginRequest): Response<LoginResponse>
}

/*
class ApiService {
}*/
