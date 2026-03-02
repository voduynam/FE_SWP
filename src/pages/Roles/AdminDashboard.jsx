import { useMemo, useState } from "react";
import {
  ClipboardList,
  Package,
  TruckIcon,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Download,
  Search,
} from "lucide-react";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadges";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const recentOrders = [
  {
    id: "DH001",
    store: "CH Quận 1",
    items: 15,
    total: "2450000",
    status: "pending",
    time: "10 phút trước",
  },
  {
    id: "DH002",
    store: "CH Quận 3",
    items: 8,
    total: "1280000",
    status: "processing",
    time: "25 phút trước",
  },
  {
    id: "DH003",
    store: "CH Quận 7",
    items: 22,
    total: "3850000",
    status: "producing",
    time: "45 phút trước",
  },
  {
    id: "DH004",
    store: "CH Bình Thạnh",
    items: 12,
    total: "1920000",
    status: "shipping",
    time: "1 giờ trước",
  },
  {
    id: "DH005",
    store: "CH Tân Bình",
    items: 18,
    total: "2890000",
    status: "completed",
    time: "2 giờ trước",
  },
];

const alerts = [
  {
    type: "warning",
    message: 'Nguyên liệu "Bột mì" sắp hết (còn 50kg)',
    time: "5 phút trước",
  },
  {
    type: "error",
    message: "Đơn hàng DH098 bị trễ giao 30 phút",
    time: "15 phút trước",
  },
  {
    type: "info",
    message: 'Cửa hàng mới "CH Gò Vấp" đã được thêm',
    time: "1 giờ trước",
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const userName = user?.name || user?.full_name || 'Admin';
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  const filteredOrders = useMemo(() => {
    return recentOrders.filter((o) => {
      const matchQuery = query
        ? o.id.toLowerCase().includes(query.toLowerCase()) ||
          o.store.toLowerCase().includes(query.toLowerCase())
        : true;
      const matchStatus = statusFilter ? o.status === statusFilter : true;
      return matchQuery && matchStatus;
    });
  }, [query, statusFilter]);

  function formatVND(value) {
    return Number(value).toLocaleString("vi-VN") + "₫";
  }

  function exportOrdersCsv() {
    const rows = filteredOrders.map((r) => ({
      id: r.id,
      store: r.store,
      items: r.items,
      total: r.total,
      status: r.status,
      time: r.time,
    }));
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(",")]
      .concat(
        rows.map((r) =>
          keys
            .map((k) => `"${(r[k] ?? "").toString().replace(/"/g, '""')}"`)
            .join(","),
        ),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "recent_orders.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {getGreeting()}, {userName}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Đây là tổng quan hoạt động hệ thống hôm nay
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="input-field pl-9"
              placeholder="Tìm đơn / cửa hàng..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="processing">Đang xử lý</option>
            <option value="producing">Đang sản xuất</option>
            <option value="shipping">Đang giao</option>
            <option value="completed">Hoàn thành</option>
          </select>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={exportOrdersCsv}
          >
            <Download className="w-4 h-4" /> Xuất
          </button>
          <Link to="/orders" className="btn-outline flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Xem tất cả
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Đơn hàng hôm nay"
          value="48"
          change={12}
          changeType="increase"
          icon={ClipboardList}
          color="primary"
        />
        <StatCard
          title="Sản phẩm sản xuất"
          value="156"
          change={8}
          changeType="increase"
          icon={Package}
          color="secondary"
        />
        <StatCard
          title="Đơn đang giao"
          value="12"
          change={5}
          changeType="decrease"
          icon={TruckIcon}
          color="accent"
        />
        <StatCard
          title="Cửa hàng hoạt động"
          value="24"
          icon={Users}
          color="success"
        />
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-md overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Đơn hàng gần đây</h2>
            <div className="flex items-center gap-2">
              <button
                className="text-sm text-secondary hover:underline flex items-center gap-1"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("");
                }}
              >
                Đặt lại lọc
              </button>
              <Link
                to="/orders"
                className="text-sm text-secondary hover:underline flex items-center gap-1"
              >
                Xem tất cả <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-border">
            {filteredOrders.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                Không tìm thấy đơn hàng phù hợp.
              </div>
            )}
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{order.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.store}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">{formatVND(order.total)}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.items} sản phẩm
                    </p>
                  </div>

                  <div className="hidden sm:flex sm:flex-col items-end gap-2">
                    <StatusBadge status={order.status} />
                    <p className="text-xs text-muted-foreground">
                      {order.time}
                    </p>
                    <Link
                      to={`/orders/${order.id}`}
                      className="text-xs text-secondary hover:underline"
                    >
                      Xem
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts & Status */}
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-md">
            <h3 className="font-semibold mb-4">Trạng thái đơn hàng</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning" />
                  <span className="text-sm">Chờ xử lý</span>
                </div>
                <span className="font-semibold">8</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-accent" />
                  <span className="text-sm">Đang sản xuất</span>
                </div>
                <span className="font-semibold">15</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TruckIcon className="w-4 h-4 text-secondary" />
                  <span className="text-sm">Đang giao</span>
                </div>
                <span className="font-semibold">12</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm">Hoàn thành</span>
                </div>
                <span className="font-semibold">13</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-md">
            <h3 className="font-semibold mb-4">Thông báo</h3>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <AlertTriangle
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${alert.type === "error" ? "text-destructive" : alert.type === "warning" ? "text-warning" : "text-accent"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
