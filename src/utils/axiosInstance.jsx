import axios from 'axios';

// In dev, use /api so Vite proxy forwards to backend (no CORS, same origin). Else use env or default.
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:5001/api');

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // For cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor để thêm access token vào header
axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Logging request details
    console.log('=== Axios Request ===');
    console.log('Method:', config.method?.toUpperCase());
    console.log('URL:', config.baseURL + config.url);
    console.log('Headers:', config.headers);
    console.log('Data:', config.data);
    console.log('Params:', config.params);
    
    return config;
  },
  error => {
    console.error('Axios Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor để handle token refresh
axiosInstance.interceptors.response.use(
  response => {
    // Logging successful response
    console.log('=== Axios Response ===');
    console.log('Status:', response.status);
    console.log('URL:', response.config.url);
    console.log('Response data:', response.data);
    
    return response;
  },
  async error => {
    console.error('=== Axios Error ===');
    console.error('Error config:', error.config);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Error message:', error.message);
    
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Gọi refresh token endpoint
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        if (refreshResponse.data.success && refreshResponse.data.token) {
          // Lưu access token mới
          localStorage.setItem('accessToken', refreshResponse.data.token);
          // Retry request với token mới
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
          return axiosInstance(originalRequest);
        } else {
          throw new Error('Refresh token response invalid');
        }
      } catch (refreshError) {
        const status = refreshError.response?.status;
        const code = refreshError.response?.data?.code;

        if (
          status === 401 &&
          [
            'REFRESH_TOKEN_EXPIRED',
            'INVALID_REFRESH_TOKEN',
            'USER_NOT_FOUND',
          ].includes(code)
        ) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }

        // Các lỗi khác (network, server)
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

