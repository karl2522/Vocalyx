package com.example.vocalyxapk.data.repository

import com.example.vocalyxapk.data.dao.UserDao
import com.example.vocalyxapk.data.entity.User
import kotlinx.coroutines.flow.Flow

class UserRepository(private val userDao: UserDao) {
    
    suspend fun insertUser(user: User): Long {
        return userDao.insertUser(user)
    }
    
    suspend fun login(email: String, password: String): User? {
        return userDao.login(email, password)
    }
    
    suspend fun getUserByEmail(email: String): User? {
        return userDao.getUserByEmail(email)
    }
    
    fun getAllUsers(): Flow<List<User>> {
        return userDao.getAllUsers()
    }
}
