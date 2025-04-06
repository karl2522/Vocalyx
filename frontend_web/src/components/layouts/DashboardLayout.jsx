import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import TopNavbar from './TopNavbar.jsx';
import PropTypes from 'prop-types';

const DashboardLayout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar onCollapse={(collapsed) => setSidebarCollapsed(collapsed)} />
      
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <TopNavbar sidebarCollapsed={sidebarCollapsed} />
        
        <main className="p-6 mt-16">
          {children}
        </main>
      </div>
    </div>
  );
};

DashboardLayout.propTypes = {
  children: PropTypes.node.isRequired
};

export default DashboardLayout; 