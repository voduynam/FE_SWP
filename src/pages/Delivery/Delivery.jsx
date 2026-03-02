import { useState, useMemo } from 'react';
import { 
  Search, 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Phone,
  Calendar,
  Plus,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDelivery } from '../../contexts/DeliveryContext';
import StatusBadge from '../../components/ui/StatusBadge';
import StatCard from '../../components/ui/StatCard';

export default function Delivery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { user } = useAuth();
  const { deliveries, loading, updateDeliveryStatus, reportIssue, scheduleDelivery, refresh } = useDelivery();
  
  const userRole = user?.roleId?.roleName || user?.role || '';

  // Phân quyền
  const canViewAll = ['admin', 'manager', 'supply-coordinator'].includes(userRole);
  const canSchedule = ['supply-coordinator', 'admin'].includes(userRole);
  const canUpdateStatus = ['supply-coordinator', 'admin'].includes(userRole);
  const canConfirm = ['franchise-staff', 'admin'].includes(userRole);
  const canReportIssue = ['franchise-staff', 'supply-coordinator', 'admin', 'driver'].includes(userRole);
  const isDriver = userRole === 'driver';

  // Filter deliveries theo search và status
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(delivery => {
      const matchesSearch = delivery.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           delivery.store.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (delivery.driver && delivery.driver.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [deliveries, searchTerm, statusFilter]);

  const pendingCount = deliveries.filter(d => d.status === 'pending').length;
  const shippingCount = deliveries.filter(d => d.status === 'shipping').length;
  const deliveredCount = deliveries.filter(d => d.status === 'delivered').length;

  // Handlers
  const handleUpdateStatus = async (deliveryId, newStatus) => {
    try {
      await updateDeliveryStatus(deliveryId, newStatus);
    } catch (error) {
      alert(error.message || 'Cập nhật thất bại');
    }
  };

  const handleReportIssue = async (deliveryId) => {
    const description = prompt('Nhập mô tả sự cố:');
    if (description) {
      try {
        await reportIssue(deliveryId, description);
        alert('Đã gửi báo cáo');
      } catch (error) {
        alert(error.message || 'Gửi báo cáo thất bại');
      }
    }
  };

  const handleScheduleDelivery = async () => {
    // TODO: Mở modal để nhập thông tin lập lịch
    alert('Tính năng lập lịch giao hàng sẽ được triển khai');
  };

  const getRoleDescription = () => {
    switch (userRole) {
      case 'driver':
        return 'Xem và quản lý đơn hàng được phân công giao';
      case 'franchise-staff':
        return 'Theo dõi trạng thái giao hàng và xác nhận nhận hàng';
      case 'supply-coordinator':
        return 'Lập lịch giao hàng, theo dõi vận chuyển và xử lý sự cố';
      case 'manager':
        return 'Theo dõi hiệu suất vận chuyển và phân phối';
      default:
        return 'Quản lý toàn bộ vận chuyển trong hệ thống';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Vận chuyển</h1>
          <p className="text-muted-foreground mt-1">
            {getRoleDescription()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canSchedule && (
            <button 
              onClick={handleScheduleDelivery}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Lập lịch giao
            </button>
          )}
          {canViewAll && (
            <button className="btn-outline flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Xuất báo cáo
            </button>
          )}
          <button
            onClick={refresh}
            className="btn-outline flex items-center gap-2"
            title="Làm mới dữ liệu"
          >
            <Clock className="w-4 h-4" />
            Làm mới
          </button>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Hôm nay: {new Date().toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Chờ giao"
          value={pendingCount}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Đang giao"
          value={shippingCount}
          icon={Truck}
          color="accent"
        />
        <StatCard
          title="Đã giao"
          value={deliveredCount}
          icon={CheckCircle}
          color="success"
        />
        <StatCard
          title="Tỷ lệ đúng hẹn"
          value="94%"
          icon={AlertTriangle}
          color="primary"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã, cửa hàng, tài xế..."
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
          <option value="pending">Chờ giao</option>
          <option value="shipping">Đang giao</option>
          <option value="delivered">Đã giao</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>

      {/* Deliveries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDeliveries.map((delivery) => (
          <div 
            key={delivery.id} 
            className={`bg-card rounded-xl border p-5 transition-all hover:shadow-lg ${
              delivery.status === 'shipping' ? 'border-accent' : 'border-border'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-lg">{delivery.id}</p>
                <p className="text-sm text-muted-foreground">Đơn: {delivery.orderId}</p>
              </div>
              <StatusBadge status={delivery.status} />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{delivery.store}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">{delivery.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span>{delivery.driver}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{delivery.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>ETA: <span className="font-medium">{delivery.eta}</span></span>
              </div>
            </div>

            {/* Điều phối viên / Admin: Quản lý đơn đang giao */}
            {delivery.status === 'shipping' && (canUpdateStatus || canConfirm) && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex gap-2">
                  {canUpdateStatus && (
                    <button 
                      onClick={() => handleUpdateStatus(delivery.id, 'delivered')}
                      className="flex-1 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Xác nhận giao
                    </button>
                  )}
                  {canConfirm && !canUpdateStatus && (
                    <button 
                      onClick={() => handleUpdateStatus(delivery.id, 'delivered')}
                      className="flex-1 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Xác nhận nhận hàng
                    </button>
                  )}
                  {canReportIssue && (
                    <button 
                      onClick={() => handleReportIssue(delivery.id)}
                      className="py-2 px-3 rounded-lg bg-destructive/10 text-destructive text-sm hover:bg-destructive/20 transition-colors"
                    >
                      Báo lỗi
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Driver / Điều phối viên / Admin: Bắt đầu giao */}
            {delivery.status === 'pending' && (isDriver || canSchedule) && (
              <div className="mt-4 pt-4 border-t border-border">
                <button 
                  onClick={() => handleUpdateStatus(delivery.id, 'shipping')}
                  className="w-full py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Bắt đầu giao
                </button>
              </div>
            )}

            {/* Driver: Quản lý đơn đang giao */}
            {isDriver && delivery.status === 'shipping' && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUpdateStatus(delivery.id, 'delivered')}
                    className="flex-1 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Xác nhận đã giao
                  </button>
                  <button 
                    onClick={() => handleReportIssue(delivery.id)}
                    className="py-2 px-3 rounded-lg bg-destructive/10 text-destructive text-sm hover:bg-destructive/20 transition-colors"
                  >
                    Báo lỗi
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredDeliveries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Không tìm thấy đơn vận chuyển phù hợp
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Hiển thị {filteredDeliveries.length} / {deliveries.length} đơn vận chuyển</p>
      </div>
    </div>
  );
}
