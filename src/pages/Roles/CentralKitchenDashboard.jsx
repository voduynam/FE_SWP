import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '../../components/ui/chart';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../contexts/AuthContext';
import { workflowService } from '../../services/workflowService';
import { ChefHat, Clock, Package, RefreshCcw, AlertTriangle, ClipboardList } from 'lucide-react';

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const PROD_STATUS_LABELS = {
  DRAFT: 'Nháp',
  PLANNED: 'Kế hoạch',
  RELEASED: 'Đã phát hành',
  IN_PROGRESS: 'Đang sản xuất',
  DONE: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const expirySeverityLabels = {
  EXPIRED: 'Đã hết hạn',
  CRITICAL: 'Rất gấp (<3 ngày)',
  HIGH: 'Sắp hết (3-7 ngày)',
  MEDIUM: 'Cảnh báo (7-14 ngày)',
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

const getProductionStatusPillClass = (status) => {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-700';
    case 'DONE':
      return 'bg-emerald-100 text-emerald-700';
    case 'RELEASED':
      return 'bg-indigo-100 text-indigo-700';
    case 'PLANNED':
      return 'bg-amber-100 text-amber-700';
    case 'DRAFT':
      return 'bg-slate-100 text-slate-700';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const getExpirySeverityPillClass = (severity) => {
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
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

export default function CentralKitchenDashboard() {
  const { user } = useAuth();
  const userName = user?.name || user?.full_name || 'NV Bếp trung tâm';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [orders, setOrders] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [oRes, pRes, aRes] = await Promise.all([
        workflowService.getInternalOrders({ status: 'SUBMITTED', page: 1, limit: 20 }),
        workflowService.getProductionOrders({ page: 1, limit: 20 }),
        workflowService.getAlertsExpiry({ days_threshold: 7, limit: 50 }),
      ]);

      if (oRes.success) setOrders(getRows(oRes.data));
      else setOrders([]);

      if (pRes.success) setProductionOrders(getRows(pRes.data));
      else setProductionOrders([]);

      const list =
        aRes?.data?.alerts && Array.isArray(aRes.data.alerts)
          ? aRes.data.alerts
          : aRes?.data?.data?.alerts && Array.isArray(aRes.data.data.alerts)
            ? aRes.data.data.alerts
            : Array.isArray(aRes.data)
              ? aRes.data
              : [];
      setExpiryAlerts(list);
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

  const prodInProgressCount = useMemo(
    () => productionOrders.filter(r => String(r.status || '').toUpperCase() === 'IN_PROGRESS').length,
    [productionOrders]
  );
  const prodDoneCount = useMemo(
    () => productionOrders.filter(r => String(r.status || '').toUpperCase() === 'DONE').length,
    [productionOrders]
  );

  const prodStatusSeries = useMemo(() => {
    const counts = {};
    for (const r of productionOrders) {
      const st = String(r.status || '').toUpperCase();
      counts[st] = (counts[st] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([k, v]) => ({ label: PROD_STATUS_LABELS[k] || k || '-', count: v }))
      .filter(x => x.count > 0);
  }, [productionOrders]);

  const expirySeveritySeries = useMemo(() => {
    const counts = { EXPIRED: 0, CRITICAL: 0, HIGH: 0, MEDIUM: 0 };
    for (const a of expiryAlerts) {
      const sev = String(a.severity || '').toUpperCase();
      if (sev in counts) counts[sev] += 1;
    }
    return Object.entries(counts)
      .map(([k, v]) => ({ label: expirySeverityLabels[k] || k, count: v }))
      .filter(x => x.count > 0);
  }, [expiryAlerts]);

  const topExpiryAlerts = useMemo(() => expiryAlerts.slice(0, 6), [expiryAlerts]);
  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);
  const recentProdOrders = useMemo(() => productionOrders.slice(0, 6), [productionOrders]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Xin chào, {userName}</h1>
          <p className="text-muted-foreground mt-1">Đơn chờ xử lý, lệnh sản xuất và cảnh báo hết hạn (7 ngày).</p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="btn-outline flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCcw className="h-4 w-4" /> {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Đơn chờ xử lý (SUBMITTED)"
          value={`${orders.length}`}
          icon={ClipboardList}
          color="primary"
        />
        <StatCard title="Đang sản xuất" value={`${prodInProgressCount}`} icon={ChefHat} color="accent" />
        <StatCard title="Đã hoàn thành" value={`${prodDoneCount}`} icon={Package} color="success" />
        <StatCard title="Cảnh báo hết hạn" value={`${expiryAlerts.length}`} icon={AlertTriangle} color="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2 bg-gradient-to-br from-teal-500/10 via-transparent to-transparent ring-1 ring-teal-500/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Trạng thái lệnh sản xuất</h2>
            <span className="text-xs text-muted-foreground">{productionOrders.length} lệnh</span>
          </div>

          {!prodStatusSeries.length ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Không có dữ liệu lệnh sản xuất.</p>
          ) : (
            <ChartContainer config={{ count: { label: 'Số lượng' } }} className="h-[260px] w-full">
              <BarChart data={prodStatusSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm bg-gradient-to-br from-orange-500/10 via-transparent to-transparent ring-1 ring-orange-500/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Hết hạn theo mức độ</h2>
            <span className="text-xs text-muted-foreground">{expiryAlerts.length} cảnh báo</span>
          </div>

          {!expirySeveritySeries.length ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Không có cảnh báo.</p>
          ) : (
            <ChartContainer config={{ count: { label: 'Số lượng' } }} className="h-[260px] w-full">
              <BarChart data={expirySeveritySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold mb-3">Đơn SUBMITTED (top)</h2>
          {!recentOrders.length ? (
            <p className="text-sm text-muted-foreground py-4">Không có đơn.</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map(o => (
                <div key={o._id} className="rounded-lg bg-muted/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate text-slate-900">{o.order_no || o._id}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Cửa hàng: {o.store_org_unit_id?.name || o.store_org_unit_id?.code || '—'}
                      </div>
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

        <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h2 className="text-base font-semibold">Lệnh sản xuất & cảnh báo hết hạn</h2>
            <div className="text-xs text-muted-foreground">
              Lệnh: {recentProdOrders.length} · Cảnh báo: {topExpiryAlerts.length}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold mb-2">Lệnh sản xuất (top)</h3>
              {!recentProdOrders.length ? (
                <p className="text-sm text-muted-foreground py-4">Không có lệnh.</p>
              ) : (
                <div className="space-y-2">
                  {recentProdOrders.map(p => (
                    <div key={p._id} className="rounded-lg bg-muted/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate text-slate-900">{p.prod_order_no || p._id}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Bắt đầu: {p.planned_start ? new Date(p.planned_start).toLocaleDateString('vi-VN') : '—'}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getProductionStatusPillClass(p.status)}`}
                        >
                          {PROD_STATUS_LABELS[p.status] || p.status || '-'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Hết hạn gần đây</h3>
              {!topExpiryAlerts.length ? (
                <p className="text-sm text-muted-foreground py-4">Không có cảnh báo.</p>
              ) : (
                <div className="space-y-2">
                  {topExpiryAlerts.map(a => (
                    <div key={a.alert_id || a._id} className="rounded-lg bg-muted/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate text-slate-900">{a.item?.name || a.lot?.item_id?.name || a.item_name || '—'}</div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            Lô: {a.lot?.lot_code || a.lot_code || '—'}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getExpirySeverityPillClass(a.severity)}`}
                        >
                          {expirySeverityLabels[a.severity] || a.severity || '-'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {a.exp_date ? new Date(a.exp_date).toLocaleDateString('vi-VN') : a.expiry_date ? new Date(a.expiry_date).toLocaleDateString('vi-VN') : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

