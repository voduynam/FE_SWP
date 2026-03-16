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
        (error?.response?.status ? `Lỗi server (${error.response.status})` : 'Không thể kết nối tới server'),
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
  createLot: payload =>
    withResult(() => axiosInstance.post('/lots', payload)),
  updateLot: (id, payload) =>
    withResult(() => axiosInstance.put(`/lots/${id}`, payload)),

  // Shipments & logistics
  getShipments: params =>
    withResult(() => axiosInstance.get('/shipments', { params })),
  getShipment: id =>
    withResult(() => axiosInstance.get(`/shipments/${id}`)),
  createShipment: payload =>
    withResult(() => axiosInstance.post('/shipments', payload)),
  updateShipmentStatus: (id, payload) => {
    const body = typeof payload === 'string' ? { status: payload } : payload || {};
    const formData = new FormData();
    if (body.status) {
      formData.append('status', body.status);
    }
    const photo = body.deliveryPhoto;
    if (photo instanceof File) {
      formData.append('delivery_photo', photo);
    } else if (photo && typeof photo === 'object' && (photo instanceof Blob || (photo.type && photo.type.startsWith('image/')))) {
      const name = photo.name || `delivery_${Date.now()}.jpg`;
      formData.append('delivery_photo', photo, name);
    }
    // Content-Type: false → axios không gửi header, browser đặt multipart/form-data + boundary (bắt buộc cho upload file)
    return withResult(() =>
      axiosInstance.put(`/shipments/${id}/status`, formData, {
        headers: { 'Content-Type': false },
      })
    );
  },
  dispatchShipment: id =>
    withResult(() => axiosInstance.put(`/shipments/${id}/dispatch`)),
  syncShipmentsPickedFromProduction: () =>
    withResult(() => axiosInstance.post('/shipments/sync-picked-from-production')),
  getShipmentsPaginated: async params => {
    try {
      const response = await axiosInstance.get('/shipments', { params });
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

  // Return requests – Flow 5: Trả hàng
  getReturnRequests: params =>
    withResult(() => axiosInstance.get('/return-requests', { params })),
  getReturnRequestsPaginated: async params => {
    try {
      const response = await axiosInstance.get('/return-requests', { params });
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
  getReturnRequest: id =>
    withResult(() => axiosInstance.get(`/return-requests/${id}`)),
  createReturnRequest: payload =>
    withResult(() => axiosInstance.post('/return-requests', payload)),
  updateReturnRequestStatus: (id, payload) =>
    withResult(() => axiosInstance.put(`/return-requests/${id}/status`, payload)),
  processReturnRequest: id =>
    withResult(() => axiosInstance.put(`/return-requests/${id}/process`)),

  getDeliveryRoutes: params =>
    withResult(() => axiosInstance.get('/delivery-routes', { params })),
  getMyDeliveryRoutes: params =>
    withResult(() => axiosInstance.get('/delivery-routes/my-routes/list', { params })),
  getDeliveryRoute: id =>
    withResult(() => axiosInstance.get(`/delivery-routes/${id}`)),
  createDeliveryRoute: payload =>
    withResult(() => axiosInstance.post('/delivery-routes', payload)),
  addRouteStop: (routeId, payload) =>
    withResult(() => axiosInstance.post(`/delivery-routes/${routeId}/stops`, payload)),
  updateRouteStatus: (id, payload) =>
    withResult(() => axiosInstance.put(`/delivery-routes/${id}/status`, payload)),
  updateStopStatus: (routeId, stopId, payload) => {
    const body = payload || {};
    const formData = new FormData();
    if (body.status) {
      formData.append('status', body.status);
    }
    const photo = body.deliveryPhoto;
    if (photo instanceof File) {
      formData.append('delivery_photo', photo);
    } else if (photo && typeof photo === 'object' && (photo instanceof Blob || (photo.type && photo.type.startsWith('image/')))) {
      const name = photo.name || `delivery_stop_${Date.now()}.jpg`;
      formData.append('delivery_photo', photo, name);
    }
    return withResult(() =>
      axiosInstance.put(
        `/delivery-routes/${routeId}/stops/${stopId}/status`,
        formData,
        { headers: { 'Content-Type': false } }
      )
    );
  },

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
  getInventoryBalancesPaginated: async params => {
    try {
      const response = await axiosInstance.get('/inventory/balances', { params });
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
  getInventoryTransactions: async params => {
    try {
      const response = await axiosInstance.get('/inventory/transactions', { params });
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
  getInventorySummary: params =>
    withResult(() => axiosInstance.get('/inventory/summary', { params })),
  adjustInventory: payload =>
    withResult(() => axiosInstance.post('/inventory/adjust', payload)),
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
  getItem: id => withResult(() => axiosInstance.get(`/items/${id}`)),
  createItem: payload => withResult(() => axiosInstance.post('/items', payload)),
  updateItem: (id, payload) =>
    withResult(() => axiosInstance.put(`/items/${id}`, payload)),
  deleteItem: id =>
    withResult(() => axiosInstance.delete(`/items/${id}`)),
  getDashboardOverview: params =>
    withResult(() => axiosInstance.get('/dashboard/overview', { params })),
  getDashboardOrders: params =>
    withResult(() => axiosInstance.get('/dashboard/orders', { params })),
  getDashboardProduction: params =>
    withResult(() => axiosInstance.get('/dashboard/production', { params })),
  getDashboardInventory: params =>
    withResult(() => axiosInstance.get('/dashboard/inventory', { params })),
  getDashboardShipments: params =>
    withResult(() => axiosInstance.get('/dashboard/shipments', { params })),
  getDashboardProfit: params =>
    withResult(() => axiosInstance.get('/dashboard/profit', { params })),
  getPerformanceMetrics: params =>
    withResult(() => axiosInstance.get('/performance-metrics', { params })),

  // Admin
  getUsers: params => withResult(() => axiosInstance.get('/users', { params })),
  getDrivers: params =>
    withResult(() => axiosInstance.get('/users/drivers/list', { params })),
  getUser: id => withResult(() => axiosInstance.get(`/users/${id}`)),
  updateUser: (id, payload) =>
    withResult(() => axiosInstance.put(`/users/${id}`, payload)),
  deleteUser: id =>
    withResult(() => axiosInstance.delete(`/users/${id}`)),
  // Master data
  getUoms: params =>
    withResult(() => axiosInstance.get('/master-data/uoms', { params })),
  getUom: id =>
    withResult(() => axiosInstance.get(`/master-data/uoms/${id}`)),
  createUom: payload =>
    withResult(() => axiosInstance.post('/master-data/uoms', payload)),
  getCategories: params =>
    withResult(() => axiosInstance.get('/master-data/categories', { params })),
  getCategory: id =>
    withResult(() => axiosInstance.get(`/master-data/categories/${id}`)),
  createCategory: payload =>
    withResult(() => axiosInstance.post('/master-data/categories', payload)),
  getSuppliers: params =>
    withResult(() => axiosInstance.get('/master-data/suppliers', { params })),
  getSupplier: id =>
    withResult(() => axiosInstance.get(`/master-data/suppliers/${id}`)),
  createSupplier: payload =>
    withResult(() => axiosInstance.post('/master-data/suppliers', payload)),
  getOrgUnits: params =>
    withResult(() => axiosInstance.get('/master-data/org-units', { params })),
  getOrgUnit: id =>
    withResult(() => axiosInstance.get(`/master-data/org-units/${id}`)),
  createOrgUnit: payload =>
    withResult(() => axiosInstance.post('/master-data/org-units', payload)),
  updateOrgUnit: (id, payload) =>
    withResult(() => axiosInstance.put(`/master-data/org-units/${id}`, payload)),
  deleteOrgUnit: id =>
    withResult(() => axiosInstance.delete(`/master-data/org-units/${id}`)),
  getLocations: params =>
    withResult(() => axiosInstance.get('/master-data/locations', { params })),
  seedStoreLocations: () =>
    withResult(() => axiosInstance.post('/master-data/seed-store-locations')),
  getLocation: id =>
    withResult(() => axiosInstance.get(`/master-data/locations/${id}`)),
  createLocation: payload =>
    withResult(() => axiosInstance.post('/master-data/locations', payload)),
  getRoles: params =>
    withResult(() => axiosInstance.get('/master-data/roles', { params })),
  registerUser: payload =>
    withResult(() => axiosInstance.post('/auth/register', payload)),
  assignUserRoles: (id, roleIds) =>
    withResult(() =>
      axiosInstance.post(`/users/${id}/roles`, { role_ids: roleIds }),
    ),
  removeUserRoles: (id, roleIds) =>
    withResult(() =>
      axiosInstance.delete(`/users/${id}/roles`, { data: { role_ids: roleIds } }),
    ),
};

export default workflowService;
