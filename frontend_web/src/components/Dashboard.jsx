import { useEffect, useMemo, useState } from 'react';
import { 
  FiPlus, 
  FiTrendingUp, 
  FiActivity, 
  FiClock, 
  FiRefreshCw,
  FiEye,
  FiCalendar,
  FiBarChart2,
} from 'react-icons/fi';
import { RiSoundModuleLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { classRecordService, activityService } from '../services/api.js';
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
    
    @keyframes slide-in-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes activity-glow {
      0%, 100% { box-shadow: 0 0 5px rgba(51, 61, 121, 0.1); }
      50% { box-shadow: 0 0 20px rgba(51, 61, 121, 0.2); }
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
    
    .activity-item {
      animation: slide-in-up 0.3s ease-out;
    }
    
    .activity-new {
      animation: activity-glow 2s ease-in-out;
    }
    
    .activity-timeline::before {
      content: '';
      position: absolute;
      left: 1.5rem;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(to bottom, #e5e7eb, transparent);
    }
  `, []);
  
  return <style>{styles}</style>;
};

// 🔥 NEW: Activity Icon Component
const ActivityIcon = ({ type, className = '' }) => {
  const iconMap = {
    login: '🔑',
    logout: '👋',
    record_created: '📝',
    record_updated: '✏️',
    record_deleted: '🗑️',
    record_viewed: '👁️',
    voice_command: '🎤',
    batch_grading: '📊',
    student_added: '👤',
    student_updated: '👥',
    grade_updated: '📈',
    export_excel: '📑',
    export_pdf: '📄',
    sheet_switched: '📋',
    bulk_import: '📥',
    auto_number: '🔢',
    profile_updated: '⚙️',
  };

  const colorMap = {
    login: 'bg-green-100 text-green-600',
    logout: 'bg-gray-100 text-gray-600',
    record_created: 'bg-blue-100 text-blue-600',
    record_updated: 'bg-yellow-100 text-yellow-600',
    record_deleted: 'bg-red-100 text-red-600',
    record_viewed: 'bg-purple-100 text-purple-600',
    voice_command: 'bg-indigo-100 text-indigo-600',
    batch_grading: 'bg-emerald-100 text-emerald-600',
    student_added: 'bg-cyan-100 text-cyan-600',
    student_updated: 'bg-teal-100 text-teal-600',
    grade_updated: 'bg-orange-100 text-orange-600',
    export_excel: 'bg-green-100 text-green-600',
    export_pdf: 'bg-red-100 text-red-600',
    sheet_switched: 'bg-blue-100 text-blue-600',
    bulk_import: 'bg-purple-100 text-purple-600',
    auto_number: 'bg-indigo-100 text-indigo-600',
    profile_updated: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${colorMap[type] || 'bg-gray-100 text-gray-600'} ${className}`}>
      {iconMap[type] || '📌'}
    </div>
  );
};

