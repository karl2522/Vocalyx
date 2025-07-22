package com.example.vocalyxapk.viewmodel

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocalyxapk.api.NotificationItem
import com.example.vocalyxapk.repository.NotificationRepository
import kotlinx.coroutines.launch

class NotificationViewModel : ViewModel() {

    private val notificationRepository = NotificationRepository()

    var notificationUIState by mutableStateOf<NotificationUIState>(NotificationUIState.Loading)
        private set

    var unreadCount by mutableStateOf(0)
        private set

    var totalCount by mutableStateOf(0)
        private set

    var isRefreshing by mutableStateOf(false)
        private set

    var selectedTab by mutableStateOf(NotificationTab.ALL)
        private set

    private var allNotifications: List<NotificationItem> = emptyList()

    init {
        fetchNotifications()
        fetchNotificationCount()
    }

    fun fetchNotifications() {
        notificationUIState = NotificationUIState.Loading
        viewModelScope.launch {
            try {
                Log.d("NotificationViewModel", "Fetching notifications...")
                notificationRepository.getNotifications().fold(
                    onSuccess = { notifications ->
                        allNotifications = notifications
                        notificationUIState = NotificationUIState.Success(notifications)
                        Log.d("NotificationViewModel", "✅ Successfully loaded ${notifications.size} notifications")
                    },
                    onFailure = { error ->
                        Log.e("NotificationViewModel", "❌ Failed to load notifications", error)
                        notificationUIState = NotificationUIState.Error(error.message ?: "Unknown error")
                    }
                )
            } catch (e: Exception) {
                Log.e("NotificationViewModel", "❌ Exception loading notifications", e)
                notificationUIState = NotificationUIState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun fetchNotificationCount() {
        viewModelScope.launch {
            try {
                Log.d("NotificationViewModel", "Fetching notification count...")
                notificationRepository.getNotificationCount().fold(
                    onSuccess = { (unread, total) ->
                        unreadCount = unread
                        totalCount = total
                        Log.d("NotificationViewModel", "✅ Updated counts: $unread unread, $total total")
                    },
                    onFailure = { error ->
                        Log.e("NotificationViewModel", "❌ Failed to load notification count", error)
                    }
                )
            } catch (e: Exception) {
                Log.e("NotificationViewModel", "❌ Exception loading notification count", e)
            }
        }
    }

    fun refreshNotifications() {
        isRefreshing = true
        viewModelScope.launch {
            try {
                Log.d("NotificationViewModel", "Refreshing notifications...")
                notificationRepository.getNotifications().fold(
                    onSuccess = { notifications ->
                        allNotifications = notifications
                        notificationUIState = NotificationUIState.Success(notifications)

                        // Also refresh count
                        fetchNotificationCount()

                        Log.d("NotificationViewModel", "✅ Successfully refreshed ${notifications.size} notifications")
                    },
                    onFailure = { error ->
                        Log.e("NotificationViewModel", "❌ Failed to refresh notifications", error)
                    }
                )
            } catch (e: Exception) {
                Log.e("NotificationViewModel", "❌ Exception refreshing notifications", e)
            } finally {
                isRefreshing = false
            }
        }
    }

    fun markAsRead(notificationId: Int) {
        viewModelScope.launch {
            try {
                Log.d("NotificationViewModel", "Marking notification $notificationId as read...")
                notificationRepository.markAsRead(notificationId).fold(
                    onSuccess = { updatedNotification ->
                        // Update local state
                        allNotifications = allNotifications.map { notification ->
                            if (notification.id == notificationId) {
                                notification.copy(is_read = true)
                            } else {
                                notification
                            }
                        }

                        // Update UI state
                        notificationUIState = NotificationUIState.Success(allNotifications)

                        // Update unread count
                        if (!updatedNotification.is_read) {
                            unreadCount = maxOf(0, unreadCount - 1)
                        }

                        Log.d("NotificationViewModel", "✅ Successfully marked notification $notificationId as read")
                    },
                    onFailure = { error ->
                        Log.e("NotificationViewModel", "❌ Failed to mark notification as read", error)
                    }
                )
            } catch (e: Exception) {
                Log.e("NotificationViewModel", "❌ Exception marking notification as read", e)
            }
        }
    }

    fun markAllAsRead() {
        viewModelScope.launch {
            try {
                Log.d("NotificationViewModel", "Marking all notifications as read...")
                notificationRepository.markAllAsRead().fold(
                    onSuccess = { markedCount ->
                        // Update local state
                        allNotifications = allNotifications.map { notification ->
                            notification.copy(is_read = true)
                        }

                        // Update UI state
                        notificationUIState = NotificationUIState.Success(allNotifications)

                        // Reset unread count
                        unreadCount = 0

                        Log.d("NotificationViewModel", "✅ Successfully marked $markedCount notifications as read")
                    },
                    onFailure = { error ->
                        Log.e("NotificationViewModel", "❌ Failed to mark all notifications as read", error)
                    }
                )
            } catch (e: Exception) {
                Log.e("NotificationViewModel", "❌ Exception marking all notifications as read", e)
            }
        }
    }

    fun selectTab(tab: NotificationTab) {
        selectedTab = tab
    }

    fun getFilteredNotifications(): List<NotificationItem> {
        return when (selectedTab) {
            NotificationTab.ALL -> allNotifications
            NotificationTab.UNREAD -> allNotifications.filter { !it.is_read }
        }
    }
}

sealed class NotificationUIState {
    object Loading : NotificationUIState()
    data class Success(val notifications: List<NotificationItem>) : NotificationUIState()
    data class Error(val message: String) : NotificationUIState()
}

enum class NotificationTab {
    ALL, UNREAD
}