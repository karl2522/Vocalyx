package com.example.vocalyxapk.api

import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

data class WhisperResponse(
    val text: String,
    val task: String?,
    val language: String?,
    val duration: Double?
)

interface WhisperApiService {
    @Multipart
    @POST("v1/audio/transcriptions")
    suspend fun transcribeAudio(
        @Header("Authorization") authorization: String,
        @Part file: MultipartBody.Part,
        @Part("model") model: MultipartBody.Part,
        @Part("language") language: MultipartBody.Part? = null,
        @Part("response_format") responseFormat: MultipartBody.Part = MultipartBody.Part.createFormData("response_format", "json")
    ): Response<WhisperResponse>
}