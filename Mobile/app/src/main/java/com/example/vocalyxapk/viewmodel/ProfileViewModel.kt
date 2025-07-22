package com.example.vocalyxapk.viewmodel

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.models.UpdateProfileRequest
import com.example.vocalyxapk.models.UserProfile
import com.example.vocalyxapk.repository.ProfileRepository
import com.example.vocalyxapk.utils.TokenManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ProfileUiState(
    val isLoading: Boolean = false,
    val profile: UserProfile? = null,
    val isEditing: Boolean = false,
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val activeTab: ProfileTab = ProfileTab.PROFILE,
    val successMessage: String? = null
)

enum class ProfileTab {
    PROFILE, ACCOUNT
}

data class ProfileFormData(
    val firstName: String = "",
    val lastName: String = "",
    val email: String = "",
    val institution: String = "Cebu Institute of Technology - University",
    val position: String = "Teacher/Instructor",
    val bio: String = ""
)

class ProfileViewModel : ViewModel() {
    private val profileRepository = ProfileRepository()

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    var formData by mutableStateOf(ProfileFormData())
        private set

    private var context: Context? = null

    fun initialize(context: Context) {
        this.context = context
        loadProfile()
    }

    private fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            // First try to get from local storage
            context?.let { ctx ->
                val localProfile = getLocalProfile(ctx)
                if (localProfile != null) {
                    updateProfileData(localProfile)
                }
            }

            // Then fetch from API
            try {
                val result = profileRepository.getProfile()
                if (result.isSuccess) {
                    val profile = result.getOrNull()!!
                    updateProfileData(profile)

                    // Update local storage
                    context?.let { ctx ->
                        saveLocalProfile(ctx, profile)
                    }
                } else {
                    _uiState.value = _uiState.value.copy(
                        error = result.exceptionOrNull()?.message ?: "Failed to load profile"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Unknown error occurred"
                )
            } finally {
                _uiState.value = _uiState.value.copy(isLoading = false)
            }
        }
    }

    private fun updateProfileData(profile: UserProfile) {
        _uiState.value = _uiState.value.copy(profile = profile)
        formData = ProfileFormData(
            firstName = profile.first_name,
            lastName = profile.last_name,
            email = profile.email,
            institution = profile.institution,
            position = profile.position,
            bio = profile.bio ?: ""
        )
    }

    private fun getLocalProfile(context: Context): UserProfile? {
        return try {
            // Get from TokenManager or SharedPreferences
            val userId = TokenManager.getUserId(context)
            val email = TokenManager.getUserEmail(context)
            val firstName = TokenManager.getFirstName(context)
            val lastName = TokenManager.getLastName(context)

            if (userId != null && email != null) {
                UserProfile(
                    id = userId,
                    email = email,
                    first_name = firstName ?: "",
                    last_name = lastName ?: "",
                    institution = "Cebu Institute of Technology - University",
                    position = "Teacher/Instructor",
                    bio = null,
                    profile_picture = null,
                    has_google = false,
                    has_microsoft = false,
                    google_id = null,
                    microsoft_id = null,
                    email_verified = true,
                    created_at = "",
                    updated_at = ""
                )
            } else null
        } catch (e: Exception) {
            null
        }
    }

    private fun saveLocalProfile(context: Context, profile: UserProfile) {
        // Update TokenManager with new profile data
        TokenManager.saveUserInfo(
            context,
            profile.id,
            profile.email,
            profile.first_name,
            profile.last_name
        )
    }

    fun updateFormField(field: String, value: String) {
        formData = when (field) {
            "firstName" -> formData.copy(firstName = value)
            "lastName" -> formData.copy(lastName = value)
            "institution" -> formData.copy(institution = value)
            "position" -> formData.copy(position = value)
            "bio" -> formData.copy(bio = value)
            else -> formData
        }
    }

    fun setEditing(editing: Boolean) {
        _uiState.value = _uiState.value.copy(isEditing = editing)
        if (!editing) {
            // Reset form data to current profile
            _uiState.value.profile?.let { profile ->
                updateProfileData(profile)
            }
        }
    }

    fun setActiveTab(tab: ProfileTab) {
        _uiState.value = _uiState.value.copy(activeTab = tab)
    }

    fun submitProfile() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, error = null)

            try {
                val updateRequest = UpdateProfileRequest(
                    first_name = formData.firstName,
                    last_name = formData.lastName,
                    institution = formData.institution,
                    position = formData.position,
                    bio = formData.bio.takeIf { it.isNotBlank() }
                )

                val result = profileRepository.updateProfile(updateRequest)
                if (result.isSuccess) {
                    val updatedProfile = result.getOrNull()!!
                    updateProfileData(updatedProfile)

                    // Update local storage
                    context?.let { ctx ->
                        saveLocalProfile(ctx, updatedProfile)
                    }

                    _uiState.value = _uiState.value.copy(
                        isEditing = false,
                        successMessage = "Profile updated successfully"
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        error = result.exceptionOrNull()?.message ?: "Failed to update profile"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Unknown error occurred"
                )
            } finally {
                _uiState.value = _uiState.value.copy(isSubmitting = false)
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(error = null, successMessage = null)
    }

    fun refreshProfile() {
        loadProfile()
    }
}