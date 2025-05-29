package com.example.vocalyxapk

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.vocalyxapk.composables.ClassesTab
import com.example.vocalyxapk.composables.HomeTab
import com.example.vocalyxapk.composables.TeamsTab
import com.example.vocalyxapk.composables.ScheduleTab
import com.example.vocalyxapk.repository.AuthRepository
import com.example.vocalyxapk.ui.theme.VOCALYXAPKTheme
import com.example.vocalyxapk.utils.AuthStateManager
import kotlinx.coroutines.launch

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
                        Triple("Home", Icons.Rounded.Home, "Home"),
                        Triple("Schedule", Icons.Rounded.CalendarToday, "Schedule"),
                        Triple("Teams", Icons.Rounded.Group, "Teams"),
                        Triple("Classes", Icons.Rounded.List, "Classes")
                    )
                    
                    ModalNavigationDrawer(
                        drawerState = drawerState,
                        drawerContent = {
                            ModalDrawerSheet {
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    "Vocalyx Menu",
                                    modifier = Modifier.padding(16.dp),
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Divider(color = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f))
                                
                                // Drawer Menu Items
                                NavigationDrawerItem(
                                    icon = { Icon(Icons.Rounded.Notifications, contentDescription = "Notifications", tint = MaterialTheme.colorScheme.primary) },
                                    label = { Text("Notifications", color = MaterialTheme.colorScheme.onSurface) },
                                    selected = false,
                                    onClick = { /* TODO: Implement notifications */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    )
                                )
                                
                                NavigationDrawerItem(
                                    icon = { Icon(Icons.Rounded.Download, contentDescription = "Export Reports", tint = MaterialTheme.colorScheme.primary) },
                                    label = { Text("Export Reports", color = MaterialTheme.colorScheme.onSurface) },
                                    selected = false,
                                    onClick = { /* TODO: Implement export */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    )
                                )
                                
                                NavigationDrawerItem(
                                    icon = { Icon(Icons.Rounded.Person, contentDescription = "Profile", tint = MaterialTheme.colorScheme.primary) },
                                    label = { Text("Profile", color = MaterialTheme.colorScheme.onSurface) },
                                    selected = false,
                                    onClick = { /* TODO: Implement profile */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    )
                                )
                                
                                NavigationDrawerItem(
                                    icon = { Icon(Icons.Rounded.Settings, contentDescription = "Settings", tint = MaterialTheme.colorScheme.primary) },
                                    label = { Text("Settings", color = MaterialTheme.colorScheme.onSurface) },
                                    selected = false,
                                    onClick = { /* TODO: Implement settings */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    )
                                )
                                
                                NavigationDrawerItem(
                                    icon = { Icon(Icons.Rounded.Info, contentDescription = "About/Help", tint = MaterialTheme.colorScheme.primary) },
                                    label = { Text("About/Help", color = MaterialTheme.colorScheme.onSurface) },
                                    selected = false,
                                    onClick = { /* TODO: Implement about/help */ },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    )
                                )
                                
                                Divider(color = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f))

                                NavigationDrawerItem(
                                    icon = { Icon(Icons.Rounded.Logout, contentDescription = "Logout", tint = MaterialTheme.colorScheme.primary) },
                                    label = { Text("Logout", color = MaterialTheme.colorScheme.onSurface) },
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
                                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                        unselectedContainerColor = Color.Transparent
                                    )
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
                                    color = MaterialTheme.colorScheme.primary,
                                    shadowElevation = 8.dp,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    NavigationBar(
                                        containerColor = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .heightIn(min = 64.dp)
                                    ) {
                                        navigationItems.forEachIndexed { index, (title, icon, label) ->
                                            NavigationBarItem(
                                                icon = {
                                                    Icon(
                                                        imageVector = icon,
                                                        contentDescription = title,
                                                        tint = if (selectedTab == index)
                                                            MaterialTheme.colorScheme.onPrimary
                                                        else
                                                            MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
                                                        modifier = Modifier.size(24.dp)
                                                    )
                                                },
                                                label = {
                                                    Text(
                                                        label,
                                                        color = if (selectedTab == index)
                                                            MaterialTheme.colorScheme.onPrimary
                                                        else
                                                            MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
                                                        style = MaterialTheme.typography.labelSmall
                                                    )
                                                },
                                                selected = selectedTab == index,
                                                onClick = { selectedTab = index },
                                                colors = NavigationBarItemDefaults.colors(
                                                    selectedIconColor = MaterialTheme.colorScheme.onPrimary,
                                                    unselectedIconColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
                                                    selectedTextColor = MaterialTheme.colorScheme.onPrimary,
                                                    unselectedTextColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
                                                    indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        ) { paddingValues ->
                            when (selectedTab) {
                                0 -> HomeTab(modifier = Modifier.padding(paddingValues))
                                1 -> ScheduleTab(modifier = Modifier.padding(paddingValues))
                                2 -> TeamsTab(modifier = Modifier.padding(paddingValues))
                                3 -> ClassesTab(modifier = Modifier.padding(paddingValues))
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
        Triple("Home", Icons.Rounded.Home, "Home"),
        Triple("Schedule", Icons.Rounded.CalendarToday, "Schedule"),
        Triple("Teams", Icons.Rounded.Group, "Teams"),
        Triple("Courses", Icons.Rounded.List, "Courses")
    )
    
    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            Surface(
                color = MaterialTheme.colorScheme.primary,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 64.dp)
                ) {
                    navigationItems.forEachIndexed { index, (title, icon, label) ->
                        NavigationBarItem(
                            icon = { 
                                Icon(
                                    imageVector = icon, 
                                    contentDescription = title,
                                    tint = if (selectedTab == index)
                                        MaterialTheme.colorScheme.onPrimary
                                    else
                                        MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
                                )
                            },
                            label = { 
                                Text(
                                    label,
                                    color = if (selectedTab == index)
                                        MaterialTheme.colorScheme.onPrimary
                                    else
                                        MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
                                ) 
                            },
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.onPrimary,
                                unselectedIconColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
                                selectedTextColor = MaterialTheme.colorScheme.onPrimary,
                                unselectedTextColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
                                indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
                            )
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        when (selectedTab) {
            0 -> HomeTab(modifier = Modifier.padding(paddingValues))
            1 -> ScheduleTab(modifier = Modifier.padding(paddingValues))
            2 -> TeamsTab(modifier = Modifier.padding(paddingValues))
            3 -> ClassesTab(modifier = Modifier.padding(paddingValues))
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
