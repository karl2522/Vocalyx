import { useEffect, useState, useRef } from 'react';
import { FiEdit, FiMoreVertical, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import {
    MdArchive, MdArrowForward, MdOutlineCalendarToday, MdOutlineClass,
    MdOutlinePersonOutline, MdOutlineSchool, MdOutlineWatchLater
} from 'react-icons/md';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import ClassModal from './modals/ClassModal';
import { courseService, classService } from '../services/api';

// Add some animation style elements
const AnimationStyles = () => {
  return (
    <style>{`
      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      
      @keyframes shimmer {
        0% { background-position: -100% 0; }
        100% { background-position: 100% 0; }
      }
      
      .course-header {
        background: linear-gradient(120deg, #f0f4ff 0%, #e6eeff 100%);
        position: relative;
        overflow: hidden;
      }
      
      .course-header::before {
        content: "";
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
        opacity: 0.4;
        animation: shimmer 8s linear infinite;
      }
      
      .floating {
        animation: float 6s ease-in-out infinite;
      }
      
      .pulse-on-hover:hover {
        animation: pulse 1s ease-in-out;
      }
      
      .class-card {
        transition: all 0.3s ease;
        position: relative;
        z-index: 1;
        overflow: hidden;
      }
      
      .class-card::before {
        content: "";
        position: absolute;
        z-index: -1;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(120deg, #333D79 0%, #4A5491 100%);
        transform: scaleX(0);
        transform-origin: 0 50%;
        transition: transform 0.5s ease-out;
        opacity: 0.05;
      }
      
      .class-card:hover::before {
        transform: scaleX(1);
      }
      
      .class-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px -5px rgba(51, 61, 121, 0.1);
      }
      
      .empty-state-animation {
        background: linear-gradient(120deg, #f0f4ff 0%, #e6eeff 100%);
      }
      
      .placeholder-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
      }
      
      .placeholder-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        height: 160px;
        position: relative;
        overflow: hidden;
      }
      
      .placeholder-card::after {
        content: "";
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        transform: translateX(-100%);
        background-image: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0,
          rgba(255, 255, 255, 0.2) 20%,
          rgba(255, 255, 255, 0.5) 60%,
          rgba(255, 255, 255, 0)
        );
        animation: shimmer 2s infinite;
      }
    `}</style>
  );
};

const CourseDetail = ({ accessInfo }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [activeClassDropdown, setActiveClassDropdown] = useState(null);
  const [isEditClassMode, setIsEditClassMode] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);
  const dropdownRef = useRef(null);
  const [teamAccess, setTeamAccess] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [sortBy, setSortBy] = useState('date');

  // Initialize teamAccess when accessInfo changes
  useEffect(() => {
    console.log("CourseDetail received accessInfo:", accessInfo);
    
    if (accessInfo) {
      setTeamAccess({
        teamId: accessInfo.teamId,
        teamName: accessInfo.teamName,
        accessLevel: accessInfo.accessLevel
      });
    } else {
      // If no accessInfo is provided, this is likely a direct access
      setTeamAccess({
        accessLevel: 'full',
        accessType: 'owner'
      });
    }
  }, [accessInfo]);

  // Fetch course data
  const { 
    data: courseData, 
    isLoading: isLoadingCourse,
    error: courseError
  } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      console.log("Fetching course data for ID:", id);
      const response = await courseService.getCourse(id);
      console.log("Course data response:", response.data);
      
      return {
        ...response.data,
        academicYear: response.data.academic_year
      };
    },
    onError: (error) => {
      console.error('Error fetching course data:', error);
      if (error.response?.status === 404) {
        toast.error('Course not found');
        navigate('/dashboard/courses', { replace: true });
      } else if (error.response?.status === 403) {
        toast.error('You don\'t have permission to view this course');
        navigate('/dashboard/courses', { replace: true });
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login', { replace: true });
      } else {
        toast.error('Failed to load course data');
      }
    }
  });

  // Fetch classes for the course
  const { 
    data: classes = [], 
    isLoading: isLoadingClasses,
    error: classesError 
  } = useQuery({
    queryKey: ['classes', id],
    queryFn: async () => {
      const response = await courseService.getCourseClasses(id);
      console.log("Classes data response:", response.data);
      return response.data;
    },
    onError: (error) => {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load class data');
    }
  });

  // Add class mutation
  const addClassMutation = useMutation({
    mutationFn: (classData) => classService.createClass(classData),
    onSuccess: () => {
      queryClient.invalidateQueries(['classes', id]);
      toast.success('Class added successfully');
      setIsClassModalOpen(false);
    },
    onError: (error) => {
      console.error('Error adding class:', error);
      toast.error('Failed to add class');
    }
  });

  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: ({ classId, classData }) => classService.updateClass(classId, classData),
    onSuccess: () => {
      queryClient.invalidateQueries(['classes', id]);
      toast.success('Class updated successfully');
      setIsClassModalOpen(false);
      setIsEditClassMode(false);
      setCurrentClass(null);
    },
    onError: (error) => {
      console.error('Error updating class:', error);
      toast.error('Failed to update class');
    }
  });

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: (classId) => classService.deleteClass(classId),
    onSuccess: () => {
      queryClient.invalidateQueries(['classes', id]);
      toast.success('Class deleted successfully');
      setIsDeleteModalOpen(false);
      setClassToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting class:', error);
      toast.error('Failed to delete class');
      setIsDeleteModalOpen(false);
    }
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveClassDropdown(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleClassDropdown = (classId, event) => {
    if (activeClassDropdown === classId) {
      setActiveClassDropdown(null);
      setDropdownPosition(null);
      return;
    }
    
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({ top: rect.bottom, right: window.innerWidth - rect.right });
    setActiveClassDropdown(classId);
  };

  const handleEditCourse = () => {
    navigate(`/dashboard/courses/edit/${id}`);
  };

  const handleEditClass = (classItem) => {
    setCurrentClass(classItem);
    setIsEditClassMode(true);
    setIsClassModalOpen(true);
    setActiveClassDropdown(null);
  };

  const handleDeleteClass = (classId) => {
    setClassToDelete(classId);
    setIsDeleteModalOpen(true);
    setActiveClassDropdown(null);
  };

  const confirmDeleteClass = () => {
    deleteClassMutation.mutate(classToDelete);
  };

  const handleAddClass = (classData) => {
    addClassMutation.mutate(classData, {
        onSuccess: () => {
            queryClient.invalidateQueries(['classes', id]);
            toast.success('Class added successfully');
            setIsClassModalOpen(false);
        }
    });
};

  const handleUpdateClass = (updatedClass) => {
    updateClassMutation.mutate({
      classId: updatedClass.id,
      classData: updatedClass
    });
  };

  const sortClasses = (classes) => {
    if (sortBy === 'name') {
      return [...classes].sort((a, b) => a.name?.localeCompare(b.name));
    } else {
      return [...classes].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
    }
  };

  const handleUpdateClassStatus = (classId, newStatus) => {
    updateClassMutation.mutate({
      classId,
      classData: { status: newStatus }
    });
    setActiveClassDropdown(null);
  };

  const filteredClasses = sortClasses(
    classes.filter(classItem => 
      classItem.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      classItem.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Determine if we're in a loading state
  const isLoading = isLoadingCourse || isLoadingClasses;

  if (isLoading) {
    return (
      <DashboardLayout>
        <AnimationStyles />
        <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#333D79]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <MdOutlineSchool className="text-[#333D79] h-8 w-8 animate-pulse" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AnimationStyles />
      <div className="pb-6">
        {/* Header with Course Information */}
        <div className="course-header bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#333D79] opacity-5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[#6B77B7] opacity-5 rounded-full blur-3xl"></div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
            <div className="flex items-start gap-5">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#333D79] to-[#4A5491] flex items-center justify-center flex-shrink-0 shadow-lg floating">
                <MdOutlineSchool className="h-10 w-10 text-white" />
              </div>
              
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#333D79] to-[#4A5491]">
                    {courseData?.name}
                  </h1>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#f0f4ff] text-[#333D79] border border-[#e1e7ff]">
                    {courseData?.courseCode}
                  </span>
                </div>

                {teamAccess && teamAccess.teamName && (
                  <div className="inline-flex items-center px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 mt-1 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm text-blue-700">
                      Team: {teamAccess.teamName} ({teamAccess.accessLevel === 'view' ? 'View Only' : 
                            teamAccess.accessLevel === 'edit' ? 'Can Edit' : 'Full Access'})
                    </span>
                  </div>
                )}
                
                <p className="text-gray-600 mb-3 max-w-2xl">{courseData?.description || "No description available for this course."}</p>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="inline-flex items-center px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                    <MdOutlineCalendarToday className="text-[#333D79] mr-2" />
                    <span className="text-gray-700">{courseData?.semester || 'Not specified'} · {courseData?.academicYear}</span>
                  </div>
                  
                 <div className="inline-flex items-center px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                  <MdOutlinePersonOutline className="text-[#333D79] mr-2" />
                  <span className="text-gray-700">
                    {courseData?.student_count || 0} Students Enrolled
                  </span>
                </div>
                  
                  <div className="inline-flex items-center px-3 py-1.5 rounded-lg border" 
                    style={{
                      backgroundColor: courseData?.status === 'active' ? '#eefbf4' : '#f5f5f5',
                      borderColor: courseData?.status === 'active' ? '#d1f3de' : '#e5e5e5',
                      color: courseData?.status === 'active' ? '#0d7a3e' : '#6b7280'
                    }}
                  >
                    <div className={`h-2 w-2 rounded-full mr-2 ${
                      courseData?.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span>{courseData?.status ? courseData.status.charAt(0).toUpperCase() + courseData.status.slice(1) : 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              {(!teamAccess || teamAccess.accessLevel !== 'view') && (
                <button 
                  onClick={handleEditCourse} 
                  className="px-4 py-2 text-white bg-gradient-to-r from-[#333D79] to-[#4A5491] rounded-lg flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                >
                  <FiEdit size={16} />
                  <span>Edit Course</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Classes Section */}
        <div className="mb-6">
          <div className="flex flex-wrap justify-between items-center mb-4">
            <div className="flex items-center">
              <h2 className="text-2xl font-bold text-gray-800 mr-3">Classes</h2>
              <div className="px-2.5 py-1 bg-[#f0f4ff] text-[#333D79] rounded-md text-sm">
                {classes.length} total
              </div>
            </div>
            {(!teamAccess || teamAccess.accessLevel !== 'view') && (
              <button 
                onClick={() => {
                  setIsEditClassMode(false);
                  setCurrentClass(null);
                  setIsClassModalOpen(true);
                }}
                className="bg-gradient-to-r from-[#333D79] to-[#4A5491] hover:from-[#4A5491] hover:to-[#5d6ba9] text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <FiPlus size={18} />
                <span>Add Class</span>
              </button>
            )}
          </div>
          
          {/* Class Modal */}
          <ClassModal 
            isOpen={isClassModalOpen} 
            onClose={() => {
              setIsClassModalOpen(false);
              setIsEditClassMode(false);
              setCurrentClass(null);
            }} 
            onAddClass={handleAddClass}
            onUpdateClass={handleUpdateClass}
            courseId={id}
            courseName={courseData?.name}
            isEditMode={isEditClassMode}
            currentClass={currentClass}
          />
          
         {/* Search and Sort */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search classes by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent bg-gray-50"
                />
              </div>
              
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">Sort by:</span>
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button
                    type="button"
                    className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                      sortBy === 'date' 
                        ? 'bg-[#333D79] text-white border-[#333D79]' 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSortBy('date')}
                  >
                    Newest
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                      sortBy === 'name' 
                        ? 'bg-[#333D79] text-white border-[#333D79]' 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSortBy('name')}
                  >
                    A-Z
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Classes */}
            {filteredClasses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredClasses.map((classItem) => (
                  <div 
                    key={classItem.id} 
                    className="class-card bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <div className="border-b border-gray-100 bg-gradient-to-r from-[#f8f9ff] to-[#f0f4ff]">
                      <div className="flex items-center justify-between p-4">
                        <div 
                          className="flex items-center space-x-3 cursor-pointer"
                          onClick={() => navigate(`/dashboard/class/${classItem.id}`)}
                        >
                          <div className="w-10 h-10 rounded-lg bg-[#333D79] bg-opacity-10 flex items-center justify-center">
                            <MdOutlineClass className="text-[#333D79]" size={20} />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{classItem.name}</h3>
                          </div>
                        </div>
                        
                        {/* Three-dot menu button - only show for edit permissions */}
                        {(!teamAccess || teamAccess.accessLevel !== 'view') && (
                          <div className="relative">
                            <button 
                              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors dropdown-trigger"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleClassDropdown(classItem.id, e);
                              }}
                            >
                              <FiMoreVertical size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => navigate(`/dashboard/class/${classItem.id}`)}
                    >
                      <div className="flex items-center mb-3">
                        <MdOutlineWatchLater className="text-[#333D79] mr-2" size={16} />
                        <span className="text-sm text-gray-700">
                          {classItem.schedule || 'M,W,F 1:30 - 3:00PM'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <div className="inline-flex items-center px-2.5 py-1 bg-[#f0f4ff] text-[#333D79] rounded-md">
                          <MdOutlinePersonOutline className="mr-1" size={14} />
                          <span>{classItem.student_count || 0} students</span>
                        </div>
                        
                        <button className="text-[#333D79] inline-flex items-center hover:underline">
                          <span className="mr-1">View details</span>
                          <MdArrowForward size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Fixed position dropdown menu - outside the loop but inside the main container */}
                {activeClassDropdown !== null && dropdownPosition && (
                  <div 
                    className="fixed bg-white rounded-md shadow-lg z-50 py-1 border border-gray-100 w-48"
                    style={{ 
                      top: `${dropdownPosition.top}px`, 
                      right: `${dropdownPosition.right}px` 
                    }}
                  >
                    <button 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        const classItem = filteredClasses.find(c => c.id === activeClassDropdown);
                        handleEditClass(classItem);
                      }}
                    >
                      <FiEdit className="mr-2" size={14} />
                      Edit Class
                    </button>
                    
                    {filteredClasses.find(c => c.id === activeClassDropdown)?.status !== 'completed' && (
                      <button 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateClassStatus(activeClassDropdown, 'completed');
                        }}
                      >
                        <MdOutlineClass className="mr-2" size={14} />
                        Mark as Completed
                      </button>
                    )}
                    
                    {filteredClasses.find(c => c.id === activeClassDropdown)?.status !== 'archived' && (
                      <button 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateClassStatus(activeClassDropdown, 'archived');
                        }}
                      >
                        <MdArchive className="mr-2" size={14} />
                        Archive Class
                      </button>
                    )}
                    
                    {filteredClasses.find(c => c.id === activeClassDropdown)?.status !== 'active' && (
                      <button 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateClassStatus(activeClassDropdown, 'active');
                        }}
                      >
                        <MdOutlineClass className="mr-2" size={14} />
                        Set as Active
                      </button>
                    )}
                    
                    <div className="border-t border-gray-100 my-1"></div>
                    
                    <button 
                      className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(activeClassDropdown);
                      }}
                    >
                      <FiTrash2 className="mr-2" size={14} />
                      Delete Class
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state-animation bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#333D79] opacity-5 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[#6B77B7] opacity-5 rounded-full blur-3xl"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse opacity-30"></div>
                
                <div className="relative z-10 max-w-lg mx-auto">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#333D79] to-[#4A5491] flex items-center justify-center floating shadow-lg">
                        <MdOutlineClass className="text-white" size={40} />
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
                        <FiPlus className="text-[#333D79]" size={20} />
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No classes in this course yet</h3>
                  <p className="text-gray-600 mb-8 mx-auto">
                    Create your first class to start managing your course content, schedule sessions, track attendance and monitor student progress.
                  </p>
                  
                  {(!teamAccess || teamAccess.accessLevel !== 'view') && (
                    <div className="inline-flex space-x-3">
                      <button 
                        onClick={() => {
                          setIsEditClassMode(false);
                          setCurrentClass(null);
                          setIsClassModalOpen(true);
                        }}
                        className="bg-gradient-to-r from-[#333D79] to-[#4A5491] hover:from-[#4A5491] hover:to-[#5d6ba9] text-white px-6 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-105 inline-flex items-center"
                      >
                        <FiPlus size={18} className="mr-2" />
                        <span className="font-medium">Create First Class</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4 animate-fade-in-up">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <FiTrash2 className="text-red-500" size={24} />
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-center mb-2">Delete Class</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete this class? This action cannot be undone.
            </p>
            
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteClass}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CourseDetail;