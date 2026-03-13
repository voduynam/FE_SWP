import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardList, Package, RefreshCcw, TruckIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '../../components/ui/chart';
import StatCard from '../../components/ui/StatCard';
import { workflowService } from '../../services/workflowService';
import { useAuth } from '../../contexts/AuthContext';

/** Format "YYYY-MM-DD" -> "dd/mm" for chart labels */
const formatTrendDate = dateStr => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  const [, mm, dd] = parts;
  return `${dd}/${mm}`;
};

const ORDER_STATUS_LABELS = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã gửi',
  APPROVED: 'Đã phê duyệt',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đã giao',
  RECEIVED: 'Đã nhận',
  CANCELLED: 'Đã hủy',
};

const SHIPMENT_STATUS_LABELS = {
  DRAFT: 'Nháp',
  PICKED: 'Đã lấy hàng',
  SHIPPED: 'Đã xuất kho',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao đến',
  CANCELLED: 'Đã hủy',
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

export default function ManagerDashboard() {
  const { user } = useAuth();
  const userName = user?.name || user?.full_name || 'Quản lý';

  const [overview, setOverview] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [ordersStats, setOrdersStats] = useState(null);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [shipmentStats, setShipmentStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentView, setPaymentView] = useState('day'); // day | month | year

  const loadData = async () => {
    setLoading(true);
    setError('');

    const [overviewRes, alertRes, ordersDashRes, invDashRes, shipDashRes] = await Promise.all([
      workflowService.getDashboardOverview({}),
      workflowService.getAlertsSummary({}),
      workflowService.getDashboardOrders({}),
      workflowService.getDashboardInventory({}),
      workflowService.getDashboardShipments({}),
    ]);

    const failedSources = [];
    if (!overviewRes.success) failedSources.push('overview');
    // alerts là dữ liệu phụ, không block toàn bộ dashboard nếu lỗi
    if (!ordersDashRes.success) failedSources.push('dashboard.orders');
    if (!invDashRes.success) failedSources.push('dashboard.inventory');
    if (!shipDashRes.success) failedSources.push('dashboard.shipments');

    if (failedSources.length) {
      setError(`Một phần dữ liệu chưa tải được (${failedSources.join(', ')}).`);
    }

    if (overviewRes.success) setOverview(overviewRes.data);
    if (alertRes.success) setAlerts(alertRes.data?.recent_alerts || []);
    if (ordersDashRes.success) setOrdersStats(ordersDashRes.data);
    if (invDashRes.success) setInventoryStats(invDashRes.data);
    if (shipDashRes.success) setShipmentStats(shipDashRes.data);

    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const orderStatusSeries = useMemo(() => {
    const rawList = Array.isArray(ordersStats?.by_status) ? ordersStats.by_status : [];
    return rawList.map(r => {
      const code = String(r._id || r.status || '').toUpperCase();
      return {
        label: ORDER_STATUS_LABELS[code] || (r._id || r.status || 'Khác'),
        value: Number(r.count ?? 0) || 0,
      };
    });
  }, [ordersStats]);

  const topInventorySeries = useMemo(() => {
    const rawList = Array.isArray(inventoryStats?.by_location) ? inventoryStats.by_location : [];
    return rawList.slice(0, 5).map(r => ({
      label: r.location?.name || r._id || 'Kho',
      value: Number(r.total_qty ?? 0) || 0,
    }));
  }, [inventoryStats]);

  const shipmentStatusSeries = useMemo(() => {
    const rawList = Array.isArray(shipmentStats?.by_status)
      ? shipmentStats.by_status
      : Array.isArray(shipmentStats?.status_breakdown)
        ? shipmentStats.status_breakdown
        : [];
    return rawList.map(r => {
      const code = String(r._id || r.status || '').toUpperCase();
      return {
        label: SHIPMENT_STATUS_LABELS[code] || (r.status || r._id || 'Khác'),
        value: Number(r.count ?? r.total ?? 0) || 0,
      };
    });
  }, [shipmentStats]);

  /** Dữ liệu doanh thu theo ngày/tháng/năm từ API dashboard/orders trend (total_amount) */
  const revenueChartData = useMemo(() => {
    const rawList = Array.isArray(ordersStats?.trend) ? ordersStats.trend : [];
    if (!rawList.length) return [];

    if (paymentView === 'day') {
      return rawList
        .map(r => {
          const dateStr = (r._id || '').split('T')[0];
          return {
            period: formatTrendDate(r._id) || dateStr,
            periodRaw: dateStr,
            amount: Number(r.total_amount ?? 0) || 0,
          };
        })
        .sort((a, b) => (a.periodRaw || '').localeCompare(b.periodRaw || ''));
    }

    if (paymentView === 'month') {
      const byMonth = new Map();
      rawList.forEach(r => {
        const dateStr = (r._id || '').split('T')[0];
        if (!dateStr || dateStr.length < 7) return;
        const key = dateStr.slice(0, 7);
        const [y, m] = key.split('-');
        const label = `${m}/${y}`;
        const prev = byMonth.get(key) || { period: label, amount: 0 };
        prev.amount += Number(r.total_amount ?? 0) || 0;
        byMonth.set(key, prev);
      });
      return Array.from(byMonth.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, v]) => v);
    }

    const byYear = new Map();
    rawList.forEach(r => {
      const dateStr = (r._id || '').split('T')[0];
      if (!dateStr || dateStr.length < 4) return;
      const key = dateStr.slice(0, 4);
      const prev = byYear.get(key) || { period: key, amount: 0 };
      prev.amount += Number(r.total_amount ?? 0) || 0;
      byYear.set(key, prev);
    });
    return Array.from(byYear.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => v);
  }, [ordersStats, paymentView]);

  const renderBarSeries = (series, colorClass = 'bg-orange-500') => {
    if (!series.length) {
      return <p className='text-sm text-muted-foreground'>Không có dữ liệu.</p>;
    }
    const max = Math.max(...series.map(s => s.value)) || 1;
    return (
      <div className='space-y-2'>
        {series.map(s => (
          <div key={s.label} className='space-y-1'>
            <div className='flex items-center justify-between text-xs'>
              <span className='truncate'>{s.label}</span>
              <span className='font-semibold'>{s.value}</span>
            </div>
            <div className='h-2 w-full rounded-full bg-slate-100'>
              <div
                className={`h-2 rounded-full ${colorClass}`}
                style={{ width: `${(s.value / max) * 100 || 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className='space-y-6 animate-fade-in'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>
            {getGreeting()}, {userName}!
          </h1>
          <p className='text-muted-foreground mt-1'>
            Tổng quan vận hành: đơn hàng, sản xuất, giao hàng và tồn kho.
          </p>
        </div>
        <button onClick={loadData} className='btn-outline flex items-center gap-2' disabled={loading}>
          <RefreshCcw className='h-4 w-4' /> Làm mới
        </button>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}

      <div className='grid gap-4 md:grid-cols-4'>
        <StatCard
          title='Tổng đơn hàng'
          value={`${overview?.orders?.total ?? 0}`}
          icon={ClipboardList}
          color='primary'
        />
        <StatCard
          title='Lệnh sản xuất'
          value={`${overview?.production?.total ?? 0}`}
          icon={Package}
          color='secondary'
        />
        <StatCard
          title='Lô giao hàng'
          value={`${overview?.shipments?.total ?? 0}`}
          icon={TruckIcon}
          color='accent'
        />
        <StatCard
          title='Giá trị tồn kho'
          value={`${overview?.inventory?.total_value ?? 0}`}
          color='warning'
        />
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='rounded-xl border border-border bg-card p-4 shadow-md lg:col-span-2'>
          <h3 className='font-semibold mb-3'>Trạng thái đơn hàng</h3>
          {renderBarSeries(orderStatusSeries, 'bg-orange-500')}
        </div>
        <div className='rounded-xl border border-border bg-card p-4 shadow-md'>
          <h3 className='font-semibold mb-3'>Trạng thái lô giao hàng</h3>
          {renderBarSeries(shipmentStatusSeries, 'bg-sky-500')}
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='rounded-xl border border-border bg-card p-4 shadow-md'>
          <h3 className='font-semibold mb-3'>Tồn kho theo kho</h3>
          {renderBarSeries(topInventorySeries, 'bg-emerald-500')}
        </div>

        <div className='rounded-xl border border-border bg-card p-4 shadow-md'>
          <h3 className='font-semibold mb-3'>Cảnh báo gần đây</h3>
          {!alerts.length && <p className='text-sm text-muted-foreground'>Không có cảnh báo.</p>}
          <div className='space-y-3'>
            {alerts.map((a, idx) => (
              <div key={a.alert_id || idx} className='rounded-lg bg-muted/50 p-3'>
                <div className='flex items-start gap-2'>
                  <AlertTriangle className='mt-0.5 h-4 w-4 text-warning' />
                  <div>
                    <p className='text-sm'>{a.message || 'Cảnh báo hệ thống'}</p>
                    <p className='text-xs text-muted-foreground'>
                      {a.severity || '-'} | {a.type || '-'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Doanh thu theo ngày / tháng / năm */}
        <div className='rounded-xl border border-border bg-card p-4 shadow-md'>
        <div className='mb-3 flex items-center justify-between'>
          <div>
            <h3 className='font-semibold'>Doanh thu (từ đơn hàng)</h3>
            <p className='text-[11px] text-muted-foreground'>Thanh toán gần đây — biểu diễn theo ngày / tháng / năm</p>
          </div>
          <div className='inline-flex rounded-full bg-slate-100 p-0.5 text-[11px] font-medium text-slate-600'>
            <button
              type='button'
              onClick={() => setPaymentView('day')}
              className={`px-2 py-0.5 rounded-full ${paymentView === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              Ngày
            </button>
            <button
              type='button'
              onClick={() => setPaymentView('month')}
              className={`px-2 py-0.5 rounded-full ${paymentView === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              Tháng
            </button>
            <button
              type='button'
              onClick={() => setPaymentView('year')}
              className={`px-2 py-0.5 rounded-full ${paymentView === 'year' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              Năm
            </button>
          </div>
        </div>
        {!revenueChartData.length && (
          <p className='text-sm text-muted-foreground py-8'>Không có dữ liệu doanh thu.</p>
        )}
        {revenueChartData.length > 0 && (
          <>
            <ChartContainer config={{ amount: { label: 'Doanh thu (đ)' } }} className='h-[280px] w-full'>
              <BarChart data={revenueChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                <XAxis dataKey='period' tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${(v / 1e6).toFixed(0)}M`}
                />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={value =>
                        [typeof value === 'number' ? value.toLocaleString('vi-VN') + ' đ' : value, 'Doanh thu']}
                    />
                  }
                />
                <Bar dataKey='amount' fill='#0d9488' radius={[4, 4, 0, 0]} name='Doanh thu' />
              </BarChart>
            </ChartContainer>
            <div className='mt-3 text-[11px] text-slate-500'>
              Tổng doanh thu:{' '}
              {revenueChartData.reduce((sum, s) => sum + (s.amount || 0), 0).toLocaleString('vi-VN')} đ
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

