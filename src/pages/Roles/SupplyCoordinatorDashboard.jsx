import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '../../components/ui/chart';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../contexts/AuthContext';
import { useDelivery } from '../../contexts/DeliveryContext';
import { workflowService } from '../../services/workflowService';
import { AlertCircle, AlertTriangle, ClipboardList, Clock, Package, RefreshCcw, Truck } from 'lucide-react';

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const deliveryDateISO = () => new Date().toISOString().slice(0, 10);

const getItemName = (v) => {
  if (v == null || v === '') return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v.name || v.sku || v.code || v._id || '—';
  return String(v);
};

const getExceptionSeverityPillClass = (severity) => {
  const s = String(severity || '').toUpperCase();
  switch (s) {
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

const getRouteStatusPillClass = (status) => {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-700';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-700';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600';
    case 'PLANNED':
    default:
      return 'bg-amber-100 text-amber-700';
  }
};

const getProductionStatusPillClass = (status) => {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'NEED_PRODUCTION':
      return 'bg-red-100 text-red-700';
    case 'PARTIAL':
      return 'bg-amber-100 text-amber-700';
    case 'SUFFICIENT':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const PROD_STATUS_LABELS = {
  SUFFICIENT: 'Đủ tồn kho',
  PARTIAL: 'Thiếu một phần',
  NEED_PRODUCTION: 'Cần sản xuất',
};

const EXCEPTION_SEVERITY_LABELS = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  CRITICAL: 'Nghiêm trọng',
};

const ROUTE_STATUS_LABELS = {
  PLANNED: 'Đã lên kế hoạch',
  IN_PROGRESS: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const shipmentStatusInFlight = new Set(['PICKED', 'SHIPPED', 'IN_TRANSIT']);

export default function SupplyCoordinatorDashboard() {
  const { user } = useAuth();
  const userName = user?.name || user?.full_name || 'Điều phối viên';
  const { deliveries } = useDelivery(); // chỉ để hiển thị ngắn gọn "tổng quan giao hàng" (không phụ thuộc API chart)

  const [deliveryDate, setDeliveryDate] = useState(deliveryDateISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [consolidated, setConsolidated] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [shipments, setShipments] = useState([]);

  const loadData = async (date = deliveryDate) => {
    setLoading(true);
    setError('');

    try {
      const [eRes, rRes, sRes] = await Promise.all([
        // workflowService.getConsolidatedOrders({ delivery_date: date, page: 1, limit: 20 }), // DISABLED
        workflowService.getExceptions({ page: 1, limit: 50 }),
        workflowService.getDeliveryRoutes({ page: 1, limit: 20 }),
        workflowService.getShipments({ page: 1, limit: 20 }),
      ]);

      // Tắt tính năng tổng hợp đơn
      setConsolidated([]);

      if (!eRes.success) setExceptions([]);
      else setExceptions(getRows(eRes.data));

      if (!rRes.success) setRoutes([]);
      else setRoutes(getRows(rRes.data));

      if (!sRes.success) setShipments([]);
      else setShipments(getRows(sRes.data));
    } catch (e) {
      setError(e?.message || 'Không thể tải dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryDate]);

  const openExceptions = useMemo(
    () =>
      exceptions.filter(e =>
        ['OPEN', 'IN_PROGRESS', 'INVESTIGATING'].includes(
          String(e.status || '').toUpperCase(),
        ),
      ),
    [exceptions]
  );

  const consolidatedNeedProductionCount = useMemo(
    () => consolidated.filter(r => String(r.production_status || '').toUpperCase() !== 'SUFFICIENT').length,
    [consolidated]
  );

  const exceptionSeveritySeries = useMemo(() => {
    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const e of openExceptions) {
      const sev = String(e.severity || '').toUpperCase();
      if (sev in counts) counts[sev] += 1;
    }
    return Object.entries(counts)
      .map(([k, v]) => ({ label: EXCEPTION_SEVERITY_LABELS[k] || k, count: v }))
      .filter(x => x.count > 0);
  }, [openExceptions]);

  const routeStatusSeries = useMemo(() => {
    const counts = { PLANNED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const r of routes) {
      const st = String(r.status || '').toUpperCase();
      if (st in counts) counts[st] += 1;
    }
    return Object.entries(counts)
      .map(([k, v]) => ({ label: ROUTE_STATUS_LABELS[k] || k, count: v }))
      .filter(x => x.count > 0);
  }, [routes]);

  const shipmentsInFlightCount = useMemo(
    () => shipments.filter(s => shipmentStatusInFlight.has(String(s.status || '').toUpperCase())).length,
    [shipments]
  );

  const inProgressRoutesCount = useMemo(
    () => routes.filter(r => String(r.status || '').toUpperCase() === 'IN_PROGRESS').length,
    [routes]
  );

  const needProductionRows = useMemo(
    () =>
      consolidated
        .filter(r => String(r.production_status || '').toUpperCase() === 'NEED_PRODUCTION' || String(r.production_status || '').toUpperCase() === 'PARTIAL')
        .slice(0, 6),
    [consolidated]
  );

  const recentExceptions = useMemo(() => openExceptions.slice(0, 6), [openExceptions]);

  const recentRoutes = useMemo(() => routes.slice(0, 6), [routes]);

  const deliveriesSummary = useMemo(() => {
    const shipping = deliveries.filter(d => d.status === 'shipping').length;
    const pending = deliveries.filter(d => d.status === 'pending').length;
    const delivered = deliveries.filter(d => d.status === 'delivered').length;
    return { shipping, pending, delivered };
  }, [deliveries]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Xin chào, {userName}</h1>
          <p className="text-muted-foreground mt-1">Điều phối cung ứng theo ngày giao: {deliveryDate}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={deliveryDate}
            onChange={e => setDeliveryDate(e.target.value)}
            className="input-field"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => loadData(deliveryDate)}
            className="btn-outline flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" /> Làm mới
          </button>
          <div className="text-xs text-muted-foreground">
            Giao hàng: đang giao {deliveriesSummary.shipping} · chờ giao {deliveriesSummary.pending}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Tổng hợp đơn (tắt)" value="0" icon={ClipboardList} color="muted" />
        <StatCard title="Cần sản xuất (tắt)" value="0" icon={AlertCircle} color="muted" />
        <StatCard title="Sự cố mở" value={`${openExceptions.length}`} icon={AlertTriangle} color="destructive" />
        <StatCard title="Đang vận hành" value={`${inProgressRoutesCount}`} icon={Truck} color="accent" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent ring-1 ring-orange-500/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Sự cố theo mức độ</h2>
            <span className="text-xs text-muted-foreground">{openExceptions.length} sự cố</span>
          </div>

          {!exceptionSeveritySeries.length ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Không có sự cố mở.</p>
          ) : (
            <ChartContainer config={{ count: { label: 'Số lượng' } }} className="h-[260px] w-full">
              <BarChart data={exceptionSeveritySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

        <div className="rounded-xl border bg-card p-4 shadow-sm bg-gradient-to-br from-sky-500/10 via-transparent to-transparent ring-1 ring-sky-500/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Trạng thái tuyến</h2>
            <span className="text-xs text-muted-foreground">{routes.length} tuyến</span>
          </div>

          {!routeStatusSeries.length ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Không có dữ liệu tuyến.</p>
          ) : (
            <ChartContainer config={{ count: { label: 'Số lượng' } }} className="h-[260px] w-full">
              <BarChart data={routeStatusSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}

          <div className="mt-4 text-xs text-muted-foreground">
            Shipment cần xử lý: {shipmentsInFlightCount}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-1 bg-gradient-to-br from-slate-500/10 via-transparent to-transparent ring-1 ring-slate-500/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Tổng hợp đơn (đã tắt)</h2>
            <span className="text-xs text-muted-foreground">0</span>
          </div>

          <p className="text-sm text-muted-foreground py-5">Tính năng tổng hợp đơn đã được tắt.</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h2 className="text-base font-semibold">Sự cố mở & tuyến gần đây</h2>
            <div className="text-xs text-muted-foreground">
              Sự cố: {recentExceptions.length} · Tuyến: {recentRoutes.length}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold mb-2">Sự cố mở</h3>
              {!recentExceptions.length ? (
                <p className="text-sm text-muted-foreground py-4">Không có.</p>
              ) : (
                <div className="space-y-2">
                  {recentExceptions.map((exc) => (
                    <div key={exc._id} className="rounded-lg bg-muted/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate text-slate-900">{exc.store_org_unit_id?.name || exc.store_org_unit_id?.code || '—'}</div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{exc.description || exc.exception_type || '-'}</div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getExceptionSeverityPillClass(exc.severity)}`}
                        >
                          {EXCEPTION_SEVERITY_LABELS[exc.severity] || exc.severity || '-'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Trạng thái: {exc.status || '-'} · Loại: {exc.exception_type || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Tuyến gần đây</h3>
              {!recentRoutes.length ? (
                <p className="text-sm text-muted-foreground py-4">Không có tuyến.</p>
              ) : (
                <div className="space-y-2">
                  {recentRoutes.map((r) => (
                    <div key={r._id} className="rounded-lg bg-muted/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate text-slate-900">{r.route_no || r.route_name || r._id}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Tài xế: {r.driver_name || r.driver || '-'}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRouteStatusPillClass(r.status)}`}
                        >
                          {ROUTE_STATUS_LABELS[r.status] || r.status || '-'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />{' '}
                        {r.planned_date ? new Date(r.planned_date).toLocaleDateString('vi-VN') : '—'}
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

