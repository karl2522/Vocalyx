import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from "@azure/msal-react";
import { signInWithPopup, signOut } from 'firebase/auth';
import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../config/firebase';
import { refreshToken } from '../services/api';
import { clearAuthState } from '../utils/auth';
import sessionTimer from '../utils/sessiontimer';
import { showToast } from '../utils/toast';

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

  const handleLogout = async (reason = 'manual_logout') => {
    // Clear session timer
    sessionTimer.clear();
    
    // Sign out from Firebase if user is logged in
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (error) {
      console.error('Error signing out from Firebase:', error);
    }
    
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

  const handleAuthResponse = async (idToken, accessToken = null) => {
    try {
      console.log('Sending auth request with tokens');
        
      const requestBody = {
        id_token: idToken,
      };

      // Include access token if available (for Drive API access)
      if (accessToken) {
        requestBody.access_token = accessToken;
      }

      const response = await fetch(`${BACKEND_URL}/api/firebase-auth/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include',
      });
  
      const data = await response.json();
      console.log('Auth response:', data);
      
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('refreshToken', data.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Store Google Drive access token if available
        if (accessToken) {
          localStorage.setItem('googleAccessToken', accessToken);
        }
        
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

  const googleLogin = async () => {
    try {
      // Sign in with Firebase using popup
      const result = await signInWithPopup(auth, googleProvider);
      
      // Get the user's ID token
      const idToken = await result.user.getIdToken();
      
      // Get the Google access token from the credential
      const credential = result._tokenResponse || result.credential;
      const accessToken = credential?.oauthAccessToken || credential?.accessToken;
      
      console.log('Firebase auth successful:', {
        user: result.user,
        hasIdToken: !!idToken,
        hasAccessToken: !!accessToken
      });

      // Send both tokens to backend
      return await handleAuthResponse(idToken, accessToken);
    } catch (error) {
      console.error('Firebase Google login error:', error);
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by browser. Please allow popups and try again.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Another sign-in popup is already open');
      }
      
      throw error;
    }
  };

  const microsoftLogin = async () => {
    try {
      const loginRequest = {
        scopes: ["User.Read", "profile", "email", "openid"],
        prompt: "select_account"
      };

      const response = await msalInstance.loginPopup(loginRequest);
      console.log('Microsoft auth response:', response);

      if (response.accessToken) {
        const res = await fetch(`${BACKEND_URL}/api/auth/microsoft/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: response.accessToken,
            id_token: response.idToken
          }),
        });

        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('refreshToken', data.refresh);
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
          
          // Start session timer when user logs in
          startSessionTimer();
          
          return data;
        } else {
          throw new Error(data.error || 'Microsoft login failed');
        }
      }
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