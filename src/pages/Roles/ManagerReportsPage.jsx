import { useEffect, useState } from 'react';
import { workflowService } from '../../services/workflowService';

export default function ManagerReportsPage() {
  const [overview, setOverview] = useState(null);
  const [metrics, setMetrics] = useState([]);

  const loadData = async () => {
    const [overviewRes, metricRes] = await Promise.all([
      workflowService.getDashboardOverview({}),
      workflowService.getPerformanceMetrics({}),
    ]);

    const metricRows = Array.isArray(metricRes.data?.data)
      ? metricRes.data.data
      : Array.isArray(metricRes.data)
        ? metricRes.data
        : [];
    setOverview(overviewRes.success ? overviewRes.data : null);
    setMetrics(metricRows);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Báo cáo & hiệu suất vận hành</h1>
          <p className='text-gray-600'>Flow áp dụng: Dashboard Analytics + Performance Metrics.</p>
        </div>
        <button onClick={loadData} className='rounded-md bg-black px-3 py-2 text-sm text-white'>
          Làm mới
        </button>
      </div>

      <div className='grid gap-4 md:grid-cols-4'>
        <div className='rounded-lg border bg-white px-4 py-3 text-sm'>
          <div className='text-gray-500'>Tổng đơn hàng</div>
          <div className='text-lg font-semibold'>{overview?.orders?.total ?? '-'}</div>
        </div>
        <div className='rounded-lg border bg-white px-4 py-3 text-sm'>
          <div className='text-gray-500'>Lệnh sản xuất</div>
          <div className='text-lg font-semibold'>{overview?.production?.total ?? '-'}</div>
        </div>
        <div className='rounded-lg border bg-white px-4 py-3 text-sm'>
          <div className='text-gray-500'>Shipment</div>
          <div className='text-lg font-semibold'>{overview?.shipments?.total ?? '-'}</div>
        </div>
        <div className='rounded-lg border bg-white px-4 py-3 text-sm'>
          <div className='text-gray-500'>Giá trị tồn kho</div>
          <div className='text-lg font-semibold'>{overview?.inventory?.total_value ?? '-'}</div>
        </div>
      </div>

      <div className='rounded-lg border bg-white divide-y'>
        {!metrics.length && <p className='px-4 py-6 text-sm text-gray-500'>Không có dữ liệu metric</p>}
        {metrics.map((row, idx) => (
          <div key={row._id || idx} className='px-4 py-3 text-sm'>
            <div className='font-medium'>{row.metric_type || 'METRIC'}</div>
            <div className='text-gray-500'>{row.value ?? row.metric_value ?? '-'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

