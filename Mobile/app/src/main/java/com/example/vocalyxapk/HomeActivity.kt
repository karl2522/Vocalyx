package com.example.vocalyxapk

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.vocalyxapk.composables.CoursesTab
import com.example.vocalyxapk.composables.HomeTab
import com.example.vocalyxapk.composables.TeamsTab
import com.example.vocalyxapk.composables.ScheduleTab
import com.example.vocalyxapk.repository.AuthRepository
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme
import com.example.vocalyxapk.utils.AuthStateManager
import kotlinx.coroutines.launch
import com.example.vocalyxapk.ui.theme.DMSans

class HomeActivity : ComponentActivity() {

    private val REQUEST_CODE_SPEECH_INPUT = 100

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            VOCALYXAPKTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    var drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
                    val scope = rememberCoroutineScope()
                    var selectedTab by remember { mutableStateOf(0) }
                    val context = LocalContext.current
                    
                    val navigationItems = listOf(
                        Triple("Dashboard", Icons.Filled.Dashboard, "Dashboard"),
                        Triple("Courses", Icons.Rounded.School, "Courses"),
                        Triple("Schedule", Icons.Rounded.CalendarToday, "Schedule"),
                        Triple("Teams", Icons.Rounded.Group, "Teams")
                    )
                    
