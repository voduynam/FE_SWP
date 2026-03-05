import { useEffect, useMemo, useState } from 'react';
import { Check, RefreshCcw, Search } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';

const statusLabels = {
  SUBMITTED: 'Đã gửi',
  APPROVED: 'Đã phê duyệt',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đã giao',
};

export default function CentralOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('SUBMITTED');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    setSuccess('');
    try {
      const res = await axiosInstance.get('/internal-orders', {
        params: {
          status: statusFilter,
          limit: 50,
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
    try {
      await axiosInstance.put(`/internal-orders/${order._id}/status`, {
        status: nextStatus,
      });
      setSuccess(
        `Đơn ${order.order_no || order._id} → ${nextStatus} thành công.`,
      );
      await loadOrders();
    } catch (err) {
      console.error(err);
      setSuccess('');
    }
  };

  return (
    <div className='space-y-6 animate-fade-in'>
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
            Phê duyệt và chuyển trạng thái SUBMITTED → APPROVED → PROCESSING.
          </p>
        </div>
        <div className='flex gap-2'>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className='input-field min-w-[160px]'
          >
            <option value='SUBMITTED'>SUBMITTED</option>
            <option value='APPROVED'>APPROVED</option>
            <option value='PROCESSING'>PROCESSING</option>
            <option value='SHIPPED'>SHIPPED</option>
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
                  {order.status === 'SUBMITTED' && (
                    <button
                      onClick={() => updateStatus(order, 'APPROVED')}
                      className='mr-2 inline-flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600'
                    >
                      <Check className='h-3 w-3' /> Phê duyệt
                    </button>
                  )}
                  {order.status === 'APPROVED' && (
                    <button
                      onClick={() => updateStatus(order, 'PROCESSING')}
                      className='inline-flex items-center gap-1 rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600'
                    >
                      Bắt đầu xử lý
                    </button>
                  )}
                  {/* Bước 5 & 6 (tạo shipment / xác nhận giao) có thể làm ở trang Shipments riêng */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

