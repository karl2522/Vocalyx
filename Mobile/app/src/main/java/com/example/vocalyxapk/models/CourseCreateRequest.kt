package com.example.vocalyxapk.models

data class CourseCreateRequest(
    val name: String,
    val courseCode: String,
    val description: String? = null,
    val semester: String,
    val academic_year: String? = null
)
