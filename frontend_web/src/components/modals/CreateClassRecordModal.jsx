import { BookOpen, Calendar, X, User, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import PropTypes from 'prop-types';
import { useRef, useState, useEffect } from 'react';

const CreateClassRecordModal = ({ isOpen, onClose, onSubmit, editData, isEditing, existingRecords = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    semester: '',
    teacher_name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const modalRef = useRef(null);

  // 🔥 NEW: Real-time duplicate detection
  useEffect(() => {
    if (!formData.name || !formData.semester) {
      setDuplicateInfo(null);
      return;
    }

    // Skip duplicate check for current record when editing
    const recordsToCheck = isEditing 
      ? existingRecords.filter(record => record.id !== editData?.id)
      : existingRecords;

    const duplicate = recordsToCheck.find(record => {
      const nameMatch = record.name.toLowerCase().trim() === formData.name.toLowerCase().trim();
      const semesterMatch = record.semester === formData.semester;
      
      // If teacher name is provided, include it in duplicate check
      if (formData.teacher_name.trim()) {
        const teacherMatch = record.teacher_name?.toLowerCase().trim() === formData.teacher_name.toLowerCase().trim();
        return nameMatch && semesterMatch && teacherMatch;
      }
      
      // If no teacher name, just check name + semester
      return nameMatch && semesterMatch;
    });

    if (duplicate) {
      setDuplicateInfo({
        type: 'exact',
        record: duplicate,
        message: formData.teacher_name.trim() 
          ? `A record with this name already exists for ${formData.semester} with ${duplicate.teacher_name || 'the same teacher'}`
          : `A record with this name already exists for ${formData.semester}`
      });
    } else {
      // Check for similar names (different semester/teacher - just a warning)
      const similar = recordsToCheck.find(record => 
        record.name.toLowerCase().trim() === formData.name.toLowerCase().trim() &&
        record.semester !== formData.semester
      );
      
      if (similar) {
        setDuplicateInfo({
          type: 'similar',
          record: similar,
          message: `Similar record "${similar.name}" exists in ${similar.semester}${similar.teacher_name ? ` with ${similar.teacher_name}` : ''}`
        });
      } else {
        setDuplicateInfo(null);
      }
    }
  }, [formData.name, formData.semester, formData.teacher_name, existingRecords, isEditing, editData?.id]);

  // 🔥 FIXED: useEffect to handle edit data
  useEffect(() => {
    if (editData && isEditing) {
      setFormData({
        name: editData.name || '',
        semester: editData.semester || '',
        teacher_name: editData.teacher_name || '',
        description: editData.description || ''
      });
    } else {
      // Reset for new records
      setFormData({
        name: '',
        semester: '',
        teacher_name: '',
        description: ''
      });
    }
    // Clear errors when modal opens/closes
    setErrors({});
    setDuplicateInfo(null);
  }, [editData, isEditing, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Class record name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Class record name must be at least 3 characters';
    }
    
    if (!formData.semester.trim()) {
      newErrors.semester = 'Semester is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm() || duplicateInfo?.type === 'exact') {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      // Reset form after successful submission
      setFormData({ name: '', semester: '', teacher_name: '', description: '' });
      setErrors({});
      setDuplicateInfo(null);
      onClose();
    } catch (error) {
      console.error('Error submitting class record:', error);
      // Handle error (you might want to show an error message)
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', semester: '', teacher_name: '', description: '' });
    setErrors({});
    setDuplicateInfo(null);
    onClose();
  };

  // Outside click to close
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      handleClose();
    }
  };

  // 🔥 NEW: Check if form can be submitted
  const canSubmit = !loading && 
                   !errors.name && 
                   !errors.semester && 
                   formData.name.trim() && 
                   formData.semester.trim() && 
                   duplicateInfo?.type !== 'exact';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onMouseDown={handleBackdropClick}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300" style={{zIndex: 100}} aria-hidden="true"></div>
      <div ref={modalRef} className="relative z-[101] w-full max-w-md mx-auto">
        {/* Modal Card */}
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[#E5E7EB]">
          {/* 🔥 UPDATED: Header with dynamic title */}
          <div className="flex items-center justify-between px-6 py-5 rounded-t-2xl" style={{background: 'linear-gradient(90deg, #333D79 0%, #4A5491 100%)'}}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shadow">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white tracking-wide">
                {isEditing ? 'Edit Class Record' : 'Create Class Record'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
              title="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Class Record Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Class Record Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Mathematics 101, Physics Lab"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] focus:outline-none transition-all duration-200 text-gray-900 bg-gray-50 ${
                    errors.name ? 'border-red-500 bg-red-50' : 
                    duplicateInfo?.type === 'exact' ? 'border-red-500 bg-red-50' :
                    duplicateInfo?.type === 'similar' ? 'border-yellow-500 bg-yellow-50' :
                    'border-gray-300'
                  }`}
                />
                <BookOpen className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Semester */}
            <div>
              <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-2">
                Semester <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="semester"
                  name="semester"
                  value={formData.semester}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] focus:outline-none transition-all duration-200 appearance-none bg-gray-50 text-gray-900 ${
                    errors.semester ? 'border-red-500 bg-red-50' : 
                    duplicateInfo?.type === 'exact' ? 'border-red-500 bg-red-50' :
                    duplicateInfo?.type === 'similar' ? 'border-yellow-500 bg-yellow-50' :
                    'border-gray-300'
                  }`}
                >
                  <option value="">Select Semester</option>
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="Summer">Summer</option>
                </select>
                <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.semester && (
                <p className="mt-1 text-sm text-red-600">{errors.semester}</p>
              )}
            </div>

            {/* 🔥 NEW: Teacher Name Field */}
            <div>
              <label htmlFor="teacher_name" className="block text-sm font-medium text-gray-700 mb-2">
                Teacher Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="teacher_name"
                  name="teacher_name"
                  value={formData.teacher_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Dr. Smith, Prof. Johnson"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] focus:outline-none transition-all duration-200 text-gray-900 bg-gray-50 ${
                    duplicateInfo?.type === 'exact' ? 'border-red-500 bg-red-50' :
                    duplicateInfo?.type === 'similar' ? 'border-yellow-500 bg-yellow-50' :
                    'border-gray-300'
                  }`}
                />
                <User className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* 🔥 NEW: Duplicate Detection Alert */}
            {duplicateInfo && (
              <div className={`p-4 rounded-lg border ${
                duplicateInfo.type === 'exact' 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-start gap-3">
                  {duplicateInfo.type === 'exact' ? (
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      duplicateInfo.type === 'exact' ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      {duplicateInfo.type === 'exact' ? 'Duplicate Found!' : 'Similar Record Found'}
                    </p>
                    <p className={`text-sm mt-1 ${
                      duplicateInfo.type === 'exact' ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                      {duplicateInfo.message}
                    </p>
                    {duplicateInfo.type === 'similar' && (
                      <p className="text-xs text-yellow-600 mt-2">
                        ✅ You can still create this record since it's in a different semester.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 🔥 NEW: Description Field */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <div className="relative">
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Optional description for this class record..."
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] focus:outline-none transition-all duration-200 text-gray-900 bg-gray-50 resize-none"
                />
                <FileText className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* 🔥 ENHANCED: Buttons with smart state management */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-md ${
                  !canSubmit
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#333D79] to-[#4A5491] hover:from-[#2A2F66] hover:to-[#3A4080] text-white hover:shadow-lg'
                }`}
                title={
                  duplicateInfo?.type === 'exact' ? 'Cannot create duplicate record' :
                  !formData.name.trim() ? 'Please enter a class name' :
                  !formData.semester.trim() ? 'Please select a semester' :
                  'Create this class record'
                }
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    {duplicateInfo?.type !== 'exact' && canSubmit && (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>{isEditing ? 'Update Record' : 'Create Record'}</span>
                  </div>
                )}
              </button>
            </div>

            {/* 🔥 NEW: Form hints */}
            {!duplicateInfo && formData.name && formData.semester && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-700 font-medium">
                    Great! This record is unique and ready to create.
                  </p>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

// 🔥 UPDATED: PropTypes to include existingRecords
CreateClassRecordModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  editData: PropTypes.object,
  isEditing: PropTypes.bool,
  existingRecords: PropTypes.array
};

// 🔥 NEW: Default props
CreateClassRecordModal.defaultProps = {
  editData: null,
  isEditing: false,
  existingRecords: []
};

export default CreateClassRecordModal;