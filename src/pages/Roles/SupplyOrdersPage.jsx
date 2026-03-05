import { useEffect, useState } from 'react';
import { workflowService } from '../../services/workflowService';

const today = () => new Date().toISOString().slice(0, 10);

const getItemName = row => {
  if (!row) return 'Item';
  if (row.item_name) return row.item_name;
  if (row.item_id && typeof row.item_id === 'object') {
    return row.item_id.name || row.item_id.sku || row.item_id._id || 'Item';
  }
  return row.item_id || 'Item';
};

export default function SupplyOrdersPage() {
  const [deliveryDate, setDeliveryDate] = useState(today());
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    const result = await workflowService.getConsolidatedOrders({ delivery_date: deliveryDate });
    const list = Array.isArray(result.data?.data)
      ? result.data.data
      : Array.isArray(result.data)
        ? result.data
        : [];
    setRows(result.success ? list : []);
  };

  const handleGenerate = async () => {
    const result = await workflowService.generateConsolidatedOrders({
      delivery_date: deliveryDate,
    });
    setMessage(result.success ? 'Tạo tổng hợp đơn hàng thành công' : result.message);
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, [deliveryDate]);

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Tổng hợp & phân loại đơn hàng</h1>
          <p className='text-gray-600'>
            Flow áp dụng: `/consolidated-orders/generate` + danh sách tổng hợp theo ngày giao.
          </p>
        </div>
        <div className='flex gap-2'>
          <input
            type='date'
            value={deliveryDate}
            onChange={e => setDeliveryDate(e.target.value)}
            className='rounded-md border px-3 py-2 text-sm'
          />
          <button
            onClick={handleGenerate}
            className='rounded-md bg-black px-3 py-2 text-sm text-white'
          >
            Generate
          </button>
          <button onClick={loadData} className='rounded-md border px-3 py-2 text-sm'>
            Làm mới
          </button>
        </div>
      </div>
      {message && <p className='text-sm text-gray-600'>{message}</p>}

      <div className='rounded-lg border bg-white divide-y'>
        {!rows.length && <p className='px-4 py-6 text-sm text-gray-500'>Không có dữ liệu</p>}
        {rows.map((row, idx) => (
          <div key={row._id || idx} className='px-4 py-3 text-sm'>
            <div className='font-medium'>{getItemName(row)}</div>
            <div className='text-gray-500'>
              Nhu cầu: {row.total_qty_ordered ?? row.total_qty ?? row.qty ?? '-'} | Trạng thái SX:{' '}
              {row.production_status || '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

