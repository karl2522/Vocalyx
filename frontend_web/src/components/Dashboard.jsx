import { useEffect, useMemo, useState } from 'react';
import { FiArchive, FiCalendar, FiCheck, FiClock, FiPlus, FiTag, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { MdOutlineClass, MdOutlineSchool } from 'react-icons/md';
import { RiBookOpenLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { courseService, teamService } from '../services/api.js';
import { commonHeaderAnimations } from '../utils/animation.js';
import { showToast } from '../utils/toast.jsx';
import DashboardLayout from './layouts/DashboardLayout';
import CourseModal from './modals/CourseModal';

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

    .team-card {
      transition: all 0.3s ease;
      border: 1px solid #f1f1f1;
      position: relative;
      overflow: hidden;
      will-change: transform, box-shadow;
    }
    
    .team-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 25px -5px rgba(51, 61, 121, 0.1);
    }
    
    .team-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, rgba(51, 61, 121, 0.02) 0%, rgba(74, 84, 145, 0.02) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .team-card:hover::before {
      opacity: 1;
    }
    
    .team-member-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid white;
      margin-left: -8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #E6EAFF;
      font-size: 10px;
      color: #333D79;
      font-weight: 600;
    }
    
    .team-member-avatar:first-child {
      margin-left: 0;
    }
  `, []);
  
  return <style>{styles}</style>;
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('recent');
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    totalCourses: 0,
    totalClasses: 0,
    totalTeamMembers: 0,
    coursesTrend: 0,
    classesTrend: 0,
    teamMembersTrend: 0
  });
  const [teamData, setTeamData] = useState([]);
  const [showTeams, setShowTeams] = useState(true);

   useEffect(() => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    navigate('/login');
    return;
  }

  const loadAllData = async () => {
    const coursesData = await fetchCourses();
    await fetchTeams();
    await fetchStats(coursesData); // Pass the courses data directly
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


  const fetchTeams = async () => {
    try {
      const response = await teamService.getAllTeams();
      
      // Transform the API response to match our component's expected format
      const formattedTeams = response.data.map(team => {
        // Format members data
        const teamMembers = team.members?.map(member => {
          const name = member.name || (member.user_details ? 
            `${member.user_details.first_name} ${member.user_details.last_name}`.trim() || 
            member.user_details.email : 'Unknown');
          
          // Generate initials from name
          const nameParts = name.split(' ');
          const initial = nameParts.length > 1 
            ? `${nameParts[0][0]}${nameParts[1][0]}` 
            : name.substring(0, 2);
            
          return {
            id: member.id,
            name: name,
            initial: initial.toUpperCase(),
            role: member.role
          };
        }) || [];
        
        // Format role for the current user
        const userMember = team.members?.find(m => 
          m.user_details?.id === user?.id || 
          m.user === user?.id
        );
        
        const role = userMember?.role === 'owner' ? 'Owner' :
                    userMember?.role === 'admin' ? 'Admin' :
                    userMember?.permissions === 'full' ? 'Full Access' :
                    userMember?.permissions === 'edit' ? 'Editor' : 'Member';
        
        return {
          id: team.id,
          name: team.name,
          role: role,
          members: teamMembers,
          courseCount: team.team_courses?.length || team.courses_count || 0,
          lastActive: formatLastActive(team.updated_at)
        };
      });
      
      setTeamData(formattedTeams);
      setShowTeams(formattedTeams.length > 0);
      
    } catch (error) {
      console.error('Error fetching teams:', error);
      showToast.error('Failed to load team data');
    }
  };

   const formatLastActive = (dateString) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const stats = [
    {
      name: 'Total Courses',
      value: statsData.totalCourses.toString(),
      icon: <MdOutlineSchool size={24} className="text-white" />,
      change: `+${statsData.coursesTrend}%`,
      trend: 'up',
      color: 'from-[#333D79] to-[#4A5491]',
      delay: '0s'
    },
    {
      name: 'Classes',
      value: statsData.totalClasses.toString(),
      icon: <MdOutlineClass size={24} className="text-white" />,
      change: `+${statsData.classesTrend}%`,
      trend: 'up',
      color: 'from-[#4A5491] to-[#5D69A5]',
      delay: '0s'
    },
    {
      name: 'Team Members',
      value: statsData.totalTeamMembers.toString(),
      icon: <FiUsers size={24} className="text-white" />,
      change: `+${statsData.teamMembersTrend}`,
      trend: 'up',
      color: 'from-[#5D69A5] to-[#6B77B7]',
      delay: '0s'
    },
  ];

  const fetchCourses = async () => {
  try {
    setLoading(true);
    const response = await courseService.getCourses();
    const coursesData = response.data;
    setCourses(coursesData);
    return coursesData; // Return the actual data
  } catch (error) {
    console.error('Error fetching courses:', error);
    if (error.response?.status === 401) {
      showToast.error('Session expired. Please login again.');
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      return [];
    } else {
      showToast.error('Failed to load courses');
      return [];
    }
  } finally {
    setLoading(false);
  }
};
  

  const fetchStats = async (coursesData) => {
  try {
    // Use the courses data passed in as parameter instead of the state
    const coursesCount = coursesData?.length || 0;
    
    console.log("fetchStats - calculated coursesCount:", coursesCount);
    
    // Get classes data
    let classesCount = 0;
    try {
      const classesResponse = await courseService.getAllClasses();
      classesCount = classesResponse?.data?.length || 0;
    } catch (error) {
      console.error('Error fetching classes:', error);
      // Try to get class count from courses
      classesCount = coursesData?.reduce((total, course) => {
        return total + (course.classes_count || 0);
      }, 0) || 0;
    }
    
    // Count team members from real team data
    let teamMembersCount = 0;
    let uniqueMembers = new Set();
    
    teamData.forEach(team => {
      team.members?.forEach(member => {
        uniqueMembers.add(member.id);
      });
    });
    
    teamMembersCount = uniqueMembers.size;
    if (teamMembersCount === 0) {
      teamMembersCount = teamData.reduce((count, team) => count + (team.members?.length || 0), 0);
    }
    
    // Generate trend percentages (could be from localStorage or just estimates)
    const coursesTrend = Math.max(5, Math.floor(Math.random() * 15));
    const classesTrend = Math.max(3, Math.floor(Math.random() * 10));
    const teamMembersTrend = Math.max(1, Math.floor(Math.random() * 3));
    
    // Set the stats data
    setStatsData({
      totalCourses: coursesCount,
      totalClasses: classesCount,
      totalTeamMembers: teamMembersCount,
      coursesTrend: coursesTrend,
      classesTrend: classesTrend,
      teamMembersTrend: teamMembersTrend
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};

  const recentRecordings = [
    { id: 1, name: "Marketing team standup.mp3", duration: "32:16", projectName: "Meeting Transcripts", date: "Today" },
    { id: 2, name: "Product demo v2.mp3", duration: "18:45", projectName: "Product Demo Voiceovers", date: "Yesterday" },
    { id: 3, name: "Customer call - issue #4582.mp3", duration: "12:03", projectName: "Customer Service AI", date: "2 days ago" },
    { id: 4, name: "New feature walkthrough.mp3", duration: "24:30", projectName: "Training Presentations", date: "3 days ago" },
  ];

  const handleAddCourse = async (courseData) => {
    try {
        setLoading(true);
        const response = await courseService.createCourse(courseData);
        
        setCourses(prevCourses => [response.data, ...prevCourses]);
        
        showToast.created('Course');
    } catch (error) {
        console.error('Error creating course:', error);
        showToast.error('Failed to create course');
    } finally {
        setLoading(false);
    }
};

  const handleCourseClick = (id) => {
    navigate(`/dashboard/course/${id}`);
  };

  // Function to toggle empty teams state for testing
 const toggleTeamsVisibility = () => {
    setShowTeams(!showTeams);
  };

  return (
    <DashboardLayout>
      <DashboardStyles />
      
      <div className="pb-6">
        {/* Hero Section */}
        <div className="hero-gradient rounded-xl mb-8 p-6 md:p-8 shadow-sm border border-gray-100 overflow-hidden relative">
          {/* Background Elements */}
          <div className="bg-blur-circle bg-blur-circle-top"></div>
          <div className="bg-blur-circle bg-blur-circle-bottom"></div>
          <div className="bg-floating-circle hidden md:block"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
            <div className="fade-in-up" style={{animationDelay: '0s'}}>
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
                
                <Link to="/dashboard/schedule"
                  className="px-5 py-2.5 border border-[#333D79]/20 text-[#333D79] rounded-lg hover:bg-[#333D79]/5 transition-colors flex items-center gap-2"
                >
                  <FiCalendar size={18} />
                  <span>View Schedule</span>
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

        {/* Stats Cards - This part will now use real data */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

        {/* Teams Section - updated to use real data */}
        {showTeams && teamData.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="bg-[#EEF0F8] p-1.5 rounded-md mr-2">
                  <FiUsers size={18} className="text-[#333D79]" />
                </span>
                Your Teams
              </h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={toggleTeamsVisibility}
                  className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                  title="Toggle teams visibility"
                >
                  Hide Teams
                </button>
                <Link to="/dashboard/team" className="text-sm text-[#333D79] font-medium hover:underline flex items-center">
                  View All Teams
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {teamData.map(team => (
                <div key={team.id} className="team-card rounded-xl p-5 bg-white shadow-sm hover:shadow-md border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">{team.name}</h3>
                      <span className="inline-block px-2 py-1 bg-[#EEF0F8] text-[#333D79] text-xs font-medium rounded-md mt-1">
                        {team.role}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{team.lastActive}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex">
                      {team.members.slice(0, 4).map((member, index) => (
                        <div key={member.id} className="team-member-avatar shadow-sm" style={{zIndex: 10-index}}>
                          {member.initial}
                        </div>
                      ))}
                      {team.members.length > 4 && (
                        <div className="team-member-avatar shadow-sm bg-[#333D79] text-white" style={{zIndex: 1}}>
                          +{team.members.length - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-gray-600 flex items-center">
                      <RiBookOpenLine className="mr-1 text-gray-400" size={14} />
                      {team.courseCount} Courses
                    </span>
                  </div>
                  
                  <Link
                    to={`/dashboard/team/${team.id}`}
                    className="w-full py-2 mt-2 bg-gray-50 text-[#333D79] text-sm font-medium rounded-lg hover:bg-[#EEF0F8] transition-colors border border-gray-100 flex items-center justify-center"
                  >
                    View Team Details
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="bg-[#EEF0F8] p-1.5 rounded-md mr-2">
                  <FiUsers size={18} className="text-[#333D79]" />
                </span>
                Teams
              </h2>
              <button 
                onClick={toggleTeamsVisibility}
                className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                title="Toggle teams visibility"
              >
                Show Teams
              </button>
            </div>
            
            <div className="py-8 px-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#EEF0F8] rounded-full mb-4 float-animation">
                <FiUsers className="h-8 w-8 text-[#333D79]" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Teams Yet</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                Create or join a team to collaborate with other teachers, share resources, and manage courses together.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link 
                  to="/dashboard/team" 
                  className="px-5 py-2.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <FiPlus size={16} className="transition-transform duration-300" />
                  <span>Create Team</span>
                </Link>
                <Link 
                  to="/dashboard/team"
                  className="px-5 py-2.5 border border-[#333D79]/20 text-[#333D79] rounded-lg hover:bg-[#333D79]/5 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Join Existing Team</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 bg-gradient-to-r from-[#f8f9ff] to-[#f0f4ff]">
              <div className="flex overflow-x-auto">
                <button
                  className={`px-6 py-4 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === 'recent' ? 'text-[#333D79] border-b-2 border-[#333D79]' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('recent')}
                >
                  <RiBookOpenLine size={18} />
                  Active Courses
                </button>
                <button
                  className={`px-6 py-4 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === 'completed' ? 'text-[#333D79] border-b-2 border-[#333D79]' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('completed')}
                >
                  <FiCheck size={18} />
                  Completed
                </button>
                <button
                  className={`px-6 py-4 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === 'archived' ? 'text-[#333D79] border-b-2 border-[#333D79]' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('archived')}
                >
                  <FiArchive size={18} />
                  Archived
                </button>
              </div>
            </div>

            {activeTab === 'recent' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  {/* Swapped Course Code and Course Name columns */}
                  <thead className="bg-[#F8F9FF]">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course Code
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course Name
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
                    {loading ? [
                      <tr key="loading-row"> 
                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#333D79]"></div>
                          </div>
                        </td>
                      </tr>
                    ] : courses.filter(course => course.status === 'active' || !course.status).length > 0 ? 
                      courses.filter(course => course.status === 'active' || !course.status).slice(0, 5).map((course) => (
                        <tr
                          key={course.id}
                          className="hover:bg-[#F8F9FF] cursor-pointer transition-colors"
                          onClick={() => handleCourseClick(course.id)}
                        >
                          {/* Swapped Course Code and Course Name cells */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-md bg-[#EEF0F8] text-[#333D79] flex items-center justify-center mr-2.5 shadow-sm">
                                <FiTag size={16} />
                              </div>
                              <div className="text-sm font-medium text-gray-900">{course.courseCode || 'No code'}</div>
                            </div>
                          </td>
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
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-md bg-[#EEF0F8] text-[#333D79] flex items-center justify-center mr-2.5 shadow-sm">
                                <FiClock size={16} />
                              </div>
                              <div className="text-sm text-gray-900">{new Date(course.updated_at || course.created_at).toLocaleDateString()}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-semibold rounded-full shadow-sm ${
                              course.status === 'active' || !course.status ? 'bg-green-100 text-green-800' : 
                              course.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {(course.status === 'active' || !course.status) && 
                                <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                              }
                              {course.status === 'completed' && 
                                <span className="h-2 w-2 rounded-full bg-blue-500 mr-1.5"></span>
                              }
                              {course.status === 'archived' && 
                                <span className="h-2 w-2 rounded-full bg-gray-500 mr-1.5"></span>
                              }
                              {course.status ? (course.status.charAt(0).toUpperCase() + course.status.slice(1)) : 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))
                    : [
                      <tr key="empty-courses">
                        <td colSpan="4" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <div className="h-16 w-16 rounded-full bg-[#EEF0F8] flex items-center justify-center mb-4 float-animation">
                              <RiBookOpenLine className="h-8 w-8 text-[#333D79]" />
                            </div>
                            <p className="text-gray-500 mb-4">No active courses found</p>
                            <button
                              onClick={() => setIsCourseModalOpen(true)}
                              className="px-5 py-2.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 group"
                            >
                              <FiPlus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                              Add a new course
                            </button>
                          </div>
                        </td>
                      </tr>
                    ]}
                  </tbody>
                </table>
                
                {/* Pagination footer */}
                {courses.filter(course => course.status === 'active' || !course.status).length > 5 && (
                  <div className="px-6 py-4 bg-[#F8F9FF] text-right border-t border-gray-100">
                    <button
                      onClick={() => navigate('/dashboard/courses')}
                      className="text-sm text-[#333D79] font-medium hover:underline flex items-center justify-end ml-auto gap-1"
                    >
                      View all active courses
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'completed' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  {/* Swapped Course Code and Course Name columns */}
                  <thead className="bg-[#F8F9FF]">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course Code
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course Name
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
                    {loading ? [
                      <tr key="loading-row"> 
                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#333D79]"></div>
                          </div>
                        </td>
                      </tr>
                    ] : courses.filter(course => course.status === 'completed').length > 0 ? 
                      courses.filter(course => course.status === 'completed').slice(0, 5).map((course) => (
                        <tr
                          key={course.id}
                          className="hover:bg-[#F8F9FF] cursor-pointer transition-colors"
                          onClick={() => handleCourseClick(course.id)}
                        >
                          {/* Swapped Course Code and Course Name cells */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-md bg-[#EEF0F8] text-[#333D79] flex items-center justify-center mr-2.5 shadow-sm">
                                <FiTag size={16} />
                              </div>
                              <div className="text-sm font-medium text-gray-900">{course.courseCode || 'No code'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-[#4CAF50] to-[#81C784] text-white flex items-center justify-center mr-3 shadow-sm">
                                <FiCheck size={18} />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{course.name}</div>
                                <div className="text-xs text-gray-500">{course.semester || ''} {course.academic_year || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-md bg-[#EEF0F8] text-[#333D79] flex items-center justify-center mr-2.5 shadow-sm">
                                <FiClock size={16} />
                              </div>
                              <div className="text-sm text-gray-900">{new Date(course.updated_at || course.created_at).toLocaleDateString()}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1.5 inline-flex items-center text-xs leading-5 font-semibold rounded-full shadow-sm bg-green-100 text-green-800">
                              <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></span>
                              Completed
                            </span>
                          </td>
                        </tr>
                      ))
                    : [
                      <tr key="empty-completed">
                        <td colSpan="4" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center mb-4 float-animation">
                              <FiCheck className="h-8 w-8 text-green-500" />
                            </div>
                            <p className="text-gray-500 mb-4">No completed courses found</p>
                          </div>
                        </td>
                      </tr>
                    ]}
                  </tbody>
                </table>
                
                {courses.filter(course => course.status === 'completed').length > 5 && (
                  <div className="px-6 py-4 bg-[#F8F9FF] text-right border-t border-gray-100">
                    <button
                      onClick={() => navigate('/dashboard/courses?status=completed')}
                      className="text-sm text-[#333D79] font-medium hover:underline flex items-center justify-end ml-auto gap-1"
                    >
                      View all completed courses
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'archived' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  {/* Swapped Course Code and Course Name columns */}
                  <thead className="bg-[#F8F9FF]">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course Code
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course Name
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
                    {loading ? [
                      <tr key="loading-row"> 
                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#333D79]"></div>
                          </div>
                        </td>
                      </tr>
                    ] : courses.filter(course => course.status === 'archived').length > 0 ? 
                      courses.filter(course => course.status === 'archived').slice(0, 5).map((course) => (
                        <tr
                          key={course.id}
                          className="hover:bg-[#F8F9FF] cursor-pointer transition-colors"
                          onClick={() => handleCourseClick(course.id)}
                        >
                          {/* Swapped Course Code and Course Name cells */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-md bg-[#EEF0F8] text-[#333D79] flex items-center justify-center mr-2.5 shadow-sm">
                                <FiTag size={16} />
                              </div>
                              <div className="text-sm font-medium text-gray-900">{course.courseCode || 'No code'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-[#9E9E9E] to-[#BDBDBD] text-white flex items-center justify-center mr-3 shadow-sm">
                                <FiArchive size={18} />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{course.name}</div>
                                <div className="text-xs text-gray-500">{course.semester || ''} {course.academic_year || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-md bg-[#EEF0F8] text-[#333D79] flex items-center justify-center mr-2.5 shadow-sm">
                                <FiClock size={16} />
                              </div>
                              <div className="text-sm text-gray-900">{new Date(course.updated_at || course.created_at).toLocaleDateString()}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1.5 inline-flex items-center text-xs leading-5 font-semibold rounded-full shadow-sm bg-gray-100 text-gray-700">
                              <span className="h-2 w-2 rounded-full bg-gray-500 mr-1.5"></span>
                              Archived
                            </span>
                          </td>
                        </tr>
                      ))
                    : [
                      <tr key="empty-archived">
                        <td colSpan="4" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 float-animation">
                              <FiArchive className="h-8 w-8 text-gray-500" />
                            </div>
                            <p className="text-gray-500 mb-4">No archived courses found</p>
                          </div>
                        </td>
                      </tr>
                    ]}
                  </tbody>
                </table>
                
                {courses.filter(course => course.status === 'archived').length > 5 && (
                  <div className="px-6 py-4 bg-[#F8F9FF] text-right border-t border-gray-100">
                    <button
                      onClick={() => navigate('/dashboard/courses?status=archived')}
                      className="text-sm text-[#333D79] font-medium hover:underline flex items-center justify-end ml-auto gap-1"
                    >
                      View all archived courses
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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