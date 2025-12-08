import { AlertTriangle, BookOpen, Calendar, CheckCircle, Upload, User, Users, X } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../auth/AuthContext';
import apiService from '../../services/api';
import googleDriveService from '../../services/googleDriveService';
import { showToast } from '../../utils/toast';
import DriveFilePickerModal from './DriveFilePickerModal';
import ImportStudentsInfoModal from './ImportStudentsInfoModal';

const CreateClassRecordModal = ({ isOpen, onClose, onSubmit, editData, isEditing, existingRecords = [] }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    semester: '',
    teacher_name: '',
    section_name: '',
    academic_year: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const modalRef = useRef(null);

  // Import state
  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [importProcessing, setImportProcessing] = useState(false);
  const [showImportInfo, setShowImportInfo] = useState(false);
  const [importSource, setImportSource] = useState(null); // 'computer' or 'drive'

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
        section_name: editData.section_name || '',
        academic_year: editData.academic_year || ''
      });
    } else {
      // Reset for new records
      setFormData({
        name: '',
        semester: '',
        teacher_name: '',
        section_name: '',
        academic_year: ''
      });
    }
    // Clear errors when modal opens/closes
    setErrors({});
    setDuplicateInfo(null);
    // no-op: removed importFile state
    setImportPreview(null);
    setImportError('');
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

    if (!formData.academic_year.trim()) {
      newErrors.academic_year = 'Academic Year is required';
    }

    if (!formData.teacher_name.trim()) {
      newErrors.teacher_name = 'Teacher Name is required';
    }

    if (!formData.section_name.trim()) {
      newErrors.section_name = 'Section Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasGoogleDriveAccess) {
      showToast.error('Please connect Google Drive or Google account in your profile settings');
      return;
    }

    if (!validateForm() || duplicateInfo?.type === 'exact') {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      // Reset form after successful submission
      setFormData({ name: '', semester: '', teacher_name: '', section_name: '', academic_year: '' });
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
    setFormData({ name: '', semester: '', teacher_name: '', section_name: '', academic_year: '' });
    setErrors({});
    setDuplicateInfo(null);
    // no-op: removed importFile state
    setImportPreview(null);
    setImportError('');
    onClose();
  };

  // Outside click to close
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      handleClose();
    }
  };

  // Check if user has Google Drive access (Google account OR connected Google Drive)
  const hasGoogleDriveAccess = user?.has_google || user?.google_drive_connected;

  // 🔥 NEW: Check if form can be submitted
  const manualValid = !loading
    && !errors.name
    && !errors.semester
    && !errors.academic_year
    && !errors.teacher_name
    && !errors.section_name
    && formData.name.trim()
    && formData.semester.trim()
    && formData.academic_year.trim()
    && formData.teacher_name.trim()
    && formData.section_name.trim()
    && duplicateInfo?.type !== 'exact';
  const canSubmit = manualValid && hasGoogleDriveAccess;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    setImportError('');
    setImportPreview(null);
    if (!file) return;

    // Require Academic Year before importing
    if (!formData.academic_year.trim()) {
      setImportError('Please enter an Academic Year before importing a class record.');
      showToast.error('Please enter an Academic Year before importing a class record.');
      return;
    }
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx')) {
      setImportError('Only .csv or .xlsx files are supported');
      return;
    }
    try {
      // Ensure we have a valid Google access token before calling import endpoints
      let googleToken = localStorage.getItem('googleAccessToken');
      if (!googleToken) {
        googleToken = await googleDriveService.ensureGoogleAccessToken();
      }
      if (!googleToken) {
        setImportError('Please connect your Google account before importing a class record.');
        showToast.error('Please connect your Google account before importing a class record.');
        return;
      }

      setImportLoading(true);
      setImportProcessing(true);
      // Close the create modal while processing to avoid overlap/confusion
      onClose();
      const res = await apiService.classRecordService.previewImportUpload(file);
      setImportPreview(res.data);
      // Auto-import after preview using auto mapping
      let mapping = res.data?.mapping || {};
      if (typeof mapping === 'string') {
        try { mapping = JSON.parse(mapping); } catch { /* ignore */ }
      }
      await apiService.classRecordService.importUpload(file, mapping, '', '', formData.academic_year || '');
      showToast.success('Class record imported successfully');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to import file';
      setImportError(msg);
      showToast.error(msg);
    } finally {
      setImportLoading(false);
      setImportProcessing(false);
    }
  };

  const handleDrivePick = async (file) => {
    try {
      setImportError('');
      setImportLoading(true);
      setImportProcessing(true);
      // Close the create modal while processing to avoid overlap/confusion
      onClose();

      // Handle "From Computer" selection coming from DriveFilePickerModal
      if (file?.fromComputer && file.file) {
        const localFile = file.file;

        if (!formData.academic_year.trim()) {
          setImportError('Please enter an Academic Year before importing a class record.');
          showToast.error('Please enter an Academic Year before importing a class record.');
          return;
        }

        // Ensure we have a valid Google access token before calling import endpoints
        let googleToken = localStorage.getItem('googleAccessToken');
        if (!googleToken) {
          googleToken = await googleDriveService.ensureGoogleAccessToken();
        }
        if (!googleToken) {
          setImportError('Please connect your Google account before importing a class record.');
          showToast.error('Please connect your Google account before importing a class record.');
          return;
        }

        const res = await apiService.classRecordService.previewImportUpload(localFile);
        setImportPreview(res.data);

        // Auto-import after preview using auto mapping
        let mapping = res.data?.mapping || {};
        if (typeof mapping === 'string') {
          try { mapping = JSON.parse(mapping); } catch { /* ignore */ }
        }
        await apiService.classRecordService.importUpload(localFile, mapping, '', '', formData.academic_year || '');
        showToast.success('Class record imported successfully');
        setTimeout(() => window.location.reload(), 600);
        return;
      }

      // Drive file path (original behaviour), but ensure Google token first
      let googleToken = localStorage.getItem('googleAccessToken');
      if (!googleToken) {
        googleToken = await googleDriveService.ensureGoogleAccessToken();
      }
      if (!googleToken) {
        setImportError('Please connect your Google account before importing a class record.');
        showToast.error('Please connect your Google account before importing a class record.');
        return;
      }

      if (!formData.academic_year.trim()) {
        setImportError('Please enter an Academic Year before importing a class record.');
        showToast.error('Please enter an Academic Year before importing a class record.');
        return;
      }

      const preview = await apiService.classRecordService.previewImportDrive(file.id, file.name);
      let mapping = preview.data?.mapping || {};
      if (typeof mapping === 'string') {
        try { mapping = JSON.parse(mapping); } catch { /* ignore */ }
      }
      await apiService.classRecordService.importDrive(file.id, file.name, mapping, '', '', formData.academic_year || '');
      showToast.success('Class record imported successfully from Drive');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to import from Drive';
      setImportError(msg);
      showToast.error(msg);
    } finally {
      setImportLoading(false);
      setShowDrivePicker(false);
      setImportProcessing(false);
    }
  };

  // Show full-screen analyzing/importing overlay and hide this modal entirely
  if (importProcessing) {
    return createPortal(
      <div className="fixed inset-0 z-[9999]">
        {/* Backdrop with subtle gradient and blur */}
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300" />

        {/* Center content */}
        <div className="relative w-full h-full flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden bg-white/95 border border-white/60">
            {/* Visual */}
            <div className="flex flex-col items-center text-center p-8 pb-6">
              <img src="/assets/vocalyxPerson.png" alt="Analyzing" className="w-52 h-52 drop-shadow-lg" style={{ animation: 'gentleBounce 1.8s ease-in-out infinite' }} />
              <h3 className="mt-4 text-lg font-semibold text-[#333D79]">We are analyzing your file</h3>
              <p className="mt-1 text-sm text-gray-600">Mapping columns and preparing your class record template</p>
            </div>

            {/* Animated progress */}
            <div className="px-8 pb-8">
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="absolute inset-0">
                  <div className="w-1/2 h-full bg-gradient-to-r from-[#333D79] via-[#4A5491] to-[#333D79] animate-[progressMove_1.6s_infinite] rounded-full" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                <span className="inline-block w-1.5 h-1.5 bg-[#333D79] rounded-full animate-pulse" />
                <span>Hang tight, this usually takes a few seconds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Keyframes for progress movement */}
        <style>{`@keyframes progressMove {0%{transform:translateX(-60%)} 50%{transform:translateX(10%)} 100%{transform:translateX(120%)}} @keyframes gentleBounce {0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)}}`}</style>
      </div>,
      document.body
    );
  }

  if (showDrivePicker) {
    return createPortal(
      <DriveFilePickerModal
        isOpen={true}
        onClose={() => setShowDrivePicker(false)}
        onFileSelect={handleDrivePick}
        importType="scores"
      />, document.body
    );
  }

  // Handler for when user clicks "Choose Excel File" in the info modal
  const handleProceedFromInfo = () => {
    setShowImportInfo(false);

    if (importSource === 'computer') {
      // Wait for React to re-render the modal before clicking the file input
      setTimeout(() => {
        document.getElementById('file-input-hidden')?.click();
      }, 50);
    } else if (importSource === 'drive') {
      // Show the drive picker modal
      setShowDrivePicker(true);
    }
  };

  // Show ImportStudentsInfoModal when user clicks import button
  if (showImportInfo) {
    return createPortal(
      <ImportStudentsInfoModal
        showModal={true}
        onClose={() => {
          setShowImportInfo(false);
          setImportSource(null);
        }}
        onProceed={handleProceedFromInfo}
      />,
      document.body
    );
  }

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onMouseDown={handleBackdropClick}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300" style={{ zIndex: 100 }} aria-hidden="true"></div>
      <div ref={modalRef} className="relative z-[101] w-full max-w-lg mx-auto max-h-[calc(100vh-2rem)] md:max-h-[90vh] flex flex-col">
        {/* Modal Card */}
        <div className="bg-white rounded-2xl shadow-2xl w-full border border-[#E5E7EB] flex flex-col max-h-full overflow-hidden">
          {/* 🔥 UPDATED: Header with dynamic title */}
          <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl flex-shrink-0" style={{ background: 'linear-gradient(90deg, #333D79 0%, #4A5491 100%)' }}>
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

          {/* No tabs - streamlined UI */}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto flex-1 min-h-0 relative">
            {/* Blurred overlay with centered message when Google Drive not connected */}
            {!hasGoogleDriveAccess && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] rounded-b-2xl z-30 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4 border border-gray-200">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                      <AlertTriangle className="w-8 h-8 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Google Drive Connection Required
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Please connect your Google Drive or Google account in your profile settings to create class records.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        window.location.href = '/profile';
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg hover:from-[#2A2F66] hover:to-[#3A4080] transition-all font-medium"
                    >
                      Go to Profile Settings
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Fields */}
            <div className={!hasGoogleDriveAccess ? 'opacity-60 pointer-events-none' : ''}>
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
                    placeholder="e.g., IT411 - Capstone & Research 2"
                    className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] focus:outline-none transition-all duration-200 text-gray-900 bg-gray-50 ${errors.name ? 'border-red-500 bg-red-50' :
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
                <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                  Semester <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="semester"
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] focus:outline-none transition-all duration-200 appearance-none bg-gray-50 text-gray-900 ${errors.semester ? 'border-red-500 bg-red-50' :
                      duplicateInfo?.type === 'exact' ? 'border-red-500 bg-red-50' :
                        duplicateInfo?.type === 'similar' ? 'border-yellow-500 bg-yellow-50' :
                          'border-gray-300'
                      }`}
                  >
                    <option value="">Select Semester</option>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="Midyear">Midyear</option>
                  </select>
                  <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {errors.semester && (
                  <p className="mt-1 text-sm text-red-600">{errors.semester}</p>
                )}
              </div>

              {/* Academic Year */}
              <div>
                <label htmlFor="academic_year" className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="academic_year"
                    name="academic_year"
                    value={formData.academic_year}
                    onChange={handleInputChange}
                    placeholder="e.g., 2024-2025"
                    className={`w-full pl-3 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] focus:outline-none transition-all duration-200 text-gray-900 bg-gray-50 ${errors.academic_year ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                  />
                  <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                </div>
                {errors.academic_year && (
                  <p className="mt-1 text-sm text-red-600">{errors.academic_year}</p>
                )}
              </div>

              {/* 🔥 NEW: Section Name Field */}
              <div>
                <label htmlFor="section_name" className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                  Section Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="section_name"
                    name="section_name"
                    value={formData.section_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Section A, Class 1, Group 1"
                    className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] focus:outline-none transition-all duration-200 text-gray-900 bg-gray-50 ${errors.section_name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                  />
                  <Users className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                </div>
                {errors.section_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.section_name}</p>
                )}
              </div>

              {/* 🔥 NEW: Teacher Name Field */}
              <div>
                <label htmlFor="teacher_name" className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                  Teacher Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="teacher_name"
                    name="teacher_name"
                    value={formData.teacher_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Dr. Smith, Prof. Johnson"
                    className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] focus:outline-none transition-all duration-200 text-gray-900 bg-gray-50 ${errors.teacher_name ? 'border-red-500 bg-red-50' :
                      duplicateInfo?.type === 'exact' ? 'border-red-500 bg-red-50' :
                        duplicateInfo?.type === 'similar' ? 'border-yellow-500 bg-yellow-50' :
                          'border-gray-300'
                      }`}
                  />
                  <User className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                </div>
                {errors.teacher_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.teacher_name}</p>
                )}
              </div>

              {/* 🔥 NEW: Duplicate Detection Alert (compact) */}
              {duplicateInfo && (
                <div className={`flex items-start gap-2 p-2 rounded-md border text-sm ${duplicateInfo.type === 'exact'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                  }`}>
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${duplicateInfo.type === 'exact' ? 'text-red-600' : 'text-yellow-600'}`} />
                  <div className="flex-1 leading-snug">
                    <span className="font-medium mr-1">{duplicateInfo.type === 'exact' ? 'Duplicate found.' : 'Similar record found.'}</span>
                    <span>{duplicateInfo.message}</span>
                  </div>
                </div>
              )}

              {/* Drive rename note when editing */}
              {isEditing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-sm text-blue-800 mt-4">
                  Changes to <span className="font-medium">Class Record Name</span>, <span className="font-medium">Section Name</span>, or <span className="font-medium">Semester</span> will also rename the linked Google Sheet in your Drive to: <code className="bg-blue-100 px-1 py-0.5 rounded">{(() => {
                    const name = formData.name || editData?.name || '';
                    const section = formData.section_name || editData?.section_name || '';
                    const semester = formData.semester || editData?.semester || '';

                    // Format: CourseCode (CourseName) Section - Semester
                    // Split name by ' - ' to separate course code and course name
                    const nameParts = name.split(' - ');
                    const courseCode = nameParts[0] || '';
                    const courseName = nameParts[1] || '';

                    let formattedName = courseCode;
                    if (courseName) {
                      formattedName += ` (${courseName})`;
                    }
                    if (section) {
                      formattedName += ` ${section}`;
                    }

                    return `${formattedName} - ${semester}`.trim();
                  })()}</code>.
                </div>
              )}
            </div>

            {/* Import UI */}
            {/* Import Section */}
            <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-800 font-medium">Or import from a file</div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setImportSource('computer');
                    setShowImportInfo(true);
                  }}
                  className="group inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#D7DBEE] bg-white hover:bg-[#F7F8FF] shadow-sm hover:shadow cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#333D79]/30 focus:ring-offset-2 active:scale-[0.98]"
                >
                  <Upload className="w-4 h-4 text-[#333D79] group-hover:text-[#2A2F66] transition-colors" />
                  <span className="text-sm text-[#1F2A44]">From Computer</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportSource('drive');
                    setShowImportInfo(true);
                  }}
                  className="group inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#D7DBEE] bg-white hover:bg-[#F7F8FF] shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-[#333D79]/30 focus:ring-offset-2 active:scale-[0.98] cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-[#333D79] group-hover:text-[#2A2F66] transition-colors" />
                  <span className="text-sm text-[#1F2A44]">From Google Drive</span>
                </button>
              </div>
              {/* Hidden file input for computer import */}
              <input
                id="file-input-hidden"
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              {importError && <p className="text-sm text-red-600">{importError}</p>}

              {importLoading && (
                <div className="text-sm text-gray-600">Analyzing file...</div>
              )}

              {importPreview && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="text-sm text-gray-800 font-medium mb-2">Detected Columns</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {importPreview.mappedHeaders?.map((h, i) => (
                      <span key={i} className="px-2 py-1 text-xs bg-white border border-gray-300 rounded">{h}</span>
                    ))}
                  </div>
                  {importPreview.unmapped?.length > 0 && (
                    <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                      Some headers were not recognized: {importPreview.unmapped.join(', ')}
                    </div>
                  )}
                  {Array.isArray(importPreview.preview) && importPreview.preview.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm text-gray-800 font-medium mb-1">Preview (first rows)</div>
                      <div className="overflow-auto border border-gray-200 rounded">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-100">
                            <tr>
                              {Object.keys(importPreview.preview[0]).map((col) => (
                                <th key={col} className="text-left px-2 py-1 border-b border-gray-200 whitespace-nowrap">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.preview.map((row, idx) => (
                              <tr key={idx} className="odd:bg-white even:bg-gray-50">
                                {Object.keys(importPreview.preview[0]).map((col) => (
                                  <td key={col} className="px-2 py-1 border-b border-gray-100 whitespace-nowrap">{row[col]}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Drive input removed; use Drive picker modal */}

              {/* No separate Import CTA */}
            </div>

            {/* 🔥 ENHANCED: Buttons with smart state management */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-md ${(!canSubmit)
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
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