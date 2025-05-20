package com.example.vocalyxapk.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.models.ExcelFileItem
import com.example.vocalyxapk.repository.ExcelRepository
import kotlinx.coroutines.launch
import java.io.File

/**
 * ViewModel for handling Excel file operations
 */
class ExcelViewModel : ViewModel() {

    private val excelRepository = ExcelRepository()
    
    // UI state for Excel files
    var excelUIState by mutableStateOf<ExcelUIState>(ExcelUIState.Loading)
        private set
    
    // Selected Excel file
    var selectedExcelFile by mutableStateOf<ExcelFileItem?>(null)
        private set
    
    // Selected sheet name
    var selectedSheetName by mutableStateOf<String?>(null)
        private set
    
    /**
     * Fetch Excel files for a specific class
     */
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
    
    /**
     * Upload an Excel file to the backend
     */
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
    
    /**
     * Delete an Excel file from the backend
     */
    fun deleteExcelFile(excelId: Int, classId: Int) {
        val currentFile = selectedExcelFile
        excelUIState = ExcelUIState.Loading
        viewModelScope.launch {
            excelRepository.deleteExcelFile(excelId).fold(
                onSuccess = { 
                    // Refresh the Excel files list
                    fetchExcelFiles(classId)
                    // Clear the selection if the deleted file was selected
                    if (currentFile?.id == excelId) {
                        selectedExcelFile = null
                        selectedSheetName = null
                    }
                },
                onFailure = { error ->
                    excelUIState = ExcelUIState.Error(error.message ?: "Unknown error")
                }
            )
        }
    }
    
    /**
     * Select an Excel file
     */
    fun selectExcelFile(excelFile: ExcelFileItem) {
        selectedExcelFile = excelFile
        selectedSheetName = excelFile.sheet_names.firstOrNull()
    }
    
    /**
     * Select a sheet within the selected Excel file
     */
    fun selectSheet(sheetName: String) {
        selectedSheetName = sheetName
    }
    
    /**
     * Get the data for the currently selected sheet as a list of rows
     * where each row is a list of cell values
     */
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
}

/**
 * UI state for Excel files
 */
sealed class ExcelUIState {
    object Loading : ExcelUIState()
    data class Success(val excelFiles: List<ExcelFileItem>) : ExcelUIState()
    data class Error(val message: String) : ExcelUIState()
    object Empty : ExcelUIState()
}
