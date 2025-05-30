import { useState, useEffect } from 'react';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import { teamService } from '../services/api.js';
import { showToast } from '../utils/toast.jsx';
import { Link } from 'react-router-dom';

const JoinedTeams = () => {
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [ownedTeams, setOwnedTeams] = useState([]); // Track owned teams for verification

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setIsLoading(true);
        
        // Fetch joined teams
        const joinedTeamsResponse = await teamService.getJoinedTeams();
        setTeams(joinedTeamsResponse.data || []);
        
        // Also fetch owned teams to check against when joining
        const ownedTeamsResponse = await teamService.getOwnedTeams();
        setOwnedTeams(ownedTeamsResponse.data || []);
        
      } catch (error) {
        console.error('Error fetching teams:', error);
        showToast.error('Failed to load teams');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeams();
  }, []);

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    
    if (!joinCode.trim()) {
      showToast.error('Please enter a join code', 'Invalid Code');
      return;
    }
    
    // Check if the code matches any of the user's owned teams
    const isOwnTeam = ownedTeams.some(team => team.code === joinCode.trim());
    if (isOwnTeam) {
      showToast.error("You cannot join your own team. You already have full access to it in 'Your Teams'.", 'Owned Team');
      return;
    }
    
    // Check if the code matches any teams the user has already joined
    const isAlreadyJoined = teams.some(team => team.code === joinCode.trim());
    if (isAlreadyJoined) {
      showToast.error("You are already a member of this team", 'Already Joined');
      return;
    }
    
    setIsJoining(true);
    
    try {
      const response = await teamService.joinTeam(joinCode);
      setTeams([...teams, response.data]);
      setJoinCode('');
      showToast.success('You have joined the team successfully!', 'Team Joined');
    } catch (error) {
      console.error('Error joining team:', error);
      
      // Provide more meaningful error messages
      if (error.response?.data?.detail) {
        showToast.error(error.response.data.detail);
      } else if (error.response?.status === 404) {
        showToast.error('Invalid team code. Please check and try again.', 'Not Found');
      } else {
        showToast.error('Failed to join team. Please try again later.');
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="pb-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Joined Teams</h1>
          <p className="text-gray-600">Teams you've been invited to join</p>
        </div>
        
        {/* Join Team Form */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Join a New Team</h2>
          <form onSubmit={handleJoinTeam} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter team code (XXXXXX)"
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent transition-all duration-200 uppercase"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isJoining}
              className="px-6 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md hover:opacity-90 transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Joining...
                </>
              ) : 'Join Team'}
            </button>
          </form>
          <div className="mt-2 text-xs text-gray-500">
            Note: You can only join teams that you've been invited to or have a valid team code
          </div>
        </div>
        
        {/* Teams List */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Your Joined Teams</h2>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              {teams.length > 0 ? (
                <div className="space-y-4">
                  {teams.map(team => (
                    <div key={team.id} className="border border-gray-200 rounded-lg hover:shadow-md transition-all p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{team.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Owner: {team.owner_name || 'Unknown'} · Members: {team.members_count || 0}
                          </p>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full ${
                          team.permissions === 'full' 
                            ? 'bg-green-100 text-green-800' 
                            : team.permissions === 'edit'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {team.permissions === 'full' 
                            ? 'Full Access' 
                            : team.permissions === 'edit'
                              ? 'Can Edit'
                              : 'View Only'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <Link 
                          to={`/dashboard/team/joined-teams/${team.id}`} 
                          className="text-center py-2 px-4 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
                        >
                          View Details
                        </Link>
                        <Link 
                          to={`/dashboard/team/joined-teams/${team.id}`} 
                          className="text-center py-2 px-4 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md text-sm hover:opacity-90 transition-opacity"
                        >
                          View Courses
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-gray-700 font-medium mb-1">No Joined Teams</h3>
                  <p className="text-gray-500 text-sm mb-4">Enter a team code above to join a team</p>
                  <Link
                    to="/dashboard/team/your-teams"
                    className="text-[#333D79] hover:underline text-sm"
                  >
                    View your own teams
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default JoinedTeams;