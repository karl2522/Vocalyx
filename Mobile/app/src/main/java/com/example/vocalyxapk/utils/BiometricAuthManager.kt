package com.example.vocalyxapk.utils

import android.content.Context
import android.os.Build
import android.util.Log
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

object BiometricAuthManager {
    private const val BIOMETRIC_PREFS = "BiometricPrefs"
    private const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
    private const val KEY_ENCRYPTED_ACCESS_TOKEN = "encrypted_access_token"
    private const val KEY_ENCRYPTED_REFRESH_TOKEN = "encrypted_refresh_token"
    private const val KEY_ENCRYPTED_USER_EMAIL = "encrypted_user_email"
    private const val KEY_ENCRYPTED_USER_ID = "encrypted_user_id"
    private const val KEY_ENCRYPTED_FIRST_NAME = "encrypted_first_name"
    private const val KEY_ENCRYPTED_LAST_NAME = "encrypted_last_name"

    private fun getEncryptedPreferences(context: Context): android.content.SharedPreferences {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        return EncryptedSharedPreferences.create(
            context,
            BIOMETRIC_PREFS,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    /**
     * Check if biometric authentication is available on this device
     */
    fun isBiometricAvailable(context: Context): BiometricAuthStatus {
        val biometricManager = BiometricManager.from(context)
        return when (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)) {
            BiometricManager.BIOMETRIC_SUCCESS -> BiometricAuthStatus.AVAILABLE
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> BiometricAuthStatus.NOT_AVAILABLE
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> BiometricAuthStatus.TEMPORARILY_NOT_AVAILABLE
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> BiometricAuthStatus.AVAILABLE_BUT_NOT_ENROLLED
            else -> BiometricAuthStatus.NOT_AVAILABLE
        }
    }

    /**
     * Check if user has enabled biometric login
     */
    fun isBiometricEnabled(context: Context): Boolean {
        return try {
            val prefs = getEncryptedPreferences(context)
            val isEnabled = prefs.getBoolean(KEY_BIOMETRIC_ENABLED, false)
            Log.d("BiometricAuth", "isBiometricEnabled check: $isEnabled")
            isEnabled
        } catch (e: Exception) {
            Log.e("BiometricAuth", "Error checking biometric enabled status", e)
            false
        }
    }


    /**
     * Enable biometric login and store encrypted tokens
     */
    fun enableBiometricLogin(context: Context, accessToken: String, refreshToken: String, userEmail: String) {
        try {
            Log.d("BiometricAuth", "=== ENABLING BIOMETRIC LOGIN ===")

            // 🎯 NEW: Get current user info from TokenManager
            val userId = TokenManager.getUserId(context) ?: "unknown"
            val firstName = TokenManager.getFirstName(context) ?: ""
            val lastName = TokenManager.getLastName(context) ?: ""

            Log.d("BiometricAuth", "Storing user info: $firstName $lastName ($userEmail)")

            getEncryptedPreferences(context).edit().apply {
                putBoolean(KEY_BIOMETRIC_ENABLED, true)
                putString(KEY_ENCRYPTED_ACCESS_TOKEN, accessToken)
                putString(KEY_ENCRYPTED_REFRESH_TOKEN, refreshToken)
                putString(KEY_ENCRYPTED_USER_EMAIL, userEmail)
                // 🎯 NEW: Store user info too
                putString(KEY_ENCRYPTED_USER_ID, userId)
                putString(KEY_ENCRYPTED_FIRST_NAME, firstName)
                putString(KEY_ENCRYPTED_LAST_NAME, lastName)
                apply()
            }

            Log.d("BiometricAuth", "Biometric login enabled successfully with user info")
        } catch (e: Exception) {
            Log.e("BiometricAuth", "Error enabling biometric login", e)
        }
    }

    /**
     * Disable biometric login and clear stored tokens
     */
    fun disableBiometricLogin(context: Context) {
        try {
            getEncryptedPreferences(context).edit().clear().apply()
            Log.d("BiometricAuth", "Biometric login disabled successfully")
        } catch (e: Exception) {
            Log.e("BiometricAuth", "Error disabling biometric login", e)
        }
    }

    /**
     * Get stored encrypted tokens (only available after successful biometric auth)
     */
    private fun getStoredTokens(context: Context): BiometricTokens? {
        return try {
            val prefs = getEncryptedPreferences(context)
            val accessToken = prefs.getString(KEY_ENCRYPTED_ACCESS_TOKEN, null)
            val refreshToken = prefs.getString(KEY_ENCRYPTED_REFRESH_TOKEN, null)
            val userEmail = prefs.getString(KEY_ENCRYPTED_USER_EMAIL, null)
            // 🎯 NEW: Get user info too
            val userId = prefs.getString(KEY_ENCRYPTED_USER_ID, null)
            val firstName = prefs.getString(KEY_ENCRYPTED_FIRST_NAME, null)
            val lastName = prefs.getString(KEY_ENCRYPTED_LAST_NAME, null)

            Log.d("BiometricAuth", "Retrieved user info: $firstName $lastName")

            if (accessToken != null && refreshToken != null && userEmail != null) {
                Log.d("BiometricAuth", "All tokens found, returning BiometricTokens")
                BiometricTokens(
                    accessToken = accessToken,
                    refreshToken = refreshToken,
                    userEmail = userEmail,
                    // 🎯 NEW: Include user info
                    userId = userId ?: "unknown",
                    firstName = firstName ?: "",
                    lastName = lastName ?: ""
                )
            } else {
                Log.w("BiometricAuth", "Missing required tokens")
                null
            }
        } catch (e: Exception) {
            Log.e("BiometricAuth", "Error retrieving stored tokens", e)
            null
        }
    }

    /**
     * Perform biometric authentication
     */
    suspend fun authenticateWithBiometric(
        activity: FragmentActivity,
        title: String = "Biometric Authentication",
        subtitle: String = "Use your fingerprint to sign in to Vocalyx",
        negativeButtonText: String = "Cancel"
    ): BiometricAuthResult = suspendCancellableCoroutine { continuation ->

        val executor = ContextCompat.getMainExecutor(activity)
        val biometricPrompt = BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)
                Log.e("BiometricAuth", "Authentication error: $errString")
                if (continuation.isActive) {
                    continuation.resume(BiometricAuthResult.Error(errString.toString()))
                }
            }

            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)
                Log.d("BiometricAuth", "Authentication succeeded")

                // Retrieve stored tokens
                val tokens = getStoredTokens(activity)
                if (tokens != null) {
                    if (continuation.isActive) {
                        continuation.resume(BiometricAuthResult.Success(tokens))
                    }
                } else {
                    if (continuation.isActive) {
                        continuation.resume(BiometricAuthResult.Error("No stored credentials found"))
                    }
                }
            }

            override fun onAuthenticationFailed() {
                super.onAuthenticationFailed()
                Log.w("BiometricAuth", "Authentication failed")
                // Don't resume here, let user try again
            }
        })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setNegativeButtonText(negativeButtonText)
            .build()

        continuation.invokeOnCancellation {
            // Handle cancellation if needed
        }

        biometricPrompt.authenticate(promptInfo)
    }

    /**
     * Update stored tokens (call this when tokens are refreshed)
     */
    fun updateStoredTokens(context: Context, accessToken: String, refreshToken: String) {
        if (isBiometricEnabled(context)) {
            try {
                getEncryptedPreferences(context).edit().apply {
                    putString(KEY_ENCRYPTED_ACCESS_TOKEN, accessToken)
                    putString(KEY_ENCRYPTED_REFRESH_TOKEN, refreshToken)
                    apply()
                }
                Log.d("BiometricAuth", "Stored tokens updated")
            } catch (e: Exception) {
                Log.e("BiometricAuth", "Error updating stored tokens", e)
            }
        }
    }

    fun clearStoredTokensOnly(context: Context) {
        try {
            getEncryptedPreferences(context).edit().apply {
                remove(KEY_ENCRYPTED_ACCESS_TOKEN)
                remove(KEY_ENCRYPTED_REFRESH_TOKEN)
                remove(KEY_ENCRYPTED_USER_EMAIL)
                apply()
            }
            Log.d("BiometricAuth", "Cleared stored tokens but kept biometric enabled")
        } catch (e: Exception) {
            Log.e("BiometricAuth", "Error clearing stored tokens", e)
        }
    }
}

// Data classes for biometric auth
data class BiometricTokens(
    val accessToken: String,
    val refreshToken: String,
    val userEmail: String,
    val userId: String = "unknown",
    val firstName: String = "",
    val lastName: String = ""
)

sealed class BiometricAuthResult {
    data class Success(val tokens: BiometricTokens) : BiometricAuthResult()
    data class Error(val message: String) : BiometricAuthResult()
}

enum class BiometricAuthStatus {
    AVAILABLE,
    NOT_AVAILABLE,
    TEMPORARILY_NOT_AVAILABLE,
    AVAILABLE_BUT_NOT_ENROLLED
}