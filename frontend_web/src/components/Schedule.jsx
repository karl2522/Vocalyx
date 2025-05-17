import { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight, FiClock } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { courseService } from '../services/api';
import { commonHeaderAnimations } from '../utils/animation.js';
import DashboardLayout from "./layouts/DashboardLayout.jsx";

// Optimize by creating the styles only once and preventing re-renders
const ScheduleStyles = () => {
  // Use useMemo to prevent regenerating the styles on each render
  const stylesContent = useMemo(() => `
    ${commonHeaderAnimations}
    
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.03); }
      100% { transform: scale(1); }
    }
    
    .pulse-on-hover:hover {
      animation: pulse 1.5s ease-in-out infinite;
    }
    
    .schedule-header {
      background-image: linear-gradient(120deg, #f0f4ff 0%, #e6eeff 100%);
      position: relative;
      overflow: hidden;
    }
    
    .schedule-header::before {
      content: "";
      position: absolute;
      top: -100%;
      left: -100%;
      width: 300%;
      height: 300%;
      background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
      opacity: 0.4;
      animation: shimmer 8s linear infinite;
    }
    
    @keyframes shimmer {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .time-cell {
      background-color: #E6EAFF;
      color: #666;
      font-size: 0.85rem;
      text-align: center;
      position: relative;
    }
    
    .time-cell-inner {
      position: relative;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    
    .time-value {
      font-weight: 600;
    }
    
    .time-sub {
      font-size: 0.65rem;
      opacity: 0.7;
    }
    
    .class-cell {
      background-color: #333D79 !important;
      color: white;
      position: relative;
    }
    
    .class-cell:hover {
      background-color: #4A5491 !important;
      box-shadow: inset 0 0 0 2px rgba(255,255,255,0.3);
    }
    
    .class-cell-content {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 4px;
      text-align: center;
      font-size: 0.75rem;
      line-height: 1.2;
      font-weight: 600;
    }
    
    .table-cell {
      border: 1px solid #ddd;
      padding: 0;
      height: 3rem;
      position: relative;
      background-color: white;
      transition: background-color 0.2s ease;
    }
    
    .table-head {
      text-align: center;
      font-weight: 600;
      color: #444;
      background-color: #f8faff;
      border: 1px solid #ddd;
      padding: 0.75rem;
    }
    
    .schedule-table {
      table-layout: fixed;
      width: 100%;
      border-collapse: collapse;
    }
    
    .schedule-table th:first-child {
      width: 100px;
    }
    
    .breadcrumb-item {
      display: flex;
      align-items: center;
      font-size: 0.95rem;
    }
    
    .breadcrumb-arrow {
      margin: 0 0.5rem;
      color: #999;
    }
  `, []);

  return <style>{stylesContent}</style>;
};

