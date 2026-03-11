/* eslint-disable no-unused-vars */
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
import Layout from './components/Layout/Layout';
import CkManagerLayout from './components/Layout/CkManagerLayout';
// import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import NotFound from './pages/NotFound/NotFound';
import RoleDashboard from './pages/Roles/RoleDashboard';
import AlertsDashboardPage from './pages/Roles/AlertsDashboardPage';
// Admin pages
import AdminUsersPage from './pages/Roles/AdminUsersPage';
import AdminStoresPage from './pages/Roles/AdminStoresPage';
import AdminSettingsPage from './pages/Roles/AdminSettingsPage';
import AdminSuppliersPage from './pages/Roles/AdminSuppliersPage';
import AdminReportsPage from './pages/Roles/AdminReportsPage';
// Manager pages
import ManagerProductsPage from './pages/Roles/ManagerProductsPage';
import ManagerInventoryPage from './pages/Roles/ManagerInventoryPage';
import ManagerReportsPage from './pages/Roles/ManagerReportsPage';
import ManagerReturnRequestPage from './pages/Roles/ManagerReturnRequestPage';
import RecipesPage from './pages/Roles/RecipesPage';
// Franchise store pages
import FranchiseOrdersPage from './pages/Roles/FranchiseOrdersPage';
import FranchiseInventoryPage from './pages/Roles/FranchiseInventoryPage';
import GoodsReceiptPage from './pages/Roles/GoodsReceiptPage';
import StoreReturnRequestPage from './pages/Roles/StoreReturnRequestPage';
// Central kitchen pages
import CentralOrdersPage from './pages/Roles/CentralOrdersPage';
import CentralProductionPage from './pages/Roles/CentralProductionPage';
import CentralShipmentsPage from './pages/Roles/CentralShipmentsPage';
import CentralMaterialsPage from './pages/Roles/CentralMaterialsPage';
// Supply coordinator pages
import SupplyOrdersPage from './pages/Roles/SupplyOrdersPage';
import SupplyDeliveryPage from './pages/Roles/SupplyDeliveryPage';
import SupplyIssuesPage from './pages/Roles/SupplyIssuesPage';
import DriverDashboard from './pages/Roles/DriverDashboard';
import DriverShipmentsPage from './pages/Roles/DriverShipmentsPage';
import Delivery from './pages/Delivery/Delivery';


function AppContent() {
  return (
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
        <Route index element={<RoleDashboard />} />
        <Route path='dashboard' element={<RoleDashboard />} />

        {/* Admin routes */}
        <Route path='admin'>
          <Route path='dashboard' element={<RoleDashboard />} />
          <Route path='users' element={<AdminUsersPage />} />
          <Route path='stores' element={<AdminStoresPage />} />
          <Route path='suppliers' element={<AdminSuppliersPage />} />
          <Route path='settings' element={<AdminSettingsPage />} />
          <Route path='reports' element={<AdminReportsPage />} />
        </Route>

        {/* Manager routes */}
        <Route path='manager'>
          <Route path='dashboard' element={<RoleDashboard />} />
          <Route path='products' element={<ManagerProductsPage />} />
          <Route path='recipes' element={<RecipesPage />} />
          <Route path='inventory' element={<ManagerInventoryPage />} />
          <Route path='shipments' element={<CentralShipmentsPage />} />
          <Route path='returns' element={<ManagerReturnRequestPage />} />
          <Route path='reports' element={<ManagerReportsPage />} />
        </Route>

        {/* Central Kitchen routes */}
        <Route path='central'>
          <Route path='dashboard' element={<RoleDashboard />} />
          <Route path='orders' element={<CentralOrdersPage />} />
          <Route path='production' element={<CentralProductionPage />} />
          <Route path='shipments' element={<CentralShipmentsPage />} />
          <Route path='materials' element={<CentralMaterialsPage />} />
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
        </Route>

        {/* Driver routes */}
        <Route path='driver'>
          <Route path='dashboard' element={<DriverDashboard />} />
          <Route path='shipments' element={<DriverShipmentsPage />} />
          <Route path='delivery' element={<Delivery />} />
        </Route>

        {/* Alerts dashboard – all roles */}
        <Route path='alerts' element={<AlertsDashboardPage />} />
      </Route>

      <Route path='/login' element={<Login />} />
      {/* TODO: Thêm các auth routes khác */}
      {/* <Route path='/register' element={<Register />} /> */}
      <Route path='*' element={<NotFound />} />
    </Routes>
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