// 🔥 NEW: Activity Item Component
const ActivityItem = ({ activity, isNew = false }) => {
  return (
    <div className={`activity-item flex items-start space-x-4 p-4 rounded-lg transition-all duration-300 hover:bg-gray-50 ${isNew ? 'activity-new' : ''}`}>
      <ActivityIcon type={activity.activity_type} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 mb-1">
              {activity.title}
            </p>
            {activity.description && (
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {activity.description}
              </p>
            )}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <FiClock className="w-3 h-3" />
              <span>{activity.time_ago}</span>
              {activity.metadata?.semester && (
                <>
                  <span>•</span>
                  <span className="text-blue-600">{activity.metadata.semester}</span>
                </>
              )}
            </div>
          </div>
          {activity.class_record_id && (
            <Link
              to={`/dashboard/class-records/${activity.class_record_id}/excel`}
              className="text-xs text-[#333D79] hover:text-[#2A2F66] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
            >
              View Record
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Skeleton Components
const Skeleton = ({ className }) => (
  <div className={`bg-gray-200 rounded-md animate-pulse ${className}`}></div>
);

const StatsCardSkeleton = () => (
  <div className="stat-card bg-white rounded-xl p-6 shadow-sm border border-gray-100">
    <div className="flex justify-between items-start mb-4">
      <div>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-7 w-16" />
      </div>
      <Skeleton className="w-12 h-12 rounded-lg" />
    </div>
    <div className="flex items-center">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-3 w-16 ml-2" />
    </div>
  </div>
);

const ActivitySkeleton = () => (
  <div className="flex items-start space-x-4 p-4">
    <Skeleton className="w-10 h-10 rounded-lg" />
    <div className="flex-1">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState({
    totalClassRecords: 0,
    classRecordsTrend: 0,
    totalActivities: 0,
    todayActivities: 0
  });
  const [activities, setActivities] = useState([]);
  const [activityStats, setActivityStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🔥 NEW: Auto-refresh activities every 30 seconds
  useEffect(() => {
    let interval;
    if (!loading) {
      interval = setInterval(() => {
        fetchActivities(true); // Silent refresh
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return;
    }

    const loadAllData = async () => {
      await Promise.all([
        fetchStats(),
        fetchActivities(),
        fetchActivityStats()
      ]);
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
      
      setStatsData(prev => ({
        ...prev,
        totalClassRecords: classRecordsCount,
        classRecordsTrend: 0 // Can be calculated based on historical data
      }));
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      showToast.error('Failed to load dashboard statistics');
    }
  };

  // 🔥 NEW: Fetch user activities
  const fetchActivities = async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      
      const response = await activityService.getActivities({ limit: 10, days: 7 });
      
      if (response.data) {
        setActivities(response.data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      if (!silent) {
        showToast.error('Failed to load recent activities');
      }
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  // 🔥 NEW: Fetch activity statistics
  const fetchActivityStats = async () => {
    try {
      const response = await activityService.getActivityStats(7);
      
      if (response.data) {
        setActivityStats(response.data);
        setStatsData(prev => ({
          ...prev,
          totalActivities: response.data.total_activities || 0,
          todayActivities: response.data.today_activities || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    }
  };

  // 🔥 NEW: Manual refresh
  const handleRefreshActivities = async () => {
    await fetchActivities();
    showToast.success('Activities refreshed!');
  };

  // 🔥 ENHANCED: Stats with activities
  const stats = [
    {
      name: 'Class Records',
      value: statsData.totalClassRecords.toString(),
      icon: <RiSoundModuleLine size={24} className="text-white" />,
      change: `+${statsData.classRecordsTrend}%`,
      trend: 'up',
      color: 'from-[#333D79] to-[#4A5491]',
      delay: '0s'
    },
    {
      name: 'Total Activities',
      value: statsData.totalActivities.toString(),
      icon: <FiActivity size={24} className="text-white" />,
      change: '+12%',
      trend: 'up',
      color: 'from-emerald-500 to-emerald-600',
      delay: '0.1s'
    },  
    {
      name: "Today's Actions",
      value: statsData.todayActivities.toString(),
      icon: <FiBarChart2 size={24} className="text-white" />,
      change: '+8%',
      trend: 'up',
      color: 'from-blue-500 to-blue-600',
      delay: '0.2s'
    },
    {
      name: 'This Week',
      value: Object.values(activityStats.activity_breakdown || {}).reduce((a, b) => a + b, 0).toString(),
      icon: <FiCalendar size={24} className="text-white" />,
      change: '+15%',
      trend: 'up',
      color: 'from-purple-500 to-purple-600',
      delay: '0.3s'
    }
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardStyles />
        <div className="min-h-screen bg-gray-50">
          {/* Header Section (keep existing) */}
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
                  Your voice-powered dashboard for tracking educational progress and managing class records.
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
              
              {/* Keep existing decorative circle */}
              <div className="hidden md:block">
                <div className="h-48 w-48 flex items-center justify-center relative book-icon-container">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#333D79]/10 to-[#4A5491]/10 rounded-full"></div>
                  <div className="absolute h-40 w-40 rounded-full border-4 border-[#333D79]/5 animate-pulse"></div>
                  <div className="absolute h-48 w-48 rounded-full border border-dashed border-[#333D79]/10 animate-spin" style={{ animationDuration: '15s' }}></div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>

          {/* Activities Skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <ActivitySkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardStyles />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header Section (keep existing) */}
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
                Your voice-powered dashboard for tracking educational progress and managing class records.
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
            
            {/* Keep existing decorative elements */}
            <div className="hidden md:block">
              <div className="h-48 w-48 flex items-center justify-center relative book-icon-container">
                <div className="absolute inset-0 bg-gradient-to-r from-[#333D79]/10 to-[#4A5491]/10 rounded-full"></div>
                <div className="absolute h-40 w-40 rounded-full border-4 border-[#333D79]/5 animate-pulse"></div>
                <div className="absolute h-48 w-48 rounded-full border border-dashed border-[#333D79]/10 animate-spin" style={{ animationDuration: '15s' }}></div>
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

        {/* 🔥 ENHANCED: Stats Cards with Activities */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div 
              key={stat.name} 
              className="stat-card bg-white rounded-xl p-6 shadow-sm border border-gray-100 pulse-on-hover"
              style={{ animationDelay: stat.delay }}
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
                <span className="text-xs text-gray-500 ml-2">vs last week</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions (keep existing) */}
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
                  <p className="text-sm text-gray-500">Start a new voice-controlled class session</p>
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
                  <p className="text-sm text-gray-500">Browse your voice-enabled class records</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* 🔥 NEW: Real-time Activity Feed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiActivity className="w-5 h-5 text-[#333D79]" />
              Recent Activity
            </h2>
            <button
              onClick={handleRefreshActivities}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#333D79] hover:text-[#2A2F66] hover:bg-[#F8F9FF] rounded-lg transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-[#EEF0F8] flex items-center justify-center mb-4 mx-auto">
                <FiActivity className="h-8 w-8 text-[#333D79]" />
              </div>
              <p className="text-gray-500 mb-2">No recent activity</p>
              <p className="text-sm text-gray-400">Your actions and voice commands will appear here.</p>
            </div>
          ) : (
            <div className="relative activity-timeline">
              <div className="space-y-2">
                {activities.map((activity, index) => (
                  <ActivityItem 
                    key={activity.id} 
                    activity={activity} 
                    isNew={index === 0 && refreshing}
                  />
                ))}
              </div>
              
              {activities.length >= 10 && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => fetchActivities()}
                    className="text-sm text-[#333D79] hover:text-[#2A2F66] font-medium"
                  >
                    Load More Activities
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;