import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Truck, MapPin, RefreshCcw, CheckCircle, ArrowRight, History, DollarSign, Camera, Navigation, ExternalLink, Route, Package, Clock } from 'lucide-react';
import { workflowService } from '../../services/workflowService';
import LocationMapView from '../../components/ui/LocationMapView';
import { resolvePhotoUrl } from '../../utils/photoHelpers';

const SHIPMENT_STATUS = {
  DRAFT: 'Nháp',
  PICKED: 'Đã có hàng',
  SHIPPED: 'Đã xuất kho',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao đến',
  CANCELLED: 'Đã hủy',
};

const statusColor = {
  PICKED: 'bg-amber-100 text-amber-700',
  SHIPPED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
};

const PAGE_SIZE = 20;

function getList(res) {
  if (!res?.success || !res?.data) return [];
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

function getLocationLabel(loc) {
  if (!loc) return '-';
  if (typeof loc === 'object') return loc.name || loc.code || loc._id;
  return loc;
}

function getItemName(obj) {
  if (!obj) return '-';
  if (typeof obj === 'object') return obj.name || obj.sku || obj._id;
  return obj;
}

function buildShipmentToRouteId(myRoutesList) {
  const map = {};
  if (!Array.isArray(myRoutesList)) return map;
  myRoutesList.forEach((route) => {
    const routeId = route._id;
    const stops = route.stops || [];
    stops.forEach((stop) => {
      const ids = stop.shipment_ids || [];
      ids.forEach((s) => {
        const sid = typeof s === 'object' ? s._id : s;
        if (sid != null) map[String(sid)] = routeId;
      });
    });
  });
  return map;
}

export default function DriverShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detailShipment, setDetailShipment] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deliveryPhotoFile, setDeliveryPhotoFile] = useState(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState('');
  const [shipmentToRouteId, setShipmentToRouteId] = useState({});
  const [activeTab, setActiveTab] = useState('shipments'); // 'shipments' | 'map' | 'history'
  const [deliveredShipments, setDeliveredShipments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPag, setHistoryPag] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
  
  // Search and filter states
  const [searchFilters, setSearchFilters] = useState({
    dateFrom: '',
    dateTo: '',
    storeFilter: '',
    searchText: ''
  });
  const [availableStores, setAvailableStores] = useState([]);
  
  // Cache để tránh load lại
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const CACHE_DURATION = 30000; // 30 seconds
  
  // COD collection states
  const [codCollectionData, setCodCollectionData] = useState({
    amount_collected: 0,
    collection_notes: ''
  });
  const [codEvidenceFiles, setCodEvidenceFiles] = useState([]);

  // Map states
  const [currentLocation, setCurrentLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    if (!deliveryPhotoFile) {
      setPreviewPhotoUrl('');
      return;
    }
    const url = URL.createObjectURL(deliveryPhotoFile);
    setPreviewPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [deliveryPhotoFile]);

  const loadShipments = async (forceReload = false) => {
    // Kiểm tra cache
    const now = Date.now();
    if (!forceReload && shipments.length > 0 && (now - lastLoadTime) < CACHE_DURATION) {
      return; // Sử dụng cache
    }

    setLoading(true);
    setSuccess('');
    try {
      // Build filter parameters
      const filterParams = {};
      if (searchFilters.dateFrom) {
        filterParams.dateFrom = searchFilters.dateFrom;
      }
      if (searchFilters.dateTo) {
        filterParams.dateTo = searchFilters.dateTo;
      }
      if (searchFilters.storeFilter) {
        filterParams.storeCode = searchFilters.storeFilter;
      }
      if (searchFilters.searchText) {
        filterParams.search = searchFilters.searchText;
      }

      // Chỉ load 2 API calls chính thay vì 10+ calls
      const [shippedRes, transitRes, myRoutesRes] = await Promise.all([
        workflowService.getShipmentsPaginated({ status: 'SHIPPED', limit: PAGE_SIZE, ...filterParams }),
        workflowService.getShipmentsPaginated({ status: 'IN_TRANSIT', limit: PAGE_SIZE, ...filterParams }),
        workflowService.getMyDeliveryRoutes({ limit: 50 }),
      ]);
      
      const shipped = getList(shippedRes);
      const transit = getList(transitRes);
      const myRoutes = Array.isArray(myRoutesRes?.data)
        ? myRoutesRes.data
        : Array.isArray(myRoutesRes?.data?.data)
          ? myRoutesRes.data.data
          : getList(myRoutesRes);
      
      setShipmentToRouteId(buildShipmentToRouteId(myRoutes));

      // Extract unique stores for filter dropdown
      const stores = new Set();
      [...shipped, ...transit].forEach(s => {
        if (s.to_location_id && s.to_location_id.name) {
          stores.add(JSON.stringify({
            code: s.to_location_id.code || s.to_location_id._id,
            name: s.to_location_id.name
          }));
        }
      });
      setAvailableStores(Array.from(stores).map(s => JSON.parse(s)));

      // Tạo Set để tránh trùng lặp shipment
      const existingIds = new Set();
      const uniqueShipments = [];

      // Thêm shipped shipments
      shipped.forEach(s => {
        if (!existingIds.has(s._id)) {
          existingIds.add(s._id);
          uniqueShipments.push({ ...s, source: 'shipped' });
        }
      });

      // Thêm transit shipments
      transit.forEach(s => {
        if (!existingIds.has(s._id)) {
          existingIds.add(s._id);
          uniqueShipments.push({ ...s, source: 'transit' });
        }
      });

      // TỐI ƯU: Chỉ lấy thêm shipments từ routes nếu cần thiết và giới hạn 5 calls
      const plannedShipmentIds = [];
      (myRoutes || []).forEach((route) => {
        (route.stops || []).forEach((stop) => {
          (stop.shipment_ids || []).forEach((s) => {
            const sid = typeof s === 'object' ? s._id : s;
            if (sid && !existingIds.has(sid) && plannedShipmentIds.length < 5) {
              plannedShipmentIds.push(sid);
            }
          });
        });
      });

      // Chỉ fetch nếu có ít hơn 5 shipments và cần thêm
      if (plannedShipmentIds.length > 0 && uniqueShipments.length < 10) {
        try {
          const plannedRes = await Promise.all(
            plannedShipmentIds.map(async (id) => {
              try {
                return await workflowService.getShipment(id);
              } catch (error) {
                // Bỏ qua lỗi 403 và các lỗi khác
                console.warn(`Skipped shipment ${id}:`, error.message);
                return null;
              }
            })
          );
          
          const plannedRaw = plannedRes
            .filter((r) => r?.success && r?.data)
            .map((r) => r.data);
          
          // Chỉ thêm những shipment chưa có và có status phù hợp
          plannedRaw.forEach(s => {
            if (!existingIds.has(s._id) && (s.status === 'SHIPPED' || s.status === 'IN_TRANSIT')) {
              existingIds.add(s._id);
              uniqueShipments.push({ ...s, source: 'planned' });
            }
          });
        } catch (error) {
          console.warn('Error loading planned shipments:', error);
        }
      }

      // Lọc và sắp xếp
      const finalShipments = uniqueShipments
        .filter((s) => s.status !== 'DELIVERED')
        .sort((a, b) => new Date(b.ship_date || b.updatedAt || 0) - new Date(a.ship_date || a.updatedAt || 0));
      
      setShipments(finalShipments);
      setLastLoadTime(now);
    } catch (error) {
      console.error('Error loading shipments:', error);
      setShipments([]);
      setShipmentToRouteId({});
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    loadShipments(true); // Force reload with filters
  };

  const clearFilters = () => {
    setSearchFilters({
      dateFrom: '',
      dateTo: '',
      storeFilter: '',
      searchText: ''
    });
    // Auto-apply after clearing
    setTimeout(() => loadShipments(true), 100);
  };

  const loadDeliveredShipments = useCallback(async () => {
    setHistoryLoading(true);
    try {
      // Build filter parameters
      const filterParams = {
        status: 'DELIVERED',
        page: historyPage,
        limit: PAGE_SIZE,
      };
      if (searchFilters.dateFrom) {
        filterParams.dateFrom = searchFilters.dateFrom;
      }
      if (searchFilters.dateTo) {
        filterParams.dateTo = searchFilters.dateTo;
      }
      if (searchFilters.storeFilter) {
        filterParams.storeCode = searchFilters.storeFilter;
      }
      if (searchFilters.searchText) {
        filterParams.search = searchFilters.searchText;
      }

      const res = await workflowService.getShipmentsPaginated(filterParams);
      const list = getList(res);
      const p = res?.data?.pagination ?? {};
      setHistoryPag({
        page: p.page || historyPage,
        limit: p.limit || PAGE_SIZE,
        total: p.total || list.length,
        pages: p.pages || 1,
      });
      setDeliveredShipments(
        list.sort(
          (a, b) =>
            new Date(b.delivery_photo_uploaded_at || b.updatedAt || 0) -
            new Date(a.delivery_photo_uploaded_at || a.updatedAt || 0),
        ),
      );
    } catch {
      setDeliveredShipments([]);
      setHistoryPag({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, searchFilters]);

  useEffect(() => { loadShipments(); }, []);
  useEffect(() => {
    if (activeTab === 'history') loadDeliveredShipments();
    else if (activeTab === 'map' && shipments.length === 0) loadShipments(); // Lazy load for map
  }, [activeTab, historyPage, loadDeliveredShipments]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // COD evidence file handling
  const handleCodEvidenceUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length + codEvidenceFiles.length > 3) {
      alert('Chỉ được upload tối đa 3 ảnh bằng chứng COD');
      return;
    }
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      alert('Chỉ được upload file ảnh (JPEG, PNG, WEBP)');
      return;
    }

    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert('Mỗi file ảnh phải nhỏ hơn 5MB');
      return;
    }
    
    setCodEvidenceFiles(prev => [...prev, ...files]);
  };

  const removeCodEvidenceFile = (index) => {
    setCodEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Map and navigation functions
  const openDestinationMap = (shipment) => {
    const destination = shipment.to_location_id;
    if (!destination || !destination.coordinates) {
      alert('Điểm đến chưa có tọa độ');
      return;
    }
    const { latitude, longitude } = destination.coordinates;
    const locationName = encodeURIComponent(destination.name || 'Điểm đến');
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${locationName}`;
    window.open(url, '_blank');
  };

  const getDirectionsToDestination = (shipment) => {
    const destination = shipment.to_location_id;
    if (!destination || !destination.coordinates) {
      alert('Điểm đến chưa có tọa độ');
      return;
    }
    const { latitude, longitude } = destination.coordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const hasDestinationCoordinates = (shipment) => {
    return shipment.to_location_id && 
           shipment.to_location_id.coordinates && 
           shipment.to_location_id.coordinates.latitude && 
           shipment.to_location_id.coordinates.longitude;
  };

  // Map functions
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        setGettingLocation(false);
      },
      (error) => {
        alert('Không thể lấy vị trí hiện tại');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openMultipleDestinations = () => {
    const shipmentsWithCoords = shipments.filter(s => hasDestinationCoordinates(s));
    if (shipmentsWithCoords.length === 0) {
      alert('Không có điểm đến nào có tọa độ');
      return;
    }

    // Create waypoints for Google Maps
    const waypoints = shipmentsWithCoords
      .slice(0, 10) // Google Maps limits waypoints
      .map(s => `${s.to_location_id.coordinates.latitude},${s.to_location_id.coordinates.longitude}`)
      .join('|');

    const url = `https://www.google.com/maps/dir/?api=1&waypoints=${waypoints}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getShipmentsWithDistance = () => {
    if (!currentLocation) return shipments.filter(s => hasDestinationCoordinates(s));
    
    return shipments
      .filter(s => hasDestinationCoordinates(s))
      .map(shipment => {
        const dest = shipment.to_location_id.coordinates;
        const distance = calculateDistance(
          currentLocation.latitude, currentLocation.longitude,
          dest.latitude, dest.longitude
        );
        return { ...shipment, distance };
      }).sort((a, b) => (a.distance || 999) - (b.distance || 999));
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetailShipment(null);
    setDeliveryPhotoFile(null);
    // Reset COD collection data
    setCodCollectionData({
      amount_collected: 0,
      collection_notes: ''
    });
    setCodEvidenceFiles([]);
  };

  const loadDetail = async (id) => {
    setDetailId(id);
    setDetailShipment(null);
    if (!id) return;
    const res = await workflowService.getShipment(id);
    if (res.success && res.data) setDetailShipment(res.data);
  };

  const updateStatus = async (shipment, newStatus) => {
    if (newStatus === 'DELIVERED' && !deliveryPhotoFile) {
      alert('Vui lòng chọn ảnh giao hàng trước khi xác nhận đã giao đến.');
      return;
    }

    // Check COD requirements for COD orders
    const isCODOrder = shipment.order_id?.payment_method === 'COD' || shipment.cod_amount > 0;
    if (newStatus === 'DELIVERED' && isCODOrder) {
      if (!codCollectionData.amount_collected || codCollectionData.amount_collected <= 0) {
        alert('Vui lòng nhập số tiền COD đã thu từ khách hàng.');
        return;
      }
      if (codEvidenceFiles.length === 0) {
        alert('Vui lòng chụp ảnh bằng chứng thu tiền COD.');
        return;
      }
    }

    setActionLoadingId(shipment._id);
    setSuccess('');
    let routeId = shipmentToRouteId[String(shipment._id)];
    
    // Prepare files to send
    const fileToSend = newStatus === 'DELIVERED' ? deliveryPhotoFile : null;
    const codFiles = newStatus === 'DELIVERED' && isCODOrder ? codEvidenceFiles : [];
    
    // Clear local state immediately to prevent showing blob/preview
    if (newStatus === 'DELIVERED') {
      setDeliveryPhotoFile(null);
      if (isCODOrder) {
        setCodEvidenceFiles([]);
      }
    }

    try {
      if (newStatus === 'IN_TRANSIT' && routeId) {
        const routeRes = await workflowService.updateRouteStatus(routeId, { status: 'IN_PROGRESS' });
        if (!routeRes.success) {
          alert(routeRes.message || 'Cập nhật tuyến thất bại');
          setActionLoadingId(null);
          return;
        }
      }

      let payload;
      if (newStatus === 'DELIVERED') {
        payload = { 
          status: newStatus, 
          deliveryPhoto: fileToSend 
        };
        
        // Add COD collection data if this is a COD order
        if (isCODOrder) {
          payload.codCollection = {
            amount_collected: codCollectionData.amount_collected,
            collection_notes: codCollectionData.collection_notes,
            evidence_photos: codFiles
          };
        }
      } else {
        payload = newStatus;
      }

      const res = await workflowService.updateShipmentStatus(shipment._id, payload);
      if (res.success) {
        if (newStatus === 'DELIVERED') {
          if (!routeId) {
            const myRoutesRes = await workflowService.getMyDeliveryRoutes({ limit: 50 });
            const myRoutes = Array.isArray(myRoutesRes?.data) ? myRoutesRes.data : Array.isArray(myRoutesRes?.data?.data) ? myRoutesRes.data.data : getList(myRoutesRes);
            const map = buildShipmentToRouteId(myRoutes);
            routeId = map[String(shipment._id)];
          }
          if (routeId) {
            await workflowService.updateRouteStatus(routeId, { status: 'COMPLETED' });
          }
        }
        
        let successMessage = `Đã cập nhật: ${SHIPMENT_STATUS[newStatus] || newStatus}`;
        if (newStatus === 'DELIVERED' && isCODOrder) {
          successMessage += ` và thu COD ${codCollectionData.amount_collected.toLocaleString()} VND`;
        }
        setSuccess(successMessage);
        
        if (newStatus === 'DELIVERED') {
          // Always fetch from server to get updated data
          const refetched = await workflowService.getShipment(shipment._id);
          setDetailShipment(prev =>
            prev?._id === shipment._id && refetched.success && refetched.data
              ? refetched.data
              : prev?._id === shipment._id
                ? (res.data ? { ...prev, ...res.data, status: newStatus } : { ...prev, status: newStatus })
                : prev
          );
        } else {
          setDetailShipment(prev =>
            prev?._id === shipment._id
              ? (res.data ? { ...prev, ...res.data, status: newStatus } : { ...prev, status: newStatus })
              : prev
          );
        }
        loadShipments(true); // Force reload after status update
      } else {
        alert(res.message || 'Cập nhật thất bại');
      }
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Cập nhật thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className='min-h-full space-y-6 animate-fade-in'>
      {success && (
        <div className='flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className='text-xs text-emerald-700/70 hover:text-emerald-900'>Đóng</button>
        </div>
      )}

      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Giao hàng & Bản đồ</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Quản lý lô giao hàng, xem bản đồ tuyến đường và cập nhật trạng thái vận chuyển.
          </p>
          <p className='mt-1 text-xs text-slate-500'>
            <strong>Đã xuất kho</strong> → <strong>Đang vận chuyển</strong> → <strong>Xác nhận giao hàng</strong> (chụp ảnh + thu COD nếu có)
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex rounded-lg border border-slate-200 p-0.5'>
            <button
              onClick={() => setActiveTab('shipments')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === 'shipments' ? 'bg-slate-200 text-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Lô giao hàng
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === 'map' ? 'bg-slate-200 text-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <MapPin className='h-4 w-4' /> Bản đồ
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                setHistoryPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === 'history' ? 'bg-slate-200 text-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <History className='h-4 w-4' /> Lịch sử
            </button>
          </div>
          <button onClick={() => activeTab === 'shipments' || activeTab === 'map' ? loadShipments(true) : loadDeliveredShipments()} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      {(activeTab === 'shipments' || activeTab === 'history') && (
        <div className='rounded-xl border border-slate-200 bg-white p-4 space-y-4'>
          <h3 className='text-sm font-semibold text-slate-700'>Tìm kiếm và lọc</h3>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
            <div>
              <label className='block text-xs font-medium text-slate-600 mb-1'>Từ ngày</label>
              <input
                type='date'
                value={searchFilters.dateFrom}
                onChange={(e) => setSearchFilters(prev => ({...prev, dateFrom: e.target.value}))}
                className='w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none'
              />
            </div>
            <div>
              <label className='block text-xs font-medium text-slate-600 mb-1'>Đến ngày</label>
              <input
                type='date'
                value={searchFilters.dateTo}
                onChange={(e) => setSearchFilters(prev => ({...prev, dateTo: e.target.value}))}
                className='w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none'
              />
            </div>
            <div>
              <label className='block text-xs font-medium text-slate-600 mb-1'>Cửa hàng</label>
              <select
                value={searchFilters.storeFilter}
                onChange={(e) => setSearchFilters(prev => ({...prev, storeFilter: e.target.value}))}
                className='w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none'
              >
                <option value=''>Tất cả cửa hàng</option>
                {availableStores.map(store => (
                  <option key={store.code} value={store.code}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className='block text-xs font-medium text-slate-600 mb-1'>Tìm kiếm</label>
              <input
                type='text'
                placeholder='Mã lô, mã đơn...'
                value={searchFilters.searchText}
                onChange={(e) => setSearchFilters(prev => ({...prev, searchText: e.target.value}))}
                className='w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none'
              />
            </div>
          </div>
          <div className='flex gap-2'>
            <button
              onClick={() => applyFilters()}
              className='px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700'
            >
              Áp dụng bộ lọc
            </button>
            <button
              onClick={() => clearFilters()}
              className='px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50'
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <>
          {historyLoading && <p className='text-sm text-slate-500'>Đang tải lịch sử...</p>}
          {!historyLoading && deliveredShipments.length === 0 && (
            <div className='rounded-xl border border-slate-200 bg-slate-50/50 py-16 text-center'>
              <History className='mx-auto h-16 w-16 text-slate-300' />
              <p className='mt-4 text-slate-600'>Chưa có lịch sử giao hàng</p>
              <p className='mt-1 text-sm text-slate-500'>Các lô đã xác nhận giao đến sẽ hiển thị tại đây</p>
            </div>
          )}
          {!historyLoading && deliveredShipments.length > 0 && (
            <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
              <table className='w-full text-sm'>
                <thead className='border-b border-slate-200 bg-slate-50/80 text-left'>
                  <tr>
                    <th className='px-4 py-3 font-medium text-slate-600'>Lô giao</th>
                  <th className='px-4 py-3 font-medium text-slate-600'>Đơn hàng</th>
                    <th className='px-4 py-3 font-medium text-slate-600'>Giao đến</th>
                    <th className='px-4 py-3 font-medium text-slate-600'>Ngày giao</th>
                    <th className='px-4 py-3 font-medium text-slate-600'>Trạng thái</th>
                    <th className='px-4 py-3 font-medium text-slate-600 text-right'>Thao tác</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {deliveredShipments.map(sh => (
                    <tr key={sh._id} className='hover:bg-slate-50/50'>
                      <td className='px-4 py-3 font-medium text-slate-900'>
                        {sh.shipment_no || sh._id}
                      </td>
                    <td className='px-4 py-3 text-slate-700'>
                      {sh.order_id?.order_no || sh.order_id?.orderNo || sh.order_id || '-'}
                    </td>
                    <td className='px-4 py-3 text-slate-700'>
                      {getLocationLabel(sh.to_location_id)}
                    </td>
                      <td className='px-4 py-3 text-slate-500'>
                        {sh.delivery_photo_uploaded_at
                          ? new Date(sh.delivery_photo_uploaded_at).toLocaleString('vi-VN')
                          : sh.updatedAt
                            ? new Date(sh.updatedAt).toLocaleString('vi-VN')
                            : '-'}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusColor.DELIVERED || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {SHIPMENT_STATUS.DELIVERED}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <button
                          type='button'
                          onClick={() => loadDetail(sh._id)}
                          className='rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50'
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'history' && historyPag.pages > 1 && (
            <div className='flex items-center justify-between text-sm text-slate-500'>
              <span>
                Trang {historyPag.page}/{historyPag.pages} ({historyPag.total} lô)
              </span>
              <div className='flex gap-1'>
                <button
                  type='button'
                  disabled={historyPag.page <= 1 || historyLoading}
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  className='rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40'
                >
                  Trước
                </button>
                <button
                  type='button'
                  disabled={historyPag.page >= historyPag.pages || historyLoading}
                  onClick={() =>
                    setHistoryPage(p => Math.min(historyPag.pages, p + 1))
                  }
                  className='rounded-md border px-3 py-1 hover:bg-slate-50 disabled:opacity-40'
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Map Tab */}
      {activeTab === 'map' && (
        <div className='space-y-6'>
          {/* Summary Cards */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <div className='rounded-xl border border-slate-200 bg-white p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-slate-600'>Tổng điểm đến</p>
                  <p className='text-2xl font-bold'>{shipments.filter(s => hasDestinationCoordinates(s)).length}</p>
                </div>
                <MapPin className='h-8 w-8 text-blue-600' />
              </div>
            </div>

            <div className='rounded-xl border border-slate-200 bg-white p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-slate-600'>Đã xuất kho</p>
                  <p className='text-2xl font-bold text-blue-600'>
                    {shipments.filter(s => s.status === 'SHIPPED').length}
                  </p>
                </div>
                <Package className='h-8 w-8 text-blue-600' />
              </div>
            </div>

            <div className='rounded-xl border border-slate-200 bg-white p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-slate-600'>Đang vận chuyển</p>
                  <p className='text-2xl font-bold text-indigo-600'>
                    {shipments.filter(s => s.status === 'IN_TRANSIT').length}
                  </p>
                </div>
                <Truck className='h-8 w-8 text-indigo-600' />
              </div>
            </div>

            <div className='rounded-xl border border-slate-200 bg-white p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-slate-600'>COD cần thu</p>
                  <p className='text-lg font-bold text-amber-600'>
                    {formatCurrency(
                      shipments
                        .filter(s => s.order_id?.payment_method === 'COD')
                        .reduce((sum, s) => sum + (s.cod_amount || s.order_id?.total_amount || 0), 0)
                    )}
                  </p>
                </div>
                <DollarSign className='h-8 w-8 text-amber-600' />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex flex-wrap gap-3'>
            <button 
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50'
            >
              <Navigation className='h-4 w-4' />
              {gettingLocation ? 'Đang lấy...' : 'Vị trí hiện tại'}
            </button>
            {shipments.filter(s => hasDestinationCoordinates(s)).length > 0 && (
              <button 
                onClick={openMultipleDestinations}
                className='inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700'
              >
                <Route className='h-4 w-4' />
                Lập tuyến đường
              </button>
            )}
          </div>

          {/* Current Location */}
          {currentLocation && (
            <div className='rounded-lg border border-blue-200 bg-blue-50 p-3'>
              <div className='flex items-center gap-2 text-blue-800'>
                <Navigation className='h-4 w-4' />
                <span className='text-sm font-medium'>
                  Vị trí hiện tại: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </span>
              </div>
            </div>
          )}

          {/* Destinations List */}
          <div className='rounded-xl border border-slate-200 bg-white'>
            <div className='border-b border-slate-200 px-4 py-3'>
              <h3 className='text-lg font-semibold text-slate-900'>Điểm Đến Giao Hàng</h3>
              <p className='text-sm text-slate-500'>
                Danh sách các điểm cần giao hàng với tọa độ GPS
                {currentLocation && ' (sắp xếp theo khoảng cách)'}
              </p>
            </div>
            <div className='p-4'>
              {loading && (
                <div className='text-center py-8'>
                  <RefreshCcw className='h-8 w-8 animate-spin mx-auto mb-4 text-slate-400' />
                  <p className='text-slate-500'>Đang tải...</p>
                </div>
              )}

              {!loading && getShipmentsWithDistance().length === 0 && (
                <div className='text-center py-8'>
                  <MapPin className='h-12 w-12 mx-auto mb-4 text-slate-300' />
                  <p className='text-slate-500'>Không có điểm đến nào có tọa độ GPS</p>
                </div>
              )}

              {!loading && getShipmentsWithDistance().length > 0 && (
                <div className='space-y-4'>
                  {getShipmentsWithDistance().map((shipment, index) => (
                    <div
                      key={shipment._id}
                      className='border border-slate-200 rounded-lg p-4 hover:bg-slate-50'
                    >
                      <div className='flex items-start justify-between mb-3'>
                        <div className='flex items-center gap-3'>
                          <div className='flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium'>
                            {index + 1}
                          </div>
                          <div>
                            <h4 className='font-medium'>{shipment.shipment_no || shipment._id}</h4>
                            <p className='text-sm text-slate-600'>Đơn: {shipment.order_id?.order_no || shipment.order_id || '-'}</p>
                          </div>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[shipment.status] || 'bg-slate-100 text-slate-700'}`}>
                            {SHIPMENT_STATUS[shipment.status] || shipment.status}
                          </span>
                        </div>
                        
                        <div className='flex gap-2'>
                          <button
                            onClick={() => openDestinationMap(shipment)}
                            className='inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50'
                          >
                            <ExternalLink className='h-3 w-3' />
                            Xem
                          </button>
                          <button
                            onClick={() => getDirectionsToDestination(shipment)}
                            className='inline-flex items-center gap-1 rounded-lg bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700'
                          >
                            <Navigation className='h-3 w-3' />
                            Chỉ đường
                          </button>
                        </div>
                      </div>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                        <div>
                          <p className='font-medium text-slate-700'>Điểm đến:</p>
                          <p>{getLocationLabel(shipment.to_location_id)}</p>
                          {shipment.to_location_id?.address && (
                            <p className='text-slate-600'>{shipment.to_location_id.address}</p>
                          )}
                          <p className='text-slate-500 text-xs mt-1'>
                            GPS: {shipment.to_location_id.coordinates.latitude.toFixed(6)}, {shipment.to_location_id.coordinates.longitude.toFixed(6)}
                          </p>
                        </div>
                        
                        <div>
                          <div className='space-y-1'>
                            {shipment.distance && (
                              <div className='flex items-center gap-2'>
                                <Navigation className='h-4 w-4 text-slate-400' />
                                <span>Khoảng cách: {shipment.distance.toFixed(1)} km</span>
                              </div>
                            )}
                            <div className='flex items-center gap-2'>
                              <Clock className='h-4 w-4 text-slate-400' />
                              <span>Ngày giao: {shipment.ship_date ? new Date(shipment.ship_date).toLocaleDateString('vi-VN') : '-'}</span>
                            </div>
                            {(shipment.order_id?.payment_method === 'COD' || shipment.cod_amount > 0) && (
                              <div className='flex items-center gap-2 text-amber-600'>
                                <DollarSign className='h-4 w-4' />
                                <span>COD: {formatCurrency(shipment.cod_amount || shipment.order_id?.total_amount || 0)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shipments' && loading && (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className='rounded-xl border border-slate-200 bg-white p-4 animate-pulse'>
              <div className='h-4 bg-slate-200 rounded mb-2'></div>
              <div className='h-3 bg-slate-200 rounded mb-3 w-3/4'></div>
              <div className='h-3 bg-slate-200 rounded mb-2'></div>
              <div className='h-8 bg-slate-200 rounded'></div>
            </div>
          ))}
        </div>
      )}
      {activeTab === 'shipments' && !loading && shipments.length === 0 && (
        <div className='rounded-xl border border-slate-200 bg-slate-50/50 py-16 text-center'>
          <Truck className='mx-auto h-16 w-16 text-slate-300' />
          <p className='mt-4 text-slate-600'>Không có lô nào đang chờ giao</p>
          <p className='mt-1 text-sm text-slate-500'>Các lô đã xuất kho hoặc đang vận chuyển sẽ hiển thị tại đây</p>
        </div>
      )}

      {activeTab === 'shipments' && !loading && shipments.length > 0 && (
        <>
          <div className='mb-4 text-sm text-slate-600 bg-slate-50 rounded-lg p-3'>
            <p><strong>Hướng dẫn:</strong></p>
            <ul className='mt-1 space-y-1 text-xs'>
              <li>• <span className='bg-blue-100 text-blue-700 px-2 py-0.5 rounded'>Đã xuất</span> - Lô từ danh sách đã xuất kho</li>
              <li>• <span className='bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded'>Đang chuyển</span> - Lô đang vận chuyển</li>
              <li>• <span className='bg-purple-100 text-purple-700 px-2 py-0.5 rounded'>Từ tuyến</span> - Lô được phân từ tuyến giao hàng</li>
              <li>• <span className='bg-green-100 text-green-700 px-2 py-0.5 rounded'>Có GPS</span> - Điểm đến có tọa độ, có thể chỉ đường</li>
            </ul>
          </div>
          
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {shipments.map(sh => (
            <div
              key={sh._id}
              className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md'
            >
                <div className='mb-3 flex items-start justify-between'>
                <div>
                  <div className='flex items-center gap-2'>
                    <p className='font-semibold text-slate-900'>{sh.shipment_no || sh._id}</p>
                    {hasDestinationCoordinates(sh) && (
                      <div className='flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full'>
                        <Navigation className='h-3 w-3' />
                        <span>Có GPS</span>
                      </div>
                    )}
                    {/* Debug info - show source */}
                    {sh.source && (
                      <div className={`text-xs px-2 py-0.5 rounded-full ${
                        sh.source === 'shipped' ? 'bg-blue-100 text-blue-700' :
                        sh.source === 'transit' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {sh.source === 'shipped' ? 'Đã xuất' : 
                         sh.source === 'transit' ? 'Đang chuyển' : 'Từ tuyến'}
                      </div>
                    )}
                  </div>
                  <p className='text-xs text-slate-500'>Đơn: {sh.order_id?.order_no || sh.order_id || '-'}</p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[sh.status] || 'bg-slate-100 text-slate-700'}`}>
                  {SHIPMENT_STATUS[sh.status] || sh.status}
                </span>
              </div>
              <div className='space-y-2 text-sm'>
                <div className='flex items-center gap-2 text-slate-600'>
                  <MapPin className='h-4 w-4 flex-shrink-0 text-slate-400' />
                  <div>
                    <div>Đến: {getLocationLabel(sh.to_location_id)}</div>
                    {sh.to_location_id?.address && (
                      <div className='text-xs text-slate-500 mt-1'>
                        {sh.to_location_id.address}
                        {sh.to_location_id.district && `, ${sh.to_location_id.district}`}
                      </div>
                    )}
                  </div>
                </div>
                <div className='text-slate-500'>
                  Ngày giao: {sh.ship_date ? new Date(sh.ship_date).toLocaleString('vi-VN') : '-'}
                </div>
                {/* Show COD info if this is a COD order */}
                {(sh.order_id?.payment_method === 'COD' || sh.cod_amount > 0) && (
                  <div className='flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-1 rounded'>
                    <DollarSign className='h-4 w-4 flex-shrink-0' />
                    <span className='font-medium'>COD: {formatCurrency(sh.cod_amount || sh.order_id?.total_amount || 0)}</span>
                  </div>
                )}
              </div>
              <div className='mt-4 flex gap-2'>
                <button
                  onClick={() => loadDetail(sh._id)}
                  className='flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'
                >
                  Chi tiết
                </button>
                {hasDestinationCoordinates(sh) && (
                  <button
                    onClick={() => getDirectionsToDestination(sh)}
                    className='rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100'
                    title="Chỉ đường đến điểm giao hàng"
                  >
                    <Navigation className='h-4 w-4' />
                  </button>
                )}
                {sh.status === 'SHIPPED' && (
                  <button
                    disabled={actionLoadingId === sh._id}
                    onClick={() => updateStatus(sh, 'IN_TRANSIT')}
                    className='flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60'
                  >
                    {actionLoadingId === sh._id ? '...' : 'Đã xuất kho'}
                  </button>
                )}
                {sh.status === 'IN_TRANSIT' && (
                  <button
                    onClick={() => loadDetail(sh._id)}
                    className='flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700'
                  >
                    Đã tới nơi / Xác nhận giao hàng
                  </button>
                )}
              </div>
            </div>
          ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {detailId && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={closeDetail}>
          <div className='w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Chi tiết lô giao hàng</h2>
              <button onClick={closeDetail} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {!detailShipment && <p className='text-sm text-slate-500'>Đang tải...</p>}
            {detailShipment && (
              <div className='space-y-4'>
                <div className='rounded-lg border border-slate-200 bg-slate-50/50 p-3'>
                  <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-sm'>
                    <span className='text-slate-500'>Số lô giao:</span>
                    <span className='font-medium'>{detailShipment.shipment_no || detailShipment._id}</span>
                    <span className='text-slate-500'>Đơn hàng:</span>
                    <span className='font-medium'>{detailShipment.order_id?.order_no || detailShipment.order_id || '-'}</span>
                    <span className='text-slate-500'>Kho xuất:</span>
                    <span>{getLocationLabel(detailShipment.from_location_id)}</span>
                    <span className='text-slate-500'>Kho nhận:</span>
                    <span>{getLocationLabel(detailShipment.to_location_id)}</span>
                    <span className='text-slate-500'>Địa chỉ giao hàng:</span>
                    <span className='text-sm'>
                      {detailShipment.to_location_id?.address || 'Chưa có địa chỉ'}
                      {detailShipment.to_location_id?.district && `, ${detailShipment.to_location_id.district}`}
                      {detailShipment.to_location_id?.city && `, ${detailShipment.to_location_id.city}`}
                    </span>
                    <span className='text-slate-500'>Ngày giao:</span>
                    <span>{detailShipment.ship_date ? new Date(detailShipment.ship_date).toLocaleString('vi-VN') : '-'}</span>
                    <span className='text-slate-500'>Trạng thái:</span>
                    <span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[detailShipment.status] || 'bg-slate-100 text-slate-700'}`}>
                        {SHIPMENT_STATUS[detailShipment.status] || detailShipment.status}
                      </span>
                    </span>
                    {/* Show COD info if this is a COD order */}
                    {(detailShipment.order_id?.payment_method === 'COD' || detailShipment.cod_amount > 0) && (
                      <>
                        <span className='text-slate-500'>Phương thức thanh toán:</span>
                        <span className='font-medium text-amber-600'>COD (Thu tiền mặt)</span>
                        <span className='text-slate-500'>Số tiền cần thu:</span>
                        <span className='font-medium text-amber-600'>
                          {formatCurrency(detailShipment.cod_amount || detailShipment.order_id?.total_amount || 0)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Destination Map Section */}
                {hasDestinationCoordinates(detailShipment) && (
                  <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
                    <h3 className='mb-3 text-sm font-semibold text-blue-800 flex items-center gap-2'>
                      <MapPin className='h-4 w-4' />
                      Điểm đến giao hàng
                    </h3>
                    <div className='space-y-3'>
                      <div className='text-sm'>
                        <p className='font-medium text-blue-900'>{getLocationLabel(detailShipment.to_location_id)}</p>
                        <p className='text-blue-700 mb-2'>
                          Tọa độ: {detailShipment.to_location_id.coordinates.latitude.toFixed(6)}, {detailShipment.to_location_id.coordinates.longitude.toFixed(6)}
                        </p>
                        <div className='bg-white rounded-md border border-blue-200 overflow-hidden'>
                          <LocationMapView
                            latitude={detailShipment.to_location_id.coordinates.latitude}
                            longitude={detailShipment.to_location_id.coordinates.longitude}
                            height="200px"
                          />
                        </div>
                      </div>
                      <div className='flex gap-2 mt-3'>
                        <button
                          onClick={() => openDestinationMap(detailShipment)}
                          className='flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700'
                        >
                          <ExternalLink className='h-4 w-4' />
                          Xem trên bản đồ
                        </button>
                        <button
                          onClick={() => getDirectionsToDestination(detailShipment)}
                          className='flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700'
                        >
                          <Navigation className='h-4 w-4' />
                          Chỉ đường
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show message if no coordinates */}
                {!hasDestinationCoordinates(detailShipment) && (
                  <div className='rounded-lg border border-amber-200 bg-amber-50 p-4'>
                    <h3 className='mb-2 text-sm font-semibold text-amber-800 flex items-center gap-2'>
                      <MapPin className='h-4 w-4' />
                      Thông tin điểm đến
                    </h3>
                    <p className='text-sm text-amber-700'>
                      Điểm đến chưa có tọa độ GPS. Vui lòng liên hệ quản lý để cập nhật tọa độ cho địa điểm này.
                    </p>
                    <div className='mt-2 text-sm text-amber-600'>
                      <strong>Địa chỉ:</strong> {detailShipment.to_location_id?.address || 'Chưa có địa chỉ'}
                      {detailShipment.to_location_id?.district && `, ${detailShipment.to_location_id.district}`}
                      {detailShipment.to_location_id?.city && `, ${detailShipment.to_location_id.city}`}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className='mb-2 text-sm font-medium text-slate-700'>Sản phẩm trong lô</h3>
                  <div className='rounded-lg border border-slate-200'>
                    <table className='w-full text-sm'>
                      <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                        <tr>
                          <th className='px-3 py-2'>Sản phẩm</th>
                          <th className='px-3 py-2 text-right'>Số lượng</th>
                          <th className='px-3 py-2'>ĐVT</th>
                          <th className='px-3 py-2'>Lô</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-slate-100'>
                        {(detailShipment.lines || []).map((line, idx) => (
                          <tr key={line._id || idx}>
                            <td className='px-3 py-2 font-medium'>{getItemName(line.item_id)}</td>
                            <td className='px-3 py-2 text-right'>{line.qty ?? 0}</td>
                            <td className='px-3 py-2'>{line.uom_id?.code || line.uom_id?.name || '-'}</td>
                            <td className='px-3 py-2'>
                              {(line.lots || []).map((lt, li) => (
                                <span key={li} className='mr-1 inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-xs'>
                                  {lt.lot_id?.lot_code || lt.lot_id || '?'}: {lt.qty}
                                </span>
                              ))}
                              {(!line.lots || !line.lots.length) && <span className='text-slate-400'>-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className='border-t border-slate-200 pt-4'>
                  <h3 className='mb-3 text-sm font-semibold text-slate-700'>Cập nhật trạng thái giao hàng</h3>
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  {detailShipment.status === 'SHIPPED' && (
                    <button
                      disabled={actionLoadingId === detailShipment._id}
                      onClick={() => updateStatus(detailShipment, 'IN_TRANSIT')}
                      className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60'
                    >
                      <ArrowRight className='h-4 w-4' /> Đã xuất kho
                    </button>
                  )}
                  {detailShipment.status === 'IN_TRANSIT' && (
                    <>
                      <p className='text-sm font-medium text-slate-700'>Đã tới nơi — xác nhận giao hàng (gửi ảnh)</p>
                      
                      {/* Delivery Photo Upload */}
                      <label className='flex cursor-pointer flex-1 items-center justify-between rounded-lg border border-dashed border-emerald-400 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100'>
                        <div className='flex flex-col text-left'>
                          <span className='font-medium'>
                            Ảnh giao hàng {deliveryPhotoFile ? '(đã chọn)' : ''}
                          </span>
                          <span className='text-[11px] text-emerald-600/80'>
                            {deliveryPhotoFile
                              ? deliveryPhotoFile.name
                              : 'Nhấp để chọn file (jpg, png...)'}
                          </span>
                        </div>
                        <input
                          type='file'
                          accept='image/*'
                          onChange={e => setDeliveryPhotoFile(e.target.files?.[0] || null)}
                          className='hidden'
                        />
                      </label>
                      {previewPhotoUrl && (
                        <div className='rounded-lg border border-emerald-200 bg-white p-2'>
                          <p className='mb-1 text-xs font-medium text-emerald-700'>Preview ảnh trước khi gửi</p>
                          <img src={previewPhotoUrl} alt='Preview giao hàng' className='max-w-[200px] rounded border border-slate-200 object-cover' />
                        </div>
                      )}

                      {/* COD Collection Form - Only show for COD orders */}
                      {(detailShipment.order_id?.payment_method === 'COD' || detailShipment.cod_amount > 0) && (
                        <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3'>
                          <h4 className='font-medium text-amber-800 flex items-center gap-2'>
                            <DollarSign className='h-4 w-4' />
                            Thu tiền COD từ khách hàng
                          </h4>
                          
                          <div className='grid grid-cols-2 gap-3'>
                            <div>
                              <label className='block text-xs font-medium text-amber-700 mb-1'>
                                Số tiền cần thu
                              </label>
                              <div className='text-sm font-medium text-amber-800'>
                                {formatCurrency(detailShipment.cod_amount || detailShipment.order_id?.total_amount || 0)}
                              </div>
                            </div>
                            <div>
                              <label className='block text-xs font-medium text-amber-700 mb-1'>
                                Số tiền đã thu <span className='text-red-600'>*</span>
                              </label>
                              <input
                                type='number'
                                value={codCollectionData.amount_collected}
                                onChange={(e) => setCodCollectionData(prev => ({
                                  ...prev, 
                                  amount_collected: parseInt(e.target.value) || 0
                                }))}
                                placeholder='Nhập số tiền'
                                className='w-full px-2 py-1 text-sm border border-amber-300 rounded focus:border-amber-500 focus:outline-none'
                                min='0'
                              />
                            </div>
                          </div>

                          <div>
                            <label className='block text-xs font-medium text-amber-700 mb-1'>
                              Ghi chú thu tiền
                            </label>
                            <textarea
                              value={codCollectionData.collection_notes}
                              onChange={(e) => setCodCollectionData(prev => ({...prev, collection_notes: e.target.value}))}
                              placeholder='Ghi chú về việc thu tiền (nếu có)...'
                              className='w-full px-2 py-1 text-sm border border-amber-300 rounded focus:border-amber-500 focus:outline-none'
                              rows={2}
                            />
                          </div>

                          <div>
                            <label className='block text-xs font-medium text-amber-700 mb-1'>
                              Ảnh bằng chứng thu tiền <span className='text-red-600'>*</span>
                            </label>
                            <label className='flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-amber-300 bg-white px-3 py-2 text-xs text-amber-700 hover:bg-amber-50'>
                              <div className='text-center'>
                                <Camera className='h-6 w-6 mx-auto mb-1 text-amber-500' />
                                <span>Chụp ảnh bằng chứng thu tiền</span>
                                <div className='text-[10px] text-amber-600'>Tối đa 3 ảnh, mỗi ảnh &lt; 5MB</div>
                              </div>
                              <input
                                type='file'
                                multiple
                                accept='image/*'
                                onChange={handleCodEvidenceUpload}
                                className='hidden'
                              />
                            </label>
                            
                            {/* Show uploaded COD evidence files */}
                            {codEvidenceFiles.length > 0 && (
                              <div className='mt-2 space-y-1'>
                                {codEvidenceFiles.map((file, index) => (
                                  <div key={index} className='flex items-center justify-between p-2 bg-white rounded border border-amber-200'>
                                    <div className='flex items-center gap-2'>
                                      <Camera className='h-3 w-3 text-amber-600' />
                                      <span className='text-xs truncate'>{file.name}</span>
                                      <span className='text-[10px] text-amber-600'>
                                        ({(file.size / 1024 / 1024).toFixed(1)}MB)
                                      </span>
                                    </div>
                                    <button
                                      type='button'
                                      onClick={() => removeCodEvidenceFile(index)}
                                      className='text-xs text-red-600 hover:text-red-800 px-1'
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* COD Amount Validation */}
                          {codCollectionData.amount_collected > 0 && detailShipment.cod_amount && (
                            <div className='p-2 rounded bg-white border border-amber-200'>
                              <div className='text-xs text-amber-700'>
                                {codCollectionData.amount_collected === (detailShipment.cod_amount || detailShipment.order_id?.total_amount || 0)
                                  ? '✓ Số tiền thu đúng với đơn hàng' 
                                  : `⚠ Chênh lệch: ${formatCurrency(Math.abs(codCollectionData.amount_collected - (detailShipment.cod_amount || detailShipment.order_id?.total_amount || 0)))}`
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        disabled={
                          actionLoadingId === detailShipment._id || 
                          !deliveryPhotoFile ||
                          ((detailShipment.order_id?.payment_method === 'COD' || detailShipment.cod_amount > 0) && 
                           (!codCollectionData.amount_collected || codEvidenceFiles.length === 0))
                        }
                        onClick={() => updateStatus(detailShipment, 'DELIVERED')}
                        className='inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
                      >
                        <CheckCircle className='h-4 w-4' /> 
                        {(detailShipment.order_id?.payment_method === 'COD' || detailShipment.cod_amount > 0) 
                          ? 'Xác nhận giao hàng & Thu COD' 
                          : 'Xác nhận giao hàng'
                        }
                      </button>
                    </>
                  )}
                  {!['PICKED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(detailShipment.status) && (
                    <p className='text-sm text-slate-600'>
                      Lô ở trạng thái <strong>{SHIPMENT_STATUS[detailShipment.status] || detailShipment.status}</strong>. Không có thao tác cập nhật cho trạng thái này.
                    </p>
                  )}
                  {detailShipment.status === 'DELIVERED' && (
                    <div className='space-y-2'>
                      <p className='text-sm font-medium text-emerald-600'>✓ Đã giao thành công</p>
                      
                      {/* Show COD collection info if this was a COD order */}
                      {(detailShipment.order_id?.payment_method === 'COD' || detailShipment.cod_amount > 0) && (
                        <div className='rounded-lg border border-amber-200 bg-amber-50 p-3'>
                          <h4 className='text-sm font-medium text-amber-800 mb-2 flex items-center gap-2'>
                            <DollarSign className='h-4 w-4' />
                            Thông tin thu COD
                          </h4>
                          <div className='grid grid-cols-2 gap-2 text-xs'>
                            <div>
                              <span className='text-amber-600'>Cần thu:</span>
                              <div className='font-medium'>{formatCurrency(detailShipment.cod_amount || detailShipment.order_id?.total_amount || 0)}</div>
                            </div>
                            <div>
                              <span className='text-amber-600'>Đã thu:</span>
                              <div className='font-medium'>{formatCurrency(detailShipment.cod_collected_amount || 0)}</div>
                            </div>
                            {detailShipment.cod_collected_at && (
                              <div className='col-span-2'>
                                <span className='text-amber-600'>Thời gian thu:</span>
                                <div className='font-medium'>{new Date(detailShipment.cod_collected_at).toLocaleString('vi-VN')}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {(() => {
                        const photoUrl = resolvePhotoUrl(detailShipment.delivery_photo_url);
                        if (!photoUrl) return null;
                        return (
                          <div className='rounded-lg border border-slate-200 bg-white p-2'>
                            <p className='mb-1 text-xs font-medium text-slate-600'>Ảnh đã gửi</p>
                            <img
                              src={photoUrl}
                              alt='Ảnh giao hàng'
                              className='max-w-[280px] rounded border border-slate-200 object-cover'
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                            <a
                              href={photoUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='mt-1 inline-block text-xs font-medium text-indigo-600 hover:text-indigo-800'
                            >
                              Xem ảnh
                            </a>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  </div>
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
