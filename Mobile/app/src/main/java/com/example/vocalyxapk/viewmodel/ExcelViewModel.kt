package com.example.vocalyxapk.viewmodel

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.models.ExcelFileItem
import com.example.vocalyxapk.models.VoiceParseResult
import com.example.vocalyxapk.repository.ExcelRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File


class ExcelViewModel : ViewModel() {

    private val excelRepository = ExcelRepository()

    var excelUIState by mutableStateOf<ExcelUIState>(ExcelUIState.Loading)
        private set

    var selectedExcelFile by mutableStateOf<ExcelFileItem?>(null)
        private set

    var selectedSheetName by mutableStateOf<String?>(null)
        private set

    var isSaving by mutableStateOf(false)
        private set

    var lastSaveStatus by mutableStateOf<SaveStatus?>(null)
        private set

    enum class SaveStatus {
        SUCCESS, ERROR
    }

    fun fetchExcelFiles(classId: Int) {
        excelUIState = ExcelUIState.Loading
        viewModelScope.launch {
            excelRepository.getExcelFiles(classId).fold(
                onSuccess = { excelFiles ->
                    if (excelFiles.isNotEmpty()) {
                        excelUIState = ExcelUIState.Success(excelFiles)
                        // Auto-select the first file
                        selectedExcelFile = excelFiles.first()
                        selectedSheetName = selectedExcelFile?.sheet_names?.firstOrNull()
                    } else {
                        excelUIState = ExcelUIState.Empty
                    }
                },
                onFailure = { error ->
                    excelUIState = ExcelUIState.Error(error.message ?: "Unknown error")
                }
            )
        }
    }

    fun uploadExcelFile(file: File, classId: Int) {
        excelUIState = ExcelUIState.Loading
        viewModelScope.launch {
            excelRepository.uploadExcelFile(file, classId).fold(
                onSuccess = { 
                    // Refresh the Excel files list
                    fetchExcelFiles(classId)
                },
                onFailure = { error ->
                    excelUIState = ExcelUIState.Error(error.message ?: "Unknown error")
                }
            )
        }
    }

    fun deleteExcelFile(excelId: Int, classId: Int) {
        val currentExcelFile = selectedExcelFile

        excelUIState = ExcelUIState.Loading

        viewModelScope.launch {
            excelRepository.deleteExcelFile(excelId).fold(
                onSuccess = {
                    fetchExcelFiles(classId)

                    if (currentExcelFile?.id == excelId) {
                        selectedExcelFile = null
                        selectedSheetName = null
                    }
                },
                onFailure = { error ->
                    excelUIState = ExcelUIState.Error(error.message ?: "Failed to delete Excel file")
                }
            )
        }
    }

    fun selectExcelFile(excelFile: ExcelFileItem) {
        selectedExcelFile = excelFile
        selectedSheetName = excelFile.sheet_names.firstOrNull()
    }

    fun selectSheet(sheetName: String) {
        selectedSheetName = sheetName
    }

    fun getSelectedSheetData(): List<List<String>> {
        val file = selectedExcelFile ?: return emptyList()
        val sheet = selectedSheetName ?: return emptyList()
        val sheetContent = file.all_sheets[sheet] ?: return emptyList()
        
        // Convert the data to a list of lists format for display
        val headers = sheetContent.headers
        val rows = mutableListOf<List<String>>()
        
        // Add headers as first row
        rows.add(headers)
        
        // Add data rows
        sheetContent.data.forEach { rowMap ->
            val row = headers.map { header ->
                rowMap[header] ?: ""
            }
            rows.add(row)
        }
        
        return rows
    }

    fun getColumnNames(): List<String> {
        val sheetData = getSelectedSheetData()
        return if (sheetData.isNotEmpty()) sheetData[0] else emptyList()
    }

