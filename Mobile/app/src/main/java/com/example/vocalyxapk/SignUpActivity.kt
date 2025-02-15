package com.example.vocalyxapk

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class SignUpActivity : AppCompatActivity() {
    private lateinit var fullNameInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var usernameInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var confirmPasswordInput: EditText
    private lateinit var signUpButton: Button
    private lateinit var loginLink: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_sign_up)

        // UI elements
        fullNameInput = findViewById(R.id.fullname_input)
        emailInput = findViewById(R.id.email_input)
        usernameInput = findViewById(R.id.username_input)
        passwordInput = findViewById(R.id.password_input)
        confirmPasswordInput = findViewById(R.id.confirm_password_input)
        signUpButton = findViewById(R.id.signup_button)
        loginLink = findViewById(R.id.login_link)

        //click listeners
        loginLink.setOnClickListener {
            // Navigates back to login screen
            startActivity(Intent(this, LoginActivity::class.java))
            finish() // Closes the signup activity
        }

        signUpButton.setOnClickListener {
            Toast.makeText(this, "To be implemented", Toast.LENGTH_SHORT).show()
            
            // For future implementation:
            val fullName = fullNameInput.text.toString()
            val email = emailInput.text.toString()
            val username = usernameInput.text.toString()
            val password = passwordInput.text.toString()
            val confirmPassword = confirmPasswordInput.text.toString()

            // Logic To Be Implemented
        }

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }
}