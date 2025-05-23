package com.example.vocalyxapk.viewmodel

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.models.ExcelFileItem
import com.example.vocalyxapk.models.VoiceEntryRecord
import com.example.vocalyxapk.models.VoiceParseResult
import com.example.vocalyxapk.repository.ExcelRepository
import info.debatty.java.stringsimilarity.JaroWinkler
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

    var attemptedNames = mutableListOf<String>()
        private set

    private val _voiceEntryHistory = mutableListOf<VoiceEntryRecord>()
    val voiceEntryHistory: List<VoiceEntryRecord> get() = _voiceEntryHistory.toList()

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

    fun findMatchingStudentsWithFuzzy(nameFragment: String, threshold: Double = 0.75): List<Pair<String, Double>> {
        val file = selectedExcelFile ?: return emptyList()
        val sheet = selectedSheetName ?: return emptyList()
        val sheetContent = file.all_sheets[sheet] ?: return emptyList()

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
        val sheetContent = file.all_sheets[sheet] ?: return null

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

    fun getVoiceEntryStats(): Map<String, Int> {
        val total = _voiceEntryHistory.size
        val successful = _voiceEntryHistory.count { it.successful }
        val failed = total - successful

        return mapOf(
            "total" to total,
            "successful" to successful,
            "failed" to failed
        )
    }

    fun correctCommonPhoneticMismatches(recognizedName: String): String {
        // Common Filipino/English phonetic substitutions
        val substitutions = mapOf(
            'k' to 'c', 'c' to 'k',  // k/c swap (Kabanada -> Cabanada)
            'v' to 'b', 'b' to 'v',  // v/b swap
            's' to 'z', 'z' to 's',  // s/z swap
            'f' to 'p', 'p' to 'f',  // f/p swap in some dialects
            'j' to 'h', 'h' to 'j'   // j/h swap in some names
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
}

sealed class ExcelUIState {
    object Loading : ExcelUIState()
    data class Success(val excelFiles: List<ExcelFileItem>) : ExcelUIState()
    data class Error(val message: String) : ExcelUIState()
    object Empty : ExcelUIState()
}
