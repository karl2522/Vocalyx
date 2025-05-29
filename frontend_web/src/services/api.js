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
        
        // If headers are provided, include them
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
    uploadExcelWithColumns: (formData) => {
        console.log("MOCK: uploadExcelWithColumns called");
        
        // Try to extract file from FormData
        const file = formData.get('file');
        
        if (file && file instanceof File) {
            // Use the same mock implementation as uploadExcel
            return new Promise((resolve) => {
                console.log("MOCK: Processing file locally instead of sending to backend");
                
                // Create a FileReader to read the file locally
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    try {
                        // Parse Excel file
                        const data = new Uint8Array(event.target.result);
                        const workbook = XLSX.read(data, {
                            type: 'array',
                            cellDates: true
                        });
                        
                        // Get sheet names
                        const sheetNames = workbook.SheetNames || [];
                        if (!sheetNames.length) {
                            throw new Error("No sheets found");
                        }
                        
                        // Process first sheet as active sheet
                        const activeSheet = sheetNames[0];
                        const worksheet = workbook.Sheets[activeSheet];
                        
                        // Convert to JSON
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        
                        // Extract headers and data
                        const headers = jsonData[0] || [];
                        const rows = jsonData.slice(1);
                        
                        // Format data for response
                        const formattedData = rows.map(row => {
                            const rowObj = {};
                            headers.forEach((header, index) => {
                                rowObj[header] = row[index] || null;
                            });
                            return rowObj;
                        });
                        
                        // Create mock response
                        const mockResponse = {
                            id: `mock_${Date.now()}`,
                            file_name: file.name,
                            active_sheet: activeSheet,
                            sheet_names: sheetNames,
                            all_sheets: {
                                [activeSheet]: {
                                    headers: headers,
                                    data: formattedData
                                }
                            },
                            uploaded_at: new Date().toISOString()
                        };
                        
                        console.log("MOCK: Created response:", mockResponse);
                        
                        // Simulate network delay
                        setTimeout(() => {
                            resolve({ data: mockResponse });
                        }, 1000);
                        
                    } catch (error) {
                        console.error("MOCK: Error processing file:", error);
                        // Still resolve with error for testing
                        resolve({ 
                            data: {
                                id: `mock_error_${Date.now()}`,
                                file_name: file.name,
                                error: error.message
                            } 
                        });
                    }
                };
                
                reader.onerror = () => {
                    console.error("MOCK: Error reading file");
                    resolve({ 
                        data: {
                            id: `mock_error_${Date.now()}`,
                            file_name: file.name,
                            error: "Error reading file"
                        } 
                    });
                };
                
                // Read the file
                reader.readAsArrayBuffer(file);
            });
        } else {
            console.error("MOCK: No file found in FormData");
            return Promise.resolve({
                data: {
                    id: `mock_error_${Date.now()}`,
                    error: "No file found in FormData"
                }
            });
        }
        
        /* ORIGINAL IMPLEMENTATION - COMMENTED OUT
        return api.post('/excel/upload/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        */
    },
    uploadExcel:(file, classId, customColumns = null) => {
        // Validate file
        if (!(file instanceof File)) {
            console.error("Not a valid File object:", file);
            return Promise.reject(new Error("Invalid file object"));
        }
        
        // Create a fresh FormData object
        const formData = new FormData();
        
        // Add file first - make sure it has the correct filename
        formData.append('file', file, file.name);
        
        // Add class_id as a string
        formData.append('class_id', String(classId));
        
        // Include custom columns if provided
        if (customColumns && customColumns.length > 0) {
            try {
                const columnsJson = JSON.stringify(customColumns);
                formData.append('custom_columns', columnsJson);
            } catch (err) {
                console.error("Error stringifying custom columns:", err);
            }
        }
        
        // Log form data for debugging
        console.log("FormData entries:");
        for (let pair of formData.entries()) {
            console.log(pair[0] + ': ' + (pair[0] === 'file' ? pair[1].name : pair[1]));
        }
        
        return api.post('/excel/upload/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }).catch(error => {
            console.error("API uploadExcel error:", error.message);
            console.error("Response data:", error.response?.data);
            throw error;
        });
    },
       downloadExcel: (fileId, format = 'xlsx') => {
        return api.get(`/excel//${fileId}/download/?format=${format}`, {
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