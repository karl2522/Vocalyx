package com.example.vocalyxapk.api

import com.example.vocalyxapk.models.AuthResponse
import com.example.vocalyxapk.models.ClassCreateRequest
import com.example.vocalyxapk.models.ClassItem
import com.example.vocalyxapk.models.ClassResponse
import com.example.vocalyxapk.models.CourseCreateRequest
import com.example.vocalyxapk.models.CourseItem
import com.example.vocalyxapk.models.CourseResponse
import com.example.vocalyxapk.models.ExcelFileItem
import com.example.vocalyxapk.models.ExcelUploadResponse
import com.example.vocalyxapk.models.FirebaseAuthRequest
import com.example.vocalyxapk.models.LoginRequest
import com.example.vocalyxapk.models.LoginResponse
import com.example.vocalyxapk.models.MicrosoftAuthRequest
import com.example.vocalyxapk.models.RegisterRequest
import com.example.vocalyxapk.models.RegisterResponse
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    @POST("api/login/")
    suspend fun login(@Body loginRequest: LoginRequest): Response<LoginResponse>

    @POST("api/register/")
    suspend fun register(@Body registerRequest: RegisterRequest): Response<RegisterResponse>

    @POST("api/logout/")
    suspend fun logout(@Body refreshToken: Map<String, String>): Response<Map<String, String>>

    @POST("api/firebase-auth/")
    suspend fun firebaseAuth(@Body request: FirebaseAuthRequest): Response<AuthResponse>

    @POST("api/auth/microsoft/")
    suspend fun microsoftAuth(@Body request: MicrosoftAuthRequest): Response<AuthResponse>
    
    @GET("api/classes/")
    suspend fun getClasses(@Query("course_id") courseId: Int? = null): Response<List<ClassItem>>
    
    @GET("api/courses/")
    suspend fun getCourses(): Response<List<CourseItem>>
    
    @POST("api/courses/")
    suspend fun createCourse(@Body courseRequest: CourseCreateRequest): Response<CourseItem>
    
    @POST("api/classes/")
    suspend fun createClass(@Body classRequest: ClassCreateRequest): Response<ClassItem>
    
    @GET("api/excel/")
    suspend fun getExcelFiles(@Query("class_id") classId: Int): Response<List<ExcelFileItem>>
    
    @Multipart
    @POST("api/excel/upload/")
    suspend fun uploadExcelFile(
        @Part file: MultipartBody.Part,
        @Part("class_id") classId: RequestBody
    ): Response<ExcelUploadResponse>
    
    @DELETE("api/excel/{id}/")
    suspend fun deleteExcelFile(@Path("id") excelId: Int): Response<Map<String, String>>
}