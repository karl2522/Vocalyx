package com.example.vocalyxapk.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.models.ClassItem
import com.example.vocalyxapk.models.CourseItem
import com.example.vocalyxapk.repository.ClassRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class ClassUIState {
    object Idle : ClassUIState()
    object Loading : ClassUIState()
    data class Success(val classes: List<ClassItem>) : ClassUIState()
    data class Error(val message: String) : ClassUIState()
}

sealed class CourseUIState {
    object Idle : CourseUIState()
    object Loading : CourseUIState()
    data class Success(val courses: List<CourseItem>) : CourseUIState()
    data class Error(val message: String) : CourseUIState()
}

sealed class CourseCreationState {
    object Idle : CourseCreationState()
    object Loading : CourseCreationState()
    data class Success(val course: CourseItem) : CourseCreationState()
    data class Error(val message: String) : CourseCreationState()
}

sealed class ClassCreationState {
    object Idle : ClassCreationState()
    object Loading : ClassCreationState()
    data class Success(val classItem: ClassItem) : ClassCreationState()
    data class Error(val message: String) : ClassCreationState()
}

class ClassViewModel(application: Application) : AndroidViewModel(application) {
    private val classRepository = ClassRepository(application)

    private val _classUIState = MutableStateFlow<ClassUIState>(ClassUIState.Idle)
    val classUIState: StateFlow<ClassUIState> = _classUIState

    private val _courseUIState = MutableStateFlow<CourseUIState>(CourseUIState.Idle)
    val courseUIState: StateFlow<CourseUIState> = _courseUIState
    
    // State for course creation
    private val _courseCreationState = MutableStateFlow<CourseCreationState>(CourseCreationState.Idle)
    val courseCreationState: StateFlow<CourseCreationState> = _courseCreationState
    
    // State for class creation
    private val _classCreationState = MutableStateFlow<ClassCreationState>(ClassCreationState.Idle)
    val classCreationState: StateFlow<ClassCreationState> = _classCreationState
    
    // Current course context for filtering classes
    private val _currentCourseId = MutableStateFlow<Int?>(null)
    val currentCourseId: StateFlow<Int?> = _currentCourseId

    init {
        fetchCourses()
    }

    fun setCurrentCourseContext(courseId: Int) {
        _currentCourseId.value = courseId
        android.util.Log.d("ClassViewModel", "Set current course context to ID: $courseId")
    }
    
    fun fetchClasses(courseId: Int? = null) {
        viewModelScope.launch {
            _classUIState.value = ClassUIState.Loading
            android.util.Log.d("ClassViewModel", "Fetching classes started for courseId: $courseId")
            
            try {
                android.util.Log.d("ClassViewModel", "Making repository call with courseId: $courseId")
                val result = classRepository.getClasses(courseId)
                android.util.Log.d("ClassViewModel", "Repository call completed")
                
                result.fold(
                    onSuccess = { classes ->
                        android.util.Log.d("ClassViewModel", "Classes fetched successfully: ${classes.size} classes")
                        android.util.Log.d("ClassViewModel", "Current course context: ${_currentCourseId.value}, Classes course IDs: ${classes.map { it.courseId }.toSet()}")
                        
                        // Classes are already filtered in the repository layer
                        _classUIState.value = ClassUIState.Success(classes)
                    },
                    onFailure = { exception ->
                        android.util.Log.e("ClassViewModel", "Error fetching classes", exception)
                        _classUIState.value = ClassUIState.Error(exception.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("ClassViewModel", "Exception in fetchClasses", e)
                _classUIState.value = ClassUIState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun fetchCourses() {
        viewModelScope.launch {
            _courseUIState.value = CourseUIState.Loading
            android.util.Log.d("ClassViewModel", "Fetching courses started")
            
            try {
                android.util.Log.d("ClassViewModel", "Making repository call for courses")
                val result = classRepository.getCourses()
                android.util.Log.d("ClassViewModel", "Repository call for courses completed")
                
                result.fold(
                    onSuccess = { courses ->
                        android.util.Log.d("ClassViewModel", "Courses fetched successfully: ${courses.size} courses")
                        _courseUIState.value = CourseUIState.Success(courses)
                        // Don't fetch all classes automatically - let each course view fetch its own classes
                    },
                    onFailure = { exception ->
                        android.util.Log.e("ClassViewModel", "Error fetching courses", exception)
                        _courseUIState.value = CourseUIState.Error(exception.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("ClassViewModel", "Exception in fetchCourses", e)
                _courseUIState.value = CourseUIState.Error(e.message ?: "Unknown error")
            }
        }
    }
    
    fun createCourse(name: String, courseCode: String, semester: String, description: String? = null, academicYear: String? = null) {
        viewModelScope.launch {
            _courseCreationState.value = CourseCreationState.Loading
            android.util.Log.d("ClassViewModel", "Creating new course: $name ($courseCode)")
            
            try {
                val result = classRepository.createCourse(
                    name = name,
                    courseCode = courseCode,
                    semester = semester,
                    description = description,
                    academicYear = academicYear
                )
                
                result.fold(
                    onSuccess = { course ->
                        android.util.Log.d("ClassViewModel", "Course created successfully: ${course.id}")
                        _courseCreationState.value = CourseCreationState.Success(course)
                        // Refresh the courses list
                        fetchCourses()
                    },
                    onFailure = { exception ->
                        android.util.Log.e("ClassViewModel", "Error creating course", exception)
                        _courseCreationState.value = CourseCreationState.Error(exception.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("ClassViewModel", "Exception in createCourse", e)
                _courseCreationState.value = CourseCreationState.Error(e.message ?: "Unknown error")
            }
        }
    }
    
    fun createClass(name: String, courseId: Int, section: String? = null, description: String? = null, semester: String? = null, schedule: String? = null) {
        viewModelScope.launch {
            _classCreationState.value = ClassCreationState.Loading
            android.util.Log.d("ClassViewModel", "Creating new class: $name for course ID: $courseId")
            
            try {
                val result = classRepository.createClass(
                    name = name,
                    courseId = courseId,
                    section = section,
                    description = description,
                    semester = semester,
                    schedule = schedule
                )
                
                result.fold(
                    onSuccess = { classItem ->
                        android.util.Log.d("ClassViewModel", "Class created successfully: ${classItem.id}")
                        _classCreationState.value = ClassCreationState.Success(classItem)
                        // Refresh the classes list for this course
                        fetchClasses(courseId)
                    },
                    onFailure = { exception ->
                        android.util.Log.e("ClassViewModel", "Error creating class", exception)
                        _classCreationState.value = ClassCreationState.Error(exception.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("ClassViewModel", "Exception in createClass", e)
                _classCreationState.value = ClassCreationState.Error(e.message ?: "Unknown error")
            }
        }
    }
}
