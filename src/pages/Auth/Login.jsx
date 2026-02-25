import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

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

    if (!result.success) {
      setError(result.message || 'Đăng nhập thất bại');
      return;
    }

    // Sau khi đăng nhập thành công, luôn điều hướng vào khu vực CK Manager
    navigate('/app/dashboard');
  };

  return (
    <div className='min-h-screen gradient-hero flex items-center justify-center px-4'>
      <div className='w-full max-w-md animate-slide-up'>
        {/* Logo */}
        <div className='text-center mb-10'>
          <div className='mx-auto w-20 h-20 flex items-center justify-center rounded-2xl gradient-secondary shadow-glow'>
            <ChefHat className='w-9 h-9 text-white' />
          </div>

          <h1 className='mt-5 text-3xl font-bold text-white tracking-tight'>
            CK Manager
          </h1>

          <p className='mt-2 text-sm text-white/80'>
            Hệ thống Quản lý Bếp Trung Tâm
          </p>
        </div>

        {/* Card */}
        <div className='glass-card p-8 space-y-6'>
          <h2 className='text-xl font-semibold text-center'>
            Đăng nhập tài khoản
          </h2>

          <form onSubmit={handleSubmit} className='space-y-5'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Tên đăng nhập</label>
              <div className='relative'>
                <User className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none' />
                <input
                  type='text'
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className='w-full h-11 pl-12 pr-4 rounded-lg border border-gray-300 
                   focus:outline-none focus:ring-2 focus:ring-secondary 
                   focus:border-secondary transition'
                  placeholder='Nhập tên đăng nhập'
                />
              </div>
            </div>

            {/* Password */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Mật khẩu</label>
              <div className='relative'>
                <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none' />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className='w-full h-11 pl-12 pr-12 rounded-lg border border-gray-300 
                   focus:outline-none focus:ring-2 focus:ring-secondary 
                   focus:border-secondary transition'
                  placeholder='Nhập mật khẩu'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 
                   text-gray-400 hover:text-gray-600 transition'
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className='text-sm text-red-500 text-center'>{error}</p>
            )}

            {/* Button */}
            <button
              type='submit'
              disabled={isSubmitting}
              className='w-full py-2.5 rounded-lg bg-orange-500 text-white font-medium
                         hover:bg-orange-600 disabled:opacity-60 transition duration-200 shadow-md'
            >
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
