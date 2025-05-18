package com.example.vocalyxapk.models

import com.google.gson.annotations.SerializedName

data class CourseCreateRequest(
    val name: String,
    val courseCode: String,  // The Django model expects this exact field name
    val description: String? = null,
    val semester: String,
    val academic_year: String? = null
)
