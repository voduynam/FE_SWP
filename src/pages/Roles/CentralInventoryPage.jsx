import { useEffect, useMemo, useState, Fragment, useCallback } from 'react';
import {
  RefreshCcw,
  Search,
  Package,
  History,
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';
import { workflowService } from '../../services/workflowService';
import { getQtyAvailable } from '../../utils/inventoryHelpers';

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
  RECEIPT: 'text-emerald-600',
  ISSUE: 'text-red-600',
  TRANSFER_IN: 'text-blue-600',
  TRANSFER_OUT: 'text-orange-600',
  ADJUSTMENT: 'text-purple-600',
  PRODUCTION_IN: 'text-emerald-600',
  PRODUCTION_OUT: 'text-orange-600',
  CONSUMPTION: 'text-red-600',
};

const severityColor = {
  EXPIRED: 'bg-red-100 text-red-700',
  CRITICAL: 'bg-orange-100 text-orange-700',
  HIGH: 'bg-amber-100 text-amber-700',
  MEDIUM: 'bg-sky-100 text-sky-700',
};
const severityLabel = {
  EXPIRED: 'Hết hạn',
  CRITICAL: '< 3 ngày',
  HIGH: '3-7 ngày',
  MEDIUM: '7-14 ngày',
};
const EXPIRY_DAYS_THRESHOLD = 14;

const getItemName = v => (v ? (typeof v === 'object' ? v.name || v.sku || v._id || '-' : v) : '-');
const getLocName = v => (v ? (typeof v === 'object' ? v.name || v.code || v._id || '-' : v) : '-');
const getLotCode = v => (v ? (typeof v === 'object' ? v.lot_code || v._id || '-' : v) : '-');
const getAlertItemName = r => r?.item?.name || r?.item_name || getItemName(r?.item_id) || '-';

