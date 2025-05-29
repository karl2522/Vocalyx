import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { FiEdit, FiFilter, FiMoreVertical, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import { MdArchive, MdOutlineClass } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { classService } from '../services/api';
import { showToast } from '../utils/toast.jsx';
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import ClassModal from './modals/ClassModal';

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, className }) => {
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
            <h3 className="text-lg font-medium text-gray-900">Delete Class</h3>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete <span className="font-medium text-gray-900">{className}</span>? This action cannot be undone.
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
  className: PropTypes.string
};

const Classes = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const dropdownRef = useRef(null);

  // useQuery for fetching classes - exactly like Courses.js
  const {
    data: classes = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await classService.getClasses();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
    retry: 1,
    onError: (error) => {
      console.error('Error fetching classes:', error);
      if (error.response?.status === 401) {
        showToast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        showToast.error('Failed to load classes');
      }
    }
  });

  // Add Class Mutation
  const addClassMutation = useMutation({
    mutationFn: (classData) => classService.createClass(classData),
    onSuccess: () => {
      queryClient.invalidateQueries(['classes']);
      showToast.created('Class');
    },
    onError: (error) => {
      console.error('Error adding class:', error);
      showToast.error('Failed to add class');
    }
  });

  // Update Class Mutation
  const updateClassMutation = useMutation({
    mutationFn: ({ id, classData }) => classService.updateClass(id, classData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['classes']);
      if (variables.classData.status) {
        showToast.updated(`Class status to ${variables.classData.status}`);
      } else {
        showToast.updated('Class');
      }
      setUpdatingStatusId(null);
    },
    onError: (error) => {
      console.error('Error updating class:', error);
      showToast.error('Failed to update class');
      setUpdatingStatusId(null);
    }
  });

  // Delete Class Mutation - EXACTLY like Courses.js
  const deleteClassMutation = useMutation({
    mutationFn: (id) => classService.deleteClass(id),
    onMutate: () => {
      console.log('Delete mutation started - setting isDeleting to true');
      setIsDeleting(true);
      setIsDeleteModalOpen(false); // Close the modal immediately when deletion starts
    },
    onSuccess: () => {
      console.log('Delete mutation successful');
      queryClient.invalidateQueries(['classes']);
      showToast.deleted('Class');
      setIsDeleting(false);
      setClassToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting class:', error);

      if (error.response?.status === 404) {
        showToast.error('Class not found or you do not have permission to delete it.');
      } else if (error.response?.status === 403) {
        showToast.error('You do not have permission to delete this class.');
      } else {
        showToast.error('Failed to delete class');
      }

      setIsDeleting(false);
      setClassToDelete(null);
    }
  });

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
      if (activeDropdown && !event.target.closest('.dropdown-trigger')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  // Handle scroll to close dropdowns
  useEffect(() => {
    const handleScroll = () => {
      if (activeDropdown) {
        setActiveDropdown(null);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeDropdown]);

  const handleAddClass = (newClass) => {
    addClassMutation.mutate(newClass);
  };

  const handleEditClass = (classItem) => {
    setCurrentClass(classItem);
    setIsEditMode(true);
    setIsClassModalOpen(true);
    setActiveDropdown(null);
  };

  const handleUpdateClass = (updatedClass) => {
    updateClassMutation.mutate({
      id: updatedClass.id,
      classData: updatedClass
    });
  };

  const handleUpdateStatus = (classId, newStatus) => {
    setUpdatingStatusId(classId);
    setActiveDropdown(null);
    updateClassMutation.mutate({
      id: classId,
      classData: { status: newStatus }
    });
  };

  const handleDeleteClass = (classItem) => {
    console.log('Setting class to delete:', classItem);
    setClassToDelete(classItem);
    setIsDeleteModalOpen(true);
    setActiveDropdown(null);
  };

  const confirmDeleteClass = () => {
    console.log('Confirming delete for class:', classToDelete);
    if (!classToDelete) {
      console.log('No class to delete');
      return;
    }
    console.log('Calling delete mutation with ID:', classToDelete.id);
    deleteClassMutation.mutate(classToDelete.id);
  };

  const toggleDropdown = (classId) => {
    if (activeDropdown === classId) {
      setActiveDropdown(null);
      return;
    }

    setActiveDropdown(classId);
  };

  const filteredClasses = classes.filter(classItem => {
    const matchesSearch = classItem.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        classItem.description?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === 'all') return matchesSearch;
    return matchesSearch && classItem.status?.toLowerCase() === filter.toLowerCase();
  });

  // Debug logging
  console.log('Classes component render - isDeleting:', isDeleting);
  console.log('Classes component render - classToDelete:', classToDelete);

  return (
      <DashboardLayout>
        <div className="pb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Classes</h1>
            <button
                onClick={() => {
                  setIsEditMode(false);
                  setCurrentClass(null);
                  setIsClassModalOpen(true);
                }}
                className="bg-[#333D79] hover:bg-[#4A5491] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
              <FiPlus size={20} />
              <span>Create Class</span>
            </button>
          </div>

          {/* Class Modal */}
          <ClassModal
              isOpen={isClassModalOpen}
              onClose={() => {
                setIsClassModalOpen(false);
                setIsEditMode(false);
                setCurrentClass(null);
              }}
              onAddClass={handleAddClass}
              onUpdateClass={handleUpdateClass}
              isEditMode={isEditMode}
              currentClass={currentClass}
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
                  <span>Filter: {filter === 'all' ? 'All Classes' : filter.charAt(0).toUpperCase() + filter.slice(1)}</span>
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
          {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#333D79]"></div>
              </div>
          ) : (
              <>
                {filteredClasses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredClasses.map((classItem) => (
                          <div
                              key={classItem.id}
                              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 transform hover:-translate-y-1"
                          >
                            <div className="border-b border-gray-100">
                              <div className="flex items-center justify-between p-4">
                                <div
                                    className="flex items-center space-x-3 cursor-pointer"
                                    onClick={() => navigate(`/dashboard/class/${classItem.id}`)}
                                >
                                  <div className="w-10 h-10 rounded-lg bg-[#EEF0F8] flex items-center justify-center">
                                    <MdOutlineClass className="text-[#333D79]" size={20} />
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-gray-900">{classItem.name}</h3>
                                    <p className="text-sm text-gray-500">{classItem.category || 'General'}</p>
                                  </div>
                                </div>
                                <div className="relative dropdown-trigger" ref={dropdownRef}>
                                  {/* Show loading spinner when updating status for this class */}
                                  {updatingStatusId === classItem.id ? (
                                      <div className="p-1.5 rounded-full">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#333D79] border-t-transparent"></div>
                                      </div>
                                  ) : (
                                      <button
                                          className="p-1.5 rounded-full hover:bg-[#F0F2F8] text-gray-500 hover:text-[#333D79] transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleDropdown(classItem.id);
                                          }}
                                          disabled={isDeleting}
                                      >
                                        <FiMoreVertical size={18} />
                                      </button>
                                  )}

                                  {/* Dropdown Menu */}
                                  {activeDropdown === classItem.id && (
                                      <div
                                          className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 py-1 border border-gray-100"
                                          onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                            onClick={() => handleEditClass(classItem)}
                                        >
                                          <FiEdit className="mr-2" size={14} />
                                          Edit Class
                                        </button>

                                        {classItem.status !== 'completed' && (
                                            <button
                                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleUpdateStatus(classItem.id, 'completed');
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
                                                  handleUpdateStatus(classItem.id, 'archived');
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
                                                  handleUpdateStatus(classItem.id, 'active');
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
                                              handleDeleteClass(classItem);
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
                              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{classItem.description || 'No description available.'}</p>

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
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                      <div className="w-16 h-16 rounded-full bg-[#EEF0F8] flex items-center justify-center mx-auto mb-4">
                        <MdOutlineClass className="text-[#333D79]" size={28} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No classes found</h3>
                      <p className="text-gray-500 mb-4">Try adjusting your search or filter to find what you&apos;re looking for.</p>
                      <button
                          onClick={() => {
                            setIsEditMode(false);
                            setCurrentClass(null);
                            setIsClassModalOpen(true);
                          }}
                          className="bg-[#333D79] hover:bg-[#4A5491] text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center shadow-sm"
                      >
                        <FiPlus size={18} className="mr-2" />
                        <span>Create New Class</span>
                      </button>
                    </div>
                )}
              </>
          )}

          {/* Delete Confirmation Modal */}
          <DeleteConfirmationModal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              onConfirm={confirmDeleteClass}
              className={classToDelete?.name || ''}
          />

          {/* Loading Indicator for Delete Operation - EXACTLY like Courses.js */}
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Deleting Class</h3>
                    <p className="text-gray-500 text-center mb-2">Please wait while we delete the class...</p>
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

export default Classes;  // useQuery for fetching classes - exactly like Courses.js
