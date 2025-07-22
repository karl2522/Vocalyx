package com.example.vocalyxapk.composables

import android.content.Context
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Class
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.ui.theme.DMSans
import com.example.vocalyxapk.utils.withDMSansBold
import com.example.vocalyxapk.utils.withDMSansMedium
import com.example.vocalyxapk.utils.withDMSansRegular
import com.example.vocalyxapk.viewmodel.HomeViewModel
import com.example.vocalyxapk.models.CourseItem
import com.example.vocalyxapk.models.TeamItem
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeTab(
    modifier: Modifier = Modifier,
    onNavigateToAddCourse: () -> Unit = {},
    onNavigateToSchedule: () -> Unit = {},
    onNavigateToCourseList: () -> Unit = {},
    onNavigateToTeamList: () -> Unit = {},
    onNavigateToCourseDetail: (String) -> Unit = {},
    onNavigateToTeamDetail: (String) -> Unit = {},
    onNavigateToStatSection: (String) -> Unit = {},
    homeViewModel: HomeViewModel = viewModel()
) {
    // Collect UI state
    val uiState by homeViewModel.uiState.collectAsStateWithLifecycle()

    // Username - Get from shared preferences or user session
    val context = LocalContext.current
    val username = uiState.userName

    LaunchedEffect(Unit) {
        homeViewModel.initialize(context)
    }

    // Convert real data to display format
    val statsData = remember(uiState.stats) {
        listOf(
            StatCardData(
                title = "Courses",
                value = uiState.stats.totalCourses.toString(),
                icon = Icons.Filled.School,
                trend = "up",
                change = if (uiState.stats.totalCourses > 0) "Active" else "None",
                iconBackground = Brush.linearGradient(
                    colors = listOf(Color(0xFF333D79), Color(0xFF4A5495))
                )
            ),
            StatCardData(
                title = "Classes",
                value = uiState.stats.totalClasses.toString(),
                icon = Icons.Outlined.Class,
                trend = "up",
                change = if (uiState.stats.totalClasses > 0) "Available" else "None",
                iconBackground = Brush.linearGradient(
                    colors = listOf(Color(0xFF4CAF50), Color(0xFF81C784))
                )
            ),
            StatCardData(
                title = "Teams",
                value = uiState.stats.totalTeams.toString(),
                icon = Icons.Filled.Group,
                trend = "up",
                change = if (uiState.stats.totalTeams > 0) "Joined" else "None",
                iconBackground = Brush.linearGradient(
                    colors = listOf(Color(0xFF2196F3), Color(0xFF64B5F6))
                )
            )
        )
    }

    // State for active tab in courses section
    var activeCoursesTab by remember { mutableStateOf("recent") }

    // Animation for welcome section
    var isWelcomeVisible by remember { mutableStateOf(false) }
    val welcomeAlpha by animateFloatAsState(
        targetValue = if (isWelcomeVisible) 1f else 0f,
        animationSpec = tween(500), label = "welcomeAlpha"
    )

    LaunchedEffect(Unit) {
        isWelcomeVisible = true
    }

    // Swipe refresh state
    val swipeRefreshState = rememberSwipeRefreshState(uiState.isRefreshing)

    // Show loading state on first load
    if (uiState.isLoading && uiState.courses.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                CircularProgressIndicator(
                    color = Color(0xFF333D79)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Loading your dashboard...",
                    style = MaterialTheme.typography.bodyMedium.withDMSansRegular(),
                    color = Color.Gray
                )
            }
        }
        return
    }

    // Error state
    uiState.error?.let { error ->
        if (uiState.courses.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = Icons.Filled.ErrorOutline,
                    contentDescription = "Error",
                    tint = Color.Red,
                    modifier = Modifier.size(64.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Oops! Something went wrong",
                    style = MaterialTheme.typography.titleMedium.withDMSansBold(),
                    color = Color(0xFF333333)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = error,
                    style = MaterialTheme.typography.bodyMedium.withDMSansRegular(),
                    textAlign = TextAlign.Center,
                    color = Color.Gray
                )
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = {
                        homeViewModel.clearError()
                        homeViewModel.refreshData()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF333D79)
                    )
                ) {
                    Icon(
                        imageVector = Icons.Filled.Refresh,
                        contentDescription = "Retry",
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Try Again")
                }
            }
            return
        }
    }

    SwipeRefresh(
        state = swipeRefreshState,
        onRefresh = { homeViewModel.refreshData() }
    ) {
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(vertical = 16.dp)
        ) {
            // Welcome section
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .alpha(welcomeAlpha)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(
                                        Color(0xFF333D79),
                                        Color(0xFF4A5495)
                                    )
                                )
                            )
                            .padding(20.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    text = "Welcome back,",
                                    style = MaterialTheme.typography.bodyLarge.withDMSansRegular(),
                                    color = Color.White.copy(alpha = 0.8f)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = username,
                                    style = MaterialTheme.typography.headlineMedium.withDMSansBold(),
                                    color = Color.White
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Your audio and recordings dashboard for tracking educational progress.",
                                    style = MaterialTheme.typography.bodyMedium.withDMSansRegular(),
                                    color = Color.White.copy(alpha = 0.8f)
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .size(60.dp)
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Dashboard,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(30.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Button(
                                onClick = { onNavigateToAddCourse() },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color.White
                                ),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.Add,
                                        contentDescription = null,
                                        tint = Color(0xFF333D79),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = "Add Course",
                                        color = Color(0xFF333D79),
                                        style = MaterialTheme.typography.labelMedium.withDMSansMedium(),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }

                            OutlinedButton(
                                onClick = { onNavigateToSchedule() },
                                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.5f)),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = Color.White
                                ),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(
                                        imageVector = Icons.Rounded.CalendarToday,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = "Schedule",
                                        style = MaterialTheme.typography.labelMedium.withDMSansMedium(),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Stats cards section with real data
            item {
                Text(
                    text = "Overview",
                    style = MaterialTheme.typography.titleLarge.withDMSansBold(),
                    color = Color(0xFF333D79),
                    modifier = Modifier.padding(vertical = 8.dp)
                )

                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(vertical = 4.dp)
                ) {
                    items(statsData) { stat ->
                        StatCard(stat, onNavigateToStatSection)
                    }
                }
            }

            // Courses section with real data
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.White)
                        .border(
                            width = 1.dp,
                            color = Color(0xFFE0E0E0),
                            shape = RoundedCornerShape(16.dp)
                        )
                ) {
                    // Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFFEEF0F8)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.School,
                                    contentDescription = null,
                                    tint = Color(0xFF333D79),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "My Courses",
                                style = MaterialTheme.typography.titleMedium.withDMSansBold(),
                                color = Color(0xFF333D79)
                            )
                        }

                        TextButton(onClick = { onNavigateToCourseList() }) {
                            Text(
                                text = "View All",
                                style = MaterialTheme.typography.labelMedium.withDMSansMedium(),
                                color = Color(0xFF333D79)
                            )
                            Icon(
                                imageVector = Icons.Filled.ChevronRight,
                                contentDescription = null,
                                tint = Color(0xFF333D79),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    // Tab row
                    TabRow(
                        selectedTabIndex = when(activeCoursesTab) {
                            "recent" -> 0
                            "completed" -> 1
                            else -> 0
                        },
                        containerColor = Color(0xFFF8F9FF),
                        contentColor = Color(0xFF333D79),
                        indicator = { tabPositions ->
                            TabRowDefaults.Indicator(
                                modifier = Modifier.tabIndicatorOffset(
                                    tabPositions[when(activeCoursesTab) {
                                        "recent" -> 0
                                        "completed" -> 1
                                        else -> 0
                                    }]
                                ),
                                height = 3.dp,
                                color = Color(0xFF333D79)
                            )
                        }
                    ) {
                        Tab(
                            selected = activeCoursesTab == "recent",
                            onClick = { activeCoursesTab = "recent" },
                            text = {
                                Text(
                                    text = "Recent",
                                    style = MaterialTheme.typography.labelMedium.withDMSansMedium()
                                )
                            }
                        )
                        Tab(
                            selected = activeCoursesTab == "completed",
                            onClick = { activeCoursesTab = "completed" },
                            text = {
                                Text(
                                    text = "Completed",
                                    style = MaterialTheme.typography.labelMedium.withDMSansMedium()
                                )
                            }
                        )
                    }

                    // Course list with real data
                    AnimatedVisibility(visible = activeCoursesTab == "recent") {
                        Column {
                            if (uiState.recentCourses.isNotEmpty()) {
                                uiState.recentCourses.forEach { course ->
                                    RealCourseItem(course, onNavigateToCourseDetail, homeViewModel)
                                    if (course != uiState.recentCourses.last()) {
                                        Divider(color = Color(0xFFE0E0E0))
                                    }
                                }
                            } else {
                                EmptyStateMessage(
                                    icon = Icons.Filled.School,
                                    message = "No recent courses",
                                    iconTint = Color(0xFF333D79)
                                )
                            }
                        }
                    }

                    AnimatedVisibility(visible = activeCoursesTab == "completed") {
                        Column {
                            if (uiState.completedCourses.isNotEmpty()) {
                                uiState.completedCourses.forEach { course ->
                                    RealCourseItem(course, onNavigateToCourseDetail, homeViewModel)
                                    if (course != uiState.completedCourses.last()) {
                                        Divider(color = Color(0xFFE0E0E0))
                                    }
                                }
                            } else {
                                EmptyStateMessage(
                                    icon = Icons.Filled.Check,
                                    message = "No completed courses yet",
                                    iconTint = Color(0xFF4CAF50)
                                )
                            }
                        }
                    }
                }
            }

            // Teams section (placeholder for now)
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.White)
                        .border(
                            width = 1.dp,
                            color = Color(0xFFE0E0E0),
                            shape = RoundedCornerShape(16.dp)
                        )
                ) {
                    // Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFFEEF0F8)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Group,
                                    contentDescription = null,
                                    tint = Color(0xFF333D79),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "My Teams",
                                style = MaterialTheme.typography.titleMedium.withDMSansBold(),
                                color = Color(0xFF333D79)
                            )
                        }

                        TextButton(onClick = { onNavigateToTeamList() }) {
                            Text(
                                text = "View All",
                                style = MaterialTheme.typography.labelMedium.withDMSansMedium(),
                                color = Color(0xFF333D79)
                            )
                            Icon(
                                imageVector = Icons.Filled.ChevronRight,
                                contentDescription = null,
                                tint = Color(0xFF333D79),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    // 🎯 NEW: Teams list with real data
                    if (uiState.recentTeams.isNotEmpty()) {
                        uiState.recentTeams.forEach { team ->
                            RealTeamItem(team, onNavigateToTeamDetail, homeViewModel)
                            if (team != uiState.recentTeams.last()) {
                                Divider(color = Color(0xFFE0E0E0))
                            }
                        }
                    } else {
                        EmptyStateMessage(
                            icon = Icons.Filled.Group,
                            message = "No teams joined yet",
                            iconTint = Color(0xFF2196F3)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun RealCourseItem(
    course: CourseItem,
    onNavigateToCourseDetail: (String) -> Unit = {},
    homeViewModel: HomeViewModel
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onNavigateToCourseDetail(course.id.toString()) }
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(
                    when (course.status) {
                        "active" -> Color(0xFFEEF0F8)
                        "completed" -> Color(0xFFE8F5E9)
                        else -> Color(0xFFF5F5F5)
                    }
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = when (course.status) {
                    "active" -> Icons.Filled.School
                    "completed" -> Icons.Filled.Check
                    else -> Icons.Filled.School
                },
                contentDescription = null,
                tint = when (course.status) {
                    "active" -> Color(0xFF333D79)
                    "completed" -> Color(0xFF4CAF50)
                    else -> Color(0xFF757575)
                },
                modifier = Modifier.size(24.dp)
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = course.name,
                style = MaterialTheme.typography.bodyMedium.withDMSansMedium(),
                color = Color(0xFF333333),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(2.dp))

            // Course code
            Text(
                text = course.courseCode,
                style = MaterialTheme.typography.labelSmall.withDMSansMedium(),
                color = Color.Gray
            )

            // Date below course code
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "Updated: ${homeViewModel.formatDate(course.updated_at)}",
                style = MaterialTheme.typography.labelSmall.withDMSansRegular(),
                color = Color.Gray.copy(alpha = 0.8f)
            )
        }

        Column(
            horizontalAlignment = Alignment.End
        ) {
            // Status chip
            SuggestionChip(
                onClick = { /* No action */ },
                colors = SuggestionChipDefaults.suggestionChipColors(
                    containerColor = when (course.status) {
                        "active" -> Color(0xFFE8F5E9)
                        "completed" -> Color(0xFFE3F2FD)
                        else -> Color(0xFFF5F5F5)
                    }
                ),
                border = null,
                label = {
                    Text(
                        text = course.status.replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.labelSmall.withDMSansMedium(),
                        color = when (course.status) {
                            "active" -> Color(0xFF4CAF50)
                            "completed" -> Color(0xFF2196F3)
                            else -> Color(0xFF757575)
                        }
                    )
                }
            )

            Spacer(modifier = Modifier.height(4.dp))

            // Student count
            Text(
                text = "${course.student_count} students",
                style = MaterialTheme.typography.labelSmall.withDMSansRegular(),
                color = Color.Gray.copy(alpha = 0.7f)
            )
        }
    }
}

