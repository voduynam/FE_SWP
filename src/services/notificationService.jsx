import axiosInstance from '../utils/axiosInstance';

const unwrapResponse = (response) => {
  const payload = response?.data ?? {};
  return payload.data ?? payload;
};

const withResult = async (request) => {
  try {
    const response = await request();
    return {
      success: true,
      data: unwrapResponse(response),
      message: response?.data?.message || '',
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      message: error?.response?.data?.message || 'API request failed',
      error,
    };
  }
};

export const notificationService = {
  getNotifications: (params) =>
    withResult(() => axiosInstance.get('/notifications', { params })),
  markAsRead: (id) =>
    withResult(() => axiosInstance.put(`/notifications/${id}/read`)),
  markAllAsRead: () =>
    withResult(() => axiosInstance.put('/notifications/read-all')),
};

export default notificationService;

