import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiClock, FiUsers, FiSpeaker, FiActivity } from 'react-icons/fi';
import { MdKeyboardVoice, MdOutlinePublish, MdOutlineClass } from 'react-icons/md';
import DashboardLayout from './layouts/DashboardLayout';
import ProjectModal from './modals/ProjectModal';
import { useAuth } from '../auth/AuthContext';
import { classService } from '../services/api';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('recent');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);


    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            navigate('/login');
            return;
        }

        fetchClasses();
    }, [navigate]);

  const stats = [
    { 
      name: 'Total Classes', 
      value: '24', 
      icon: <MdOutlineClass size={24} className="text-[#333D79]" />,
      change: '+12%',
      trend: 'up'
    },
    { 
      name: 'Recordings', 
      value: '128', 
      icon: <MdKeyboardVoice size={24} className="text-[#4A5491]" />,
      change: '+8%',
      trend: 'up'
    },
    { 
      name: 'Team Members', 
      value: '9', 
      icon: <FiUsers size={24} className="text-[#5D69A5]" />,
      change: '+2',
      trend: 'up'
    },
    { 
      name: 'Hours Processed', 
      value: '187', 
      icon: <FiClock size={24} className="text-[#6B77B7]" />,
      change: '+24',
      trend: 'up'
    },
  ];

  const fetchClasses = async () => {
    try {
        setLoading(true);
        const response = await classService.getClasses();
        setProjects(response.data);
    } catch (error) {
        console.error('Error fetching classes:', error);
        if (error.response?.status === 401) {
            toast.error('Session expired. Please login again.');
            navigate('/login');
        } else {
            toast.error('Failed to load classes');
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

  const handleAddProject = (newProject) => {
    setProjects([newProject, ...projects]);
  };

  const handleClassClick = (id) => {
    navigate(`/dashboard/class/${id}`);
  };

  return (
    <DashboardLayout>
      <div className="pb-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Welcome back, {user?.first_name}!</h1>
          <button 
            onClick={() => setIsProjectModalOpen(true)}
            className="bg-[#333D79] hover:bg-[#4A5491] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <FiPlus size={20} />
            <span>Create Class</span>
          </button>
        </div>

        {/* Project Modal */}
        <ProjectModal 
          isOpen={isProjectModalOpen} 
          onClose={() => setIsProjectModalOpen(false)} 
          onAddProject={handleAddProject}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-bold mt-1 text-gray-800">{stat.value}</p>
                </div>
                <div className="p-3 rounded-lg bg-[#F0F2F8]">{stat.icon}</div>
              </div>
              <div className="mt-4">
                <span className={`text-sm ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {stat.change} {stat.trend === 'up' ? '↑' : '↓'}
                </span>
                <span className="text-xs text-gray-500 ml-1">from last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex flex-col items-center justify-center p-4 bg-[#EEF0F8] rounded-lg hover:bg-[#DCE0F2] transition-colors">
              <MdKeyboardVoice size={28} className="text-[#333D79] mb-2" />
              <span className="text-sm font-medium text-gray-700">New Recording</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 bg-[#EEF0F8] rounded-lg hover:bg-[#DCE0F2] transition-colors">
              <MdOutlinePublish size={28} className="text-[#4A5491] mb-2" />
              <span className="text-sm font-medium text-gray-700">Import Audio</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 bg-[#EEF0F8] rounded-lg hover:bg-[#DCE0F2] transition-colors">
              <FiSpeaker size={28} className="text-[#5D69A5] mb-2" />
              <span className="text-sm font-medium text-gray-700">Transcribe</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 bg-[#EEF0F8] rounded-lg hover:bg-[#DCE0F2] transition-colors">
              <FiActivity size={28} className="text-[#6B77B7] mb-2" />
              <span className="text-sm font-medium text-gray-700">Analytics</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <div className="flex">
              <button
                className={`px-4 py-3 font-medium text-sm ${
                  activeTab === 'recent' ? 'text-[#333D79] border-b-2 border-[#333D79]' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('recent')}
              >
                Recent Class
              </button>
              <button
                className={`px-4 py-3 font-medium text-sm ${
                  activeTab === 'recordings' ? 'text-[#333D79] border-b-2 border-[#333D79]' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('recordings')}
              >
                Recent Recordings
              </button>
            </div>
          </div>

          {activeTab === 'recent' && (
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#F5F7FB]">
                    <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recordings
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                    </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                    <tr>
                        <td colSpan="4" className="px-6 py-12">
                        <div className="flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#333D79]"></div>
                            <p className="mt-2 text-sm text-gray-500">Loading classes...</p>
                        </div>
                        </td>
                    </tr>
                    ) : projects.length === 0 ? (
                    <tr>
                        <td colSpan="4" className="px-6 py-12">
                        <div className="flex flex-col items-center justify-center">
                            <div className="flex-shrink-0 h-16 w-16 bg-[#EEF0F8] rounded-lg flex items-center justify-center mb-4">
                            <MdOutlineClass className="h-8 w-8 text-[#333D79]" />
                            </div>
                            <p className="text-sm text-gray-500">No classes found.</p>
                            <button 
                            onClick={() => setIsProjectModalOpen(true)}
                            className="mt-2 text-sm text-[#333D79] hover:text-[#4A5491] font-medium"
                            >
                            Create your first class
                            </button>
                        </div>
                        </td>
                    </tr>
                    ) : (
                    projects.map((project) => (
                        <tr 
                        key={project.id} 
                        className="hover:bg-[#F5F7FB] cursor-pointer transition-colors" 
                        onClick={() => handleClassClick(project.id)}
                        >
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-[#EEF0F8] rounded-lg flex items-center justify-center">
                                <MdOutlineClass className="h-5 w-5 text-[#333D79]" />
                            </div>
                            <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{project.name}</div>
                            </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{project.recordings_count || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{project.last_updated}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            project.status === 'active' ? 'bg-[#DCE3F9] text-[#333D79]' : 
                            project.status === 'completed' ? 'bg-[#E0F2ED] text-[#0F766E]' : 
                            'bg-gray-100 text-gray-800'
                            }`}>
                            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                            </span>
                        </td>
                        </tr>
                    ))
                    )}
                </tbody>
                </table>
            </div>
          )}

          {activeTab === 'recordings' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#F5F7FB]">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recording Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentRecordings.map((recording) => (
                    <tr key={recording.id} className="hover:bg-[#F5F7FB] cursor-pointer transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-[#EEF0F8] rounded-lg flex items-center justify-center">
                            <MdKeyboardVoice className="h-5 w-5 text-[#333D79]" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{recording.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{recording.duration}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{recording.projectName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{recording.date}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard; 