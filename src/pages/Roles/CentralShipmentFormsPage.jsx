import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Plus, RefreshCcw, FileText } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

const ORDER_STATUS_FOR_SHIPMENT = ['APPROVED', 'PROCESSING'];
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

function getList(res) {
  if (!res?.success) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
}

function getLocationLabel(loc) {
  if (!loc) return '-';
  if (typeof loc === 'object') return loc.name || loc.code || loc._id || '-';
  return loc;
}

export default function CentralShipmentFormsPage() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createShipmentError, setCreateShipmentError] = useState('');
  const [createShipmentDataLoading, setCreateShipmentDataLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [fromLocations, setFromLocations] = useState([]);
  const [toLocations, setToLocations] = useState([]);
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [shipDate, setShipDate] = useState(new Date().toISOString().slice(0, 16));
  const [shipLines, setShipLines] = useState([]);
  const [lotsByItemId, setLotsByItemId] = useState({});
  const [lotsLoading, setLotsLoading] = useState(false);
  const [creatingShipment, setCreatingShipment] = useState(false);

  const loadShipments = async () => {
    setLoading(true);
    try {
      const res = await workflowService.getShipmentsPaginated({
        status: 'DRAFT',
        limit: 50,
        page: 1,
      });
      if (res?.success && res?.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        const pickedRes = await workflowService.getShipmentsPaginated({ status: 'PICKED', limit: 50, page: 1 });
        const pickedList = Array.isArray(pickedRes?.data?.data) ? pickedRes.data.data : [];
        setShipments([...list, ...pickedList].sort((a, b) => new Date(b.ship_date || 0) - new Date(a.ship_date || 0)));
      } else {
        setShipments([]);
      }
    } catch {
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadShipments(); }, []);

  useEffect(() => {
    if (!createOpen) return;
    setCreateShipmentError('');
    setSelectedOrderId('');
    setOrderDetail(null);
    setShipLines([]);
    setFromLocationId('');
    setToLocationId('');
    setShipDate(new Date().toISOString().slice(0, 16));
    setLotsByItemId({});
    setCreateShipmentDataLoading(true);
    const loadData = async () => {
      try {
        const [approvedRes, processingRes, locKitchenRes, locStoreRes] = await Promise.all([
          workflowService.getInternalOrders({ status: 'APPROVED', limit: 100 }),
          workflowService.getInternalOrders({ status: 'PROCESSING', limit: 100 }),
          workflowService.getLocations({ org_unit_type: 'KITCHEN', limit: 100 }),
          workflowService.getLocations({ org_unit_type: 'STORE', limit: 100 }),
        ]);
        setOrders([...getList(approvedRes), ...getList(processingRes)]);
        setFromLocations(getList(locKitchenRes));
        setToLocations(getList(locStoreRes));
      } catch (e) {
        setCreateShipmentError(e?.message || 'Không tải được đơn hàng hoặc danh sách kho.');
      } finally {
        setCreateShipmentDataLoading(false);
      }
    };
    loadData();
  }, [createOpen]);

  useEffect(() => {
    if (!orderDetail || !toLocations.length || toLocationId) return;
    const storeOrgId = orderDetail.store_org_unit_id?._id || orderDetail.store_org_unit_id;
    if (!storeOrgId) return;
    const matched = toLocations.find(l => (l.org_unit_id?._id || l.org_unit_id) === storeOrgId);
    if (matched) setToLocationId(matched._id);
  }, [orderDetail, toLocations, toLocationId]);

  useEffect(() => {
    if (!selectedOrderId) {
      setOrderDetail(null);
      setShipLines([]);
      setLotsByItemId({});
      return;
    }
    let cancelled = false;
    setOrderDetailLoading(true);
    workflowService.getInternalOrder(selectedOrderId).then(res => {
      if (cancelled) return;
      setOrderDetailLoading(false);
      if (!res.success || !res.data) {
        setOrderDetail(null);
        setShipLines([]);
        return;
      }
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
        const list = rawList.filter(b => String(b.location_id?._id ?? b.location_id) === locIdStr);
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

  const isDiscreteUom = (uomCodeOrName) => {
    const u = (uomCodeOrName || '').toString().toUpperCase();
    return ['PACK', 'CARTON', 'UNIT'].includes(u);
  };
  const getValidLotsForLine = (itemId) => {
    const list = lotsByItemId[itemId] || [];
    const refDate = shipDate ? new Date(shipDate) : new Date();
    refDate.setHours(0, 0, 0, 0);
    const refTime = refDate.getTime();
    return list
      .filter(l => !l.exp_date || new Date(l.exp_date).setHours(0, 0, 0, 0) >= refTime)
      .sort((a, b) => (a.exp_date ? new Date(a.exp_date).getTime() : 0) - (b.exp_date ? new Date(b.exp_date).getTime() : 0));
  };
  const addLotToLine = (idx) => {
    setShipLines(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], lots: [...(next[idx].lots || []), { lot_id: '', qty: 0 }] };
      return next;
    });
  };
  const updateLotInLine = (lineIdx, lotIdx, field, value) => {
    setShipLines(prev => {
      const next = [...prev];
      const lots = [...(next[lineIdx].lots || [])];
      lots[lotIdx] = { ...lots[lotIdx], [field]: field === 'qty' ? (Number(value) || 0) : value };
      if (field === 'lot_id' && value) {
        const otherQty = lots.reduce((sum, lt, i) => (i !== lotIdx ? sum + (Number(lt.qty) || 0) : sum), 0);
        lots[lotIdx].qty = Math.max(0, (next[lineIdx].qty_remaining || 0) - otherQty);
      }
      const totalLotQty = lots.reduce((sum, lt) => sum + (Number(lt.qty) || 0), 0);
      next[lineIdx] = { ...next[lineIdx], lots, qty: totalLotQty };
      return next;
    });
  };
  const removeLotFromLine = (lineIdx, lotIdx) => {
    setShipLines(prev => {
      const next = [...prev];
      const lots = (next[lineIdx].lots || []).filter((_, i) => i !== lotIdx);
      const totalLotQty = lots.reduce((sum, lt) => sum + (Number(lt.qty) || 0), 0);
      next[lineIdx] = { ...next[lineIdx], lots, qty: totalLotQty };
      return next;
    });
  };

  const submitCreateShipment = async (e) => {
    e.preventDefault();
    setCreatingShipment(true);
    setCreateShipmentError('');
    try {
      if (!selectedOrderId) { setCreateShipmentError('Vui lòng chọn đơn hàng.'); setCreatingShipment(false); return; }
      if (!fromLocationId) { setCreateShipmentError('Vui lòng chọn kho xuất.'); setCreatingShipment(false); return; }
      if (!toLocationId) { setCreateShipmentError('Vui lòng chọn kho nhận.'); setCreatingShipment(false); return; }
      const noStock = shipLines.find(l => l.qty > 0 && (lotsByItemId[l.item_id] || []).length === 0);
      if (noStock) {
        setCreateShipmentError(`Sản phẩm "${noStock.item_name}" không có lô nào có tồn tại kho xuất.`);
        setCreatingShipment(false);
        return;
      }
      const linesToSend = shipLines
        .filter(l => l.qty > 0 && (l.lots || []).length > 0)
        .map(l => {
          const validLots = (l.lots || []).filter(lt => lt.lot_id && lt.lot_id !== '__NO_LOT__' && lt.qty > 0);
          const noLotQty = (l.lots || []).filter(lt => lt.lot_id === '__NO_LOT__' && lt.qty > 0).reduce((s, lt) => s + Number(lt.qty), 0);
          const lots = validLots.length > 0
            ? validLots.map(lt => ({ lot_id: lt.lot_id, qty: lt.qty }))
            : (noLotQty > 0 ? [{ lot_id: null, qty: noLotQty }] : []);
          return { order_line_id: l.order_line_id, item_id: l.item_id, qty: l.qty, uom_id: l.uom_id, lots };
        })
        .filter(l => (l.lots && l.lots.length > 0) || l.qty > 0);
      if (!linesToSend.length) {
        setCreateShipmentError('Vui lòng thêm ít nhất 1 dòng với lot và số lượng > 0.');
        setCreatingShipment(false);
        return;
      }
      const overLine = shipLines.find(l => l.qty > (l.qty_remaining || 0));
      if (overLine) {
        setCreateShipmentError(`Số lượng "${overLine.item_name}" vượt quá còn lại (${overLine.qty_remaining}).`);
        setCreatingShipment(false);
        return;
      }
      for (const line of linesToSend) {
        for (const lt of (line.lots || [])) {
          const lotKey = lt.lot_id === null ? '__NO_LOT__' : lt.lot_id;
          const avail = (lotsByItemId[line.item_id] || []).find(l => l._id === lotKey)?.qty_available ?? 0;
          if (lt.qty > avail) {
            setCreateShipmentError('Số lượng lô vượt quá tồn tại kho xuất.');
            setCreatingShipment(false);
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
      const res = await workflowService.createShipment(payload);
      if (!res.success) {
        setCreateShipmentError(res.message || 'Tạo phiếu giao hàng thất bại');
        setCreatingShipment(false);
        return;
      }
      setCreateOpen(false);
      setSuccess('Đã tạo phiếu giao hàng thành công.');
      loadShipments();
    } catch (err) {
      setCreateShipmentError(err?.response?.data?.message || err?.message || 'Có lỗi khi tạo phiếu giao hàng');
    } finally {
      setCreatingShipment(false);
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
          <h1 className='text-2xl font-bold text-slate-900'>Phiếu giao hàng</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Tạo phiếu giao hàng từ đơn hàng đã duyệt và chuẩn bị xuất kho. Các phiếu đã hoàn thành có thể xem chi tiết tại mục Lịch sử giao hàng trong sidebar.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <button
            type='button'
            onClick={() => setCreateOpen(true)}
            className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'
          >
            <Plus className='h-4 w-4' /> Tạo phiếu giao
          </button>
          <button type='button' onClick={() => loadShipments()} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      <div className='rounded-xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-4 py-3'>
          <h2 className='text-sm font-semibold text-slate-800'>Phiếu nháp / Đã lấy hàng (gần đây)</h2>
          <p className='mt-0.5 text-xs text-slate-500'>Các phiếu DRAFT và PICKED. Xuất kho &amp; xem chi tiết tại Lịch sử giao hàng.</p>
        </div>
        <div className='overflow-x-auto'>
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
              {!loading && !shipments.length && <tr><td colSpan={7} className='px-4 py-6 text-center text-slate-400'>Chưa có phiếu DRAFT/PICKED. Nhấn &quot;Tạo phiếu giao&quot; để tạo mới.</td></tr>}
              {!loading && shipments.map(sh => (
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
                    <Link
                      to='/app/central/shipments?status=DELIVERED'
                      className='rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tạo phiếu giao hàng */}
      {createOpen && createPortal(
        <div className='fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4' onClick={() => !creatingShipment && setCreateOpen(false)}>
          <div className='w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Tạo phiếu giao hàng</h2>
              <button type='button' onClick={() => !creatingShipment && setCreateOpen(false)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {createShipmentError && <p className='mb-3 text-sm text-red-600'>{createShipmentError}</p>}
            {createShipmentDataLoading && <p className='mb-3 text-sm text-slate-500'>Đang tải đơn hàng và danh sách kho...</p>}

            <form onSubmit={submitCreateShipment} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700'>Chọn đơn hàng ({ORDER_STATUS_FOR_SHIPMENT.join(' / ')})</label>
                <select value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' required disabled={createShipmentDataLoading}>
                  <option value=''>-- Chọn đơn hàng --</option>
                  {orders.map(o => (
                    <option key={o._id} value={o._id}>
                      {o.order_no || o._id} — {o.store_org_unit_id?.name || ''} ({o.status})
                    </option>
                  ))}
                </select>
                {!createShipmentDataLoading && orders.length === 0 && <p className='mt-1 text-xs text-amber-600'>Chưa có đơn hàng APPROVED hoặc PROCESSING.</p>}
              </div>

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Kho xuất (Bếp trung tâm)</label>
                  <select value={fromLocationId} onChange={e => setFromLocationId(e.target.value)} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' required disabled={createShipmentDataLoading}>
                    <option value=''>-- Chọn kho xuất --</option>
                    {fromLocations.map(l => (
                      <option key={l._id} value={l._id}>{l.name || l.code} {l.org_unit_id?.name ? `(${l.org_unit_id.name})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Kho nhận (Cửa hàng)</label>
                  <select value={toLocationId} onChange={e => setToLocationId(e.target.value)} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' required disabled={createShipmentDataLoading}>
                    <option value=''>-- Chọn kho nhận --</option>
                    {toLocations.map(l => (
                      <option key={l._id} value={l._id}>{l.name || l.code} {l.org_unit_id?.name ? `(${l.org_unit_id.name})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700'>Ngày giờ giao hàng</label>
                <input type='datetime-local' value={shipDate} onChange={e => setShipDate(e.target.value)} className='mt-1 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' />
              </div>

              {orderDetailLoading && <p className='text-sm text-slate-500'>Đang tải chi tiết đơn hàng...</p>}

              {orderDetail && shipLines.length > 0 && !orderDetailLoading && (
                <div className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                  {!fromLocationId ? (
                    <p className='text-sm text-amber-600'>Chọn kho xuất để xem lô có sẵn.</p>
                  ) : lotsLoading ? (
                    <p className='text-sm text-slate-500'>Đang tải lô tại kho xuất...</p>
                  ) : (
                    <p className='text-sm font-medium text-slate-700'>Chọn lô (lot) cho từng sản phẩm — FIFO</p>
                  )}
                  {shipLines.map((line, lineIdx) => (
                    <div key={lineIdx} className='rounded-lg border border-slate-200 bg-white p-3'>
                      <div className='mb-2 flex items-center justify-between'>
                        <div>
                          <span className='font-medium text-slate-800'>{line.item_name}</span>
                          <span className='ml-2 text-xs text-slate-500'>
                            Đặt: {line.qty_ordered} | Đã giao: {line.qty_shipped} | Còn: {line.qty_remaining} ({line.uom_name})
                          </span>
                        </div>
                        <span className='text-sm font-medium text-orange-600'>Giao: {line.qty}</span>
                      </div>
                      {fromLocationId && getValidLotsForLine(line.item_id).length === 0 && (
                        <p className='mt-1 text-sm text-red-600'>Không có lô tồn tại kho xuất cho sản phẩm này.</p>
                      )}
                      {(line.lots || []).map((lot, lotIdx) => (
                        <div key={lotIdx} className='mt-1 flex items-center gap-2'>
                          <select
                            value={lot.lot_id}
                            onChange={e => updateLotInLine(lineIdx, lotIdx, 'lot_id', e.target.value)}
                            className='flex-1 rounded border border-slate-200 px-2 py-1 text-sm'
                          >
                            <option value=''>-- Chọn lô --</option>
                            {getValidLotsForLine(line.item_id).map(l => (
                              <option key={l._id} value={l._id}>
                                {l.lot_code || l._id}{l.exp_date ? ` (HSD: ${new Date(l.exp_date).toLocaleDateString('vi-VN')})` : ''} — Tồn: {l.qty_available}
                              </option>
                            ))}
                          </select>
                          <input type='number' min={0} max={line.qty_remaining} step={isDiscreteUom(line.uom_name) ? 1 : 0.01} value={lot.qty} onChange={e => updateLotInLine(lineIdx, lotIdx, 'qty', e.target.value)} className='w-24 rounded border border-slate-200 px-2 py-1 text-sm' placeholder='SL' />
                          <button type='button' onClick={() => removeLotFromLine(lineIdx, lotIdx)} className='text-xs text-red-500 hover:text-red-600'>Xóa</button>
                        </div>
                      ))}
                      <button type='button' onClick={() => addLotToLine(lineIdx)} className='mt-1 text-xs font-medium text-orange-600 hover:text-orange-700'>+ Thêm lô</button>
                    </div>
                  ))}
                </div>
              )}

              <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                <button type='button' disabled={creatingShipment} onClick={() => setCreateOpen(false)} className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'>Hủy</button>
                <button type='submit' disabled={creatingShipment || lotsLoading || !selectedOrderId || orderDetailLoading || shipLines.length === 0} className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60'>
                  {creatingShipment ? 'Đang tạo...' : 'Tạo phiếu giao hàng'}
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
