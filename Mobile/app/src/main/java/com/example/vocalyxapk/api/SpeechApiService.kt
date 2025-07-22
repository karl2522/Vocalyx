package com.example.vocalyxapk.api

import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import java.util.concurrent.TimeUnit

data class TranscriptionResponse(
    val text: String,
    val success: Boolean,
    val error: String? = null
)

interface SpeechApiService {
    @Multipart
    @POST("api/speech/speech/transcribe/")
    suspend fun transcribeAudio(
        @Part audioFile: MultipartBody.Part,
        @Part("language") language: MultipartBody.Part? = null
    ): Response<TranscriptionResponse>
}

object SpeechApiServiceFactory {
    fun create(baseUrl: String): SpeechApiService {
        val client = OkHttpClient.Builder()
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        return retrofit.create(SpeechApiService::class.java)
    }
}