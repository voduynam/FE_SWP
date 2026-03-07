import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const normalizeRoleCode = role => {
  const normalized = String(role || '').trim().toUpperCase().replace(/-/g, '_');
  const aliasMap = {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    SUPPLY_COORDINATOR: 'SUPPLY_COORDINATOR',
    CENTRAL_KITCHEN_STAFF: 'CENTRAL_KITCHEN_STAFF',
    CENTRAL_KITCHEN: 'CENTRAL_KITCHEN_STAFF',
    CHEF: 'CENTRAL_KITCHEN_STAFF',
    STORE_STAFF: 'FRANCHISE_STORE_STAFF',
    FRANCHISE_STAFF: 'FRANCHISE_STORE_STAFF',
    FRANCHISE_STORE_STAFF: 'FRANCHISE_STORE_STAFF',
    DRIVER: 'DRIVER',
  };
  return aliasMap[normalized] || normalized;
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
    const roleCodes = Array.isArray(user.roles)
      ? user.roles.map(r => normalizeRoleCode(r.code))
      : [];

    const legacyRoleName = normalizeRoleCode(user.roleId?.roleName);
    const normalizedAllowedRoles = allowedRoles.map(normalizeRoleCode);

    const hasPermission =
      roleCodes.some(code => normalizedAllowedRoles.includes(code)) ||
      (legacyRoleName && normalizedAllowedRoles.includes(legacyRoleName));
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

