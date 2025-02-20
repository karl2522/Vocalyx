package com.example.vocalyxapk

import android.content.Intent
import android.os.Bundle
import android.text.SpannableString
import android.text.Spanned
import android.text.method.LinkMovementMethod
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import android.text.style.ClickableSpan
import android.view.View

class LoginActivity : AppCompatActivity() {
    private lateinit var emailInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var loginButton: Button
    private lateinit var googleButton: Button
    private lateinit var microsoftButton: Button
    private lateinit var signupLink: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_login)

        // Initialize views
        emailInput = findViewById(R.id.email_input)
        passwordInput = findViewById(R.id.password_input)
        loginButton = findViewById(R.id.login_button)
        googleButton = findViewById(R.id.google_btn)
        microsoftButton = findViewById(R.id.microsoft_btn)
        signupLink = findViewById(R.id.signup_link)

        // Set hints
        emailInput.hint = "Email"
        passwordInput.hint = "Password"

        // Set text colors
        val textColor = resources.getColor(android.R.color.black, theme)
        val hintColor = resources.getColor(android.R.color.darker_gray, theme)
        
        emailInput.setHintTextColor(hintColor)
        passwordInput.setHintTextColor(hintColor)
        emailInput.setTextColor(textColor)
        passwordInput.setTextColor(textColor)

        // Click listeners
        loginButton.setOnClickListener {
            when {
                emailInput.text.isEmpty() -> emailInput.error = "Email is required"
                !android.util.Patterns.EMAIL_ADDRESS.matcher(emailInput.text).matches() -> 
                    emailInput.error = "Please enter a valid email"
                passwordInput.text.isEmpty() -> passwordInput.error = "Password is required"
                else -> {
                    // Proceed with login
                    Toast.makeText(this, "Login clicked", Toast.LENGTH_SHORT).show()
                    // Add your login logic here
                }
            }
        }

        googleButton.setOnClickListener {
            try {
                // Google login implementation
                Toast.makeText(this, "Google login clicked", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, "Google login failed", Toast.LENGTH_SHORT).show()
            }
        }

        microsoftButton.setOnClickListener {
            try {
                // Microsoft login implementation
                Toast.makeText(this, "Microsoft login clicked", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, "Microsoft login failed", Toast.LENGTH_SHORT).show()
            }
        }

        // Make signup link clickable
        val signupText = "Don't have an account? Create an Account"
        val spannableString = SpannableString(signupText)
        val clickableSpan = object : ClickableSpan() {
            override fun onClick(widget: View) {
                startActivity(Intent(this@LoginActivity, SignUpActivity::class.java))
                finish()
            }

            override fun updateDrawState(ds: android.text.TextPaint) {
                super.updateDrawState(ds)
                ds.color = resources.getColor(R.color.button_primary, theme)
                ds.isUnderlineText = false
            }
        }
        spannableString.setSpan(clickableSpan, signupText.indexOf("Create an Account"), signupText.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        signupLink.text = spannableString
        signupLink.movementMethod = LinkMovementMethod.getInstance()

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }
}
