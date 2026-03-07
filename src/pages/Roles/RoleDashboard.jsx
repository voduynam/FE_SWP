import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import SupplyCoordinatorDashboard from './SupplyCoordinatorDashboard';
import CentralKitchenDashboard from './CentralKitchenDashboard';
import FranchiseStoreDashboard from './FranchiseStoreDashboard';
import DriverDashboard from '../Dashboards/DriverDashboard';

const normalizeRoleCode = role => {
  const normalized = String(role || '').trim().toUpperCase().replace(/-/g, '_');
  const aliasMap = {
    CHEF: 'CENTRAL_KITCHEN_STAFF',
    CENTRAL_KITCHEN: 'CENTRAL_KITCHEN_STAFF',
    STORE_STAFF: 'FRANCHISE_STORE_STAFF',
    FRANCHISE_STAFF: 'FRANCHISE_STORE_STAFF',
  };
  return aliasMap[normalized] || normalized;
};

const RoleDashboard = () => {
  const { user } = useAuth();
  const codes = Array.isArray(user?.roles)
    ? user.roles.map(r => normalizeRoleCode(r.code))
    : [];

  if (codes.includes('ADMIN')) {
    return <AdminDashboard />;
  }

  if (codes.includes('MANAGER')) {
    return <ManagerDashboard />;
  }

  if (codes.includes('SUPPLY_COORDINATOR')) {
    return <SupplyCoordinatorDashboard />;
  }

  if (codes.includes('CENTRAL_KITCHEN_STAFF')) {
    return <CentralKitchenDashboard />;
  }

  if (codes.includes('FRANCHISE_STORE_STAFF')) {
    return <FranchiseStoreDashboard />;
  }

  if (codes.includes('DRIVER')) {
    return <DriverDashboard />;
  }

  return (
    <div className='space-y-4 animate-fade-in'>
      <h1 className='text-2xl font-bold mb-4'>Dashboard</h1>
      <p>Vai trò tài khoản chưa được cấu hình để hiển thị dashboard phù hợp.</p>
    </div>
  );
};

export default RoleDashboard;

