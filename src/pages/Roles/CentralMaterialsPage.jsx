import { useEffect, useState } from 'react';
import { workflowService } from '../../services/workflowService';

export default function CentralMaterialsPage() {
  const [expiring, setExpiring] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);

  const loadData = async () => {
    const [inventoryRes, alertRes] = await Promise.all([
      workflowService.getInventoryExpiring({ days: 7 }),
      workflowService.getAlertsExpiry({}),
    ]);

    const inventoryRows = Array.isArray(inventoryRes.data?.data)
      ? inventoryRes.data.data
      : Array.isArray(inventoryRes.data)
        ? inventoryRes.data
        : [];
    const alertRows = Array.isArray(alertRes.data?.data)
      ? alertRes.data.data
      : Array.isArray(alertRes.data)
        ? alertRes.data
        : [];

    setExpiring(inventoryRows);
    setExpiryAlerts(alertRows);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Nguyên liệu & lô sản xuất</h1>
          <p className='text-gray-600'>Flow áp dụng: theo dõi lot sắp hết hạn + cảnh báo expiry.</p>
        </div>
        <button onClick={loadData} className='rounded-md bg-black px-3 py-2 text-sm text-white'>
          Làm mới
        </button>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='rounded-lg border bg-white'>
          <div className='border-b px-4 py-3 text-sm font-semibold'>Inventory expiring</div>
          <div className='divide-y'>
            {!expiring.length && <p className='px-4 py-6 text-sm text-gray-500'>Không có dữ liệu</p>}
            {expiring.map((row, idx) => (
              <div key={row._id || idx} className='px-4 py-3 text-sm'>
                <div className='font-medium'>{row.item_name || row.item_id || 'Item'}</div>
                <div className='text-gray-500'>Hết hạn: {row.exp_date || '-'}</div>
              </div>
            ))}
          </div>
        </div>
        <div className='rounded-lg border bg-white'>
          <div className='border-b px-4 py-3 text-sm font-semibold'>Expiry alerts</div>
          <div className='divide-y'>
            {!expiryAlerts.length && (
              <p className='px-4 py-6 text-sm text-gray-500'>Không có cảnh báo</p>
            )}
            {expiryAlerts.map((row, idx) => (
              <div key={row._id || idx} className='px-4 py-3 text-sm'>
                <div className='font-medium'>{row.item?.name || row.item_name || row.item_id}</div>
                <div className='text-gray-500'>Mức độ: {row.severity || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

