import { useState } from 'react';
import { FiPlus, FiSearch, FiFilter, FiFolder, FiMoreVertical } from 'react-icons/fi';
import DashboardLayout from "./layouts/DashboardLayout.jsx";

const Projects = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Mock data for projects
  const projects = [
    { 
      id: 1, 
      name: "Customer Service AI", 
      description: "Automated transcription for customer service calls",
      category: "Customer Service",
      recordings: 32, 
      lastUpdated: "2 hours ago", 
      status: "Active",
      members: 4,
    },
    { 
      id: 2, 
      name: "Meeting Transcripts", 
      description: "Weekly team meeting recordings and transcriptions",
      category: "Meetings",
      recordings: 56, 
      lastUpdated: "Yesterday", 
      status: "Active",
      members: 8,
    },
    { 
      id: 3, 
      name: "Product Demo Voiceovers", 
      description: "Voice recordings for product demonstrations",
      category: "Marketing",
      recordings: 12, 
      lastUpdated: "3 days ago", 
      status: "Completed",
      members: 3,
    },
    { 
      id: 4, 
      name: "Training Presentations", 
      description: "Internal training materials with audio narration",
      category: "Training",
      recordings: 28, 
      lastUpdated: "1 week ago", 
      status: "Archived",
      members: 6,
    },
    { 
      id: 5, 
      name: "Marketing Podcasts", 
      description: "Weekly marketing podcasts and transcriptions",
      category: "Marketing",
      recordings: 24, 
      lastUpdated: "2 weeks ago", 
      status: "Active",
      members: 5,
    },
    { 
      id: 6, 
      name: "User Research Interviews", 
      description: "User feedback interviews for product development",
      category: "Research",
      recordings: 42, 
      lastUpdated: "3 weeks ago", 
      status: "Completed",
      members: 7,
    },
  ];

  // Filter projects based on search term and filter selection
  const filteredProjects = projects.filter(project => {
    // Apply search filter
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          project.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply status filter
    if (filter === 'all') return matchesSearch;
    return matchesSearch && project.status.toLowerCase() === filter.toLowerCase();
  });

  return (
    <DashboardLayout>
      <div className="pb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Projects</h1>
          <button 
            onClick={() => window.location.href = '/dashboard/create-project'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <FiPlus size={20} />
            <span>Create Project</span>
          </button>
        </div>

        {/* Filters and search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-center">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FiFilter size={18} />
                <span>Filter: {filter === 'all' ? 'All Projects' : filter}</span>
              </button>
              
              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 py-1">
                  <button
                    onClick={() => { setFilter('all'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    All Projects
                  </button>
                  <button
                    onClick={() => { setFilter('active'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Active
                  </button>
                  <button
                    onClick={() => { setFilter('completed'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => { setFilter('archived'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Archived
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div 
              key={project.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.location.href = `/dashboard/projects/${project.id}`}
            >
              <div className="border-b border-gray-100">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FiFolder className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">{project.category}</p>
                    </div>
                  </div>
                  <button 
                    className="p-1 rounded-full hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Add dropdown menu functionality here
                    }}
                  >
                    <FiMoreVertical size={18} />
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                
                <div className="flex justify-between text-sm text-gray-500 mb-3">
                  <div>
                    <span className="font-medium">{project.recordings}</span> recordings
                  </div>
                  <div>
                    <span className="font-medium">{project.members}</span> members
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Updated {project.lastUpdated}
                  </div>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    project.status === 'Active' ? 'bg-green-100 text-green-800' : 
                    project.status === 'Completed' ? 'bg-blue-100 text-blue-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredProjects.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FiFolder className="text-gray-400" size={28} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No projects found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search or filter to find what you&apos;re looking for.</p>
            <button 
              onClick={() => window.location.href = '/dashboard/create-project'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center"
            >
              <FiPlus size={18} className="mr-2" />
              <span>Create New Project</span>
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Projects; 