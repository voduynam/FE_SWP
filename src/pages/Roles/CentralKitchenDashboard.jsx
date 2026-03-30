import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '../../components/ui/chart';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../contexts/AuthContext';
import { workflowService } from '../../services/workflowService';
import { ChefHat, Clock, Package, RefreshCcw, AlertTriangle, ClipboardList, BookOpen, TrendingUp, Zap, Target, Calendar, CheckCircle2 } from 'lucide-react';

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

// Enhanced StatCard with trend support
const DashboardStatCard = ({ title, value, icon: Icon, color = 'primary', trend }) => {
  const colorClasses = {
    primary: 'from-blue-500/10 to-blue-500/5 ring-blue-500/20',
    accent: 'from-teal-500/10 to-teal-500/5 ring-teal-500/20',
    success: 'from-emerald-500/10 to-emerald-500/5 ring-emerald-500/20',
    warning: 'from-amber-500/10 to-amber-500/5 ring-amber-500/20',
    destructive: 'from-red-500/10 to-red-500/5 ring-red-500/20',
    info: 'from-indigo-500/10 to-indigo-500/5 ring-indigo-500/20',
  };

  const iconColors = {
    primary: 'text-blue-600 bg-blue-100',
    accent: 'text-teal-600 bg-teal-100',
    success: 'text-emerald-600 bg-emerald-100',
    warning: 'text-amber-600 bg-amber-100',
    destructive: 'text-red-600 bg-red-100',
    info: 'text-indigo-600 bg-indigo-100',
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${colorClasses[color]} p-4 shadow-sm ring-1 transition-all duration-300 hover:shadow-md hover:scale-[1.02]`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {trend && (
            <p className={`mt-1 text-xs ${trend.includes('Cần') || trend.includes('+') ? 'text-amber-600' : 'text-emerald-600'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className={`rounded-lg p-2 ${iconColors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
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
  const [recipes, setRecipes] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [oRes, pRes, aRes, recipesRes, inventoryRes] = await Promise.all([
        workflowService.getInternalOrders({ status: 'SUBMITTED', page: 1, limit: 20 }),
        workflowService.getProductionOrders({ page: 1, limit: 50 }),
        workflowService.getAlertsExpiry({ days_threshold: 7, limit: 50 }),
        workflowService.getRecipes?.({ page: 1, limit: 100 }).catch(() => ({ success: true, data: [] })),
        workflowService.getInventoryItems?.({ page: 1, limit: 100 }).catch(() => ({ success: true, data: [] })),
      ]);

      if (oRes.success) setOrders(getRows(oRes.data));
      else setOrders([]);

      if (pRes.success) setProductionOrders(getRows(pRes.data));
      else setProductionOrders([]);

      if (recipesRes?.success) setRecipes(getRows(recipesRes.data));
      else setRecipes([]);

      if (inventoryRes?.success) {
        const items = getRows(inventoryRes.data);
        // Filter items with low stock (qty_available < reorder_point or < 10)
        const lowStockItems = items.filter(item => {
          const qty = item.qty_available || 0;
          const reorderPoint = item.reorder_point || 10;
          return qty < reorderPoint;
        });
        setInventoryItems(lowStockItems);
      } else {
        setInventoryItems([]);
      }

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

  // Overdue production orders (past planned_end date but not DONE)
  const overdueCount = useMemo(() => {
    const today = new Date();
    return productionOrders.filter(r => {
      const status = String(r.status || '').toUpperCase();
      if (status === 'DONE' || status === 'CANCELLED') return false;
      const plannedEnd = r.planned_end ? new Date(r.planned_end) : null;
      return plannedEnd && plannedEnd < today;
    }).length;
  }, [productionOrders]);

  // On-time completion rate
  const onTimeRate = useMemo(() => {
    const completed = productionOrders.filter(r => String(r.status || '').toUpperCase() === 'DONE');
    if (!completed.length) return 0;
    const onTime = completed.filter(r => {
      const actualEnd = r.actual_end ? new Date(r.actual_end) : null;
      const plannedEnd = r.planned_end ? new Date(r.planned_end) : null;
      if (!actualEnd || !plannedEnd) return true; // Count as on-time if no dates
      return actualEnd <= plannedEnd;
    }).length;
    return Math.round((onTime / completed.length) * 100);
  }, [productionOrders]);

  // Daily production performance (last 7 days)
  const dailyPerformance = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOrders = productionOrders.filter(r => {
        const startDate = r.planned_start ? r.planned_start.split('T')[0] : null;
        return startDate === dateStr;
      });
      const completed = dayOrders.filter(r => String(r.status || '').toUpperCase() === 'DONE').length;
      const total = dayOrders.length;
      days.push({
        date: date.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' }),
        completed,
        total,
        rate: total ? Math.round((completed / total) * 100) : 0
      });
    }
    return days;
  }, [productionOrders]);

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

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <DashboardStatCard
          title="Đơn chờ xử lý"
          value={`${orders.length}`}
          icon={ClipboardList}
          color="primary"
          trend="+12%"
        />
        <DashboardStatCard 
          title="Đang sản xuất" 
          value={`${prodInProgressCount}`} 
          icon={ChefHat} 
          color="accent"
          trend={prodInProgressCount > 0 ? 'Đang hoạt động' : ''}
        />
        <DashboardStatCard 
          title="Đã hoàn thành" 
          value={`${prodDoneCount}`} 
          icon={Package} 
          color="success"
          trend={`${onTimeRate}% đúng hạn`}
        />
        <DashboardStatCard 
          title="Quá hạn" 
          value={`${overdueCount}`} 
          icon={AlertTriangle} 
          color="destructive"
          trend={overdueCount > 0 ? 'Cần xử lý' : 'OK'}
        />
        <DashboardStatCard 
          title="Công thức" 
          value={`${recipes.length}`} 
          icon={BookOpen} 
          color="info"
        />
        <DashboardStatCard 
          title="Nguyên liệu thấp" 
          value={`${inventoryItems.length}`} 
          icon={Zap} 
          color="warning"
          trend={inventoryItems.length > 0 ? 'Cần nhập' : 'Đủ'}
        />
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

      {/* Daily Performance Chart */}
      <div className="rounded-xl border bg-card p-4 shadow-sm bg-gradient-to-br from-blue-500/10 via-transparent to-transparent ring-1 ring-blue-500/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Hiệu suất sản xuất 7 ngày</h2>
          <span className="text-xs text-muted-foreground">Tỷ lệ hoàn thành đúng hạn: {onTimeRate}%</span>
        </div>

        {!dailyPerformance.some(d => d.total > 0) ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Không có dữ liệu sản xuất trong 7 ngày qua.</p>
        ) : (
          <ChartContainer 
            config={{ 
              completed: { label: 'Hoàn thành', color: '#10b981' },
              total: { label: 'Tổng', color: '#3b82f6' }
            }} 
            className="h-[260px] w-full"
          >
            <BarChart data={dailyPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [Number(value ?? 0).toLocaleString('vi-VN'), name]}
                  />
                }
              />
              <Bar dataKey="completed" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold mb-3">Đơn sản xuất chờ xử lý (top)</h2>
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

