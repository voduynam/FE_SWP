import axiosInstance from '../utils/axiosInstance';
import authService from './authService';

/** Trạng thái route từ BE → UI trang Delivery */
const routeStatusToUi = status => {
  const map = {
    PLANNED: 'pending',
    IN_PROGRESS: 'shipping',
    COMPLETED: 'delivered',
    CANCELLED: 'cancelled',
  };
  return map[status] || 'pending';
};

/** Trạng thái UI → BE PUT /delivery-routes/:id/status */
const uiStatusToRoute = status => {
  const map = {
    pending: 'PLANNED',
    shipping: 'IN_PROGRESS',
    delivered: 'COMPLETED',
    cancelled: 'CANCELLED',
  };
  return map[status] || null;
};

const normalizeRouteToDelivery = route => {
  if (!route || typeof route !== 'object') return null;
  const id = route._id ?? route.id ?? route.route_no;
  return {
    id,
    orderId: route.route_no ?? route.route_name ?? '—',
    store: route.route_name ?? '—',
    address: '—',
    driver: route.driver_name ?? '—',
    phone: route.driver_phone ?? '—',
    eta: route.planned_date
      ? new Date(route.planned_date).toLocaleString('vi-VN')
      : '—',
    status: routeStatusToUi(route.status),
    _raw: route,
  };
};

export const deliveryService = {
  /**
   * Danh sách tuyến giao (GET /api/delivery-routes).
   */
  getDeliveries: async (filters = {}) => {
    try {
      const response = await axiosInstance.get('/delivery-routes', {
        params: { limit: 100, ...filters },
      });

      const payload = response?.data ?? {};
      if (payload.success === false) {
        return {
          success: false,
          error: payload.message || 'Không thể tải danh sách',
          data: [],
        };
      }

      const rawList = Array.isArray(payload.data) ? payload.data : [];
      const list = rawList.map(normalizeRouteToDelivery).filter(Boolean);
      return {
        success: true,
        data: list,
        message: payload.message,
        isMock: false,
      };
    } catch (error) {
      return {
        success: true,
        data: [],
        isMock: true,
        error: null,
      };
    }
  },

  updateDeliveryStatus: async (routeId, newUiStatus) => {
    const status = uiStatusToRoute(newUiStatus);
    if (!status) {
      return {
        success: false,
        error: `Trạng thái không hợp lệ: ${newUiStatus}`,
        isMock: false,
      };
    }
    try {
      const response = await axiosInstance.put(
        `/delivery-routes/${routeId}/status`,
        { status }
      );

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message || 'Cập nhật trạng thái thành công',
          isMock: false,
        };
      }

      return {
        success: false,
        error: response.data.message || 'Cập nhật trạng thái thất bại',
        isMock: false,
      };
    } catch (error) {
      console.error('Update delivery status error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Lỗi khi cập nhật trạng thái',
        isMock: false,
      };
    }
  },

  /**
   * Ghi nhận sự cố qua POST /api/exceptions (BE không có /deliveries/.../report-issue).
   */
  reportIssue: async (routeId, description) => {
    const user = authService.getUser();
    const storeOrgUnitId =
      user?.org_unit_id ?? user?.orgUnitId ?? user?.organization_id;

    if (!storeOrgUnitId) {
      return {
        success: false,
        error:
          'Tài khoản chưa gắn đơn vị (org_unit_id). Không thể gửi báo cáo sự cố.',
      };
    }

    try {
      const response = await axiosInstance.post('/exceptions', {
        exception_type: 'LATE_DELIVERY',
        severity: 'MEDIUM',
        store_org_unit_id: storeOrgUnitId,
        description: `[Tuyến giao ${routeId}] ${description}`,
      });

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message || 'Báo cáo sự cố thành công',
        };
      }

      return {
        success: false,
        error: response.data.message || 'Gửi báo cáo thất bại',
      };
    } catch (error) {
      console.error('Report issue error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Lỗi khi gửi báo cáo',
      };
    }
  },

  scheduleDelivery: async deliveryData => {
    const d = deliveryData || {};
    const body = {
      route_name: d.route_name ?? d.routeName ?? 'Tuyến giao hàng',
      driver_id: d.driver_id ?? d.driverId,
      vehicle_no: d.vehicle_no ?? d.vehicleNo ?? undefined,
      vehicle_type: d.vehicle_type ?? d.vehicleType ?? 'MOTORCYCLE',
      planned_date: d.planned_date ?? d.plannedDate ?? undefined,
      total_distance_km: d.total_distance_km ?? d.totalDistanceKm,
      estimated_duration_mins: d.estimated_duration_mins ?? d.estimatedDurationMins,
    };

    try {
      const response = await axiosInstance.post('/delivery-routes', body);

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message || 'Lập lịch giao hàng thành công',
        };
      }

      return {
        success: false,
        error: response.data.message || 'Lập lịch giao hàng thất bại',
      };
    } catch (error) {
      console.error('Schedule delivery error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Lỗi khi lập lịch giao hàng',
      };
    }
  },

  getDeliveryById: async routeId => {
    try {
      const response = await axiosInstance.get(`/delivery-routes/${routeId}`);

      if (response.data.success) {
        const raw = response.data.data;
        return {
          success: true,
          data: normalizeRouteToDelivery(raw) ?? raw,
          message: response.data.message,
        };
      }

      return {
        success: false,
        error: response.data.message || 'Không thể tải thông tin vận chuyển',
      };
    } catch (error) {
      console.error('Get delivery by ID error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Lỗi khi tải thông tin vận chuyển',
      };
    }
  },
};

export default deliveryService;
