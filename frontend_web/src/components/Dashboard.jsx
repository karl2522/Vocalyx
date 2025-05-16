import { useEffect, useState } from 'react';
import { FiActivity, FiCalendar, FiClock, FiPlus, FiSpeaker, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { MdOutlineClass, MdOutlinePublish, MdOutlineSchool } from 'react-icons/md';
import { RiBookOpenLine, RiSoundModuleLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { classService } from '../services/api';
import { showToast } from '../utils/toast.jsx';
import DashboardLayout from './layouts/DashboardLayout';
import CourseModal from './modals/CourseModal';

// Custom animation styles
const dashboardStyles = `
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
  
  @keyframes pulse-subtle {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
    100% { transform: translateY(0px); }
  }
  
  .fade-in-up {
    animation: fadeInUp 0.5s ease-out forwards;
  }
  
  .pulse-on-hover {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .pulse-on-hover:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px -5px rgba(51, 61, 121, 0.1);
  }
  
  .float-animation {
    animation: float 6s ease-in-out infinite;
  }
  
  .stat-card {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
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
  
  .quick-action-button {
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .quick-action-button::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .quick-action-button:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 15px -3px rgba(51, 61, 121, 0.1);
  }
  
  .quick-action-button:hover::after {
    opacity: 1;
  }
  
  .hero-gradient {
    background: linear-gradient(135deg, #eef0f8 0%, #dce0f2 100%);
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
`;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('recent');
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchCourses();

    // Check if notification has been shown before
    const hasShownNotification = localStorage.getItem('hasShownNotification');
    
    // Only show notification if it hasn't been shown before
    if (!hasShownNotification) {
      const timer = setTimeout(() => {
        showToast.notification(
          'Click the bell icon in the top right to see your notifications!',
          'New Notification Feature',
          { duration: 5000, position: 'bottom-right' }
        );
        // Mark notification as shown
        localStorage.setItem('hasShownNotification', 'true');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [navigate]);

  const stats = [
    {
      name: 'Total Courses',
      value: '24',
      icon: <MdOutlineSchool size={24} className="text-white" />,
      change: '+12%',
      trend: 'up',
      color: 'from-[#333D79] to-[#4A5491]',
      delay: '0s'
    },
    {
      name: 'Classes',
      value: '128',
      icon: <MdOutlineClass size={24} className="text-white" />,
      change: '+8%',
      trend: 'up',
      color: 'from-[#4A5491] to-[#5D69A5]',
      delay: '0.1s'
    },
    {
      name: 'Team Members',
      value: '9',
      icon: <FiUsers size={24} className="text-white" />,
      change: '+2',
      trend: 'up',
      color: 'from-[#5D69A5] to-[#6B77B7]',
      delay: '0.2s'
    },
    {
      name: 'Hours Processed',
      value: '187',
      icon: <FiClock size={24} className="text-white" />,
      change: '+24',
      trend: 'up',
      color: 'from-[#6B77B7] to-[#7B85C9]',
      delay: '0.3s'
    },
  ];

  const quickActions = [
    {
      name: 'New Recording',
      icon: <RiSoundModuleLine size={28} />,
      color: 'from-[#333D79] to-[#4A5491]',
      delay: '0.1s'
    },
    {
      name: 'Import Audio',
      icon: <MdOutlinePublish size={28} />,
      color: 'from-[#4A5491] to-[#5D69A5]',
      delay: '0.2s'
    },
    {
      name: 'Transcribe',
      icon: <FiSpeaker size={28} />,
      color: 'from-[#5D69A5] to-[#6B77B7]',
      delay: '0.3s'
    },
    {
      name: 'Analytics',
      icon: <FiActivity size={28} />,
      color: 'from-[#6B77B7] to-[#7B85C9]',
      delay: '0.4s'
    },
  ];

  const fetchCourses = async () => {
    try {
      setLoading(true);
      // Using the existing classes API endpoint for now
      const response = await classService.getClasses();
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      if (error.response?.status === 401) {
        showToast.error('Session expired. Please login again.');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      } else {
        showToast.error('Failed to load courses');
      }
    } finally {
      setLoading(false);
    }
  };

  const recentRecordings = [
    { id: 1, name: "Marketing team standup.mp3", duration: "32:16", projectName: "Meeting Transcripts", date: "Today" },
    { id: 2, name: "Product demo v2.mp3", duration: "18:45", projectName: "Product Demo Voiceovers", date: "Yesterday" },
    { id: 3, name: "Customer call - issue #4582.mp3", duration: "12:03", projectName: "Customer Service AI", date: "2 days ago" },
    { id: 4, name: "New feature walkthrough.mp3", duration: "24:30", projectName: "Training Presentations", date: "3 days ago" },
  ];

  const handleAddCourse = (newCourse) => {
    setCourses([newCourse, ...courses]);
  };

  const handleCourseClick = (id) => {
    navigate(`/dashboard/course/${id}`);
  };

  return (
    <DashboardLayout>
      {/* Add custom styles */}
      <style>{dashboardStyles}</style>
      
      <div className="pb-6">
        {/* Hero Section */}
        <div className="hero-gradient rounded-xl mb-8 p-6 md:p-8 shadow-sm border border-gray-100 overflow-hidden relative" style={{animationDelay: '0s'}}>
          {/* Background Elements */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-300 opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-indigo-200 opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -translate-y-1/2 right-6 md:right-20 w-32 h-32 rounded-full bg-gradient-to-r from-[#333D79]/10 to-[#4A5491]/5 float-animation hidden md:block"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
            <div className="fade-in-up" style={{animationDelay: '0.1s'}}>
              <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#333D79] to-[#4A5491]">
                Welcome back, {user?.first_name}!
              </h1>
              <p className="text-gray-600 max-w-lg">
                Your audio and recordings dashboard for tracking educational progress and managing your courses.
              </p>
              
              <div className="mt-6 flex items-center gap-4">
                <button 
                  onClick={() => setIsCourseModalOpen(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 group"
                >
                  <FiPlus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                  <span>Add New Course</span>
                </button>
                
                <button 
                  className="px-5 py-2.5 border border-[#333D79]/20 text-[#333D79] rounded-lg hover:bg-[#333D79]/5 transition-colors flex items-center gap-2"
                >
                  <FiCalendar size={18} />
                  <span>View Calendar</span>
                </button>
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
                  {/* Book icon with better styling */}
                  <div className="relative">
                    <div className="absolute -inset-3 bg-[#333D79]/5 rounded-full blur-md"></div>
                    <RiBookOpenLine size={60} className="text-[#333D79] relative z-10" />
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

        {/* Course Modal */}
        <CourseModal
          isOpen={isCourseModalOpen}
          onClose={() => setIsCourseModalOpen(false)}
          onAddCourse={handleAddCourse}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div 
              key={stat.name} 
              className="stat-card fade-in-up bg-white rounded-xl p-6 shadow-sm border border-gray-100 pulse-on-hover"
              style={{animationDelay: stat.delay}}
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

        {/* Quick Access */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 fade-in-up" style={{animationDelay: '0.5s'}}>
          <h2 className="text-lg font-semibold mb-5 text-gray-800 flex items-center">
            <span className="bg-[#EEF0F8] p-1.5 rounded-md mr-2">
              <FiActivity size={18} className="text-[#333D79]" />
            </span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button 
                key={action.name}
                className="quick-action-button flex flex-col items-center justify-center p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group fade-in-up"
                style={{animationDelay: action.delay}}
              >
                <div className={`p-3 rounded-full bg-gradient-to-r ${action.color} shadow-md text-white mb-3 group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <span className="text-sm font-medium text-gray-700">{action.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden fade-in-up" style={{animationDelay: '0.7s'}}>
          <div className="border-b border-gray-100 bg-gradient-to-r from-[#f8f9ff] to-[#f0f4ff]">
            <div className="flex">
              <button
                className={`px-6 py-4 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === 'recent' ? 'text-[#333D79] border-b-2 border-[#333D79]' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('recent')}
              >
                <RiBookOpenLine size={18} />
                Recent Courses
              </button>
              <button
                className={`px-6 py-4 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === 'recordings' ? 'text-[#333D79] border-b-2 border-[#333D79]' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('recordings')}
              >
                <RiSoundModuleLine size={18} />
                Recent Recordings
              </button>
            </div>
          </div>

          {activeTab === 'recent' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#F8F9FF]">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course Name
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course Code
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#333D79]"></div>
                        </div>
                      </td>
                    </tr>
                  ) : courses.length > 0 ? (
                    courses.slice(0, 5).map((course) => (
                      <tr
                        key={course.id}
                        className="hover:bg-[#F8F9FF] cursor-pointer transition-colors"
                        onClick={() => handleCourseClick(course.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white flex items-center justify-center mr-3 shadow-sm">
                              <RiBookOpenLine size={18} />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{course.name}</div>
                              <div className="text-xs text-gray-500">{course.semester || ''} {course.academic_year || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{course.courseCode || 'No code'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{new Date(course.updated_at || course.created_at).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm ${
                            course.status === 'active' ? 'bg-[#EEF0F8] text-[#333D79]' : 
                            course.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {course.status ? (course.status.charAt(0).toUpperCase() + course.status.slice(1)) : 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="h-16 w-16 rounded-full bg-[#EEF0F8] flex items-center justify-center mb-4 float-animation">
                            <RiBookOpenLine className="h-8 w-8 text-[#333D79]" />
                          </div>
                          <p className="text-gray-500 mb-4">No courses found</p>
                          <button
                            onClick={() => setIsCourseModalOpen(true)}
                            className="px-5 py-2.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 group"
                          >
                            <FiPlus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                            Add your first course
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {courses.length > 5 && (
                <div className="px-6 py-4 bg-[#F8F9FF] text-right border-t border-gray-100">
                  <button
                    onClick={() => navigate('/dashboard/courses')}
                    className="text-sm text-[#333D79] font-medium hover:underline flex items-center justify-end ml-auto gap-1"
                  >
                    View all courses
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'recordings' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#F8F9FF]">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recording
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentRecordings.map((recording) => (
                    <tr key={recording.id} className="hover:bg-[#F8F9FF] cursor-pointer transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-[#4A5491] to-[#5D69A5] text-white flex items-center justify-center mr-3 shadow-sm">
                            <RiSoundModuleLine size={18} />
                          </div>
                          <div className="text-sm font-medium text-gray-900">{recording.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <FiClock size={14} className="mr-1.5 text-[#333D79]" />
                          {recording.duration}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {recording.projectName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-gray-100 text-gray-800">
                          {recording.date}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="px-6 py-4 bg-[#F8F9FF] text-right border-t border-gray-100">
                <button
                  onClick={() => navigate('/dashboard/recordings')}
                  className="text-sm text-[#333D79] font-medium hover:underline flex items-center justify-end ml-auto gap-1"
                >
                  View all recordings
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;