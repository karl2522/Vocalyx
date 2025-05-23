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
    val all_sheets: Map<String, SheetContent>,
    val active_sheet: String,
    val sheet_names: List<String>,
    @SerializedName("class_ref") val classId: Int?
)

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