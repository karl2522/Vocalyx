import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { FiLogOut } from 'react-icons/fi';
import { HiOutlineUserGroup } from 'react-icons/hi';
import {
  MdChevronLeft,
  MdChevronRight,
  MdKeyboardVoice,
  MdOutlineClass,
  MdOutlineDashboard,
  MdOutlineSettings
} from 'react-icons/md';
import { Link, useLocation } from 'react-router-dom';
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
    { name: 'Dashboard', icon: <MdOutlineDashboard size={22} />, path: '/dashboard' },
    { name: 'Classes', icon: <MdOutlineClass size={22} />, path: '/dashboard/classes' },
    { name: 'Recordings', icon: <MdKeyboardVoice size={22} />, path: '/dashboard/recordings' },
    { name: 'Team', icon: <HiOutlineUserGroup size={22} />, path: '/dashboard/team' },
    { name: 'Settings', icon: <MdOutlineSettings size={22} />, path: '/dashboard/settings' },
  ];

  return (
    <>
      <div 
        className={`bg-gradient-to-b from-[#2C365E] to-[#333D79] text-white h-screen transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } fixed left-0 top-0 z-50 shadow-xl backdrop-blur-sm`}
      >
        <div className="flex justify-between items-center p-5">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-md bg-white bg-opacity-10 flex items-center justify-center backdrop-blur-sm">
                <MdKeyboardVoice size={20} className="text-white" />
              </div>
              <h2 className="text-xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">Vocalyx</h2>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-md bg-white bg-opacity-10 flex items-center justify-center backdrop-blur-sm mx-auto">
              <MdKeyboardVoice size={20} className="text-white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-full bg-white bg-opacity-5 hover:bg-opacity-15 transition-all duration-200"
          >
            {collapsed ? <MdChevronRight size={20} /> : <MdChevronLeft size={20} />}
          </button>
        </div>

        <div className="py-6 px-2">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                             (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center py-3 px-4 relative rounded-xl ${
                      isActive
                        ? 'bg-white bg-opacity-15 text-white font-medium shadow-md before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-2/3 before:w-1 before:bg-white before:rounded-full'
                        : 'text-gray-100 hover:bg-white hover:bg-opacity-10'
                    } ${collapsed ? 'justify-center' : 'space-x-3'} transition-all duration-200 group`}
                  >
                    <span className={`${isActive ? 'text-white' : 'text-blue-100'} transition-colors group-hover:scale-110 duration-200`}>{item.icon}</span>
                    {!collapsed && <span className="tracking-wide">{item.name}</span>}
                    {collapsed && (
                      <div className={`absolute left-14 bg-[#333D79] text-white px-2 py-1 rounded text-sm whitespace-nowrap opacity-0 -translate-x-3 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-50 ${isActive ? 'font-medium' : ''}`}>
                        {item.name}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="absolute bottom-5 w-full px-2">
          <button
            onClick={handleLogoutClick}
            className={`flex items-center py-3 px-4 rounded-xl text-gray-100 hover:bg-red-500 hover:bg-opacity-20 w-full ${
              collapsed ? 'justify-center' : 'space-x-3'
            } transition-all duration-200 group relative`}
          >
            <span className="text-red-200 group-hover:scale-110 transition-transform duration-200">
              <FiLogOut size={22} />
            </span>
            {!collapsed && <span>Logout</span>}
            {collapsed && (
              <div className="absolute left-14 bg-[#333D79] text-white px-2 py-1 rounded text-sm whitespace-nowrap opacity-0 -translate-x-3 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-50">
                Logout
              </div>
            )}
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