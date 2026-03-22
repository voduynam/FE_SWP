import { useState, useContext, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  User,
  BookOpen,
  Calendar,
  Users,
  MessageSquare,
  LogOut,
  UserCircle,
  History,
  Settings,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
import { AuthContext } from '../../contexts/AuthContext';
import BrandLogo from '../BrandLogo';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const userMenuRef = useRef(null);

  const navigationItems = [
    { path: '/', label: 'Home', icon: null },
    { path: '/courses', label: 'Courses', icon: BookOpen },
    { path: '/learning-paths/recommended', label: 'Learning Paths', icon: BookOpen },
    { path: '/consultations', label: 'Get Involved', icon: Calendar },
    { path: '/programs', label: 'Programs', icon: Users },
    { path: '/blog', label: 'Blog', icon: MessageSquare },
  ];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleUserMenu = () => setIsUserMenuOpen(!isUserMenuOpen);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getUserMenuItems = () => {
    const role = user?.roleId?.roleName || '';
    const items = [];

    if (role === 'member' || role === 'manager' || role === 'staff') {
      items.push(
        { path: '/dashboard', label: 'Dashboard', icon: UserCircle }
      );
    }

    if (role === 'consultant') {
      items.push(
        { path: '/consultant-dashboard', label: 'Consultant Dashboard', icon: UserCircle }
      );
    }

    if (role === 'admin') {
      items.push(
        { path: '/admin/dashboard', label: 'Admin Dashboard', icon: UserCircle }
      );
    }

    items.push(
      { path: '/profile', label: 'Profile', icon: User },
      { path: '/activity-history', label: 'Activity History', icon: History },
      { path: '/certificates', label: 'My Certificates', icon: CreditCard },
      { path: '/payment-management', label: 'Payment Management', icon: CreditCard }
    );

    return items;
  };

  return (
    <header className='bg-white/95 shadow-[0_4px_24px_-8px_rgba(26,20,35,0.12)] backdrop-blur-sm sticky top-0 z-50 border-b border-black/[0.04]'>
      <nav className='container mx-auto px-4 py-4'>
        <div className='flex items-center justify-between'>
          {/* Logo */}
          <Link to='/' className='flex items-center gap-2 sm:gap-3'>
            <BrandLogo className='h-10 w-10 rounded-lg' />
            <span className='text-xl font-semibold text-gray-800 hidden sm:block'>
              CK Manager
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className='hidden lg:flex items-center space-x-1'>
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                  isActive(item.path)
                    ? 'bg-ck-accent text-white shadow-sm'
                    : 'text-gray-700 hover:bg-ck-accent/5'
                }`}
              >
                {item.icon && <item.icon className='w-4 h-4' />}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* User Menu / Auth Buttons */}
          <div className='flex items-center space-x-4'>
            {isAuthenticated ? (
              <div className='relative' ref={userMenuRef}>
                <button
                  onClick={toggleUserMenu}
                  className='flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors'
                >
                  <div className='w-8 h-8 bg-ck-accent rounded-full flex items-center justify-center text-white font-semibold'>
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className='hidden md:block text-sm font-medium text-gray-700'>
                    {user?.name || 'User'}
                  </span>
                  <ChevronDown className='w-4 h-4 text-gray-600' />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className='absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50'>
                    <div className='px-4 py-2 border-b border-gray-200'>
                      <p className='text-sm font-semibold text-gray-900'>{user?.name}</p>
                      <p className='text-xs text-gray-500'>{user?.email}</p>
                      {user?.roleId && (
                        <span className='inline-block mt-1 px-2 py-1 text-xs font-medium bg-ck-accent/10 text-ck-accent-hover rounded'>
                          {user.roleId.roleName}
                        </span>
                      )}
                    </div>

                    {getUserMenuItems().map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsUserMenuOpen(false)}
                        className='flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                      >
                        <item.icon className='w-4 h-4' />
                        <span>{item.label}</span>
                      </Link>
                    ))}

                    <div className='border-t border-gray-200 mt-2 pt-2'>
                      <button
                        onClick={handleLogout}
                        className='w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors'
                      >
                        <LogOut className='w-4 h-4' />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className='flex items-center space-x-2'>
                <Link
                  to='/login'
                  className='px-4 py-2 text-sm font-medium text-gray-700 hover:text-ck-accent transition-colors'
                >
                  Login
                </Link>
                <Link
                  to='/register'
                  className='px-4 py-2 bg-ck-accent text-white rounded-[10px] text-sm font-medium hover:bg-ck-accent-hover transition-colors shadow-md'
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className='lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors'
              aria-label='Toggle menu'
            >
              {isMenuOpen ? <X className='w-6 h-6' /> : <Menu className='w-6 h-6' />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className='lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4'>
            <div className='flex flex-col space-y-2'>
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                    isActive(item.path)
                      ? 'bg-ck-accent text-white shadow-sm'
                      : 'text-gray-700 hover:bg-ck-accent/5'
                  }`}
                >
                  {item.icon && <item.icon className='w-4 h-4' />}
                  <span>{item.label}</span>
                </Link>
              ))}

              {isAuthenticated && (
                <div className='pt-4 border-t border-gray-200 mt-2'>
                  {getUserMenuItems().slice(0, 3).map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className='flex items-center space-x-2 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                    >
                      <item.icon className='w-4 h-4' />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    className='w-full flex items-center space-x-2 px-4 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors mt-2'
                  >
                    <LogOut className='w-4 h-4' />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;