@Composable
fun StatCard(
    stat: StatCardData,
    onNavigateToStatSection: (String) -> Unit = {}
) {
    Card(
        modifier = Modifier
            .width(180.dp)
            .height(120.dp)
            .clickable {
                onNavigateToStatSection(stat.title)
            },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 2.dp
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = stat.title,
                    style = MaterialTheme.typography.labelMedium.withDMSansMedium(),
                    color = Color.Gray
                )

                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(stat.iconBackground),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = stat.icon,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            Text(
                text = stat.value,
                style = MaterialTheme.typography.headlineMedium.withDMSansBold(),
                color = Color(0xFF333333)
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                if (stat.trend == "up") {
                    Icon(
                        imageVector = Icons.Filled.TrendingUp,
                        contentDescription = null,
                        tint = Color(0xFF4CAF50),
                        modifier = Modifier.size(16.dp)
                    )
                } else {
                    Icon(
                        imageVector = Icons.Filled.TrendingDown,
                        contentDescription = null,
                        tint = Color(0xFFF44336),
                        modifier = Modifier.size(16.dp)
                    )
                }

                Spacer(modifier = Modifier.width(4.dp))

                Text(
                    text = stat.change,
                    style = MaterialTheme.typography.labelSmall.withDMSansRegular(),
                    color = if (stat.trend == "up") Color(0xFF4CAF50) else Color(0xFFF44336)
                )
            }
        }
    }
}

