import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, RefreshCcw, Search } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

const PROD_STATUS = {
  DRAFT: 'Nháp',
  PLANNED: 'Kế hoạch',
  RELEASED: 'Đã phát hành',
  IN_PROGRESS: 'Đang sản xuất',
  DONE: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const PAGE_SIZE = 10;

/** Chuỗi ngày giờ local "yyyy-MM-ddThh:mm" cho datetime-local */
function getLocalDateTimeString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getList(res) {
  if (!res?.success || !res?.data) return [];
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

export default function CentralProductionPage() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [success, setSuccess] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [recipes, setRecipes] = useState([]);
  const [items, setItems] = useState([]);
  const [newOrder, setNewOrder] = useState({
    planned_start: getLocalDateTimeString(),
    planned_end: getLocalDateTimeString(),
    lines: [{ recipe_id: '', item_id: '', planned_qty: 1, uom_id: '' }],
  });

  const [consumptionForm, setConsumptionForm] = useState({ prod_order_line_id: '' });
  /** Sau khi chọn Dòng sản xuất: danh sách nguyên liệu từ công thức, mỗi dòng nhập qty + lot_id để ghi nhận cùng lúc */
  const [consumptionRows, setConsumptionRows] = useState([]);
  const [lotsByItemId, setLotsByItemId] = useState({});
  const [outputForm, setOutputForm] = useState({ prod_order_line_id: '', lot_id: '', qty: 0, uom_id: '' });
  const [lots, setLots] = useState([]);
  const [recipeMaterials, setRecipeMaterials] = useState([]);
  const [recipeMaterialsLoading, setRecipeMaterialsLoading] = useState(false);
  const [showConsumption, setShowConsumption] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const loadOrders = async (page = 1) => {
    setLoading(true);
    setSuccess('');
    try {
      const res = await workflowService.getProductionOrdersPaginated({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setOrders(list);
        const p = res.data.pagination ?? {};
        setPagination({
          page: p.page ?? page,
          limit: p.limit ?? PAGE_SIZE,
          total: p.total ?? 0,
          pages: p.pages ?? 1,
        });
      } else setOrders([]);
    } catch (e) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipesAndItems = async () => {
    const [rRes, iRes] = await Promise.all([
      workflowService.getRecipes({ status: 'ACTIVE', limit: 100 }),
      workflowService.getItems({ status: 'ACTIVE', limit: 100 }),
    ]);
    setRecipes(getList(rRes));
    const itemList = Array.isArray(iRes?.data) ? iRes.data : (iRes?.data?.data ?? []);
    setItems(Array.isArray(itemList) ? itemList : []);
  };

  useEffect(() => {
    loadOrders(1);
  }, [statusFilter]);

  useEffect(() => {
    if (createOpen) {
      setNewOrder({
        planned_start: getLocalDateTimeString(),
        planned_end: getLocalDateTimeString(),
        lines: [{ recipe_id: '', item_id: '', planned_qty: 1, uom_id: '' }],
      });
      loadRecipesAndItems();
    }
  }, [createOpen]);

  const loadDetail = async id => {
    setDetailId(id);
    setDetailOrder(null);
    setDetailError(null);
    if (!id) return;
    const res = await workflowService.getProductionOrder(id);
    if (res.success && res.data) setDetailOrder(res.data);
    else setDetailError(res.message || 'Không tìm thấy lệnh sản xuất');
  };

  const filteredOrders = useMemo(() => {
    const s = (search || '').toLowerCase();
    return orders.filter(o => (o.prod_order_no || o._id || '').toLowerCase().includes(s));
  }, [orders, search]);

  const handleLineChange = (idx, field, value) => {
    setNewOrder(prev => {
      const lines = [...prev.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      if (field === 'recipe_id') {
        const recipe = recipes.find(r => r._id === value);
        if (recipe) {
          const itemId = recipe.item_id?._id ?? recipe.item_id;
          const item = items.find(i => i._id === itemId);
          lines[idx].item_id = itemId;
          lines[idx].uom_id = item?.base_uom_id?._id ?? item?.base_uom_id ?? '';
        }
      }
      return { ...prev, lines };
    });
  };

  const addLine = () => setNewOrder(prev => ({ ...prev, lines: [...prev.lines, { recipe_id: '', item_id: '', planned_qty: 1, uom_id: '' }] }));
  const removeLine = idx => setNewOrder(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }));

  const submitCreate = async e => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const lines = newOrder.lines
        .filter(l => l.recipe_id && l.item_id && (l.planned_qty || 0) > 0)
        .map(l => ({
          item_id: l.item_id,
          recipe_id: l.recipe_id,
          planned_qty: Number(l.planned_qty) || 0,
          uom_id: l.uom_id,
        }));
      if (!lines.length) {
        setCreateError('Vui lòng thêm ít nhất 1 dòng với công thức và số lượng.');
        setCreating(false);
        return;
      }
      const plannedStart = new Date(newOrder.planned_start).toISOString();
      const plannedEnd = new Date(newOrder.planned_end).toISOString();
      if (new Date(plannedEnd) <= new Date(plannedStart)) {
        setCreateError('Thời gian kết thúc phải sau thời gian bắt đầu.');
        setCreating(false);
        return;
      }
      const createRes = await workflowService.createProductionOrder({
        planned_start: plannedStart,
        planned_end: plannedEnd,
        lines,
      });
      if (!createRes.success) {
        setCreateError(createRes.message || 'Tạo lệnh sản xuất thất bại');
        setCreating(false);
        return;
      }
      const orderId = createRes.data?._id ?? createRes.data?.data?._id;
      const statusRes = await workflowService.updateProductionOrderStatus(orderId, { status: 'PLANNED' });
      setCreateOpen(false);
      setSuccess(statusRes.success ? 'Đã lập kế hoạch sản xuất (PLANNED).' : 'Đã tạo lệnh sản xuất (DRAFT).');
      loadOrders(1).catch(() => {});
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'Có lỗi khi tạo');
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (order, newStatus, extra = {}) => {
    setActionLoadingId(order._id);
    setSuccess('');
    try {
      const payload = { status: newStatus, ...extra };
      if (newStatus === 'IN_PROGRESS' && !payload.actual_start) payload.actual_start = new Date().toISOString();
      if (newStatus === 'DONE' && !payload.actual_end) payload.actual_end = new Date().toISOString();
      const res = await workflowService.updateProductionOrderStatus(order._id, payload);
      if (res.success) {
        setDetailOrder(prev => (prev?._id === order._id ? { ...prev, status: newStatus, ...extra } : prev));
        setSuccess(`Đã cập nhật trạng thái: ${PROD_STATUS[newStatus] || newStatus}.`);
        loadOrders(pagination.page).catch(() => {});
      } else alert(res.message || 'Cập nhật thất bại');
    } catch (err) {
      alert(err?.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const loadLotsForItem = async itemId => {
    if (!itemId) { setLots([]); return; }
    const res = await workflowService.getLots({ item_id: itemId, limit: 50 });
    setLots(getList(res));
  };

  // Khi chọn Dòng sản xuất (tiêu hao): load công thức → hiển thị nhiều nguyên liệu cùng lúc (consumptionRows) + load lots từng loại
  useEffect(() => {
    if (!detailOrder?.lines || !consumptionForm.prod_order_line_id || !showConsumption) {
      setRecipeMaterials([]);
      setConsumptionRows([]);
      setLotsByItemId({});
      return;
    }
    const line = detailOrder.lines.find(l => l._id === consumptionForm.prod_order_line_id);
    const recipeId = line?.recipe_id?._id ?? line?.recipe_id;
    if (!recipeId) {
      setRecipeMaterials([]);
      setConsumptionRows([]);
      return;
    }
    let cancelled = false;
    setRecipeMaterialsLoading(true);
    setRecipeMaterials([]);
    setConsumptionRows([]);
    setLotsByItemId({});
    workflowService.getRecipe(recipeId).then(async res => {
      if (cancelled) return;
      setRecipeMaterialsLoading(false);
      if (!res.success || !res.data?.lines?.length) {
        setRecipeMaterials([]);
        setConsumptionRows([]);
        return;
      }
      const lines = res.data.lines;
      setRecipeMaterials(lines);
      const plannedQty = Number(line?.planned_qty) ?? 1;
      const rows = lines.map(m => {
        const matId = m.material_item_id?._id ?? m.material_item_id;
        const uomId = m.uom_id?._id ?? m.uom_id;
        const qtyPerBatch = Number(m.qty_per_batch) || 0;
        const qtySuggested = plannedQty * qtyPerBatch;
        return {
          material_item_id: matId,
          uom_id: uomId,
          qty_per_batch: qtyPerBatch,
          qty: qtySuggested,
          lot_id: '',
        };
      });
      setConsumptionRows(rows);
      const byId = {};
      await Promise.all(
        rows.map(async r => {
          const lotRes = await workflowService.getLots({ item_id: r.material_item_id, limit: 50 });
          if (cancelled) return;
          const list = Array.isArray(lotRes.data) ? lotRes.data : (lotRes.data?.data ?? []);
          byId[r.material_item_id] = list;
        })
      );
      if (!cancelled) setLotsByItemId(prev => ({ ...prev, ...byId }));
    });
    return () => { cancelled = true; };
  }, [consumptionForm.prod_order_line_id, detailOrder, showConsumption]);

  // Khi chọn Dòng sản xuất (đầu ra): tự điền uom_id từ dòng, load lots theo sản phẩm của dòng
  const onOutputLineChange = (lineId) => {
    const line = detailOrder?.lines?.find(l => l._id === lineId);
    const uomId = line?.uom_id?._id ?? line?.uom_id ?? '';
    const itemId = line?.item_id?._id ?? line?.item_id ?? '';
    setOutputForm(prev => ({ ...prev, prod_order_line_id: lineId, uom_id: uomId }));
    loadLotsForItem(itemId);
  };

  const setConsumptionRowQty = (idx, qty) => {
    setConsumptionRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], qty };
      return next;
    });
  };
  const setConsumptionRowLot = (idx, lot_id) => {
    setConsumptionRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], lot_id };
      return next;
    });
  };

  const submitConsumption = async e => {
    e.preventDefault();
    if (!detailId || !consumptionForm.prod_order_line_id) {
      alert('Vui lòng chọn Dòng sản xuất.');
      return;
    }
    const toSend = consumptionRows
      .map((r, i) => ({ ...r, qty: Number(r.qty), _idx: i }))
      .filter(r => Number.isFinite(r.qty) && r.qty > 0);
    if (!toSend.length) {
      alert('Nhập ít nhất một dòng có Số lượng tiêu hao > 0.');
      return;
    }
    setCreating(true);
    try {
      let ok = 0;
      let fail = 0;
      for (const row of toSend) {
        const payload = {
          prod_order_line_id: consumptionForm.prod_order_line_id,
          material_item_id: row.material_item_id,
          qty: row.qty,
          uom_id: row.uom_id,
        };
        if (row.lot_id) payload.lot_id = row.lot_id;
        const res = await workflowService.recordProductionConsumption(detailId, payload);
        if (res.success) ok++;
        else fail++;
      }
      setSuccess(fail === 0 ? `Đã ghi nhận tiêu hao ${ok} nguyên liệu.` : `Ghi nhận ${ok} thành công, ${fail} thất bại.`);
      setShowConsumption(false);
      setConsumptionForm({ prod_order_line_id: '' });
      setConsumptionRows([]);
      setLotsByItemId({});
      loadDetail(detailId);
    } catch (err) {
      alert(err?.response?.data?.message || 'Ghi nhận thất bại');
    } finally {
      setCreating(false);
    }
  };

  const submitOutput = async e => {
    e.preventDefault();
    const qty = Number(outputForm.qty);
    if (!detailId || !outputForm.prod_order_line_id || !outputForm.lot_id || !outputForm.uom_id) {
      alert('Vui lòng điền đủ: dòng sản xuất, lô, số lượng, ĐVT.');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      alert('Số lượng đầu ra phải lớn hơn 0.');
      return;
    }
    setCreating(true);
    try {
      const res = await workflowService.recordProductionOutput(detailId, {
        prod_order_line_id: outputForm.prod_order_line_id,
        lot_id: outputForm.lot_id,
        qty,
        uom_id: outputForm.uom_id,
      });
      if (res.success) {
        setSuccess('Đã ghi nhận sản phẩm đầu ra.');
        setShowOutput(false);
        setOutputForm({ prod_order_line_id: '', lot_id: '', qty: 0, uom_id: '' });
        loadDetail(detailId);
      } else alert(res.message || 'Ghi nhận thất bại');
    } catch (err) {
      alert(err?.response?.data?.message || 'Ghi nhận thất bại');
    } finally {
      setCreating(false);
    }
  };

  const getItemName = (obj) => (obj?.name ?? obj?.sku ?? obj?._id ?? obj ?? '-');

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
          <h1 className='text-2xl font-bold text-slate-900'>Sản xuất </h1>
          <p className='mt-1 text-sm text-slate-500'>
            Bếp trung tâm lập kế hoạch và thực hiện sản xuất theo công thức.
          </p>
        </div>
        <div className='flex gap-2'>
          <button onClick={() => setCreateOpen(true)} className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'>
            <Plus className='h-4 w-4' /> Lập kế hoạch sản xuất
          </button>
          <button onClick={() => loadOrders(1)} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Tìm theo số lệnh...' className='input-field w-full pl-9' />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className='input-field min-w-[180px]'>
          <option value='ALL'>Tất cả trạng thái</option>
          {Object.entries(PROD_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Số lệnh</th>
              <th className='px-4 py-3'>Kế hoạch bắt đầu</th>
              <th className='px-4 py-3'>Kế hoạch kết thúc</th>
              <th className='px-4 py-3'>Trạng thái</th>
              <th className='px-4 py-3 text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && <tr><td colSpan={5} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td></tr>}
            {!loading && !filteredOrders.length && <tr><td colSpan={5} className='px-4 py-6 text-center text-slate-400'>Chưa có lệnh sản xuất.</td></tr>}
            {!loading && filteredOrders.map(o => (
              <tr key={o._id}>
                <td className='px-4 py-3 font-medium text-slate-900'>{o.prod_order_no || o._id}</td>
                <td className='px-4 py-3 text-slate-700'>{o.planned_start ? new Date(o.planned_start).toLocaleString('vi-VN') : '-'}</td>
                <td className='px-4 py-3 text-slate-700'>{o.planned_end ? new Date(o.planned_end).toLocaleString('vi-VN') : '-'}</td>
                <td className='px-4 py-3'>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${o.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : o.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : o.status === 'PLANNED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                    {PROD_STATUS[o.status] || o.status}
                  </span>
                </td>
                <td className='px-4 py-3 text-right'>
                  <button onClick={() => loadDetail(o._id)} className='rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'>Chi tiết</button>
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
            <button type='button' onClick={() => loadOrders(pagination.page - 1)} disabled={pagination.page <= 1} className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'>Trước</button>
            <span>Trang {pagination.page} / {Math.max(1, pagination.pages)}</span>
            <button type='button' onClick={() => loadOrders(pagination.page + 1)} disabled={pagination.page >= Math.max(1, pagination.pages)} className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'>Sau</button>
          </div>
        </div>
      )}

      {/* Modal chi tiết – render qua Portal để luôn căn giữa viewport */}
      {detailId && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => setDetailId(null)}>
          <div className='w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Chi tiết lệnh sản xuất</h2>
              <button onClick={() => setDetailId(null)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {!detailOrder && !detailError && <p className='text-sm text-slate-500'>Đang tải...</p>}
            {detailError && <p className='text-sm text-red-600'>{detailError}</p>}
            {detailOrder && (
              <div className='space-y-4'>
                {/* Thông tin lệnh + thời gian */}
                <div className='rounded-lg border border-slate-200 bg-slate-50/50 p-3'>
                  <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>Thông tin lệnh</h3>
                  <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-sm'>
                    <span className='text-slate-500'>Số lệnh:</span>
                    <span className='font-medium text-slate-900'>{detailOrder.prod_order_no || detailOrder._id}</span>
                    <span className='text-slate-500'>Trạng thái:</span>
                    <span><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${detailOrder.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : detailOrder.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : detailOrder.status === 'PLANNED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{PROD_STATUS[detailOrder.status] || detailOrder.status}</span></span>
                    <span className='text-slate-500'>Kế hoạch bắt đầu:</span>
                    <span>{detailOrder.planned_start ? new Date(detailOrder.planned_start).toLocaleString('vi-VN') : '-'}</span>
                    <span className='text-slate-500'>Kế hoạch kết thúc:</span>
                    <span>{detailOrder.planned_end ? new Date(detailOrder.planned_end).toLocaleString('vi-VN') : '-'}</span>
                    <span className='text-slate-500'>Thực tế bắt đầu:</span>
                    <span>{detailOrder.actual_start ? new Date(detailOrder.actual_start).toLocaleString('vi-VN') : '—'}</span>
                    <span className='text-slate-500'>Thực tế kết thúc:</span>
                    <span>{detailOrder.actual_end ? new Date(detailOrder.actual_end).toLocaleString('vi-VN') : '—'}</span>
                  </div>
                </div>

                {/* Quy trình 5 bước – hiển thị bước hiện tại */}
                <div className='rounded-lg border border-slate-200 bg-white p-3'>
                  <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>Quy trình sản xuất</h3>
                  <ol className='space-y-1 text-sm'>
                    <li className={['DRAFT', 'PLANNED', 'IN_PROGRESS', 'DONE'].includes(detailOrder.status) ? 'text-slate-700' : 'text-slate-400'}>1. Lập kế hoạch (PLANNED) — Tạo lệnh với planned_start, planned_end, lines</li>
                    <li className={detailOrder.status === 'IN_PROGRESS' || detailOrder.status === 'DONE' ? 'text-slate-700' : 'text-slate-400'}>2. Bắt đầu sản xuất (IN_PROGRESS) — Ghi nhận actual_start</li>
                    <li className={detailOrder.status === 'IN_PROGRESS' || detailOrder.status === 'DONE' ? 'text-slate-700' : 'text-slate-400'}>3. Ghi nhận tiêu hao nguyên liệu — POST consumption (prod_order_line_id, material_item_id, lot_id, qty, uom_id)</li>
                    <li className={detailOrder.status === 'IN_PROGRESS' || detailOrder.status === 'DONE' ? 'text-slate-700' : 'text-slate-400'}>4. Ghi nhận sản phẩm đầu ra — POST output (prod_order_line_id, lot_id, qty, uom_id)</li>
                    <li className={detailOrder.status === 'DONE' ? 'text-slate-700' : 'text-slate-400'}>5. Hoàn thành (DONE) — Ghi nhận actual_end</li>
                  </ol>
                </div>

                {/* Nút thao tác theo trạng thái */}
                {['PLANNED', 'DRAFT'].includes(detailOrder.status) && (
                  <div className='flex flex-wrap gap-2'>
                    <button disabled={actionLoadingId === detailOrder._id} onClick={() => updateStatus(detailOrder, 'IN_PROGRESS')} className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60'>Bước 2: Bắt đầu sản xuất</button>
                    <button disabled={actionLoadingId === detailOrder._id} onClick={() => updateStatus(detailOrder, 'CANCELLED')} className='rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50'>Hủy lệnh</button>
                  </div>
                )}
                {detailOrder.status === 'IN_PROGRESS' && (
                  <div className='flex flex-wrap gap-2'>
                    <button disabled={actionLoadingId === detailOrder._id} onClick={() => updateStatus(detailOrder, 'DONE')} className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'>Bước 5: Hoàn thành sản xuất</button>
                    <button onClick={() => { setShowConsumption(true); setShowOutput(false); }} className='rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50'>Bước 3: Ghi nhận tiêu hao nguyên liệu</button>
                    <button onClick={() => { setShowOutput(true); setShowConsumption(false); }} className='rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50'>Bước 4: Ghi nhận sản phẩm đầu ra</button>
                  </div>
                )}

                <div>
                  <h3 className='mb-2 text-sm font-medium text-slate-700'>Dòng sản xuất</h3>
                  <table className='w-full text-sm'>
                    <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                      <tr>
                        <th className='px-3 py-2'>Sản phẩm</th>
                        <th className='px-3 py-2'>Kế hoạch</th>
                        <th className='px-3 py-2'>Thực tế</th>
                        <th className='px-3 py-2'>Tiêu hao / Đầu ra</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {(detailOrder.lines || []).map((line, idx) => (
                        <tr key={line._id || idx}>
                          <td className='px-3 py-2'>{getItemName(line.item_id)}</td>
                          <td className='px-3 py-2'>{line.planned_qty ?? 0}</td>
                          <td className='px-3 py-2'>{line.actual_qty ?? 0}</td>
                          <td className='px-3 py-2 text-xs'>Tiêu hao: {line.consumption?.length ?? 0} | Đầu ra: {line.output?.length ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {showConsumption && (
                  <form onSubmit={submitConsumption} className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                    <h4 className='mb-2 text-sm font-medium'>Bước 3: Ghi nhận tiêu hao nguyên liệu (nhiều nguyên liệu cùng lúc)</h4>
                    <p className='mb-3 text-xs text-slate-500'>Chọn Dòng sản xuất → danh sách nguyên liệu từ công thức hiển thị bên dưới. Nhập số lượng tiêu hao (và lô nếu cần) cho từng dòng, rồi bấm Ghi nhận tất cả.</p>
                    <div className='mb-3'>
                      <label className='block text-xs font-medium text-slate-600'>Dòng sản xuất</label>
                      <select value={consumptionForm.prod_order_line_id} onChange={e => setConsumptionForm(p => ({ ...p, prod_order_line_id: e.target.value }))} className='mt-1 w-full max-w-md rounded border border-slate-200 px-2 py-1.5 text-sm' required>
                        <option value=''>Chọn dòng sản xuất</option>
                        {(detailOrder.lines || []).map(l => <option key={l._id} value={l._id}>{getItemName(l.item_id)} (kế hoạch: {l.planned_qty ?? 0})</option>)}
                      </select>
                    </div>
                    {recipeMaterialsLoading && <p className='mb-2 text-sm text-slate-500'>Đang tải nguyên liệu từ công thức...</p>}
                    {!recipeMaterialsLoading && consumptionRows.length > 0 && (
                      <div className='overflow-x-auto rounded-lg border border-slate-200 bg-white'>
                        <table className='w-full text-sm'>
                          <thead className='bg-slate-50 text-left text-xs text-slate-600'>
                            <tr>
                              <th className='px-3 py-2'>Nguyên liệu</th>
                              <th className='px-3 py-2'>ĐVT</th>
                              <th className='px-3 py-2'>SL theo công thức/lô</th>
                              <th className='px-3 py-2'>SL tiêu hao</th>
                              <th className='px-3 py-2'>Lô (tùy chọn)</th>
                            </tr>
                          </thead>
                          <tbody className='divide-y divide-slate-100'>
                            {consumptionRows.map((row, idx) => (
                              <tr key={row.material_item_id || idx}>
                                <td className='px-3 py-2 font-medium text-slate-800'>{getItemName(recipeMaterials[idx]?.material_item_id)}</td>
                                <td className='px-3 py-2 text-slate-600'>{recipeMaterials[idx]?.uom_id?.code ?? recipeMaterials[idx]?.uom_id?.name ?? row.uom_id ?? '—'}</td>
                                <td className='px-3 py-2 text-slate-600'>{row.qty_per_batch ?? 0}</td>
                                <td className='px-3 py-2'>
                                  <input type='number' min={0} step={0.01} value={row.qty} onChange={e => setConsumptionRowQty(idx, e.target.value)} className='w-24 rounded border border-slate-200 px-2 py-1 text-sm' />
                                </td>
                                <td className='px-3 py-2'>
                                  <select value={row.lot_id} onChange={e => setConsumptionRowLot(idx, e.target.value)} className='min-w-[120px] rounded border border-slate-200 px-2 py-1 text-sm'>
                                    <option value=''>—</option>
                                    {(lotsByItemId[row.material_item_id] || []).map(l => <option key={l._id} value={l._id}>{l.lot_code || l._id}</option>)}
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {!recipeMaterialsLoading && consumptionForm.prod_order_line_id && consumptionRows.length === 0 && <p className='mb-2 text-sm text-amber-600'>Công thức không có nguyên liệu.</p>}
                    <div className='mt-3 flex gap-2'>
                      <button type='submit' disabled={creating || consumptionRows.length === 0} className='rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60'>Ghi nhận tất cả</button>
                      <button type='button' onClick={() => setShowConsumption(false)} className='rounded border border-slate-300 px-4 py-2 text-sm text-slate-600'>Đóng</button>
                    </div>
                  </form>
                )}

                {showOutput && (
                  <form onSubmit={submitOutput} className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                    <h4 className='mb-2 text-sm font-medium'>Ghi nhận sản phẩm đầu ra</h4>
                    <p className='mb-3 text-xs text-slate-500'>Chọn Dòng sản xuất → ĐVT tự điền theo sản phẩm, chọn Lô (theo sản phẩm).</p>
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                      <div>
                        <label className='block text-xs text-slate-600'>Dòng sản xuất</label>
                        <select value={outputForm.prod_order_line_id} onChange={e => onOutputLineChange(e.target.value)} className='mt-1 w-full rounded border px-2 py-1 text-sm' required>
                          <option value=''>Chọn dòng</option>
                          {(detailOrder.lines || []).map(l => <option key={l._id} value={l._id}>{getItemName(l.item_id)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className='block text-xs text-slate-600'>ĐVT</label>
                        <input
                          value={(() => {
                            const line = detailOrder.lines?.find(l => l._id === outputForm.prod_order_line_id);
                            return line ? (line.uom_id?.code ?? line.uom_id?.name ?? outputForm.uom_id) : outputForm.uom_id || '—';
                          })()}
                          readOnly
                          className='mt-1 w-full rounded border border-slate-100 bg-slate-50 px-2 py-1 text-sm text-slate-600'
                        />
                      </div>
                      <div>
                        <label className='block text-xs text-slate-600'>Lô</label>
                        <select value={outputForm.lot_id} onChange={e => setOutputForm(p => ({ ...p, lot_id: e.target.value }))} className='mt-1 w-full rounded border px-2 py-1 text-sm' required>
                          <option value=''>Chọn lô</option>
                          {lots.map(l => <option key={l._id} value={l._id}>{l.lot_code || l._id}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className='block text-xs text-slate-600'>Số lượng</label>
                        <input type='number' min={0.01} step={0.01} value={outputForm.qty} onChange={e => setOutputForm(p => ({ ...p, qty: e.target.value }))} className='mt-1 w-full rounded border px-2 py-1 text-sm' required />
                      </div>
                    </div>
                    <div className='mt-2 flex gap-2'>
                      <button type='submit' disabled={creating} className='rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-900 disabled:opacity-60'>Ghi nhận</button>
                      <button type='button' onClick={() => setShowOutput(false)} className='rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600'>Đóng</button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Modal tạo lệnh sản xuất – render qua Portal */}
      {createOpen && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => !creating && setCreateOpen(false)}>
          <div className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Bước 1: Lập kế hoạch sản xuất</h2>
              <button onClick={() => !creating && setCreateOpen(false)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            <p className='mb-3 text-xs text-slate-500'>POST planned_start, planned_end, lines[] (item_id, recipe_id, planned_qty). Chỉ công thức ACTIVE. Tạo xong lệnh sẽ được đặt trạng thái PLANNED.</p>
            {createError && <p className='mb-3 text-sm text-red-600'>{createError}</p>}
            <form onSubmit={submitCreate} className='space-y-4'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Kế hoạch bắt đầu</label>
                  <input type='datetime-local' value={newOrder.planned_start} onChange={e => setNewOrder(p => ({ ...p, planned_start: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm' required />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Kế hoạch kết thúc</label>
                  <input type='datetime-local' value={newOrder.planned_end} onChange={e => setNewOrder(p => ({ ...p, planned_end: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm' required />
                </div>
              </div>
              <div className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium text-slate-700'>Dòng sản xuất — lines[] (item_id, recipe_id, planned_qty, uom_id)</span>
                  <button type='button' onClick={addLine} className='text-xs font-medium text-orange-600 hover:text-orange-700'>+ Thêm dòng</button>
                </div>
                {newOrder.lines.map((line, idx) => (
                  <div key={idx} className='grid grid-cols-1 gap-2 rounded-lg bg-white p-3 sm:grid-cols-12'>
                    <div className='sm:col-span-5'>
                      <label className='block text-xs font-medium text-slate-600'>Công thức</label>
                      <select required value={line.recipe_id} onChange={e => handleLineChange(idx, 'recipe_id', e.target.value)} className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm'>
                        <option value=''>Chọn công thức</option>
                        {recipes.map(r => (
                          <option key={r._id} value={r._id}>
                            {getItemName(r.item_id)} (v{r.version})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className='sm:col-span-3'>
                      <label className='block text-xs font-medium text-slate-600'>Số lượng kế hoạch</label>
                      <input type='number' min={0.01} step={0.01} value={line.planned_qty} onChange={e => handleLineChange(idx, 'planned_qty', e.target.value)} className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm' required />
                    </div>
                    <div className='sm:col-span-3'>
                      <label className='block text-xs font-medium text-slate-600'>ĐVT</label>
                      <input value={items.find(i => i._id === line.item_id)?.base_uom_id?.code ?? line.uom_id} readOnly className='mt-1 h-9 w-full rounded-lg border border-slate-100 bg-slate-50 px-2 text-sm text-slate-500' />
                    </div>
                    <div className='flex items-end sm:col-span-1'>
                      {newOrder.lines.length > 1 && <button type='button' onClick={() => removeLine(idx)} className='text-xs text-red-500 hover:text-red-600'>Xóa</button>}
                    </div>
                  </div>
                ))}
              </div>
              <div className='flex justify-end gap-2 border-t pt-4'>
                <button type='button' disabled={creating} onClick={() => setCreateOpen(false)} className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'>Hủy</button>
                <button type='submit' disabled={creating} className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60'>{creating ? 'Đang tạo...' : 'Tạo lệnh (PLANNED)'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
