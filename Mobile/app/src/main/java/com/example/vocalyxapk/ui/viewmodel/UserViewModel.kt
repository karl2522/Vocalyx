package com.example.vocalyxapk.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.data.AppDatabase
import com.example.vocalyxapk.data.entity.User
import com.example.vocalyxapk.data.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class UserViewModel(application: Application) : AndroidViewModel(application) {
    
    private val repository: UserRepository
    
    // Authentication state
    private val _loginState = MutableStateFlow<LoginState>(LoginState.Idle)
    val loginState: StateFlow<LoginState> = _loginState
    
    // Registration state
    private val _registrationState = MutableStateFlow<RegistrationState>(RegistrationState.Idle)
    val registrationState: StateFlow<RegistrationState> = _registrationState
    
    init {
        val userDao = AppDatabase.getDatabase(application).userDao()
        repository = UserRepository(userDao)
    }
    
    fun login(email: String, password: String) {
        viewModelScope.launch {
            _loginState.value = LoginState.Loading
            
            try {
                val user = repository.login(email, password)
                if (user != null) {
                    _loginState.value = LoginState.Success(user)
                } else {
                    _loginState.value = LoginState.Error("Invalid email or password")
                }
            } catch (e: Exception) {
                _loginState.value = LoginState.Error("Login failed: ${e.localizedMessage}")
            }
        }
    }
    
    fun register(firstName: String, lastName: String, email: String, password: String) {
        viewModelScope.launch {
            _registrationState.value = RegistrationState.Loading
            
            try {
                // Check if user already exists
                val existingUser = repository.getUserByEmail(email)
                if (existingUser != null) {
                    _registrationState.value = RegistrationState.Error("Email already registered")
                    return@launch
                }
                
                // Create new user
                val userId = repository.insertUser(
                    User(
                        firstName = firstName,
                        lastName = lastName,
                        email = email,
                        password = password
                    )
                )
                
                if (userId > 0) {
                    _registrationState.value = RegistrationState.Success
                } else {
                    _registrationState.value = RegistrationState.Error("Failed to register")
                }
            } catch (e: Exception) {
                _registrationState.value = RegistrationState.Error("Registration failed: ${e.localizedMessage}")
            }
        }
    }
    
    fun resetLoginState() {
        _loginState.value = LoginState.Idle
    }
    
    fun resetRegistrationState() {
        _registrationState.value = RegistrationState.Idle
    }
}

// Sealed classes for login state
sealed class LoginState {
    object Idle : LoginState()
    object Loading : LoginState()
    data class Success(val user: User) : LoginState()
    data class Error(val message: String) : LoginState()
}

// Sealed classes for registration state
sealed class RegistrationState {
    object Idle : RegistrationState()
    object Loading : RegistrationState()
    object Success : RegistrationState()
    data class Error(val message: String) : RegistrationState()
}
