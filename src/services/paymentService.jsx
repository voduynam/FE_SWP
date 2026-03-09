import axiosInstance from '../utils/axiosInstance';

const unwrapResponse = response => {
  const payload = response?.data ?? {};
  return payload.data ?? payload;
};

const withResult = async request => {
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
      message:
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        (error?.response?.status
          ? `Lỗi server (${error.response.status})`
          : 'Không thể kết nối tới server'),
      error,
    };
  }
};

export const paymentService = {
  createPayment: payload =>
    withResult(() => axiosInstance.post('/payments/create', payload)),

  getPaymentById: paymentId =>
    withResult(() => axiosInstance.get(`/payments/${paymentId}`)),

  getPaymentsByOrder: orderId =>
    withResult(() => axiosInstance.get(`/payments/order/${orderId}`)),

  checkPaymentStatus: paymentId =>
    withResult(() => axiosInstance.get(`/payments/${paymentId}/status`)),

  cancelPayment: paymentId =>
    withResult(() => axiosInstance.put(`/payments/${paymentId}/cancel`)),

  getAllPayments: params =>
    withResult(() => axiosInstance.get('/payments', { params })),
};

export default paymentService;

