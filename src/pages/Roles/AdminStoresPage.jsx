import { useEffect, useMemo, useState } from 'react';
import {
  ChefHat,
  Download,
  MapPin,
  Package,
  Pencil,
  PlusCircle,
  RefreshCcw,
  Search,
  Store as StoreIcon,
  Trash2,
  X,
} from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadges';
import { workflowService } from '../../services/workflowService';

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

/** Nền / viền khác nhau: cửa hàng (STORE) vs bếp trung tâm (KITCHEN) */
const orgUnitVisual = {
  STORE: {
    label: 'Cửa hàng',
    cardClass:
      'border-violet-200/90 bg-gradient-to-br from-violet-50 via-violet-50/80 to-fuchsia-50/40 shadow-md shadow-violet-900/[0.06]',
    iconBox: 'bg-violet-100 text-violet-700',
    chip: 'bg-violet-100/90 text-violet-800 ring-1 ring-violet-200/80',
  },
  KITCHEN: {
    label: 'Bếp trung tâm',
    cardClass:
      'border-teal-200/90 bg-gradient-to-br from-teal-50 via-cyan-50/70 to-emerald-50/30 shadow-md shadow-teal-900/[0.06]',
    iconBox: 'bg-teal-100 text-teal-800',
    chip: 'bg-teal-100/90 text-teal-900 ring-1 ring-teal-200/80',
  },
};

const getOrgUnitVisual = store => {
  const t = (store?.type || 'STORE').toUpperCase();
  return orgUnitVisual[t] || orgUnitVisual.STORE;
};

const TABS = [
  { id: 'stores', label: 'Cửa hàng / Đơn vị', icon: StoreIcon },
  { id: 'locations', label: 'Vị trí kho', icon: Package },
];

