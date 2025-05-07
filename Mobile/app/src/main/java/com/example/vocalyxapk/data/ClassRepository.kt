package com.example.vocalyxapk.data

object ClassRepository {
    private val classes = mutableListOf<ImportedClass>()

    fun addClass(importedClass: ImportedClass) {
        classes.add(importedClass)
    }

    fun getClasses(): List<ImportedClass> = classes.toList()

    fun getClass(name: String, section: String): ImportedClass? {
        return classes.find { it.name == name && it.section == section }
    }
} 