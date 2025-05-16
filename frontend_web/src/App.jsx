import { GoogleOAuthProvider } from '@react-oauth/google'
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
import Signup from './components/Signup'
import Schedule from './components/Schedule'
import ToastDemo from './components/ToastDemo'
import './index.css'

function App() {
  return (
    <GoogleOAuthProvider 
      clientId="841187713627-6u60gs5iq5h6qalooub6q27nrulifoug.apps.googleusercontent.com"
    >
      <AuthProvider>
        <Router>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#333',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                borderRadius: '8px',
                padding: '16px',
                maxWidth: '420px'
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#FFFFFF'
                }
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#FFFFFF'
                }
              }
            }}
          />
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
                <CourseDetail />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/classes" element={
              <ProtectedRoute>
                <Classes />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/class/:id" element={
              <ProtectedRoute>
                <ClassDetails />
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
            <Route path="/dashboard/toast-demo" element={
              <ProtectedRoute>
                <ToastDemo />
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
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App