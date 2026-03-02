import { useState } from 'react';
import { TruckIcon, ClipboardList, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/ui/StatCard';

export default function SupplyCoordinatorDashboard() {
  const { user } = useAuth();
  const userName = user?.name || user?.username || 'Điều phối viên';

  // Mock data
  const stats = [
    { label: 'Đơn cần giao', value: '18', icon: ClipboardList, color: 'primary' },
    { label: 'Đang giao', value: '12', icon: TruckIcon, color: 'accent' },
    { label: 'Đã giao', value: '45', icon: CheckCircle, color: 'success' },
    { label: 'Sự cố', value: '2', icon: AlertCircle, color: 'warning' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Xin chào, {userName}</h1>
        <p className="text-muted-foreground mt-1">
          Điều phối và quản lý vận chuyển
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
              <h3 className="font-semibold text-lg">Tổng hợp đơn hàng</h3>
              <p className="text-sm text-muted-foreground">Xem và tổng hợp đơn hàng cần giao</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 transition-all hover:shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent/10 text-accent">
              <TruckIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Điều phối & giao hàng</h3>
              <p className="text-sm text-muted-foreground">Lập lịch và theo dõi giao hàng</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
