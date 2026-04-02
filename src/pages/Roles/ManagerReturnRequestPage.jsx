import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { RefreshCcw, Search } from 'lucide-react';
import { workflowService } from '../../services/workflowService';
import { resolvePhotoUrl } from '../../utils/photoHelpers';

const RETURN_STATUS = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const statusColor = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

const DEFECT_TYPES = {
  DAMAGED: 'Hư hỏng',
  EXPIRED: 'Hết hạn',
  WRONG_ITEM: 'Sai sản phẩm',
  QUALITY_ISSUE: 'Vấn đề chất lượng',
  OTHER: 'Khác',
};

const DISPOSITION_TYPES = {
  RESTOCK: 'Nhập lại kho',
  DESTROY: 'Hủy bỏ',
  RETURN_TO_SUPPLIER: 'Trả nhà cung cấp',
};

const ORDER_STATUS_VI = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã gửi',
  APPROVED: 'Đã duyệt',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đã giao',
  RECEIVED: 'Đã nhận',
  CANCELLED: 'Đã hủy',
};

const PAGE_SIZE = 10;

const normalizeEvidenceUrl = evidence => {
  if (!evidence) return '';
  if (typeof evidence === 'string') return resolvePhotoUrl(evidence);
  if (typeof evidence === 'object') {
    const raw =
      evidence.photo_url ||
      evidence.url ||
      evidence.secure_url ||
      evidence.path ||
      evidence.file_path ||
      evidence.image_url ||
      '';
    return resolvePhotoUrl(raw);
  }
  return '';
};

