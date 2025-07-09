import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#333D79]"></div>
            </div>
        );
    }

    if (user) {
        return <Navigate to="/class-records" replace />;
    }

    return children;
};

export default PublicRoute;