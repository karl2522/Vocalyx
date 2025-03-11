package com.example.vocalyxapk.models

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