package com.example.vocalyxapk

import android.content.Intent
import android.os.Bundle
import android.text.SpannableString
import android.text.Spanned
import android.text.method.LinkMovementMethod
import android.text.style.ClickableSpan
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class SignUpActivity : AppCompatActivity() {
    private lateinit var firstNameInput: EditText
    private lateinit var lastNameInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var confirmPasswordInput: EditText
    private lateinit var signUpButton: Button
    private lateinit var loginLink: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_sign_up)

        // UI elements
        firstNameInput = findViewById(R.id.firstname_input)
        lastNameInput = findViewById(R.id.lastname_input)
        emailInput = findViewById(R.id.email_input)
        passwordInput = findViewById(R.id.password_input)
        confirmPasswordInput = findViewById(R.id.confirm_password_input)
        signUpButton = findViewById(R.id.signup_button)
        loginLink = findViewById(R.id.login_link)

        // Set hints for EditText fields
        firstNameInput.hint = "First Name"
        lastNameInput.hint = "Last Name"
        emailInput.hint = "Email"
        passwordInput.hint = "Password"
        confirmPasswordInput.hint = "Confirm Password"

        // Set text colors for hints and input
        val textColor = resources.getColor(android.R.color.black, theme)
        val hintColor = resources.getColor(android.R.color.darker_gray, theme)
        
        firstNameInput.setHintTextColor(hintColor)
        lastNameInput.setHintTextColor(hintColor)
        emailInput.setHintTextColor(hintColor)
        passwordInput.setHintTextColor(hintColor)
        confirmPasswordInput.setHintTextColor(hintColor)

        firstNameInput.setTextColor(textColor)
        lastNameInput.setTextColor(textColor)
        emailInput.setTextColor(textColor)
        passwordInput.setTextColor(textColor)
        confirmPasswordInput.setTextColor(textColor)

        // Make the "Sign in" part of the text clickable
        val signInText = "Already have an account? Sign in"
        val spannableString = SpannableString(signInText)
        val clickableSpan = object : ClickableSpan() {
            override fun onClick(widget: View) {
                startActivity(Intent(this@SignUpActivity, LoginActivity::class.java))
                finish()
            }

            override fun updateDrawState(ds: android.text.TextPaint) {
                super.updateDrawState(ds)
                ds.color = resources.getColor(R.color.button_primary, theme)
                ds.isUnderlineText = false
            }
        }
        spannableString.setSpan(clickableSpan, signInText.indexOf("Sign in"), signInText.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        loginLink.text = spannableString
        loginLink.movementMethod = LinkMovementMethod.getInstance()

        signUpButton.setOnClickListener {
            when {
                firstNameInput.text.isEmpty() -> firstNameInput.error = "First name is required"
                lastNameInput.text.isEmpty() -> lastNameInput.error = "Last name is required"
                emailInput.text.isEmpty() -> emailInput.error = "Email is required"
                !android.util.Patterns.EMAIL_ADDRESS.matcher(emailInput.text).matches() -> 
                    emailInput.error = "Please enter a valid email"
                passwordInput.text.isEmpty() -> passwordInput.error = "Password is required"
                confirmPasswordInput.text.isEmpty() -> confirmPasswordInput.error = "Please confirm your password"
                passwordInput.text.toString() != confirmPasswordInput.text.toString() -> {
                    passwordInput.error = "Passwords do not match"
                    confirmPasswordInput.error = "Passwords do not match"
                }
                else -> {
                    startActivity(Intent(this@SignUpActivity, MainActivity::class.java))
                    finish()
                }
            }
        }

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }
}