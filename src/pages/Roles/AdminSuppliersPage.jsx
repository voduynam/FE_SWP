import { useEffect, useMemo, useState } from 'react';
import { PlusCircle, RefreshCcw, Search, X } from 'lucide-react';
import ModalPortal from '../../components/ui/ModalPortal';
import { workflowService } from '../../services/workflowService';

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
  });

  const loadSuppliers = async () => {
    setLoading(true);
    setError('');
    const res = await workflowService.getSuppliers({ limit: 200 });
    if (!res.success) {
      setError(res.message || 'Không tải được danh sách nhà cung cấp');
      setSuppliers([]);
      setLoading(false);
      return;
    }
    setSuppliers(getRows(res.data));
    setLoading(false);
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 2200);
    return () => clearTimeout(t);
  }, [success]);

  const filtered = useMemo(() => {
    const s = (search || '').toLowerCase();
    if (!s) return suppliers;
    return suppliers.filter(sup => {
      const name = (sup.name || '').toLowerCase();
      const code = (sup.code || '').toLowerCase();
      const email = (sup.email || '').toLowerCase();
      return name.includes(s) || code.includes(s) || email.includes(s);
    });
  }, [suppliers, search]);

  return (
    <div className='space-y-6 animate-fade-in'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-slate-900'>Nhà cung cấp</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Quản lý danh mục nhà cung cấp dùng cho nhập hàng và thanh toán.
          </p>
        </div>
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={loadSuppliers}
            className='btn-outline inline-flex items-center gap-2'
            disabled={loading}
          >
            <RefreshCcw className='h-4 w-4' />
            Làm mới
          </button>
          <button
            type='button'
            onClick={() => setShowCreate(true)}
            className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'
          >
            <PlusCircle className='h-4 w-4' />
            Thêm NCC
          </button>
        </div>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}
      {success && (
        <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>
          {success}
        </div>
      )}

      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          <input
            type='text'
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Tìm theo tên, mã hoặc email...'
            className='input-field w-full pl-9'
          />
        </div>
      </div>

      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Tên</th>
              <th className='px-4 py-3'>Mã</th>
              <th className='px-4 py-3'>Email</th>
              <th className='px-4 py-3'>Điện thoại</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && (
              <tr>
                <td colSpan={4} className='px-4 py-6 text-center text-slate-400'>
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!loading && !filtered.length && (
              <tr>
                <td colSpan={4} className='px-4 py-6 text-center text-slate-400'>
                  Không có nhà cung cấp nào.
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map(sup => (
                <tr key={sup._id}>
                  <td className='px-4 py-3 text-slate-900'>{sup.name || '-'}</td>
                  <td className='px-4 py-3 text-slate-700'>{sup.code || '-'}</td>
                  <td className='px-4 py-3 text-slate-700'>{sup.email || '-'}</td>
                  <td className='px-4 py-3 text-slate-700'>{sup.phone || '-'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <ModalPortal>
        <div
          className='fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 px-4'
          onClick={() => !saving && setShowCreate(false)}
        >
          <div
            className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Thêm nhà cung cấp</h2>
              <button
                type='button'
                onClick={() => !saving && setShowCreate(false)}
                className='rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <form
              className='space-y-4'
              onSubmit={async e => {
                e.preventDefault();
                setSaving(true);
                setError('');
                const payload = {
                  name: form.name.trim(),
                  code: form.code.trim() || undefined,
                  email: form.email.trim() || undefined,
                  phone: form.phone.trim() || undefined,
                };
                const res = await workflowService.createSupplier(payload);
                setSaving(false);
                if (!res.success) {
                  setError(res.message || 'Không thể tạo nhà cung cấp');
                  return;
                }
                setForm({ name: '', code: '', email: '', phone: '' });
                setShowCreate(false);
                setSuccess('Tạo nhà cung cấp mới thành công.');
                loadSuppliers();
              }}
            >
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div className='sm:col-span-2'>
                  <label className='block text-sm font-medium text-slate-700'>Tên nhà cung cấp</label>
                  <input
                    type='text'
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Mã (tùy chọn)</label>
                  <input
                    type='text'
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                  />
                </div>
              </div>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Email</label>
                  <input
                    type='email'
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Điện thoại</label>
                  <input
                    type='text'
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                  />
                </div>
              </div>
              <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                <button
                  type='button'
                  onClick={() => !saving && setShowCreate(false)}
                  className='rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  disabled={saving}
                  className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60'
                >
                  {saving ? 'Đang lưu...' : 'Lưu NCC'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}

