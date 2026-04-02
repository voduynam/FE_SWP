import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, RefreshCcw, Search, Truck, MapPin } from 'lucide-react';
import { workflowService } from '../../services/workflowService';
import { useSearchParams } from 'react-router-dom';

const ROUTE_STATUS = {
  PLANNED: 'Đã lên kế hoạch',
  IN_PROGRESS: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const SHIPMENT_STATUS_LABEL = {
  PICKED: 'Đã có hàng',
  SHIPPED: 'Đã xuất kho',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao đến',
};

const STOP_STATUS = {
  PENDING: 'Chờ',
  ARRIVED: 'Đã đến',
  COMPLETED: 'Hoàn thành',
  SKIPPED: 'Bỏ qua',
};

const routeStatusColor = {
  PLANNED: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

const stopStatusColor = {
  PENDING: 'bg-slate-100 text-slate-600',
  ARRIVED: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  SKIPPED: 'bg-red-100 text-red-600',
};

const VEHICLE_TYPES = {
  TRUCK_1TON: 'Xe tải 1 tấn',
  TRUCK_500KG: 'Xe tải 500kg',
  VAN: 'Xe van',
  MOTORCYCLE: 'Xe máy',
};
const PAGE_SIZE = 10;

function getList(res) {
  if (!res?.success) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
}

function getStoreName(store) {
  if (!store) return '-';
  if (typeof store === 'string') return store;
  return store.name || store.code || store._id || '-';
}

function getShipmentLabel(sh) {
  if (!sh) return '?';
  if (typeof sh === 'string') return sh;
  return sh.shipment_no || sh._id || '?';
}

function getLocationLabel(loc) {
  if (!loc) return '-';
  if (typeof loc === 'string') return loc;
  return loc.name || loc.code || loc._id || '-';
}

function getShipmentsFromStops(stops) {
  if (!Array.isArray(stops)) return [];
  const byId = new Map();
  stops.forEach(stop => {
    (stop.shipment_ids || []).forEach(s => {
      if (s && (s._id || typeof s === 'string') && !byId.has(s._id || s)) {
        byId.set(s._id || s, typeof s === 'object' ? s : { _id: s, shipment_no: s, status: '-' });
      }
    });
  });
  return Array.from(byId.values());
}

export default function SupplyDeliveryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [routes, setRoutes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState('');

  const [detailId, setDetailId] = useState(null);
  const [detailRoute, setDetailRoute] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [stopPhotoFiles, setStopPhotoFiles] = useState({});

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [form, setForm] = useState({
    route_name: '',
    driver_id: '',
    planned_date: new Date().toISOString().slice(0, 10),
  });
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [selectedStoreLocationId, setSelectedStoreLocationId] = useState('');
  const [shipments, setShipments] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [locations, setLocations] = useState([]);

  const shipmentIdFromQuery = searchParams.get('shipmentId');

  const closeCreateModal = (opts = { clearQuery: true }) => {
    setCreateOpen(false);
    setCreating(false);
    setCreateError('');
    setSelectedShipmentId('');
    setSelectedStoreLocationId('');

    if (opts?.clearQuery) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('shipmentId');
        return next;
      }, { replace: true });
    }
  };

  const loadRoutes = async (page = 1) => {
    setLoading(true);
    setSuccess('');
    try {
      const res = await workflowService.getDeliveryRoutes({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setRoutes(list);
        const p = res.data.pagination ?? {};
        setPagination({ page: p.page ?? page, limit: p.limit ?? PAGE_SIZE, total: p.total ?? 0, pages: p.pages ?? 1 });
      } else {
        setRoutes([]);
      }
    } catch {
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRoutes(1); }, [statusFilter]);

  const filteredRoutes = useMemo(() => {
    const s = (search || '').toLowerCase();
    return routes.filter(r => {
      const name = r.route_name || r.route_no || r._id || '';
      const driver = r.driver_name || '';
      return !s || name.toLowerCase().includes(s) || driver.toLowerCase().includes(s);
    });
  }, [routes, search]);

  /* ─── Detail ─── */
  const loadDetail = async id => {
    setDetailId(id);
    setDetailRoute(null);
    setDetailError(null);
    if (!id) return;
    const res = await workflowService.getDeliveryRoute(id);
    if (res.success && res.data) setDetailRoute(res.data);
    else setDetailError(res.message || 'Không tìm thấy tuyến giao');
  };

  const closeDetail = () => {
    setDetailId(null);
    loadRoutes(pagination.page);
  };

  /* ─── Route actions ─── */
  const handleCompleteRoute = async () => {
    if (!detailRoute) return;
    setActionLoading(true);
    try {
      const res = await workflowService.updateRouteStatus(detailRoute._id, { status: 'COMPLETED' });
      if (res.success) {
        setSuccess('Tuyến giao đã hoàn thành.');
        await loadDetail(detailRoute._id);
      } else {
        await appAlert(res.message || 'Hoàn thành tuyến thất bại');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRoute = async () => {
    if (!detailRoute || !confirm('Bạn chắc chắn muốn hủy tuyến giao này?')) return;
    setActionLoading(true);
    try {
      const res = await workflowService.updateRouteStatus(detailRoute._id, { status: 'CANCELLED' });
      if (res.success) {
        setSuccess('Tuyến giao đã hủy.');
        await loadDetail(detailRoute._id);
      } else {
        await appAlert(res.message || 'Hủy tuyến thất bại');
      }
    } finally {
      setActionLoading(false);
    }
  };

  /* ─── Stop status update ─── */
  const handleUpdateStop = async (stop, newStatus) => {
    if (!detailRoute) return;
    setActionLoading(true);
    try {
      const payload =
        newStatus === 'COMPLETED'
          ? { status: newStatus, deliveryPhoto: stopPhotoFiles[stop._id] || undefined }
          : { status: newStatus };
      const res = await workflowService.updateStopStatus(detailRoute._id, stop._id, payload);
      if (res.success) {
        setSuccess(`Điểm dừng "${getStoreName(stop.store_org_unit_id)}" → ${STOP_STATUS[newStatus]}`);
        if (newStatus === 'COMPLETED') {
          setStopPhotoFiles(prev => {
            const next = { ...prev };
            delete next[stop._id];
            return next;
          });
        }
        await loadDetail(detailRoute._id);
      } else {
        await appAlert(res.message || 'Cập nhật điểm dừng thất bại');
      }
    } finally {
      setActionLoading(false);
    }
  };

  /* ─── Create: load data ─── */
  useEffect(() => {
    if (!createOpen) return;
    setCreateError('');
    setForm({
      route_name: '',
      driver_id: '',
      planned_date: new Date().toISOString().slice(0, 10),
    });
    setSelectedShipmentId(shipmentIdFromQuery || '');
    setSelectedStoreLocationId('');
    const load = async () => {
      const [shRes, driversRes, locRes, seedRes] = await Promise.all([
        workflowService.getShipments({ limit: 200 }),
        workflowService.getDrivers({ limit: 100 }),
        workflowService.getLocations({ status: 'ACTIVE', limit: 300 }),
        workflowService.seedStoreLocations().catch(() => ({ success: false, data: {} })),
      ]);
      setShipments(getList(shRes));
      setDrivers(getList(driversRes));
      const kitchenLocs = getList(locRes);
      const seedLocs = Array.isArray(seedRes?.data?.locations) ? seedRes.data.locations : [];
      const byId = new Map();
      kitchenLocs.forEach(l => { if (l && l._id) byId.set(l._id, l); });
      seedLocs.forEach(l => { if (l && l._id) byId.set(l._id, l); });
      if (seedLocs.length === 0) {
        try {
          const orgRes = await workflowService.getOrgUnits({ type: 'STORE', limit: 100 });
          const storeOrgs = getList(orgRes);
          for (const org of storeOrgs) {
            const oid = org._id ?? org.id;
            if (!oid) continue;
            const lres = await workflowService.getLocations({ org_unit_id: oid, status: 'ACTIVE', limit: 100 });
            getList(lres).forEach(l => { if (l && l._id) byId.set(l._id, l); });
          }
        } catch (_) {}
      }
      const combined = Array.from(byId.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setLocations(combined);
    };
    load();
  }, [createOpen]);

  // If opened from central shipments, keep shipmentId preselected.
  useEffect(() => {
    if (!shipmentIdFromQuery) return;
    if (!createOpen) {
      setCreateOpen(true);
    } else {
      setSelectedShipmentId(shipmentIdFromQuery);
    }
  }, [shipmentIdFromQuery, createOpen]);

  // Supply lập tuyến giao cho các phiếu đã sẵn sàng vận chuyển.
  // Trước đây FE chỉ cho chọn status = PICKED → khi Supply Coordinator đã "dispatch" thì shipment chuyển sang SHIPPED
  // nên dropdown rỗng (đúng case bạn báo).
  const eligibleShipments = useMemo(
    () => shipments.filter(s => ['PICKED', 'SHIPPED', 'IN_TRANSIT'].includes(s.status)),
    [shipments]
  );
  const selectedShipment = useMemo(() => shipments.find(s => s._id === selectedShipmentId), [shipments, selectedShipmentId]);

  /* Tự điền kho nhận khi chọn phiếu giao */
  useEffect(() => {
    if (!selectedShipmentId || !locations.length) return;
    const sel = shipments.find(s => s._id === selectedShipmentId);
    const toLocationId = sel?.to_location_id?._id ?? sel?.to_location_id;
    if (!toLocationId) return;
    const loc = locations.find(l => String(l._id) === String(toLocationId));
    if (loc) setSelectedStoreLocationId(loc._id);
  }, [selectedShipmentId, locations, shipments]);

  /* ─── Submit create ─── */
  const handleSubmitCreate = async e => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      if (!form.route_name.trim()) { setCreateError('Vui lòng nhập tên tuyến.'); setCreating(false); return; }
      if (!form.driver_id) { setCreateError('Vui lòng chọn tài xế.'); setCreating(false); return; }
      if (!selectedShipmentId) { setCreateError('Vui lòng chọn phiếu giao hàng.'); setCreating(false); return; }
      const sel = shipments.find(s => s._id === selectedShipmentId);
      const toLocationId = sel?.to_location_id?._id ?? sel?.to_location_id;
      const locOrg = sel?.to_location_id?.org_unit_id;
      const orderStore = sel?.order_id?.store_org_unit_id;
      const normalizeOrgUnitId = (org) => (org && typeof org === 'object' ? org._id : org);
      const storeOrgId = selectedStoreLocationId
        ? normalizeOrgUnitId(locations.find(l => String(l._id) === String(selectedStoreLocationId))?.org_unit_id)
        : (locOrg != null ? (typeof locOrg === 'object' ? locOrg._id : locOrg) : null)
          || (orderStore != null ? (typeof orderStore === 'object' ? orderStore._id : orderStore) : null)
          || (toLocationId ? normalizeOrgUnitId(locations.find(l => String(l._id) === String(toLocationId))?.org_unit_id) : null) ?? null;
      if (!storeOrgId) { setCreateError('Vui lòng chọn kho nhận (điểm dừng).'); setCreating(false); return; }

      const routeRes = await workflowService.createDeliveryRoute({
        route_name: form.route_name,
        driver_id: form.driver_id,
        planned_date: form.planned_date,
        vehicle_no: '',
        vehicle_type: 'VAN',
      });

      if (!routeRes.success) {
        setCreateError(routeRes.message || 'Tạo tuyến thất bại');
        setCreating(false);
        return;
      }

      const routeId = routeRes.data?._id;
      const planned = form.planned_date ? new Date(form.planned_date) : new Date();
      const estArrival = new Date(planned);
      estArrival.setHours(8, 0, 0, 0);
      const estDeparture = new Date(planned);
      estDeparture.setHours(9, 0, 0, 0);
      const stopRes = await workflowService.addRouteStop(routeId, {
        store_org_unit_id: storeOrgId,
        shipment_ids: [selectedShipmentId],
        estimated_arrival: estArrival.toISOString(),
        estimated_departure: estDeparture.toISOString(),
      });
      if (!stopRes.success) {
        setCreateError(stopRes.message || 'Thêm điểm dừng thất bại');
        setCreating(false);
        return;
      }

      // Phải xóa ?shipmentId= khỏi URL — nếu không useEffect sẽ coi createOpen=false + vẫn có shipmentId là tín hiệu mở lại modal.
      closeCreateModal({ clearQuery: true });
      setSuccess('Đã tạo tuyến giao hàng thành công.');
      loadRoutes(1);
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'Lỗi khi tạo tuyến');
    } finally {
      setCreating(false);
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

      {/* Header */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Điều phối & giao hàng</h1>
          <p className='mt-1 text-sm text-slate-500'>Quản lý tuyến giao hàng, điểm dừng và trạng thái vận chuyển.</p>
        </div>
        <div className='flex gap-2'>
          <button onClick={() => setCreateOpen(true)} className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'>
            <Plus className='h-4 w-4' /> Tạo tuyến giao
          </button>
          <button onClick={() => loadRoutes(1)} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Tìm theo tên tuyến / tài xế...' className='input-field w-full pl-9' />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className='input-field min-w-[180px]'>
          <option value='ALL'>Tất cả trạng thái</option>
          {Object.entries(ROUTE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Mã tuyến</th>
              <th className='px-4 py-3'>Tên tuyến</th>
              <th className='px-4 py-3'>Tài xế</th>
              <th className='px-4 py-3'>Ngày kế hoạch</th>
              <th className='px-4 py-3'>Trạng thái</th>
              <th className='px-4 py-3 text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && <tr><td colSpan={6} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td></tr>}
            {!loading && !filteredRoutes.length && <tr><td colSpan={6} className='px-4 py-6 text-center text-slate-400'>Chưa có tuyến giao nào.</td></tr>}
            {!loading && filteredRoutes.map(r => (
              <tr key={r._id} className='hover:bg-slate-50/50'>
                <td className='px-4 py-3 font-medium text-slate-900'>{r.route_no || r._id}</td>
                <td className='px-4 py-3 text-slate-700'>{r.route_name || '-'}</td>
                <td className='px-4 py-3 text-slate-700'>{r.driver_name || '-'}</td>
                <td className='px-4 py-3 text-slate-700'>{r.planned_date ? new Date(r.planned_date).toLocaleDateString('vi-VN') : '-'}</td>
                <td className='px-4 py-3'>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${routeStatusColor[r.status] || 'bg-slate-100 text-slate-700'}`}>
                    {ROUTE_STATUS[r.status] || r.status}
                  </span>
                </td>
                <td className='px-4 py-3 text-right'>
                  <button onClick={() => loadDetail(r._id)} className='rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'>Chi tiết</button>
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
            <button onClick={() => loadRoutes(pagination.page - 1)} disabled={pagination.page <= 1} className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'>Trước</button>
            <span>Trang {pagination.page} / {Math.max(1, pagination.pages)}</span>
            <button onClick={() => loadRoutes(pagination.page + 1)} disabled={pagination.page >= Math.max(1, pagination.pages)} className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'>Sau</button>
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {detailId && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={closeDetail}>
          <div className='w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Chi tiết tuyến giao hàng</h2>
              <button onClick={closeDetail} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>

            {!detailRoute && !detailError && <p className='text-sm text-slate-500'>Đang tải...</p>}
            {detailError && <p className='text-sm text-red-600'>{detailError}</p>}
            {detailRoute && (
              <div className='space-y-4'>
                {/* Route info */}
                <div className='rounded-lg border border-slate-200 bg-slate-50/50 p-3'>
                  <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-sm'>
                    <span className='text-slate-500'>Mã tuyến:</span>
                    <span className='font-medium'>{detailRoute.route_no || detailRoute._id}</span>
                    <span className='text-slate-500'>Tên tuyến:</span>
                    <span className='font-medium'>{detailRoute.route_name || '-'}</span>
                    <span className='text-slate-500'>Tài xế:</span>
                    <span>{detailRoute.driver_name || '-'} {detailRoute.driver_phone ? `(${detailRoute.driver_phone})` : ''}</span>
                    <span className='text-slate-500'>Ngày kế hoạch:</span>
                    <span>{detailRoute.planned_date ? new Date(detailRoute.planned_date).toLocaleDateString('vi-VN') : '-'}</span>
                    <span className='text-slate-500'>Trạng thái:</span>
                    <span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${routeStatusColor[detailRoute.status] || 'bg-slate-100 text-slate-700'}`}>
                        {ROUTE_STATUS[detailRoute.status] || detailRoute.status}
                      </span>
                    </span>
                    {detailRoute.actual_start_time && (
                      <>
                        <span className='text-slate-500'>Bắt đầu thực tế:</span>
                        <span>{new Date(detailRoute.actual_start_time).toLocaleString('vi-VN')}</span>
                      </>
                    )}
                    {detailRoute.actual_end_time && (
                      <>
                        <span className='text-slate-500'>Kết thúc thực tế:</span>
                        <span>{new Date(detailRoute.actual_end_time).toLocaleString('vi-VN')}</span>
                      </>
                    )}
                    <span className='text-slate-500'>Người tạo:</span>
                    <span>{detailRoute.created_by?.full_name || detailRoute.created_by?.username || '-'}</span>
                  </div>
                </div>

                {/* Thông tin theo phiếu giao hàng */}
                {(() => {
                  const shipmentsInRoute = getShipmentsFromStops(detailRoute.stops);
                  if (!shipmentsInRoute.length) return null;
                  return (
                    <div className='rounded-lg border border-slate-200 bg-white p-3'>
                      <h3 className='mb-2 text-sm font-medium text-slate-700'>Thông tin theo phiếu giao hàng</h3>
                      <ul className='space-y-1.5 text-sm'>
                        {shipmentsInRoute.map(s => (
                          <li key={s._id} className='flex items-center justify-between rounded-md bg-slate-50 px-3 py-2'>
                            <span className='font-medium text-slate-800'>{getShipmentLabel(s)}</span>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'PICKED' ? 'bg-amber-100 text-amber-700' : s.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' : s.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {SHIPMENT_STATUS_LABEL[s.status] || s.status || '-'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

                {/* Status flow guide */}
                <div className='rounded-lg border border-slate-200 bg-white p-3'>
                  <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>Quy trình tuyến giao</h3>
                  <div className='flex items-center gap-2 text-sm'>
                    {['PLANNED', 'IN_PROGRESS', 'COMPLETED'].map((s, i) => (
                      <span key={s} className='flex items-center gap-1'>
                        {i > 0 && <span className='text-slate-300'>→</span>}
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${detailRoute.status === s ? routeStatusColor[s] : 'bg-slate-50 text-slate-400'}`}>
                          {ROUTE_STATUS[s]}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions: Supply chỉ hủy tuyến; Bắt đầu giao hàng do Driver thực hiện */}
                <div className='flex flex-wrap gap-2'>
                  {detailRoute.status === 'PLANNED' && (
                    <button disabled={actionLoading} onClick={handleCancelRoute} className='rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50'>Hủy tuyến</button>
                  )}
                  {detailRoute.status === 'IN_PROGRESS' && (
                    <button disabled={actionLoading} onClick={handleCompleteRoute} className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'>
                      {actionLoading ? 'Đang xử lý...' : 'Hoàn thành tuyến giao'}
                    </button>
                  )}
                </div>

                {/* Stops */}
                <div>
                  <h3 className='mb-2 flex items-center gap-1 text-sm font-medium text-slate-700'>
                    <MapPin className='h-4 w-4' /> Điểm dừng ({(detailRoute.stops || []).length})
                  </h3>
                  {!(detailRoute.stops || []).length && <p className='text-sm text-slate-400'>Chưa có điểm dừng nào.</p>}
                  <div className='space-y-2'>
                    {(detailRoute.stops || []).map((stop, idx) => (
                      <div key={stop._id || idx} className='rounded-lg border border-slate-200 bg-white p-3'>
                        <div className='flex items-start justify-between'>
                          <div className='space-y-1 text-sm'>
                            <div className='font-medium text-slate-800'>
                              #{stop.sequence || idx + 1}. {getStoreName(stop.store_org_unit_id)}
                            </div>
                            <div className='text-slate-500'>
                              {stop.estimated_arrival && <>Dự kiến đến: {new Date(stop.estimated_arrival).toLocaleString('vi-VN')} | </>}
                              {stop.actual_arrival && <>Thực tế đến: {new Date(stop.actual_arrival).toLocaleString('vi-VN')} | </>}
                              {stop.actual_departure && <>Rời: {new Date(stop.actual_departure).toLocaleString('vi-VN')}</>}
                            </div>
                            {(stop.shipment_ids || []).length > 0 && (
                              <div className='text-slate-500'>
                                Lô hàng: {stop.shipment_ids.map(s => getShipmentLabel(s)).join(', ')}
                              </div>
                            )}
                            {stop.notes && <div className='text-slate-400 italic'>{stop.notes}</div>}
                          </div>
                          <div className='flex items-center gap-2'>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stopStatusColor[stop.status] || 'bg-slate-100 text-slate-600'}`}>
                              {STOP_STATUS[stop.status] || stop.status}
                            </span>
                          </div>
                        </div>
                        {detailRoute.status === 'IN_PROGRESS' && stop.status !== 'COMPLETED' && stop.status !== 'SKIPPED' && (
                          <div className='mt-2 flex flex-col gap-2 border-t border-slate-100 pt-2 sm:flex-row sm:items-center sm:justify-between'>
                            {stop.status === 'PENDING' && (
                              <button disabled={actionLoading} onClick={() => handleUpdateStop(stop, 'ARRIVED')} className='rounded bg-sky-500 px-3 py-1 text-xs text-white hover:bg-sky-600 disabled:opacity-60'>Đã đến</button>
                            )}
                            {stop.status === 'ARRIVED' && (
                              <>
                                <label className='flex cursor-pointer flex-1 items-center justify-between rounded-lg border border-dashed border-emerald-400 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100'>
                                  <div className='flex flex-col'>
                                    <span className='font-medium'>Ảnh giao hàng tại điểm dừng (tùy chọn)</span>
                                    <span className='text-[11px] text-emerald-600/80'>Nhấp để chọn file (jpg, png...)</span>
                                  </div>
                                  <input
                                    type='file'
                                    accept='image/*'
                                    onChange={e => {
                                      const file = e.target.files?.[0] || null;
                                      setStopPhotoFiles(prev => ({ ...prev, [stop._id]: file }));
                                    }}
                                    className='hidden'
                                  />
                                </label>
                                <button disabled={actionLoading} onClick={() => handleUpdateStop(stop, 'COMPLETED')} className='rounded bg-emerald-500 px-3 py-1 text-xs text-white hover:bg-emerald-600 disabled:opacity-60'>Hoàn thành</button>
                              </>
                            )}
                            {stop.status !== 'COMPLETED' && (
                              <button disabled={actionLoading} onClick={() => handleUpdateStop(stop, 'SKIPPED')} className='rounded border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60'>Bỏ qua</button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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
              <h2 className='text-lg font-semibold text-slate-900'>Tạo tuyến giao hàng</h2>
              <button onClick={() => !creating && closeCreateModal()} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {createError && <p className='mb-3 text-sm text-red-600'>{createError}</p>}

            <form onSubmit={handleSubmitCreate} className='space-y-4'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Tên tuyến *</label>
                  <input value={form.route_name} onChange={e => setForm(f => ({ ...f, route_name: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' required />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Ngày kế hoạch *</label>
                  <input type='date' value={form.planned_date} onChange={e => setForm(f => ({ ...f, planned_date: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' required />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Tài xế *</label>
                  <select value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' required>
                    <option value=''>-- Chọn tài xế --</option>
                    {drivers.map(d => (
                      <option key={d._id} value={d._id}>{d.full_name || d.username || d._id}{d.phone ? ` (${d.phone})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Phiếu giao hàng *</label>
                  <select value={selectedShipmentId} onChange={e => setSelectedShipmentId(e.target.value)} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' required>
                    <option value=''>-- Chọn phiếu giao --</option>
                    {eligibleShipments.map(sh => (
                      <option key={sh._id} value={sh._id}>{sh.shipment_no || sh._id}</option>
                    ))}
                    {!eligibleShipments.length && <option value='' disabled>Không có phiếu phù hợp (PICKED/SHIPPED/IN_TRANSIT)</option>}
                  </select>
                </div>
              </div>

              {/* Kho nhận (điểm dừng): chọn từ dropdown hoặc tự điền theo phiếu giao */}
              <div className='rounded-xl border border-slate-200 bg-slate-50 p-3'>
                <label className='block text-sm font-medium text-slate-700'>Kho nhận (điểm dừng) *</label>
                <select
                  value={selectedStoreLocationId}
                  onChange={e => setSelectedStoreLocationId(e.target.value)}
                  className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
                  required
                >
                  <option value=''>-- Chọn kho nhận --</option>
                  {(() => {
                    const byId = new Map();
                    locations.forEach(l => { if (l && l._id) byId.set(l._id, l); });
                    return Array.from(byId.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                  })().map(loc => (
                    <option key={loc._id} value={loc._id}>{loc.name || loc.code || loc._id}{loc.org_unit_id?.name ? ` (${loc.org_unit_id.name})` : ''}</option>
                  ))}
                </select>
                {selectedShipmentId && selectedShipment && (
                  <div className='mt-2 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600'>
                    <p className='font-medium text-slate-700'>Thông tin phiếu giao hàng</p>
                    <ul className='mt-1 space-y-0.5'>
                      <li>Phiếu: <strong>{getShipmentLabel(selectedShipment)}</strong></li>
                      {selectedShipment.order_id && (
                        <li>Đơn hàng: {typeof selectedShipment.order_id === 'object' ? selectedShipment.order_id.order_no : selectedShipment.order_id}</li>
                      )}
                      <li>Kho xuất: {getLocationLabel(selectedShipment.from_location_id)}</li>
                      <li>Kho nhận (theo phiếu): {getLocationLabel(selectedShipment.to_location_id)}</li>
                      {selectedShipment.ship_date && (
                        <li>Ngày giao: {new Date(selectedShipment.ship_date).toLocaleDateString('vi-VN')}</li>
                      )}
                    </ul>
                    <p className='mt-1.5 text-slate-400'>Điểm dừng duy nhất. Có thể chọn lại kho nhận ở dropdown trên nếu cần.</p>
                  </div>
                )}
              </div>

              <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                <button type='button' disabled={creating} onClick={() => closeCreateModal()} className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'>Hủy</button>
                <button type='submit' disabled={creating || !selectedShipmentId || !selectedStoreLocationId} className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60'>
                  {creating ? 'Đang tạo...' : 'Tạo tuyến giao'}
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