export default function AdminStoresPage() {
  const [activeTab, setActiveTab] = useState('stores');
  const [stores, setStores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showEditOrg, setShowEditOrg] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState(null);
  const [editOrgLoading, setEditOrgLoading] = useState(false);
  const [showDeleteOrg, setShowDeleteOrg] = useState(false);
  const [deleteTargetOrg, setDeleteTargetOrg] = useState(null);
  const [orgForm, setOrgForm] = useState({
    name: '',
    code: '',
    type: 'STORE',
    address: '',
    district: '',
    city: '',
    status: 'ACTIVE',
  });

  const [locations, setLocations] = useState([]);
  const [orgUnits, setOrgUnits] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locError, setLocError] = useState('');
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({
    org_unit_id: '',
    code: '',
    name: '',
  });
  const [locSearch, setLocSearch] = useState('');

  const loadStores = async () => {
    setLoading(true);
    setError('');
    const result = await workflowService.getOrgUnits();
    if (!result.success) {
      setError(result.message || 'Không tải được danh sách cửa hàng');
      setStores([]);
      setLoading(false);
      return;
    }
    const rows = getRows(result.data) || [];
    // Chỉ lấy STORE và KITCHEN cho tab Cửa hàng / Đơn vị
    setStores(rows.filter(u => ['KITCHEN', 'STORE'].includes((u.type || '').toUpperCase())));
    setLoading(false);
  };

  const loadOrgUnits = async () => {
    const result = await workflowService.getOrgUnits();
    if (result.success) {
      const rows = getRows(result.data) || [];
      setOrgUnits(rows.filter(u => ['KITCHEN', 'STORE'].includes((u.type || '').toUpperCase())));
    }
  };

  const loadLocations = async () => {
    setLocationsLoading(true);
    setLocError('');
    const result = await workflowService.getLocations();
    if (!result.success) {
      setLocError(result.message || 'Không tải được danh sách vị trí kho');
      setLocations([]);
      setLocationsLoading(false);
      return;
    }
    setLocations(getRows(result.data));
    setLocationsLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStores();
      loadOrgUnits();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (activeTab === 'locations') loadLocations();
  }, [activeTab]);

  useEffect(() => {
    if (!showEditOrg || !editingOrgId) return;
    let cancelled = false;
    (async () => {
      setEditOrgLoading(true);
      const res = await workflowService.getOrgUnit(editingOrgId);
      if (!cancelled && res.success && res.data) {
        const d = res.data;
        setOrgForm({
          name: d.name || '',
          code: d.code || '',
          type: (d.type || 'STORE').toUpperCase(),
          address: d.address || '',
          district: d.district || '',
          city: d.city || '',
          status: (d.status || 'ACTIVE').toUpperCase(),
        });
      }
      if (!cancelled) setEditOrgLoading(false);
    })();
    return () => { cancelled = true; };
  }, [showEditOrg, editingOrgId]);

  const openEditOrg = store => {
    setEditingOrgId(store._id);
    setShowEditOrg(true);
    setError('');
  };

  const openDeleteOrg = store => {
    setDeleteTargetOrg(store);
    setShowDeleteOrg(true);
    setError('');
  };

  const handleDeleteOrg = async () => {
    if (!deleteTargetOrg?._id) return;
    const id = deleteTargetOrg._id;
    setError('');
    const res = await workflowService.deleteOrgUnit(id);
    if (!res.success) {
      setError(res.message || 'Không thể xóa đơn vị');
      return;
    }
    setShowDeleteOrg(false);
    setDeleteTargetOrg(null);
    setSuccess('Đã xóa đơn vị thành công.');
    loadStores();
    loadOrgUnits();
    if (activeTab === 'locations') loadLocations();
  };

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 2200);
    return () => clearTimeout(t);
  }, [success]);

  const filteredStores = useMemo(() => {
    return stores.filter(store => {
      const status = (store.status || '').toUpperCase();
      const matchSearch =
        !searchTerm ||
        (store.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (store.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (store.address || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [stores, searchTerm, statusFilter]);

  const activeCount = stores.filter(s => (s.status || '').toUpperCase() === 'ACTIVE').length;

  const orgUnitMap = useMemo(() => {
    const map = new Map();
    orgUnits.forEach(u => {
      if (u && u._id) map.set(u._id, u);
    });
    return map;
  }, [orgUnits]);

  const filteredLocations = useMemo(() => {
    if (!locSearch.trim()) return locations;
    const q = locSearch.toLowerCase();
    return locations.filter(loc => {
      const unit =
        typeof loc.org_unit_id === 'object'
          ? loc.org_unit_id
          : orgUnitMap.get(loc.org_unit_id) || {};
      const name = loc.name || '';
      const code = loc.code || '';
      const unitName = unit.name || '';
      const address = [unit.address, unit.district, unit.city].filter(Boolean).join(', ');
      return (
        name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        unitName.toLowerCase().includes(q) ||
        address.toLowerCase().includes(q)
      );
    });
  }, [locations, locSearch, orgUnitMap]);

  const exportCsv = () => {
    if (!filteredStores.length) return;
    const rows = filteredStores.map(s => ({
      id: s._id,
      name: s.name || '',
      code: s.code || '',
      status: s.status || '',
      address: s.address || '',
      district: s.district || '',
      city: s.city || '',
    }));
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(',')]
      .concat(rows.map(r => keys.map(k => `"${(r[k] ?? '').toString().replace(/"/g, '""')}"`).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'stores_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className='space-y-6 animate-fade-in'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Quản lý Cửa hàng</h1>
          <p className='mt-1 text-muted-foreground'>Danh sách các cửa hàng và bếp trung tâm.</p>
        </div>
        <div className='flex gap-3'>
          {activeTab === 'stores' && (
            <>
              <button onClick={loadStores} className='btn-outline flex items-center gap-2' disabled={loading}>
                <RefreshCcw className='h-4 w-4' />
                Làm mới
              </button>
              <button onClick={exportCsv} className='btn-primary flex items-center gap-2'>
                <Download className='h-4 w-4' />
                Xuất
              </button>
              <button
                type='button'
                onClick={() => setShowCreateOrg(true)}
                className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'
              >
                <PlusCircle className='h-4 w-4' />
                Thêm đơn vị
              </button>
            </>
          )}
          {activeTab === 'locations' && (
            <>
              <button onClick={loadLocations} className='btn-outline flex items-center gap-2' disabled={locationsLoading}>
                <RefreshCcw className='h-4 w-4' />
                Làm mới
              </button>
              <button
                type='button'
                onClick={() => {
                  setLocationForm({ org_unit_id: orgUnits[0]?._id || '', code: '', name: '' });
                  setShowCreateLocation(true);
                }}
                className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'
              >
                <PlusCircle className='h-4 w-4' />
                Thêm vị trí kho
              </button>
            </>
          )}
        </div>
      </div>

      <div className='flex gap-2 border-b border-slate-200'>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type='button'
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <Icon className='h-4 w-4' />
            {label}
          </button>
        ))}
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}
      {activeTab === 'locations' && locError && <p className='text-sm text-red-600'>{locError}</p>}
      {success && (
        <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>
          {success}
        </div>
      )}
      {activeTab === 'stores' && loading && <p className='text-sm text-slate-500'>Đang tải dữ liệu...</p>}
      {activeTab === 'locations' && locationsLoading && <p className='text-sm text-slate-500'>Đang tải vị trí kho...</p>}

      {activeTab === 'stores' && (
        <>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='stat-card'>
              <p className='text-sm text-muted-foreground'>Tổng cửa hàng</p>
              <p className='mt-1 text-3xl font-bold'>{stores.length}</p>
            </div>
            <div className='stat-card'>
              <p className='text-sm text-muted-foreground'>Đang hoạt động</p>
              <p className='mt-1 text-3xl font-bold text-success'>{activeCount}</p>
            </div>
          </div>

          <div className='flex flex-col gap-4 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground' />
          <input
            type='text'
            placeholder='Tìm kiếm cửa hàng...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='input-field pl-11'
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className='input-field min-w-[170px]'>
          <option value='ALL'>Tất cả trạng thái</option>
          <option value='ACTIVE'>Hoạt động</option>
          <option value='INACTIVE'>Ngừng HĐ</option>
        </select>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {filteredStores.map(store => {
              const vis = getOrgUnitVisual(store);
              const isKitchen = (store.type || '').toUpperCase() === 'KITCHEN';
              return (
              <div
                key={store._id}
                className={`rounded-xl border p-5 transition-all hover:shadow-lg ${vis.cardClass}`}
              >
                <div className='mb-4 flex items-start justify-between gap-2'>
                  <div className='flex min-w-0 items-center gap-3'>
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${vis.iconBox}`}
                    >
                      {isKitchen ? (
                        <ChefHat className='h-6 w-6' strokeWidth={2} />
                      ) : (
                        <StoreIcon className='h-6 w-6' strokeWidth={2} />
                      )}
                    </div>
                    <div className='min-w-0'>
                      <div className='mb-1 flex flex-wrap items-center gap-2'>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${vis.chip}`}
                        >
                          {vis.label}
                        </span>
                      </div>
                      <h3 className='font-semibold text-slate-900'>{store.name || store._id}</h3>
                      <p className='text-sm text-slate-600'>{store.code || '-'}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => openEditOrg(store)}
                      className='rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-orange-600'
                      title='Sửa đơn vị'
                    >
                      <Pencil className='h-4 w-4' />
                    </button>
                    <button
                      type='button'
                      onClick={() => openDeleteOrg(store)}
                      className='rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600'
                      title='Xóa đơn vị'
                    >
                      <Trash2 className='h-4 w-4' />
                    </button>
                    <StatusBadge status={(store.status || '').toLowerCase()} />
                  </div>
                </div>

                <div className='text-sm text-slate-600'>
                  <div className='flex items-start gap-2'>
                    <MapPin className='mt-0.5 h-4 w-4 flex-shrink-0 opacity-80' />
                    <span>
                      {[store.address, store.district, store.city].filter(Boolean).join(', ') || 'Không có địa chỉ'}
                    </span>
                  </div>
                </div>
              </div>
            );
            })}
          </div>

          {!loading && !filteredStores.length && (
            <div className='py-12 text-center text-muted-foreground'>Không tìm thấy cửa hàng phù hợp</div>
          )}
        </>
      )}

      {activeTab === 'locations' && (
        <>
          <div className='relative flex-1 max-w-md'>
            <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground' />
            <input
              type='text'
              placeholder='Tìm vị trí kho (tên, mã, đơn vị)...'
              value={locSearch}
              onChange={e => setLocSearch(e.target.value)}
              className='input-field pl-11'
            />
          </div>
          <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
            <table className='w-full text-sm'>
              <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
                <tr>
                  <th className='px-4 py-3'>Mã</th>
                  <th className='px-4 py-3'>Tên</th>
                  <th className='px-4 py-3'>Đơn vị</th>
                  <th className='px-4 py-3'>Địa chỉ</th>
                  <th className='px-4 py-3'>Trạng thái</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {!filteredLocations.length && !locationsLoading && (
                  <tr>
                    <td colSpan={4} className='px-4 py-8 text-center text-slate-400'>
                      Chưa có vị trí kho nào.
                    </td>
                  </tr>
                )}
                {filteredLocations.map(loc => {
                  const unit =
                    typeof loc.org_unit_id === 'object'
                      ? loc.org_unit_id
                      : orgUnitMap.get(loc.org_unit_id);
                  const address = unit
                    ? [unit.address, unit.district, unit.city].filter(Boolean).join(', ')
                    : '';
                  return (
                    <tr key={loc._id} className='hover:bg-slate-50'>
                      <td className='px-4 py-3 font-medium text-slate-800'>{loc.code || '-'}</td>
                      <td className='px-4 py-3 text-slate-700'>{loc.name || '-'}</td>
                      <td className='px-4 py-3 text-slate-600'>{unit?.name || loc.org_unit_id || '-'}</td>
                      <td className='px-4 py-3 text-slate-600'>
                        {address || 'Không có địa chỉ'}
                      </td>
                      <td className='px-4 py-3'>
                        <StatusBadge status={(loc.status || 'ACTIVE').toLowerCase()} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showEditOrg && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4'
          onClick={() => { setShowEditOrg(false); setEditingOrgId(null); }}
        >
          <div
            className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Cập nhật đơn vị / cửa hàng</h2>
              <button
                type='button'
                onClick={() => { setShowEditOrg(false); setEditingOrgId(null); }}
                className='rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            {editOrgLoading ? (
              <p className='py-6 text-center text-slate-500'>Đang tải...</p>
            ) : (
              <form
                className='space-y-4'
                onSubmit={async e => {
                  e.preventDefault();
                  if (!editingOrgId) return;
                  setError('');
                  const payload = {
                    code: orgForm.code.trim() || undefined,
                    name: orgForm.name.trim(),
                    address: orgForm.address.trim() || undefined,
                    district: orgForm.district.trim() || undefined,
                    city: orgForm.city.trim() || undefined,
                    status: orgForm.status,
                  };
                  const res = await workflowService.updateOrgUnit(editingOrgId, payload);
                  if (!res.success) {
                    setError(res.message || 'Không thể cập nhật đơn vị');
                    return;
                  }
                  setShowEditOrg(false);
                  setEditingOrgId(null);
                  setSuccess('Cập nhật đơn vị thành công.');
                  loadStores();
                  loadOrgUnits();
                }}
              >
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <div>
                    <label className='block text-sm font-medium text-slate-700'>Tên đơn vị</label>
                    <input
                      type='text'
                      required
                      value={orgForm.name}
                      onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))}
                      className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700'>Mã (tùy chọn)</label>
                    <input
                      type='text'
                      value={orgForm.code}
                      onChange={e => setOrgForm(f => ({ ...f, code: e.target.value }))}
                      className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                    />
                  </div>
                </div>
                <div className='space-y-3'>
                  <div>
                    <label className='block text-sm font-medium text-slate-700'>Địa chỉ</label>
                    <input
                      type='text'
                      value={orgForm.address}
                      onChange={e => setOrgForm(f => ({ ...f, address: e.target.value }))}
                      placeholder='Ví dụ: 123 Nguyễn Văn Linh'
                      className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                    />
                  </div>
                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    <div>
                      <label className='block text-sm font-medium text-slate-700'>Quận / Huyện</label>
                      <input
                        type='text'
                        value={orgForm.district}
                        onChange={e => setOrgForm(f => ({ ...f, district: e.target.value }))}
                        placeholder='Ví dụ: Quận 7'
                        className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-slate-700'>Thành phố</label>
                      <input
                        type='text'
                        value={orgForm.city}
                        onChange={e => setOrgForm(f => ({ ...f, city: e.target.value }))}
                        placeholder='Ví dụ: TP. Hồ Chí Minh'
                        className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Loại</label>
                  <input
                    type='text'
                    value={orgForm.type}
                    readOnly
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500'
                  />
                  <p className='mt-0.5 text-xs text-slate-400'>Không thể đổi loại khi cập nhật</p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Trạng thái</label>
                  <select
                    value={orgForm.status}
                    onChange={e => setOrgForm(f => ({ ...f, status: e.target.value }))}
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                  >
                    <option value='ACTIVE'>ACTIVE</option>
                    <option value='INACTIVE'>INACTIVE</option>
                  </select>
                </div>
                <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                  <button
                    type='button'
                    onClick={() => { setShowEditOrg(false); setEditingOrgId(null); }}
                    className='rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
                  >
                    Hủy
                  </button>
                  <button
                    type='submit'
                    className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600'
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showCreateOrg && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4'
          onClick={() => setShowCreateOrg(false)}
        >
          <div
            className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Thêm đơn vị / cửa hàng</h2>
              <button
                type='button'
                onClick={() => setShowCreateOrg(false)}
                className='rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            <form
              className='space-y-4'
              onSubmit={async e => {
                e.preventDefault();
                setError('');
                const payload = {
                  name: orgForm.name.trim(),
                  code: orgForm.code.trim() || undefined,
                  type: orgForm.type,
                  address: orgForm.address.trim() || undefined,
                  district: orgForm.district.trim() || undefined,
                  city: orgForm.city.trim() || undefined,
                  status: orgForm.status,
                };
                const res = await workflowService.createOrgUnit(payload);
                if (!res.success) {
                  setError(res.message || 'Không thể tạo đơn vị');
                  return;
                }
                setOrgForm({ name: '', code: '', type: 'STORE', address: '', district: '', city: '', status: 'ACTIVE' });
                setShowCreateOrg(false);
                setSuccess('Tạo đơn vị / cửa hàng mới thành công.');
                loadStores();
                loadOrgUnits();
              }}
            >
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Tên đơn vị</label>
                  <input
                    type='text'
                    required
                    value={orgForm.name}
                    onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))}
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Mã (tùy chọn)</label>
                  <input
                    type='text'
                    value={orgForm.code}
                    onChange={e => setOrgForm(f => ({ ...f, code: e.target.value }))}
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                  />
                </div>
              </div>
              <div className='space-y-3'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Địa chỉ</label>
                  <input
                    type='text'
                    value={orgForm.address}
                    onChange={e => setOrgForm(f => ({ ...f, address: e.target.value }))}
                    placeholder='Ví dụ: 123 Nguyễn Văn Linh'
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                  />
                </div>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <div>
                    <label className='block text-sm font-medium text-slate-700'>Quận / Huyện</label>
                    <input
                      type='text'
                      value={orgForm.district}
                      onChange={e => setOrgForm(f => ({ ...f, district: e.target.value }))}
                      placeholder='Ví dụ: Quận 7'
                      className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700'>Thành phố</label>
                    <input
                      type='text'
                      value={orgForm.city}
                      onChange={e => setOrgForm(f => ({ ...f, city: e.target.value }))}
                      placeholder='Ví dụ: TP. Hồ Chí Minh'
                      className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                    />
                  </div>
                </div>
              </div>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Loại</label>
                  <select
                    value={orgForm.type}
                    onChange={e => setOrgForm(f => ({ ...f, type: e.target.value }))}
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                  >
                    <option value='STORE'>STORE</option>
                    <option value='KITCHEN'>KITCHEN</option>
                    <option value='OTHER'>OTHER</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Trạng thái</label>
                  <select
                    value={orgForm.status}
                    onChange={e => setOrgForm(f => ({ ...f, status: e.target.value }))}
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                  >
                    <option value='ACTIVE'>ACTIVE</option>
                    <option value='INACTIVE'>INACTIVE</option>
                  </select>
                </div>
              </div>
              <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                <button
                  type='button'
                  onClick={() => setShowCreateOrg(false)}
                  className='rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600'
                >
                  Lưu đơn vị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateLocation && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4'
          onClick={() => setShowCreateLocation(false)}
        >
          <div
            className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Thêm vị trí kho</h2>
              <button
                type='button'
                onClick={() => setShowCreateLocation(false)}
                className='rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            <form
              className='space-y-4'
              onSubmit={async e => {
                e.preventDefault();
                setLocError('');
                const payload = {
                  org_unit_id: locationForm.org_unit_id,
                  code: locationForm.code.trim(),
                  name: locationForm.name.trim(),
                };
                const res = await workflowService.createLocation(payload);
                if (!res.success) {
                  setLocError(res.message || 'Không thể tạo vị trí kho');
                  return;
                }
                setLocationForm({ org_unit_id: orgUnits[0]?._id || '', code: '', name: '' });
                setShowCreateLocation(false);
                setSuccess('Tạo vị trí kho mới thành công.');
                loadLocations();
              }}
            >
              <div>
                <label className='block text-sm font-medium text-slate-700'>Đơn vị / Cửa hàng</label>
                <select
                  required
                  value={locationForm.org_unit_id}
                  onChange={e => setLocationForm(f => ({ ...f, org_unit_id: e.target.value }))}
                  className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                >
                  <option value=''>Chọn đơn vị</option>
                  {orgUnits.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700'>Mã vị trí</label>
                <input
                  type='text'
                  required
                  value={locationForm.code}
                  onChange={e => setLocationForm(f => ({ ...f, code: e.target.value }))}
                  className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700'>Tên vị trí</label>
                <input
                  type='text'
                  required
                  value={locationForm.name}
                  onChange={e => setLocationForm(f => ({ ...f, name: e.target.value }))}
                  className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                />
              </div>
              <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                <button
                  type='button'
                  onClick={() => setShowCreateLocation(false)}
                  className='rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600'
                >
                  Lưu vị trí kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteOrg && deleteTargetOrg && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4'
          onClick={() => { setShowDeleteOrg(false); setDeleteTargetOrg(null); }}
        >
          <div
            className='w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center gap-3 text-red-600'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-red-100'>
                <Trash2 className='h-5 w-5' />
              </div>
              <h2 className='text-lg font-semibold text-slate-900'>Xóa đơn vị</h2>
            </div>
            <p className='mb-6 text-sm text-slate-600'>
              Bạn có chắc muốn xóa đơn vị <strong>{deleteTargetOrg.name || deleteTargetOrg.code || deleteTargetOrg._id}</strong>? Hành động này không thể hoàn tác.
            </p>
            <div className='flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => { setShowDeleteOrg(false); setDeleteTargetOrg(null); }}
                className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
              >
                Hủy
              </button>
              <button
                type='button'
                onClick={handleDeleteOrg}
                className='rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600'
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
