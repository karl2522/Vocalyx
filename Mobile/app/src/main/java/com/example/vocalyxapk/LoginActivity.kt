package com.example.vocalyxapk

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme

class LoginActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            VOCALYXAPKTheme {
                LoginScreen()
            }
        }
    }
}
