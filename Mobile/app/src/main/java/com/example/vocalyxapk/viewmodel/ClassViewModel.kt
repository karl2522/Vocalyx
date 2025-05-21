package com.example.vocalyxapk.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.models.ClassItem
import com.example.vocalyxapk.models.ClassUpdateRequest
import com.example.vocalyxapk.models.CourseItem
import com.example.vocalyxapk.models.CourseUpdateRequest
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

sealed class CourseUpdateState {
    object Idle : CourseUpdateState()
    object Loading : CourseUpdateState()
    data class Success(val course: CourseItem) : CourseUpdateState()
    data class Error(val message: String) : CourseUpdateState()
}

sealed class CourseDeleteState {
    object Idle : CourseDeleteState()
    object Loading : CourseDeleteState()
    object Success : CourseDeleteState()
    data class Error(val message: String) : CourseDeleteState()
}

sealed class ClassUpdateState {
    object Idle : ClassUpdateState()
    object Loading : ClassUpdateState()
    data class Success(val classItem: ClassItem) : ClassUpdateState()
    data class Error(val message: String) : ClassUpdateState()
}


sealed class ClassDeleteState {
    object Idle : ClassDeleteState()
    object Loading : ClassDeleteState()
    object Success : ClassDeleteState()
    data class Error(val message: String) : ClassDeleteState()
}

class ClassViewModel(application: Application) : AndroidViewModel(application) {
    private val classRepository = ClassRepository(application)

    private val _classUIState = MutableStateFlow<ClassUIState>(ClassUIState.Idle)
    val classUIState: StateFlow<ClassUIState> = _classUIState

    private val _courseUIState = MutableStateFlow<CourseUIState>(CourseUIState.Idle)
    val courseUIState: StateFlow<CourseUIState> = _courseUIState

    private val _courseUpdateState = MutableStateFlow<CourseUpdateState>(CourseUpdateState.Idle)
    val courseUpdateState: StateFlow<CourseUpdateState> = _courseUpdateState

    private val _courseDeleteState = MutableStateFlow<CourseDeleteState>(CourseDeleteState.Idle)
    val courseDeleteState: StateFlow<CourseDeleteState> = _courseDeleteState

    private val _classUpdateState = MutableStateFlow<ClassUpdateState>(ClassUpdateState.Idle)
    val classUpdateState: StateFlow<ClassUpdateState> = _classUpdateState

    private val _classDeleteState = MutableStateFlow<ClassDeleteState>(ClassDeleteState.Idle)
    val classDeleteState: StateFlow<ClassDeleteState> = _classDeleteState

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

