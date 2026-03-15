import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardList, Package, RefreshCcw, TruckIcon, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '../../components/ui/chart';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadges';
import { useAuth } from '../../contexts/AuthContext';
import { workflowService } from '../../services/workflowService';
import { paymentService } from '../../services/paymentService';

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
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

/** Format "YYYY-MM-DD" -> "dd/mm" for chart labels */
const formatTrendDate = dateStr => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  const [, mm, dd] = parts;
  return `${dd}/${mm}`;
};

/** Format "YYYY-MM-DD" -> "dd/mm/yyyy" */
const formatTrendDateFull = dateStr => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const userName = user?.name || user?.full_name || 'Admin';
  const [overview, setOverview] = useState(null);
  const [orders, setOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [ordersStats, setOrdersStats] = useState(null);
  const [, setProductionStats] = useState(null);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [shipmentStats, setShipmentStats] = useState(null);
  const [, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentView, setPaymentView] = useState('day'); // day | month | year

  const loadData = async () => {
    setLoading(true);
    setError('');
    const [
      overviewRes,
      orderRes,
      orgRes,
      ordersDashRes,
      prodDashRes,
      invDashRes,
      shipDashRes,
      paymentsRes,
    ] = await Promise.all([
      workflowService.getDashboardOverview({}),
      workflowService.getInternalOrders({ limit: 8 }),
      workflowService.getOrgUnits({ type: 'STORE', status: 'ACTIVE' }),
      workflowService.getDashboardOrders({}),
      workflowService.getDashboardProduction({}),
      workflowService.getDashboardInventory({}),
      workflowService.getDashboardShipments({}),
      paymentService.getAllPayments({ limit: 10 }),
    ]);

    const failedSources = [];
    if (!overviewRes.success) failedSources.push('overview');
    if (!orderRes.success) failedSources.push('orders');
    // alerts là dữ liệu phụ, không block toàn bộ dashboard nếu lỗi
    if (!orgRes.success) failedSources.push('stores');
    if (!ordersDashRes.success) failedSources.push('dashboard.orders');
    if (!prodDashRes.success) failedSources.push('dashboard.production');
    if (!invDashRes.success) failedSources.push('dashboard.inventory');
    if (!shipDashRes.success) failedSources.push('dashboard.shipments');
    if (!paymentsRes.success) failedSources.push('payments');

    if (failedSources.length) {
      setError(`Một phần dữ liệu chưa tải được (${failedSources.join(', ')}).`);
    }

    setOverview(prev => ({
      ...(overviewRes.success ? overviewRes.data : (prev || {})),
      activeStores: orgRes.success ? getRows(orgRes.data).length : (prev?.activeStores ?? 0),
    }));
    if (orderRes.success) {
      setOrders(getRows(orderRes.data));
    }
    if (ordersDashRes.success) setOrdersStats(ordersDashRes.data);
    if (prodDashRes.success) setProductionStats(prodDashRes.data);
    if (invDashRes.success) setInventoryStats(invDashRes.data);
    if (shipDashRes.success) setShipmentStats(shipDashRes.data);
    if (paymentsRes.success) {
      const p = paymentsRes.data;
      const rows = Array.isArray(p?.payments) ? p.payments : [];
      setPayments(rows.slice(0, 8));
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const orderStatusCount = useMemo(() => {
    return orders.reduce((acc, row) => {
      const key = row.status || 'UNKNOWN';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [orders]);

  const orderStatusSeries = useMemo(() => {
    const rawList = Array.isArray(ordersStats?.by_status)
      ? ordersStats.by_status
      : [];
    if (rawList.length) {
      return rawList.map(r => ({
        label: ORDER_STATUS_LABELS[String(r._id || r.status || '').toUpperCase()] || (r._id || r.status || 'Khác'),
        value: Number(r.count ?? 0) || 0,
      }));
    }
    const entries = Object.entries(orderStatusCount || {});
    return entries.map(([label, value]) => ({ label, value }));
  }, [ordersStats, orderStatusCount]);

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

  const inventoryCategorySeries = useMemo(() => {
    const rawList = Array.isArray(inventoryStats?.by_type)
      ? inventoryStats.by_type
      : [];
    const typeLabel = code => {
      const v = String(code || '').toUpperCase();
      if (v === 'RAW') return 'Nguyên liệu';
      if (v === 'FINISHED') return 'Thành phẩm';
      return v || 'Khác';
    };
    return rawList.map(r => ({
      label: typeLabel(r._id),
      value: Number(r.total_qty ?? 0) || 0,
    }));
  }, [inventoryStats]);

  /** Dữ liệu cho biểu đồ cột: Xu hướng đơn hàng 14 ngày (số đơn theo ngày) - từ API dashboard/orders trend */
  const orderTrendChartData = useMemo(() => {
    const rawList = Array.isArray(ordersStats?.trend) ? ordersStats.trend : [];
    return rawList
      .slice(-14)
      .map(r => ({
        date: formatTrendDate(r._id) || r._id,
        dateRaw: (r._id || '').split('T')[0],
        count: Number(r.count ?? 0) || 0,
      }))
      .sort((a, b) => (a.dateRaw || '').localeCompare(b.dateRaw || ''));
  }, [ordersStats]);

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
          <p className='text-muted-foreground mt-1'>Hiển thị các thông số thống kê của hệ thống.</p>
        </div>
        <button onClick={loadData} className='btn-outline flex items-center gap-2' disabled={loading}>
          <RefreshCcw className='h-4 w-4' /> Làm mới
        </button>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
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
          title='Shipment'
          value={`${overview?.shipments?.total ?? 0}`}
          icon={TruckIcon}
          color='accent'
        />
        <StatCard
          title='Cửa hàng hoạt động'
          value={`${overview?.activeStores ?? 0}`}
          icon={Users}
          color='success'
        />
      </div>

      <div className='grid gap-6 xl:grid-cols-3'>
        <div className='rounded-xl border border-border bg-card shadow-md xl:col-span-2'>
          <div className='flex items-center justify-between border-b border-border p-4'>
            <h2 className='text-lg font-semibold'>Đơn hàng gần đây</h2>
            <Link to='/app/central/orders' className='text-sm text-secondary hover:underline'>
              Xem tất cả
            </Link>
          </div>
          <div className='divide-y divide-border'>
            {!orders.length && <p className='p-4 text-sm text-muted-foreground'>Không có dữ liệu.</p>}
            {orders
              .filter(row => (row.status || '').toUpperCase() !== 'APPROVED')
              .map(row => (
              <div key={row._id || row.id} className='p-4'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <p className='font-medium'>{row.order_no || row.code || row._id}</p>
                    <p className='text-sm text-muted-foreground'>
                      {row.store_org_unit_id?.name || row.store_org_unit_id || 'N/A'}
                    </p>
                  </div>
                  <StatusBadge status={(row.status || '').toLowerCase()} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='space-y-6'>
          <div className='rounded-xl border border-border bg-card p-4 shadow-md'>
            <h3 className='mb-3 font-semibold'>Trạng thái đơn hàng (tổng quan)</h3>
            {renderBarSeries(orderStatusSeries, 'bg-orange-500')}
          </div>

          <div className='rounded-xl border border-border bg-card p-4 shadow-md'>
            <h3 className='mb-3 font-semibold'>Trạng thái shipment</h3>
            {renderBarSeries(shipmentStatusSeries, 'bg-sky-500')}
          </div>

          <div className='rounded-xl border border-border bg-card p-4 shadow-md'>
            <h3 className='mb-4 font-semibold'>Cảnh báo gần đây</h3>
            <div className='space-y-3'>
              {!alerts.length && <p className='text-sm text-muted-foreground'>Không có cảnh báo.</p>}
              {alerts.map((alert, idx) => (
                <div key={alert.alert_id || idx} className='rounded-lg bg-muted/50 p-3'>
                  <div className='flex items-start gap-2'>
                    <AlertTriangle className='mt-0.5 h-4 w-4 text-warning' />
                    <div>
                      <p className='text-sm'>{alert.message || 'Cảnh báo hệ thống'}</p>
                      <p className='text-xs text-muted-foreground'>
                        {alert.severity || '-'} | {alert.type || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='rounded-xl border border-border bg-card p-4 shadow-md lg:col-span-2'>
          <div className='mb-3 flex items-center justify-between'>
            <h3 className='font-semibold'>Xu hướng đơn hàng 14 ngày gần nhất</h3>
          </div>
          {!orderTrendChartData.length ? (
            <p className='text-sm text-muted-foreground py-8'>Không có dữ liệu.</p>
          ) : (
            <ChartContainer config={{ count: { label: 'Số đơn' } }} className='h-[280px] w-full'>
              <BarChart data={orderTrendChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                <XAxis dataKey='date' tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={value => [value, 'Số đơn']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.dateRaw ? formatTrendDateFull(payload[0].payload.dateRaw) : ''}
                    />
                  }
                />
                <Bar dataKey='count' fill='#0d9488' radius={[4, 4, 0, 0]} name='Số đơn' />
              </BarChart>
            </ChartContainer>
          )}
          {orderTrendChartData.length > 0 && (
            <div className='mt-2 flex justify-between text-[11px] text-slate-400'>
              <span>{orderTrendChartData[0]?.date}</span>
              <span>{orderTrendChartData[orderTrendChartData.length - 1]?.date}</span>
            </div>
          )}
        </div>

        <div className='rounded-xl border border-border bg-card p-4 shadow-md'>
          <h3 className='mb-3 font-semibold'>Giá trị tồn kho theo loại sản phẩm</h3>
          {renderBarSeries(inventoryCategorySeries, 'bg-emerald-500')}
        </div>
      </div>

      <div className='rounded-xl border border-border bg-card p-4 shadow-md'>
        <div className='mb-3 flex items-center justify-between'>
          <div>
            <h3 className='font-semibold'>Thanh toán gần đây</h3>
            <p className='text-[11px] text-muted-foreground'>Doanh thu theo ngày / tháng / năm (từ đơn hàng)</p>
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
        {!revenueChartData.length && <p className='text-sm text-muted-foreground py-8'>Không có dữ liệu.</p>}
        {revenueChartData.length > 0 && (
          <>
            <ChartContainer config={{ amount: { label: 'Doanh thu (đ)' } }} className='h-[280px] w-full'>
              <BarChart data={revenueChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                <XAxis dataKey='period' tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={value => [typeof value === 'number' ? value.toLocaleString('vi-VN') + ' đ' : value, 'Doanh thu']}
                    />
                  }
                />
                <Bar dataKey='amount' fill='#ea580c' radius={[4, 4, 0, 0]} name='Doanh thu' />
              </BarChart>
            </ChartContainer>
            <div className='mt-3 text-[11px] text-slate-500'>
              Tổng doanh thu: {revenueChartData.reduce((sum, s) => sum + (s.amount || 0), 0).toLocaleString('vi-VN')} đ
            </div>
          </>
        )}
      </div>
    </div>
  );
}
