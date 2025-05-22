package com.example.vocalyxapk.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.models.ExcelFileItem
import com.example.vocalyxapk.models.VoiceParseResult
import com.example.vocalyxapk.repository.ExcelRepository
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

    fun updateStudentValue(studentName: String, columnName: String, value: String): Boolean {
        val file = selectedExcelFile ?: return false
        val sheet = selectedSheetName ?: return false
        val sheetContent = file.all_sheets[sheet] ?: return false

        // Find column index
        val columnIndex = sheetContent.headers.indexOf(columnName)
        if (columnIndex == -1) return false

        // Find student row by name (assuming there's a student name column - typically first column)
        val nameColumnIndex = 0  // Assuming first column is student name
        val studentRowIndex = sheetContent.data.indexOfFirst { row ->
            val studentNameInRow = row[sheetContent.headers[nameColumnIndex]]?.toString() ?: ""
            studentNameInRow.contains(studentName, ignoreCase = true)
        }

        if (studentRowIndex == -1) return false

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

        // Save changes to backend
        updateExcelData()

        return true
    }

    private fun updateExcelData() {
        val file = selectedExcelFile ?: return
        val sheet = selectedSheetName ?: return
        val sheetContent = file.all_sheets[sheet] ?: return

        viewModelScope.launch {
            excelRepository.updateExcelData(file.id, sheet, sheetContent.data)
        }
    }

    fun parseVoiceInput(text: String): VoiceParseResult {
        val words = text.trim().split(" ")
        if (words.isEmpty()) return VoiceParseResult(null, null)

        val lastWord = words.last()
        val value = if (lastWord.toDoubleOrNull() != null) lastWord else null

        val studentName = if (value != null) {
            words.dropLast(1).joinToString(" ")
        } else {
            if (words.size > 1) words.first() else text
        }

        return VoiceParseResult(studentName, value)
    }

    fun findMatchingStudents(nameFragment: String): List<String> {
        val file = selectedExcelFile ?: return emptyList()
        val sheet = selectedSheetName ?: return emptyList()
        val sheetContent = file.all_sheets[sheet] ?: return emptyList()

        if (sheetContent.data.isEmpty() || sheetContent.headers.isEmpty()) return emptyList()

        val nameColumn = sheetContent.headers[0]

        return sheetContent.data
            .mapNotNull { row -> row[nameColumn]?.toString() }
            .filter { it.contains(nameFragment, ignoreCase = true) }
    }
}

sealed class ExcelUIState {
    object Loading : ExcelUIState()
    data class Success(val excelFiles: List<ExcelFileItem>) : ExcelUIState()
    data class Error(val message: String) : ExcelUIState()
    object Empty : ExcelUIState()
}
