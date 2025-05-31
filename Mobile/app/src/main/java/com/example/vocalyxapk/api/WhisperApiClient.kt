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
    private val baseUrl = "http://192.168.254.106:8000"

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

    // 🎯 ENHANCED: Transcribe audio bytes with optional student names
    suspend fun transcribeAudioBytes(
        audioBytes: ByteArray,
        language: String? = null,
        studentNames: List<String>? = null
    ): Result<String> {
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

                    // 🎯 NEW: Add student names if provided
                    studentNames?.let { names ->
                        val namesJson = names.joinToString(",")
                        addFormDataPart("student_names", namesJson)
                        Log.d("WhisperApiClient", "Added student names: $namesJson")
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

                    // 🎯 NEW: Log additional response data for debugging
                    val confidence = jsonObject.optDouble("confidence", 0.0)
                    Log.d("WhisperApiClient", "Transcription successful: '$text' (confidence: $confidence)")

                    // Log alternatives if available
                    if (jsonObject.has("alternatives")) {
                        val alternatives = jsonObject.getJSONArray("alternatives")
                        Log.d("WhisperApiClient", "Available alternatives: ${alternatives.length()}")
                        for (i in 0 until alternatives.length()) {
                            val alt = alternatives.getJSONObject(i)
                            val altText = alt.optString("transcript", "")
                            val altConf = alt.optDouble("confidence", 0.0)
                            Log.d("WhisperApiClient", "  Alternative $i: '$altText' (confidence: $altConf)")
                        }
                    }

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

    // 🎯 ENHANCED: Transcribe audio file with optional student names
    suspend fun transcribeAudio(
        audioFile: File,
        language: String? = null,
        studentNames: List<String>? = null
    ): Result<String> {
        return transcribeAudioBytes(audioFile.readBytes(), language, studentNames)
    }
}