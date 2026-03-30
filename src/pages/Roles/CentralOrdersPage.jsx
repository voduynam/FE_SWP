import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Check, RefreshCcw, Search, X } from 'lucide-react';
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

const PAGE_SIZE = 20;

const getStatusClasses = status => {
  switch (status) {
    case 'DRAFT':
      return 'bg-amber-100 text-amber-700';
    case 'SUBMITTED':
      return 'bg-sky-100 text-sky-700';
    case 'APPROVED':
      return 'bg-indigo-100 text-indigo-700';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-700';
    case 'SHIPPED':
      return 'bg-violet-100 text-violet-700';
    case 'RECEIVED':
      return 'bg-emerald-100 text-emerald-700';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

export default function CentralOrdersPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  console.log('🔍 DEBUG: CentralOrdersPage render, user =', user);
  console.log('🔍 DEBUG: authLoading =', authLoading);
  
  // Check if user is chef (CENTRAL_KITCHEN_STAFF role) or manager in central kitchen
  const roleCodes = Array.isArray(user?.roles)
    ? user.roles.map(r => String(r.code || '').toUpperCase())
    : [];
  const isChef = roleCodes.includes('CENTRAL_KITCHEN_STAFF');
  const isManager = roleCodes.includes('MANAGER') && user?.org_unit_id === 'org_kitchen_hcm';
  const canViewOrders = isChef || isManager; // Both can view orders
  
  console.log('🔍 DEBUG: roleCodes =', roleCodes);
  console.log('🔍 DEBUG: isChef =', isChef);
  console.log('🔍 DEBUG: isManager =', isManager);
  console.log('🔍 DEBUG: canViewOrders =', canViewOrders);
  
  // Don't render if auth is still loading
  if (authLoading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-slate-500">Đang tải...</div>
    </div>;
  }
  
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [shipmentFilter, setShipmentFilter] = useState('ALL'); // 'ALL' | 'NO_SHIPMENT' | 'HAS_SHIPMENT'
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchDebounceRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [orderIdsWithShipment, setOrderIdsWithShipment] = useState(new Set());
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });

  const loadOrders = async (pageNum = 1) => {
    setLoading(true);
    setSuccess('');
    try {
      console.log('🔍 DEBUG: isChef =', isChef);
      console.log('🔍 DEBUG: user roles =', user?.roles);
      
      const ordersRes = await axiosInstance.get('/internal-orders', {
        params: {
          page: pageNum,
          limit: PAGE_SIZE,
          ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        },
      });
      
      console.log('🔍 DEBUG: API response =', ordersRes.data);
      
      let list = Array.isArray(ordersRes.data?.data) ? ordersRes.data.data : [];
      console.log('🔍 DEBUG: list before filter =', list.length);
      
      // For Chef/Manager role: Show all orders that are ready for production (APPROVED or higher status)
      // This includes both paid bank transfer orders and approved COD orders
      if (canViewOrders) {
        console.log('🔍 DEBUG: Applying Chef/Manager filter, original list =', list.map(o => ({ id: o._id, status: o.status, order_no: o.order_no })));
        list = list.filter(order => {
          const validStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PROCESSING', 'SHIPPED', 'RECEIVED'];
          return validStatuses.includes(order.status);
        });
        console.log('🔍 DEBUG: list after Chef/Manager filter =', list.length);
        console.log('🔍 DEBUG: Filtered orders =', list.map(o => ({ id: o._id, status: o.status, order_no: o.order_no })));
      }
      
      console.log('🔍 DEBUG: About to call setOrders with list.length =', list.length);
      setOrders(list);
      console.log('🔍 DEBUG: setOrders called with list.length =', list.length);
      console.log('🔍 DEBUG: Sample orders =', list.slice(0, 3).map(o => ({ id: o._id, order_no: o.order_no, status: o.status })));
      
      const p = ordersRes.data?.pagination ?? {};
      setPagination({
        page: p.page ?? pageNum,
        limit: p.limit ?? PAGE_SIZE,
        total: list.length, // Update total to reflect filtered count
        pages: Math.ceil(list.length / PAGE_SIZE),
      });
      setLoading(false);
      // Tải danh sách phiếu giao (chỉ phiếu còn hiệu lực, không tính Đã hủy) để quyết định nút "Tạo phiếu giao"
      setTimeout(() => {
        workflowService.getShipmentsPaginated({ limit: 500 }).then((shipmentsRes) => {
          const shipData = shipmentsRes?.data?.data ?? shipmentsRes?.data ?? [];
          const shipList = Array.isArray(shipData) ? shipData : [];
          const ids = new Set(
            shipList
              .filter(s => s.status !== 'CANCELLED')
              .map(s => String(s.order_id?._id ?? s.order_id))
              .filter(Boolean)
          );
          setOrderIdsWithShipment(ids);
        }).catch(() => setOrderIdsWithShipment(new Set()));
      }, 150);
    } catch (err) {
      console.error(err);
      setOrders([]);
      setOrderIdsWithShipment(new Set());
    } finally {
      setLoading(false);
    }
  };

  /** Khi lọc theo phiếu giao: tải hết đơn (tối đa 500) rồi lọc + phân trang phía client */
  const loadAllForShipmentFilter = async () => {
    setLoading(true);
    setSuccess('');
    try {
      const [ordersRes, shipmentsRes] = await Promise.all([
        axiosInstance.get('/internal-orders', {
          params: {
            page: 1,
            limit: 500,
            ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
          },
        }),
        workflowService.getShipmentsPaginated({ limit: 500 }),
      ]);
      let list = Array.isArray(ordersRes.data?.data) ? ordersRes.data.data : [];
      
      // For Chef/Manager role: Show all orders that are ready for production (APPROVED or higher status)
      if (canViewOrders) {
        console.log('🔍 DEBUG: Applying Chef/Manager filter in loadAllForShipmentFilter, original list =', list.map(o => ({ id: o._id, status: o.status, order_no: o.order_no })));
        list = list.filter(order => {
          const validStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PROCESSING', 'SHIPPED', 'RECEIVED'];
          return validStatuses.includes(order.status);
        });
        console.log('🔍 DEBUG: Filtered orders in loadAllForShipmentFilter =', list.map(o => ({ id: o._id, status: o.status, order_no: o.order_no })));
      }
      setOrders(list);
      console.log('🔍 DEBUG: setOrders called in loadAllForShipmentFilter with list.length =', list.length);
      console.log('🔍 DEBUG: setOrders called with list.length =', list.length);
      console.log('🔍 DEBUG: Sample orders =', list.slice(0, 3).map(o => ({ id: o._id, order_no: o.order_no, status: o.status })));
      const shipData = shipmentsRes?.data?.data ?? shipmentsRes?.data ?? [];
      const shipList = Array.isArray(shipData) ? shipData : [];
      const ids = new Set(
        shipList
          .filter(s => s.status !== 'CANCELLED')
          .map(s => String(s.order_id?._id ?? s.order_id))
          .filter(Boolean)
      );
      setOrderIdsWithShipment(ids);
    } catch (err) {
      console.error(err);
      setOrders([]);
      setOrderIdsWithShipment(new Set());
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    console.log('🔍 DEBUG: Component mounted, loading orders...');
    console.log('🔍 DEBUG: user =', user);
    console.log('🔍 DEBUG: isChef =', isChef);
    console.log('🔍 DEBUG: authLoading =', authLoading);
    if (!authLoading && user) {
      console.log('🔍 DEBUG: User available, calling loadOrders...');
      loadOrders(1);
    } else {
      console.log('🔍 DEBUG: User not available yet or auth loading, waiting...');
    }
  }, [user, canViewOrders, authLoading]);

  // Load data when filters change
  useEffect(() => {
    console.log('🔍 DEBUG: Filters changed, reloading...');
    console.log('🔍 DEBUG: statusFilter =', statusFilter, 'shipmentFilter =', shipmentFilter);
    if (!authLoading && user) {
      if (shipmentFilter === 'NO_SHIPMENT' || shipmentFilter === 'HAS_SHIPMENT') {
        loadAllForShipmentFilter();
      } else {
        loadOrders(1);
      }
    }
  }, [statusFilter, shipmentFilter, user, authLoading]);

  // Debounce search để tránh re-render bảng trên mỗi lần gõ
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearchDebounced(search), 280);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [search]);

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
    const s = (searchDebounced || '').toLowerCase();
    let list = orders.filter(o => {
      const no = o.order_no || o._id || '';
      const storeName = o.store_org_unit_id?.name || '';
      return (
        !s ||
        no.toLowerCase().includes(s) ||
        storeName.toLowerCase().includes(s)
      );
    });
    console.log('🔍 DEBUG: After search filter, list =', list.length);
    
    if (shipmentFilter === 'NO_SHIPMENT') {
      list = list.filter(o => o.status === 'APPROVED' && !orderIdsWithShipment.has(String(o._id)));
      console.log('🔍 DEBUG: After NO_SHIPMENT filter, list =', list.length);
    }
    if (shipmentFilter === 'HAS_SHIPMENT') {
      list = list.filter(o => orderIdsWithShipment.has(String(o._id)));
      console.log('🔍 DEBUG: After HAS_SHIPMENT filter, list =', list.length);
    }
    
    console.log('🔍 DEBUG: Final filteredOrders =', list.length);
    return list;
  }, [orders, searchDebounced, shipmentFilter, orderIdsWithShipment]);

  const isShipmentFilterActive = shipmentFilter === 'NO_SHIPMENT' || shipmentFilter === 'HAS_SHIPMENT';
  const ordersToShow = useMemo(() => {
    console.log('🔍 DEBUG: ordersToShow calculation:');
    console.log('🔍 DEBUG: isShipmentFilterActive =', isShipmentFilterActive);
    console.log('🔍 DEBUG: filteredOrders.length =', filteredOrders.length);
    console.log('🔍 DEBUG: pagination.page =', pagination.page);
    
    if (!isShipmentFilterActive) {
      console.log('🔍 DEBUG: Returning filteredOrders directly');
      return filteredOrders;
    }
    const start = (pagination.page - 1) * PAGE_SIZE;
    const result = filteredOrders.slice(start, start + PAGE_SIZE);
    console.log('🔍 DEBUG: Returning sliced orders, start =', start, 'result.length =', result.length);
    return result;
  }, [isShipmentFilterActive, filteredOrders, pagination.page]);

  useEffect(() => {
    if (!isShipmentFilterActive) return;
    const total = filteredOrders.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    setPagination(prev => ({
      ...prev,
      total,
      pages,
      page: Math.min(prev.page, pages) || 1,
      limit: PAGE_SIZE,
    }));
  }, [isShipmentFilterActive, filteredOrders.length]);

  const updateStatus = async (order, nextStatus) => {
    setActionLoadingId(order._id);
    setSuccess('');
    try {
      await axiosInstance.put(`/internal-orders/${order._id}/status`, {
        status: nextStatus,
      });
      setSuccess(`Đơn ${order.order_no || order._id} → ${statusLabels[nextStatus] || nextStatus} thành công.`);
      setDetailOrder(prev => (prev?._id === order._id ? { ...prev, status: nextStatus } : prev));
      if (shipmentFilter === 'NO_SHIPMENT' || shipmentFilter === 'HAS_SHIPMENT') {
        await loadAllForShipmentFilter();
      } else {
        await loadOrders(pagination.page);
      }
      return true;
    } catch (err) {
      console.error(err);
      setSuccess('');
      return false;
    } finally {
      setActionLoadingId(null);
    }
  };

  const autoCreateShipmentForOrder = async (order) => {
    try {
      const [detailRes, locRes] = await Promise.all([
        workflowService.getInternalOrder(order._id),
        workflowService.getLocations({ status: 'ACTIVE', limit: 1000 }),
      ]);
      if (!detailRes.success || !detailRes.data) return;
      const detail = detailRes.data;
      const allLocs = Array.isArray(locRes?.data) || Array.isArray(locRes?.data?.data)
        ? (Array.isArray(locRes.data) ? locRes.data : locRes.data.data)
        : [];
      const storeOrgId = detail.store_org_unit_id?._id ?? detail.store_org_unit_id;
      const toLocation = allLocs.find(l => {
        const org = l.org_unit_id;
        const id = typeof org === 'object' ? org._id : org;
        return id && String(id) === String(storeOrgId);
      });
      const fromLocation = allLocs.find(l => {
        const org = l.org_unit_id;
        const type = typeof org === 'object' ? org.type : org?.type;
        return (type || '').toUpperCase() === 'KITCHEN';
      });
      if (!fromLocation || !toLocation) return;
      const lines = Array.isArray(detail.lines) ? detail.lines : [];
      if (!lines.length) return;
      const payload = {
        order_id: detail._id,
        from_location_id: fromLocation._id,
        to_location_id: toLocation._id,
        ship_date: new Date().toISOString(),
        lines: lines.map((line, index) => ({
          item_id: line.item_id?._id ?? line.item_id,
          qty: line.qty_ordered ?? 0,
          uom_id: line.uom_id?._id ?? line.uom_id,
          order_line_id: line._id || `ord_line_${detail._id}_${index}`,
        })),
      };
      const res = await workflowService.createShipment(payload);
      if (res.success) {
        setSuccess(prev => prev
          ? `${prev} Đã tự tạo phiếu giao (Nháp) cho đơn này.`
          : 'Đã tự tạo phiếu giao (Nháp) cho đơn này.');
        setOrderIdsWithShipment(prev => {
          const next = new Set(prev);
          next.add(String(detail._id));
          return next;
        });
      }
    } catch {
      // im lặng nếu auto tạo phiếu thất bại, tránh chặn luồng duyệt
    }
  };

  const fixOrderStatus = async (orderId) => {
    if (!window.confirm('Sửa trạng thái đơn hàng này về "Đang xử lý"? Thao tác này sẽ hoàn trả tồn kho nếu có phiếu giao hàng đã xuất kho bị hủy.')) {
      return;
    }

    setActionLoadingId(orderId);
    try {
      const res = await workflowService.fixOrderStatusAfterCancelledShipment(orderId);
      if (res.success) {
        const { inventory_restored, cancelled_shipments_count } = res.data;
        let message = 'Đã sửa trạng thái đơn hàng thành công. Đơn hàng đã được chuyển về "Đang xử lý".';
        
        if (inventory_restored) {
          message += ` Đã hoàn trả tồn kho cho ${cancelled_shipments_count} phiếu giao hàng bị hủy.`;
        }
        
        setSuccess(message);
        loadOrders(pagination.page);
      } else {
        alert(res.message || 'Sửa trạng thái thất bại');
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Sửa trạng thái thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const restoreInventory = async (orderId) => {
    if (!window.confirm('Hoàn trả tồn kho cho tất cả phiếu giao hàng đã xuất kho của đơn này? Thao tác này sẽ kiểm tra và hoàn trả tồn kho cho các shipment đã bị hủy hoặc có vấn đề.')) {
      return;
    }

    setActionLoadingId(orderId);
    try {
      const res = await workflowService.manuallyRestoreInventoryForCancelledShipments(orderId);
      if (res.success) {
        const { summary, restored_shipments, already_restored_shipments, not_dispatched_shipments } = res.data;
        
        let message = `Đã kiểm tra và xử lý tồn kho:\n`;
        message += `• Hoàn trả: ${summary.restored_count} phiếu giao\n`;
        message += `• Đã hoàn trả trước đó: ${summary.already_restored_count} phiếu giao\n`;
        message += `• Chưa xuất kho: ${summary.not_dispatched_count} phiếu giao`;
        
        if (summary.restored_count > 0) {
          message += `\n\nPhiếu đã hoàn trả: ${restored_shipments.map(s => s.shipment_no).join(', ')}`;
        }
        
        alert(message);
        setSuccess(`Đã hoàn trả tồn kho cho ${summary.restored_count} phiếu giao hàng.`);
        loadOrders(pagination.page);
      } else {
        alert(res.message || 'Hoàn trả tồn kho thất bại');
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Hoàn trả tồn kho thất bại');
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
            Đơn hàng từ cửa hàng 
          </h1>
          <p className='mt-1 text-sm text-slate-500'>
            Xem chi tiết đơn trước khi phê duyệt hoặc từ chối.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className='input-field min-w-[160px]'
          >
            <option value='ALL'>Tất cả</option>
            <option value='DRAFT'>Nháp</option>
            <option value='SUBMITTED'>Đã gửi</option>
            <option value='APPROVED'>Đã phê duyệt</option>
            <option value='PROCESSING'>Đang xử lý</option>
            <option value='SHIPPED'>Đã giao</option>
            <option value='RECEIVED'>Đã nhận</option>
            <option value='CANCELLED'>Đã hủy</option>
          </select>
          <select
            value={shipmentFilter}
            onChange={e => setShipmentFilter(e.target.value)}
            className='input-field min-w-[160px]'
            title='Chưa có phiếu giao'
          >
            <option value='ALL'>Phiếu giao: Tất cả</option>
            <option value='NO_SHIPMENT'>Chưa có phiếu giao</option>
            <option value='HAS_SHIPMENT'>Đã có phiếu giao</option>
          </select>
          <button
            onClick={() => (isShipmentFilterActive ? loadAllForShipmentFilter() : loadOrders(pagination.page))}
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
            {!loading && !ordersToShow.length && (
              <tr>
                <td colSpan={7} className='px-4 py-6 text-center'>
                  <p className='text-slate-400'>Không có đơn nào.</p>
                  <p className='mt-1 text-xs text-slate-400'>
                    {isShipmentFilterActive && shipmentFilter === 'NO_SHIPMENT'
                      ? 'Không có đơn đã phê duyệt nào chưa có phiếu giao.'
                      : 'Thử chọn trạng thái khác hoặc liên hệ Admin nếu bạn là NV Bếp trung tâm.'}
                  </p>
                </td>
              </tr>
            )}
            {ordersToShow.map(order => (
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
                  <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(order.status)}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </td>
                <td className='px-4 py-3 text-right'>
                  <button
                    onClick={() => loadDetail(order._id)}
                    className='rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'
                  >
                    Chi tiết
                  </button>
                  {isManager && (order.status === 'APPROVED' || order.status === 'PROCESSING') && !orderIdsWithShipment.has(String(order._id)) && (
                    <Link
                      to={`/app/central/shipments?create=1&orderId=${order._id}`}
                      className='ml-1 rounded-md border border-orange-200 px-2 py-1 text-xs text-orange-600 hover:bg-orange-50'
                    >
                      Tạo phiếu giao
                    </Link>
                  )}
                  {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                    <button
                      onClick={() => fixOrderStatus(order._id)}
                      disabled={actionLoadingId === order._id}
                      className='ml-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60'
                    >
                      Sửa trạng thái
                    </button>
                  )}
                  {isManager && (order.status === 'PROCESSING' || order.status === 'APPROVED') && (
                    <button
                      onClick={() => restoreInventory(order._id)}
                      disabled={actionLoadingId === order._id}
                      className='ml-1 rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-60'
                    >
                      Hoàn trả tồn kho
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(pagination.total > 0 || (isShipmentFilterActive && filteredOrders.length === 0 && !loading)) && (
        <div className='flex items-center justify-between text-sm text-slate-500'>
          <p>
            {pagination.total > 0
              ? `Hiển thị ${(pagination.page - 1) * pagination.limit + 1} - ${Math.min(pagination.page * pagination.limit, pagination.total)} / ${pagination.total}`
              : 'Không có đơn.'}
          </p>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => isShipmentFilterActive ? setPagination(p => ({ ...p, page: p.page - 1 })) : loadOrders(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
            >
              Trước
            </button>
            <span>Trang {pagination.page} / {Math.max(1, pagination.pages)}</span>
            <button
              type='button'
              onClick={() => isShipmentFilterActive ? setPagination(p => ({ ...p, page: p.page + 1 })) : loadOrders(pagination.page + 1)}
              disabled={pagination.page >= Math.max(1, pagination.pages)}
              className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
            >
              Sau
            </button>
          </div>
        </div>
      )}

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
                  <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(detailOrder.status)}`}>
                    {statusLabels[detailOrder.status] || detailOrder.status}
                  </span>
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
                {(detailOrder.status === 'APPROVED' || detailOrder.status === 'PROCESSING') && !orderIdsWithShipment.has(String(detailOrder._id)) && (
                  <div className='flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4'>
                    {isManager && (
                      <Link
                        to={`/app/central/shipments?create=1&orderId=${detailOrder._id}`}
                        className='rounded-lg border border-orange-200 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50'
                      >
                        Tạo phiếu giao hàng
                      </Link>
                    )}
                  </div>
                )}
                {(detailOrder.status === 'APPROVED' || detailOrder.status === 'PROCESSING') && orderIdsWithShipment.has(String(detailOrder._id)) && (
                  <div className='flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4'>
                    <Link
                      to='/app/central/shipments'
                      className='rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50'
                    >
                      Xem phiếu giao hàng
                    </Link>
                  </div>
                )}
                {detailOrder.status === 'SUBMITTED' && (
                  <div className='flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4'>
                    <button
                      onClick={() => updateStatus(detailOrder, 'CANCELLED')}
                      disabled={actionLoadingId === detailOrder._id}
                      className='rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60'
                    >
                      Từ chối
                    </button>
                    <button
                      onClick={async () => {
                        const ok = await updateStatus(detailOrder, 'APPROVED');
                        if (ok) {
                          autoCreateShipmentForOrder(detailOrder);
                          navigate(`/app/central/production?io=${detailOrder._id}`);
                          setDetailId(null);
                        }
                      }}
                      disabled={actionLoadingId === detailOrder._id}
                      className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
                    >
                      Phê duyệt & lập kế hoạch sản xuất
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

