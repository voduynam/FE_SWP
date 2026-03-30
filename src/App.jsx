import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'sonner';
import store from './store';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { DeliveryProvider } from './contexts/DeliveryContext';
import { EnrolledCoursesProvider } from './contexts/EnrolledCoursesContext';

// Components
import CkManagerLayout from './components/Layout/CkManagerLayout';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import RedirectRoute from './components/RedirectRoute';
import ScrollToTop from './components/ScrollToTop';

// Auth Pages
import Login from './pages/Auth/Login';
import NotFound from './pages/NotFound/NotFound';

// Payment Pages
import PaymentSuccessPage from './pages/Payment/PaymentSuccessPage';
import PaymentFailedPage from './pages/Payment/PaymentFailedPage';

// Admin Pages
import AdminDashboard from './pages/Roles/AdminDashboard';
import AdminUsersPage from './pages/Roles/AdminUsersPage';
import AdminStoresPage from './pages/Roles/AdminStoresPage';
import AdminSuppliersPage from './pages/Roles/AdminSuppliersPage';
import AdminSettingsPage from './pages/Roles/AdminSettingsPage';
import AdminReportsPage from './pages/Roles/AdminReportsPage';

// Manager Pages
import ManagerDashboard from './pages/Roles/ManagerDashboard';
import ManagerInventoryPage from './pages/Roles/ManagerInventoryPage';
import ManagerProductsPage from './pages/Roles/ManagerProductsPage';
import ManagerReportsPage from './pages/Roles/ManagerReportsPage';
import ManagerReturnRequestPage from './pages/Roles/ManagerReturnRequestPage';
import ManagerCODConfirmationPage from './pages/Roles/ManagerCODConfirmationPage';
import ManagerReportsCodPage from './pages/Roles/ManagerReportsCodPage';
import PerformanceManagementPage from './pages/Roles/PerformanceManagementPage';

// Central Kitchen Pages
import CentralKitchenDashboard from './pages/Roles/CentralKitchenDashboard';
import CentralInventoryPage from './pages/Roles/CentralInventoryPage';
import CentralMaterialsPage from './pages/Roles/CentralMaterialsPage';
import CentralOrdersPage from './pages/Roles/CentralOrdersPage';
import CentralProductionPage from './pages/Roles/CentralProductionPage';
import CompensationProductionPage from './pages/Roles/CompensationProductionPage';
import CentralShipmentsPage from './pages/Roles/CentralShipmentsPage';
import ProductionCompensationPage from './pages/Roles/ProductionCompensationPage';
import MaterialRequestsPage from './pages/Roles/MaterialRequestsPage';

// Supply Coordinator Pages
import SupplyCoordinatorDashboard from './pages/Roles/SupplyCoordinatorDashboard';
import SupplyOrdersPage from './pages/Roles/SupplyOrdersPage';
import SupplyDeliveryPage from './pages/Roles/SupplyDeliveryPage';
import SupplyIssuesPage from './pages/Roles/SupplyIssuesPage';

// Franchise Store Pages
import FranchiseStoreDashboard from './pages/Roles/FranchiseStoreDashboard';
import FranchiseOrdersPage from './pages/Roles/FranchiseOrdersPage';
import FranchiseInventoryPage from './pages/Roles/FranchiseInventoryPage';
import StaffReceiptConfirmationPage from './pages/Roles/StaffReceiptConfirmationPage';
import StoreReturnRequestPage from './pages/Roles/StoreReturnRequestPage';

// Driver Pages
import DriverDashboard from './pages/Roles/DriverDashboard';
import DriverShipmentsPage from './pages/Roles/DriverShipmentsPage';
import DriverCODManagementPage from './pages/Roles/DriverCODManagementPage';

