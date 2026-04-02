import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { getDefaultAppPathForUser } from '../utils/defaultAppRoute';

const RedirectRoute = () => {
  const { isAuthenticated, loading, user } = useContext(AuthContext);

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

  // Chưa đăng nhập → /login; đã đăng nhập → trang mặc định theo role
  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }

  return <Navigate to={getDefaultAppPathForUser(user)} replace />;
};

export default RedirectRoute;
