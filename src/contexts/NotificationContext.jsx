import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';

const NotificationContext = createContext(null);

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
    : 'http://localhost:5001');

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roles = useMemo(
    () =>
      Array.isArray(user?.roles)
        ? user.roles.map(r => String(r.code || '').trim().toUpperCase())
        : [],
    [user]
  );

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationService.getNotifications({
        page: 1,
        limit: 20,
      });
      if (res.success && res.data) {
        const data = res.data;
        const list = Array.isArray(data.notifications)
          ? data.notifications
          : data.data?.notifications || [];
        const unread = data.unread_count ?? data.data?.unread_count ?? 0;
        setNotifications(list);
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
      setError('Không thể tải thông báo.');
    } finally {
      setLoading(false);
    }
  };

  const connectSocket = () => {
    if (!isAuthenticated || !user) return;
    const token = authService.getAccessToken();
    const client = io(SOCKET_URL, {
      auth: token ? { token: `Bearer ${token}` } : undefined,
      transports: ['websocket', 'polling'],
    });

    client.on('connect', () => {
      if (user.id) {
        client.emit('join_user', user.id);
      }
      roles.forEach(code => {
        client.emit('join_role', code);
      });
    });

    const handleIncoming = (payload) => {
      setNotifications(prev => [payload, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + (payload?.is_read ? 0 : 1));
    };

    client.on('new_notification', handleIncoming);
    client.on('notification', handleIncoming);

    client.on('disconnect', () => {
      // no-op
    });

    socketRef.current = client;
    setSocket(client);
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setUnreadCount(0);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    fetchNotifications();
    const deferredSocket = setTimeout(connectSocket, 1500);

    return () => {
      clearTimeout(deferredSocket);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  const markAsRead = async id => {
    if (!id) return;
    const optimistic = notifications.map(n =>
      n._id === id ? { ...n, is_read: true } : n
    );
    setNotifications(optimistic);
    setUnreadCount(prev => Math.max(0, prev - 1));
    const res = await notificationService.markAsRead(id);
    if (!res.success) {
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    const optimistic = notifications.map(n => ({ ...n, is_read: true }));
    setNotifications(optimistic);
    setUnreadCount(0);
    const res = await notificationService.markAllAsRead();
    if (!res.success) {
      fetchNotifications();
    }
  };

  const openNotificationTarget = notification => {
    if (!notification) return;
    const refType = String(notification.ref_type || '').toUpperCase();

    let path = '/app/dashboard';

    switch (refType) {
      case 'ORDER':
        path = roles.includes('FRANCHISE_STORE_STAFF')
          ? '/app/store/orders'
          : '/app/central/orders';
        break;
      case 'SHIPMENT':
        path = roles.includes('DRIVER')
          ? '/app/driver/delivery'
          : '/app/central/shipments';
        break;
      case 'PRODUCTION':
        path = '/app/central/production';
        break;
      case 'EXCEPTION':
        path = '/app/supply/issues';
        break;
      default:
        break;
    }

    navigate(path);
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    openNotificationTarget,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
};

