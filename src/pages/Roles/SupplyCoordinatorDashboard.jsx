import { useEffect, useState } from 'react';
import StatCard from '../../components/ui/StatCard';
import { workflowService } from '../../services/workflowService';

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function SupplyCoordinatorDashboard() {
  const [consolidated, setConsolidated] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [shipments, setShipments] = useState([]);

  const loadData = async () => {
    const [cRes, eRes, rRes, sRes] = await Promise.all([
      workflowService.getConsolidatedOrders({ limit: 20 }),
      workflowService.getExceptions({ limit: 20 }),
      workflowService.getDeliveryRoutes({ limit: 20 }),
      workflowService.getShipments({ limit: 20 }),
    ]);
    if (cRes.success) setConsolidated(getRows(cRes.data));
    if (eRes.success) setExceptions(getRows(eRes.data));
    if (rRes.success) setRoutes(getRows(rRes.data));
    if (sRes.success) setShipments(getRows(sRes.data));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className='space-y-4 animate-fade-in'>
      <h1 className='text-2xl font-bold mb-2'>Dashboard Supply Coordinator</h1>
      <p className='text-gray-600'>Dữ liệu thực từ consolidated orders, exceptions, routes, shipments.</p>

      <div className='grid gap-4 md:grid-cols-4'>
        <StatCard title='Consolidated' value={`${consolidated.length}`} color='primary' />
        <StatCard title='Exceptions' value={`${exceptions.length}`} color='warning' />
        <StatCard title='Delivery routes' value={`${routes.length}`} color='secondary' />
        <StatCard title='Shipments' value={`${shipments.length}`} color='accent' />
      </div>

      <div className='rounded-lg border bg-white p-4'>
        <h3 className='font-semibold mb-2'>Sự cố gần đây</h3>
        {!exceptions.length && <p className='text-sm text-gray-500'>Không có sự cố</p>}
        {exceptions.slice(0, 5).map(row => (
          <div key={row._id} className='text-sm'>
            {row.severity || '-'} - {row.exception_type || '-'}
          </div>
        ))}
      </div>
    </div>
  );
}

