package com.example.vocalyxapk

import android.app.Application
import com.example.vocalyxapk.api.RetrofitClient

class VocalyxApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Initialize RetrofitClient with application context
        RetrofitClient.initialize(applicationContext)
    }
}
