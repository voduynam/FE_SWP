import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Plus, RefreshCcw, Search } from 'lucide-react';
import { workflowService } from '../../services/workflowService';
import { resolvePhotoUrl } from '../../utils/photoHelpers';

const SHIPMENT_STATUS = {
  DRAFT: 'Nháp',
  PICKED: 'Đã lấy hàng',
  SHIPPED: 'Đã xuất kho',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao đến',
  CANCELLED: 'Đã hủy',
};

const statusColor = {
  DRAFT: 'bg-amber-100 text-amber-700',
  PICKED: 'bg-sky-100 text-sky-700',
  SHIPPED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

const ORDER_STATUS_FOR_SHIPMENT = ['APPROVED', 'PROCESSING'];

const PAGE_SIZE = 10;

function getList(res) {
  if (!res?.success) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  if (Array.isArray(res.data?.items)) return res.data.items;
  return [];
}

/** Lấy mảng org units từ response getOrgUnits (nhiều dạng: getList, .data, .data.data, .data.items) */
function getOrgUnitList(res) {
  const list = getList(res);
  if (list.length) return list;
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.items)) return d.items;
  return [];
}

/** Location kho cửa hàng do seed tạo (org_store_q1 + loc_str_q1). Dùng làm option tổng hợp khi GET locations không trả kho cửa hàng. */
const SEED_STORE_LOCATION = {
  _id: 'loc_str_q1',
  name: 'Kho Q1',
  code: 'WH_STR_Q1',
  org_unit_id: 'org_store_q1',
};

