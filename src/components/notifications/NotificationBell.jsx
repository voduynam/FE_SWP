import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const formatTime = (value) => {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return format(d, 'dd/MM HH:mm', { locale: vi });
  } catch {
    return '';
  }
};

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    openNotificationTarget,
  } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleClickItem = (n) => {
    openNotificationTarget(n);
    if (!n.is_read) {
      markAsRead(n._id);
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Thông báo
              </p>
              <p className="text-xs text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} thông báo chưa đọc`
                  : 'Không có thông báo mới'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-medium text-orange-600 hover:text-orange-700"
              >
                Đọc tất cả
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="px-4 py-3 text-xs text-slate-500">
                Đang tải...
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="px-4 py-3 text-xs text-slate-500">
                Chưa có thông báo.
              </div>
            )}
            {!loading &&
              notifications.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => handleClickItem(n)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-slate-50 px-4 py-2.5 text-left text-xs transition-colors last:border-b-0 hover:bg-slate-50 ${
                    n.is_read ? 'bg-white' : 'bg-orange-50/60'
                  }`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {n.type || 'THÔNG BÁO'}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {n.title || n.message}
                  </span>
                  {n.message && n.title && (
                    <span className="line-clamp-2 text-[11px] text-slate-600">
                      {n.message}
                    </span>
                  )}
                  <span className="mt-1 text-[11px] text-slate-400">
                    {formatTime(n.created_at)}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

