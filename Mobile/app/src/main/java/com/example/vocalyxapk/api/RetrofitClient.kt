package com.example.vocalyxapk.api

import android.annotation.SuppressLint
import android.content.Context
import com.example.vocalyxapk.utils.TokenManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import okhttp3.Interceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

@SuppressLint("StaticFieldLeak")
object RetrofitClient {
    private const val BASE_URL = "http://10.0.191.212:8000/"
    private var context: Context? = null

    fun initialize(context: Context) {
        this.context = context.applicationContext
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val authInterceptor = Interceptor { chain ->
        val request = chain.request()
        context?.let { ctx ->
            TokenManager.getToken(ctx)?.let { token ->
                val authenticatedRequest = request.newBuilder()
                    .header("Authorization", "Bearer $token")
                    .build()
                return@Interceptor chain.proceed(authenticatedRequest)
            }
        }
        chain.proceed(request)
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .addInterceptor(authInterceptor)
        // Add timeout settings
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val apiService: ApiService = retrofit.create(ApiService::class.java)
}