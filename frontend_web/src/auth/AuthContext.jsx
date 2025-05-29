import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from "@azure/msal-react";
import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useState } from 'react';
import { clearAuthState } from '../utils/auth';
import { showToast } from '../utils/toast';
import sessionTimer from '../utils/sessiontimer';
import { refreshToken } from '../services/api';

// Environment variables
const REDIRECT_URI = import.meta.env.NODE_ENV === 'production' 
  ? 'https://vocalyx-frontend.vercel.app/' 
  : 'http://localhost:5173';
const BACKEND_URL = import.meta.env.NODE_ENV === 'production' 
  ? 'https://vocalyx-c61a072bf25a.herokuapp.com' 
  : 'http://127.0.0.1:8000';

const AuthContext = createContext(null);

const msalConfig = {
  auth: {
    clientId: '5a7221d3-d167-4f9d-b62e-79c987bb5d5f',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: REDIRECT_URI,
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
  const [showSessionTimeoutModal, setShowSessionTimeoutModal] = useState(false);

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
          
          // Start session timer when user is authenticated
          startSessionTimer();
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

  // Set up activity listeners to refresh session timer
  useEffect(() => {
    if (user) {
      const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
      const activityHandler = () => sessionTimer.resetTimersOnActivity();
      
      events.forEach(event => {
        window.addEventListener(event, activityHandler);
      });
      
      return () => {
        events.forEach(event => {
          window.removeEventListener(event, activityHandler);
        });
      };
    }
  }, [user]);

  const startSessionTimer = () => {
    sessionTimer.start(
      // Logout callback
      () => {
        handleLogout('session_expired');
      },
      // Warning callback (5 minutes before)
      () => {
        setShowSessionTimeoutModal(true);
      }
    );
  };

  const handleLogout = (reason = 'manual_logout') => {
    // Clear session timer
    sessionTimer.clear();
    
    // Clear auth data
    clearAuthState();
    
    // Set logout reason
    if (reason !== 'manual_logout') {
      localStorage.setItem('logout_reason', reason);
    } else {
      localStorage.removeItem('logout_reason');
    }
    
    // Clear user state
    setUser(null);
    
    // Close modal if open
    setShowSessionTimeoutModal(false);
  };

  const handleStayLoggedIn = async () => {
    try {
      setShowSessionTimeoutModal(false);
      
      // Try to refresh the token
      const refreshTokenStr = localStorage.getItem('refreshToken');
      if (refreshTokenStr) {
        const response = await refreshToken(refreshTokenStr);
        
        if (response && response.access) {
          localStorage.setItem('authToken', response.access);
          
          // Reset session timer
          sessionTimer.clear();
          startSessionTimer();
          
          showToast.success('Session extended successfully');
          return;
        }
      }
      
      // If refresh token failed, logout
      handleLogout('session_expired');
    } catch (error) {
      console.error('Error refreshing token:', error);
      handleLogout('session_expired');
    }
  };

  const handleAuthResponse = async (token) => {
    try {
      console.log('Sending auth request with token:', token);
        
      const response = await fetch(`${BACKEND_URL}/api/auth/google/`, {
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
        
        // Start session timer when user logs in
        startSessionTimer();
        
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
      return await handleAuthResponse(response.credential);
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
      await handleAuthResponse(result.accessToken);
    } catch (error) {
      console.error('Microsoft login error:', error);
      throw error;
    }
  };

  const logout = () => {
    handleLogout('manual_logout');
  };

  return (
    <MsalProvider instance={msalInstance}>
      <AuthContext.Provider 
        value={{ 
          user, 
          loading, 
          googleLogin, 
          microsoftLogin, 
          logout,
          setUser,
          showSessionTimeoutModal,
          handleStayLoggedIn,
          handleLogout
        }}
      >
        {children}
      </AuthContext.Provider>
    </MsalProvider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};