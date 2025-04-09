import React, { createContext, useContext, useState, useEffect } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from "@azure/msal-react";

const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const AuthContext = createContext(null);


const msalConfig = {
  auth: {
    clientId: '5a7221d3-d167-4f9d-b62e-79c987bb5d5f',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: process.env.NODE_ENV === 'production' 
    ? 'https://vocalyx-frontend-lfrqbtcn6-penguinman2s-projects.vercel.app' 
    : 'http://localhost:5173',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  }
};
  
const msalInstance = new PublicClientApplication(msalConfig);
msalInstance.initialize(); // Initialize without await

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        if (!initialized) {
          await msalInstance.initialize();
          setInitialized(true);
        }
      } catch (error) {
        console.error('MSAL initialization error:', error);
      }
    };
  
    initializeMsal();
    
    // Check for auth token and user data
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          setUser(user);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };
  
    checkAuth();
  }, [initialized]);

  const handleAuthResponse = async (token, provider) => {
    try {
      console.log('Sending auth request with token:', token);
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://vocalyx-c61a072bf25a.herokuapp.com' 
        : 'http://127.0.0.1:8000';
        
      const response = await fetch(`${baseUrl}/api/auth/google/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_token: token,
        }),
        credentials: 'include',
      });
  
      const data = await response.json();
      console.log('Auth response:', data);
      
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('refreshToken', data.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        return data;
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
};


      const googleLogin = async (response) => {
        try {
          if (!response || !response.credential) {
            throw new Error('No ID token received from Google');
          }
          return await handleAuthResponse(response.credential, 'google-oauth2');
        } catch (error) {
          console.error('Google login error:', error);
          throw error;
        }
      };

  const microsoftLogin = async () => {
    try {
      const result = await msalInstance.loginPopup({
        scopes: ['user.read'],
      });
      await handleAuthResponse(result.accessToken, 'microsoft-graph');
    } catch (error) {
      console.error('Microsoft login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <MsalProvider instance={msalInstance}>
    <AuthContext.Provider value={{ user, loading, googleLogin, microsoftLogin, logout }}>
      {children}
    </AuthContext.Provider>
    </MsalProvider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};