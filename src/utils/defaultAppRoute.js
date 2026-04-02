/**
 * Trang đầu sau đăng nhập / khi vào /app — khớp menu sidebar còn hiển thị.
 * (Các role ẩn dashboard dùng trang làm việc chính thay vì dashboard.)
 */

const normalizeRoleCode = code => {
  const upper = (code || '').toUpperCase();
  if (upper === 'CHEF') return 'CENTRAL_KITCHEN_STAFF';
  if (upper === 'STORE_STAFF') return 'FRANCHISE_STORE_STAFF';
  return upper;
};

const mapRolesToSidebarKey = roles => {
  const codes = Array.isArray(roles)
    ? roles.map(r => normalizeRoleCode(r.code))
    : [];

  if (codes.includes('ADMIN')) return 'admin';
  if (codes.includes('MANAGER')) return 'manager';
  if (codes.includes('SUPPLY_COORDINATOR')) return 'supply_coordinator';
  if (codes.includes('CENTRAL_KITCHEN_STAFF')) return 'central_kitchen';
  if (codes.includes('FRANCHISE_STORE_STAFF')) return 'franchise_staff';
  if (codes.includes('DRIVER')) return 'driver';

  return 'franchise_staff';
};

/** Chuẩn hóa chuỗi role đơn lẻ (legacy / JWT) → mã role backend */
function roleFieldToCode(raw) {
  const u = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
  const alias = {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    SUPPLY_COORDINATOR: 'SUPPLY_COORDINATOR',
    SUPPLYCOORDINATOR: 'SUPPLY_COORDINATOR',
    CENTRAL_KITCHEN_STAFF: 'CENTRAL_KITCHEN_STAFF',
    CENTRAL_KITCHEN: 'CENTRAL_KITCHEN_STAFF',
    FRANCHISE_STORE_STAFF: 'FRANCHISE_STORE_STAFF',
    FRANCHISE_STAFF: 'FRANCHISE_STORE_STAFF',
    DRIVER: 'DRIVER',
  };
  return alias[u] || u || 'FRANCHISE_STORE_STAFF';
}

function sidebarKeyFromUser(user) {
  if (!user) return 'franchise_staff';
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return mapRolesToSidebarKey(user.roles);
  }
  if (user.role) {
    return mapRolesToSidebarKey([{ code: roleFieldToCode(user.role) }]);
  }
  return 'franchise_staff';
}

const DEFAULT_PATH = {
  admin: '/app/admin/dashboard',
  manager: '/app/manager/dashboard',
  central_kitchen: '/app/central/dashboard',
  supply_coordinator: '/app/central/shipments',
  franchise_staff: '/app/store/orders',
  driver: '/app/driver/shipments',
};

export function getDefaultAppPathForUser(user) {
  const key = sidebarKeyFromUser(user);
  return DEFAULT_PATH[key] || '/app/dashboard';
}
