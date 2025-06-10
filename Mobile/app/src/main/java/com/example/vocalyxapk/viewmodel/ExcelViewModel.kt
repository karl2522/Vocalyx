package com.example.vocalyxapk.viewmodel

import android.content.Context
import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.api.SpeechApiService
import com.example.vocalyxapk.api.SpeechApiServiceFactory
import com.example.vocalyxapk.api.WhisperApiClient
import com.example.vocalyxapk.models.BatchEntry
import com.example.vocalyxapk.models.ExcelFileItem
import com.example.vocalyxapk.models.SheetContent
import com.example.vocalyxapk.models.VoiceEntry
import com.example.vocalyxapk.models.VoiceEntryRecord
import com.example.vocalyxapk.models.VoiceParseResult
import com.example.vocalyxapk.repository.ExcelRepository
import info.debatty.java.stringsimilarity.JaroWinkler
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
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

    var attemptedNames = mutableListOf<String>()
        private set

    private lateinit var speechApiService: SpeechApiService

    private val _voiceEntryHistory = mutableListOf<VoiceEntryRecord>()
    val voiceEntryHistory: List<VoiceEntryRecord> get() = _voiceEntryHistory.toList()

    private val _batchEntries = mutableListOf<BatchEntry>()
    val batchEntries: List<BatchEntry> get() = _batchEntries.toList()

    var isInBatchMode by mutableStateOf(false)
        private set

    private lateinit var whisperApiClient: WhisperApiClient
    private var useAdvancedRecognition = false

    private var selectedBatchColumn: String? = null

    enum class SaveStatus {
        SUCCESS, ERROR
    }

    fun initializeWhisperClient(context: Context) {
        whisperApiClient = WhisperApiClient(context)

        initializeSpeechApi("http://10.0.191.212:8000/")
    }


    fun initializeSpeechApi(baseUrl: String) {
        speechApiService = SpeechApiServiceFactory.create(baseUrl)
    }

    suspend fun setWhisperApiKey(apiKey: String) {
        whisperApiClient.saveApiKey(apiKey)
    }

    fun toggleAdvancedRecognition(enabled: Boolean) {
        useAdvancedRecognition = enabled
    }

    suspend fun performAdvancedSpeechRecognition(audioBytes: ByteArray): Result<String> {
        return try {
            whisperApiClient.transcribeAudioBytes(audioBytes)
        } catch (e: Exception) {
            Log.e("ExcelViewModel", "Advanced speech recognition failed", e)
            Result.failure(e)
        }
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

    fun selectExcelFile(excelFileId: Int) {
        // Find the Excel file with the given ID from the current state
        val files = when (excelUIState) {
            is ExcelUIState.Success -> (excelUIState as ExcelUIState.Success).excelFiles
            else -> emptyList()
        }
        
        // Set the selected file and its first sheet
        selectedExcelFile = files.find { it.id == excelFileId }
        selectedSheetName = selectedExcelFile?.sheet_names?.firstOrNull()
    }

    fun selectSheet(sheetName: String) {
        selectedSheetName = sheetName
    }

    fun getSelectedSheetData(): List<List<String>> {
        val file = selectedExcelFile ?: return emptyList()
        val sheet = selectedSheetName ?: return emptyList()
        val sheetContent = file.getSheetContent(sheet) ?: return emptyList()
        
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
    
    // Get sheet data as a map for mobile-friendly UI
    fun getSelectedSheetDataAsMap(): Map<String, Any> {
        val file = selectedExcelFile ?: return mapOf("headers" to emptyList<String>(), "data" to emptyList<Map<String, String>>())
        val sheet = selectedSheetName ?: return mapOf("headers" to emptyList<String>(), "data" to emptyList<Map<String, String>>())
        val sheetContent = file.getSheetContent(sheet) ?: return mapOf("headers" to emptyList<String>(), "data" to emptyList<Map<String, String>>())
        
        // Add debug logging
        Log.d("ExcelViewModel", "=== getSelectedSheetDataAsMap DEBUG ===")
        Log.d("ExcelViewModel", "Selected file: ${file.file_name}")
        Log.d("ExcelViewModel", "Selected sheet: $sheet")
        Log.d("ExcelViewModel", "Sheet content headers: ${sheetContent.headers}")
        Log.d("ExcelViewModel", "Sheet content data rows: ${sheetContent.data.size}")
        
        // Check for exam-related columns specifically
        val examColumns = sheetContent.headers.filter { header ->
            val lowerHeader = header.lowercase()
            listOf("prelim", "midterm", "prefinal", "pre-final", "final", "finals", "exam", "examination", "test").any { keyword ->
                lowerHeader.contains(keyword)
            }
        }
        Log.d("ExcelViewModel", "Exam-related columns found: $examColumns")
        
        // Ensure all data values are properly converted to strings
        val safeData = try {
            sheetContent.data.map { row ->
                row.mapValues { it.value?.toString() ?: "" }
            }
        } catch (e: Exception) {
            Log.e("ExcelViewModel", "Error converting data to strings", e)
            // If there's any issue with data conversion, return empty data but keep headers
            emptyList<Map<String, String>>()
        }
        
        return mapOf(
            "headers" to sheetContent.headers,
            "data" to safeData
        )
    }
    
    // Get column names from the selected sheet
    fun getColumnNames(): List<String> {
        val file = selectedExcelFile ?: return emptyList()
        val sheet = selectedSheetName ?: return emptyList()
        val sheetContent = file.getSheetContent(sheet) ?: return emptyList()
        
        return sheetContent.headers
    }

    fun addColumnToExcelFile(columnName: String) {
        val file = selectedExcelFile ?: return
        val sheet = selectedSheetName ?: return

        Log.d("ExcelViewModel", "=== ADDING COLUMN: '$columnName' ===")
        Log.d("ExcelViewModel", "File: ${file.file_name}, Sheet: $sheet")

        // Get the current sheet data
        val sheetContent = file.getSheetContent(sheet) ?: return
        Log.d("ExcelViewModel", "Current headers before adding: ${sheetContent.headers}")

        // Add the new column to headers
        val updatedHeaders = sheetContent.headers.toMutableList()
        if (!updatedHeaders.contains(columnName)) {
            updatedHeaders.add(columnName)
            Log.d("ExcelViewModel", "Added column '$columnName' to headers")
        } else {
            Log.d("ExcelViewModel", "Column '$columnName' already exists in headers")
        }
        Log.d("ExcelViewModel", "Updated headers: $updatedHeaders")

        // Add the column to each row with empty values
        val updatedData = sheetContent.data.map { row ->
            val mutableRow = row.toMutableMap()
            if (!mutableRow.containsKey(columnName)) {
                mutableRow[columnName] = ""
                Log.d("ExcelViewModel", "Added empty value for column '$columnName' to a student row")
            }
            mutableRow
        }

        Log.d("ExcelViewModel", "Updated ${updatedData.size} student rows with new column '$columnName'")

        // We'll need to update the all_sheets map manually
        // This is a temporary solution - ideally we'd update the backend
        val updatedSheetsMap = (file.all_sheets[sheet] as? Map<String, Any>)?.toMutableMap() ?: mutableMapOf<String, Any>()
        updatedSheetsMap["headers"] = updatedHeaders
        updatedSheetsMap["data"] = updatedData
        
        // Update the file's sheets
        val updatedSheets = file.all_sheets.toMutableMap()
        updatedSheets[sheet] = updatedSheetsMap

        // Create updated file object
        val updatedFile = file.copy(all_sheets = updatedSheets)

        // Update the selected file
        selectedExcelFile = updatedFile

        // Save changes to backend with updated headers
        viewModelScope.launch {
            try {
                Log.d("ExcelViewModel", "Adding column '$columnName' to backend")
                Log.d("ExcelViewModel", "Calling excelRepository.updateExcelData with:")
                Log.d("ExcelViewModel", "  excelId: ${file.id}")
                Log.d("ExcelViewModel", "  sheetName: $sheet")
                Log.d("ExcelViewModel", "  dataSize: ${updatedData.size}")
                Log.d("ExcelViewModel", "  headers: $updatedHeaders")
                
                val result = excelRepository.updateExcelData(file.id, sheet, updatedData, updatedHeaders)
                
                result.fold(
                    onSuccess = {
                        Log.d("ExcelViewModel", "Column '$columnName' added successfully to backend")
                        Log.d("ExcelViewModel", "Triggering data refresh...")
                        // Refetch data to ensure consistency
                        val classId = file.classId
                        if (classId != null) {
                            fetchExcelFiles(classId)
                        } else {
                            Log.e("ExcelViewModel", "Cannot refresh - classId is null")
                        }
                    },
                    onFailure = { error ->
                        Log.e("ExcelViewModel", "Failed to add column '$columnName' to backend", error)
                        Log.e("ExcelViewModel", "Error message: ${error.message}")
                        Log.e("ExcelViewModel", "Error class: ${error.javaClass.simpleName}")
                        // Revert local changes on failure
                        selectedExcelFile = file
                    }
                )
            } catch (e: Exception) {
                Log.e("ExcelViewModel", "Exception adding column '$columnName'", e)
                Log.e("ExcelViewModel", "Exception message: ${e.message}")
                Log.e("ExcelViewModel", "Exception class: ${e.javaClass.simpleName}")
                // Revert local changes on exception
                selectedExcelFile = file
            }
        }
    }

    fun updateStudentValue(studentName: String, columnName: String, value: String, onComplete: (Boolean) -> Unit) {
        val file = selectedExcelFile ?: run {
            Log.e("ExcelViewModel", "updateStudentValue failed: no selected file")
            onComplete(false)
            return
        }
        val sheet = selectedSheetName ?: run {
            Log.e("ExcelViewModel", "updateStudentValue failed: no selected sheet")
            onComplete(false)
            return
        }
        val sheetContent = file.getSheetContent(sheet) ?: run {
            Log.e("ExcelViewModel", "updateStudentValue failed: no sheet content")
            onComplete(false)
            return
        }

        Log.d("ExcelViewModel", "=== UPDATE STUDENT VALUE DEBUG ===")
        Log.d("ExcelViewModel", "Student name: '$studentName'")
        Log.d("ExcelViewModel", "Column name: '$columnName'")
        Log.d("ExcelViewModel", "Value: '$value'")

        // Find column index
        val columnIndex = sheetContent.headers.indexOf(columnName)
        if (columnIndex == -1) {
            Log.e("ExcelViewModel", "updateStudentValue failed: column '$columnName' not found in headers: ${sheetContent.headers}")
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

        Log.d("ExcelViewModel", "Name columns to search: $columnsToSearch")
        Log.d("ExcelViewModel", "Total students in sheet: ${sheetContent.data.size}")

        // Find student row by matching student name with fuzzy logic
        var studentRowIndex = -1
        var bestMatch: Map<String, String>? = null
        var bestSimilarity = 0.0
        
        Log.d("ExcelViewModel", "Looking for student: '$studentName'")
        Log.d("ExcelViewModel", "Available students:")
        
        sheetContent.data.forEachIndexed { index, student ->
            // Get the full name from the student data
            val fullNameInData = nameColumns.mapNotNull { col -> student[col] }.joinToString(" ").trim()
            Log.d("ExcelViewModel", "  $index: '$fullNameInData'")
            
            // Calculate similarity for different name combinations
            val similarities = mutableListOf<Double>()
            
            // Direct comparison
            similarities.add(calculateNameSimilarity(studentName, fullNameInData))
            
            // Try reversing the name format (First Last <-> Last First)
            val nameParts = studentName.split(" ").filter { it.isNotBlank() }
            if (nameParts.size >= 2) {
                val reversedName = "${nameParts.last()} ${nameParts.dropLast(1).joinToString(" ")}"
                similarities.add(calculateNameSimilarity(reversedName, fullNameInData))
                Log.d("ExcelViewModel", "    Trying reversed: '$reversedName' vs '$fullNameInData'")
            }
            
            // Try individual name parts
            nameParts.forEach { part ->
                if (part.length > 2) { // Avoid matching single letters or very short names
                    if (fullNameInData.contains(part, ignoreCase = true)) {
                        similarities.add(0.7) // Partial match bonus
                    }
                }
            }
            
            val maxSimilarity = similarities.maxOrNull() ?: 0.0
            Log.d("ExcelViewModel", "    Best similarity: $maxSimilarity")
            
            if (maxSimilarity > bestSimilarity && maxSimilarity > 0.6) { // Threshold for matching
                bestSimilarity = maxSimilarity
                bestMatch = student
                studentRowIndex = index
                Log.d("ExcelViewModel", "    New best match: '$fullNameInData' (similarity: $maxSimilarity)")
            }
        }
        
        if (studentRowIndex == -1 || bestMatch == null) {
            Log.e("ExcelViewModel", "updateStudentValue failed: student '$studentName' not found in data (best similarity: $bestSimilarity)")
            onComplete(false)
            return
        }
        
        Log.d("ExcelViewModel", "Found student match at index $studentRowIndex with similarity $bestSimilarity")

        // Update the data locally first (optimistic update)
        val updatedData = sheetContent.data.toMutableList()
        val studentRow = bestMatch.toMutableMap()
        studentRow[columnName] = value
        updatedData[studentRowIndex] = studentRow

        Log.d("ExcelViewModel", "Updated '$columnName' from '${bestMatch[columnName]}' to '$value' for student '$studentName'")
        Log.d("ExcelViewModel", "Student row after update: ${studentRow.entries.take(5)}")
        Log.d("ExcelViewModel", "Updated data row at index $studentRowIndex: ${updatedData[studentRowIndex].entries.take(5)}")

        // We'll need to update the all_sheets map manually
        // This is a temporary solution - ideally we'd update the backend
        val updatedSheetsMap = (file.all_sheets[sheet] as? Map<String, Any>)?.toMutableMap() ?: mutableMapOf<String, Any>()
        updatedSheetsMap["headers"] = sheetContent.headers
        updatedSheetsMap["data"] = updatedData
        
        // Update the file's sheets
        val updatedSheets = file.all_sheets.toMutableMap()
        updatedSheets[sheet] = updatedSheetsMap

        // Create updated file object
        val updatedFile = file.copy(all_sheets = updatedSheets)

        // Update the selected file immediately for this instance
        selectedExcelFile = updatedFile
        Log.d("ExcelViewModel", "Local file updated, verifying column '$columnName' exists in headers: ${sheetContent.headers.contains(columnName)}")
        Log.d("ExcelViewModel", "Local file updated, verifying student value in updated file: ${updatedFile.getSheetContent(sheet)?.data?.get(studentRowIndex)?.get(columnName)}")

        // Save changes to backend and wait for result
        isSaving = true
        
        viewModelScope.launch {
            try {
                val result = excelRepository.updateExcelData(file.id, sheet, updatedData)
                
                result.fold(
                    onSuccess = {
                        Log.d("ExcelViewModel", "Backend update successful for student: $studentName")
                        // Backend update successful - now refetch data to ensure all instances get the update
                        val classId = file.classId
                        if (classId != null) {
                            // Refetch all files to ensure consistency across all ViewModels
                            fetchExcelFiles(classId)
                        }
                        onComplete(true)
                    },
                    onFailure = { error ->
                        Log.e("ExcelViewModel", "Backend update failed for student: $studentName", error)
                        // Backend update failed - revert local changes
                        selectedExcelFile = file // Revert to original
                        onComplete(false)
                    }
                )
            } catch (e: Exception) {
                Log.e("ExcelViewModel", "Exception during backend update for student: $studentName", e)
                // Exception occurred - revert local changes
                selectedExcelFile = file // Revert to original
                onComplete(false)
            } finally {
                isSaving = false
            }
        }
    }

    private fun updateExcelData() {
        val file = selectedExcelFile ?: return
        val sheet = selectedSheetName ?: return
        val sheetContent = file.getSheetContent(sheet) ?: return

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

        // First, try to extract the last word as a numeric value or status keyword
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

        // Add phonetic correction for student name
        return VoiceParseResult(studentName, value)
    }

    fun findMatchingStudents(nameFragment: String): List<String> {
        val file = selectedExcelFile ?: return emptyList()
        val sheet = selectedSheetName ?: return emptyList()
        val sheetContent = file.getSheetContent(sheet) ?: return emptyList()

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

    fun findMatchingStudentsWithFuzzy(nameFragment: String, threshold: Double = 0.75): List<Pair<String, Double>> {
        val file = selectedExcelFile ?: return emptyList()
        val sheet = selectedSheetName ?: return emptyList()
        val sheetContent = file.getSheetContent(sheet) ?: return emptyList()

        if (sheetContent.data.isEmpty() || sheetContent.headers.isEmpty()) return emptyList()

        // Track attempted names
        if (!attemptedNames.contains(nameFragment)) {
            attemptedNames.add(nameFragment)
        }

        // Find name-related columns
        val nameColumns = sheetContent.headers.filter { header ->
            header.contains("name", ignoreCase = true) ||
                    header.contains("last", ignoreCase = true) ||
                    header.contains("first", ignoreCase = true)
        }

        // If no name columns found, use the first column as fallback
        val columnsToSearch = if (nameColumns.isEmpty()) listOf(sheetContent.headers[0]) else nameColumns

        // Use Jaro-Winkler for fuzzy string matching
        val jaroWinkler = JaroWinkler()

        // Map to store student name and its best match score
        val matchScores = mutableMapOf<String, Double>()

        sheetContent.data.forEach { row ->
            // Get full name from name columns
            val fullName = columnsToSearch.mapNotNull { column ->
                row[column]?.toString()?.trim()
            }.joinToString(" ")

            if (fullName.isNotBlank()) {
                // Check similarity with the input name fragment
                val similarity = jaroWinkler.similarity(fullName.toLowerCase(), nameFragment.toLowerCase())

                // Also check individual components
                val bestComponentMatch = columnsToSearch.maxOfOrNull { column ->
                    val value = row[column]?.toString()?.trim() ?: ""
                    if (value.isNotBlank()) jaroWinkler.similarity(value.toLowerCase(), nameFragment.toLowerCase()) else 0.0
                } ?: 0.0

                // Use the better of the two scores
                val bestScore = maxOf(similarity, bestComponentMatch)

                // If score exceeds threshold, add to results
                if (bestScore >= threshold) {
                    matchScores[fullName] = bestScore
                }
            }
        }

        // Return results sorted by score (highest first)
        return matchScores.entries.sortedByDescending { it.value }
            .map { Pair(it.key, it.value) }
    }

    fun getSuggestedNames(maxSuggestions: Int = 5): List<String> {
        // If no attempted names, return empty list
        if (attemptedNames.isEmpty()) return emptyList()

        // Get last attempted name
        val lastAttempt = attemptedNames.last()

        // Use lower threshold to find possible matches
        val possibleMatches = findMatchingStudentsWithFuzzy(lastAttempt, 0.5)
            .map { it.first }
            .take(maxSuggestions)

        return possibleMatches
    }

    fun resetAttemptedNames() {
        attemptedNames.clear()
    }

    fun getMaxScoreForColumn(columnName: String): Double? {
        // First check if the column name contains a max score pattern like "Assignment (20 pts)"
        val maxScorePattern = """\((\d+(\.\d+)?)\s*(pts|points|marks|score)?\)""".toRegex(RegexOption.IGNORE_CASE)
        val matchResult = maxScorePattern.find(columnName)

        if (matchResult != null) {
            return matchResult.groupValues[1].toDoubleOrNull()
        }

        // If no pattern in column name, analyze data to estimate max score
        val file = selectedExcelFile ?: return null
        val sheet = selectedSheetName ?: return null
        val sheetContent = file.getSheetContent(sheet) ?: return null

        // Calculate stats on existing values
        val values = sheetContent.data.mapNotNull { row ->
            val value = row[columnName]?.toString()
            if (value.isNullOrBlank()) null else value.toDoubleOrNull()
        }

        if (values.isEmpty()) return null

        // Use the maximum existing value, rounded up to next 5 or 10
        val maxValue = values.maxOrNull() ?: return null

        // Round up to next 5
        val roundedMax = (Math.ceil(maxValue / 5.0) * 5).coerceAtLeast(10.0)

        return roundedMax
    }

    fun validateScore(columnName: String, score: Double): ValidationResult {
        val maxScore = getMaxScoreForColumn(columnName)

        return when {
            maxScore == null -> ValidationResult.Valid
            score > maxScore -> ValidationResult.ExceedsMaximum(maxScore)
            score < 0 -> ValidationResult.NegativeValue
            score > maxScore * 0.9 && score != maxScore -> ValidationResult.NearMaximum(maxScore)
            else -> ValidationResult.Valid
        }
    }

    fun recordSuccessfulEntry(studentName: String, column: String, value: String) {
        _voiceEntryHistory.add(
            VoiceEntryRecord(
                timestamp = System.currentTimeMillis(),
                studentName = studentName,
                column = column,
                value = value,
                successful = true
            )
        )
    }

    fun recordFailedEntry(studentName: String, column: String, value: String) {
        _voiceEntryHistory.add(
            VoiceEntryRecord(
                timestamp = System.currentTimeMillis(),
                studentName = studentName,
                column = column,
                value = value,
                successful = false
            )
        )
    }

    fun startBatchMode(columnName: String) {
        _batchEntries.clear()
        isInBatchMode = true
        // Store the column for all batch entries
        selectedBatchColumn = columnName
    }

    fun stopBatchMode() {
        isInBatchMode = false
        _batchEntries.clear()
        selectedBatchColumn = null
    }

    fun addBatchEntry(recognizedText: String) {
        val parseResult = parseVoiceInput(recognizedText)

        if (parseResult.studentName.isNullOrBlank() || parseResult.value.isNullOrBlank()) {
            return
        }

        // Find matching students
        val matches = findMatchingStudents(parseResult.studentName)
        val suggestedName = if (matches.size == 1) matches.first() else null

        // Add to batch
        _batchEntries.add(BatchEntry(
            studentName = parseResult.studentName,
            originalText = recognizedText,
            value = parseResult.value,
            suggestedName = suggestedName
        ))
    }


    fun removeBatchEntry(id: String) {
        _batchEntries.removeIf { it.id == id }
    }

    fun updateBatchEntry(id: String, studentName: String, value: String) {
        val index = _batchEntries.indexOfFirst { it.id == id }
        if (index >= 0) {
            _batchEntries[index] = _batchEntries[index].copy(
                studentName = studentName,
                value = value,
                confirmed = true
            )
        }
    }

    fun confirmBatchEntry(id: String, useRecommended: Boolean = false) {
        val index = _batchEntries.indexOfFirst { it.id == id }
        if (index >= 0) {
            val entry = _batchEntries[index]
            _batchEntries[index] = entry.copy(
                studentName = if (useRecommended && entry.suggestedName != null) entry.suggestedName else entry.studentName,
                confirmed = true
            )
        }
    }

    fun processAllBatchEntries(onProgress: (Int, Int) -> Unit, onComplete: (Int, Int) -> Unit) {
        if (_batchEntries.isEmpty() || selectedBatchColumn == null) {
            onComplete(0, 0)
            return
        }

        val columnName = selectedBatchColumn!!
        var successCount = 0
        var failureCount = 0
        val totalEntries = _batchEntries.size

        viewModelScope.launch {
            _batchEntries.forEachIndexed { index, entry ->
                val studentName = if (entry.confirmed && entry.suggestedName != null)
                    entry.suggestedName else entry.studentName

                // Update the student value
                var updateSuccess = false
                updateStudentValue(studentName, columnName, entry.value) { success ->
                    updateSuccess = success
                }

                // Wait for the operation to complete
                delay(500) // Small delay between operations

                if (updateSuccess) {
                    successCount++
                    recordSuccessfulEntry(studentName, columnName, entry.value)
                } else {
                    failureCount++
                    recordFailedEntry(studentName, columnName, entry.value)
                }

                // Report progress
                onProgress(index + 1, totalEntries)
            }

            // Complete
            onComplete(successCount, failureCount)
            stopBatchMode()
        }
    }

    fun getBatchSummary(): Map<String, Int> {
        val total = _batchEntries.size
        val withSuggestions = _batchEntries.count { it.suggestedName != null }
        val confirmed = _batchEntries.count { it.confirmed }

        return mapOf(
            "total" to total,
            "withSuggestions" to withSuggestions,
            "confirmed" to confirmed,
            "needsReview" to (total - confirmed)
        )
    }

    fun correctCommonPhoneticMismatches(recognizedName: String): String {
        // Common Filipino/English phonetic substitutions
        val substitutions = mapOf(
            'k' to 'c', 'c' to 'k',
            'v' to 'b', 'b' to 'v',
            's' to 'z', 'z' to 's',
            'f' to 'p', 'p' to 'f',
            'j' to 'h', 'h' to 'j'
        )

        // Try different phonetic variations
        val nameVariations = mutableListOf<String>()
        nameVariations.add(recognizedName)

        // Generate variations with common substitutions
        val chars = recognizedName.toCharArray()
        for (i in chars.indices) {
            val c = chars[i].lowercaseChar()
            if (substitutions.containsKey(c)) {
                val newChars = chars.clone()
                // Keep original capitalization
                if (chars[i].isUpperCase()) {
                    newChars[i] = substitutions[c]!!.uppercaseChar()
                } else {
                    newChars[i] = substitutions[c]!!
                }
                nameVariations.add(String(newChars))
            }
        }

        // For each variation, check if there's an exact match in the data
        for (variation in nameVariations) {
            val exactMatches = findMatchingStudents(variation)
            if (exactMatches.isNotEmpty()) {
                return exactMatches.first()
            }
        }

        // If no exact match found, use fuzzy matching
        val allVariationsWithScores = nameVariations
            .flatMap { variation -> findMatchingStudentsWithFuzzy(variation, 0.6) }
            .sortedByDescending { it.second }

        return if (allVariationsWithScores.isNotEmpty()) {
            allVariationsWithScores.first().first
        } else {
            recognizedName // Return original if no matches found
        }
    }

    sealed class ValidationResult {
        object Valid : ValidationResult()
        data class ExceedsMaximum(val maxScore: Double) : ValidationResult()
        object NegativeValue : ValidationResult()
        data class NearMaximum(val maxScore: Double) : ValidationResult()
    }

    private fun updateSelectedSheetInFile(excelFile: ExcelFileItem, updatedData: List<Map<String, String>>) {
        val newSheetContent = SheetContent(
            headers = excelFile.getSheetContent(selectedSheetName ?: "")?.headers ?: emptyList(),
            data = updatedData
        )
        
        val newAllSheets = excelFile.all_sheets.toMutableMap()
        newAllSheets[selectedSheetName ?: ""] = newSheetContent
        
        selectedExcelFile = excelFile.copy(all_sheets = newAllSheets)
        
        // Update in the list as well
        excelUIState = ExcelUIState.Success(
            (excelUIState as? ExcelUIState.Success)?.excelFiles?.map { file ->
                if (file.id == excelFile.id) selectedExcelFile!! else file
            } ?: emptyList()
        )
    }
    
    /**
     * Calculate similarity between two name strings using Levenshtein distance
     */
    private fun calculateNameSimilarity(name1: String, name2: String): Double {
        val s1 = name1.lowercase().trim()
        val s2 = name2.lowercase().trim()
        
        // Exact match
        if (s1 == s2) return 1.0
        
        // Contains match
        if (s1.contains(s2) || s2.contains(s1)) return 0.8
        
        // Levenshtein distance based similarity
        val maxLen = maxOf(s1.length, s2.length)
        if (maxLen == 0) return 0.0
        
        val distance = levenshteinDistance(s1, s2)
        return 1.0 - (distance.toDouble() / maxLen)
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     */
    private fun levenshteinDistance(str1: String, str2: String): Int {
        val matrix = Array(str1.length + 1) { IntArray(str2.length + 1) }
        
        for (i in 0..str1.length) matrix[i][0] = i
        for (j in 0..str2.length) matrix[0][j] = j
        
        for (i in 1..str1.length) {
            for (j in 1..str2.length) {
                val cost = if (str1[i-1] == str2[j-1]) 0 else 1
                matrix[i][j] = minOf(
                    matrix[i-1][j] + 1,      // deletion
                    matrix[i][j-1] + 1,      // insertion
                    matrix[i-1][j-1] + cost  // substitution
                )
            }
        }
        
        return matrix[str1.length][str2.length]
    }

    fun saveVoiceEntriesToBackend(
        voiceEntries: List<VoiceEntry>, // Assuming you have a VoiceEntry model
        columnName: String,
        onProgress: (Int, Int) -> Unit = { _, _ -> },
        onComplete: (Int, Int) -> Unit
    ) {
        Log.d("ExcelViewModel", "🎯 Starting to save ${voiceEntries.size} voice entries to backend")
        Log.d("ExcelViewModel", "Column: $columnName")

        if (voiceEntries.isEmpty()) {
            Log.w("ExcelViewModel", "No voice entries to save")
            onComplete(0, 0)
            return
        }

        val file = selectedExcelFile
        if (file == null) {
            Log.e("ExcelViewModel", "No selected Excel file")
            onComplete(0, 0)
            return
        }

        var successCount = 0
        var failureCount = 0
        val totalEntries = voiceEntries.size

        viewModelScope.launch {
            Log.d("ExcelViewModel", "Processing ${totalEntries} voice entries...")

            voiceEntries.forEachIndexed { index, entry ->
                Log.d("ExcelViewModel", "Processing entry ${index + 1}/$totalEntries: ${entry.fullStudentName} = ${entry.score}")

                // Use your existing updateStudentValue method
                var updateSuccess = false

                try {
                    // Call updateStudentValue which already handles the API call
                    updateStudentValue(
                        studentName = entry.fullStudentName,
                        columnName = columnName,
                        value = entry.score
                    ) { success ->
                        updateSuccess = success
                        if (success) {
                            Log.d("ExcelViewModel", "✅ Successfully saved: ${entry.fullStudentName} = ${entry.score}")
                            successCount++
                            recordSuccessfulEntry(entry.fullStudentName, columnName, entry.score)
                        } else {
                            Log.e("ExcelViewModel", "❌ Failed to save: ${entry.fullStudentName} = ${entry.score}")
                            failureCount++
                            recordFailedEntry(entry.fullStudentName, columnName, entry.score)
                        }
                    }

                    // Small delay to prevent overwhelming the API
                    delay(300)

                } catch (e: Exception) {
                    Log.e("ExcelViewModel", "❌ Exception saving entry: ${entry.fullStudentName}", e)
                    failureCount++
                    recordFailedEntry(entry.fullStudentName, columnName, entry.score)
                }

                // Report progress
                onProgress(index + 1, totalEntries)
            }

            Log.d("ExcelViewModel", "🎯 Voice entries save complete: $successCount successes, $failureCount failures")
            onComplete(successCount, failureCount)
        }
    }

    fun saveSingleVoiceEntry(
        studentName: String,
        columnName: String,
        score: String,
        onComplete: (Boolean) -> Unit
    ) {
        Log.d("ExcelViewModel", "🎯 Saving single voice entry: $studentName = $score in column $columnName")

        // Use your existing updateStudentValue method
        updateStudentValue(
            studentName = studentName,
            columnName = columnName,
            value = score
        ) { success ->
            if (success) {
                Log.d("ExcelViewModel", "✅ Single voice entry saved successfully")
                recordSuccessfulEntry(studentName, columnName, score)
            } else {
                Log.e("ExcelViewModel", "❌ Failed to save single voice entry")
                recordFailedEntry(studentName, columnName, score)
            }
            onComplete(success)
        }
    }
}

sealed class ExcelUIState {
    object Loading : ExcelUIState()
    data class Success(val excelFiles: List<ExcelFileItem>) : ExcelUIState()
    data class Error(val message: String) : ExcelUIState()
    object Empty : ExcelUIState()
}
