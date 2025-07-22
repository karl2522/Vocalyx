import { FiArrowLeft, FiSettings, FiTool } from 'react-icons/fi';
import { MdConstruction } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

// Custom animation styles
const settingsStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-10px);
    }
    60% {
      transform: translateY(-5px);
    }
  }
  
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .fade-in-up {
    animation: fadeInUp 0.5s ease-out forwards;
  }
  
  .bounce-animation {
    animation: bounce 2s infinite;
  }
  
  .rotate-animation {
    animation: rotate 8s linear infinite;
  }
  
  .settings-header-gradient {
    background: linear-gradient(135deg, #333D79 0%, #4A5491 100%);
  }
`;

const Settings = () => {
  const navigate = useNavigate();

  const handleBackToRecords = () => {
    navigate('/class-records');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Add custom styles */}
      <style>{settingsStyles}</style>
      
      <div className="pb-6">
        {/* Back to Records Button */}
        <div className="mb-6">
          <button
            onClick={handleBackToRecords}
            className="flex items-center gap-2 px-4 py-2 text-[#333D79] hover:bg-[#EEF0F8] rounded-lg transition-colors group"
          >
            <FiArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Records</span>
          </button>
        </div>

        {/* Settings Header */}
        <div className="settings-header-gradient rounded-xl text-white overflow-hidden mb-8 fade-in-up">
          <div className="relative p-8">
            {/* Background Elements */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center">
                <FiSettings size={32} className="rotate-animation" />
              </div>
              
              <div>
                <h1 className="text-3xl font-bold mb-2">Settings</h1>
                <p className="text-white/80">Configure your Vocalyx Class Record System</p>
              </div>
            </div>
          </div>
        </div>

        {/* Under Construction Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden fade-in-up" style={{animationDelay: '0.2s'}}>
            <div className="text-center py-16 px-8">
              {/* Construction Icon */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-[#EEF0F8] flex items-center justify-center bounce-animation">
                    <MdConstruction size={48} className="text-[#333D79]" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-yellow-400 flex items-center justify-center">
                    <FiTool size={16} className="text-yellow-800" />
                  </div>
                </div>
              </div>

              {/* Title and Description */}
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                🚧 Under Construction 🚧
              </h2>
              
              <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
                We're working hard to bring you amazing settings and configuration options. 
                This section will be available soon with exciting features!
              </p>

              {/* Coming Soon Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
                <div className="p-6 bg-[#EEF0F8] rounded-lg border border-[#DCE3F9]">
                  <div className="h-12 w-12 rounded-full bg-[#333D79] flex items-center justify-center mx-auto mb-4">
                    <FiSettings size={24} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">System Preferences</h3>
                  <p className="text-sm text-gray-600">Customize your dashboard, notifications, and user experience</p>
                </div>

                <div className="p-6 bg-[#EEF0F8] rounded-lg border border-[#DCE3F9]">
                  <div className="h-12 w-12 rounded-full bg-[#333D79] flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-lg">🎨</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Theme Customization</h3>
                  <p className="text-sm text-gray-600">Choose from multiple themes and color schemes</p>
                </div>

                <div className="p-6 bg-[#EEF0F8] rounded-lg border border-[#DCE3F9]">
                  <div className="h-12 w-12 rounded-full bg-[#333D79] flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-lg">🔒</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Privacy & Security</h3>
                  <p className="text-sm text-gray-600">Manage your account security and privacy settings</p>
                </div>

                <div className="p-6 bg-[#EEF0F8] rounded-lg border border-[#DCE3F9]">
                  <div className="h-12 w-12 rounded-full bg-[#333D79] flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-lg">📊</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Export Settings</h3>
                  <p className="text-sm text-gray-600">Configure default export formats and preferences</p>
                </div>

                <div className="p-6 bg-[#EEF0F8] rounded-lg border border-[#DCE3F9]">
                  <div className="h-12 w-12 rounded-full bg-[#333D79] flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-lg">🔔</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Notifications</h3>
                  <p className="text-sm text-gray-600">Control how and when you receive notifications</p>
                </div>

                <div className="p-6 bg-[#EEF0F8] rounded-lg border border-[#DCE3F9]">
                  <div className="h-12 w-12 rounded-full bg-[#333D79] flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-lg">🌐</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Integrations</h3>
                  <p className="text-sm text-gray-600">Connect with Google Sheets, Microsoft Excel, and more</p>
                </div>
              </div>

              {/* Footer Message */}
              <div className="mt-12 p-6 bg-gradient-to-r from-[#333D79] to-[#4A5491] rounded-lg text-white">
                <p className="text-lg font-medium mb-2">Stay Tuned! 🚀</p>
                <p className="text-white/90">
                  We're constantly improving Vocalyx to provide you with the best class record management experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;