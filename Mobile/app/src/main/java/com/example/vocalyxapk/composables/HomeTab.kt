package com.example.vocalyxapk.composables

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
import com.example.vocalyxapk.ui.theme.DMSans
import com.example.vocalyxapk.utils.withDMSansBold
import com.example.vocalyxapk.utils.withDMSansMedium
import com.example.vocalyxapk.utils.withDMSansRegular

@Composable
fun HomeTab(
    modifier: Modifier = Modifier,
    onNavigateToAddCourse: () -> Unit = {},
    onNavigateToSchedule: () -> Unit = {},
    onNavigateToCourseList: () -> Unit = {},
    onNavigateToTeamList: () -> Unit = {},
    onNavigateToCourseDetail: (String) -> Unit = {},
    onNavigateToTeamDetail: (String) -> Unit = {},
    onNavigateToStatSection: (String) -> Unit = {}
) {
    // Mock data for demonstration
    val username = "User" // In a real app, get this from a ViewModel
    
    // Mock stats data
    val statsData = listOf(
        StatCardData(
            title = "Courses",
            value = "5",
            icon = Icons.Filled.School,
            trend = "up",
            change = "2",
            iconBackground = Brush.linearGradient(
                colors = listOf(Color(0xFF333D79), Color(0xFF4A5495))
            )
        ),
        StatCardData(
            title = "Classes",
            value = "12",
            icon = Icons.Outlined.Class,
            trend = "up",
            change = "3",
            iconBackground = Brush.linearGradient(
                colors = listOf(Color(0xFF4CAF50), Color(0xFF81C784))
            )
        ),
        StatCardData(
            title = "Team Members",
            value = "8",
            icon = Icons.Filled.Group,
            trend = "up",
            change = "1",
            iconBackground = Brush.linearGradient(
                colors = listOf(Color(0xFF2196F3), Color(0xFF64B5F6))
            )
        )
    )
    
    // Mock courses data
    val recentCourses = listOf(
        CourseData(
            id = "1",
            name = "Introduction to Computer Science",
            code = "CS101",
            status = "active",
            lastUpdated = "2023-10-15"
        ),
        CourseData(
            id = "2",
            name = "Data Structures and Algorithms",
            code = "CS201",
            status = "active",
            lastUpdated = "2023-10-10"
        ),
        CourseData(
            id = "3",
            name = "Mobile App Development",
            code = "CS301",
            status = "completed",
            lastUpdated = "2023-09-30"
        )
    )
    
    // Mock teams data
    val teamsData = listOf(
        TeamData(
            id = "1",
            name = "CS Department",
            role = "Admin",
            memberCount = 5,
            courseCount = 3,
            lastActive = "Today"
        ),
        TeamData(
            id = "2",
            name = "Math Tutoring",
            role = "Member",
            memberCount = 3,
            courseCount = 2,
            lastActive = "Yesterday"
        )
    )
    
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
        
        // Stats cards section
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
        
        // Courses section
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
                
                // Course list
                AnimatedVisibility(visible = activeCoursesTab == "recent") {
                    Column {
                        recentCourses
                            .filter { it.status == "active" }
                            .take(3)
                            .forEach { course ->
                                CourseItem(course, onNavigateToCourseDetail)
                                Divider(color = Color(0xFFE0E0E0))
                            }
                    }
                }
                
                AnimatedVisibility(visible = activeCoursesTab == "completed") {
                    Column {
                        if (recentCourses.any { it.status == "completed" }) {
                            recentCourses
                                .filter { it.status == "completed" }
                                .take(3)
                                .forEach { course ->
                                    CourseItem(course, onNavigateToCourseDetail)
                                    Divider(color = Color(0xFFE0E0E0))
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
        
        // Teams section
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
                
                // Teams list
                if (teamsData.isNotEmpty()) {
                    teamsData.forEach { team ->
                        TeamItem(team, onNavigateToTeamDetail)
                        if (team != teamsData.last()) {
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
                    text = "+${stat.change} from last month",
                    style = MaterialTheme.typography.labelSmall.withDMSansRegular(),
                    color = if (stat.trend == "up") Color(0xFF4CAF50) else Color(0xFFF44336)
                )
            }
        }
    }
}

@Composable
fun CourseItem(
    course: CourseData,
    onNavigateToCourseDetail: (String) -> Unit = {}
) {
        Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onNavigateToCourseDetail(course.id) }
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
                text = course.code,
                style = MaterialTheme.typography.labelSmall.withDMSansMedium(),
                color = Color.Gray
            )
            
            // Date below course code
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "Last updated: ${course.lastUpdated}",
                style = MaterialTheme.typography.labelSmall.withDMSansRegular(),
                color = Color.Gray.copy(alpha = 0.8f)
            )
        }
        
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
                    text = when (course.status) {
                        "active" -> "Active"
                        "completed" -> "Completed"
                        else -> "Unknown"
                    },
                    style = MaterialTheme.typography.labelSmall.withDMSansMedium(),
                    color = when (course.status) {
                        "active" -> Color(0xFF4CAF50)
                        "completed" -> Color(0xFF2196F3)
                        else -> Color(0xFF757575)
                    }
                )
            }
        )
    }
}

@Composable
fun TeamItem(
    team: TeamData,
    onNavigateToTeamDetail: (String) -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onNavigateToTeamDetail(team.id) }
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
                    text = "${team.memberCount} members",
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
                    text = "${team.courseCount} courses",
                    style = MaterialTheme.typography.labelSmall.withDMSansRegular(),
                    color = Color.Gray
                )
            }
        }
        
                SuggestionChip(
            onClick = { /* No action */ },
            colors = SuggestionChipDefaults.suggestionChipColors(
                containerColor = Color(0xFFE3F2FD)
            ),
            border = null,
            label = {
                Text(
                    text = team.role,
                    style = MaterialTheme.typography.labelSmall.withDMSansMedium(),
                    color = Color(0xFF2196F3)
                )
            }
        )
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

// Data classes for our mock data
data class StatCardData(
    val title: String,
    val value: String,
    val icon: ImageVector,
    val trend: String, // "up" or "down"
    val change: String,
    val iconBackground: Brush
)

data class CourseData(
    val id: String,
    val name: String,
    val code: String,
    val status: String,
    val lastUpdated: String
)

data class TeamData(
    val id: String,
    val name: String,
    val role: String,
    val memberCount: Int,
    val courseCount: Int,
    val lastActive: String
)
