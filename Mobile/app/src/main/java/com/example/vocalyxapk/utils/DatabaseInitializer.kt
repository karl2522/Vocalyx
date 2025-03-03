package com.example.vocalyxapk.utils

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.example.vocalyxapk.data.AppDatabase
import com.example.vocalyxapk.data.entity.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.withContext

/**
 * Utility class to initialize the database with sample data if needed.
 * This can be used during development or for first-time app launch.
 */
object DatabaseInitializer {
    
    /**
     * Schedule initialization to be done in the background
     */
    fun initializeDatabase(context: Context) {
        val work = OneTimeWorkRequestBuilder<DatabaseInitWorker>().build()
        WorkManager.getInstance(context).enqueue(work)
    }
    
    /**
     * Worker to initialize database in background
     */
    class DatabaseInitWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
        override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
            try {
                val database = AppDatabase.getDatabase(applicationContext)
                val userDao = database.userDao()
                
                // Check if database has already been initialized
                val users = userDao.getAllUsers().firstOrNull()
                if (users == null || users.isEmpty()) {
                    // Add test users
                    val testUser = User(
                        firstName = "Test",
                        lastName = "User",
                        email = "test@example.com",
                        password = "password123"  // In real app, this should be hashed
                    )
                    userDao.insertUser(testUser)
                }
                
                Result.success()
            } catch (e: Exception) {
                Result.failure()
            }
        }
    }
}
