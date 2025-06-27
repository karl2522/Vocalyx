import { BookOpen, Calendar, X } from 'lucide-react';
import PropTypes from 'prop-types';
import { useRef, useState } from 'react';

const CreateClassRecordModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    semester: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const modalRef = useRef(null);

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
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      // Reset form after successful submission
      setFormData({ name: '', semester: '' });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error creating class record:', error);
      // Handle error (you might want to show an error message)
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', semester: '' });
    setErrors({});
    onClose();
  };

  // Outside click to close
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onMouseDown={handleBackdropClick}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300" style={{zIndex: 100}} aria-hidden="true"></div>
      <div ref={modalRef} className="relative z-[101] w-full max-w-md mx-auto">
        {/* Modal Card */}
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[#E5E7EB]">
          {/* Header with brand gradient */}
          <div className="flex items-center justify-between px-6 py-5 rounded-t-2xl" style={{background: 'linear-gradient(90deg, #333D79 0%, #4A5491 100%)'}}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shadow">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white tracking-wide">Create Class Record</h2>
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
                    errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
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
                    errors.semester ? 'border-red-500 bg-red-50' : 'border-gray-300'
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

            {/* Buttons */}
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
                disabled={loading}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-md ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#333D79] to-[#4A5491] hover:from-[#2A2F66] hover:to-[#3A4080] text-white'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  'Create Record'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

CreateClassRecordModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default CreateClassRecordModal;