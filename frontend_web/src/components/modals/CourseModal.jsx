import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { MdClose, MdOutlineSchool } from 'react-icons/md';
import { courseService } from '../../services/api';
import { showToast } from '../../utils/toast.jsx';

const CourseModal = ({ isOpen, onClose, onAddCourse, onUpdateCourse, isEditMode, currentCourse }) => {
    const [courseCode, setCourseCode] = useState('');
    const [courseName, setCourseName] = useState('');
    const [description, setDescription] = useState('');
    const [semester, setSemester] = useState('');
    const [academicYear, setAcademicYear] = useState('');
    const [status, setStatus] = useState('active');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isEditMode && currentCourse) {
            setCourseCode(currentCourse.courseCode || '');
            setCourseName(currentCourse.name || '');
            setDescription(currentCourse.description || '');
            setSemester(currentCourse.semester || '');
            setAcademicYear(currentCourse.academic_year || '');
            setStatus(currentCourse.status || 'active');
        } else {
            // Reset form when opening in create mode
            resetForm();
        }
    }, [isEditMode, currentCourse, isOpen]);

    const resetForm = () => {
        setCourseCode('');
        setCourseName('');
        setDescription('');
        setSemester('');
        setAcademicYear('');
        setStatus('active');
    };

    if (!isOpen) return null;

    const validateForm = () => {
        if (!courseName) {
            showToast.error('Course name is required');
            return false;
        }
        if (!courseCode) {
            showToast.error('Course code is required');
            return false;
        }
        if (!semester) {
            showToast.error('Semester is required');
            return false;
        }
        if (!academicYear) {
            showToast.error('Academic year is required');
            return false;
        }

        const academicYearPattern = /^\d{4}-\d{4}$/;
        if (!academicYearPattern.test(academicYear)) {
            showToast.error('Academic year must be in format YYYY-YYYY');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    const courseData = {
        name: courseName,
        courseCode,
        description,
        semester,
        academic_year: academicYear,
        status
    };

    try {
        if (isEditMode) {
            if (onUpdateCourse) {
                onUpdateCourse({
                    id: currentCourse.id,
                    ...courseData
                });
            }
            showToast.success('Course updated successfully!');
        } else {
            if (onAddCourse) {
                onAddCourse(courseData);
            }
            showToast.success('Course created successfully!');
        }

        resetForm();
        onClose();
    } catch (error) {
        console.error('Error saving course:', error);
        showToast.error(`Failed to ${isEditMode ? 'update' : 'create'} course`);
    } finally {
        setLoading(false);
    }
};

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center">
                                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-[#EEF0F8] sm:mx-0 sm:h-10 sm:w-10">
                                    <MdOutlineSchool className="h-6 w-6 text-[#333D79]" />
                                </div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900 ml-3" id="modal-title">
                                    {isEditMode ? 'Edit Course' : 'Add New Course'}
                                </h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-500 focus:outline-none"
                            >
                                <MdClose size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label htmlFor="courseCode" className="block text-sm font-medium text-gray-700 mb-1">
                                        Course Code *
                                    </label>
                                    <input
                                        type="text"
                                        id="courseCode"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                                        placeholder="e.g. CS101"
                                        value={courseCode}
                                        onChange={(e) => setCourseCode(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="courseName" className="block text-sm font-medium text-gray-700 mb-1">
                                        Course Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="courseName"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                                        placeholder="e.g. Introduction to Computer Science"
                                        value={courseName}
                                        onChange={(e) => setCourseName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    rows="3"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                                    placeholder="Describe the course content and objectives"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">
                                        Semester *
                                    </label>
                                    <select
                                        id="semester"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                                        value={semester}
                                        onChange={(e) => setSemester(e.target.value)}
                                        required
                                    >
                                        <option value="">Select a semester</option>
                                        <option value="Fall">Fall</option>
                                        <option value="Spring">Spring</option>
                                        <option value="Summer">Summer</option>
                                        <option value="Winter">Winter</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 mb-1">
                                        Academic Year *
                                    </label>
                                    <input
                                        type="text"
                                        id="academicYear"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                                        placeholder="e.g. 2023-2024"
                                        value={academicYear}
                                        onChange={(e) => setAcademicYear(e.target.value)}
                                        required
                                    />
                                    <small className="text-gray-500">Format: YYYY-YYYY</small>
                                </div>
                            </div>

                            {isEditMode && (
                                <div className="mb-4">
                                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                        Status
                                    </label>
                                    <select
                                        id="status"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                    >
                                        <option value="active">Active</option>
                                        <option value="completed">Completed</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                            )}

                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-4 -mx-6">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#333D79] text-base font-medium text-white hover:bg-[#4A5491] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#333D79] sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                                >
                                    {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Course' : 'Add Course')}
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#333D79] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={onClose}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

CourseModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onAddCourse: PropTypes.func,
    onUpdateCourse: PropTypes.func,
    isEditMode: PropTypes.bool,
    currentCourse: PropTypes.object
};

CourseModal.defaultProps = {
    isEditMode: false,
    currentCourse: null
};

export default CourseModal;