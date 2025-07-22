package com.example.vocalyxapk.repository

import com.example.vocalyxapk.api.RetrofitClient
import com.example.vocalyxapk.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class TeamRepository {
    private val apiService = RetrofitClient.apiService

    suspend fun getMyTeams(): Result<List<TeamItem>> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getMyTeams()
                if (response.isSuccessful) {
                    Result.success(response.body() ?: emptyList())
                } else {
                    Result.failure(Exception("Failed to fetch teams: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun getOwnedTeams(): Result<List<TeamItem>> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getOwnedTeams()
                if (response.isSuccessful) {
                    Result.success(response.body() ?: emptyList())
                } else {
                    Result.failure(Exception("Failed to fetch owned teams: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun getJoinedTeams(): Result<List<TeamItem>> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getJoinedTeams()
                if (response.isSuccessful) {
                    Result.success(response.body() ?: emptyList())
                } else {
                    Result.failure(Exception("Failed to fetch joined teams: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun createTeam(teamRequest: CreateTeamRequest): Result<TeamItem> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.createTeam(teamRequest)
                if (response.isSuccessful) {
                    response.body()?.let { team ->
                        Result.success(team)
                    } ?: Result.failure(Exception("Empty response body"))
                } else {
                    Result.failure(Exception("Failed to create team: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun joinTeam(code: String): Result<TeamItem> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.joinTeam(JoinTeamRequest(code))
                if (response.isSuccessful) {
                    response.body()?.let { team ->
                        Result.success(team)
                    } ?: Result.failure(Exception("Empty response body"))
                } else {
                    Result.failure(Exception("Failed to join team: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun getTeamById(teamId: Int): Result<TeamItem> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getTeamById(teamId)
                if (response.isSuccessful) {
                    response.body()?.let { team ->
                        Result.success(team)
                    } ?: Result.failure(Exception("Team not found"))
                } else {
                    Result.failure(Exception("Failed to fetch team: ${response.message()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}