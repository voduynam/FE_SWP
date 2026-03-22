import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCcw, Search, Layers, History, AlertTriangle, Plus, ArrowUpDown } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

const PAGE_SIZE = 15;

const TXN_TYPES = {
  RECEIPT: 'Nhập kho', ISSUE: 'Xuất kho', TRANSFER_IN: 'Nhận chuyển kho',
  TRANSFER_OUT: 'Chuyển kho', ADJUSTMENT: 'Điều chỉnh', PRODUCTION_IN: 'Sản xuất nhập',
  PRODUCTION_OUT: 'Xuất sản xuất', CONSUMPTION: 'Tiêu hao',
};
const txnColor = {
  RECEIPT: 'text-emerald-600', ISSUE: 'text-red-600', TRANSFER_IN: 'text-blue-600',
  TRANSFER_OUT: 'text-orange-600', ADJUSTMENT: 'text-purple-600', PRODUCTION_IN: 'text-emerald-600',
  PRODUCTION_OUT: 'text-orange-600', CONSUMPTION: 'text-red-600',
};
const severityColor = { EXPIRED: 'bg-red-100 text-red-700', CRITICAL: 'bg-orange-100 text-orange-700', HIGH: 'bg-amber-100 text-amber-700', MEDIUM: 'bg-sky-100 text-sky-700' };
const severityLabel = { EXPIRED: 'Hết hạn', CRITICAL: '< 3 ngày', HIGH: '3-7 ngày', MEDIUM: '7-14 ngày' };

const getItemName = v => { if (!v) return '-'; if (typeof v === 'object') return v.name || v.sku || v._id || '-'; return v; };
const getLocName = v => { if (!v) return '-'; if (typeof v === 'object') return v.name || v.code || v._id || '-'; return v; };
const getLotCode = v => { if (!v) return '-'; if (typeof v === 'object') return v.lot_code || v._id || '-'; return v; };

/** Trạng thái lô theo HSD — chỉ FE, khớp badge trong bảng */
function getLotStatusKey(lot) {
  if (!lot?.exp_date) return 'NO_EXPIRY';
  const exp = new Date(lot.exp_date);
  const now = new Date();
  if (exp < now) return 'EXPIRED';
  const daysLeft = Math.ceil((exp - now) / 86400000);
  if (daysLeft <= 7) return 'EXPIRING_SOON';
  return 'OK';
}

function getLotStatusBadge(lot) {
  const key = getLotStatusKey(lot);
  if (key === 'NO_EXPIRY') {
    return <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'>Chưa có HSD</span>;
  }
  if (key === 'EXPIRED') {
    return <span className='rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'>Hết hạn</span>;
  }
  const daysLeft = lot.exp_date ? Math.ceil((new Date(lot.exp_date) - new Date()) / 86400000) : null;
  if (key === 'EXPIRING_SOON' && daysLeft != null) {
    return <span className='rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700'>Còn {daysLeft} ngày</span>;
  }
  return <span className='rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'>Bình thường</span>;
}

