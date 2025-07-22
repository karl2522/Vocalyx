package com.example.vocalyxapk

import androidx.compose.runtime.mutableStateListOf

data class ImportedClass(
    val name: String,
    val section: String,
    val fileData: List<List<String>>
)

object ClassRepository {
    private val _classes = mutableStateListOf<ImportedClass>()
    val classes: List<ImportedClass> get() = _classes

    fun addClass(importedClass: ImportedClass) {
        _classes.add(importedClass)
    }

    fun updateClass(index: Int, updatedClass: ImportedClass) {
        if (index >= 0 && index < _classes.size) {
            _classes[index] = updatedClass
        }
    }

    fun clear() {
        _classes.clear()
    }
} 