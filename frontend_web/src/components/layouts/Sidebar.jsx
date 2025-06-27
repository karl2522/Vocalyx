import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { FiLogOut } from 'react-icons/fi';
import {
    MdKeyboardArrowDown,
    MdKeyboardArrowLeft,
    MdKeyboardArrowRight,
    MdKeyboardArrowUp,
    MdOutlineDashboard,
    MdOutlineSettings
} from 'react-icons/md';
import {
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

  @keyframes glow {
    0% { box-shadow: 0 0 5px rgba(255,255,255,0.2); }
    50% { box-shadow: 0 0 20px rgba(255,255,255,0.4), 0 0 30px rgba(59,130,246,0.3); }
    100% { box-shadow: 0 0 5px rgba(255,255,255,0.2); }
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
  
  .logo-container {
    animation: glow 3s infinite;
    background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%);
    border: 1px solid rgba(255,255,255,0.2);
  }
  
  .logo-pulse {
    animation: pulse-light 3s infinite;
  }
  
  .menu-item-hover:hover {
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.12);
  }

  .collapse-btn {
    background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%);
    border: 2px solid rgba(255,255,255,0.2);
    backdrop-filter: blur(15px);
    box-shadow: 
      0 4px 15px rgba(0,0,0,0.1),
      inset 0 1px 0 rgba(255,255,255,0.3),
      0 0 0 1px rgba(255,255,255,0.1);
    position: relative;
    overflow: hidden;
  }

  .collapse-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    transition: left 0.5s;
  }

  .collapse-btn:hover::before {
    left: 100%;
  }

  .collapse-btn:hover {
    background: linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%);
    border-color: rgba(255,255,255,0.4);
    transform: scale(1.1) rotate(5deg);
    box-shadow: 
      0 8px 25px rgba(0,0,0,0.15),
      inset 0 1px 0 rgba(255,255,255,0.4),
      0 0 0 2px rgba(255,255,255,0.2),
      0 0 20px rgba(59,130,246,0.3);
  }

  .collapse-btn:active {
    transform: scale(0.95);
    transition: transform 0.1s;
  }

  .collapse-btn-icon {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
  }

  .collapse-btn:hover .collapse-btn-icon {
    transform: scale(1.2);
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
  }
