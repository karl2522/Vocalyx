import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiBook, FiFilter, FiMoreVertical, FiPlus, FiSearch, FiUsers } from 'react-icons/fi';
import { MdOutlineSchool } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { classService } from '../services/api';
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import CourseModal from './modals/CourseModal';

// Animation styles component
const AnimationStyles = () => {
  return (
    <style>{`
      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
      }
      
      .course-card {
        transition: all 0.3s ease;
        border: 1px solid #f1f1f1;
      }
      
      .course-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }
      
      .floating {
        animation: float 6s ease-in-out infinite;
      }
      
      .course-header {
        background-color: #f9fafb;
      }
    `}</style>
  );
};

const Courses = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      // This would need to be updated with an actual API call for courses
      // For now, we'll use the existing classes endpoint for demo purposes
      const response = await classService.getClasses();
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error('Failed to load courses');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = (newCourse) => {
    setCourses([newCourse, ...courses]);
  };

  // Filter courses based on search term and filter selection
  const filteredCourses = courses.filter(course => {
    // Apply search filter
    const matchesSearch = course.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.courseCode?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply status filter
    if (filter === 'all') return matchesSearch;
    return matchesSearch && course.status?.toLowerCase() === filter.toLowerCase();
  });

  // Function to determine if a course is active, completed, or archived
  const getCourseStatusClasses = (status) => {
    switch(status?.toLowerCase()) {
      case 'active':
        return 'border-l-4 border-l-emerald-500';
      case 'completed':
        return 'border-l-4 border-l-blue-500';
      case 'archived':
        return 'border-l-4 border-l-gray-400';
      default:
        return 'border-l-4 border-l-gray-200';
    }
  };

  return (
    <DashboardLayout>
      <AnimationStyles />
      <div className="pb-6">
        <div className="course-header bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-[#333D79] flex items-center justify-center flex-shrink-0">
                <MdOutlineSchool className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Your Courses</h1>
                <p className="text-gray-600 text-sm mt-1">Manage and organize your academic courses</p>
              </div>
            </div>
            <button 
              onClick={() => setIsCourseModalOpen(true)}
              className="bg-[#333D79] hover:bg-[#4A5491] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FiPlus size={18} />
              <span>Add Course</span>
            </button>
          </div>
        </div>

        {/* Course Modal */}
        <CourseModal 
          isOpen={isCourseModalOpen} 
          onClose={() => setIsCourseModalOpen(false)} 
          onAddCourse={handleAddCourse}
        />

        {/* Filters and search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-center">
            <div className="relative flex-1">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by course name, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent bg-gray-50"
              />
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center space-x-2 px-5 py-3 border border-gray-200 rounded-xl hover:bg-[#F0F2F8] transition-all shadow-sm"
              >
                <FiFilter size={18} className="text-[#4A5491]" />
                <span className="text-gray-700 font-medium">
                  {filter === 'all' ? 'All Courses' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </span>
              </button>
              
              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg z-50 py-2 border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => { setFilter('all'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-[#F0F2F8] flex items-center"
                  >
                    <span className="w-3 h-3 rounded-full bg-gray-400 mr-3"></span>
                    All Courses
                  </button>
                  <button
                    onClick={() => { setFilter('active'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-[#F0F2F8] flex items-center"
                  >
                    <span className="w-3 h-3 rounded-full bg-green-500 mr-3"></span>
                    Active
                  </button>
                  <button
                    onClick={() => { setFilter('completed'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-[#F0F2F8] flex items-center"
                  >
                    <span className="w-3 h-3 rounded-full bg-blue-500 mr-3"></span>
                    Completed
                  </button>
                  <button
                    onClick={() => { setFilter('archived'); setShowFilterDropdown(false); }}
                    className="block w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-[#F0F2F8] flex items-center"
                  >
                    <span className="w-3 h-3 rounded-full bg-gray-600 mr-3"></span>
                    Archived
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center">
            <div className="w-12 h-12 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-4">
              <MdOutlineSchool className="text-[#333D79]" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Courses</p>
              <h3 className="text-xl font-bold text-gray-800">{courses.length}</h3>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center">
            <div className="w-12 h-12 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-4">
              <FiBook className="text-[#333D79]" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Active Courses</p>
              <h3 className="text-xl font-bold text-gray-800">
                {courses.filter(course => course.status === 'active').length}
              </h3>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center">
            <div className="w-12 h-12 rounded-lg bg-[#EEF0F8] flex items-center justify-center mr-4">
              <FiUsers className="text-[#333D79]" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Students</p>
              <h3 className="text-xl font-bold text-gray-800">
                {courses.reduce((total, course) => total + (course.student_count || 0), 0)}
              </h3>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#333D79]"></div>
          </div>
        ) : (
          <>
            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <div 
                    key={course.id} 
                    className={`course-card bg-white rounded-lg shadow-sm ${getCourseStatusClasses(course.status)} overflow-hidden cursor-pointer`}
                    onClick={() => navigate(`/dashboard/course/${course.id}`)}
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                            <MdOutlineSchool className="text-[#333D79]" size={20} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{course.name}</h3>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500">{course.courseCode || 'No Code'}</span>
                              <span className="h-1 w-1 bg-gray-300 rounded-full"></span>
                              <span className="text-sm text-gray-500">{course.semester || 'No Semester'}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <button 
                            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Add dropdown menu functionality here
                            }}
                          >
                            <FiMoreVertical size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 h-10">
                        {course.description || 'No description available for this course.'}
                      </p>
                      
                      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center text-gray-600">
                            <FiBook className="text-gray-400 mr-1.5" size={14} />
                            <span className="text-sm">{course.classes_count || 0}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <FiUsers className="text-gray-400 mr-1.5" size={14} />
                            <span className="text-sm">{course.student_count || 0}</span>
                          </div>
                        </div>
                        
                        <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                          course.status === 'active' ? 'text-emerald-700 bg-emerald-50' : 
                          course.status === 'completed' ? 'text-blue-700 bg-blue-50' : 
                          'text-gray-600 bg-gray-100'
                        }`}>
                          {course.status ? (course.status.charAt(0).toUpperCase() + course.status.slice(1)) : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
                <div className="max-w-lg mx-auto">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                      <MdOutlineSchool className="text-[#333D79]" size={28} />
                    </div>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No courses found</h3>
                  <p className="text-gray-600 mb-6 mx-auto">
                    {searchTerm ? 
                      'No courses match your search criteria. Try adjusting your filters or search terms.' : 
                      'Get started by creating your first course to organize your classes.'}
                  </p>
                  
                  <button 
                    onClick={() => setIsCourseModalOpen(true)}
                    className="bg-[#333D79] hover:bg-[#4A5491] text-white px-4 py-2 rounded-lg inline-flex items-center transition-colors"
                  >
                    <FiPlus size={16} className="mr-2" />
                    <span>Create Course</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Courses; 