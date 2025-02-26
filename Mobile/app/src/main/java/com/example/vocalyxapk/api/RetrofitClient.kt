package com.example.vocalyxapk.api

import android.content.Context
import com.example.vocalyxapk.utils.TokenManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import okhttp3.Interceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    // TODO: Replace with your actual IP address
    private const val BASE_URL = "http://192.168.1.100:8080/"
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
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val apiService: ApiService = retrofit.create(ApiService::class.java)
}
