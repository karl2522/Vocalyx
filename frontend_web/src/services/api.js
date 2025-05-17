import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});


api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        
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
                const refreshTokenStr = localStorage.getItem('refreshToken');
                if (refreshTokenStr) {
                    // Try to refresh the token
                    const response = await refreshToken(refreshTokenStr);
                    
                    if (response && response.access) {
                        // Update the token in localStorage
                        localStorage.setItem('authToken', response.access);
                        
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
    getClassById: (id) => api.get(`/classes/${id}/`),
    getClassExcelFiles: (classId) => api.get(`/excel/?class_id=${classId}`),
    updateExcelData: (fileId, data) => api.patch(
        `/excel/${fileId}/update_data/`, 
        { sheet_data: data },
        {
            headers: {
                'Content-Type': 'application/json',
            }
        }
    ),
    uploadExcel: (file, classId) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('class_id', classId);
        return api.post('/excel/upload/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
    downloadExcel: (fileId) => api.get(`/excel/${fileId}/download/`),
};

export const courseService = {
    getCourses: () => api.get('/courses/'),
    createCourse: (courseData) => api.post('/courses/', courseData),
    getCourse: (id) => api.get(`/courses/${id}/`),
    updateCourse: (id, courseData) => api.patch(`/courses/${id}/`, courseData),
    deleteCourse: (id) => api.delete(`/courses/${id}/`),
    getCourseClasses: (courseId) => api.get(`/classes/?course_id=${courseId}`),
};

export const userService = {
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
};

export default api;