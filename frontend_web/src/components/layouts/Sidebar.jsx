import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { FiCalendar, FiLogOut } from 'react-icons/fi';
import { HiOutlineUserGroup } from 'react-icons/hi';
import {
  MdChevronLeft,
  MdChevronRight,
  MdOutlineDashboard,
  MdOutlineSettings
} from 'react-icons/md';
import {
  RiBookOpenLine,
  RiSoundModuleLine
} from 'react-icons/ri';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import LogoutModal from '../modals/LogoutModal';

const sidebarStyles = `
  @keyframes pulse-light {
    0% { opacity: 0.8; }
    50% { opacity: 1; }
    100% { opacity: 0.8; }
  }
  
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-3px); }
    100% { transform: translateY(0px); }
  }
  
  .sidebar-gradient {
    background: linear-gradient(135deg, #2C365E 0%, #333D79 50%, #3A4693 100%);
  }
  
  .active-item-gradient {
    background: linear-gradient(90deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%);
  }
  
  .icon-float:hover {
    animation: float 2s ease-in-out infinite;
  }
  
  .logo-pulse {
    animation: pulse-light 3s infinite;
  }
  
  .menu-item-hover:hover {
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.12);
  }
`;

const Sidebar = ({ onCollapse }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

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
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: <MdOutlineDashboard size={22} />, path: '/dashboard' },
    { 
      name: 'Courses', 
      icon: <RiBookOpenLine size={22} />, 
      path: '/dashboard/courses' 
    },
    { 
      name: 'Schedule', 
      icon: <FiCalendar size={22} />, 
      path: '/dashboard/schedule' 
    },
    { 
      name: 'Recordings', 
      icon: <RiSoundModuleLine size={22} />, 
      path: '/dashboard/recordings' 
    },
    { name: 'Team', icon: <HiOutlineUserGroup size={22} />, path: '/dashboard/team' },
    { name: 'Settings', icon: <MdOutlineSettings size={22} />, path: '/dashboard/settings' },
  ];

  return (
    <>
      {/* Add custom styles */}
      <style>{sidebarStyles}</style>
      
      <div 
        className={`sidebar-gradient text-white h-screen transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } fixed left-0 top-0 z-50 shadow-xl backdrop-blur-sm overflow-hidden`}
      >
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-300 rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute top-3/4 -left-20 w-60 h-60 bg-indigo-200 rounded-full opacity-10 blur-3xl"></div>
        </div>
        
        <div className="flex justify-between items-center p-5 relative z-10">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-lg bg-white bg-opacity-15 flex items-center justify-center backdrop-blur-sm shadow-inner logo-pulse">
                <img 
                  src="/assets/VocalyxLogo.png" 
                  alt="Vocalyx Logo" 
                  className="h-7 w-auto object-contain" 
                />
              </div>
              <h2 className="text-xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">Vocalyx</h2>
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 rounded-lg bg-white bg-opacity-15 flex items-center justify-center backdrop-blur-sm shadow-inner mx-auto logo-pulse">
              <img 
                src="/assets/VocalyxLogo.png" 
                alt="Vocalyx Logo" 
                className="h-7 w-auto object-contain" 
              />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition-all duration-200 backdrop-blur-sm"
          >
            {collapsed ? <MdChevronRight size={20} /> : <MdChevronLeft size={20} />}
          </button>
        </div>

        <div className="py-6 px-2 relative z-10">
          <ul className="space-y-2.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                             (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={`flex items-center py-3.5 px-4 relative rounded-xl menu-item-hover ${
                    isActive
                      ? 'active-item-gradient text-white font-medium shadow-md before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-3/4 before:w-1.5 before:bg-white before:rounded-full before:shadow-md'
                      : 'text-gray-100 hover:bg-white hover:bg-opacity-10'
                  } ${collapsed ? 'justify-center' : 'space-x-3'} transition-all duration-200 group`}
                >
                  <span className={`${isActive ? 'text-white' : 'text-blue-100'} transition-colors group-hover:scale-110 duration-200 icon-float`}>{item.icon}</span>
                  {!collapsed && <span className="tracking-wide">{item.name}</span>}
                  {collapsed && (
                    <div className={`absolute left-14 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white px-3 py-1.5 rounded-md text-sm whitespace-nowrap opacity-0 -translate-x-3 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-50 ${isActive ? 'font-medium' : ''} shadow-lg`}>
                      {item.name}
                    </div>
                  )}
                </Link>
              </li>
              );
            })}
          </ul>
        </div>

        <div className="absolute bottom-0 w-full px-2 z-10 border-t border-white/10">
          <button
            onClick={handleLogoutClick}
            className={`flex items-center py-4 px-4 text-gray-100 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/10 w-full ${
              collapsed ? 'justify-center' : 'space-x-3'
            } transition-all duration-200 group relative backdrop-blur-sm`}
          >
            <span className="text-red-200 group-hover:scale-110 transition-transform duration-200 icon-float">
              <FiLogOut size={22} />
            </span>
            {!collapsed && <span>Logout</span>}
            {collapsed && (
              <div className="absolute left-14 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white px-3 py-1.5 rounded-md text-sm whitespace-nowrap opacity-0 -translate-x-3 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-50 shadow-lg">
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