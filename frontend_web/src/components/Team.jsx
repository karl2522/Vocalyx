import { useState, useEffect, useMemo, useCallback } from 'react';
import { FiPlus, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { commonHeaderAnimations } from '../utils/animation.js';
import { showToast } from '../utils/toast.jsx';
import DashboardLayout from './layouts/DashboardLayout';
import { teamService } from '../services/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import axios from 'axios';

const generateRandomCode = () => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

const TeamStyles = () => {
  const styles = useMemo(() => `
    ${commonHeaderAnimations}
    
    @keyframes animate-fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .animate-fadeIn {
      animation: animate-fadeIn 0.3s ease-in forwards;
    }
  `, []);
  
  return <style>{styles}</style>;
};

const PERMISSION_LEVELS = {
  VIEW: 'view',
  EDIT: 'edit',
  FULL: 'full'
};



const Team = () => {
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddCoursesModal, setShowAddCoursesModal] = useState(false);
  const [hasTeam, setHasTeam] = useState(false);
  const [isTeamOwner, setIsTeamOwner] = useState(false);
  const [generatedTeamCode, setGeneratedTeamCode] = useState(generateRandomCode());
  const [isCopied, setIsCopied] = useState(false);
  const [selectedCoursesToAdd, setSelectedCoursesToAdd] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [coursesSearchTerm, setCoursesSearchTerm] = useState('');
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const { user } = useAuth();
  const [teamId, setTeamId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isJoiningTeam, setIsJoiningTeam] = useState(false);
  const [isAddingCourses, setIsAddingCourses] = useState(false);
  const [teamCourses, setTeamCourses] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  
  const [initialMembers, setInitialMembers] = useState([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [activeTab, setActiveTab] = useState('details');

useEffect(() => {
  const checkExistingTeam = async () => {
    try {
      setIsLoading(true);
      const response = await teamService.getMyTeam();
      if (response.data && response.data.id) {
        setHasTeam(true);
        setTeamId(response.data.id);
        setTeamName(response.data.name);
        setGeneratedTeamCode(response.data.code);
        
        const isOwner = response.data.owner_details && 
                        response.data.owner_details.id === user?.id;
        setIsTeamOwner(isOwner);
        
        const members = response.data.members.map(member => ({
          id: member.id,
          name: member.name || member.user_details?.first_name + ' ' + member.user_details?.last_name,
          email: member.user_details?.email || member.invitation_email,
          role: member.role === 'owner' ? 'Lead Teacher' : 
                member.role === 'admin' ? 'Admin' : 
                member.role === 'invited' ? 'Invited' : 'Member',
          permissions: member.permissions
        }));
        
        setTeamMembers(members);
        
        if (response.data.team_courses && response.data.team_courses.length > 0) {
          console.log("Found team courses:", response.data.team_courses);
          setTeamCourses(response.data.team_courses);
        } else {
          console.log("No team courses found in response");
          fetchTeamCourses(response.data.id);
        }
      }
    } catch (error) {
      console.log('No team found or error fetching team:', error);
      setHasTeam(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  checkExistingTeam();
}, [user?.id]);

  const fetchTeamCourses = async (teamId) => {
  try {
    // This assumes you have an endpoint to get courses for a specific team
    // If this endpoint doesn't exist, you'll need to add it to your backend and API service
    const response = await teamService.getTeamCourses(teamId);
    setTeamCourses(response.data);
  } catch (error) {
    console.error('Error fetching team courses:', error);
  }
};


  const fetchCourses = useCallback(async () => {
  try {
    setIsLoadingCourses(true);
    const response = await teamService.getAvailableCourses();
    setAllCourses(response.data);
  } catch (error) {
    console.error('Error fetching courses:', error);
    showToast.error('Failed to fetch courses');
  } finally {
    setIsLoadingCourses(false);
  }
}, []);

  useEffect(() => {
  if (showAddCoursesModal) {
    fetchCourses();
  }
}, [showAddCoursesModal, fetchCourses]);

useEffect(() => {
  if (showCreateModal && activeTab === 'courses') {
    fetchCourses();
  }
}, [showCreateModal, activeTab, fetchCourses]);

 const filteredCourses = useMemo(() => {
  if (!allCourses.length) return { userCourses: [], teamCourses: [] };
  
  let filtered = allCourses;
  
  if (coursesSearchTerm.trim()) {
    filtered = filtered.filter(course => 
      course.name.toLowerCase().includes(coursesSearchTerm.toLowerCase()) ||
      course.subject?.toLowerCase().includes(coursesSearchTerm.toLowerCase())
    );
  }
  
  const userCourses = filtered.filter(course => course.isOwner);
  const teamCourses = filtered.filter(course => !course.isOwner);
  
  return { userCourses, teamCourses };
}, [allCourses, coursesSearchTerm]);

const fetchUsers = useCallback(async (searchQuery) => {
  if (!searchQuery || searchQuery.length < 2) return;
  
  try {
    setIsLoadingUsers(true);
    console.log("Searching for users with direct API call:", searchQuery);
    
    const token = localStorage.getItem('authToken');
    const response = await axios.get(
      `http://127.0.0.1:8000/api/teams/search_users/?q=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log("Search response:", response);
    if (response.data) {
      console.log("Found users:", response.data);
      const usersWithMembershipStatus = response.data.map(user => ({
        ...user,
        isAlreadyMember: teamMembers.some(member => member.email.toLowerCase() === user.email.toLowerCase())
      }));
      setAllUsers(usersWithMembershipStatus);
    } else {
      console.warn("No data in response");
      setAllUsers([]);
    }
  } catch (error) {
    console.error('Error searching users:', error);
    setAllUsers([]);
  } finally {
    setIsLoadingUsers(false);
  }
}, [teamMembers]);

  useEffect(() => {
  }, []);

useEffect(() => {
  if (searchTerm && searchTerm.length >= 2) {
    console.log("Setting up search with term:", searchTerm);
    const delayDebounceFn = setTimeout(() => {
      console.log("Executing search for:", searchTerm);
      fetchUsers(searchTerm);
    }, 300);
    
    return () => clearTimeout(delayDebounceFn);
  } else {
    setAllUsers([]);
  }
}, [searchTerm, fetchUsers]);

  const filteredUsers = useMemo(() => {
  if (!searchTerm.trim()) return [];  
  return allUsers.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);
}, [allUsers, searchTerm]);



 const updateMemberPermissions = async (memberId, newPermission) => {
  try {
    await teamService.updateMemberPermissions(teamId, memberId, newPermission);
    
    setTeamMembers(members => 
      members.map(member => 
        member.id === memberId ? { ...member, permissions: newPermission } : member
      )
    );
    
    showToast.success('Member permissions updated');
  } catch (error) {
    console.error('Error updating permissions:', error);
    showToast.error('Failed to update permissions');
  }
};

  const handleInvite = async (e) => {
  e.preventDefault();
  
  if (!teacherEmail || !teacherEmail.includes('@')) {
    showToast.error('Please enter a valid email address', 'Invalid Email');
    return;
  }
  
  const isAlreadyMember = teamMembers.some(member => 
    member.email.toLowerCase() === teacherEmail.toLowerCase()
  );
  
  if (isAlreadyMember) {
    showToast.error('This user is already a member of the team', 'Duplicate Member');
    return;
  }
  
  try {
    const response = await teamService.addMember(teamId, teacherEmail, PERMISSION_LEVELS.VIEW);
    
    const newMember = {
      id: response.data.id,
      name: response.data.name || teacherEmail.split('@')[0].replace(/[.]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email: teacherEmail,
      role: 'Invited',
      permissions: PERMISSION_LEVELS.VIEW
    };
    
    setTeamMembers([...teamMembers, newMember]);
    setTeacherEmail('');
    showToast.success('Invitation sent successfully!', 'Success');
  } catch (error) {
    console.error('Error inviting member:', error);
    showToast.error('Failed to send invitation');
  }
};

  const handleCreateTeam = async (e) => {
  e.preventDefault();
  
  if (!teamName.trim() || teamName.length < 4) {
    showToast.error('Please enter a team name (at least 4 characters)', 'Invalid Team Name');
    return;
  }
  
  setIsCreatingTeam(true);
  
  try {
    const teamData = {
      name: teamName,
      members: initialMembers,
      courses: selectedCoursesToAdd.map(id => parseInt(id, 10)) 
    };
    
    console.log("Creating team with data:", teamData);
    
    const response = await teamService.createTeam(teamData);
    
    setTeamId(response.data.id);
    setGeneratedTeamCode(response.data.code);
    
    const members = response.data.members.map(member => ({
      id: member.id,
      name: member.name || member.user_details?.first_name + ' ' + member.user_details?.last_name,
      email: member.user_details?.email || member.invitation_email,
      role: member.role === 'owner' ? 'Lead Teacher' : 
            member.role === 'admin' ? 'Admin' : 
            member.role === 'invited' ? 'Invited' : 'Member',
      permissions: member.permissions
    }));
    
    setTeamMembers(members);
    setHasTeam(true);
    setShowCreateModal(false);
    showToast.success(`Team "${teamName}" created successfully!`, 'Team Created');
    
    setTimeout(() => {
      showToast.info('Share your team code with colleagues', 'Team Code Ready');
    }, 1000);
  } catch (error) {
    console.error('Error creating team:', error);
    if (error.response) {
      console.log('Error response data:', error.response.data);
      console.log('Error response status:', error.response.status);
      
      const errorMessage = error.response.data?.detail || 'Failed to create team';
      showToast.error(errorMessage);
    } else {
      showToast.error('Failed to create team. Network error.');
    }
  } finally {
    setIsCreatingTeam(false);
  }
};
  
  const handleJoinTeam = async (e) => {
  e.preventDefault();
  
  if (!teamCode.trim()) {
    showToast.error('Please enter a join code', 'Invalid Code');
    return;
  }
  
  setIsJoiningTeam(true);
  
  try {
    const response = await teamService.joinTeam(teamCode);
    
    // Update local state with team data
    setTeamId(response.data.id);
    setTeamName(response.data.name);
    setGeneratedTeamCode(response.data.code);
    
    // Process team members
    const members = response.data.members.map(member => ({
      id: member.id,
      name: member.name || member.user_details?.first_name + ' ' + member.user_details?.last_name,
      email: member.user_details?.email || member.invitation_email,
      role: member.role === 'owner' ? 'Lead Teacher' : 
            member.role === 'admin' ? 'Admin' : 
            member.role === 'invited' ? 'Invited' : 'Member',
      permissions: member.permissions
    }));
    
    setTeamMembers(members);
    setHasTeam(true);
    showToast.success('You have joined the team successfully!', 'Team Joined');
  } catch (error) {
    console.error('Error joining team:', error);
    showToast.error(error.response?.data?.detail || 'Failed to join team');
  } finally {
    setIsJoiningTeam(false);
  }
};

  const handleRemoveMember = async (id) => {
  try {
    await teamService.removeMember(teamId, id);
    setTeamMembers(teamMembers.filter(member => member.id !== id));
    showToast.info('Team member removed', 'Member Removed');
  } catch (error) {
    console.error('Error removing member:', error);
    showToast.error('Failed to remove member');
  }
};

  const handleAddCoursesToTeam = async () => {
  try {
    setIsAddingCourses(true);
    const addPromises = selectedCoursesToAdd.map(courseId => 
      teamService.addCourse(teamId, courseId)
    );
    
    await Promise.all(addPromises);
    
    const newCourses = allCourses.filter(course => selectedCoursesToAdd.includes(course.id));
    setTeamCourses([...teamCourses, ...newCourses]);
    
    setShowAddCoursesModal(false);
    showToast.success(`${selectedCoursesToAdd.length} course${selectedCoursesToAdd.length !== 1 ? 's' : ''} added to team successfully!`, 'Courses Added');
    setSelectedCoursesToAdd([]);
  } catch (error) {
    console.error('Error adding courses:', error);
    showToast.error('Failed to add courses to team');
  } finally {
    setIsAddingCourses(false);
  }
};

  const handleAddInitialMember = () => {
    if (!newMemberEmail || !newMemberEmail.includes('@')) {
      showToast.error('Please enter a valid email address', 'Invalid Email');
      return;
    }
    
    setInitialMembers([...initialMembers, newMemberEmail]);
    setNewMemberEmail('');
  };
  
  const handleRemoveInitialMember = (emailToRemove) => {
    setInitialMembers(initialMembers.filter(email => email !== emailToRemove));
  };

  return (
    <DashboardLayout>
      <TeamStyles />
      <div className="pb-6">
        {/* Hero Section */}
        <div className="hero-gradient rounded-xl mb-8 p-5 shadow-sm border border-gray-100 overflow-hidden relative">
          {/* Background Elements */}
          <div className="bg-blur-circle bg-blur-circle-top"></div>
          <div className="bg-blur-circle bg-blur-circle-bottom"></div>
          <div className="bg-floating-circle hidden md:block"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
            <div className="flex items-center gap-4 fade-in-up" style={{animationDelay: '0s'}}>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-[#333D79] to-[#4A5491] flex items-center justify-center flex-shrink-0 shadow-md float-animation">
                <FiUsers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Team Collaboration</h1>
                <p className="text-gray-600">
                  Collaborate with other teachers and manage your courses and classes efficiently.
                </p>
              </div>
            </div>
            
            {!hasTeam && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 mt-4 md:mt-0 fade-in-up group"
                style={{animationDelay: '0s'}}
              >
                <FiPlus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                <span>Create Team</span>
              </button>
            )}
          </div>
        </div>

        {hasTeam ? (
          <>
            {/* Team Header with Code */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {teamName}
                  </h2>
                   <p className="text-sm text-gray-500 ml-8 mt-1">
                    {isTeamOwner ? `Team members: ${teamMembers.length}` : `You are a member of this team`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {isTeamOwner ? (
                  <div className={`px-4 py-2 bg-blue-50 rounded-md border ${isCopied ? 'border-green-300 bg-green-50' : 'border-blue-100'} relative overflow-hidden transition-colors duration-300`}>
                    <p className="text-xs text-gray-500 mb-1">Share this code with colleagues</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-md font-medium tracking-wider ${isCopied ? 'text-green-700' : 'text-blue-700'} font-mono transition-colors duration-300`}>{generatedTeamCode}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(generatedTeamCode)
                            .then(() => {
                              setIsCopied(true);
                              showToast.success('Team code copied to clipboard!', 'Copied');
                              setTimeout(() => setIsCopied(false), 2000);
                            })
                            .catch(err => {
                              console.error('Failed to copy: ', err);
                              showToast.error('Failed to copy code', 'Error');
                            });
                        }}
                        className="group relative flex items-center justify-center p-1 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        {isCopied ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 group-hover:text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                        <span className="absolute -bottom-8 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {isCopied ? 'Copied!' : 'Copy'}
                        </span>
                      </button>
                    </div>
                    <div className="absolute -right-8 -top-8 w-16 h-16 bg-blue-100 rounded-full opacity-10"></div>
                  </div>
                   ) : (
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-md">
                    Member
                  </span>
                )}
                </div>
              </div>
            </div>

          {isTeamOwner && (        
            <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Invite Colleagues
              </h3>
              <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    value={teacherEmail}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTeacherEmail(value);
                      setSearchTerm(value);
                      console.log("Search input changed:", value);
                    }}
                    placeholder="Enter colleague's email address"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent transition-all duration-200"
                    required
                  />
                  
                  {/* Debug indicator */}
                  {searchTerm.length > 0 && (
                    <div className="absolute top-full left-0 text-xs text-gray-500 mt-1">
                      Search term: {searchTerm} ({searchTerm.length} chars)
                    </div>
                  )}
                  
                  {/* User search results dropdown */}
                  {searchTerm.length >= 2 && (
                    <div className="absolute top-full left-0 w-full mt-6 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-auto">
                      {isLoadingUsers ? (
                        <div className="px-4 py-3 text-center text-sm text-gray-500">
                          <div className="inline-block animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                          Searching...
                        </div>
                      ) : allUsers && allUsers.length > 0 ? (
                        allUsers.map((user) => (
                          <div 
                            key={user.id || Math.random()}
                            className={`px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                              user.isAlreadyMember ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                            }`}
                            onClick={() => {
                              if (!user.isAlreadyMember) {
                                console.log("Selected user:", user);
                                setTeacherEmail(user.email);
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
                        <div className="px-4 py-3 text-center text-sm text-gray-500">
                          No users found matching '{searchTerm}'
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md hover:opacity-90 transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Invite Your Colleague
                </button>
              </form>
          </div>
        )}

            <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Team Courses
                </h3>
                <Link 
                  to="/dashboard/courses" 
                  className="px-3 py-1.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white text-sm rounded-md hover:opacity-90 transition-all flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Go to Courses
                </Link>
              </div>
              
              {teamCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamCourses.map(teamCourse => {
                    const course = teamCourse.course_details || teamCourse;
                    return (
                      <div key={teamCourse.id} className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow transition-shadow">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                          <h4 className="font-medium text-gray-900">{course.name}</h4>
                          <p className="text-sm text-gray-500">{course.courseCode || 'No code'}</p>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{course.semester || 'General'}</span>
                            <Link 
                              to={`/dashboard/course/${course.id}`} 
                              className="text-[#333D79] hover:underline flex items-center gap-1"
                            >
                              View <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h4 className="text-xl text-gray-800 font-medium mb-3">Course Collaboration</h4>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Add your existing courses to this team or browse available team courses to collaborate with your colleagues.
                  </p>
                  <div className="flex justify-center">
                    <button 
                      onClick={() => setShowAddCoursesModal(true)}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md hover:opacity-90 transition-all shadow-md inline-flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Add Existing Courses
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Read-only Team Members List - Visible to all team members */}
              {!isTeamOwner && teamMembers.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Team Members
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="p-4 border border-gray-100 rounded-lg flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 font-medium">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{member.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              member.role === 'Lead Teacher' 
                                ? 'bg-blue-100 text-blue-800' 
                                : member.role === 'Invited'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                            }`}>
                              {member.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            
            {isTeamOwner && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Manage Team Members
              </h3>

              {teamMembers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Role</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Permissions</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((member) => (
                        <tr key={member.id} className="border-b border-gray-100">
                          <td className="px-4 py-3 text-sm text-gray-800 font-medium">{member.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              member.role === 'Lead Teacher' 
                                ? 'bg-blue-100 text-blue-800' 
                                : member.role === 'Invited'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                            }`}>
                              {member.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="relative inline-block">
                              <select
                                value={member.permissions}
                                onChange={(e) => updateMemberPermissions(member.id, e.target.value)}
                                className="appearance-none bg-white border border-gray-300 text-sm rounded-md px-3 py-1 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value={PERMISSION_LEVELS.VIEW}>View Only</option>
                                <option value={PERMISSION_LEVELS.EDIT}>Can Edit</option>
                                <option value={PERMISSION_LEVELS.FULL}>Full Access</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path>
                                </svg>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => updateMemberPermissions(member.id, PERMISSION_LEVELS.FULL)}
                                className="text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors"
                              >
                                Make Admin
                              </button>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors flex items-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 px-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h3 className="text-gray-700 font-medium mb-1">Your team is empty</h3>
                  <p className="text-gray-500 text-sm mb-4">Invite colleagues to start collaborating</p>
                  <button
                    onClick={() => document.querySelector('input[type="email"]').focus()}
                    className="px-4 py-2 bg-white border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition-colors shadow-sm inline-flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add First Member
                  </button>
                </div>
              )}
            </div>
          )}
          </>
        ) : (
          /* Simple centered No Team Placeholder */
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
            <div className="p-12 text-center max-w-lg mx-auto">
              {/* Team icon */}
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-blue-50 rounded-full transform scale-150 opacity-50"></div>
                <div className="relative flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#f0f4ff] to-white rounded-full shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>

              {/* Title and description */}
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Join Your Teaching Team</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Enter your team code below to connect with colleagues and start collaborating.
              </p>

              {/* Join form */}
              <form onSubmit={handleJoinTeam} className="max-w-md mx-auto">
                <div className="mb-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
                      <kbd className="hidden md:inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-md">
                        6-digit code
                      </kbd>
                    </div>
                    <div className="relative">
                      <input
                        id="teamCode"
                        type="text"
                        value={teamCode}
                        onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                        placeholder="XXXXXX"
                        maxLength={6}
                        className="w-full pl-11 pr-4 md:pr-28 py-3.5 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] focus:bg-white transition-all duration-300 font-medium tracking-wider font-mono placeholder:text-gray-400 text-center md:text-left uppercase"
                        required
                      />
                      {teamCode.length > 0 && teamCode.length < 6 && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                          <div className="flex items-center gap-1">
                            {Array(6).fill(0).map((_, index) => (
                              <div 
                                key={index} 
                                className={`w-4 h-1 rounded-full ${
                                  index < teamCode.length ? 'bg-blue-500' : 'bg-gray-300'
                                }`}
                              ></div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 mb-4 font-medium"
                  disabled={isJoiningTeam}
                >
                  {isJoiningTeam ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Joining...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      Join Team
                    </>
                  )}
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Don&apos;t have a team code?
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="ml-1 text-[#333D79] font-medium hover:underline focus:outline-none"
                    >
                      Create your own team
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Team Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50" 
               onClick={() => setShowCreateModal(false)}>
            <div className="bg-white rounded-lg shadow-xl p-0 w-full max-w-2xl m-4 relative animate-fadeIn overflow-hidden"
                 onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowCreateModal(false)}
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
                <form onSubmit={handleCreateTeam}>
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
                              onChange={(e) => {
                                setNewMemberEmail(e.target.value);
                                setSearchTerm(e.target.value);
                              }}
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
                                          console.log("Selected user:", user);
                                          setNewMemberEmail(user.email);
                                          setSearchTerm('');
                                          setAllUsers([]); // Clear results after selection
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
                                        setAllUsers([]);
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
                          setShowCreateModal(false);
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
                        <>
                          <button
                            type="button"
                            onClick={() => setActiveTab('courses')}
                            className="px-5 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md hover:opacity-90 transition-opacity shadow-sm font-medium"
                          >
                            Next
                          </button>
                        </>
                      )}
                      
                      {activeTab === 'courses' && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              // Skip simply means create the team without any selected courses
                              handleCreateTeam(e);
                            }}
                            className="px-5 py-2 border border-[#333D79] text-[#333D79] font-medium rounded-md hover:bg-blue-50 transition-colors"
                            disabled={isCreatingTeam}
                          >
                            {isCreatingTeam ? 'Creating...' : 'Skip'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              // Don't require course selection - allow team creation with or without courses
                              handleCreateTeam(e);
                            }}
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
        )}

        
        {/* Add Courses Modal */}
        {showAddCoursesModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50" 
               onClick={() => setShowAddCoursesModal(false)}>
            <div className="bg-white rounded-lg shadow-xl p-0 w-full max-w-4xl m-4 relative animate-fadeIn"
                 onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200">
                <button
                  onClick={() => setShowAddCoursesModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Add Courses to Your Team</h3>
                    <p className="text-sm text-gray-500">Select courses to add to {teamName}</p>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                    </svg>
                  </div>
                  <input 
                    type="search" 
                    className="block w-full p-2.5 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Search courses..."
                    value={coursesSearchTerm}
                    onChange={(e) => setCoursesSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="mb-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Your Courses</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {selectedCoursesToAdd.length} selected
                    </span>
                  </div>
                </div>
                
                {isLoadingCourses ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-[#333D79]"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {filteredCourses.userCourses.length > 0 ? (
                      filteredCourses.userCourses.map((course) => (
                        <div 
                          key={course.id}
                          className={`border rounded-lg overflow-hidden ${
                            selectedCoursesToAdd.includes(course.id) 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          } transition-all cursor-pointer`}
                          onClick={() => {
                            if (selectedCoursesToAdd.includes(course.id)) {
                              setSelectedCoursesToAdd(selectedCoursesToAdd.filter(id => id !== course.id));
                            } else {
                              setSelectedCoursesToAdd([...selectedCoursesToAdd, course.id]);
                            }
                          }}
                        >
                          {/* Course content - keep your existing card content */}
                          <div className="relative h-36 bg-gray-100">
                            <img 
                              src={course.thumbnail || 'https://via.placeholder.com/400x200?text=Course'} 
                              alt={course.name} 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                selectedCoursesToAdd.includes(course.id)
                                  ? 'bg-blue-500' 
                                  : 'bg-white border border-gray-300'
                              }`}>
                                {selectedCoursesToAdd.includes(course.id) && (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                {course.subject}
                              </span>
                            </div>
                            <h5 className="text-gray-900 font-semibold mb-1">{course.name}</h5>
                            <p className="text-gray-500 text-sm">Owner: <span className="text-blue-600">You</span></p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500">No courses found matching your search</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddCoursesModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCoursesToTeam}
                  className={`px-4 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md transition-all ${
                    selectedCoursesToAdd.length === 0 || isAddingCourses
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:opacity-90'
                  }`}
                  disabled={selectedCoursesToAdd.length === 0 || isAddingCourses}
                >
                  {isAddingCourses ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                      Adding...
                    </>
                  ) : (
                    'Add Selected Courses'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Team;