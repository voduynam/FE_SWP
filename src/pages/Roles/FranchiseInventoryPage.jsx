import { useEffect, useState } from 'react';
import { workflowService } from '../../services/workflowService';

export default function FranchiseInventoryPage() {
  const [balances, setBalances] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');

  const loadData = async () => {
    setError('');
    const [balanceRes, alertRes] = await Promise.all([
      workflowService.getInventoryBalances({ limit: 20 }),
      workflowService.getAlertsLowStock({}),
    ]);

    if (!balanceRes.success || !alertRes.success) {
      setError('Không tải đủ dữ liệu tồn kho/cảnh báo');
    }

    const balanceRows = Array.isArray(balanceRes.data?.data)
      ? balanceRes.data.data
      : Array.isArray(balanceRes.data)
        ? balanceRes.data
        : [];
    const alertRows = Array.isArray(alertRes.data?.data)
      ? alertRes.data.data
      : Array.isArray(alertRes.data)
        ? alertRes.data
        : [];

    setBalances(balanceRows);
    setAlerts(alertRows);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Tồn kho cửa hàng</h1>
          <p className='text-gray-600'>
            Flow áp dụng: `Inventory Balances` + `Low Stock Alerts` cho Store Staff.
          </p>
        </div>
        <button onClick={loadData} className='rounded-md bg-black px-3 py-2 text-sm text-white'>
          Làm mới
        </button>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='rounded-lg border bg-white'>
          <div className='border-b px-4 py-3 text-sm font-semibold'>Inventory balances</div>
          <div className='divide-y'>
            {!balances.length && <p className='px-4 py-6 text-sm text-gray-500'>Không có dữ liệu</p>}
            {balances.map((row, idx) => (
              <div key={row._id || idx} className='px-4 py-3 text-sm'>
                <div className='font-medium'>{row.item_name || row.item_id || 'Item'}</div>
                <div className='text-gray-500'>Sẵn dùng: {row.qty_available ?? row.qty_on_hand ?? 0}</div>
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-lg border bg-white'>
          <div className='border-b px-4 py-3 text-sm font-semibold'>Low-stock alerts</div>
          <div className='divide-y'>
            {!alerts.length && <p className='px-4 py-6 text-sm text-gray-500'>Không có cảnh báo</p>}
            {alerts.map((row, idx) => (
              <div key={row._id || idx} className='px-4 py-3 text-sm'>
                <div className='font-medium'>{row.item?.name || row.item_name || row.item_id}</div>
                <div className='text-gray-500'>
                  Tồn khả dụng: {row.qty_available ?? '-'} | Min: {row.min_stock_level ?? '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

