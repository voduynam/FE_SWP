import { useState } from 'react';
import { Truck, MapPin, Clock, CheckCircle, Package, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDelivery } from '../../contexts/DeliveryContext';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';

export default function DriverDashboard() {
  const { user } = useAuth();
  const { deliveries, loading, updateDeliveryStatus, reportIssue } = useDelivery();
  const userName = user?.name || user?.username || 'Tài xế';
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [issueDescription, setIssueDescription] = useState('');

  const pendingCount = deliveries.filter(d => d.status === 'pending').length;
  const shippingCount = deliveries.filter(d => d.status === 'shipping').length;
  const deliveredCount = deliveries.filter(d => d.status === 'delivered').length;
  const todayTotal = deliveries.length;

  const handleStartDelivery = async (deliveryId) => {
    try {
      await updateDeliveryStatus(deliveryId, 'shipping');
      console.log('Bắt đầu giao:', deliveryId);
    } catch (error) {
      alert(error.message || 'Cập nhật thất bại');
    }
  };

  const handleCompleteDelivery = async (deliveryId) => {
    try {
      await updateDeliveryStatus(deliveryId, 'delivered');
      console.log('Hoàn thành giao:', deliveryId);
    } catch (error) {
      alert(error.message || 'Cập nhật thất bại');
    }
  };

  const handleReportIssue = (deliveryId) => {
    setSelectedDelivery(deliveryId);
    setShowIssueModal(true);
  };

  const handleSubmitIssue = async () => {
    if (!issueDescription.trim()) {
      alert('Vui lòng nhập mô tả sự cố');
      return;
    }

    try {
      await reportIssue(selectedDelivery, issueDescription);
      alert('Đã gửi báo cáo sự cố thành công');
      setShowIssueModal(false);
      setSelectedDelivery(null);
      setIssueDescription('');
    } catch (error) {
      alert(error.message || 'Gửi báo cáo thất bại');
    }
  };

  const handleCancelIssue = () => {
    setShowIssueModal(false);
    setSelectedDelivery(null);
    setIssueDescription('');
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
      <div>
        <h1 className="text-3xl font-bold">Xin chào, {userName}</h1>
        <p className="text-muted-foreground mt-1">
          Quản lý đơn hàng được phân công giao trong ngày
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng đơn hôm nay"
          value={todayTotal}
          icon={Package}
          color="primary"
        />
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
      </div>

      {/* Deliveries List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Danh sách đơn hàng</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deliveries.map((delivery) => (
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

              <div className="space-y-3 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{delivery.store}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">{delivery.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>ETA: <span className="font-medium">{delivery.eta}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span>{delivery.items} sản phẩm</span>
                </div>
              </div>

              {/* Actions */}
              {delivery.status === 'pending' && (
                <div className="pt-4 border-t border-border">
                  <button 
                    onClick={() => handleStartDelivery(delivery.id)}
                    className="w-full py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Bắt đầu giao
                  </button>
                </div>
              )}

              {delivery.status === 'shipping' && (
                <div className="pt-4 border-t border-border space-y-2">
                  <button 
                    onClick={() => handleCompleteDelivery(delivery.id)}
                    className="w-full py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Xác nhận đã giao
                  </button>
                  <button 
                    onClick={() => handleReportIssue(delivery.id)}
                    className="w-full py-2 rounded-lg bg-destructive/10 text-destructive text-sm hover:bg-destructive/20 transition-colors"
                  >
                    Báo lỗi / Sự cố
                  </button>
                </div>
              )}

              {delivery.status === 'delivered' && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-success text-center font-medium">
                    ✓ Đã giao thành công
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {deliveries.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Truck className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Không có đơn hàng nào được phân công hôm nay</p>
          </div>
        )}
      </div>

      {/* Issue Report Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                Báo cáo sự cố
              </h3>
              <button
                onClick={handleCancelIssue}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mã đơn: <span className="font-semibold text-primary">{selectedDelivery}</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mô tả sự cố <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Nhập mô tả chi tiết về sự cố gặp phải..."
                  className="input-field min-h-[120px] resize-none"
                  rows={4}
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCancelIssue}
                  className="flex-1 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmitIssue}
                  className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                >
                  Gửi báo cáo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
