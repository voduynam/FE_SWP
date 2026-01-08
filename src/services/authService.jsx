import axios from 'axios';
import axiosInstance from '../utils/axiosInstance';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

  login: async (email, password) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      if (response.data.data?.accessToken) {
        authService.setAccessToken(response.data.data.accessToken);
      }

      if (response.data.data?.user) {
        authService.setUser(response.data.data.user);
      }

      return {
        success: true,
        user: response.data.data.user,
        message: response.data.message,
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

