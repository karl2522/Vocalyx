import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('token', token);
    }else {
        delete api.defaults.headers.common['Authorization'];
        localStorage.removeItem('token');
    }
};


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
        if(response.data.token) {
            setAuthToken(response.token.access);
            localStorage.setItem('refresh_token', response.data.token.refresh);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};


export const logout = async () => {
    try {
        const refresh_token = localStorage.getItem('refresh_token');
        await api.post('/logout/', { refresh: refresh_token });
        setAuthToken(null);
        localStorage.clear();
    } catch (error) {
        console.error('Logout error:', error);
    }
}



