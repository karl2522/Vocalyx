package com.example.vocalyxapk.utils

import android.content.Context
import android.content.SharedPreferences
import android.util.Log

object TokenManager {
    private const val PREF_NAME = "AuthTokens"
    private const val KEY_ACCESS_TOKEN = "access_token"
    private const val KEY_REFRESH_TOKEN = "refresh_token"

    // 🎯 NEW: Add user info keys
    private const val KEY_USER_ID = "user_id"
    private const val KEY_USER_EMAIL = "user_email"
    private const val KEY_USER_NAME = "user_name"
    private const val KEY_FIRST_NAME = "first_name"
    private const val KEY_LAST_NAME = "last_name"

    private fun getPreferences(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }

    fun saveTokens(context: Context, accessToken: String, refreshToken: String) {
        getPreferences(context).edit().apply {
            putString(KEY_ACCESS_TOKEN, accessToken)
            putString(KEY_REFRESH_TOKEN, refreshToken)
            apply()
        }

        // 🎯 NEW: Update biometric stored tokens if enabled
        if (BiometricAuthManager.isBiometricEnabled(context)) {
            BiometricAuthManager.updateStoredTokens(context, accessToken, refreshToken)
        }
    }

    fun saveUserInfo(
        context: Context,
        userId: String,
        email: String,
        firstName: String? = null,
        lastName: String? = null
    ) {
        val fullName = "${firstName ?: ""} ${lastName ?: ""}".trim()
        getPreferences(context).edit().apply {
            putString(KEY_USER_ID, userId)
            putString(KEY_USER_EMAIL, email)
            putString(KEY_USER_NAME, fullName.ifEmpty { email.split("@")[0] })
            putString(KEY_FIRST_NAME, firstName)
            putString(KEY_LAST_NAME, lastName)
            apply()
        }
    }

    // 🎯 NEW: Save tokens and enable biometric login
    fun saveTokensAndEnableBiometric(
        context: Context,
        accessToken: String,
        refreshToken: String,
        userEmail: String
    ) {
        saveTokens(context, accessToken, refreshToken)
        BiometricAuthManager.enableBiometricLogin(context, accessToken, refreshToken, userEmail)
    }

    fun getToken(context: Context): String? {
        return getPreferences(context).getString(KEY_ACCESS_TOKEN, null)
    }

    fun getRefreshToken(context: Context): String? {
        return getPreferences(context).getString(KEY_REFRESH_TOKEN, null)
    }

    fun getUserId(context: Context): String? {
        return getPreferences(context).getString(KEY_USER_ID, null)
    }

    fun getUserEmail(context: Context): String? {
        return getPreferences(context).getString(KEY_USER_EMAIL, null)
    }

    fun getUserName(context: Context): String? {
        return getPreferences(context).getString(KEY_USER_NAME, null)
    }

    fun getFirstName(context: Context): String? {
        return getPreferences(context).getString(KEY_FIRST_NAME, null)
    }

    fun getLastName(context: Context): String? {
        return getPreferences(context).getString(KEY_LAST_NAME, null)
    }

    fun clearTokens(context: Context) {
        Log.d("TokenManager", "=== CLEARING TOKENS ===")
        Log.d("TokenManager", "Biometric enabled before clear: ${BiometricAuthManager.isBiometricEnabled(context)}")

        getPreferences(context).edit().clear().apply()

        // 🎯 FIX: DON'T clear biometric tokens on logout - let them persist for next login
        // if (BiometricAuthManager.isBiometricEnabled(context)) {
        //     Log.d("TokenManager", "Clearing biometric stored tokens but keeping biometric enabled")
        //     BiometricAuthManager.clearStoredTokensOnly(context)
        // }

        Log.d("TokenManager", "Biometric enabled after clear: ${BiometricAuthManager.isBiometricEnabled(context)}")
        Log.d("TokenManager", "Biometric tokens preserved for next login")
    }
}