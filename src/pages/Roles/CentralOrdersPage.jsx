import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, RefreshCcw, Search, X } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { workflowService } from '../../services/workflowService';

const statusLabels = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã gửi',
  APPROVED: 'Đã phê duyệt',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đã giao',
  RECEIVED: 'Đã nhận',
  CANCELLED: 'Đã hủy',
};

export default function CentralOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('SUBMITTED');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    setSuccess('');
    try {
      const res = await axiosInstance.get('/internal-orders', {
        params: {
          limit: 50,
          ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        },
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setOrders(list);
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadDetail = async (id) => {
    setDetailId(id);
    setDetailOrder(null);
    setDetailError(null);
    if (!id) return;
    const res = await workflowService.getInternalOrder(id);
    if (res.success && res.data) setDetailOrder(res.data);
    else setDetailError(res.message || 'Không tìm thấy đơn hàng');
  };

  const filteredOrders = useMemo(() => {
    const s = (search || '').toLowerCase();
    return orders.filter(o => {
      const no = o.order_no || o._id || '';
      const storeName = o.store_org_unit_id?.name || '';
      return (
        !s ||
        no.toLowerCase().includes(s) ||
        storeName.toLowerCase().includes(s)
      );
    });
  }, [orders, search]);

  const updateStatus = async (order, nextStatus) => {
    setActionLoadingId(order._id);
    setSuccess('');
    try {
      await axiosInstance.put(`/internal-orders/${order._id}/status`, {
        status: nextStatus,
      });
      setSuccess(`Đơn ${order.order_no || order._id} → ${statusLabels[nextStatus] || nextStatus} thành công.`);
      setDetailOrder(prev => (prev?._id === order._id ? { ...prev, status: nextStatus } : prev));
      await loadOrders();
    } catch (err) {
      console.error(err);
      setSuccess('');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getItemName = (line) => {
    const item = line?.item_id;
    if (!item) return '-';
    if (typeof item === 'object') return item.name || item.sku || item._id;
    return item;
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
          <h1 className='text-2xl font-bold text-slate-900'>
            Đơn hàng từ cửa hàng franchise
          </h1>
          <p className='mt-1 text-sm text-slate-500'>
            Xem chi tiết đơn trước khi phê duyệt hoặc từ chối.
          </p>
        </div>
        <div className='flex gap-2'>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className='input-field min-w-[160px]'
          >
            <option value='ALL'>Tất cả</option>
            <option value='SUBMITTED'>Đã gửi </option>
            <option value='APPROVED'>Đã phê duyệt</option>
            <option value='PROCESSING'>Đang xử lý</option>
            <option value='SHIPPED'>Đã giao</option>
          </select>
          <button
            onClick={loadOrders}
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
      </div>

      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Số đơn</th>
              <th className='px-4 py-3'>Cửa hàng</th>
              <th className='px-4 py-3'>Ngày</th>
              <th className='px-4 py-3'>Gấp</th>
              <th className='px-4 py-3'>Tổng tiền</th>
              <th className='px-4 py-3'>Trạng thái</th>
              <th className='px-4 py-3 text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && (
              <tr>
                <td colSpan={7} className='px-4 py-6 text-center text-slate-400'>
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!loading && !filteredOrders.length && (
              <tr>
                <td colSpan={7} className='px-4 py-6 text-center text-slate-400'>
                  Không có đơn nào.
                </td>
              </tr>
            )}
            {filteredOrders.map(order => (
              <tr key={order._id}>
                <td className='px-4 py-3 font-medium text-slate-900'>
                  {order.order_no || order._id}
                </td>
                <td className='px-4 py-3 text-slate-800'>
                  {order.store_org_unit_id?.name || '-'}
                </td>
                <td className='px-4 py-3 text-slate-700'>
                  {order.order_date
                    ? new Date(order.order_date).toLocaleString()
                    : '-'}
                </td>
                <td className='px-4 py-3 text-xs'>
                  {order.is_urgent ? (
                    <span className='inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600'>
                      Gấp
                    </span>
                  ) : (
                    <span className='text-slate-400'>Thường</span>
                  )}
                </td>
                <td className='px-4 py-3 text-slate-800'>
                  {order.total_amount?.toLocaleString('vi-VN')} đ
                </td>
                <td className='px-4 py-3 text-xs'>
                  <span className='inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-slate-700'>
                    {statusLabels[order.status] || order.status}
                  </span>
                </td>
                <td className='px-4 py-3 text-right'>
                  <button
                    onClick={() => loadDetail(order._id)}
                    className='mr-2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'
                  >
                    Chi tiết
                  </button>
                  {order.status === 'SUBMITTED' && (
                    <>
                      <button
                        onClick={() => updateStatus(order, 'APPROVED')}
                        disabled={actionLoadingId === order._id}
                        className='mr-2 inline-flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60'
                      >
                        <Check className='h-3 w-3' /> Phê duyệt
                      </button>
                      <button
                        onClick={() => updateStatus(order, 'CANCELLED')}
                        disabled={actionLoadingId === order._id}
                        className='inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60'
                      >
                        <X className='h-3 w-3' /> Từ chối
                      </button>
                    </>
                  )}
                  {order.status === 'APPROVED' && (
                    <button
                      onClick={() => updateStatus(order, 'PROCESSING')}
                      disabled={actionLoadingId === order._id}
                      className='inline-flex items-center gap-1 rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-60'
                    >
                      Bắt đầu xử lý
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal chi tiết đơn – render qua Portal để luôn căn giữa viewport */}
      {detailId && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => setDetailId(null)}>
          <div
            className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl'
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
                  <span>{statusLabels[detailOrder.status] || detailOrder.status}</span>
                  <span className='text-slate-500'>Gấp:</span>
                  <span>{detailOrder.is_urgent ? 'Có' : 'Không'}</span>
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
                {detailOrder.status === 'SUBMITTED' && (
                  <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                    <button
                      onClick={() => updateStatus(detailOrder, 'CANCELLED')}
                      disabled={actionLoadingId === detailOrder._id}
                      className='rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60'
                    >
                      Từ chối
                    </button>
                    <button
                      onClick={() => updateStatus(detailOrder, 'APPROVED')}
                      disabled={actionLoadingId === detailOrder._id}
                      className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
                    >
                      Phê duyệt
                    </button>
                  </div>
                )}
                {detailOrder.status === 'APPROVED' && (
                  <div className='flex justify-end border-t border-slate-200 pt-4'>
                    <button
                      onClick={() => updateStatus(detailOrder, 'PROCESSING')}
                      disabled={actionLoadingId === detailOrder._id}
                      className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60'
                    >
                      Bắt đầu xử lý
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

