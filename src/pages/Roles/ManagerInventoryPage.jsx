import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCcw, Search, Package, ArrowUpDown, PlusCircle, History } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

const PAGE_SIZE = 15;

const TXN_TYPES = {
  RECEIPT: 'Nhập kho',
  ISSUE: 'Xuất kho',
  TRANSFER_IN: 'Nhận chuyển kho',
  TRANSFER_OUT: 'Chuyển kho',
  ADJUSTMENT: 'Điều chỉnh',
  PRODUCTION_IN: 'Sản xuất nhập',
  PRODUCTION_OUT: 'Xuất sản xuất',
  CONSUMPTION: 'Tiêu hao',
};

const ADJUSTMENT_TYPES = {
  COUNT_ADJUSTMENT: 'Điều chỉnh kiểm kê',
  DAMAGE: 'Hàng hỏng',
  EXPIRED: 'Hàng hết hạn',
  LOST: 'Hàng mất',
  OTHER: 'Khác',
};

const txnColor = {
  RECEIPT: 'text-emerald-600',
  ISSUE: 'text-red-600',
  TRANSFER_IN: 'text-blue-600',
  TRANSFER_OUT: 'text-orange-600',
  ADJUSTMENT: 'text-purple-600',
  PRODUCTION_IN: 'text-emerald-600',
  PRODUCTION_OUT: 'text-orange-600',
  CONSUMPTION: 'text-red-600',
};

const getItemName = row => {
  if (!row) return '-';
  if (typeof row === 'object') return row.name || row.sku || row._id || '-';
  return row;
};
const getLocName = row => {
  if (!row) return '-';
  if (typeof row === 'object') return row.name || row.code || row._id || '-';
  return row;
};
const getLotCode = row => {
  if (!row) return '-';
  if (typeof row === 'object') return row.lot_code || row._id || '-';
  return row;
};