    fun addColumnToExcelFile(columnName: String) {
        val file = selectedExcelFile ?: return
        val sheet = selectedSheetName ?: return

        // Get the current sheet data
        val sheetContent = file.all_sheets[sheet] ?: return

        // Add the new column to headers
        val updatedHeaders = sheetContent.headers.toMutableList()
        if (!updatedHeaders.contains(columnName)) {
            updatedHeaders.add(columnName)
        }

        // Add the column to each row with null values
        val updatedData = sheetContent.data.map { row ->
            val mutableRow = row.toMutableMap()
            if (!mutableRow.containsKey(columnName)) {
                mutableRow[columnName] = ""
            }
            mutableRow
        }

        // Update the sheet content
        val updatedSheetContent = sheetContent.copy(
            headers = updatedHeaders,
            data = updatedData
        )

        // Update the file's sheets
        val updatedSheets = file.all_sheets.toMutableMap()
        updatedSheets[sheet] = updatedSheetContent

        // Create updated file object
        val updatedFile = file.copy(all_sheets = updatedSheets)

        // Update the selected file
        selectedExcelFile = updatedFile

        // Save changes to backend (optimistically update UI first)
        updateExcelData()
    }

    fun updateStudentValue(studentName: String, columnName: String, value: String, onComplete: (Boolean) -> Unit) {
        val file = selectedExcelFile ?: run {
            onComplete(false)
            return
        }
        val sheet = selectedSheetName ?: run {
            onComplete(false)
            return
        }
        val sheetContent = file.all_sheets[sheet] ?: run {
            onComplete(false)
            return
        }

        // Find column index
        val columnIndex = sheetContent.headers.indexOf(columnName)
        if (columnIndex == -1) {
            onComplete(false)
            return
        }

        // Find name-related columns for matching
        val nameColumns = sheetContent.headers.filter { header ->
            header.contains("name", ignoreCase = true) ||
                    header.contains("last", ignoreCase = true) ||
                    header.contains("first", ignoreCase = true)
        }

        // If no name columns found, use the first column as fallback
        val columnsToSearch = if (nameColumns.isEmpty()) listOf(sheetContent.headers[0]) else nameColumns

        // Find student row by checking all name columns
        val studentRowIndex = sheetContent.data.indexOfFirst { row ->
            // Check if any of the name columns contain the search term
            columnsToSearch.any { nameColumn ->
                val cellValue = row[nameColumn]?.toString()?.trim() ?: ""
                cellValue.contains(studentName, ignoreCase = true)
            } ||
                    // Also check if the full name (combined from all name columns) contains the search term
                    columnsToSearch.mapNotNull { col -> row[col]?.toString()?.trim() }
                        .joinToString(" ")
                        .contains(studentName, ignoreCase = true)
        }

        if (studentRowIndex == -1) {
            onComplete(false)
            return
        }

        // Update the data
        val updatedData = sheetContent.data.toMutableList()
        val updatedRow = updatedData[studentRowIndex].toMutableMap()
        updatedRow[columnName] = value
        updatedData[studentRowIndex] = updatedRow

        // Update the sheet content
        val updatedSheetContent = sheetContent.copy(data = updatedData)

        // Update the file's sheets
        val updatedSheets = file.all_sheets.toMutableMap()
        updatedSheets[sheet] = updatedSheetContent

        // Create updated file object
        val updatedFile = file.copy(all_sheets = updatedSheets)

        // Update the selected file
        selectedExcelFile = updatedFile

        // Save changes to backend and wait for result
        isSaving = true
        viewModelScope.launch {
            try {
                excelRepository.updateExcelData(file.id, sheet, updatedData).fold(
                    onSuccess = {
                        lastSaveStatus = SaveStatus.SUCCESS
                        onComplete(true)

                        delay(3000)
                        lastSaveStatus = null
                    },
                    onFailure = { error ->
                        Log.e("ExcelViewModel", "Failed to save data: ${error.message}")
                        lastSaveStatus = SaveStatus.ERROR
                        onComplete(false)

                        delay(3000)
                        lastSaveStatus = null
                    }
                )
            } catch (e: Exception) {
                Log.e("ExcelViewModel", "Exception while saving data", e)
                lastSaveStatus = SaveStatus.ERROR
                onComplete(false)

                delay(3000)
                lastSaveStatus = null
            } finally {
                isSaving = false
            }
        }
    }

