import { useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';

// Map role từ user sang format Sidebar hiểu
const mapUserRoleToSidebarRole = (user) => {
  if (!user) return null;

  // Nếu có roles array (format mới)
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    const codes = user.roles.map(r => r.code);
    if (codes.includes('ADMIN')) return 'admin';
    if (codes.includes('MANAGER')) return 'manager';
    if (codes.includes('SUPPLY_COORDINATOR')) return 'supply_coordinator';
    if (codes.includes('CENTRAL_KITCHEN_STAFF')) return 'central_kitchen';
    if (codes.includes('FRANCHISE_STORE_STAFF')) return 'franchise_staff';
    if (codes.includes('DRIVER')) return 'driver';
  }

  // Nếu có roleId.roleName (format legacy)
  if (user.roleId?.roleName) {
    const roleName = user.roleId.roleName;
    if (roleName === 'admin') return 'admin';
    if (roleName === 'manager') return 'manager';
    if (roleName === 'central-kitchen') return 'central_kitchen';
    if (roleName === 'supply-coordinator') return 'supply_coordinator';
    if (roleName === 'franchise-staff') return 'franchise_staff';
    if (roleName === 'driver') return 'driver';
  }

  // Nếu có role trực tiếp (format demo)
  if (user.role) {
    const role = user.role;
    if (role === 'admin') return 'admin';
    if (role === 'manager') return 'manager';
    if (role === 'central-kitchen') return 'central_kitchen';
    if (role === 'supply-coordinator') return 'supply_coordinator';
    if (role === 'franchise-staff') return 'franchise_staff';
    if (role === 'driver') return 'driver';
  }

  return null;
};

export default function DashboardLayout({ children, onLogout }) {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const sidebarRole = mapUserRoleToSidebarRole(user);
  const displayName = user?.name || user?.username || user?.full_name || 'Người dùng';

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar 
        userRole={sidebarRole}
        userName={displayName}
        onLogout={onLogout}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <main className="flex-1 min-w-0 overflow-auto transition-all duration-300">
        <div className="w-full p-4 lg:p-6 xl:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
