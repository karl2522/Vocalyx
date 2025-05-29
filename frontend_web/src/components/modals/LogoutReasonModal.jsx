import React from 'react';

const LogoutReasonModal = ({ isOpen, onClose, reason }) => {
  if (!isOpen) return null;
  
  const getMessage = () => {
    switch (reason) {
      case 'session_expired':
        return {
          title: 'Session Expired',
          message: 'Your session has expired for security reasons. Please log in again to continue using the application.'
        };
      case 'idle_timeout':
        return {
          title: 'Idle Timeout',
          message: 'You have been logged out due to inactivity. Please log in again to continue using the application.'
        };
      case 'manual_logout':
        return {
          title: 'Logged Out',
          message: 'You have been successfully logged out. Thank you for using Vocalyx!'
        };
      default:
        return {
          title: 'Authentication Required',
          message: 'Please log in to access the application.'
        };
    }
  };
  
  const { title, message } = getMessage();
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-600 mt-2">
            {message}
          </p>
        </div>
        
        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#333D79] hover:bg-[#2B3377] text-white rounded-lg transition-colors shadow-md"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutReasonModal;