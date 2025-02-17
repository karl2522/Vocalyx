import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import './App.css'
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import './index.css'

function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<div>Signup</div>} />
      </Routes>
    </Router>
  )
}

export default App
