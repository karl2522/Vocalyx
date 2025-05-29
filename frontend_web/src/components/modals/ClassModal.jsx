import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { MdClose, MdOutlineClass, MdOutlineWatchLater } from 'react-icons/md';
import { classService } from '../../services/api';
import { showToast } from '../../utils/toast.jsx';

const ClassModal = ({ isOpen, onClose, onAddClass, onUpdateClass, courseId, courseName, isEditMode, currentClass }) => {
    const [className, setClassName] = useState('');
    const [studentCount, setStudentCount] = useState('');
    const [status, setStatus] = useState('active');
    const [loading, setLoading] = useState(false);
    
    // Schedule state (split into components for better UX)
    const [selectedDays, setSelectedDays] = useState([]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    
    // For displaying the full schedule format when editing an existing schedule
    const [formattedSchedule, setFormattedSchedule] = useState('');

    // Day options for the schedule
    const dayOptions = [
        { value: 'M', label: 'Monday (M)' },
        { value: 'T', label: 'Tuesday (T)' },
        { value: 'W', label: 'Wednesday (W)' },
        { value: 'TH', label: 'Thursday (TH)' },
        { value: 'F', label: 'Friday (F)' },
    ];

    // Generate time options from 7:30 AM to 9:30 PM in 30 minute increments
    const generateTimeOptions = () => {
        const options = [];
        let hour = 7;
        let minute = 30;
        let period = 'AM';
        
        while (!(hour === 9 && minute === 30 && period === 'PM')) {
            const formattedHour = hour > 12 ? hour - 12 : hour;
            const formattedMinute = minute === 0 ? '00' : minute;
            const timeString = `${formattedHour}:${formattedMinute} ${period}`;
            
            options.push({
                value: timeString,
                label: timeString
            });
            
            // Increment by 30 minutes
            if (minute === 30) {
                minute = 0;
                hour++;
                if (hour === 12 && period === 'AM') {
                    period = 'PM';
                } else if (hour === 13) {
                    hour = 1;
                }
            } else {
                minute = 30;
            }
        }
        
        // Add the last option (9:30 PM)
        options.push({
            value: '9:30 PM',
            label: '9:30 PM'
        });
        
        return options;
    };
    
    const timeOptions = generateTimeOptions();
    
    // Common day patterns for quick selection
    const dayPatterns = [
        { value: 'M,W,F', label: 'Monday, Wednesday, Friday (M,W,F)' },
        { value: 'T,TH', label: 'Tuesday, Thursday (T,TH)' },
        { value: 'M,W', label: 'Monday, Wednesday (M,W)' },
        { value: 'M,T,W,TH,F', label: 'Every Day (M,T,W,TH,F)' },
    ];

    useEffect(() => {
        if (isEditMode && currentClass) {
            setClassName(currentClass.name || '');
            setStudentCount(currentClass.student_count || '');
            setStatus(currentClass.status || 'active');
            
            // Parse existing schedule if available
            if (currentClass.schedule) {
                setFormattedSchedule(currentClass.schedule);
                parseScheduleString(currentClass.schedule);
            }
        } else {
            resetForm();
        }
    }, [isEditMode, currentClass, isOpen]);
    
    // Parse a schedule string like "M,W,F 1:30 - 3:00 PM" into component parts
    const parseScheduleString = (scheduleString) => {
        try {
            // Try to extract days and time range
            const parts = scheduleString.split(' ');
            if (parts.length >= 3) {
                const days = parts[0].split(',');
                
                // Find the time parts
                let timeStartIndex = 1;
                let timeString = parts.slice(timeStartIndex).join(' ');
                
                // Split on the dash for start and end times
                const timeParts = timeString.split('-').map(t => t.trim());
                
                if (timeParts.length === 2) {
                    let startTimeValue = timeParts[0];
                    let endTimeValue = timeParts[1];
                    
                    // Make sure we have periods (AM/PM) on both times
                    if (endTimeValue.includes('AM') || endTimeValue.includes('PM')) {
                        // End time has period, check if start time needs it
                        if (!startTimeValue.includes('AM') && !startTimeValue.includes('PM')) {
                            const period = endTimeValue.includes('AM') ? 'AM' : 'PM';
                            startTimeValue = `${startTimeValue} ${period}`;
                        }
                    }
                    
                    // Set the component states
                    setSelectedDays(days);
                    setStartTime(startTimeValue);
                    setEndTime(endTimeValue);
                }
            }
        } catch (e) {
            console.error('Error parsing schedule:', e);
            // If parsing fails, just show the original string
        }
    };

    // Format the schedule for display and submission
    const formatSchedule = () => {
        if (selectedDays.length === 0 || !startTime || !endTime) return '';
        
        return `${selectedDays.join(',')} ${startTime} - ${endTime}`;
    };

    useEffect(() => {
        const schedule = formatSchedule();
        if (schedule) {
            setFormattedSchedule(schedule);
        }
    }, [selectedDays, startTime, endTime]);

    const resetForm = () => {
        setClassName('');
        setStudentCount('');
        setSelectedDays([]);
        setStartTime('');
        setEndTime('');
        setFormattedSchedule('');
        setStatus('active');
    };

    if (!isOpen) return null;

    const validateForm = () => {
        if (!className) {
            showToast.error('Class name is required');
            return false;
        }
        if (!studentCount) {
            showToast.error('Number of students is required');
            return false;
        }
        if (parseInt(studentCount) < 1) {
            showToast.error('Number of students must be at least 1');
            return false;
        }
        if (selectedDays.length === 0) {
            showToast.error('Please select at least one day for the schedule');
            return false;
        }
        if (!startTime) {
            showToast.error('Please select a start time');
            return false;
        }
        if (!endTime) {
            showToast.error('Please select an end time');
            return false;
        }
        
        // Enhanced time validation with proper 12-hour format handling
        const parseTime = (timeString) => {
            const [time, period] = timeString.split(' ');
            const [hours, minutes] = time.split(':').map(Number);
            
            // Convert to 24-hour format for accurate comparison
            let hour24 = hours;
            if (period === 'AM') {
                if (hours === 12) hour24 = 0; // 12:XX AM becomes 0:XX
            } else if (period === 'PM') {
                if (hours !== 12) hour24 = hours + 12; // 1:XX PM becomes 13:XX, but 12:XX PM stays 12:XX
            }
            
            return hour24 * 60 + minutes; // Convert to total minutes for easy comparison
        };
        
        const startMinutes = parseTime(startTime);
        const endMinutes = parseTime(endTime);
        
        if (endMinutes <= startMinutes) {
            // More user-friendly error message with the actual times
            showToast.error(`End time (${endTime}) must be after start time (${startTime})`);
            return false;
        }
        
        // Optional: Check for reasonable class duration (e.g., at least 30 minutes, max 8 hours)
        const durationMinutes = endMinutes - startMinutes;
        if (durationMinutes < 30) {
            showToast.error('Class duration must be at least 30 minutes');
            return false;
        }
        if (durationMinutes > 480) { // 8 hours
            showToast.error('Class duration cannot exceed 8 hours');
            return false;
        }
        
        return true;
    };

    const getTimeDuration = () => {
        if (!startTime || !endTime) return null;
        
        const parseTime = (timeString) => {
            const [time, period] = timeString.split(' ');
            const [hours, minutes] = time.split(':').map(Number);
            
            let hour24 = hours;
            if (period === 'AM') {
                if (hours === 12) hour24 = 0;
            } else if (period === 'PM') {
                if (hours !== 12) hour24 = hours + 12;
            }
            
            return hour24 * 60 + minutes;
        };
        
        const startMinutes = parseTime(startTime);
        const endMinutes = parseTime(endTime);
        const durationMinutes = endMinutes - startMinutes;
        
        if (durationMinutes <= 0) return null;
        
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        
        if (hours === 0) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else if (minutes === 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
            return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setLoading(true);

        const classData = {
            name: className,
            student_count: studentCount,
            schedule: formattedSchedule,
            status,
            ...(courseId && !isEditMode ? { course_id: courseId } : {})
        };

        try {
            if (isEditMode) {
                // For edit mode, we'll continue using the API directly
                const response = await classService.updateClass(currentClass.id, classData);
                if (onUpdateClass) {
                    onUpdateClass(response.data);
                }
                showToast.success('Class updated successfully!');
            } else {
                // For new classes, we'll let the parent handle the API call
                // to avoid duplicate submissions
                if (onAddClass) {
                    onAddClass(classData);
                    // Don't show success toast here, let parent handle it
                }
            }

            resetForm();
            onClose();
        } catch (error) {
            console.error('Error saving class:', error);
            showToast.error(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} class`);
        } finally {
            setLoading(false);
        }
    };
    
    // Handler for when a day is selected or unselected
    const handleDayChange = (day) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter(d => d !== day));
        } else {
            setSelectedDays([...selectedDays, day]);
        }
    };
    
    // Handler for selecting a common day pattern
    const handleDayPatternChange = (pattern) => {
        if (pattern) {
            setSelectedDays(pattern.split(','));
        } else {
            setSelectedDays([]);
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
                                    {isEditMode ? 'Edit Section' : courseId ? `Add Section to ${courseName || 'Course'}` : 'Create New Section'}
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
                                    Section Name *
                                </label>
                                <input
                                    type="text"
                                    id="className"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                                    placeholder="Enter section name (e.g. 'Section A', '1-B')"
                                    value={className}
                                    onChange={(e) => setClassName(e.target.value)}
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500">Specify the section identifier (e.g. &quot;Section A&quot;, &quot;1-B&quot;, &quot;Group 3&quot;)</p>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Schedule *
                                </label>
                                
                                {/* Display the formatted schedule */}
                                {formattedSchedule && (
                                    <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                                        <div className="flex items-center">
                                            <MdOutlineWatchLater className="h-5 w-5 text-gray-500 mr-2" />
                                            <span className="font-medium text-gray-700">{formattedSchedule}</span>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Common day patterns */}
                                <div className="mb-3">
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Common Patterns:
                                    </label>
                                    <select 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                                        onChange={(e) => handleDayPatternChange(e.target.value)}
                                        value={selectedDays.join(',')}
                                    >
                                        <option value="">Choose a common pattern</option>
                                        {dayPatterns.map((pattern) => (
                                            <option key={pattern.value} value={pattern.value}>
                                                {pattern.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Individual day selection */}
                                <div className="mb-3">
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Or select individual days:
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {dayOptions.map((day) => (
                                            <button
                                                key={day.value}
                                                type="button"
                                                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                                    selectedDays.includes(day.value)
                                                        ? 'bg-[#333D79] text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                                onClick={() => handleDayChange(day.value)}
                                            >
                                                {day.value}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Time selection with duration display */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">
                                            Start Time:
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            required
                                        >
                                            <option value="">Select start time</option>
                                            {timeOptions.map((time) => (
                                                <option key={`start-${time.value}`} value={time.value}>
                                                    {time.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">
                                            End Time:
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            required
                                        >
                                            <option value="">Select end time</option>
                                            {timeOptions.map((time) => (
                                                <option key={`end-${time.value}`} value={time.value}>
                                                    {time.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Duration display with visual feedback */}
                            {startTime && endTime && (
                                <div className="mt-2">
                                    {(() => {
                                        const duration = getTimeDuration();
                                        if (duration) {
                                            return (
                                                <div className="flex items-center p-2 bg-green-50 border border-green-200 rounded-md">
                                                    <MdOutlineWatchLater className="h-4 w-4 text-green-600 mr-2" />
                                                    <span className="text-sm text-green-700">
                                                        <strong>Duration:</strong> {duration}
                                                    </span>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div className="flex items-center p-2 bg-red-50 border border-red-200 rounded-md">
                                                    <div className="h-4 w-4 rounded-full bg-red-500 mr-2 flex items-center justify-center">
                                                        <span className="text-white text-xs">!</span>
                                                    </div>
                                                    <span className="text-sm text-red-700">
                                                        End time must be after start time
                                                    </span>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            )}

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
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-base font-medium text-white hover:from-[#4A5491] hover:to-[#5d6ba9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#333D79] sm:ml-3 sm:w-auto sm:text-sm transition-all"
                                >
                                    {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Section' : courseId ? 'Add Section' : 'Create Section')}
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
    onUpdateClass: PropTypes.func,
    courseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    courseName: PropTypes.string,
    isEditMode: PropTypes.bool,
    currentClass: PropTypes.object
};

ClassModal.defaultProps = {
    isEditMode: false,
    currentClass: null
};

export default ClassModal;