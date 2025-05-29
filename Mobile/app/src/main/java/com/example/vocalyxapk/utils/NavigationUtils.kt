package com.example.vocalyxapk.utils

import android.content.Context
import android.content.Intent
import com.example.vocalyxapk.HomeActivity
import com.example.vocalyxapk.SignUpActivity
import com.example.vocalyxapk.LoginActivity

object NavigationUtils {
    fun navigateToHome(context: Context) {
        val intent = Intent(context, HomeActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        context.startActivity(intent)
    }

    fun navigateToSignUp(context: Context) {
        val intent = Intent(context, SignUpActivity::class.java)
        context.startActivity(intent)
    }

    fun navigateToLogin(context: Context) {
        val intent = Intent(context, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        context.startActivity(intent)
    }
} 