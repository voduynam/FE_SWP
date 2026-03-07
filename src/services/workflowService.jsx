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
      message: error?.response?.data?.message || 'API request failed',
      error,
    };
  }
};

export const workflowService = {
  // Internal orders – Flow 1: Đặt hàng nội bộ
  getInternalOrders: params =>
    withResult(() => axiosInstance.get('/internal-orders', { params })),
  /** Returns full BE response: { data: [], pagination: { page, limit, total, pages } } */
  getInternalOrdersPaginated: async params => {
    try {
      const response = await axiosInstance.get('/internal-orders', { params });
      const payload = response?.data ?? {};
      return {
        success: true,
        data: payload,
        message: payload.message || '',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error?.response?.data?.message || 'API request failed',
        error,
      };
    }
  },
  getInternalOrder: id =>
    withResult(() => axiosInstance.get(`/internal-orders/${id}`)),
  createInternalOrder: payload =>
    withResult(() => axiosInstance.post('/internal-orders', payload)),
  updateInternalOrderStatus: (id, status) =>
    withResult(() =>
      axiosInstance.put(`/internal-orders/${id}/status`, { status })
    ),
  addInternalOrderLine: (orderId, line) =>
    withResult(() =>
      axiosInstance.post(`/internal-orders/${orderId}/lines`, line)
    ),

  // Production
  getProductionOrders: params =>
    withResult(() => axiosInstance.get('/production-orders', { params })),
  updateProductionOrderStatus: (id, payload) =>
    withResult(() => axiosInstance.put(`/production-orders/${id}/status`, payload)),

  // Shipments & logistics
  getShipments: params =>
    withResult(() => axiosInstance.get('/shipments', { params })),
  getShipment: id =>
    withResult(() => axiosInstance.get(`/shipments/${id}`)),
  getGoodsReceipts: params =>
    withResult(() => axiosInstance.get('/goods-receipts', { params })),
  /** Returns full BE response: { success, data: { data: [], pagination: { page, limit, total, pages } } } */
  getGoodsReceiptsPaginated: async params => {
    try {
      const response = await axiosInstance.get('/goods-receipts', { params });
      const payload = response?.data ?? {};
      return {
        success: true,
        data: payload,
        message: payload.message || '',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error?.response?.data?.message || 'API request failed',
        error,
      };
    }
  },
  getGoodsReceipt: id =>
    withResult(() => axiosInstance.get(`/goods-receipts/${id}`)),
  createGoodsReceipt: payload =>
    withResult(() => axiosInstance.post('/goods-receipts', payload)),
  confirmGoodsReceipt: (id, payload = { status: 'RECEIVED' }) =>
    withResult(() => axiosInstance.put(`/goods-receipts/${id}/confirm`, payload)),
  getDeliveryRoutes: params =>
    withResult(() => axiosInstance.get('/delivery-routes', { params })),

  // Supply coordination
  getConsolidatedOrders: params =>
    withResult(() => axiosInstance.get('/consolidated-orders', { params })),
  generateConsolidatedOrders: payload =>
    withResult(() => axiosInstance.post('/consolidated-orders/generate', payload)),
  getExceptions: params =>
    withResult(() => axiosInstance.get('/exceptions', { params })),
  resolveException: (id, payload) =>
    withResult(() => axiosInstance.put(`/exceptions/${id}/resolve`, payload)),

  // Inventory + alerts
  getInventoryBalances: params =>
    withResult(() => axiosInstance.get('/inventory/balances', { params })),
  getInventorySummary: params =>
    withResult(() => axiosInstance.get('/inventory/summary', { params })),
  getInventoryExpiring: params =>
    withResult(() => axiosInstance.get('/inventory/expiring', { params })),
  getAlertsSummary: params =>
    withResult(() => axiosInstance.get('/alerts/summary', { params })),
  getAlertsLowStock: params =>
    withResult(() => axiosInstance.get('/alerts/low-stock', { params })),
  getAlertsExpiry: params =>
    withResult(() => axiosInstance.get('/alerts/expiry', { params })),

  // Master/product/reporting
  getItems: params => withResult(() => axiosInstance.get('/items', { params })),
  getRecipes: params => withResult(() => axiosInstance.get('/recipes', { params })),
  getDashboardOverview: params =>
    withResult(() => axiosInstance.get('/dashboard/overview', { params })),
  getPerformanceMetrics: params =>
    withResult(() => axiosInstance.get('/performance-metrics', { params })),

  // Admin
  getUsers: params => withResult(() => axiosInstance.get('/users', { params })),
  getOrgUnits: params =>
    withResult(() => axiosInstance.get('/master-data/org-units', { params })),
  getCategories: params =>
    withResult(() => axiosInstance.get('/master-data/categories', { params })),
  getRoles: params =>
    withResult(() => axiosInstance.get('/master-data/roles', { params })),
  registerUser: payload =>
    withResult(() => axiosInstance.post('/auth/register', payload)),
};

export default workflowService;
