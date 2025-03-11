package com.example.vocalyxapk.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class LoginUIState {
    object Idle : LoginUIState()
    object Loading : LoginUIState()
    data class Success(val message: String) : LoginUIState()
    data class Error(val message: String) : LoginUIState()
}

class LoginViewModel(application: Application) : AndroidViewModel(application) {
    private val authRepository = AuthRepository(application)

    private val _uiState = MutableStateFlow<LoginUIState>(LoginUIState.Idle)
    val uiState: StateFlow<LoginUIState> = _uiState

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = LoginUIState.Loading

            try {
                val result = authRepository.login(email, password)
                result.fold(
                    onSuccess = {
                        _uiState.value = LoginUIState.Success("Login successful")
                    },
                    onFailure = { exception ->
                        _uiState.value = LoginUIState.Error(exception.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                _uiState.value = LoginUIState.Error(e.message ?: "Unknown error")
            }
        }
    }
}