// Shared Pages
import RecipesPage from './pages/Roles/RecipesPage';
import LocationMapPage from './pages/Roles/LocationMapPage';
import AlertsDashboardPage from './pages/Roles/AlertsDashboardPage';
import RoleDashboard from './pages/Roles/RoleDashboard';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <DeliveryProvider>
              <EnrolledCoursesProvider>
                <ScrollToTop />
                <Toaster position="top-right" richColors />
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<RedirectRoute><Login /></RedirectRoute>} />
                  <Route path="/payment-success" element={<PaymentSuccessPage />} />
                  <Route path="/payment-failed" element={<PaymentFailedPage />} />

                  {/* Admin Routes - /app/admin/* */}
                  <Route element={<CkManagerLayout />}>
                    <Route 
                      path="/app/admin/dashboard" 
                      element={<RoleProtectedRoute allowedRoles={['admin']}><AdminDashboard /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/admin/users" 
                      element={<RoleProtectedRoute allowedRoles={['admin']}><AdminUsersPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/admin/stores" 
                      element={<RoleProtectedRoute allowedRoles={['admin']}><AdminStoresPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/admin/suppliers" 
                      element={<RoleProtectedRoute allowedRoles={['admin']}><AdminSuppliersPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/admin/settings" 
                      element={<RoleProtectedRoute allowedRoles={['admin']}><AdminSettingsPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/admin/reports" 
                      element={<RoleProtectedRoute allowedRoles={['admin']}><AdminReportsPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/admin/location-map" 
                      element={<RoleProtectedRoute allowedRoles={['admin']}><LocationMapPage /></RoleProtectedRoute>} 
                    />
                  </Route>

                  {/* Manager Routes - /app/manager/* */}
                  <Route element={<CkManagerLayout />}>
                    <Route 
                      path="/app/manager/dashboard" 
                      element={<RoleProtectedRoute allowedRoles={['manager']}><ManagerDashboard /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/manager/products" 
                      element={<RoleProtectedRoute allowedRoles={['manager', 'admin']}><ManagerProductsPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/manager/recipes" 
                      element={<RoleProtectedRoute allowedRoles={['manager', 'admin']}><RecipesPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/manager/inventory" 
                      element={<RoleProtectedRoute allowedRoles={['manager']}><ManagerInventoryPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/manager/shipments" 
                      element={<RoleProtectedRoute allowedRoles={['manager']}><CentralShipmentsPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/manager/returns" 
                      element={<RoleProtectedRoute allowedRoles={['manager', 'central_kitchen']}><ManagerReturnRequestPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/manager/reports-cod" 
                      element={<RoleProtectedRoute allowedRoles={['manager']}><ManagerReportsCodPage /></RoleProtectedRoute>} 
                    />
                  </Route>

                  {/* Central Kitchen Routes - /app/central/* */}
                  <Route element={<CkManagerLayout />}>
                    <Route 
                      path="/app/central/dashboard" 
                      element={<RoleProtectedRoute allowedRoles={['central_kitchen']}><CentralKitchenDashboard /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/central/orders" 
                      element={<RoleProtectedRoute allowedRoles={['central_kitchen', 'manager', 'supply_coordinator']}><CentralOrdersPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/central/production" 
                      element={<RoleProtectedRoute allowedRoles={['central_kitchen']}><CentralProductionPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/central/compensation" 
                      element={<RoleProtectedRoute allowedRoles={['central_kitchen']}><ProductionCompensationPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/central/compensation-production" 
                      element={<RoleProtectedRoute allowedRoles={['central_kitchen']}><CompensationProductionPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/central/shipments" 
                      element={<RoleProtectedRoute allowedRoles={['central_kitchen', 'supply_coordinator']}><CentralShipmentsPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/central/materials" 
                      element={<RoleProtectedRoute allowedRoles={['central_kitchen']}><CentralMaterialsPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/central/inventory" 
                      element={<RoleProtectedRoute allowedRoles={['central_kitchen']}><CentralInventoryPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/central/material-requests" 
                      element={<RoleProtectedRoute allowedRoles={['central_kitchen', 'manager']}><MaterialRequestsPage /></RoleProtectedRoute>} 
                    />
                  </Route>

                  {/* Supply Coordinator Routes - /app/supply/* */}
                  <Route element={<CkManagerLayout />}>
                    <Route 
                      path="/app/supply/dashboard" 
                      element={<RoleProtectedRoute allowedRoles={['supply_coordinator']}><SupplyCoordinatorDashboard /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/supply/orders" 
                      element={<RoleProtectedRoute allowedRoles={['supply_coordinator']}><SupplyOrdersPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/supply/delivery" 
                      element={<RoleProtectedRoute allowedRoles={['supply_coordinator']}><SupplyDeliveryPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/supply/shipments" 
                      element={<RoleProtectedRoute allowedRoles={['supply_coordinator']}><CentralShipmentsPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/supply/issues" 
                      element={<RoleProtectedRoute allowedRoles={['supply_coordinator']}><SupplyIssuesPage /></RoleProtectedRoute>} 
                    />
                  </Route>

                  {/* Franchise Store Routes - /app/store/* */}
                  <Route element={<CkManagerLayout />}>
                    <Route 
                      path="/app/store/dashboard" 
                      element={<RoleProtectedRoute allowedRoles={['franchise_staff']}><FranchiseStoreDashboard /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/store/orders" 
                      element={<RoleProtectedRoute allowedRoles={['franchise_staff']}><FranchiseOrdersPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/store/receipt-confirmation" 
                      element={<RoleProtectedRoute allowedRoles={['franchise_staff']}><StaffReceiptConfirmationPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/store/returns" 
                      element={<RoleProtectedRoute allowedRoles={['franchise_staff']}><StoreReturnRequestPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/store/inventory" 
                      element={<RoleProtectedRoute allowedRoles={['franchise_staff']}><FranchiseInventoryPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/store/location-map" 
                      element={<RoleProtectedRoute allowedRoles={['franchise_staff']}><LocationMapPage /></RoleProtectedRoute>} 
                    />
                  </Route>

                  {/* Driver Routes - /app/driver/* */}
                  <Route element={<CkManagerLayout />}>
                    <Route 
                      path="/app/driver/dashboard" 
                      element={<RoleProtectedRoute allowedRoles={['driver']}><DriverDashboard /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/driver/shipments" 
                      element={<RoleProtectedRoute allowedRoles={['driver']}><DriverShipmentsPage /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/driver/cod-management" 
                      element={<RoleProtectedRoute allowedRoles={['driver']}><DriverCODManagementPage /></RoleProtectedRoute>} 
                    />
                  </Route>

                  {/* Shared Routes */}
                  <Route element={<CkManagerLayout />}>
                    <Route 
                      path="/app/dashboard" 
                      element={<RoleProtectedRoute><RoleDashboard /></RoleProtectedRoute>} 
                    />
                    <Route 
                      path="/app/alerts" 
                      element={<RoleProtectedRoute allowedRoles={['admin', 'manager', 'central_kitchen']}><AlertsDashboardPage /></RoleProtectedRoute>} 
                    />
                  </Route>

                  {/* Redirects */}
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
                  
                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </EnrolledCoursesProvider>
            </DeliveryProvider>
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </Provider>
  );
}

export default App;