const Schedule = () => {
  const [viewType, setViewType] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [scheduledTimes, setScheduledTimes] = useState([]);
  const [headerLoaded, setHeaderLoaded] = useState(false);
  
  // Time slot data - these are 30-minute increments
  const timeSlots = [
    { display: "07:30 AM", value: "07:30" },
    { display: "08:00 AM", value: "08:00" },
    { display: "08:30 AM", value: "08:30" },
    { display: "09:00 AM", value: "09:00" },
    { display: "09:30 AM", value: "09:30" },
    { display: "10:00 AM", value: "10:00" },
    { display: "10:30 AM", value: "10:30" },
    { display: "11:00 AM", value: "11:00" },
    { display: "11:30 AM", value: "11:30" },
    { display: "12:00 PM", value: "12:00" },
    { display: "12:30 PM", value: "12:30" },
    { display: "01:00 PM", value: "13:00" },
    { display: "01:30 PM", value: "13:30" },
    { display: "02:00 PM", value: "14:00" },
    { display: "02:30 PM", value: "14:30" },
    { display: "03:00 PM", value: "15:00" },
    { display: "03:30 PM", value: "15:30" },
    { display: "04:00 PM", value: "16:00" },
    { display: "04:30 PM", value: "16:30" },
    { display: "05:00 PM", value: "17:00" },
    { display: "05:30 PM", value: "17:30" },
    { display: "06:00 PM", value: "18:00" },
    { display: "06:30 PM", value: "18:30" },
    { display: "07:00 PM", value: "19:00" },
    { display: "07:30 PM", value: "19:30" },
    { display: "08:00 PM", value: "20:00" },
    { display: "08:30 PM", value: "20:30" },
    { display: "09:00 PM", value: "21:00" },
    { display: "09:30 PM", value: "21:30" },
  ];

  // Day names for column headers
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Set header as loaded after initial mount
  useEffect(() => {
    // Only set this once on component mount
    if (!headerLoaded) {
      setHeaderLoaded(true);
    }
    
    fetchCourses();
  }, [headerLoaded]);

  useEffect(() => {
    if (selectedCourse) {
      fetchClasses(selectedCourse.id);
    } else {
      setClasses([]);
      setSelectedClass(null);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedClass) {
      parseSchedule(selectedClass.schedule);
    } else {
      setScheduledTimes([]);
    }
  }, [selectedClass]);

  // For debugging
  useEffect(() => {
    if (scheduledTimes.length > 0) {
      console.log("Scheduled times:", scheduledTimes);
    }
  }, [scheduledTimes]);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const response = await courseService.getCourses();
      setCourses(response.data);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClasses = async (courseId) => {
    setIsLoading(true);
    try {
      const response = await courseService.getCourseClasses(courseId);
      setClasses(response.data);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to parse schedule like "M,W,F 1:30 - 3:00 PM"
  const parseSchedule = (scheduleStr) => {
    if (!scheduleStr) {
      setScheduledTimes([]);
      return;
    }
    
    try {
      console.log("Parsing schedule:", scheduleStr);
      
      // First split by space to separate days from time
      const parts = scheduleStr.split(' ');
      if (parts.length < 3) {
        console.error("Invalid schedule format:", scheduleStr);
        return;
      }
      
      // Parse days (M,W,F)
      const daysStr = parts[0];
      const days = [];
      if (daysStr.includes('M')) days.push(1); // Monday (1)
      if (daysStr.includes('T') && !daysStr.includes('Th')) days.push(2); // Tuesday (2)
      if (daysStr.includes('W')) days.push(3); // Wednesday (3)
      if (daysStr.includes('Th')) days.push(4); // Thursday (4)
      if (daysStr.includes('F')) days.push(5); // Friday (5)
      if (daysStr.includes('Sa')) days.push(6); // Saturday (6)
      if (daysStr.includes('Su')) days.push(0); // Sunday (0)
      
      console.log("Parsed days:", days);
      
      // Parse time range
      const startTimeStr = parts[1];
      // Get the end time (handle different formats)
      let endTimeStr;
      
      // Try to find where the end time is in the string
      const dashIndex = scheduleStr.indexOf('-');
      if (dashIndex !== -1) {
        const afterDash = scheduleStr.substring(dashIndex + 1).trim();
        const endTimeParts = afterDash.split(' ');
        endTimeStr = endTimeParts[0].trim();
      } else {
        // Default fallback
        endTimeStr = parts[2];
      }
      
      console.log("Start time:", startTimeStr, "End time:", endTimeStr);
      
      // Determine AM/PM
      const isPM = scheduleStr.toUpperCase().includes('PM');
      
      // Convert times to minutes (since midnight)
      const startTime = convertToMinutes(startTimeStr, isPM);
      const endTime = convertToMinutes(endTimeStr, isPM);
      
      console.log("Start minutes:", startTime, "End minutes:", endTime);
      
      // Generate all 30-minute slots between start and end time for each day
      let scheduledSlots = [];
      
      // For each day, add time slots
      days.forEach(day => {
        // Start at the startTime and go until endTime in 30-minute increments
        for (let minutes = startTime; minutes < endTime; minutes += 30) {
          const hour = Math.floor(minutes / 60);
          const minute = minutes % 60;
          
          scheduledSlots.push({ day, hour, minute });
        }
      });
      
      console.log("Generated slots:", scheduledSlots);
      setScheduledTimes(scheduledSlots);
    } catch (error) {
      console.error("Error parsing schedule:", error);
      setScheduledTimes([]);
    }
  };
  
  // Converts time string like "1:30" to minutes (e.g., 13:30 = 13*60 + 30 = 810 minutes)
  const convertToMinutes = (timeStr, isPM) => {
    // Clean up the time string to get just numbers and colon
    const cleanTime = timeStr.replace(/[^\d:]/g, '');
    let [hours, minutes] = cleanTime.split(':').map(num => parseInt(num, 10));
    
    if (isNaN(hours)) hours = 0;
    if (isNaN(minutes)) minutes = 0;
    
    // Adjust for PM
    if (isPM && hours < 12) {
      hours += 12;
    }
    // Adjust for AM with 12 (which is 0 in 24-hour format)
    if (!isPM && hours === 12) {
      hours = 0;
    }
    
    // Return minutes since midnight
    return (hours * 60) + (minutes || 0);
  };

  // Check if a specific time slot is scheduled
  const isTimeSlotScheduled = (dayIndex, timeSlot) => {
    // Parse the time slot value (HH:MM format)
    const [hours, minutes] = timeSlot.value.split(':').map(num => parseInt(num, 10));
    
    // Check if this slot matches any scheduled time
    return scheduledTimes.some(slot => 
      slot.day === dayIndex && 
      slot.hour === hours && 
      slot.minute === minutes
    );
  };

  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewType === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewType === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateRange = () => {
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    if (viewType === 'day') {
      return currentDate.toLocaleDateString('en-US', options);
    } else if (viewType === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'long' });
      const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'long' });
      
      if (startMonth === endMonth) {
        return `${startMonth} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
      } else {
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <ScheduleStyles />
        <div className="flex justify-center items-center h-[calc(100vh-5rem)]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#333D79]"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Determine the class name for a given cell based on scheduling
  const getCellClassName = (dayIndex, timeSlot) => {
    const isScheduled = isTimeSlotScheduled(dayIndex, timeSlot);
    return isScheduled ? 'table-cell class-cell' : 'table-cell';
  };

  return (
    <DashboardLayout>
      <ScheduleStyles />
      <div className="pb-6">
        {/* Header - Fixed to prevent blinking */}
        <div className="hero-gradient rounded-xl mb-8 p-5 shadow-sm border border-gray-100 overflow-hidden relative">
          {/* Background Elements */}
          <div className="bg-blur-circle bg-blur-circle-top"></div>
          <div className="bg-blur-circle bg-blur-circle-bottom"></div>
          <div className="bg-floating-circle hidden md:block"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
            <div className="flex items-center gap-4 fade-in-up" style={{animationDelay: '0s'}}>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-[#333D79] to-[#4A5491] flex items-center justify-center flex-shrink-0 shadow-md float-animation">
                <FiCalendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
                <p className="text-gray-600">Manage your classes and events in a calendar view</p>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-1 inline-flex mt-4 md:mt-0 fade-in-up" style={{animationDelay: '0s'}}>
              <button 
                onClick={() => setViewType('day')} 
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewType === 'day' ? 'bg-[#333D79] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Day
              </button>
              <button 
                onClick={() => setViewType('week')} 
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewType === 'week' ? 'bg-[#333D79] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Week
              </button>
              <button 
                onClick={() => setViewType('month')} 
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewType === 'month' ? 'bg-[#333D79] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Month
              </button>
            </div>
          </div>
        </div>
        
        {/* Breadcrumbs and Course/Class Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center flex-wrap">
              <div className="flex items-center breadcrumb-item">
                <Link to="/dashboard/courses" className="text-[#333D79] hover:underline">
                  Courses
                </Link>
                <span className="breadcrumb-arrow">&gt;</span>
              </div>
              
              {/* Course Dropdown */}
              <div className="relative">
                <button 
                  className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                >
                  <span>{selectedCourse ? selectedCourse.name : 'Select Course'}</span>
                  <FiChevronDown />
                </button>
                
                {showCourseDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                    {courses.length > 0 ? (
                      courses.map(course => (
                        <button 
                          key={course.id}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                          onClick={() => {
                            setSelectedCourse(course);
                            setShowCourseDropdown(false);
                          }}
                        >
                          {course.name}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-600">No courses found</div>
                    )}
                  </div>
                )}
              </div>
              
              {selectedCourse && (
                <>
                  <span className="breadcrumb-arrow">&gt;</span>
                  
                  {/* Class Dropdown */}
                  <div className="relative">
                    <button 
                      className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      onClick={() => setShowClassDropdown(!showClassDropdown)}
                    >
                      <span>{selectedClass ? selectedClass.name : 'Select Class'}</span>
                      <FiChevronDown />
                    </button>
                    
                    {showClassDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                        {classes.length > 0 ? (
                          classes.map(classItem => (
                            <button 
                              key={classItem.id}
                              className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                              onClick={() => {
                                setSelectedClass(classItem);
                                setShowClassDropdown(false);
                              }}
                            >
                              {classItem.name} - Section {classItem.section || 'A'}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-600">No classes found</div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {selectedClass && (
                <>
                  <span className="breadcrumb-arrow">&gt;</span>
                  <span className="text-gray-600">Schedule</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={goToPrevious}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
              >
                <FiChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-semibold text-gray-800 min-w-[180px] text-center">
                {formatDateRange()}
              </h2>
              <button 
                onClick={goToNext}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
              >
                <FiChevronRight size={20} />
              </button>
              <button 
                onClick={goToToday}
                className="ml-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 overflow-x-auto">
          {selectedClass ? (
            <div>
              {selectedClass.schedule && (
                <div className="mb-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-center text-gray-700 font-medium">
                    <span className="text-[#333D79]">{selectedClass.name}</span> meets <span className="text-[#333D79]">{selectedClass.schedule}</span>
                  </p>
                </div>
              )}
              
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th className="table-head"></th>
                    {dayNames.map((day) => (
                      <th key={day} className="table-head">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot) => (
                    <tr key={slot.value}>
                      <td className="time-cell">
                        <div className="time-cell-inner">
                          <span className="time-value">{slot.display}</span>
                        </div>
                      </td>
                      {Array.from(Array(7)).map((_, dayIndex) => (
                        <td 
                          key={`${slot.value}-${dayIndex}`}
                          className={getCellClassName(dayIndex, slot)}
                        >
                          {isTimeSlotScheduled(dayIndex, slot) && (
                            <div className="class-cell-content">
                              {/* Show class name only in the first cell of the first day */}
                              {(slot.value === "13:30" && dayIndex === 1) && (
                                <span>{selectedClass.name}</span>
                              )}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-[#f8faff] border border-dashed border-gray-300 rounded-xl p-10 text-center">
              <div className="max-w-md mx-auto">
                <FiClock className="mx-auto h-12 w-12 text-[#333D79] opacity-50 mb-4" />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {selectedCourse ? "Select a Class" : "Select a Course"}
                </h3>
                <p className="text-gray-600 mb-6">
                  {selectedCourse 
                    ? "Please select a class to view its schedule"
                    : "Please select a course to view its classes' schedules"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Information Cards */}
        {selectedClass && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                <FiCalendar className="mr-2 text-[#333D79]" size={18} />
                Schedule Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Course:</span>
                  <span className="font-medium">{selectedCourse?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Class:</span>
                  <span className="font-medium">{selectedClass?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Section:</span>
                  <span className="font-medium">{selectedClass?.section || 'A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Schedule:</span>
                  <span className="font-medium">{selectedClass?.schedule || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Students:</span>
                  <span className="font-medium">{selectedClass?.student_count || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                <FiClock className="mr-2 text-[#333D79]" size={18} />
                Navigation
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                You can view the schedule for each class by selecting a course and then a class from the dropdown menus above.
              </p>
              <div className="flex space-x-3">
                <Link 
                  to={`/dashboard/course/${selectedCourse?.id}`} 
                  className="text-[#333D79] text-sm font-medium flex items-center hover:underline"
                >
                  View Course Details
                </Link>
                <Link 
                  to={`/dashboard/class/${selectedClass?.id}`} 
                  className="text-[#333D79] text-sm font-medium flex items-center hover:underline"
                >
                  View Class Details
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Schedule;