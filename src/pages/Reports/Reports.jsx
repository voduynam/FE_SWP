import { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Calendar,
  Package,
  TruckIcon,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';

const monthlyData = [
  { month: 'T1', orders: 1250, revenue: 385000000, cost: 245000000 },
  { month: 'T2', orders: 1180, revenue: 362000000, cost: 232000000 },
  { month: 'T3', orders: 1420, revenue: 428000000, cost: 268000000 },
  { month: 'T4', orders: 1380, revenue: 415000000, cost: 262000000 },
  { month: 'T5', orders: 1520, revenue: 468000000, cost: 295000000 },
  { month: 'T6', orders: 1650, revenue: 512000000, cost: 318000000 },
];

const topProducts = [
  { name: 'Cơm gà', quantity: 4520, revenue: 203400000 },
  { name: 'Phở bò', quantity: 2180, revenue: 119900000 },
  { name: 'Bánh mì thịt', quantity: 3200, revenue: 112000000 },
  { name: 'Chả giò', quantity: 2850, revenue: 71250000 },
  { name: 'Nem chua', quantity: 1420, revenue: 42600000 },
];

const storePerformance = [
  { name: 'CH Quận 7', orders: 203, revenue: 62500000, growth: 15 },
  { name: 'CH Phú Nhuận', orders: 167, revenue: 51200000, growth: 8 },
  { name: 'CH Quận 1', orders: 156, revenue: 45600000, growth: -3 },
  { name: 'CH Quận 3', orders: 128, revenue: 38200000, growth: 5 },
  { name: 'CH Bình Thạnh', orders: 98, revenue: 29800000, growth: -8 },
];

export default function Reports() {
  const [dateRange, setDateRange] = useState('month');

  const totalRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0);
  const totalCost = monthlyData.reduce((sum, d) => sum + d.cost, 0);
  const totalOrders = monthlyData.reduce((sum, d) => sum + d.orders, 0);
  const profit = totalRevenue - totalCost;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Báo cáo & Thống kê</h1>
          <p className="text-muted-foreground mt-1">
            Theo dõi hiệu suất sản xuất, phân phối và bán hàng
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input-field"
          >
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="quarter">Quý này</option>
            <option value="year">Năm nay</option>
          </select>
          <button className="btn-outline flex items-center gap-2">
            <Download className="w-4 h-4" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng doanh thu"
          value={`${(totalRevenue / 1000000000).toFixed(2)}B`}
          change={12}
          changeType="increase"
          icon={DollarSign}
          color="success"
        />
        <StatCard
          title="Tổng đơn hàng"
          value={totalOrders.toLocaleString()}
          change={8}
          changeType="increase"
          icon={Package}
          color="primary"
        />
        <StatCard
          title="Chi phí sản xuất"
          value={`${(totalCost / 1000000000).toFixed(2)}B`}
          change={5}
          changeType="increase"
          icon={TruckIcon}
          color="warning"
        />
        <StatCard
          title="Lợi nhuận"
          value={`${(profit / 1000000000).toFixed(2)}B`}
          change={18}
          changeType="increase"
          icon={TrendingUp}
          color="accent"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">Doanh thu & Chi phí</h3>
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {monthlyData.map((data) => {
              const maxRevenue = Math.max(...monthlyData.map(d => d.revenue));
              const revenuePercent = (data.revenue / maxRevenue) * 100;
              const costPercent = (data.cost / maxRevenue) * 100;
              
              return (
                <div key={data.month} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{data.month}/2025</span>
                    <span className="text-muted-foreground">
                      {(data.revenue / 1000000).toFixed(0)}M / {(data.cost / 1000000).toFixed(0)}M
                    </span>
                  </div>
                  <div className="relative h-6 bg-muted rounded-lg overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-success/30 rounded-lg"
                      style={{ width: `${revenuePercent}%` }}
                    />
                    <div 
                      className="absolute inset-y-0 left-0 bg-warning/50 rounded-lg"
                      style={{ width: `${costPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success/30" />
              <span className="text-muted-foreground">Doanh thu</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning/50" />
              <span className="text-muted-foreground">Chi phí</span>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">Sản phẩm bán chạy</h3>
            <Package className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {topProducts.map((product, index) => {
              const maxRevenue = Math.max(...topProducts.map(p => p.revenue));
              const percent = (product.revenue / maxRevenue) * 100;
              
              return (
                <div key={product.name} className="flex items-center gap-4">
                  <span className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center text-sm font-bold text-secondary">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {product.quantity.toLocaleString()} sp
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-secondary rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-semibold text-sm w-20 text-right">
                    {(product.revenue / 1000000).toFixed(1)}M
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Store Performance */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg">Hiệu suất cửa hàng</h3>
          <button className="text-sm text-secondary hover:underline">Xem tất cả</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3 text-left">Cửa hàng</th>
                <th className="px-4 py-3 text-right">Đơn hàng</th>
                <th className="px-4 py-3 text-right">Doanh thu</th>
                <th className="px-4 py-3 text-center">Tăng trưởng</th>
                <th className="px-4 py-3 text-left">Xu hướng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {storePerformance.map((store) => (
                <tr key={store.name} className="hover:bg-muted/50">
                  <td className="px-4 py-4 font-medium">{store.name}</td>
                  <td className="px-4 py-4 text-right">{store.orders}</td>
                  <td className="px-4 py-4 text-right font-semibold">
                    {(store.revenue / 1000000).toFixed(1)}M
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 ${store.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {store.growth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {Math.abs(store.growth)}%
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${store.growth >= 0 ? 'bg-success' : 'bg-destructive'}`}
                        style={{ width: `${Math.min(Math.abs(store.growth) * 5, 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <h3 className="font-semibold text-lg">Cảnh báo & Lưu ý</h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
            <p className="font-medium text-warning">3 nguyên liệu sắp hết</p>
            <p className="text-sm text-muted-foreground mt-1">Bơ lạt, Chocolate đen, Sữa tươi cần nhập thêm</p>
          </div>
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="font-medium text-destructive">2 đơn hàng bị trễ</p>
            <p className="text-sm text-muted-foreground mt-1">DH098, DH099 chưa giao đúng hẹn</p>
          </div>
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <p className="font-medium text-accent">5 sản phẩm sắp hết hạn</p>
            <p className="text-sm text-muted-foreground mt-1">Kiểm tra kho trong 7 ngày tới</p>
          </div>
        </div>
      </div>
    </div>
  );
}
