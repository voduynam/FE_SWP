import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Truck, MapPin, RefreshCcw, CheckCircle, ArrowRight, History } from 'lucide-react';
import { workflowService } from '../../services/workflowService';
import { resolvePhotoUrl } from '../../utils/photoHelpers';

const SHIPMENT_STATUS = {
  DRAFT: 'Nháp',
  PICKED: 'Đã lấy hàng',
  SHIPPED: 'Đã xuất kho',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao đến',
  CANCELLED: 'Đã hủy',
};

const statusColor = {
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
        if (sid) map[sid] = routeId;
      });
    });
  });
  return map;
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
  const [shipmentToRouteId, setShipmentToRouteId] = useState({});
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [deliveredShipments, setDeliveredShipments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!deliveryPhotoFile) {
      setPreviewPhotoUrl('');
      return;
    }
    const url = URL.createObjectURL(deliveryPhotoFile);
    setPreviewPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [deliveryPhotoFile]);

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
      const combined = [...shipped, ...transit].sort((a, b) => new Date(b.ship_date || 0) - new Date(a.ship_date || 0));
      setShipments(combined);
      const myRoutes = Array.isArray(myRoutesRes?.data)
        ? myRoutesRes.data
        : Array.isArray(myRoutesRes?.data?.data)
          ? myRoutesRes.data.data
          : getList(myRoutesRes);
      setShipmentToRouteId(buildShipmentToRouteId(myRoutes));
    } catch {
      setShipments([]);
      setShipmentToRouteId({});
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveredShipments = async () => {
    setHistoryLoading(true);
    try {
      const res = await workflowService.getShipmentsPaginated({ status: 'DELIVERED', limit: PAGE_SIZE });
      const list = getList(res);
      setDeliveredShipments(list.sort((a, b) => new Date(b.delivery_photo_uploaded_at || b.updatedAt || 0) - new Date(a.delivery_photo_uploaded_at || a.updatedAt || 0)));
    } catch {
      setDeliveredShipments([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { loadShipments(); }, []);
  useEffect(() => { if (activeTab === 'history') loadDeliveredShipments(); }, [activeTab]);

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
    setActionLoadingId(shipment._id);
    setSuccess('');
    const routeId = shipmentToRouteId[shipment._id];
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
          ? { status: newStatus, deliveryPhoto: deliveryPhotoFile }
          : newStatus;
      const res = await workflowService.updateShipmentStatus(shipment._id, payload);
      if (res.success) {
        if (newStatus === 'DELIVERED' && routeId) {
          await workflowService.updateRouteStatus(routeId, { status: 'COMPLETED' });
        }
        setSuccess(`Đã cập nhật: ${SHIPMENT_STATUS[newStatus] || newStatus}`);
        setDetailShipment(prev => (prev?._id === shipment._id ? { ...prev, status: newStatus } : prev));
        if (newStatus === 'DELIVERED') {
          setDeliveryPhotoFile(null);
        }
        loadShipments();
      } else {
        alert(res.message || 'Cập nhật thất bại');
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Cập nhật thất bại');
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
              onClick={() => setActiveTab('history')}
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
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {deliveredShipments.map(sh => (
                <div key={sh._id} className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
                  <div className='mb-2 flex items-start justify-between'>
                    <p className='font-semibold text-slate-900'>{sh.shipment_no || sh._id}</p>
                    <span className='inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'>Đã giao</span>
                  </div>
                  <p className='text-xs text-slate-500'>
                    Ngày giao: {sh.delivery_photo_uploaded_at ? new Date(sh.delivery_photo_uploaded_at).toLocaleString('vi-VN') : (sh.updatedAt ? new Date(sh.updatedAt).toLocaleString('vi-VN') : '-')}
                  </p>
                  {sh.delivery_photo_url ? (
                    <div className='mt-3 rounded-lg border border-slate-200 p-2'>
                      <img src={resolvePhotoUrl(sh.delivery_photo_url)} alt='Ảnh giao hàng' className='h-24 w-full rounded object-cover' onError={e => { e.target.style.display = 'none'; }} />
                      <a href={resolvePhotoUrl(sh.delivery_photo_url)} target='_blank' rel='noopener noreferrer' className='mt-1 inline-block text-xs font-medium text-indigo-600 hover:text-indigo-800'>Xem ảnh</a>
                    </div>
                  ) : (
                    <p className='mt-2 text-xs text-slate-400'>Không có ảnh</p>
                  )}
                </div>
              ))}
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
                <div className='text-slate-500'>
                  Ngày giao: {sh.ship_date ? new Date(sh.ship_date).toLocaleString('vi-VN') : '-'}
                </div>
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
                    className='flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60'
                  >
                    {actionLoadingId === sh._id ? '...' : 'Nhận đơn'}
                  </button>
                )}
                {sh.status === 'IN_TRANSIT' && (
                  <button
                    onClick={() => loadDetail(sh._id)}
                    className='flex-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100'
                  >
                    Cập nhật / gửi ảnh
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

                <div className='flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between'>
                  {detailShipment.status === 'SHIPPED' && (
                    <button
                      disabled={actionLoadingId === detailShipment._id}
                      onClick={() => updateStatus(detailShipment, 'IN_TRANSIT')}
                      className='inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60'
                    >
                      <ArrowRight className='h-4 w-4' /> Nhận đơn
                    </button>
                  )}
                  {detailShipment.status === 'IN_TRANSIT' && (
                    <>
                      <label className='flex cursor-pointer flex-1 items-center justify-between rounded-lg border border-dashed border-emerald-400 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100'>
                        <div className='flex flex-col text-left'>
                          <span className='font-medium'>
                            Ảnh giao hàng {deliveryPhotoFile ? '(đã chọn)' : ''}
                          </span>
                          <span className='text-[11px] text-emerald-600/80'>
                            {deliveryPhotoFile
                              ? deliveryPhotoFile.name
                              : 'Nhấp để chọn file (jpg, png...)'}
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
                        <div className='rounded-lg border border-emerald-200 bg-white p-2'>
                          <p className='mb-1 text-xs font-medium text-emerald-700'>Preview ảnh trước khi gửi</p>
                          <img src={previewPhotoUrl} alt='Preview giao hàng' className='max-w-[200px] rounded border border-slate-200 object-cover' />
                        </div>
                      )}
                      <button
                        disabled={actionLoadingId === detailShipment._id || !deliveryPhotoFile}
                        onClick={() => updateStatus(detailShipment, 'DELIVERED')}
                        className='inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
                      >
                        <CheckCircle className='h-4 w-4' /> Xác nhận đã giao đến
                      </button>
                    </>
                  )}
                  {detailShipment.status === 'DELIVERED' && (
                    <p className='text-sm font-medium text-emerald-600'>✓ Đã giao thành công</p>
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
