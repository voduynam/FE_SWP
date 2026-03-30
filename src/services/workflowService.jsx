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
  // ---------------------------------------------------------------------------
  // Internal orders – Flow 1: Đặt hàng nội bộ
  // ---------------------------------------------------------------------------
  getInternalOrders: params =>
    withResult(() => axiosInstance.get('/internal-orders', { params })),

  getInternalOrdersPaginated: async params => {
    try {
      const response = await axiosInstance.get('/internal-orders', { params });
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

  getInternalOrder: id =>
    withResult(() => axiosInstance.get(`/internal-orders/${id}`)),

  createInternalOrder: payload =>
    withResult(() => axiosInstance.post('/internal-orders', payload)),

  updateInternalOrderStatus: (id, status) =>
    withResult(() => axiosInstance.put(`/internal-orders/${id}/status`, { status })),

  fixOrderStatusAfterCancelledShipment: id =>
    withResult(() => axiosInstance.put(`/internal-orders/${id}/fix-status`)),

  manuallyRestoreInventoryForCancelledShipments: id =>
    withResult(() => axiosInstance.post(`/internal-orders/${id}/restore-inventory`)),

  addInternalOrderLine: (orderId, line) =>
    withResult(() => axiosInstance.post(`/internal-orders/${orderId}/lines`, line)),

  // ---------------------------------------------------------------------------
  // Production – Flow 2: Sản xuất & Compensation
  // ---------------------------------------------------------------------------
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

  syncProductionToInventory: id =>
    withResult(() => axiosInstance.post(`/production-orders/${id}/sync-inventory`)),

  recordProductionConsumption: (orderId, payload) =>
    withResult(() => axiosInstance.post(`/production-orders/${orderId}/consumption`, payload)),

  recordProductionOutput: (orderId, payload) =>
    withResult(() => axiosInstance.post(`/production-orders/${orderId}/output`, payload)),

  checkProductionVariance: orderId =>
    withResult(() => axiosInstance.get(`/production-orders/${orderId}/variance-check`)),

  createProductionCompensation: (orderId, compensationData) =>
    withResult(() => axiosInstance.post(`/production-orders/${orderId}/compensate`, compensationData)),

  executeProductionCompensation: orderId =>
    withResult(() => axiosInstance.post(`/production-orders/${orderId}/execute-compensation`)),

  recordProductionWaste: (orderId, wasteData) =>
    withResult(() => axiosInstance.post(`/production-orders/${orderId}/waste`, wasteData)),

  getVarianceCosts: params =>
    withResult(() => axiosInstance.get('/production-variance-costs', { params })),

  getVarianceCost: id =>
    withResult(() => axiosInstance.get(`/production-variance-costs/${id}`)),

  approveVarianceCost: id =>
    withResult(() => axiosInstance.put(`/production-variance-costs/${id}/approve`)),

  rejectVarianceCost: (id, reason) =>
    withResult(() => axiosInstance.put(`/production-variance-costs/${id}/reject`, { reason })),

  // ---------------------------------------------------------------------------
  // Recipes – Flow 2.1: Công thức
  // ---------------------------------------------------------------------------
  getRecipes: params => withResult(() => axiosInstance.get('/recipes', { params })),

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

  // ---------------------------------------------------------------------------
  // Lots & Inventory
  // ---------------------------------------------------------------------------
  getLots: params => withResult(() => axiosInstance.get('/lots', { params })),
  createLot: payload => withResult(() => axiosInstance.post('/lots', payload)),
  updateLot: (id, payload) => withResult(() => axiosInstance.put(`/lots/${id}`, payload)),

  // ---------------------------------------------------------------------------
  // Shipments & logistics
  // ---------------------------------------------------------------------------
  getShipments: params =>
    withResult(() => axiosInstance.get('/shipments', { params })),

  getShipmentsPaginated: async params => {
    try {
      console.log('=== Get Shipments API Call ===');
      console.log('Params:', params);
      
      const response = await axiosInstance.get('/shipments', { params });
      console.log('Raw API Response:', response);
      console.log('Response data:', response.data);
      
      const payload = response?.data ?? {};
      return { success: true, data: payload, message: payload.message || '' };
    } catch (error) {
      console.error('Get Shipments Error:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      return {
        success: false,
        data: null,
        message: error?.response?.data?.message || 'API request failed',
        error,
      };
    }
  },

  getShipment: id => withResult(() => axiosInstance.get(`/shipments/${id}`)),
  createShipment: payload => withResult(() => axiosInstance.post('/shipments', payload)),

  updateShipmentStatus: (id, payload) => {
    const body = typeof payload === 'string' ? { status: payload } : payload || {};
    const formData = new FormData();
    if (body.status) formData.append('status', body.status);
    
    if (body.deliveryPhoto instanceof File) {
      formData.append('delivery_photo', body.deliveryPhoto);
    } else if (body.deliveryPhoto && typeof body.deliveryPhoto === 'object' && (body.deliveryPhoto instanceof Blob || (body.deliveryPhoto.type && body.deliveryPhoto.type.startsWith('image/')))) {
      const name = body.deliveryPhoto.name || `delivery_${Date.now()}.jpg`;
      formData.append('delivery_photo', body.deliveryPhoto, name);
    }
    
    // COD for driver
    if (body.codCollection) {
      formData.append('cod_amount_collected', body.codCollection.amount_collected);
      if (body.codCollection.collection_notes) formData.append('cod_collection_notes', body.codCollection.collection_notes);
      if (Array.isArray(body.codCollection.evidence_photos)) {
        body.codCollection.evidence_photos.forEach(file => {
          if (file instanceof File) formData.append('cod_evidence_photos', file);
        });
      }
    }
    
    return withResult(() => axiosInstance.put(`/shipments/${id}/status`, formData, { headers: { 'Content-Type': false } }));
  },

  dispatchShipment: id => withResult(() => axiosInstance.put(`/shipments/${id}/dispatch`)),
  updateShipmentCODStatus: (id, data) => withResult(() => axiosInstance.put(`/shipments/${id}/cod-status`, data)),
  syncShipmentsPickedFromProduction: () => withResult(() => axiosInstance.post('/shipments/sync-picked-from-production')),

  // ---------------------------------------------------------------------------
  // Receipt Confirmation (IMPORTANT: FIX FOR 400 ERR)
  // ---------------------------------------------------------------------------
  getPendingReceipts: params =>
    withResult(() => axiosInstance.get('/shipments', {
      params: { status: 'DELIVERED', receipt_status: 'PENDING_RECEIPT', ...params }
    })),

  /**
   * id: shipmentId
   * data: FormData or plain object
   */
  confirmReceipt: (id, data) => {
    let payload = data;
    if (!(data instanceof FormData)) {
      payload = new FormData();
      payload.append('receipt_status', data.receipt_status);
      payload.append('receipt_notes', data.receipt_notes || '');
      payload.append('delivery_discrepancy', data.delivery_discrepancy || '');
      if (Array.isArray(data.evidence_photos)) {
        data.evidence_photos.forEach(file => payload.append('evidence_photos', file));
      }
    }
    
    console.log('=== Confirm Receipt API Call ===');
    console.log('Shipment ID:', id);
    console.log('Payload type:', payload.constructor.name);
    console.log('Payload entries:');
    for (let [key, value] of payload.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}:`, value.name, value.type, value.size);
      } else {
        console.log(`  ${key}:`, value);
      }
    }
    
    return withResult(() => axiosInstance.put(`/shipments/${id}/confirm-receipt`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }));
  },

  checkPendingReceipts: () => withResult(() => axiosInstance.get('/shipments/check-pending-receipts')),

  // ---------------------------------------------------------------------------
  // Goods Receipts – Flow 4: Nhập kho
  // ---------------------------------------------------------------------------
  getGoodsReceipts: params => withResult(() => axiosInstance.get('/goods-receipts', { params })),

  getGoodsReceiptsPaginated: async params => {
    try {
      const response = await axiosInstance.get('/goods-receipts', { params });
      const payload = response?.data ?? {};
      return { success: true, data: payload, message: payload.message || '' };
    } catch (error) {
      return { success: false, data: null, message: error?.response?.data?.message || 'API request failed', error };
    }
  },

  getGoodsReceipt: id => withResult(() => axiosInstance.get(`/goods-receipts/${id}`)),
  createGoodsReceipt: payload => withResult(() => axiosInstance.post('/goods-receipts', payload)),
  confirmGoodsReceipt: (id, payload = { status: 'RECEIVED' }) => 
    withResult(() => axiosInstance.put(`/goods-receipts/${id}/confirm`, payload)),

  // ---------------------------------------------------------------------------
  // Return requests – Flow 5: Trả hàng
  // ---------------------------------------------------------------------------
  getReturnRequests: params => withResult(() => axiosInstance.get('/return-requests', { params })),
  getReturnRequestsPaginated: async params => {
    try {
      const response = await axiosInstance.get('/return-requests', { params });
      const payload = response?.data ?? {};
      return { success: true, data: payload, message: payload.message || '' };
    } catch (error) {
      return { success: false, data: null, message: error?.response?.data?.message || 'API request failed', error };
    }
  },
  getReturnRequest: id => withResult(() => axiosInstance.get(`/return-requests/${id}`)),
  createReturnRequest: payload => withResult(() => axiosInstance.post('/return-requests', payload)),
  reviewReturnRequest: (id, payload) => withResult(() => axiosInstance.put(`/return-requests/${id}/review`, payload)),
  processReturnRequest: id => withResult(() => axiosInstance.put(`/return-requests/${id}/process`)),
  updateReturnRequestStatus: (id, payload) => withResult(() => axiosInstance.put(`/return-requests/${id}/status`, payload)),

  // ---------------------------------------------------------------------------
  // Inventory & Alerts
  // ---------------------------------------------------------------------------
  getInventoryBalances: params => withResult(() => axiosInstance.get('/inventory/balances', { params })),
  getInventoryBalancesPaginated: async params => {
    try {
      const response = await axiosInstance.get('/inventory/balances', { params });
      const payload = response?.data ?? {};
      return { success: true, data: payload, message: payload.message || '' };
    } catch (error) {
      return { success: false, data: null, message: error?.response?.data?.message || 'API request failed', error };
    }
  },
  getInventoryBalancesGrouped: async params => {
    try {
      const response = await axiosInstance.get('/inventory/balances/grouped', { params });
      const payload = response?.data ?? {};
      return { success: true, data: payload, message: payload.message || '' };
    } catch (error) {
      return { success: false, data: null, message: error?.response?.data?.message || 'API request failed', error };
    }
  },
  getInventoryTransactions: async params => {
    try {
      const response = await axiosInstance.get('/inventory/transactions', { params });
      const payload = response?.data ?? {};
      return { success: true, data: payload, message: payload.message || '' };
    } catch (error) {
      return { success: false, data: null, message: error?.response?.data?.message || 'API request failed', error };
    }
  },
  getInventorySummary: params => withResult(() => axiosInstance.get('/inventory/summary', { params })),
  getInventoryExpiring: params => withResult(() => axiosInstance.get('/inventory/expiring', { params })),
  adjustInventory: payload => withResult(() => axiosInstance.post('/inventory/adjust', payload)),
  getAlertsSummary: params => withResult(() => axiosInstance.get('/alerts/summary', { params })),
  getAlertsLowStock: params => withResult(() => axiosInstance.get('/alerts/low-stock', { params })),
  getAlertsExpiry: params => withResult(() => axiosInstance.get('/alerts/expiry', { params })),

  // ---------------------------------------------------------------------------
  // Performance
  // ---------------------------------------------------------------------------
  getPerformanceMetrics: params => withResult(() => axiosInstance.get('/performance-metrics', { params })),
  getPerformanceDashboardData: params => withResult(() => axiosInstance.get('/performance-metrics/dashboard', { params })),
  getPerformanceViolations: params => withResult(() => axiosInstance.get('/performance/violations', { params })),
  getPerformanceViolation: id => withResult(() => axiosInstance.get(`/performance/violations/${id}`)),
  reviewPerformanceViolation: (violationId, reviewData) => withResult(() => axiosInstance.put(`/performance/violations/${violationId}/review`, reviewData)),
  runPerformanceCheck: () => withResult(() => axiosInstance.post('/performance/run-checks')),
  getUserPerformanceHistory: (userId, params = {}) => withResult(() => axiosInstance.get(`/performance/users/${userId}/history`, { params })),

  // ---------------------------------------------------------------------------
  // Material Requests
  // ---------------------------------------------------------------------------
  getMaterialRequests: params => withResult(() => axiosInstance.get('/material-requests', { params })),
  getMaterialRequest: id => withResult(() => axiosInstance.get(`/material-requests/${id}`)),
  createMaterialRequest: payload => withResult(() => axiosInstance.post('/material-requests', payload)),
  reviewMaterialRequest: (id, reviewData) => withResult(() => axiosInstance.put(`/material-requests/${id}/review`, reviewData)),
  updateMaterialRequestStatus: (id, statusData) => withResult(() => axiosInstance.put(`/material-requests/${id}/status`, statusData)),
  checkStockLevels: params => withResult(() => axiosInstance.get('/material-requests/stock-check', { params })),

  // ---------------------------------------------------------------------------
  // Master Data & Items
  // ---------------------------------------------------------------------------
  getItems: params => withResult(() => axiosInstance.get('/items', { params })),
  getItem: id => withResult(() => axiosInstance.get(`/items/${id}`)),
  createItem: payload => withResult(() => axiosInstance.post('/items', payload)),
  updateItem: (id, payload) => withResult(() => axiosInstance.put(`/items/${id}`, payload)),
  deleteItem: id => withResult(() => axiosInstance.delete(`/items/${id}`)),
  updateItemCostPrice: (itemId, cost_price) => withResult(() => axiosInstance.put(`/items/${itemId}/cost-price`, { cost_price })),
  batchUpdateCostPrices: updates => withResult(() => axiosInstance.put('/items/batch-update-cost-prices', { updates })),
  getMaterialsWithoutCost: params => withResult(() => axiosInstance.get('/items/materials-without-cost', { params })),

  getUoms: params => withResult(() => axiosInstance.get('/master-data/uoms', { params })),
  getUom: id => withResult(() => axiosInstance.get(`/master-data/uoms/${id}`)),
  createUom: payload => withResult(() => axiosInstance.post('/master-data/uoms', payload)),
  getCategories: params => withResult(() => axiosInstance.get('/master-data/categories', { params })),
  getCategory: id => withResult(() => axiosInstance.get(`/master-data/categories/${id}`)),
  createCategory: payload => withResult(() => axiosInstance.post('/master-data/categories', payload)),
  getSuppliers: params => withResult(() => axiosInstance.get('/master-data/suppliers', { params })),
  getSupplier: id => withResult(() => axiosInstance.get(`/master-data/suppliers/${id}`)),
  createSupplier: payload => withResult(() => axiosInstance.post('/master-data/suppliers', payload)),
  getOrgUnits: params => withResult(() => axiosInstance.get('/master-data/org-units', { params })),
  getOrgUnit: id => withResult(() => axiosInstance.get(`/master-data/org-units/${id}`)),
  createOrgUnit: payload => withResult(() => axiosInstance.post('/master-data/org-units', payload)),
  updateOrgUnit: (id, payload) => withResult(() => axiosInstance.put(`/master-data/org-units/${id}`, payload)),
  deleteOrgUnit: id => withResult(() => axiosInstance.delete(`/master-data/org-units/${id}`)),
  createOrgUnit_master: payload => withResult(() => axiosInstance.post('/master-data/org-units', payload)), // Alias for backward compatibility if needed
  updateOrgUnit_master: (id, payload) => withResult(() => axiosInstance.put(`/master-data/org-units/${id}`, payload)), // Alias
  deleteOrgUnit_master: id => withResult(() => axiosInstance.delete(`/master-data/org-units/${id}`)), // Alias
  getLocations: params => withResult(() => axiosInstance.get('/master-data/locations', { params })),
  getLocation: id => withResult(() => axiosInstance.get(`/master-data/locations/${id}`)),
  createLocation: payload => withResult(() => axiosInstance.post('/master-data/locations', payload)),
  getRoles: params => withResult(() => axiosInstance.get('/master-data/roles', { params })),
  seedStoreLocations: async () => {
    try {
      const res = await axiosInstance.get('/master-data/locations', { params: { status: 'ACTIVE', limit: 1000 } });
      const payload = res?.data ?? {};
      return { success: true, data: { locations: payload?.data ?? payload }, message: payload?.message || '' };
    } catch (error) {
      return { success: false, data: { locations: [] }, message: 'Không tải được locations', error };
    }
  },

  // ---------------------------------------------------------------------------
  // Users & Map
  // ---------------------------------------------------------------------------
  getUsers: params => withResult(() => axiosInstance.get('/users', { params })),
  getUser: id => withResult(() => axiosInstance.get(`/users/${id}`)),
  updateUser: (id, payload) => withResult(() => axiosInstance.put(`/users/${id}`, payload)),
  deleteUser: id => withResult(() => axiosInstance.delete(`/users/${id}`)),
  getDrivers: params => withResult(() => axiosInstance.get('/users/drivers/list', { params })),
  registerUser: payload => withResult(() => axiosInstance.post('/auth/register', payload)),
  assignUserRoles: (id, role_ids) => withResult(() => axiosInstance.post(`/users/${id}/roles`, { role_ids })),
  removeUserRoles: (id, role_ids) => withResult(() => axiosInstance.delete(`/users/${id}/roles`, { data: { role_ids } })),

  getOrgUnitsForMap: params => withResult(() => axiosInstance.get('/locations/org-units', { params })),
  createOrgUnitMap: data => withResult(() => axiosInstance.post('/locations/org-unit', data)),
  updateOrgUnitCoordinates: (id, coordinates) => withResult(() => axiosInstance.put(`/locations/org-unit/${id}/coordinates`, coordinates)),
  geocodeAddress: address => withResult(() => axiosInstance.get('/locations/geocode', { params: { address } })),
  getUserLocation: (userId = null) => withResult(() => axiosInstance.get(`/locations/user-location${userId ? `/${userId}` : ''}`)),
  updateUserLocation: coordinates => withResult(() => axiosInstance.post('/locations/user-location', coordinates)),
  getNearbyLocations: params => withResult(() => axiosInstance.get('/locations/nearby', { params })),
  getGoogleMapsLinks: params => withResult(() => axiosInstance.get('/locations/google-maps-links', { params })),

  // ---------------------------------------------------------------------------
  // Delivery Routes
  // ---------------------------------------------------------------------------
  getDeliveryRoutes: params => withResult(() => axiosInstance.get('/delivery-routes', { params })),
  getMyDeliveryRoutes: params => withResult(() => axiosInstance.get('/delivery-routes/my-routes/list', { params })),
  getDeliveryRoute: id => withResult(() => axiosInstance.get(`/delivery-routes/${id}`)),
  createDeliveryRoute: payload => withResult(() => axiosInstance.post('/delivery-routes', payload)),
  addRouteStop: (routeId, payload) => withResult(() => axiosInstance.post(`/delivery-routes/${routeId}/stops`, payload)),
  updateRouteStatus: (id, payload) => withResult(() => axiosInstance.put(`/delivery-routes/${id}/status`, payload)),
  updateStopStatus: (routeId, stopId, payload) => {
    const formData = new FormData();
    if (payload.status) formData.append('status', payload.status);
    if (payload.deliveryPhoto instanceof File) formData.append('delivery_photo', payload.deliveryPhoto);
    return withResult(() => axiosInstance.put(`/delivery-routes/${routeId}/stops/${stopId}/status`, formData, { headers: { 'Content-Type': false } }));
  },

  // ---------------------------------------------------------------------------
  // Supply / Exceptions
  // ---------------------------------------------------------------------------
  getConsolidatedOrders: params => withResult(() => axiosInstance.get('/consolidated-orders', { params })),
  generateConsolidatedOrders: payload => withResult(() => axiosInstance.post('/consolidated-orders/generate', payload)),
  getExceptions: params => withResult(() => axiosInstance.get('/exceptions', { params })),
  getException: id => withResult(() => axiosInstance.get(`/exceptions/${encodeURIComponent(id)}`)),
  createException: payload => withResult(() => axiosInstance.post('/exceptions', payload)),
  updateException: (id, payload) => withResult(() => axiosInstance.put(`/exceptions/${encodeURIComponent(id)}`, payload)),
  resolveException: (id, payload) => withResult(() => axiosInstance.put(`/exceptions/${encodeURIComponent(id)}/resolve`, payload)),

  // ---------------------------------------------------------------------------
  // Dashboard Overviews
  // ---------------------------------------------------------------------------
  getDashboardOverview: params => withResult(() => axiosInstance.get('/dashboard/overview', { params })),
  getDashboardOrders: params => withResult(() => axiosInstance.get('/dashboard/orders', { params })),
  getDashboardProduction: params => withResult(() => axiosInstance.get('/dashboard/production', { params })),
  getDashboardInventory: params => withResult(() => axiosInstance.get('/dashboard/inventory', { params })),
  getDashboardShipments: params => withResult(() => axiosInstance.get('/dashboard/shipments', { params })),
  getDashboardProfit: params => withResult(() => axiosInstance.get('/dashboard/profit', { params })),

  // ---------------------------------------------------------------------------
  // COD (Cash on Delivery)
  // ---------------------------------------------------------------------------
  collectCOD: (shipmentId, data) => {
    let payload = data;
    if (!(data instanceof FormData)) {
      payload = new FormData();
      payload.append('amount_collected', data.amount_collected);
      payload.append('collection_notes', data.collection_notes || '');
      if (Array.isArray(data.evidence_photos)) {
        data.evidence_photos.forEach(file => payload.append('evidence_photos', file));
      }
    }
    return withResult(() => axiosInstance.put(`/shipments/${shipmentId}/collect-cod`, payload, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
  getCODPayments: params => withResult(() => axiosInstance.get('/payments/cod', { params })),
  confirmCODPayment: (paymentId, data) => withResult(() => axiosInstance.put(`/payments/${paymentId}/confirm-cod`, data)),
  getCODDashboard: () => withResult(() => axiosInstance.get('/payments/cod/dashboard')),
};

export default workflowService;
