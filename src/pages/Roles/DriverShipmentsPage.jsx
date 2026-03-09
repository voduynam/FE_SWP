import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Truck, MapPin, RefreshCcw, CheckCircle, ArrowRight } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

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

export default function DriverShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detailShipment, setDetailShipment] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadShipments = async () => {
    setLoading(true);
    setSuccess('');
    try {
      const [shippedRes, transitRes] = await Promise.all([
        workflowService.getShipmentsPaginated({ status: 'SHIPPED', limit: PAGE_SIZE }),
        workflowService.getShipmentsPaginated({ status: 'IN_TRANSIT', limit: PAGE_SIZE }),
      ]);
      const shipped = getList(shippedRes);
      const transit = getList(transitRes);
      const combined = [...shipped, ...transit].sort((a, b) => new Date(b.ship_date || 0) - new Date(a.ship_date || 0));
      setShipments(combined);
    } catch {
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadShipments(); }, []);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const loadDetail = async (id) => {
    setDetailId(id);
    setDetailShipment(null);
    if (!id) return;
    const res = await workflowService.getShipment(id);
    if (res.success && res.data) setDetailShipment(res.data);
  };

  const updateStatus = async (shipment, newStatus) => {
    setActionLoadingId(shipment._id);
    setSuccess('');
    try {
      const res = await workflowService.updateShipmentStatus(shipment._id, newStatus);
      if (res.success) {
        setSuccess(`Đã cập nhật: ${SHIPMENT_STATUS[newStatus] || newStatus}`);
        setDetailShipment(prev => (prev?._id === shipment._id ? { ...prev, status: newStatus } : prev));
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
        <button onClick={() => loadShipments()} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
          <RefreshCcw className='h-4 w-4' /> Làm mới
        </button>
      </div>

      {loading && <p className='text-sm text-slate-500'>Đang tải...</p>}
      {!loading && shipments.length === 0 && (
        <div className='rounded-xl border border-slate-200 bg-slate-50/50 py-16 text-center'>
          <Truck className='mx-auto h-16 w-16 text-slate-300' />
          <p className='mt-4 text-slate-600'>Không có lô nào đang chờ giao</p>
          <p className='mt-1 text-sm text-slate-500'>Các lô đã xuất kho hoặc đang vận chuyển sẽ hiển thị tại đây</p>
        </div>
      )}

      {!loading && shipments.length > 0 && (
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
                    {actionLoadingId === sh._id ? '...' : 'Đang giao'}
                  </button>
                )}
                {sh.status === 'IN_TRANSIT' && (
                  <button
                    disabled={actionLoadingId === sh._id}
                    onClick={() => updateStatus(sh, 'DELIVERED')}
                    className='flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
                  >
                    {actionLoadingId === sh._id ? '...' : 'Đã giao đến'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {detailId && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => setDetailId(null)}>
          <div className='w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Chi tiết lô giao hàng</h2>
              <button onClick={() => setDetailId(null)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
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

                <div className='flex flex-wrap gap-2 border-t border-slate-200 pt-4'>
                  {detailShipment.status === 'SHIPPED' && (
                    <button
                      disabled={actionLoadingId === detailShipment._id}
                      onClick={() => updateStatus(detailShipment, 'IN_TRANSIT')}
                      className='inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60'
                    >
                      <ArrowRight className='h-4 w-4' /> Đang vận chuyển
                    </button>
                  )}
                  {detailShipment.status === 'IN_TRANSIT' && (
                    <button
                      disabled={actionLoadingId === detailShipment._id}
                      onClick={() => updateStatus(detailShipment, 'DELIVERED')}
                      className='inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
                    >
                      <CheckCircle className='h-4 w-4' /> Xác nhận đã giao đến
                    </button>
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
