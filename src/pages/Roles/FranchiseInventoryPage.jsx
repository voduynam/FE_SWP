import { useEffect, useState, useMemo } from 'react';
import { RefreshCcw, Search, Package, History, AlertTriangle, ArrowUpDown } from 'lucide-react';
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
const getAlertItemName = r => r?.item?.name || r?.item_name || getItemName(r?.item_id) || '-';

export default function FranchiseInventoryPage() {
  const [tab, setTab] = useState('balances');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Balances
  const [balances, setBalances] = useState([]);
  const [balPag, setBalPag] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [balSearch, setBalSearch] = useState('');

  // Transactions
  const [txns, setTxns] = useState([]);
  const [txnPag, setTxnPag] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [txnTypeFilter, setTxnTypeFilter] = useState('');
  const [txnSearch, setTxnSearch] = useState('');

  // Alerts
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);

  const loadBalances = async (page = 1) => {
    setLoading(true); setError('');
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

  const loadAlerts = async () => {
    const [lowRes, expRes] = await Promise.all([
      workflowService.getAlertsLowStock({}),
      workflowService.getAlertsExpiry({ days_threshold: 14 }),
    ]);
    if (lowRes.success) {
      const list = Array.isArray(lowRes.data) ? lowRes.data : Array.isArray(lowRes.data?.alerts) ? lowRes.data.alerts : [];
      setLowStockAlerts(list);
    }
    if (expRes.success) {
      const list = Array.isArray(expRes.data) ? expRes.data : Array.isArray(expRes.data?.alerts) ? expRes.data.alerts : [];
      setExpiryAlerts(list);
    }
  };

  useEffect(() => { loadBalances(1); loadAlerts(); }, []);
  useEffect(() => { if (tab === 'transactions') loadTxns(1); }, [tab, txnTypeFilter]);

  const filteredBalances = useMemo(() => {
    const s = (balSearch || '').toLowerCase();
    if (!s) return balances;
    return balances.filter(r => getItemName(r.item_id).toLowerCase().includes(s) || getLocName(r.location_id).toLowerCase().includes(s));
  }, [balances, balSearch]);

  const filteredTxns = useMemo(() => {
    const s = (txnSearch || '').toLowerCase();
    if (!s) return txns;
    return txns.filter(t => getItemName(t.item_id).toLowerCase().includes(s) || getLocName(t.location_id).toLowerCase().includes(s) || (t.notes || '').toLowerCase().includes(s));
  }, [txns, txnSearch]);

  const handleRefresh = () => {
    if (tab === 'balances') loadBalances(balPag.page);
    else if (tab === 'transactions') loadTxns(txnPag.page);
    else loadAlerts();
  };

  const tabs = [
    { key: 'balances', label: 'Tồn kho', icon: Package },
    { key: 'transactions', label: 'Lịch sử GD', icon: History },
    { key: 'alerts', label: 'Cảnh báo', icon: AlertTriangle },
  ];

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Tồn kho cửa hàng</h1>
          <p className='text-sm text-slate-500'>Xem tồn kho, lịch sử giao dịch và cảnh báo</p>
        </div>
        <button onClick={handleRefresh} className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50'>
          <RefreshCcw className='h-4 w-4' /> Làm mới
        </button>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}

      {/* Tabs */}
      <div className='flex gap-1 rounded-lg border border-slate-200 bg-slate-100/50 p-1'>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon className='h-4 w-4' /> {t.label}
            {t.key === 'alerts' && (lowStockAlerts.length + expiryAlerts.length > 0) && (
              <span className='rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-600'>{lowStockAlerts.length + expiryAlerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Balances */}
      {tab === 'balances' && (
        <div className='space-y-3'>
          <div className='relative'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
            <input value={balSearch} onChange={e => setBalSearch(e.target.value)} placeholder='Tìm sản phẩm...' className='w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm' />
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

      {/* Transactions */}
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
                  <th className='px-4 py-3 font-medium text-slate-600'>Lô</th>
                  <th className='px-4 py-3 font-medium text-slate-600 text-right'>Số lượng</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Ghi chú</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {loading && <tr><td colSpan={6} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td></tr>}
                {!loading && !filteredTxns.length && <tr><td colSpan={6} className='px-4 py-6 text-center text-slate-400'>Không có giao dịch nào.</td></tr>}
                {!loading && filteredTxns.map((t, idx) => (
                  <tr key={t._id || idx} className='hover:bg-slate-50/50'>
                    <td className='px-4 py-3 text-slate-500 whitespace-nowrap'>{t.txn_time ? new Date(t.txn_time).toLocaleString('vi-VN') : '-'}</td>
                    <td className='px-4 py-3'><span className={`text-xs font-medium ${txnColor[t.txn_type] || 'text-slate-600'}`}><ArrowUpDown className='mr-1 inline h-3 w-3' />{TXN_TYPES[t.txn_type] || t.txn_type}</span></td>
                    <td className='px-4 py-3 font-medium text-slate-900'>{getItemName(t.item_id)}</td>
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

      {/* Alerts */}
      {tab === 'alerts' && (
        <div className='grid gap-4 md:grid-cols-2'>
          {/* Low stock */}
          <div className='rounded-xl border border-slate-200 bg-white'>
            <div className='border-b border-slate-200 px-4 py-3'>
              <h3 className='text-sm font-semibold text-slate-900'>Tồn kho thấp</h3>
              <p className='text-xs text-slate-500'>Sản phẩm dưới mức tối thiểu</p>
            </div>
            <div className='divide-y divide-slate-100'>
              {!lowStockAlerts.length && <p className='px-4 py-6 text-sm text-slate-400'>Không có cảnh báo</p>}
              {lowStockAlerts.map((r, idx) => (
                <div key={r._id || idx} className='px-4 py-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium text-slate-900'>{getAlertItemName(r)}</span>
                    <span className='rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'>Thấp</span>
                  </div>
                  <p className='mt-0.5 text-xs text-slate-500'>Khả dụng: {r.qty_available ?? '-'} | Tối thiểu: {r.min_stock ?? r.min_stock_level ?? '-'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Expiring */}
          <div className='rounded-xl border border-slate-200 bg-white'>
            <div className='border-b border-slate-200 px-4 py-3'>
              <h3 className='text-sm font-semibold text-slate-900'>Sắp hết hạn</h3>
              <p className='text-xs text-slate-500'>Lô hàng sắp hết hạn sử dụng</p>
            </div>
            <div className='divide-y divide-slate-100'>
              {!expiryAlerts.length && <p className='px-4 py-6 text-sm text-slate-400'>Không có cảnh báo</p>}
              {expiryAlerts.map((r, idx) => (
                <div key={r._id || idx} className='px-4 py-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium text-slate-900'>{r.item?.name || r.lot?.item_id?.name || getAlertItemName(r)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColor[r.severity] || 'bg-slate-100 text-slate-600'}`}>
                      {severityLabel[r.severity] || r.severity || `${r.days_until_expiry ?? '?'} ngày`}
                    </span>
                  </div>
                  <p className='mt-0.5 text-xs text-slate-500'>
                    Lô: {r.lot?.lot_code || r.lot_code || '-'} | HSD: {r.lot?.exp_date ? new Date(r.lot.exp_date).toLocaleDateString('vi-VN') : r.exp_date ? new Date(r.exp_date).toLocaleDateString('vi-VN') : '-'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
