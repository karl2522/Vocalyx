import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    FiCalendar,
    FiEdit3,
    FiFileText,
    FiGrid,
    FiList,
    FiPlus,
    FiTrash2,
    FiUser
} from 'react-icons/fi';
import { RiSoundModuleLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { enhancedClassRecordService as classRecordService } from '../services/api';
import { showToast } from '../utils/toast.jsx';
import { TopNavbar } from './layouts/TopNavbar.jsx';
import CreateClassRecordModal from './modals/CreateClassRecordModal';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, recordName, isDeleting }) => {
  if (!isOpen) return null;

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onMouseDown={handleBackdropClick}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300" style={{zIndex: 100}} aria-hidden="true"></div>
      
      {/* Modal Content */}
      <div className="relative z-[101] w-full max-w-md mx-auto">
        <div 
          className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-4">
          <div className="w-12 h-12 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center flex-shrink-0">
            <FiTrash2 className="h-6 w-6 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Class Record</h3>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 pb-6">
          <div className="mb-6">
            <p className="text-gray-600 leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">"{recordName}"</span>?{' '}
              All associated data including students, grades, and spreadsheet data will be permanently removed.
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-sm"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <FiTrash2 className="w-4 h-4" />
                  <span>Delete Record</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

// Skeleton Loader Component (keep existing)
const Skeleton = ({ className }) => (
  <div className={`bg-gray-200 rounded-md ${className}`}></div>
);



const RecordCardSkeleton = ({ viewMode }) => (
  <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 ${viewMode === 'list' ? 'flex items-center gap-6' : ''}`}> 
    {/* Icon & Badge */}
    <div className={`${viewMode === 'list' ? 'flex-shrink-0' : 'mb-4'}`}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-lg" />
        {viewMode === 'grid' && <Skeleton className="h-5 w-16 rounded-full" />}
      </div>
    </div>
    {/* Content */}
    <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}> 
      <div className={`${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}> 
        <div className={`${viewMode === 'list' ? 'flex-1' : 'mb-4'}`}> 
          <Skeleton className={`h-5 ${viewMode === 'list' ? 'w-32' : 'w-40'} mb-2`} />
          {viewMode === 'list' ? (
            <div className="flex items-center gap-6 text-sm">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
          ) : (
            <div className="space-y-2 text-sm mb-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
            </div>
          )}
        </div>
        {/* Actions */}
        <div className={`${viewMode === 'list' ? 'flex gap-2 flex-shrink-0' : 'space-y-2'}`}> 
          <Skeleton className={`h-9 ${viewMode === 'list' ? 'w-20' : 'w-full'}`} />
          <Skeleton className={`h-9 ${viewMode === 'list' ? 'w-20' : 'w-full'}`} />
        </div>
      </div>
    </div>
  </div>
);

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const showMax = 5; // Maximum page numbers to show
    
    if (totalPages <= showMax) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-center mt-8 mb-4">
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-[#333D79] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500 transition-colors"
        >
          Previous
        </button>

        {/* Page Numbers */}
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={`px-3 py-2 rounded-lg border transition-colors ${
              page === currentPage
                ? 'bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white border-[#333D79] shadow-md'
                : page === '...'
                ? 'border-transparent text-gray-400 cursor-default'
                : 'border-gray-300 text-gray-700 hover:bg-[#EEF0F8] hover:text-[#333D79] hover:border-[#333D79]'
            }`}
          >
            {page}
          </button>
        ))}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-[#333D79] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

const ClassRecords = () => {
  const [classRecords, setClassRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 🔥 NEW: Delete & Edit states
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, record: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 9;

  useEffect(() => {
    fetchClassRecords();
  }, []);

  const fetchClassRecords = async () => {
    try {
      setLoading(true);
      const response = await classRecordService.getClassRecordsWithLiveCounts();
      setClassRecords(response.data);
    } catch (error) {
      console.error('Error fetching class records:', error);
      showToast.error('Failed to fetch class records');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = async (formData) => {
    try {
      const response = await classRecordService.createClassRecord(formData);
      setClassRecords(prev => [response.data, ...prev]);
      toast.success('Class record created successfully!');
    } catch (error) {
      console.error('Error creating class record:', error);
      if (error.response?.data) {
        // Handle specific API errors
        const errorData = error.response.data;
        if (errorData.name) {
          toast.error(`Name: ${errorData.name[0]}`);
        } else if (errorData.semester) {
          toast.error(`Semester: ${errorData.semester[0]}`);
        } else if (errorData.non_field_errors) {
          toast.error(errorData.non_field_errors[0]);
        } else {
          toast.error('Failed to create class record');
        }
      } else {
        toast.error('Failed to create class record');
      }
      throw error; // Re-throw to handle in modal
    }
  };

  // 🔥 NEW: Delete handler
  const handleDeleteRecord = async (record) => {
    setDeleteModal({ isOpen: true, record });
  };

  const confirmDelete = async () => {
    if (!deleteModal.record) return;
    
    try {
      setIsDeleting(true);
      await classRecordService.deleteClassRecord(deleteModal.record.id);
      
      // Remove from local state
      setClassRecords(prev => prev.filter(r => r.id !== deleteModal.record.id));
      
      toast.success(`"${deleteModal.record.name}" deleted successfully!`);
      setDeleteModal({ isOpen: false, record: null });
    } catch (error) {
      console.error('Error deleting class record:', error);
      if (error.response?.status === 404) {
        toast.error('Class record not found');
      } else if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to delete class record');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // 🔥 NEW: Edit handler
  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  // 🔥 NEW: Update handler
  const handleUpdateRecord = async (formData) => {
    try {
      const response = await classRecordService.updateClassRecord(editingRecord.id, formData);
      
      // Update local state
      setClassRecords(prev => prev.map(record => 
        record.id === editingRecord.id ? response.data : record
      ));
      
      toast.success('Class record updated successfully!');
      setEditingRecord(null);
    } catch (error) {
      console.error('Error updating class record:', error);
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.name) {
          toast.error(`Name: ${errorData.name[0]}`);
        } else if (errorData.semester) {
          toast.error(`Semester: ${errorData.semester[0]}`);
        } else if (errorData.non_field_errors) {
          toast.error(errorData.non_field_errors[0]);
        } else {
          toast.error('Failed to update class record');
        }
      } else {
        toast.error('Failed to update class record');
      }
      throw error;
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(classRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = classRecords.slice(startIndex, endIndex);
  const showPagination = classRecords.length > recordsPerPage;

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- SKELETON LOADING ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FB]">
        <TopNavbar />
        <main className="pt-16 p-6">
          <div className="space-y-6 p-6">
            {/* Header (no skeleton for title/subtitle) */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Class Records</h1>
                <p className="text-gray-600">Manage and explore your academic records</p>
              </div>
              <div className="flex items-center gap-4 mt-4 lg:mt-0">
                {/* View Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-white text-[#333D79] shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FiGrid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-white text-[#333D79] shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FiList size={18} />
                  </button>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white px-4 py-2 rounded-lg hover:from-[#2A2F66] hover:to-[#3A4080] transition-all shadow-md hover:shadow-lg"
                >
                  <FiPlus size={18} />
                  <span>New Record</span>
                </button>
              </div>
            </div>

            {/* Records List/Grid Skeleton */}
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {[...Array(viewMode === 'grid' ? 6 : 3)].map((_, i) => (
                <RecordCardSkeleton key={i} viewMode={viewMode} />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- END SKELETON LOADING ---

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <TopNavbar />
      <main className="pt-16 p-6">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Class Records</h1>
            <p className="text-gray-600">Manage and explore your academic records</p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 lg:mt-0">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white text-[#333D79] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FiGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-[#333D79] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FiList size={18} />
              </button>
            </div>
            
            <button
              onClick={() => {
                setEditingRecord(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white px-4 py-2 rounded-lg hover:from-[#2A2F66] hover:to-[#3A4080] transition-all shadow-md hover:shadow-lg"
            >
              <FiPlus size={18} />
              <span>New Record</span>
            </button>
          </div>
        </div>





        {/* Records List/Grid */}
        {classRecords.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#333D79] to-[#4A5491] rounded-lg flex items-center justify-center mx-auto mb-4">
              <FiFileText className="h-8 w-8 text-white" />
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No class records yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first class record to get started.
            </p>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white px-6 py-3 rounded-lg hover:from-[#2A2F66] hover:to-[#3A4080] transition-all font-medium"
            >
              <FiPlus size={18} />
              <span>Create First Record</span>
            </button>
          </div>
        ) : (
          <>
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {currentRecords.map((record) => (
              <Link
                key={record.id}
                to={`/class-records/${record.id}/excel`}
                className={`group bg-white rounded-xl shadow-md border border-gray-200 p-4 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 relative cursor-pointer block ${
                  viewMode === 'list' ? 'flex items-center gap-4' : ''
                }`}
              >
                {/* 🔥 Enhanced: Top-right action icons */}
                <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                  {/* Edit Icon */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEditRecord(record);
                    }}
                    className="w-8 h-8 bg-white/90 backdrop-blur-sm hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg border border-blue-200/50"
                    title="Edit class record"
                  >
                    <FiEdit3 className="h-3.5 w-3.5" />
                  </button>
                  
                  {/* Delete Icon */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteRecord(record);
                    }}
                    className="w-8 h-8 bg-white/90 backdrop-blur-sm hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg border border-red-200/50"
                    title="Delete class record"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Icon & Badge */}
                <div className={`${viewMode === 'list' ? 'flex-shrink-0' : 'mb-3'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#333D79] via-[#4A5491] to-[#5A629F] rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                      <FiFileText className="h-5 w-5 text-white" />
                    </div>
                    {viewMode === 'grid' && (
                      <span className="text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-2 py-0.5 rounded-full font-medium border border-blue-200/50">
                        {record.semester}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className={`${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}>
                    <div className={`${viewMode === 'list' ? 'flex-1' : 'mb-3'} ${viewMode === 'grid' ? 'pr-14' : ''}`}>
                      <h3 className={`font-semibold text-gray-900 mb-1.5 group-hover:text-[#333D79] transition-colors duration-300 ${viewMode === 'list' ? 'text-lg' : ''}`}>
                        {record.name}
                      </h3>
                      
                      {viewMode === 'list' && (
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <FiUser className="h-4 w-4" />
                            {record.teacher_name || 'Teacher'}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiCalendar className="h-4 w-4" />
                            {new Date(record.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <RiSoundModuleLine className="h-4 w-4" />
                            {record.student_count || 0} Students
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                            {record.semester}
                          </span>
                        </div>
                      )}
                      
                      {viewMode === 'grid' && (
                        <div className="space-y-1.5 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <FiUser className="h-4 w-4" />
                            <span>Teacher: {record.teacher_name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiCalendar className="h-4 w-4" />
                            <span>Created: {new Date(record.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <RiSoundModuleLine className="h-4 w-4" />
                            <span>Students: {record.student_count || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            </div>
            
            {/* Pagination */}
            {showPagination && (
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
        
        {/* 🔥 ENHANCED: Create/Edit Class Record Modal with duplicate detection */}
        <CreateClassRecordModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRecord(null);
          }}
          onSubmit={editingRecord ? handleUpdateRecord : handleCreateRecord}
          editData={editingRecord}
          isEditing={!!editingRecord}
          existingRecords={classRecords}
        />

        {/* 🔥 NEW: Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, record: null })}
          onConfirm={confirmDelete}
          recordName={deleteModal.record?.name || ''}
          isDeleting={isDeleting}
        />
        </div>
      </main>
    </div>
  );
};

export default ClassRecords;