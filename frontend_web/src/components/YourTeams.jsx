import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import { teamService } from '../services/api.js';
import { showToast } from '../utils/toast.jsx';
import CreateTeamModal from './modals/CreateTeamModa.jsx';
import { FiPlus } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const YourTeams = () => {
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  
  const [allUsers, setAllUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);

   const searchTimeoutRef = useRef(null);
   const lastQueryRef = useRef('');

  useEffect(() => {
    const fetchOwnedTeams = async () => {
      try {
        setIsLoading(true);
        const response = await teamService.getOwnedTeams();
        setTeams(response.data || []);
      } catch (error) {
        console.error('Error fetching owned teams:', error);
        showToast.error('Failed to load your teams');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOwnedTeams();
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  
  const fetchAvailableCourses = async () => {
    try {
      setIsLoadingCourses(true);
      const response = await teamService.getAvailableCourses();
      setAllCourses(response.data || []);
    } catch (error) {
      console.error('Error fetching available courses:', error);
      showToast.error('Failed to load courses');
    } finally {
      setIsLoadingCourses(false);
    }
  };
  
  const fetchUsers = useCallback((query) => {
    if (!query || query.length < 2) return;
    
    if (query === lastQueryRef.current && allUsers.length > 0) {
      return;
    }
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    setIsLoadingUsers(true);
    
    lastQueryRef.current = query;
    
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        console.log("Searching for users (debounced):", query);
        
        const response = await teamService.searchUsers(query);
        
        if (response.data) {
          console.log("Found users:", response.data);
          setAllUsers(response.data);
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
    }, 700);
  }, [allUsers.length]);
  
  const handleShowModal = () => {
    setAllUsers([]);
    lastQueryRef.current = '';
    fetchAvailableCourses();
    setShowCreateModal(true);
  };

   const handleCreateTeam = async (teamData) => {
    setIsCreatingTeam(true);
    
    try {
      const response = await teamService.createTeam(teamData);
      setTeams([...teams, response.data]);
      setShowCreateModal(false);
      showToast.success(`Team "${teamData.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating team:', error);
      showToast.error(error.response?.data?.detail || 'Failed to create team');
    } finally {
      setIsCreatingTeam(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="pb-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Teams</h1>
            <p className="text-gray-600">Teams you've created and manage</p>
          </div>
          
          <button
            onClick={handleShowModal}
            className="px-4 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2"
          >
            <FiPlus size={18} />
            <span>Create Team</span>
          </button>
        </div>
        
        {/* Teams Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {teams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map(team => (
                  <div key={team.id} className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                    <div className="p-6 border-b border-gray-100">
                      <h2 className="text-xl font-semibold text-gray-900">{team.name}</h2>
                      <p className="text-sm text-gray-500 mt-1">Created: {new Date(team.created_at).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm">
                          <span className="text-gray-500">Members: </span>
                          <span className="font-medium">{team.members_count || 0}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Courses: </span>
                          <span className="font-medium">{team.courses_count || 0}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Code: {team.code}</span>
                       <Link 
                        to={`/dashboard/team/your-teams/${team.id}`} 
                        className="text-sm text-[#333D79] hover:underline"
                        >
                        Manage Team
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-lg shadow-md border border-gray-100">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h2 className="text-xl font-medium text-gray-800 mb-2">No Teams Created</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first team to start collaborating with colleagues and sharing your courses.
                </p>
                <button
                  onClick={handleShowModal}
                  className="px-6 py-3 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md hover:shadow-md transition-all flex items-center gap-2 mx-auto"
                >
                  <FiPlus size={18} />
                  Create Your First Team
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Create Team Modal with all props */}
       {showCreateModal && (
        <CreateTeamModal
          isOpen={showCreateModal}
          onClose={() => {
            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
            }
            setShowCreateModal(false);
          }}
          onCreateTeam={handleCreateTeam}
          isCreatingTeam={isCreatingTeam}
          allCourses={allCourses}
          isLoadingCourses={isLoadingCourses}
          allUsers={allUsers}
          isLoadingUsers={isLoadingUsers}
          fetchUsers={fetchUsers}
        />
      )}
    </DashboardLayout>
  );
};

export default YourTeams;