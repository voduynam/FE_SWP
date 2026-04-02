import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, RefreshCcw, Search } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import { workflowService } from '../../services/workflowService';

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const exportCsv = (filename, rows) => {
  if (!rows?.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(',')]
    .concat(rows.map(r => keys.map(k => `"${(r[k] ?? '').toString().replace(/"/g, '""')}"`).join(',')))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function Reports() {
  const [overview, setOverview] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [consolidated, setConsolidated] = useState([]);
  const [storeQuery, setStoreQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    const [overviewRes, metricRes, consolidatedRes, alertRes] = await Promise.all([
      workflowService.getDashboardOverview({}),
      workflowService.getPerformanceMetrics({ limit: 20 }),
      workflowService.getConsolidatedOrders({ limit: 50 }),
      workflowService.getAlertsSummary({}),
    ]);

    const failed = [];
    if (!overviewRes.success) failed.push('overview');
    if (!metricRes.success) failed.push('metrics');
    if (!consolidatedRes.success) failed.push('consolidated');
    if (!alertRes.success) failed.push('alerts');
    if (failed.length) setError(`Một phần dữ liệu chưa tải được (${failed.join(', ')}).`);

    if (overviewRes.success) setOverview(overviewRes.data);
    if (metricRes.success) setMetrics(getRows(metricRes.data));
    if (consolidatedRes.success) setConsolidated(getRows(consolidatedRes.data));
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const topProducts = useMemo(() => {
    const rows = consolidated.map(row => ({
      product: row.item_id?.name || row.item_id?.sku || row.item_id || row._id,
      totalQty: row.total_qty_ordered ?? 0,
      productionStatus: row.production_status || '-',
      needToProduce: row.need_to_produce ?? 0,
    }));
    return rows
      .filter(r => !productQuery || r.product.toLowerCase().includes(productQuery.toLowerCase()))
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 10);
  }, [consolidated, productQuery]);

  const metricRows = useMemo(() => {
    return metrics.filter(m => {
      const type = m.metric_type || '';
      return !storeQuery || type.toLowerCase().includes(storeQuery.toLowerCase());
    });
  }, [metrics, storeQuery]);

  return (
    <div className='space-y-6 animate-fade-in'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Báo cáo & Thống kê</h1>
          <p className='mt-1 text-muted-foreground'>Dữ liệu báo cáo đang lấy từ API + MongoDB thực tế.</p>
        </div>
        <div className='flex gap-2'>
          <button className='btn-outline flex items-center gap-2' onClick={loadData} disabled={loading}>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
          <button className='btn-primary flex items-center gap-2' onClick={() => exportCsv('top_products.csv', topProducts)}>
            <Download className='h-4 w-4' /> Xuất top sản phẩm
          </button>
        </div>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard title='Tổng đơn hàng' value={`${overview?.orders?.total ?? 0}`} color='primary' />
        <StatCard title='Hoàn thành' value={`${overview?.orders?.completed ?? 0}`} color='success' />
        <StatCard title='Shipment' value={`${overview?.shipments?.total ?? 0}`} color='accent' />
        <StatCard title='Giá trị tồn kho' value={`${overview?.inventory?.total_value ?? 0}`} color='warning' />
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        <div className='rounded-xl border border-border bg-card p-6'>
          <div className='mb-4 flex items-center justify-between'>
            <h3 className='font-semibold text-lg'>Top sản phẩm theo tổng hợp đơn</h3>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <input
                className='input-field w-full pl-9'
                placeholder='Tìm sản phẩm...'
                value={productQuery}
                onChange={e => setProductQuery(e.target.value)}
              />
            </div>
          </div>
          <div className='space-y-3'>
            {!topProducts.length && <p className='text-sm text-muted-foreground'>Không có dữ liệu.</p>}
            {topProducts.map((row, idx) => (
              <div key={`${row.product}-${idx}`} className='flex items-center justify-between rounded-lg bg-muted/40 p-3 text-sm'>
                <div>
                  <p className='font-medium'>{row.product}</p>
                  <p className='text-xs text-muted-foreground'>SX: {row.productionStatus}</p>
                </div>
                <div className='text-right'>
                  <p className='font-semibold'>SL: {row.totalQty}</p>
                  <p className='text-xs text-muted-foreground'>Cần SX: {row.needToProduce}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-xl border border-border bg-card p-6'>
          <div className='mb-4 flex items-center justify-between'>
            <h3 className='font-semibold text-lg'>Performance metrics</h3>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <input
                className='input-field w-full pl-9'
                placeholder='Lọc loại metric...'
                value={storeQuery}
                onChange={e => setStoreQuery(e.target.value)}
              />
            </div>
          </div>
          <div className='space-y-3'>
            {!metricRows.length && <p className='text-sm text-muted-foreground'>Không có metric.</p>}
            {metricRows.map((m, idx) => (
              <div key={m._id || idx} className='rounded-lg bg-muted/40 p-3 text-sm'>
                <p className='font-medium'>{m.metric_type || 'METRIC'}</p>
                <p className='text-xs text-muted-foreground'>
                  Ngày: {m.metric_date ? new Date(m.metric_date).toLocaleDateString('vi-VN') : '-'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='rounded-xl border border-border bg-card p-6'>
        <div className='mb-4 flex items-center gap-2'>
          <AlertTriangle className='h-5 w-5 text-warning' />
          <h3 className='font-semibold text-lg'>Ghi chú</h3>
        </div>
        <p className='text-sm text-muted-foreground'>
          Trang báo cáo đã bỏ dữ liệu hardcode và dùng trực tiếp dữ liệu từ DB. Các chỉ số chi tiết theo biểu đồ nâng cao có thể bổ sung ở bước tiếp theo nếu bạn muốn.
        </p>
      </div>
    </div>
  );
}
