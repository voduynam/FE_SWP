import { useState } from 'react';
import { Search, Plus, MapPin, Phone, Mail, Edit, Trash2, Store as StoreIcon } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';

const storesData = [
  { id: 'CH001', name: 'CH Quận 1', code: 'Q1-001', address: '123 Nguyễn Huệ, Q.1', phone: '028 1234 5678', email: 'q1@ckmanager.vn', manager: 'Nguyễn Văn A', status: 'active', orders: 156, revenue: 45600000 },
  { id: 'CH002', name: 'CH Quận 3', code: 'Q3-002', address: '456 Võ Văn Tần, Q.3', phone: '028 2345 6789', email: 'q3@ckmanager.vn', manager: 'Trần Thị B', status: 'active', orders: 128, revenue: 38200000 },
  { id: 'CH003', name: 'CH Quận 7', code: 'Q7-003', address: '789 Nguyễn Văn Linh, Q.7', phone: '028 3456 7890', email: 'q7@ckmanager.vn', manager: 'Lê Văn C', status: 'active', orders: 203, revenue: 62500000 },
  { id: 'CH004', name: 'CH Bình Thạnh', code: 'BT-004', address: '321 Điện Biên Phủ, Bình Thạnh', phone: '028 4567 8901', email: 'bt@ckmanager.vn', manager: 'Phạm Thị D', status: 'active', orders: 98, revenue: 29800000 },
  { id: 'CH005', name: 'CH Tân Bình', code: 'TB-005', address: '654 Cộng Hòa, Tân Bình', phone: '028 5678 9012', email: 'tb@ckmanager.vn', manager: 'Hoàng Văn E', status: 'inactive', orders: 45, revenue: 12500000 },
];

export default function Stores() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredStores = storesData.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         store.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         store.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || store.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = storesData.filter(s => s.status === 'active').length;
  const totalRevenue = storesData.reduce((sum, s) => sum + s.revenue, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Cửa hàng</h1>
          <p className="text-muted-foreground mt-1">
            Danh mục cửa hàng franchise và bếp trung tâm trong hệ thống
          </p>
        </div>
        <button className="btn-secondary flex items-center gap-2 w-fit">
          <Plus className="w-4 h-4" />
          Thêm cửa hàng
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Tổng cửa hàng</p>
          <p className="text-3xl font-bold mt-1">{storesData.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Đang hoạt động</p>
          <p className="text-3xl font-bold mt-1 text-success">{activeCount}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Doanh thu tháng</p>
          <p className="text-3xl font-bold mt-1">{(totalRevenue / 1000000).toFixed(1)}M</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm cửa hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-11"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field min-w-[150px]"
        >
          <option value="all">Tất cả</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Ngừng HĐ</option>
        </select>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStores.map((store) => (
          <div key={store.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <StoreIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{store.name}</h3>
                  <p className="text-sm text-muted-foreground">{store.code}</p>
                </div>
              </div>
              <StatusBadge status={store.status} />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{store.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{store.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{store.email}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Quản lý: <span className="text-foreground font-medium">{store.manager}</span></p>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">Đơn hàng</p>
                  <p className="font-semibold">{store.orders}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Doanh thu</p>
                  <p className="font-semibold text-success">{(store.revenue / 1000000).toFixed(1)}M</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex gap-2">
              <button className="flex-1 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium flex items-center justify-center gap-1">
                <Edit className="w-4 h-4" />
                Chỉnh sửa
              </button>
              <button className="py-2 px-3 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredStores.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Không tìm thấy cửa hàng phù hợp
        </div>
      )}
    </div>
  );
}
