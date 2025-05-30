import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { FiBell, FiCheck, FiChevronDown, FiInfo, FiLogOut, FiMessageSquare, FiSearch, FiSettings, FiUser } from 'react-icons/fi';
import { HiOutlineUserCircle } from 'react-icons/hi';
import { MdOutlineClass } from 'react-icons/md';
import { RiBookOpenLine, RiSoundModuleLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { notificationService } from '../../services/api';
import LogoutModal from '../modals/LogoutModal';

// Custom animation styles for notifications
const notificationStyles = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .notification-dropdown {
    animation: slideDown 0.2s ease-out forwards;
  }
  
  .notification-item {
    transition: all 0.2s ease;
  }
  
  .notification-item:hover {
    background-color: #EEF0F8;
  }
  
  .notification-dot {
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(51, 61, 121, 0.4);
    }
    70% {
      box-shadow: 0 0 0 5px rgba(51, 61, 121, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(51, 61, 121, 0);
    }
  }
`;

const TopNavbar = ({ sidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [activeNotificationTab, setActiveNotificationTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  
  const fetchNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const response = await notificationService.getNotifications();
      setNotifications(response.data);
      
      // Also update the unread count
      const countResponse = await notificationService.getNotificationCount();
      setUnreadNotificationsCount(countResponse.data.unread_count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
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

  const handleNotificationsClick = (e) => {
    e.stopPropagation();
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      // Only reset loading state when opening
      setNotificationsLoading(true);
    }
  };
  
  const getFilteredNotifications = () => {
    if (activeNotificationTab === 'all') {
      return notifications;
    } else if (activeNotificationTab === 'unread') {
      return notifications.filter(notification => !notification.is_read);
    }
    return notifications;
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === id ? { ...notification, is_read: true } : notification
        )
      );
      setUnreadNotificationsCount(prev => Math.max(prev - 1, 0));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, is_read: true }))
      );
      setUnreadNotificationsCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    if (showNotifications && notificationsLoading) {
      fetchNotifications();
    }
  }, [showNotifications, notificationsLoading]);

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const response = await notificationService.getNotificationCount();
        setUnreadNotificationsCount(response.data.unread_count);
      } catch (error) {
        console.error('Error checking notification count:', error);
      }
    };

    checkNotifications();
    
    const intervalId = setInterval(checkNotifications, 60000); 
    return () => clearInterval(intervalId);
  }, []);

  const getTimeString = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const now = new Date();
    const notificationDate = new Date(timestamp);
    const diffInHours = Math.floor((now - notificationDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));
      return `${diffInMinutes > 0 ? diffInMinutes : 1} min${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hr${diffInHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
  };

  const getIconByType = (type) => {
    switch (type) {
      case 'course':
        return <RiBookOpenLine />;
      case 'recording':
        return <RiSoundModuleLine />;
      case 'class':
        return <MdOutlineClass />;
      case 'team':
        return <HiOutlineUserCircle />;
      case 'message':
        return <FiMessageSquare />;
      case 'system':
      default:
        return <FiInfo />;
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'course':
        return 'from-blue-500 to-blue-600';
      case 'recording':
        return 'from-purple-500 to-purple-600';
      case 'class':
        return 'from-green-500 to-green-600';
      case 'team':
        return 'from-teal-500 to-teal-600';
      case 'message':
        return 'from-yellow-500 to-yellow-600';
      case 'system':
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <>
      {/* Add notification styles */}
      <style>{notificationStyles}</style>
      
      <div className={`shadow-md h-16 fixed top-0 right-0 left-0 z-40 transition-all duration-300 bg-white ${
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
            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button 
                className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#333D79] transition-colors duration-200 relative group"
                onClick={handleNotificationsClick}
              >
                <FiBell size={20} className="group-hover:scale-110 transition-transform" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-0 right-0 bg-[#333D79] text-white text-xs w-4 h-4 flex items-center justify-center rounded-full transition-all group-hover:scale-110 notification-dot">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-[380px] max-h-[480px] bg-white rounded-lg shadow-xl py-2 z-50 border border-gray-100 notification-dropdown flex flex-col overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-2.5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white">
                    <div className="flex items-center">
                      <FiBell size={18} className="mr-2" />
                      <h3 className="font-semibold">Notifications</h3>
                    </div>
                    
                    {unreadNotificationsCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors px-2 py-1 rounded flex items-center gap-1"
                      >
                        <FiCheck size={12} />
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  {/* Tabs */}
                  <div className="px-2 py-1 border-b border-gray-100 flex space-x-1">
                    <button 
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        activeNotificationTab === 'all' 
                          ? 'bg-[#EEF0F8] text-[#333D79]' 
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                      onClick={() => setActiveNotificationTab('all')}
                    >
                      All
                    </button>
                    <button 
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        activeNotificationTab === 'unread' 
                          ? 'bg-[#EEF0F8] text-[#333D79]' 
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                      onClick={() => setActiveNotificationTab('unread')}
                    >
                      Unread
                      {unreadNotificationsCount > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-[#333D79] text-white">
                          {unreadNotificationsCount}
                        </span>
                      )}
                    </button>
                  </div>
                  
                  {/* Notification list */}
                  <div className="overflow-y-auto flex-grow">
                    {notificationsLoading ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="w-8 h-8 border-2 border-[#333D79] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : getFilteredNotifications().length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {getFilteredNotifications().map(notification => (
                          <div 
                            key={notification.id} 
                            className={`px-4 py-3 cursor-pointer notification-item relative ${
                              notification.is_read ? 'bg-white' : 'bg-[#EEF0F8]'
                            }`}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getIconColor(notification.type)} flex items-center justify-center text-white shadow-sm mr-3 flex-shrink-0`}>
                                {getIconByType(notification.type)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <h4 className={`text-sm font-medium ${notification.is_read ? 'text-gray-700' : 'text-[#333D79]'}`}>
                                    {notification.title}
                                  </h4>
                                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2 flex-shrink-0">
                                    {getTimeString(notification.created_at)}
                                  </span>
                                </div>
                                
                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                  {notification.message}
                                </p>
                                
                                {notification.sender_details && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    From: {notification.sender_details.first_name} {notification.sender_details.last_name}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {!notification.is_read && (
                              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#333D79] notification-dot"></span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                          <FiBell size={24} className="text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">No notifications</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Footer */}
                  <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-center">
                    <Link to="/dashboard/notifications" className="text-xs text-[#333D79] hover:underline font-medium">
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
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
                    <Link to="/dashboard/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-[#EEF0F8] hover:text-[#333D79] transition-colors">
                      <HiOutlineUserCircle className="mr-3 text-gray-500" size={18} />
                      Your Profile
                    </Link>
                    <Link to="/dashboard/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-[#EEF0F8] hover:text-[#333D79] transition-colors">
                      <FiSettings className="mr-3 text-gray-500" size={18} />
                      Settings
                    </Link>
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

// Export both as default and named export
export { TopNavbar };
export default TopNavbar;