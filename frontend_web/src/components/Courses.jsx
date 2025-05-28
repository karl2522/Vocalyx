import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { FiBook, FiEdit, FiFilter, FiMoreVertical, FiPlus, FiSearch, FiTrash2, FiUsers } from 'react-icons/fi';
import { MdArchive, MdOutlineSchool } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';
import { commonHeaderAnimations } from '../utils/animation.js';
import { showToast } from '../utils/toast.jsx';
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import CourseModal from './modals/CourseModal';

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, courseName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[999] flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="mb-4 flex items-center">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Delete Course</h3>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete <span className="font-medium text-gray-900">{courseName}</span>? This action cannot be undone.
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// PropTypes validation
DeleteConfirmationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  courseName: PropTypes.string
};

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
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('my-teams');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showTeamFilterDropdown, setShowTeamFilterDropdown] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  
  // Replace useState and useEffect with useQuery
  const { 
    data: courses = [], 
    isLoading
  } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await courseService.getCourses();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
    onError: (error) => {
      console.error('Error fetching courses:', error);
      if (error.response?.status === 401) {
        showToast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        showToast.error('Failed to load courses');
      }
    }
  });
  
  // Setup mutations for adding, updating, and deleting courses
  const addCourseMutation = useMutation({
    mutationFn: (courseData) => courseService.createCourse(courseData),
    onSuccess: () => {
      queryClient.invalidateQueries(['courses']);
      showToast.created('Course');
    },
    onError: (error) => {
      console.error('Error adding course:', error);
      showToast.error('Failed to add course');
    }
  });
  
  const updateCourseMutation = useMutation({
    mutationFn: ({ id, courseData }) => courseService.updateCourse(id, courseData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['courses']);
      if (variables.courseData.status) {
        showToast.updated(`Course status to ${variables.courseData.status}`);
      } else {
        showToast.updated('Course');
      }
      setUpdatingStatusId(null);
    },
    onError: (error) => {
      console.error('Error updating course:', error);
      showToast.error('Failed to update course');
      setUpdatingStatusId(null);
    }
  });
  
  const deleteCourseMutation = useMutation({
    mutationFn: (id) => courseService.deleteCourse(id),
    onMutate: () => {
      setIsDeleting(true);
      setIsDeleteModalOpen(false); // Close the modal immediately when deletion starts
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['courses']);
      showToast.deleted('Course');
      setIsDeleting(false);
      setCourseToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting course:', error);
      
      if (error.response?.status === 404) {
        showToast.error('Course not found or you do not have permission to delete it.');
      } else if (error.response?.status === 403) {
        showToast.error('You do not have permission to delete this course.');
      } else {
        showToast.error('Failed to delete course');
      }
      
      setIsDeleting(false);
      setCourseToDelete(null);
    }
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.dropdown-trigger')) {
        setActiveDropdown(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  useEffect(() => {
    const handleScroll = () => {
      if (activeDropdown) {
        setActiveDropdown(null);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeDropdown]);

  const handleAddCourse = (newCourse) => {
    addCourseMutation.mutate(newCourse);
  };

  const handleEditCourse = (course) => {
    setCurrentCourse(course);
    setIsEditMode(true);
    setIsCourseModalOpen(true);
    setActiveDropdown(null);
  };

  const handleUpdateCourse = (updatedCourse) => {
    updateCourseMutation.mutate({
      id: updatedCourse.id, 
      courseData: updatedCourse
    });
  };

  const handleUpdateStatus = async (courseId, newStatus) => {
    setUpdatingStatusId(courseId);
    setActiveDropdown(null);
    updateCourseMutation.mutate({
      id: courseId, 
      courseData: { status: newStatus }
    });
  };
  
  const handleDeleteCourse = (course) => {
    setCourseToDelete(course);
    setIsDeleteModalOpen(true);
    setActiveDropdown(null);
  };

  const confirmDeleteCourse = () => {
    deleteCourseMutation.mutate(courseToDelete.id);
  };

  const toggleDropdown = (courseId) => {
    if (activeDropdown === courseId) {
      setActiveDropdown(null);
      return;
    }
    
    setActiveDropdown(courseId);
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
        {isLoading ? (
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
                    className={`course-card relative bg-white rounded-lg shadow-sm ${getCourseStatusClasses(course.status)} overflow-hidden`}
                  >
                    {(!course.accessLevel || course.accessLevel !== 'view') && (
                      <div className="absolute right-2 top-2 flex space-x-1 z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCourse(course);
                          }}
                          className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600"
                          title="Edit Course"
                          disabled={updatingStatusId === course.id || isDeleting}
                        >
                          <FiEdit size={14} />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCourse(course);
                          }}
                          className="p-2 rounded-md bg-red-50 hover:bg-red-100 text-red-500"
                          title="Delete Course"
                          disabled={updatingStatusId === course.id || isDeleting}
                        >
                          <FiTrash2 size={14} />
                        </button>
                        
                        <div className="relative dropdown-trigger">
                          {updatingStatusId === course.id ? (
                            <div className="p-2 rounded-md bg-gray-100 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#333D79] border-t-transparent"></div>
                            </div>
                          ) : (
                            <button
                              className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDropdown(course.id);
                              }}
                              title="More Options"
                              disabled={isDeleting}
                            >
                              <FiMoreVertical size={14} />
                            </button>
                          )}
                          
                          {activeDropdown === course.id && (
                            <div 
                              className="absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg py-1 border border-gray-100 w-48 z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {course.status !== 'completed' && (
                                <button 
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(course.id, 'completed');
                                  }}
                                >
                                  <FiBook className="mr-2" size={14} />
                                  Mark as Completed
                                </button>
                              )}
                              
                              {course.status !== 'archived' && (
                                <button 
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(course.id, 'archived');
                                  }}
                                >
                                  <MdArchive className="mr-2" size={14} />
                                  Archive Course
                                </button>
                              )}
                              
                              {course.status !== 'active' && (
                                <button 
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(course.id, 'active');
                                  }}
                                >
                                  <FiBook className="mr-2" size={14} />
                                  Set as Active
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="p-5">
                      <div className="flex items-center mb-3 pr-20"> {/* Add right padding to make room for action buttons */}
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

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDeleteCourse}
          courseName={courseToDelete?.name || ''}
        />
        
        {/* Loading Indicator for Delete Operation - Centered on screen */}
        {isDeleting && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1000] backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full animate-fadeIn">
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="w-16 h-16 border-4 border-red-100 border-t-red-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Deleting Course</h3>
                <p className="text-gray-500 text-center mb-2">Please wait while we delete the course...</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Courses;