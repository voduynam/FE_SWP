import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';

const mapRoleCodesToSidebarRole = roles => {
  const codes = Array.isArray(roles) ? roles.map(r => r.code) : [];

  if (codes.includes('ADMIN')) return 'admin';
  if (codes.includes('MANAGER')) return 'manager';
  if (codes.includes('SUPPLY_COORDINATOR')) return 'supply_coordinator';
  if (codes.includes('CENTRAL_KITCHEN_STAFF')) return 'central_kitchen';
  if (codes.includes('FRANCHISE_STORE_STAFF')) return 'franchise_staff';

  return 'franchise_staff';
};

const CkManagerLayout = () => {
  const { user, logout } = useAuth();

  const sidebarRole = mapRoleCodesToSidebarRole(user?.roles || []);
  const displayName = user?.full_name || user?.username || user?.name || 'Người dùng';

  return (
    <div className='min-h-screen flex bg-slate-100'>
      <Sidebar userRole={sidebarRole} userName={displayName} onLogout={logout} />
      <div className='flex-1 lg:ml-72 ml-0'>
        <main className='p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CkManagerLayout;

