package com.example.vocalyxapk.repository

import com.example.vocalyxapk.api.RetrofitClient
import com.example.vocalyxapk.models.CourseItem
import com.example.vocalyxapk.models.ClassItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class CourseRepository {
    private val apiService = RetrofitClient.apiService

    suspend fun getCourses(): Result<List<CourseItem>> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getCourses()
                if (response.isSuccessful) {
                    Result.success(response.body() ?: emptyList())
                } else {
                    Result.failure(Exception("Failed to fetch courses: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun getClasses(courseId: Int? = null): Result<List<ClassItem>> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getClasses(courseId)
                if (response.isSuccessful) {
                    Result.success(response.body() ?: emptyList())
                } else {
                    Result.failure(Exception("Failed to fetch classes: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun getAllClasses(): Result<List<ClassItem>> {
        return getClasses(null)
    }

    suspend fun createCourse(courseRequest: com.example.vocalyxapk.models.CourseCreateRequest): Result<CourseItem> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.createCourse(courseRequest)
                if (response.isSuccessful) {
                    response.body()?.let { course ->
                        Result.success(course)
                    } ?: Result.failure(Exception("Empty response body"))
                } else {
                    Result.failure(Exception("Failed to create course: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun deleteCourse(courseId: Int): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.deleteCourse(courseId)
                if (response.isSuccessful) {
                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Failed to delete course: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun updateCourse(courseId: Int, courseRequest: com.example.vocalyxapk.models.CourseUpdateRequest): Result<CourseItem> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.updateCourse(courseId, courseRequest)
                if (response.isSuccessful) {
                    response.body()?.let { course ->
                        Result.success(course)
                    } ?: Result.failure(Exception("Empty response body"))
                } else {
                    Result.failure(Exception("Failed to update course: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}