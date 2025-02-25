package com.example.vocalyxapk.utils

import android.content.Context
import android.content.SharedPreferences

object TokenManager {
    private const val PREF_NAME = "VocalyxPrefs"
    private const val KEY_TOKEN = "auth_token"
    
    private fun getPreferences(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }
    
    fun saveToken(context: Context, token: String) {
        getPreferences(context).edit().apply {
            putString(KEY_TOKEN, token)
            apply()
        }
    }
    
    fun getToken(context: Context): String? {
        return getPreferences(context).getString(KEY_TOKEN, null)
    }
    
    fun clearToken(context: Context) {
        getPreferences(context).edit().apply {
            remove(KEY_TOKEN)
            apply()
        }
    }
}
