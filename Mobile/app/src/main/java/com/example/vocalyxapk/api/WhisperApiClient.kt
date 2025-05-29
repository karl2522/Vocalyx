package com.example.vocalyxapk.api

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.example.vocalyxapk.utils.TokenManager
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

class WhisperApiClient(private val context: Context) {
    // Change to your Django backend URL
    private val baseUrl = "http://10.0.191.212:8000"

    private val httpClient = OkHttpClient.Builder()
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    // We don't need the API key anymore as we're using the backend API
    suspend fun saveApiKey(apiKey: String) {
        // Keeping this method for backward compatibility
        Log.d("WhisperApiClient", "API key storage not needed when using backend API")
    }

    // Transcribe audio bytes using backend API
    suspend fun transcribeAudioBytes(audioBytes: ByteArray, language: String? = null): Result<String> {
        return try {
            Log.d("WhisperApiClient", "Transcribing ${audioBytes.size} bytes of audio")

            // Create temporary file
            val tempFile = File.createTempFile("audio_", ".wav", context.cacheDir)
            tempFile.writeBytes(audioBytes)
            Log.d("WhisperApiClient", "Audio saved to temp file: ${tempFile.absolutePath}, size: ${tempFile.length()} bytes")

            // Get auth token
            val token = TokenManager.getToken(context)
            if (token == null) {
                Log.e("WhisperApiClient", "Authentication token not found")
                return Result.failure(Exception("Authentication token not found"))
            }

            // Create multipart request
            val requestBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart(
                    "audio_file",
                    "audio.wav",
                    tempFile.asRequestBody("audio/wav".toMediaTypeOrNull())
                )
                .apply {
                    // Add language if provided
                    language?.let {
                        addFormDataPart("language", it)
                    }
                }
                .build()

            val request = Request.Builder()
                .url("$baseUrl/api/speech/speech/transcribe/")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            // Execute request
            val response = withContext(Dispatchers.IO) {
                httpClient.newCall(request).execute()
            }

            // Clean up
            tempFile.delete()

            // Process response
            if (response.isSuccessful) {
                val responseBody = response.body?.string() ?: ""
                Log.d("WhisperApiClient", "Response from server: $responseBody")

                val jsonObject = JSONObject(responseBody)
                if (jsonObject.optBoolean("success", false)) {
                    val text = jsonObject.optString("text", "")
                    Log.d("WhisperApiClient", "Transcription successful: $text")
                    Result.success(text)
                } else {
                    val errorMessage = jsonObject.optString("error", "Unknown error")
                    Log.e("WhisperApiClient", "Transcription failed: $errorMessage")
                    Result.failure(Exception(errorMessage))
                }
            } else {
                val errorBody = response.body?.string() ?: "No response body"
                Log.e("WhisperApiClient", "API request failed with code: ${response.code}, error: $errorBody")
                Result.failure(Exception("API request failed with code: ${response.code}"))
            }
        } catch (e: Exception) {
            Log.e("WhisperApiClient", "Exception during transcription", e)
            Result.failure(e)
        }
    }

    suspend fun transcribeAudio(audioFile: File, language: String? = null): Result<String> {
        return transcribeAudioBytes(audioFile.readBytes(), language)
    }
}