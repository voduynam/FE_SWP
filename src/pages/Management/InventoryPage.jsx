import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Search } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

export default function InventoryPage() {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadBalances = async () => {
    setLoading(true);
    setError('');
    const result = await workflowService.getInventoryBalancesPaginated({
      limit: 200,
    });

    if (!result.success) {
      setError(result.message || 'Không tải được tồn kho');
      setBalances([]);
      setLoading(false);
      return;
    }

    const rows = Array.isArray(result.data?.data)
      ? result.data.data
      : Array.isArray(result.data)
        ? result.data
        : [];
    setBalances(rows || []);
    setLoading(false);
    setPage(1);
  };

  useEffect(() => {
    loadBalances();
  }, []);

  const orgOptions = useMemo(() => {
    const map = new Map();
    balances.forEach(b => {
      const org = b.org_unit_id;
      if (org?._id && !map.has(org._id)) {
        map.set(org._id, org.name || org.code || org._id);
      }
    });
    return Array.from(map.entries());
  }, [balances]);

  const filtered = useMemo(() => {
    const s = (search || '').toLowerCase();
    return balances.filter(b => {
      const name = b.item_id?.name || '';
      const sku = b.item_id?.sku || '';
      const orgId = b.org_unit_id?._id;
      const matchText =
        !s ||
        name.toLowerCase().includes(s) ||
        sku.toLowerCase().includes(s);
      const matchOrg = orgFilter === 'ALL' || orgId === orgFilter;
      return matchText && matchOrg;
    });
  }, [balances, search, orgFilter]);

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
          <h1 className='text-2xl font-bold text-slate-900'>Tồn kho hiện tại</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Theo dõi số lượng tồn tại bếp trung tâm và từng cửa hàng.
          </p>
        </div>
        <button
          onClick={loadBalances}
          className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'
          disabled={loading}
        >
          <RefreshCcw className='h-4 w-4' /> Làm mới
        </button>
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
        <select
          value={orgFilter}
          onChange={e => setOrgFilter(e.target.value)}
          className='input-field min-w-[200px]'
        >
          <option value='ALL'>Tất cả đơn vị</option>
          {orgOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>SKU</th>
              <th className='px-4 py-3'>Sản phẩm</th>
              <th className='px-4 py-3'>Đơn vị</th>
              <th className='px-4 py-3 text-right'>Tồn khả dụng</th>
              <th className='px-4 py-3 text-right'>ĐVT</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && (
              <tr>
                <td colSpan={5} className='px-4 py-6 text-center text-slate-400'>
                  Đang tải tồn kho...
                </td>
              </tr>
            )}
            {!loading && !paged.length && (
              <tr>
                <td colSpan={5} className='px-4 py-6 text-center text-slate-400'>
                  Không có dữ liệu tồn kho.
                </td>
              </tr>
            )}
            {paged.map(row => (
              <tr key={row._id}>
                <td className='px-4 py-3 font-mono text-xs text-slate-600'>
                  {row.item_id?.sku}
                </td>
                <td className='px-4 py-3 text-slate-900'>
                  <div className='font-medium'>{row.item_id?.name}</div>
                  <div className='text-xs text-slate-400'>
                    {row.item_id?.category_id?.name}
                  </div>
                </td>
                <td className='px-4 py-3 text-sm text-slate-800'>
                  {row.org_unit_id?.name || '-'}
                </td>
                <td className='px-4 py-3 text-right text-slate-900'>
                  {row.qty_available ?? row.qty_on_hand ?? 0}
                </td>
                <td className='px-4 py-3 text-right text-xs text-slate-600'>
                  {row.item_id?.base_uom_id?.code}
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
          dòng tồn kho
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