export default function ManagerReturnRequestPage() {
  const [returns, setReturns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState('');

  // Detail
  const [detailId, setDetailId] = useState(null);
  const [detailReturn, setDetailReturn] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [replacementOrderInfo, setReplacementOrderInfo] = useState(null);

  // Reject modal
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  /* ─── Load list ─── */
  const loadReturns = async (page = 1) => {
    setLoading(true);
    setSuccess('');
    try {
      const res = await workflowService.getReturnRequestsPaginated({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setReturns(list);
        const p = res.data.pagination ?? {};
        setPagination({ page: p.page ?? page, limit: p.limit ?? PAGE_SIZE, total: p.total ?? 0, pages: p.pages ?? 1 });
      } else {
        setReturns([]);
      }
    } catch {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReturns(1); }, [statusFilter]);

  /* ─── Detail ─── */
  const loadDetail = async id => {
    setDetailId(id);
    setDetailReturn(null);
    setDetailError(null);
    setReplacementOrderInfo(null);
    setRejectOpen(false);
    setRejectNotes('');
    if (!id) return;
    const res = await workflowService.getReturnRequest(id);
    if (res.success && res.data) {
      const data = res.data;
      const lines = Array.isArray(data.lines) ? data.lines
        : Array.isArray(data.return_lines) ? data.return_lines
        : [];
      setDetailReturn({ ...data, lines });
      const replacementId = typeof data.replacement_order_id === 'object'
        ? data.replacement_order_id?._id
        : data.replacement_order_id;
      if (replacementId) {
        const orderRes = await workflowService.getInternalOrder(replacementId);
        if (orderRes.success && orderRes.data) {
          setReplacementOrderInfo(orderRes.data);
        }
      }
    } else {
      setDetailError(res.message || 'Không tìm thấy yêu cầu trả hàng');
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    loadReturns(pagination.page);
  };

  /* ─── Status actions ─── */
  const handleApprove = async ret => {
    setActionLoadingId(ret._id);
    setSuccess('');
    try {
      const res = await workflowService.reviewReturnRequest(ret._id, { action: 'APPROVE' });
      if (res.success) {
        setSuccess(`Đã chấp nhận yêu cầu ${ret.return_no || ret._id}. Đơn bù đã vào hàng đợi sản xuất (nếu tạo thành công).`);
        await loadDetail(ret._id);
        loadReturns(pagination.page);
      } else alert(res.message || 'Phê duyệt thất bại');
    } catch (err) {
      alert(err?.response?.data?.message || 'Phê duyệt thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async ret => {
    if (!rejectNotes.trim()) { alert('Vui lòng nhập lý do từ chối.'); return; }
    setActionLoadingId(ret._id);
    setSuccess('');
    try {
      const res = await workflowService.reviewReturnRequest(ret._id, {
        action: 'REJECT',
        rejection_reason: rejectNotes,
      });
      if (res.success) {
        setSuccess(`Đã từ chối yêu cầu ${ret.return_no || ret._id}.`);
        setRejectOpen(false);
        setRejectNotes('');
        await loadDetail(ret._id);
        loadReturns(pagination.page);
      } else alert(res.message || 'Từ chối thất bại');
    } catch (err) {
      alert(err?.response?.data?.message || 'Từ chối thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async ret => {
    setActionLoadingId(ret._id);
    setSuccess('');
    try {
      const res = await workflowService.updateReturnRequestStatus(ret._id, { status: 'CANCELLED' });
      if (res.success) {
        setSuccess(`Đã hủy yêu cầu ${ret.return_no || ret._id}.`);
        await loadDetail(ret._id);
        loadReturns(pagination.page);
      } else alert(res.message || 'Hủy thất bại');
    } catch (err) {
      alert(err?.response?.data?.message || 'Hủy thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  /* ─── Filter ─── */
  const filteredReturns = useMemo(() => {
    const s = (search || '').toLowerCase();
    return returns.filter(r => {
      const no = r.return_no || r._id || '';
      const store = r.store_org_unit_id?.name || '';
      return !s || no.toLowerCase().includes(s) || store.toLowerCase().includes(s);
    });
  }, [returns, search]);

  const getItemName = obj => {
    if (!obj) return '-';
    if (typeof obj === 'object') return obj.name || obj.sku || obj._id;
    return obj;
  };

  const pendingCount = returns.filter(r => r.status === 'PENDING').length;

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
          <h1 className='text-2xl font-bold text-slate-900'>Xử lý trả hàng</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Xem bằng chứng và hàng trả từ cửa hàng. <strong className='font-medium text-slate-700'>Chấp nhận</strong> nếu đồng ý — hệ thống tạo đơn nội bộ bù (miễn phí), đơn vào hàng đợi sản xuất và xử lý như đơn hàng bếp thường.
            {' '}<strong className='font-medium text-slate-700'>Từ chối</strong> nếu không chấp nhận trả. Sau khi chấp nhận và hàng đã về cửa hàng, dùng bước xử lý để trừ tồn theo lô trả.
            {pendingCount > 0 && (
              <span className='ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700'>
                {pendingCount} chờ duyệt
              </span>
            )}
          </p>
        </div>
        <button onClick={() => loadReturns(1)} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
          <RefreshCcw className='h-4 w-4' /> Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Tìm theo số yêu cầu / tên cửa hàng...' className='input-field w-full pl-9' />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className='input-field min-w-[180px]'>
          <option value='ALL'>Tất cả trạng thái</option>
          {Object.entries(RETURN_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Số yêu cầu</th>
              <th className='px-4 py-3'>Cửa hàng</th>
              <th className='px-4 py-3'>Ngày yêu cầu</th>
              <th className='px-4 py-3'>Trạng thái</th>
              <th className='px-4 py-3'>Lý do</th>
              <th className='px-4 py-3 text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && <tr><td colSpan={6} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td></tr>}
            {!loading && !filteredReturns.length && <tr><td colSpan={6} className='px-4 py-6 text-center text-slate-400'>Chưa có yêu cầu trả hàng nào.</td></tr>}
            {!loading && filteredReturns.map(r => (
              <tr key={r._id} className={r.status === 'PENDING' ? 'bg-amber-50/40' : ''}>
                <td className='px-4 py-3 font-medium text-slate-900'>{r.return_no || r._id}</td>
                <td className='px-4 py-3 text-slate-700'>{r.store_org_unit_id?.name || '-'}</td>
                <td className='px-4 py-3 text-slate-700'>{r.return_date ? new Date(r.return_date).toLocaleDateString('vi-VN') : r.request_date ? new Date(r.request_date).toLocaleDateString('vi-VN') : '-'}</td>
                <td className='px-4 py-3'>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[r.status] || 'bg-slate-100 text-slate-700'}`}>
                    {RETURN_STATUS[r.status] || r.status}
                  </span>
                </td>
                <td className='px-4 py-3 text-slate-700 max-w-[200px] truncate'>{r.reason || '-'}</td>
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
            <button type='button' onClick={() => loadReturns(pagination.page - 1)} disabled={pagination.page <= 1} className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'>Trước</button>
            <span>Trang {pagination.page} / {Math.max(1, pagination.pages)}</span>
            <button type='button' onClick={() => loadReturns(pagination.page + 1)} disabled={pagination.page >= Math.max(1, pagination.pages)} className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'>Sau</button>
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {detailId && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={closeDetail}>
          <div className='w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Chi tiết yêu cầu trả hàng</h2>
              <button onClick={closeDetail} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {!detailReturn && !detailError && <p className='text-sm text-slate-500'>Đang tải...</p>}
            {detailError && <p className='text-sm text-red-600'>{detailError}</p>}
            {detailReturn && (
              <div className='space-y-4'>
                <div className='rounded-lg border border-slate-200 bg-slate-50/50 p-3'>
                  <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-sm'>
                    <span className='text-slate-500'>Số yêu cầu:</span>
                    <span className='font-medium'>{detailReturn.return_no || detailReturn._id}</span>
                    <span className='text-slate-500'>Cửa hàng:</span>
                    <span className='font-medium'>{detailReturn.store_org_unit_id?.name || '-'}</span>
                    <span className='text-slate-500'>Phiếu nhận hàng:</span>
                    <span>{detailReturn.goods_receipt_id?.receipt_no || detailReturn.source_receipt_id?.receipt_no || '-'}</span>
                    <span className='text-slate-500'>Ngày yêu cầu:</span>
                    <span>{detailReturn.return_date ? new Date(detailReturn.return_date).toLocaleDateString('vi-VN') : '-'}</span>
                    <span className='text-slate-500'>Trạng thái:</span>
                    <span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[detailReturn.status] || 'bg-slate-100 text-slate-700'}`}>
                        {RETURN_STATUS[detailReturn.status] || detailReturn.status}
                      </span>
                    </span>
                    <span className='text-slate-500'>Lý do:</span>
                    <span>{detailReturn.reason || '-'}</span>
                    {detailReturn.replacement_order_id && (
                      <>
                        <span className='text-slate-500'>Đơn bù / sản xuất (miễn phí):</span>
                        <span className='font-medium text-emerald-800'>
                          {typeof detailReturn.replacement_order_id === 'object'
                            ? `${detailReturn.replacement_order_id.order_no || detailReturn.replacement_order_id._id} — ${detailReturn.replacement_order_id.status || ''}`
                            : String(detailReturn.replacement_order_id)}
                        </span>
                      </>
                    )}
                    {detailReturn.resolution_notes && (
                      <>
                        <span className='text-slate-500'>Ghi chú xử lý:</span>
                        <span className='text-red-600'>{detailReturn.resolution_notes}</span>
                      </>
                    )}
                  </div>
                </div>

                {Array.isArray(detailReturn.evidence_photos) && detailReturn.evidence_photos.length > 0 && (
                  <div className='rounded-lg border border-amber-200 bg-amber-50/60 p-3'>
                    <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800'>Bằng chứng từ cửa hàng</h3>
                    <div className='flex flex-wrap gap-2'>
                      {detailReturn.evidence_photos.map((f, idx) => {
                        const url = normalizeEvidenceUrl(f);
                        if (!url) return null;
                        return (
                          <a
                            key={idx}
                            href={url}
                            target='_blank'
                            rel='noreferrer'
                            className='block overflow-hidden rounded-lg border border-amber-300 bg-white shadow-sm'
                          >
                            <img
                              src={url}
                              alt={`Bằng chứng ${idx + 1}`}
                              className='h-24 w-24 object-cover'
                              onError={e => {
                                e.target.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                            <span className='hidden px-2 py-1 text-xs font-medium text-amber-700'>
                              Xem ảnh {idx + 1}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {detailReturn.status === 'PENDING' && (
                  <div className='rounded-lg border border-sky-200 bg-sky-50/80 p-3 text-sm text-sky-900'>
                    <p className='font-medium'>Chấp nhận hoặc từ chối</p>
                    <p className='mt-1 text-xs leading-relaxed'>
                      <strong>Chấp nhận</strong> — đồng ý trả hàng: tạo đơn nội bộ bù, đơn xuất hiện ở{' '}
                      <Link to='/app/central/orders' className='font-medium underline'>
                        Đơn hàng bếp
                      </Link>{' '}
                      và được sản xuất / chuẩn bị như mọi đơn khác. <strong>Từ chối</strong> — không chấp nhận yêu cầu (nhập lý do). Sau khi chấp nhận và hàng bù đã giao về cửa hàng, dùng <strong>Xử lý &amp; hoàn thành</strong> để trừ tồn kho cửa hàng theo lô trả.
                    </p>
                  </div>
                )}

                {detailReturn.status === 'APPROVED' && detailReturn.replacement_order_id && (
                  <div className='rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-900'>
                    <p className='font-medium'>Đơn đã vào sản xuất</p>
                    <p className='mt-1 text-xs leading-relaxed'>
                      Yêu cầu đã được chấp nhận; đơn bù được xử lý trên bếp như đơn thường. Theo dõi tiến độ tại{' '}
                      <Link to='/app/central/orders' className='font-medium underline'>
                        Đơn hàng bếp
                      </Link>
                      .
                    </p>
                    {replacementOrderInfo?.status && (
                      <p className='mt-2 rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-xs text-emerald-900'>
                        Trạng thái đơn bù hiện tại:{' '}
                        <strong>{ORDER_STATUS_VI[replacementOrderInfo.status] || replacementOrderInfo.status}</strong>
                        {replacementOrderInfo.status === 'RECEIVED' && ' (Cửa hàng đã nhận hàng bù)'}
                      </p>
                    )}
                  </div>
                )}

                {/* Lines */}
                <div>
                  <h3 className='mb-2 text-sm font-medium text-slate-700'>Chi tiết sản phẩm trả</h3>
                  <table className='w-full text-sm'>
                    <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                      <tr>
                        <th className='px-3 py-2'>Sản phẩm</th>
                        <th className='px-3 py-2'>Số lượng trả</th>
                        <th className='px-3 py-2'>ĐVT</th>
                        <th className='px-3 py-2'>Loại lỗi</th>
                        <th className='px-3 py-2'>Xử lý</th>
                        <th className='px-3 py-2'>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {(detailReturn.lines || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className='px-3 py-6 text-center text-sm text-slate-400'>
                            Không có dữ liệu chi tiết sản phẩm trả.
                          </td>
                        </tr>
                      )}
                      {(detailReturn.lines || []).map((line, idx) => (
                        <tr key={line._id || idx}>
                          <td className='px-3 py-2'>{getItemName(line.item_id)}</td>
                          <td className='px-3 py-2 font-medium'>{line.qty_return ?? line.qty_requested ?? 0}</td>
                          <td className='px-3 py-2'>{line.uom_id?.code || line.uom_id?.name || '-'}</td>
                          <td className='px-3 py-2'>
                            <span className='inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-xs'>
                              {DEFECT_TYPES[line.defect_type] || line.defect_type || '-'}
                            </span>
                          </td>
                          <td className='px-3 py-2'>
                            <span className='inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-xs'>
                              {DISPOSITION_TYPES[line.disposition] || line.disposition || 'Nhập lại kho'}
                            </span>
                          </td>
                          <td className='px-3 py-2 text-slate-600'>{line.notes || line.reason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action buttons */}
                <div className='flex flex-wrap gap-2 border-t border-slate-200 pt-4'>
                  {detailReturn.status === 'PENDING' && (
                    <>
                      <button
                        disabled={actionLoadingId === detailReturn._id}
                        onClick={() => handleApprove(detailReturn)}
                        className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60'
                        title='Chấp nhận trả hàng và tạo đơn bù vào hàng đợi sản xuất (miễn phí)'
                      >
                        {actionLoadingId === detailReturn._id ? 'Đang xử lý...' : 'Chấp nhận & tạo đơn sản xuất bù'}
                      </button>
                      <button
                        disabled={actionLoadingId === detailReturn._id}
                        onClick={() => setRejectOpen(true)}
                        className='rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50'
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                  {['PENDING', 'APPROVED'].includes(detailReturn.status) && (
                    <button
                      disabled={actionLoadingId === detailReturn._id}
                      onClick={() => handleCancel(detailReturn)}
                      className='rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50'
                    >
                      Hủy yêu cầu
                    </button>
                  )}
                </div>

                {/* Reject form */}
                {rejectOpen && (
                  <div className='rounded-lg border border-red-200 bg-red-50 p-3'>
                    <label className='block text-sm font-medium text-red-700 mb-1'>Lý do từ chối</label>
                    <textarea
                      value={rejectNotes}
                      onChange={e => setRejectNotes(e.target.value)}
                      rows={2}
                      className='w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm'
                      placeholder='Nhập lý do từ chối...'
                    />
                    <div className='mt-2 flex gap-2'>
                      <button
                        disabled={actionLoadingId === detailReturn._id}
                        onClick={() => handleReject(detailReturn)}
                        className='rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60'
                      >
                        {actionLoadingId === detailReturn._id ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                      </button>
                      <button onClick={() => { setRejectOpen(false); setRejectNotes(''); }} className='rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600'>Đóng</button>
                    </div>
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
