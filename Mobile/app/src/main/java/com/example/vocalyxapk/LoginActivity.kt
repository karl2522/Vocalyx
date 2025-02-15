package com.example.vocalyxapk

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class LoginActivity : AppCompatActivity() {
    private lateinit var usernameInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var loginButton: Button
    private lateinit var githubButton: ImageView
    private lateinit var linkedinButton: ImageView
    private lateinit var signupLink: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_login)

        // Initialize views
        usernameInput = findViewById(R.id.username_input)
        passwordInput = findViewById(R.id.password_input)
        loginButton = findViewById(R.id.login_btn)
        githubButton = findViewById(R.id.github_btn)
        linkedinButton = findViewById(R.id.linkedin_btn)
        signupLink = findViewById(R.id.signup_link)

        // Click listeners
        loginButton.setOnClickListener {
            Toast.makeText(this, "To be implemented", Toast.LENGTH_SHORT).show()
        }

        githubButton.setOnClickListener {
            Toast.makeText(this, "To be implemented", Toast.LENGTH_SHORT).show()
        }

        linkedinButton.setOnClickListener {
            Toast.makeText(this, "To be implemented", Toast.LENGTH_SHORT).show()
        }

        signupLink.setOnClickListener {
            startActivity(Intent(this, SignUpActivity::class.java))
        }

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }
}
