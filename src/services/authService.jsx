import axios from 'axios';
import axiosInstance from '../utils/axiosInstance';

// Base URL cho BE. Khuyến nghị đặt VITE_API_URL = 'http://localhost:5001'
// để các endpoint dùng đúng path /api/... theo swagger.
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const authService = {
  // Token management
  getAccessToken: () => {
    return localStorage.getItem('accessToken');
  },

  setAccessToken: token => {
    localStorage.setItem('accessToken', token);
  },

  getUser: () => {
    const user = localStorage.getItem('user');
    if (!user || user === 'undefined') return null;
    try {
      return JSON.parse(user);
    } catch (error) {
      console.error('Lỗi khi parse user từ localStorage:', error);
      return null;
    }
  },

  setUser: user => {
    if (user === undefined) {
      localStorage.removeItem('user');
    } else {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  clearAuth: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  },

  // Auth operations
  register: async userData => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/register`,
        userData
      );

      // Thành công
      return {
        success: true,
        message: response.data.message || 'Đăng ký thành công!',
      };
    } catch (error) {
      // Lỗi từ server (400, 401, 500, etc.)
      if (error.response?.data) {
        return {
          success: false,
          message: error.response.data.message || 'Đăng ký thất bại',
        };
      }

      // Lỗi network hoặc khác
      return {
        success: false,
        message: 'Lỗi kết nối server',
      };
    }
  },

  login: async (username, password) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        { username, password },
        { withCredentials: true }
      );

      const { success, message, data } = response.data || {};
      const { token, user } = data || {};

      // Chuẩn hóa cấu trúc roles từ backend để FE dùng thống nhất
      let normalizedUser = user;
      if (user && Array.isArray(user.roles)) {
        const normalizeRoleCode = (inputCode = '', rawName = '') => {
          const normalized = String(inputCode || '').trim().toUpperCase();
          const aliasMap = {
            ADMIN: 'ADMIN',
            MANAGER: 'MANAGER',
            SUPPLY_COORDINATOR: 'SUPPLY_COORDINATOR',
            SUPPLYCOORDINATOR: 'SUPPLY_COORDINATOR',
            CENTRAL_KITCHEN_STAFF: 'CENTRAL_KITCHEN_STAFF',
            CENTRAL_KITCHEN: 'CENTRAL_KITCHEN_STAFF',
            CHEF: 'CENTRAL_KITCHEN_STAFF',
            KITCHEN_STAFF: 'CENTRAL_KITCHEN_STAFF',
            FRANCHISE_STORE_STAFF: 'FRANCHISE_STORE_STAFF',
            FRANCHISE_STAFF: 'FRANCHISE_STORE_STAFF',
            STORE_STAFF: 'FRANCHISE_STORE_STAFF',
            DRIVER: 'DRIVER',
          };

          if (normalized && aliasMap[normalized]) {
            return aliasMap[normalized];
          }

          const upperName = String(rawName || '').toUpperCase();
          if (upperName.includes('ADMIN')) return 'ADMIN';
          if (upperName.includes('MANAGER')) return 'MANAGER';
          if (upperName.includes('SUPPLY')) return 'SUPPLY_COORDINATOR';
          if (upperName.includes('CENTRAL') || upperName.includes('CHEF')) {
            return 'CENTRAL_KITCHEN_STAFF';
          }
          if (upperName.includes('FRANCHISE') || upperName.includes('STORE')) {
            return 'FRANCHISE_STORE_STAFF';
          }
          if (upperName.includes('DRIVER')) return 'DRIVER';

          return normalized || upperName.replace(/\s+/g, '_');
        };

        const normalizedRoles = user.roles.map(role => {
          const rawName = role.role_name || role.name || '';
          const code = normalizeRoleCode(role.code, rawName);

          return {
            ...role,
            id: role.role_id || role.id,
            name: rawName,
            code,
          };
        });

        normalizedUser = {
          ...user,
          full_name: user.full_name || user.name,
          roles: normalizedRoles,
        };
      }

      if (success && token) {
        authService.setAccessToken(token);
      }

      if (success && user) {
        authService.setUser(normalizedUser);
      }

      return {
        success: !!success,
        user: normalizedUser,
        message: message || 'Đăng nhập thành công',
        data,
      };
    } catch (error) {
      if (error.response?.data) {
        const { message, code, data, details } = error.response.data;

        return {
          success: false,
          message: message || 'Đăng nhập thất bại',
          code,
          data,
          details,
        };
      }

      return {
        success: false,
        message: 'Lỗi kết nối server',
      };
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      authService.clearAuth();
    }
  },

  refreshAccessToken: async () => {
    try {
      const response = await axiosInstance.post('/auth/refresh-token');

      if (response.data.success && response.data.token) {
        authService.setAccessToken(response.data.token);
        return response.data.token;
      }

      throw new Error('Token refresh failed');
    } catch (error) {
      authService.clearAuth();
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await axiosInstance.get('/auth/me');

      if (response.data.success) {
        // Cập nhật user info trong localStorage
        authService.setUser(response.data.user);
        return {
          success: true,
          user: response.data.user,
        };
      }

      return {
        success: false,
        message: response.data.message || 'Không thể lấy thông tin user',
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi kết nối server',
      };
    }
  },

  // Email verification functions
  verifyEmail: async (token, email) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-email`, {
        token,
        email,
      });

      return {
        success: true,
        message: response.data.message || 'Email đã được xác thực thành công!',
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Xác thực email thất bại',
        code: error.response?.data?.code,
      };
    }
  },

  resendVerification: async email => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/resend-verification`,
        { email }
      );

      return {
        success: true,
        message: response.data.message || 'Email xác thực đã được gửi lại',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || 'Lỗi khi gửi lại email xác thực',
        code: error.response?.data?.code,
      };
    }
  },

  getVerificationStatus: async email => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/auth/verification-status/${encodeURIComponent(email)}`
      );

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          'Lỗi khi kiểm tra trạng thái xác thực',
        code: error.response?.data?.code,
      };
    }
  },

  // OTP Login functions
  sendOtpLogin: async email => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/send-otp-login`, {
        email,
      });

      return {
        success: true,
        message:
          response.data.message || 'Mã OTP đã được gửi đến email của bạn',
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi khi gửi mã OTP',
        code: error.response?.data?.code,
      };
    }
  },

  loginWithOtp: async (email, otp) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login-otp`, {
        email,
        otp,
      });

      const { user, accessToken } = response.data.data;

      // Lưu token và user data
      authService.setAccessToken(accessToken);
      authService.setUser(user);

      return {
        success: true,
        data: response.data.data,
        user,
        message: response.data.message || 'Đăng nhập thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Đăng nhập OTP thất bại',
        code: error.response?.data?.code,
      };
    }
  },

  // Admin ban/unban functions
  banUser: async (userId, reason) => {
    try {
      const response = await axiosInstance.post('/auth/ban-user', {
        userId,
        reason,
      });

      return {
        success: true,
        message: response.data.message || 'Đã khóa tài khoản người dùng',
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi khi khóa tài khoản',
      };
    }
  },

  unbanUser: async userId => {
    try {
      const response = await axiosInstance.post('/auth/unban-user', {
        userId,
      });

      return {
        success: true,
        message: response.data.message || 'Đã mở khóa tài khoản người dùng',
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi khi mở khóa tài khoản',
      };
    }
  },
};

export default authService;

