import { useEffect, useState } from 'react';
import { workflowService } from '../../services/workflowService';

export default function CentralOrdersPage() {
  const [status, setStatus] = useState('SUBMITTED');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadOrders = async nextStatus => {
    setLoading(true);
    const result = await workflowService.getInternalOrders({
      status: nextStatus,
      limit: 20,
    });
    const rows = Array.isArray(result.data?.data)
      ? result.data.data
      : Array.isArray(result.data)
        ? result.data
        : [];
    setOrders(result.success ? rows : []);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders(status);
  }, [status]);

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Đơn hàng từ cửa hàng franchise</h1>
          <p className='text-gray-600'>
            Flow áp dụng: duyệt và xử lý `SUBMITTED -&gt; APPROVED -&gt; PROCESSING`.
          </p>
        </div>
        <div className='flex gap-2'>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className='rounded-md border px-3 py-2 text-sm'
          >
            <option value='SUBMITTED'>SUBMITTED</option>
            <option value='APPROVED'>APPROVED</option>
            <option value='PROCESSING'>PROCESSING</option>
            <option value='SHIPPED'>SHIPPED</option>
          </select>
          <button
            onClick={() => loadOrders(status)}
            className='rounded-md bg-black px-3 py-2 text-sm text-white'
          >
            Làm mới
          </button>
        </div>
      </div>

      {loading && <p className='text-sm text-gray-500'>Đang tải...</p>}
      <div className='rounded-lg border bg-white divide-y'>
        {!loading && !orders.length && (
          <p className='px-4 py-6 text-sm text-gray-500'>Không có dữ liệu</p>
        )}
        {orders.map(order => (
          <div key={order._id || order.id} className='px-4 py-3 text-sm'>
            <div className='font-medium'>{order.order_no || order.code || order._id}</div>
            <div className='text-gray-500'>
              Cửa hàng: {order.store_org_unit_id || '-'} | Status: {order.status || '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

