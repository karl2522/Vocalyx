package com.example.vocalyxapk.models

import com.google.gson.annotations.SerializedName

data class ExcelFileResponse(
    val count: Int,
    val next: String?,
    val previous: String?,
    val results: List<ExcelFileItem>
)

data class ExcelFileItem(
    val id: Int,
    val file_name: String,
    val uploaded_at: String,
    val all_sheets: Map<String, Any>,
    val active_sheet: String,
    val sheet_names: List<String>,
    val column_categories: Map<String, String>? = null,
    val update_count: Int? = null,
    @SerializedName("class_ref") val classId: Int?
) {
    // Helper method to safely get sheet content
    fun getSheetContent(sheetName: String): SheetContent? {
        val sheet = all_sheets[sheetName] ?: return null
        
        // Add debug logging
        android.util.Log.d("ExcelModels", "=== getSheetContent DEBUG ===")
        android.util.Log.d("ExcelModels", "Requested sheet: $sheetName")
        android.util.Log.d("ExcelModels", "Available sheets: ${all_sheets.keys}")
        android.util.Log.d("ExcelModels", "Sheet type: ${sheet.javaClass.simpleName}")
        
        // Skip sheets that are not regular data sheets (like category_mappings)
        if (sheet !is Map<*, *>) {
            android.util.Log.w("ExcelModels", "Sheet '$sheetName' is not a Map, skipping")
            return null
        }
        
        android.util.Log.d("ExcelModels", "Sheet keys: ${sheet.keys}")
        
        val data = try {
            @Suppress("UNCHECKED_CAST")
            (sheet["data"] as? List<Map<String, Any>>)?.map { row ->
                row.mapValues { it.value?.toString() ?: "" }
            } ?: emptyList()
        } catch (e: Exception) {
            // Log the error for debugging but don't crash
            android.util.Log.w("ExcelModels", "Error parsing sheet data: ${e.message}")
            android.util.Log.w("ExcelModels", "Sheet data type: ${sheet["data"]?.javaClass?.simpleName}")
            android.util.Log.w("ExcelModels", "Sheet data content: ${sheet["data"]}")
            emptyList()
        }
        
        val headers = try {
            @Suppress("UNCHECKED_CAST")
            (sheet["headers"] as? List<String>) ?: emptyList()
        } catch (e: Exception) {
            // Log the error for debugging but don't crash
            android.util.Log.w("ExcelModels", "Error parsing sheet headers: ${e.message}")
            android.util.Log.w("ExcelModels", "Sheet headers type: ${sheet["headers"]?.javaClass?.simpleName}")
            android.util.Log.w("ExcelModels", "Sheet headers content: ${sheet["headers"]}")
            emptyList()
        }
        
        android.util.Log.d("ExcelModels", "Parsed headers (${headers.size}): $headers")
        android.util.Log.d("ExcelModels", "Parsed data rows: ${data.size}")
        
        // Check specifically for exam columns
        val examColumns = headers.filter { header ->
            val lowerHeader = header.lowercase()
            listOf("prelim", "midterm", "prefinal", "pre-final", "final", "finals", "exam", "examination", "test").any { keyword ->
                lowerHeader.contains(keyword)
            }
        }
        android.util.Log.d("ExcelModels", "Exam columns in headers: $examColumns")
        
        return SheetContent(data, headers)
    }
}

data class SheetContent(
    val data: List<Map<String, String>>,
    val headers: List<String>
)

data class ExcelUploadResponse(
    val id: Int,
    val file_name: String,
    val uploaded_at: String,
    val message: String
)

data class VoiceParseResult(
    val studentName: String?,
    val value: String?
)

data class VoiceEntryRecord(
    val timestamp: Long,
    val studentName: String,
    val column: String,
    val value: String,
    val successful: Boolean
)


data class BatchEntry(
    val id: String = java.util.UUID.randomUUID().toString(),
    val studentName: String,
    val originalText: String,
    val value: String,
    val suggestedName: String? = null,
    val confirmed: Boolean = false
)