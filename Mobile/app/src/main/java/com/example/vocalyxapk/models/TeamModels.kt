package com.example.vocalyxapk.models

import com.google.gson.annotations.SerializedName

// Team-related data classes
data class TeamItem(
    val id: Int,
    val name: String,
    val code: String,
    val description: String?,
    val owner: Int,
    val created_at: String,
    val updated_at: String,
    val members: List<TeamMemberItem> = emptyList(),
    val team_courses: List<TeamCourseItem> = emptyList(),
    val owner_details: UserItem? = null
)

data class TeamMemberItem(
    val id: Int,
    val user: Int?,
    val team: Int,
    val role: String, // "owner", "admin", "member", "invited"
    val permissions: String, // "view", "edit", "full"
    val is_active: Boolean,
    val joined_at: String,
    val user_details: UserItem? = null,
    val name: String? = null,
    val invitation_email: String? = null
)

data class TeamCourseItem(
    val id: Int,
    val team: Int,
    val course: Int,
    val added_by: Int?,
    val added_at: String,
    val course_details: CourseItem? = null
)

data class UserItem(
    val id: String,
    val email: String,
    val first_name: String? = null,
    val last_name: String? = null,
    val name: String? = null,
    val profile_picture: String? = null
)

data class TeamInvitationItem(
    val id: Int,
    val team: Int,
    val email: String,
    val inviter: Int,
    val created_at: String,
    val accepted: Boolean,
    val accepted_at: String?,
    val inviter_name: String? = null,
    val team_name: String? = null
)

// Request models
data class CreateTeamRequest(
    val name: String,
    val description: String? = null,
    val members: List<String> = emptyList(),
    val courses: List<Int> = emptyList()
)

data class JoinTeamRequest(
    val code: String
)

data class AddMemberRequest(
    val email: String,
    val permissions: String = "view"
)

data class RemoveMemberRequest(
    val member_id: Int
)

data class UpdateMemberPermissionsRequest(
    val member_id: Int,
    val permissions: String
)

data class AddCourseRequest(
    val course_id: Int
)

data class RemoveCourseRequest(
    val course_id: Int
)