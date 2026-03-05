import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, Search } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { workflowService } from '../../services/workflowService';
import { useAuth } from '../../contexts/AuthContext';

const statusLabels = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã gửi',
  APPROVED: 'Đã phê duyệt',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đã giao',
  RECEIVED: 'Đã nhận',
  CANCELLED: 'Đã hủy',
};

export default function FranchiseOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [success, setSuccess] = useState('');

  const [newOrder, setNewOrder] = useState({
    is_urgent: false,
    lines: [{ item_id: '', qty_ordered: 1, uom_id: '', unit_price: 0 }],
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadOrders = async () => {
    setLoading(true);
    setSuccess('');
    try {
      const res = await axiosInstance.get('/internal-orders', {
        params: {
          store_org_unit_id: user?.org_unit_id,
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

  const loadItems = async () => {
    const result = await workflowService.getItems({ status: 'ACTIVE', limit: 100 });
    if (result.success) {
      const rows = Array.isArray(result.data?.data) ? result.data.data : result.data;
      setItems(rows || []);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filteredOrders = useMemo(() => {
    const s = (search || '').toLowerCase();
    return orders.filter(o => {
      const no = o.order_no || o._id || '';
      const unitName = o.store_org_unit_id?.name || '';
      const matchText =
        !s ||
        no.toLowerCase().includes(s) ||
        unitName.toLowerCase().includes(s);
      return matchText;
    });
  }, [orders, search]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedOrders = useMemo(
    () =>
      filteredOrders.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
      ),
    [filteredOrders, currentPage],
  );

  const handleLineChange = (idx, field, value) => {
    setNewOrder(prev => {
      const lines = [...prev.lines];
      let v = value;
      if (field === 'qty_ordered' || field === 'unit_price') {
        v = Number(value) || 0;
      }
      lines[idx] = { ...lines[idx], [field]: v };

      if (field === 'item_id') {
        const it = items.find(i => i._id === value);
        if (it) {
          lines[idx].uom_id = it.base_uom_id?._id || '';
          lines[idx].unit_price = it.base_sell_price || it.cost_price || 0;
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

  const submitNewOrder = async e => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const body = {
        is_urgent: newOrder.is_urgent,
        lines: newOrder.lines
          .filter(l => l.item_id && l.qty_ordered > 0)
          .map(l => ({
            item_id: l.item_id,
            qty_ordered: l.qty_ordered,
            uom_id: l.uom_id,
            unit_price: l.unit_price,
          })),
      };
      if (!body.lines.length) {
        setCreateError('Vui lòng chọn ít nhất 1 sản phẩm.');
        setCreating(false);
        return;
      }

      const res = await axiosInstance.post('/internal-orders', body);
      if (!res.data?.success) {
        setCreateError(res.data?.message || 'Tạo đơn thất bại');
        setCreating(false);
        return;
      }

      setCreateOpen(false);
      setNewOrder({
        is_urgent: false,
        lines: [{ item_id: '', qty_ordered: 1, uom_id: '', unit_price: 0 }],
      });
      setSuccess('Tạo đơn nội bộ thành công (DRAFT).');
      await loadOrders();
    } catch (err) {
      console.error(err);
      setCreateError('Có lỗi khi tạo đơn');
    } finally {
      setCreating(false);
    }
  };

  const submitOrder = async order => {
    try {
      await axiosInstance.put(`/internal-orders/${order._id}/status`, {
        status: 'SUBMITTED',
      });
      setSuccess(`Đơn ${order.order_no || order._id} đã gửi (SUBMITTED).`);
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
          <h1 className='text-2xl font-bold text-slate-900'>Đơn hàng cửa hàng</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Tạo và gửi đơn đặt hàng nội bộ từ cửa hàng đến bếp trung tâm.
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
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className='input-field min-w-[180px]'
        >
          <option value='ALL'>Tất cả trạng thái</option>
          {Object.keys(statusLabels).map(s => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </div>

      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Số đơn</th>
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
                <td colSpan={6} className='px-4 py-6 text-center text-slate-400'>
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!loading && !filteredOrders.length && (
              <tr>
                <td colSpan={6} className='px-4 py-6 text-center text-slate-400'>
                  Không có đơn nào.
                </td>
              </tr>
            )}
            {pagedOrders.map(order => (
              <tr key={order._id}>
                <td className='px-4 py-3 font-medium text-slate-900'>
                  {order.order_no || order._id}
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
                  {order.status === 'DRAFT' && (
                    <button
                      onClick={() => submitOrder(order)}
                      className='rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600'
                    >
                      Gửi đơn
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className='flex items-center justify-between text-xs text-slate-400'>
        <p>
          Hiển thị{' '}
          {filteredOrders.length === 0
            ? 0
            : (currentPage - 1) * pageSize + 1}{' '}
          -{' '}
          {Math.min(currentPage * pageSize, filteredOrders.length)} /{' '}
          {filteredOrders.length}{' '}
          đơn
        </p>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
          >
            Trước
          </button>
          <span>
            Trang {currentPage} / {totalPages}
          </span>
          <button
            type='button'
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
          >
            Sau
          </button>
        </div>
      </div>

      {/* Modal tạo đơn */}
      {createOpen && (
        <div
          className='fixed inset-0 z-50 bg-slate-900/40'
          onClick={() => !creating && setCreateOpen(false)}
        >
          <div
            className='absolute left-1/2 top-1/2 max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>
                Tạo đơn đặt hàng nội bộ
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

            <form onSubmit={submitNewOrder} className='space-y-4'>
              <label className='flex items-center gap-2 text-sm text-slate-700'>
                <input
                  type='checkbox'
                  checked={newOrder.is_urgent}
                  onChange={e =>
                    setNewOrder(prev => ({
                      ...prev,
                      is_urgent: e.target.checked,
                    }))
                  }
                />
                Đơn gấp (ưu tiên xử lý)
              </label>

              <div className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium text-slate-700'>
                    Dòng sản phẩm
                  </span>
                  <button
                    type='button'
                    onClick={addLine}
                    className='text-xs font-medium text-orange-600 hover:text-orange-700'
                  >
                    + Thêm dòng
                  </button>
                </div>

                {newOrder.lines.map((line, idx) => (
                  <div
                    key={idx}
                    className='grid grid-cols-1 gap-2 rounded-lg bg-white p-3 sm:grid-cols-12'
                  >
                    <div className='sm:col-span-5'>
                      <label className='block text-xs font-medium text-slate-600'>
                        Sản phẩm
                      </label>
                      <select
                        required
                        value={line.item_id}
                        onChange={e =>
                          handleLineChange(idx, 'item_id', e.target.value)
                        }
                        className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm'
                      >
                        <option value=''>Chọn sản phẩm</option>
                        {items.map(it => (
                          <option key={it._id} value={it._id}>
                            {it.name} ({it.sku})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs font-medium text-slate-600'>
                        Số lượng
                      </label>
                      <input
                        type='number'
                        min={1}
                        value={line.qty_ordered}
                        onChange={e =>
                          handleLineChange(idx, 'qty_ordered', e.target.value)
                        }
                        className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm'
                      />
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs font-medium text-slate-600'>
                        ĐVT
                      </label>
                      <input
                        value={
                          items.find(i => i._id === line.item_id)?.base_uom_id?.code ||
                          ''
                        }
                        readOnly
                        className='mt-1 h-9 w-full rounded-lg border border-slate-100 bg-slate-50 px-2 text-sm text-slate-500'
                      />
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs font-medium text-slate-600'>
                        Đơn giá
                      </label>
                      <input
                        type='number'
                        min={0}
                        value={line.unit_price}
                        onChange={e =>
                          handleLineChange(idx, 'unit_price', e.target.value)
                        }
                        className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm'
                      />
                    </div>
                    <div className='flex items-center justify-end sm:col-span-1'>
                      {newOrder.lines.length > 1 && (
                        <button
                          type='button'
                          onClick={() => removeLine(idx)}
                          className='mt-5 text-xs text-red-500 hover:text-red-600'
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

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
                  disabled={creating}
                  className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60'
                >
                  {creating ? 'Đang tạo...' : 'Lưu đơn (DRAFT)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

