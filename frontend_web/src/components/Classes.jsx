import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiFilter, FiMoreVertical, FiPlus, FiSearch } from 'react-icons/fi';
import { MdOutlineClass } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { classService } from '../services/api';
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import ClassModal from './modals/ClassModal';

const Classes = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await classService.getClasses();
      setClasses(response.data);
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

  const handleAddClass = (newClass) => {
    setClasses([newClass, ...classes]);
  };

  // Filter classes based on search term and filter selection
  const filteredClasses = classes.filter(classItem => {
    // Apply search filter
    const matchesSearch = classItem.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          classItem.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply status filter
    if (filter === 'all') return matchesSearch;
    return matchesSearch && classItem.status?.toLowerCase() === filter.toLowerCase();
  });

  return (
    <DashboardLayout>
      <div className="pb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Classes</h1>
          <button 
            onClick={() => setIsClassModalOpen(true)}
            className="bg-[#333D79] hover:bg-[#4A5491] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <FiPlus size={20} />
            <span>Create Class</span>
          </button>
        </div>

        {/* Class Modal */}
        <ClassModal 
          isOpen={isClassModalOpen} 
          onClose={() => setIsClassModalOpen(false)} 
          onAddClass={handleAddClass}
        />

        {/* Filters and search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-center">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-[#F0F2F8] transition-colors"
              >
                <FiFilter size={18} className="text-[#4A5491]" />
                <span>Filter: {filter === 'all' ? 'All Classes' : filter}</span>
              </button>
              
              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 py-1 border border-gray-100">
                  <button
                    onClick={() => { setFilter('all'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F0F2F8]"
                  >
                    All Classes
                  </button>
                  <button
                    onClick={() => { setFilter('active'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F0F2F8]"
                  >
                    Active
                  </button>
                  <button
                    onClick={() => { setFilter('completed'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F0F2F8]"
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => { setFilter('archived'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F0F2F8]"
                  >
                    Archived
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#333D79]"></div>
            <p className="ml-3 text-gray-600">Loading classes...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((classItem) => (
                <div 
                  key={classItem.id} 
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  onClick={() => navigate(`/dashboard/class/${classItem.id}`)}
                >
                  <div className="border-b border-gray-100">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-[#EEF0F8] flex items-center justify-center">
                          <MdOutlineClass className="text-[#333D79]" size={20} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{classItem.name}</h3>
                          <p className="text-sm text-gray-500">{classItem.category || 'General'}</p>
                        </div>
                      </div>
                      <button 
                        className="p-1.5 rounded-full hover:bg-[#F0F2F8] text-gray-500 hover:text-[#333D79] transition-colors"
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
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{classItem.description}</p>
                    
                    <div className="flex justify-between text-sm text-gray-500 mb-3">
                      <div>
                        <span className="font-medium text-[#4A5491]">{classItem.recordings_count || 0}</span> recordings
                      </div>
                      <div>
                        <span className="font-medium text-[#4A5491]">{classItem.student_count || 0}</span> students
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Updated {classItem.last_updated || 'Recently'}
                      </div>
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        classItem.status === 'active' ? 'bg-[#EEF0F8] text-[#333D79]' : 
                        classItem.status === 'completed' ? 'bg-[#E6F7F0] text-[#0D9668]' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {classItem.status ? (classItem.status.charAt(0).toUpperCase() + classItem.status.slice(1)) : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredClasses.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#EEF0F8] flex items-center justify-center mx-auto mb-4">
                  <MdOutlineClass className="text-[#333D79]" size={28} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No classes found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your search or filter to find what you&apos;re looking for.</p>
                <button 
                  onClick={() => setIsClassModalOpen(true)}
                  className="bg-[#333D79] hover:bg-[#4A5491] text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center shadow-sm"
                >
                  <FiPlus size={18} className="mr-2" />
                  <span>Create New Class</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Classes; 