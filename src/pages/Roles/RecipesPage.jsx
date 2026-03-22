import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, RefreshCcw, Search, Trash2 } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

const RECIPE_STATUS = { ACTIVE: 'Đang dùng', INACTIVE: 'Ngừng' };
const PAGE_SIZE = 10;

function getList(res) {
  if (!res?.success || !res?.data) return [];
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

function getItemName(obj) {
  if (!obj) return '-';
  if (typeof obj === 'object') return obj.name || obj.sku || obj._id;
  return obj;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detailRecipe, setDetailRecipe] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [addLineForm, setAddLineForm] = useState({ material_item_id: '', qty_per_batch: 1, uom_id: '', scrap_rate: 0 });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ version: '', status: 'ACTIVE', effective_from: '', effective_to: '' });
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [newRecipe, setNewRecipe] = useState({
    item_id: '',
    version: '1.0',
    status: 'ACTIVE',
    effective_from: new Date().toISOString().slice(0, 10),
    lines: [{ material_item_id: '', qty_per_batch: 1, uom_id: '', scrap_rate: 0 }],
  });

  const loadRecipes = async (page = 1) => {
    setLoading(true);
    setSuccess('');
    try {
      const res = await workflowService.getRecipesPaginated({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setRecipes(list);
        const p = res.data.pagination ?? {};
        setPagination({
          page: p.page ?? page,
          limit: p.limit ?? PAGE_SIZE,
          total: p.total ?? 0,
          pages: p.pages ?? 1,
        });
      } else setRecipes([]);
    } catch (e) {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    const res = await workflowService.getItems({ status: 'ACTIVE', limit: 200 });
    setItems(getList(res));
  };

  useEffect(() => {
    loadRecipes(1);
  }, [statusFilter]);

  useEffect(() => {
    if (createOpen) {
      loadItems();
      setNewRecipe({
        item_id: '',
        version: '1.0',
        status: 'ACTIVE',
        effective_from: new Date().toISOString().slice(0, 10),
        lines: [{ material_item_id: '', qty_per_batch: 1, uom_id: '', scrap_rate: 0 }],
      });
    }
  }, [createOpen]);

  const finishedItems = useMemo(
    () =>
      items.filter(
        (i) => String(i.item_type || '').trim().toUpperCase() === 'FINISHED'
      ),
    [items]
  );

  const loadDetail = async (id) => {
    setDetailId(id);
    setDetailRecipe(null);
    setDetailError(null);
    if (!id) return;
    const res = await workflowService.getRecipe(id);
    if (res.success && res.data) setDetailRecipe(res.data);
    else setDetailError(res.message || 'Không tìm thấy công thức');
  };

  const filteredRecipes = useMemo(() => {
    const s = (search || '').toLowerCase();
    return recipes.filter(r => {
      const name = getItemName(r.item_id);
      const ver = r.version || '';
      return !s || name.toLowerCase().includes(s) || ver.toLowerCase().includes(s);
    });
  }, [recipes, search]);

  const handleNewLineChange = (idx, field, value) => {
    setNewRecipe(prev => {
      const lines = [...prev.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      if (field === 'material_item_id') {
        const item = items.find(i => i._id === value);
        if (item) lines[idx].uom_id = item.base_uom_id?._id ?? item.base_uom_id ?? '';
      }
      return { ...prev, lines };
    });
  };

  const addNewLine = () => setNewRecipe(prev => ({ ...prev, lines: [...prev.lines, { material_item_id: '', qty_per_batch: 1, uom_id: '', scrap_rate: 0 }] }));
  const removeNewLine = (idx) => setNewRecipe(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }));

  const submitCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const lines = newRecipe.lines
        .filter(l => l.material_item_id && (l.qty_per_batch || 0) > 0)
        .map(l => ({
          material_item_id: l.material_item_id,
          qty_per_batch: Number(l.qty_per_batch) || 0,
          uom_id: l.uom_id,
          scrap_rate: Math.min(1, Math.max(0, Number(l.scrap_rate) || 0)),
        }));
      if (!newRecipe.item_id || !newRecipe.version?.trim()) {
        setCreateError('Chọn sản phẩm và nhập version.');
        setCreating(false);
        return;
      }
      if (!lines.length) {
        setCreateError('Công thức phải có ít nhất 1 nguyên liệu.');
        setCreating(false);
        return;
      }
      const res = await workflowService.createRecipe({
        item_id: newRecipe.item_id,
        version: newRecipe.version.trim(),
        status: newRecipe.status,
        effective_from: newRecipe.effective_from ? new Date(newRecipe.effective_from).toISOString() : undefined,
        lines,
      });
      if (!res.success) {
        setCreateError(res.message || 'Tạo công thức thất bại');
        setCreating(false);
        return;
      }
      setCreateOpen(false);
      setSuccess('Đã tạo công thức thành công.');
      loadRecipes(pagination.page).catch(() => {});
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'Có lỗi khi tạo');
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (recipe) => {
    setActionLoadingId(recipe._id);
    setSuccess('');
    try {
      const res = await workflowService.updateRecipeStatus(recipe._id);
      if (res.success) {
        setDetailRecipe(prev => (prev?._id === recipe._id ? { ...prev, status: prev.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : prev));
        setSuccess('Đã đổi trạng thái công thức.');
        loadRecipes(pagination.page).catch(() => {});
      } else alert(res.message || 'Đổi trạng thái thất bại');
    } catch (err) {
      alert(err?.response?.data?.message || 'Đổi trạng thái thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const submitAddLine = async (e) => {
    e.preventDefault();
    const uomId = addLineForm.uom_id || (() => {
      const item = items.find(i => i._id === addLineForm.material_item_id);
      return item?.base_uom_id?._id ?? item?.base_uom_id ?? '';
    })();
    if (!detailId || !addLineForm.material_item_id || !addLineForm.qty_per_batch || !uomId) {
      alert('Vui lòng điền đủ: nguyên liệu, số lượng/lô, ĐVT.');
      return;
    }
    setCreating(true);
    try {
      const res = await workflowService.addRecipeLine(detailId, {
        material_item_id: addLineForm.material_item_id,
        qty_per_batch: Number(addLineForm.qty_per_batch) || 0,
        uom_id: uomId,
        scrap_rate: Math.min(1, Math.max(0, Number(addLineForm.scrap_rate) || 0)),
      });
      if (res.success) {
        setSuccess('Đã thêm nguyên liệu vào công thức.');
        setAddLineOpen(false);
        setAddLineForm({ material_item_id: '', qty_per_batch: 1, uom_id: '', scrap_rate: 0 });
        loadDetail(detailId);
      } else alert(res.message || 'Thêm dòng thất bại');
    } catch (err) {
      alert(err?.response?.data?.message || 'Thêm dòng thất bại');
    } finally {
      setCreating(false);
    }
  };

  const deleteLine = async (lineId) => {
    if (!detailId || !window.confirm('Xóa nguyên liệu này khỏi công thức?')) return;
    setActionLoadingId(lineId);
    try {
      const res = await workflowService.deleteRecipeLine(detailId, lineId);
      if (res.success) {
        setSuccess('Đã xóa nguyên liệu khỏi công thức.');
        loadDetail(detailId);
      } else alert(res.message || 'Xóa thất bại');
    } catch (err) {
      alert(err?.response?.data?.message || 'Xóa thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openEdit = () => {
    if (!detailRecipe) return;
    setEditForm({
      version: detailRecipe.version || '',
      status: detailRecipe.status || 'ACTIVE',
      effective_from: detailRecipe.effective_from ? new Date(detailRecipe.effective_from).toISOString().slice(0, 10) : '',
      effective_to: detailRecipe.effective_to ? new Date(detailRecipe.effective_to).toISOString().slice(0, 10) : '',
    });
    setEditOpen(true);
  };

  const submitUpdateRecipe = async (e) => {
    e.preventDefault();
    if (!detailId) return;
    setCreating(true);
    try {
      const payload = {
        version: editForm.version?.trim(),
        status: editForm.status,
        ...(editForm.effective_from ? { effective_from: new Date(editForm.effective_from).toISOString() } : {}),
        ...(editForm.effective_to ? { effective_to: new Date(editForm.effective_to).toISOString() } : {}),
      };
      const res = await workflowService.updateRecipe(detailId, payload);
      if (res.success) {
        setSuccess('Đã cập nhật công thức.');
        setEditOpen(false);
        loadDetail(detailId);
        loadRecipes(pagination.page).catch(() => {});
      } else alert(res.message || 'Cập nhật thất bại');
    } catch (err) {
      alert(err?.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className='min-h-full space-y-6 animate-fade-in'>
      {success && (
        <div className='flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className='text-xs text-emerald-700/70 hover:text-emerald-900'>Đóng</button>
        </div>
      )}

      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Công thức sản xuất</h1>
          <p className='mt-1 text-sm text-slate-500'>Quản lý công thức : tạo, sửa, thêm/xóa nguyên liệu. </p>
        </div>
        <div className='flex gap-2'>
          <button onClick={() => setCreateOpen(true)} className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'>
            <Plus className='h-4 w-4' /> Tạo công thức
          </button>
          <button onClick={() => loadRecipes(1)} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Tìm theo sản phẩm / version...' className='input-field w-full pl-9' />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className='input-field min-w-[160px]'>
          <option value='ALL'>Tất cả trạng thái</option>
          <option value='ACTIVE'>Đang dùng</option>
          <option value='INACTIVE'>Ngừng</option>
        </select>
      </div>

      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Sản phẩm</th>
              <th className='px-4 py-3'>Version</th>
              <th className='px-4 py-3'>Trạng thái</th>
              <th className='px-4 py-3'>Hiệu lực từ</th>
              <th className='px-4 py-3 text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && <tr><td colSpan={5} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td></tr>}
            {!loading && !filteredRecipes.length && <tr><td colSpan={5} className='px-4 py-6 text-center text-slate-400'>Chưa có công thức.</td></tr>}
            {!loading && filteredRecipes.map(r => (
              <tr key={r._id}>
                <td className='px-4 py-3 font-medium text-slate-900'>{getItemName(r.item_id)}</td>
                <td className='px-4 py-3 text-slate-700'>{r.version || '-'}</td>
                <td className='px-4 py-3'>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {RECIPE_STATUS[r.status] || r.status}
                  </span>
                </td>
                <td className='px-4 py-3 text-slate-700'>{r.effective_from ? new Date(r.effective_from).toLocaleDateString('vi-VN') : '-'}</td>
                <td className='px-4 py-3 text-right'>
                  <button onClick={() => loadDetail(r._id)} className='rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'>Chi tiết</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.total > 0 && (
        <div className='flex items-center justify-between text-sm text-slate-500'>
          <p>Hiển thị {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}</p>
          <div className='flex items-center gap-2'>
            <button type='button' onClick={() => loadRecipes(pagination.page - 1)} disabled={pagination.page <= 1} className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'>Trước</button>
            <span>Trang {pagination.page} / {Math.max(1, pagination.pages)}</span>
            <button type='button' onClick={() => loadRecipes(pagination.page + 1)} disabled={pagination.page >= Math.max(1, pagination.pages)} className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'>Sau</button>
          </div>
        </div>
      )}

      {/* Modal chi tiết công thức – render qua Portal để luôn căn giữa viewport */}
      {detailId && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => setDetailId(null)}>
          <div className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Chi tiết công thức</h2>
              <button onClick={() => setDetailId(null)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {!detailRecipe && !detailError && <p className='text-sm text-slate-500'>Đang tải...</p>}
            {detailError && <p className='text-sm text-red-600'>{detailError}</p>}
            {detailRecipe && (
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-2 text-sm'>
                  <span className='text-slate-500'>Sản phẩm:</span>
                  <span className='font-medium'>{getItemName(detailRecipe.item_id)}</span>
                  <span className='text-slate-500'>Version:</span>
                  <span>{detailRecipe.version}</span>
                  <span className='text-slate-500'>Trạng thái:</span>
                  <span>{RECIPE_STATUS[detailRecipe.status] || detailRecipe.status}</span>
                  <span className='text-slate-500'>Hiệu lực từ:</span>
                  <span>{detailRecipe.effective_from ? new Date(detailRecipe.effective_from).toLocaleDateString('vi-VN') : '-'}</span>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <button
                    disabled={actionLoadingId === detailRecipe._id}
                    onClick={() => toggleStatus(detailRecipe)}
                    className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'
                  >
                    Đổi trạng thái (ACTIVE ↔ INACTIVE)
                  </button>
                  <button onClick={openEdit} className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'>
                    Cập nhật công thức
                  </button>
                  <button onClick={() => { setAddLineOpen(true); loadItems(); }} className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600'>
                    Thêm nguyên liệu
                  </button>
                </div>
                {editOpen && (
                  <form onSubmit={submitUpdateRecipe} className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                    <h4 className='mb-2 text-sm font-medium'>Cập nhật thông tin công thức</h4>
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                      <div>
                        <label className='block text-xs text-slate-600'>Version</label>
                        <input value={editForm.version} onChange={e => setEditForm(p => ({ ...p, version: e.target.value }))} className='mt-1 w-full rounded border px-2 py-1 text-sm' required />
                      </div>
                      <div>
                        <label className='block text-xs text-slate-600'>Trạng thái</label>
                        <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} className='mt-1 w-full rounded border px-2 py-1 text-sm'>
                          <option value='ACTIVE'>ACTIVE</option>
                          <option value='INACTIVE'>INACTIVE</option>
                        </select>
                      </div>
                      <div>
                        <label className='block text-xs text-slate-600'>Hiệu lực từ</label>
                        <input type='date' value={editForm.effective_from} onChange={e => setEditForm(p => ({ ...p, effective_from: e.target.value }))} className='mt-1 w-full rounded border px-2 py-1 text-sm' />
                      </div>
                      <div>
                        <label className='block text-xs text-slate-600'>Hiệu lực đến (tùy chọn)</label>
                        <input type='date' value={editForm.effective_to} onChange={e => setEditForm(p => ({ ...p, effective_to: e.target.value }))} className='mt-1 w-full rounded border px-2 py-1 text-sm' />
                      </div>
                    </div>
                    <div className='mt-2 flex gap-2'>
                      <button type='submit' disabled={creating} className='rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-900 disabled:opacity-60'>Lưu</button>
                      <button type='button' onClick={() => setEditOpen(false)} className='rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600'>Hủy</button>
                    </div>
                  </form>
                )}
                <div>
                  <h3 className='mb-2 text-sm font-medium text-slate-700'>Nguyên liệu (dòng công thức)</h3>
                  <table className='w-full text-sm'>
                    <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                      <tr>
                        <th className='px-3 py-2'>Nguyên liệu</th>
                        <th className='px-3 py-2'>SL/lô</th>
                        <th className='px-3 py-2'>ĐVT</th>
                        <th className='px-3 py-2'>Hao hụt</th>
                        <th className='px-3 py-2 text-right'>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {(detailRecipe.lines || []).map((line) => (
                        <tr key={line._id}>
                          <td className='px-3 py-2'>{getItemName(line.material_item_id)}</td>
                          <td className='px-3 py-2'>{line.qty_per_batch ?? 0}</td>
                          <td className='px-3 py-2'>{line.uom_id?.code ?? line.uom_id?.name ?? line.uom_id}</td>
                          <td className='px-3 py-2'>{line.scrap_rate != null ? Number(line.scrap_rate) : 0}</td>
                          <td className='px-3 py-2 text-right'>
                            <button type='button' onClick={() => deleteLine(line._id)} disabled={actionLoadingId === line._id} className='text-red-500 hover:text-red-700 disabled:opacity-50'>
                              <Trash2 className='h-4 w-4 inline' />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {addLineOpen && (
                  <form onSubmit={submitAddLine} className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                    <h4 className='mb-2 text-sm font-medium'>Thêm nguyên liệu vào công thức</h4>
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                      <div>
                        <label className='block text-xs text-slate-600'>Nguyên liệu</label>
                        <select
                          value={addLineForm.material_item_id}
                          onChange={e => {
                            const id = e.target.value;
                            const item = items.find(i => i._id === id);
                            setAddLineForm(p => ({ ...p, material_item_id: id, uom_id: item?.base_uom_id?._id ?? item?.base_uom_id ?? '' }));
                          }}
                          className='mt-1 w-full rounded border px-2 py-1 text-sm'
                          required
                        >
                          <option value=''>Chọn nguyên liệu</option>
                          {items.map(i => <option key={i._id} value={i._id}>{getItemName(i)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className='block text-xs text-slate-600'>Số lượng/lô</label>
                        <input type='number' min={0.01} step={0.01} value={addLineForm.qty_per_batch} onChange={e => setAddLineForm(p => ({ ...p, qty_per_batch: e.target.value }))} className='mt-1 w-full rounded border px-2 py-1 text-sm' required />
                      </div>
                      <div>
                        <label className='block text-xs text-slate-600'>ĐVT</label>
                        <input
                          value={(() => {
                            const item = items.find(i => i._id === addLineForm.material_item_id);
                            const uom = item?.base_uom_id;
                            return (typeof uom === 'object' ? uom?.code : null) ?? addLineForm.uom_id ?? '-';
                          })()}
                          readOnly
                          className='mt-1 w-full rounded border border-slate-100 bg-slate-50 px-2 py-1 text-sm text-slate-600'
                        />
                      </div>
                      <div>
                        <label className='block text-xs text-slate-600'>Tỷ lệ hao hụt (0–1)</label>
                        <input type='number' min={0} max={1} step={0.01} value={addLineForm.scrap_rate} onChange={e => setAddLineForm(p => ({ ...p, scrap_rate: e.target.value }))} className='mt-1 w-full rounded border px-2 py-1 text-sm' />
                      </div>
                    </div>
                    <div className='mt-2 flex gap-2'>
                      <button type='submit' disabled={creating} className='rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-900 disabled:opacity-60'>Thêm</button>
                      <button type='button' onClick={() => setAddLineOpen(false)} className='rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600'>Đóng</button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Modal tạo công thức – render qua Portal */}
      {createOpen && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => !creating && setCreateOpen(false)}>
          <div className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Tạo công thức mới</h2>
              <button onClick={() => !creating && setCreateOpen(false)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {createError && <p className='mb-3 text-sm text-red-600'>{createError}</p>}
            <form onSubmit={submitCreate} className='space-y-4'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Sản phẩm (thành phẩm)</label>
                  <select value={newRecipe.item_id} onChange={e => setNewRecipe(p => ({ ...p, item_id: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm' required>
                    <option value=''>Chọn sản phẩm</option>
                    {finishedItems.map(i => (
                      <option key={i._id} value={i._id}>
                        {getItemName(i)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Version</label>
                  <input value={newRecipe.version} onChange={e => setNewRecipe(p => ({ ...p, version: e.target.value }))} placeholder='VD: 1.0' className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm' required />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Trạng thái</label>
                  <select value={newRecipe.status} onChange={e => setNewRecipe(p => ({ ...p, status: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'>
                    <option value='ACTIVE'>ACTIVE</option>
                    <option value='INACTIVE'>INACTIVE</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Hiệu lực từ</label>
                  <input type='date' value={newRecipe.effective_from} onChange={e => setNewRecipe(p => ({ ...p, effective_from: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm' />
                </div>
              </div>
              <div className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium text-slate-700'>Nguyên liệu (ít nhất 1 dòng)</span>
                  <button type='button' onClick={addNewLine} className='text-xs font-medium text-orange-600 hover:text-orange-700'>+ Thêm dòng</button>
                </div>
                {newRecipe.lines.map((line, idx) => (
                  <div key={idx} className='grid grid-cols-1 gap-2 rounded-lg bg-white p-3 sm:grid-cols-12'>
                    <div className='sm:col-span-4'>
                      <label className='block text-xs font-medium text-slate-600'>Nguyên liệu</label>
                      <select required value={line.material_item_id} onChange={e => handleNewLineChange(idx, 'material_item_id', e.target.value)} className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm'>
                        <option value=''>Chọn</option>
                        {items.map(i => <option key={i._id} value={i._id}>{getItemName(i)}</option>)}
                      </select>
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs font-medium text-slate-600'>SL/lô</label>
                      <input type='number' min={0.01} step={0.01} value={line.qty_per_batch} onChange={e => handleNewLineChange(idx, 'qty_per_batch', e.target.value)} className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm' required />
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs font-medium text-slate-600'>ĐVT</label>
                      <input value={items.find(i => i._id === line.material_item_id)?.base_uom_id?.code ?? ''} readOnly className='mt-1 h-9 w-full rounded-lg border border-slate-100 bg-slate-50 px-2 text-sm text-slate-500' />
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs font-medium text-slate-600'>Hao hụt (0–1)</label>
                      <input type='number' min={0} max={1} step={0.01} value={line.scrap_rate} onChange={e => handleNewLineChange(idx, 'scrap_rate', e.target.value)} className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm' />
                    </div>
                    <div className='flex items-end sm:col-span-2'>
                      {newRecipe.lines.length > 1 && <button type='button' onClick={() => removeNewLine(idx)} className='text-xs text-red-500 hover:text-red-600'>Xóa</button>}
                    </div>
                  </div>
                ))}
              </div>
              <div className='flex justify-end gap-2 border-t pt-4'>
                <button type='button' disabled={creating} onClick={() => setCreateOpen(false)} className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'>Hủy</button>
                <button type='submit' disabled={creating} className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60'>{creating ? 'Đang tạo...' : 'Tạo công thức'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