const getLotExpiryStatus = lotRow => {
  const expDate = lotRow?.lot_id?.exp_date ?? lotRow?.exp_date ?? null;
  if (!expDate) return null;

  const now = new Date();
  const daysUntilExpiry = Math.ceil((new Date(expDate) - now) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return { severity: 'EXPIRED', label: severityLabel.EXPIRED, days: daysUntilExpiry };
  if (daysUntilExpiry <= 2) return { severity: 'CRITICAL', label: severityLabel.CRITICAL, days: daysUntilExpiry };
  if (daysUntilExpiry <= 5) return { severity: 'HIGH', label: severityLabel.HIGH, days: daysUntilExpiry };
  if (daysUntilExpiry <= EXPIRY_DAYS_THRESHOLD) return { severity: 'MEDIUM', label: severityLabel.MEDIUM, days: daysUntilExpiry };

  return null;
};

export default function CentralInventoryPage() {
  const [tab, setTab] = useState('balances');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Balances
  const [balances, setBalances] = useState([]);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState({});
  const [balPag, setBalPag] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [balSearch, setBalSearch] = useState('');
  const [debouncedBalSearch, setDebouncedBalSearch] = useState('');
  const [hideZero, setHideZero] = useState(true);

  // Location filter (kho)
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [filterLocations, setFilterLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  // Transactions
  const [txns, setTxns] = useState([]);
  const [txnPag, setTxnPag] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [txnTypeFilter, setTxnTypeFilter] = useState('');
  const [txnSearch, setTxnSearch] = useState('');
  const [debouncedTxnSearch, setDebouncedTxnSearch] = useState('');

  // Debounce searches
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBalSearch(balSearch), 500);
    return () => clearTimeout(timer);
  }, [balSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTxnSearch(txnSearch), 500);
    return () => clearTimeout(timer);
  }, [txnSearch]);

  // Alerts
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);

  const loadFilterLocations = async () => {
    setLocationsLoading(true);
    try {
      const res = await workflowService.getLocations({ limit: 5000 });
      if (!res.success) {
        setFilterLocations([]);
        return;
      }

      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      setFilterLocations(list);
    } finally {
      setLocationsLoading(false);
    }
  };

  const loadBalances = useCallback(async (page = 1, location_id_override) => {
    console.log('🔍 DEBUG: loadBalances called with:', { page, location_id_override, locationFilter, debouncedBalSearch });
    setLoading(true);
    setError('');
    try {
      const location_id =
        location_id_override !== undefined
          ? location_id_override
          : locationFilter === 'ALL'
            ? undefined
            : locationFilter;

      const params = { page, limit: PAGE_SIZE };
      if (location_id) params.location_id = location_id;
      if (debouncedBalSearch) params.search = debouncedBalSearch;

      const res = await workflowService.getInventoryBalancesGrouped(params);
      console.log('🔍 DEBUG: API response:', res);
      if (!res.success) {
        setError(res.message || 'Không tải được tồn kho');
        setBalances([]);
        return;
      }

      const rows = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      console.log('🔍 DEBUG: Inventory balances loaded:', {
        totalRows: rows.length,
        sampleRow: rows[0],
        sampleItem: rows[0]?.item_id,
        sampleLots: rows[0]?.lots?.slice(0, 2)
      });
      setBalances(rows);
      setExpandedGroupKeys({});
      
      const p = res.data?.pagination ?? {};
      setBalPag({ page: p.page || page, limit: p.limit || PAGE_SIZE, total: p.total || rows.length, pages: p.pages || 1 });
    } finally {
      setLoading(false);
    }
  }, [locationFilter, debouncedBalSearch]);

  const loadTxns = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: PAGE_SIZE };
      if (txnTypeFilter) params.txn_type = txnTypeFilter;
      if (debouncedTxnSearch) params.search = debouncedTxnSearch;
      
      const res = await workflowService.getInventoryTransactions(params);
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setTxns(list);
        const p = res.data.pagination ?? {};
        setTxnPag({ page: p.page || page, limit: p.limit || PAGE_SIZE, total: p.total || list.length, pages: p.pages || 1 });
      }
    } finally {
      setLoading(false);
    }
  }, [txnTypeFilter, debouncedTxnSearch]);

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
      const list = Array.isArray(expRes.data)
        ? expRes.data
        : Array.isArray(expRes.data?.alerts)
          ? expRes.data.alerts
          : [];
      setExpiryAlerts(list);
    }
  };

  useEffect(() => {
    console.log('🔍 DEBUG: CentralInventoryPage useEffect - loadFilterLocations and loadAlerts');
    loadFilterLocations();
    loadAlerts();
  }, []);

  useEffect(() => {
    console.log('🔍 DEBUG: CentralInventoryPage useEffect - locationFilter changed:', locationFilter);
    // Reload when location changes
    loadBalances(1, locationFilter === 'ALL' ? undefined : locationFilter);
  }, [locationFilter, loadBalances]);

  useEffect(() => {
    if (tab === 'transactions') loadTxns(1);
  }, [tab, txnTypeFilter, loadTxns]);

  const pagedGroups = useMemo(() => {
    if (hideZero) return balances.filter(g => (g.qty_on_hand ?? 0) !== 0);
    return balances;
  }, [balances, hideZero]);

  const groupPages = balPag.pages;
  const currentGroupPage = balPag.page;

  const showLocationColumn = locationFilter === 'ALL';
  const balanceTableColSpan = showLocationColumn ? 6 : 5;

  const filteredTxns = txns;

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
          <h1 className='text-2xl font-bold text-slate-900'>Tồn kho bếp trung tâm</h1>
          <p className='text-sm text-slate-500'>Xem tồn kho, lịch sử giao dịch và cảnh báo</p>
        </div>
        <button
          onClick={handleRefresh}
          className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50'
        >
          <RefreshCcw className='h-4 w-4' /> Làm mới
        </button>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}

      <div className='flex gap-1 rounded-lg border border-slate-200 bg-slate-100/50 p-1'>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className='h-4 w-4' /> {t.label}
            {t.key === 'alerts' && lowStockAlerts.length + expiryAlerts.length > 0 && (
              <span className='rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-600'>
                {lowStockAlerts.length + expiryAlerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'balances' && (
        <div className='space-y-3'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <div className='min-w-[220px]'>
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                disabled={locationsLoading}
                className='w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
              >
                <option value='ALL'>Tất cả kho</option>
                {filterLocations.map(l => (
                  <option key={l._id} value={l._id}>
                    {l.name || l.code || l._id}
                  </option>
                ))}
              </select>
              {locationsLoading && <p className='mt-0.5 text-[11px] text-slate-400'>Đang tải danh sách kho...</p>}
            </div>

            <div className='relative flex-1'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
              <input
                value={balSearch}
                onChange={e => setBalSearch(e.target.value)}
                placeholder='Tìm theo sản phẩm / vị trí...'
                className='w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-orange-300 focus:ring-1 focus:ring-orange-300'
              />
            </div>

            <label className='flex items-center gap-2 text-sm text-slate-600 cursor-pointer'>
              <input type='checkbox' checked={hideZero} onChange={e => setHideZero(e.target.checked)} className='rounded border-slate-300' />
              Ẩn tồn = 0
            </label>
          </div>

          <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
            <table className='w-full text-sm'>
              <thead className='border-b border-slate-200 bg-slate-50/80 text-left'>
                <tr>
                  <th className='px-4 py-3 font-medium text-slate-600'>Sản phẩm</th>
                  {showLocationColumn && <th className='px-4 py-3 font-medium text-slate-600'>Vị trí</th>}
                  <th className='px-4 py-3 font-medium text-slate-600'>Lô</th>
                  <th className='px-4 py-3 font-medium text-slate-600 text-right'>Tồn kho</th>
                  <th className='px-4 py-3 font-medium text-slate-600 text-right'>Giá trị</th>
                  <th className='px-4 py-3 font-medium text-slate-600 text-right'>Khả dụng</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {loading && (
                  <tr>
                    <td colSpan={balanceTableColSpan} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td>
                  </tr>
                )}

                {!loading && !pagedGroups.length && (
                  <tr>
                    <td colSpan={balanceTableColSpan} className='px-4 py-6 text-center text-slate-400'>Không có dữ liệu</td>
                  </tr>
                )}

                {!loading &&
                  pagedGroups.map(g => {
                    const qty = g.qty_on_hand ?? 0;
                    const itemCostPrice = typeof g.item_id === 'object' ? (g.item_id.cost_price || 0) : 0;
                    const totalValue = qty * itemCostPrice;
                    const avail = g.qty_available ?? qty;
                    const isNegative = qty < 0;
                    const expanded = !!expandedGroupKeys[g.key];

                    const lotsCount = g.lots.length;
                    const severityOrder = { EXPIRED: 0, CRITICAL: 1, HIGH: 2, MEDIUM: 3 };
                    const worstStatus = g.lots
                      .map(l => getLotExpiryStatus(l))
                      .filter(Boolean)
                      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])[0];

                    return (
                      <Fragment key={g.key}>
                        <tr className={`hover:bg-slate-50/50 ${isNegative ? 'bg-red-50/50' : ''}`}>
                          <td className='px-4 py-3 font-medium text-slate-900'>
                            {getItemName(g.item_id)}
                          </td>

                          {showLocationColumn && (
                            <td className='px-4 py-3 text-slate-700'>{getLocName(g.location_id)}</td>
                          )}

                          <td className='px-4 py-3 text-slate-500 text-xs'>
                            <button
                              type='button'
                              onClick={() => setExpandedGroupKeys(prev => ({ ...prev, [g.key]: !expanded }))}
                              className='inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'
                            >
                              <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} />
                              {lotsCount} lô
                              {worstStatus && (
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${severityColor[worstStatus.severity] || 'bg-slate-100 text-slate-600'}`}>
                                  {worstStatus.label}
                                </span>
                              )}
                            </button>
                          </td>

                          <td className={`px-4 py-3 text-right font-medium ${isNegative ? 'text-red-600' : ''}`}>{qty}</td>
                          <td className='px-4 py-3 text-right text-slate-700'>
                            {(() => {
                              const itemCostPrice = typeof g.item_id === 'object' ? (g.item_id.cost_price || 0) : 0;
                              const totalValue = qty * itemCostPrice;
                              console.log('🔍 DEBUG: Item value calculation:', {
                                item: getItemName(g.item_id),
                                qty,
                                itemCostPrice,
                                totalValue,
                                item_id: g.item_id
                              });
                              return totalValue > 0 ? `${totalValue.toLocaleString('vi-VN')} ₫` : '-';
                            })()}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${avail < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {avail}
                          </td>
                        </tr>

                        {expanded && (
                          <tr>
                            <td colSpan={balanceTableColSpan} className='bg-white'>
                              <div className='px-4 py-3'>
                                <div className='flex items-center justify-between gap-3'>
                                  <div className='text-sm font-medium text-slate-900'>Chi tiết theo lô</div>

                                </div>

                                <div className='mt-3 overflow-x-auto'>
                                  <table className='w-full text-sm'>
                                    <thead>
                                      <tr className='border-b border-slate-200 text-left'>
                                        <th className='px-2 py-2 text-xs font-medium text-slate-600'>Lô</th>
                                        <th className='px-2 py-2 text-xs font-medium text-slate-600'>MFG</th>
                                        <th className='px-2 py-2 text-xs font-medium text-slate-600'>Ngày hết hạn</th>
                                        <th className='px-2 py-2 text-xs font-medium text-slate-600'>Tình trạng</th>
                                        <th className='px-2 py-2 text-xs font-medium text-slate-600 text-right'>Tồn</th>
                                        <th className='px-2 py-2 text-xs font-medium text-slate-600 text-right'>Giá trị</th>
                                        <th className='px-2 py-2 text-xs font-medium text-slate-600 text-right'>Khả dụng</th>
                                      </tr>
                                    </thead>
                                    <tbody className='divide-y divide-slate-100'>
                                      {g.lots.map((l, i) => {
                                        const lotId = l.lot_id?._id ?? l.lot_id ?? '';
                                        const status = getLotExpiryStatus(l);
                                        const exp = l?.lot_id?.exp_date ?? l?.exp_date;

                                        const daysText = (() => {
                                          if (status?.days == null || !exp) return null;
                                          if (status.days < 0) return `Đã hết ${Math.abs(status.days)} ngày`;
                                          return `Còn ${status.days} ngày`;
                                        })();

                                        return (
                                          <tr key={lotId || `${g.key}_${i}`} className='hover:bg-slate-50/50'>
                                            <td className='px-2 py-2 text-xs text-slate-900'>
                                              <span className='font-medium'>{getLotCode(l.lot_id)}</span>
                                            </td>
                                            <td className='px-2 py-2 text-xs text-slate-600'>
                                              {l.lot_id?.mfg_date ? new Date(l.lot_id.mfg_date).toLocaleDateString('vi-VN') : '-'}
                                            </td>
                                            <td className='px-2 py-2 text-xs text-slate-600'>
                                              {exp ? new Date(exp).toLocaleDateString('vi-VN') : '-'}
                                            </td>
                                            <td className='px-2 py-2 text-xs text-slate-600'>
                                              {status ? (
                                                <div className='flex flex-col gap-1'>
                                                  <span
                                                    className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                      severityColor[status.severity] || 'bg-slate-100 text-slate-600'
                                                    }`}
                                                  >
                                                    {status.label}
                                                  </span>
                                                  {daysText ? (
                                                    <span className={`text-[11px] font-medium ${status.severity === 'EXPIRED' ? 'text-red-600' : 'text-amber-700'}`}>
                                                      {daysText}
                                                    </span>
                                                  ) : null}
                                                </div>
                                              ) : (
                                                <span className='text-[11px] text-slate-400'>Không cảnh báo</span>
                                              )}
                                            </td>
                                            <td className='px-2 py-2 text-right text-xs font-medium text-slate-900'>{l.qty_on_hand ?? 0}</td>
                                            <td className='px-2 py-2 text-right text-xs text-slate-600'>
                                              {(() => {
                                                const lotQty = l.qty_on_hand ?? 0;
                                                const lotCostPrice = typeof g.item_id === 'object' ? (g.item_id.cost_price || 0) : 0;
                                                const lotValue = lotQty * lotCostPrice;
                                                console.log('🔍 DEBUG: Lot value calculation:', {
                                                  lot: getLotCode(l.lot_id),
                                                  lotQty,
                                                  lotCostPrice,
                                                  lotValue,
                                                  item_id: g.item_id
                                                });
                                                return lotValue > 0 ? `${lotValue.toLocaleString('vi-VN')} ₫` : '-';
                                              })()}
                                            </td>
                                            <td className='px-2 py-2 text-right text-xs font-semibold text-emerald-600'>{getQtyAvailable(l)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {groupPages > 1 && (
            <div className='flex items-center justify-between text-sm text-slate-500'>
              <span>Trang {currentGroupPage}/{groupPages} ({balPag.total} nhóm sản phẩm)</span>
              <div className='flex gap-1'>
                <button
                  disabled={currentGroupPage <= 1}
                  onClick={() => loadBalances(Math.max(1, currentGroupPage - 1))}
                  className='rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40'
                >
                  Trước
                </button>
                <button
                  disabled={currentGroupPage >= groupPages}
                  onClick={() => loadBalances(Math.min(groupPages, currentGroupPage + 1))}
                  className='rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40'
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'transactions' && (
        <div className='space-y-3'>
          <div className='flex flex-col gap-3 sm:flex-row'>
            <div className='relative flex-1'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
              <input value={txnSearch} onChange={e => setTxnSearch(e.target.value)} placeholder='Tìm theo sản phẩm / ghi chú...' className='w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm' />
            </div>
            <select
              value={txnTypeFilter}
              onChange={e => setTxnTypeFilter(e.target.value)}
              className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm min-w-[180px]'
            >
              <option value=''>Tất cả loại GD</option>
              {Object.entries(TXN_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
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
                {!loading &&
                  filteredTxns.map((t, idx) => (
                    <tr key={t._id || idx} className='hover:bg-slate-50/50'>
                      <td className='px-4 py-3 text-slate-500 whitespace-nowrap'>{t.txn_time ? new Date(t.txn_time).toLocaleString('vi-VN') : '-'}</td>
                      <td className='px-4 py-3'>
                        <span className={`text-xs font-medium ${txnColor[t.txn_type] || 'text-slate-600'}`}>
                          <ArrowUpDown className='mr-1 inline h-3 w-3' />
                          {TXN_TYPES[t.txn_type] || t.txn_type}
                        </span>
                      </td>
                      <td className='px-4 py-3 font-medium text-slate-900'>{getItemName(t.item_id)}</td>
                      <td className='px-4 py-3 text-slate-500 text-xs'>{getLotCode(t.lot_id)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${(t.qty ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {(t.qty ?? 0) >= 0 ? '+' : ''}
                        {t.qty ?? 0}
                      </td>
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

      {tab === 'alerts' && (
        <div className='grid gap-4 md:grid-cols-2'>
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
                    Lô: {r.lot?.lot_code || r.lot_code || '-'} | Ngày hết hạn: {r.lot?.exp_date ? new Date(r.lot.exp_date).toLocaleDateString('vi-VN') : r.exp_date ? new Date(r.exp_date).toLocaleDateString('vi-VN') : '-'}
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

