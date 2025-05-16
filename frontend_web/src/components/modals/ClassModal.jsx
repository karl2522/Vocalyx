import PropTypes from 'prop-types';
import { useState } from 'react';
import { MdClose, MdOutlineClass, MdOutlineWatchLater } from 'react-icons/md';
import { classService } from '../../services/api';
import { showToast } from '../../utils/toast.jsx';

const ClassModal = ({ isOpen, onClose, onAddClass, courseId, courseName }) => {
    const [className, setClassName] = useState('');
    const [section, setSection] = useState('');
    const [studentCount, setStudentCount] = useState('');
    const [schedule, setSchedule] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await classService.createClass({
                name: className,
                section,
                student_count: studentCount,
                schedule,
                status: 'active',
                course_id: courseId
            });

            if (onAddClass) {
                onAddClass(response.data);
            }

            showToast.success('Class created successfully!', 'New Class Added');

            setClassName('');
            setSection('');
            setStudentCount('');
            setSchedule('');
            onClose();
        } catch (error) {
            console.error('Error creating class:', error);
            showToast.error(error.response?.data?.message || 'Failed to create class');
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
                                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-[#333D79] to-[#4A5491] sm:mx-0 sm:h-10 sm:w-10">
                                    <MdOutlineClass className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900 ml-3" id="modal-title">
                                    {courseId ? `Add Class to ${courseName || 'Course'}` : 'Create New Class'}
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
                            <div className="mb-4">
                                <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-1">
                                    Class Name *
                                </label>
                                <input
                                    type="text"
                                    id="className"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                                    placeholder="Enter class name"
                                    value={className}
                                    onChange={(e) => setClassName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-1">
                                    Section *
                                </label>
                                <input
                                    type="text"
                                    id="section"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                                    placeholder="e.g. A, B, C"
                                    value={section}
                                    onChange={(e) => setSection(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label htmlFor="studentCount" className="block text-sm font-medium text-gray-700 mb-1">
                                    Number of Students *
                                </label>
                                <input
                                    type="number"
                                    id="studentCount"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                                    placeholder="e.g. 30"
                                    min="1"
                                    value={studentCount}
                                    onChange={(e) => setStudentCount(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label htmlFor="schedule" className="block text-sm font-medium text-gray-700 mb-1">
                                    Schedule *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MdOutlineWatchLater className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        id="schedule"
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                                        placeholder="e.g. M,W,F 1:30 - 3:00PM"
                                        value={schedule}
                                        onChange={(e) => setSchedule(e.target.value)}
                                        required
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500">Format: Days, Time Range (e.g. M,W,F 1:30 - 3:00PM)</p>
                            </div>

                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-4 -mx-6">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-base font-medium text-white hover:from-[#4A5491] hover:to-[#5d6ba9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#333D79] sm:ml-3 sm:w-auto sm:text-sm transition-all"
                                >
                                    {loading ? 'Creating...' : courseId ? 'Add Class' : 'Create Class'}
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

ClassModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onAddClass: PropTypes.func,
    courseId: PropTypes.string,
    courseName: PropTypes.string
};

export default ClassModal;