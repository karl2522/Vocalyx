package com.example.vocalyxapk.api

import retrofit2.Response
import retrofit2.http.*

interface NotificationService {

    @GET("api/notifications/")
    suspend fun getNotifications(): Response<List<NotificationItem>>

    @GET("api/notifications/unread/")
    suspend fun getUnreadNotifications(): Response<List<NotificationItem>>

    @GET("api/notifications/count/")
    suspend fun getNotificationCount(): Response<NotificationCountResponse>

    @PATCH("api/notifications/{notificationId}/mark_as_read/")
    suspend fun markAsRead(@Path("notificationId") notificationId: Int): Response<NotificationItem>

    @POST("api/notifications/mark_all_as_read/")
    suspend fun markAllAsRead(): Response<MarkAllReadResponse>
}

// Response data classes
data class NotificationItem(
    val id: Int,
    val title: String,
    val message: String,
    val type: String, // course, recording, class, team, message, system
    val is_read: Boolean,
    val created_at: String,
    val sender_details: SenderDetails?
)

data class SenderDetails(
    val first_name: String,
    val last_name: String,
    val email: String?
)

data class NotificationCountResponse(
    val unread_count: Int,
    val total_count: Int
)

data class MarkAllReadResponse(
    val message: String,
    val marked_count: Int
)