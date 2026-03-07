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

  // Production – Flow 2: Sản xuất
  getProductionOrders: params =>
    withResult(() => axiosInstance.get('/production-orders', { params })),
  getProductionOrdersPaginated: async params => {
    try {
      const response = await axiosInstance.get('/production-orders', { params });
      const payload = response?.data ?? {};
      return { success: true, data: payload, message: payload.message || '' };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error?.response?.data?.message || 'API request failed',
        error,
      };
    }
  },
  getProductionOrder: id =>
    withResult(() => axiosInstance.get(`/production-orders/${id}`)),
  createProductionOrder: payload =>
    withResult(() => axiosInstance.post('/production-orders', payload)),
  updateProductionOrderStatus: (id, payload) =>
    withResult(() => axiosInstance.put(`/production-orders/${id}/status`, payload)),
  recordProductionConsumption: (orderId, payload) =>
    withResult(() => axiosInstance.post(`/production-orders/${orderId}/consumption`, payload)),
  recordProductionOutput: (orderId, payload) =>
    withResult(() => axiosInstance.post(`/production-orders/${orderId}/output`, payload)),

  // Công thức sản xuất (Recipe) – Manager, Admin
  getRecipes: params => withResult(() => axiosInstance.get('/recipes', { params })),
  /** Trả về full BE: { success, data: { data, pagination } } */
  getRecipesPaginated: async params => {
    try {
      const response = await axiosInstance.get('/recipes', { params });
      const payload = response?.data ?? {};
      return { success: true, data: payload, message: payload.message || '' };
    } catch (error) {
      return { success: false, data: null, message: error?.response?.data?.message || 'API request failed', error };
    }
  },
  getRecipe: id => withResult(() => axiosInstance.get(`/recipes/${id}`)),
  createRecipe: payload => withResult(() => axiosInstance.post('/recipes', payload)),
  updateRecipe: (id, payload) => withResult(() => axiosInstance.put(`/recipes/${id}`, payload)),
  updateRecipeStatus: id => withResult(() => axiosInstance.put(`/recipes/${id}/status`)),
  addRecipeLine: (recipeId, line) =>
    withResult(() => axiosInstance.post(`/recipes/${recipeId}/lines`, line)),
  deleteRecipeLine: (recipeId, lineId) =>
    withResult(() => axiosInstance.delete(`/recipes/${recipeId}/lines/${lineId}`)),

  getLots: params =>
    withResult(() => axiosInstance.get('/lots', { params })),

  // Shipments & logistics
  getShipments: params =>
    withResult(() => axiosInstance.get('/shipments', { params })),
  getShipmentsPaginated: async params => {
    try {
      const response = await axiosInstance.get('/shipments', { params });
      const payload = response?.data ?? {};
      return { success: true, data: payload, message: payload.message || '' };
    } catch (error) {
      return { success: false, data: null, message: error?.response?.data?.message || 'API request failed', error };
    }
  },
  getShipment: id =>
    withResult(() => axiosInstance.get(`/shipments/${id}`)),
  getShipmentsByOrder: orderId =>
    withResult(() => axiosInstance.get(`/shipments/by-order/${orderId}`)),
  createShipment: payload =>
    withResult(() => axiosInstance.post('/shipments', payload)),
  updateShipment: (id, payload) =>
    withResult(() => axiosInstance.put(`/shipments/${id}`, payload)),
  updateShipmentStatus: (id, status) =>
    withResult(() => axiosInstance.put(`/shipments/${id}/status`, { status })),
  dispatchShipment: id =>
    withResult(() => axiosInstance.put(`/shipments/${id}/dispatch`)),
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

  // Return requests – Flow 5
  getReturnRequests: params =>
    withResult(() => axiosInstance.get('/return-requests', { params })),
  getReturnRequestsPaginated: async params => {
    try {
      const response = await axiosInstance.get('/return-requests', { params });
      const payload = response?.data ?? {};
      return { success: true, data: payload, message: payload.message || '' };
    } catch (error) {
      return { success: false, data: null, message: error?.response?.data?.message || 'API request failed', error };
    }
  },
  getReturnRequest: id =>
    withResult(() => axiosInstance.get(`/return-requests/${id}`)),
  getReturnRequestsByStore: storeId =>
    withResult(() => axiosInstance.get(`/return-requests/by-store/${storeId}`)),
  createReturnRequest: payload =>
    withResult(() => axiosInstance.post('/return-requests', payload)),
  updateReturnRequestStatus: (id, payload) =>
    withResult(() => axiosInstance.put(`/return-requests/${id}/status`, payload)),
  processReturnRequest: id =>
    withResult(() => axiosInstance.put(`/return-requests/${id}/process`)),

  // Supply coordination – Flow 7
  getConsolidatedOrders: params =>
    withResult(() => axiosInstance.get('/consolidated-orders', { params })),
  getConsolidatedOrder: id =>
    withResult(() => axiosInstance.get(`/consolidated-orders/${id}`)),
  getConsolidatedByDate: date =>
    withResult(() => axiosInstance.get(`/consolidated-orders/by-date/${date}`)),
  generateConsolidatedOrders: payload =>
    withResult(() => axiosInstance.post('/consolidated-orders/generate', payload)),

  getDeliveryRoute: id =>
    withResult(() => axiosInstance.get(`/delivery-routes/${id}`)),
  createDeliveryRoute: payload =>
    withResult(() => axiosInstance.post('/delivery-routes', payload)),
  updateDeliveryRoute: (id, payload) =>
    withResult(() => axiosInstance.put(`/delivery-routes/${id}`, payload)),
  startDeliveryRoute: (id, payload) =>
    withResult(() => axiosInstance.put(`/delivery-routes/${id}/start`, payload)),
  completeDeliveryRoute: (id, payload) =>
    withResult(() => axiosInstance.put(`/delivery-routes/${id}/complete`, payload)),
  updateRouteStatus: (id, payload) =>
    withResult(() => axiosInstance.put(`/delivery-routes/${id}/status`, payload)),
  addRouteStop: (routeId, payload) =>
    withResult(() => axiosInstance.post(`/delivery-routes/${routeId}/stops`, payload)),
  updateRouteStop: (routeId, stopId, payload) =>
    withResult(() => axiosInstance.put(`/delivery-routes/${routeId}/stops/${stopId}`, payload)),
  updateStopStatus: (routeId, stopId, payload) =>
    withResult(() => axiosInstance.put(`/delivery-routes/${routeId}/stops/${stopId}/status`, payload)),

  getException: id =>
    withResult(() => axiosInstance.get(`/exceptions/${id}`)),
  getExceptions: params =>
    withResult(() => axiosInstance.get('/exceptions', { params })),
  createException: payload =>
    withResult(() => axiosInstance.post('/exceptions', payload)),
  resolveException: (id, payload) =>
    withResult(() => axiosInstance.put(`/exceptions/${id}/resolve`, payload)),

  getDeliveryPerformance: params =>
    withResult(() => axiosInstance.get('/performance-metrics/delivery-performance', { params })),
  getOrderFulfillment: params =>
    withResult(() => axiosInstance.get('/performance-metrics/order-fulfillment', { params })),
  getExceptionHandling: params =>
    withResult(() => axiosInstance.get('/performance-metrics/exception-handling', { params })),
  getProductionEfficiency: params =>
    withResult(() => axiosInstance.get('/performance-metrics/production-efficiency', { params })),

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
  getLocations: params =>
    withResult(() => axiosInstance.get('/master-data/locations', { params })),
  getRoles: params =>
    withResult(() => axiosInstance.get('/master-data/roles', { params })),
  registerUser: payload =>
    withResult(() => axiosInstance.post('/auth/register', payload)),
};

export default workflowService;