    private fun updateExcelData() {
        val file = selectedExcelFile ?: return
        val sheet = selectedSheetName ?: return
        val sheetContent = file.all_sheets[sheet] ?: return

        // Prevent duplicate save operations
        if (isSaving) return

        isSaving = true

        viewModelScope.launch {
            try {
                excelRepository.updateExcelData(file.id, sheet, sheetContent.data).fold(
                    onSuccess = {
                        // Update was successful
                        Log.d("ExcelViewModel", "Data saved successfully")
                        lastSaveStatus = SaveStatus.SUCCESS

                        // Clear the success status after a delay
                        delay(3000)
                        lastSaveStatus = null
                    },
                    onFailure = { error ->
                        // Handle failure
                        Log.e("ExcelViewModel", "Failed to save data: ${error.message}")
                        lastSaveStatus = SaveStatus.ERROR

                        // Clear the error status after a delay
                        delay(3000)
                        lastSaveStatus = null
                    }
                )
            } catch (e: Exception) {
                Log.e("ExcelViewModel", "Exception while saving data", e)
                lastSaveStatus = SaveStatus.ERROR

                // Clear the error status after a delay
                delay(3000)
                lastSaveStatus = null
            } finally {
                isSaving = false
            }
        }
    }

    fun parseVoiceInput(text: String): VoiceParseResult {
        val words = text.trim().split(" ")
        if (words.isEmpty()) return VoiceParseResult(null, null)

        // First, try to extract the last word as a numeric value
        val lastWord = words.last()
        val value = if (lastWord.toDoubleOrNull() != null) lastWord else null

        // If we found a numeric value at the end, the rest is the student name
        val studentName = if (value != null) {
            // Use all but the last word as the student name
            words.dropLast(1).joinToString(" ")
        } else {
            // If no value is detected, check if the input contains keywords like "absent" or "present"
            val statusKeywords = listOf("absent", "present", "excused", "late")
            val statusWordIndex = words.indexOfFirst { it.toLowerCase() in statusKeywords }

            if (statusWordIndex >= 0) {
                // Use the words before the status keyword as the name
                val name = words.take(statusWordIndex).joinToString(" ")
                // Use the status word as the value
                return VoiceParseResult(name, words[statusWordIndex])
            } else {
                // Default: assume the first word is a last name
                words.firstOrNull() ?: ""
            }
        }

        return VoiceParseResult(studentName, value)
    }

    fun findMatchingStudents(nameFragment: String): List<String> {
        val file = selectedExcelFile ?: return emptyList()
        val sheet = selectedSheetName ?: return emptyList()
        val sheetContent = file.all_sheets[sheet] ?: return emptyList()

        if (sheetContent.data.isEmpty() || sheetContent.headers.isEmpty()) return emptyList()

        // Find name-related columns (look for "name", "last", "first" in headers)
        val nameColumns = sheetContent.headers.filter { header ->
            header.contains("name", ignoreCase = true) ||
                    header.contains("last", ignoreCase = true) ||
                    header.contains("first", ignoreCase = true)
        }

        // If no name columns found, use the first column as fallback
        val columnsToSearch = if (nameColumns.isEmpty()) listOf(sheetContent.headers[0]) else nameColumns

        return sheetContent.data.mapNotNull { row ->
            // For each row, concatenate all the name-related values
            val fullName = columnsToSearch.mapNotNull { column ->
                row[column]?.toString()?.trim()
            }.joinToString(" ")

            // Only include if it contains the search fragment
            if (fullName.contains(nameFragment, ignoreCase = true)) {
                fullName
            } else {
                // Also check individual name parts
                for (column in columnsToSearch) {
                    val value = row[column]?.toString()?.trim() ?: continue
                    if (value.contains(nameFragment, ignoreCase = true)) {
                        return@mapNotNull fullName
                    }
                }
                null
            }
        }.distinct()
    }
}

sealed class ExcelUIState {
    object Loading : ExcelUIState()
    data class Success(val excelFiles: List<ExcelFileItem>) : ExcelUIState()
    data class Error(val message: String) : ExcelUIState()
    object Empty : ExcelUIState()
}
