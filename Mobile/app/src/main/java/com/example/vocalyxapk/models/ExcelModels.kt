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
