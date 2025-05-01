import { useState, useRef, useEffect } from 'react';
import { FiBell, FiSearch, FiUser, FiChevronDown, FiSettings, FiLogOut } from 'react-icons/fi';
import { HiOutlineUserCircle } from 'react-icons/hi';
import PropTypes from 'prop-types';
import LogoutModal from '../modals/LogoutModal';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

const TopNavbar = ({ sidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogoutClick = (e) => {
    e.preventDefault();
    setShowProfileMenu(false);
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <div className={`bg-white shadow-md h-16 fixed top-0 right-0 left-0 z-40 transition-all duration-300 ${
        sidebarCollapsed ? 'ml-20' : 'ml-64'
      }`}>
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex-1">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
              />
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#333D79] transition-colors duration-200 relative">
                <FiBell size={20} />
                <span className="absolute top-0 right-0 bg-[#333D79] text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                  3
                </span>
              </button>
            </div>

            <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 focus:outline-none group"
            >
              <div className="w-10 h-10 rounded-full bg-[#333D79] flex items-center justify-center text-white shadow-md overflow-hidden group-hover:ring-2 group-hover:ring-[#4A5491] transition-all">
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt={user.first_name} className="w-full h-full object-cover" />
                ) : (
                  <FiUser size={20} />
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium group-hover:text-[#333D79] transition-colors">
                  {user ? `${user?.first_name}` : 'Guest'}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <FiChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${showProfileMenu ? 'transform rotate-180' : ''}`} />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-2 z-50 border border-gray-100 transform transition-all duration-200">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">
                    {user ? `${user?.first_name}` : 'Guest'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
                </div>
                  
                  <div className="py-1">
                    <a href="#profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-[#EEF0F8] hover:text-[#333D79] transition-colors">
                      <HiOutlineUserCircle className="mr-3 text-gray-500" size={18} />
                      Your Profile
                    </a>
                    <a href="#settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-[#EEF0F8] hover:text-[#333D79] transition-colors">
                      <FiSettings className="mr-3 text-gray-500" size={18} />
                      Settings
                    </a>
                  </div>
                  
                  <div className="py-1 border-t border-gray-100">
                    <button 
                      onClick={handleLogoutClick}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#EEF0F8] hover:text-[#333D79] transition-colors"
                    >
                      <FiLogOut className="mr-3 text-gray-500" size={18} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal 
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
};

TopNavbar.propTypes = {
  sidebarCollapsed: PropTypes.bool
};

TopNavbar.defaultProps = {
  sidebarCollapsed: false
};

export default TopNavbar; 