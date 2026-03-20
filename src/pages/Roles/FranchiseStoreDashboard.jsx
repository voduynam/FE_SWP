import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '../../components/ui/chart';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import { useDelivery } from '../../contexts/DeliveryContext';
import { workflowService } from '../../services/workflowService';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Clock,
  Package,
  Phone,
  RefreshCcw,
  Truck,
  X,
} from 'lucide-react';

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getList = (res) => {
  if (!res?.success) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  if (Array.isArray(res.data?.alerts)) return res.data.alerts;
  if (Array.isArray(res.data?.data?.alerts)) return res.data.data.alerts;
  return [];
};

const getOrderStatusPillClass = (status) => {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'DRAFT':
      return 'bg-amber-100 text-amber-700';
    case 'SUBMITTED':
      return 'bg-sky-100 text-sky-700';
    case 'APPROVED':
      return 'bg-indigo-100 text-indigo-700';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-700';
    case 'SHIPPED':
      return 'bg-violet-100 text-violet-700';
    case 'RECEIVED':
      return 'bg-emerald-100 text-emerald-700';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const getStockSeverityPillClass = (severity) => {
  const s = String(severity || '').toUpperCase();
  switch (s) {
    case 'EXPIRED':
      return 'bg-red-100 text-red-700';
    case 'CRITICAL':
      return 'bg-orange-100 text-orange-700';
    case 'HIGH':
      return 'bg-amber-100 text-amber-700';
    case 'MEDIUM':
      return 'bg-sky-100 text-sky-700';
    case 'LOW':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

export default function FranchiseStoreDashboard() {
  const { user } = useAuth();
  const { deliveries, loading: deliveryLoading, updateDeliveryStatus, reportIssue, refresh: refreshDeliveries } = useDelivery();

  const userName = user?.name || user?.full_name || 'Nhân viên cửa hàng';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [overview, setOverview] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  const [receiptsDraft, setReceiptsDraft] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  const pendingCount = useMemo(() => deliveries.filter(d => d.status === 'pending').length, [deliveries]);
  const shippingCount = useMemo(() => deliveries.filter(d => d.status === 'shipping').length, [deliveries]);
  const deliveredCount = useMemo(() => deliveries.filter(d => d.status === 'delivered').length, [deliveries]);
  const cancelledCount = useMemo(() => deliveries.filter(d => d.status === 'cancelled').length, [deliveries]);

  const deliveryStatusSeries = useMemo(
    () => [
      { label: 'Chờ xử lý', count: pendingCount },
      { label: 'Đang giao', count: shippingCount },
      { label: 'Đã giao', count: deliveredCount },
      { label: 'Đã hủy', count: cancelledCount },
    ].filter(x => x.count > 0),
    [pendingCount, shippingCount, deliveredCount, cancelledCount]
  );

  const formatVnd = (n) => {
    const v = Number(n ?? 0);
    if (!Number.isFinite(v)) return '-';
    return v.toLocaleString('vi-VN') + ' ₫';
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewRes, ordersRes, draftReceiptsRes, lowStockRes, expiryRes] = await Promise.all([
        workflowService.getDashboardOverview({}),
        workflowService.getInternalOrders({ limit: 8 }),
        workflowService.getGoodsReceipts({ status: 'DRAFT', limit: 20 }),
        workflowService.getAlertsLowStock({}),
        workflowService.getAlertsExpiry({ days_threshold: 14 }),
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);

      if (ordersRes.success) setRecentOrders(getRows(ordersRes.data).slice(0, 8));
      else setRecentOrders([]);

      // DRAFT goods receipts
      const receipts = getList(draftReceiptsRes);
      setReceiptsDraft(receipts.slice(0, 12));

      setLowStockAlerts(getList(lowStockRes).slice(0, 20));
      setExpiryAlerts(getList(expiryRes).slice(0, 20));
    } catch (e) {
      setError(e?.message || 'Không thể tải dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadData, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirmDelivery = async (deliveryId) => {
    try {
      await updateDeliveryStatus(deliveryId, 'delivered');
      await refreshDeliveries(true);
      setTimeout(() => loadData(), 800);
    } catch (e) {
      alert(e?.message || 'Xác nhận thất bại');
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
    } catch (e) {
      alert(e?.message || 'Gửi báo cáo thất bại');
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

  const topShippingDeliveries = useMemo(
    () => deliveries.filter(d => d.status === 'shipping').slice(0, 6),
    [deliveries]
  );

  const topLowStockAlerts = useMemo(() => lowStockAlerts.slice(0, 6), [lowStockAlerts]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Xin chào, {userName}</h1>
          <p className="text-muted-foreground mt-1">Tổng quan đơn hàng, phiếu nhận và cảnh báo tồn kho cho cửa hàng của bạn.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="btn-outline flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" /> {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <div className="text-xs text-muted-foreground">
            Giao hàng: đang giao {shippingCount} · đã giao {deliveredCount}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Tổng đơn (30 ngày)"
          value={`${overview?.orders?.total ?? 0}`}
          icon={ClipboardList}
          color="primary"
        />
        <StatCard
          title="Phiếu nhận nháp"
          value={`${receiptsDraft.length}`}
          icon={Package}
          color="warning"
        />
        <StatCard
          title="Giá trị tồn kho"
          value={overview?.inventory?.total_value != null ? formatVnd(overview.inventory.total_value) : '-'}
          icon={AlertTriangle}
          color="accent"
        />
        <StatCard
          title="Low stock"
          value={`${lowStockAlerts.length}`}
          icon={AlertTriangle}
          color="destructive"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent ring-1 ring-orange-500/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Trạng thái giao hàng</h2>
            <span className="text-xs text-muted-foreground">
              {deliveryLoading ? 'Đang tải…' : `${deliveries.length} đơn`}
            </span>
          </div>

          {!deliveryStatusSeries.length ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Không có dữ liệu giao hàng.</p>
          ) : (
            <ChartContainer config={{ count: { label: 'Số lượng' } }} className="h-[260px] w-full">
              <BarChart data={deliveryStatusSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                <Bar dataKey="count" fill="#ea580c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm bg-gradient-to-br from-sky-500/10 via-transparent to-transparent ring-1 ring-sky-500/10">
          <h2 className="text-base font-semibold mb-3">Đang chờ xác nhận</h2>
          {!topShippingDeliveries.length ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Không có đơn đang giao.</p>
          ) : (
            <div className="space-y-2">
              {topShippingDeliveries.map(d => (
                <div key={d.id} className="rounded-lg bg-muted/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate text-slate-900">{d.id} · {d.orderId}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {d.store} · ETA: {d.eta || '—'}
                      </div>
                      {d.phone ? <div className="text-xs text-muted-foreground mt-1"><Phone className="inline w-3.5 h-3.5 mr-1" />{d.phone}</div> : null}
                    </div>
                    <StatusBadge status={d.status} />
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmDelivery(d.id)}
                      className="flex-1 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Xác nhận
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReportIssue(d.id)}
                      className="py-2 px-3 rounded-lg bg-destructive/10 text-destructive text-sm hover:bg-destructive/20 transition-colors"
                    >
                      Báo lỗi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent ring-1 ring-violet-500/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Đơn gần đây</h2>
            <span className="text-xs text-muted-foreground">{recentOrders.length} đơn</span>
          </div>

          {!recentOrders.length ? (
            <p className="text-sm text-muted-foreground py-6">Không có đơn hàng.</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map(o => (
                <div key={o._id} className="rounded-lg bg-muted/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate text-slate-900">{o.order_no || o._id}</div>
                      <div className="text-xs text-muted-foreground mt-1">Trạng thái: {o.status || '-'}</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getOrderStatusPillClass(o.status)}`}>
                      {o.status || '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm bg-gradient-to-br from-amber-500/10 via-transparent to-transparent ring-1 ring-amber-500/10">
          <h2 className="text-base font-semibold mb-3">Low stock (top)</h2>
          {!topLowStockAlerts.length ? (
            <p className="text-sm text-muted-foreground py-6">Không có cảnh báo low-stock.</p>
          ) : (
            <div className="space-y-2">
              {topLowStockAlerts.map(a => (
                <div key={a.alert_id || a._id} className="rounded-lg bg-muted/40 p-3">
                  <div className="font-medium text-slate-900 truncate">
                    {a.item?.name || a.item_name || a.item_id?.name || a.item_id?.sku || '—'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Kho: {a.location?.name || a.location_id?.name || '-'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Khả dụng: {a.qty_available ?? '-'} · Min: {a.min_stock ?? a.min_stock_level ?? '-'}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStockSeverityPillClass(a.severity)}`}>
                      {a.severity || '-'}
                    </span>
                    <span className="text-xs text-muted-foreground">{a.status || ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
              <button onClick={handleCancelIssue} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium mb-2">
                Mã đơn: <span className="font-semibold text-primary">{selectedDelivery}</span>
              </label>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Mô tả sự cố <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
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

