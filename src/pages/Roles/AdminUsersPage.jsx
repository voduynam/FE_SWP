import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCcw, Search, Shield, UserCheck, UserX } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

const roleLabels = {
  ADMIN: { label: 'Quản trị viên', color: 'bg-rose-50 text-rose-600' },
  MANAGER: { label: 'Quản lý', color: 'bg-sky-50 text-sky-600' },
  CENTRAL_KITCHEN_STAFF: { label: 'NV Bếp TT', color: 'bg-teal-50 text-teal-600' },
  SUPPLY_COORDINATOR: { label: 'Điều phối viên', color: 'bg-amber-50 text-amber-600' },
  FRANCHISE_STORE_STAFF: { label: 'NV Cửa hàng', color: 'bg-emerald-50 text-emerald-600' },
  DRIVER: { label: 'Tài xế', color: 'bg-indigo-50 text-indigo-600' },
};

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    const result = await workflowService.getUsers({ limit: 500 });
    if (!result.success) {
      setError(result.message || 'Không tải được danh sách người dùng');
      setUsers([]);
      setLoading(false);
      return;
    }
    setUsers(getRows(result.data));
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const availableRoles = useMemo(() => {
    const set = new Set();
    users.forEach(u => (u.roles || []).forEach(r => set.add(r.code)));
    return ['ALL', ...Array.from(set)];
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const name = user.full_name || user.username || '';
      const email = user.email || '';
      const roles = (user.roles || []).map(r => r.code);
      const status = (user.status || '').toUpperCase();
      const matchSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase()) || email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = roleFilter === 'ALL' || roles.includes(roleFilter);
      const matchStatus = statusFilter === 'ALL' || status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const exportUsersCsv = () => {
    if (!filteredUsers.length) return;
    const rows = filteredUsers.map(u => ({
      id: u._id,
      name: u.full_name || u.username || '',
      email: u.email || '',
      phone: u.phone || '',
      roles: (u.roles || []).map(r => r.code).join(';'),
      orgUnit: u.org_unit_id?.name || '',
      status: u.status || '',
    }));
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(',')]
      .concat(rows.map(r => keys.map(k => `"${(r[k] ?? '').toString().replace(/"/g, '""')}"`).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'users_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className='space-y-6 animate-fade-in'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-slate-900'>Quản lý Người dùng</h1>
          <p className='mt-1 text-sm text-slate-500'>Danh sách lấy trực tiếp từ DB qua API `/users`.</p>
        </div>
        <div className='flex items-center gap-3'>
          <button onClick={loadUsers} className='btn-outline inline-flex items-center gap-2' disabled={loading}>
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
          <button onClick={exportUsersCsv} className='btn-primary inline-flex items-center gap-2'>
            <Download className='h-4 w-4' /> Xuất
          </button>
        </div>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}
      {loading && <p className='text-sm text-slate-500'>Đang tải dữ liệu...</p>}

      <div className='flex flex-col gap-4 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400' />
          <input
            type='text'
            placeholder='Tìm theo tên hoặc email...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='input-field w-full pl-11'
          />
        </div>
        <div className='flex gap-3'>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className='input-field min-w-[170px]'>
            {availableRoles.map(role => (
              <option key={role} value={role}>
                {role === 'ALL' ? 'Tất cả vai trò' : (roleLabels[role]?.label || role)}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className='input-field min-w-[150px]'>
            <option value='ALL'>Tất cả trạng thái</option>
            <option value='ACTIVE'>Hoạt động</option>
            <option value='INACTIVE'>Ngừng HĐ</option>
          </select>
        </div>
      </div>

      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-6 py-3'>Người dùng</th>
              <th className='px-6 py-3'>Liên hệ</th>
              <th className='px-6 py-3'>Vai trò</th>
              <th className='px-6 py-3'>Đơn vị</th>
              <th className='px-6 py-3 text-center'>Trạng thái</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {filteredUsers.map(user => {
              const displayName = user.full_name || user.username || 'N/A';
              const userRoles = user.roles || [];
              const status = (user.status || '').toUpperCase();
              return (
                <tr key={user._id} className='hover:bg-slate-50 transition-colors'>
                  <td className='px-6 py-4'>
                    <p className='font-medium text-slate-900'>{displayName}</p>
                    <p className='text-xs text-slate-400'>{user._id}</p>
                  </td>
                  <td className='px-6 py-4'>
                    <p className='text-sm text-slate-800'>{user.email || '-'}</p>
                    <p className='text-xs text-slate-400'>{user.phone || '-'}</p>
                  </td>
                  <td className='px-6 py-4'>
                    <div className='flex flex-wrap gap-2'>
                      {!userRoles.length && <span className='text-xs text-slate-400'>Không có vai trò</span>}
                      {userRoles.map(role => (
                        <span key={role.id || role.code} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${roleLabels[role.code]?.color || 'bg-slate-100 text-slate-600'}`}>
                          <Shield className='h-3 w-3' />
                          {roleLabels[role.code]?.label || role.code}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className='px-6 py-4 text-sm'>{user.org_unit_id?.name || '-'}</td>
                  <td className='px-6 py-4 text-center'>
                    {status === 'ACTIVE' ? (
                      <span className='inline-flex items-center gap-1 text-sm text-emerald-600'>
                        <UserCheck className='h-4 w-4' />
                        Hoạt động
                      </span>
                    ) : (
                      <span className='inline-flex items-center gap-1 text-sm text-slate-400'>
                        <UserX className='h-4 w-4' />
                        Ngừng HĐ
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && !filteredUsers.length && (
          <div className='py-10 text-center text-sm text-slate-400'>Không tìm thấy người dùng phù hợp</div>
        )}
      </div>

      <p className='text-xs text-slate-400'>
        Hiển thị {filteredUsers.length} / {users.length} người dùng
      </p>
    </div>
  );
}
