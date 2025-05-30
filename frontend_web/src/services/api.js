import axios from 'axios';
import * as XLSX from 'xlsx';

const API_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});


api.interceptors.request.use(
    (config) => {
        // Try to get token from both possible storage keys for backward compatibility
        const token = localStorage.getItem('authToken') || localStorage.getItem('access_token');
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        // Handle 401 errors for token refresh
        const originalRequest = error.config;
        
        // If error is 401 (Unauthorized) and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                // Try both possible refresh token keys for backward compatibility
                const refreshTokenStr = localStorage.getItem('refreshToken') || localStorage.getItem('refresh_token');
                
                if (refreshTokenStr) {
                    // Try to refresh the token
                    const response = await refreshToken(refreshTokenStr);
                    
                    if (response && response.access) {
                        // Update the token in localStorage (both keys for compatibility)
                        localStorage.setItem('authToken', response.access);
                        localStorage.setItem('access_token', response.access);
                        
                        // Update the authorization header
                        originalRequest.headers.Authorization = `Bearer ${response.access}`;
                        api.defaults.headers.common['Authorization'] = `Bearer ${response.access}`;
                        
                        // Retry the original request
                        return api(originalRequest);
                    }
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                // Set logout reason
                localStorage.setItem('logout_reason', 'session_expired');
                // Clear auth data
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
            }
        }
        
        console.error('Response error:', error);
        return Promise.reject(error);
    }
);


export const register = async (userData) => {
    try {
        const formattedData = {
            first_name: userData.firstName,   
            last_name: userData.lastName,      
            email: userData.email,
            password: userData.password,
            password2: userData.confirmPassword 
        };

        const response = await api.post('/register/', formattedData);
        return response.data;
    } catch (error) {
        if (error.response) {
            throw error.response.data;
        } else if (error.request) {
            throw new Error('No response from server');
        } else {
            throw new Error('Error setting up request');
        }
    }
};


