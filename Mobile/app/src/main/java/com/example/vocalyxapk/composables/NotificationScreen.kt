package com.example.vocalyxapk.composables

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.api.NotificationItem
import com.example.vocalyxapk.ui.theme.DMSans
import com.example.vocalyxapk.viewmodel.NotificationTab
import com.example.vocalyxapk.viewmodel.NotificationUIState
import com.example.vocalyxapk.viewmodel.NotificationViewModel
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationScreen(
    modifier: Modifier = Modifier,
    viewModel: NotificationViewModel = viewModel()
) {
    val swipeRefreshState = rememberSwipeRefreshState(isRefreshing = viewModel.isRefreshing)

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8F9FA))
    ) {
        // Header Section
        NotificationHeader(
            unreadCount = viewModel.unreadCount,
            totalCount = viewModel.totalCount,
            onMarkAllRead = { viewModel.markAllAsRead() },
            selectedTab = viewModel.selectedTab,
            onTabSelected = { viewModel.selectTab(it) }
        )

        // Content Section
        SwipeRefresh(
            state = swipeRefreshState,
            onRefresh = { viewModel.refreshNotifications() },
            modifier = Modifier.fillMaxSize()
        ) {
            when (val state = viewModel.notificationUIState) {
                is NotificationUIState.Loading -> {
                    LoadingNotifications()
                }

                is NotificationUIState.Success -> {
                    val filteredNotifications = viewModel.getFilteredNotifications()

                    if (filteredNotifications.isEmpty()) {
                        EmptyNotifications(
                            selectedTab = viewModel.selectedTab
                        )
                    } else {
                        NotificationList(
                            notifications = filteredNotifications,
                            onMarkAsRead = { notificationId ->
                                viewModel.markAsRead(notificationId)
                            }
                        )
                    }
                }

                is NotificationUIState.Error -> {
                    ErrorNotifications(
                        errorMessage = state.message,
                        onRetry = { viewModel.fetchNotifications() }
                    )
                }
            }
        }
    }
}

@Composable
fun NotificationHeader(
    unreadCount: Int,
    totalCount: Int,
    onMarkAllRead: () -> Unit,
    selectedTab: NotificationTab,
    onTabSelected: (NotificationTab) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        ),
        elevation = CardDefaults.cardElevation(4.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            // Title and Mark All Read
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Rounded.Notifications,
                        contentDescription = "Notifications",
                        tint = Color(0xFF333D79),
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "Notifications",
                        style = MaterialTheme.typography.headlineSmall.copy(
                            fontFamily = DMSans,
                            fontWeight = FontWeight.Bold
                        ),
                        color = Color(0xFF333D79)
                    )
                }

                if (unreadCount > 0) {
                    FilledTonalButton(
                        onClick = onMarkAllRead,
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = Color(0xFF333D79).copy(alpha = 0.1f),
                            contentColor = Color(0xFF333D79)
                        ),
                        modifier = Modifier.height(36.dp)
                    ) {
                        Icon(
                            Icons.Default.DoneAll,
                            contentDescription = "Mark all read",
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "Mark all read",
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontFamily = DMSans
                            )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Stats
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                StatCard(
                    title = "Total",
                    count = totalCount,
                    color = Color(0xFF333D79),
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "Unread",
                    count = unreadCount,
                    color = Color(0xFFE53935),
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Tabs
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TabButton(
                    text = "All",
                    isSelected = selectedTab == NotificationTab.ALL,
                    onClick = { onTabSelected(NotificationTab.ALL) },
                    modifier = Modifier.weight(1f)
                )
                TabButton(
                    text = "Unread ($unreadCount)",
                    isSelected = selectedTab == NotificationTab.UNREAD,
                    onClick = { onTabSelected(NotificationTab.UNREAD) },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
fun StatCard(
    title: String,
    count: Int,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.1f)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = count.toString(),
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontFamily = DMSans,
                    fontWeight = FontWeight.Bold
                ),
                color = color
            )
            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall.copy(
                    fontFamily = DMSans
                ),
                color = color.copy(alpha = 0.8f)
            )
        }
    }
}

@Composable
fun TabButton(
    text: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(40.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (isSelected) Color(0xFF333D79) else Color.Transparent,
            contentColor = if (isSelected) Color.White else Color(0xFF333D79)
        ),
        border = if (!isSelected) ButtonDefaults.outlinedButtonBorder else null,
        shape = RoundedCornerShape(20.dp)
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelMedium.copy(
                fontFamily = DMSans,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
            )
        )
    }
}

@Composable
fun NotificationList(
    notifications: List<NotificationItem>,
    onMarkAsRead: (Int) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(notifications) { notification ->
            NotificationCard(
                notification = notification,
                onMarkAsRead = { onMarkAsRead(notification.id) }
            )
        }
    }
}

