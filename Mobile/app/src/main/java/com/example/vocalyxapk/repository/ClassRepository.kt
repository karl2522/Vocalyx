package com.example.vocalyxapk.repository

import android.content.Context
import com.example.vocalyxapk.api.RetrofitClient
import com.example.vocalyxapk.models.ClassItem
import com.example.vocalyxapk.models.CourseItem

class ClassRepository(private val context: Context) {
    private val apiService = RetrofitClient.apiService

    suspend fun getClasses(courseId: Int? = null): Result<List<ClassItem>> {
        val tag = "ClassRepository"
        android.util.Log.d(tag, "getClasses called with courseId: $courseId")
        return try {
            android.util.Log.d(tag, "Making API call to get classes")
            val response = apiService.getClasses(courseId)
            android.util.Log.d(tag, "API call completed with status code: ${response.code()}")
            
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    android.util.Log.d(tag, "Got valid response with ${body.size} classes")
                    
                    // Apply client-side filtering if a course ID is provided
                    val filteredClasses = if (courseId != null) {
                        val filtered = body.filter { it.courseId == courseId }
                        android.util.Log.d(tag, "Filtered classes: ${filtered.size} out of ${body.size} match courseId: $courseId")
                        android.util.Log.d(tag, "Class IDs for courseId=$courseId: ${filtered.map { it.id }}")
                        filtered
                    } else {
                        body
                    }
                    
                    Result.success(filteredClasses)
                } else {
                    android.util.Log.e(tag, "Empty response body")
                    Result.failure(Exception("Empty response body"))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                android.util.Log.e(tag, "Error response: $errorBody")
                Result.failure(Exception(errorBody ?: "Unknown error with status code: ${response.code()}"))
            }
        } catch (e: Exception) {
            android.util.Log.e(tag, "Exception in getClasses", e)
            Result.failure(e)
        }
    }

    suspend fun getCourses(): Result<List<CourseItem>> {
        val tag = "ClassRepository"
        android.util.Log.d(tag, "getCourses called")
        return try {
            android.util.Log.d(tag, "Making API call to get courses")
            val response = apiService.getCourses()
            android.util.Log.d(tag, "API call for courses completed with status code: ${response.code()}")
            
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    android.util.Log.d(tag, "Got valid response with ${body.size} courses")
                    Result.success(body)
                } else {
                    android.util.Log.e(tag, "Empty response body for courses")
                    Result.failure(Exception("Empty response body"))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                android.util.Log.e(tag, "Error response for courses: $errorBody")
                Result.failure(Exception(errorBody ?: "Unknown error with status code: ${response.code()}"))
            }
        } catch (e: Exception) {
            android.util.Log.e(tag, "Exception in getCourses", e)
            Result.failure(e)
        }
    }
    
    suspend fun createCourse(name: String, courseCode: String, semester: String, description: String? = null, academicYear: String? = null): Result<CourseItem> {
        val tag = "ClassRepository"
        android.util.Log.d(tag, "createCourse called with name: $name, code: $courseCode")
        
        return try {
            val courseRequest = com.example.vocalyxapk.models.CourseCreateRequest(
                name = name,
                courseCode = courseCode,
                semester = semester,
                description = description,
                academic_year = academicYear
            )
            
            android.util.Log.d(tag, "Making API call to create course")
            val response = apiService.createCourse(courseRequest)
            android.util.Log.d(tag, "API call for course creation completed with status code: ${response.code()}")
            
            if (response.isSuccessful) {
                val course = response.body()
                if (course != null) {
                    android.util.Log.d(tag, "Course created successfully with id: ${course.id}")
                    Result.success(course)
                } else {
                    android.util.Log.e(tag, "Empty response body for course creation")
                    Result.failure(Exception("Empty response body"))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                android.util.Log.e(tag, "Error response for course creation: $errorBody")
                Result.failure(Exception(errorBody ?: "Unknown error with status code: ${response.code()}"))
            }
        } catch (e: Exception) {
            android.util.Log.e(tag, "Exception in createCourse", e)
            Result.failure(e)
        }
    }
    
    suspend fun createClass(name: String, courseId: Int, section: String? = null, description: String? = null, semester: String? = null, schedule: String? = null): Result<ClassItem> {
        val tag = "ClassRepository"
        android.util.Log.d(tag, "createClass called with name: $name, courseId: $courseId")
        
        return try {
            android.util.Log.d(tag, "Creating class with courseId: $courseId (this is the parent course ID)")
            val classRequest = com.example.vocalyxapk.models.ClassCreateRequest(
                name = name,
                courseId = courseId,  // This must be sent to backend as course_id
                section = section,
                description = description,
                semester = semester,
                schedule = schedule
            )
            
            android.util.Log.d(tag, "Making API call to create class")
            val response = apiService.createClass(classRequest)
            android.util.Log.d(tag, "API call for class creation completed with status code: ${response.code()}")
            
            if (response.isSuccessful) {
                val classItem = response.body()
                if (classItem != null) {
                    android.util.Log.d(tag, "Class created successfully with id: ${classItem.id}")
                    Result.success(classItem)
                } else {
                    android.util.Log.e(tag, "Empty response body for class creation")
                    Result.failure(Exception("Empty response body"))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                android.util.Log.e(tag, "Error response for class creation: $errorBody")
                Result.failure(Exception(errorBody ?: "Unknown error with status code: ${response.code()}"))
            }
        } catch (e: Exception) {
            android.util.Log.e(tag, "Exception in createClass", e)
            Result.failure(e)
        }
    }
}
