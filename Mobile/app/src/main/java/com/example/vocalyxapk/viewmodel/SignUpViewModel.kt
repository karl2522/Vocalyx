package com.example.vocalyxapk.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class SignUpUIState {
    object Idle : SignUpUIState()
    object Loading : SignUpUIState()
    data class Success(val message: String) : SignUpUIState()
    data class Error(val message: String) : SignUpUIState()
}

class SignUpViewModel(application: Application) : AndroidViewModel(application) {
    private val authRepository = AuthRepository(application)

    private val _uiState = MutableStateFlow<SignUpUIState>(SignUpUIState.Idle)
    val uiState: StateFlow<SignUpUIState> = _uiState

    fun register(
        email: String,
        password: String,
        confirmPassword: String,
        firstName: String,
        lastName: String
    ) {
        viewModelScope.launch {
            _uiState.value = SignUpUIState.Loading

            try {
                val result = authRepository.register(
                    email = email,
                    password = password,
                    confirmPassword = confirmPassword,
                    firstName = firstName,
                    lastName = lastName
                )
                result.fold(
                    onSuccess = {
                        _uiState.value = SignUpUIState.Success("Registration successful")
                    },
                    onFailure = { exception ->
                        _uiState.value = SignUpUIState.Error(exception.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                _uiState.value = SignUpUIState.Error(e.message ?: "Unknown error")
            }
        }
    }
}