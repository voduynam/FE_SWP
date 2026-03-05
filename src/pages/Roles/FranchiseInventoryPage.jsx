import { useEffect, useState } from 'react';
import { workflowService } from '../../services/workflowService';

const getBalanceRows = res => {
  if (!res?.success) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
};

const getLowStockAlerts = res => {
  if (!res?.success) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.alerts)) return res.data.alerts;
  if (Array.isArray(res.data?.data?.alerts)) return res.data.data.alerts;
  return [];
};

const getItemDisplayName = row => {
  if (!row) return 'Item';
  if (row.item_name) return row.item_name;
  if (row.item_id && typeof row.item_id === 'object') {
    return row.item_id.name || row.item_id.sku || row.item_id._id || 'Item';
  }
  return row.item_id || 'Item';
};

const getAlertItemName = row => {
  if (!row) return 'Item';
  if (row.item?.name) return row.item.name;
  if (row.item_name) return row.item_name;
  if (row.item_id && typeof row.item_id === 'object') {
    return row.item_id.name || row.item_id.sku || row.item_id._id || 'Item';
  }
  return row.item_id || 'Item';
};

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

    setBalances(getBalanceRows(balanceRes));
    setAlerts(getLowStockAlerts(alertRes));
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
                <div className='font-medium'>{getItemDisplayName(row)}</div>
                <div className='text-gray-500'>
                  Sẵn dùng: {row.qty_available ?? ((row.qty_on_hand ?? 0) - (row.qty_reserved ?? 0))}
                </div>
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
                <div className='font-medium'>{getAlertItemName(row)}</div>
                <div className='text-gray-500'>
                  Tồn khả dụng: {row.qty_available ?? '-'} | Min: {row.min_stock ?? '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

