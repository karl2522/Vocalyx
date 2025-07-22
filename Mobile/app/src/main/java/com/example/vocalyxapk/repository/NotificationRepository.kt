package com.example.vocalyxapk.repository

import android.util.Log
import com.example.vocalyxapk.api.NotificationItem
import com.example.vocalyxapk.api.NotificationService
import com.example.vocalyxapk.api.RetrofitClient

class NotificationRepository {

    private val notificationService: NotificationService by lazy {
        RetrofitClient.retrofit.create(NotificationService::class.java)
    }

    suspend fun getNotifications(): Result<List<NotificationItem>> {
        return try {
            Log.d("NotificationRepository", "Fetching all notifications...")
            val response = notificationService.getNotifications()

            if (response.isSuccessful) {
                val notifications = response.body() ?: emptyList()
                Log.d("NotificationRepository", "✅ Successfully fetched ${notifications.size} notifications")
                Result.success(notifications)
            } else {
                Log.e("NotificationRepository", "❌ Failed to fetch notifications: ${response.code()} ${response.message()}")
                Result.failure(Exception("Failed to fetch notifications: ${response.message()}"))
            }
        } catch (e: Exception) {
            Log.e("NotificationRepository", "❌ Exception fetching notifications", e)
            Result.failure(e)
        }
    }

    suspend fun getUnreadNotifications(): Result<List<NotificationItem>> {
        return try {
            Log.d("NotificationRepository", "Fetching unread notifications...")
            val response = notificationService.getUnreadNotifications()

            if (response.isSuccessful) {
                val notifications = response.body() ?: emptyList()
                Log.d("NotificationRepository", "✅ Successfully fetched ${notifications.size} unread notifications")
                Result.success(notifications)
            } else {
                Log.e("NotificationRepository", "❌ Failed to fetch unread notifications: ${response.code()}")
                Result.failure(Exception("Failed to fetch unread notifications: ${response.message()}"))
            }
        } catch (e: Exception) {
            Log.e("NotificationRepository", "❌ Exception fetching unread notifications", e)
            Result.failure(e)
        }
    }

    suspend fun getNotificationCount(): Result<Pair<Int, Int>> {
        return try {
            Log.d("NotificationRepository", "Fetching notification count...")
            val response = notificationService.getNotificationCount()

            if (response.isSuccessful) {
                val countData = response.body()
                if (countData != null) {
                    Log.d("NotificationRepository", "✅ Notification count: ${countData.unread_count} unread, ${countData.total_count} total")
                    Result.success(Pair(countData.unread_count, countData.total_count))
                } else {
                    Log.e("NotificationRepository", "❌ Empty response body for notification count")
                    Result.failure(Exception("Empty response body"))
                }
            } else {
                Log.e("NotificationRepository", "❌ Failed to fetch notification count: ${response.code()}")
                Result.failure(Exception("Failed to fetch notification count: ${response.message()}"))
            }
        } catch (e: Exception) {
            Log.e("NotificationRepository", "❌ Exception fetching notification count", e)
            Result.failure(e)
        }
    }

    suspend fun markAsRead(notificationId: Int): Result<NotificationItem> {
        return try {
            Log.d("NotificationRepository", "Marking notification $notificationId as read...")
            val response = notificationService.markAsRead(notificationId)

            if (response.isSuccessful) {
                val updatedNotification = response.body()
                if (updatedNotification != null) {
                    Log.d("NotificationRepository", "✅ Successfully marked notification $notificationId as read")
                    Result.success(updatedNotification)
                } else {
                    Log.e("NotificationRepository", "❌ Empty response body for mark as read")
                    Result.failure(Exception("Empty response body"))
                }
            } else {
                Log.e("NotificationRepository", "❌ Failed to mark notification as read: ${response.code()}")
                Result.failure(Exception("Failed to mark notification as read: ${response.message()}"))
            }
        } catch (e: Exception) {
            Log.e("NotificationRepository", "❌ Exception marking notification as read", e)
            Result.failure(e)
        }
    }

    suspend fun markAllAsRead(): Result<Int> {
        return try {
            Log.d("NotificationRepository", "Marking all notifications as read...")
            val response = notificationService.markAllAsRead()

            if (response.isSuccessful) {
                val result = response.body()
                if (result != null) {
                    Log.d("NotificationRepository", "✅ Successfully marked ${result.marked_count} notifications as read")
                    Result.success(result.marked_count)
                } else {
                    Log.e("NotificationRepository", "❌ Empty response body for mark all as read")
                    Result.failure(Exception("Empty response body"))
                }
            } else {
                Log.e("NotificationRepository", "❌ Failed to mark all as read: ${response.code()}")
                Result.failure(Exception("Failed to mark all as read: ${response.message()}"))
            }
        } catch (e: Exception) {
            Log.e("NotificationRepository", "❌ Exception marking all as read", e)
            Result.failure(e)
        }
    }
}