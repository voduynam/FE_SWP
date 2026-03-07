import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, Search } from 'lucide-react';
import { workflowService } from '../../services/workflowService';
import { useAuth } from '../../contexts/AuthContext';

const ORDER_STATUS = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã gửi',
  APPROVED: 'Đã phê duyệt',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đã giao',
  RECEIVED: 'Đã nhận',
  CANCELLED: 'Đã hủy',
};

const PAGE_SIZE = 10;

/** Trả về ngày giờ hiện tại (local) dạng yyyy-MM-ddThh:mm cho input datetime-local */
function getLocalDateTimeString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

export default function FranchiseOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [items, setItems] = useState([]);
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

  const [newOrder, setNewOrder] = useState({
    order_date: getLocalDateTimeString(),
    is_urgent: false,
    lines: [{ item_id: '', qty_ordered: 1, uom_id: '', unit_price: 0 }],
  });

  const loadOrders = async (page = 1) => {
    setLoading(true);
    setSuccess('');
    try {
      // BE tự filter theo req.user.org_unit_id cho Store Staff, không cần gửi store_org_unit_id (tránh 400)
      const res = await workflowService.getInternalOrdersPaginated({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setOrders(list);
        setPagination({
          page: res.data.pagination?.page ?? page,
          limit: res.data.pagination?.limit ?? PAGE_SIZE,
          total: res.data.pagination?.total ?? 0,
          pages: res.data.pagination?.pages ?? 1,
        });
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    const result = await workflowService.getItems({ status: 'ACTIVE', limit: 100 });
    if (result.success) {
      const rows = Array.isArray(result.data) ? result.data : (result.data?.data ?? result.data);
      setItems(Array.isArray(rows) ? rows : []);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    loadOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Mỗi lần mở modal tạo đơn, đặt lại ngày giờ = hiện tại (local)
  useEffect(() => {
    if (createOpen) {
      setNewOrder(prev => ({ ...prev, order_date: getLocalDateTimeString() }));
    }
  }, [createOpen]);

  const loadDetail = async id => {
    setDetailId(id);
    setDetailOrder(null);
    setDetailError(null);
    if (!id) return;
    const res = await workflowService.getInternalOrder(id);
    if (res.success && res.data) {
      setDetailOrder(res.data);
    } else {
      setDetailError(res.message || 'Không tìm thấy đơn hàng');
    }
  };

  const filteredOrders = useMemo(() => {
    const s = (search || '').toLowerCase();
    return orders.filter(o => {
      const no = o.order_no || o._id || '';
      const unitName = o.store_org_unit_id?.name || '';
      return !s || no.toLowerCase().includes(s) || (unitName && unitName.toLowerCase().includes(s));
    });
  }, [orders, search]);

  const handleLineChange = (idx, field, value) => {
    setNewOrder(prev => {
      const lines = [...prev.lines];
      let v = value;
      if (field === 'qty_ordered' || field === 'unit_price') v = Number(value) || 0;
      lines[idx] = { ...lines[idx], [field]: v };
      if (field === 'item_id') {
        const it = items.find(i => i._id === value);
        if (it) {
          lines[idx].uom_id = it.base_uom_id?._id || '';
          lines[idx].unit_price = it.base_sell_price ?? it.cost_price ?? 0;
        }
      }
      return { ...prev, lines };
    });
  };

  const addLine = () => {
    setNewOrder(prev => ({
      ...prev,
      lines: [...prev.lines, { item_id: '', qty_ordered: 1, uom_id: '', unit_price: 0 }],
    }));
  };

  const removeLine = idx => {
    setNewOrder(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx),
    }));
  };

  const validateAndBuildBody = () => {
    const lines = newOrder.lines
      .filter(l => l.item_id && (l.qty_ordered || 0) > 0)
      .map(l => ({
        item_id: l.item_id,
        qty_ordered: Number(l.qty_ordered) || 0,
        uom_id: l.uom_id,
        unit_price: Math.max(0, Number(l.unit_price) || 0),
      }));
    if (lines.length === 0) return { error: 'Vui lòng chọn ít nhất 1 sản phẩm với số lượng > 0.', body: null };
    if (lines.some(l => l.qty_ordered <= 0)) return { error: 'Số lượng đặt hàng phải lớn hơn 0.', body: null };
    // order_date từ datetime-local dạng "yyyy-MM-ddThh:mm" (giờ local) → parse local rồi gửi ISO
    const orderDateISO = newOrder.order_date
      ? new Date(newOrder.order_date).toISOString()
      : new Date().toISOString();
    const body = {
      store_org_unit_id: user?.org_unit_id || undefined,
      order_date: orderDateISO,
      is_urgent: Boolean(newOrder.is_urgent),
      lines,
    };
    return { error: null, body };
  };

  /** Gửi đơn đến bếp trung tâm: tạo đơn (DRAFT) rồi gửi ngay (SUBMITTED) – đúng luồng đặt hàng */
  const submitCreateAndSend = async e => {
    e.preventDefault();
    const { error, body } = validateAndBuildBody();
    if (error) {
      setCreateError(error);
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const createRes = await workflowService.createInternalOrder(body);
      if (!createRes.success) {
        setCreateError(createRes.message || 'Tạo đơn thất bại');
        setCreating(false);
        return;
      }
      const createdOrder = createRes.data?.data ?? createRes.data;
      const orderId = createdOrder?._id;
      if (!orderId) {
        setCreateError('Không nhận được mã đơn từ server.');
        setCreating(false);
        return;
      }
      const orderNo = createdOrder?.order_no || orderId;
      const statusRes = await workflowService.updateInternalOrderStatus(orderId, 'SUBMITTED');
      if (!statusRes.success) {
        setCreateError(statusRes.message || 'Đơn đã tạo nhưng gửi thất bại. Vui lòng vào Chi tiết đơn để Gửi đơn.');
        setCreating(false);
        return;
      }
      setCreateOpen(false);
      setNewOrder({
        order_date: getLocalDateTimeString(),
        is_urgent: false,
        lines: [{ item_id: '', qty_ordered: 1, uom_id: '', unit_price: 0 }],
      });
      setSuccess(`Đã đặt hàng và gửi đơn ${orderNo} lên bếp trung tâm.`);
      setCreateError('');
      loadOrders(1).catch(() => { /* danh sách sẽ cập nhật khi user tự refresh */ });
    } catch (err) {
      console.error(err);
      setCreateError(err?.response?.data?.message || 'Có lỗi khi đặt hàng');
    } finally {
      setCreating(false);
    }
  };

  /** Chỉ lưu nháp (DRAFT), không gửi – dùng khi muốn soạn sau rồi gửi */
  const submitCreateDraftOnly = async e => {
    e.preventDefault();
    const { error, body } = validateAndBuildBody();
    if (error) {
      setCreateError(error);
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const res = await workflowService.createInternalOrder(body);
      if (!res.success) {
        setCreateError(res.message || 'Lưu nháp thất bại');
        setCreating(false);
        return;
      }
      setCreateOpen(false);
      setNewOrder({
        order_date: getLocalDateTimeString(),
        is_urgent: false,
        lines: [{ item_id: '', qty_ordered: 1, uom_id: '', unit_price: 0 }],
      });
      setSuccess('Đã lưu nháp. Vào Chi tiết đơn và bấm "Gửi đơn" khi sẵn sàng gửi lên bếp trung tâm.');
      setCreateError('');
      loadOrders(1).catch(() => {});
    } catch (err) {
      console.error(err);
      setCreateError(err?.response?.data?.message || 'Có lỗi khi lưu nháp');
    } finally {
      setCreating(false);
    }
  };

  const submitOrder = async order => {
    if (order.status !== 'DRAFT') return;
    setActionLoadingId(order._id);
    setSuccess('');
    try {
      const res = await workflowService.updateInternalOrderStatus(order._id, 'SUBMITTED');
      if (res.success) {
        setSuccess(`Đơn ${order.order_no || order._id} đã gửi (SUBMITTED). Không thể chỉnh sửa sau khi gửi.`);
        setDetailOrder(prev => (prev?._id === order._id ? { ...prev, status: 'SUBMITTED' } : prev));
        await loadOrders(pagination.page);
      } else {
        setSuccess('');
        alert(res.message || 'Gửi đơn thất bại');
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Gửi đơn thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const cancelOrder = async order => {
    if (order.status !== 'DRAFT') return;
    if (!window.confirm(`Hủy đơn ${order.order_no || order._id}?`)) return;
    setActionLoadingId(order._id);
    setSuccess('');
    try {
      const res = await workflowService.updateInternalOrderStatus(order._id, 'CANCELLED');
      if (res.success) {
        setSuccess(`Đơn ${order.order_no || order._id} đã hủy.`);
        setDetailId(null);
        setDetailOrder(null);
        await loadOrders(pagination.page);
      } else {
        alert(res.message || 'Hủy đơn thất bại');
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Hủy đơn thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getItemName = line => {
    const item = line.item_id;
    if (!item) return '-';
    if (typeof item === 'object') return item.name || item.sku || item._id;
    return line.item_id;
  };

  return (
    <div className='space-y-6 animate-fade-in'>
      {success && (
        <div className='flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className='text-xs text-emerald-700/70 hover:text-emerald-900'>
            Đóng
          </button>
        </div>
      )}

      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Đơn hàng nội bộ</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Đặt hàng từ cửa hàng: tạo đơn và gửi lên bếp trung tâm để nhận hàng. Có thể lưu nháp nếu chưa gửi ngay.
          </p>
        </div>
        <div className='flex gap-2'>
          <button
            onClick={() => setCreateOpen(true)}
            className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'
          >
            <Plus className='h-4 w-4' /> Tạo đơn mới
          </button>
          <button
            onClick={() => loadOrders(1)}
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
            placeholder='Tìm theo số đơn / cửa hàng...'
            className='input-field w-full pl-9'
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className='input-field min-w-[180px]'
        >
          <option value='ALL'>Tất cả trạng thái</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Số đơn</th>
              <th className='px-4 py-3'>Ngày đặt</th>
              <th className='px-4 py-3'>Gấp</th>
              <th className='px-4 py-3'>Tổng tiền</th>
              <th className='px-4 py-3'>Trạng thái</th>
              <th className='px-4 py-3 text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && (
              <tr>
                <td colSpan={6} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td>
              </tr>
            )}
            {!loading && !filteredOrders.length && (
              <tr>
                <td colSpan={6} className='px-4 py-6 text-center text-slate-400'>Không có đơn nào.</td>
              </tr>
            )}
            {!loading && filteredOrders.map(o => (
              <tr key={o._id}>
                <td className='px-4 py-3 font-medium text-slate-900'>{o.order_no || o._id}</td>
                <td className='px-4 py-3 text-slate-700'>
                  {o.order_date ? new Date(o.order_date).toLocaleString('vi-VN') : '-'}
                </td>
                <td className='px-4 py-3 text-xs'>
                  {o.is_urgent ? (
                    <span className='inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600'>Gấp</span>
                  ) : (
                    <span className='text-slate-400'>Thường</span>
                  )}
                </td>
                <td className='px-4 py-3 text-slate-800'>
                  {o.total_amount != null ? Number(o.total_amount).toLocaleString('vi-VN') + ' đ' : '-'}
                </td>
                <td className='px-4 py-3'>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    o.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' :
                    o.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' :
                    o.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {ORDER_STATUS[o.status] || o.status}
                  </span>
                </td>
                <td className='px-4 py-3 text-right'>
                  <button
                    onClick={() => loadDetail(o._id)}
                    className='mr-2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'
                  >
                    Chi tiết
                  </button>
                  {o.status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => submitOrder(o)}
                        disabled={actionLoadingId === o._id}
                        className='mr-2 rounded-md bg-orange-500 px-2 py-1 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-60'
                      >
                        {actionLoadingId === o._id ? 'Đang gửi...' : 'Gửi đơn'}
                      </button>
                      <button
                        onClick={() => cancelOrder(o)}
                        disabled={actionLoadingId === o._id}
                        className='rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60'
                      >
                        Hủy đơn
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.total > 0 && (
        <div className='flex items-center justify-between text-sm text-slate-500'>
          <p>
            Hiển thị {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} đơn
          </p>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => loadOrders(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
            >
              Trước
            </button>
            <span>Trang {pagination.page} / {Math.max(1, pagination.pages)}</span>
            <button
              type='button'
              onClick={() => loadOrders(pagination.page + 1)}
              disabled={pagination.page >= Math.max(1, pagination.pages)}
              className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* Modal chi tiết đơn */}
      {detailId && (
        <div className='fixed inset-0 z-50 bg-slate-900/40' onClick={() => setDetailId(null)}>
          <div
            className='absolute left-1/2 top-1/2 max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Chi tiết đơn hàng</h2>
              <button onClick={() => setDetailId(null)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {!detailOrder && !detailError && <p className='text-sm text-slate-500'>Đang tải...</p>}
            {detailError && <p className='text-sm text-red-600'>{detailError}</p>}
            {detailOrder && (
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-2 text-sm'>
                  <span className='text-slate-500'>Số đơn:</span>
                  <span className='font-medium'>{detailOrder.order_no || detailOrder._id}</span>
                  <span className='text-slate-500'>Cửa hàng:</span>
                  <span className='font-medium'>{detailOrder.store_org_unit_id?.name || detailOrder.store_org_unit_id || '-'}</span>
                  <span className='text-slate-500'>Ngày đặt:</span>
                  <span>{detailOrder.order_date ? new Date(detailOrder.order_date).toLocaleString('vi-VN') : '-'}</span>
                  <span className='text-slate-500'>Trạng thái:</span>
                  <span>{ORDER_STATUS[detailOrder.status] || detailOrder.status}</span>
                  <span className='text-slate-500'>Tổng tiền:</span>
                  <span>{detailOrder.total_amount != null ? Number(detailOrder.total_amount).toLocaleString('vi-VN') + ' đ' : '-'}</span>
                </div>
                <div>
                  <h3 className='mb-2 text-sm font-medium text-slate-700'>Dòng đơn hàng</h3>
                  <table className='w-full text-sm'>
                    <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                      <tr>
                        <th className='px-3 py-2'>Sản phẩm</th>
                        <th className='px-3 py-2'>SL đặt</th>
                        <th className='px-3 py-2'>Đã giao</th>
                        <th className='px-3 py-2'>Đã nhận</th>
                        <th className='px-3 py-2'>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {(detailOrder.lines || []).map((line, idx) => (
                        <tr key={line._id || idx}>
                          <td className='px-3 py-2'>{getItemName(line)}</td>
                          <td className='px-3 py-2'>{line.qty_ordered ?? 0}</td>
                          <td className='px-3 py-2'>{line.fulfillment?.qty_shipped_total ?? 0}</td>
                          <td className='px-3 py-2'>{line.fulfillment?.qty_received_total ?? 0}</td>
                          <td className='px-3 py-2'>{line.line_total != null ? Number(line.line_total).toLocaleString('vi-VN') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {detailOrder.status === 'DRAFT' && (
                  <div className='flex justify-end gap-2 border-t pt-4'>
                    <button
                      onClick={() => cancelOrder(detailOrder)}
                      disabled={actionLoadingId === detailOrder._id}
                      className='rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60'
                    >
                      Hủy đơn
                    </button>
                    <button
                      onClick={() => submitOrder(detailOrder)}
                      disabled={actionLoadingId === detailOrder._id}
                      className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60'
                    >
                      {actionLoadingId === detailOrder._id ? 'Đang gửi...' : 'Gửi đơn'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal đặt hàng – tạo đơn và gửi lên bếp trung tâm */}
      {createOpen && (
        <div className='fixed inset-0 z-50 bg-slate-900/40' onClick={() => !creating && setCreateOpen(false)}>
          <div
            className='absolute left-1/2 top-1/2 max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Đặt hàng – Gửi đơn lên bếp trung tâm</h2>
              <button onClick={() => !creating && setCreateOpen(false)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            <p className='mb-3 text-sm text-slate-600'>
              Điền đơn hàng và bấm <strong>Gửi đơn đến bếp trung tâm</strong> để bếp nhận đơn. Nếu chưa xong, có thể <strong>Lưu nháp</strong> rồi gửi sau.
            </p>
            {createError && <p className='mb-3 text-sm text-red-600'>{createError}</p>}

            <form onSubmit={submitCreateAndSend} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700'>Ngày giờ đặt hàng</label>
                <input
                  type='datetime-local'
                  value={newOrder.order_date}
                  onChange={e => setNewOrder(prev => ({ ...prev, order_date: e.target.value }))}
                  className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
                />
                <p className='mt-1 text-xs text-slate-500'>Chọn đúng ngày và giờ đặt hàng (theo giờ máy bạn).</p>
              </div>
              <label className='flex items-center gap-2 text-sm text-slate-700'>
                <input
                  type='checkbox'
                  checked={newOrder.is_urgent}
                  onChange={e => setNewOrder(prev => ({ ...prev, is_urgent: e.target.checked }))}
                />
                Đơn gấp (ưu tiên xử lý)
              </label>

              <div className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium text-slate-700'>Dòng sản phẩm (ít nhất 1, số lượng &gt; 0, đơn giá ≥ 0)</span>
                  <button type='button' onClick={addLine} className='text-xs font-medium text-orange-600 hover:text-orange-700'>+ Thêm dòng</button>
                </div>
                {newOrder.lines.map((line, idx) => (
                  <div key={idx} className='grid grid-cols-1 gap-2 rounded-lg bg-white p-3 sm:grid-cols-12'>
                    <div className='sm:col-span-5'>
                      <label className='block text-xs font-medium text-slate-600'>Sản phẩm</label>
                      <select
                        required
                        value={line.item_id}
                        onChange={e => handleLineChange(idx, 'item_id', e.target.value)}
                        className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm'
                      >
                        <option value=''>Chọn sản phẩm</option>
                        {items.map(it => (
                          <option key={it._id} value={it._id}>{it.name} ({it.sku})</option>
                        ))}
                      </select>
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs font-medium text-slate-600'>Số lượng</label>
                      <input
                        type='number'
                        min={0.01}
                        step={0.01}
                        value={line.qty_ordered}
                        onChange={e => handleLineChange(idx, 'qty_ordered', e.target.value)}
                        className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm'
                      />
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs font-medium text-slate-600'>ĐVT</label>
                      <input
                        value={items.find(i => i._id === line.item_id)?.base_uom_id?.code || ''}
                        readOnly
                        className='mt-1 h-9 w-full rounded-lg border border-slate-100 bg-slate-50 px-2 text-sm text-slate-500'
                      />
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs font-medium text-slate-600'>Đơn giá</label>
                      <input
                        type='number'
                        min={0}
                        value={line.unit_price}
                        onChange={e => handleLineChange(idx, 'unit_price', e.target.value)}
                        className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm'
                      />
                    </div>
                    <div className='flex items-center justify-end sm:col-span-1'>
                      {newOrder.lines.length > 1 && (
                        <button type='button' onClick={() => removeLine(idx)} className='mt-5 text-xs text-red-500 hover:text-red-600'>Xóa</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className='flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4'>
                <button
                  type='button'
                  disabled={creating}
                  onClick={() => setCreateOpen(false)}
                  className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
                >
                  Hủy
                </button>
                <button
                  type='button'
                  disabled={creating}
                  onClick={submitCreateDraftOnly}
                  className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'
                >
                  {creating ? 'Đang xử lý...' : 'Lưu nháp'}
                </button>
                <button
                  type='submit'
                  disabled={creating}
                  className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60'
                >
                  {creating ? 'Đang gửi đơn...' : 'Gửi đơn đến bếp trung tâm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