export const verifyEmail = async (token) => {
    try {
        const response = await api.get(`/verify-email/${token}/`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};


export const login = async (credentials) => {
    try {
        const response = await api.post('/login/', credentials);
        console.log('Login response:', response.data);
        
        const { tokens, user } = response.data;
        
        if (!tokens || !user) {
            console.error('Invalid response structure:', response.data);
            throw new Error('Invalid response from server');
        }
        
        localStorage.setItem('authToken', tokens.access);
        localStorage.setItem('refreshToken', tokens.refresh);
        localStorage.setItem('user', JSON.stringify(user));
        
        return {
            tokens,
            user,
            success: true
        };
    } catch (error) {
        console.error('Login error:', error);
        if (error.response?.data?.error) {
            throw new Error(error.response.data.error);
        }
        throw new Error('An error occurred during login');
    }
};

export const logout = async () => {
    try {
        const refresh_token = localStorage.getItem('refreshToken');
        await api.post('/logout/', { refresh_token });
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }
};

// Add refresh token function
export const refreshToken = async (refreshTokenStr) => {
    try {
        const response = await api.post('/refresh-token/', {
            refresh: refreshTokenStr
        });
        return response.data;
    } catch (error) {
        console.error('Refresh token error:', error);
        if (error.response) {
            throw error.response.data;
        } else if (error.request) {
            throw new Error('No response from server');
        } else {
            throw new Error('Error setting up refresh token request');
        }
    }
};


export const classService = {
    getClasses: () => api.get('/classes/'),
    createClass: (classData) => api.post('/classes/', classData),
    getClass: (id) => api.get(`/classes/${id}/`),
    updateClass: (id, classData) => api.patch(`/classes/${id}/`, classData),
    deleteClass: (id) => api.delete(`/classes/${id}/`),
    updateCategoryMappings: (fileId, updatedData) => {
        return api.patch(
            `/excel/${fileId}/update_categories/`, 
            updatedData,
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );
    },
    
    // 🆕 NEW: Preview merge conflicts before actual merge
    previewMerge: (file, classId, matchingThreshold = 0.85, columnMapping = null) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('class_id', String(classId));
        formData.append('matching_threshold', String(matchingThreshold));
        
        if (columnMapping) {
            formData.append('column_mapping', JSON.stringify(columnMapping));
        }
        
        return api.post('/excel/preview_merge/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
    
    // 🆕 NEW: Execute merge with conflict resolutions
    executeMerge: (file, classId, conflictResolutions = {}, bulkActions = {}, columnMapping = null, categoryMappings = null) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('class_id', String(classId));
        formData.append('conflict_resolutions', JSON.stringify(conflictResolutions));
        formData.append('bulk_actions', JSON.stringify(bulkActions));
        
        if (columnMapping) {
            formData.append('column_mapping', JSON.stringify(columnMapping));
        }
        
        if (categoryMappings) {
            formData.append('category_mappings', JSON.stringify(categoryMappings));
        }
        
        return api.post('/excel/execute_merge/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
    
    // 🔄 UPDATED: Basic merge (kept for backward compatibility)
    mergeExcel: (formData) => {
        return api.post('/excel/merge/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
    
    getClassById: (id) => {
        return api.get(`/classes/${id}/`);
    },
    getClassExcelFiles: (classId) => {
        return api.get(`/excel/?class_id=${classId}`);
    },
    getExcelFile: (fileId) => {
        return api.get(`/excel/${fileId}/`);
    },
    deleteExcelFile: (fileId) => {
        return api.delete(`/excel/${fileId}/`);
    },
    updateExcelData: (fileId, data, sheetName, headers = null) => {
        const payload = {
            sheet_data: data,
            sheet_name: sheetName
        };
        
        if (headers) {
            payload.headers = headers;
        }
        
        return api.patch(
            `/excel/${fileId}/update_data/`, 
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );
    },
    setActiveSheet: (fileId, sheetName) => {
        return api.patch(
            `/excel/${fileId}/set_active_sheet/`,
            { sheet_name: sheetName },
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );
    },
    
    // 🗑️ CLEANED: Removed mock data, now uses real API
    uploadExcelWithColumns: (file, classId, customColumns = null, categoryMappings = null) => {
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('class_id', String(classId));
        
        if (customColumns && customColumns.length > 0) {
            formData.append('custom_columns', JSON.stringify(customColumns));
        }
        
        if (categoryMappings && categoryMappings.length > 0) {
            formData.append('category_mappings', JSON.stringify(categoryMappings));
        }
        
        return api.post('/excel/upload/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
    
    uploadExcel: (file, classId, customColumns = null, categoryMappings = null) => {
        if (!(file instanceof File)) {
            return Promise.reject(new Error("Invalid file object"));
        }
        
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('class_id', String(classId));
        
        if (customColumns && customColumns.length > 0) {
            formData.append('custom_columns', JSON.stringify(customColumns));
        }
        
        if (categoryMappings && categoryMappings.length > 0) {
            formData.append('category_mappings', JSON.stringify(categoryMappings));
        }
        
        return api.post('/excel/upload/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
    
    downloadExcel: (fileId, format = 'xlsx') => {
        return api.get(`/excel/${fileId}/download/?format=${format}`, {
            responseType: 'arraybuffer'
        });
    }
};

export const courseService = {
    getCourses: () => api.get('/courses/'),
    createCourse: (courseData) => api.post('/courses/', courseData),
    getCourse: (id) => api.get(`/courses/${id}/`),
    updateCourse: (id, courseData) => api.patch(`/courses/${id}/`, courseData),
    deleteCourse: (id) => api.delete(`/courses/${id}/`),
    getCourseClasses: (courseId) => api.get(`/classes/?course_id=${courseId}`),
    getAllClasses: () => api.get('/classes/'),
    getTeamDetails: () => api.get('/teams/'),
};

export const userService = {
    getProfile: () => api.get('/profile/'),
    updateProfile: (userData) => api.put('/update-profile/', userData),
    uploadProfilePicture: (file) => {
        const formData = new FormData();
        formData.append('profile_picture', file);
        return api.post('/upload-profile-picture/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

export const teamService = {
    getMyTeams: () => api.get('/teams/my_teams/'),
    checkClassAccess: (classId) => {
        return api.get(`/teams/check-class-access/${classId}/`);
    },
    getOwnedTeams: () => api.get('/teams/owned_teams/'),
    getJoinedTeams: () => api.get('/teams/joined_teams/'),
    getMyTeam: () => api.get('/teams/my_team/').catch(error => {
        if (error.response && error.response.status === 404) {
            return { data: null };
        }
        throw error;
    }),
    createTeam: (teamData) => {
        console.log("API call: creating team with data", teamData);
        
        const formattedData = {
          name: teamData.name,
          members: Array.isArray(teamData.members) ? teamData.members : [],
          courses: Array.isArray(teamData.courses) ? teamData.courses.map(id => Number(id)) : []
        };
        
        return api.post('/teams/', formattedData);
    },
    joinTeam: (code) => api.post('/teams/join/', { code }),
    
    addMember: (teamId, email, permissions = 'view') => 
        api.post(`/teams/${teamId}/add_member/`, { email, permissions }),
    removeMember: (teamId, memberId) => 
        api.delete(`/teams/${teamId}/remove_member/`, { data: { member_id: memberId } }),
    updateMemberPermissions: (teamId, memberId, permissions) => 
        api.patch(`/teams/${teamId}/update_member_permissions/`, { member_id: memberId, permissions }),
    addCourse: (teamId, courseId) => 
        api.post(`/teams/${teamId}/add_course/`, { course_id: courseId }),
    removeCourse: (teamId, courseId) => 
        api.delete(`/teams/${teamId}/remove_course/`, { data: { course_id: courseId } }),
        
    searchUsers: (query) => {
        console.log(`API call: searching users with query "${query}"`);
        const timestamp = new Date().getTime();
        return api.get(`/teams/search_users/?q=${encodeURIComponent(query)}&_=${timestamp}`);
    },
    getAvailableCourses: () => api.get('/teams/available_courses/'),
    checkCourseAccess: (courseId) => {
        return api.get(`/teams/check-course-access/${courseId}/`);
    },
    getAllTeams: async () => api.get('/teams/all_teams/'),
    getTeamById: (teamId) => api.get(`/teams/${teamId}/`),
    
    acceptInvitation: (invitationId) => api.post(`/teams/${invitationId}/accept/`)
};

export const notificationService = {
  getNotifications: () => api.get('/notifications/'),
  getUnreadNotifications: () => api.get('/notifications/unread/'),
  getNotificationCount: () => api.get('/notifications/count/'),
  markAsRead: (notificationId) => api.patch(`/notifications/${notificationId}/mark_as_read/`),
  markAllAsRead: () => api.post('/notifications/mark_all_as_read/')
};

// Add default export
const apiService = {
    register,
    verifyEmail,
    login,
    logout,
    refreshToken,
    classService
};

export default apiService;