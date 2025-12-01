import { Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    FiCalendar,
    FiEdit3,
    FiEye,
    FiFileText,
    FiGrid,
    FiInfo,
    FiList,
    FiMic,
    FiPlus,
    FiTrash2,
    FiUser,
    FiUsers,
    FiX
} from 'react-icons/fi';
import { RiSoundModuleLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { enhancedClassRecordService as classRecordService } from '../services/api';
import { showToast } from '../utils/toast';
import { TopNavbar } from './layouts/TopNavbar.jsx';
import CreateClassRecordModal from './modals/CreateClassRecordModal';
import InteractiveTutorialModal from './modals/InteractiveTutorialModal';
import OnboardingModal from './modals/OnboardingModal';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, recordName, isDeleting }) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isConfirmationValid, setIsConfirmationValid] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmationText('');
      setIsConfirmationValid(false);
    }
  }, [isOpen]);

  // Check if confirmation text matches record name
  useEffect(() => {
    setIsConfirmationValid(confirmationText.trim() === recordName.trim());
  }, [confirmationText, recordName]);

  if (!isOpen) return null;

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (isConfirmationValid) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onMouseDown={handleBackdropClick}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300" style={{zIndex: 100}} aria-hidden="true"></div>
      
      {/* Modal Content */}
      <div className="relative z-[101] w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
        <div 
          className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-3 p-5 pb-3 border-b border-red-100">
            <div className="w-10 h-10 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiTrash2 className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Class Record</h3>
              <p className="text-sm text-red-600 font-medium">⚠️ This action cannot be undone</p>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-5">
            {/* Warning Message */}
            <div className="mb-4">
              <p className="text-gray-700 leading-relaxed mb-3">
                You are about to permanently delete the class record{' '}
                <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                  "{recordName}"
                </span>
              </p>
              
              {/* What will be deleted */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <FiFileText className="h-4 w-4" />
                  The following data will be permanently deleted:
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    All student records and grades
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    Associated Google Sheets data (real-time sync)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    Voice command history and settings
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    All class record configurations
                  </li>
                </ul>
              </div>

              {/* Google Sheets Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 mb-3">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-yellow-600 text-xs font-bold">!</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Google Sheets Integration</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      This app syncs with Google Sheets in real-time. The associated spreadsheet data will also be affected.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmation Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To confirm deletion, type the class record name:
              </label>
              <div className="space-y-2">
                <code className="block text-sm bg-gray-100 text-gray-800 px-3 py-2 rounded border font-mono">
                  {recordName}
                </code>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type the class record name to confirm"
                  className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    confirmationText === '' 
                      ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      : isConfirmationValid
                      ? 'border-green-300 focus:ring-green-500 focus:border-green-500 bg-green-50'
                      : 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                  }`}
                  disabled={isDeleting}
                />
                {confirmationText !== '' && (
                  <div className="flex items-center gap-2">
                    {isConfirmationValid ? (
                      <>
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm text-green-600 font-medium">Confirmation text matches</span>
                      </>
                    ) : (
                      <>
                        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm text-red-600 font-medium">Text does not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isDeleting || !isConfirmationValid}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <FiTrash2 className="w-4 h-4" />
                    <span>Delete Class Record</span>
                  </>
                )}
              </button>
            </div>

            {/* Additional Safety Note */}
            <div className="mt-3 text-center">
              <p className="text-xs text-gray-500">
                💡 Make sure you have backups of important data before proceeding
              </p>
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
  const [remainingMap, setRemainingMap] = useState({}); // id -> { total, sheets }
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  
  // Check if onboarding has been completed
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    const tutorialDone = localStorage.getItem('tutorial_completed');
    
    if (!onboardingCompleted || onboardingCompleted !== 'true') {
      // Show onboarding modal after a short delay to let the page load
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    
    // Check if tutorial was completed
    if (tutorialDone === 'true') {
      setTutorialCompleted(true);
    }
  }, []);

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  // Handle tutorial completion
  const handleTutorialComplete = () => {
    localStorage.setItem('tutorial_completed', 'true');
    setTutorialCompleted(true);
    setShowTutorial(false);
    toast.success('🎉 You\'re ready to start grading!');
  };
  
  // Global function to update remaining percentage for a specific class record
  useEffect(() => {
    window.updateClassRecordRemaining = (classRecordId, payload) => {
      const normalized = typeof payload === 'number' 
        ? { total: payload, sheets: [] } 
        : (payload || { total: 0, sheets: [] });
      setRemainingMap(prev => ({
        ...prev,
        [classRecordId]: normalized
      }));
      console.log('🔄 Updated card remaining for record', classRecordId, 'to', normalized);
    };
    
    return () => {
      delete window.updateClassRecordRemaining;
    };
  }, []);
  
  // 🔥 NEW: Delete & Edit states
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, record: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  
  // 🔥 NEW: Navigation tip state
  const [showNavigationTip, setShowNavigationTip] = useState(true);
  
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
      const records = response.data || [];
      setClassRecords(records);

      // Build remaining map directly from API payload; fallback to DB summary when missing
      try {
        const initialMap = {};
        for (const rec of records) {
          const sheets = Array.isArray(rec.sheets) ? rec.sheets : [];
          const sheetsSum = sheets.reduce((sum, s) => sum + (Number(s?.remaining) || 0), 0);
          const total = sheets.length > 0 ? sheetsSum : Math.max(0, Number(rec.remaining_total) || 0);
          // Prefer recent local breakdown persisted from record view
          let local = null;
          try {
            const raw = localStorage.getItem(`cr_breakdown_${rec.id}`);
            if (raw) local = JSON.parse(raw);
          } catch {}
          if (local && Array.isArray(local.sheets) && local.sheets.length > 0) {
            initialMap[rec.id] = { total: Number(local.total) || total, sheets: local.sheets };
          } else {
            initialMap[rec.id] = { total, sheets };
          }
        }

        // Fallback: fetch DB-mirrored breakdown for records with no total/breakdown
        const needFallback = records.filter(r => {
          const info = initialMap[r.id];
          const hasTotal = (info?.total ?? 0) > 0;
          const hasSheets = (info?.sheets?.length ?? 0) > 0;
          return !hasTotal || !hasSheets;
        });
        if (needFallback.length === 0) {
          setRemainingMap(initialMap);
        } else {
          const results = await Promise.all(needFallback.map(async (rec) => {
            try {
              const res = await classRecordService.getCategoryPercentages(rec.id);
              const remaining = Math.max(0, res?.data?.remaining ?? 0);
              const sheets = Array.isArray(res?.data?.sheets) ? res.data.sheets : [];
              const totalFinal = sheets.length > 0
                ? sheets.reduce((sum, s) => sum + (Number(s.remaining) || 0), 0)
                : remaining;
              return [rec.id, { total: totalFinal, sheets }];
            } catch (e) {
              console.warn(`⚠️ category_percentages failed for record ${rec.id}:`, e);
              return [rec.id, { total: 0, sheets: [] }];
            }
          }));
          const map = { ...initialMap, ...Object.fromEntries(results) };
          setRemainingMap(map);
        }
      } catch (e) {
        console.error('❌ Error computing remaining map:', e);
      }
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
          
          <div className="flex items-center gap-4 mt-4 lg:mt-0 flex-wrap">
            {/* Tutorial Button - Eye-catching with animation */}
            {!tutorialCompleted && (
              <button
                onClick={() => setShowTutorial(true)}
                className="relative flex items-center gap-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white px-5 py-2.5 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all animate-pulse"
              >
                <Lightbulb className="w-5 h-5" />
                <span>Start Tutorial</span>
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-bounce">
                  NEW
                </span>
              </button>
            )}

            {/* Tutorial Button - Subtle version after completion */}
            {tutorialCompleted && (
              <button
                onClick={() => setShowTutorial(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-2 border-indigo-300 px-4 py-2 rounded-lg font-medium hover:from-indigo-200 hover:to-purple-200 transition-all shadow-sm hover:shadow-md"
                title="Replay Tutorial"
              >
                <Lightbulb className="w-5 h-5" />
                <span>Tutorial</span>
              </button>
            )}

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

        {/* 🎓 NEW: First-Time Tutorial Banner */}
        {!tutorialCompleted && classRecords.length > 0 && (
          <div className="relative overflow-hidden bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 rounded-2xl shadow-2xl p-6 mb-6">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white to-transparent"></div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl opacity-30 animate-pulse"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl opacity-30 animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
                  <Lightbulb className="w-10 h-10 text-orange-500" />
                </div>
                <div className="text-white">
                  <h3 className="text-2xl font-bold mb-1 flex items-center gap-2">
                    <span>New to Voice Grading?</span>
                    <span className="px-3 py-1 bg-white text-orange-600 text-xs font-bold rounded-full animate-pulse">
                      START HERE!
                    </span>
                  </h3>
                  <p className="text-white/90 text-sm lg:text-base">
                    🎤 Take our <strong>5-minute interactive tutorial</strong> to learn how to grade with your voice! 
                    Practice with a simulation - no real data involved.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTutorial(true)}
                className="flex-shrink-0 bg-white text-orange-600 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all flex items-center gap-3 group"
              >
                <span>Start Tutorial Now</span>
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* 🔥 NEW: Navigation Tip Banner */}
        {showNavigationTip && classRecords.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl p-4 shadow-md">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <FiInfo className="w-5 h-5 text-white" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-[#333D79]" />
                    Sheet Navigation Guide
                    <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      Pro Tip
                    </span>
                  </h4>
                  <button
                    onClick={() => setShowNavigationTip(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-white/50 rounded-lg"
                    title="Dismiss tip"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-gray-700 mb-3 leading-relaxed">
                  When working with your class records, choose the right navigation method for your needs:
                </p>
                
                <div className="grid md:grid-cols-2 gap-3">
                  {/* Voice Commands */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 bg-green-500 rounded-md flex items-center justify-center shadow-sm">
                        <FiMic className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-green-800 text-sm">For Voice Commands</span>
                    </div>
                    <p className="text-xs text-green-700 leading-relaxed">
                      <span className="font-medium">Use the TOP navigation</span> (sheet selector in toolbar) to switch sheets. This loads data for voice recognition and grading features.
                    </p>
                  </div>
                  
                  {/* Viewing Only */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 bg-amber-500 rounded-md flex items-center justify-center shadow-sm">
                        <FiEye className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-amber-800 text-sm">For Viewing Only</span>
                    </div>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      <span className="font-medium">Use the BOTTOM navigation</span> (sheet tabs in embedded spreadsheet) for quick browsing and viewing data only.
                    </p>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                  <span>This tip helps you choose the right navigation method when you open a class record</span>
                </div>
              </div>
            </div>
          </div>
        )}

        

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
                          <div className="flex items-center gap-3 mb-1.5">
                            <h3 className={`font-semibold text-gray-900 group-hover:text-[#333D79] transition-colors duration-300 ${viewMode === 'list' ? 'text-lg' : ''}`}>
                              {record.name}
                            </h3>
                            {viewMode === 'list' && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                                {record.semester}
                              </span>
                            )}
                          </div>
                          
                          {viewMode === 'list' && (
                            <div className="flex items-center gap-6 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <FiUser className="h-4 w-4" />
                                {record.teacher_name || 'Teacher'}
                              </span>
                              <span className="flex items-center gap-1">
                                <FiUsers className="h-4 w-4" />
                                {record.section_name || 'Section'}
                              </span>
                              <span className="flex items-center gap-1">
                                <FiCalendar className="h-4 w-4" />
                                {new Date(record.created_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <RiSoundModuleLine className="h-4 w-4" />
                                {record.student_count || 0} Students
                              </span>
                              {(() => {
                                const info = remainingMap[record.id];
                                const total = info?.total ?? 0;
                                const sheets = info?.sheets ?? [];
                                if (total <= 0) return null;
                                let breakdown = '';
                                if (sheets.length === 1) {
                                  breakdown = ` – ${sheets[0].sheetName}`; // avoid repeating percentage
                                } else if (sheets.length > 1) {
                                  breakdown = ` – ${sheets.map(s => `${s.sheetName} ${s.remaining}%`).join(', ')}`;
                                }
                                return (
                                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 font-medium">
                                    Class Standing: {total}% unallocated{breakdown}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                      
                      {viewMode === 'grid' && (
                        <div className="space-y-1.5 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <FiUser className="h-4 w-4" />
                            <span>Teacher: {record.teacher_name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiUsers className="h-4 w-4" />
                            <span>Section: {record.section_name|| 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiCalendar className="h-4 w-4" />
                            <span>Created: {new Date(record.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <RiSoundModuleLine className="h-4 w-4" />
                            <span>Students: {record.student_count || 0}</span>
                          </div>
                          {(() => {
                            const info = remainingMap[record.id];
                            const total = info?.total ?? 0;
                            const sheets = info?.sheets ?? [];
                            if (total <= 0) return null;
                            let breakdown = '';
                            if (sheets.length === 1) {
                              breakdown = ` – ${sheets[0].sheetName}`;
                            } else if (sheets.length > 1) {
                              breakdown = ` – ${sheets.map(s => `${s.sheetName} ${s.remaining}%`).join(', ')}`;
                            }
                            return (
                              <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-flex w-fit items-center gap-1">
                                Class Standing: {total}% unallocated{breakdown}
                              </div>
                            );
                          })()}
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

        {/* Onboarding Modal */}
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={handleOnboardingComplete}
        />

        {/* Interactive Tutorial Modal */}
        <InteractiveTutorialModal
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
          onComplete={handleTutorialComplete}
        />
        </div>
      </main>
    </div>
  );
};

export default ClassRecords;