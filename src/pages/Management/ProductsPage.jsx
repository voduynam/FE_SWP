import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Search } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

export default function ProductsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadItems = async () => {
    setLoading(true);
    setError('');
    const result = await workflowService.getItems({
      status: status !== 'ALL' ? status : undefined,
      limit: 200,
    });

    if (!result.success) {
      setError(result.message || 'Không tải được danh sách sản phẩm');
      setItems([]);
      setLoading(false);
      return;
    }

    const rows = Array.isArray(result.data?.data)
      ? result.data.data
      : Array.isArray(result.data)
        ? result.data
        : [];

    setItems(rows || []);
    setLoading(false);
    setPage(1);
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    const s = (search || '').toLowerCase();
    return items.filter(it => {
      const name = it.name || '';
      const sku = it.sku || '';
      return (
        !s ||
        name.toLowerCase().includes(s) ||
        sku.toLowerCase().includes(s)
      );
    });
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () =>
      filtered.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
      ),
    [filtered, currentPage],
  );

  return (
    <div className='space-y-6 animate-fade-in'>
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Danh mục sản phẩm</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Quản lý nguyên liệu, bán thành phẩm và thành phẩm dùng cho đơn nội bộ & sản xuất.
          </p>
        </div>
        <div className='flex gap-2'>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className='input-field min-w-[140px]'
          >
            <option value='ACTIVE'>Đang hoạt động</option>
            <option value='INACTIVE'>Ngừng dùng</option>
            <option value='ALL'>Tất cả</option>
          </select>
          <button
            onClick={loadItems}
            className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'
            disabled={loading}
          >
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}

      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Tìm theo tên hoặc SKU...'
            className='input-field w-full pl-9'
          />
        </div>
      </div>

      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>SKU</th>
              <th className='px-4 py-3'>Tên sản phẩm</th>
              <th className='px-4 py-3'>Loại</th>
              <th className='px-4 py-3'>ĐVT cơ bản</th>
              <th className='px-4 py-3'>Nhóm</th>
              <th className='px-4 py-3 text-right'>Giá cơ bản</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && (
              <tr>
                <td colSpan={6} className='px-4 py-6 text-center text-slate-400'>
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!loading && !paged.length && (
              <tr>
                <td colSpan={6} className='px-4 py-6 text-center text-slate-400'>
                  Không có sản phẩm nào.
                </td>
              </tr>
            )}
            {paged.map(it => (
              <tr key={it._id}>
                <td className='px-4 py-3 font-mono text-xs text-slate-600'>
                  {it.sku}
                </td>
                <td className='px-4 py-3 font-medium text-slate-900'>
                  {it.name}
                </td>
                <td className='px-4 py-3 text-xs text-slate-600'>
                  {it.item_type}
                </td>
                <td className='px-4 py-3 text-xs text-slate-700'>
                  {it.base_uom_id?.code} - {it.base_uom_id?.name}
                </td>
                <td className='px-4 py-3 text-xs text-slate-700'>
                  {it.category_id?.name || '-'}
                </td>
                <td className='px-4 py-3 text-right text-slate-800'>
                  {(
                    it.base_sell_price || it.cost_price || 0
                  ).toLocaleString('vi-VN')}{' '}
                  đ
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className='flex items-center justify-between text-xs text-slate-400'>
        <p>
          Hiển thị{' '}
          {filtered.length === 0
            ? 0
            : (currentPage - 1) * pageSize + 1}{' '}
          - {Math.min(currentPage * pageSize, filtered.length)} /{' '}
          {filtered.length}{' '}
          sản phẩm
        </p>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
          >
            Trước
          </button>
          <span>
            Trang {currentPage} / {totalPages}
          </span>
          <button
            type='button'
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}

