import { useEffect, useMemo, useState } from 'react';
import { FiPlus, FiTrendingUp } from 'react-icons/fi';
import { RiSoundModuleLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { classRecordService } from '../services/api.js';
import { commonHeaderAnimations } from '../utils/animation.js';
import { showToast } from '../utils/toast.jsx';
import DashboardLayout from './layouts/DashboardLayout';

const DashboardStyles = () => {
  const styles = useMemo(() => `
    ${commonHeaderAnimations}
    
    @keyframes pulse-subtle {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
    
    .pulse-on-hover {
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .pulse-on-hover:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px -5px rgba(51, 61, 121, 0.1);
    }
    
    .stat-card {
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
      will-change: transform, box-shadow;
    }
    
    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px -5px rgba(51, 61, 121, 0.1);
    }
    
    .stat-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, rgba(51, 61, 121, 0.05) 0%, rgba(74, 84, 145, 0.05) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .stat-card:hover::before {
      opacity: 1;
    }
    
    .book-icon-container {
      position: relative;
      overflow: hidden;
    }
    
    .book-icon-container::before {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(51, 61, 121, 0.1) 0%, transparent 70%);
      z-index: -1;
    }
    
    .book-icon-glow {
      filter: drop-shadow(0 0 8px rgba(51, 61, 121, 0.3));
    }
  `, []);
  
  return <style>{styles}</style>;
};

// Skeleton Loader Component
const Skeleton = ({ className }) => (
  <div className={`bg-gray-200 rounded-md ${className}`}></div>
);

const ButtonSkeleton = ({ className }) => (
  <div className={`rounded-lg bg-gradient-to-r from-[#333D79] to-[#4A5491] ${className}`}></div>
);

const StatsCardSkeleton = () => (
  <div className="stat-card bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
    <div className="flex justify-between items-start mb-4">
      <div>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-7 w-16" />
      </div>
      <Skeleton className="p-3 w-10 h-10 rounded-lg" />
    </div>
    <div className="flex items-center">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-16 ml-2" />
    </div>
  </div>
);

const QuickActionSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
    <Skeleton className="h-6 w-32 mb-4" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2].map((i) => (
        <div key={i} className="p-4 border border-gray-200 rounded-lg flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg mr-3" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const RecentActivitySkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <Skeleton className="h-6 w-32 mb-4" />
    <div className="text-center py-8">
      <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
      <Skeleton className="h-4 w-40 mx-auto mb-2" />
      <Skeleton className="h-3 w-32 mx-auto" />
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState({
    totalClassRecords: 0,
    classRecordsTrend: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return;
    }

    const loadAllData = async () => {
      await fetchStats();
      setLoading(false);
    };

    loadAllData();

    const hasShownNotification = localStorage.getItem('hasShownNotification');
    if (!hasShownNotification) {
      const timer = setTimeout(() => {
        showToast.notification(
          'Click the bell icon in the top right to see your notifications!',
          'New Notification Feature',
          { duration: 5000, position: 'bottom-right' }
        );
        localStorage.setItem('hasShownNotification', 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [navigate]);

  const fetchStats = async () => {
    try {
      let classRecordsCount = 0;
      
      try {
        const classRecordsResponse = await classRecordService.getClassRecords();
        classRecordsCount = classRecordsResponse?.data?.length || 0;
      } catch (error) {
        console.error('Error fetching class records:', error);
      }
      
      setStatsData({
        totalClassRecords: classRecordsCount,
        classRecordsTrend: 0 // Can be calculated based on historical data
      });
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      showToast.error('Failed to load dashboard statistics');
    }
  };

  const stats = [
    {
      name: 'Class Records',
      value: statsData.totalClassRecords.toString(),
      icon: <RiSoundModuleLine size={24} className="text-white" />,
      change: `+${statsData.classRecordsTrend}%`,
      trend: 'up',
      color: 'from-[#333D79] to-[#4A5491]',
      delay: '0s'
    }
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardStyles />
        <div className="min-h-screen bg-gray-50">
          {/* Header Section (no skeleton for texts or buttons) */}
          <div className="bg-blue border-b border-gray-100 relative overflow-hidden">
            <div className="bg-blur-circle bg-blur-circle-top"></div>
            <div className="bg-blur-circle bg-blur-circle-bottom"></div>
            <div className="bg-floating-circle hidden md:block"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
              <div className="fade-in-up" style={{animationDelay: '0s'}}>
                <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#333D79] to-[#4A5491]">
                  Welcome back, {user?.first_name}!
                </h1>
                <p className="text-gray-600 max-w-lg">
                  Your audio and recordings dashboard for tracking educational progress and managing your class records.
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <Link 
                    to="/dashboard/class-records"
                    className="px-5 py-2.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 group"
                  >
                    <FiPlus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span>Create Class Record</span>
                  </Link>
                  <Link to="/dashboard/class-records"
                    className="px-5 py-2.5 border border-[#333D79]/20 text-[#333D79] rounded-lg hover:bg-[#333D79]/5 transition-colors flex items-center gap-2"
                  >
                    <RiSoundModuleLine size={18} />
                    <span>View Records</span>
                  </Link>
                </div>
              </div>
              {/* Decorative circle stays visible, no skeleton here */}
              <div className="hidden md:block">
                <div className="h-48 w-48 flex items-center justify-center relative book-icon-container">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#333D79]/10 to-[#4A5491]/10 rounded-full"></div>
                  {/* Decorative elements */}
                  <div className="absolute h-40 w-40 rounded-full border-4 border-[#333D79]/5 animate-pulse"></div>
                  <div className="absolute h-48 w-48 rounded-full border border-dashed border-[#333D79]/10 animate-spin" style={{ animationDuration: '15s' }}></div>
                  {/* Main icon container */}
                  <div className="h-36 w-36 rounded-full bg-gradient-to-br from-[#EEF0F8] via-white to-[#DCE3F9] flex items-center justify-center shadow-lg z-10 book-icon-glow float-animation">
                    <div className="relative">
                      <div className="absolute -inset-3 bg-[#333D79]/5 rounded-full blur-md"></div>
                      <RiSoundModuleLine size={60} className="text-[#333D79] relative z-10" />
                    </div>
                  </div>
                  <div className="absolute top-0 right-4 h-3 w-3 rounded-full bg-[#333D79]/20 float-animation" style={{ animationDelay: '0.5s', animationDuration: '4s' }}></div>
                  <div className="absolute bottom-4 left-0 h-2 w-2 rounded-full bg-[#6B77B7]/30 float-animation" style={{ animationDelay: '1s', animationDuration: '3s' }}></div>
                  <div className="absolute top-1/2 right-0 h-4 w-4 rounded-full bg-[#4A5491]/15 float-animation" style={{ animationDelay: '1.5s', animationDuration: '5s' }}></div>
                </div>
              </div>
            </div>
          </div>
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
          {/* Quick Actions Skeleton */}
          <QuickActionSkeleton />
          {/* Recent Activity Skeleton */}
          <RecentActivitySkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardStyles />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-blue border-b border-gray-100 relative overflow-hidden">
          <div className="bg-blur-circle bg-blur-circle-top"></div>
          <div className="bg-blur-circle bg-blur-circle-bottom"></div>
          <div className="bg-floating-circle hidden md:block"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
            <div className="fade-in-up" style={{animationDelay: '0s'}}>
              <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#333D79] to-[#4A5491]">
                Welcome back, {user?.first_name}!
              </h1>
              <p className="text-gray-600 max-w-lg">
                Your audio and recordings dashboard for tracking educational progress and managing your class records.
              </p>
              
              <div className="mt-6 flex items-center gap-4">
                <Link 
                  to="/dashboard/class-records"
                  className="px-5 py-2.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 group"
                >
                  <FiPlus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                  <span>Create Class Record</span>
                </Link>
                
                <Link to="/dashboard/class-records"
                  className="px-5 py-2.5 border border-[#333D79]/20 text-[#333D79] rounded-lg hover:bg-[#333D79]/5 transition-colors flex items-center gap-2"
                >
                  <RiSoundModuleLine size={18} />
                  <span>View Records</span>
                </Link>
              </div>
            </div>
            
            <div className="hidden md:block">
              <div className="h-48 w-48 flex items-center justify-center relative book-icon-container">
                <div className="absolute inset-0 bg-gradient-to-r from-[#333D79]/10 to-[#4A5491]/10 rounded-full"></div>
                
                {/* Decorative elements */}
                <div className="absolute h-40 w-40 rounded-full border-4 border-[#333D79]/5 animate-pulse"></div>
                <div className="absolute h-48 w-48 rounded-full border border-dashed border-[#333D79]/10 animate-spin" style={{ animationDuration: '15s' }}></div>
                
                {/* Main icon container */}
                <div className="h-36 w-36 rounded-full bg-gradient-to-br from-[#EEF0F8] via-white to-[#DCE3F9] flex items-center justify-center shadow-lg z-10 book-icon-glow float-animation">
                  {/* Sound icon with better styling */}
                  <div className="relative">
                    <div className="absolute -inset-3 bg-[#333D79]/5 rounded-full blur-md"></div>
                    <RiSoundModuleLine size={60} className="text-[#333D79] relative z-10" />
                  </div>
                </div>
                
                {/* Small particle decorations */}
                <div className="absolute top-0 right-4 h-3 w-3 rounded-full bg-[#333D79]/20 float-animation" style={{ animationDelay: '0.5s', animationDuration: '4s' }}></div>
                <div className="absolute bottom-4 left-0 h-2 w-2 rounded-full bg-[#6B77B7]/30 float-animation" style={{ animationDelay: '1s', animationDuration: '3s' }}></div>
                <div className="absolute top-1/2 right-0 h-4 w-4 rounded-full bg-[#4A5491]/15 float-animation" style={{ animationDelay: '1.5s', animationDuration: '5s' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 mb-8">
            {stats.map((stat) => (
              <div 
                key={stat.name} 
                className="stat-card bg-white rounded-xl p-6 shadow-sm border border-gray-100 pulse-on-hover"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color} shadow-md`}>
                    {stat.icon}
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`flex items-center text-sm ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'} font-medium`}>
                    {stat.trend === 'up' ? <FiTrendingUp className="mr-1" /> : '↓'} {stat.change}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">from last month</span>
                </div>
              </div>
            ))}
          </div>

        {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/dashboard/class-records"
              className="p-4 border border-gray-200 rounded-lg hover:border-[#333D79]/30 hover:bg-[#F8F9FF] transition-colors group"
            >
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-3 group-hover:bg-[#333D79] group-hover:text-white transition-colors">
                  <FiPlus size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Create Class Record</h3>
                  <p className="text-sm text-gray-500">Start a new class recording session</p>
                </div>
              </div>
            </Link>
                  
                  <Link
              to="/dashboard/class-records"
              className="p-4 border border-gray-200 rounded-lg hover:border-[#333D79]/30 hover:bg-[#F8F9FF] transition-colors group"
                  >
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-3 group-hover:bg-[#333D79] group-hover:text-white transition-colors">
                  <RiSoundModuleLine size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">View Records</h3>
                  <p className="text-sm text-gray-500">Browse your class recordings</p>
            </div>
              </div>
                </Link>
              </div>
            </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
          <div className="text-center py-8">
            <div className="h-16 w-16 rounded-full bg-[#EEF0F8] flex items-center justify-center mb-4 mx-auto">
              <RiSoundModuleLine className="h-8 w-8 text-[#333D79]" />
            </div>
            <p className="text-gray-500 mb-4">No recent activity</p>
            <p className="text-sm text-gray-400">Your recent class recordings and activities will appear here.</p>
              </div>
          </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;