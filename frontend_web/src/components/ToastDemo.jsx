import { useState } from 'react';
import { showToast } from '../utils/toast.jsx';
import DashboardLayout from './layouts/DashboardLayout';

const ToastDemo = () => {
  const [position, setPosition] = useState('top-right');
  const [duration, setDuration] = useState(4000);

  const showSuccessToast = () => {
    showToast.success(
      'Operation completed successfully!',
      'Success',
      { position, duration }
    );
  };

  const showErrorToast = () => {
    showToast.error(
      'An error occurred while processing your request.',
      'Error',
      { position, duration }
    );
  };

  const showInfoToast = () => {
    showToast.info(
      'This is an informational message for your awareness.',
      'Information',
      { position, duration }
    );
  };

  const showNotificationToast = () => {
    showToast.notification(
      'You have a new notification that requires your attention.',
      'New Notification',
      { position, duration }
    );
  };

  const showCustomToast = () => {
    showToast.custom(
      'This is a custom message with custom options.',
      'Custom Toast',
      { 
        position, 
        duration,
        type: Math.random() > 0.5 ? 'success' : 'error'
      }
    );
  };
  
  const showAllToasts = () => {
    // Show all toast types with a delay between each
    showSuccessToast();
    
    setTimeout(() => {
      showErrorToast();
    }, 300);
    
    setTimeout(() => {
      showInfoToast();
    }, 600);
    
    setTimeout(() => {
      showNotificationToast();
    }, 900);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Toast Notification Demo</h1>
          <p className="text-gray-600">
            Click the buttons below to see different types of toast notifications.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Toast Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
              >
                <option value="top-left">Top Left</option>
                <option value="top-center">Top Center</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (ms)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min="1000"
                step="500"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Toast Types</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <button
              onClick={showSuccessToast}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-md hover:opacity-90 transition-opacity"
            >
              Success Toast
            </button>
            
            <button
              onClick={showErrorToast}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-md hover:opacity-90 transition-opacity"
            >
              Error Toast
            </button>
            
            <button
              onClick={showInfoToast}
              className="px-4 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md hover:opacity-90 transition-opacity"
            >
              Info Toast
            </button>
            
            <button
              onClick={showNotificationToast}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-md hover:bg-gray-50 transition-colors"
            >
              Notification Toast
            </button>
            
            <button
              onClick={showCustomToast}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-md hover:opacity-90 transition-opacity"
            >
              Random Toast
            </button>
            
            <button
              onClick={showAllToasts}
              className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-md hover:opacity-90 transition-opacity"
            >
              Show All Toasts
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ToastDemo; 