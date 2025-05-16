import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

const SessionTimeoutModal = ({ isOpen, onStayLoggedIn, onLogout }) => {
  const [timeLeft, setTimeLeft] = useState(300);
  const navigate = useNavigate();
  
  useEffect(() => {
    let interval = null;
    if (isOpen && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      onLogout();
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, timeLeft, onLogout]);
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Session Expiring Soon</h2>
          <p className="text-gray-600 mt-2">
            Your session will expire in <span className="font-bold text-red-500">{formatTime(timeLeft)}</span>
          </p>
          <p className="text-gray-600 mt-1">
            Would you like to stay logged in?
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={onStayLoggedIn}
            className="flex-1 bg-[#333D79] hover:bg-[#2B3377] text-white py-2.5 px-4 rounded-lg transition-colors shadow-md"
          >
            Stay Logged In
          </button>
          <button
            onClick={onLogout}
            className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-100 py-2.5 px-4 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutModal;