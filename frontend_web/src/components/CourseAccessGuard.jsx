import { useState, useEffect, cloneElement } from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { teamService, courseService } from '../services/api.js';
import { showToast } from '../utils/toast.jsx';
import DashboardLayout from './layouts/DashboardLayout';
import { MdOutlineSchool } from 'react-icons/md';

const CourseAccessGuard = ({ children }) => {
  const { id } = useParams();
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessInfo, setAccessInfo] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setIsLoading(true);
        
        const teamAccessFromState = location.state?.teamAccess;
        console.log("Team access from state:", teamAccessFromState);
        
        if (teamAccessFromState) {
          console.log("Using team access info from state");
          setHasAccess(true);
          setAccessInfo({
            teamId: teamAccessFromState.teamId,
            teamName: teamAccessFromState.teamName,
            accessLevel: teamAccessFromState.accessLevel
          });
          setIsLoading(false);
          return;
        }
        
        try {
          const courseResponse = await courseService.getCourse(id);
          console.log("Course data retrieved successfully:", courseResponse.data);
          
          try {
            const teamResponse = await teamService.checkCourseAccess(id);
            console.log("Team access check response:", teamResponse.data);
            
            if (teamResponse.data.hasAccess) {
              setHasAccess(true);
              setAccessInfo({
                teamId: teamResponse.data.teamId,
                teamName: teamResponse.data.teamName,
                accessLevel: teamResponse.data.accessLevel
              });
            } else {
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
        } catch (courseError) {
          console.error("Error fetching course:", courseError);
          
          if (courseError.response?.status === 404) {
            setHasAccess(false);
            showToast.error('Course not found');
          } else if (courseError.response?.status === 403) {
            try {
              const teamResponse = await teamService.checkCourseAccess(id);
              
              if (teamResponse.data.hasAccess) {
                setHasAccess(true);
                setAccessInfo({
                  teamId: teamResponse.data.teamId,
                  teamName: teamResponse.data.teamName,
                  accessLevel: teamResponse.data.accessLevel
                });
              } else {
                setHasAccess(false);
                showToast.error('You do not have access to this course');
              }
            } catch (teamError) {
              setHasAccess(false);
              showToast.error('You do not have permission to access this course');
            }
          } else {
            setHasAccess(false);
            showToast.error('Error loading course');
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAccess();
  }, [id, location]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#333D79]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <MdOutlineSchool className="text-[#333D79] h-8 w-8 animate-pulse" />
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

export default CourseAccessGuard;