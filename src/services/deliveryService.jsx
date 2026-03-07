import axiosInstance from '../utils/axiosInstance';

export const deliveryService = {
  /**
   * Lấy danh sách giao hàng. BE có /api/delivery-routes (không có /deliveries).
   * Gọi delivery-routes để tránh 404; trả về mảng rỗng nếu API lỗi.
   */
  getDeliveries: async (filters = {}) => {
    try {
      const response = await axiosInstance.get('/delivery-routes', {
        params: { limit: 100, ...filters },
      });

      const payload = response?.data ?? {};
      if (payload.success !== false) {
        const list = Array.isArray(payload.data) ? payload.data : [];
        return {
          success: true,
          data: list,
          message: payload.message,
          isMock: false,
        };
      }

      return {
        success: false,
        error: payload.message || 'Không thể tải danh sách',
        data: [],
      };
    } catch (error) {
      // BE có thể chưa có endpoint hoặc lỗi mạng → trả về rỗng, không log warning
      return {
        success: true,
        data: [],
        isMock: true,
        error: null,
      };
    }
  },

  // Update delivery status
  updateDeliveryStatus: async (deliveryId, newStatus) => {
    try {
      const response = await axiosInstance.patch(
        `/deliveries/${deliveryId}/status`,
        { status: newStatus }
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

  // Report issue for a delivery
  reportIssue: async (deliveryId, description) => {
    try {
      const response = await axiosInstance.post(
        `/deliveries/${deliveryId}/report-issue`,
        { description }
      );

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

  // Schedule a new delivery (for Supply Coordinator)
  scheduleDelivery: async (deliveryData) => {
    try {
      const response = await axiosInstance.post('/deliveries', deliveryData);

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

  // Get a single delivery by ID
  getDeliveryById: async (deliveryId) => {
    try {
      const response = await axiosInstance.get(`/deliveries/${deliveryId}`);

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
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
