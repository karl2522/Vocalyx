import { GoogleOAuthProvider } from '@react-oauth/google'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ClassDetails from './components/ClassDetails'
import Classes from './components/Classes'
import CourseDetail from './components/CourseDetail'
import Courses from './components/Courses'
import Dashboard from './components/Dashboard'
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import Profile from './components/Profile'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import Recordings from './components/Recordings'
import Schedule from './components/Schedule'
import Signup from './components/Signup'
import Team from './components/Team'
import ClassAccessGuard from './components/ClassAccessGuard'
import CourseAccessGuard from './components/CourseAccessGuard'
import './index.css'
import { enableHardwareAcceleration, preloadHeaderAssets } from './utils/preload.js'

// Create a preload component to insert our preload elements
const Preloader = () => {
  useEffect(() => {
    // Enable hardware acceleration as soon as the app loads
    enableHardwareAcceleration();
  }, []);
  
  // This injects the preload CSS and elements directly into the DOM
  return <div dangerouslySetInnerHTML={{ __html: preloadHeaderAssets() }} />;
};

function App() {
  return (
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

              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/courses" element={
                <ProtectedRoute>
                  <Courses />
                </ProtectedRoute>
              } />
             <Route path="/dashboard/course/:id" element={
                <ProtectedRoute>
                  <CourseAccessGuard>
                    <CourseDetail />
                  </CourseAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/dashboard/classes" element={
                <ProtectedRoute>
                  <Classes />
                </ProtectedRoute>
              } />
             <Route path="/dashboard/class/:id" element={
                <ProtectedRoute>
                  <ClassAccessGuard>
                    <ClassDetails />
                  </ClassAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/dashboard/recordings" element={
                <ProtectedRoute>
                  <Recordings />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/team" element={
                <ProtectedRoute>
                  <Team />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/schedule" element={
                <ProtectedRoute>
                  <Schedule />
                </ProtectedRoute>
              } />
              <Route path="*" element={
                <ProtectedRoute>
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App