import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiUsers, FiSettings, FiLogOut } from 'react-icons/fi';
import { MdKeyboardVoice, MdOutlineClass } from 'react-icons/md';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import PropTypes from 'prop-types';
import LogoutModal from '../modals/LogoutModal';

const Sidebar = ({ onCollapse }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const location = useLocation();

  // Notify parent component when collapsed state changes
  useEffect(() => {
    if (onCollapse) {
      onCollapse(collapsed);
    }
  }, [collapsed, onCollapse]);

  const handleLogoutClick = (e) => {
    e.preventDefault();
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    // Redirecting to landing page when confirmed
    window.location.href = '/';
  };

  const navItems = [
    { name: 'Dashboard', icon: <FiHome size={20} />, path: '/dashboard' },
    { name: 'Classes', icon: <MdOutlineClass size={20} />, path: '/dashboard/classes' },
    { name: 'Recordings', icon: <MdKeyboardVoice size={20} />, path: '/dashboard/recordings' },
    { name: 'Team', icon: <FiUsers size={20} />, path: '/dashboard/team' },
    { name: 'Settings', icon: <FiSettings size={20} />, path: '/dashboard/settings' },
  ];

  return (
    <>
      <div 
        className={`bg-[#333D79] text-white h-screen transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } fixed left-0 top-0 z-50 shadow-lg`}
      >
        <div className="flex justify-between items-center p-4 border-b border-[#4A5491]">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <MdKeyboardVoice size={24} className="text-white" />
              <h2 className="text-xl font-bold">Vocalyx</h2>
            </div>
          )}
          {collapsed && <MdKeyboardVoice size={24} className="text-white mx-auto" />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-full hover:bg-[#4A5491] transition-all duration-200"
          >
            {collapsed ? <BsChevronRight size={18} /> : <BsChevronLeft size={18} />}
          </button>
        </div>

        <div className="py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={`flex items-center py-3 px-4 relative ${
                    location.pathname === item.path
                      ? 'bg-gradient-to-r from-[#404A8C] to-[#4A5491] text-white font-medium shadow-sm before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-white'
                      : 'text-gray-100 hover:bg-[#404A8C]'
                  } ${collapsed ? 'justify-center' : 'space-x-3'} transition-colors duration-200`}
                >
                  <span>{item.icon}</span>
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="absolute bottom-0 w-full border-t border-[#4A5491] py-4">
          <button
            onClick={handleLogoutClick}
            className={`flex items-center py-3 px-4 text-gray-100 hover:bg-[#404A8C] w-full ${
              collapsed ? 'justify-center' : 'space-x-3'
            } transition-colors duration-200`}
          >
            <FiLogOut size={20} />
            {!collapsed && <span>Logout</span>}
          </button>
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

Sidebar.propTypes = {
  onCollapse: PropTypes.func
};

export default Sidebar; 