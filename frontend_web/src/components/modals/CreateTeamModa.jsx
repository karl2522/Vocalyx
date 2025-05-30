import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { showToast } from '../../utils/toast.jsx';

const CreateTeamModal = ({ 
  isOpen, 
  onClose, 
  onCreateTeam, 
  isCreatingTeam, 
  allCourses, 
  isLoadingCourses, 
  allUsers, 
  isLoadingUsers, 
  fetchUsers 
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [teamName, setTeamName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [initialMembers, setInitialMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoursesToAdd, setSelectedCoursesToAdd] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');

  const debounceTimerRef = useRef(null);

  const debouncedFetchUsers = useCallback((query) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (query && query.length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchUsers(query);
      }, 500);
    }
  }, [fetchUsers]);

   useEffect(() => {
    if (isOpen) {
      setActiveTab('details');
      setTeamName('');
      setInitialMembers([]);
      setSelectedCoursesToAdd([]);
      setNewMemberEmail('');
      setSearchTerm('');
    }
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOpen]);

   useEffect(() => {
    debouncedFetchUsers(searchTerm);
  }, [searchTerm, debouncedFetchUsers]);

  useEffect(() => {
    if (searchTerm && searchTerm.length >= 2) {
      const delayDebounceFn = setTimeout(() => {
        fetchUsers(searchTerm);
      }, 300);
      
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchTerm, fetchUsers]);

   const handleEmailInputChange = (e) => {
    const value = e.target.value;
    setNewMemberEmail(value);
    
    // Only update search term if at least 2 characters
    if (value.length >= 2) {
      setSearchTerm(value);
    } else if (value.length < 2 && searchTerm) {
      setSearchTerm(''); // Clear search when input is too short
    }
  };

  const handleAddInitialMember = () => {
    if (!newMemberEmail || !newMemberEmail.includes('@')) {
      showToast.error('Please enter a valid email address', 'Invalid Email');
      return;
    }
    
    setInitialMembers([...initialMembers, newMemberEmail]);
    setNewMemberEmail('');
    setSearchTerm('');
  };
  
  const handleRemoveInitialMember = (emailToRemove) => {
    setInitialMembers(initialMembers.filter(email => email !== emailToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!teamName.trim() || teamName.length < 4) {
      showToast.error('Please enter a team name (at least 4 characters)', 'Invalid Team Name');
      return;
    }
    
    const teamData = {
      name: teamName,
      members: initialMembers,
      courses: selectedCoursesToAdd.map(id => parseInt(id, 10))
    };
    
    onCreateTeam(teamData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50" 
         onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-0 w-full max-w-2xl m-4 relative animate-fadeIn overflow-hidden"
           onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Progress Indicator */}
        <div className="bg-gray-50 p-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Create New Team</h3>
          <div className="flex items-center w-full max-w-lg mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm border-2 ${
                activeTab === 'details' 
                  ? 'bg-[#333D79] text-white border-[#333D79]' 
                  : 'bg-white text-gray-700 border-gray-300'
              }`}>
                1
              </div>
              <span className={`text-xs mt-2 ${activeTab === 'details' ? 'font-medium text-[#333D79]' : 'text-gray-600'}`}>
                Details
              </span>
            </div>

            {/* Line 1 */}
            <div className="flex-1 h-1 mx-2">
              <div className={`h-full ${activeTab === 'details' ? 'bg-gray-300' : 'bg-[#333D79]'}`}></div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm border-2 ${
                activeTab === 'members' 
                  ? 'bg-[#333D79] text-white border-[#333D79]' 
                  : activeTab === 'courses' 
                    ? 'bg-white text-gray-700 border-[#333D79]'
                    : 'bg-white text-gray-700 border-gray-300'
              }`}>
                2
              </div>
              <span className={`text-xs mt-2 ${
                activeTab === 'members' 
                  ? 'font-medium text-[#333D79]' 
                  : activeTab === 'courses' 
                    ? 'font-medium text-gray-700'
                    : 'text-gray-600'
              }`}>
                Members
              </span>
            </div>

            {/* Line 2 */}
            <div className="flex-1 h-1 mx-2">
              <div className={`h-full ${activeTab === 'courses' ? 'bg-[#333D79]' : 'bg-gray-300'}`}></div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm border-2 ${
                activeTab === 'courses' 
                  ? 'bg-[#333D79] text-white border-[#333D79]' 
                  : 'bg-white text-gray-700 border-gray-300'
              }`}>
                3
              </div>
              <span className={`text-xs mt-2 ${activeTab === 'courses' ? 'font-medium text-[#333D79]' : 'text-gray-600'}`}>
                Courses
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {/* Team Details */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                  <input
                    id="teamName"
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter a name for your team"
                    className={`w-full px-4 py-2 border ${teamName.length > 0 && teamName.length < 4 ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-[#333D79]'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:border-transparent`}
                    required
                    minLength={4}
                  />
                  {teamName.length > 0 && teamName.length < 4 && (
                    <p className="mt-1 text-sm text-red-600">Team name must be at least 4 characters long</p>
                  )}
                </div>

                <div className="mt-5">
                  <p className="text-sm text-gray-600 mb-3">Create a team to:</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700">Share materials</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700">Track progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700">Collaborate with colleagues</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add Members */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="flex-1 relative">
                    <label htmlFor="newMemberEmail" className="block text-sm font-medium text-gray-700 mb-1">Invite Members</label>
                    <input
                      id="newMemberEmail"
                      type="email"
                      value={newMemberEmail}
                      onChange={handleEmailInputChange}
                      placeholder="Enter email address"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                    />

                    {newMemberEmail.length >= 2 && (
                      <div 
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto" 
                        style={{ zIndex: 9999 }}
                      >
                        {isLoadingUsers ? (
                          <div className="px-4 py-3 text-center text-sm text-gray-500">
                            <div className="inline-block animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                            Searching...
                          </div>
                        ) : allUsers && allUsers.length > 0 ? (
                          // If users are found, display them
                          allUsers.map((user) => (
                            <div 
                              key={user.id || Math.random()}
                              className={`px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                                user.isAlreadyMember ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                              }`}
                              onClick={() => {
                                if (!user.isAlreadyMember) {
                                  setNewMemberEmail(user.email);
                                  setSearchTerm('');
                                }
                              }}
                            >
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-700 font-medium">
                                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex flex-col flex-grow">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{user.name || user.email.split('@')[0]}</span>
                                  {user.isAlreadyMember && (
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                      Already a member
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">{user.email}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          // If no results but email format is valid, show a "Create new invitation" option
                          newMemberEmail.includes('@') ? (
                            <div 
                              className="px-4 py-3 cursor-pointer hover:bg-gray-100 text-left"
                              onClick={() => {
                                // Just use the email as is - no results found but email format is valid
                                setSearchTerm('');
                              }}
                            >
                              <p className="text-sm font-medium text-blue-600">Invite {newMemberEmail}</p>
                              <p className="text-xs text-gray-500">No existing user found. An invitation will be sent.</p>
                            </div>
                          ) : (
                            <div className="px-4 py-3 text-center text-sm text-gray-500">
                              No users found matching '{newMemberEmail}'
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="md:self-end">
                    <button
                      type="button"
                      onClick={handleAddInitialMember}
                      className="w-full md:w-auto px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">Added members will be invited once the team is created</p>

                  {initialMembers.length > 0 ? (
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700">Members to invite ({initialMembers.length})</h4>
                      </div>
                      <ul className="divide-y divide-gray-200">
                        {initialMembers.map((email, index) => (
                          <li key={index} className="px-4 py-2 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm">
                                {email.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm text-gray-700">{email}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveInitialMember(email)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-sm text-gray-500">No members added yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Add Courses */}
            {activeTab === 'courses' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="courseSelect" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Course
                  </label>
                  <select
                    id="courseSelect"
                    value={selectedCourse}
                    onChange={(e) => {
                      const courseId = e.target.value;
                      setSelectedCourse(courseId);
                      
                      // If a course is selected from dropdown, add it to selectedCoursesToAdd if not already there
                      if (courseId && !selectedCoursesToAdd.includes(Number(courseId))) {
                        setSelectedCoursesToAdd([...selectedCoursesToAdd, Number(courseId)]);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent bg-white"
                  >
                    <option value="">Select a course</option>
                    {allCourses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <p className="text-sm text-gray-600 font-medium mb-2">Your Available Courses</p>
                  <p className="text-xs text-gray-500 mb-4">Select courses to add to your team</p>

                  {isLoadingCourses ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#333D79]"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {allCourses.length > 0 ? (
                        allCourses.map(course => (
                          <div 
                            key={course.id} 
                            className={`border rounded-md p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                              selectedCoursesToAdd.includes(course.id) 
                                ? 'bg-blue-50 border-blue-300' 
                                : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                            }`}
                            onClick={() => {
                              if (selectedCoursesToAdd.includes(course.id)) {
                                // Deselect this course
                                setSelectedCoursesToAdd(selectedCoursesToAdd.filter(id => id !== course.id));
                                
                                // If this was the currently selected course in the dropdown, clear it
                                if (selectedCourse === String(course.id)) {
                                  setSelectedCourse('');
                                }
                              } else {
                                // Select this course
                                setSelectedCoursesToAdd([...selectedCoursesToAdd, course.id]);
                                
                                // Update dropdown selection to match this course
                                setSelectedCourse(String(course.id));
                              }
                            }}
                          >
                            {/* Course selection indicator */}
                            <div className={`w-5 h-5 rounded-full flex-shrink-0 border ${
                              selectedCoursesToAdd.includes(course.id) 
                                ? 'border-blue-500 bg-blue-500' 
                                : 'border-gray-300 bg-white'
                            } flex items-center justify-center`}>
                              {selectedCoursesToAdd.includes(course.id) && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            
                            <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <div className="flex-grow">
                              <p className="text-sm font-medium text-gray-700">{course.name}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                                  {course.subject || 'General'}
                                </span>
                                {course.isOwner && (
                                  <span className="text-xs text-gray-500">
                                    • You own this course
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">No courses available for collaboration yet</p>
                          <Link 
                            to="/dashboard/courses/create" 
                            className="px-4 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md hover:opacity-90 transition-all shadow-sm inline-flex items-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Create a Course
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected courses count */}
                {selectedCoursesToAdd.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">{selectedCoursesToAdd.length}</span> course{selectedCoursesToAdd.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons - always visible */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'details') {
                    onClose();
                  } else if (activeTab === 'members') {
                    setActiveTab('details');
                  } else if (activeTab === 'courses') {
                    setActiveTab('members');
                  }
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                {activeTab === 'details' ? 'Cancel' : 'Back'}
              </button>

              <div className="flex gap-3">
                {activeTab === 'details' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!teamName.trim()) {
                        showToast.error('Please enter a team name', 'Team Name Required');
                        return;
                      }
                      if (teamName.trim().length < 4) {
                        showToast.error('Team name must be at least 4 characters long', 'Invalid Team Name');
                        return;
                      }
                      setActiveTab('members');
                    }}
                    className={`px-4 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md transition-all duration-200 shadow-sm ${
                      !teamName.trim() ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'
                    }`}
                  >
                    Next
                  </button>
                )}
                
                {activeTab === 'members' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('courses')}
                    className="px-5 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md hover:opacity-90 transition-opacity shadow-sm font-medium"
                  >
                    Next
                  </button>
                )}
                
                {activeTab === 'courses' && (
                  <>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="px-5 py-2 border border-[#333D79] text-[#333D79] font-medium rounded-md hover:bg-blue-50 transition-colors"
                      disabled={isCreatingTeam}
                    >
                      {isCreatingTeam ? 'Creating...' : 'Skip'}
                    </button>
                    
                    <button
                      type="submit"
                      className={`px-5 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md transition-opacity shadow-sm font-medium ${
                        isCreatingTeam ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'
                      }`}
                      disabled={isCreatingTeam}
                    >
                      {isCreatingTeam ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                          Creating...
                        </>
                      ) : (
                        'Create Team'
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

CreateTeamModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreateTeam: PropTypes.func.isRequired,
  isCreatingTeam: PropTypes.bool.isRequired,
  allCourses: PropTypes.array.isRequired,
  isLoadingCourses: PropTypes.bool.isRequired,
  allUsers: PropTypes.array.isRequired,
  isLoadingUsers: PropTypes.bool.isRequired,
  fetchUsers: PropTypes.func.isRequired
};

export default CreateTeamModal;