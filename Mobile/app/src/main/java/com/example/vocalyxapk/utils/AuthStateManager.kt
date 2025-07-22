package com.example.vocalyxapk.utils

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object AuthStateManager {
    private const val PREF_NAME = "AuthState"
    private const val KEY_IS_LOGGED_IN = "is_logged_in"
    private const val KEY_LAST_LOGIN_TIME = "last_login_time"

    // App state preferences
    private const val APP_STATE_PREF_NAME = "VocalyxAppState"
    private const val KEY_HAS_OPENED_BEFORE = "has_opened_before"

    // Set to 1 hour to match backend session timeout
    private const val SESSION_TIMEOUT = 60 * 60 * 1000L

    private val _authState = MutableStateFlow<AuthState>(AuthState.Unknown)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private fun getPreferences(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }

    private fun getAppStatePreferences(context: Context): SharedPreferences {
        return context.getSharedPreferences(APP_STATE_PREF_NAME, Context.MODE_PRIVATE)
    }

    fun setLoggedIn(context: Context) {
        getPreferences(context).edit().apply {
            putBoolean(KEY_IS_LOGGED_IN, true)
            putLong(KEY_LAST_LOGIN_TIME, System.currentTimeMillis())
            apply()
        }
        _authState.value = AuthState.Authenticated
    }

    fun setLoggedOut(context: Context) {
        getPreferences(context).edit().apply {
            putBoolean(KEY_IS_LOGGED_IN, false)
            putLong(KEY_LAST_LOGIN_TIME, 0)
            apply()
        }
        TokenManager.clearTokens(context)
        _authState.value = AuthState.Unauthenticated
    }

    fun checkAuthState(context: Context) {
        val prefs = getPreferences(context)
        val isLoggedIn = prefs.getBoolean(KEY_IS_LOGGED_IN, false)
        val lastLoginTime = prefs.getLong(KEY_LAST_LOGIN_TIME, 0)
        val currentTime = System.currentTimeMillis()

        val isSessionExpired = currentTime - lastLoginTime > SESSION_TIMEOUT

        val hasToken = TokenManager.getToken(context) != null

        if (isLoggedIn && !isSessionExpired && hasToken) {
            _authState.value = AuthState.Authenticated
        } else {
            if (isLoggedIn) {
                setLoggedOut(context)
            } else {
                _authState.value = AuthState.Unauthenticated
            }
        }
    }

    // New function to check if this is the first time opening the app
    fun isFirstTimeUser(context: Context): Boolean {
        return !getAppStatePreferences(context).getBoolean(KEY_HAS_OPENED_BEFORE, false)
    }

    // New function to mark that the user has opened the app
    fun markAppAsOpened(context: Context) {
        getAppStatePreferences(context).edit().apply {
            putBoolean(KEY_HAS_OPENED_BEFORE, true)
            apply()
        }
    }
}

sealed class AuthState {
    object Unknown : AuthState()
    object Authenticated : AuthState()
    object Unauthenticated : AuthState()
}