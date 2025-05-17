import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiBook, FiEdit, FiFilter, FiMoreVertical, FiPlus, FiSearch, FiTrash2, FiUsers } from 'react-icons/fi';
import { MdArchive, MdOutlineSchool } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';
import { commonHeaderAnimations } from '../utils/animation.js';
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import CourseModal from './modals/CourseModal';

// Animation styles component - optimized to prevent flickering
const CoursesStyles = () => {
  const styles = useMemo(() => `
    ${commonHeaderAnimations}
    
    .course-card {
      transition: all 0.3s ease;
      border: 1px solid #f1f1f1;
      will-change: transform, box-shadow;
    }
    
    .course-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    
    .course-header {
      background-color: #f9fafb;
    }
  `, []);
  
  return <style>{styles}</style>;
};

const Courses = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('my-teams'); // 'my-teams' or 'all-teams'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showTeamFilterDropdown, setShowTeamFilterDropdown] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchCourses();
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

    useEffect(() => {
    const refreshCoursesOnFocus = () => {
      fetchCourses();
    };
    
    window.addEventListener('focus', refreshCoursesOnFocus);
    return () => {
      window.removeEventListener('focus', refreshCoursesOnFocus);
    };
  }, []);


  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await courseService.getCourses();
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

  const handleEditCourse = (course) => {
    setCurrentCourse(course);
    setIsEditMode(true);
    setIsCourseModalOpen(true);
    setActiveDropdown(null);
  };

  const handleUpdateCourse = (updatedCourse) => {
    setCourses(courses.map(course => 
      course.id === updatedCourse.id ? updatedCourse : course
    ));
  };

  const handleUpdateStatus = async (courseId, newStatus) => {
    try {
      const courseToUpdate = courses.find(course => course.id === courseId);
      if (!courseToUpdate) return;
      
      await courseService.updateCourse(courseId, { status: newStatus });
      
      setCourses(courses.map(course => 
        course.id === courseId ? { ...course, status: newStatus } : course
      ));
      
      toast.success(`Course marked as ${newStatus}`);
    } catch (error) {
      console.error(`Error updating course status:`, error);
      toast.error('Failed to update course status');
    } finally {
      setActiveDropdown(null);
    }
  };
  
  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    
    try {
      await courseService.deleteCourse(courseId);
      setCourses(courses.filter(course => course.id !== courseId));
      toast.success('Course deleted successfully');
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    } finally {
      setActiveDropdown(null);
    }
  };

  const toggleDropdown = (courseId) => {
    setActiveDropdown(activeDropdown === courseId ? null : courseId);
  };

  // Filter courses based on search term, filter selection, and team filter
  const filteredCourses = courses.filter(course => {
    // Apply search filter
    const matchesSearch = course.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.courseCode?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply status filter
    const matchesStatus = filter === 'all' ? true : 
                         (course.status?.toLowerCase() === filter.toLowerCase());
    
    // Apply team filter - this is a placeholder as we don't have actual team data
    // In a real application, you would filter based on team membership
    const matchesTeam = teamFilter === 'all-teams' ? true : 
                        (course.is_member === undefined ? true : course.is_member);
    
    return matchesSearch && matchesStatus && matchesTeam;
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

  useEffect(() => {
  console.log("Current courses with access levels:", courses.map(c => ({
    id: c.id,
    name: c.name,
    accessLevel: c.accessLevel
  })));
}, [courses]);

  return (
    <DashboardLayout>
      <CoursesStyles />
      <div className="pb-6">
        {/* Header Section */}
        <div className="hero-gradient rounded-xl mb-8 p-5 shadow-sm border border-gray-100 overflow-hidden relative">
          {/* Background Elements */}
          <div className="bg-blur-circle bg-blur-circle-top"></div>
          <div className="bg-blur-circle bg-blur-circle-bottom"></div>
          <div className="bg-floating-circle hidden md:block"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
            <div className="flex items-center gap-4 fade-in-up" style={{animationDelay: '0s'}}>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-[#333D79] to-[#4A5491] flex items-center justify-center flex-shrink-0 shadow-md float-animation">
                <MdOutlineSchool className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Your Courses</h1>
                <p className="text-gray-600">Manage and organize your academic courses</p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setIsEditMode(false);
                setCurrentCourse(null);
                setIsCourseModalOpen(true);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 mt-4 md:mt-0 fade-in-up group"
              style={{animationDelay: '0s'}}
            >
              <FiPlus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              <span>Add Course</span>
            </button>
          </div>
        </div>

        {/* Course Modal */}
        <CourseModal 
          isOpen={isCourseModalOpen} 
          onClose={() => {
            setIsCourseModalOpen(false);
            setIsEditMode(false);
            setCurrentCourse(null);
          }} 
          onAddCourse={handleAddCourse}
          onUpdateCourse={handleUpdateCourse}
          isEditMode={isEditMode}
          currentCourse={currentCourse}
        />

        {/* Filters and search - updated with team filter */}
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
            
            <div className="flex gap-3">
              {/* Status Filter */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowFilterDropdown(!showFilterDropdown);
                    setShowTeamFilterDropdown(false);
                  }}
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
              
              {/* Team Filter */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowTeamFilterDropdown(!showTeamFilterDropdown);
                    setShowFilterDropdown(false);
                  }}
                  className="flex items-center space-x-2 px-5 py-3 border border-gray-200 rounded-xl hover:bg-[#F0F2F8] transition-all shadow-sm"
                >
                  <FiUsers size={18} className="text-[#4A5491]" />
                  <span className="text-gray-700 font-medium">
                    {teamFilter === 'my-teams' ? 'My Teams' : 'All Teams'}
                  </span>
                </button>
                
                {showTeamFilterDropdown && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg z-50 py-2 border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => { setTeamFilter('my-teams'); setShowTeamFilterDropdown(false); }}
                      className="block w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-[#F0F2F8] flex items-center"
                    >
                      <span className="w-3 h-3 rounded-full bg-[#4A5491] mr-3"></span>
                      My Teams
                    </button>
                    <button
                      onClick={() => { setTeamFilter('all-teams'); setShowTeamFilterDropdown(false); }}
                      className="block w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-[#F0F2F8] flex items-center"
                    >
                      <span className="w-3 h-3 rounded-full bg-gray-400 mr-3"></span>
                      All Teams
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section - remains the same... */}
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

        {/* Courses Grid - updated with dropdown menu */}
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
                    className={`course-card bg-white rounded-lg shadow-sm ${getCourseStatusClasses(course.status)} overflow-hidden`}
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center cursor-pointer" onClick={() => navigate(`/dashboard/course/${course.id}`)}>
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
                        {(!course.accessLevel || course.accessLevel !== 'view') && (
                          <div className="relative" ref={dropdownRef}>
                            <button 
                              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDropdown(course.id);
                              }}
                            >
                              <FiMoreVertical size={16} />
                            </button>
                            
                            {activeDropdown === course.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 py-1 border border-gray-100">
                                <button 
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  onClick={() => handleEditCourse(course)}
                                >
                                  <FiEdit className="mr-2" size={14} />
                                  Edit Course
                                </button>
                                
                                {course.status !== 'completed' && (
                                  <button 
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                    onClick={() => handleUpdateStatus(course.id, 'completed')}
                                  >
                                    <FiBook className="mr-2" size={14} />
                                    Mark as Completed
                                  </button>
                                )}
                                
                                {course.status !== 'archived' && (
                                  <button 
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                    onClick={() => handleUpdateStatus(course.id, 'archived')}
                                  >
                                    <MdArchive className="mr-2" size={14} />
                                    Archive Course
                                  </button>
                                )}
                                
                                {course.status !== 'active' && (
                                  <button 
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                    onClick={() => handleUpdateStatus(course.id, 'active')}
                                  >
                                    <FiBook className="mr-2" size={14} />
                                    Set as Active
                                  </button>
                                )}
                                
                                <div className="border-t border-gray-100 my-1"></div>
                                
                                <button 
                                  className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                                  onClick={() => handleDeleteCourse(course.id)}
                                >
                                  <FiTrash2 className="mr-2" size={14} />
                                  Delete Course
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div 
                        className="text-sm text-gray-600 mb-4 line-clamp-2 h-10 cursor-pointer" 
                        onClick={() => navigate(`/dashboard/course/${course.id}`)}
                      >
                        {course.description || 'No description available for this course.'}
                      </div>
                      
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
                    onClick={() => {
                      setIsEditMode(false);
                      setCurrentCourse(null);
                      setIsCourseModalOpen(true);
                    }}
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