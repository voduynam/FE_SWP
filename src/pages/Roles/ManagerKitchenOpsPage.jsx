import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Factory,
  Package,
  RefreshCcw,
  Search,
} from 'lucide-react';
import { workflowService } from '../../services/workflowService';

const MR_STATUS = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const mrStatusColor = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-sky-100 text-sky-800',
  REJECTED: 'bg-red-100 text-red-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

const PRIORITY_VI = {
  URGENT: 'Khẩn cấp',
  HIGH: 'Cao',
  NORMAL: 'Thường',
  LOW: 'Thấp',
};

const MR_REASON_VI = {
  PRODUCTION_SHORTAGE: 'Thiếu khi sản xuất',
  PRODUCTION_SHORTAGE_COMPENSATION: 'Bù đơn sản xuất',
  EXPIRED_MATERIAL: 'Hết hạn',
  QUALITY_ISSUE: 'Chất lượng',
  STOCK_OUT: 'Hết kho',
  EMERGENCY: 'Khẩn cấp',
  OTHER: 'Khác',
};

const PAGE_SIZE = 10;

function getShortageItemsFromVariance(v) {
  const d = v?.data ?? v ?? {};
  const raw = d.shortage_items || d.shortageItems || [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map(it => ({
      item_id: it.item_id?._id || it.item_id || it.item?._id || it.item,
      shortage_qty: Number(it.shortage_qty ?? it.missing_qty ?? 0),
    }))
    .filter(it => it.item_id && it.shortage_qty > 0);
}

export default function ManagerKitchenOpsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('materials');

  /* —— Material requests —— */
  const [mrList, setMrList] = useState([]);
  const [mrPagination, setMrPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [mrStatusFilter, setMrStatusFilter] = useState('PENDING');
  const [mrLoading, setMrLoading] = useState(false);
  const [mrDetailId, setMrDetailId] = useState(null);
  const [mrDetail, setMrDetail] = useState(null);
  const [mrActionId, setMrActionId] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [mrSuccess, setMrSuccess] = useState('');
  const [mrSearch, setMrSearch] = useState('');

  /* —— Production compensation —— */
  const [poList, setPoList] = useState([]);
  const [poLoading, setPoLoading] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [varianceData, setVarianceData] = useState(null);
  const [checkingVar, setCheckingVar] = useState(false);
  const [compensating, setCompensating] = useState(false);
  const [items, setItems] = useState([]);
  const [poSuccess, setPoSuccess] = useState('');

  const loadMaterialRequests = async (page = 1) => {
    setMrLoading(true);
    setMrSuccess('');
    try {
      const res = await workflowService.getMaterialRequestsPaginated({
        page,
        limit: PAGE_SIZE,
        ...(mrStatusFilter !== 'ALL' ? { status: mrStatusFilter } : {}),
      });
      if (res.success && res.data) {
        const payload = res.data;
        const list = Array.isArray(payload.data) ? payload.data : [];
        setMrList(list);
        const p = payload.pagination ?? {};
        setMrPagination({
          page: p.page ?? page,
          limit: p.limit ?? PAGE_SIZE,
          total: p.total ?? 0,
          pages: p.pages ?? 1,
        });
      } else setMrList([]);
    } catch {
      setMrList([]);
    } finally {
      setMrLoading(false);
    }
  };

  const loadMrDetail = async id => {
    setMrDetailId(id);
    setMrDetail(null);
    if (!id) return;
    const res = await workflowService.getMaterialRequest(id);
    if (res.success && res.data) {
      const lines = res.data.lines ?? [];
      setMrDetail({ ...res.data, lines });
    } else {
      setMrDetail(null);
    }
  };

  useEffect(() => {
    loadMaterialRequests(1);
  }, [mrStatusFilter]);

  const handleApproveMr = async () => {
    if (!mrDetail?._id) return;
    setMrActionId(mrDetail._id);
    setMrSuccess('');
    try {
      const res = await workflowService.reviewMaterialRequest(mrDetail._id, { action: 'APPROVE' });
      if (res.success) {
        const id = mrDetail._id;
        setMrDetailId(null);
        setMrDetail(null);
        loadMaterialRequests(mrPagination.page);
        navigate(`/app/manager/inventory?mr=${encodeURIComponent(id)}`);
      } else alert(res.message || 'Duyệt thất bại');
    } catch (e) {
      alert(e?.response?.data?.message || 'Duyệt thất bại');
    } finally {
      setMrActionId(null);
    }
  };

  const handleRejectMr = async () => {
    if (!mrDetail?._id || !rejectReason.trim()) {
      alert('Nhập lý do từ chối.');
      return;
    }
    setMrActionId(mrDetail._id);
    setMrSuccess('');
    try {
      const res = await workflowService.reviewMaterialRequest(mrDetail._id, {
        action: 'REJECT',
        rejection_reason: rejectReason.trim(),
      });
      if (res.success) {
        setMrSuccess('Đã từ chối yêu cầu.');
        setRejectOpen(false);
        setRejectReason('');
        setMrDetailId(null);
        setMrDetail(null);
        loadMaterialRequests(mrPagination.page);
      } else alert(res.message || 'Từ chối thất bại');
    } catch (e) {
      alert(e?.response?.data?.message || 'Từ chối thất bại');
    } finally {
      setMrActionId(null);
    }
  };

  /* —— Production orders DONE —— */
  const loadProductionOrdersDone = async () => {
    setPoLoading(true);
    setPoSuccess('');
    try {
      const res = await workflowService.getProductionOrdersPaginated({
        page: 1,
        limit: 100,
        status: 'DONE',
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        const originals = list.filter(o => !o.is_compensating_order);
        setPoList(originals);
        if (originals.length && !selectedPoId) {
          setSelectedPoId(originals[0]._id);
        }
      } else setPoList([]);
    } catch {
      setPoList([]);
    } finally {
      setPoLoading(false);
    }
  };

  const loadItems = async () => {
    const res = await workflowService.getItems({ status: 'ACTIVE', limit: 200 });
    const itemList = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? []);
    setItems(Array.isArray(itemList) ? itemList : []);
  };

  useEffect(() => {
    if (tab === 'compensation') {
      loadProductionOrdersDone();
      loadItems();
    }
  }, [tab]);

  const selectedOrder = useMemo(
    () => poList.find(o => o._id === selectedPoId) || null,
    [poList, selectedPoId]
  );

  const runVarianceCheck = async () => {
    if (!selectedPoId) return;
    setCheckingVar(true);
    setVarianceData(null);
    setPoSuccess('');
    try {
      const res = await workflowService.getProductionVarianceCheck(selectedPoId);
      if (res.success) setVarianceData(res.data);
      else alert(res.message || 'Không kiểm tra được');
    } finally {
      setCheckingVar(false);
    }
  };

  const shortageItems = useMemo(() => getShortageItemsFromVariance(varianceData), [varianceData]);

  const handleCreateCompensate = async () => {
    if (!selectedPoId || !shortageItems.length) {
      alert('Không có dòng thiếu hụt để tạo đơn bù.');
      return;
    }
    setCompensating(true);
    setPoSuccess('');
    try {
      const res = await workflowService.compensateProductionShortage(selectedPoId, {
        shortage_items: shortageItems,
        reason: 'Manager xác nhận tạo đơn sản xuất bù thiếu hụt',
        priority: 'URGENT',
      });
      if (!res.success) {
        alert(res.message || 'Tạo đơn bù thất bại');
        return;
      }
      setPoSuccess(
        'Đã tạo lệnh sản xuất bù và (nếu thiếu nguyên liệu) hệ thống đã tạo yêu cầu nguyên liệu — Chef xử lý đơn bù như sản xuất thường rồi hoàn thành.'
      );
      setVarianceData(null);
      loadProductionOrdersDone();
      loadMaterialRequests(mrPagination.page);
    } catch (e) {
      alert(e?.response?.data?.message || 'Không tạo được đơn bù');
    } finally {
      setCompensating(false);
    }
  };

  const getItemName = id => {
    if (!id) return '—';
    const it = items.find(i => i._id === id);
    return it?.name || String(id);
  };

  const filteredMrList = useMemo(() => {
    const s = (mrSearch || '').trim().toLowerCase();
    if (!s) return mrList;
    return mrList.filter(row => {
      const no = String(row.request_no || row._id || '').toLowerCase();
      const reason = String(MR_REASON_VI[row.request_reason] || row.request_reason || '').toLowerCase();
      return no.includes(s) || reason.includes(s);
    });
  }, [mrList, mrSearch]);

  return (
    <div className='min-h-full space-y-6 animate-fade-in'>
      {mrSuccess && (
        <div className='flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>
          <span>{mrSuccess}</span>
          <button type='button' onClick={() => setMrSuccess('')} className='text-xs text-emerald-700/70 hover:text-emerald-900'>
            Đóng
          </button>
        </div>
      )}

      {/* Header */}
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Yêu cầu NL &amp; bù SX</h1>

        </div>
        <Link
          to='/app/central/production'
          className='inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50'
        >
          <Factory className='h-4 w-4 text-slate-500' />
          Trang sản xuất Chef
        </Link>
      </div>

      {/* Tabs — đồng bộ kiểu segmented */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='inline-flex rounded-xl border border-slate-200 bg-slate-50/90 p-1 shadow-sm'>
          <button
            type='button'
            onClick={() => setTab('materials')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === 'materials'
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:bg-white/70'
            }`}
          >
            <Package className='h-4 w-4' />
            Yêu cầu nguyên liệu
          </button>
          <button
            type='button'
            onClick={() => setTab('compensation')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === 'compensation'
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:bg-white/70'
            }`}
          >
            <ClipboardList className='h-4 w-4' />
            Đơn bù thiếu hụt
          </button>
        </div>
      </div>

      {tab === 'materials' && (
        <div className='space-y-4'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
            <div className='relative min-w-0 flex-1'>
              <Search className='pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400' />
              <input
                value={mrSearch}
                onChange={e => setMrSearch(e.target.value)}
                placeholder='Tìm theo mã yêu cầu, lý do...'
                className='input-field w-full min-w-0 pl-9'
              />
            </div>
            <select
              value={mrStatusFilter}
              onChange={e => setMrStatusFilter(e.target.value)}
              className='input-field w-auto min-w-[200px] max-w-[260px] shrink-0'
            >
              <option value='PENDING'>Chờ duyệt</option>
              <option value='ALL'>Tất cả trạng thái</option>
              <option value='APPROVED'>Đã duyệt</option>
              <option value='REJECTED'>Từ chối</option>
              <option value='PROCESSING'>Đang xử lý</option>
              <option value='COMPLETED'>Hoàn thành</option>
            </select>
            <button
              type='button'
              onClick={() => loadMaterialRequests(mrPagination.page)}
              disabled={mrLoading}
              className='inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50'
            >
              <RefreshCcw className={`h-4 w-4 ${mrLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>

          <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
            <table className='w-full text-sm'>
              <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
                <tr>
                  <th className='px-4 py-3'>Mã yêu cầu</th>
                  <th className='px-4 py-3'>Ngày</th>
                  <th className='px-4 py-3'>Ưu tiên</th>
                  <th className='px-4 py-3'>Lý do</th>
                  <th className='px-4 py-3'>Người gửi</th>
                  <th className='px-4 py-3'>Trạng thái</th>
                  <th className='px-4 py-3 text-right'>Thao tác</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {mrLoading && (
                  <tr>
                    <td colSpan={7} className='px-4 py-8 text-center text-slate-400'>
                      Đang tải...
                    </td>
                  </tr>
                )}
                {!mrLoading &&
                  filteredMrList.map(row => (
                    <tr key={row._id} className='hover:bg-slate-50/80'>
                      <td className='px-4 py-3 font-mono text-xs font-medium text-slate-900'>{row.request_no || row._id}</td>
                      <td className='px-4 py-3 text-slate-600'>
                        {row.request_date ? new Date(row.request_date).toLocaleString('vi-VN') : '—'}
                      </td>
                      <td className='px-4 py-3'>
                        <span className='text-slate-800'>{PRIORITY_VI[row.priority] || row.priority || '—'}</span>
                      </td>
                      <td className='px-4 py-3 text-slate-700'>{MR_REASON_VI[row.request_reason] || row.request_reason || '—'}</td>
                      <td className='px-4 py-3 text-slate-700'>
                        {row.requested_by?.full_name || row.requested_by?.username || '—'}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${mrStatusColor[row.status] || 'bg-slate-100 text-slate-700'}`}
                        >
                          {MR_STATUS[row.status] || row.status}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <button
                          type='button'
                          onClick={() => loadMrDetail(row._id)}
                          className='rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!mrLoading && filteredMrList.length === 0 && (
              <p className='py-10 text-center text-sm text-slate-400'>Không có yêu cầu phù hợp.</p>
            )}
          </div>

          {mrPagination.total > 0 && (
            <div className='flex items-center justify-between text-sm text-slate-500'>
              <p>
                Hiển thị {(mrPagination.page - 1) * mrPagination.limit + 1} -{' '}
                {Math.min(mrPagination.page * mrPagination.limit, mrPagination.total)} / {mrPagination.total}
              </p>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  disabled={mrPagination.page <= 1 || mrLoading}
                  onClick={() => loadMaterialRequests(mrPagination.page - 1)}
                  className='rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50'
                >
                  Trước
                </button>
                <span>
                  Trang {mrPagination.page} / {Math.max(1, mrPagination.pages)}
                </span>
                <button
                  type='button'
                  disabled={mrPagination.page >= Math.max(1, mrPagination.pages) || mrLoading}
                  onClick={() => loadMaterialRequests(mrPagination.page + 1)}
                  className='rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50'
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'compensation' && (
        <div className='space-y-4'>
          <div className='rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white px-4 py-3 text-sm text-indigo-950 shadow-sm'>
            <p className='font-medium text-indigo-950'>Đơn bù sau khi lệnh DONE</p>
            <p className='mt-1 text-xs leading-relaxed text-indigo-900/85'>
              Chọn lệnh sản xuất gốc đã <strong>DONE</strong> (không phải đơn bù), chạy kiểm tra chênh lệch, rồi tạo{' '}
              <strong>đơn sản xuất bù</strong>. Hệ thống thông báo Chef và tạo yêu cầu nguyên liệu nếu kho RAW không đủ.
            </p>
          </div>

          {poSuccess && (
            <div className='flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800'>
              <span>{poSuccess}</span>
              <button type='button' onClick={() => setPoSuccess('')} className='text-xs text-emerald-700/80 hover:text-emerald-900'>
                Đóng
              </button>
            </div>
          )}

          <div className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-end'>
              <div className='min-w-0 flex-1'>
                <label className='block text-sm font-medium text-slate-700'>Lệnh sản xuất (DONE)</label>
                <select
                  value={selectedPoId}
                  onChange={e => {
                    setSelectedPoId(e.target.value);
                    setVarianceData(null);
                    setPoSuccess('');
                  }}
                  className='input-field mt-1 w-full'
                >
                  <option value=''>— Chọn đơn —</option>
                  {poList.map(o => (
                    <option key={o._id} value={o._id}>
                      {o.prod_order_no || o.order_no || o._id}
                      {o.compensating_for_order_id ? ' (bù)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className='flex flex-wrap gap-2'>
                <button
                  type='button'
                  onClick={loadProductionOrdersDone}
                  disabled={poLoading}
                  className='inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50'
                >
                  {poLoading ? 'Đang tải...' : 'Tải lại danh sách'}
                </button>
                <button
                  type='button'
                  onClick={runVarianceCheck}
                  disabled={!selectedPoId || checkingVar}
                  className='inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-50'
                >
                  {checkingVar ? 'Đang kiểm tra...' : 'Kiểm tra thiếu hụt'}
                </button>
              </div>
            </div>

            {selectedOrder && (
              <p className='mt-3 text-xs text-slate-500'>
                Đang chọn:{' '}
                <span className='font-mono font-medium text-slate-700'>{selectedOrder.prod_order_no || selectedOrder._id}</span>
              </p>
            )}

            {varianceData && (
              <div className='mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm'>
                {(() => {
                  const d = varianceData?.data ?? varianceData ?? {};
                  const summary = d.summary || {};
                  const lines = Array.isArray(d.variance_analysis) ? d.variance_analysis : [];
                  return (
                    <>
                      <p className='font-semibold text-amber-950'>
                        Kết quả: {summary.lines_with_shortage ?? 0} dòng thiếu so với kế hoạch
                      </p>
                      <div className='mt-3 max-h-52 overflow-auto rounded-lg border border-amber-100/80 bg-white shadow-inner'>
                        <table className='w-full text-xs'>
                          <thead className='sticky top-0 bg-amber-50/90 text-left text-slate-600'>
                            <tr>
                              <th className='px-3 py-2 font-semibold'>Sản phẩm</th>
                              <th className='px-3 py-2 font-semibold'>Kế hoạch</th>
                              <th className='px-3 py-2 font-semibold'>Thực tế</th>
                              <th className='px-3 py-2 font-semibold'>Thiếu</th>
                            </tr>
                          </thead>
                          <tbody className='divide-y divide-amber-50'>
                            {lines
                              .filter(l => l.needs_compensation || l.shortage_qty > 0)
                              .map((l, i) => (
                                <tr key={l.line_id || i} className='hover:bg-amber-50/50'>
                                  <td className='px-3 py-2 text-slate-800'>{l.item?.name || getItemName(l.item?._id)}</td>
                                  <td className='px-3 py-2 tabular-nums text-slate-700'>{l.planned_qty}</td>
                                  <td className='px-3 py-2 tabular-nums text-slate-700'>{l.actual_qty}</td>
                                  <td className='px-3 py-2 font-semibold tabular-nums text-amber-900'>{l.shortage_qty}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      {shortageItems.length > 0 ? (
                        <button
                          type='button'
                          onClick={handleCreateCompensate}
                          disabled={compensating}
                          className='mt-4 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 sm:w-auto'
                        >
                          {compensating ? 'Đang tạo đơn bù...' : 'Tạo đơn sản xuất bù thiếu hụt'}
                        </button>
                      ) : (
                        <p className='mt-3 text-sm text-amber-900/90'>Không có thiếu hụt — không cần đơn bù.</p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {mrDetailId && mrDetail && createPortal(
        <div
          className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4'
          role='dialog'
          aria-modal='true'
          onClick={() => { setMrDetailId(null); setMrDetail(null); setRejectOpen(false); }}
        >
          <div
            className='max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-start justify-between gap-2'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>{mrDetail.request_no}</h2>
                <p className='mt-1 text-xs text-slate-500'>
                  {MR_REASON_VI[mrDetail.request_reason] || mrDetail.request_reason} ·{' '}
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${mrStatusColor[mrDetail.status] || 'bg-slate-100 text-slate-700'}`}>
                    {MR_STATUS[mrDetail.status] || mrDetail.status}
                  </span>
                </p>
              </div>
              <button
                type='button'
                onClick={() => { setMrDetailId(null); setMrDetail(null); setRejectOpen(false); }}
                className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'
                aria-label='Đóng'
              >
                ×
              </button>
            </div>
            <div className='rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-700'>
              <p className='text-slate-600'>{mrDetail.notes || '—'}</p>
              <p className='mt-2 text-xs text-slate-500'>
                Kho: {mrDetail.location_id?.name || mrDetail.location_id?.code || mrDetail.location_id || '—'}
              </p>
            </div>
            <h3 className='mt-4 text-sm font-semibold text-slate-800'>Dòng yêu cầu</h3>
            <ul className='mt-2 space-y-2'>
              {(mrDetail.lines || []).map((ln, i) => (
                <li key={ln._id || i} className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800'>
                  <span className='font-medium'>{ln.item_id?.name || ln.item_id?.sku || 'Sản phẩm'}</span>
                  <span className='text-slate-500'>
                    {' '}
                    — SL: {ln.quantity_requested} {ln.uom_id?.code || ''}
                  </span>
                </li>
              ))}
            </ul>
            {mrDetail.status === 'PENDING' && (
              <div className='mt-6 flex flex-wrap gap-2 border-t border-slate-200 pt-4'>
                <button
                  type='button'
                  onClick={handleApproveMr}
                  disabled={!!mrActionId}
                  className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50'
                >
                  Duyệt
                </button>
                <button
                  type='button'
                  onClick={() => setRejectOpen(true)}
                  disabled={!!mrActionId}
                  className='rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50'
                >
                  Từ chối
                </button>
              </div>
            )}
            {rejectOpen && (
              <div className='mt-4 rounded-xl border border-red-200 bg-red-50/80 p-3'>
                <label className='block text-xs font-medium text-red-800'>Lý do từ chối</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  className='mt-1 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm'
                />
                <div className='mt-2 flex flex-wrap gap-2'>
                  <button
                    type='button'
                    onClick={handleRejectMr}
                    disabled={!!mrActionId}
                    className='rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50'
                  >
                    Xác nhận từ chối
                  </button>
                  <button type='button' onClick={() => setRejectOpen(false)} className='rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-white/80'>
                    Hủy
                  </button>
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
