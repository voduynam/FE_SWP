import { useEffect, useState } from 'react';
import { workflowService } from '../../services/workflowService';

const getLocationName = location => {
  if (!location) return '-';
  if (typeof location === 'string') return location;
  return location.name || location.code || location._id || '-';
};

export default function SupplyDeliveryPage() {
  const [routes, setRoutes] = useState([]);
  const [shipments, setShipments] = useState([]);

  const loadData = async () => {
    const [routeRes, shipmentRes] = await Promise.all([
      workflowService.getDeliveryRoutes({ limit: 20 }),
      workflowService.getShipments({ limit: 20 }),
    ]);

    const routeRows = Array.isArray(routeRes.data?.data)
      ? routeRes.data.data
      : Array.isArray(routeRes.data)
        ? routeRes.data
        : [];
    const shipmentRows = Array.isArray(shipmentRes.data?.data)
      ? shipmentRes.data.data
      : Array.isArray(shipmentRes.data)
        ? shipmentRes.data
        : [];

    setRoutes(routeRows);
    setShipments(shipmentRows);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Điều phối & giao hàng</h1>
          <p className='text-gray-600'>
            Flow áp dụng: theo dõi `delivery-routes` và shipment chờ điều phối.
          </p>
        </div>
        <button onClick={loadData} className='rounded-md bg-black px-3 py-2 text-sm text-white'>
          Làm mới
        </button>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='rounded-lg border bg-white'>
          <div className='border-b px-4 py-3 text-sm font-semibold'>Delivery routes</div>
          <div className='divide-y'>
            {!routes.length && <p className='px-4 py-6 text-sm text-gray-500'>Không có dữ liệu</p>}
            {routes.map(route => (
              <div key={route._id || route.id} className='px-4 py-3 text-sm'>
                <div className='font-medium'>{route.route_name || route._id}</div>
                <div className='text-gray-500'>
                  Trạng thái: {route.status || '-'} | Driver: {route.driver_name || '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className='rounded-lg border bg-white'>
          <div className='border-b px-4 py-3 text-sm font-semibold'>Shipments</div>
          <div className='divide-y'>
            {!shipments.length && (
              <p className='px-4 py-6 text-sm text-gray-500'>Không có shipment</p>
            )}
            {shipments.map(row => (
              <div key={row._id || row.id} className='px-4 py-3 text-sm'>
                <div className='font-medium'>{row.shipment_no || row._id}</div>
                <div className='text-gray-500'>
                  Từ: {getLocationName(row.from_location_id)} -&gt; Đến:{' '}
                  {getLocationName(row.to_location_id)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

