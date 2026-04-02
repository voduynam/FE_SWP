import { lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { EnrolledCoursesProvider } from './contexts/EnrolledCoursesContext';
import { DeliveryProvider } from './contexts/DeliveryContext';
import { Provider } from 'react-redux';
import store from './store';
import ScrollToTop from './components/ScrollToTop';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import RedirectRoute from './components/RedirectRoute';
import AppHomeRedirect from './components/AppHomeRedirect';
import Layout from './components/Layout/Layout';
import CkManagerLayout from './components/Layout/CkManagerLayout';
import Login from './pages/Auth/Login';
import NotFound from './pages/NotFound/NotFound';
import RoleDashboard from './pages/Roles/RoleDashboard';
const AdminUsersPage = lazy(() => import('./pages/Roles/AdminUsersPage'));
const AdminStoresPage = lazy(() => import('./pages/Roles/AdminStoresPage'));
const AdminSettingsPage = lazy(() => import('./pages/Roles/AdminSettingsPage'));
const ManagerProductsPage = lazy(() => import('./pages/Roles/ManagerProductsPage'));
const ManagerInventoryPage = lazy(() => import('./pages/Roles/ManagerInventoryPage'));
const ManagerReportsPage = lazy(() => import('./pages/Roles/ManagerReportsPage'));
const ManagerReturnRequestPage = lazy(() => import('./pages/Roles/ManagerReturnRequestPage'));
const ManagerKitchenOpsPage = lazy(() => import('./pages/Roles/ManagerKitchenOpsPage'));
const RecipesPage = lazy(() => import('./pages/Roles/RecipesPage'));
const FranchiseOrdersPage = lazy(() => import('./pages/Roles/FranchiseOrdersPage'));
const FranchiseInventoryPage = lazy(() => import('./pages/Roles/FranchiseInventoryPage'));
const GoodsReceiptPage = lazy(() => import('./pages/Roles/GoodsReceiptPage'));
const StoreReturnRequestPage = lazy(() => import('./pages/Roles/StoreReturnRequestPage'));
const StoreLocationPage = lazy(() => import('./pages/Roles/StoreLocationPage'));
const CentralOrdersPage = lazy(() => import('./pages/Roles/CentralOrdersPage'));
const CentralProductionPage = lazy(() => import('./pages/Roles/CentralProductionPage'));
const CentralShipmentsPage = lazy(() => import('./pages/Roles/CentralShipmentsPage'));
const CentralMaterialsPage = lazy(() => import('./pages/Roles/CentralMaterialsPage'));
const CentralInventoryPage = lazy(() => import('./pages/Roles/CentralInventoryPage'));
const SupplyOrdersPage = lazy(() => import('./pages/Roles/SupplyOrdersPage'));
const SupplyDeliveryPage = lazy(() => import('./pages/Roles/SupplyDeliveryPage'));
const SupplyIssuesPage = lazy(() => import('./pages/Roles/SupplyIssuesPage'));
const DriverDashboard = lazy(() => import('./pages/Roles/DriverDashboard'));
const DriverShipmentsPage = lazy(() => import('./pages/Roles/DriverShipmentsPage'));
const Delivery = lazy(() => import('./pages/Delivery/Delivery'));
const PaymentSuccessPage = lazy(() => import('./pages/Payment/PaymentSuccessPage'));
const PaymentFailedPage = lazy(() => import('./pages/Payment/PaymentFailedPage'));

const PageFallback = () => (
  <div className="flex min-h-[200px] items-center justify-center text-slate-500">Đang tải...</div>
);


function AppContent() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
      {/* Root route - redirect to login if not authenticated, otherwise to dashboard */}
      <Route path='/' element={<RedirectRoute />} />
      
      {/* Khu vực public (trang giới thiệu) - chỉ dùng cho các route khác nếu cần */}
      {/* <Route path='/home' element={<Layout />}>
        <Route index element={<Home />} />
      </Route> */}

      {/* Khu vực CK Manager với sidebar, yêu cầu đăng nhập + đúng role */}
      <Route
        path='/app'
        element={
          <RoleProtectedRoute
            allowedRoles={[
              'ADMIN',
              'MANAGER',
              'SUPPLY_COORDINATOR',
              'CENTRAL_KITCHEN_STAFF',
              'FRANCHISE_STORE_STAFF',
              'DRIVER',
            ]}
          >
            <CkManagerLayout />
          </RoleProtectedRoute>
        }
      >
        <Route index element={<AppHomeRedirect />} />
        <Route path='dashboard' element={<RoleDashboard />} />

        {/* Admin routes */}
        <Route path='admin'>
          <Route path='dashboard' element={<RoleDashboard />} />
          <Route path='users' element={<AdminUsersPage />} />
          <Route path='stores' element={<AdminStoresPage />} />
          <Route path='settings' element={<AdminSettingsPage />} />
          {/* Trang Nhà cung cấp & Báo cáo hệ thống (Admin) đã được ẩn theo yêu cầu */}
        </Route>

        {/* Manager routes */}
        <Route path='manager'>
          <Route path='dashboard' element={<RoleDashboard />} />
          <Route path='products' element={<ManagerProductsPage />} />
          <Route path='recipes' element={<RecipesPage />} />
          <Route path='inventory' element={<ManagerInventoryPage />} />
          <Route path='shipments' element={<CentralShipmentsPage />} />
          <Route path='returns' element={<ManagerReturnRequestPage />} />
          <Route path='kitchen-ops' element={<ManagerKitchenOpsPage />} />
          <Route path='reports' element={<ManagerReportsPage />} />
        </Route>

        {/* Central Kitchen routes */}
        <Route path='central'>
          <Route path='dashboard' element={<RoleDashboard />} />
          <Route path='orders' element={<CentralOrdersPage />} />
          <Route path='production' element={<CentralProductionPage />} />
          <Route path='shipments' element={<CentralShipmentsPage />} />
          <Route path='materials' element={<CentralMaterialsPage />} />
          <Route path='inventory' element={<CentralInventoryPage />} />
        </Route>

        {/* Supply Coordinator routes */}
        <Route path='supply'>
          <Route path='dashboard' element={<RoleDashboard />} />
          <Route path='orders' element={<SupplyOrdersPage />} />
          <Route path='delivery' element={<SupplyDeliveryPage />} />
          <Route path='shipments' element={<CentralShipmentsPage />} />
          <Route path='issues' element={<SupplyIssuesPage />} />
        </Route>

        {/* Franchise Store routes */}
        <Route path='store'>
          <Route path='dashboard' element={<RoleDashboard />} />
          <Route path='orders' element={<FranchiseOrdersPage />} />
          <Route path='receiving' element={<GoodsReceiptPage />} />
          <Route path='returns' element={<StoreReturnRequestPage />} />
          <Route path='inventory' element={<FranchiseInventoryPage />} />
          <Route path='location' element={<StoreLocationPage />} />
        </Route>

        {/* Driver routes */}
        <Route path='driver'>
          <Route path='dashboard' element={<DriverDashboard />} />
          <Route path='shipments' element={<DriverShipmentsPage />} />
          <Route path='delivery' element={<Delivery />} />
        </Route>

      </Route>

      <Route path='/login' element={<Login />} />
      <Route path='/payment-success' element={<PaymentSuccessPage />} />
      <Route path='/payment-failed' element={<PaymentFailedPage />} />
      {/* TODO: Thêm các auth routes khác */}
      {/* <Route path='/register' element={<Register />} /> */}
      <Route path='*' element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <ScrollToTop />
        <AuthProvider>
          <DeliveryProvider>
            <EnrolledCoursesProvider>
              <NotificationProvider>
                <AppContent />
              </NotificationProvider>
            </EnrolledCoursesProvider>
          </DeliveryProvider>
        </AuthProvider>
      </Router>
    </Provider>
  );
}

export default App;
