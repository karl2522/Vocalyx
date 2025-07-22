package com.example.vocalyxapk.models

import com.google.gson.annotations.SerializedName

data class GetProfileResponse(
    val user: UserProfile
)

// Make sure your UserProfile is complete
data class UserProfile(
    val id: String,
    val email: String,
    val first_name: String,
    val last_name: String,
    val institution: String,
    val position: String,
    val bio: String?,
    val profile_picture: String?,
    val has_google: Boolean,
    val has_microsoft: Boolean,
    val google_id: String?,
    val microsoft_id: String?,
    val email_verified: Boolean,
    val created_at: String,
    val updated_at: String
) {
    val fullName: String
        get() = "$first_name $last_name".trim()
}

// For UPDATE requests
data class UpdateProfileRequest(
    val first_name: String,
    val last_name: String,
    val institution: String,
    val position: String,
    val bio: String?
)

data class UpdateProfileResponse(
    val user: UserProfile
)