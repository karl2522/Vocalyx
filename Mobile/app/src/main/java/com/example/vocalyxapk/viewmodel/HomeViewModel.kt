package com.example.vocalyxapk.viewmodel

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.models.CourseItem
import com.example.vocalyxapk.models.ClassItem
import com.example.vocalyxapk.models.TeamItem
import com.example.vocalyxapk.repository.CourseRepository
import com.example.vocalyxapk.repository.TeamRepository
import com.example.vocalyxapk.utils.TokenManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

data class HomeUiState(
    val isLoading: Boolean = false,
    val courses: List<CourseItem> = emptyList(),
    val classes: List<ClassItem> = emptyList(),
    val recentCourses: List<CourseItem> = emptyList(),
    val completedCourses: List<CourseItem> = emptyList(),
    val teams: List<TeamItem> = emptyList(),
    val recentTeams: List<TeamItem> = emptyList(),
    val error: String? = null,
    val stats: HomeStats = HomeStats(),
    val isRefreshing: Boolean = false,
    val userName: String = "User",
    val userEmail: String = ""
)

data class HomeStats(
    val totalCourses: Int = 0,
    val totalClasses: Int = 0,
    val activeCourses: Int = 0,
    val completedCourses: Int = 0,
    val totalStudents: Int = 0,
    val totalTeams: Int = 0,
    val ownedTeams: Int = 0,
    val joinedTeams: Int = 0
)

class HomeViewModel : ViewModel() {
    private val courseRepository = CourseRepository()

    private val teamRepository = TeamRepository()

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    // For pull-to-refresh
    var isRefreshing by mutableStateOf(false)
        private set

    private var context: Context? = null

    fun initialize(context: Context) {
        this.context = context
        loadUserInfo()
        loadHomeData()
    }

    private fun loadUserInfo() {
        context?.let { ctx ->
            val userName = TokenManager.getUserName(ctx) ?: "User"
            val userEmail = TokenManager.getUserEmail(ctx) ?: ""

            _uiState.value = _uiState.value.copy(
                userName = userName,
                userEmail = userEmail
            )
        }
    }

    fun loadHomeData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            try {
                // Load courses
                val coursesResult = courseRepository.getCourses()
                // Load all classes
                val classesResult = courseRepository.getAllClasses()
                // Load teams
                val teamsResult = teamRepository.getMyTeams()

                if (coursesResult.isSuccess && classesResult.isSuccess && teamsResult.isSuccess) {
                    val courses = coursesResult.getOrNull() ?: emptyList()
                    val classes = classesResult.getOrNull() ?: emptyList()
                    val teams = teamsResult.getOrNull() ?: emptyList()

                    // Process data for UI
                    val recentCourses = courses.filter { it.status == "active" }
                        .sortedByDescending { parseDate(it.updated_at) }
                        .take(3)

                    val completedCourses = courses.filter { it.status == "completed" }
                        .sortedByDescending { parseDate(it.updated_at) }
                        .take(3)

                    val recentTeams = teams.sortedByDescending { parseDate(it.updated_at) }
                        .take(3)

                    // Calculate total students across all courses
                    val totalStudents = courses.sumOf { it.student_count }

                    // 🎯 UPDATED: Calculate team stats with proper user ID
                    val currentUserId = getCurrentUserId()
                    val ownedTeams = teams.count { it.owner.toString() == currentUserId }
                    val joinedTeams = teams.count { it.owner.toString() != currentUserId }

                    val stats = HomeStats(
                        totalCourses = courses.size,
                        totalClasses = classes.size,
                        activeCourses = courses.count { it.status == "active" },
                        completedCourses = courses.count { it.status == "completed" },
                        totalStudents = totalStudents,
                        totalTeams = teams.size,
                        ownedTeams = ownedTeams,
                        joinedTeams = joinedTeams
                    )

                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        courses = courses,
                        classes = classes,
                        recentCourses = recentCourses,
                        completedCourses = completedCourses,
                        teams = teams,
                        recentTeams = recentTeams,
                        stats = stats,
                        error = null,
                        isRefreshing = false
                    )
                } else {
                    val errorMessage = coursesResult.exceptionOrNull()?.message
                        ?: classesResult.exceptionOrNull()?.message
                        ?: teamsResult.exceptionOrNull()?.message
                        ?: "Failed to load data"

                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = errorMessage,
                        isRefreshing = false
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Unknown error occurred",
                    isRefreshing = false
                )
            }
        }
    }

    private fun getCurrentUserId(): String? {
        return context?.let { ctx ->
            TokenManager.getUserId(ctx)
        }
    }

    fun refreshData() {
        isRefreshing = true
        _uiState.value = _uiState.value.copy(isRefreshing = true)
        loadUserInfo() // Refresh user info too
        loadHomeData()
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    private fun parseDate(dateString: String): Date {
        return try {
            // Try multiple date formats
            val formats = listOf(
                "yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'",
                "yyyy-MM-dd'T'HH:mm:ss'Z'",
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd"
            )

            for (format in formats) {
                try {
                    val sdf = SimpleDateFormat(format, Locale.getDefault())
                    return sdf.parse(dateString) ?: Date()
                } catch (e: Exception) {
                    continue
                }
            }
            Date() // Return current date if parsing fails
        } catch (e: Exception) {
            Date() // Return current date if parsing fails
        }
    }

    fun formatDate(dateString: String): String {
        return try {
            val date = parseDate(dateString)
            val sdf = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
            sdf.format(date)
        } catch (e: Exception) {
            dateString // Return original string if formatting fails
        }
    }
}