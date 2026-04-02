import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCcw, Search } from 'lucide-react';
import { workflowService } from '../../services/workflowService';
import { useNavigate } from 'react-router-dom';

const PROD_STATUS_LABEL = {
  SUFFICIENT: 'Đủ tồn kho',
  PARTIAL: 'Thiếu một phần',
  NEED_PRODUCTION: 'Cần sản xuất',
};

const prodStatusColor = {
  SUFFICIENT: 'bg-emerald-100 text-emerald-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  NEED_PRODUCTION: 'bg-red-100 text-red-700',
};

const today = () => new Date().toISOString().slice(0, 10);

function formatVnd(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '-';
  return `${v.toLocaleString('vi-VN')} đ`;
}

/** Thông tin COD từ đơn nội bộ (getInternalOrder) */
function getCodSummary(pay) {
  if (!pay || pay.payment_method !== 'COD') return null;
  const amount = Number(pay.total_amount ?? 0);
  const status = pay.payment_status || '';
  const collected = ['COD_COLLECTED', 'COD_CONFIRMED', 'PAID'].includes(status);
  return { amount, collected, status };
}

function getItemName(row) {
  if (!row) return '-';
  if (row.item_name) return row.item_name;
  if (row.item_id && typeof row.item_id === 'object') return row.item_id.name || row.item_id.sku || row.item_id._id || '-';
  return row.item_id || '-';
}

function getUomLabel(row) {
  if (!row) return '-';
  if (row.uom_id && typeof row.uom_id === 'object') return row.uom_id.code || row.uom_id.name || row.uom_id._id || '-';
  return row.uom_id || '-';
}

const PAGE_SIZE = 20;

