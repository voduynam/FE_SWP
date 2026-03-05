import { useEffect, useState } from 'react';
import { workflowService } from '../../services/workflowService';

export default function SupplyIssuesPage() {
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [issues, setIssues] = useState([]);

  const loadIssues = async (nextSeverity, nextStatus) => {
    const result = await workflowService.getExceptions({
      severity: nextSeverity || undefined,
      status: nextStatus || undefined,
      limit: 20,
    });
    const rows = Array.isArray(result.data?.data)
      ? result.data.data
      : Array.isArray(result.data)
        ? result.data
        : [];
    setIssues(result.success ? rows : []);
  };

  useEffect(() => {
    loadIssues(severity, status);
  }, [severity, status]);

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Xử lý sự cố đơn hàng</h1>
          <p className='text-gray-600'>
            Flow áp dụng: theo dõi và xử lý `exceptions` theo mức độ ưu tiên.
          </p>
        </div>
        <div className='flex gap-2'>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className='rounded-md border px-3 py-2 text-sm'
          >
            <option value=''>Tất cả trạng thái</option>
            <option value='OPEN'>OPEN</option>
            <option value='IN_PROGRESS'>IN_PROGRESS</option>
            <option value='RESOLVED'>RESOLVED</option>
            <option value='CLOSED'>CLOSED</option>
          </select>
          <select
            value={severity}
            onChange={e => setSeverity(e.target.value)}
            className='rounded-md border px-3 py-2 text-sm'
          >
            <option value=''>Tất cả mức độ</option>
            <option value='LOW'>LOW</option>
            <option value='MEDIUM'>MEDIUM</option>
            <option value='HIGH'>HIGH</option>
            <option value='CRITICAL'>CRITICAL</option>
          </select>
          <button
            onClick={() => loadIssues(severity, status)}
            className='rounded-md bg-black px-3 py-2 text-sm text-white'
          >
            Làm mới
          </button>
        </div>
      </div>

      <div className='rounded-lg border bg-white divide-y'>
        {!issues.length && <p className='px-4 py-6 text-sm text-gray-500'>Không có dữ liệu sự cố</p>}
        {issues.map(issue => (
          <div key={issue._id || issue.id} className='px-4 py-3 text-sm'>
            <div className='font-medium'>
              {issue.exception_type || 'EXCEPTION'} - {issue.severity || '-'}
            </div>
            <div className='text-gray-500'>{issue.description || 'Không có mô tả'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

