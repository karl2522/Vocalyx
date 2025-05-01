import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

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
        
        console.log('Request config:', config);
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
    (error) => {
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


export default api;