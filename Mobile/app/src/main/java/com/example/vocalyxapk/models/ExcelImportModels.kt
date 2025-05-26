package com.example.vocalyxapk.models


enum class ImportStep {
    FILE_INFO,
    PREVIEW_DATA
}


data class ImportTemplate(
    val name: String,
    val columns: List<String>
)


data class ExcelImportState(
    val currentStep: ImportStep = ImportStep.FILE_INFO,
    val fileName: String = "",
    val fileUri: String = "",
    val previewData: List<List<String>> = emptyList(),
    val allColumns: List<String> = emptyList(),
    val selectedTemplate: ImportTemplate? = null,
    val columnMappings: Map<String, String> = emptyMap(),
    val customColumns: List<String> = emptyList()
)


enum class SystemField(val displayName: String) {
    STUDENT_ID("Student ID"),
    STUDENT_NAME("Student Name"),
    SCORE("Score"),
    DATE("Date"),
    TIME("Time"),
    ACTIVITY("Activity"),
    COMPLETION("Completion"),
    GRADE("Grade"),
    EXAM_NUMBER("Exam Number"),
    PERCENTAGE("Percentage")
}


object ImportTemplates {
    val QUIZ_TEMPLATE = ImportTemplate(
        name = "Quiz",
        columns = listOf("Student ID", "Student Name", "Score", "Date", "Time")
    )
    
    val ACTIVITY_TEMPLATE = ImportTemplate(
        name = "Lab Activity",
        columns = listOf("Student ID", "Student Name", "Activity", "Completion", "Grade")
    )
    
    val EXAM_TEMPLATE = ImportTemplate(
        name = "Exam",
        columns = listOf("Student ID", "Student Name", "Exam Number", "Score", "Percentage")
    )
    
    val ALL_TEMPLATES = listOf(QUIZ_TEMPLATE, ACTIVITY_TEMPLATE, EXAM_TEMPLATE)
}
