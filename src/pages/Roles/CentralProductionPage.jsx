import { useEffect, useState } from 'react';
import { workflowService } from '../../services/workflowService';

export default function CentralProductionPage() {
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState([]);

  const loadData = async nextStatus => {
    const result = await workflowService.getProductionOrders({
      status: nextStatus || undefined,
      limit: 20,
    });
    const list = Array.isArray(result.data?.data)
      ? result.data.data
      : Array.isArray(result.data)
        ? result.data
        : [];
    setRows(result.success ? list : []);
  };

  useEffect(() => {
    loadData(status);
  }, [status]);

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Sản xuất & xuất kho</h1>
          <p className='text-gray-600'>
            Flow áp dụng: `PLANNED -&gt; IN_PROGRESS -&gt; DONE` trong Production APIs.
          </p>
        </div>
        <div className='flex gap-2'>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className='rounded-md border px-3 py-2 text-sm'
          >
            <option value=''>ALL</option>
            <option value='PLANNED'>PLANNED</option>
            <option value='IN_PROGRESS'>IN_PROGRESS</option>
            <option value='DONE'>DONE</option>
            <option value='CANCELLED'>CANCELLED</option>
          </select>
          <button
            onClick={() => loadData(status)}
            className='rounded-md bg-black px-3 py-2 text-sm text-white'
          >
            Làm mới
          </button>
        </div>
      </div>

      <div className='rounded-lg border bg-white divide-y'>
        {!rows.length && <p className='px-4 py-6 text-sm text-gray-500'>Không có dữ liệu</p>}
        {rows.map(row => (
          <div key={row._id || row.id} className='px-4 py-3 text-sm'>
            <div className='font-medium'>{row.prod_order_no || row.order_no || row.code || row._id}</div>
            <div className='text-gray-500'>
              Trạng thái: {row.status || '-'} | Planned: {row.planned_start || '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

