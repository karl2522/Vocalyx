package com.example.vocalyxapk.models

import com.google.firebase.auth.UserInfo

data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val tokens: Tokens,
    val user: User,
    val meta: Meta
)

data class Tokens(
    val refresh: String,
    val access: String
)

data class User(
    val id: String,
    val email: String,
    val first_name: String,
    val last_name: String
)

data class Meta(
    val login_time: String,
    val user_login: String
)

data class RegisterRequest(
    val email: String,
    val password: String,
    val password2: String,
    val first_name: String,
    val last_name: String
)

data class RegisterResponse(
    val message: String,
    val user: User
)

data class FirebaseAuthRequest(
    val firebase_token: String
)

data class AuthResponse(
    val token: String,
    val refresh: String,
    val user: User
)

data class MicrosoftAuthRequest(
    val access_token: String,
    val id_token: String? = null
)

data class TokenValidationResponse(
    val valid: Boolean,
    val user: User? = null,
    val error: String? = null
)
data class TokenRefreshResponse(
    val access: String
)

