import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const Layout = () => {
  const location = useLocation();

  // Kiểm tra nếu route bắt đầu bằng "/admin", "/staff", "/manager"
  const isAdminRoute = location.pathname.startsWith('/admin') || 
                       location.pathname.startsWith('/staff') || 
                       location.pathname.startsWith('/manager');

  return (
    <div className='min-h-screen flex flex-col'>
      {!isAdminRoute && <Header />}
      <main className={`flex-1 ${isAdminRoute ? '' : ''}`}>
        <Outlet />
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  );
};

export default Layout;

