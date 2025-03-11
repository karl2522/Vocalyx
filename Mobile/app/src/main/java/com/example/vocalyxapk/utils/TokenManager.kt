package com.example.vocalyxapk.utils

import android.content.Context
import android.content.SharedPreferences

object TokenManager {
    private const val PREF_NAME = "AuthTokens"
    private const val KEY_ACCESS_TOKEN = "access_token"
    private const val KEY_REFRESH_TOKEN = "refresh_token"

    private fun getPreferences(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }

    fun saveTokens(context: Context, accessToken: String, refreshToken: String) {
        getPreferences(context).edit().apply {
            putString(KEY_ACCESS_TOKEN, accessToken)
            putString(KEY_REFRESH_TOKEN, refreshToken)
            apply()
        }
    }

    fun getToken(context: Context): String? {
        return getPreferences(context).getString(KEY_ACCESS_TOKEN, null)
    }

    fun getRefreshToken(context: Context): String? {
        return getPreferences(context).getString(KEY_REFRESH_TOKEN, null)
    }

    fun clearTokens(context: Context) {
        getPreferences(context).edit().clear().apply()
    }
}