@Composable
fun NotificationCard(
    notification: NotificationItem,
    onMarkAsRead: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .animateContentSize(),
        onClick = {
            if (!notification.is_read) {
                onMarkAsRead()
            }
        },
        colors = CardDefaults.cardColors(
            containerColor = if (notification.is_read) Color.White else Color(0xFFF0F7FF)
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (notification.is_read) 2.dp else 4.dp
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Icon
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(getNotificationIconColor(notification.type)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = getNotificationIcon(notification.type),
                    contentDescription = notification.type,
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }

            // Content
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Text(
                        text = notification.title,
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontFamily = DMSans,
                            fontWeight = if (notification.is_read) FontWeight.Medium else FontWeight.Bold
                        ),
                        color = Color(0xFF333D79),
                        modifier = Modifier.weight(1f),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )

                    Text(
                        text = getTimeString(notification.created_at),
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontFamily = DMSans
                        ),
                        color = Color(0xFF666666)
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = notification.message,
                    style = MaterialTheme.typography.bodySmall.copy(
                        fontFamily = DMSans
                    ),
                    color = Color(0xFF666666),
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )

                // Sender info
                notification.sender_details?.let { sender ->
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "From: ${sender.first_name} ${sender.last_name}",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontFamily = DMSans
                        ),
                        color = Color(0xFF4CAF50)
                    )
                }
            }

            // Unread indicator
            if (!notification.is_read) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF333D79))
                )
            }
        }
    }
}

@Composable
fun LoadingNotifications() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        CircularProgressIndicator(
            modifier = Modifier.size(48.dp),
            color = Color(0xFF333D79),
            strokeWidth = 4.dp
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Loading notifications...",
            style = MaterialTheme.typography.bodyMedium.copy(
                fontFamily = DMSans
            ),
            color = Color(0xFF666666)
        )
    }
}

@Composable
fun EmptyNotifications(selectedTab: NotificationTab) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Rounded.NotificationsNone,
            contentDescription = "No notifications",
            modifier = Modifier.size(64.dp),
            tint = Color(0xFF999999)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = when (selectedTab) {
                NotificationTab.ALL -> "No notifications yet"
                NotificationTab.UNREAD -> "No unread notifications"
            },
            style = MaterialTheme.typography.titleMedium.copy(
                fontFamily = DMSans,
                fontWeight = FontWeight.Medium
            ),
            color = Color(0xFF666666)
        )
        Text(
            text = when (selectedTab) {
                NotificationTab.ALL -> "You'll see notifications here when you receive them"
                NotificationTab.UNREAD -> "All caught up! No unread notifications"
            },
            style = MaterialTheme.typography.bodySmall.copy(
                fontFamily = DMSans
            ),
            color = Color(0xFF999999)
        )
    }
}

@Composable
fun ErrorNotifications(
    errorMessage: String,
    onRetry: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Rounded.ErrorOutline,
            contentDescription = "Error",
            modifier = Modifier.size(64.dp),
            tint = Color(0xFFE53935)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Failed to load notifications",
            style = MaterialTheme.typography.titleMedium.copy(
                fontFamily = DMSans,
                fontWeight = FontWeight.Medium
            ),
            color = Color(0xFF666666)
        )
        Text(
            text = errorMessage,
            style = MaterialTheme.typography.bodySmall.copy(
                fontFamily = DMSans
            ),
            color = Color(0xFF999999)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF333D79)
            )
        ) {
            Text("Retry")
        }
    }
}

// Helper functions
fun getNotificationIcon(type: String): ImageVector {
    return when (type) {
        "course" -> Icons.Rounded.School
        "recording" -> Icons.Rounded.Mic
        "class" -> Icons.Rounded.Class
        "team" -> Icons.Rounded.Group
        "message" -> Icons.Rounded.Message
        "system" -> Icons.Rounded.Settings
        else -> Icons.Rounded.Notifications
    }
}

fun getNotificationIconColor(type: String): Color {
    return when (type) {
        "course" -> Color(0xFF2196F3)
        "recording" -> Color(0xFF9C27B0)
        "class" -> Color(0xFF4CAF50)
        "team" -> Color(0xFF00BCD4)
        "message" -> Color(0xFFFF9800)
        "system" -> Color(0xFF607D8B)
        else -> Color(0xFF333D79)
    }
}

fun getTimeString(timestamp: String): String {
    return try {
        val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val date = format.parse(timestamp)
        val now = Date()
        val diffInMillis = now.time - (date?.time ?: 0)
        val diffInHours = diffInMillis / (1000 * 60 * 60)

        when {
            diffInHours < 1 -> {
                val diffInMinutes = diffInMillis / (1000 * 60)
                "${maxOf(1, diffInMinutes.toInt())}m ago"
            }
            diffInHours < 24 -> "${diffInHours}h ago"
            else -> {
                val diffInDays = diffInHours / 24
                "${diffInDays}d ago"
            }
        }
    } catch (e: Exception) {
        "Now"
    }
}