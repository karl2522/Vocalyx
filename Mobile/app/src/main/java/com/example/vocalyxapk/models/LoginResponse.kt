package com.example.vocalyxapk.models

data class LoginResponse(
    val success: Boolean,
    val message: String,
    val token: String? = null,
    val userId: String? = null,
    val email: String? = null
)
