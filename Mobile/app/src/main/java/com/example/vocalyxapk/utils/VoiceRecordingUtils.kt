package com.example.vocalyxapk.utils

import android.util.Log
import com.example.vocalyxapk.models.StudentData
import com.example.vocalyxapk.models.StudentMatch
import com.example.vocalyxapk.models.ParseResult

/**
 * Calculates the similarity between two strings using various matching algorithms
 */
fun calculateSimilarity(str1: String, str2: String): Double {
    val s1 = str1.lowercase()
    val s2 = str2.lowercase()
    
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
 * Calculates the Levenshtein distance between two strings
 */
fun levenshteinDistance(str1: String, str2: String): Int {
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

/**
 * Finds matching students based on the recognized name
 */
fun findStudentMatches(recognizedName: String, studentData: List<StudentData>): List<StudentMatch> {
    Log.d("VoiceRecording", "=== FIND STUDENT MATCHES DEBUG ===")
    Log.d("VoiceRecording", "Looking for: '$recognizedName'")
    Log.d("VoiceRecording", "Total students in data: ${studentData.size}")
    
    val matches = mutableListOf<StudentMatch>()
    
    studentData.forEach { student ->
        // Check first name match
        val firstNameSimilarity = calculateSimilarity(recognizedName, student.firstName)
        val lastNameSimilarity = calculateSimilarity(recognizedName, student.lastName)
        val fullNameSimilarity = calculateSimilarity(recognizedName, student.fullName)
        
        val bestSimilarity = maxOf(firstNameSimilarity, lastNameSimilarity, fullNameSimilarity)
        
        Log.d("VoiceRecording", "Student: '${student.fullName}' - First: $firstNameSimilarity, Last: $lastNameSimilarity, Full: $fullNameSimilarity, Best: $bestSimilarity")
        
        if (bestSimilarity > 0.6) { // Threshold for fuzzy matching
            matches.add(
                StudentMatch(
                    fullName = student.fullName,
                    firstName = student.firstName,
                    lastName = student.lastName,
                    similarity = bestSimilarity,
                    rowData = student.rowData
                )
            )
        }
    }
    
    val sortedMatches = matches.sortedByDescending { it.similarity }.take(5)
    Log.d("VoiceRecording", "Found ${sortedMatches.size} matches:")
    sortedMatches.forEach { match ->
        Log.d("VoiceRecording", "  - ${match.fullName} (${(match.similarity * 100).toInt()}%)")
    }
    
    return sortedMatches
}

/**
 * Parses transcription text to extract student name and score
 */
fun parseTranscription(transcription: String): ParseResult {
    Log.d("VoiceRecording", "=== PARSE TRANSCRIPTION DEBUG ===")
    Log.d("VoiceRecording", "Input transcription: '$transcription'")

    val cleanText = transcription.trim()

    // Look for number patterns (score)
    val scorePattern = Regex("""\b(\d+(?:\.\d+)?)\b""")
    val scoreMatches = scorePattern.findAll(cleanText).map { it.value }.toList()

    Log.d("VoiceRecording", "Found potential scores: $scoreMatches")

    val score = scoreMatches.firstOrNull()

    // Extract name by removing ONLY the score numbers, not other words
    val nameText = if (score != null) {
        cleanText
            .replace(Regex("""\b${Regex.escape(score)}\b"""), "") // Remove only the specific score found
            .replace(Regex("""[.,!?]"""), "") // Remove punctuation
            .replace(Regex("""\s+"""), " ") // Replace multiple spaces with single space
            .trim()
    } else {
        cleanText
            .replace(Regex("""[.,!?]"""), "") // Remove punctuation only
            .replace(Regex("""\s+"""), " ") // Clean up spaces
            .trim()
    }

    // Only remove obvious duplicates or repeated words, not arbitrary text
    val cleanedName = removeDuplicateWords(nameText)

    Log.d("VoiceRecording", "Extracted name after cleaning: '$cleanedName'")
    Log.d("VoiceRecording", "Found score: '$score'")

    val result = ParseResult(
        recognizedName = if (cleanedName.isNotBlank()) cleanedName else null,
        score = score
    )

    Log.d("VoiceRecording", "Parse result - Name: '${result.recognizedName}', Score: '${result.score}'")

    return result
}

fun removeDuplicateWords(text: String): String {
    val words = text.lowercase().split(Regex("""\s+"""))
    val cleanedWords = mutableListOf<String>()

    var i = 0
    while (i < words.size) {
        val currentWord = words[i]

        // Add the word
        cleanedWords.add(currentWord)

        // Skip any immediate duplicates of the same word
        while (i + 1 < words.size && words[i + 1] == currentWord) {
            Log.d("VoiceRecording", "Removing duplicate word: ${words[i + 1]}")
            i++
        }

        i++
    }

    return cleanedWords.joinToString(" ")
}