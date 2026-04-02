import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Truck, MapPin, RefreshCcw, CheckCircle, ArrowRight, History, Navigation, Wallet } from 'lucide-react';
import { workflowService } from '../../services/workflowService';
import { resolvePhotoUrl } from '../../utils/photoHelpers';

const SHIPMENT_STATUS = {
  DRAFT: 'Nháp',
  PICKED: 'Đã có hàng',
  SHIPPED: 'Đã xuất kho',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao đến',
  CANCELLED: 'Đã hủy',
};

const statusColor = {
  PICKED: 'bg-amber-100 text-amber-700',
  SHIPPED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
};

const PAGE_SIZE = 20;

function getList(res) {
  if (!res?.success || !res?.data) return [];
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

function getLocationLabel(loc) {
  if (!loc) return '-';
  if (typeof loc === 'object') return loc.name || loc.code || loc._id;
  return loc;
}

function getItemName(obj) {
  if (!obj) return '-';
  if (typeof obj === 'object') return obj.name || obj.sku || obj._id;
  return obj;
}

function buildShipmentToRouteId(myRoutesList) {
  const map = {};
  if (!Array.isArray(myRoutesList)) return map;
  myRoutesList.forEach((route) => {
    const routeId = route._id;
    const stops = route.stops || [];
    stops.forEach((stop) => {
      const ids = stop.shipment_ids || [];
      ids.forEach((s) => {
        const sid = typeof s === 'object' ? s._id : s;
        if (sid != null) map[String(sid)] = routeId;
      });
    });
  });
  return map;
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatVnd(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '-';
  return `${v.toLocaleString('vi-VN')} đ`;
}

function getCodEvidencePhotoUrls(shipment) {
  const raw = shipment?.cod_evidence_photos;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e) => (typeof e === 'string' ? e : e?.url))
    .filter(Boolean);
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function DriverShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detailShipment, setDetailShipment] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deliveryPhotoFile, setDeliveryPhotoFile] = useState(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState('');
  const [codCollectedAmount, setCodCollectedAmount] = useState('');
  const [codCollectionNotes, setCodCollectionNotes] = useState('');
  const [codEvidenceFiles, setCodEvidenceFiles] = useState([]);
  const [codEvidencePreviewUrls, setCodEvidencePreviewUrls] = useState([]);
  const [shipmentToRouteId, setShipmentToRouteId] = useState({});
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [deliveredShipments, setDeliveredShipments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPag, setHistoryPag] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
  const [currentCoords, setCurrentCoords] = useState(null);

  useEffect(() => {
    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (!deliveryPhotoFile) {
      setPreviewPhotoUrl('');
      return;
    }
    const url = URL.createObjectURL(deliveryPhotoFile);
    setPreviewPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [deliveryPhotoFile]);

  useEffect(() => {
    const files = codEvidenceFiles || [];
    const urls = files.map((f) => URL.createObjectURL(f));
    setCodEvidencePreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [codEvidenceFiles]);

  const loadShipments = async () => {
    setLoading(true);
    setSuccess('');
    try {
      const [shippedRes, transitRes, myRoutesRes] = await Promise.all([
        workflowService.getShipmentsPaginated({ status: 'SHIPPED', limit: PAGE_SIZE }),
        workflowService.getShipmentsPaginated({ status: 'IN_TRANSIT', limit: PAGE_SIZE }),
        workflowService.getMyDeliveryRoutes({ limit: 50 }),
      ]);
      const shipped = getList(shippedRes);
      const transit = getList(transitRes);
      const myRoutes = Array.isArray(myRoutesRes?.data)
        ? myRoutesRes.data
        : Array.isArray(myRoutesRes?.data?.data)
          ? myRoutesRes.data.data
          : getList(myRoutesRes);
      setShipmentToRouteId(buildShipmentToRouteId(myRoutes));

      // Hiển thị lô đã được phân (tuyến Đã lên kế hoạch) cho driver — tối đa 10 request
      const existingIds = new Set([...shipped, ...transit].map((s) => s._id));
      const plannedShipmentIds = [];
      (myRoutes || []).forEach((route) => {
        (route.stops || []).forEach((stop) => {
          (stop.shipment_ids || []).forEach((s) => {
            const sid = typeof s === 'object' ? s._id : s;
            if (sid && !existingIds.has(sid)) {
              plannedShipmentIds.push(sid);
              existingIds.add(sid);
            }
          });
        });
      });
      const toFetch = plannedShipmentIds.slice(0, 10);
      const plannedRes = await Promise.all(toFetch.map((id) => workflowService.getShipment(id)));
      const plannedRaw = plannedRes
        .filter((r) => r?.success && r?.data)
        .map((r) => r.data);
      // Chỉ hiển thị lô đã được CK/Supply dispatch (SHIPPED/IN_TRANSIT) – không cho tài xế chạy lô còn PICKED/DRAFT
      const planned = plannedRaw.filter(
        (s) => s.status === 'SHIPPED' || s.status === 'IN_TRANSIT'
      );

      const combined = [...planned, ...shipped, ...transit]
        .filter((s) => s.status !== 'DELIVERED')
        .sort((a, b) => new Date(b.ship_date || b.updatedAt || 0) - new Date(a.ship_date || a.updatedAt || 0));
      setShipments(combined);
    } catch {
      setShipments([]);
      setShipmentToRouteId({});
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveredShipments = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await workflowService.getShipmentsPaginated({
        status: 'DELIVERED',
        page: historyPage,
        limit: PAGE_SIZE,
      });
      const list = getList(res);
      const p = res?.data?.pagination ?? {};
      setHistoryPag({
        page: p.page || historyPage,
        limit: p.limit || PAGE_SIZE,
        total: p.total || list.length,
        pages: p.pages || 1,
      });
      setDeliveredShipments(
        list.sort(
          (a, b) =>
            new Date(b.delivery_photo_uploaded_at || b.updatedAt || 0) -
            new Date(a.delivery_photo_uploaded_at || a.updatedAt || 0),
        ),
      );
    } catch {
      setDeliveredShipments([]);
      setHistoryPag({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage]);

  useEffect(() => { loadShipments(); }, []);
  useEffect(() => {
    if (activeTab === 'history') loadDeliveredShipments();
  }, [activeTab, historyPage, loadDeliveredShipments]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const closeDetail = () => {
    setDetailId(null);
    setDetailShipment(null);
    setDeliveryPhotoFile(null);
    setCodCollectedAmount('');
    setCodCollectionNotes('');
    setCodEvidenceFiles([]);
  };

  const loadDetail = async (id) => {
    setDetailId(id);
    setDetailShipment(null);
    if (!id) return;
    const res = await workflowService.getShipment(id);
    if (res.success && res.data) setDetailShipment(res.data);
  };

  const updateStatus = async (shipment, newStatus) => {
    if (newStatus === 'DELIVERED' && !deliveryPhotoFile) {
      alert('Vui lòng chọn ảnh giao hàng trước khi xác nhận đã giao đến.');
      return;
    }
    const requiredCodAmount = Number(shipment?.cod_amount || 0);
    const hasCOD = requiredCodAmount > 0;
    if (newStatus === 'DELIVERED' && hasCOD) {
      const collected = Number(codCollectedAmount);
      if (!Number.isFinite(collected) || collected <= 0) {
        alert('Đơn COD bắt buộc nhập số tiền đã thu.');
        return;
      }
      if (codEvidenceFiles.length === 0) {
        alert('Đơn COD bắt buộc có ảnh/video chứng minh thu tiền.');
        return;
      }
    }
    setActionLoadingId(shipment._id);
    setSuccess('');
    let routeId = shipmentToRouteId[String(shipment._id)];
    // Giữ file gửi API, xóa state ngay để không còn hiển thị blob/preview ở "ảnh đã gửi"
    const fileToSend = newStatus === 'DELIVERED' ? deliveryPhotoFile : null;
    if (newStatus === 'DELIVERED') setDeliveryPhotoFile(null);
    try {
      if (newStatus === 'IN_TRANSIT' && routeId) {
        const routeRes = await workflowService.updateRouteStatus(routeId, { status: 'IN_PROGRESS' });
        if (!routeRes.success) {
          alert(routeRes.message || 'Cập nhật tuyến thất bại');
          setActionLoadingId(null);
          return;
        }
      }
      const payload =
        newStatus === 'DELIVERED'
          ? {
              status: newStatus,
              deliveryPhoto: fileToSend,
              codAmountCollected: hasCOD ? codCollectedAmount : undefined,
              codCollectionNotes: hasCOD ? codCollectionNotes : undefined,
              codEvidencePhotos: hasCOD ? codEvidenceFiles : undefined,
            }
          : newStatus;
      const res = await workflowService.updateShipmentStatus(shipment._id, payload);
      if (res.success) {
        if (newStatus === 'DELIVERED') {
          setCodCollectedAmount('');
          setCodCollectionNotes('');
          setCodEvidenceFiles([]);
          if (!routeId) {
            const myRoutesRes = await workflowService.getMyDeliveryRoutes({ limit: 50 });
            const myRoutes = Array.isArray(myRoutesRes?.data) ? myRoutesRes.data : Array.isArray(myRoutesRes?.data?.data) ? myRoutesRes.data.data : getList(myRoutesRes);
            const map = buildShipmentToRouteId(myRoutes);
            routeId = map[String(shipment._id)];
          }
          if (routeId) {
            await workflowService.updateRouteStatus(routeId, { status: 'COMPLETED' });
          }
        }
        setSuccess(`Đã cập nhật: ${SHIPMENT_STATUS[newStatus] || newStatus}`);
        if (newStatus === 'DELIVERED') {
          // Luôn lấy dữ liệu từ server để "ảnh đã gửi" dùng delivery_photo_url (Cloudinary), không dùng local
          const refetched = await workflowService.getShipment(shipment._id);
          setDetailShipment(prev =>
            prev?._id === shipment._id && refetched.success && refetched.data
              ? refetched.data
              : prev?._id === shipment._id
                ? (res.data ? { ...prev, ...res.data, status: newStatus } : { ...prev, status: newStatus })
                : prev
          );
        } else {
          setDetailShipment(prev =>
            prev?._id === shipment._id
              ? (res.data ? { ...prev, ...res.data, status: newStatus } : { ...prev, status: newStatus })
              : prev
          );
        }
        loadShipments();
      } else {
        alert(res.message || 'Cập nhật thất bại');
      }
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Cập nhật thất bại');
    } finally {
      setActionLoadingId(null);
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
          <h1 className='text-2xl font-bold text-slate-900'>Lô giao hàng của tôi</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Xem lô đang cần giao, cập nhật trạng thái vận chuyển và xác nhận đã giao đến.
          </p>
          <p className='mt-1 text-xs text-slate-500'>
            <strong>Đã xuất kho</strong> (xuất kho + nhận đơn) → tới nơi thì bấm <strong>Xác nhận giao hàng</strong> (gửi ảnh). Bấm Chi tiết để thao tác.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex rounded-lg border border-slate-200 p-0.5'>
            <button
              onClick={() => setActiveTab('active')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === 'active' ? 'bg-slate-200 text-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Đang giao
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                setHistoryPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === 'history' ? 'bg-slate-200 text-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <History className='h-4 w-4' /> Lịch sử đã giao
            </button>
          </div>
          <button onClick={() => activeTab === 'active' ? loadShipments() : loadDeliveredShipments()} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      {activeTab === 'history' && (
        <>
          {historyLoading && <p className='text-sm text-slate-500'>Đang tải lịch sử...</p>}
          {!historyLoading && deliveredShipments.length === 0 && (
            <div className='rounded-xl border border-slate-200 bg-slate-50/50 py-16 text-center'>
              <History className='mx-auto h-16 w-16 text-slate-300' />
              <p className='mt-4 text-slate-600'>Chưa có lịch sử giao hàng</p>
              <p className='mt-1 text-sm text-slate-500'>Các lô đã xác nhận giao đến sẽ hiển thị tại đây</p>
            </div>
          )}
          {!historyLoading && deliveredShipments.length > 0 && (
            <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
              <table className='w-full text-sm'>
                <thead className='border-b border-slate-200 bg-slate-50/80 text-left'>
                  <tr>
                    <th className='px-4 py-3 font-medium text-slate-600'>Lô giao</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Đơn hàng</th>
                    <th className='px-4 py-3 font-medium text-slate-600'>Giao đến</th>
                    <th className='px-4 py-3 font-medium text-slate-600'>Ngày giao</th>
                    <th className='px-4 py-3 font-medium text-slate-600'>Trạng thái</th>
                    <th className='px-4 py-3 font-medium text-slate-600 text-right'>Thao tác</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {deliveredShipments.map(sh => (
                    <tr key={sh._id} className='hover:bg-slate-50/50'>
                      <td className='px-4 py-3 font-medium text-slate-900'>
                        {sh.shipment_no || sh._id}
                      </td>
                    <td className='px-4 py-3 text-slate-700'>
                      {sh.order_id?.order_no || sh.order_id?.orderNo || sh.order_id || '-'}
                    </td>
                    <td className='px-4 py-3 text-slate-700'>
                      {getLocationLabel(sh.to_location_id)}
                    </td>
                      <td className='px-4 py-3 text-slate-500'>
                        {sh.delivery_photo_uploaded_at
                          ? new Date(sh.delivery_photo_uploaded_at).toLocaleString('vi-VN')
                          : sh.updatedAt
                            ? new Date(sh.updatedAt).toLocaleString('vi-VN')
                            : '-'}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusColor.DELIVERED || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {SHIPMENT_STATUS.DELIVERED}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <button
                          type='button'
                          onClick={() => loadDetail(sh._id)}
                          className='rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50'
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'history' && historyPag.pages > 1 && (
            <div className='flex items-center justify-between text-sm text-slate-500'>
              <span>
                Trang {historyPag.page}/{historyPag.pages} ({historyPag.total} lô)
              </span>
              <div className='flex gap-1'>
                <button
                  type='button'
                  disabled={historyPag.page <= 1 || historyLoading}
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  className='rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40'
                >
                  Trước
                </button>
                <button
                  type='button'
                  disabled={historyPag.page >= historyPag.pages || historyLoading}
                  onClick={() =>
                    setHistoryPage(p => Math.min(historyPag.pages, p + 1))
                  }
                  className='rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40'
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'active' && loading && <p className='text-sm text-slate-500'>Đang tải...</p>}
      {activeTab === 'active' && !loading && shipments.length === 0 && (
        <div className='rounded-xl border border-slate-200 bg-slate-50/50 py-16 text-center'>
          <Truck className='mx-auto h-16 w-16 text-slate-300' />
          <p className='mt-4 text-slate-600'>Không có lô nào đang chờ giao</p>
          <p className='mt-1 text-sm text-slate-500'>Các lô đã xuất kho hoặc đang vận chuyển sẽ hiển thị tại đây</p>
        </div>
      )}

      {activeTab === 'active' && !loading && shipments.length > 0 && (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {shipments.map(sh => (
            <div
              key={sh._id}
              className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md'
            >
              <div className='mb-3 flex items-start justify-between'>
                <div>
                  <p className='font-semibold text-slate-900'>{sh.shipment_no || sh._id}</p>
                  <p className='text-xs text-slate-500'>Đơn: {sh.order_id?.order_no || sh.order_id || '-'}</p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[sh.status] || 'bg-slate-100 text-slate-700'}`}>
                  {SHIPMENT_STATUS[sh.status] || sh.status}
                </span>
              </div>
              <div className='space-y-2 text-sm'>
                <div className='flex items-center gap-2 text-slate-600'>
                  <MapPin className='h-4 w-4 flex-shrink-0 text-slate-400' />
                  <span>Đến: {getLocationLabel(sh.to_location_id)}</span>
                </div>
                {sh?.to_location_id?.coordinates?.latitude && sh?.to_location_id?.coordinates?.longitude && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${sh.to_location_id.coordinates.latitude},${sh.to_location_id.coordinates.longitude}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800'
                  >
                    <Navigation className='h-3.5 w-3.5' /> Mở Google Maps
                  </a>
                )}
                <div className='text-slate-500'>
                  Ngày giao: {sh.ship_date ? new Date(sh.ship_date).toLocaleString('vi-VN') : '-'}
                </div>
                {Number(sh?.cod_amount || 0) > 0 && (
                  <div className='flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-900'>
                    <Wallet className='h-3.5 w-3.5 shrink-0' />
                    <span>Thu hộ COD: {formatVnd(sh.cod_amount)}</span>
                  </div>
                )}
              </div>
              <div className='mt-4 flex gap-2'>
                <button
                  onClick={() => loadDetail(sh._id)}
                  className='flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'
                >
                  Chi tiết
                </button>
                {sh.status === 'SHIPPED' && (
                  <button
                    disabled={actionLoadingId === sh._id}
                    onClick={() => updateStatus(sh, 'IN_TRANSIT')}
                    className='flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60'
                  >
                    {actionLoadingId === sh._id ? '...' : 'Đã xuất kho'}
                  </button>
                )}
                {sh.status === 'IN_TRANSIT' && (
                  <button
                    onClick={() => loadDetail(sh._id)}
                    className='flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700'
                  >
                    Đã tới nơi / Xác nhận giao hàng
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {detailId && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={closeDetail}>
          <div className='w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Chi tiết lô giao hàng</h2>
              <button onClick={closeDetail} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {!detailShipment && <p className='text-sm text-slate-500'>Đang tải...</p>}
            {detailShipment && (
              <div className='space-y-4'>
                {Number(detailShipment?.cod_amount || 0) > 0 && (() => {
                  const expected = Number(detailShipment.cod_amount || 0);
                  const collectedAmt = Number(detailShipment.cod_collected_amount || 0);
                  const codDone =
                    detailShipment.status === 'DELIVERED' &&
                    (detailShipment.cod_status === 'COLLECTED' ||
                      detailShipment.cod_status === 'CONFIRMED' ||
                      collectedAmt > 0);
                  return (
                    <div className='rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50/80 p-4 shadow-sm'>
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div className='flex items-center gap-3'>
                          <div className='flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-800'>
                            <Wallet className='h-5 w-5' />
                          </div>
                          <div>
                            <p className='text-[11px] font-semibold uppercase tracking-wide text-amber-800'>
                              Thu hộ COD (khi giao)
                            </p>
                            <p className='text-xl font-bold text-amber-950 tabular-nums'>
                              {formatVnd(expected)}
                            </p>
                          </div>
                        </div>
                        {codDone && (
                          <span className='inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800'>
                            <CheckCircle className='h-3.5 w-3.5' />
                            Đã thu COD thành công
                            {collectedAmt > 0 ? ` — ${formatVnd(collectedAmt)}` : ''}
                          </span>
                        )}
                      </div>
                      {detailShipment.status === 'IN_TRANSIT' && (
                        <p className='mt-2 text-xs text-amber-900/80'>
                          Vui lòng thu đúng số tiền, nhập số đã thu và chụp ảnh chứng minh bên dưới trước khi xác nhận giao hàng. Sau khi giao, quản lý sẽ đối chiếu ảnh và số tiền có khớp đơn hay không.
                        </p>
                      )}
                    </div>
                  );
                })()}
                {(() => {
                  const dLat = toNumber(detailShipment?.to_location_id?.coordinates?.latitude);
                  const dLng = toNumber(detailShipment?.to_location_id?.coordinates?.longitude);
                  if (dLat == null || dLng == null) return null;
                  const destination = `${dLat},${dLng}`;
                  const origin = currentCoords ? `${currentCoords.lat},${currentCoords.lng}` : null;
                  const mapSrc = origin
                    ? `https://www.google.com/maps?q=${encodeURIComponent(origin)}&z=14&output=embed`
                    : `https://www.google.com/maps?q=${encodeURIComponent(destination)}&z=15&output=embed`;
                  const distanceKm = currentCoords
                    ? calculateDistanceKm(currentCoords.lat, currentCoords.lng, dLat, dLng)
                    : null;
                  return (
                    <div className='rounded-lg border border-indigo-200 bg-indigo-50/60 p-3'>
                      <div className='mb-2 flex items-center justify-between'>
                        <p className='text-xs font-semibold uppercase tracking-wide text-indigo-700'>
                          Bản đồ điểm giao
                        </p>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}&destination=${encodeURIComponent(destination)}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-xs font-medium text-indigo-700 hover:text-indigo-900'
                        >
                          Mở chỉ đường
                        </a>
                      </div>
                      <iframe
                        title='Delivery location map'
                        src={mapSrc}
                        className='h-56 w-full rounded-lg border border-indigo-100'
                        loading='lazy'
                        referrerPolicy='no-referrer-when-downgrade'
                      />
                      <p className='mt-2 text-xs text-indigo-700'>
                        Tọa độ giao: {destination}
                        {distanceKm != null ? ` • Khoảng cách ước tính từ vị trí hiện tại: ${distanceKm.toFixed(2)} km` : ''}
                      </p>
                    </div>
                  );
                })()}
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

                <div>
                  <h3 className='mb-2 text-sm font-medium text-slate-700'>Sản phẩm trong lô</h3>
                  <div className='rounded-lg border border-slate-200'>
                    <table className='w-full text-sm'>
                      <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                        <tr>
                          <th className='px-3 py-2'>Sản phẩm</th>
                          <th className='px-3 py-2 text-right'>Số lượng</th>
                          <th className='px-3 py-2'>ĐVT</th>
                          <th className='px-3 py-2'>Lô</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-slate-100'>
                        {(detailShipment.lines || []).map((line, idx) => (
                          <tr key={line._id || idx}>
                            <td className='px-3 py-2 font-medium'>{getItemName(line.item_id)}</td>
                            <td className='px-3 py-2 text-right'>{line.qty ?? 0}</td>
                            <td className='px-3 py-2'>{line.uom_id?.code || line.uom_id?.name || '-'}</td>
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

                <div className='border-t border-slate-200 pt-4'>
                  <h3 className='mb-3 text-sm font-semibold text-slate-700'>Cập nhật trạng thái giao hàng</h3>
                  <div className='flex flex-col gap-4'>
                  {detailShipment.status === 'SHIPPED' && (
                    <button
                      disabled={actionLoadingId === detailShipment._id}
                      onClick={() => updateStatus(detailShipment, 'IN_TRANSIT')}
                      className='inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60'
                    >
                      <ArrowRight className='h-4 w-4' /> Đã xuất kho
                    </button>
                  )}
                  {detailShipment.status === 'IN_TRANSIT' && (() => {
                    const hasCod = Number(detailShipment?.cod_amount || 0) > 0;
                    return (
                      <div className={`grid gap-4 ${hasCod ? 'lg:grid-cols-2' : ''}`}>
                        <div className='space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4'>
                          <p className='text-sm font-semibold text-emerald-900'>Ảnh xác nhận giao hàng</p>
                          <p className='text-xs text-slate-600'>
                            Đã tới nơi — chọn ảnh giao; preview hiển thị ngay bên dưới.
                          </p>
                          <label className='flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-emerald-400 bg-white px-3 py-2.5 text-xs text-emerald-800 hover:bg-emerald-50/80'>
                            <div className='flex min-w-0 flex-col text-left'>
                              <span className='font-medium'>
                                {deliveryPhotoFile ? 'Đã chọn ảnh' : 'Chọn ảnh giao hàng'}
                              </span>
                              <span className='truncate text-[11px] text-emerald-700/80'>
                                {deliveryPhotoFile?.name || 'JPG, PNG...'}
                              </span>
                            </div>
                            <input
                              type='file'
                              accept='image/*'
                              onChange={e => setDeliveryPhotoFile(e.target.files?.[0] || null)}
                              className='hidden'
                            />
                          </label>
                          {previewPhotoUrl && (
                            <div className='overflow-hidden rounded-lg border border-emerald-200 bg-white p-2 shadow-inner'>
                              <p className='mb-2 text-xs font-medium text-emerald-800'>Xem trước ngay</p>
                              <img
                                src={previewPhotoUrl}
                                alt='Preview giao hàng'
                                className='max-h-60 w-full rounded-md object-contain'
                              />
                            </div>
                          )}
                        </div>

                        {hasCod && (
                          <div className='space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4'>
                            <p className='text-sm font-semibold text-amber-900'>Thu hộ COD</p>
                            <p className='text-[11px] leading-relaxed text-amber-800/90'>
                              Quản lý sẽ xác nhận sau khi bạn giao xong (đối chiếu số tiền và ảnh chứng minh).
                            </p>
                            <p className='text-xs text-amber-900'>
                              Số tiền cần thu:{' '}
                              <span className='text-base font-bold tabular-nums text-amber-950'>
                                {formatVnd(detailShipment.cod_amount)}
                              </span>
                            </p>
                            <input
                              type='number'
                              min='0'
                              step='1000'
                              placeholder='Nhập số tiền đã thu'
                              value={codCollectedAmount}
                              onChange={e => setCodCollectedAmount(e.target.value)}
                              className='w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm'
                            />
                            <label className='flex cursor-pointer flex-col gap-1 rounded-lg border border-dashed border-amber-400 bg-white px-3 py-2.5 text-xs text-amber-900 hover:bg-amber-50/80'>
                              <span className='font-medium'>Ảnh / video chứng minh thu tiền (tối đa 3)</span>
                              <span className='text-[11px] text-amber-800/80'>Chọn xong là hiện preview ngay</span>
                              <input
                                type='file'
                                multiple
                                accept='image/*,video/*'
                                onChange={e =>
                                  setCodEvidenceFiles(Array.from(e.target.files || []).slice(0, 3))
                                }
                                className='mt-1 text-[11px] file:mr-2 file:rounded file:border-0 file:bg-amber-100 file:px-2 file:py-1 file:text-amber-900'
                              />
                            </label>
                            {codEvidencePreviewUrls.length > 0 && (
                              <div>
                                <p className='mb-2 text-xs font-medium text-amber-900'>Xem trước chứng minh COD</p>
                                <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                                  {codEvidenceFiles.map((file, i) => {
                                    const url = codEvidencePreviewUrls[i];
                                    if (!url) return null;
                                    const isVideo = file?.type?.startsWith('video');
                                    return (
                                      <a
                                        key={`${url}-${i}`}
                                        href={url}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='block overflow-hidden rounded-lg border border-amber-200 bg-white'
                                      >
                                        {isVideo ? (
                                          <video
                                            src={url}
                                            className='h-28 w-full object-cover'
                                            muted
                                            playsInline
                                            preload='metadata'
                                          />
                                        ) : (
                                          <img
                                            src={url}
                                            alt={`COD ${i + 1}`}
                                            className='h-28 w-full object-cover'
                                          />
                                        )}
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <textarea
                              rows={2}
                              placeholder='Ghi chú thu tiền COD (nếu có)'
                              value={codCollectionNotes}
                              onChange={e => setCodCollectionNotes(e.target.value)}
                              className='w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs'
                            />
                          </div>
                        )}

                        <div
                          className={
                            hasCod
                              ? 'flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4 lg:col-span-2'
                              : 'flex flex-wrap justify-end gap-2 pt-1'
                          }
                        >
                          <button
                            disabled={actionLoadingId === detailShipment._id || !deliveryPhotoFile}
                            onClick={() => updateStatus(detailShipment, 'DELIVERED')}
                            className='inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60'
                          >
                            <CheckCircle className='h-4 w-4' /> Xác nhận giao hàng
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                  {!['PICKED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(detailShipment.status) && (
                    <p className='text-sm text-slate-600'>
                      Lô ở trạng thái <strong>{SHIPMENT_STATUS[detailShipment.status] || detailShipment.status}</strong>. Không có thao tác cập nhật cho trạng thái này.
                    </p>
                  )}
                  {detailShipment.status === 'DELIVERED' && (() => {
                    const deliveryUrl = resolvePhotoUrl(detailShipment.delivery_photo_url);
                    const evidenceUrls = getCodEvidencePhotoUrls(detailShipment).map((u) =>
                      resolvePhotoUrl(u),
                    );
                    const hasCod = Number(detailShipment?.cod_amount || 0) > 0;
                    const collectedAmt = Number(detailShipment.cod_collected_amount || 0);
                    const codDone =
                      hasCod &&
                      (detailShipment.cod_status === 'COLLECTED' ||
                        detailShipment.cod_status === 'CONFIRMED' ||
                        collectedAmt > 0);
                    return (
                      <div className='space-y-4'>
                        <p className='inline-flex items-center gap-2 text-sm font-semibold text-emerald-700'>
                          <CheckCircle className='h-4 w-4' /> Đã giao thành công
                        </p>
                        <div className='grid gap-4 sm:grid-cols-2'>
                          {deliveryUrl && (
                            <div className='rounded-xl border border-slate-200 bg-slate-50/50 p-3'>
                              <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600'>
                                Ảnh giao hàng
                              </p>
                              <img
                                src={deliveryUrl}
                                alt='Ảnh giao hàng'
                                className='max-h-64 w-full rounded-lg border border-slate-200 object-contain bg-white'
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                              <a
                                href={deliveryUrl}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='mt-2 inline-block text-xs font-medium text-indigo-600 hover:text-indigo-800'
                              >
                                Mở ảnh giao hàng
                              </a>
                            </div>
                          )}
                          {hasCod && (
                            <div className='rounded-xl border border-amber-200 bg-amber-50/40 p-3'>
                              <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900'>
                                Thu hộ COD
                              </p>
                              {codDone ? (
                                <p className='mb-2 text-sm font-medium text-emerald-800'>
                                  Đã thu COD thành công
                                  {collectedAmt > 0 ? ` — ${formatVnd(collectedAmt)}` : ''}
                                </p>
                              ) : (
                                <p className='mb-2 text-xs text-amber-900'>
                                  Dự kiến thu: {formatVnd(detailShipment.cod_amount)}
                                </p>
                              )}
                              {detailShipment.cod_collection_notes && (
                                <p className='mb-2 text-xs text-slate-600'>
                                  Ghi chú: {detailShipment.cod_collection_notes}
                                </p>
                              )}
                              {evidenceUrls.length > 0 && (
                                <div>
                                  <p className='mb-2 text-xs font-medium text-amber-900'>
                                    Ảnh chứng minh thu tiền
                                  </p>
                                  <div className='grid grid-cols-2 gap-2'>
                                    {evidenceUrls.map((u, i) => (
                                      <a
                                        key={`${u}-${i}`}
                                        href={u}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='block overflow-hidden rounded-lg border border-amber-200 bg-white'
                                      >
                                        <img
                                          src={u}
                                          alt={`Chứng minh ${i + 1}`}
                                          className='h-24 w-full object-cover'
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                          }}
                                        />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  </div>
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
