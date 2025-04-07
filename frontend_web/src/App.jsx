import { Toaster } from 'react-hot-toast'
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import './App.css'
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import Signup from './components/Signup'
import { AuthProvider } from './auth/AuthContext'
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css'
import Dashboard from './components/Dashboard'
import Projects from './components/Projects'
import Recordings from './components/Recordings'
import ClassDetails from './components/ClassDetails'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import { Navigate } from 'react-router-dom'

function App() {
  return (
    <GoogleOAuthProvider 
      clientId="841187713627-6u60gs5iq5h6qalooub6q27nrulifoug.apps.googleusercontent.com"
    >
      <AuthProvider>
        <Router>
          <Toaster position="top-right" />
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
            <Route path="/dashboard/projects" element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/recordings" element={
              <ProtectedRoute>
                <Recordings />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/class/:id" element={
              <ProtectedRoute>
                <ClassDetails />
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