const VALID_STATUSES = ['ALL', 'DRAFT', 'PICKED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

export default function CentralShipmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFromUrl = searchParams.get('status');
  const [shipments, setShipments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(() => (VALID_STATUSES.includes(statusFromUrl) ? statusFromUrl : 'ALL'));
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState('');

  // Detail modal
  const [detailId, setDetailId] = useState(null);
  const [detailShipment, setDetailShipment] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [imageError, setImageError] = useState(false);
  /** Order ids (internal_order_id) có lệnh sản xuất DONE — dùng để chỉ hiện nút "Chuyển sang Đã lấy hàng" với phiếu DRAFT đã sản xuất */
  const [doneProductionOrderIds, setDoneProductionOrderIds] = useState(() => new Set());

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Create form state
  const [createDataLoading, setCreateDataLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [fromLocations, setFromLocations] = useState([]);
  const [toLocations, setToLocations] = useState([]);
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [shipDate, setShipDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [shipLines, setShipLines] = useState([]);
  const [lotsByItemId, setLotsByItemId] = useState({});
  const [lotsLoading, setLotsLoading] = useState(false);

  /* ─── Load shipment list + danh sách đơn đã sản xuất (DONE). Sync chạy song song, không chặn list. ─── */
  const loadShipments = async (page = 1) => {
    setLoading(true);
    setSuccess('');
    try {
      const [res, poRes] = await Promise.all([
        workflowService.getShipmentsPaginated({
          page,
          limit: PAGE_SIZE,
          ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        }),
        workflowService.getProductionOrders({ status: 'DONE', limit: 500 }),
        workflowService.syncShipmentsPickedFromProduction().catch(() => ({})),
      ]);
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setShipments(list);
        const p = res.data.pagination ?? {};
        setPagination({ page: p.page ?? page, limit: p.limit ?? PAGE_SIZE, total: p.total ?? 0, pages: p.pages ?? 1 });
      } else {
        setShipments([]);
      }
      let ids = new Set();
      try {
        const poList = Array.isArray(poRes?.data) ? poRes.data : (Array.isArray(poRes?.data?.data) ? poRes.data.data : []);
        poList.forEach(po => {
          const id = po?.internal_order_id ?? po?.order_id;
          if (id) ids.add(String(id));
        });
      } catch (_) {
        // Bỏ qua nếu parse production orders lỗi
      }
      setDoneProductionOrderIds(ids);

      const list = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
      const getShipmentOrderId = (sh) => String(sh?.order_id?._id ?? sh?.order_id ?? '');
      const toAutoPick = list.filter(sh => sh?.status === 'DRAFT' && ids.has(getShipmentOrderId(sh)));
      if (toAutoPick.length > 0) {
        const toAutoPickIds = new Set(toAutoPick.map(sh => sh._id));
        Promise.all(toAutoPick.map(sh => workflowService.updateShipmentStatus(sh._id, 'PICKED')))
          .then(() => {
            setShipments(prev => prev.map(sh => (toAutoPickIds.has(sh._id) ? { ...sh, status: 'PICKED' } : sh)));
          })
          .catch(() => {});
      }
    } catch {
      setShipments([]);
      setDoneProductionOrderIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const s = searchParams.get('status');
    if (s && VALID_STATUSES.includes(s) && s !== statusFilter) setStatusFilter(s);
  }, [searchParams]);

  useEffect(() => { loadShipments(1); }, [statusFilter]);

  /* ─── Mở modal tạo phiếu với đơn đã chọn khi vào trang bằng link từ duyệt đơn ─── */
  useEffect(() => {
    const create = searchParams.get('create');
    const orderId = searchParams.get('orderId');
    if (create === '1' && orderId) {
      setCreateOpen(true);
      setSelectedOrderId(orderId);
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('create');
        next.delete('orderId');
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  /* ─── Detail ─── */
  const loadDetail = async id => {
    setDetailId(id);
    setDetailShipment(null);
    setDetailError(null);
    setImageError(false);
    if (!id) return;
    const res = await workflowService.getShipment(id);
    if (res.success && res.data) setDetailShipment(res.data);
    else setDetailError(res.message || 'Không tìm thấy lô hàng');
  };

  /* ─── Status update ─── */
  const updateStatus = async (shipment, newStatus) => {
    setActionLoadingId(shipment._id);
    setSuccess('');
    try {
      const res = await workflowService.updateShipmentStatus(shipment._id, newStatus);
      if (res.success) {
        setSuccess(`Đã cập nhật trạng thái: ${SHIPMENT_STATUS[newStatus] || newStatus}`);
        setDetailShipment(prev => (prev?._id === shipment._id ? { ...prev, status: newStatus } : prev));
        loadShipments(pagination.page);
      } else {
        alert(res.message || 'Cập nhật thất bại');
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  /* ─── Dispatch: xuất kho, trừ inventory, order → SHIPPED ─── */
  const handleDispatch = async shipment => {
    setActionLoadingId(shipment._id);
    setSuccess('');
    setDetailError(null);
    try {
      const res = await workflowService.dispatchShipment(shipment._id);
      if (res.success) {
        setSuccess('Đã xuất kho thành công. Tồn kho bếp trung tâm đã trừ, đơn hàng chuyển SHIPPED.');
        setDetailShipment(prev => (prev?._id === shipment._id ? { ...prev, status: 'SHIPPED' } : prev));
        loadShipments(pagination.page);
      } else {
        setDetailError(res.message || 'Xuất kho thất bại');
      }
    } catch (err) {
      setDetailError(err?.response?.data?.message || err?.message || 'Xuất kho thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  /* ─── Search / filter ─── */
  const filteredShipments = useMemo(() => {
    const list = Array.isArray(shipments) ? shipments : [];
    const s = (search || '').toLowerCase();
    return list.filter(sh => {
      const no = sh?.shipment_no || sh?._id || '';
      const orderNo = sh?.order_id?.order_no || sh?.order_id || '';
      return !s || String(no).toLowerCase().includes(s) || String(orderNo).toLowerCase().includes(s);
    });
  }, [shipments, search]);

  /* ─── Create: kho xuất = KITCHEN; kho nhận = kho KITCHEN + kho STORE (gọi rõ theo org), bỏ trùng _id.
      Cần BE getLocations: khi có org_unit_id thì trả kho thuộc org đó (CHEF/Supply xem được kho cửa hàng).
      Nếu BE luôn filter theo user org thì kho cửa hàng sẽ không bao giờ hiện. ─── */
  useEffect(() => {
    if (!createOpen) return;
    setCreateError('');
    setOrderDetail(null);
    setShipLines([]);
    setLotsByItemId({});
    setCreateDataLoading(true);
    const loadData = async () => {
      try {
        // Gọi seed trước, lưu response để merge kho cửa hàng (created.locations) vào dropdown Kho nhận
        const seedRes = await workflowService.seedStoreLocations();
        const seedLocs = Array.isArray(seedRes?.data?.locations) ? seedRes.data.locations : [];
        // Chỉ gọi getLocations KHÔNG truyền org_unit_id → BE trả về tất cả kho (bếp + cửa hàng). status=ACTIVE đồng bộ với API.
        const [approvedRes, processingRes, orgKitchenRes, orgStoreRes, allLocsRes, shipmentsRes] = await Promise.all([
          workflowService.getInternalOrders({ status: 'APPROVED', limit: 100 }),
          workflowService.getInternalOrders({ status: 'PROCESSING', limit: 100 }),
          workflowService.getOrgUnits({ type: 'KITCHEN', limit: 100 }),
          workflowService.getOrgUnits({ type: 'STORE', limit: 100 }),
          workflowService.getLocations({ status: 'ACTIVE', limit: 1000 }),
          workflowService.getShipmentsPaginated({ limit: 200 }),
        ]);
        const combinedOrders = [...getList(approvedRes), ...getList(processingRes)];
        let orderIdsWithShipment = new Set();
        try {
          const shipData = shipmentsRes?.data?.data ?? shipmentsRes?.data ?? [];
          const shipList = Array.isArray(shipData) ? shipData : [];
          orderIdsWithShipment = new Set(shipList.map(s => String(s?.order_id?._id ?? s?.order_id)).filter(Boolean));
        } catch (_) {
          // Bỏ qua nếu parse shipments lỗi
        }
        const ordersWithoutShipment = combinedOrders.filter(o => !orderIdsWithShipment.has(String(o._id)));
        setOrders(ordersWithoutShipment);
        const kitchenOrgs = getList(orgKitchenRes);
        const fromLocs = [];
        for (const org of kitchenOrgs) {
          const res = await workflowService.getLocations({ org_unit_id: org._id, limit: 100 });
          fromLocs.push(...getList(res));
        }
        setFromLocations(fromLocs);
        const byId = new Map();
        fromLocs.forEach(l => { if (l && l._id) byId.set(l._id, l); });
        getList(allLocsRes).forEach(l => { if (l && l._id) byId.set(l._id, l); });
        seedLocs.forEach(l => { if (l && l._id) byId.set(l._id, l); });
        const storeOrgs = getOrgUnitList(orgStoreRes);
        const hasStoreQ1 = storeOrgs.some(o => (o?._id ?? o?.id) === 'org_store_q1');
        if (hasStoreQ1) byId.set(SEED_STORE_LOCATION._id, { ...SEED_STORE_LOCATION, org_unit_id: storeOrgs.find(o => (o?._id ?? o?.id) === 'org_store_q1') || SEED_STORE_LOCATION.org_unit_id });
        setToLocations(Array.from(byId.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      } catch (e) {
        setCreateError(e?.message || 'Không tải được đơn hàng hoặc danh sách kho.');
      } finally {
        setCreateDataLoading(false);
      }
    };
    loadData();
  }, [createOpen]);

  // Khi đã load chi tiết đơn + danh sách kho cửa hàng, auto chọn Kho nhận theo OrgUnit của đơn
  useEffect(() => {
    if (!orderDetail || !toLocations.length) return;
    if (toLocationId) return; // user đã chọn tay rồi
    const storeOrgId = orderDetail.store_org_unit_id?._id || orderDetail.store_org_unit_id;
    if (!storeOrgId) return;
    const matched = toLocations.find(l => {
      const orgId = l.org_unit_id?._id || l.org_unit_id;
      return orgId === storeOrgId;
    });
    if (matched) {
      setToLocationId(matched._id);
    }
  }, [orderDetail, toLocations, toLocationId]);

  /* ─── When order selected → load detail ─── */
  useEffect(() => {
    if (!selectedOrderId) {
      setOrderDetail(null);
      setShipLines([]);
      setLotsByItemId({});
      return;
    }
    let cancelled = false;
    setOrderDetailLoading(true);
    workflowService.getInternalOrder(selectedOrderId).then(async res => {
      if (cancelled) return;
      setOrderDetailLoading(false);
      if (!res.success || !res.data) { setOrderDetail(null); setShipLines([]); return; }
      const order = res.data;
      setOrderDetail(order);

      const lines = (order.lines || []).map(l => {
        const itemId = l.item_id?._id || l.item_id;
        const uomId = l.uom_id?._id || l.uom_id;
        const qtyOrdered = Number(l.qty_ordered) || 0;
        const qtyShipped = Number(l.qty_shipped) || 0;
        const qtyRemaining = Math.max(0, qtyOrdered - qtyShipped);
        return {
          order_line_id: l._id,
          item_id: itemId,
          item_name: l.item_id?.name || l.item_id?.sku || itemId,
          uom_id: uomId,
          uom_name: l.uom_id?.code || l.uom_id?.name || uomId,
          qty_ordered: qtyOrdered,
          qty_shipped: qtyShipped,
          qty_remaining: qtyRemaining,
          qty: qtyRemaining,
          lots: [],
        };
      });
      setShipLines(lines);
      setLotsByItemId({});
    });
    return () => { cancelled = true; };
  }, [selectedOrderId]);

  /* ─── When from_location selected → load lots CHỈ từ tồn kho tại kho xuất (không fallback getLots) ─── */
  useEffect(() => {
    if (!fromLocationId || !orderDetail?.lines?.length) {
      setLotsByItemId({});
      return;
    }
    let cancelled = false;
    setLotsLoading(true);
    const loadLots = async () => {
      const byId = {};
      const itemIds = [...new Set((orderDetail.lines || []).map(l => l.item_id?._id || l.item_id))];
      const locIdStr = String(fromLocationId);
      const refDate = shipDate ? new Date(shipDate) : new Date();
      refDate.setHours(0, 0, 0, 0);
      const refTime = refDate.getTime();

      for (const itemId of itemIds) {
        if (cancelled) break;
        const balRes = await workflowService.getInventoryBalances({
          location_id: fromLocationId,
          item_id: itemId,
          limit: 100,
          page: 1,
        });
        if (cancelled) break;
        const rawList = Array.isArray(balRes?.data) ? balRes.data : (balRes?.data?.data ?? []);
        const list = rawList.filter(b => {
          const locId = b.location_id?._id ?? b.location_id;
          return String(locId) === locIdStr;
        });
        const lots = list
          .filter(b => (b.qty_on_hand ?? 0) > 0)
          .filter(b => !b.lot_id?.exp_date || new Date(b.lot_id.exp_date).setHours(0, 0, 0, 0) >= refTime)
          .sort((a, b) => (a.lot_id?.exp_date ? new Date(a.lot_id.exp_date).getTime() : 0) - (b.lot_id?.exp_date ? new Date(b.lot_id.exp_date).getTime() : 0))
          .map(b => ({
            _id: b.lot_id?._id ?? '__NO_LOT__',
            lot_code: b.lot_id?.lot_code ?? 'Tồn chung (không lô)',
            exp_date: b.lot_id?.exp_date,
            qty_available: b.qty_on_hand ?? 0,
          }));
        byId[itemId] = lots;
      }
      if (!cancelled) setLotsByItemId(byId);
      setLotsLoading(false);
    };
    loadLots();
    return () => { cancelled = true; setLotsLoading(false); };
  }, [fromLocationId, orderDetail, shipDate]);

  /* ─── Line lot management ─── */
  const addLotToLine = idx => {
    setShipLines(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], lots: [...next[idx].lots, { lot_id: '', qty: 0 }] };
      return next;
    });
  };

  const updateLotInLine = (lineIdx, lotIdx, field, value) => {
    setShipLines(prev => {
      const next = [...prev];
      const lots = [...next[lineIdx].lots];
      lots[lotIdx] = { ...lots[lotIdx], [field]: field === 'qty' ? (Number(value) || 0) : value };
      if (field === 'lot_id' && value) {
        const otherQty = lots.reduce((sum, lt, i) => (i !== lotIdx ? sum + (Number(lt.qty) || 0) : sum), 0);
        const remainingToAlloc = Math.max(0, (next[lineIdx].qty_remaining || 0) - otherQty);
        lots[lotIdx].qty = remainingToAlloc;
      }
      const totalLotQty = lots.reduce((sum, lt) => sum + (Number(lt.qty) || 0), 0);
      next[lineIdx] = { ...next[lineIdx], lots, qty: totalLotQty };
      return next;
    });
  };

  const removeLotFromLine = (lineIdx, lotIdx) => {
    setShipLines(prev => {
      const next = [...prev];
      const lots = next[lineIdx].lots.filter((_, i) => i !== lotIdx);
      const totalLotQty = lots.reduce((sum, lt) => sum + (Number(lt.qty) || 0), 0);
      next[lineIdx] = { ...next[lineIdx], lots, qty: totalLotQty };
      return next;
    });
  };

  /* ─── Submit create ─── */
  const submitCreate = async e => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      if (!selectedOrderId) { setCreateError('Vui lòng chọn đơn hàng.'); setCreating(false); return; }
      if (!fromLocationId) { setCreateError('Vui lòng chọn kho xuất.'); setCreating(false); return; }
      if (!toLocationId) { setCreateError('Vui lòng chọn kho nhận.'); setCreating(false); return; }

      const noStockLine = shipLines.find(l => l.qty > 0 && (lotsByItemId[l.item_id] || []).length === 0);
      if (noStockLine) {
        setCreateError(`Sản phẩm "${noStockLine.item_name}" không có lô nào có tồn tại kho xuất. Vui lòng nhập kho hoặc điều chỉnh tồn kho trước.`);
        setCreating(false);
        return;
      }

      const mixedLine = shipLines.find(l => {
        const hasReal = l.lots.some(lt => lt.lot_id && lt.lot_id !== '__NO_LOT__' && lt.qty > 0);
        const hasNoLot = l.lots.some(lt => lt.lot_id === '__NO_LOT__' && lt.qty > 0);
        return hasReal && hasNoLot;
      });
      if (mixedLine) {
        setCreateError('Không thể trộn "Tồn chung" với lô cụ thể trong cùng dòng. Vui lòng chọn một loại.');
        setCreating(false);
        return;
      }

      const linesToSend = shipLines
        .filter(l => l.qty > 0 && l.lots.length > 0)
        .map(l => {
          const validLots = l.lots.filter(lt => lt.lot_id && lt.lot_id !== '__NO_LOT__' && lt.qty > 0);
          const hasNoLot = l.lots.some(lt => lt.lot_id === '__NO_LOT__' && lt.qty > 0);
          const lots = validLots.length > 0
            ? validLots.map(lt => ({ lot_id: lt.lot_id, qty: lt.qty }))
            : (hasNoLot ? [] : []);
          return {
            order_line_id: l.order_line_id,
            item_id: l.item_id,
            qty: l.qty,
            uom_id: l.uom_id,
            lots,
          };
        })
        .filter(l => l.lots.length > 0 || l.qty > 0);

      if (!linesToSend.length) {
        setCreateError('Vui lòng thêm ít nhất 1 dòng với lot và số lượng > 0.');
        setCreating(false);
        return;
      }

      const overLine = shipLines.find(l => l.qty > l.qty_remaining);
      if (overLine) {
        setCreateError(`Số lượng giao "${overLine.item_name}" (${overLine.qty}) vượt quá số còn lại (${overLine.qty_remaining}).`);
        setCreating(false);
        return;
      }

      for (const line of linesToSend) {
        for (const lt of line.lots) {
          const lotId = lt.lot_id === '__NO_LOT__' ? null : lt.lot_id;
          const avail = (lotsByItemId[line.item_id] || []).find(l => (l._id === '__NO_LOT__' ? !lotId : l._id === lotId))?.qty_available ?? Infinity;
          if (lt.qty > avail) {
            setCreateError(`Số lượng lô vượt quá tồn tại kho xuất. Vui lòng làm mới và chọn lại.`);
            setCreating(false);
            return;
          }
        }
      }

      const payload = {
        order_id: selectedOrderId,
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        ship_date: shipDate ? new Date(shipDate).toISOString() : new Date().toISOString(),
        lines: linesToSend,
      };

      if (!payload.from_location_id || !payload.to_location_id) {
        setCreateError('Vui lòng chọn đủ kho xuất và kho nhận.');
        setCreating(false);
        return;
      }

      const res = await workflowService.createShipment(payload);
      if (!res.success) {
        setCreateError(res.message || 'Tạo phiếu giao hàng thất bại');
        setCreating(false);
        return;
      }
      closeCreateModal();
      setSuccess('Đã tạo lô giao hàng thành công. Đơn hàng sẽ tự động chuyển trạng thái SHIPPED.');
      loadShipments(1);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi khi tạo lô giao hàng';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setSelectedOrderId('');
    setFromLocationId('');
    setToLocationId('');
  };

  const getItemName = obj => {
    if (!obj) return '-';
    if (typeof obj === 'object') return obj.name || obj.sku || obj._id;
    return obj;
  };

  const getLocationLabel = loc => {
    if (!loc) return '-';
    if (typeof loc === 'object') return `${loc.name || loc.code || loc._id}${loc.org_unit_id?.name ? ` (${loc.org_unit_id.name})` : ''}`;
    return loc;
  };

  const isDiscreteUom = (uomCodeOrName) => {
    const u = (uomCodeOrName || '').toString().toUpperCase();
    return ['PACK', 'CARTON', 'UNIT'].includes(u);
  };

  const getValidLotsForLine = (itemId) => {
    const list = lotsByItemId[itemId] || [];
    const refDate = shipDate ? new Date(shipDate) : new Date();
    refDate.setHours(0, 0, 0, 0);
    const refTime = refDate.getTime();
    const valid = list.filter(l => !l.exp_date || new Date(l.exp_date).setHours(0, 0, 0, 0) >= refTime);
    return valid.sort((a, b) => (a.exp_date ? new Date(a.exp_date).getTime() : 0) - (b.exp_date ? new Date(b.exp_date).getTime() : 0));
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
          <h1 className='text-2xl font-bold text-slate-900'>Giao hàng</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Tạo phiếu giao hàng từ đơn hàng đã duyệt (chọn đơn, kho xuất/nhận, lot); khi chưa có phiếu cho đơn thì dùng nút bên dưới.
          </p>
        </div>
        <div className='flex gap-2'>
          <button onClick={() => setCreateOpen(true)} className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'>
            <Plus className='h-4 w-4' /> Tạo phiếu giao hàng
          </button>
          <button onClick={() => loadShipments(1)} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Tìm theo số lô giao / số đơn hàng...' className='input-field w-full pl-9' />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className='input-field min-w-[180px]'>
          <option value='ALL'>Tất cả trạng thái</option>
          {Object.entries(SHIPMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Shipment table */}
      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Số lô giao</th>
              <th className='px-4 py-3'>Đơn hàng</th>
              <th className='px-4 py-3'>Kho xuất</th>
              <th className='px-4 py-3'>Kho nhận</th>
              <th className='px-4 py-3'>Ngày giao</th>
              <th className='px-4 py-3'>Trạng thái</th>
              <th className='px-4 py-3 text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && <tr><td colSpan={7} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td></tr>}
            {!loading && !filteredShipments.length && <tr><td colSpan={7} className='px-4 py-6 text-center text-slate-400'>Chưa có lô giao hàng nào.</td></tr>}
            {!loading && filteredShipments.map(sh => (
              <tr key={sh._id}>
                <td className='px-4 py-3 font-medium text-slate-900'>{sh.shipment_no || sh._id}</td>
                <td className='px-4 py-3 text-slate-700'>{sh.order_id?.order_no || sh.order_id || '-'}</td>
                <td className='px-4 py-3 text-slate-700'>{getLocationLabel(sh.from_location_id)}</td>
                <td className='px-4 py-3 text-slate-700'>{getLocationLabel(sh.to_location_id)}</td>
                <td className='px-4 py-3 text-slate-700'>{sh.ship_date ? new Date(sh.ship_date).toLocaleDateString('vi-VN') : '-'}</td>
                <td className='px-4 py-3'>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[sh.status] || 'bg-slate-100 text-slate-700'}`}>
                    {SHIPMENT_STATUS[sh.status] || sh.status}
                  </span>
                </td>
                <td className='px-4 py-3 text-right'>
                  <div className='flex items-center justify-end gap-1'>
                    <button onClick={() => loadDetail(sh._id)} className='rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'>
                      Chi tiết
                    </button>
                    {sh.status === 'DRAFT' && doneProductionOrderIds.has(String(sh.order_id?._id ?? sh.order_id)) && (
                      <button
                        disabled={actionLoadingId === sh._id}
                        onClick={() => updateStatus(sh, 'PICKED')}
                        className='rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-sky-700 hover:bg-sky-100 disabled:opacity-60'
                        title='Đơn đã sản xuất xong; đánh dấu đã lấy hàng'
                      >
                        {actionLoadingId === sh._id ? 'Đang xử lý...' : 'Chuyển sang Đã lấy hàng'}
                      </button>
                    )}
                  </div>
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
            <button type='button' onClick={() => loadShipments(pagination.page - 1)} disabled={pagination.page <= 1} className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'>Trước</button>
            <span>Trang {pagination.page} / {Math.max(1, pagination.pages)}</span>
            <button type='button' onClick={() => loadShipments(pagination.page + 1)} disabled={pagination.page >= Math.max(1, pagination.pages)} className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'>Sau</button>
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {detailId && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => setDetailId(null)}>
          <div className='w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Chi tiết lô giao hàng</h2>
              <button onClick={() => setDetailId(null)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {!detailShipment && !detailError && <p className='text-sm text-slate-500'>Đang tải...</p>}
            {detailError && <p className='text-sm text-red-600'>{detailError}</p>}
            {detailShipment && (
              <div className='space-y-4'>
                <div className='rounded-lg border border-slate-200 bg-slate-50/50 p-3'>
                  <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-sm'>
                    <span className='text-slate-500'>Số lô giao:</span>
                    <span className='font-medium'>{detailShipment.shipment_no || detailShipment._id}</span>
                    <span className='text-slate-500'>Đơn hàng:</span>
                    <span className='font-medium'>{detailShipment.order_id?.order_no || detailShipment.order_id || '-'}</span>
                    <span className='text-slate-500'>Kho xuất:</span>
                    <span>{getLocationLabel(detailShipment.from_location_id)}</span>
                    <span className='text-slate-500'>Kho nhận:</span>
                    <span>{getLocationLabel(detailShipment.to_location_id)}</span>
                    <span className='text-slate-500'>Ngày giao:</span>
                    <span>{detailShipment.ship_date ? new Date(detailShipment.ship_date).toLocaleString('vi-VN') : '-'}</span>
                    <span className='text-slate-500'>Trạng thái:</span>
                    <span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[detailShipment.status] || 'bg-slate-100 text-slate-700'}`}>
                        {SHIPMENT_STATUS[detailShipment.status] || detailShipment.status}
                      </span>
                    </span>
                  </div>
                </div>

                {(() => {
                  const photoUrl = resolvePhotoUrl(detailShipment.delivery_photo_url);
                  if (!photoUrl) return null;
                  return (
                    <div className='rounded-lg border border-emerald-100 bg-emerald-50/60 p-3'>
                      <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                        Ảnh giao hàng (Proof of Delivery)
                      </h3>
                      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'>
                        {!imageError && (
                          <div className='overflow-hidden rounded-lg border border-emerald-100 bg-white max-w-xs'>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photoUrl}
                              alt='Ảnh giao hàng'
                              className='h-40 w-full object-cover'
                              onError={e => {
                                e.currentTarget.style.display = 'none';
                                setImageError(true);
                              }}
                            />
                          </div>
                        )}
                        <div className='text-xs text-emerald-700'>
                          <p>
                            Ảnh được tải lên khi Driver xác nhận trạng thái <strong>DELIVERED</strong>.
                          </p>
                          {detailShipment.delivery_photo_uploaded_at && (
                            <p className='mt-1 text-emerald-600/80'>
                              Thời gian upload:{' '}
                              {new Date(detailShipment.delivery_photo_uploaded_at).toLocaleString('vi-VN')}
                            </p>
                          )}
                          <p className='mt-1'>
                            Xem ảnh chứng từ:{' '}
                            <a
                              href={photoUrl}
                              target='_blank'
                              rel='noreferrer'
                              className='font-medium underline'
                            >
                              Xem ảnh
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Flow guide */}
                <div className='rounded-lg border border-slate-200 bg-white p-3'>
                  <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>Quy trình giao hàng</h3>
                  <ol className='space-y-1 text-sm'>
                    <li className={detailShipment.status ? 'text-slate-700' : 'text-slate-400'}>1. Tạo lô giao hàng (DRAFT) — Chọn đơn hàng, lot, kho xuất/nhận</li>
                    <li className={['SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(detailShipment.status) ? 'text-slate-700' : 'text-slate-400'}>2. Xuất kho (SHIPPED) — Trừ tồn kho bếp trung tâm, đơn hàng → SHIPPED</li>
                    <li className={['IN_TRANSIT', 'DELIVERED'].includes(detailShipment.status) ? 'text-slate-700' : 'text-slate-400'}>3. Đang vận chuyển (IN_TRANSIT) — Hàng trên đường</li>
                    <li className={detailShipment.status === 'DELIVERED' ? 'text-slate-700' : 'text-slate-400'}>4. Đã giao đến (DELIVERED) — Hàng đến cửa hàng</li>
                  </ol>
                </div>

                {/* Action buttons */}
                <div className='flex flex-wrap gap-2'>
                  {detailShipment.status === 'DRAFT' && (
                    <>
                      <button
                        disabled={actionLoadingId === detailShipment._id}
                        onClick={() => handleDispatch(detailShipment)}
                        className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60'
                      >
                        {actionLoadingId === detailShipment._id ? 'Đang xử lý...' : 'Xuất kho & giao hàng (Dispatch)'}
                      </button>
                      <button
                        disabled={actionLoadingId === detailShipment._id}
                        onClick={() => updateStatus(detailShipment, 'CANCELLED')}
                        className='rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50'
                      >
                        Hủy lô giao
                      </button>
                    </>
                  )}
                  {['SHIPPED', 'IN_TRANSIT'].includes(detailShipment.status) && (
                    <p className='text-xs text-slate-500'>Đang vận chuyển và Đã giao đến do Driver cập nhật.</p>
                  )}
                </div>

                {/* Lines */}
                <div>
                  <h3 className='mb-2 text-sm font-medium text-slate-700'>Chi tiết dòng giao</h3>
                  <table className='w-full text-sm'>
                    <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                      <tr>
                        <th className='px-3 py-2'>Sản phẩm</th>
                        <th className='px-3 py-2'>Số lượng</th>
                        <th className='px-3 py-2'>ĐVT</th>
                        <th className='px-3 py-2'>Lô (Lots)</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {(detailShipment.lines || []).map((line, idx) => (
                        <tr key={line._id || idx}>
                          <td className='px-3 py-2'>{getItemName(line.item_id)}</td>
                          <td className='px-3 py-2'>{line.qty ?? 0}</td>
                          <td className='px-3 py-2'>{line.uom_id?.code || line.uom_id?.name || line.uom_id || '-'}</td>
                          <td className='px-3 py-2'>
                            {(line.lots || []).map((lt, li) => (
                              <span key={li} className='mr-1 inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-xs'>
                                {lt.lot_id?.lot_code || lt.lot_id || '?'}: {lt.qty}
                              </span>
                            ))}
                            {(!line.lots || !line.lots.length) && <span className='text-slate-400'>-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ─── Create Modal ─── */}
      {createOpen && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => !creating && closeCreateModal()}>
          <div className='w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Tạo phiếu giao hàng</h2>
              <button onClick={() => !creating && closeCreateModal()} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {createError && <p className='mb-3 text-sm text-red-600'>{createError}</p>}
            {createDataLoading && <p className='mb-3 text-sm text-slate-500'>Đang tải đơn hàng và danh sách kho...</p>}

            <form onSubmit={submitCreate} className='space-y-4'>
              {/* Select order */}
              <div>
                <label className='block text-sm font-medium text-slate-700'>
                  Chọn đơn hàng ({ORDER_STATUS_FOR_SHIPMENT.join(' / ')} — chỉ đơn chưa có phiếu giao)
                </label>
                <select
                  value={selectedOrderId}
                  onChange={e => setSelectedOrderId(e.target.value)}
                  className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
                  required
                  disabled={createDataLoading}
                >
                  <option value=''>-- Chọn đơn hàng --</option>
                  {orders.map(o => (
                    <option key={o._id} value={o._id}>
                      {o.order_no || o._id} — {o.store_org_unit_id?.name || ''} ({o.status})
                    </option>
                  ))}
                </select>
                {!createDataLoading && orders.length === 0 && <p className='mt-1 text-xs text-amber-600'>Không có đơn APPROVED/PROCESSING nào chưa có phiếu giao hàng.</p>}
              </div>

              {/* Locations: kho xuất = KITCHEN, kho nhận = STORE */}
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Kho xuất (Bếp trung tâm)</label>
                  <select value={fromLocationId} onChange={e => setFromLocationId(e.target.value)} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' required disabled={createDataLoading}>
                    <option value=''>-- Chọn kho xuất --</option>
                    {fromLocations.map(l => (
                      <option key={l._id} value={l._id}>
                        {l.name || l.code} {l.org_unit_id?.name ? `(${l.org_unit_id.name})` : ''}
                      </option>
                    ))}
                  </select>
                  {!createDataLoading && fromLocations.length === 0 && <p className='mt-1 text-xs text-amber-600'>Chưa có kho bếp trung tâm. Cấu hình Location thuộc Org Unit type KITCHEN.</p>}
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Kho nhận (Cửa hàng)</label>
                  <select value={toLocationId} onChange={e => setToLocationId(e.target.value)} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' required disabled={createDataLoading}>
                    <option value=''>-- Chọn kho nhận --</option>
                    {toLocations.map(l => (
                      <option key={l._id} value={l._id}>
                        {l.name || l.code} {l.org_unit_id?.name ? `(${l.org_unit_id.name})` : ''}
                      </option>
                    ))}
                  </select>
                  {!createDataLoading && toLocations.length === 0 && <p className='mt-1 text-xs text-amber-600'>Chưa có kho cửa hàng. Cấu hình Location thuộc Org Unit type STORE.</p>}
                </div>
              </div>

              {/* Ship date */}
              <div>
                <label className='block text-sm font-medium text-slate-700'>Ngày giờ giao hàng</label>
                <input type='datetime-local' value={shipDate} onChange={e => setShipDate(e.target.value)} className='mt-1 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' />
              </div>

              {/* Loading */}
              {orderDetailLoading && <p className='text-sm text-slate-500'>Đang tải chi tiết đơn hàng...</p>}

              {/* Lines with lot selection */}
              {orderDetail && shipLines.length > 0 && !orderDetailLoading && (
                <div className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                  {!fromLocationId ? (
                    <p className='text-sm text-amber-600'>Vui lòng chọn kho xuất trước để xem lô có sẵn tại kho.</p>
                  ) : lotsLoading ? (
                    <p className='text-sm text-slate-500'>Đang tải lô có tồn tại kho xuất...</p>
                  ) : (
                    <div className='text-sm font-medium text-slate-700'>
                      Chọn lô (lot) cho từng sản phẩm — Chỉ hiển thị lô có tồn tại kho xuất, FIFO (ưu tiên lot cũ nhất)
                    </div>
                  )}
                  {shipLines.map((line, lineIdx) => (
                    <div key={lineIdx} className='rounded-lg border border-slate-200 bg-white p-3'>
                      <div className='mb-2 flex items-center justify-between'>
                        <div>
                          <span className='font-medium text-slate-800'>{line.item_name}</span>
                          <span className='ml-2 text-xs text-slate-500'>
                            Đặt: {line.qty_ordered} | Đã giao: {line.qty_shipped} | Còn lại: {line.qty_remaining} ({line.uom_name})
                          </span>
                        </div>
                        <span className='text-sm font-medium text-orange-600'>Giao: {line.qty}</span>
                      </div>

                      {fromLocationId && getValidLotsForLine(line.item_id).length === 0 && (
                        <p className='mt-1 text-sm text-red-600'>
                          Không có lô nào có tồn tại kho xuất cho sản phẩm này. Vui lòng nhập kho hoặc điều chỉnh tồn kho tại kho xuất đã chọn trước khi tạo lô giao hàng.
                        </p>
                      )}
                      {/* Lot rows */}
                      {line.lots.map((lot, lotIdx) => (
                        <div key={lotIdx} className='mt-1 flex items-center gap-2'>
                          <select
                            value={lot.lot_id}
                            onChange={e => updateLotInLine(lineIdx, lotIdx, 'lot_id', e.target.value)}
                            className='flex-1 rounded border border-slate-200 px-2 py-1 text-sm'
                          >
                            <option value=''>-- Chọn lô --</option>
                            {getValidLotsForLine(line.item_id).map(l => (
                              <option key={l._id} value={l._id}>
                                {l.lot_code || l._id}
                                {l.exp_date ? ` (HSD: ${new Date(l.exp_date).toLocaleDateString('vi-VN')})` : ''}
                                {l.qty_available != null ? ` — Tồn: ${l.qty_available}` : ''}
                              </option>
                            ))}
                          </select>
                          <input
                            type='number'
                            min={0}
                            max={line.qty_remaining}
                            step={isDiscreteUom(line.uom_name) ? 1 : 0.01}
                            value={lot.qty}
                            onChange={e => updateLotInLine(lineIdx, lotIdx, 'qty', e.target.value)}
                            className='w-24 rounded border border-slate-200 px-2 py-1 text-sm'
                            placeholder='SL'
                          />
                          <button type='button' onClick={() => removeLotFromLine(lineIdx, lotIdx)} className='text-xs text-red-500 hover:text-red-600'>Xóa</button>
                        </div>
                      ))}
                      <button type='button' onClick={() => addLotToLine(lineIdx)} className='mt-1 text-xs font-medium text-orange-600 hover:text-orange-700'>+ Thêm lô</button>
                    </div>
                  ))}
                </div>
              )}

              <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                <button type='button' disabled={creating} onClick={closeCreateModal} className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'>Hủy</button>
                <button
                  type='submit'
                  disabled={creating || lotsLoading || !selectedOrderId || orderDetailLoading || shipLines.length === 0}
                  className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60'
                >
                  {creating ? 'Đang tạo...' : 'Tạo phiếu giao hàng'}
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
