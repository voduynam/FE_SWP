import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Normalize role code to match sidebar roles
const normalizeRoleCode = (role) => {
  const normalized = String(role || '').trim().toLowerCase().replace(/-/g, '_');
  const aliasMap = {
    'admin': 'admin',
    'manager': 'manager',
    'supply_coordinator': 'supply_coordinator',
    'central_kitchen_staff': 'central_kitchen',
    'central_kitchen': 'central_kitchen',
    'chef': 'central_kitchen',
    'store_staff': 'franchise_staff',
    'franchise_staff': 'franchise_staff',
    'franchise_store_staff': 'franchise_staff',
    'driver': 'driver',
  };
  return aliasMap[normalized] || normalized;
};

// Get primary role from user
const getPrimaryRole = (user) => {
  if (!user) return null;
  
  // Check roles array
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    const roleCode = user.roles[0].code;
    return normalizeRoleCode(roleCode);
  }
  
  // Check legacy roleId
  if (user.roleId?.roleName) {
    return normalizeRoleCode(user.roleId.roleName);
  }
  
  return null;
};

// Map role to dashboard path
const getRoleDashboardPath = (role) => {
  const dashboardMap = {
    'admin': '/app/admin/dashboard',
    'manager': '/app/manager/dashboard',
    'central_kitchen': '/app/central/dashboard',
    'supply_coordinator': '/app/supply/dashboard',
    'franchise_staff': '/app/store/dashboard',
    'driver': '/app/driver/dashboard',
  };
  
  return dashboardMap[role] || '/app/admin/dashboard';
};

const RoleDashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-ck-accent/20 border-t-ck-accent"></div>
          <p className="mt-2 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  const primaryRole = getPrimaryRole(user);
  const dashboardPath = getRoleDashboardPath(primaryRole);

  return <Navigate to={dashboardPath} replace />;
};

export default RoleDashboard;
