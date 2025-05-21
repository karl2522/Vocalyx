package com.example.vocalyxapk.models

import com.google.gson.annotations.SerializedName

data class ClassResponse(
    val count: Int,
    val next: String?,
    val previous: String?,
    val results: List<ClassItem>
)

data class ClassItem(
    val id: Int,
    val name: String,
    val description: String?,
    val semester: String?,
    val student_count: Int?,
    val status: String,
    val created_at: String,
    val updated_at: String,
    val recordings_count: Int?,
    @SerializedName("course_id") val courseId: Int?,
    val section: String?,
    val schedule: String?,
    val last_updated: String?
)

data class CourseResponse(
    val count: Int,
    val next: String?,
    val previous: String?,
    val results: List<CourseItem>
)

data class CourseItem(
    val id: Int,
    val name: String,
    val courseCode: String,
    val description: String?,
    val semester: String,
    val academic_year: String?,
    val status: String,
    val created_at: String,
    val updated_at: String,
    val classes_count: Int,
    val student_count: Int,
    val accessLevel: String
)

data class CourseUpdateRequest(
    val name: String? = null,
    val courseCode: String? = null,
    val semester: String? = null,
    val academic_year: String? = null,
    val description: String? = null,
    val status: String? = null
)

data class ClassUpdateRequest(
    val name: String? = null,
    val section: String? = null,
    val description: String? = null,
    val semester: String? = null,
    val schedule: String? = null,
    val status: String? = null
)
