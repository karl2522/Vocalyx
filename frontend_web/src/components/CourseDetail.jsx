import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { FiEdit, FiMoreVertical, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import {
    MdArchive, MdArrowForward, MdOutlineCalendarToday, MdOutlineClass,
    MdOutlinePersonOutline, MdOutlineSchool, MdOutlineWatchLater
} from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import ClassModal from './modals/ClassModal';
import { courseService, classService } from '../services/api';
import { showToast } from '../utils/toast.jsx';

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

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [courseData, setCourseData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeClassDropdown, setActiveClassDropdown] = useState(null);
  const [isEditClassMode, setIsEditClassMode] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);
  const dropdownRef = useRef(null);

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

  useEffect(() => {
    fetchCourseData();
  }, [id]);

  const toggleClassDropdown = (classId) => {
    setActiveClassDropdown(activeClassDropdown === classId ? null : classId);
  };

  const handleEditClass = (classItem) => {
    setCurrentClass(classItem);
    setIsEditClassMode(true);
    setIsClassModalOpen(true);
    setActiveClassDropdown(null);
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }
    
    try {
      await classService.deleteClass(classId);
      setClasses(classes.filter(c => c.id !== classId));
      showToast.success('Class deleted successfully');

      fetchCourseData();
    } catch (error) {
      console.error('Error deleting class:', error);
      showToast.error('Failed to delete class');
    } finally {
      setActiveClassDropdown(null);
    }
  };

  const handleUpdateClass = (updatedClass) => {
    setClasses(classes.map(c => 
      c.id === updatedClass.id ? updatedClass : c
    ));

    fetchCourseData();
  };

  const handleUpdateClassStatus = async (classId, newStatus) => {
    try {
      const classToUpdate = classes.find(c => c.id === classId);
      if (!classToUpdate) return;
      
      await classService.updateClass(classId, { status: newStatus });
      
      setClasses(classes.map(c => 
        c.id === classId ? { ...c, status: newStatus } : c
      ));
      
      showToast.success(`Class marked as ${newStatus}`);
    } catch (error) {
      console.error(`Error updating class status:`, error);
      showToast.error('Failed to update class status');
    } finally {
      setActiveClassDropdown(null);
    }
  };

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      
      const response = await courseService.getCourse(id);
      setCourseData({
        ...response.data,
        academicYear: response.data.academic_year
      });
      
      const classesResponse = await courseService.getCourseClasses(id);
      setClasses(classesResponse.data);
      
    } catch (error) {
      console.error('Error fetching course data:', error);
      if (error.response?.status === 404) {
        toast.error('Course not found');
        navigate('/dashboard/courses', { replace: true });
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login', { replace: true });
      } else {
        toast.error('Failed to load course data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = (newClass) => {
    // In a real implementation, the class would be linked to the course
    const classWithCourseId = {
      ...newClass,
      course_id: id
    };
    setClasses([classWithCourseId, ...classes]);

    fetchCourseData();
  };

  const filteredClasses = classes.filter(classItem => 
    classItem.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    classItem.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
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
              <button className="px-4 py-2 text-white bg-gradient-to-r from-[#333D79] to-[#4A5491] rounded-lg flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
                <FiEdit size={16} />
                <span>Edit Course</span>
              </button>
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
          
          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search classes by name, section, date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent bg-gray-50"
              />
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
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Section:</span> {classItem.section || 'A'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Three-dot menu button */}
                      <div className="relative" ref={dropdownRef}>
                        <button 
                          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleClassDropdown(classItem.id);
                          }}
                        >
                          <FiMoreVertical size={16} />
                        </button>
                        
                        {/* Dropdown menu */}
                        {activeClassDropdown === classItem.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 py-1 border border-gray-100">
                            <button 
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClass(classItem);
                              }}
                            >
                              <FiEdit className="mr-2" size={14} />
                              Edit Class
                            </button>
                            
                            {classItem.status !== 'completed' && (
                              <button 
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateClassStatus(classItem.id, 'completed');
                                }}
                              >
                                <MdOutlineClass className="mr-2" size={14} />
                                Mark as Completed
                              </button>
                            )}
                            
                            {classItem.status !== 'archived' && (
                              <button 
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateClassStatus(classItem.id, 'archived');
                                }}
                              >
                                <MdArchive className="mr-2" size={14} />
                                Archive Class
                              </button>
                            )}
                            
                            {classItem.status !== 'active' && (
                              <button 
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateClassStatus(classItem.id, 'active');
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
                                handleDeleteClass(classItem.id);
                              }}
                            >
                              <FiTrash2 className="mr-2" size={14} />
                              Delete Class
                            </button>
                          </div>
                        )}
                      </div>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourseDetail;