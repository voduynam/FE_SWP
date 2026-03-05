import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, RefreshCcw, Search, Shield, UserCheck, UserX } from 'lucide-react';
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
  const [successMessage, setSuccessMessage] = useState('');
  const [orgUnits, setOrgUnits] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    org_unit_id: '',
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    role_id: '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

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

  useEffect(() => {
    const loadMeta = async () => {
      const [orgRes, roleRes] = await Promise.all([
        workflowService.getOrgUnits(), // lấy cả KITCHEN và STORE
        workflowService.getRoles(),
      ]);

      if (orgRes.success) {
        const allUnits = getRows(orgRes.data) || [];
        // chỉ lấy ACTIVE và type KITCHEN / STORE
        const filtered = allUnits.filter(
          u =>
            ['KITCHEN', 'STORE'].includes((u.type || '').toUpperCase()) &&
            (u.status || '').toUpperCase() === 'ACTIVE',
        );
        setOrgUnits(filtered);
      }

      if (roleRes.success) setRoles(getRows(roleRes.data));
    };

    loadMeta();
  }, []);

  const availableRoles = useMemo(() => {
    const set = new Set();
    users.forEach(u => (u.roles || []).forEach(r => set.add(r.code)));
    return ['ALL', ...Array.from(set)];
  }, [users]);

  const filteredUsers = useMemo(() => {
    const result = users.filter(user => {
      const name = user.full_name || user.username || '';
      const email = user.email || '';
      const roles = (user.roles || []).map(r => r.code);
      const status = (user.status || '').toUpperCase();
      const matchSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase()) || email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = roleFilter === 'ALL' || roles.includes(roleFilter);
      const matchStatus = statusFilter === 'ALL' || status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
    return result;
  }, [users, searchTerm, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = useMemo(
    () =>
      filteredUsers.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
      ),
    [filteredUsers, currentPage],
  );

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
      {successMessage && (
        <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 flex items-center justify-between'>
          <span>{successMessage}</span>
          <button
            type='button'
            className='text-emerald-700/70 hover:text-emerald-900 text-xs'
            onClick={() => setSuccessMessage('')}
          >
            Đóng
          </button>
        </div>
      )}

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
          <button
            onClick={() => {
              const defaultOrg = orgUnits[0]?._id || '';
              const storeRole = roles.find(r => r.code === 'STORE_STAFF');
              setCreateForm(f => ({
                ...f,
                org_unit_id: defaultOrg,
                role_id: storeRole?._id || '',
              }));
              setCreateError('');
              setShowCreate(true);
            }}
            className='inline-flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-sm font-medium shadow-sm transition-colors'
          >
            <Plus className='h-4 w-4' /> Thêm người dùng
          </button>
        </div>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}
      {loading && <p className='text-sm text-slate-500'>Đang tải dữ liệu...</p>}

      {showCreate && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4'
          onClick={() => !creating && setShowCreate(false)}
        >
          <div
            className='bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto'
            onClick={e => e.stopPropagation()}
          >
            <div className='flex items-center justify-between mb-5'>
              <h2 className='text-xl font-semibold text-slate-900'>Thêm người dùng</h2>
              <button
                type='button'
                onClick={() => !creating && setShowCreate(false)}
                className='text-slate-400 hover:text-slate-600 text-xl leading-none px-2'
              >
                ×
              </button>
            </div>

            {createError && <p className='mb-3 text-sm text-red-600'>{createError}</p>}

            <form
              onSubmit={async e => {
                e.preventDefault();
                setCreating(true);
                setCreateError('');

                const payload = {
                  org_unit_id: createForm.org_unit_id,
                  username: createForm.username.trim(),
                  password: createForm.password,
                  full_name: createForm.full_name.trim(),
                  email: createForm.email.trim(),
                  phone: createForm.phone.trim(),
                  role_ids: createForm.role_id ? [createForm.role_id] : [],
                };

                const result = await workflowService.registerUser(payload);
                if (!result.success) {
                  setCreateError(result.message || 'Không thể tạo người dùng');
                  setCreating(false);
                  return;
                }

                await loadUsers();
                setCreating(false);
                setShowCreate(false);
                setSuccessMessage('Tạo người dùng mới thành công.');
                setPage(1);
              }}
              className='space-y-5'
            >
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Tên đăng nhập</label>
                  <input
                    type='text'
                    required
                    value={createForm.username}
                    onChange={e =>
                      setCreateForm(f => ({
                        ...f,
                        username: e.target.value,
                      }))
                    }
                    className='mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Mật khẩu</label>
                  <input
                    type='password'
                    required
                    value={createForm.password}
                    onChange={e =>
                      setCreateForm(f => ({
                        ...f,
                        password: e.target.value,
                      }))
                    }
                    className='mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                  />
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700'>Đơn vị / Cửa hàng</label>
                <select
                  value={createForm.org_unit_id}
                  onChange={e =>
                    setCreateForm(f => ({
                      ...f,
                      org_unit_id: e.target.value,
                    }))
                  }
                  className='mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                >
                  <option value=''>Chọn đơn vị</option>
                  {orgUnits.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Họ tên</label>
                  <input
                    type='text'
                    required
                    value={createForm.full_name}
                    onChange={e =>
                      setCreateForm(f => ({
                        ...f,
                        full_name: e.target.value,
                      }))
                    }
                    className='mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Email</label>
                  <input
                    type='email'
                    required
                    value={createForm.email}
                    onChange={e =>
                      setCreateForm(f => ({
                        ...f,
                        email: e.target.value,
                      }))
                    }
                    className='mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Điện thoại</label>
                  <input
                    type='text'
                    value={createForm.phone}
                    onChange={e =>
                      setCreateForm(f => ({
                        ...f,
                        phone: e.target.value,
                      }))
                    }
                    className='mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Vai trò</label>
                  <select
                    value={createForm.role_id}
                    onChange={e =>
                      setCreateForm(f => ({
                        ...f,
                        role_id: e.target.value,
                      }))
                    }
                    className='mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                  >
                    <option value=''>Chọn vai trò</option>
                    {roles.map(r => (
                      <option key={r._id} value={r._id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                <button
                  type='button'
                  onClick={() => !creating && setShowCreate(false)}
                  className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  disabled={creating}
                  className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-600 disabled:opacity-60'
                >
                  {creating ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            {pagedUsers.map(user => {
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

      <div className='flex items-center justify-between text-xs text-slate-400'>
        <p>
          Hiển thị{' '}
          {filteredUsers.length === 0
            ? 0
            : (currentPage - 1) * pageSize + 1}{' '}
          -{' '}
          {Math.min(currentPage * pageSize, filteredUsers.length)} trong tổng số{' '}
          {filteredUsers.length} người dùng
        </p>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
          >
            Trước
          </button>
          <span>
            Trang {currentPage} / {totalPages}
          </span>
          <button
            type='button'
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
