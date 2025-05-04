package com.example.vocalyxapk

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.animation.AnimationUtils
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.progressindicator.CircularProgressIndicator

class SplashScreenActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_splash_screen)

        // Initialize views
        val logoImage = findViewById<ImageView>(R.id.logo_image)
        val appName = findViewById<TextView>(R.id.app_name)
        val tagline = findViewById<TextView>(R.id.tagline)
        val loadingIndicator = findViewById<CircularProgressIndicator>(R.id.loading_indicator)
        val getStartedButton = findViewById<Button>(R.id.get_started_button)

        // Load animations
        val bounceAnimation = AnimationUtils.loadAnimation(this, R.anim.bounce)
        val fadeInAnimation = AnimationUtils.loadAnimation(this, R.anim.fade_in)

        // Start animations
        logoImage.startAnimation(bounceAnimation)
        appName.startAnimation(fadeInAnimation)

        // Show tagline with delay
        Handler(Looper.getMainLooper()).postDelayed({
            tagline.alpha = 0f
            tagline.animate()
                .alpha(1f)
                .setDuration(1000)
                .start()
        }, 1000)

        // Show loading indicator
        loadingIndicator.show()

        // Auto-transition after 3 seconds
        Handler(Looper.getMainLooper()).postDelayed({
            loadingIndicator.hide()
            getStartedButton.alpha = 0f
            getStartedButton.animate()
                .alpha(1f)
                .setDuration(500)
                .start()
        }, 3000)

        // Set click listener for Get Started button
        getStartedButton.setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }
    }
}