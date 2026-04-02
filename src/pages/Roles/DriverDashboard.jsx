import { useMemo, useState } from 'react';
import { Truck, MapPin, Clock, CheckCircle, Package, X, AlertCircle, RefreshCcw, Phone } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '../../components/ui/chart';
import { useAuth } from '../../contexts/AuthContext';
import { useDelivery } from '../../contexts/DeliveryContext';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';

export default function DriverDashboard() {
  const { user } = useAuth();
  const { deliveries, loading, error, updateDeliveryStatus, reportIssue, refresh } = useDelivery();
  const userName = user?.name || user?.username || 'Tài xế';
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [listFilter, setListFilter] = useState('all'); // all | pending | shipping | delivered

  const pendingCount = useMemo(() => deliveries.filter(d => d.status === 'pending').length, [deliveries]);
  const shippingCount = useMemo(() => deliveries.filter(d => d.status === 'shipping').length, [deliveries]);
  const deliveredCount = useMemo(() => deliveries.filter(d => d.status === 'delivered').length, [deliveries]);
  const todayTotal = deliveries.length;

  const filteredDeliveries = useMemo(() => {
    if (listFilter === 'all') return deliveries;
    return deliveries.filter(d => d.status === listFilter);
  }, [deliveries, listFilter]);

  const statusSeries = useMemo(
    () => [
      { label: 'Chờ giao', count: pendingCount },
      { label: 'Đang giao', count: shippingCount },
      { label: 'Đã giao', count: deliveredCount },
    ],
    [pendingCount, shippingCount, deliveredCount]
  );

  const getFilterPillClassName = (key) => {
    if (listFilter !== key) {
      return 'bg-slate-100 hover:bg-slate-200 text-slate-700';
    }
    switch (key) {
      case 'pending':
        return 'bg-slate-900 text-white shadow-sm ring-1 ring-amber-500/30';
      case 'shipping':
        return 'bg-slate-900 text-white shadow-sm ring-1 ring-sky-500/30';
      case 'delivered':
        return 'bg-slate-900 text-white shadow-sm ring-1 ring-emerald-500/30';
      default:
        return 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-500/20';
    }
  };

  const handleStartDelivery = async (deliveryId) => {
    try {
      await updateDeliveryStatus(deliveryId, 'shipping');
    } catch (error) {
      alert(error.message || 'Cập nhật thất bại');
    }
  };

  const handleCompleteDelivery = async (deliveryId) => {
    try {
      await updateDeliveryStatus(deliveryId, 'delivered');
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
      setIssueSubmitting(true);
      await reportIssue(selectedDelivery, issueDescription);
      alert('Đã gửi báo cáo sự cố thành công');
      setShowIssueModal(false);
      setSelectedDelivery(null);
      setIssueDescription('');
    } catch (error) {
      alert(error.message || 'Gửi báo cáo thất bại');
    } finally {
      setIssueSubmitting(false);
    }
  };

  const handleCancelIssue = () => {
    setShowIssueModal(false);
    setSelectedDelivery(null);
    setIssueDescription('');
    setIssueSubmitting(false);
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
          <h1 className="text-3xl font-bold">Xin chào, {userName}</h1>
          <p className="text-muted-foreground mt-1">Theo dõi & xử lý các đơn giao trong ngày của bạn.</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="btn-outline flex items-center gap-2"
          title="Làm mới dữ liệu"
        >
          <RefreshCcw className="h-4 w-4" /> Làm mới
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{String(error?.message || error || 'Có lỗi xảy ra')}</p>}

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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent ring-1 ring-orange-500/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Trạng thái đơn</h2>
            <span className="text-xs text-muted-foreground">{todayTotal} đơn</span>
          </div>

          <ChartContainer config={{ count: { label: 'Số lượng' } }} className="h-[260px] w-full">
            <BarChart data={statusSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [Number(value ?? 0).toLocaleString('vi-VN'), 'Số lượng']}
                  />
                }
              />
              <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm bg-gradient-to-br from-slate-900/5 via-transparent to-transparent ring-1 ring-slate-900/5">
          <h2 className="text-base font-semibold mb-3">Lọc danh sách</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'pending', label: 'Chờ giao' },
              { key: 'shipping', label: 'Đang giao' },
              { key: 'delivered', label: 'Đã giao' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setListFilter(t.key)}
                className={`px-3 py-1 rounded-full text-sm transition ${getFilterPillClassName(t.key)}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            Hiển thị {filteredDeliveries.length} / {todayTotal} đơn
          </div>
        </div>
      </div>

      {/* Deliveries List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Danh sách đơn hàng</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeliveries.map((delivery) => (
            <div 
              key={delivery.id} 
              className={`bg-card rounded-xl border p-5 transition-all hover:shadow-lg border-l-4 ${
                delivery.status === 'pending'
                  ? 'border-l-amber-500/70'
                  : delivery.status === 'shipping'
                    ? 'border-l-sky-500/70'
                    : delivery.status === 'delivered'
                      ? 'border-l-emerald-500/70'
                      : 'border-l-slate-400/50'
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
                {delivery.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{delivery.phone}</span>
                  </div>
                ) : null}
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

        {todayTotal === 0 && (
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
                  className="input-field w-full min-h-[120px] resize-none"
                  rows={4}
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCancelIssue}
                  className="flex-1 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  disabled={issueSubmitting}
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmitIssue}
                  className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                  disabled={issueSubmitting}
                >
                  {issueSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
