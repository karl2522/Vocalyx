import axios from 'axios';

const API_URL = ' http://127.0.0.1:8000/api';

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



export const notificationService = {
  getNotifications: () => api.get('/notifications/'),
  getUnreadNotifications: () => api.get('/notifications/unread/'),
  getNotificationCount: () => api.get('/notifications/count/'),
  markAsRead: (notificationId) => api.patch(`/notifications/${notificationId}/mark_as_read/`),
  markAllAsRead: () => api.post('/notifications/mark_all_as_read/')
};

export const classRecordService = {
    // Get all class records for the authenticated user
    getClassRecords: () => api.get('/class-records/'),
    
    // Create a new class record
    createClassRecord: (recordData) => {
        const googleAccessToken = localStorage.getItem('googleAccessToken');
        const config = {};
        if (googleAccessToken) {
            config.headers = {
                'X-Google-Access-Token': googleAccessToken
            };
        }
        return api.post('/class-records/', recordData, config);
    },
    
    // Get a specific class record by ID
    getClassRecord: (id) => api.get(`/class-records/${id}/`),
    
    // Update a class record
    updateClassRecord: (id, recordData) => api.patch(`/class-records/${id}/`, recordData),
    
    // Delete a class record
    deleteClassRecord: (id) => {
        const googleAccessToken = localStorage.getItem('googleAccessToken');
        const config = {};
        if (googleAccessToken) {
            config.headers = {
                'X-Google-Access-Token': googleAccessToken
            };
        }
        return api.delete(`/class-records/${id}/`, config);
    },
    
    // Get students for a specific class record
    getClassRecordStudents: (id) => api.get(`/class-records/${id}/students/`),
    
    // Add a student to a class record
    addStudentToClassRecord: (classRecordId, studentData) => 
        api.post(`/class-records/${classRecordId}/add_student/`, studentData),
    
    // Get grade categories for a class record
    getClassRecordGradeCategories: (id) => api.get(`/class-records/${id}/grade_categories/`),
    
    // Add a grade category to a class record
    addGradeCategoryToClassRecord: (classRecordId, categoryData) => 
        api.post(`/class-records/${classRecordId}/add_grade_category/`, categoryData),

    saveSpreadsheetData: (classRecordId, data) => 
        api.post(`/class-records/${classRecordId}/save_spreadsheet/`, { spreadsheet_data: data }),
    
    // Load spreadsheet data
    getSpreadsheetData: (classRecordId) => 
        api.get(`/class-records/${classRecordId}/spreadsheet/`),
    
    // Save custom columns/categories
    saveCustomColumns: (classRecordId, columns) => 
        api.post(`/class-records/${classRecordId}/save_columns/`, { custom_columns: columns }),
    
    // Get custom columns/categories
    getCustomColumns: (classRecordId) => 
        api.get(`/class-records/${classRecordId}/columns/`),
    
    // Add column to specific category
    addColumn: (classRecordId, category, columnName) => 
        api.post(`/class-records/${classRecordId}/add_column/`, { 
            category: category, 
            column_name: columnName 
        }),
    
    // Remove column from specific category
    removeColumn: (classRecordId, category, columnName) => 
        api.post(`/class-records/${classRecordId}/remove_column/`, { 
            category: category, 
            column_name: columnName 
        }),

    // 🔥 FIXED: Use the same 'api' instance instead of axiosInstance
    saveImportedExcel: (id, data) => {
        return api.post(`/class-records/${id}/save_imported_excel/`, data);
    },

    getImportedExcel: (id) => {
        return api.get(`/class-records/${id}/get_imported_excel/`);
    },

    updateImportedExcel: (id, data) => {
        return api.post(`/class-records/${id}/update_imported_excel/`, { data });
    },

    clearImportedExcel: (id) => {
        return api.post(`/class-records/${id}/clear_imported_excel/`);
    },

    getGoogleSheetsData: (sheetId) => {
        const googleAccessToken = localStorage.getItem('googleAccessToken');
        const config = {};
        if (googleAccessToken) {
            config.headers = {
                'X-Google-Access-Token': googleAccessToken
            };
        }
        return api.get(`/sheets/data/${sheetId}/`, config);
    },

    getGoogleSheetsDataServiceAccount: (sheetId) => {
        return api.get(`/sheets/service-account/data/${sheetId}/`);
    },

    updateGoogleSheetsCell: (sheetId, row, column, value) => {
        return api.post(`/sheets/service-account/${sheetId}/update-cell/`, {
            row,
            column, 
            value
        });
    },

    addStudentToGoogleSheets: (sheetId, studentData) => {
        return api.post(`/sheets/service-account/${sheetId}/add-student/`, {
            student_data: studentData
        });
    },

    addStudentToGoogleSheetsWithAutoNumber: (sheetId, studentData, sheetName = null) => 
        api.post(`/sheets/${sheetId}/add-student-auto-number/`, { 
            student_data: studentData,
            sheet_name: sheetName  // Include the sheet name in the request
        }),

    autoNumberGoogleSheetsStudents: (sheetId) => 
        api.post(`/sheets/${sheetId}/auto-number-students/`),

    getClassRecordsWithLiveCounts: () => api.get('/class-records/live-counts/'),

    getAllSheetsData: (sheetId) => {
        return api.get(`/sheets/service-account/${sheetId}/all-sheets-data/`);
    },

    getSpecificSheetData: (sheetId, sheetName) => {
        return api.get(`/sheets/service-account/${sheetId}/sheet/${encodeURIComponent(sheetName)}/data/`);
    },

    getSheetsList: (sheetId) => {
        return api.get(`/sheets/service-account/${sheetId}/sheets-list/`);
    },

    updateGoogleSheetsCellSpecific: (sheetId, row, column, value, sheetName) => {
        return api.post(`/sheets/service-account/${sheetId}/update-cell-specific/`, {
            row,
            column, 
            value,
            sheet_name: sheetName
        });
    },

    importStudentsPreview: (sheetId, students, sheetName = null) => {
        const payload = { students };
        if (sheetName) payload.sheet_name = sheetName;
        
        return api.post(`/sheets/${sheetId}/import-students-preview/`, payload);
    },

    importStudentsExecute: (sheetId, newStudents, resolvedConflicts, sheetName = null) => {
        const payload = { 
            newStudents, 
            resolvedConflicts 
        };
        if (sheetName) payload.sheet_name = sheetName;
        
        return api.post(`/sheets/${sheetId}/import-students-execute/`, payload);
    },

    previewColumnImport: (sheetId, excelData, sheetName = null) => {
        const payload = { excel_data: excelData };
        if (sheetName) payload.sheet_name = sheetName;
        
        return api.post(`/sheets/${sheetId}/preview-column-import/`, payload);
    },

    analyzeColumnsForMapping: (sheetId, importColumns, sheetName = null) => {
        const payload = { import_columns: importColumns };
        if (sheetName) payload.sheet_name = sheetName;
        
        return api.post(`/sheets/${sheetId}/analyze-columns-mapping/`, payload);
    },

    executeColumnImport: (sheetId, columnMappings, importData, sheetName = null) => {
        const payload = { 
            column_mappings: columnMappings,
            import_data: importData
        };
        if (sheetName) payload.sheet_name = sheetName;
        
        return api.post(`/sheets/${sheetId}/execute-column-import/`, payload);
    },

    renameColumnHeader: (sheetId, columnIndex, newName, sheetName = null) => {
        const payload = { 
            column_index: columnIndex,
            new_name: newName
        };
        if (sheetName) payload.sheet_name = sheetName;
        
        return api.post(`/sheets/${sheetId}/rename-column-header/`, payload);
    },

    analyzeColumnsForMappingEnhanced: (sheetId, importColumns, classRecordId, sheetName = null, forceReimport = []) => {
        const payload = { 
            import_columns: importColumns,
            class_record_id: classRecordId,
            force_reimport: forceReimport
        };
        if (sheetName) payload.sheet_name = sheetName;
        
        return api.post(`/sheets/${sheetId}/analyze-columns-mapping-enhanced/`, payload);
    },

    executeColumnImportEnhanced: (sheetId, columnMappings, importData, classRecordId, sheetName = null) => {
        const payload = { 
            column_mappings: columnMappings,
            import_data: importData,
            class_record_id: classRecordId
        };
        if (sheetName) payload.sheet_name = sheetName;
        
        return api.post(`/sheets/${sheetId}/execute-column-import-enhanced/`, payload);
    },

    getImportHistory: (sheetId) => {
        return api.get(`/sheets/${sheetId}/import-history/`);
    },

    updateMaxScore: (sheetId, columnName, maxScore, sheetName = null) => {
        const payload = { 
            column_name: columnName,
            max_score: maxScore
        };
        if (sheetName) payload.sheet_name = sheetName;
        
        return api.post(`/sheets/${sheetId}/update-max-score/`, payload);
    },

    updateBatchMaxScores: (sheetId, columnNames, maxScore, sheetName = null) => {
        const payload = { 
            column_names: columnNames,
            max_score: maxScore
        };
        if (sheetName) payload.sheet_name = sheetName;
        
        return api.post(`/sheets/${sheetId}/update-batch-max-scores/`, payload);
    },
};