                    ModalNavigationDrawer(
                        drawerState = drawerState,
                        drawerContent = {
                            ModalDrawerSheet(
                                modifier = Modifier
                                    .width(280.dp)
                                    .fillMaxHeight(),
                                drawerContainerColor = MaterialTheme.colorScheme.surface,
                                drawerContentColor = MaterialTheme.colorScheme.onSurface,
                                drawerShape = RoundedCornerShape(topEnd = 24.dp, bottomEnd = 24.dp)
                            ) {
                                // Header with logo and styling
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(160.dp)
                                        .drawBehind {
                                            val gradientColors = listOf(
                                                Color(0xFF333D79),
                                                Color(0xFF4A5495)
                                            )
                                            drawRect(
                                                brush = Brush.linearGradient(
                                                    colors = gradientColors,
                                                    start = Offset(0f, 0f),
                                                    end = Offset(size.width, size.height)
                                                )
                                            )
                                        }
                                        .padding(16.dp),
                                    contentAlignment = Alignment.BottomStart
                                ) {
                                    Column {
                                        Text(
                                            "Vocalyx",
                                            style = MaterialTheme.typography.headlineMedium.copy(
                                                fontFamily = DMSans,
                                                fontWeight = FontWeight.Bold
                                            ),
                                            color = Color.White
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            "Education Management",
                                            style = MaterialTheme.typography.bodyMedium.copy(
                                                fontFamily = DMSans,
                                                fontWeight = FontWeight.Medium
                                            ),
                                            color = Color.White.copy(alpha = 0.8f)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                // Drawer Menu Items with improved styling
                                NavigationDrawerItem(
                                    icon = {
                                        Box(
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(CircleShape)
                                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                Icons.Rounded.Notifications,
                                                contentDescription = "Notifications",
                                                tint = MaterialTheme.colorScheme.primary,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    },
                                    label = {
                                        Text(
                                            "Notifications",
                                            color = MaterialTheme.colorScheme.onSurface,
                                            style = MaterialTheme.typography.bodyMedium.copy(
                                                fontFamily = DMSans
                                            )
                                        )
                                    },
                                    selected = false,
                                    onClick = { /* TODO: Implement notifications */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    ),
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                                )
                                
                                NavigationDrawerItem(
                                    icon = {
                                        Box(
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(CircleShape)
                                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                Icons.Rounded.Download,
                                                contentDescription = "Export Reports",
                                                tint = MaterialTheme.colorScheme.primary,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    },
                                    label = {
                                        Text(
                                            "Export Reports",
                                            color = MaterialTheme.colorScheme.onSurface,
                                            style = MaterialTheme.typography.bodyMedium.copy(
                                                fontFamily = DMSans
                                            )
                                        )
                                    },
                                    selected = false,
                                    onClick = { /* TODO: Implement export */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    ),
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                                )
                                
                                NavigationDrawerItem(
                                    icon = {
                                        Box(
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(CircleShape)
                                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                Icons.Rounded.Person,
                                                contentDescription = "Profile",
                                                tint = MaterialTheme.colorScheme.primary,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    },
                                    label = {
                                        Text(
                                            "Profile",
                                            color = MaterialTheme.colorScheme.onSurface,
                                            style = MaterialTheme.typography.bodyMedium.copy(
                                                fontFamily = DMSans
                                            )
                                        )
                                    },
                                    selected = false,
                                    onClick = { /* TODO: Implement profile */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    ),
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                                )
                                
                                NavigationDrawerItem(
                                    icon = {
                                        Box(
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(CircleShape)
                                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                Icons.Rounded.Settings,
                                                contentDescription = "Settings",
                                                tint = MaterialTheme.colorScheme.primary,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    },
                                    label = {
                                        Text(
                                            "Settings",
                                            color = MaterialTheme.colorScheme.onSurface,
                                            style = MaterialTheme.typography.bodyMedium.copy(
                                                fontFamily = DMSans
                                            )
                                        )
                                    },
                                    selected = false,
                                    onClick = { /* TODO: Implement settings */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    ),
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                                )
                                
                                NavigationDrawerItem(
                                    icon = {
                                        Box(
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(CircleShape)
                                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                Icons.Rounded.Info,
                                                contentDescription = "About/Help",
                                                tint = MaterialTheme.colorScheme.primary,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    },
                                    label = {
                                        Text(
                                            "About/Help",
                                            color = MaterialTheme.colorScheme.onSurface,
                                            style = MaterialTheme.typography.bodyMedium.copy(
                                                fontFamily = DMSans
                                            )
                                        )
                                    },
                                    selected = false,
                                    onClick = { /* TODO: Implement about/help */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    ),
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                                )

                                Divider(
                                    color = MaterialTheme.colorScheme.outlineVariant,
                                    modifier = Modifier.padding(vertical = 12.dp, horizontal = 24.dp)
                                )

                                NavigationDrawerItem(
                                    icon = {
                                        Box(
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFFFFECEC)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                Icons.Rounded.Logout,
                                                contentDescription = "Logout",
                                                tint = Color(0xFFE53935),
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    },
                                    label = {
                                        Text(
                                            "Logout",
                                            color = Color(0xFFE53935),
                                            style = MaterialTheme.typography.bodyMedium.copy(
                                                fontFamily = DMSans,
                                                fontWeight = FontWeight.Medium
                                            )
                                        )
                                    },
                                    selected = false,
                                    onClick = {
                                        val authRepository = AuthRepository(context)

                                        scope.launch {
                                            try {
                                                Toast.makeText(context, "Logging out...", Toast.LENGTH_SHORT).show()

                                                val result = authRepository.logout()

                                                AuthStateManager.setLoggedOut(context)

                                                val intent = Intent(this@HomeActivity, LoginActivity::class.java)
                                                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                                                startActivity(intent)
                                                finish()
                                            } catch (e: Exception) {
                                                AuthStateManager.setLoggedOut(context)

                                                Toast.makeText(context, "Logout failed on server but you're logged out locally", Toast.LENGTH_SHORT).show()

                                                val intent = Intent(this@HomeActivity, LoginActivity::class.java)
                                                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                                                startActivity(intent)
                                                finish()
                                            }
                                        }
                                    },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = Color(0xFFFFECEC),
                                        unselectedContainerColor = Color.Transparent
                                    ),
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                                )
                            }
                        }
                    ) {
                        Scaffold(
                            modifier = Modifier.fillMaxSize(),
                            topBar = {
                                TopAppBar(
                                    title = { 
                                        Text(
                                            "Vocalyx",
                                            color = MaterialTheme.colorScheme.onPrimary
                                        ) 
                                    },
                                    colors = TopAppBarDefaults.topAppBarColors(
                                        containerColor = MaterialTheme.colorScheme.primary
                                    ),
                                    navigationIcon = {
                                        IconButton(onClick = { 
                                            scope.launch {
                                                drawerState.open()
                                            }
                                        }) {
                                            Icon(
                                                Icons.Rounded.Menu,
                                                contentDescription = "Menu",
                                                tint = MaterialTheme.colorScheme.onPrimary
                                            )
                                        }
                                    }
                                )
                            },
                            bottomBar = {
                                Surface(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .heightIn(min = 68.dp)
                                            .drawBehind {
                                                val colors = listOf(
                                                    Color(0xFF1C2347),  // Deep blue
                                                    Color(0xFF333D79),  // Brand blue
                                                    Color(0xFF3C4B99)   // Slightly lighter blue
                                                )
                                                drawRect(
                                                    brush = Brush.verticalGradient(
                                                        colors = colors
                                                    )
                                                )
                                            }
                                    ) {
                                        NavigationBar(
                                            containerColor = Color.Transparent,
                                            contentColor = Color.White,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .heightIn(min = 68.dp),
                                            tonalElevation = 0.dp
                                        ) {
                                            navigationItems.forEachIndexed { index, (title, icon, label) ->
                                                val selected = selectedTab == index
                                                val animatedIconSize by animateDpAsState(
                                                    targetValue = if (selected) 28.dp else 24.dp,
                                                    animationSpec = spring(
                                                        dampingRatio = Spring.DampingRatioMediumBouncy,
                                                        stiffness = Spring.StiffnessLow
                                                    ), label = "iconSize"
                                                )

                                                NavigationBarItem(
                                                    icon = {
                                                        Box(
                                                            contentAlignment = Alignment.Center,
                                                            modifier = Modifier.size(48.dp)
                                                        ) {
                                                            if (selected) {
                                                                Box(
                                                                    modifier = Modifier
                                                                        .size(40.dp)
                                                                        .background(
                                                                            MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                                                            shape = CircleShape
                                                                        )
                                                                )
                                                            }
                                                            Icon(
                                                                imageVector = icon,
                                                                contentDescription = title,
                                                                tint = if (selected)
                                                                    Color.White
                                                                else
                                                                    Color.White.copy(alpha = 0.6f),
                                                                modifier = Modifier.size(animatedIconSize)
                                                            )
                                                        }
                                                    },
                                                    label = {
                                                        AnimatedVisibility(
                                                            visible = true,
                                                            enter = fadeIn() + expandVertically(),
                                                            exit = fadeOut() + shrinkVertically()
                                                        ) {
                                                            Text(
                                                                label,
                                                                color = if (selected)
                                                                    Color.White
                                                                else
                                                                    Color.White.copy(alpha = 0.6f),
                                                                style = MaterialTheme.typography.labelSmall.copy(
                                                                    fontFamily = DMSans,
                                                                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
                                                                ),
                                                                maxLines = 1,
                                                                overflow = TextOverflow.Ellipsis
                                                            )
                                                        }
                                                    },
                                                    selected = selected,
                                                    onClick = {
                                                        selectedTab = index
                                                    },
                                                    colors = NavigationBarItemDefaults.colors(
                                                        selectedIconColor = Color.White,
                                                        unselectedIconColor = Color.White.copy(alpha = 0.6f),
                                                        selectedTextColor = Color.White,
                                                        unselectedTextColor = Color.White.copy(alpha = 0.6f),
                                                        indicatorColor = Color(0xFF3C4B99).copy(alpha = 0.3f)
                                                    )
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        ) { paddingValues ->
                            when (selectedTab) {
                                0 -> HomeTab(
                                    modifier = Modifier.padding(paddingValues),
                                    onNavigateToSchedule = {
                                        selectedTab = 2
                                    },
                                    onNavigateToCourseList = {
                                        selectedTab = 1
                                    },
                                    onNavigateToTeamList = {
                                        selectedTab = 3
                                    },
                                    onNavigateToAddCourse = {
                                        selectedTab = 1
                                    },
                                    onNavigateToCourseDetail = { courseId ->
                                        selectedTab = 1
                                    },
                                    onNavigateToTeamDetail = { teamId ->
                                        // For now, go to Teams tab. Later you can implement team detail screen
                                        selectedTab = 3
                                    },
                                    onNavigateToStatSection = { statType ->
                                        when (statType) {
                                            "Courses" -> selectedTab = 1
                                            "Classes" -> selectedTab = 1
                                            "Teams" -> selectedTab = 3
                                            else -> selectedTab = 1
                                        }
                                    }
                                )
                                1 -> CoursesTab(modifier = Modifier.padding(paddingValues))
                                2 -> ScheduleTab(modifier = Modifier.padding(paddingValues))
                                3 -> TeamsTab(modifier = Modifier.padding(paddingValues))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HomeScreen() {
    var selectedTab by remember { mutableStateOf(0) }
    
    val navigationItems = listOf(
        Triple("Dashboard", Icons.Filled.Dashboard, "Dashboard"),
        Triple("Courses", Icons.Rounded.School, "Courses"),
        Triple("Schedule", Icons.Rounded.CalendarToday, "Schedule"),
        Triple("Teams", Icons.Rounded.Group, "Teams")
    )
    
    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 68.dp)
                        .drawBehind {
                            val colors = listOf(
                                Color(0xFF1C2347),  // Deep blue
                                Color(0xFF333D79),  // Brand blue
                                Color(0xFF3C4B99)   // Slightly lighter blue
                            )
                            drawRect(
                                brush = Brush.verticalGradient(
                                    colors = colors
                                )
                            )
                        }
                ) {
                    NavigationBar(
                        containerColor = Color.Transparent,
                        contentColor = Color.White,
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 68.dp),
                        tonalElevation = 0.dp
                    ) {
                        navigationItems.forEachIndexed { index, (title, icon, label) ->
                            val selected = selectedTab == index
                            val animatedIconSize by animateDpAsState(
                                targetValue = if (selected) 28.dp else 24.dp,
                                animationSpec = spring(
                                    dampingRatio = Spring.DampingRatioMediumBouncy,
                                    stiffness = Spring.StiffnessLow
                                ), label = "iconSize"
                            )

                            NavigationBarItem(
                                icon = {
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier.size(48.dp)
                                    ) {
                                        if (selected) {
                                            Box(
                                                modifier = Modifier
                                                    .size(40.dp)
                                                    .background(
                                                        MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                                        shape = CircleShape
                                                    )
                                            )
                                        }
                                        Icon(
                                            imageVector = icon,
                                            contentDescription = title,
                                            tint = if (selected)
                                                Color.White
                                            else
                                                Color.White.copy(alpha = 0.6f),
                                            modifier = Modifier.size(animatedIconSize)
                                        )
                                    }
                                },
                                label = {
                                    AnimatedVisibility(
                                        visible = true,
                                        enter = fadeIn() + expandVertically(),
                                        exit = fadeOut() + shrinkVertically()
                                    ) {
                                        Text(
                                            label,
                                            color = if (selected)
                                                Color.White
                                            else
                                                Color.White.copy(alpha = 0.6f),
                                            style = MaterialTheme.typography.labelSmall.copy(
                                                fontFamily = DMSans,
                                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
                                            ),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                },
                                selected = selected,
                                onClick = { selectedTab = index },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = Color.White,
                                    unselectedIconColor = Color.White.copy(alpha = 0.6f),
                                    selectedTextColor = Color.White,
                                    unselectedTextColor = Color.White.copy(alpha = 0.6f),
                                    indicatorColor = Color(0xFF3C4B99).copy(alpha = 0.3f)
                                )
                            )
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        when (selectedTab) {
            0 -> HomeTab(modifier = Modifier.padding(paddingValues))
            1 -> CoursesTab(modifier = Modifier.padding(paddingValues))
            2 -> ScheduleTab(modifier = Modifier.padding(paddingValues))
            3 -> TeamsTab(modifier = Modifier.padding(paddingValues))
        }
    }
}

@Preview
@Composable
fun HomeScreenPreview() {
    VOCALYXAPKTheme {
        HomeScreen()
    }
}
