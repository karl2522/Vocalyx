import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import { teamService } from '../services/api.js';
import { FiPlus, FiUsers } from 'react-icons/fi';
import { showToast } from '../utils/toast.jsx';

const Team = () => {
  const [ownedTeams, setOwnedTeams] = useState([]);
  const [joinedTeams, setJoinedTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setIsLoading(true);
        const response = await teamService.getAllTeams(); 
        
        if (response.data) {
          const owned = response.data.filter(team => team.is_owner);
          const joined = response.data.filter(team => !team.is_owner);
          
          setOwnedTeams(owned);
          setJoinedTeams(joined);
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
        showToast.error('Failed to load teams');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeams();
  }, []);

  return (
    <DashboardLayout>
      <div className="pb-6">
        {/* Hero Section */}
        <div className="hero-gradient rounded-xl mb-8 p-5 shadow-sm border border-gray-100 overflow-hidden relative">
          {/* Background Elements */}
          <div className="bg-blur-circle bg-blur-circle-top"></div>
          <div className="bg-blur-circle bg-blur-circle-bottom"></div>
          <div className="bg-floating-circle hidden md:block"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
            <div className="flex items-center gap-4 fade-in-up">
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
            
            <Link
              to="/dashboard/team/your-teams"
              className="px-5 py-2.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 mt-4 md:mt-0 fade-in-up group"
            >
              <FiPlus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              <span>Create Team</span>
            </Link>
          </div>
        </div>
        
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Your Teams Card */}
          <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Your Teams
              </h2>
              <p className="text-gray-500 text-sm mt-1">Teams you've created and own</p>
            </div>
            
            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <>
                  {ownedTeams.length > 0 ? (
                    <div className="space-y-4">
                      {ownedTeams.slice(0, 3).map(team => (
                        <div key={team.id} className="p-4 border border-gray-100 rounded-lg hover:shadow-md transition-shadow">
                          <h3 className="font-medium text-gray-800">{team.name}</h3>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-gray-500">{team.members_count || 0} members</span>
                            <Link 
                              to={`/dashboard/team/your-teams/${team.id}`} 
                              className="text-sm text-[#333D79] hover:underline"
                            >
                              Manage
                            </Link>
                          </div>
                        </div>
                      ))}
                      
                      {ownedTeams.length > 3 && (
                        <div className="text-center mt-2">
                          <Link 
                            to="/dashboard/team/your-teams" 
                            className="text-sm text-[#333D79] hover:underline"
                          >
                            View all {ownedTeams.length} teams
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <h4 className="text-gray-700 font-medium mb-1">No teams created yet</h4>
                      <p className="text-gray-500 text-sm mb-4">Create your first team to start collaborating</p>
                      <Link
                        to="/dashboard/team/your-teams"
                        className="px-4 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md hover:shadow-md transition-all inline-flex items-center gap-2"
                      >
                        <FiPlus size={16} />
                        Create Your Team
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Joined Teams Card */}
          <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#333D79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Joined Teams
              </h2>
              <p className="text-gray-500 text-sm mt-1">Teams you've been invited to</p>
            </div>
            
            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <>
                  {joinedTeams.length > 0 ? (
                    <div className="space-y-4">
                      {joinedTeams.slice(0, 3).map(team => (
                        <div key={team.id} className="p-4 border border-gray-100 rounded-lg hover:shadow-md transition-shadow">
                          <h3 className="font-medium text-gray-800">{team.name}</h3>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-gray-500">Owner: {team.owner_name || 'Unknown'}</span>
                            <Link 
                              to={`/dashboard/team/joined-teams/${team.id}`} 
                              className="text-sm text-[#333D79] hover:underline"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      ))}
                      
                      {joinedTeams.length > 3 && (
                        <div className="text-center mt-2">
                          <Link 
                            to="/dashboard/team/joined-teams" 
                            className="text-sm text-[#333D79] hover:underline"
                          >
                            View all {joinedTeams.length} teams
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <h4 className="text-gray-700 font-medium mb-1">No joined teams</h4>
                      <p className="text-gray-500 text-sm mb-4">Join a team using the team code</p>
                      <form className="flex gap-2 max-w-xs mx-auto">
                        <input 
                          type="text" 
                          placeholder="Enter team code" 
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <button 
                          type="submit"
                          className="px-3 py-2 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-md hover:shadow-md transition-all"
                        >
                          Join
                        </button>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Team;