export const enhancedClassRecordService = {
    ...classRecordService,
    
    // Override createClassRecord to log activity
    createClassRecord: async (recordData) => {
        try {
            const response = await classRecordService.createClassRecord(recordData);
            
            // Log activity
            await activityService.logActivity(
                'record_created',
                `Created class record "${recordData.name}"`,
                {
                    description: `Created new class record for ${recordData.semester}`,
                    metadata: { 
                        semester: recordData.semester,
                        teacher: recordData.teacher_name 
                    },
                    classRecordId: response.data.id
                }
            );
            
            return response;
        } catch (error) {
            throw error;
        }
    },
    
    // Override updateClassRecord to log activity
    updateClassRecord: async (id, recordData) => {
        try {
            const response = await classRecordService.updateClassRecord(id, recordData);
            
            // Log activity
            await activityService.logActivity(
                'record_updated',
                `Updated class record "${recordData.name || 'record'}"`,
                {
                    description: `Modified class record details`,
                    metadata: recordData,
                    classRecordId: id
                }
            );
            
            return response;
        } catch (error) {
            throw error;
        }
    },
    
    // Override deleteClassRecord to log activity
    deleteClassRecord: async (id, recordName = 'record') => {
        try {
            const response = await classRecordService.deleteClassRecord(id);
            
            // Log activity
            await activityService.logActivity(
                'record_deleted',
                `Deleted class record "${recordName}"`,
                {
                    description: `Permanently removed class record`,
                    metadata: { deleted_record_id: id },
                    classRecordId: id
                }
            );
            
            return response;
        } catch (error) {
            throw error;
        }
    }
};

export const activityService = {
    // Get user activities
    getActivities: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return api.get(`/activities/${queryParams ? `?${queryParams}` : ''}`);
    },
    
    // Create new activity
    createActivity: (activityData) => api.post('/activities/create/', activityData),
    
    // Get activity statistics
    getActivityStats: (days = 7) => api.get(`/activities/stats/?days=${days}`),
    
    // Helper method to log common activities
    logActivity: async (type, title, options = {}) => {
        try {
            const activityData = {
                activity_type: type,
                title,
                description: options.description || '',
                metadata: options.metadata || {},
                class_record_id: options.classRecordId || null,
            };
            
            return await api.post('/activities/create/', activityData);
        } catch (error) {
            console.error('Failed to log activity:', error);
            // Don't throw error to avoid breaking main functionality
        }
    }
};

// Add default export
const apiService = {
    register,
    verifyEmail,
    login,
    logout,
    refreshToken,
    classRecordService: enhancedClassRecordService, // Use enhanced version
    activityService, // 🔥 NEW
};

export default apiService;