import { useEffect, useState } from 'react';
import StatCard from '../../components/ui/StatCard';
import { workflowService } from '../../services/workflowService';

export default function ManagerDashboard() {
  const [overview, setOverview] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const loadData = async () => {
    const [overviewRes, alertRes] = await Promise.all([
      workflowService.getDashboardOverview({}),
      workflowService.getAlertsSummary({}),
    ]);
    if (overviewRes.success) setOverview(overviewRes.data);
    if (alertRes.success) setAlerts(alertRes.data?.recent_alerts || []);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className='space-y-4 animate-fade-in'>
      <h1 className='text-2xl font-bold mb-2'>Dashboard Manager</h1>
      <p className='text-gray-600'>Dữ liệu lấy trực tiếp từ DB.</p>

      <div className='grid gap-4 md:grid-cols-4'>
        <StatCard title='Tổng đơn' value={`${overview?.orders?.total ?? 0}`} color='primary' />
        <StatCard title='Lệnh SX' value={`${overview?.production?.total ?? 0}`} color='secondary' />
        <StatCard title='Shipment' value={`${overview?.shipments?.total ?? 0}`} color='accent' />
        <StatCard title='Giá trị tồn' value={`${overview?.inventory?.total_value ?? 0}`} color='warning' />
      </div>

      <div className='rounded-lg border bg-white p-4'>
        <h3 className='font-semibold mb-3'>Cảnh báo gần đây</h3>
        {!alerts.length && <p className='text-sm text-gray-500'>Không có cảnh báo</p>}
        <div className='space-y-2'>
          {alerts.map((a, idx) => (
            <div key={a.alert_id || idx} className='text-sm'>
              {a.severity || '-'} - {a.message || 'Cảnh báo hệ thống'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