export default function ManagerInventoryPage() {
  const [tab, setTab] = useState('balances');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Summary
  const [summary, setSummary] = useState(null);

  // Balances
  const [balances, setBalances] = useState([]);
  const [balPag, setBalPag] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [balSearch, setBalSearch] = useState('');

  // Transactions
  const [txns, setTxns] = useState([]);
  const [txnPag, setTxnPag] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [txnTypeFilter, setTxnTypeFilter] = useState('');
  const [txnSearch, setTxnSearch] = useState('');

  // Adjust modal
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    location_id: '', item_id: '', lot_id: '', qty_adjustment: '', reason: '', adjustment_type: 'COUNT_ADJUSTMENT',
  });
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // Lookup data
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); } }, [success]);

  /* ── Summary ── */
  const loadSummary = async () => {
    const res = await workflowService.getInventorySummary({});
    if (res.success) setSummary(res.data);
  };

  /* ── Balances ── */
  const loadBalances = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await workflowService.getInventoryBalancesPaginated({ page, limit: PAGE_SIZE });
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setBalances(list);
        const p = res.data.pagination ?? {};
        setBalPag({ page: p.page || page, limit: p.limit || PAGE_SIZE, total: p.total || list.length, pages: p.pages || 1 });
      }
    } finally { setLoading(false); }
  };

  /* ── Transactions ── */
  const loadTxns = async (page = 1) => {
    setLoading(true);
    setError('');
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

  useEffect(() => {
    loadSummary();
    loadBalances(1);
  }, []);

  useEffect(() => { if (tab === 'transactions') loadTxns(1); }, [tab, txnTypeFilter]);

  const filteredBalances = useMemo(() => {
    const s = (balSearch || '').toLowerCase();
    if (!s) return balances;
    return balances.filter(r => {
      const name = getItemName(r.item_id).toLowerCase();
      const loc = getLocName(r.location_id).toLowerCase();
      return name.includes(s) || loc.includes(s);
    });
  }, [balances, balSearch]);

  const filteredTxns = useMemo(() => {
    const s = (txnSearch || '').toLowerCase();
    if (!s) return txns;
    return txns.filter(t => {
      const name = getItemName(t.item_id).toLowerCase();
      const loc = getLocName(t.location_id).toLowerCase();
      const notes = (t.notes || '').toLowerCase();
      return name.includes(s) || loc.includes(s) || notes.includes(s);
    });
  }, [txns, txnSearch]);

  /* ── Adjust ── */
  useEffect(() => {
    if (!adjustOpen) return;
    setAdjustError('');
    setAdjustForm({ location_id: '', item_id: '', lot_id: '', qty_adjustment: '', reason: '', adjustment_type: 'COUNT_ADJUSTMENT' });
    const load = async () => {
      const [locRes, itemRes] = await Promise.all([
        workflowService.getLocations({ limit: 200 }),
        workflowService.getItems({ limit: 500 }),
      ]);
      if (locRes.success) {
        const l = Array.isArray(locRes.data) ? locRes.data : Array.isArray(locRes.data?.data) ? locRes.data.data : [];
        setLocations(l);
      }
      if (itemRes.success) {
        const i = Array.isArray(itemRes.data) ? itemRes.data : Array.isArray(itemRes.data?.data) ? itemRes.data.data : [];
        setItems(i);
      }
    };
    load();
  }, [adjustOpen]);

  const submitAdjust = async e => {
    e.preventDefault();
    setAdjusting(true);
    setAdjustError('');
    const qty = Number(adjustForm.qty_adjustment);
    if (!adjustForm.location_id || !adjustForm.item_id || !qty) {
      setAdjustError('Vui lòng chọn vị trí, sản phẩm và nhập số lượng.');
      setAdjusting(false);
      return;
    }
    const selectedItem = items.find(i => i._id === adjustForm.item_id);
    const uom_id = selectedItem?.base_uom_id?._id || selectedItem?.base_uom_id || selectedItem?.uom_id;
    const payload = {
      location_id: adjustForm.location_id,
      item_id: adjustForm.item_id,
      qty_adjustment: qty,
      uom_id: uom_id || undefined,
      reason: adjustForm.reason || '',
      adjustment_type: adjustForm.adjustment_type,
    };
    if (adjustForm.lot_id) payload.lot_id = adjustForm.lot_id;
    const res = await workflowService.adjustInventory(payload);
    setAdjusting(false);
    if (res.success) {
      setSuccess('Điều chỉnh tồn kho thành công.');
      setAdjustOpen(false);
      loadBalances(balPag.page);
      loadSummary();
    } else {
      setAdjustError(res.message || 'Điều chỉnh thất bại');
    }
  };

  const tabs = [
    { key: 'balances', label: 'Tồn kho', icon: Package },
    { key: 'transactions', label: 'Lịch sử giao dịch', icon: History },
  ];

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Tồn kho hệ thống</h1>
          <p className='text-sm text-slate-500'>Quản lý tồn kho, giao dịch và điều chỉnh</p>
        </div>
        <div className='flex gap-2'>
          <button onClick={() => setAdjustOpen(true)} className='inline-flex items-center gap-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700'>
            <PlusCircle className='h-4 w-4' /> Điều chỉnh
          </button>
          <button onClick={() => { loadSummary(); if (tab === 'balances') loadBalances(balPag.page); else loadTxns(txnPag.page); }} className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50'>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      {success && <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>{success}</div>}
      {error && <p className='text-sm text-red-600'>{error}</p>}

      {/* Summary cards */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <div className='rounded-xl border border-slate-200 bg-white p-4'>
          <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>Tổng giá trị</p>
          <p className='mt-1 text-xl font-bold text-slate-900'>{summary?.total_value != null ? Number(summary.total_value).toLocaleString('vi-VN') + ' ₫' : '-'}</p>
        </div>
        <div className='rounded-xl border border-slate-200 bg-white p-4'>
          <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>Tổng sản phẩm</p>
          <p className='mt-1 text-xl font-bold text-slate-900'>{summary?.total_items ?? '-'}</p>
        </div>
        <div className='rounded-xl border border-slate-200 bg-white p-4'>
          <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>Số vị trí</p>
          <p className='mt-1 text-xl font-bold text-slate-900'>{summary?.locations ? Object.keys(summary.locations).length : '-'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className='flex gap-1 rounded-lg border border-slate-200 bg-slate-100/50 p-1'>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon className='h-4 w-4' /> {t.label}
          </button>
        ))}
      </div>

      {/* === Balances Tab === */}
      {tab === 'balances' && (
        <div className='space-y-3'>
          <div className='relative'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
            <input value={balSearch} onChange={e => setBalSearch(e.target.value)} placeholder='Tìm theo sản phẩm / vị trí...' className='w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-orange-300 focus:ring-1 focus:ring-orange-300' />
          </div>

          <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
            <table className='w-full text-sm'>
              <thead className='border-b border-slate-200 bg-slate-50/80 text-left'>
                <tr>
                  <th className='px-4 py-3 font-medium text-slate-600'>Sản phẩm</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Vị trí</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Lô</th>
                  <th className='px-4 py-3 font-medium text-slate-600 text-right'>Tồn kho</th>
                  <th className='px-4 py-3 font-medium text-slate-600 text-right'>Đặt trước</th>
                  <th className='px-4 py-3 font-medium text-slate-600 text-right'>Khả dụng</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {loading && <tr><td colSpan={6} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td></tr>}
                {!loading && !filteredBalances.length && <tr><td colSpan={6} className='px-4 py-6 text-center text-slate-400'>Không có dữ liệu</td></tr>}
                {!loading && filteredBalances.map((r, idx) => (
                  <tr key={r._id || idx} className='hover:bg-slate-50/50'>
                    <td className='px-4 py-3 font-medium text-slate-900'>{getItemName(r.item_id)}</td>
                    <td className='px-4 py-3 text-slate-700'>{getLocName(r.location_id)}</td>
                    <td className='px-4 py-3 text-slate-500 text-xs'>{getLotCode(r.lot_id)}</td>
                    <td className='px-4 py-3 text-right font-medium'>{r.qty_on_hand ?? 0}</td>
                    <td className='px-4 py-3 text-right text-slate-500'>{r.qty_reserved ?? 0}</td>
                    <td className='px-4 py-3 text-right font-semibold text-emerald-600'>{r.qty_available ?? ((r.qty_on_hand ?? 0) - (r.qty_reserved ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {balPag.pages > 1 && (
            <div className='flex items-center justify-between text-sm text-slate-500'>
              <span>Trang {balPag.page}/{balPag.pages} ({balPag.total} bản ghi)</span>
              <div className='flex gap-1'>
                <button disabled={balPag.page <= 1} onClick={() => loadBalances(balPag.page - 1)} className='rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40'>Trước</button>
                <button disabled={balPag.page >= balPag.pages} onClick={() => loadBalances(balPag.page + 1)} className='rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40'>Sau</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === Transactions Tab === */}
      {tab === 'transactions' && (
        <div className='space-y-3'>
          <div className='flex flex-col gap-3 sm:flex-row'>
            <div className='relative flex-1'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
              <input value={txnSearch} onChange={e => setTxnSearch(e.target.value)} placeholder='Tìm theo sản phẩm / vị trí / ghi chú...' className='w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-orange-300 focus:ring-1 focus:ring-orange-300' />
            </div>
            <select value={txnTypeFilter} onChange={e => setTxnTypeFilter(e.target.value)} className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm min-w-[180px]'>
              <option value=''>Tất cả loại giao dịch</option>
              {Object.entries(TXN_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
            <table className='w-full text-sm'>
              <thead className='border-b border-slate-200 bg-slate-50/80 text-left'>
                <tr>
                  <th className='px-4 py-3 font-medium text-slate-600'>Thời gian</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Loại GD</th>
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
                    <td className='px-4 py-3'>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${txnColor[t.txn_type] || 'text-slate-600'}`}>
                        <ArrowUpDown className='h-3 w-3' /> {TXN_TYPES[t.txn_type] || t.txn_type}
                      </span>
                    </td>
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

      {/* === Adjust Modal === */}
      {adjustOpen && createPortal(
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40' onClick={() => setAdjustOpen(false)}>
          <div className='w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl' onClick={e => e.stopPropagation()}>
            <h2 className='text-lg font-semibold text-slate-900'>Điều chỉnh tồn kho</h2>
            {adjustError && <p className='mt-2 text-sm text-red-600'>{adjustError}</p>}
            <form onSubmit={submitAdjust} className='mt-4 space-y-3'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Vị trí kho *</label>
                  <select value={adjustForm.location_id} onChange={e => setAdjustForm(f => ({ ...f, location_id: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'>
                    <option value=''>-- Chọn vị trí --</option>
                    {locations.map(l => <option key={l._id} value={l._id}>{l.name || l.code || l._id}</option>)}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Sản phẩm *</label>
                  <select value={adjustForm.item_id} onChange={e => setAdjustForm(f => ({ ...f, item_id: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'>
                    <option value=''>-- Chọn sản phẩm --</option>
                    {items.map(i => <option key={i._id} value={i._id}>{i.name || i.sku || i._id}</option>)}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Loại điều chỉnh *</label>
                  <select value={adjustForm.adjustment_type} onChange={e => setAdjustForm(f => ({ ...f, adjustment_type: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'>
                    {Object.entries(ADJUSTMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Số lượng điều chỉnh *</label>
                  <input type='number' value={adjustForm.qty_adjustment} onChange={e => setAdjustForm(f => ({ ...f, qty_adjustment: e.target.value }))} placeholder='VD: -5 hoặc 10' className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' />
                  <p className='mt-0.5 text-xs text-slate-400'>Âm = giảm, Dương = tăng</p>
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700'>Lý do</label>
                <textarea value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} rows={2} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm' placeholder='Mô tả lý do điều chỉnh...' />
              </div>
              <div className='flex justify-end gap-2 border-t border-slate-200 pt-3'>
                <button type='button' onClick={() => setAdjustOpen(false)} className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'>Hủy</button>
                <button type='submit' disabled={adjusting} className='rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-60'>
                  {adjusting ? 'Đang xử lý...' : 'Xác nhận điều chỉnh'}
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
