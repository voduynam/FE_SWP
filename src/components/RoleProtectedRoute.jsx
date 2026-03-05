import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const normalizeRoleCode = code => {
  const upper = (code || '').toUpperCase();
  if (upper === 'CHEF') return 'CENTRAL_KITCHEN_STAFF';
  if (upper === 'STORE_STAFF') return 'FRANCHISE_STORE_STAFF';
  return upper;
};

const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600'></div>
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
    const rawCodes = Array.isArray(user.roles)
      ? user.roles.map(r => r.code)
      : [];

    const normalizedCodes = rawCodes.map(normalizeRoleCode);

    const legacyRoleName = user.roleId?.roleName;

    const hasPermission =
      normalizedCodes.some(code => allowedRoles.includes(code)) ||
      (legacyRoleName && allowedRoles.includes(legacyRoleName));

    if (!hasPermission) {
      // Redirect to unauthorized page
      return (
        <div className='flex min-h-screen items-center justify-center'>
          <div className='text-center'>
            <h2 className='mb-4 text-2xl font-bold text-red-600'>
              Truy cập bị từ chối
            </h2>
            <p className='mb-4 text-gray-600'>
              Bạn không có quyền truy cập trang này.
            </p>
            <button
              onClick={() => window.history.back()}
              className='rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
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

