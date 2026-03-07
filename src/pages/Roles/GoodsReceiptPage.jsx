import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, RefreshCcw, Search } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

const GOODS_RECEIPT_STATUS = {
  DRAFT: 'Nháp',
  RECEIVED: 'Đã nhận',
  PARTIAL: 'Nhận một phần',
  CANCELLED: 'Đã hủy',
};

const SHIPMENT_STATUS = {
  SHIPPED: 'Đã giao',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao đến',
};

function getReceiptList(res) {
  if (!res?.success) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
}

function getShipmentList(res) {
  if (!res?.success) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
}

const PAGE_SIZE = 10;

export default function GoodsReceiptPage() {
  const [receipts, setReceipts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [success, setSuccess] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detailReceipt, setDetailReceipt] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  // Create form: selected shipment & lines
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [shipmentDetail, setShipmentDetail] = useState(null);
  const [shipmentDetailLoading, setShipmentDetailLoading] = useState(false);
  const [lines, setLines] = useState([]);
  const [receivedDate, setReceivedDate] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );

  const loadReceipts = async (page = 1) => {
    setLoading(true);
    setSuccess('');
    try {
      const res = await workflowService.getGoodsReceiptsPaginated({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setReceipts(list);
        setPagination({
          page: res.data.pagination?.page ?? page,
          limit: res.data.pagination?.limit ?? PAGE_SIZE,
          total: res.data.pagination?.total ?? 0,
          pages: res.data.pagination?.pages ?? 1,
        });
      } else {
        setReceipts([]);
      }
    } catch (err) {
      console.error(err);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadShipmentsForCreate = async () => {
    const [shippedRes, inTransitRes, receiptsRes] = await Promise.all([
      workflowService.getShipments({ status: 'SHIPPED', limit: 100 }),
      workflowService.getShipments({ status: 'IN_TRANSIT', limit: 100 }),
      workflowService.getGoodsReceipts({ limit: 500 }),
    ]);
    let list = [...getShipmentList(shippedRes), ...getShipmentList(inTransitRes)];
    const existingShipmentIds = new Set(
      (getReceiptList(receiptsRes) || [])
        .map(r => r.shipment_id?._id ?? r.shipment_id)
        .filter(Boolean)
    );
    list = list.filter(s => !existingShipmentIds.has(s._id));
    setShipments(list);
  };

  useEffect(() => {
    loadReceipts(1);
  }, [statusFilter]);

  useEffect(() => {
    if (createOpen) loadShipmentsForCreate();
  }, [createOpen]);

  // Load shipment detail when user selects a shipment (for lines) – đúng theo BE GET /api/shipments/:id
  useEffect(() => {
    if (!selectedShipmentId) {
      setShipmentDetail(null);
      setShipmentDetailLoading(false);
      setLines([]);
      return;
    }
    let cancelled = false;
    setShipmentDetailLoading(true);
    workflowService.getShipment(selectedShipmentId).then(res => {
      if (cancelled) return;
      setShipmentDetailLoading(false);
      if (!res.success || !res.data) {
        setShipmentDetail(null);
        setLines([]);
        return;
      }
      const ship = res.data;
      setShipmentDetail(ship);
      const lineList = (ship.lines || []).map(l => ({
        shipment_line_id: l._id,
        item_id: l.item_id?._id || l.item_id,
        qty_ship: typeof l.qty === 'number' ? l.qty : Number(l.qty) || 0,
        qty_received: typeof l.qty === 'number' ? l.qty : Number(l.qty) || 0,
        qty_rejected: 0,
      }));
      setLines(lineList);
    });
    return () => { cancelled = true; };
  }, [selectedShipmentId]);

  const loadDetail = async id => {
    setDetailId(id);
    setDetailReceipt(null);
    setDetailError(null);
    if (!id) return;
    const res = await workflowService.getGoodsReceipt(id);
    if (res.success && res.data) {
      setDetailReceipt(res.data);
    } else {
      setDetailError(res.message || 'Không tìm thấy phiếu nhận hàng');
    }
  };

  const filteredReceipts = useMemo(() => {
    const s = (search || '').toLowerCase();
    return receipts.filter(r => {
      const no = r.receipt_no || r._id || '';
      const shipNo = r.shipment_id?.shipment_no || r.shipment_id || '';
      return (
        !s ||
        no.toLowerCase().includes(s) ||
        String(shipNo).toLowerCase().includes(s)
      );
    });
  }, [receipts, search]);

  const handleLineChange = (idx, field, value) => {
    const num = field === 'qty_received' || field === 'qty_rejected' ? Number(value) || 0 : value;
    setLines(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: num };
      return next;
    });
  };

  const submitCreate = async e => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      if (!selectedShipmentId) {
        setCreateError('Vui lòng chọn lô giao hàng.');
        setCreating(false);
        return;
      }
      const payload = {
        shipment_id: selectedShipmentId,
        received_date: receivedDate ? new Date(receivedDate).toISOString() : new Date().toISOString(),
        lines: lines
          .filter(l => l.shipment_line_id && l.item_id)
          .map(l => ({
            shipment_line_id: l.shipment_line_id,
            item_id: l.item_id,
            qty_received: Math.max(0, Number(l.qty_received) || 0),
            qty_rejected: Math.max(0, Number(l.qty_rejected) || 0),
          })),
      };
      const invalidLine = payload.lines.find(
        l => l.qty_received + l.qty_rejected <= 0
      );
      if (invalidLine) {
        setCreateError('Mỗi dòng phải có ít nhất số lượng nhận hoặc từ chối > 0.');
        setCreating(false);
        return;
      }
      const sumMismatch = payload.lines.some((l, idx) => {
        const qtyShip = lines[idx]?.qty_ship ?? 0;
        return l.qty_received + l.qty_rejected > qtyShip;
      });
      if (sumMismatch) {
        setCreateError('Tổng số lượng nhận + từ chối không được vượt quá số lượng giao của từng dòng.');
        setCreating(false);
        return;
      }
      const res = await workflowService.createGoodsReceipt(payload);
      if (!res.success) {
        setCreateError(res.message || 'Tạo phiếu nhận hàng thất bại');
        setCreating(false);
        return;
      }
      setCreateOpen(false);
      setSelectedShipmentId('');
      setShipmentDetail(null);
      setLines([]);
      setSuccess('Đã tạo phiếu nhận hàng (DRAFT).');
      await loadReceipts(1);
    } catch (err) {
      console.error(err);
      setCreateError('Có lỗi khi tạo phiếu nhận hàng');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirm = async receipt => {
    setConfirmingId(receipt._id);
    setSuccess('');
    try {
      const res = await workflowService.confirmGoodsReceipt(receipt._id, {
        status: 'RECEIVED',
      });
      if (res.success) {
        setSuccess(`Đã xác nhận nhận hàng: ${receipt.receipt_no || receipt._id}. Tồn kho đã cập nhật.`);
        setDetailReceipt(prev => (prev?._id === receipt._id ? { ...prev, status: 'RECEIVED' } : prev));
        await loadReceipts(pagination.page);
      } else {
        setSuccess('');
        alert(res.message || 'Xác nhận thất bại');
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Xác nhận thất bại');
    } finally {
      setConfirmingId(null);
    }
  };

  const getItemName = line => {
    const item = line.item_id;
    if (!item) return line.item_id || '-';
    if (typeof item === 'object') return item.name || item.sku || item._id;
    return line.item_id;
  };

  return (
    <div className='min-h-full space-y-6 animate-fade-in'>
      {success && (
        <div className='flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>
          <span>{success}</span>
          <button
            onClick={() => setSuccess('')}
            className='text-xs text-emerald-700/70 hover:text-emerald-900'
          >
            Đóng
          </button>
        </div>
      )}

      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Nhận hàng</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Tạo phiếu nhận hàng từ lô giao, kiểm tra số lượng và xác nhận để cập nhật tồn kho.
          </p>
        </div>
        <div className='flex gap-2'>
          <button
            onClick={() => setCreateOpen(true)}
            className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'
          >
            <Plus className='h-4 w-4' /> Tạo phiếu nhận hàng
          </button>
          <button
            onClick={loadReceipts}
            className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'
          >
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Tìm theo số phiếu / số lô giao...'
            className='input-field w-full pl-9'
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className='input-field min-w-[180px]'
        >
          <option value='ALL'>Tất cả trạng thái</option>
          {Object.entries(GOODS_RECEIPT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Số phiếu</th>
              <th className='px-4 py-3'>Lô giao</th>
              <th className='px-4 py-3'>Ngày nhận</th>
              <th className='px-4 py-3'>Trạng thái</th>
              <th className='px-4 py-3'>Người nhận</th>
              <th className='px-4 py-3 text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && (
              <tr>
                <td colSpan={6} className='px-4 py-6 text-center text-slate-400'>
                  Đang tải...
                </td>
              </tr>
            )}
            {!loading && !filteredReceipts.length && (
              <tr>
                <td colSpan={6} className='px-4 py-6 text-center text-slate-400'>
                  Chưa có phiếu nhận hàng nào.
                </td>
              </tr>
            )}
            {!loading &&
              filteredReceipts.map(r => (
                <tr key={r._id}>
                  <td className='px-4 py-3 font-medium text-slate-900'>
                    {r.receipt_no || r._id}
                  </td>
                  <td className='px-4 py-3 text-slate-700'>
                    {r.shipment_id?.shipment_no || r.shipment_id || '-'}
                  </td>
                  <td className='px-4 py-3 text-slate-700'>
                    {r.received_date
                      ? new Date(r.received_date).toLocaleString('vi-VN')
                      : '-'}
                  </td>
                  <td className='px-4 py-3'>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === 'RECEIVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : r.status === 'DRAFT'
                            ? 'bg-amber-100 text-amber-700'
                            : r.status === 'CANCELLED'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {GOODS_RECEIPT_STATUS[r.status] || r.status}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-slate-700'>
                    {r.received_by?.full_name || r.received_by?.username || r.received_by || '-'}
                  </td>
                  <td className='px-4 py-3 text-right'>
                    <button
                      onClick={() => loadDetail(r._id)}
                      className='mr-2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'
                    >
                      Chi tiết
                    </button>
                    {r.status === 'DRAFT' && (
                      <button
                        onClick={() => handleConfirm(r)}
                        disabled={confirmingId === r._id}
                        className='rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
                      >
                        {confirmingId === r._id ? 'Đang xác nhận...' : 'Xác nhận nhận hàng'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination theo BE */}
      {pagination.total > 0 && (
        <div className='flex items-center justify-between text-sm text-slate-500'>
          <p>
            Hiển thị {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} phiếu
          </p>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => loadReceipts(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
            >
              Trước
            </button>
            <span>
              Trang {pagination.page} / {Math.max(1, pagination.pages)}
            </span>
            <button
              type='button'
              onClick={() => loadReceipts(pagination.page + 1)}
              disabled={pagination.page >= Math.max(1, pagination.pages)}
              className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* Modal chi tiết phiếu – render qua Portal để luôn căn giữa viewport */}
      {detailId && createPortal(
        <div
          className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4'
          onClick={() => setDetailId(null)}
        >
          <div
            className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>
                Chi tiết phiếu nhận hàng
              </h2>
              <button
                onClick={() => setDetailId(null)}
                className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'
              >
                ×
              </button>
            </div>
            {!detailReceipt && !detailError && <p className='text-sm text-slate-500'>Đang tải...</p>}
            {detailError && <p className='text-sm text-red-600'>{detailError}</p>}
            {detailReceipt && (
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-2 text-sm'>
                  <span className='text-slate-500'>Số phiếu:</span>
                  <span className='font-medium'>{detailReceipt.receipt_no || detailReceipt._id}</span>
                  <span className='text-slate-500'>Lô giao:</span>
                  <span className='font-medium'>
                    {detailReceipt.shipment_id?.shipment_no || detailReceipt.shipment_id}
                  </span>
                  <span className='text-slate-500'>Ngày nhận:</span>
                  <span>
                    {detailReceipt.received_date
                      ? new Date(detailReceipt.received_date).toLocaleString('vi-VN')
                      : '-'}
                  </span>
                  <span className='text-slate-500'>Trạng thái:</span>
                  <span>
                    {GOODS_RECEIPT_STATUS[detailReceipt.status] || detailReceipt.status}
                  </span>
                </div>
                <div>
                  <h3 className='mb-2 text-sm font-medium text-slate-700'>Chi tiết dòng</h3>
                  <table className='w-full text-sm'>
                    <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                      <tr>
                        <th className='px-3 py-2'>Sản phẩm</th>
                        <th className='px-3 py-2'>Nhận</th>
                        <th className='px-3 py-2'>Từ chối</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {(detailReceipt.lines || []).map((line, idx) => (
                        <tr key={line._id || idx}>
                          <td className='px-3 py-2'>{getItemName(line)}</td>
                          <td className='px-3 py-2'>{line.qty_received ?? 0}</td>
                          <td className='px-3 py-2'>{line.qty_rejected ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {detailReceipt.status === 'DRAFT' && (
                  <div className='flex justify-end border-t pt-4'>
                    <button
                      onClick={() => handleConfirm(detailReceipt)}
                      disabled={confirmingId === detailReceipt._id}
                      className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
                    >
                      {confirmingId === detailReceipt._id ? 'Đang xác nhận...' : 'Xác nhận nhận hàng'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Modal tạo phiếu nhận hàng – render qua Portal */}
      {createOpen && createPortal(
        <div
          className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4'
          onClick={() => !creating && setCreateOpen(false)}
        >
          <div
            className='w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>
                Tạo phiếu nhận hàng
              </h2>
              <button
                onClick={() => !creating && setCreateOpen(false)}
                className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'
              >
                ×
              </button>
            </div>
            {createError && (
              <p className='mb-3 text-sm text-red-600'>{createError}</p>
            )}

            <form onSubmit={submitCreate} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700'>
                  Chọn lô giao hàng (đã giao / đang vận chuyển)
                </label>
                <select
                  value={selectedShipmentId}
                  onChange={e => setSelectedShipmentId(e.target.value)}
                  className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
                  required
                >
                  <option value=''>-- Chọn lô giao --</option>
                  {shipments.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.shipment_no || s._id} –{' '}
                      {s.ship_date
                        ? new Date(s.ship_date).toLocaleDateString('vi-VN')
                        : ''}{' '}
                      ({SHIPMENT_STATUS[s.status] || s.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700'>
                  Ngày giờ nhận hàng
                </label>
                <input
                  type='datetime-local'
                  value={receivedDate}
                  onChange={e => setReceivedDate(e.target.value)}
                  className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
                />
              </div>

              {shipmentDetailLoading && (
                <p className='text-sm text-slate-500'>Đang tải chi tiết lô giao...</p>
              )}
              {shipmentDetail && lines.length > 0 && !shipmentDetailLoading && (
                <div className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                  <div className='text-sm font-medium text-slate-700'>
                    Kiểm tra số lượng: nhập số lượng nhận (đạt) và từ chối (không đạt). Tổng = số lượng giao.
                  </div>
                  <table className='w-full text-sm'>
                    <thead className='text-left text-xs text-slate-500'>
                      <tr>
                        <th className='px-2 py-2'>Sản phẩm</th>
                        <th className='px-2 py-2'>Số lượng giao</th>
                        <th className='px-2 py-2'>Số lượng nhận</th>
                        <th className='px-2 py-2'>Số lượng từ chối</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100 bg-white'>
                      {lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className='px-2 py-2'>
                            {shipmentDetail.lines?.[idx]?.item_id?.name ||
                              shipmentDetail.lines?.[idx]?.item_id?.sku ||
                              line.item_id ||
                              '-'}
                          </td>
                          <td className='px-2 py-2'>{line.qty_ship}</td>
                          <td className='px-2 py-2'>
                            <input
                              type='number'
                              min={0}
                              max={line.qty_ship}
                              value={line.qty_received}
                              onChange={e =>
                                handleLineChange(idx, 'qty_received', e.target.value)
                              }
                              className='w-20 rounded border border-slate-200 px-2 py-1 text-sm'
                            />
                          </td>
                          <td className='px-2 py-2'>
                            <input
                              type='number'
                              min={0}
                              max={line.qty_ship}
                              value={line.qty_rejected}
                              onChange={e =>
                                handleLineChange(idx, 'qty_rejected', e.target.value)
                              }
                              className='w-20 rounded border border-slate-200 px-2 py-1 text-sm'
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className='text-xs text-slate-500'>
                    Ghi nhận qty_received (đạt) và qty_rejected (không đạt). Tổng nên bằng số lượng giao.
                  </p>
                </div>
              )}

              <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                <button
                  type='button'
                  disabled={creating}
                  onClick={() => setCreateOpen(false)}
                  className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  disabled={creating || !selectedShipmentId || shipmentDetailLoading || lines.length === 0}
                  className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60'
                >
                  {creating ? 'Đang tạo...' : 'Tạo phiếu (DRAFT)'}
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
