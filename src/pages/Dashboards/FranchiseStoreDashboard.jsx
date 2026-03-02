import { useState } from 'react';
import { ClipboardList, Warehouse, Store, Package } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/ui/StatCard';

export default function FranchiseStoreDashboard() {
  const { user } = useAuth();
  const userName = user?.name || user?.username || 'Nhân viên cửa hàng';

  // Mock data
  const stats = [
    { label: 'Đơn hàng hôm nay', value: '15', icon: ClipboardList, color: 'primary' },
    { label: 'Tồn kho', value: '128', icon: Warehouse, color: 'accent' },
    { label: 'Sản phẩm', value: '45', icon: Package, color: 'warning' },
    { label: 'Đang giao', value: '8', icon: Store, color: 'success' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Xin chào, {userName}</h1>
        <p className="text-muted-foreground mt-1">
          Quản lý đơn hàng và tồn kho cửa hàng
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-6 transition-all hover:shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Đơn hàng cửa hàng</h3>
              <p className="text-sm text-muted-foreground">Đặt hàng và theo dõi đơn hàng</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 transition-all hover:shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent/10 text-accent">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Tồn kho cửa hàng</h3>
              <p className="text-sm text-muted-foreground">Xem tồn kho và xác nhận nhận hàng</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
