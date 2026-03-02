import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const RedirectRoute = () => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-2 text-gray-600'>Đang tải...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated, otherwise to dashboard
  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }

  return <Navigate to='/app/dashboard' replace />;
};

export default RedirectRoute;
