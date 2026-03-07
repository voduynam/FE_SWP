import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, RefreshCcw, Search } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

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
  return [];
}

export default function CentralShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState('');

  // Detail modal
  const [detailId, setDetailId] = useState(null);
  const [detailShipment, setDetailShipment] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Create form state
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [shipDate, setShipDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [shipLines, setShipLines] = useState([]);
  const [lotsByItemId, setLotsByItemId] = useState({});

  /* ─── Load shipment list ─── */
  const loadShipments = async (page = 1) => {
    setLoading(true);
    setSuccess('');
    try {
      const res = await workflowService.getShipmentsPaginated({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setShipments(list);
        const p = res.data.pagination ?? {};
        setPagination({ page: p.page ?? page, limit: p.limit ?? PAGE_SIZE, total: p.total ?? 0, pages: p.pages ?? 1 });
      } else {
        setShipments([]);
      }
    } catch {
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadShipments(1); }, [statusFilter]);

  /* ─── Detail ─── */
  const loadDetail = async id => {
    setDetailId(id);
    setDetailShipment(null);
    setDetailError(null);
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
    try {
      const res = await workflowService.dispatchShipment(shipment._id);
      if (res.success) {
        setSuccess('Đã xuất kho thành công. Tồn kho bếp trung tâm đã trừ, đơn hàng chuyển SHIPPED.');
        setDetailShipment(prev => (prev?._id === shipment._id ? { ...prev, status: 'SHIPPED' } : prev));
        loadShipments(pagination.page);
      } else {
        alert(res.message || 'Xuất kho thất bại');
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Xuất kho thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  /* ─── Search / filter ─── */
  const filteredShipments = useMemo(() => {
    const s = (search || '').toLowerCase();
    return shipments.filter(sh => {
      const no = sh.shipment_no || sh._id || '';
      const orderNo = sh.order_id?.order_no || sh.order_id || '';
      return !s || no.toLowerCase().includes(s) || String(orderNo).toLowerCase().includes(s);
    });
  }, [shipments, search]);

  /* ─── Create: load eligible orders + locations ─── */
  useEffect(() => {
    if (!createOpen) return;
    setCreateError('');
    setSelectedOrderId('');
    setOrderDetail(null);
    setShipLines([]);
    setLotsByItemId({});
    const loadData = async () => {
      const [approvedRes, processingRes, locRes] = await Promise.all([
        workflowService.getInternalOrders({ status: 'APPROVED', limit: 100 }),
        workflowService.getInternalOrders({ status: 'PROCESSING', limit: 100 }),
        workflowService.getLocations({ limit: 100 }),
      ]);
      const combinedOrders = [...getList(approvedRes), ...getList(processingRes)];
      setOrders(combinedOrders);
      setLocations(getList(locRes));
    };
    loadData();
  }, [createOpen]);

  /* ─── When order selected → load detail + lots ─── */
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

      const byId = {};
      await Promise.all(
        lines.map(async l => {
          if (byId[l.item_id]) return;
          const lotRes = await workflowService.getLots({ item_id: l.item_id, limit: 50 });
          if (cancelled) return;
          byId[l.item_id] = getList(lotRes);
        })
      );
      if (!cancelled) setLotsByItemId(byId);
    });
    return () => { cancelled = true; };
  }, [selectedOrderId]);

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

      const linesToSend = shipLines
        .filter(l => l.qty > 0 && l.lots.length > 0)
        .map(l => ({
          order_line_id: l.order_line_id,
          item_id: l.item_id,
          qty: l.qty,
          uom_id: l.uom_id,
          lots: l.lots.filter(lt => lt.lot_id && lt.qty > 0).map(lt => ({ lot_id: lt.lot_id, qty: lt.qty })),
        }));

      if (!linesToSend.length) {
        setCreateError('Vui lòng thêm ít nhất 1 dòng với lot và số lượng > 0.');
        setCreating(false);
        return;
      }

      const invalidLine = linesToSend.find(l => !l.lots.length);
      if (invalidLine) {
        setCreateError('Mỗi dòng giao phải có ít nhất 1 lô (lot).');
        setCreating(false);
        return;
      }

      const overLine = shipLines.find(l => l.qty > l.qty_remaining);
      if (overLine) {
        setCreateError(`Số lượng giao "${overLine.item_name}" (${overLine.qty}) vượt quá số còn lại (${overLine.qty_remaining}).`);
        setCreating(false);
        return;
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
        setCreateError(res.message || 'Tạo lô giao hàng thất bại');
        setCreating(false);
        return;
      }
      setCreateOpen(false);
      setSuccess('Đã tạo lô giao hàng thành công. Đơn hàng sẽ tự động chuyển trạng thái SHIPPED.');
      loadShipments(1);
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'Có lỗi khi tạo lô giao hàng');
    } finally {
      setCreating(false);
    }
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
            Tạo lô giao hàng từ đơn hàng đã duyệt, chọn lô (lot) cho từng sản phẩm và theo dõi trạng thái giao.
          </p>
        </div>
        <div className='flex gap-2'>
          <button onClick={() => setCreateOpen(true)} className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'>
            <Plus className='h-4 w-4' /> Tạo lô giao hàng
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
                  <button onClick={() => loadDetail(sh._id)} className='rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'>
                    Chi tiết
                  </button>
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
                  {detailShipment.status === 'SHIPPED' && (
                    <button
                      disabled={actionLoadingId === detailShipment._id}
                      onClick={() => updateStatus(detailShipment, 'IN_TRANSIT')}
                      className='rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60'
                    >
                      {actionLoadingId === detailShipment._id ? 'Đang xử lý...' : 'Đang vận chuyển (IN_TRANSIT)'}
                    </button>
                  )}
                  {['SHIPPED', 'IN_TRANSIT'].includes(detailShipment.status) && (
                    <button
                      disabled={actionLoadingId === detailShipment._id}
                      onClick={() => updateStatus(detailShipment, 'DELIVERED')}
                      className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
                    >
                      {actionLoadingId === detailShipment._id ? 'Đang xử lý...' : 'Đã giao đến (DELIVERED)'}
                    </button>
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
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => !creating && setCreateOpen(false)}>
          <div className='w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Tạo lô giao hàng</h2>
              <button onClick={() => !creating && setCreateOpen(false)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {createError && <p className='mb-3 text-sm text-red-600'>{createError}</p>}

            <form onSubmit={submitCreate} className='space-y-4'>
              {/* Select order */}
              <div>
                <label className='block text-sm font-medium text-slate-700'>
                  Chọn đơn hàng ({ORDER_STATUS_FOR_SHIPMENT.join(' / ')})
                </label>
                <select
                  value={selectedOrderId}
                  onChange={e => setSelectedOrderId(e.target.value)}
                  className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
                  required
                >
                  <option value=''>-- Chọn đơn hàng --</option>
                  {orders.map(o => (
                    <option key={o._id} value={o._id}>
                      {o.order_no || o._id} — {o.store_org_unit_id?.name || ''} ({o.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Locations */}
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Kho xuất (Bếp trung tâm)</label>
                  <select value={fromLocationId} onChange={e => setFromLocationId(e.target.value)} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' required>
                    <option value=''>-- Chọn kho xuất --</option>
                    {locations.map(l => (
                      <option key={l._id} value={l._id}>
                        {l.name || l.code} {l.org_unit_id?.name ? `(${l.org_unit_id.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Kho nhận (Cửa hàng)</label>
                  <select value={toLocationId} onChange={e => setToLocationId(e.target.value)} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' required>
                    <option value=''>-- Chọn kho nhận --</option>
                    {locations.map(l => (
                      <option key={l._id} value={l._id}>
                        {l.name || l.code} {l.org_unit_id?.name ? `(${l.org_unit_id.name})` : ''}
                      </option>
                    ))}
                  </select>
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
                  <div className='text-sm font-medium text-slate-700'>
                    Chọn lô (lot) cho từng sản phẩm — FIFO (ưu tiên lot cũ nhất)
                  </div>
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

                      {/* Lot rows */}
                      {line.lots.map((lot, lotIdx) => (
                        <div key={lotIdx} className='mt-1 flex items-center gap-2'>
                          <select
                            value={lot.lot_id}
                            onChange={e => updateLotInLine(lineIdx, lotIdx, 'lot_id', e.target.value)}
                            className='flex-1 rounded border border-slate-200 px-2 py-1 text-sm'
                          >
                            <option value=''>-- Chọn lô --</option>
                            {(lotsByItemId[line.item_id] || []).map(l => (
                              <option key={l._id} value={l._id}>
                                {l.lot_code || l._id}
                                {l.exp_date ? ` (HSD: ${new Date(l.exp_date).toLocaleDateString('vi-VN')})` : ''}
                              </option>
                            ))}
                          </select>
                          <input
                            type='number'
                            min={0}
                            max={line.qty_remaining}
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
                <button type='button' disabled={creating} onClick={() => setCreateOpen(false)} className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'>Hủy</button>
                <button
                  type='submit'
                  disabled={creating || !selectedOrderId || orderDetailLoading || shipLines.length === 0}
                  className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60'
                >
                  {creating ? 'Đang tạo...' : 'Tạo lô giao hàng'}
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
