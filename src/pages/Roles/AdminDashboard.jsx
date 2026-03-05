import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardList, Package, RefreshCcw, TruckIcon, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadges';
import { useAuth } from '../../contexts/AuthContext';
import { workflowService } from '../../services/workflowService';

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    const [overviewRes, orderRes, alertRes, orgRes] = await Promise.all([
      workflowService.getDashboardOverview({}),
      workflowService.getInternalOrders({ limit: 8 }),
      workflowService.getAlertsSummary({}),
      workflowService.getOrgUnits({ type: 'STORE', status: 'ACTIVE' }),
    ]);

    const failedSources = [];
    if (!overviewRes.success) failedSources.push('overview');
    if (!orderRes.success) failedSources.push('orders');
    if (!alertRes.success) failedSources.push('alerts');
    if (!orgRes.success) failedSources.push('stores');

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
    if (alertRes.success) {
      setAlerts(alertRes.data?.recent_alerts || []);
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

  return (
    <div className='space-y-6 animate-fade-in'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>
            {getGreeting()}, {userName}!
          </h1>
          <p className='text-muted-foreground mt-1'>Dữ liệu dashboard đang lấy trực tiếp từ DB.</p>
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

      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='rounded-xl border border-border bg-card shadow-md lg:col-span-2'>
          <div className='flex items-center justify-between border-b border-border p-4'>
            <h2 className='text-lg font-semibold'>Đơn hàng gần đây</h2>
            <Link to='/orders' className='text-sm text-secondary hover:underline'>
              Xem tất cả
            </Link>
          </div>
          <div className='divide-y divide-border'>
            {!orders.length && <p className='p-4 text-sm text-muted-foreground'>Không có dữ liệu.</p>}
            {orders.map(row => (
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
            <h3 className='mb-3 font-semibold'>Trạng thái đơn hàng</h3>
            <div className='space-y-2 text-sm'>
              {Object.keys(orderStatusCount).length === 0 && (
                <p className='text-muted-foreground'>Không có dữ liệu.</p>
              )}
              {Object.entries(orderStatusCount).map(([status, count]) => (
                <div key={status} className='flex items-center justify-between'>
                  <span>{status}</span>
                  <span className='font-semibold'>{count}</span>
                </div>
              ))}
            </div>
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
    </div>
  );
}
