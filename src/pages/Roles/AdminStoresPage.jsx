import { useEffect, useMemo, useState } from 'react';
import { Download, MapPin, RefreshCcw, Search, Store as StoreIcon } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadges';
import { workflowService } from '../../services/workflowService';

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function AdminStoresPage() {
  const [stores, setStores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadStores = async () => {
    setLoading(true);
    setError('');
    const result = await workflowService.getOrgUnits({ type: 'STORE' });
    if (!result.success) {
      setError(result.message || 'Không tải được danh sách cửa hàng');
      setStores([]);
      setLoading(false);
      return;
    }
    setStores(getRows(result.data));
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStores();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const filteredStores = useMemo(() => {
    return stores.filter(store => {
      const status = (store.status || '').toUpperCase();
      const matchSearch =
        !searchTerm ||
        (store.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (store.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (store.address || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [stores, searchTerm, statusFilter]);

  const activeCount = stores.filter(s => (s.status || '').toUpperCase() === 'ACTIVE').length;

  const exportCsv = () => {
    if (!filteredStores.length) return;
    const rows = filteredStores.map(s => ({
      id: s._id,
      name: s.name || '',
      code: s.code || '',
      status: s.status || '',
      address: s.address || '',
      district: s.district || '',
      city: s.city || '',
    }));
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(',')]
      .concat(rows.map(r => keys.map(k => `"${(r[k] ?? '').toString().replace(/"/g, '""')}"`).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'stores_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className='space-y-6 animate-fade-in'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Quản lý Cửa hàng</h1>
          <p className='mt-1 text-muted-foreground'>Danh sách lấy trực tiếp từ DB (`master-data/org-units`).</p>
        </div>
        <div className='flex gap-3'>
          <button onClick={loadStores} className='btn-outline flex items-center gap-2' disabled={loading}>
            <RefreshCcw className='h-4 w-4' />
            Làm mới
          </button>
          <button onClick={exportCsv} className='btn-primary flex items-center gap-2'>
            <Download className='h-4 w-4' />
            Xuất
          </button>
        </div>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}
      {loading && <p className='text-sm text-slate-500'>Đang tải dữ liệu...</p>}

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <div className='stat-card'>
          <p className='text-sm text-muted-foreground'>Tổng cửa hàng</p>
          <p className='mt-1 text-3xl font-bold'>{stores.length}</p>
        </div>
        <div className='stat-card'>
          <p className='text-sm text-muted-foreground'>Đang hoạt động</p>
          <p className='mt-1 text-3xl font-bold text-success'>{activeCount}</p>
        </div>
      </div>

      <div className='flex flex-col gap-4 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground' />
          <input
            type='text'
            placeholder='Tìm kiếm cửa hàng...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='input-field pl-11'
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className='input-field min-w-[170px]'>
          <option value='ALL'>Tất cả trạng thái</option>
          <option value='ACTIVE'>Hoạt động</option>
          <option value='INACTIVE'>Ngừng HĐ</option>
        </select>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {filteredStores.map(store => (
          <div key={store._id} className='rounded-xl border border-border bg-card p-5 transition-all hover:shadow-lg'>
            <div className='mb-4 flex items-start justify-between'>
              <div className='flex items-center gap-3'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10'>
                  <StoreIcon className='h-6 w-6 text-primary' />
                </div>
                <div>
                  <h3 className='font-semibold'>{store.name || store._id}</h3>
                  <p className='text-sm text-muted-foreground'>{store.code || '-'}</p>
                </div>
              </div>
              <StatusBadge status={(store.status || '').toLowerCase()} />
            </div>

            <div className='text-sm text-muted-foreground'>
              <div className='flex items-start gap-2'>
                <MapPin className='mt-0.5 h-4 w-4 flex-shrink-0' />
                <span>{[store.address, store.district, store.city].filter(Boolean).join(', ') || 'Không có địa chỉ'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && !filteredStores.length && (
        <div className='py-12 text-center text-muted-foreground'>Không tìm thấy cửa hàng phù hợp</div>
      )}
    </div>
  );
}
