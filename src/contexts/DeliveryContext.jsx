import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { deliveryService } from '../services/deliveryService';

const DeliveryContext = createContext();

export const DeliveryProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastFetchRef = useRef(null);

  // Xác định filters dựa trên role
  const getFilters = useCallback(() => {
    if (!user) return {};

    const userRole = user?.roleId?.roleName || user?.role || '';
    const filters = {};

    // Driver chỉ xem đơn của mình
    if (userRole === 'driver') {
      // Thử lấy driverId từ user object hoặc username
      // Mock data sử dụng 'driver' làm driverId cho demo user
      const driverId = user?.id || user?.username || 'driver';
      filters.driverId = driverId;
    }

    // Có thể thêm filters khác theo role
    return filters;
  }, [user]);

  // Fetch deliveries từ API
  const fetchDeliveries = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      setDeliveries([]);
      return;
    }

    // Không fetch lại nếu đã fetch gần đây (trong 30s) và không force
    if (!forceRefresh && lastFetchRef.current && Date.now() - lastFetchRef.current < 30000) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters = getFilters();
      const result = await deliveryService.getDeliveries(filters);

      if (result.success) {
        const deliveriesData = result.data || [];
        setDeliveries(deliveriesData);
        lastFetchRef.current = Date.now();
      } else {
        setError(result.error || 'Không thể tải danh sách vận chuyển');
        setDeliveries([]);
      }
    } catch (err) {
      setError('Lỗi khi tải dữ liệu');
      console.error('Fetch deliveries error:', err);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, getFilters]);

  // Auto fetch khi mount hoặc user thay đổi
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setDeliveries([]);
      setLoading(false);
      return;
    }

    // Chỉ fetch khi đã có user
    fetchDeliveries(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // Auto refresh mỗi 60s
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchDeliveries(false);
    }, 60000); // Refresh mỗi 60s

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchDeliveries]);

  // Cập nhật trạng thái delivery
  const updateDeliveryStatus = useCallback(async (deliveryId, newStatus) => {
    // Optimistic update
    setDeliveries(prev =>
      prev.map(d =>
        d.id === deliveryId ? { ...d, status: newStatus } : d
      )
    );

    // Call API
    const result = await deliveryService.updateDeliveryStatus(deliveryId, newStatus);

    if (!result.success) {
      // Revert nếu API fail
      fetchDeliveries(true);
      throw new Error(result.error || 'Cập nhật thất bại');
    }

    // Refresh để đảm bảo sync
    if (!result.isMock) {
      fetchDeliveries(true);
    }

    return result;
  }, [fetchDeliveries]);

  // Báo cáo sự cố
  const reportIssue = useCallback(async (deliveryId, description) => {
    const result = await deliveryService.reportIssue(deliveryId, description);

    if (!result.success) {
      throw new Error(result.error || 'Gửi báo cáo thất bại');
    }

    return result;
  }, []);

  // Lập lịch giao hàng (cho Supply Coordinator)
  const scheduleDelivery = useCallback(async (deliveryData) => {
    const result = await deliveryService.scheduleDelivery(deliveryData);

    if (!result.success) {
      throw new Error(result.error || 'Lập lịch thất bại');
    }

    // Refresh danh sách
    fetchDeliveries(true);

    return result;
  }, [fetchDeliveries]);

  // Manual refresh
  const refresh = useCallback(() => {
    fetchDeliveries(true);
  }, [fetchDeliveries]);

  const value = {
    deliveries,
    loading,
    error,
    updateDeliveryStatus,
    reportIssue,
    scheduleDelivery,
    refresh,
  };

  return (
    <DeliveryContext.Provider value={value}>
      {children}
    </DeliveryContext.Provider>
  );
};

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error('useDelivery must be used within DeliveryProvider');
  }
  return context;
};
