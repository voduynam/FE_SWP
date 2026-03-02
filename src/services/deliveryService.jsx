import axiosInstance from '../utils/axiosInstance';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const deliveryService = {
  // Get deliveries with optional filters
  getDeliveries: async (filters = {}) => {
    try {
      const response = await axiosInstance.get('/deliveries', {
        params: filters,
      });

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data || [],
          message: response.data.message,
        };
      }

      return {
        success: false,
        error: response.data.message || 'Không thể tải danh sách vận chuyển',
        data: [],
      };
    } catch (error) {
      // Fallback to mock data if API is not available
      console.warn('API error, using mock data:', error);
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
