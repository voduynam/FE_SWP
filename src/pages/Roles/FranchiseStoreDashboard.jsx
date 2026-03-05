import { useEffect, useState } from 'react';
import StatCard from '../../components/ui/StatCard';
import { workflowService } from '../../services/workflowService';

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function FranchiseStoreDashboard() {
  const [orders, setOrders] = useState([]);
  const [balances, setBalances] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const loadData = async () => {
    const [oRes, bRes, aRes] = await Promise.all([
      workflowService.getInternalOrders({ limit: 20 }),
      workflowService.getInventoryBalances({ limit: 20 }),
      workflowService.getAlertsLowStock({}),
    ]);
    if (oRes.success) setOrders(getRows(oRes.data));
    if (bRes.success) setBalances(getRows(bRes.data));
    if (aRes.success) setAlerts(aRes.data?.alerts || aRes.data?.data?.alerts || []);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className='space-y-4 animate-fade-in'>
      <h1 className='text-2xl font-bold mb-2'>Dashboard Cửa hàng</h1>
      <p className='text-gray-600'>Theo dõi đơn hàng, tồn kho và cảnh báo low-stock từ DB.</p>

      <div className='grid gap-4 md:grid-cols-3'>
        <StatCard title='Đơn hàng' value={`${orders.length}`} color='primary' />
        <StatCard title='Bản ghi tồn kho' value={`${balances.length}`} color='secondary' />
        <StatCard title='Cảnh báo low-stock' value={`${alerts.length}`} color='warning' />
      </div>

      <div className='rounded-lg border bg-white p-4'>
        <h3 className='font-semibold mb-2'>Đơn gần đây</h3>
        {!orders.length && <p className='text-sm text-gray-500'>Không có đơn hàng</p>}
        {orders.slice(0, 5).map(row => (
          <div key={row._id} className='text-sm'>
            {row.order_no || row._id} - {row.status || '-'}
          </div>
        ))}
      </div>
    </div>
  );
}

