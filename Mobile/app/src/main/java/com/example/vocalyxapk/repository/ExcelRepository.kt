package com.example.vocalyxapk.repository

import com.example.vocalyxapk.api.RetrofitClient
import com.example.vocalyxapk.models.ExcelFileItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File


class ExcelRepository {
    private val apiService = RetrofitClient.apiService

    suspend fun getExcelFiles(classId: Int): Result<List<ExcelFileItem>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getExcelFiles(classId)
            if (response.isSuccessful && response.body() != null) {
                // The API returns a direct list, not a paginated response
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch Excel files: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun uploadExcelFile(file: File, classId: Int): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            // Prepare file part
            val requestFile = file.asRequestBody("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".toMediaTypeOrNull())
            val filePart = MultipartBody.Part.createFormData("file", file.name, requestFile)
            
            // Prepare class_id part
            val classIdPart = classId.toString().toRequestBody("text/plain".toMediaTypeOrNull())
            
            val response = apiService.uploadExcelFile(filePart, classIdPart)
            if (response.isSuccessful) {
                Result.success(true)
            } else {
                Result.failure(Exception("Failed to upload Excel file: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteExcelFile(excelId: Int): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.deleteExcelFile(excelId)
            if (response.isSuccessful) {
                Result.success(true)
            } else {
                Result.failure(Exception("Failed to delete Excel file: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateExcelData(excelId: Int, sheetName: String, data: List<Map<String, String>>): Result<Boolean> =
        withContext(Dispatchers.IO) {
            try {
                val requestBody = mapOf(
                    "sheet_name" to sheetName,
                    "sheet_data" to data
                )

                val response = apiService.updateExcelData(excelId, requestBody)
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    Result.failure(Exception("Failed to update Excel data: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
}
