import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import './App.css'
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import Signup from './components/Signup'
import SplashScreen from './components/SplashScreen'
import { AuthProvider } from './auth/AuthContext'
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css'

function App() {
  const [showSplash, setShowSplash] = useState(true)
  return (
    <GoogleOAuthProvider 
      clientId="841187713627-6u60gs5iq5h6qalooub6q27nrulifoug.apps.googleusercontent.com"
    >
      <AuthProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            {showSplash ? (
              <Route path="/" element={<SplashScreen setFirstVisit={setShowSplash} />} />
            ) : (
              <Route path="/" element={<LandingPage />} />
            )}
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App