    fun updateCourseStatus(courseId: Int, newStatus: String) {
        viewModelScope.launch {
            _courseUpdateState.value = CourseUpdateState.Loading
            android.util.Log.d("ClassViewModel", "Updating course $courseId status to $newStatus")

            try {
                val result = classRepository.updateCourseStatus(courseId, newStatus)

                result.fold(
                    onSuccess = { course ->
                        android.util.Log.d("ClassViewModel", "Course status updated successfully")
                        _courseUpdateState.value = CourseUpdateState.Success(course)
                        // Refresh the courses list
                        fetchCourses()
                    },
                    onFailure = { exception ->
                        android.util.Log.e("ClassViewModel", "Error updating course status", exception)
                        _courseUpdateState.value = CourseUpdateState.Error(exception.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("ClassViewModel", "Exception in updateCourseStatus", e)
                _courseUpdateState.value = CourseUpdateState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun updateCourse(
        courseId: Int,
        name: String? = null,
        courseCode: String? = null,
        semester: String? = null,
        academicYear: String? = null,
        description: String? = null
    ) {
        viewModelScope.launch {
            _courseUpdateState.value = CourseUpdateState.Loading
            android.util.Log.d("ClassViewModel", "Updating course $courseId")

            try {
                val updateRequest = CourseUpdateRequest(
                    name = name,
                    courseCode = courseCode,
                    semester = semester,
                    academic_year = academicYear,
                    description = description
                )

                android.util.Log.d("ClassViewModel", "Sending update with course_code: ${updateRequest.courseCode}")

                val result = classRepository.updateCourse(courseId, updateRequest)

                result.fold(
                    onSuccess = { course ->
                        android.util.Log.d("ClassViewModel", "Course updated successfully")
                        _courseUpdateState.value = CourseUpdateState.Success(course)
                        fetchCourses()
                    },
                    onFailure = { exception ->
                        android.util.Log.e("ClassViewModel", "Error updating course", exception)
                        _courseUpdateState.value = CourseUpdateState.Error(exception.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("ClassViewModel", "Exception in updateCourse", e)
                _courseUpdateState.value = CourseUpdateState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun deleteCourse(courseId: Int) {
        viewModelScope.launch {
            _courseDeleteState.value = CourseDeleteState.Loading
            android.util.Log.d("ClassViewModel", "Deleting course $courseId")

            try {
                val result = classRepository.deleteCourse(courseId)

                result.fold(
                    onSuccess = {
                        android.util.Log.d("ClassViewModel", "Course deleted successfully")
                        _courseDeleteState.value = CourseDeleteState.Success
                        fetchCourses()
                    },
                    onFailure = { exception ->
                        android.util.Log.e("ClassViewModel", "Error deleting course", exception)
                        _courseDeleteState.value = CourseDeleteState.Error(exception.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("ClassViewModel", "Exception in deleteCourse", e)
                _courseDeleteState.value = CourseDeleteState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun updateClassStatus(classId: Int, newStatus: String) {
        viewModelScope.launch {
            _classUpdateState.value = ClassUpdateState.Loading
            android.util.Log.d("ClassViewModel", "Updating class $classId status to $newStatus")

            try {
                val result = classRepository.updateClassStatus(classId, newStatus)

                result.fold(
                    onSuccess = { classItem ->
                        android.util.Log.d("ClassViewModel", "Class status updated successfully")
                        _classUpdateState.value = ClassUpdateState.Success(classItem)
                        // Refresh the classes list
                        fetchClasses(_currentCourseId.value)
                    },
                    onFailure = { exception ->
                        android.util.Log.e("ClassViewModel", "Error updating class status", exception)
                        _classUpdateState.value = ClassUpdateState.Error(exception.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("ClassViewModel", "Exception in updateClassStatus", e)
                _classUpdateState.value = ClassUpdateState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun updateClass(
        classId: Int,
        name: String? = null,
        section: String? = null,
        description: String? = null,
        semester: String? = null,
        schedule: String? = null
    ) {
        viewModelScope.launch {
            _classUpdateState.value = ClassUpdateState.Loading
            android.util.Log.d("ClassViewModel", "Updating class $classId")

            try {
                val updateRequest = ClassUpdateRequest(
                    name = name,
                    section = section,
                    description = description,
                    semester = semester,
                    schedule = schedule
                )

                val result = classRepository.updateClass(classId, updateRequest)

                result.fold(
                    onSuccess = { classItem ->
                        android.util.Log.d("ClassViewModel", "Class updated successfully")
                        _classUpdateState.value = ClassUpdateState.Success(classItem)
                        // Refresh the classes list
                        fetchClasses(_currentCourseId.value)
                    },
                    onFailure = { exception ->
                        android.util.Log.e("ClassViewModel", "Error updating class", exception)
                        _classUpdateState.value = ClassUpdateState.Error(exception.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("ClassViewModel", "Exception in updateClass", e)
                _classUpdateState.value = ClassUpdateState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun deleteClass(classId: Int) {
        viewModelScope.launch {
            _classDeleteState.value = ClassDeleteState.Loading
            android.util.Log.d("ClassViewModel", "Deleting class $classId")

            try {
                val result = classRepository.deleteClass(classId)

                result.fold(
                    onSuccess = {
                        android.util.Log.d("ClassViewModel", "Class deleted successfully")
                        _classDeleteState.value = ClassDeleteState.Success
                        // Refresh the classes list
                        fetchClasses(_currentCourseId.value)
                    },
                    onFailure = { exception ->
                        android.util.Log.e("ClassViewModel", "Error deleting class", exception)
                        _classDeleteState.value = ClassDeleteState.Error(exception.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("ClassViewModel", "Exception in deleteClass", e)
                _classDeleteState.value = ClassDeleteState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun fetchClassesForCourse(courseId: Int) {
        viewModelScope.launch {
            _classUIState.value = ClassUIState.Loading
            try {
                val result = classRepository.getClasses(courseId)
                result.fold(
                    onSuccess = { classes ->
                        _classUIState.value = ClassUIState.Success(classes)
                    },
                    onFailure = { exception ->
                        _classUIState.value = ClassUIState.Error(exception.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                _classUIState.value = ClassUIState.Error(e.message ?: "Unknown error")
            }
        }
    }
}
