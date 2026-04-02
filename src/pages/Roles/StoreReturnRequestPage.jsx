import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Plus, RefreshCcw, Search } from 'lucide-react';
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

const PAGE_SIZE = 10;

// Đơn vị tính dạng “rời” (đếm được) → SL trả là số nguyên
// Các UOM còn lại (KG, L, v.v.) cho phép nhập thập phân
const DISCRETE_UOMS = ['PACK', 'UNIT', 'CARTON'];

function getList(res) {
  if (!res?.success) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
}

export default function StoreReturnRequestPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingReceiptIdRef = useRef(null);
  const prefillFromDamageRef = useRef(false);

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

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Create form
  const [receipts, setReceipts] = useState([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [receiptDetail, setReceiptDetail] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [returnLines, setReturnLines] = useState([]);
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidencePreviewUrls, setEvidencePreviewUrls] = useState([]);

  useEffect(() => {
    const urls = (evidenceFiles || []).map(f => URL.createObjectURL(f));
    setEvidencePreviewUrls(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [evidenceFiles]);

  /* Mở form tạo trả hàng từ Đơn hàng (nhận hàng hư → query ?create=1&goodsReceiptId=&fromDamage=1) */
  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    const gr = searchParams.get('goodsReceiptId');
    const fd = searchParams.get('fromDamage') === '1';
    if (gr) pendingReceiptIdRef.current = gr;
    if (fd) prefillFromDamageRef.current = true;
    setCreateOpen(true);
    setSearchParams(prev => {
      const n = new URLSearchParams(prev);
      n.delete('create');
      n.delete('goodsReceiptId');
      n.delete('fromDamage');
      return n;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

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
        const list = Array.isArray(res.data.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
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
    if (!id) return;
    const res = await workflowService.getReturnRequest(id);
    if (res.success && res.data) {
      const data = res.data;
      const lines = Array.isArray(data.lines) ? data.lines
        : Array.isArray(data.return_lines) ? data.return_lines
        : [];
      setDetailReturn({ ...data, lines });
    } else {
      setDetailError(res.message || 'Không tìm thấy yêu cầu trả hàng');
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    loadReturns(pagination.page);
  };

  /* ─── Filter ─── */
  const filteredReturns = useMemo(() => {
    const s = (search || '').toLowerCase();
    return returns.filter(r => {
      const no = r.return_no || r._id || '';
      return !s || no.toLowerCase().includes(s);
    });
  }, [returns, search]);

  /* ─── Create: load goods receipts (deduplicated) ─── */
  useEffect(() => {
    if (!createOpen) return;
    setCreateError('');
    setSelectedReceiptId('');
    setReceiptDetail(null);
    setReturnLines([]);
    setReason('');
    setEvidenceFiles([]);
    const load = async () => {
      const res = await workflowService.getGoodsReceipts({ status: 'RECEIVED', limit: 100 });
      const raw = getList(res);
      const unique = [...new Map(raw.map(r => [r._id, r])).values()];

      const rrRes = await workflowService.getReturnRequests({ limit: 200 });
      const allReturns = getList(rrRes);
      const activeStatuses = ['PENDING', 'APPROVED', 'PROCESSING'];
      const receiptHasActive = new Set(
        allReturns
          .filter(rr => activeStatuses.includes(rr.status))
          .map(rr => rr.goods_receipt_id?._id || rr.goods_receipt_id || '')
          .filter(Boolean)
      );

      setReceipts(unique.map(r => ({ ...r, _hasActiveReturn: receiptHasActive.has(r._id) })));
    };
    load();
  }, [createOpen]);

  /* Chọn phiếu nhận khi vừa điều hướng từ màn Nhận hàng (hàng hư) */
  useEffect(() => {
    if (!createOpen || receipts.length === 0 || !pendingReceiptIdRef.current) return;
    const id = pendingReceiptIdRef.current;
    const exists = receipts.some(r => r._id === id);
    if (exists) {
      setSelectedReceiptId(id);
      pendingReceiptIdRef.current = null;
    } else {
      setCreateError(
        'Không thấy phiếu nhận trong danh sách (có thể cần làm mới trang). Chọn phiếu thủ công trong danh sách.'
      );
      pendingReceiptIdRef.current = null;
    }
  }, [createOpen, receipts]);

  /* ─── When receipt selected → load detail + items + store_org_unit_id from shipment ─── */
  useEffect(() => {
    if (!selectedReceiptId) {
      setReceiptDetail(null);
      setReturnLines([]);
      return;
    }
    let cancelled = false;
    setReceiptLoading(true);
    workflowService.getGoodsReceipt(selectedReceiptId).then(async res => {
      if (cancelled) return;
      if (!res.success || !res.data) {
        setReceiptLoading(false);
        setReceiptDetail(null);
        setReturnLines([]);
        return;
      }
      const receipt = res.data;
      setReceiptDetail(receipt);

      // Lấy lot_id từ shipment (trùng với lúc confirm goods receipt) để process return tìm đúng tồn kho
      const shipmentId = receipt.shipment_id?._id || receipt.shipment_id;
      const shipmentLineToLot = {};
      if (shipmentId) {
        const shipRes = await workflowService.getShipment(shipmentId);
        if (!cancelled && shipRes.success && shipRes.data?.lines) {
          for (const sl of shipRes.data.lines) {
            const slId = sl._id;
            const firstLot = Array.isArray(sl.lots) && sl.lots[0];
            const lotId = firstLot?.lot_id?._id || firstLot?.lot_id || null;
            if (slId) shipmentLineToLot[slId] = lotId;
          }
        }
      }

      const itemIds = [...new Set((receipt.lines || []).map(l => l.item_id?._id || l.item_id).filter(Boolean))];
      let itemMap = {};
      if (itemIds.length) {
        const itemRes = await workflowService.getItems({ limit: 100 });
        const allItems = Array.isArray(itemRes?.data) ? itemRes.data : (itemRes?.data?.data ?? []);
        allItems.forEach(it => { itemMap[it._id] = it; });
      }

      const defaultDefect = prefillFromDamageRef.current ? 'DAMAGED' : 'OTHER';
      if (prefillFromDamageRef.current) prefillFromDamageRef.current = false;

      const lines = (receipt.lines || []).map(l => {
        const itemId = l.item_id?._id || l.item_id;
        const item = itemMap[itemId] || l.item_id || {};
        const uomId = l.uom_id?._id || l.uom_id || item.base_uom_id?._id || item.base_uom_id || '';
        const shipmentLineId = l.shipment_line_id?._id || l.shipment_line_id;
        const lotId = shipmentLineToLot[shipmentLineId] || l.lot_id?._id || l.lot_id || '';
        return {
          source_receipt_line_id: l._id,
          item_id: itemId,
          item_name: item.name || item.sku || l.item_id?.name || l.item_id?.sku || itemId || '-',
          uom_id: uomId,
          uom_name: item.base_uom_id?.code || item.base_uom_id?.name || l.uom_id?.code || '',
          lot_id: lotId,
          lot_code: l.lot_id?.lot_code || '',
          qty_received: l.qty_received || 0,
          qty_return: 0,
          defect_type: defaultDefect,
          disposition: 'RESTOCK',
          notes: '',
        };
      });
      if (!cancelled) setReturnLines(lines);
      setReceiptLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedReceiptId]);

  /* ─── Line changes ─── */
  const handleLineChange = (idx, field, value) => {
    setReturnLines(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: field === 'qty_return' ? (Number(value) || 0) : value };
      return next;
    });
  };

  /* ─── Submit ─── */
  const submitCreate = async e => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const linesToSend = returnLines
        .filter(l => l.qty_return > 0)
        .map(l => ({
          item_id: l.item_id,
          uom_id: l.uom_id,
          qty_return: l.qty_return,
          ...(l.lot_id ? { lot_id: l.lot_id } : {}),
          defect_type: l.defect_type || 'OTHER',
          disposition: l.disposition || 'RESTOCK',
          reason: (l.notes || '').trim(),
        }));

      if (!linesToSend.length) {
        setCreateError('Vui lòng nhập số lượng trả > 0 cho ít nhất 1 sản phẩm.');
        setCreating(false);
        return;
      }

      const overLine = returnLines.find(l => l.qty_return > l.qty_received);
      if (overLine) {
        setCreateError(`Số lượng trả "${overLine.item_name}" (${overLine.qty_return}) vượt quá số lượng đã nhận (${overLine.qty_received}).`);
        setCreating(false);
        return;
      }

      const missingUom = linesToSend.find(l => !l.uom_id);
      if (missingUom) {
        setCreateError('Một số sản phẩm thiếu đơn vị tính. Vui lòng kiểm tra dữ liệu phiếu nhận hàng.');
        setCreating(false);
        return;
      }

      if (evidenceFiles.length === 0) {
        setCreateError('Vui lòng tải lên ít nhất 1 ảnh/video bằng chứng.');
        setCreating(false);
        return;
      }

      const formData = new FormData();
      formData.append('goods_receipt_id', selectedReceiptId);
      formData.append('return_date', returnDate || new Date().toISOString());
      formData.append('reason', reason || '');
      formData.append('lines', JSON.stringify(linesToSend));
      evidenceFiles.forEach(file => {
        if (file instanceof File) {
          formData.append('evidence_photos', file);
        }
      });
      const res = await workflowService.createReturnRequest(formData);
      if (!res.success) {
        setCreateError(res.message || 'Tạo yêu cầu trả hàng thất bại');
        setCreating(false);
        return;
      }
      setCreateOpen(false);
      setSuccess('Đã tạo yêu cầu trả hàng (PENDING). Vui lòng chờ phê duyệt.');
      await loadReturns(1);
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'Có lỗi khi tạo yêu cầu');
    } finally {
      setCreating(false);
    }
  };

  const getItemName = obj => {
    if (!obj) return '-';
    if (typeof obj === 'object') return obj.name || obj.sku || obj._id;
    return obj;
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
          <h1 className='text-2xl font-bold text-slate-900'>Trả hàng</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Tạo yêu cầu trả hàng kèm ảnh/video bằng chứng. Manager phê duyệt sẽ tạo đơn bù miễn phí; sau đó Manager xử lý hoàn thành để trừ tồn kho cửa hàng.
          </p>
        </div>
        <div className='flex gap-2'>
          <button onClick={() => setCreateOpen(true)} className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'>
            <Plus className='h-4 w-4' /> Tạo yêu cầu trả hàng
          </button>
          <button onClick={() => loadReturns(1)} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Tìm theo số yêu cầu...' className='input-field w-full pl-9' />
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
              <th className='px-4 py-3'>Phiếu nhận hàng</th>
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
              <tr key={r._id}>
                <td className='px-4 py-3 font-medium text-slate-900'>{r.return_no || r._id}</td>
                <td className='px-4 py-3 text-slate-700'>{r.goods_receipt_id?.receipt_no || r.source_receipt_id?.receipt_no || '-'}</td>
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
          <div className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
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
                    <span className='text-slate-500'>Phiếu nhận hàng:</span>
                    <span className='font-medium'>{detailReturn.goods_receipt_id?.receipt_no || detailReturn.source_receipt_id?.receipt_no || '-'}</span>
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
                    {detailReturn.resolution_notes && (
                      <>
                        <span className='text-slate-500'>Ghi chú xử lý:</span>
                        <span>{detailReturn.resolution_notes}</span>
                      </>
                    )}
                    {detailReturn.rejection_reason && (
                      <>
                        <span className='text-slate-500'>Lý do từ chối:</span>
                        <span className='text-red-700'>{detailReturn.rejection_reason}</span>
                      </>
                    )}
                    {detailReturn.replacement_order_id && (
                      <>
                        <span className='text-slate-500'>Đơn bù (miễn phí):</span>
                        <span className='font-medium text-emerald-800'>
                          {typeof detailReturn.replacement_order_id === 'object'
                            ? `${detailReturn.replacement_order_id.order_no || detailReturn.replacement_order_id._id} — ${detailReturn.replacement_order_id.status || ''}`
                            : String(detailReturn.replacement_order_id)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {Array.isArray(detailReturn.evidence_photos) && detailReturn.evidence_photos.length > 0 && (
                  <div className='rounded-lg border border-amber-200 bg-amber-50/60 p-3'>
                    <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800'>Bằng chứng đã gửi</h3>
                    <div className='flex flex-wrap gap-2'>
                      {detailReturn.evidence_photos.map((f, idx) => {
                        const raw =
                          typeof f === 'string'
                            ? f
                            : f?.photo_url || f?.url || f?.secure_url || '';
                        const url = resolvePhotoUrl(raw);
                        if (!url) return null;
                        return (
                          <a
                            key={idx}
                            href={url}
                            target='_blank'
                            rel='noreferrer'
                            className='block overflow-hidden rounded-lg border border-amber-300 bg-white'
                          >
                            <img
                              src={url}
                              alt=''
                              className='h-20 w-20 object-cover'
                              onError={e => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className='rounded-lg border border-slate-200 bg-white p-3'>
                  <h3 className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>Quy trình trả hàng</h3>
                  <ol className='space-y-1 text-sm'>
                    <li className={detailReturn.status ? 'text-slate-700' : 'text-slate-400'}>1. Tạo yêu cầu (PENDING) — Chọn phiếu nhận, sản phẩm, số lượng, lý do</li>
                    <li className={['APPROVED', 'PROCESSING', 'COMPLETED'].includes(detailReturn.status) ? 'text-slate-700' : 'text-slate-400'}>2. Phê duyệt (APPROVED) — Manager tạo đơn bù miễn phí</li>
                    <li className={detailReturn.status === 'COMPLETED' ? 'text-slate-700' : 'text-slate-400'}>3. Xử lý & hoàn thành (COMPLETED) — Trừ tồn kho cửa hàng</li>
                  </ol>
                </div>

                <div>
                  <h3 className='mb-2 text-sm font-medium text-slate-700'>Chi tiết sản phẩm trả</h3>
                  <table className='w-full text-sm'>
                    <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                      <tr>
                        <th className='px-3 py-2'>Sản phẩm</th>
                        <th className='px-3 py-2'>Số lượng</th>
                        <th className='px-3 py-2'>Loại lỗi</th>
                        <th className='px-3 py-2'>Xử lý</th>
                        <th className='px-3 py-2'>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {(detailReturn.lines || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className='px-3 py-6 text-center text-sm text-slate-400'>
                            Không có dữ liệu chi tiết sản phẩm trả.
                          </td>
                        </tr>
                      )}
                      {(detailReturn.lines || []).map((line, idx) => (
                        <tr key={line._id || idx}>
                          <td className='px-3 py-2'>{getItemName(line.item_id)}</td>
                          <td className='px-3 py-2'>{line.qty_return ?? line.qty_requested ?? 0}</td>
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
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ─── Create Modal ─── */}
      {createOpen && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => !creating && setCreateOpen(false)}>
          <div className='w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Tạo yêu cầu trả hàng</h2>
              <button onClick={() => !creating && setCreateOpen(false)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {createError && <p className='mb-3 text-sm text-red-600'>{createError}</p>}

            <form onSubmit={submitCreate} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700'>Chọn phiếu nhận hàng (đã nhận)</label>
                <select
                  value={selectedReceiptId}
                  onChange={e => setSelectedReceiptId(e.target.value)}
                  className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
                  required
                >
                  <option value=''>-- Chọn phiếu nhận hàng --</option>
                  {receipts.filter(r => !r._hasActiveReturn).map(r => (
                    <option key={r._id} value={r._id}>
                      {r.receipt_no || r._id} — {r.received_date ? new Date(r.received_date).toLocaleDateString('vi-VN') : ''}
                    </option>
                  ))}
                </select>
                {receipts.length > 0 && receipts.every(r => r._hasActiveReturn) && (
                  <p className='mt-1 text-xs text-amber-600'>Tất cả phiếu nhận hàng đã có yêu cầu trả đang xử lý.</p>
                )}
              </div>

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Ngày yêu cầu trả</label>
                  <input type='date' value={returnDate} onChange={e => setReturnDate(e.target.value)} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Lý do chung</label>
                  <input type='text' value={reason} onChange={e => setReason(e.target.value)} placeholder='VD: Hàng bị hư hỏng trong quá trình vận chuyển' className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' />
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700'>Bằng chứng (ảnh — bắt buộc)</label>
                <label
                  className={`mt-1 flex cursor-pointer flex-col gap-1 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs ${evidenceFiles.length >= 5 ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <span className='font-medium text-slate-800'>
                    {evidenceFiles.length >= 5
                      ? 'Đã đủ 5 ảnh'
                      : evidenceFiles.length
                        ? `Đã chọn ${evidenceFiles.length}/5 — bấm để thêm`
                        : 'Chọn ảnh (JPEG/PNG/WebP/GIF, tối đa 5, có thể chọn lần lượt)'}
                  </span>
                  <input
                    type='file'
                    multiple
                    accept='image/jpeg,image/png,image/gif,image/webp'
                    disabled={evidenceFiles.length >= 5}
                    onChange={e => {
                      const picked = Array.from(e.target.files || []);
                      e.target.value = '';
                      if (!picked.length) return;
                      setEvidenceFiles(prev => {
                        const room = 5 - prev.length;
                        if (room <= 0) return prev;
                        return [...prev, ...picked.slice(0, room)];
                      });
                    }}
                    className='text-sm file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1'
                  />
                </label>
                <p className='mt-1 text-xs text-slate-500'>
                  Server chỉ nhận định dạng ảnh cho bằng chứng trả hàng. Có thể chọn nhiều lần để thêm từng ảnh.
                </p>
                {evidencePreviewUrls.length > 0 && (
                  <div className='mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5'>
                    {evidenceFiles.map((file, i) => {
                      const url = evidencePreviewUrls[i];
                      if (!url) return null;
                      return (
                        <div key={`${file.name}-${i}`} className='relative overflow-hidden rounded border border-slate-200'>
                          <button
                            type='button'
                            onClick={() => setEvidenceFiles(prev => prev.filter((_, j) => j !== i))}
                            className='absolute right-0.5 top-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-[10px] text-white hover:bg-red-600'
                            aria-label='Xóa'
                          >
                            ×
                          </button>
                          <img src={url} alt='' className='h-20 w-full object-cover' />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {receiptLoading && <p className='text-sm text-slate-500'>Đang tải chi tiết phiếu nhận...</p>}

              {receiptDetail && returnLines.length > 0 && !receiptLoading && (
                <div className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                  <div className='text-sm font-medium text-slate-700'>
                    Chọn sản phẩm cần trả và nhập số lượng, loại lỗi
                  </div>
                  <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                      <thead className='text-left text-xs text-slate-500'>
                        <tr>
                          <th className='px-2 py-2'>Sản phẩm</th>
                          <th className='px-2 py-2'>Đã nhận</th>
                          <th className='px-2 py-2'>SL trả</th>
                          <th className='px-2 py-2'>Loại lỗi</th>
                          <th className='px-2 py-2'>Xử lý</th>
                          <th className='px-2 py-2'>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-slate-100 bg-white'>
                        {returnLines.map((line, idx) => (
                          <tr key={idx}>
                            <td className='px-2 py-2 font-medium text-slate-800'>
                              {line.item_name}
                              {line.lot_code && <span className='ml-1 text-xs text-slate-400'>(Lô: {line.lot_code})</span>}
                            </td>
                            <td className='px-2 py-2 text-slate-600'>{line.qty_received}</td>
                            <td className='px-2 py-2'>
                              {/*
                                Nếu đơn vị tính là PACK/UNIT/CARTON → bước nhảy 1
                                Ngược lại (KG, L, ...) → cho phép thập phân (0.01)
                              */}
                              <input
                                type='number'
                                min={0}
                                max={line.qty_received}
                                step={DISCRETE_UOMS.includes((line.uom_name || '').toUpperCase()) ? 1 : 0.01}
                                value={line.qty_return}
                                onChange={e => handleLineChange(idx, 'qty_return', e.target.value)}
                                className='w-20 rounded border border-slate-200 px-2 py-1 text-sm'
                              />
                            </td>
                            <td className='px-2 py-2'>
                              <select
                                value={line.defect_type}
                                onChange={e => handleLineChange(idx, 'defect_type', e.target.value)}
                                className='rounded border border-slate-200 px-2 py-1 text-sm'
                              >
                                {Object.entries(DEFECT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                            </td>
                            <td className='px-2 py-2'>
                              <select
                                value={line.disposition}
                                onChange={e => handleLineChange(idx, 'disposition', e.target.value)}
                                className='rounded border border-slate-200 px-2 py-1 text-sm'
                              >
                                {Object.entries(DISPOSITION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                            </td>
                            <td className='px-2 py-2'>
                              <input
                                type='text'
                                value={line.notes}
                                onChange={e => handleLineChange(idx, 'notes', e.target.value)}
                                placeholder='Ghi chú...'
                                className='w-full min-w-[120px] rounded border border-slate-200 px-2 py-1 text-sm'
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                <button type='button' disabled={creating} onClick={() => setCreateOpen(false)} className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'>Hủy</button>
                <button
                  type='submit'
                  disabled={creating || !selectedReceiptId || receiptLoading || returnLines.length === 0}
                  className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60'
                >
                  {creating ? 'Đang tạo...' : 'Gửi yêu cầu trả hàng'}
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
