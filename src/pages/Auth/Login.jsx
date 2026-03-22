import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Lock, User } from 'lucide-react';
import BrandLogo from '../../components/BrandLogo';
import { useAuth } from '../../contexts/AuthContext';
import trungThuHero from '../../assets/image/trung thu.png';

// Mapping role -> route
const roleRoutes = {
  admin: '/app/admin/dashboard',
  manager: '/app/manager/dashboard',
  'central-kitchen': '/app/central/dashboard',
  'supply-coordinator': '/app/supply/dashboard',
  'franchise-staff': '/app/store/dashboard',
  driver: '/app/driver/dashboard',
};

const REMEMBER_USERNAME_KEY = 'ck_login_remember_username';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_USERNAME_KEY);
      if (saved) {
        setUsername(saved);
        setRememberMe(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu');
      return;
    }

    setIsSubmitting(true);

    const result = await login(username, password);
    setIsSubmitting(false);

    if (!result.success || !result.user) {
      setError(result.message || 'Tên đăng nhập hoặc mật khẩu không đúng');
      return;
    }

    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_USERNAME_KEY, username.trim());
      } else {
        localStorage.removeItem(REMEMBER_USERNAME_KEY);
      }
    } catch {
      /* ignore */
    }

    let userRole = result.user?.role;

    if (!userRole && result.user?.roles?.[0]?.code) {
      const roleCode = result.user.roles[0].code.toLowerCase();
      const roleCodeMap = {
        admin: 'admin',
        manager: 'manager',
        central_kitchen_staff: 'central-kitchen',
        supply_coordinator: 'supply-coordinator',
        franchise_store_staff: 'franchise-staff',
        driver: 'driver',
      };
      userRole = roleCodeMap[roleCode] || roleCode.replace(/_/g, '-');
    }

    const route = roleRoutes[userRole] || '/app/dashboard';
    navigate(route);
  };

  return (
    <div className='login-mid-autumn-bg flex min-h-screen items-center justify-center px-4 py-10 sm:px-6'>
      <div className='animate-slide-up w-full max-w-[1040px]'>
        <div
          className='overflow-hidden rounded-[28px] bg-white shadow-[0_25px_60px_-12px_rgba(26,20,35,0.45)]
                     ring-1 ring-black/[0.04]'
        >
          <div className='flex flex-col md:flex-row md:min-h-[520px]'>
            {/* Form */}
            <div className='flex flex-1 flex-col justify-center px-8 py-12 sm:px-12 lg:px-14'>
              <div className='mb-8 flex items-center gap-3'>
                <BrandLogo
                  variant='light'
                  className='h-12 w-12 rounded-2xl shadow-md'
                />
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-ck-accent/90'>
                    CK Manager
                  </p>
                  <p className='text-sm text-gray-500'>
                    Hệ thống quản lý bếp trung tâm
                  </p>
                </div>
              </div>

              <h1 className='text-3xl font-bold tracking-tight text-gray-900 sm:text-[2rem]'>
                Xin chào!
              </h1>
              <p className='mt-2 max-w-sm text-[15px] leading-relaxed text-gray-500'>
                Đăng nhập để đồng bộ đơn hàng, kho và vận hành — gọn gàng trong
                một nơi.
              </p>

              <form onSubmit={handleSubmit} className='mt-9 space-y-5'>
                <div className='space-y-2'>
                  <label
                    htmlFor='login-username'
                    className='text-sm font-medium text-gray-700'
                  >
                    Tên đăng nhập
                  </label>
                  <div className='relative'>
                    <User className='pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400' />
                    <input
                      id='login-username'
                      type='text'
                      autoComplete='username'
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className='h-12 w-full rounded-[10px] border border-gray-200 bg-white pl-11 pr-4 text-[15px]
                                 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition
                                 placeholder:text-gray-400 focus:border-ck-accent/50 focus:ring-2 focus:ring-ck-accent/20'
                      placeholder='Nhập tên đăng nhập'
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <label
                    htmlFor='login-password'
                    className='text-sm font-medium text-gray-700'
                  >
                    Mật khẩu
                  </label>
                  <div className='relative'>
                    <Lock className='pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400' />
                    <input
                      id='login-password'
                      type={showPassword ? 'text' : 'password'}
                      autoComplete='current-password'
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className='h-12 w-full rounded-[10px] border border-gray-200 bg-white pl-11 pr-12 text-[15px]
                                 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition
                                 placeholder:text-gray-400 focus:border-ck-accent/50 focus:ring-2 focus:ring-ck-accent/20'
                      placeholder='Nhập mật khẩu'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
                      aria-label={
                        showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                      }
                    >
                      {showPassword ? (
                        <EyeOff className='h-[18px] w-[18px]' />
                      ) : (
                        <Eye className='h-[18px] w-[18px]' />
                      )}
                    </button>
                  </div>
                </div>

                <div className='flex items-center justify-between gap-4'>
                  <label className='flex cursor-pointer select-none items-center gap-2.5'>
                    <input
                      type='checkbox'
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className='h-4 w-4 rounded border-gray-300 accent-ck-accent focus:ring-2 focus:ring-ck-accent/25'
                    />
                    <span className='text-sm font-medium text-gray-700'>
                      Nhớ tôi
                    </span>
                  </label>
                  <button
                    type='button'
                    className='shrink-0 text-sm font-medium text-ck-accent transition hover:text-ck-accent-hover hover:underline'
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                {error && (
                  <p className='text-center text-sm text-red-500' role='alert'>
                    {error}
                  </p>
                )}

                <button
                  type='submit'
                  disabled={isSubmitting}
                  className='h-12 w-full rounded-[10px] bg-ck-accent text-[15px] font-semibold text-white shadow-[0_8px_24px_-4px_rgba(148,107,116,0.45)]
                             transition hover:bg-ck-accent-hover active:scale-[0.99] disabled:opacity-60'
                >
                  {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>
            </div>

            {/* Hero image — Tết Trung Thu */}
            <div className='relative min-h-[280px] flex-1 md:min-h-0'>
              <img
                src={trungThuHero}
                alt='Không khí Tết Trung Thu'
                className='h-full w-full object-cover md:absolute md:inset-0'
              />
              <div
                className='pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a1420]/85 via-[#1a1420]/25 to-transparent md:rounded-none'
                aria-hidden
              />
              <div className='absolute inset-x-0 bottom-0 p-8 md:p-10'>
                <p className='max-w-[280px] text-lg font-semibold leading-snug text-white drop-shadow-md sm:text-xl'>
                  Cuối cùng, mọi thứ bạn cần — trong một hệ thống.
                </p>
                <div className='mt-5 flex items-center gap-2'>
                  <button
                    type='button'
                    className='flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20'
                    aria-label='Trước'
                  >
                    <ChevronLeft className='h-5 w-5' />
                  </button>
                  <button
                    type='button'
                    className='flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20'
                    aria-label='Sau'
                  >
                    <ChevronRight className='h-5 w-5' />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className='mt-6 text-center text-xs text-white/55'>
          © {new Date().getFullYear()} CK Manager
        </p>
      </div>
    </div>
  );
}
