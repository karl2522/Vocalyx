package com.example.vocalyxapk

import android.app.Application
import com.example.vocalyxapk.api.RetrofitClient

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        RetrofitClient.initialize(this)
    }
}