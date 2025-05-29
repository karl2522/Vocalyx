import { useState, useEffect, cloneElement } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { teamService, classService } from '../services/api.js';
import { showToast } from '../utils/toast.jsx';
import DashboardLayout from './layouts/DashboardLayout';
import { MdOutlineClass } from 'react-icons/md';

const ClassAccessGuard = ({ children }) => {
  const { id } = useParams();
  const [hasAccess, setHasAccess] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessInfo, setAccessInfo] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setIsLoading(true);
        
        try {
          // First try to fetch the class directly
          const classResponse = await classService.getClass(id);
          console.log("Class data retrieved successfully:", classResponse.data);
          
          // If we get here, the user has direct access to the class
          try {
            // Check if the class has team-based access
            const teamResponse = await teamService.checkClassAccess(id);
            console.log("Team class access check response:", teamResponse.data);
            
            if (teamResponse.data.hasAccess) {
              // If user has team access, store the access level
              setHasAccess(true);
              setAccessInfo({
                teamId: teamResponse.data.teamId,
                teamName: teamResponse.data.teamName,
                courseId: teamResponse.data.courseId,
                courseName: teamResponse.data.courseName,
                accessLevel: teamResponse.data.accessLevel
              });
            } else {
              // If no team access, but direct access succeeded, user is owner
              setHasAccess(true);
              setAccessInfo({
                accessLevel: 'full',
                accessType: 'owner'
              });
            }
          } catch (teamError) {
            console.log("No team access info, using direct access");
            setHasAccess(true);
            setAccessInfo({
              accessLevel: 'full',
              accessType: 'owner'
            });
          }
        } catch (classError) {
          console.error("Error fetching class:", classError);
          
          if (classError.response?.status === 404) {
            // Try team access as last resort if class is not found
            try {
              const teamResponse = await teamService.checkClassAccess(id);
              
              if (teamResponse.data.hasAccess) {
                setHasAccess(true);
                setAccessInfo({
                  teamId: teamResponse.data.teamId,
                  teamName: teamResponse.data.teamName,
                  courseId: teamResponse.data.courseId,
                  courseName: teamResponse.data.courseName,
                  accessLevel: teamResponse.data.accessLevel
                });
              } else {
                setHasAccess(false);
                showToast.error('Class not found', 'Not Found');
              }
            } catch (teamError) {
              console.error("Team class access check failed:", teamError);
              setHasAccess(false);
              showToast.error('Class not found', 'Not Found');
            }
          } else if (classError.response?.status === 403) {
            // User doesn't have permission to view this class
            try {
              const teamResponse = await teamService.checkClassAccess(id);
              
              if (teamResponse.data.hasAccess) {
                setHasAccess(true);
                setAccessInfo({
                  teamId: teamResponse.data.teamId,
                  teamName: teamResponse.data.teamName,
                  courseId: teamResponse.data.courseId,
                  courseName: teamResponse.data.courseName,
                  accessLevel: teamResponse.data.accessLevel
                });
              } else {
                setHasAccess(false);
                showToast.error('You do not have access to this class', 'Access Denied');
              }
            } catch (teamError) {
              setHasAccess(false);
              showToast.error('You do not have permission to access this class', 'Access Denied');
            }
          } else {
            setHasAccess(false);
            showToast.error('Error loading class', 'Error');
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAccess();
  }, [id]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#333D79]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <MdOutlineClass className="text-[#333D79] h-8 w-8 animate-pulse" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (hasAccess === false) {
    return <Navigate to="/dashboard/courses" replace />;
  }

  return cloneElement(children, { accessInfo });
};

export default ClassAccessGuard;