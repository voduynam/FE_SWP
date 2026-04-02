import { useCallback, useEffect, useMemo, useState } from 'react';
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
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import StatusBadge from '../../components/ui/StatusBadges';
import ModalPortal from '../../components/ui/ModalPortal';
import { workflowService } from '../../services/workflowService';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!Array.isArray(points) || points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 15);
      return;
    }
    const bounds = points.map(p => [p.latitude, p.longitude]);
    map.fitBounds(bounds, { padding: [28, 28] });
  }, [map, points]);
  return null;
}

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
  const [editOrgCoord, setEditOrgCoord] = useState({ latitude: '', longitude: '' });
  const [editOrgGeoLoading, setEditOrgGeoLoading] = useState(false);
  const [editOrgGeoError, setEditOrgGeoError] = useState('');
  const [editOrgGeoKey, setEditOrgGeoKey] = useState('');
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
  const [createOrgCoord, setCreateOrgCoord] = useState({ latitude: '', longitude: '' });
  const [createOrgGeoLoading, setCreateOrgGeoLoading] = useState(false);
  const [createOrgGeoError, setCreateOrgGeoError] = useState('');

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
  const [selectedMapOrgUnit, setSelectedMapOrgUnit] = useState(null);
  const [detailOrgUnit, setDetailOrgUnit] = useState(null);
  const [aggregateMapModal, setAggregateMapModal] = useState(null);
  const [coordEditorOpen, setCoordEditorOpen] = useState(false);
  const [coordTargetOrg, setCoordTargetOrg] = useState(null);
  const [coordForm, setCoordForm] = useState({ latitude: '', longitude: '' });
  const [coordAddressHint, setCoordAddressHint] = useState('');
  const [coordSaving, setCoordSaving] = useState(false);
  const [coordGeoLoading, setCoordGeoLoading] = useState(false);
  const [coordError, setCoordError] = useState('');

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
        const lat = d?.coordinates?.latitude;
        const lng = d?.coordinates?.longitude;
        setEditOrgCoord({
          latitude: Number.isFinite(Number(lat)) ? String(lat) : '',
          longitude: Number.isFinite(Number(lng)) ? String(lng) : '',
        });
        setEditOrgGeoError('');
        setEditOrgGeoKey('');
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

  const storeMapPoints = useMemo(() => {
    return filteredStores
      .map(unit => {
        const coords = getOrgUnitCoordinates(unit);
        if (!coords) return null;
        return {
          id: unit._id,
          name: unit.name || unit.code || unit._id,
          type: (unit.type || '').toUpperCase(),
          ...coords,
        };
      })
      .filter(Boolean);
  }, [filteredStores]);

  const locationMapPoints = useMemo(() => {
    return filteredLocations
      .map(loc => {
        const unit =
          typeof loc.org_unit_id === 'object'
            ? loc.org_unit_id
            : orgUnitMap.get(loc.org_unit_id);
        const coords = getOrgUnitCoordinates(unit);
        if (!coords) return null;
        return {
          id: loc._id,
          name: `${loc.name || loc.code || loc._id} - ${unit?.name || ''}`.trim(),
          type: (unit?.type || '').toUpperCase(),
          ...coords,
        };
      })
      .filter(Boolean);
  }, [filteredLocations, orgUnitMap]);

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

  function getOrgUnitCoordinates(unit) {
    const lat = unit?.coordinates?.latitude;
    const lng = unit?.coordinates?.longitude;
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return null;
    return { latitude: nLat, longitude: nLng };
  }

  const toggleOrgUnitMap = orgUnit => {
    if (!orgUnit?._id) return;
    setSelectedMapOrgUnit(prev => (prev?._id === orgUnit._id ? null : orgUnit));
  };

  const openAggregateMapModal = (title, points) => {
    if (!Array.isArray(points) || !points.length) return;
    setAggregateMapModal({ title, points });
  };

  const openCreateOrgModal = () => {
    setOrgForm({ name: '', code: '', type: 'STORE', address: '', district: '', city: '', status: 'ACTIVE' });
    setCreateOrgCoord({ latitude: '', longitude: '' });
    setCreateOrgGeoError('');
    setShowCreateOrg(true);
  };

  const closeCreateOrgModal = () => {
    if (createOrgGeoLoading) return;
    setShowCreateOrg(false);
    setCreateOrgGeoError('');
  };

  const reverseGeocodeForCreateOrg = async (latitude, longitude) => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setCreateOrgGeoLoading(true);
    setCreateOrgGeoError('');
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: String(lat),
        lon: String(lng),
        addressdetails: '1',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
      if (!response.ok) throw new Error('Không thể lấy địa chỉ từ tọa độ.');
      const data = await response.json();
      const addr = data?.address || {};
      const road = [addr.house_number, addr.road].filter(Boolean).join(' ');
      const ward =
        addr.suburb ||
        addr.neighbourhood ||
        addr.village ||
        addr.hamlet ||
        addr.quarter ||
        addr.city_district ||
        addr.district ||
        addr.county ||
        '';
      const city = addr.city || addr.town || addr.province || addr.state || '';
      const fallbackAddress = data?.display_name ? data.display_name.split(',').slice(0, 2).join(',').trim() : '';

      setOrgForm(prev => ({
        ...prev,
        address: road || prev.address || fallbackAddress || '',
        district: ward || prev.district || '',
        city: city || prev.city || '',
      }));
    } catch (err) {
      setCreateOrgGeoError(err?.message || 'Không thể tự động điền địa chỉ từ map.');
    } finally {
      setCreateOrgGeoLoading(false);
    }
  };

  const reverseGeocodeForEditOrg = useCallback(async (latitude, longitude) => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (key === editOrgGeoKey) return;

    setEditOrgGeoLoading(true);
    setEditOrgGeoError('');
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: String(lat),
        lon: String(lng),
        addressdetails: '1',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
      if (!response.ok) throw new Error('Không thể lấy địa chỉ từ tọa độ.');
      const data = await response.json();
      const addr = data?.address || {};
      const road = [addr.house_number, addr.road].filter(Boolean).join(' ');
      const ward =
        addr.suburb ||
        addr.neighbourhood ||
        addr.village ||
        addr.hamlet ||
        addr.quarter ||
        addr.city_district ||
        addr.district ||
        addr.county ||
        '';
      const city = addr.city || addr.town || addr.province || addr.state || '';
      const fallbackAddress = data?.display_name ? data.display_name.split(',').slice(0, 2).join(',').trim() : '';

      setOrgForm(prev => ({
        ...prev,
        address: road || prev.address || fallbackAddress || '',
        district: ward || prev.district || '',
        city: city || prev.city || '',
      }));
      setEditOrgGeoKey(key);
    } catch (err) {
      setEditOrgGeoError(err?.message || 'Không thể tự động điền địa chỉ từ tọa độ.');
    } finally {
      setEditOrgGeoLoading(false);
    }
  }, [editOrgGeoKey]);

  useEffect(() => {
    if (!showEditOrg) return;
    const lat = Number(editOrgCoord.latitude);
    const lng = Number(editOrgCoord.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const timer = setTimeout(() => {
      reverseGeocodeForEditOrg(lat, lng);
    }, 700);
    return () => clearTimeout(timer);
  }, [showEditOrg, editOrgCoord.latitude, editOrgCoord.longitude, reverseGeocodeForEditOrg]);

  const openCoordEditor = orgUnit => {
    const coords = getOrgUnitCoordinates(orgUnit);
    setCoordTargetOrg(orgUnit);
    setCoordForm({
      latitude: coords ? String(coords.latitude) : '',
      longitude: coords ? String(coords.longitude) : '',
    });
    setCoordAddressHint([orgUnit?.address, orgUnit?.district, orgUnit?.city].filter(Boolean).join(', '));
    setCoordError('');
    setCoordEditorOpen(true);
  };

  const saveCoordinates = async e => {
    e.preventDefault();
    if (!coordTargetOrg?._id) return;
    const latitude = Number(coordForm.latitude);
    const longitude = Number(coordForm.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setCoordError('Vui lòng nhập tọa độ hợp lệ.');
      return;
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setCoordError('Latitude phải trong [-90, 90], Longitude trong [-180, 180].');
      return;
    }
    setCoordSaving(true);
    setCoordError('');
    const res = await workflowService.updateOrgUnitCoordinates(coordTargetOrg._id, {
      latitude,
      longitude,
    });
    setCoordSaving(false);
    if (!res.success) {
      setCoordError(res.message || 'Không thể cập nhật tọa độ.');
      return;
    }
    setCoordEditorOpen(false);
    setSuccess('Đã cập nhật tọa độ thành công.');
    await loadStores();
    await loadOrgUnits();
    if (activeTab === 'locations') await loadLocations();
    const updatedUnit = { ...coordTargetOrg, coordinates: { latitude, longitude } };
    setSelectedMapOrgUnit(updatedUnit);
  };

  const geocodeForCoordEditor = async () => {
    const address = coordAddressHint.trim();
    if (!address) {
      setCoordError('Vui lòng nhập địa chỉ để tìm tọa độ.');
      return;
    }
    setCoordGeoLoading(true);
    setCoordError('');
    const res = await workflowService.geocodeAddress({ address });
    setCoordGeoLoading(false);
    if (!res.success) {
      setCoordError(res.message || 'Không thể chuyển đổi địa chỉ thành tọa độ.');
      return;
    }
    const data = res.data?.data ?? res.data;
    const lat = data?.coordinates?.latitude;
    const lng = data?.coordinates?.longitude;
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      setCoordError('Không nhận được tọa độ hợp lệ từ địa chỉ đã nhập.');
      return;
    }
    setCoordForm({
      latitude: String(lat),
      longitude: String(lng),
    });
  };

  const fillCoordFromCurrentLocation = () => {
    if (!navigator?.geolocation) {
      setCoordError('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    if (!window.isSecureContext) {
      setCoordError('Định vị chỉ hoạt động trên HTTPS hoặc localhost. Hãy bật HTTPS hoặc dùng nút "Tìm theo địa chỉ".');
      return;
    }
    setCoordGeoLoading(true);
    setCoordError('');
    navigator.geolocation.getCurrentPosition(
      position => {
        setCoordGeoLoading(false);
        setCoordForm({
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        });
      },
      (err) => {
        setCoordGeoLoading(false);
        if (err?.code === 1) {
          setCoordError('Bạn đã từ chối quyền vị trí. Hãy cho phép Location trong trình duyệt rồi thử lại.');
        } else if (err?.code === 2) {
          setCoordError('Không xác định được vị trí hiện tại. Vui lòng thử lại hoặc dùng "Tìm theo địa chỉ".');
        } else if (err?.code === 3) {
          setCoordError('Lấy vị trí bị timeout. Vui lòng thử lại hoặc dùng "Tìm theo địa chỉ".');
        } else {
          setCoordError('Không thể lấy vị trí hiện tại. Hãy kiểm tra quyền truy cập vị trí.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
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
                onClick={openCreateOrgModal}
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
        {TABS.map(({ id, label }) => (
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

          <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground' />
              <input
                type='text'
                placeholder='Tìm kiếm cửa hàng...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='input-field w-full pl-11'
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className='input-field min-w-[170px]'>
              <option value='ALL'>Tất cả trạng thái</option>
              <option value='ACTIVE'>Hoạt động</option>
              <option value='INACTIVE'>Ngừng HĐ</option>
            </select>
            {storeMapPoints.length > 0 && (
              <button
                type='button'
                onClick={() => openAggregateMapModal('Bản đồ tổng cửa hàng / bếp', storeMapPoints)}
                className='inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow'
              >
                <MapPin className='h-3.5 w-3.5' />
                Bản đồ tổng ({storeMapPoints.length})
              </button>
            )}
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {filteredStores.map(store => {
              const vis = getOrgUnitVisual(store);
              const isKitchen = (store.type || '').toUpperCase() === 'KITCHEN';
              const coords = getOrgUnitCoordinates(store);
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
                    <div className='space-y-1'>
                      <span className='block'>
                      {[store.address, store.district, store.city].filter(Boolean).join(', ') || 'Không có địa chỉ'}
                      </span>
                      <div className='flex flex-wrap items-center gap-2'>
                        <button
                          type='button'
                          onClick={() => setDetailOrgUnit(store)}
                          className='rounded border border-indigo-300 px-2 py-0.5 text-xs text-indigo-700 hover:bg-indigo-50'
                        >
                          Chi tiết
                        </button>
                        <button
                          type='button'
                          onClick={() => toggleOrgUnitMap(store)}
                          className='rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100'
                        >
                          {selectedMapOrgUnit?._id === store._id ? 'Ẩn map' : 'Xem map'}
                        </button>
                        <button
                          type='button'
                          onClick={() => openCoordEditor(store)}
                          className='rounded border border-orange-300 px-2 py-0.5 text-xs text-orange-700 hover:bg-orange-50'
                        >
                          Chỉnh tọa độ
                        </button>
                        {coords && (
                          <span className='text-xs text-slate-500'>
                            {coords.latitude}, {coords.longitude}
                          </span>
                        )}
                      </div>
                    </div>
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
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
            <div className='relative flex-1 max-w-md'>
              <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground' />
              <input
                type='text'
                placeholder='Tìm vị trí kho (tên, mã, đơn vị)...'
                value={locSearch}
                onChange={e => setLocSearch(e.target.value)}
                className='input-field w-full pl-11'
              />
            </div>
            {locationMapPoints.length > 0 && (
              <button
                type='button'
                onClick={() => openAggregateMapModal('Bản đồ tổng vị trí kho', locationMapPoints)}
                className='inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow'
              >
                <MapPin className='h-3.5 w-3.5' />
                Bản đồ tổng ({locationMapPoints.length})
              </button>
            )}
          </div>
          <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
            <table className='w-full text-sm'>
              <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
                <tr>
                  <th className='px-4 py-3'>Mã</th>
                  <th className='px-4 py-3'>Tên</th>
                  <th className='px-4 py-3'>Đơn vị</th>
                  <th className='px-4 py-3'>Địa chỉ</th>
                  <th className='px-4 py-3'>Tọa độ / Map</th>
                  <th className='px-4 py-3'>Trạng thái</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {!filteredLocations.length && !locationsLoading && (
                  <tr>
                    <td colSpan={6} className='px-4 py-8 text-center text-slate-400'>
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
                  const coords = getOrgUnitCoordinates(unit);
                  const query = coords ? `${coords.latitude},${coords.longitude}` : null;
                  return (
                    <tr key={loc._id} className='hover:bg-slate-50'>
                      <td className='px-4 py-3 font-medium text-slate-800'>{loc.code || '-'}</td>
                      <td className='px-4 py-3 text-slate-700'>{loc.name || '-'}</td>
                      <td className='px-4 py-3 text-slate-600'>{unit?.name || loc.org_unit_id || '-'}</td>
                      <td className='px-4 py-3 text-slate-600'>
                        {address || 'Không có địa chỉ'}
                      </td>
                      <td className='px-4 py-3 text-slate-600'>
                        {coords ? (
                          <div className='flex items-center gap-2'>
                            <button
                              type='button'
                              onClick={() => toggleOrgUnitMap(unit || null)}
                              disabled={!unit}
                              className='rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100'
                            >
                              {selectedMapOrgUnit?._id === unit?._id ? 'Ẩn map' : 'Xem map'}
                            </button>
                            <button
                              type='button'
                              onClick={() => unit && openCoordEditor(unit)}
                              disabled={!unit}
                              className='rounded border border-orange-300 px-2 py-0.5 text-xs text-orange-700 hover:bg-orange-50'
                            >
                              Chỉnh
                            </button>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-xs text-indigo-700 hover:text-indigo-900'
                            >
                              Google Maps
                            </a>
                          </div>
                        ) : (
                          <button
                            type='button'
                            onClick={() => unit && openCoordEditor(unit)}
                            disabled={!unit}
                            className='rounded border border-amber-300 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-50'
                          >
                            Thêm tọa độ
                          </button>
                        )}
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

      {aggregateMapModal && (
        <ModalPortal>
        <div
          className='fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/45 px-4'
          onClick={() => setAggregateMapModal(null)}
        >
          <div
            className='w-full max-w-6xl rounded-2xl bg-white p-4 shadow-2xl md:p-5'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-3 flex items-center justify-between gap-3'>
              <h3 className='text-sm font-semibold text-slate-900 md:text-base'>
                {aggregateMapModal.title}
              </h3>
              <button
                type='button'
                onClick={() => setAggregateMapModal(null)}
                className='rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100'
              >
                Đóng
              </button>
            </div>
            <div className='overflow-hidden rounded-xl border border-slate-200'>
              <MapContainer
                center={[aggregateMapModal.points[0].latitude, aggregateMapModal.points[0].longitude]}
                zoom={12}
                style={{ height: '72vh', minHeight: '440px', width: '100%', zIndex: 0 }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                />
                <FitBounds points={aggregateMapModal.points} />
                {aggregateMapModal.points.map(p => (
                  <Marker key={p.id} position={[p.latitude, p.longitude]} />
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {selectedMapOrgUnit && (() => {
        const coords = getOrgUnitCoordinates(selectedMapOrgUnit);
        const query = coords ? `${coords.latitude},${coords.longitude}` : '';
        return (
          <ModalPortal>
          <div
            className='fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/45 px-4'
            onClick={() => setSelectedMapOrgUnit(null)}
          >
            <div
              className='w-full max-w-5xl rounded-2xl bg-white p-4 shadow-2xl md:p-5'
              onClick={e => e.stopPropagation()}
            >
              <div className='mb-3 flex items-center justify-between gap-3'>
                <h3 className='text-sm font-semibold text-slate-900 md:text-base'>
                  Bản đồ: {selectedMapOrgUnit.name || selectedMapOrgUnit.code || selectedMapOrgUnit._id}
                </h3>
                <div className='flex items-center gap-2'>
                  {coords && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='rounded border border-indigo-300 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50'
                    >
                      Mở Google Maps
                    </a>
                  )}
                  <button
                    type='button'
                    onClick={() => setSelectedMapOrgUnit(null)}
                    className='rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100'
                  >
                    Đóng
                  </button>
                </div>
              </div>

              {!coords ? (
                <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700'>
                  <p>Đơn vị này chưa có tọa độ. Hãy cập nhật để xem bản đồ.</p>
                  <div className='mt-3'>
                    <button
                      type='button'
                      onClick={() => {
                        setSelectedMapOrgUnit(null);
                        openCoordEditor(selectedMapOrgUnit);
                      }}
                      className='rounded border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100'
                    >
                      Chỉnh tọa độ
                    </button>
                  </div>
                </div>
              ) : (
                <div className='overflow-hidden rounded-xl border border-slate-200'>
                  <MapContainer
                    center={[coords.latitude, coords.longitude]}
                    zoom={16}
                    style={{ height: '70vh', minHeight: '420px', width: '100%', zIndex: 0 }}
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    />
                    <Marker position={[coords.latitude, coords.longitude]} />
                  </MapContainer>
                </div>
              )}
            </div>
          </div>
          </ModalPortal>
        );
      })()}

      {detailOrgUnit && (() => {
        const coords = getOrgUnitCoordinates(detailOrgUnit);
        const query = coords ? `${coords.latitude},${coords.longitude}` : '';
        return (
          <ModalPortal>
          <div
            className='fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/45 px-4'
            onClick={() => setDetailOrgUnit(null)}
          >
            <div
              className='w-full max-w-5xl rounded-2xl bg-white p-4 shadow-2xl md:p-5'
              onClick={e => e.stopPropagation()}
            >
              <div className='mb-3 flex items-center justify-between gap-3'>
                <h3 className='text-sm font-semibold text-slate-900 md:text-base'>
                  Chi tiết đơn vị: {detailOrgUnit.name || detailOrgUnit.code || detailOrgUnit._id}
                </h3>
                <button
                  type='button'
                  onClick={() => setDetailOrgUnit(null)}
                  className='rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100'
                >
                  Đóng
                </button>
              </div>

              <div className='mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 md:grid-cols-2'>
                <p><span className='font-medium text-slate-900'>Mã:</span> {detailOrgUnit.code || '-'}</p>
                <p><span className='font-medium text-slate-900'>Loại:</span> {detailOrgUnit.type || '-'}</p>
                <p><span className='font-medium text-slate-900'>Trạng thái:</span> {detailOrgUnit.status || '-'}</p>
                <p>
                  <span className='font-medium text-slate-900'>Địa chỉ:</span>{' '}
                  {[detailOrgUnit.address, detailOrgUnit.district, detailOrgUnit.city].filter(Boolean).join(', ') || '-'}
                </p>
                <p className='md:col-span-2'>
                  <span className='font-medium text-slate-900'>Tọa độ:</span>{' '}
                  {coords ? `${coords.latitude}, ${coords.longitude}` : 'Chưa có'}
                </p>
              </div>

              {!coords ? (
                <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700'>
                  <p>Đơn vị này chưa có tọa độ. Hãy cập nhật để hiển thị bản đồ.</p>
                  <div className='mt-3'>
                    <button
                      type='button'
                      onClick={() => {
                        setDetailOrgUnit(null);
                        openCoordEditor(detailOrgUnit);
                      }}
                      className='rounded border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100'
                    >
                      Chỉnh tọa độ
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className='mb-2 flex justify-end'>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='rounded border border-indigo-300 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50'
                    >
                      Mở Google Maps
                    </a>
                  </div>
                  <div className='overflow-hidden rounded-xl border border-slate-200'>
                    <MapContainer
                      center={[coords.latitude, coords.longitude]}
                      zoom={16}
                      style={{ height: '62vh', minHeight: '400px', width: '100%', zIndex: 0 }}
                    >
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                      />
                      <Marker position={[coords.latitude, coords.longitude]} />
                    </MapContainer>
                  </div>
                </>
              )}
            </div>
          </div>
          </ModalPortal>
        );
      })()}

      {coordEditorOpen && coordTargetOrg && (
        <ModalPortal>
        <div
          className='fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 px-4'
          onClick={() => !coordSaving && setCoordEditorOpen(false)}
        >
          <div
            className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Cập nhật tọa độ</h2>
              <button
                type='button'
                onClick={() => !coordSaving && setCoordEditorOpen(false)}
                className='rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            <p className='mb-3 text-sm text-slate-600'>
              {coordTargetOrg.name || coordTargetOrg.code || coordTargetOrg._id}
            </p>
            {coordError && <p className='mb-3 text-sm text-red-600'>{coordError}</p>}
            <form className='space-y-3' onSubmit={saveCoordinates}>
              <div>
                <label className='block text-sm font-medium text-slate-700'>Tìm theo địa chỉ</label>
                <div className='mt-1 flex gap-2'>
                  <input
                    type='text'
                    value={coordAddressHint}
                    onChange={e => setCoordAddressHint(e.target.value)}
                    placeholder='Nhập địa chỉ để tự lấy lat/lng'
                    className='h-9 w-full rounded-lg border border-slate-200 px-3 text-sm'
                  />
                  <button
                    type='button'
                    onClick={geocodeForCoordEditor}
                    disabled={coordGeoLoading}
                    className='rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60'
                  >
                    Tìm
                  </button>
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700'>Latitude</label>
                <input
                  type='number'
                  step='any'
                  value={coordForm.latitude}
                  onChange={e => setCoordForm(prev => ({ ...prev, latitude: e.target.value }))}
                  className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700'>Longitude</label>
                <input
                  type='number'
                  step='any'
                  value={coordForm.longitude}
                  onChange={e => setCoordForm(prev => ({ ...prev, longitude: e.target.value }))}
                  className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm'
                  required
                />
              </div>
              <div className='flex justify-start'>
                <button
                  type='button'
                  onClick={fillCoordFromCurrentLocation}
                  disabled={coordGeoLoading}
                  className='rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60'
                >
                  {coordGeoLoading ? 'Đang lấy vị trí...' : 'Dùng vị trí hiện tại'}
                </button>
              </div>
              {Number.isFinite(Number(coordForm.latitude)) && Number.isFinite(Number(coordForm.longitude)) && (
                <div className='rounded-lg border border-indigo-200 bg-indigo-50/60 p-2'>
                  <p className='mb-2 text-xs font-medium text-indigo-700'>
                    Preview map ({coordForm.latitude}, {coordForm.longitude}) - Click trên map để chọn điểm
                  </p>
                  <div className='overflow-hidden rounded border border-indigo-100'>
                    <MapContainer
                      center={[Number(coordForm.latitude), Number(coordForm.longitude)]}
                      zoom={16}
                      style={{ height: '280px', width: '100%', zIndex: 0 }}
                    >
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                      />
                      <Marker position={[Number(coordForm.latitude), Number(coordForm.longitude)]} />
                      <MapClickHandler
                        onPick={({ lat, lng }) =>
                          setCoordForm({
                            latitude: String(Number(lat.toFixed(7))),
                            longitude: String(Number(lng.toFixed(7))),
                          })
                        }
                      />
                    </MapContainer>
                  </div>
                </div>
              )}
              <div className='flex justify-end gap-2 border-t border-slate-200 pt-3'>
                <button
                  type='button'
                  onClick={() => setCoordEditorOpen(false)}
                  className='rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  disabled={coordSaving}
                  className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60'
                >
                  {coordSaving ? 'Đang lưu...' : 'Lưu tọa độ'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {showEditOrg && (
        <ModalPortal>
        <div
          className='fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 px-4'
          onClick={() => { setShowEditOrg(false); setEditingOrgId(null); }}
        >
          <div
            className='w-full max-w-6xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto md:p-7'
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
                  const lat = Number(editOrgCoord.latitude);
                  const lng = Number(editOrgCoord.longitude);
                  if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    const coordRes = await workflowService.updateOrgUnitCoordinates(editingOrgId, {
                      latitude: lat,
                      longitude: lng,
                    });
                    if (!coordRes.success) {
                      setError(coordRes.message || 'Đã cập nhật thông tin nhưng lưu tọa độ thất bại.');
                      return;
                    }
                  }
                  setShowEditOrg(false);
                  setEditingOrgId(null);
                  setEditOrgCoord({ latitude: '', longitude: '' });
                  setSuccess('Cập nhật đơn vị thành công.');
                  loadStores();
                  loadOrgUnits();
                }}
              >
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                  <div className='space-y-3'>
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
                        <label className='block text-sm font-medium text-slate-700'>Phường / Xã</label>
                        <input
                          type='text'
                          value={orgForm.district}
                          onChange={e => setOrgForm(f => ({ ...f, district: e.target.value }))}
                          placeholder='Ví dụ: Phường 5'
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
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                      <div>
                        <label className='block text-sm font-medium text-slate-700'>Latitude</label>
                        <input
                          type='number'
                          step='any'
                          value={editOrgCoord.latitude}
                          onChange={e => setEditOrgCoord(prev => ({ ...prev, latitude: e.target.value }))}
                          className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm'
                          placeholder='Ví dụ: 10.7769'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-slate-700'>Longitude</label>
                        <input
                          type='number'
                          step='any'
                          value={editOrgCoord.longitude}
                          onChange={e => setEditOrgCoord(prev => ({ ...prev, longitude: e.target.value }))}
                          className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm'
                          placeholder='Ví dụ: 106.7009'
                        />
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
                  </div>
                  <div>
                    <p className='mb-2 text-sm font-medium text-slate-700'>Chỉnh tọa độ trên map</p>
                    <div className='overflow-hidden rounded-lg border border-slate-200'>
                      <MapContainer
                        key={`${editOrgCoord.latitude || 'empty'}-${editOrgCoord.longitude || 'empty'}`}
                        center={
                          Number.isFinite(Number(editOrgCoord.latitude)) && Number.isFinite(Number(editOrgCoord.longitude))
                            ? [Number(editOrgCoord.latitude), Number(editOrgCoord.longitude)]
                            : [10.7769, 106.7009]
                        }
                        zoom={15}
                        style={{ height: '360px', width: '100%', zIndex: 0 }}
                      >
                        <TileLayer
                          attribution='&copy; OpenStreetMap contributors'
                          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                        />
                        {Number.isFinite(Number(editOrgCoord.latitude)) &&
                          Number.isFinite(Number(editOrgCoord.longitude)) && (
                            <Marker position={[Number(editOrgCoord.latitude), Number(editOrgCoord.longitude)]} />
                          )}
                        <MapClickHandler
                          onPick={({ lat, lng }) => {
                            const next = {
                              latitude: String(Number(lat.toFixed(7))),
                              longitude: String(Number(lng.toFixed(7))),
                            };
                            setEditOrgCoord(next);
                            reverseGeocodeForEditOrg(next.latitude, next.longitude);
                          }}
                        />
                      </MapContainer>
                    </div>
                    <p className='mt-2 text-xs text-slate-500'>Click trên map để cập nhật nhanh tọa độ.</p>
                    {editOrgGeoLoading && (
                      <p className='mt-1 text-xs text-indigo-700'>Đang tự động điền địa chỉ từ tọa độ...</p>
                    )}
                    {editOrgGeoError && <p className='mt-1 text-xs text-amber-700'>{editOrgGeoError}</p>}
                  </div>
                </div>
                <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                  <button
                    type='button'
                    onClick={() => {
                      setShowEditOrg(false);
                      setEditingOrgId(null);
                      setEditOrgCoord({ latitude: '', longitude: '' });
                      setEditOrgGeoError('');
                      setEditOrgGeoKey('');
                    }}
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
        </ModalPortal>
      )}

      {showCreateOrg && (
        <ModalPortal>
        <div
          className='fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 px-4'
          onClick={closeCreateOrgModal}
        >
          <div
            className='w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Thêm đơn vị / cửa hàng</h2>
              <button
                type='button'
                onClick={closeCreateOrgModal}
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
                setCreateOrgGeoError('');
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

                const createdOrgId = res?.data?._id || res?.data?.id;
                const lat = Number(createOrgCoord.latitude);
                const lng = Number(createOrgCoord.longitude);
                let coordMessage = '';
                if (createdOrgId && Number.isFinite(lat) && Number.isFinite(lng)) {
                  const coordRes = await workflowService.updateOrgUnitCoordinates(createdOrgId, {
                    latitude: lat,
                    longitude: lng,
                  });
                  if (!coordRes.success) {
                    coordMessage = ' Đơn vị đã tạo nhưng lưu tọa độ chưa thành công.';
                  }
                }

                setOrgForm({ name: '', code: '', type: 'STORE', address: '', district: '', city: '', status: 'ACTIVE' });
                setCreateOrgCoord({ latitude: '', longitude: '' });
                setShowCreateOrg(false);
                setSuccess(`Tạo đơn vị / cửa hàng mới thành công.${coordMessage}`);
                loadStores();
                loadOrgUnits();
              }}
            >
              <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <div className='space-y-4'>
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
                        <label className='block text-sm font-medium text-slate-700'>Phường / Xã</label>
                        <input
                          type='text'
                          value={orgForm.district}
                          onChange={e => setOrgForm(f => ({ ...f, district: e.target.value }))}
                          placeholder='Ví dụ: Phường 5'
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
                  <div className='rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600'>
                    <p>
                      Tọa độ đã chọn: {createOrgCoord.latitude || '-'}, {createOrgCoord.longitude || '-'}
                    </p>
                    <p className='mt-1'>Click trên map để tự điền địa chỉ từ vị trí đã chọn.</p>
                  </div>
                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    <div>
                      <label className='block text-sm font-medium text-slate-700'>Latitude</label>
                      <input
                        type='number'
                        step='any'
                        value={createOrgCoord.latitude}
                        onChange={e =>
                          setCreateOrgCoord(prev => ({
                            ...prev,
                            latitude: e.target.value,
                          }))
                        }
                        className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                        placeholder='Ví dụ: 10.7769'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-slate-700'>Longitude</label>
                      <input
                        type='number'
                        step='any'
                        value={createOrgCoord.longitude}
                        onChange={e =>
                          setCreateOrgCoord(prev => ({
                            ...prev,
                            longitude: e.target.value,
                          }))
                        }
                        className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                        placeholder='Ví dụ: 106.7009'
                      />
                    </div>
                  </div>
                  {createOrgGeoError && <p className='text-sm text-amber-700'>{createOrgGeoError}</p>}
                </div>

                <div className='space-y-2'>
                  <p className='text-sm font-medium text-slate-700'>Chọn vị trí trên bản đồ</p>
                  <div className='overflow-hidden rounded-lg border border-slate-200'>
                    <MapContainer
                      center={[10.7769, 106.7009]}
                      zoom={11}
                      style={{ height: '380px', width: '100%', zIndex: 0 }}
                    >
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                      />
                      {Number.isFinite(Number(createOrgCoord.latitude)) &&
                        Number.isFinite(Number(createOrgCoord.longitude)) && (
                          <Marker position={[Number(createOrgCoord.latitude), Number(createOrgCoord.longitude)]} />
                        )}
                      <MapClickHandler
                        onPick={({ lat, lng }) => {
                          const normalized = {
                            latitude: String(Number(lat.toFixed(7))),
                            longitude: String(Number(lng.toFixed(7))),
                          };
                          setCreateOrgCoord(normalized);
                          reverseGeocodeForCreateOrg(normalized.latitude, normalized.longitude);
                        }}
                      />
                    </MapContainer>
                  </div>
                </div>
              </div>
              <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                <button
                  type='button'
                  onClick={closeCreateOrgModal}
                  className='rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  disabled={createOrgGeoLoading}
                  className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600'
                >
                  {createOrgGeoLoading ? 'Đang lấy địa chỉ...' : 'Lưu đơn vị'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {showCreateLocation && (
        <ModalPortal>
        <div
          className='fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 px-4'
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
        </ModalPortal>
      )}

      {showDeleteOrg && deleteTargetOrg && (
        <ModalPortal>
        <div
          className='fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 px-4'
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
        </ModalPortal>
      )}
    </div>
  );
}