`;

const Sidebar = ({ onCollapse }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [openSubmenu, setOpenSubmenu] = useState(null);

  // Notify parent component when collapsed state changes
  useEffect(() => {
    if (onCollapse) {
      onCollapse(collapsed);
    }
  }, [collapsed, onCollapse]);

  useEffect(() => {
    navItems.forEach(item => {
      if (item.hasSubmenu && item.submenu?.some(subItem =>
          location.pathname === subItem.path || location.pathname.startsWith(subItem.path)
      )) {
        setOpenSubmenu(item.name);
      }
    });
  }, [location.pathname]);

  const handleLogoutClick = (e) => {
    e.preventDefault();
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    navigate('/login');
  };

  const toggleSubmenu = (name) => {
    if (openSubmenu === name) {
      setOpenSubmenu(null);
    } else {
      setOpenSubmenu(name);
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: <MdOutlineDashboard size={22} />, path: '/dashboard' },
    { name: 'Class Records', icon: <RiSoundModuleLine size={22} />, path: '/dashboard/class-records' },
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

          {/* Logo Section */}
          <div className="flex items-center p-6 relative z-10 border-b border-white/10">
            {!collapsed ? (
                <div className="flex items-center space-x-3 w-full justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 rounded-2xl logo-container flex items-center justify-center shadow-lg logo-pulse">
                      <img
                          src="/assets/logo.png"
                          alt="Vocalyx Logo"
                          className="h-10 w-auto object-contain filter drop-shadow-lg"
                      />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-indigo-200">
                        Vocalyx
                      </h2>
                    </div>
                  </div>
                  {/* Collapse Button - In header when expanded */}
                  <button
                      onClick={() => setCollapsed(!collapsed)}
                      className="w-8 h-8 rounded-full collapse-btn transition-all duration-300 shadow-lg flex items-center justify-center group"
                  >
                    <MdKeyboardArrowLeft size={18} className="text-white group-hover:scale-110 transition-transform" />
                  </button>
                </div>
            ) : (
                <div className="flex flex-col items-center space-y-3 w-full">
                  <div className="w-12 h-12 rounded-xl logo-container flex items-center justify-center shadow-lg logo-pulse">
                    <img
                        src="/assets/logo.png"
                        alt="Vocalyx Logo"
                        className="h-8 w-auto object-contain filter drop-shadow-lg"
                    />
                  </div>
                  {/* Collapse Button - Below logo when collapsed */}
                  <button
                      onClick={() => setCollapsed(!collapsed)}
                      className="w-8 h-8 rounded-full collapse-btn transition-all duration-300 shadow-lg flex items-center justify-center group"
                  >
                    <MdKeyboardArrowRight size={18} className="text-white group-hover:scale-110 transition-transform" />
                  </button>
                </div>
            )}
          </div>

          <div className="py-6 px-2 relative z-10">
            <ul className="space-y-2.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path ||
                    (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

                // Check if any submenu item is active
                const isSubmenuActive = item.submenu?.some(subItem =>
                    location.pathname === subItem.path || location.pathname.startsWith(subItem.path)
                );

                return (
                    <li key={item.name}>
                      {/* Main menu item */}
                      <div className="relative">
                        {item.hasSubmenu ? (
                            <div className={`flex items-center w-full py-3.5 px-4 relative rounded-xl menu-item-hover ${
                                isActive || isSubmenuActive
                                    ? 'active-item-gradient text-white font-medium shadow-md before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-3/4 before:w-1.5 before:bg-white before:rounded-full before:shadow-md'
                                    : 'text-gray-100 hover:bg-white hover:bg-opacity-10'
                            } ${collapsed ? 'justify-center' : 'justify-between'} transition-all duration-200 group`}
                            >
                              {/* Left side with icon/text that links to the main path */}
                              <Link
                                  to={item.path}
                                  className={`flex items-center ${collapsed ? '' : 'space-x-3'}`}
                              >
                                <span className={`${isActive || isSubmenuActive ? 'text-white' : 'text-blue-100'} transition-colors group-hover:scale-110 duration-200 icon-float`}>{item.icon}</span>
                                {!collapsed && <span className="tracking-wide">{item.name}</span>}
                              </Link>

                              {/* Right side with arrow that toggles submenu */}
                              {!collapsed && (
                                  <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        toggleSubmenu(item.name);
                                      }}
                                      className="flex items-center justify-center text-gray-300 p-1"
                                  >
                                    {openSubmenu === item.name ?
                                        <MdKeyboardArrowUp size={18} className="text-white" /> :
                                        <MdKeyboardArrowDown size={18} />
                                    }
                                  </button>
                              )}

                              {collapsed && (
                                  <div className={`absolute left-14 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white px-3 py-1.5 rounded-md text-sm whitespace-nowrap opacity-0 -translate-x-3 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-50 ${isActive ? 'font-medium' : ''} shadow-lg`}>
                                    {item.name}
                                  </div>
                              )}
                            </div>
                        ) : (
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
                        )}
                      </div>

                      {/* Submenu */}
                      {!collapsed && item.hasSubmenu && openSubmenu === item.name && (
                          <ul className="mt-1 pl-10 space-y-1.5 overflow-hidden transition-all duration-300">
                            {item.submenu.map((subItem) => {
                              const isSubItemActive = location.pathname.startsWith(subItem.path);
                              return (
                                  <li key={subItem.name}>
                                    <Link
                                        to={subItem.path}
                                        className={`flex items-center py-2.5 px-3 rounded-lg text-sm ${
                                            isSubItemActive
                                                ? 'bg-white bg-opacity-15 text-white font-medium'
                                                : 'text-gray-200 hover:bg-white hover:bg-opacity-5'
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                    >
                                      <span className="h-1.5 w-1.5 bg-blue-300 rounded-full mr-2.5 opacity-70"></span>
                                      {subItem.name}
                                    </Link>
                                  </li>
                              );
                            })}
                          </ul>
                      )}

                      {collapsed && item.hasSubmenu && (
                          <div className="relative group">
                            <button
                                onClick={() => toggleSubmenu(item.name)}
                                className={`flex justify-center py-3.5 px-4 w-full relative rounded-xl ${
                                    isSubmenuActive
                                        ? 'active-item-gradient text-white font-medium shadow-md'
                                        : 'text-gray-100 hover:bg-white hover:bg-opacity-10'
                                } transition-all duration-200`}
                            >
                              <span className={`${isSubmenuActive ? 'text-white' : 'text-blue-100'}`}>{item.icon}</span>
                            </button>
                            <div className="absolute left-14 top-0 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md text-sm whitespace-nowrap opacity-0 -translate-x-3 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-50 shadow-lg px-1 py-2 min-w-[150px]">
                              <p className="px-3 py-1 font-medium border-b border-white/10">{item.name}</p>
                              {item.submenu.map((subItem) => {
                                const isSubItemActive = location.pathname.startsWith(subItem.path);
                                return (
                                    <Link
                                        key={subItem.name}
                                        to={subItem.path}
                                        className={`block px-3 py-2 hover:bg-white hover:bg-opacity-10 rounded-md ${isSubItemActive ? 'bg-white bg-opacity-15' : ''}`}
                                        // Don't close the hover menu in collapsed state when clicking submenu items
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                      {subItem.name}
                                    </Link>
                                );
                              })}
                            </div>
                          </div>
                      )}
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