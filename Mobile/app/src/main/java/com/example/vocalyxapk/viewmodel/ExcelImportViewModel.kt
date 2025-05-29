package com.example.vocalyxapk.viewmodel

import android.app.Application
import android.content.ContentResolver
import android.net.Uri
import android.webkit.MimeTypeMap
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.models.ExcelImportState
import com.example.vocalyxapk.models.ImportStep
import com.example.vocalyxapk.models.ImportTemplate
import com.example.vocalyxapk.repository.ExcelRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.apache.poi.ss.usermodel.WorkbookFactory
import java.io.File
import java.io.FileOutputStream
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody

class ExcelImportViewModel(application: Application) : AndroidViewModel(application) {
    
    private val excelRepository = ExcelRepository()
    private val contentResolver: ContentResolver = application.contentResolver
    
    private val _importState = MutableStateFlow(ExcelImportState())
    val importState: StateFlow<ExcelImportState> = _importState.asStateFlow()
    
    private var classId: Int = -1
    private var tempFile: File? = null
    
    /**
     * Set the class ID for which Excel file will be imported
     */
    fun setClassId(id: Int) {
        classId = id
    }
    
    /**
     * Process a selected Excel file
     */
    fun processSelectedFile(uri: Uri) {
        viewModelScope.launch {
            try {
                // Get file name
                val fileName = getFileNameFromUri(uri)
                
                // Create a temporary file
                tempFile = createTempFile(uri)
                
                // Read preview data
                val previewData = readPreviewData(tempFile!!)
                
                // Update state and advance to preview step
                _importState.value = _importState.value.copy(
                    currentStep = ImportStep.PREVIEW_DATA,
                    fileName = fileName,
                    fileUri = uri.toString(),
                    previewData = previewData,
                    allColumns = if (previewData.isNotEmpty()) previewData[0] else emptyList()
                )
            } catch (e: Exception) {
                // Handle errors
                e.printStackTrace()
            }
        }
    }
    
    /**
     * Move to the next step in the import process
     */
    fun nextStep() {
        val currentStep = _importState.value.currentStep
        val nextStep = when (currentStep) {
            ImportStep.FILE_INFO -> ImportStep.PREVIEW_DATA
            ImportStep.PREVIEW_DATA -> return // Already at last step (removed MAP_COLUMNS)
        }
        
        _importState.value = _importState.value.copy(currentStep = nextStep)
    }
    
    /**
     * Move to the previous step in the import process
     */
    fun previousStep() {
        val currentStep = _importState.value.currentStep
        val previousStep = when (currentStep) {
            ImportStep.FILE_INFO -> return // Already at first step
            ImportStep.PREVIEW_DATA -> ImportStep.FILE_INFO
        }
        
        _importState.value = _importState.value.copy(currentStep = previousStep)
    }
    
    /**
     * Delete the selected file
     */
    fun deleteFile() {
        // Delete temp file if it exists
        tempFile?.delete()
        tempFile = null
        
        // Reset import state to initial
        _importState.value = ExcelImportState(currentStep = ImportStep.FILE_INFO)
    }
    
    /**
     * Import the Excel file with loading states
     */
    fun importFile(onComplete: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            try {
                // Set loading state
                _importState.value = _importState.value.copy(
                    isImporting = true,
                    importSuccess = false,
                    importError = null
                )
                
                if (tempFile != null && classId > 0) {
                    // Upload the file to the backend
                    excelRepository.uploadExcelFile(tempFile!!, classId)
                    
                    // Set success state
                    _importState.value = _importState.value.copy(
                        isImporting = false,
                        importSuccess = true,
                        importError = null
                    )
                    
                    // Notify completion
                    onComplete(true)
                } else {
                    throw Exception("No file selected or invalid class ID")
                }
            } catch (e: Exception) {
                // Set error state
                _importState.value = _importState.value.copy(
                    isImporting = false,
                    importSuccess = false,
                    importError = e.message ?: "Import failed"
                )
                
                // Notify completion
                onComplete(false)
                e.printStackTrace()
            }
        }
    }
    
    /**
     * Reset import states
     */
    fun resetImportState() {
        _importState.value = _importState.value.copy(
            isImporting = false,
            importSuccess = false,
            importError = null
        )
    }
    
    /**
     * Helper method to get file name from URI
     */
    private suspend fun getFileNameFromUri(uri: Uri): String = withContext(Dispatchers.IO) {
        val cursor = contentResolver.query(uri, null, null, null, null)
        
        cursor?.use {
            if (it.moveToFirst()) {
                val displayNameIndex = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                if (displayNameIndex != -1) {
                    return@withContext it.getString(displayNameIndex)
                }
            }
        }
        
        // Fallback to path
        val path = uri.path
        path?.substringAfterLast('/') ?: "Unknown file"
    }
    
    /**
     * Create a temporary file from URI
     */
    private suspend fun createTempFile(uri: Uri): File = withContext(Dispatchers.IO) {
        val inputStream = contentResolver.openInputStream(uri)
        val extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(
            contentResolver.getType(uri)
        ) ?: "xlsx"
        
        val tempFile = File.createTempFile("excel_import_", ".$extension", getApplication<Application>().cacheDir)
        
        inputStream?.use { input ->
            FileOutputStream(tempFile).use { output ->
                input.copyTo(output)
            }
        }
        
        tempFile
    }
    
    /**
     * Read preview data from Excel file
     */
    private suspend fun readPreviewData(file: File): List<List<String>> = withContext(Dispatchers.IO) {
        val result = mutableListOf<List<String>>()
        
        try {
            // Read the Excel file
            val workbook = WorkbookFactory.create(file)
            val sheet = workbook.getSheetAt(0)
            
            // Read header row
            val headerRow = sheet.getRow(0)
            val headers = if (headerRow != null) {
                (0 until headerRow.lastCellNum).map { i ->
                    headerRow.getCell(i)?.toString() ?: ""
                }
            } else {
                emptyList()
            }
            
            result.add(headers)
            
            // Read data rows (up to 10)
            val maxRows = minOf(10, sheet.lastRowNum)
            for (i in 1..maxRows) {
                val row = sheet.getRow(i) ?: continue
                val rowData = (0 until headers.size).map { j ->
                    row.getCell(j)?.toString() ?: ""
                }
                result.add(rowData)
            }
            
            workbook.close()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        result
    }
}