export default function CentralMaterialsPage() {
  const [tab, setTab] = useState('lots');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Lots
  const [lots, setLots] = useState([]);
  const [lotPag, setLotPag] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [lotSearch, setLotSearch] = useState('');
  const [lotStatusFilter, setLotStatusFilter] = useState('');
  const [lotInventoryMap, setLotInventoryMap] = useState({});

  // Expiring
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [expiryDays, setExpiryDays] = useState(7);

  // Transactions
  const [txns, setTxns] = useState([]);
  const [txnPag, setTxnPag] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [txnTypeFilter, setTxnTypeFilter] = useState('');
  const [txnSearch, setTxnSearch] = useState('');

  // Create/Edit lot modal
  const [lotModalOpen, setLotModalOpen] = useState(false);
  const [editingLot, setEditingLot] = useState(null);
  const [lotForm, setLotForm] = useState({ item_id: '', lot_code: '', mfg_date: '', exp_date: '' });
  const [lotSaving, setLotSaving] = useState(false);
  const [lotModalError, setLotModalError] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); } }, [success]);

  /* ── Lots ── */
  const loadLots = async (page = 1) => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: PAGE_SIZE };
      if (lotSearch) params.lot_code = lotSearch;
      const res = await workflowService.getLots(params);
      if (res.success) {
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setLots(list);
        const p = raw?.pagination ?? {};
        setLotPag({ page: p.page || page, limit: p.limit || PAGE_SIZE, total: p.total || list.length, pages: p.pages || 1 });

        // FE-only: lấy tồn kho hệ thống cho từng lô để Chef xem nhanh
        try {
          const lotIds = list.map(l => l._id).filter(Boolean);
          if (lotIds.length) {
            const invMap = {};
            for (const lotId of lotIds) {
              const invRes = await workflowService.getInventoryBalances({ lot_id: lotId });
              if (invRes.success && invRes.data) {
                const rows = Array.isArray(invRes.data.data)
                  ? invRes.data.data
                  : Array.isArray(invRes.data)
                  ? invRes.data
                  : [];
                const totalQty = rows.reduce((sum, r) => sum + (r.qty_on_hand ?? 0), 0);
                invMap[lotId] = totalQty;
              }
            }
            setLotInventoryMap(invMap);
          } else {
            setLotInventoryMap({});
          }
        } catch {
          // Không chặn UI nếu load tồn kho lỗi
          setLotInventoryMap({});
        }
      }
    } finally { setLoading(false); }
  };

  /* ── Expiry alerts ── */
  const loadExpiry = async () => {
    const res = await workflowService.getExpiringLots({ days: expiryDays });
    if (res.success) {
      const raw = res.data;
      const lotsList = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      const now = new Date();
      const mapped = lotsList.map(lot => {
        const expDate = lot.exp_date ? new Date(lot.exp_date) : null;
        const daysUntilExpiry = expDate ? Math.ceil((expDate - now) / 86400000) : null;
        let severity = 'MEDIUM';
        if (daysUntilExpiry != null) {
          if (daysUntilExpiry < 0) severity = 'EXPIRED';
          else if (daysUntilExpiry <= 2) severity = 'CRITICAL';
          else if (daysUntilExpiry <= 5) severity = 'HIGH';
        }
        return {
          _id: lot._id,
          item: lot.item_id,
          item_id: lot.item_id,
          lot: lot,
          lot_id: lot._id,
          exp_date: lot.exp_date,
          days_until_expiry: daysUntilExpiry,
          severity,
          qty_on_hand: lot.qty_on_hand ?? '-',
        };
      });
      setExpiryAlerts(mapped);
    }
  };

  /* ── Transactions ── */
  const loadTxns = async (page = 1) => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: PAGE_SIZE };
      if (txnTypeFilter) params.txn_type = txnTypeFilter;
      const res = await workflowService.getInventoryTransactions(params);
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setTxns(list);
        const p = res.data.pagination ?? {};
        setTxnPag({ page: p.page || page, limit: p.limit || PAGE_SIZE, total: p.total || list.length, pages: p.pages || 1 });
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadLots(1); loadExpiry(); }, []);
  useEffect(() => { if (tab === 'transactions') loadTxns(1); }, [tab, txnTypeFilter]);
  useEffect(() => { if (tab === 'expiring') loadExpiry(); }, [expiryDays]);

  const searchFilteredLots = useMemo(() => {
    const s = (lotSearch || '').toLowerCase();
    if (!s) return lots;
    return lots.filter(l => (l.lot_code || '').toLowerCase().includes(s) || getItemName(l.item_id).toLowerCase().includes(s));
  }, [lots, lotSearch]);

  const lotStatusCounts = useMemo(() => {
    const c = { EXPIRED: 0, EXPIRING_SOON: 0, OK: 0, NO_EXPIRY: 0 };
    searchFilteredLots.forEach(l => {
      const k = getLotStatusKey(l);
      if (c[k] !== undefined) c[k] += 1;
    });
    return c;
  }, [searchFilteredLots]);

  const filteredLots = useMemo(() => {
    if (!lotStatusFilter) return searchFilteredLots;
    return searchFilteredLots.filter(l => getLotStatusKey(l) === lotStatusFilter);
  }, [searchFilteredLots, lotStatusFilter]);

  const filteredTxns = useMemo(() => {
    const s = (txnSearch || '').toLowerCase();
    if (!s) return txns;
    return txns.filter(t => getItemName(t.item_id).toLowerCase().includes(s) || (t.notes || '').toLowerCase().includes(s));
  }, [txns, txnSearch]);

  /* ── Lot create/edit ── */
  const openCreateLot = () => {
    setEditingLot(null);
    setLotForm({ item_id: '', lot_code: '', mfg_date: new Date().toISOString().slice(0, 10), exp_date: '' });
    setLotModalError('');
    setLotModalOpen(true);
  };
  const openEditLot = lot => {
    setEditingLot(lot);
    setLotForm({
      item_id: typeof lot.item_id === 'object' ? lot.item_id._id : lot.item_id,
      lot_code: lot.lot_code || '',
      mfg_date: lot.mfg_date ? new Date(lot.mfg_date).toISOString().slice(0, 10) : '',
      exp_date: lot.exp_date ? new Date(lot.exp_date).toISOString().slice(0, 10) : '',
    });
    setLotModalError('');
    setLotModalOpen(true);
  };

  useEffect(() => {
    if (!lotModalOpen) return;
    workflowService.getItems({ limit: 500 }).then(res => {
      if (res.success) {
        const i = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
        setItems(i);
      }
    });
  }, [lotModalOpen]);

  const submitLot = async e => {
    e.preventDefault();
    setLotSaving(true); setLotModalError('');
    if (!lotForm.item_id || !lotForm.lot_code) {
      setLotModalError('Vui lòng chọn sản phẩm và nhập mã lô.');
      setLotSaving(false); return;
    }
    const payload = {
      item_id: lotForm.item_id,
      lot_code: lotForm.lot_code,
      mfg_date: lotForm.mfg_date || undefined,
      exp_date: lotForm.exp_date || undefined,
    };
    const res = editingLot
      ? await workflowService.updateLot(editingLot._id, payload)
      : await workflowService.createLot(payload);
    setLotSaving(false);
    if (res.success) {
      setSuccess(editingLot ? 'Cập nhật lô thành công.' : 'Tạo lô thành công.');
      setLotModalOpen(false);
      loadLots(lotPag.page);
    } else {
      setLotModalError(res.message || 'Thao tác thất bại');
    }
  };

  const handleRefresh = () => {
    if (tab === 'lots') loadLots(lotPag.page);
    else if (tab === 'expiring') loadExpiry();
    else loadTxns(txnPag.page);
  };

  const tabs = [
    { key: 'lots', label: 'Lô hàng', icon: Layers },
    { key: 'expiring', label: 'Sắp hết hạn', icon: AlertTriangle },
    { key: 'transactions', label: 'Lịch sử GD', icon: History },
  ];

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Nguyên liệu & lô sản xuất</h1>
          <p className='text-sm text-slate-500'>Quản lý lô hàng, theo dõi hết hạn và lịch sử giao dịch</p>
        </div>
        <div className='flex gap-2'>
          <button onClick={openCreateLot} className='inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700'>
            <Plus className='h-4 w-4' /> Tạo lô
          </button>
          <button onClick={handleRefresh} className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50'>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      {success && <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>{success}</div>}
      {error && <p className='text-sm text-red-600'>{error}</p>}

      {/* Tabs */}
      <div className='flex gap-1 rounded-lg border border-slate-200 bg-slate-100/50 p-1'>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon className='h-4 w-4' /> {t.label}
            {t.key === 'expiring' && expiryAlerts.length > 0 && (
              <span className='rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-600'>{expiryAlerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* === Lots === */}
      {tab === 'lots' && (
        <div className='space-y-3'>
          <div className='relative'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
            <input value={lotSearch} onChange={e => setLotSearch(e.target.value)} placeholder='Tìm theo mã lô / sản phẩm...' className='w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm' />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-xs font-medium text-slate-500'>Lọc theo trạng thái lô:</span>
            {[
              { key: '', label: 'Tất cả', count: searchFilteredLots.length, active: 'border-slate-300 bg-slate-900 text-white' },
              { key: 'EXPIRED', label: 'Hết hạn', count: lotStatusCounts.EXPIRED, active: 'border-red-300 bg-red-600 text-white' },
              { key: 'EXPIRING_SOON', label: 'Sắp hết hạn (≤7 ngày)', count: lotStatusCounts.EXPIRING_SOON, active: 'border-amber-300 bg-amber-600 text-white' },
              { key: 'OK', label: 'Bình thường', count: lotStatusCounts.OK, active: 'border-emerald-300 bg-emerald-600 text-white' },
              { key: 'NO_EXPIRY', label: 'Chưa có HSD', count: lotStatusCounts.NO_EXPIRY, active: 'border-slate-400 bg-slate-600 text-white' },
            ].map(opt => (
              <button
                key={opt.key || 'all'}
                type='button'
                onClick={() => setLotStatusFilter(opt.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  lotStatusFilter === opt.key ? opt.active : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
                <span className={`rounded-full px-1.5 py-0 text-[10px] font-semibold ${lotStatusFilter === opt.key ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                  {opt.count}
                </span>
              </button>
            ))}
          </div>
          <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
            <table className='w-full text-sm'>
              <thead className='border-b border-slate-200 bg-slate-50/80 text-left'>
                <tr>
                  <th className='px-4 py-3 font-medium text-slate-600'>Mã lô</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Sản phẩm</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Ngày SX</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Hạn SD</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Tồn kho (hệ thống)</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Trạng thái</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Thao tác</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {loading && <tr><td colSpan={7} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td></tr>}
                {!loading && !filteredLots.length && (
                  <tr>
                    <td colSpan={7} className='px-4 py-6 text-center text-slate-400'>
                      {!lots.length
                        ? 'Không có lô hàng nào.'
                        : !searchFilteredLots.length
                          ? 'Không có lô khớp tìm kiếm.'
                          : lotStatusFilter
                            ? 'Không có lô nào ở trạng thái đã chọn trên trang hiện tại.'
                            : 'Không có lô hàng nào.'}
                    </td>
                  </tr>
                )}
                {!loading && filteredLots.map((lot, idx) => (
                    <tr key={lot._id || idx} className='hover:bg-slate-50/50'>
                      <td className='px-4 py-3 font-mono text-sm font-medium text-slate-900'>{lot.lot_code || '-'}</td>
                      <td className='px-4 py-3 text-slate-700'>{getItemName(lot.item_id)}</td>
                      <td className='px-4 py-3 text-slate-500'>{lot.mfg_date ? new Date(lot.mfg_date).toLocaleDateString('vi-VN') : '-'}</td>
                      <td className='px-4 py-3 text-slate-500'>{lot.exp_date ? new Date(lot.exp_date).toLocaleDateString('vi-VN') : '-'}</td>
                      <td className='px-4 py-3 text-slate-900'>
                        {lotInventoryMap[lot._id] != null
                          ? `${lotInventoryMap[lot._id].toLocaleString('vi-VN')} ${typeof lot.item_id === 'object' ? (lot.item_id.base_uom_id?.code || '') : ''}`
                          : <span className='text-xs text-slate-400'>Chưa có dữ liệu</span>}
                      </td>
                      <td className='px-4 py-3'>
                        {getLotStatusBadge(lot)}
                      </td>
                      <td className='px-4 py-3'>
                        <button onClick={() => openEditLot(lot)} className='text-xs text-blue-600 hover:underline'>Sửa</button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lotPag.pages > 1 && (
            <div className='flex items-center justify-between text-sm text-slate-500'>
              <span>Trang {lotPag.page}/{lotPag.pages} ({lotPag.total} lô)</span>
              <div className='flex gap-1'>
                <button disabled={lotPag.page <= 1} onClick={() => loadLots(lotPag.page - 1)} className='rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40'>Trước</button>
                <button disabled={lotPag.page >= lotPag.pages} onClick={() => loadLots(lotPag.page + 1)} className='rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40'>Sau</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === Expiring === */}
      {tab === 'expiring' && (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <label className='text-sm text-slate-600'>Hết hạn trong:</label>
            <select value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))} className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'>
              <option value={3}>3 ngày</option>
              <option value={7}>7 ngày</option>
              <option value={14}>14 ngày</option>
              <option value={30}>30 ngày</option>
            </select>
          </div>
          <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
            <table className='w-full text-sm'>
              <thead className='border-b border-slate-200 bg-slate-50/80 text-left'>
                <tr>
                  <th className='px-4 py-3 font-medium text-slate-600'>Sản phẩm</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Mã lô</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>HSD</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Còn lại</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Mức độ</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {!expiryAlerts.length && <tr><td colSpan={5} className='px-4 py-6 text-center text-slate-400'>Không có lô nào sắp hết hạn.</td></tr>}
                {expiryAlerts.map((r, idx) => (
                  <tr key={r._id || idx} className='hover:bg-slate-50/50'>
                    <td className='px-4 py-3 font-medium text-slate-900'>{r.item?.name || getItemName(r.item_id)}</td>
                    <td className='px-4 py-3 font-mono text-xs text-slate-500'>{r.lot?.lot_code || getLotCode(r.lot_id) || '-'}</td>
                    <td className='px-4 py-3 text-slate-500'>{r.exp_date ? new Date(r.exp_date).toLocaleDateString('vi-VN') : '-'}</td>
                    <td className='px-4 py-3 text-slate-700'>{r.days_until_expiry != null ? `${r.days_until_expiry} ngày` : '-'}</td>
                    <td className='px-4 py-3'>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColor[r.severity] || 'bg-slate-100 text-slate-600'}`}>
                        {severityLabel[r.severity] || r.severity || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === Transactions === */}
      {tab === 'transactions' && (
        <div className='space-y-3'>
          <div className='flex flex-col gap-3 sm:flex-row'>
            <div className='relative flex-1'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
              <input value={txnSearch} onChange={e => setTxnSearch(e.target.value)} placeholder='Tìm theo sản phẩm / ghi chú...' className='w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm' />
            </div>
            <select value={txnTypeFilter} onChange={e => setTxnTypeFilter(e.target.value)} className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm min-w-[180px]'>
              <option value=''>Tất cả loại GD</option>
              {Object.entries(TXN_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
            <table className='w-full text-sm'>
              <thead className='border-b border-slate-200 bg-slate-50/80 text-left'>
                <tr>
                  <th className='px-4 py-3 font-medium text-slate-600'>Thời gian</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Loại</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Sản phẩm</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Vị trí</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Lô</th>
                  <th className='px-4 py-3 font-medium text-slate-600 text-right'>Số lượng</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Ghi chú</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {loading && <tr><td colSpan={7} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td></tr>}
                {!loading && !filteredTxns.length && <tr><td colSpan={7} className='px-4 py-6 text-center text-slate-400'>Không có giao dịch nào.</td></tr>}
                {!loading && filteredTxns.map((t, idx) => (
                  <tr key={t._id || idx} className='hover:bg-slate-50/50'>
                    <td className='px-4 py-3 text-slate-500 whitespace-nowrap'>{t.txn_time ? new Date(t.txn_time).toLocaleString('vi-VN') : '-'}</td>
                    <td className='px-4 py-3'><span className={`text-xs font-medium ${txnColor[t.txn_type] || 'text-slate-600'}`}><ArrowUpDown className='mr-1 inline h-3 w-3' />{TXN_TYPES[t.txn_type] || t.txn_type}</span></td>
                    <td className='px-4 py-3 font-medium text-slate-900'>{getItemName(t.item_id)}</td>
                    <td className='px-4 py-3 text-slate-700'>{getLocName(t.location_id)}</td>
                    <td className='px-4 py-3 text-slate-500 text-xs'>{getLotCode(t.lot_id)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${(t.qty ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{(t.qty ?? 0) >= 0 ? '+' : ''}{t.qty ?? 0}</td>
                    <td className='px-4 py-3 text-slate-500 max-w-[200px] truncate'>{t.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {txnPag.pages > 1 && (
            <div className='flex items-center justify-between text-sm text-slate-500'>
              <span>Trang {txnPag.page}/{txnPag.pages} ({txnPag.total} giao dịch)</span>
              <div className='flex gap-1'>
                <button disabled={txnPag.page <= 1} onClick={() => loadTxns(txnPag.page - 1)} className='rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40'>Trước</button>
                <button disabled={txnPag.page >= txnPag.pages} onClick={() => loadTxns(txnPag.page + 1)} className='rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40'>Sau</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === Create/Edit Lot Modal === */}
      {lotModalOpen && createPortal(
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40' onClick={() => setLotModalOpen(false)}>
          <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
            <h2 className='text-lg font-semibold text-slate-900'>{editingLot ? 'Cập nhật lô hàng' : 'Tạo lô hàng mới'}</h2>
            {lotModalError && <p className='mt-2 text-sm text-red-600'>{lotModalError}</p>}
            <form onSubmit={submitLot} className='mt-4 space-y-3'>
              <div>
                <label className='block text-sm font-medium text-slate-700'>Sản phẩm *</label>
                <select value={lotForm.item_id} onChange={e => setLotForm(f => ({ ...f, item_id: e.target.value }))} disabled={!!editingLot} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50'>
                  <option value=''>-- Chọn sản phẩm --</option>
                  {items.map(i => <option key={i._id} value={i._id}>{i.name || i.sku || i._id}</option>)}
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700'>Mã lô *</label>
                <input value={lotForm.lot_code} onChange={e => setLotForm(f => ({ ...f, lot_code: e.target.value }))} placeholder='VD: L-FLOUR-20260307-01' className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' />
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Ngày sản xuất</label>
                  <input type='date' value={lotForm.mfg_date} onChange={e => setLotForm(f => ({ ...f, mfg_date: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Hạn sử dụng</label>
                  <input type='date' value={lotForm.exp_date} onChange={e => setLotForm(f => ({ ...f, exp_date: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' />
                </div>
              </div>
              <div className='flex justify-end gap-2 border-t border-slate-200 pt-3'>
                <button type='button' onClick={() => setLotModalOpen(false)} className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'>Hủy</button>
                <button type='submit' disabled={lotSaving} className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60'>
                  {lotSaving ? 'Đang lưu...' : editingLot ? 'Cập nhật' : 'Tạo lô'}
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
