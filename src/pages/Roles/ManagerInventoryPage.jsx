import { useEffect, useRef, useState, useMemo, Fragment, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCcw, Search, Package, ArrowUpDown, PlusCircle, History, AlertTriangle, ChevronDown } from 'lucide-react';
import { workflowService } from '../../services/workflowService';
import { useAuth } from '../../contexts/AuthContext';
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

const getLotExpiryStatus = lotRow => {
  const expDate = lotRow?.lot_id?.exp_date ?? lotRow?.exp_date ?? null;
  if (!expDate) return null;

  const now = new Date();
  const daysUntilExpiry = Math.ceil((new Date(expDate) - now) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return { severity: 'EXPIRED', label: severityLabel.EXPIRED, days: daysUntilExpiry };
  if (daysUntilExpiry <= 2) return { severity: 'CRITICAL', label: severityLabel.CRITICAL, days: daysUntilExpiry };
  if (daysUntilExpiry <= 5) return { severity: 'HIGH', label: severityLabel.HIGH, days: daysUntilExpiry };
  if (daysUntilExpiry <= EXPIRY_DAYS_THRESHOLD) {
    return { severity: 'MEDIUM', label: severityLabel.MEDIUM, days: daysUntilExpiry };
  }
  return null;
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
  const { user } = useAuth();
  const roleCodes = Array.isArray(user?.roles)
    ? user.roles.map(r => String(r.code || '').toUpperCase())
    : [];
  const canAdjust = roleCodes.includes('MANAGER') || roleCodes.includes('ADMIN');

  const [tab, setTab] = useState('balances');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Summary
  const [summary, setSummary] = useState(null);

  // Balances
  const [balances, setBalances] = useState([]);
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [expiryFilter, setExpiryFilter] = useState('ALL');
  const [filterLocations, setFilterLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState({});
  const [balPag, setBalPag] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [balSearch, setBalSearch] = useState('');
  const [hideZero, setHideZero] = useState(true);

  // Disposal
  const [disposing, setDisposing] = useState(false);

  // Transactions
  const [txns, setTxns] = useState([]);
  const [txnPag, setTxnPag] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [txnTypeFilter, setTxnTypeFilter] = useState('');
  const [txnSearch, setTxnSearch] = useState('');

  // Alerts
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);

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
  const [adjustLots, setAdjustLots] = useState([]);
  const adjustFromRowRef = useRef(false);

  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); } }, [success]);

  /* ── Summary ── */
  const loadSummary = async () => {
    const res = await workflowService.getInventorySummary({});
    if (res.success) setSummary(res.data);
  };

  /* ── Alerts ── */
  const loadAlerts = async () => {
    setAlertsLoading(true);
    try {
      const [lowRes, expRes] = await Promise.all([
        workflowService.getAlertsLowStock({}),
        workflowService.getAlertsExpiry({ days_threshold: 14 }),
      ]);

      if (lowRes.success) {
        const list = Array.isArray(lowRes.data)
          ? lowRes.data
          : Array.isArray(lowRes.data?.alerts)
            ? lowRes.data.alerts
            : [];
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
    } finally {
      setAlertsLoading(false);
    }
  };

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

  /* ── Balances ── */
  const loadBalances = useCallback(async (page = 1, location_id_override) => {
    setLoading(true);
    setError('');
    try {
      const location_id =
        location_id_override !== undefined
          ? location_id_override
          : locationFilter === 'ALL'
            ? undefined
            : locationFilter;

      // FE cần gom nhóm theo (location,item) + hiển thị theo từng kho,
      // nên lấy đầy đủ data trước khi group (tránh bị vỡ group do BE phân trang).
      const allRows = [];
      const limit = 200;
      let curPage = 1;
      let totalPages = 1;

      while (curPage <= totalPages) {
        const params = { page: curPage, limit };
        if (location_id) params.location_id = location_id;

        const res = await workflowService.getInventoryBalancesPaginated(params);
        if (!res.success) {
          setError(res.message || 'Không tải được tồn kho');
          setBalances([]);
          return;
        }

        const rows = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        allRows.push(...rows);

        const p = res.data?.pagination ?? {};
        totalPages = p.pages || curPage;
        curPage++;
      }
      setBalances(allRows);
      setExpandedGroupKeys({});
      // balPag.page is used for FE pagination after grouping; total/pages computed in-memory.
      setBalPag(prev => ({ ...prev, page }));
    } finally { setLoading(false); }
  }, [locationFilter]);

  /* ── Transactions ── */
  const loadTxns = useCallback(async (page = 1) => {
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
    } finally {
      setLoading(false);
    }
  }, [txnTypeFilter]);

  // Init once on mount.
  useEffect(() => {
    loadSummary();
    loadFilterLocations();
    loadAlerts();
    // Load items for disposal functionality
    const loadItems = async () => {
      const res = await workflowService.getItems({ limit: 500 });
      if (res.success) {
        const itemList = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
        setItems(itemList);
      }
    };
    loadItems();
  }, []);

  // Reload balances when location filter changes.
  useEffect(() => {
    loadBalances(1);
  }, [loadBalances]);

  useEffect(() => {
    if (tab === 'transactions') loadTxns(1);
  }, [tab, loadTxns]);

  const groupedBalances = useMemo(() => {
    const map = new Map();

    for (const row of balances) {
      const locId = row.location_id?._id ?? row.location_id ?? '';
      const itemId = row.item_id?._id ?? row.item_id ?? '';
      const key = `${locId}__${itemId}`;

      // Optionally hide empty rows before summing.
      if (hideZero && (row.qty_on_hand ?? 0) === 0) continue;

      if (!map.has(key)) {
        map.set(key, {
          key,
          location_id: row.location_id,
          item_id: row.item_id,
          qty_on_hand: 0,
          qty_available: 0,
          lots: [],
        });
      }

      const g = map.get(key);
      g.qty_on_hand += row.qty_on_hand ?? 0;
      g.qty_available += getQtyAvailable(row);
      g.lots.push(row);
    }

    // FIFO-ish: oldest mfg_date first
    const groups = Array.from(map.values()).map(g => {
      g.lots.sort((a, b) => {
        const ad = a.lot_id?.mfg_date ? new Date(a.lot_id.mfg_date).getTime() : Infinity;
        const bd = b.lot_id?.mfg_date ? new Date(b.lot_id.mfg_date).getTime() : Infinity;
        return ad - bd;
      });
      return g;
    });

    groups.sort((a, b) => {
      const la = getLocName(a.location_id).toLowerCase();
      const lb = getLocName(b.location_id).toLowerCase();
      if (la !== lb) return la.localeCompare(lb);
      return getItemName(a.item_id).toLowerCase().localeCompare(getItemName(b.item_id).toLowerCase());
    });

    // If hideZero is on, hide full groups that end up at 0 after aggregation.
    if (hideZero) return groups.filter(g => (g.qty_on_hand ?? 0) !== 0);
    return groups;
  }, [balances, hideZero]);

  const filteredGroups = useMemo(() => {
    const s = (balSearch || '').toLowerCase().trim();
    
    let filtered = groupedBalances;
    
    // Apply search filter
    if (s) {
      filtered = filtered.filter(g => {
        const itemObj = g.item_id;
        const itemName = getItemName(itemObj).toLowerCase();
        const sku = typeof itemObj === 'object' ? String(itemObj.sku || '').toLowerCase() : '';
        const loc = getLocName(g.location_id).toLowerCase();
        return itemName.includes(s) || sku.includes(s) || loc.includes(s);
      });
    }
    
    // Apply expiry filter
    if (expiryFilter !== 'ALL') {
      filtered = filtered.filter(g => {
        const hasExpiredLots = g.lots.some(l => {
          const status = getLotExpiryStatus(l);
          return status && status.severity === 'EXPIRED';
        });
        
        const hasExpiringSoonLots = g.lots.some(l => {
          const status = getLotExpiryStatus(l);
          return status && ['CRITICAL', 'HIGH', 'MEDIUM'].includes(status.severity);
        });
        
        const hasNormalLots = g.lots.some(l => {
          const status = getLotExpiryStatus(l);
          return !status; // No expiry warning
        });
        
        switch (expiryFilter) {
          case 'EXPIRED':
            return hasExpiredLots;
          case 'EXPIRING_SOON':
            return hasExpiringSoonLots && !hasExpiredLots;
          case 'NORMAL':
            return hasNormalLots && !hasExpiredLots && !hasExpiringSoonLots;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [groupedBalances, balSearch, expiryFilter]);

  const showLocationColumn = locationFilter === 'ALL';
  const balanceTableColSpan = showLocationColumn ? 7 : 6;

  const groupPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const currentGroupPage = Math.min(balPag.page, groupPages);
  const pagedGroups = useMemo(() => {
    const start = (currentGroupPage - 1) * PAGE_SIZE;
    return filteredGroups.slice(start, start + PAGE_SIZE);
  }, [filteredGroups, currentGroupPage]);

  useEffect(() => {
    // Keep pagination consistent when searching/filtering.
    setBalPag(prev => ({ ...prev, page: 1 }));
  }, [balSearch, hideZero, expiryFilter]);

  /* ── Disposal ── */
  const handleDisposal = async (locationId, itemId, lotId, qty) => {
    if (!canAdjust) {
      setError('Bạn không có quyền xử lý hàng hết hạn.');
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xử lý (vứt bỏ) ${qty} sản phẩm hết hạn này không? Thao tác này không thể hoàn tác.`
    );
    
    if (!confirmed) return;

    setDisposing(true);
    setError('');
    
    try {
      const selectedItem = items.find(i => i._id === itemId) || 
                          balances.find(b => (b.item_id?._id || b.item_id) === itemId)?.item_id;
      
      const uom_id = selectedItem?.base_uom_id?._id || 
                     selectedItem?.base_uom_id || 
                     selectedItem?.uom_id;

      const payload = {
        location_id: locationId,
        item_id: itemId,
        lot_id: lotId,
        qty: -Math.abs(qty), // Negative to reduce inventory
        uom_id: uom_id || undefined,
        reason: 'EXPIRED: Xử lý hàng hết hạn - vứt bỏ'
      };

      const res = await workflowService.adjustInventory(payload);
      
      if (res.success) {
        setSuccess('Đã xử lý hàng hết hạn thành công.');
        loadBalances(balPag.page);
        loadSummary();
      } else {
        setError(res.message || 'Xử lý hàng hết hạn thất bại');
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi xử lý hàng hết hạn');
      console.error('Disposal error:', err);
    } finally {
      setDisposing(false);
    }
  };

  /* ── Adjust ── */
  useEffect(() => {
    if (!adjustOpen) return;
    setAdjustError('');
    if (!adjustFromRowRef.current) {
      setAdjustForm({ location_id: '', item_id: '', lot_id: '', qty_adjustment: '', reason: '', adjustment_type: 'COUNT_ADJUSTMENT' });
      setAdjustLots([]);
    } else adjustFromRowRef.current = false;
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
    const reasonTrim = (adjustForm.reason || '').trim();

    if (!canAdjust) {
      setAdjustError('Bạn không có quyền điều chỉnh tồn kho.');
      setAdjusting(false);
      return;
    }

    if (!adjustForm.location_id || !adjustForm.item_id || !Number.isFinite(qty) || qty === 0) {
      setAdjustError('Vui lòng chọn vị trí, sản phẩm và nhập số lượng điều chỉnh (khác 0).');
      setAdjusting(false);
      return;
    }

    if (!reasonTrim) {
      setAdjustError('Vui lòng nhập lý do điều chỉnh.');
      setAdjusting(false);
      return;
    }
    const selectedItem = items.find(i => i._id === adjustForm.item_id);
    const uom_id = selectedItem?.base_uom_id?._id || selectedItem?.base_uom_id || selectedItem?.uom_id;
    if (!uom_id) {
      setAdjustError('Không xác định được đơn vị tính của sản phẩm.');
      setAdjusting(false);
      return;
    }
    const payload = {
      location_id: adjustForm.location_id,
      item_id: adjustForm.item_id,
      qty,
      uom_id: uom_id || undefined,
      // BE chỉ nhận `reason`; thêm loại điều chỉnh để dễ audit
      reason: adjustForm.adjustment_type ? `${adjustForm.adjustment_type}: ${reasonTrim}` : reasonTrim,
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
    { key: 'alerts', label: 'Cảnh báo', icon: AlertTriangle },
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
          {canAdjust && (
            <button onClick={() => setAdjustOpen(true)} className='inline-flex items-center gap-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700'>
              <PlusCircle className='h-4 w-4' /> Điều chỉnh
            </button>
          )}
          <button onClick={() => {
            loadSummary();
            if (tab === 'balances') loadBalances(balPag.page);
            else if (tab === 'transactions') loadTxns(txnPag.page);
            else loadAlerts();
          }} className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50'>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      {success && <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>{success}</div>}
      {error && <p className='text-sm text-red-600'>{error}</p>}
      {tab === 'balances' && filteredGroups.some(r => (r.qty_on_hand ?? 0) < 0) && (
        <div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800'>
          Có {filteredGroups.filter(r => (r.qty_on_hand ?? 0) < 0).length} nhóm tồn âm. Vui lòng dùng <strong>Điều chỉnh</strong> để sửa.
        </div>
      )}

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
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <div className='min-w-[220px]'>
              <select
                value={locationFilter}
                onChange={e => {
                  const v = e.target.value;
                  setLocationFilter(v);
                }}
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

            <div className='min-w-[180px]'>
              <select
                value={expiryFilter}
                onChange={e => setExpiryFilter(e.target.value)}
                className='w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
              >
                <option value='ALL'>Tất cả tình trạng</option>
                <option value='NORMAL'>Bình thường</option>
                <option value='EXPIRING_SOON'>Sắp hết hạn</option>
                <option value='EXPIRED'>Hết hạn</option>
              </select>
            </div>

            <div className='relative flex-1'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
              <input
                value={balSearch}
                onChange={e => setBalSearch(e.target.value)}
                placeholder='Tìm theo sản phẩm / SKU...'
                className='w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-orange-300 focus:ring-1 focus:ring-orange-300'
              />
            </div>
            <label className='flex items-center gap-2 text-sm text-slate-600 cursor-pointer'>
              <input type='checkbox' checked={hideZero} onChange={e => setHideZero(e.target.checked)} className='rounded border-slate-300' />
              Ẩn dòng tồn = 0
            </label>
          </div>

          <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
            <table className='w-full text-sm'>
              <thead className='border-b border-slate-200 bg-slate-50/80 text-left'>
                <tr>
                  <th className='px-4 py-3 font-medium text-slate-600'>Sản phẩm</th>
                  {showLocationColumn && (
                    <th className='px-4 py-3 font-medium text-slate-600'>Vị trí</th>
                  )}
                  <th className='px-4 py-3 font-medium text-slate-600'>Lô</th>
                  <th className='px-4 py-3 font-medium text-slate-600 text-right'>Tồn kho</th>
                  <th className='px-4 py-3 font-medium text-slate-600 text-right'>Giá trị</th>
                  <th className='px-4 py-3 font-medium text-slate-600 text-right'>Khả dụng</th>
                  <th className='px-4 py-3 font-medium text-slate-600 text-right w-24'>Thao tác</th>
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
                    <td colSpan={balanceTableColSpan} className='px-4 py-6 text-center text-slate-400'>
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
                {!loading &&
                  pagedGroups.map(g => {
                    const locId = g.location_id?._id ?? g.location_id;
                    const itemId = g.item_id?._id ?? g.item_id;
                    const qty = g.qty_on_hand ?? 0;
                    const itemCostPrice = typeof g.item_id === 'object' ? (g.item_id.cost_price || 0) : 0;
                    const totalValue = qty * itemCostPrice;
                    
                    console.log('🔍 DEBUG: Item value calculation:', {
                      item: getItemName(g.item_id),
                      qty,
                      itemCostPrice,
                      totalValue,
                      item_id_type: typeof g.item_id,
                      item_id_keys: typeof g.item_id === 'object' ? Object.keys(g.item_id) : 'not object',
                      cost_price_exists: typeof g.item_id === 'object' && 'cost_price' in g.item_id,
                      cost_price_value: typeof g.item_id === 'object' ? g.item_id.cost_price : 'N/A'
                    });
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
                            <div className='flex items-center gap-2'>
                              <span>{getItemName(g.item_id)}</span>
                              {typeof g.item_id === 'object' && g.item_id?.sku && (
                                <span className='rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600'>
                                  {g.item_id.sku}
                                </span>
                              )}
                            </div>
                          </td>
                          {showLocationColumn && (
                            <td className='px-4 py-3 text-slate-700'>{getLocName(g.location_id)}</td>
                          )}
                          <td className='px-4 py-3 text-slate-500 text-xs'>
                            <button
                              type='button'
                              onClick={() => setExpandedGroupKeys(prev => ({ ...prev, [g.key]: !expanded }))}
                              className='inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'
                            >
                              <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} />
                              {lotsCount} lô
                              {worstStatus && (
                                <span
                                  className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${severityColor[worstStatus.severity] || 'bg-slate-100 text-slate-600'}`}
                                >
                                  {worstStatus.label}
                                </span>
                              )}
                            </button>
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${isNegative ? 'text-red-600' : ''}`}>{qty}</td>
                          <td className='px-4 py-3 text-right text-slate-700'>
                            {totalValue > 0 ? `${totalValue.toLocaleString('vi-VN')} ₫` : '-'}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${avail < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {avail}
                          </td>
                          <td className='px-4 py-3 text-right'>
                            {canAdjust && (
                              <button
                                type='button'
                                onClick={async () => {
                                  adjustFromRowRef.current = true;
                                  // Điều chỉnh tồn chung (không bắt buộc chọn lot)
                                  setAdjustForm({
                                    location_id: locId,
                                    item_id: itemId,
                                    lot_id: '',
                                    qty_adjustment: '',
                                    reason: '',
                                    adjustment_type: 'COUNT_ADJUSTMENT',
                                  });
                                  if (itemId) {
                                    const res = await workflowService.getLots({ item_id: itemId, limit: 100 });
                                    const list = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? []);
                                    setAdjustLots(list);
                                  } else setAdjustLots([]);
                                  setAdjustOpen(true);
                                }}
                                className='rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100'
                              >
                                Điều chỉnh
                              </button>
                            )}
                          </td>
                        </tr>

                        {expanded && (
                          <tr>
                            <td colSpan={balanceTableColSpan} className='bg-white'>
                              <div className='px-4 py-3'>
                                <div className='flex items-center justify-between gap-3'>
                                  <div className='text-sm font-medium text-slate-900'>
                                    Chi tiết theo lô
                                  </div>
                                </div>

                                <div className='mt-3 overflow-x-auto'>
                                  <table className='w-full text-sm'>
                                    <thead>
                                      <tr className='border-b border-slate-200 text-left'>
                                        <th className='px-2 py-2 text-xs font-medium text-slate-600'>Lô</th>
                                        <th className='px-2 py-2 text-xs font-medium text-slate-600'>MFG</th>
                                        <th className='px-2 py-2 text-xs font-medium text-slate-600'>Tình trạng</th>
                                        <th className='px-2 py-2 text-xs font-medium text-slate-600 text-right'>Tồn</th>
                                        <th className='px-2 py-2 text-xs font-medium text-slate-600 text-right'>Giá trị</th>
                                        <th className='px-2 py-2 text-xs font-medium text-slate-600 text-right'>Khả dụng</th>
                                        {canAdjust && <th className='px-2 py-2 text-xs font-medium text-slate-600 text-right w-32'>Thao tác</th>}
                                      </tr>
                                    </thead>
                                    <tbody className='divide-y divide-slate-100'>
                                      {g.lots.map((l, i) => {
                                        const lotId = l.lot_id?._id ?? l.lot_id ?? '';
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
                                        const lotAvail = getQtyAvailable(l);
                                        const lotNegative = lotQty < 0;
                                        const status = getLotExpiryStatus(l);
                                        return (
                                          <tr key={lotId || `${g.key}_${i}`} className='hover:bg-slate-50/50'>
                                            <td className='px-2 py-2 text-xs text-slate-900'>
                                              <span className='font-medium'>{getLotCode(l.lot_id)}</span>
                                            </td>
                                            <td className='px-2 py-2 text-xs text-slate-600'>
                                              {l.lot_id?.mfg_date ? new Date(l.lot_id.mfg_date).toLocaleDateString('vi-VN') : '-'}
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
                                                  <span className={`text-[11px] ${status.severity === 'EXPIRED' ? 'text-red-600' : 'text-amber-700'}`}>
                                                    {status.days < 0
                                                      ? `Đã hết ${Math.abs(status.days)} ngày`
                                                      : `Còn ${status.days} ngày`}
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className='text-[11px] text-slate-400'>Không cảnh báo</span>
                                              )}
                                            </td>
                                            <td className={`px-2 py-2 text-right text-xs font-medium ${lotNegative ? 'text-red-600' : 'text-slate-900'}`}>
                                              {lotQty}
                                            </td>
                                            <td className='px-2 py-2 text-right text-xs text-slate-600'>
                                              {lotValue > 0 ? `${lotValue.toLocaleString('vi-VN')} ₫` : '-'}
                                            </td>
                                            <td className={`px-2 py-2 text-right text-xs font-semibold ${lotAvail < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                              {lotAvail}
                                            </td>
                                            {canAdjust && (
                                              <td className='px-2 py-2 text-right'>
                                                <div className='flex gap-1'>
                                                  <button
                                                    type='button'
                                                    onClick={async () => {
                                                      adjustFromRowRef.current = true;
                                                      setAdjustForm({
                                                        location_id: locId,
                                                        item_id: itemId,
                                                        lot_id: lotId,
                                                        qty_adjustment: '',
                                                        reason: '',
                                                        adjustment_type: 'COUNT_ADJUSTMENT',
                                                      });
                                                      if (itemId) {
                                                        const res = await workflowService.getLots({ item_id: itemId, limit: 100 });
                                                        const list = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? []);
                                                        setAdjustLots(list);
                                                      } else setAdjustLots([]);
                                                      setAdjustOpen(true);
                                                    }}
                                                    className='rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100'
                                                  >
                                                    Điều chỉnh
                                                  </button>
                                                  {status && status.severity === 'EXPIRED' && lotQty > 0 && (
                                                    <button
                                                      type='button'
                                                      onClick={() => handleDisposal(locId, itemId, lotId, lotQty)}
                                                      disabled={disposing}
                                                      className='rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50'
                                                    >
                                                      {disposing ? 'Đang xử lý...' : 'Xử lí'}
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
                                            )}
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
              <span>
                Trang {currentGroupPage}/{groupPages} ({filteredGroups.length} nhóm sản phẩm)
              </span>
              <div className='flex gap-1'>
                <button
                  disabled={currentGroupPage <= 1}
                  onClick={() => setBalPag(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  className='rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40'
                >
                  Trước
                </button>
                <button
                  disabled={currentGroupPage >= groupPages}
                  onClick={() => setBalPag(prev => ({ ...prev, page: Math.min(groupPages, prev.page + 1) }))}
                  className='rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40'
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === Transactions Tab === */}
      {tab === 'transactions' && (() => {
        const filteredTxns = (() => {
          const s = (txnSearch || '').toLowerCase();
          if (!s) return txns;
          return txns.filter(t => {
            const name = getItemName(t.item_id).toLowerCase();
            const loc = getLocName(t.location_id).toLowerCase();
            const notes = (t.notes || '').toLowerCase();
            return name.includes(s) || loc.includes(s) || notes.includes(s);
          });
        })();

        return (
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
        );
      })()}

      {/* === Alerts Tab === */}
      {tab === 'alerts' && (
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-base font-semibold text-slate-900'>Cảnh báo tồn kho</h2>
              <p className='text-sm text-slate-500'>Tồn kho thấp và lô sắp hết hạn</p>
            </div>
            <div className='text-sm text-slate-500'>
              {alertsLoading ? 'Đang tải...' : `${lowStockAlerts.length + expiryAlerts.length} cảnh báo`}
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='rounded-xl border border-slate-200 bg-white'>
              <div className='border-b border-slate-200 px-4 py-3'>
                <h3 className='text-sm font-semibold text-slate-900'>Tồn kho thấp</h3>
                <p className='text-xs text-slate-500'>Sản phẩm dưới mức tối thiểu</p>
              </div>
              <div className='divide-y divide-slate-100'>
                {alertsLoading && <p className='px-4 py-6 text-sm text-slate-400'>Đang tải...</p>}
                {!alertsLoading && !lowStockAlerts.length && <p className='px-4 py-6 text-sm text-slate-400'>Không có cảnh báo</p>}
                {!alertsLoading &&
                  lowStockAlerts.map((r, idx) => (
                    <div key={r._id || r.alert_id || idx} className='px-4 py-3'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm font-medium text-slate-900'>
                          {r.item?.name || r.item_name || getItemName(r.item_id)}
                        </span>
                        <span className='rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'>Thấp</span>
                      </div>
                      <p className='mt-0.5 text-xs text-slate-500'>
                        Khả dụng: {r.qty_available ?? '-'} | Tối thiểu: {r.min_stock ?? r.min_stock_level ?? '-'}
                      </p>
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
                {alertsLoading && <p className='px-4 py-6 text-sm text-slate-400'>Đang tải...</p>}
                {!alertsLoading && !expiryAlerts.length && <p className='px-4 py-6 text-sm text-slate-400'>Không có cảnh báo</p>}
                {!alertsLoading &&
                  expiryAlerts.map((r, idx) => (
                    <div key={r._id || r.alert_id || idx} className='px-4 py-3'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm font-medium text-slate-900'>
                          {r.item?.name || r.lot?.item_id?.name || getItemName(r.item_id)}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColor[r.severity] || 'bg-slate-100 text-slate-600'}`}>
                          {severityLabel[r.severity] || r.severity || `${r.days_until_expiry ?? '?'} ngày`}
                        </span>
                      </div>
                      <p className='mt-0.5 text-xs text-slate-500'>
                        Lô: {r.lot?.lot_code || r.lot_code || '-'} | Ngày hết hạn:{' '}
                        {r.lot?.exp_date
                          ? new Date(r.lot.exp_date).toLocaleDateString('vi-VN')
                          : r.exp_date
                            ? new Date(r.exp_date).toLocaleDateString('vi-VN')
                            : '-'}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
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
                  <select value={adjustForm.item_id} onChange={async e => {
                    const v = e.target.value;
                    setAdjustForm(f => ({ ...f, item_id: v, lot_id: '' }));
                    if (v) {
                      const res = await workflowService.getLots({ item_id: v, limit: 100 });
                      const list = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? []);
                      setAdjustLots(list);
                    } else setAdjustLots([]);
                  }} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'>
                    <option value=''>-- Chọn sản phẩm --</option>
                    {items.map(i => <option key={i._id} value={i._id}>{i.name || i.sku || i._id}</option>)}
                  </select>
                </div>
                {adjustForm.item_id && (
                  <div className={adjustLots.length > 0 ? '' : 'sm:col-span-2'}>
                    {adjustLots.length > 0 ? (
                      <>
                        <label className='block text-sm font-medium text-slate-700'>Lô (tùy chọn)</label>
                        <select value={adjustForm.lot_id} onChange={e => setAdjustForm(f => ({ ...f, lot_id: e.target.value }))} className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'>
                          <option value=''>-- Không có lô / Tồn chung --</option>
                          {adjustLots.map(l => (
                            <option key={l._id} value={l._id}>
                              {l.lot_code || l._id}{l.exp_date ? ` (Ngày hết hạn: ${new Date(l.exp_date).toLocaleDateString('vi-VN')})` : ''}
                            </option>
                          ))}
                        </select>
                        <p className='mt-0.5 text-xs text-slate-400'>Chọn lô hoặc để trống cho tồn chung</p>
                      </>
                    ) : (
                      <p className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600'>
                        Sản phẩm này không theo dõi theo lô. Điều chỉnh áp dụng cho tồn chung (lot_id = null).
                      </p>
                    )}
                  </div>
                )}
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
                <label className='block text-sm font-medium text-slate-700'>Lý do điều chỉnh *</label>
                <textarea
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
                  rows={2}
                  className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
                  placeholder='Mô tả lý do điều chỉnh (bắt buộc)...'
                />
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