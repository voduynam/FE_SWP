import { useState } from 'react';
import { Package, Warehouse, BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/ui/StatCard';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const userName = user?.name || user?.username || 'Manager';

  // Mock data
  const stats = [
    { label: 'Doanh thu tháng', value: '450M', icon: DollarSign, color: 'primary' },
    { label: 'Sản phẩm', value: '45', icon: Package, color: 'accent' },
    { label: 'Cửa hàng', value: '12', icon: Warehouse, color: 'warning' },
    { label: 'Hiệu suất', value: '92%', icon: TrendingUp, color: 'success' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Xin chào, {userName}</h1>
        <p className="text-muted-foreground mt-1">
          Quản lý sản phẩm và hiệu suất hệ thống
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
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Quản lý sản phẩm</h3>
              <p className="text-sm text-muted-foreground">Quản lý danh mục và công thức</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 transition-all hover:shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent/10 text-accent">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Tồn kho hệ thống</h3>
              <p className="text-sm text-muted-foreground">Theo dõi tồn kho và nguyên liệu</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 transition-all hover:shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10 text-warning">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Báo cáo & hiệu suất</h3>
              <p className="text-sm text-muted-foreground">Xem báo cáo chi tiết</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
