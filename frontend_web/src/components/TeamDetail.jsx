import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { courseService, teamService } from '../services/api';
import { showToast } from '../utils/toast';
import DashboardLayout from './layouts/DashboardLayout';
import AddCoursesModal from './modals/AddCourseModal';

const TeamDetail = ({ userIsOwner }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamCourses, setTeamCourses] = useState([]);

  const [showAddCoursesModal, setShowAddCoursesModal] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [selectedCoursesToAdd, setSelectedCoursesToAdd] = useState([]);
  const [isAddingCourses, setIsAddingCourses] = useState(false);

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    lastQuery: '',
    receivedResponse: false,
    resultsCount: 0
  });
  
  const searchTimeoutRef = useRef(null);
  const lastSearchQueryRef = useRef('');

  const searchUsers = useCallback((query) => {
  
  if (!query || query.length < 2) {
    setSearchResults([]);
    setShowSearchResults(false);
    return;
  }

  if (query === lastSearchQueryRef.current && searchResults.length > 0) {
    console.log("Skipping duplicate query:", query);
    return;
  }

  if (searchTimeoutRef.current) {
    clearTimeout(searchTimeoutRef.current);
  }

  setIsSearchingUsers(true);
  setShowSearchResults(true);

  lastSearchQueryRef.current = query;
  setDebugInfo(prev => ({...prev, lastQuery: query}));

  searchTimeoutRef.current = setTimeout(async () => {
    try {
      console.log("Executing search for users (debounced):", query);
      
      const response = await teamService.searchUsers(query);
      console.log("Search API response:", response);
      
      if (response && response.data) {
        console.log("Raw search results:", response.data);
        
        setSearchResults(response.data);
        setDebugInfo(prev => ({
          ...prev, 
          receivedResponse: true,
          resultsCount: response.data.length
        }));
        
        if (response.data.length > 0) {
          console.log("First result email:", response.data[0].email);
          
          const memberEmailsSet = new Set(
            teamMembers
              .filter(member => member.user_email)
              .map(member => member.user_email.toLowerCase())
          );
          
          console.log("Member emails set:", memberEmailsSet);
          console.log("Is first result already a member?", 
                     memberEmailsSet.has(response.data[0].email.toLowerCase()));
        }
      } else {
        console.log("No data in response or response is undefined");
        setSearchResults([]);
        setDebugInfo(prev => ({
          ...prev, 
          receivedResponse: true,
          resultsCount: 0
        }));
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
      setDebugInfo(prev => ({
        ...prev, 
        receivedResponse: true,
        error: error.message,
        resultsCount: 0
      }));
    } finally {
      setIsSearchingUsers(false);
    }
  }, 300);
}, [teamMembers]);

  const fetchAvailableCourses = async () => {
  try {
    setIsLoadingCourses(true);
    
    const ownCoursesResponse = await courseService.getCourses();
    
    const response = await teamService.getTeamById(id);
    const teamCourseIds = response.data.courses.map(c => c.id) || [];
    
    // Format courses for the modal
    const formattedCourses = (ownCoursesResponse.data || [])
      .filter(course => !teamCourseIds.includes(course.id))
      .map(course => ({
        id: course.id,
        name: course.name,
        subject: course.courseCode || 'No Code',
        isOwner: true,
        thumbnail: 'https://via.placeholder.com/400x200?text=Course'
      }));
    
    console.log("Available courses for modal:", formattedCourses);
    setAllCourses(formattedCourses);
    
  } catch (error) {
    console.error('Error fetching available courses:', error);
    showToast.error('Failed to load courses');
  } finally {
    setIsLoadingCourses(false);
  }
};

  const removeMember = async (memberId) => {
  try {
    await teamService.removeMember(team.id, memberId);
    setTeamMembers(teamMembers.filter(m => m.id !== memberId));
    showToast.deleted('Team member');
  } catch (error) {
    console.error('Error removing member:', error);
    showToast.error('Failed to remove member');
  }
};

    const updateMemberPermission = async (memberId, newPermission) => {
  try {
    await teamService.updateMemberPermissions(team.id, memberId, newPermission);
    
    // Update local state to reflect the change
    setTeamMembers(teamMembers.map(member => 
      member.id === memberId ? { ...member, permissions: newPermission } : member
    ));
    
    showToast.updated('Member permissions');
  } catch (error) {
    console.error('Error updating member permissions:', error);
    showToast.error('Failed to update member permissions');
  }
};

  const handleOpenAddCoursesModal = () => {
    setSelectedCoursesToAdd([]);
    fetchAvailableCourses();
    setShowAddCoursesModal(true);
  };

  const handleAddCoursesToTeam = async () => {
    if (selectedCoursesToAdd.length === 0) return;
    
    setIsAddingCourses(true);
    try {
      const addPromises = selectedCoursesToAdd.map(courseId => 
        teamService.addCourse(team.id, courseId)
      );
      
      await Promise.all(addPromises);
      
      // Refresh team data to get updated courses
      const response = await teamService.getTeamById(id);
      setTeamCourses(response.data.courses || []);
      
      setShowAddCoursesModal(false);
      showToast.success(`${selectedCoursesToAdd.length} course${selectedCoursesToAdd.length !== 1 ? 's' : ''} added to team`);
      setSelectedCoursesToAdd([]);
    } catch (error) {
      console.error('Error adding courses:', error);
      showToast.error('Failed to add courses to team');
    } finally {
      setIsAddingCourses(false);
    }
  };
  
  const handleAddMember = async (email) => {
    if (!email) return;
    
    try {
      await teamService.addMember(team.id, email);
      showToast.success('Invitation sent successfully!');
      
      // Refresh team members
      const response = await teamService.getTeamById(id);
      setTeamMembers(response.data.members || []);
      
      // Reset form
      setNewMemberEmail('');
      setSearchResults([]);
      setShowSearchResults(false);
    } catch (error) {
      console.error('Error adding member:', error);
      showToast.error('Failed to send invitation');
    }
  };

  useEffect(() => {
    const fetchTeamDetails = async () => {
      try {
        setIsLoading(true);
        const response = await teamService.getTeamById(id);
        
        if (response.data) {
            const isOwner = response.data.is_owner === true;
          
          if (isOwner !== userIsOwner) {
            navigate(isOwner ? `/dashboard/team/your-teams/${id}` : `/dashboard/team/joined-teams/${id}`);
            return;
          }
          
          setTeam(response.data);
          setTeamMembers(response.data.members || []);
          setTeamCourses(response.data.courses || []);
        }
      } catch (error) {
        console.error('Error fetching team details:', error);
        showToast.error('Failed to load team details');
        navigate(userIsOwner ? '/dashboard/team/your-teams' : '/dashboard/team/joined-teams');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeamDetails();
    
    // Clean up any lingering timeouts
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [id, userIsOwner, navigate]);
  
  // Search users when email input changes
  useEffect(() => {
    searchUsers(newMemberEmail);
  }, [newMemberEmail, searchUsers]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSearchResults && !e.target.closest('.member-search-container')) {
        setShowSearchResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearchResults]);

  return (
    <DashboardLayout>
      <div className="pb-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : team ? (
          <>
            {/* Team Header */}
            <div className="hero-gradient rounded-xl mb-8 p-5 shadow-sm border border-gray-100 overflow-hidden relative">
              <div className="bg-blur-circle bg-blur-circle-top"></div>
              <div className="bg-blur-circle bg-blur-circle-bottom"></div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-gradient-to-r from-[#333D79] to-[#4A5491] rounded-lg shadow-md flex items-center justify-center text-white text-xl font-bold">
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                  </div>
                  <div className="flex items-center gap-3 mt-2 ml-1">
                    <span className="text-gray-600">
                      {team.members_count || teamMembers.length} members
                    </span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    <span className="text-gray-600">
                      {team.courses_count || teamCourses.length} courses
                    </span>
                    {!userIsOwner && (
                      <>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                        <span className="text-gray-600">
                          Owner: {team.owner_name || 'Unknown'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                {userIsOwner && (
                  <div className="mt-4 md:mt-0">
                    <div className="px-4 py-2 bg-blue-50 rounded-md border border-blue-100 relative overflow-hidden">
                      <p className="text-xs text-gray-500 mb-1">Team code</p>
                      <div className="flex items-center gap-2">
                        <span className="text-md font-medium tracking-wider text-blue-700 font-mono">{team.code}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(team.code)
                              .then(() => {
                                showToast.copied('Team code');
                              })
                              .catch(err => {
                                console.error('Failed to copy: ', err);
                              });
                          }}
                          className="p-1 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Team Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Team Members */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Team Members
                  </h2>
                  
                  {teamMembers.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                            <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 font-medium">
                                {(member.name || member.user_email || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-900">{member.name || member.user_email}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    member.role === 'owner' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : member.role === 'invited'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-green-100 text-green-800'
                                }`}>
                                    {member.role === 'owner' 
                                    ? 'Owner' 
                                    : member.role === 'invited'
                                        ? 'Invited'
                                        : 'Member'}
                                </span>
                                {member.role !== 'owner' && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    member.permissions === 'full' 
                                        ? 'bg-green-50 text-green-800 border border-green-200' 
                                        : member.permissions === 'edit'
                                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                        : 'bg-gray-50 text-gray-700 border border-gray-200'
                                    }`}>
                                    {member.permissions === 'full' 
                                        ? 'Full Access' 
                                        : member.permissions === 'edit'
                                        ? 'Can Edit'
                                        : 'View Only'}
                                    </span>
                                )}
                                </div>
                            </div>
                            </div>
                            
                            {userIsOwner && member.role !== 'owner' && (
                            <div className="flex items-center gap-2">
                                <div className="relative group">
                                <button 
                                    className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                                    onClick={() => {
                                    // Show a dropdown or modal to change permissions
                                    const newPermission = member.permissions === 'view' ? 'edit' 
                                                        : member.permissions === 'edit' ? 'full' 
                                                        : 'view';
                                    // This will cycle through the permissions
                                    updateMemberPermission(member.id, newPermission);
                                    }}
                                >
                                    Change Access
                                </button>
                                <div className="absolute z-20 hidden group-hover:block mt-1 px-2 py-1 text-xs bg-gray-700 text-white rounded whitespace-nowrap">
                                    Click to cycle: View → Edit → Full → View
                                </div>
                                </div>
                                <button 
                                className="px-2.5 py-1 text-xs bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-100 transition-colors"
                                onClick={() => {
                                    if (window.confirm(`Are you sure you want to remove ${member.name || member.user_email} from this team?`)) {
                                    removeMember(member.id);
                                    }
                                }}
                                >
                                Remove
                                </button>
                            </div>
                            )}
                        </div>
                        ))}
                    </div>
                    ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">No team members found</p>
                    </div>
                    )}
                  
                  {userIsOwner && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Add New Member</h3>
                      <div className="member-search-container relative">
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <input
                              type="email"
                              value={newMemberEmail}
                              onChange={(e) => setNewMemberEmail(e.target.value)}
                              onFocus={() => {
                                if (newMemberEmail.length >= 2) {
                                  setShowSearchResults(true);
                                }
                              }}
                              placeholder="Email address"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />

                            {/* Search results dropdown */}
                            {showSearchResults && newMemberEmail.length >= 2 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                {isSearchingUsers ? (
                                    <div className="px-4 py-3 text-center text-sm text-gray-500">
                                    <div className="inline-block animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                                    Searching...
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    // Updated to handle different possible user objects formats
                                    searchResults.map((user) => {
                                    // Try to extract email, could be in different properties
                                    const email = user.email || user.mail || user.emailAddress;
                                    // Try to extract name fields
                                    const firstName = user.first_name || user.firstName || '';
                                    const lastName = user.last_name || user.lastName || '';
                                    const displayName = user.name || user.displayName || 
                                                        (firstName && lastName ? `${firstName} ${lastName}` : '') || 
                                                        email?.split('@')[0] || 'Unknown User';

                                    const isAlreadyMember = teamMembers.some(member => 
                                        member.user_email && member.user_email.toLowerCase() === email.toLowerCase()
                                    );
                                    
                                    return (
                                        <div 
                                            key={user.id || Math.random()}
                                            className={`px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                                            isAlreadyMember ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                            }`}
                                            onClick={() => {
                                            if (!isAlreadyMember) {
                                                setNewMemberEmail(email);
                                                setShowSearchResults(false);
                                            }
                                            }}
                                        >
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <span className="text-blue-700 font-medium">
                                                {(displayName || email || 'U').charAt(0).toUpperCase()}
                                            </span>
                                            </div>
                                            <div className="flex flex-col flex-grow">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{displayName}</span>
                                                {isAlreadyMember && (
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                                    Already a member
                                                </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-500">{email}</span>
                                            </div>
                                        </div>
                                        );
                                    })
                                ) : debugInfo.receivedResponse ? (
                                    // Updated to show debug info for when "No users found"
                                    <div>
                                    <div className="px-4 py-3 text-center text-sm text-gray-500">
                                        No users found matching '{newMemberEmail}'
                                    </div>
                                    {newMemberEmail.includes('@') && (
                                        <div 
                                        className="px-4 py-3 cursor-pointer hover:bg-gray-100 text-left border-t border-gray-100"
                                        onClick={() => {
                                            handleAddMember(newMemberEmail);
                                        }}
                                        >
                                        <p className="text-sm font-medium text-blue-600">Invite {newMemberEmail}</p>
                                        <p className="text-xs text-gray-500">Send invitation to this email address</p>
                                        </div>
                                    )}
                                    </div>
                                ) : (
                                    <div className="px-4 py-3 text-center text-sm text-gray-500">
                                    Type to search for users...
                                    </div>
                                )}
                                </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddMember(newMemberEmail)}
                            className="px-3 py-2 bg-[#333D79] text-white rounded-md hover:bg-opacity-90 transition-colors"
                          >
                            Invite
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Team Courses */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Team Courses
                    </h2>
                    
                   {userIsOwner && (
                      <button
                        className="px-3 py-1.5 bg-[#333D79] text-white text-sm rounded-md hover:bg-opacity-90 transition-colors flex items-center gap-1"
                        onClick={handleOpenAddCoursesModal}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Course
                      </button>
                    )}
                  </div>
                  
                  {teamCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {teamCourses.map((course) => (
                        <div key={course.id} className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow transition-shadow">
                          <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h4 className="font-medium text-gray-900">{course.name}</h4>
                            <p className="text-sm text-gray-500">{course.courseCode || 'No code'}</p>
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{course.semester || 'General'}</span>
                            <Link 
                                to={`/dashboard/course/${course.id}`}
                                state={{ 
                                    teamAccess: {
                                    teamId: team.id,
                                    teamName: team.name,
                                    accessLevel: team.permissions || 'view'
                                    }
                                }}
                                className="text-[#333D79] hover:underline flex items-center gap-1"
                                >
                                View <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-600 mb-2">No courses in this team yet</p>
                      {userIsOwner && (
                        <button
                          className="px-4 py-2 bg-[#333D79] text-white text-sm rounded-md hover:bg-opacity-90 transition-colors"
                          onClick={handleOpenAddCoursesModal} 
                        >
                          Add First Course
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <h2 className="text-xl font-medium text-gray-700">Team not found</h2>
            <p className="text-gray-500 mt-2">The team you're looking for doesn't exist or you don't have access to it.</p>
            <button
              className="mt-4 px-4 py-2 bg-[#333D79] text-white rounded-md hover:bg-opacity-90 transition-colors"
              onClick={() => navigate('/dashboard/team')}
            >
              Back to Teams
            </button>
          </div>
        )}
      </div>

       {showAddCoursesModal && (
        <AddCoursesModal
          isOpen={showAddCoursesModal}
          onClose={() => setShowAddCoursesModal(false)}
          onAddCourses={handleAddCoursesToTeam}
          isAddingCourses={isAddingCourses}
          teamName={team?.name || ''}
          allCourses={allCourses}
          isLoadingCourses={isLoadingCourses}
          selectedCoursesToAdd={selectedCoursesToAdd}
          setSelectedCoursesToAdd={setSelectedCoursesToAdd}
        />
      )}
    </DashboardLayout>
  );
};

export default TeamDetail;