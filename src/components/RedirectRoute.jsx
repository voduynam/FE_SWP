import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const RedirectRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='mx-auto h-8 w-8 animate-spin rounded-full border-2 border-ck-accent/20 border-t-ck-accent'></div>
          <p className='mt-2 text-gray-600'>Đang tải...</p>
        </div>
      </div>
    );
  }

  // If authenticated, redirect to dashboard (which will redirect to role-specific dashboard)
  if (isAuthenticated) {
    return <Navigate to='/app/dashboard' replace />;
  }

  // If not authenticated, render children (Login page)
  return children;
};

export default RedirectRoute;
