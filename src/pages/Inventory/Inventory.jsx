import { useState, useContext } from 'react';
import { Search, Plus, AlertTriangle, Package, Calendar, ArrowUpDown, Store } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';
import StatCard from '../../components/ui/StatCard';

// Kho bếp trung tâm
const centralInventoryData = [
  { id: 'NL001', name: 'Bột mì đa dụng', category: 'Bột', unit: 'kg', quantity: 250, minStock: 100, price: 18000, expiry: '2025-06-15', batch: 'LOT2024-001', status: 'in_stock' },
  { id: 'NL002', name: 'Đường cát trắng', category: 'Đường', unit: 'kg', quantity: 80, minStock: 50, price: 22000, expiry: '2025-12-31', batch: 'LOT2024-002', status: 'in_stock' },
  { id: 'NL003', name: 'Bơ lạt Anchor', category: 'Bơ/Sữa', unit: 'kg', quantity: 15, minStock: 20, price: 280000, expiry: '2025-02-28', batch: 'LOT2024-003', status: 'low_stock' },
  { id: 'NL004', name: 'Trứng gà', category: 'Trứng', unit: 'quả', quantity: 500, minStock: 200, price: 3500, expiry: '2025-01-25', batch: 'LOT2024-004', status: 'in_stock' },
  { id: 'NL005', name: 'Sữa tươi TH', category: 'Bơ/Sữa', unit: 'lít', quantity: 0, minStock: 30, price: 32000, expiry: '2025-01-30', batch: 'LOT2024-005', status: 'out_of_stock' },
];

// Kho cửa hàng (cho franchise_staff xem)
const storeInventoryData = [
  { id: 'SP001', name: 'Cơm gà', category: 'Bánh', unit: 'hộp', quantity: 50, minStock: 20, price: 45000, expiry: '2025-01-21', batch: 'BM2025-001', status: 'in_stock' },
  { id: 'SP002', name: 'Phở bò', category: 'Bánh', unit: 'bát', quantity: 30, minStock: 15, price: 55000, expiry: '2025-01-20', batch: 'CR2025-001', status: 'in_stock' },
  { id: 'SP003', name: 'Bánh mì thịt', category: 'Bánh', unit: 'cái', quantity: 8, minStock: 10, price: 35000, expiry: '2025-01-19', batch: 'CF2024-012', status: 'low_stock' },
];

const categories = ['Tất cả', 'Bột', 'Đường', 'Bơ/Sữa', 'Trứng', 'Phụ gia', 'Nguyên liệu', 'Bánh', 'Đồ uống'];

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');
  const [statusFilter, setStatusFilter] = useState('all');
  const { user } = useAuth();
  
  const userRole = user?.roleId?.roleName || user?.role || '';

  // Phân quyền
  const canViewCentral = ['admin', 'manager', 'central-kitchen'].includes(userRole);
  const canViewStore = ['franchise-staff', 'admin', 'manager'].includes(userRole);
  const canManage = ['admin', 'manager', 'central-kitchen'].includes(userRole);
  const canImport = ['admin', 'central-kitchen'].includes(userRole);

  // Xác định dữ liệu hiển thị dựa trên role
  const inventoryData = canViewCentral ? centralInventoryData : storeInventoryData;

  const filteredInventory = inventoryData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Tất cả' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const lowStockCount = inventoryData.filter(i => i.status === 'low_stock').length;
  const outOfStockCount = inventoryData.filter(i => i.status === 'out_of_stock').length;
  const expiringCount = inventoryData.filter(i => {
    const expiry = new Date(i.expiry);
    const now = new Date();
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  }).length;

  const getRoleDescription = () => {
    switch (userRole) {
      case 'franchise-staff':
        return 'Xem tồn kho hiện tại tại cửa hàng của bạn';
      case 'central-kitchen':
        return 'Quản lý nguyên liệu đầu vào, hạn sử dụng và lô sản xuất';
      case 'manager':
        return 'Theo dõi tồn kho bếp trung tâm và cửa hàng';
      default:
        return 'Quản lý toàn bộ kho hàng trong hệ thống';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {canViewCentral ? 'Kho Bếp Trung Tâm' : 'Kho Cửa Hàng'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {getRoleDescription()}
          </p>
        </div>
        <div className="flex gap-3">
          {canImport && (
            <button className="btn-outline flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4" />
              Nhập kho
            </button>
          )}
          {canManage && (
            <button className="btn-secondary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Thêm nguyên liệu
            </button>
          )}
          {userRole === 'franchise-staff' && (
            <button className="btn-secondary flex items-center gap-2">
              <Store className="w-4 h-4" />
              Đặt hàng bổ sung
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng nguyên liệu"
          value={inventoryData.length}
          icon={Package}
          color="primary"
        />
        <StatCard
          title="Sắp hết hàng"
          value={lowStockCount}
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          title="Hết hàng"
          value={outOfStockCount}
          icon={Package}
          color="destructive"
        />
        <StatCard
          title="Sắp hết hạn"
          value={expiringCount}
          icon={Calendar}
          color="accent"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm nguyên liệu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-11"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field min-w-[150px]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field min-w-[140px]"
          >
            <option value="all">Tất cả TT</option>
            <option value="in_stock">Còn hàng</option>
            <option value="low_stock">Sắp hết</option>
            <option value="out_of_stock">Hết hàng</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              <th className="px-6 py-4 text-left">Mã NL</th>
              <th className="px-6 py-4 text-left">Tên nguyên liệu</th>
              <th className="px-6 py-4 text-left">Danh mục</th>
              <th className="px-6 py-4 text-right">Số lượng</th>
              <th className="px-6 py-4 text-right">Tồn tối thiểu</th>
              <th className="px-6 py-4 text-right">Đơn giá</th>
              <th className="px-6 py-4 text-center">Hạn SD</th>
              <th className="px-6 py-4 text-center">Lô SX</th>
              <th className="px-6 py-4 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredInventory.map((item) => {
              const expiry = new Date(item.expiry);
              const now = new Date();
              const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
              const isExpiringSoon = diffDays <= 30 && diffDays > 0;

              return (
                <tr key={item.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 font-medium text-primary">{item.id}</td>
                  <td className="px-6 py-4 font-medium">{item.name}</td>
                  <td className="px-6 py-4">{item.category}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-semibold ${item.quantity === 0 ? 'text-destructive' : item.quantity < item.minStock ? 'text-warning' : ''}`}>
                      {item.quantity}
                    </span>
                    <span className="text-muted-foreground ml-1">{item.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground">{item.minStock} {item.unit}</td>
                  <td className="px-6 py-4 text-right">{item.price.toLocaleString('vi-VN')}₫</td>
                  <td className={`px-6 py-4 text-center ${isExpiringSoon ? 'text-warning font-medium' : ''}`}>
                    {item.expiry}
                    {isExpiringSoon && <span className="ml-1">⚠️</span>}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-muted-foreground">{item.batch}</td>
                  <td className="px-6 py-4 text-center"><StatusBadge status={item.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredInventory.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            Không tìm thấy nguyên liệu phù hợp
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Hiển thị {filteredInventory.length} / {inventoryData.length} nguyên liệu</p>
      </div>
    </div>
  );
}
