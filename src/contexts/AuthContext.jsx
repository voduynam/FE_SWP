import { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  // Check authentication on app start
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const result = await authService.login(email, password);

      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        return {
          success: true,
          message: result.message,
          user: result.user,
          data: result.data,
        };
      } else {
        return {
          success: false,
          message: result.message,
          code: result.code,
          data: result.data,
          details: result.details,
        };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        message: 'Đăng nhập thất bại. Vui lòng thử lại.',
      };
    }
  };

  const loginWithOtp = async (email, otp) => {
    try {
      const result = await authService.loginWithOtp(email, otp);

      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        return {
          success: true,
          message: result.message,
          user: result.user,
          data: result.data,
        };
      } else {
        return {
          success: false,
          message: result.message,
          code: result.code,
        };
      }
    } catch (error) {
      console.error('OTP Login failed:', error);
      return {
        success: false,
        message: 'Đăng nhập OTP thất bại. Vui lòng thử lại.',
      };
    }
  };

  const register = async userData => {
    try {
      const result = await authService.register(userData);

      if (result.success) {
        // Không auto login, chỉ return success để redirect về login
        return {
          success: true,
          message: result.message || 'Đăng ký thành công! Vui lòng đăng nhập.',
        };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Register failed:', error);
      return {
        success: false,
        message: 'Đăng ký thất bại. Vui lòng thử lại.',
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Full logout failed:', error);
      authService.clearAuth();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
    }
  };

  const updateUser = updatedUser => {
    setUser(updatedUser);
    authService.setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    loginWithOtp,
    register,
    logout,
    updateUser,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