@Composable
fun RealTeamItem(
    team: TeamItem,
    onNavigateToTeamDetail: (String) -> Unit = {},
    homeViewModel: HomeViewModel
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onNavigateToTeamDetail(team.id.toString()) }
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color(0xFFE3F2FD)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Filled.Group,
                contentDescription = null,
                tint = Color(0xFF2196F3),
                modifier = Modifier.size(24.dp)
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = team.name,
                style = MaterialTheme.typography.bodyMedium.withDMSansMedium(),
                color = Color(0xFF333333),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(2.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${team.members.size} members",
                    style = MaterialTheme.typography.labelSmall.withDMSansRegular(),
                    color = Color.Gray
                )

                Box(
                    modifier = Modifier
                        .padding(horizontal = 4.dp)
                        .size(4.dp)
                        .clip(CircleShape)
                        .background(Color.LightGray)
                )

                Text(
                    text = "${team.team_courses.size} courses",
                    style = MaterialTheme.typography.labelSmall.withDMSansRegular(),
                    color = Color.Gray
                )
            }

            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "Updated: ${homeViewModel.formatDate(team.updated_at)}",
                style = MaterialTheme.typography.labelSmall.withDMSansRegular(),
                color = Color.Gray.copy(alpha = 0.8f)
            )
        }

        Column(
            horizontalAlignment = Alignment.End
        ) {
            // Role chip
            SuggestionChip(
                onClick = { /* No action */ },
                colors = SuggestionChipDefaults.suggestionChipColors(
                    containerColor = Color(0xFFE3F2FD)
                ),
                border = null,
                label = {
                    Text(
                        text = team.code,
                        style = MaterialTheme.typography.labelSmall.withDMSansMedium(),
                        color = Color(0xFF2196F3)
                    )
                }
            )
        }
    }
}

@Composable
fun EmptyStateMessage(
    icon: ImageVector,
    message: String,
    iconTint: Color
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(CircleShape)
                .background(iconTint.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(32.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium.withDMSansMedium(),
            color = Color.Gray,
            textAlign = TextAlign.Center
        )
    }
}

// Data classes for our display data
data class StatCardData(
    val title: String,
    val value: String,
    val icon: ImageVector,
    val trend: String, // "up" or "down"
    val change: String,
    val iconBackground: Brush
)