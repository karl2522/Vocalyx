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

function App() {

  return (
    <GoogleOAuthProvider 
      clientId="841187713627-6u60gs5iq5h6qalooub6q27nrulifoug.apps.googleusercontent.com"
    >
      <AuthProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/projects" element={<Projects />} />
            <Route path="/dashboard/recordings" element={<Recordings />} />
            <Route path="/dashboard/class/:id" element={<ClassDetails />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App