import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, MapPin, RefreshCcw, Store as StoreIcon, Warehouse } from 'lucide-react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, Popup, CircleMarker, useMap } from 'react-leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../contexts/AuthContext';
import { workflowService } from '../../services/workflowService';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [10.7769, 106.7009];
const DEFAULT_ZOOM = 13;

function MapFitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!Array.isArray(points) || points.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    const b = L.latLngBounds(points);
    map.fitBounds(b, { padding: [48, 48], maxZoom: 16 });
  }, [map, points]);
  return null;
}

function parseLocationsPayload(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function StoreLocationPage() {
  const { user } = useAuth();
  const orgUnitId = user?.org_unit_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orgUnit, setOrgUnit] = useState(null);
  const [locations, setLocations] = useState([]);

  const load = useCallback(async () => {
    if (!orgUnitId) {
      setLoading(false);
      setError('Tài khoản chưa gắn đơn vị cửa hàng (org_unit_id).');
      setOrgUnit(null);
      setLocations([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [orgRes, locRes] = await Promise.all([
        workflowService.getOrgUnit(orgUnitId),
        workflowService.getLocations({ org_unit_id: orgUnitId, status: 'ACTIVE', limit: 100 }),
      ]);
      if (!orgRes.success) {
        setError(orgRes.message || 'Không tải được thông tin đơn vị.');
        setOrgUnit(null);
      } else {
        setOrgUnit(orgRes.data);
      }
      if (locRes.success) {
        setLocations(parseLocationsPayload(locRes.data));
      } else {
        setLocations([]);
        if (orgRes.success) setError(prev => prev || locRes.message || '');
      }
    } catch (e) {
      setError(e?.message || 'Lỗi tải dữ liệu.');
      setOrgUnit(null);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [orgUnitId]);

  useEffect(() => {
    load();
  }, [load]);

  const mapPoints = useMemo(() => {
    const pts = [];
    const o = orgUnit?.coordinates;
    if (o?.latitude != null && o?.longitude != null) {
      pts.push([Number(o.latitude), Number(o.longitude)]);
    }
    locations.forEach((loc) => {
      const c = loc?.coordinates;
      if (c?.latitude != null && c?.longitude != null) {
        pts.push([Number(c.latitude), Number(c.longitude)]);
      }
    });
    return pts;
  }, [orgUnit, locations]);

  const hasAnyCoords = mapPoints.length > 0;
  const locationsWithCoords = useMemo(
    () =>
      locations.filter(
        (loc) =>
          loc?.coordinates?.latitude != null && loc?.coordinates?.longitude != null,
      ),
    [locations],
  );

  const addressLine = [orgUnit?.address, orgUnit?.district, orgUnit?.city].filter(Boolean).join(', ') || '—';

  const mapsLink =
    hasAnyCoords && mapPoints[0]
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${mapPoints[0][0]},${mapPoints[0][1]}`)}`
      : orgUnit?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(orgUnit.address)}`
        : null;

  return (
    <div className='min-h-full animate-fade-in pb-8'>
      {/* Hero */}
      <div className='relative mb-8 overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-600 via-violet-500 to-fuchsia-600 px-5 py-8 shadow-lg shadow-violet-900/15 sm:px-8 sm:py-10'>
        <div
          className='pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl'
          aria-hidden
        />
        <div
          className='pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl'
          aria-hidden
        />
        <div className='relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
          <div className='flex gap-4'>
            <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30'>
              <MapPin className='h-7 w-7 text-white' strokeWidth={2} />
            </div>
            <div>
              <p className='text-xs font-semibold uppercase tracking-widest text-violet-100/90'>
                Cửa hàng của bạn
              </p>
              <h1 className='mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl'>
                Vị trí &amp; thông tin đơn vị
              </h1>
              <p className='mt-2 max-w-xl text-sm leading-relaxed text-violet-50/95'>
                Xem địa chỉ, tọa độ và bản đồ OpenStreetMap (Leaflet). Các điểm kho có tọa độ sẽ hiển thị trên bản đồ.
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={() => load()}
            disabled={loading || !orgUnitId}
            className='inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/40 bg-white/15 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50 lg:self-auto'
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      {error && (
        <div
          role='alert'
          className='mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm'
        >
          {error}
        </div>
      )}

      {loading && (
        <div className='space-y-6'>
          <div className='h-14 max-w-md animate-pulse rounded-xl bg-slate-200/80' />
          <div className='h-[min(440px,60vh)] animate-pulse rounded-2xl bg-slate-200/70' />
          <div className='grid gap-4 md:grid-cols-3'>
            <div className='h-24 animate-pulse rounded-xl bg-slate-200/70' />
            <div className='h-24 animate-pulse rounded-xl bg-slate-200/70' />
            <div className='h-24 animate-pulse rounded-xl bg-slate-200/70' />
          </div>
        </div>
      )}

      {!loading && orgUnit && (
        <>
          {/* Thống kê nhanh */}
          <div className='mb-6 grid gap-3 sm:grid-cols-3'>
            <div className='rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'>
              <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>Đơn vị</p>
              <p className='mt-1 truncate text-lg font-semibold text-slate-900'>{orgUnit.name || '—'}</p>
            </div>
            <div className='rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'>
              <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>Kho hoạt động</p>
              <p className='mt-1 text-lg font-semibold tabular-nums text-slate-900'>{locations.length}</p>
            </div>
            <div className='rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'>
              <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>Điểm trên bản đồ</p>
              <p className='mt-1 text-lg font-semibold tabular-nums text-slate-900'>
                {hasAnyCoords ? mapPoints.length : '—'}
              </p>
              <p className='text-[11px] text-slate-500'>
                {locationsWithCoords.length}/{locations.length} kho có tọa độ
              </p>
            </div>
          </div>

          {/* Bản đồ — khối trọng tâm */}
          <section className='mb-8'>
            <div className='mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Bản đồ</h2>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/80'>
                  <span className='h-2 w-2 rounded-full bg-emerald-500' aria-hidden />
                  Cửa hàng
                </span>
                <span className='inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 ring-1 ring-violet-200/80'>
                  <span className='h-2 w-2 rounded-full bg-violet-500' aria-hidden />
                  Kho
                </span>
              </div>
            </div>
            <div className='overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-900/[0.04]'>
              {!hasAnyCoords ? (
                <div className='flex min-h-[min(440px,58vh)] flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-50 to-slate-100/90 px-6 py-12 text-center'>
                  <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200/80 text-slate-500'>
                    <MapPin className='h-8 w-8' />
                  </div>
                  <p className='max-w-sm text-sm font-medium text-slate-700'>
                    Chưa có tọa độ cho cửa hàng hoặc các kho
                  </p>
                  <p className='max-w-md text-xs leading-relaxed text-slate-500'>
                    Liên hệ quản trị để cập nhật tọa độ trên hệ thống. Khi có dữ liệu, bản đồ sẽ hiển thị tại đây.
                  </p>
                </div>
              ) : (
                <div className='h-[min(440px,58vh)] w-full'>
                  <MapContainer
                    center={mapPoints[0] || DEFAULT_CENTER}
                    zoom={hasAnyCoords && mapPoints.length === 1 ? 15 : DEFAULT_ZOOM}
                    className='z-0 h-full w-full'
                    scrollWheelZoom
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    />
                    <MapFitBounds points={mapPoints} />
                    {orgUnit?.coordinates?.latitude != null && orgUnit?.coordinates?.longitude != null && (
                      <Marker
                        position={[Number(orgUnit.coordinates.latitude), Number(orgUnit.coordinates.longitude)]}
                      >
                        <Popup>
                          <strong>{orgUnit.name}</strong>
                          <br />
                          Điểm đặt cửa hàng (đơn vị)
                          <br />
                          <span className='text-xs'>{addressLine}</span>
                        </Popup>
                      </Marker>
                    )}
                    {locations.map((loc) => {
                      const c = loc?.coordinates;
                      if (c?.latitude == null || c?.longitude == null) return null;
                      const pos = [Number(c.latitude), Number(c.longitude)];
                      return (
                        <CircleMarker
                          key={loc._id}
                          center={pos}
                          radius={9}
                          pathOptions={{
                            color: '#7c3aed',
                            fillColor: '#a78bfa',
                            fillOpacity: 0.65,
                            weight: 2,
                          }}
                        >
                          <Popup>
                            <strong>{loc.name || loc.code}</strong>
                            <br />
                            Kho / vị trí
                            {loc.code && loc.name !== loc.code && (
                              <>
                                <br />
                                <span className='text-xs'>Mã: {loc.code}</span>
                              </>
                            )}
                          </Popup>
                        </CircleMarker>
                      );
                    })}
                  </MapContainer>
                </div>
              )}
            </div>
            <p className='mt-2 text-center text-xs text-slate-500 sm:text-left'>
              Nguồn bản đồ: OpenStreetMap · Leaflet
            </p>
          </section>

          {/* Thông tin chi tiết — 2 cột */}
          <div className='grid gap-6 lg:grid-cols-2'>
            <section className='rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm'>
              <div className='mb-5 flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700'>
                  <StoreIcon className='h-5 w-5' />
                </div>
                <div>
                  <h2 className='text-base font-semibold text-slate-900'>Thông tin đơn vị</h2>
                  <p className='text-xs text-slate-500'>Mã và trạng thái hoạt động</p>
                </div>
              </div>
              <div className='space-y-4'>
                <div>
                  <p className='text-xs font-medium text-slate-500'>Tên hiển thị</p>
                  <p className='mt-0.5 text-lg font-semibold text-slate-900'>{orgUnit.name || '—'}</p>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <span className='rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800'>
                    {orgUnit.type === 'STORE' ? 'Cửa hàng' : orgUnit.type || '—'}
                  </span>
                  {orgUnit.status && (
                    <span className='rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700'>
                      {orgUnit.status}
                    </span>
                  )}
                  <span className='rounded-lg bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-600'>
                    {orgUnit.code || orgUnit._id}
                  </span>
                </div>
                <div className='rounded-xl bg-slate-50/80 p-4'>
                  <p className='mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    <MapPin className='h-3.5 w-3.5' />
                    Địa chỉ
                  </p>
                  <p className='text-sm leading-relaxed text-slate-800'>{addressLine}</p>
                </div>
                {orgUnit?.coordinates?.latitude != null && orgUnit?.coordinates?.longitude != null && (
                  <p className='font-mono text-xs text-slate-600'>
                    GPS: {Number(orgUnit.coordinates.latitude).toFixed(5)}, {Number(orgUnit.coordinates.longitude).toFixed(5)}
                  </p>
                )}
                {mapsLink && (
                  <a
                    href={mapsLink}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-800 transition hover:bg-violet-100'
                  >
                    <ExternalLink className='h-4 w-4 shrink-0' />
                    Mở trong Google Maps
                  </a>
                )}
              </div>
            </section>

            <section className='rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm'>
              <div className='mb-5 flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700'>
                  <Warehouse className='h-5 w-5' />
                </div>
                <div>
                  <h2 className='text-base font-semibold text-slate-900'>Vị trí kho</h2>
                  <p className='text-xs text-slate-500'>Điểm lưu trữ thuộc đơn vị</p>
                </div>
              </div>
              {locations.length === 0 ? (
                <div className='rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center'>
                  <p className='text-sm text-slate-600'>Chưa có kho ACTIVE</p>
                  <p className='mt-1 text-xs text-slate-500'>Dữ liệu sẽ hiện khi được cấu hình trên hệ thống.</p>
                </div>
              ) : (
                <ul className='max-h-[min(320px,40vh)] space-y-2 overflow-y-auto pr-1'>
                  {locations.map((loc) => {
                    const c = loc.coordinates;
                    const hasLoc = c?.latitude != null && c?.longitude != null;
                    return (
                      <li
                        key={loc._id}
                        className='rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 transition hover:border-violet-200/60 hover:bg-violet-50/30'
                      >
                        <div className='flex items-start justify-between gap-2'>
                          <p className='font-medium text-slate-900'>{loc.name || loc.code || loc._id}</p>
                          {hasLoc ? (
                            <span className='shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-800'>
                              Có bản đồ
                            </span>
                          ) : (
                            <span className='shrink-0 rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-600'>
                              Chưa ghim
                            </span>
                          )}
                        </div>
                        <p className='mt-1 text-xs text-slate-500'>
                          {loc.code && loc.code !== loc.name ? `Mã ${loc.code} · ` : ''}
                          {hasLoc
                            ? `${Number(c.latitude).toFixed(5)}, ${Number(c.longitude).toFixed(5)}`
                            : 'Chưa có tọa độ'}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
