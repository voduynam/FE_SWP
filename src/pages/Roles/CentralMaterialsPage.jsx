import { useEffect, useState } from 'react';
import { workflowService } from '../../services/workflowService';

const getExpiryAlerts = res => {
  if (!res?.success) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.alerts)) return res.data.alerts;
  if (Array.isArray(res.data?.data?.alerts)) return res.data.data.alerts;
  return [];
};

const getItemDisplayName = row => {
  if (!row) return 'Item';
  if (row.item?.name) return row.item.name;
  if (row.item_name) return row.item_name;
  if (row.item_id && typeof row.item_id === 'object') {
    return row.item_id.name || row.item_id.sku || row.item_id._id || 'Item';
  }
  return row.item_id || 'Item';
};

export default function CentralMaterialsPage() {
  const [expiring, setExpiring] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [error, setError] = useState('');

  const loadData = async () => {
    setError('');
    const alertRes = await workflowService.getAlertsExpiry({ days_threshold: 7 });
    if (!alertRes.success) {
      setError('Không tải được dữ liệu cảnh báo hết hạn');
      setExpiring([]);
      setExpiryAlerts([]);
      return;
    }

    const alertRows = getExpiryAlerts(alertRes);
    setExpiring(alertRows);
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

      {error && <p className='text-sm text-red-600'>{error}</p>}

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='rounded-lg border bg-white'>
          <div className='border-b px-4 py-3 text-sm font-semibold'>Lô sắp hết hạn (7 ngày)</div>
          <div className='divide-y'>
            {!expiring.length && <p className='px-4 py-6 text-sm text-gray-500'>Không có dữ liệu</p>}
            {expiring.map((row, idx) => (
              <div key={row._id || idx} className='px-4 py-3 text-sm'>
                <div className='font-medium'>{getItemDisplayName(row)}</div>
                <div className='text-gray-500'>
                  Lô: {row.lot?.lot_code || '-'} | SL: {row.qty_on_hand ?? 0} | Hết hạn: {row.exp_date || '-'}
                </div>
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
                <div className='font-medium'>{getItemDisplayName(row)}</div>
                <div className='text-gray-500'>
                  Mức độ: {row.severity || '-'} | Còn: {row.days_until_expiry ?? '-'} ngày
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

