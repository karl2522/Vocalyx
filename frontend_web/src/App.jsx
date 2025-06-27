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
import Schedule from './components/Schedule'
import Signup from './components/Signup'
import Team from './components/Team'
import ClassAccessGuard from './components/ClassAccessGuard'
import JoinedTeams from './components/JoinedTeams.jsx'
import CourseAccessGuard from './components/CourseAccessGuard'
import TeamDetail from './components/TeamDetail.jsx'
import YourTeams from './components/YourTeams.jsx'
import CreateClassRecord from './components/CreateClassRecords.jsx'
import ViewClassRecords from './components/ViewClassRecords .jsx'
import ClassRecordExcel from './components/ClassRecordExcel.jsx'
import ClassRecordImport from './components/ClassRecordImport.jsx'
import './index.css'
import { enableHardwareAcceleration, preloadHeaderAssets } from './utils/preload.js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
                
                {/* Add Class Records Routes */}
                <Route path="/dashboard/class-records" element={
                  <ProtectedRoute>
                    <CreateClassRecord />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/class-records/create" element={
                  <ProtectedRoute>
                    <CreateClassRecord />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/class-records/view" element={
                  <ProtectedRoute>
                    <ViewClassRecords />
                  </ProtectedRoute>
                } />

                <Route path="/dashboard/class-records/:id/excel" element={
                  <ProtectedRoute>
                    <ClassRecordExcel />
                  </ProtectedRoute>
                } />

                <Route path="/dashboard/class-records/:id/import" element={
                  <ProtectedRoute>
                    <ClassRecordImport />
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
                <Route path="/dashboard/team/your-teams" element={
                  <ProtectedRoute>
                    <YourTeams />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/team/joined-teams" element={
                  <ProtectedRoute>
                    <JoinedTeams />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/team/your-teams/:id" element={
                  <ProtectedRoute>
                    <TeamDetail userIsOwner={true} />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/team/joined-teams/:id" element={
                  <ProtectedRoute>
                    <TeamDetail userIsOwner={false} />
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
    </QueryClientProvider>
  )
}

export default App