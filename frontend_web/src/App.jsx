import { GoogleOAuthProvider } from '@react-oauth/google'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ClassRecordExcel from './components/ClassRecordExcel.jsx'
import ClassRecordImport from './components/ClassRecordImport.jsx'
import ClassRecords from './components/ClassRecords.jsx'
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import Profile from './components/Profile'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import Settings from './components/Settings.jsx'
import Signup from './components/Signup'
import './index.css'
import { enableHardwareAcceleration, preloadHeaderAssets } from './utils/preload.js'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const Preloader = () => {
  useEffect(() => {
    enableHardwareAcceleration();
  }, []);
  
  return <div dangerouslySetInnerHTML={{ __html: preloadHeaderAssets() }} />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider 
        clientId="841187713627-6u60gs5iq5h6qalooub6q27nrulifoug.apps.googleusercontent.com"
      >
        <AuthProvider>
          {/* Add the preloader component */}
          <Preloader />
          
          <Router>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#fff',
                  color: '#333',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  borderRadius: '0.5rem',
                  padding: '16px',
                  maxWidth: '420px',
                  fontSize: '14px',
                },
                success: {
                  style: {
                    background: 'linear-gradient(135deg, #eef0f8 0%, #dce0f2 100%)',
                    border: '1px solid rgba(51, 61, 121, 0.1)',
                  },
                  iconTheme: {
                    primary: '#333D79',
                    secondary: '#fff',
                  },
                },
                error: {
                  style: {
                    background: '#FFF3F3',
                    border: '1px solid rgba(220, 38, 38, 0.1)',
                  },
                  iconTheme: {
                    primary: '#DC2626',
                    secondary: '#fff',
                  },
                },
              }}
            />
            <div className="transition-container">
              <Routes>
                <Route path="/" element={
                  <PublicRoute>
                    <LandingPage />
                  </PublicRoute>
                } />
                <Route path="/login" element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } />
                <Route path="/signup" element={
                  <PublicRoute>
                    <Signup />
                  </PublicRoute>
                } />

                {/* Class Records Routes - Default Route */}
                <Route path="/class-records" element={
                  <ProtectedRoute>
                    <ClassRecords />
                  </ProtectedRoute>
                } />

                <Route path="/class-records/:id/excel" element={
                  <ProtectedRoute>
                    <ClassRecordExcel />
                  </ProtectedRoute>
                } />

                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />

                <Route path="/class-records/:id/import" element={
                  <ProtectedRoute>
                    <ClassRecordImport />
                  </ProtectedRoute>
                } />
                
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                
                {/* Redirect any unknown routes to class-records */}
                <Route path="*" element={
                  <ProtectedRoute>
                    <Navigate to="/class-records" replace />
                  </ProtectedRoute>
                } />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  )
}

export default App