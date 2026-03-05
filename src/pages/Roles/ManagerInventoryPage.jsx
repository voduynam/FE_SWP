import { useEffect, useState } from 'react';
import { workflowService } from '../../services/workflowService';

const getBalanceRows = res => {
  if (!res?.success) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
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

export default function ManagerInventoryPage() {
  const [summary, setSummary] = useState(null);
  const [balances, setBalances] = useState([]);
  const [error, setError] = useState('');

  const loadData = async () => {
    setError('');
    const [summaryRes, balanceRes] = await Promise.all([
      workflowService.getInventorySummary({}),
      workflowService.getInventoryBalances({ limit: 20 }),
    ]);

    if (!summaryRes.success || !balanceRes.success) {
      setError('Không tải đủ dữ liệu tồn kho');
    }

    setSummary(summaryRes.success ? summaryRes.data : null);
    setBalances(getBalanceRows(balanceRes));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Tồn kho hệ thống</h1>
          <p className='text-gray-600'>
            Flow áp dụng: `inventory/summary` + `inventory/balances` cho Manager.
          </p>
        </div>
        <button onClick={loadData} className='rounded-md bg-black px-3 py-2 text-sm text-white'>
          Làm mới
        </button>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}

      <div className='rounded-lg border bg-white px-4 py-3 text-sm'>
        <div className='font-semibold'>Tổng quan tồn kho</div>
        <div className='mt-1 text-gray-600'>Tổng giá trị: {summary?.total_value ?? '-'}</div>
      </div>

      <div className='rounded-lg border bg-white divide-y'>
        {!balances.length && <p className='px-4 py-6 text-sm text-gray-500'>Không có dữ liệu</p>}
        {balances.map((row, idx) => (
          <div key={row._id || idx} className='px-4 py-3 text-sm'>
            <div className='font-medium'>{getItemDisplayName(row)}</div>
            <div className='text-gray-500'>
              On hand: {row.qty_on_hand ?? 0} | Reserved: {row.qty_reserved ?? 0} | Available:{' '}
              {(row.qty_available ?? ((row.qty_on_hand ?? 0) - (row.qty_reserved ?? 0)))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

