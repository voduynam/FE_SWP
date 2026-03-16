import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Plus, RefreshCcw, Search } from 'lucide-react';
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
const DISCRETE_UOMS = ['PACK', 'UNIT', 'CARTON'];

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
  const [internalOrders, setInternalOrders] = useState([]);
  const [selectedIO, setSelectedIO] = useState(null);
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
  const [consumptionWarning, setConsumptionWarning] = useState(null);
  const [consumptionPendingData, setConsumptionPendingData] = useState(null);
  const [showOutput, setShowOutput] = useState(false);
  const [showCreateLotOutput, setShowCreateLotOutput] = useState(false);
  const [newLotForm, setNewLotForm] = useState({ lot_code: '', mfg_date: '', exp_date: '' });
  const [newLotSaving, setNewLotSaving] = useState(false);
  const [newLotError, setNewLotError] = useState('');

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
    const [rRes, iRes, ioRes] = await Promise.all([
      workflowService.getRecipes({ status: 'ACTIVE', limit: 100 }),
      workflowService.getItems({ status: 'ACTIVE', limit: 100 }),
      // Lấy các đơn hàng đã được phê duyệt hoặc đang xử lý để lập kế hoạch sản xuất
      workflowService.getInternalOrders({ status: 'APPROVED', limit: 50 }),
    ]);
    setRecipes(getList(rRes));
    const itemList = Array.isArray(iRes?.data) ? iRes.data : (iRes?.data?.data ?? []);
    setItems(Array.isArray(itemList) ? itemList : []);
    setInternalOrders(getList(ioRes));
  };

  useEffect(() => {
    loadOrders(1);
  }, [statusFilter]);

  const [searchParams] = useSearchParams();
  const [pendingInternalOrderId, setPendingInternalOrderId] = useState(null);

  useEffect(() => {
    const ioId = searchParams.get('io');
    if (ioId) {
      setPendingInternalOrderId(ioId);
      setCreateOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (createOpen) {
      setNewOrder({
        planned_start: getLocalDateTimeString(),
        planned_end: getLocalDateTimeString(),
        lines: [{ recipe_id: '', item_id: '', planned_qty: 1, uom_id: '' }],
      });
      setSelectedIO(null);
      (async () => {
        await loadRecipesAndItems();
        if (pendingInternalOrderId) {
          handleSelectInternalOrder(pendingInternalOrderId);
        }
      })();
    }
  }, [createOpen, pendingInternalOrderId]);

  const loadDetail = async id => {
    setDetailId(id);
    setDetailOrder(null);
    setDetailError(null);
    if (!id) return;
    const res = await workflowService.getProductionOrder(id);
    if (res.success && res.data) setDetailOrder(res.data);
    else setDetailError(res.message || 'Không tìm thấy lệnh sản xuất');
  };

  /** Nhãn đơn hàng: ưu tiên order_no (như Phiếu giao hàng); nếu BE chưa populate thì hiện id để còn thấy đơn liên kết */
  const getOrderLabel = (po) => {
    const io = po?.internal_order_id;
    if (!io) return '—';
    if (typeof io === 'object') return io.order_no || io._id || '—';
    return io;
  };

  const filteredOrders = useMemo(() => {
    const s = (search || '').toLowerCase();
    return orders.filter(o => {
      const orderNo = (o.prod_order_no || o._id || '').toLowerCase();
      const orderLabel = (getOrderLabel(o) || '').toLowerCase();
      return !s || orderNo.includes(s) || orderLabel.includes(s);
    });
  }, [orders, search]);

  const handleSelectInternalOrder = async (orderId) => {
    if (!orderId) {
      setSelectedIO(null);
      return;
    }

    const res = await workflowService.getInternalOrder(orderId);
    if (!res.success || !res.data) return;
    const io = res.data;
    const ioLines = io.lines || [];

    const withRecipe = [];
    const skipped = [];

    // Helper: luôn đảm bảo lấy đúng công thức ACTIVE từ BE nếu chưa có trong state
    const getActiveRecipeForItem = async (itemId) => {
      let recipe = recipes.find(r => (r.item_id?._id ?? r.item_id) === itemId && r.status === 'ACTIVE');
      if (recipe) return recipe;
      const rRes = await workflowService.getRecipes({ item_id: itemId, status: 'ACTIVE', limit: 1 });
      const list = Array.isArray(rRes.data?.data)
        ? rRes.data.data
        : Array.isArray(rRes.data)
          ? rRes.data
          : [];
      recipe = list[0];
      if (recipe) {
        // cache vào state để lần sau dùng lại
        setRecipes(prev => {
          const exists = prev.some(r => r._id === recipe._id);
          return exists ? prev : [...prev, recipe];
        });
      }
      return recipe || null;
    };

    for (const l of ioLines.filter(l => l.item_id)) {
      const itemId = l.item_id?._id ?? l.item_id;
      const itemName = l.item_id?.name ?? l.item_id?.sku ?? itemId;
      const recipe = await getActiveRecipeForItem(itemId);
      if (recipe) {
        const item =
          typeof l.item_id === 'object'
            ? l.item_id
            : items.find(i => i._id === itemId);
        withRecipe.push({
          recipe_id: recipe._id,
          item_id: itemId,
          planned_qty: l.qty_ordered ?? 1,
          uom_id: item?.base_uom_id?._id ?? item?.base_uom_id ?? l.uom_id?._id ?? l.uom_id ?? '',
        });
      } else {
        skipped.push({ id: itemId, name: itemName });
      }
    }

    const rawOnly =
      ioLines.length > 0 &&
      ioLines.every(l => {
        const item =
          typeof l.item_id === 'object'
            ? l.item_id
            : items.find(i => i._id === (l.item_id?._id ?? l.item_id));
        return (item?.item_type || '').toUpperCase() === 'RAW';
      });

    setSelectedIO({
      ...io,
      _skippedItems: skipped.map(s => s.name),
      _rawOnly: rawOnly,
    });

    if (withRecipe.length) {
      setNewOrder(prev => ({ ...prev, lines: withRecipe }));
    } else {
      // Không tự sinh lines nếu không tìm thấy công thức phù hợp
      setNewOrder(prev => ({ ...prev, lines: [] }));
    }
  };

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
      const payload = {
        planned_start: plannedStart,
        planned_end: plannedEnd,
        lines,
      };
      if (selectedIO?._id) payload.internal_order_id = selectedIO._id;
      const createRes = await workflowService.createProductionOrder(payload);
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

  const submitNewLotOutput = async e => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const line = detailOrder?.lines?.find(l => l._id === outputForm.prod_order_line_id);
    const itemId = line?.item_id?._id ?? line?.item_id;
    if (!itemId || !newLotForm.lot_code?.trim()) {
      setNewLotError('Vui lòng chọn dòng sản xuất và nhập mã lô.');
      return;
    }
    setNewLotSaving(true);
    setNewLotError('');
    try {
      const payload = {
        item_id: itemId,
        lot_code: newLotForm.lot_code.trim(),
        mfg_date: newLotForm.mfg_date || undefined,
        exp_date: newLotForm.exp_date || undefined,
      };
      const res = await workflowService.createLot(payload);
      if (res.success && res.data) {
        const createdId = res.data._id ?? res.data.data?._id;
        await loadLotsForItem(itemId);
        setOutputForm(prev => ({ ...prev, lot_id: createdId }));
        setShowCreateLotOutput(false);
        setNewLotForm({ lot_code: '', mfg_date: '', exp_date: '' });
        setSuccess('Đã tạo lô mới. Đã chọn lô trong danh sách.');
      } else {
        setNewLotError(res.message || 'Tạo lô thất bại');
      }
    } catch (err) {
      setNewLotError(err?.response?.data?.message || 'Tạo lô thất bại');
    } finally {
      setNewLotSaving(false);
    }
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

  const isOutputLineDiscreteUom = () => {
    const line = detailOrder?.lines?.find(l => l._id === outputForm.prod_order_line_id);
    const code = (line?.uom_id?.code ?? line?.uom_id ?? '').toString().toUpperCase();
    return DISCRETE_UOMS.includes(code);
  };

  const getOutputLinePlannedQty = () => {
    const line = detailOrder?.lines?.find(l => l._id === outputForm.prod_order_line_id);
    return Number(line?.planned_qty) || 0;
  };

  // Khi chọn Dòng sản xuất (đầu ra): tự điền uom_id từ dòng, load lots theo sản phẩm của dòng
  const onOutputLineChange = (lineId) => {
    const line = detailOrder?.lines?.find(l => l._id === lineId);
    const uomId = line?.uom_id?._id ?? line?.uom_id ?? '';
    const itemId = line?.item_id?._id ?? line?.item_id ?? '';
    const plannedQty = Number(line?.planned_qty) || 1;
    const code = (line?.uom_id?.code ?? line?.uom_id ?? '').toString().toUpperCase();
    const qty = DISCRETE_UOMS.includes(code) ? Math.max(1, Math.round(plannedQty)) : plannedQty;
    setOutputForm(prev => ({ ...prev, prod_order_line_id: lineId, uom_id: uomId, qty }));
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

    // Kiểm tra tồn kho trước khi ghi nhận (FE-only, tránh tạo tồn âm)
    const insufficient = [];
    for (const row of toSend) {
      const res = await workflowService.getInventoryBalances({
        item_id: row.material_item_id,
        ...(row.lot_id ? { lot_id: row.lot_id } : {}),
        limit: 50,
      });
      const list = Array.isArray(res?.data) ? res.data : [];
      const rawBalance = list.find(b => {
        const loc = b.location_id;
        const code = (loc?.code || '').toString();
        const name = (loc?.name || '').toString();
        if (!/RAW|nguyên liệu/i.test(code) && !/RAW|nguyên liệu/i.test(name)) return false;
        const balLotId = b.lot_id?._id ?? b.lot_id ?? null;
        const rowLotId = row.lot_id || null;
        return balLotId === rowLotId;
      });
      const onHand = rawBalance?.qty_on_hand ?? 0;
      if (onHand < row.qty) {
        const itemName = getItemName(recipeMaterials[row._idx]?.material_item_id) || row.material_item_id;
        insufficient.push({ item: itemName, onHand, need: row.qty });
      }
    }
    if (insufficient.length > 0) {
      const msg = insufficient.map(i => `${i.item}: tồn ${i.onHand}, cần ${i.need}`).join('\n');
      setConsumptionWarning(msg);
      setConsumptionPendingData({ toSend, insufficient });
      return;
    }

    doActualConsumption(toSend);
  };

  const doActualConsumption = async (toSend) => {
    setConsumptionWarning(null);
    setConsumptionPendingData(null);
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

  const confirmConsumptionAnyway = () => {
    if (consumptionPendingData?.toSend) {
      doActualConsumption(consumptionPendingData.toSend);
    }
  };

  const submitOutput = async e => {
    e.preventDefault();
    let qty = Number(outputForm.qty);
    if (!detailId || !outputForm.prod_order_line_id || !outputForm.lot_id || !outputForm.uom_id) {
      alert('Vui lòng điền đủ: dòng sản xuất, lô, số lượng, ĐVT.');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      alert('Số lượng đầu ra phải lớn hơn 0.');
      return;
    }
    if (isOutputLineDiscreteUom()) {
      qty = Math.round(qty);
      if (qty < 1) {
        alert('Số lượng đầu ra (đơn vị túi/cái) phải là số nguyên lớn hơn 0.');
        return;
      }
    }

    const plannedQty = getOutputLinePlannedQty();
    if (plannedQty > 0 && qty > plannedQty) {
      alert(`Số lượng đầu ra (${qty}) không được lớn hơn số lượng kế hoạch (${plannedQty}).`);
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

  const isLotExpired = (lot) => {
    const exp = lot?.exp_date ? new Date(lot.exp_date) : null;
    if (!exp || !exp.getTime()) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    return exp < today;
  };
  const formatLotLabel = (lot) => {
    const code = lot?.lot_code || lot?._id || '—';
    const exp = lot?.exp_date ? new Date(lot.exp_date).toLocaleDateString('vi-VN') : '';
    if (!exp) return code;
    return isLotExpired(lot) ? `${code} — Hết hạn ${exp}` : `${code} — HSD ${exp}`;
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Tìm theo số lệnh hoặc đơn hàng...' className='input-field w-full pl-9' />
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
              <th className='px-4 py-3'>Đơn hàng (nội bộ)</th>
              <th className='px-4 py-3'>Kế hoạch bắt đầu</th>
              <th className='px-4 py-3'>Kế hoạch kết thúc</th>
              <th className='px-4 py-3'>Trạng thái</th>
              <th className='px-4 py-3 text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && <tr><td colSpan={6} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td></tr>}
            {!loading && !filteredOrders.length && <tr><td colSpan={6} className='px-4 py-6 text-center text-slate-400'>Chưa có lệnh sản xuất.</td></tr>}
            {!loading && filteredOrders.map(o => (
              <tr key={o._id}>
                <td className='px-4 py-3 font-medium text-slate-900'>{o.prod_order_no || o._id}</td>
                <td className='px-4 py-3 text-slate-700'>
                  {(() => {
                    const ioId = typeof o.internal_order_id === 'object' ? o.internal_order_id?._id : o.internal_order_id;
                    const label = getOrderLabel(o);
                    if (!ioId) return <span className='text-slate-400'>—</span>;
                    return (
                      <Link to={ioId ? `/app/central/orders?highlight=${ioId}` : '#'} className='text-sky-600 hover:text-sky-800 hover:underline'>
                        {label}
                      </Link>
                    );
                  })()}
                </td>
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
                    <span className='text-slate-500'>Đơn hàng (nội bộ):</span>
                    <span>
                      {(() => {
                        const ioId = typeof detailOrder.internal_order_id === 'object' ? detailOrder.internal_order_id?._id : detailOrder.internal_order_id;
                        const label = getOrderLabel(detailOrder);
                        if (!ioId) return <span className='text-slate-400'>— Không liên kết</span>;
                        return (
                          <Link to={`/app/central/orders?highlight=${ioId}`} className='text-sky-600 hover:text-sky-800 hover:underline'>
                            {label}
                          </Link>
                        );
                      })()}
                    </span>
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
                {/* <div className='rounded-lg border border-slate-200 bg-white p-3'>
                  <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>Quy trình sản xuất</h3>
                  <ol className='space-y-1 text-sm'>
                    <li className={['DRAFT', 'PLANNED', 'IN_PROGRESS', 'DONE'].includes(detailOrder.status) ? 'text-slate-700' : 'text-slate-400'}>1. Lập kế hoạch (PLANNED) — Tạo lệnh với planned_start, planned_end, lines</li>
                    <li className={detailOrder.status === 'IN_PROGRESS' || detailOrder.status === 'DONE' ? 'text-slate-700' : 'text-slate-400'}>2. Bắt đầu sản xuất (IN_PROGRESS) — Ghi nhận actual_start</li>
                    <li className={detailOrder.status === 'IN_PROGRESS' || detailOrder.status === 'DONE' ? 'text-slate-700' : 'text-slate-400'}>3. Ghi nhận tiêu hao nguyên liệu — POST consumption (prod_order_line_id, material_item_id, lot_id, qty, uom_id)</li>
                    <li className={detailOrder.status === 'IN_PROGRESS' || detailOrder.status === 'DONE' ? 'text-slate-700' : 'text-slate-400'}>4. Ghi nhận sản phẩm đầu ra — POST output (prod_order_line_id, lot_id, qty, uom_id)</li>
                    <li className={detailOrder.status === 'DONE' ? 'text-slate-700' : 'text-slate-400'}>5. Hoàn thành (DONE) — Ghi nhận actual_end</li>
                  </ol>
                </div> */}

                {/* Nút thao tác theo trạng thái */}
                {['PLANNED', 'DRAFT'].includes(detailOrder.status) && (
                  <div className='flex flex-wrap gap-2'>
                    <button disabled={actionLoadingId === detailOrder._id} onClick={() => updateStatus(detailOrder, 'IN_PROGRESS')} className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60'>Bước 2: Bắt đầu sản xuất</button>
                    <button disabled={actionLoadingId === detailOrder._id} onClick={() => updateStatus(detailOrder, 'CANCELLED')} className='rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50'>Hủy lệnh</button>
                  </div>
                )}
                {detailOrder.status === 'IN_PROGRESS' && (() => {
                  const lines = detailOrder.lines || [];
                  const allHaveConsumption = lines.length > 0 && lines.every(l => (l.consumption?.length ?? 0) > 0);
                  const allHaveOutput = lines.length > 0 && lines.every(l => (l.output?.length ?? 0) > 0);
                  const canComplete = allHaveConsumption && allHaveOutput;
                  const missing = [];
                  if (!allHaveConsumption) missing.push('tiêu hao nguyên liệu (Bước 3)');
                  if (!allHaveOutput) missing.push('sản phẩm đầu ra (Bước 4)');
                  return (
                    <div className='space-y-2'>
                      <div className='flex flex-wrap gap-2'>
                        <button onClick={() => { setShowConsumption(true); setShowOutput(false); setConsumptionWarning(null); setConsumptionPendingData(null); }} className='rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50'>Bước 3: Ghi nhận tiêu hao nguyên liệu</button>
                        <button onClick={() => { setShowOutput(true); setShowConsumption(false); }} className='rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50'>Bước 4: Ghi nhận sản phẩm đầu ra</button>
                        <button
                          disabled={!canComplete || actionLoadingId === detailOrder._id}
                          onClick={() => updateStatus(detailOrder, 'DONE')}
                          className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed'
                        >
                          Bước 5: Hoàn thành sản xuất
                        </button>
                      </div>
                      {!canComplete && (
                        <p className='text-xs text-amber-600'>
                          Chưa thể hoàn thành — cần ghi nhận: {missing.join(' và ')}.
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div>
                  <h3 className='mb-2 text-sm font-medium text-slate-700'>Dòng sản xuất</h3>
                  <table className='w-full text-sm'>
                    <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                      <tr>
                        <th className='px-3 py-2'>Sản phẩm</th>
                        <th className='px-3 py-2'>Kế hoạch</th>
                        <th className='px-3 py-2'>Thực tế</th>
                        <th className='px-3 py-2'>Tiêu hao </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {(detailOrder.lines || []).map((line, idx) => (
                        <tr key={line._id || idx}>
                          <td className='px-3 py-2'>{getItemName(line.item_id)}</td>
                          <td className='px-3 py-2'>{line.planned_qty ?? 0}</td>
                          <td className='px-3 py-2'>{line.actual_qty ?? 0}</td>
                          <td className='px-3 py-2 text-xs'>Tiêu hao: {line.consumption?.length ?? 0} </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {showConsumption && (
                  <form onSubmit={submitConsumption} className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                    <h4 className='mb-2 text-sm font-medium'>Bước 3: Ghi nhận tiêu hao nguyên liệu (nhiều nguyên liệu cùng lúc)</h4>
                    <p className='mb-3 text-xs text-slate-500'>Chọn Dòng sản xuất → danh sách nguyên liệu từ công thức hiển thị bên dưới. Nhập số lượng tiêu hao (và lô nếu cần) cho từng dòng, rồi bấm Ghi nhận tất cả.</p>
                    {consumptionWarning && (
                      <div className='mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3'>
                        <p className='text-sm font-medium text-amber-800'>Không đủ tồn kho tại Kho Nguyên Liệu:</p>
                        <p className='mt-1 whitespace-pre-line text-sm text-amber-700'>{consumptionWarning}</p>
                        <p className='mt-2 text-xs text-amber-600'>Tiêu hao có thể tạo tồn âm.</p>
                        <div className='mt-3 flex gap-2'>
                          <button type='button' onClick={confirmConsumptionAnyway} disabled={creating} className='rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60'>Tiếp tục dù vậy</button>
                          <button type='button' onClick={() => { setConsumptionWarning(null); setConsumptionPendingData(null); }} className='rounded border border-amber-400 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-100'>Hủy</button>
                        </div>
                      </div>
                    )}
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
                                    {[...(lotsByItemId[row.material_item_id] || [])]
                                      .sort((a, b) => (isLotExpired(a) ? 1 : 0) - (isLotExpired(b) ? 1 : 0))
                                      .map(l => (
                                        <option key={l._id} value={l._id} disabled={isLotExpired(l)}>
                                          {formatLotLabel(l)}
                                        </option>
                                      ))}
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
                      <button type='button' onClick={() => { setShowConsumption(false); setConsumptionWarning(null); setConsumptionPendingData(null); }} className='rounded border border-slate-300 px-4 py-2 text-sm text-slate-600'>Đóng</button>
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
                        <div className='flex items-center justify-between'>
                          <label className='block text-xs text-slate-600'>Lô</label>
                          {outputForm.prod_order_line_id && (
                            <button
                              type='button'
                              onClick={() => {
                                const d = new Date();
                                const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                setShowCreateLotOutput(true);
                                setNewLotError('');
                                setNewLotForm({ lot_code: '', mfg_date: today, exp_date: '' });
                              }}
                              className='text-xs text-emerald-600 hover:text-emerald-700'
                            >
                              + Tạo lô mới
                            </button>
                          )}
                        </div>
                        <select value={outputForm.lot_id} onChange={e => setOutputForm(p => ({ ...p, lot_id: e.target.value }))} className='mt-1 w-full rounded border px-2 py-1 text-sm' required>
                          <option value=''>Chọn lô</option>
                          {[...lots]
                            .sort((a, b) => (isLotExpired(a) ? 1 : 0) - (isLotExpired(b) ? 1 : 0))
                            .map(l => (
                              <option key={l._id} value={l._id} disabled={isLotExpired(l)}>{formatLotLabel(l)}</option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className='block text-xs text-slate-600'>Số lượng</label>
                        <input
                          type='number'
                          min={isOutputLineDiscreteUom() ? 1 : 0.01}
                          step={isOutputLineDiscreteUom() ? 1 : 0.01}
                          value={outputForm.qty}
                          onChange={e => {
                            const v = e.target.value;
                            const num = Number(v);
                            const planned = getOutputLinePlannedQty();
                            if (isOutputLineDiscreteUom()) {
                              let rounded = Number.isFinite(num) ? Math.max(1, Math.round(num)) : 1;
                              if (planned > 0 && rounded > planned) rounded = planned;
                              setOutputForm(p => ({ ...p, qty: rounded }));
                            } else {
                              let val = num;
                              if (!Number.isFinite(val) || val <= 0) {
                                setOutputForm(p => ({ ...p, qty: '' }));
                                return;
                              }
                              if (planned > 0 && val > planned) val = planned;
                              setOutputForm(p => ({ ...p, qty: val }));
                            }
                          }}
                          className='mt-1 w-full rounded border px-2 py-1 text-sm'
                          required
                        />
                      </div>
                    </div>
                    {showCreateLotOutput && outputForm.prod_order_line_id && (() => {
                      const outLine = detailOrder.lines?.find(l => l._id === outputForm.prod_order_line_id);
                      return (
                        <div className='mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3'>
                          <h5 className='mb-2 text-xs font-semibold text-slate-700'>Tạo lô mới</h5>
                          {newLotError && <p className='mb-2 text-xs text-red-600'>{newLotError}</p>}
                          <div className='grid grid-cols-1 gap-2 sm:grid-cols-4'>
                            <div className='sm:col-span-2'>
                              <label className='block text-xs text-slate-600'>Sản phẩm</label>
                              <input readOnly value={getItemName(outLine?.item_id)} className='mt-1 w-full rounded border border-slate-100 bg-slate-50 px-2 py-1 text-sm text-slate-600' />
                            </div>
                            <div>
                              <label className='block text-xs text-slate-600'>Mã lô *</label>
                              <input value={newLotForm.lot_code} onChange={e => setNewLotForm(p => ({ ...p, lot_code: e.target.value }))} placeholder='VD: L-SAUCE-20260308-01' className='mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm' required />
                            </div>
                            <div>
                              <label className='block text-xs text-slate-600'>Ngày SX</label>
                              <input type='date' value={newLotForm.mfg_date} onChange={e => setNewLotForm(p => ({ ...p, mfg_date: e.target.value }))} className='mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm' />
                            </div>
                            <div>
                              <label className='block text-xs text-slate-600'>Hạn SD</label>
                              <input type='date' value={newLotForm.exp_date} onChange={e => setNewLotForm(p => ({ ...p, exp_date: e.target.value }))} className='mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm' />
                            </div>
                            <div className='flex gap-2 sm:col-span-4'>
                              <button type='button' disabled={newLotSaving} onClick={() => submitNewLotOutput({ preventDefault: () => {} })} className='rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-60'>{newLotSaving ? 'Đang tạo...' : 'Tạo lô'}</button>
                              <button type='button' onClick={() => { setShowCreateLotOutput(false); setNewLotError(''); }} className='rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600'>Hủy</button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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
            <p className='mb-3 text-xs text-slate-500'>Chọn đơn hàng nội bộ để tự động điền công thức và số lượng, hoặc tạo thủ công.</p>
            {createError && <p className='mb-3 text-sm text-red-600'>{createError}</p>}
            <form onSubmit={submitCreate} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700'>Đơn hàng nội bộ (đang xử lý)</label>
                <select
                  value={selectedIO?._id || ''}
                  onChange={e => handleSelectInternalOrder(e.target.value)}
                  className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'
                >
                  <option value=''>— Không liên kết (tạo thủ công) —</option>
                  {internalOrders.map(io => (
                    <option key={io._id} value={io._id}>
                      {io.order_no} — {io.store_org_unit_id?.name || 'N/A'} — {new Date(io.order_date).toLocaleDateString('vi-VN')}{io.is_urgent ? ' ⚡GẤP' : ''}
                    </option>
                  ))}
                </select>
                {selectedIO && (
                  <div className='mt-2 space-y-1'>
                    <div className='rounded-lg border border-blue-100 bg-blue-50 p-2 text-xs text-blue-700'>
                      <strong>Đơn {selectedIO.order_no}</strong> — {(selectedIO.lines || []).length} sản phẩm
                      — Tổng {Number(selectedIO.total_amount || 0).toLocaleString('vi-VN')} đ
                      {(selectedIO.lines || []).map((l, i) => {
                        const name = l.item_id?.name ?? l.item_id?.sku ?? l.item_id ?? '?';
                        return <span key={i}> | {name} x{l.qty_ordered}</span>;
                      })}
                    </div>
                    {selectedIO._skippedItems?.length > 0 && (
                      <div className='rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700'>
                        <strong>Sản phẩm chưa có công thức sản xuất:</strong> {selectedIO._skippedItems.join(', ')}
                        <span className='ml-1 text-amber-500'>— Cần tạo công thức trước khi lập kế hoạch sản xuất.</span>
                      </div>
                    )}
                    {selectedIO._rawOnly && (
                      <div className='mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800'>
                        <p className='font-medium'>Đơn này chỉ gồm nguyên liệu thô — không cần lập kế hoạch sản xuất.</p>
                        <p className='mt-1 text-xs'>Tạo phiếu giao hàng trực tiếp tại trang Phiếu giao hàng để xuất kho cho cửa hàng.</p>
                        <Link to='/app/central/shipments' className='mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700'>
                          Đi tới Phiếu giao hàng →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {newOrder.lines.length > 0 && (
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
              )}
              {newOrder.lines.length > 0 && (
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
              )}
              <div className='flex justify-end gap-2 border-t pt-4'>
                <button type='button' disabled={creating} onClick={() => setCreateOpen(false)} className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'>Hủy</button>
                {newOrder.lines.length > 0 && (
                <button type='submit' disabled={creating} className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60'>{creating ? 'Đang tạo...' : 'Tạo lệnh (PLANNED)'}</button>
                )}
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
