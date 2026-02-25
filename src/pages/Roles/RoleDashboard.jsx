import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import SupplyCoordinatorDashboard from './SupplyCoordinatorDashboard';
import CentralKitchenDashboard from './CentralKitchenDashboard';
import FranchiseStoreDashboard from './FranchiseStoreDashboard';

const RoleDashboard = () => {
  const { user } = useAuth();
  const codes = Array.isArray(user?.roles) ? user.roles.map(r => r.code) : [];

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

  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-2xl font-bold mb-4'>Dashboard</h1>
      <p>Vai trò tài khoản chưa được cấu hình để hiển thị dashboard phù hợp.</p>
    </div>
  );
};

export default RoleDashboard;

