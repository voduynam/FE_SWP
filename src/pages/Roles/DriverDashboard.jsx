import { useMemo, useState, useEffect } from 'react';
import { Truck, MapPin, Clock, CheckCircle, Package, X, AlertCircle, RefreshCcw, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '../../components/ui/chart';
import { useAuth } from '../../contexts/AuthContext';
import { workflowService } from '../../services/workflowService';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';

export default function DriverDashboard() {
  const { user } = useAuth();
  const userName = user?.name || user?.username || 'Tài xế';
  
  // State management
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [listFilter, setListFilter] = useState('all'); // all | shipped | in_transit | delivered

  // Load shipments data
  const loadShipments = async () => {
    setLoading(true);
    setError('');
    try {
      const [shippedRes, transitRes, deliveredRes] = await Promise.all([
        workflowService.getShipmentsPaginated({ status: 'SHIPPED', limit: 50 }),
        workflowService.getShipmentsPaginated({ status: 'IN_TRANSIT', limit: 50 }),
        workflowService.getShipmentsPaginated({ status: 'DELIVERED', limit: 20 }),
      ]);

      const shipped = Array.isArray(shippedRes?.data?.data) ? shippedRes.data.data : [];
      const transit = Array.isArray(transitRes?.data?.data) ? transitRes.data.data : [];
      const delivered = Array.isArray(deliveredRes?.data?.data) ? deliveredRes.data.data : [];

      const allShipments = [...shipped, ...transit, ...delivered]
        .sort((a, b) => new Date(b.ship_date || b.updatedAt || 0) - new Date(a.ship_date || a.updatedAt || 0));

      setShipments(allShipments);
    } catch (err) {
      console.error('Error loading shipments:', err);
      setError('Không thể tải dữ liệu lô giao hàng');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  // Computed values
  const shippedCount = useMemo(() => shipments.filter(s => s.status === 'SHIPPED').length, [shipments]);
  const transitCount = useMemo(() => shipments.filter(s => s.status === 'IN_TRANSIT').length, [shipments]);
  const deliveredCount = useMemo(() => shipments.filter(s => s.status === 'DELIVERED').length, [shipments]);
  const todayTotal = shipments.length;
  const codTotal = useMemo(() => 
    shipments
      .filter(s => s.order_id?.payment_method === 'COD' && s.status !== 'DELIVERED')
      .reduce((sum, s) => sum + (s.cod_amount || s.order_id?.total_amount || 0), 0)
  , [shipments]);

  const filteredShipments = useMemo(() => {
    if (listFilter === 'all') return shipments;
    return shipments.filter(s => s.status === listFilter.toUpperCase());
  }, [shipments, listFilter]);

  const statusSeries = useMemo(
    () => [
      { label: 'Đã xuất kho', count: shippedCount },
      { label: 'Đang vận chuyển', count: transitCount },
      { label: 'Đã giao', count: deliveredCount },
    ],
    [shippedCount, transitCount, deliveredCount]
  );

  const getFilterPillClassName = (key) => {
    if (listFilter !== key) {
      return 'bg-slate-100 hover:bg-slate-200 text-slate-700';
    }
    switch (key) {
      case 'shipped':
        return 'bg-slate-900 text-white shadow-sm ring-1 ring-amber-500/30';
      case 'in_transit':
        return 'bg-slate-900 text-white shadow-sm ring-1 ring-sky-500/30';
      case 'delivered':
        return 'bg-slate-900 text-white shadow-sm ring-1 ring-emerald-500/30';
      default:
        return 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-500/20';
    }
  };

  const handleUpdateStatus = async (shipmentId, newStatus) => {
    try {
      const res = await workflowService.updateShipmentStatus(shipmentId, { status: newStatus });
      if (res.success) {
        loadShipments(); // Reload data
      } else {
        alert(res.message || 'Cập nhật thất bại');
      }
    } catch (error) {
      alert(error.message || 'Cập nhật thất bại');
    }
  };

  const handleReportIssue = (shipmentId) => {
    setSelectedShipment(shipmentId);
    setShowIssueModal(true);
  };

  const handleSubmitIssue = async () => {
    if (!issueDescription.trim()) {
      alert('Vui lòng nhập mô tả sự cố');
      return;
    }

    try {
      setIssueSubmitting(true);
      // For now, just show success message
      // In real implementation, you would call an API to report the issue
      alert('Đã gửi báo cáo sự cố thành công');
      setShowIssueModal(false);
      setSelectedShipment(null);
      setIssueDescription('');
    } catch (error) {
      alert(error.message || 'Gửi báo cáo thất bại');
    } finally {
      setIssueSubmitting(false);
    }
  };

  const handleCancelIssue = () => {
    setShowIssueModal(false);
    setSelectedShipment(null);
    setIssueDescription('');
    setIssueSubmitting(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getLocationLabel = (loc) => {
    if (!loc) return '-';
    if (typeof loc === 'object') return loc.name || loc.code || loc._id;
    return loc;
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
          onClick={loadShipments}
          className="btn-outline flex items-center gap-2"
          title="Làm mới dữ liệu"
        >
          <RefreshCcw className="h-4 w-4" /> Làm mới
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Tổng lô hôm nay"
          value={todayTotal}
          icon={Package}
          color="primary"
        />
        <StatCard
          title="Đã xuất kho"
          value={shippedCount}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Đang vận chuyển"
          value={transitCount}
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
          title="COD cần thu"
          value={formatCurrency(codTotal)}
          icon={DollarSign}
          color="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent ring-1 ring-orange-500/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Trạng thái lô giao</h2>
            <span className="text-xs text-muted-foreground">{todayTotal} lô</span>
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
              { key: 'shipped', label: 'Đã xuất kho' },
              { key: 'in_transit', label: 'Đang vận chuyển' },
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
            Hiển thị {filteredShipments.length} / {todayTotal} đơn
          </div>
        </div>
      </div>

      {/* Shipments List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Danh sách lô giao hàng</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShipments.map((shipment) => (
            <div 
              key={shipment._id} 
              className={`bg-card rounded-xl border p-5 transition-all hover:shadow-lg border-l-4 ${
                shipment.status === 'SHIPPED'
                  ? 'border-l-amber-500/70'
                  : shipment.status === 'IN_TRANSIT'
                    ? 'border-l-sky-500/70'
                    : shipment.status === 'DELIVERED'
                      ? 'border-l-emerald-500/70'
                      : 'border-l-slate-400/50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold text-lg">{shipment.shipment_no}</p>
                  <p className="text-sm text-muted-foreground">Đơn: {shipment.order_id?.order_no || 'N/A'}</p>
                </div>
                <StatusBadge status={shipment.status} />
              </div>

              <div className="space-y-3 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{getLocationLabel(shipment.from_location_id)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">{getLocationLabel(shipment.to_location_id)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Ngày giao: <span className="font-medium">{shipment.ship_date ? new Date(shipment.ship_date).toLocaleDateString('vi-VN') : 'N/A'}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span>Lô giao hàng</span>
                </div>
                {shipment.order_id?.payment_method === 'COD' && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-warning font-medium">COD: {formatCurrency(shipment.cod_amount || shipment.order_id?.total_amount || 0)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {shipment.status === 'SHIPPED' && (
                <div className="pt-4 border-t border-border">
                  <button 
                    onClick={() => handleUpdateStatus(shipment._id, 'IN_TRANSIT')}
                    className="w-full py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Bắt đầu vận chuyển
                  </button>
                </div>
              )}

              {shipment.status === 'IN_TRANSIT' && (
                <div className="pt-4 border-t border-border space-y-2">
                  <button 
                    onClick={() => handleUpdateStatus(shipment._id, 'DELIVERED')}
                    className="w-full py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Xác nhận đã giao
                  </button>
                  <button 
                    onClick={() => handleReportIssue(shipment._id)}
                    className="w-full py-2 rounded-lg bg-destructive/10 text-destructive text-sm hover:bg-destructive/20 transition-colors"
                  >
                    Báo lỗi / Sự cố
                  </button>
                </div>
              )}

              {shipment.status === 'DELIVERED' && (
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
            <p>Không có lô giao hàng nào được phân công hôm nay</p>
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
                  Mã lô giao: <span className="font-semibold text-primary">{selectedShipment}</span>
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
