import { useEffect, useMemo, useState } from 'react';
import { PlusCircle, RefreshCcw, X } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const TABS = [
  { key: 'uoms', label: 'Đơn vị tính' },
  { key: 'categories', label: 'Nhóm hàng' },
];

export default function AdminSettingsPage() {
  const [tab, setTab] = useState('uoms');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [uoms, setUoms] = useState([]);
  const [categories, setCategories] = useState([]);

  const [uomForm, setUomForm] = useState({ code: '', name: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', code: '' });
  const [showCreateUom, setShowCreateUom] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [uomRes, catRes] = await Promise.all([
        workflowService.getUoms({ limit: 200 }),
        workflowService.getCategories({ limit: 200 }),
      ]);

      if (!uomRes.success || !catRes.success) {
        setError('Một phần dữ liệu master data chưa tải được.');
      }

      if (uomRes.success) setUoms(getRows(uomRes.data));
      if (catRes.success) setCategories(getRows(catRes.data));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 2500);
    return () => clearTimeout(t);
  }, [success]);

  const orgUnitOptions = useMemo(() => [], []);

  return (
    <div className='space-y-6 animate-fade-in'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-slate-900'>Cấu hình Master Data</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Admin quản lý đơn vị tính, nhóm hàng, nhà cung cấp, đơn vị tổ chức, vị trí kho và vai trò người dùng.
          </p>
        </div>
        <button
          type='button'
          onClick={loadAll}
          className='inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'
          disabled={loading}
        >
          <RefreshCcw className='h-4 w-4' />
          Làm mới
        </button>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}
      {success && (
        <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>
          {success}
        </div>
      )}

      <div className='flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1'>
        {TABS.map(t => (
          <button
            key={t.key}
            type='button'
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* UOMs */}
      {tab === 'uoms' && (
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-base font-semibold text-slate-900'>Đơn vị tính</h2>
              <p className='text-sm text-slate-500'>Quy chuẩn UOM dùng chung cho toàn hệ thống.</p>
            </div>
            <button
              type='button'
              onClick={() => setShowCreateUom(true)}
              className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50'
            >
              <PlusCircle className='h-3 w-3 text-orange-500' />
              Thêm UOM
            </button>
          </div>

          {showCreateUom && (
            <div
              className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4'
              onClick={() => setShowCreateUom(false)}
            >
              <div
                className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto'
                onClick={e => e.stopPropagation()}
              >
                <div className='mb-4 flex items-center justify-between'>
                  <h3 className='text-lg font-semibold text-slate-900'>Thêm đơn vị tính</h3>
                  <button
                    type='button'
                    onClick={() => setShowCreateUom(false)}
                    className='rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  >
                    <X className='h-5 w-5' />
                  </button>
                </div>
                <form
                  className='space-y-4'
                  onSubmit={async e => {
                e.preventDefault();
                setError('');
                const payload = {
                  code: uomForm.code.trim(),
                  name: uomForm.name.trim(),
                };
                const res = await workflowService.createUom(payload);
                if (!res.success) {
                  setError(res.message || 'Không thể tạo đơn vị tính');
                  return;
                }
                setUomForm({ code: '', name: '' });
                setShowCreateUom(false);
                setSuccess('Tạo đơn vị tính mới thành công.');
                loadAll();
              }}
            >
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Mã UOM</label>
                  <input
                    type='text'
                    required
                    value={uomForm.code}
                    onChange={e => setUomForm(f => ({ ...f, code: e.target.value }))}
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Tên</label>
                  <input
                    type='text'
                    required
                    value={uomForm.name}
                    onChange={e => setUomForm(f => ({ ...f, name: e.target.value }))}
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                  />
                </div>
              </div>
              <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                <button
                  type='button'
                  onClick={() => setShowCreateUom(false)}
                  className='rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600'
                >
                  Lưu UOM
                </button>
              </div>
            </form>
              </div>
            </div>
          )}

          <div className='rounded-xl border border-slate-200 bg-white'>
            <div className='border-b border-slate-200 px-4 py-2 text-sm font-semibold'>Danh sách UOM</div>
            <div className='max-h-[360px] overflow-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500'>
                  <tr>
                    <th className='px-4 py-2'>Mã</th>
                    <th className='px-4 py-2'>Tên</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {loading && (
                    <tr>
                      <td colSpan={2} className='px-4 py-4 text-center text-slate-400'>
                        Đang tải...
                      </td>
                    </tr>
                  )}
                  {!loading && !uoms.length && (
                    <tr>
                      <td colSpan={2} className='px-4 py-4 text-center text-slate-400'>
                        Chưa có đơn vị tính.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    uoms.map(u => (
                      <tr key={u._id || u.code}>
                        <td className='px-4 py-2 font-mono text-xs text-slate-700'>{u.code}</td>
                        <td className='px-4 py-2 text-slate-800'>{u.name}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      {tab === 'categories' && (
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-base font-semibold text-slate-900'>Nhóm hàng</h2>
              <p className='text-sm text-slate-500'>Phân nhóm item để báo cáo và quản lý.</p>
            </div>
            <button
              type='button'
              onClick={() => setShowCreateCategory(true)}
              className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50'
            >
              <PlusCircle className='h-3 w-3 text-orange-500' />
              Thêm nhóm hàng
            </button>
          </div>

          {showCreateCategory && (
            <div
              className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4'
              onClick={() => setShowCreateCategory(false)}
            >
              <div
                className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto'
                onClick={e => e.stopPropagation()}
              >
                <div className='mb-4 flex items-center justify-between'>
                  <h3 className='text-lg font-semibold text-slate-900'>Thêm nhóm hàng</h3>
                  <button
                    type='button'
                    onClick={() => setShowCreateCategory(false)}
                    className='rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  >
                    <X className='h-5 w-5' />
                  </button>
                </div>
                <form
                  className='space-y-4'
                  onSubmit={async e => {
                e.preventDefault();
                setError('');
                const payload = {
                  name: categoryForm.name.trim(),
                  code: categoryForm.code.trim() || undefined,
                };
                const res = await workflowService.createCategory(payload);
                if (!res.success) {
                  setError(res.message || 'Không thể tạo category');
                  return;
                }
                setCategoryForm({ name: '', code: '' });
                setShowCreateCategory(false);
                setSuccess('Tạo category mới thành công.');
                loadAll();
              }}
            >
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Tên nhóm</label>
                  <input
                    type='text'
                    required
                    value={categoryForm.name}
                    onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700'>Mã (tùy chọn)</label>
                  <input
                    type='text'
                    value={categoryForm.code}
                    onChange={e => setCategoryForm(f => ({ ...f, code: e.target.value }))}
                    className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400'
                  />
                </div>
              </div>
                <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                  <button
                    type='button'
                    onClick={() => setShowCreateCategory(false)}
                    className='rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
                  >
                    Hủy
                  </button>
                  <button
                    type='submit'
                    className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600'
                  >
                    Lưu nhóm hàng
                  </button>
                </div>
              </form>
              </div>
            </div>
          )}

          <div className='rounded-xl border border-slate-200 bg-white'>
            <div className='border-b border-slate-200 px-4 py-2 text-sm font-semibold'>Danh sách nhóm hàng</div>
            <div className='max-h-[360px] overflow-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500'>
                  <tr>
                    <th className='px-4 py-2'>Tên</th>
                    <th className='px-4 py-2'>Mã</th>
                    <th className='px-4 py-2'>ID</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {loading && (
                    <tr>
                      <td colSpan={3} className='px-4 py-4 text-center text-slate-400'>
                        Đang tải...
                      </td>
                    </tr>
                  )}
                  {!loading && !categories.length && (
                    <tr>
                      <td colSpan={3} className='px-4 py-4 text-center text-slate-400'>
                        Chưa có category.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    categories.map(c => (
                      <tr key={c._id}>
                        <td className='px-4 py-2 text-slate-800'>{c.name || '-'}</td>
                        <td className='px-4 py-2 text-slate-600'>{c.code || '-'}</td>
                        <td className='px-4 py-2 font-mono text-xs text-slate-500'>{c._id}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

