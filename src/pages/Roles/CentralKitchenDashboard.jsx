import { useEffect, useState } from 'react';
import StatCard from '../../components/ui/StatCard';
import { workflowService } from '../../services/workflowService';

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function CentralKitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);

  const loadData = async () => {
    const [oRes, pRes, aRes] = await Promise.all([
      workflowService.getInternalOrders({ status: 'SUBMITTED', limit: 20 }),
      workflowService.getProductionOrders({ limit: 20 }),
      workflowService.getAlertsExpiry({ days_threshold: 7 }),
    ]);
    if (oRes.success) setOrders(getRows(oRes.data));
    if (pRes.success) setProductionOrders(getRows(pRes.data));
    if (aRes.success) setExpiryAlerts(aRes.data?.alerts || aRes.data?.data?.alerts || []);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className='space-y-4 animate-fade-in'>
      <h1 className='text-2xl font-bold mb-2'>Dashboard Bếp Trung Tâm</h1>
      <p className='text-gray-600'>Dữ liệu đơn chờ xử lý, lệnh sản xuất và cảnh báo hết hạn từ DB.</p>

      <div className='grid gap-4 md:grid-cols-3'>
        <StatCard title='Đơn SUBMITTED' value={`${orders.length}`} color='primary' />
        <StatCard title='Lệnh sản xuất' value={`${productionOrders.length}`} color='secondary' />
        <StatCard title='Cảnh báo hết hạn' value={`${expiryAlerts.length}`} color='warning' />
      </div>

      <div className='rounded-lg border bg-white p-4'>
        <h3 className='font-semibold mb-2'>Lệnh sản xuất gần đây</h3>
        {!productionOrders.length && <p className='text-sm text-gray-500'>Không có dữ liệu</p>}
        {productionOrders.slice(0, 5).map(row => (
          <div key={row._id} className='text-sm'>
            {row.prod_order_no || row._id} - {row.status || '-'}
          </div>
        ))}
      </div>
    </div>
  );
}

