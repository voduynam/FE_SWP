import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useContext(AuthContext);
  const location = useLocation();

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
  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to='/login' state={{ from: location }} replace />;
  }
  // Check if user has required role
  if (allowedRoles.length > 0 && user) {
    const roleCodes = Array.isArray(user.roles)
      ? user.roles.map(r => r.code)
      : [];

    const legacyRoleName = user.roleId?.roleName;

    const hasPermission =
      roleCodes.some(code => allowedRoles.includes(code)) ||
      (legacyRoleName && allowedRoles.includes(legacyRoleName));
    if (!hasPermission) {
      // Redirect to unauthorized page or dashboard
      return (
        <div className='flex items-center justify-center min-h-screen'>
          <div className='text-center'>
            <h2 className='text-2xl font-bold text-red-600 mb-4'>
              Truy cập bị từ chối
            </h2>
            <p className='text-gray-600 mb-4'>
              Bạn không có quyền truy cập trang này.
            </p>
            <button
              onClick={() => window.history.back()}
              className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
            >
              Quay lại
            </button>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default RoleProtectedRoute;