export default function SupplyOrdersPage() {
  const navigate = useNavigate();
  const [deliveryDate, setDeliveryDate] = useState(today());
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const [detailId, setDetailId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [orderPaymentById, setOrderPaymentById] = useState({});
  const [detailPaymentLoading, setDetailPaymentLoading] = useState(false);

  const loadData = useCallback(async (page = 1) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await workflowService.getConsolidatedOrders({ delivery_date: deliveryDate, page, limit: PAGE_SIZE });
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setRows(list);
        const p = res.data.pagination ?? {};
        setPagination({ page: p.page ?? page, limit: p.limit ?? PAGE_SIZE, total: p.total ?? 0, pages: p.pages ?? 1 });
      } else {
        setRows([]);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [deliveryDate]);

  const handleGenerate = async () => {
    const res = await workflowService.generateConsolidatedOrders({ delivery_date: deliveryDate });
    setMessage(res.success ? 'Tạo tổng hợp đơn hàng thành công.' : (res.message || 'Thất bại'));
    await loadData();
  };

  useEffect(() => { loadData(); }, [loadData]);

  const filteredRows = useMemo(() => {
    const s = (search || '').toLowerCase();
    return rows.filter(r => {
      const name = getItemName(r);
      return !s || name.toLowerCase().includes(s);
    });
  }, [rows, search]);

  /* ─── Detail (BE không có GET theo id — lấy từ danh sách / refetch theo ngày) ─── */
  const loadDetail = async id => {
    setDetailId(id);
    setDetailData(null);
    setDetailError(null);
    setOrderPaymentById({});
    if (!id) return;
    let row = rows.find(r => r._id === id);
    if (!row) {
      try {
        const res = await workflowService.getConsolidatedOrders({
          delivery_date: deliveryDate,
          page: 1,
          limit: 500,
        });
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        row = list.find(r => r._id === id);
      } catch {
        row = null;
      }
    }
    if (!row) {
      setDetailError('Không tìm thấy dữ liệu');
      return;
    }
    setDetailData(row);

    const orderIds = new Set();
    (row.stores || []).forEach(s => {
      const orderObj = s?.order_id && typeof s.order_id === 'object' ? s.order_id : null;
      const oid =
        orderObj?._id ??
        orderObj?.id ??
        (typeof s?.order_id === 'string' ? s.order_id : null);
      if (oid) orderIds.add(String(oid));
    });
    if (orderIds.size === 0) return;

    setDetailPaymentLoading(true);
    try {
      const entries = await Promise.all(
        [...orderIds].map(async oid => {
          const res = await workflowService.getInternalOrder(oid);
          return [oid, res.success && res.data ? res.data : null];
        }),
      );
      const map = {};
      entries.forEach(([k, v]) => {
        if (v) map[k] = v;
      });
      setOrderPaymentById(map);
    } finally {
      setDetailPaymentLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetailData(null);
    setDetailError(null);
    setOrderPaymentById({});
    setDetailPaymentLoading(false);
  };

  const shipmentOrders = useMemo(() => {
    if (!(detailData?.stores || []).length) return [];
    const byId = new Map();

    (detailData.stores || []).forEach(s => {
      const orderObj = s?.order_id && typeof s.order_id === 'object' ? s.order_id : null;
      const orderId = orderObj?._id ?? orderObj?.id ?? (typeof s?.order_id === 'string' ? s.order_id : null);
      if (!orderId) return;
      const idStr = String(orderId);
      if (byId.has(idStr)) return;

      const pay = orderPaymentById[idStr];
      byId.set(idStr, {
        _id: idStr,
        order_no: orderObj?.order_no || pay?.order_no || idStr,
        status: orderObj?.status || pay?.status || '',
        payment_method: pay?.payment_method,
        payment_status: pay?.payment_status,
        total_amount: pay?.total_amount,
      });
    });

    return Array.from(byId.values());
  }, [detailData, orderPaymentById]);

  const handleCreateShipmentFromOrder = (orderId) => {
    if (!orderId) return;
    // Điều hướng sang màn tạo phiếu giao của CentralShipmentsPage để tái sử dụng luồng lot/FIFO.
    navigate(
      `/app/central/shipments?create=1&orderId=${encodeURIComponent(orderId)}&shipDate=${encodeURIComponent(`${deliveryDate}T09:00`)}`
    );
  };

  return (
    <div className='min-h-full space-y-6 animate-fade-in'>
      {message && (
        <div className='flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>
          <span>{message}</span>
          <button onClick={() => setMessage('')} className='text-xs text-emerald-700/70 hover:text-emerald-900'>Đóng</button>
        </div>
      )}

      {/* Header */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Tổng hợp & phân loại đơn hàng</h1>
          <p className='mt-1 text-sm text-slate-500'>Tổng hợp nhu cầu theo ngày giao, kiểm tra tồn kho và trạng thái sản xuất.</p>
        </div>
        <div className='flex gap-2'>
          <input type='date' value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className='input-field w-full' />
          <button onClick={handleGenerate} className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'>Generate</button>
          <button onClick={() => loadData()} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      {/* Search */}
      <div className='relative max-w-md'>
        <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Tìm sản phẩm...' className='input-field w-full pl-9' />
      </div>

      {/* Table */}
      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Sản phẩm</th>
              <th className='px-4 py-3'>ĐVT</th>
              <th className='px-4 py-3 text-right'>Tổng SL đặt</th>
              <th className='px-4 py-3 text-right'>Tồn kho</th>
              <th className='px-4 py-3 text-right'>Cần SX</th>
              <th className='px-4 py-3'>Trạng thái SX</th>
              <th className='px-4 py-3'>Số CH</th>
              <th className='px-4 py-3 text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && <tr><td colSpan={8} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td></tr>}
            {!loading && !filteredRows.length && <tr><td colSpan={8} className='px-4 py-6 text-center text-slate-400'>Không có dữ liệu.</td></tr>}
            {!loading && filteredRows.map((row, idx) => (
              <tr key={row._id || idx} className='hover:bg-slate-50/50'>
                <td className='px-4 py-3 font-medium text-slate-900'>{getItemName(row)}</td>
                <td className='px-4 py-3 text-slate-700'>{getUomLabel(row)}</td>
                <td className='px-4 py-3 text-right text-slate-700'>{row.total_qty_ordered ?? row.total_qty ?? '-'}</td>
                <td className='px-4 py-3 text-right text-slate-700'>{row.available_inventory ?? '-'}</td>
                <td className='px-4 py-3 text-right text-slate-700'>{row.need_to_produce ?? '-'}</td>
                <td className='px-4 py-3'>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${prodStatusColor[row.production_status] || 'bg-slate-100 text-slate-600'}`}>
                    {PROD_STATUS_LABEL[row.production_status] || row.production_status || '-'}
                  </span>
                </td>
                <td className='px-4 py-3 text-slate-700'>{(row.stores || []).length}</td>
                <td className='px-4 py-3 text-right'>
                  <button onClick={() => loadDetail(row._id)} className='rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'>Chi tiết</button>
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
            <button onClick={() => loadData(pagination.page - 1)} disabled={pagination.page <= 1} className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'>Trước</button>
            <span>Trang {pagination.page} / {Math.max(1, pagination.pages)}</span>
            <button onClick={() => loadData(pagination.page + 1)} disabled={pagination.page >= Math.max(1, pagination.pages)} className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'>Sau</button>
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {detailId && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={closeDetail}>
          <div className='w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Chi tiết tổng hợp đơn hàng</h2>
              <button onClick={closeDetail} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>

            {!detailData && !detailError && <p className='text-sm text-slate-500'>Đang tải...</p>}
            {detailError && <p className='text-sm text-red-600'>{detailError}</p>}
            {detailData && detailPaymentLoading && (
              <p className='mb-2 text-xs text-slate-500'>Đang tải thông tin thanh toán / COD...</p>
            )}
            {detailData && (
              <div className='space-y-4'>
                {/* Summary */}
                <div className='rounded-lg border border-slate-200 bg-slate-50/50 p-3'>
                  <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-sm'>
                    <span className='text-slate-500'>Sản phẩm:</span>
                    <span className='font-medium'>{getItemName(detailData)}</span>
                    <span className='text-slate-500'>ĐVT:</span>
                    <span>{getUomLabel(detailData)}</span>
                    <span className='text-slate-500'>Ngày giao:</span>
                    <span>{detailData.delivery_date ? new Date(detailData.delivery_date).toLocaleDateString('vi-VN') : '-'}</span>
                    <span className='text-slate-500'>Tổng SL đặt:</span>
                    <span className='font-medium'>{detailData.total_qty_ordered ?? '-'}</span>
                    <span className='text-slate-500'>Tồn kho khả dụng:</span>
                    <span>{detailData.available_inventory ?? '-'}</span>
                    <span className='text-slate-500'>Cần sản xuất:</span>
                    <span className='font-medium text-orange-600'>{detailData.need_to_produce ?? '-'}</span>
                    <span className='text-slate-500'>Trạng thái SX:</span>
                    <span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${prodStatusColor[detailData.production_status] || 'bg-slate-100'}`}>
                        {PROD_STATUS_LABEL[detailData.production_status] || detailData.production_status || '-'}
                      </span>
                    </span>
                    <span className='text-slate-500'>Ngày tổng hợp:</span>
                    <span>{detailData.consolidation_date ? new Date(detailData.consolidation_date).toLocaleString('vi-VN') : '-'}</span>
                    <span className='text-slate-500'>Người tạo:</span>
                    <span>{detailData.created_by?.full_name || detailData.created_by?.username || '-'}</span>
                  </div>
                </div>

                {/* Store breakdown */}
                <div>
                  <h3 className='mb-2 text-sm font-medium text-slate-700'>Chi tiết theo cửa hàng ({(detailData.stores || []).length})</h3>
                  {!(detailData.stores || []).length && <p className='text-sm text-slate-400'>Không có dữ liệu cửa hàng.</p>}
                  {(detailData.stores || []).length > 0 && (
                    <table className='w-full text-sm'>
                      <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                        <tr>
                          <th className='px-3 py-2'>#</th>
                          <th className='px-3 py-2'>Cửa hàng</th>
                          <th className='px-3 py-2'>Đơn hàng</th>
                          <th className='px-3 py-2 text-right'>Số lượng</th>
                          <th className='px-3 py-2'>Thu hộ (COD)</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-slate-100'>
                        {detailData.stores.map((s, idx) => {
                          const storeName = s.store_id && typeof s.store_id === 'object'
                            ? (s.store_id.name || s.store_id.code || s.store_id._id)
                            : (s.store_id || '-');
                          const orderObj = s.order_id && typeof s.order_id === 'object' ? s.order_id : null;
                          const oid =
                            orderObj?._id ??
                            orderObj?.id ??
                            (typeof s?.order_id === 'string' ? s.order_id : null);
                          const orderNo = orderObj
                            ? (orderObj.order_no || orderObj._id)
                            : (s.order_id || '-');
                          const pay = oid ? orderPaymentById[String(oid)] : null;
                          const cod = getCodSummary(pay);
                          return (
                            <tr key={idx}>
                              <td className='px-3 py-2 text-slate-400'>{idx + 1}</td>
                              <td className='px-3 py-2 font-medium text-slate-800'>{storeName}</td>
                              <td className='px-3 py-2 text-slate-700'>{orderNo}</td>
                              <td className='px-3 py-2 text-right text-slate-700'>{s.qty ?? '-'}</td>
                              <td className='px-3 py-2 align-top'>
                                {!pay && detailPaymentLoading && (
                                  <span className='text-xs text-slate-400'>...</span>
                                )}
                                {pay && !cod && (
                                  <span className='text-xs text-slate-500'>Không phải COD</span>
                                )}
                                {cod && (
                                  <div className='space-y-1'>
                                    <div className='font-medium text-amber-900'>
                                      {formatVnd(cod.amount)}
                                    </div>
                                    {cod.collected ? (
                                      <span className='inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800'>
                                        Đã thu COD thành công
                                      </span>
                                    ) : (
                                      <span className='text-[11px] text-amber-800'>
                                        Chờ thu khi giao
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Shipment creation per internal order */}
                <div>
                  <h3 className='mb-2 text-sm font-medium text-slate-700'>Tạo phiếu giao theo từng đơn</h3>
                  {!shipmentOrders.length && <p className='text-sm text-slate-400'>Không có đơn hợp lệ để tạo phiếu giao.</p>}
                  {!!shipmentOrders.length && (
                    <div className='space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                      {shipmentOrders.map(o => {
                        const eligible = ['APPROVED', 'PROCESSING'].includes(o.status);
                        const cod = getCodSummary(o);
                        return (
                          <div
                            key={o._id}
                            className='flex flex-col gap-2 rounded-lg border border-slate-100 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'
                          >
                            <div className='min-w-0 flex-1 text-sm'>
                              <div className='font-medium text-slate-800'>{o.order_no}</div>
                              <div className='text-xs text-slate-500'>Trạng thái: {o.status || '-'}</div>
                              {cod && (
                                <div className='mt-2 rounded-md border border-amber-200 bg-amber-50/80 px-2 py-1.5 text-xs'>
                                  <span className='font-semibold text-amber-900'>COD — thu hộ: </span>
                                  <span className='text-amber-950'>{formatVnd(cod.amount)}</span>
                                  {cod.collected ? (
                                    <span className='ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800'>
                                      Đã thu thành công
                                    </span>
                                  ) : (
                                    <span className='ml-2 text-amber-800'>Chờ thu khi giao</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              type='button'
                              disabled={!eligible}
                              onClick={() => handleCreateShipmentFromOrder(o._id)}
                              className='shrink-0 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60'
                            >
                              Tạo phiếu giao
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
