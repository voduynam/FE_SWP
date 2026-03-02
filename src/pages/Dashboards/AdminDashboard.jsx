import { useState } from 'react';
import { Users, Store, Settings, BarChart3, Package, ClipboardList } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/ui/StatCard';

export default function AdminDashboard() {
  const { user } = useAuth();
  const userName = user?.name || user?.username || 'Admin';

  // Mock data
  const stats = [
    { label: 'Tổng người dùng', value: '45', icon: Users, color: 'primary' },
    { label: 'Cửa hàng', value: '12', icon: Store, color: 'accent' },
    { label: 'Đơn hàng hôm nay', value: '128', icon: ClipboardList, color: 'warning' },
    { label: 'Sản phẩm', value: '89', icon: Package, color: 'success' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Xin chào, {userName}</h1>
        <p className="text-muted-foreground mt-1">
          Quản lý hệ thống và người dùng
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-6 transition-all hover:shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Quản lý người dùng</h3>
              <p className="text-sm text-muted-foreground">Xem và quản lý tất cả người dùng</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 transition-all hover:shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent/10 text-accent">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Quản lý cửa hàng</h3>
              <p className="text-sm text-muted-foreground">Quản lý cửa hàng và bếp trung tâm</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 transition-all hover:shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10 text-warning">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Báo cáo</h3>
              <p className="text-sm text-muted-foreground">Xem báo cáo tổng hợp hệ thống</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
