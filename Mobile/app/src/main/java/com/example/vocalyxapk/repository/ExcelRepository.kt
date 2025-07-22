package com.example.vocalyxapk.repository

import android.util.Log
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
            Log.d("ExcelRepository", "=== FETCHING EXCEL FILES ===")
            Log.d("ExcelRepository", "Class ID: $classId")
            
            val response = apiService.getExcelFiles(classId)
            Log.d("ExcelRepository", "API response successful: ${response.isSuccessful}")
            Log.d("ExcelRepository", "Response code: ${response.code()}")
            
            if (response.isSuccessful && response.body() != null) {
                val excelFiles = response.body()!!
                Log.d("ExcelRepository", "Received ${excelFiles.size} Excel files")
                
                // Debug each file
                excelFiles.forEachIndexed { index, file ->
                    Log.d("ExcelRepository", "File $index: ${file.file_name}")
                    Log.d("ExcelRepository", "  Sheets: ${file.sheet_names}")
                    Log.d("ExcelRepository", "  All sheets keys: ${file.all_sheets.keys}")
                    
                    // Check for exam columns in each sheet
                    file.sheet_names.forEach { sheetName ->
                        val sheetContent = file.getSheetContent(sheetName)
                        if (sheetContent != null) {
                            val examColumns = sheetContent.headers.filter { header ->
                                val lowerHeader = header.lowercase()
                                listOf("prelim", "midterm", "prefinal", "pre-final", "final", "finals", "exam", "examination", "test").any { keyword ->
                                    lowerHeader.contains(keyword)
                                }
                            }
                            Log.d("ExcelRepository", "  Sheet '$sheetName' exam columns: $examColumns")
                        }
                    }
                }
                
                // The API returns a direct list, not a paginated response
                Result.success(excelFiles)
            } else {
                val errorMsg = "Failed to fetch Excel files: ${response.message()}"
                Log.e("ExcelRepository", errorMsg)
                Log.e("ExcelRepository", "Response body: ${response.errorBody()?.string()}")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e("ExcelRepository", "Exception fetching Excel files", e)
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

    suspend fun updateExcelData(excelId: Int, sheetName: String, data: List<Map<String, Any?>>, headers: List<String>? = null): Result<Boolean> =
        withContext(Dispatchers.IO) {
            try {
                Log.d("ExcelRepository", "Updating excel data: fileId=$excelId, sheet=$sheetName, records=${data.size}")

                // Create a new list of maps with String values only
                val sanitizedData = data.map { row ->
                    row.mapValues { (_, value) ->
                        value?.toString() ?: ""  // Convert everything to String
                    }
                }

                // Create the request with String-based values
                val requestBody = HashMap<String, Any>()
                requestBody["sheet_name"] = sheetName
                requestBody["sheet_data"] = sanitizedData
                
                // Include headers if provided
                if (headers != null) {
                    requestBody["headers"] = headers
                    Log.d("ExcelRepository", "Including headers in request: $headers")
                }

                val response = apiService.updateExcelData(excelId, requestBody)
                if (response.isSuccessful) {
                    Log.d("ExcelRepository", "Excel data updated successfully")
                    Result.success(true)
                } else {
                    val errorMsg = response.errorBody()?.string() ?: response.message()
                    Log.e("ExcelRepository", "Failed to update Excel data: $errorMsg")
                    Result.failure(Exception("Failed to update Excel data: $errorMsg"))
                }
            } catch (e: Exception) {
                Log.e("ExcelRepository", "Exception updating Excel data", e)
                Result.failure(e)
            }
        }
}
