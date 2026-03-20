import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, RefreshCcw, Search, AlertTriangle } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

// Enum phải khớp với BE (ExceptionLog.exception_type)
const EXCEPTION_TYPES = {
  SHORTAGE: 'Hết hàng',
  DAMAGE: 'Hư hỏng / chất lượng',
  WRONG_ITEM: 'Sai hàng',
  LATE_DELIVERY: 'Giao trễ',
  OTHER: 'Khác',
};

const SEVERITY = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  CRITICAL: 'Nghiêm trọng',
};

const EXC_STATUS = {
  OPEN: 'Mở',
  INVESTIGATING: 'Đang điều tra',
  RESOLVED: 'Đã giải quyết',
  CLOSED: 'Đóng',
};

const severityColor = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const statusColor = {
  OPEN: 'bg-blue-100 text-blue-700',
  INVESTIGATING: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

const PAGE_SIZE = 10;

function getList(res) {
  if (!res?.success) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
}

export default function SupplyIssuesPage() {
  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState('');

  const [detailId, setDetailId] = useState(null);
  const [detailExc, setDetailExc] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolution, setResolution] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [form, setForm] = useState({
    exception_type: 'OUT_OF_STOCK',
    severity: 'MEDIUM',
    store_org_unit_id: '',
    order_id: '',
    item_id: '',
    description: '',
  });
  const [orgUnits, setOrgUnits] = useState([]);
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);

  /* ─── Load list ─── */
  const loadIssues = async (page = 1) => {
    setLoading(true);
    setSuccess('');
    try {
      const res = await workflowService.getExceptions({
        page,
        limit: PAGE_SIZE,
        ...(severityFilter ? { severity: severityFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setIssues(list);
        const p = res.data.pagination ?? {};
        setPagination({ page: p.page ?? page, limit: p.limit ?? PAGE_SIZE, total: p.total ?? 0, pages: p.pages ?? 1 });
      } else {
        setIssues([]);
      }
    } catch {
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadIssues(1); }, [severityFilter, statusFilter]);

  const filteredIssues = useMemo(() => {
    const s = (search || '').toLowerCase();
    return issues.filter(exc => {
      const desc = exc.description || '';
      const store = exc.store_org_unit_id?.name || exc.store_org_unit_id?.code || '';
      return !s || desc.toLowerCase().includes(s) || store.toLowerCase().includes(s);
    });
  }, [issues, search]);

  /* ─── Detail ─── */
  const loadDetail = async id => {
    setDetailId(id);
    setDetailExc(null);
    setDetailError(null);
    setResolution('');
    if (!id) return;
    const res = await workflowService.getException(id);
    if (res.success && res.data) setDetailExc(res.data);
    else setDetailError(res.message || 'Không tìm thấy sự cố');
  };

  const closeDetail = () => {
    setDetailId(null);
    loadIssues(pagination.page);
  };

  /* ─── Resolve ─── */
  const handleResolve = async () => {
    if (!detailExc || !resolution.trim()) { alert('Vui lòng nhập giải pháp.'); return; }
    setActionLoading(true);
    try {
      const res = await workflowService.resolveException(detailExc._id, { resolution });
      if (res.success) {
        setSuccess('Sự cố đã được giải quyết.');
        await loadDetail(detailExc._id);
      } else {
        alert(res.message || 'Giải quyết thất bại');
      }
    } finally {
      setActionLoading(false);
    }
  };

  /* ─── Create: load supporting data ─── */
  useEffect(() => {
    if (!createOpen) return;
    setCreateError('');
    setForm({ exception_type: 'OUT_OF_STOCK', severity: 'MEDIUM', store_org_unit_id: '', order_id: '', item_id: '', description: '' });
    const load = async () => {
      const [ouRes, ordRes, itemRes] = await Promise.all([
        workflowService.getOrgUnits({ limit: 100 }),
        workflowService.getInternalOrders({ limit: 100 }),
        workflowService.getItems({ limit: 200 }),
      ]);
      setOrgUnits(getList(ouRes));
      setOrders(getList(ordRes));
      setItems(getList(itemRes));
    };
    load();
  }, [createOpen]);

  /* ─── Submit create ─── */
  const handleSubmitCreate = async e => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      if (!form.store_org_unit_id) { setCreateError('Vui lòng chọn cửa hàng.'); setCreating(false); return; }
      if (!form.description.trim()) { setCreateError('Vui lòng nhập mô tả sự cố.'); setCreating(false); return; }

      const res = await workflowService.createException({
        exception_type: form.exception_type,
        severity: form.severity,
        store_org_unit_id: form.store_org_unit_id,
        order_id: form.order_id || undefined,
        item_id: form.item_id || undefined,
        description: form.description,
      });

      if (!res.success) {
        setCreateError(res.message || 'Tạo sự cố thất bại');
        setCreating(false);
        return;
      }

      setCreateOpen(false);
      setSuccess('Đã ghi nhận sự cố mới.');
      loadIssues(1);
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'Lỗi khi tạo sự cố');
    } finally {
      setCreating(false);
    }
  };

  const getStoreName = s => {
    if (!s) return '-';
    if (typeof s === 'string') return s;
    return s.name || s.code || s._id || '-';
  };

  const getItemName = i => {
    if (!i) return '-';
    if (typeof i === 'string') return i;
    return i.name || i.sku || i._id || '-';
  };

  const getOrderLabel = o => {
    if (!o) return '-';
    if (typeof o === 'string') return o;
    return o.order_no || o._id || '-';
  };

  return (
    <div className='min-h-full space-y-6 animate-fade-in'>
      {success && (
        <div className='flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className='text-xs text-emerald-700/70 hover:text-emerald-900'>Đóng</button>
        </div>
      )}

      {/* Header */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Xử lý sự cố đơn hàng</h1>
          <p className='mt-1 text-sm text-slate-500'>Ghi nhận, theo dõi và giải quyết sự cố trong quá trình cung ứng.</p>
        </div>
        <div className='flex gap-2'>
          <button onClick={() => setCreateOpen(true)} className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'>
            <Plus className='h-4 w-4' /> Ghi nhận sự cố
          </button>
          <button onClick={() => loadIssues(1)} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Tìm theo mô tả / cửa hàng...' className='input-field w-full pl-9' />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className='input-field min-w-[160px]'>
          <option value=''>Tất cả trạng thái</option>
          {Object.entries(EXC_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className='input-field min-w-[160px]'>
          <option value=''>Tất cả mức độ</option>
          {Object.entries(SEVERITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Loại</th>
              <th className='px-4 py-3'>Mức độ</th>
              <th className='px-4 py-3'>Cửa hàng</th>
              <th className='px-4 py-3'>Mô tả</th>
              <th className='px-4 py-3'>Người báo</th>
              <th className='px-4 py-3'>Ngày báo</th>
              <th className='px-4 py-3'>Trạng thái</th>
              <th className='px-4 py-3 text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && <tr><td colSpan={8} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td></tr>}
            {!loading && !filteredIssues.length && <tr><td colSpan={8} className='px-4 py-6 text-center text-slate-400'>Không có sự cố nào.</td></tr>}
            {!loading && filteredIssues.map(exc => (
              <tr key={exc._id} className='hover:bg-slate-50/50'>
                <td className='px-4 py-3 font-medium text-slate-900'>{EXCEPTION_TYPES[exc.exception_type] || exc.exception_type}</td>
                <td className='px-4 py-3'>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${severityColor[exc.severity] || 'bg-slate-100 text-slate-600'}`}>
                    {SEVERITY[exc.severity] || exc.severity}
                  </span>
                </td>
                <td className='px-4 py-3 text-slate-700'>{getStoreName(exc.store_org_unit_id)}</td>
                <td className='px-4 py-3 text-slate-700 max-w-[200px] truncate'>{exc.description || '-'}</td>
                <td className='px-4 py-3 text-slate-700'>{exc.reported_by?.full_name || exc.reported_by?.username || '-'}</td>
                <td className='px-4 py-3 text-slate-700'>{exc.reported_at ? new Date(exc.reported_at).toLocaleDateString('vi-VN') : '-'}</td>
                <td className='px-4 py-3'>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[exc.status] || 'bg-slate-100 text-slate-600'}`}>
                    {EXC_STATUS[exc.status] || exc.status}
                  </span>
                </td>
                <td className='px-4 py-3 text-right'>
                  <button onClick={() => loadDetail(exc._id)} className='rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'>Chi tiết</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className='flex items-center justify-between text-sm text-slate-500'>
          <p>Hiển thị {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}</p>
          <div className='flex items-center gap-2'>
            <button onClick={() => loadIssues(pagination.page - 1)} disabled={pagination.page <= 1} className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'>Trước</button>
            <span>Trang {pagination.page} / {Math.max(1, pagination.pages)}</span>
            <button onClick={() => loadIssues(pagination.page + 1)} disabled={pagination.page >= Math.max(1, pagination.pages)} className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'>Sau</button>
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {detailId && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={closeDetail}>
          <div className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Chi tiết sự cố</h2>
              <button onClick={closeDetail} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>

            {!detailExc && !detailError && <p className='text-sm text-slate-500'>Đang tải...</p>}
            {detailError && <p className='text-sm text-red-600'>{detailError}</p>}
            {detailExc && (
              <div className='space-y-4'>
                <div className='rounded-lg border border-slate-200 bg-slate-50/50 p-3'>
                  <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-sm'>
                    <span className='text-slate-500'>Loại sự cố:</span>
                    <span className='font-medium'>{EXCEPTION_TYPES[detailExc.exception_type] || detailExc.exception_type}</span>
                    <span className='text-slate-500'>Mức độ:</span>
                    <span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${severityColor[detailExc.severity] || 'bg-slate-100'}`}>
                        {SEVERITY[detailExc.severity] || detailExc.severity}
                      </span>
                    </span>
                    <span className='text-slate-500'>Cửa hàng:</span>
                    <span>{getStoreName(detailExc.store_org_unit_id)}</span>
                    <span className='text-slate-500'>Đơn hàng:</span>
                    <span>{getOrderLabel(detailExc.order_id)}</span>
                    <span className='text-slate-500'>Sản phẩm:</span>
                    <span>{getItemName(detailExc.item_id)}</span>
                    <span className='text-slate-500'>Trạng thái:</span>
                    <span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[detailExc.status] || 'bg-slate-100'}`}>
                        {EXC_STATUS[detailExc.status] || detailExc.status}
                      </span>
                    </span>
                    <span className='text-slate-500'>Người báo:</span>
                    <span>{detailExc.reported_by?.full_name || detailExc.reported_by?.username || '-'}</span>
                    <span className='text-slate-500'>Ngày báo:</span>
                    <span>{detailExc.reported_at ? new Date(detailExc.reported_at).toLocaleString('vi-VN') : '-'}</span>
                  </div>
                </div>

                <div className='rounded-lg border border-slate-200 p-3'>
                  <h3 className='mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500'>Mô tả</h3>
                  <p className='text-sm text-slate-700 whitespace-pre-wrap'>{detailExc.description || 'Không có mô tả.'}</p>
                </div>

                {detailExc.resolution && (
                  <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3'>
                    <h3 className='mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600'>Giải pháp</h3>
                    <p className='text-sm text-emerald-800 whitespace-pre-wrap'>{detailExc.resolution}</p>
                    {detailExc.resolved_by && (
                      <p className='mt-1 text-xs text-emerald-600'>
                        Giải quyết bởi: {detailExc.resolved_by.full_name || detailExc.resolved_by.username}
                        {detailExc.resolved_at ? ` — ${new Date(detailExc.resolved_at).toLocaleString('vi-VN')}` : ''}
                      </p>
                    )}
                  </div>
                )}

                {/* Resolve action */}
                {detailExc.status === 'OPEN' || detailExc.status === 'INVESTIGATING' ? (
                  <div className='space-y-2 rounded-lg border border-slate-200 p-3'>
                    <h3 className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Giải quyết sự cố</h3>
                    <textarea
                      value={resolution}
                      onChange={e => setResolution(e.target.value)}
                      rows={3}
                      placeholder='Nhập giải pháp / cách xử lý...'
                      className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'
                    />
                    <button
                      disabled={actionLoading || !resolution.trim()}
                      onClick={handleResolve}
                      className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
                    >
                      {actionLoading ? 'Đang xử lý...' : 'Đánh dấu đã giải quyết'}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ─── Create Modal ─── */}
      {createOpen && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => !creating && setCreateOpen(false)}>
          <div className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>
                <AlertTriangle className='mr-1 inline h-5 w-5 text-amber-500' /> Ghi nhận sự cố
              </h2>
              <button onClick={() => !creating && setCreateOpen(false)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {createError && <p className='mb-3 text-sm text-red-600'>{createError}</p>}

            <form onSubmit={handleSubmitCreate} className='space-y-4'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Loại sự cố *</label>
                  <select value={form.exception_type} onChange={e => setForm(f => ({ ...f, exception_type: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'>
                    {Object.entries(EXCEPTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Mức độ *</label>
                  <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'>
                    {Object.entries(SEVERITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className='sm:col-span-2'>
                  <label className='block text-sm font-medium text-slate-700'>Cửa hàng *</label>
                  <select value={form.store_org_unit_id} onChange={e => setForm(f => ({ ...f, store_org_unit_id: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' required>
                    <option value=''>-- Chọn cửa hàng --</option>
                    {orgUnits.map(ou => <option key={ou._id} value={ou._id}>{ou.name || ou.code || ou._id}</option>)}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Đơn hàng liên quan</label>
                  <select value={form.order_id} onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'>
                    <option value=''>-- Không --</option>
                    {orders.map(o => <option key={o._id} value={o._id}>{o.order_no || o._id} ({o.status})</option>)}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Sản phẩm liên quan</label>
                  <select value={form.item_id} onChange={e => setForm(f => ({ ...f, item_id: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'>
                    <option value=''>-- Không --</option>
                    {items.map(i => <option key={i._id} value={i._id}>{i.name || i.sku || i._id}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700'>Mô tả sự cố *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder='Mô tả chi tiết sự cố...'
                  className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'
                  required
                />
              </div>

              <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                <button type='button' disabled={creating} onClick={() => setCreateOpen(false)} className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'>Hủy</button>
                <button type='submit' disabled={creating} className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60'>
                  {creating ? 'Đang tạo...' : 'Ghi nhận sự cố'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
