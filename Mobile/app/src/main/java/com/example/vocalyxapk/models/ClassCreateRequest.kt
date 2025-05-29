package com.example.vocalyxapk.models

import com.google.gson.annotations.SerializedName

data class ClassCreateRequest(
    val name: String,
    val description: String? = null,
    val semester: String? = null,
    val section: String? = null,
    val schedule: String? = null,
    @SerializedName("course_id") val courseId: Int,
    @SerializedName("student_count") val studentCount: Int? = null
)
