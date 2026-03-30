import { useEffect, useState } from 'react';
import { RefreshCcw, Search } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

const REQUEST_STATUS = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const PRIORITY_STATUS = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
};

const getStatusClasses = status => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-700';
    case 'APPROVED':
      return 'bg-blue-100 text-blue-700';
    case 'REJECTED':
      return 'bg-red-100 text-red-700';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-700';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const getPriorityClasses = priority => {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-100 text-red-700';
    case 'HIGH':
      return 'bg-orange-100 text-orange-700';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-700';
    case 'LOW':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const PAGE_SIZE = 10;

export default function MaterialRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detailRequest, setDetailRequest] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [approvalForm, setApprovalForm] = useState({
    requestId: null,
    lines: [],
    notes: '',
    expectedDelivery: ''
  });

  const loadRequests = async (page = 1) => {
    setLoading(true);
    setSuccess('');
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(priorityFilter !== 'ALL' ? { priority: priorityFilter } : {}),
      };

      const res = await workflowService.getMaterialRequests(params);
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : res.data;
        setRequests(list);
        setPagination({
          page: res.data.pagination?.page ?? page,
          limit: res.data.pagination?.limit ?? PAGE_SIZE,
          total: res.data.pagination?.total ?? 0,
          pages: res.data.pagination?.pages ?? 1,
        });
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error(err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests(1);
  }, [statusFilter, priorityFilter]);

  const loadDetail = async id => {
    setDetailId(id);
    setDetailRequest(null);
    setDetailError(null);
    if (!id) return;
    
    try {
      const res = await workflowService.getMaterialRequest(id);
      if (res.success && res.data) {
        setDetailRequest(res.data);
      } else {
        setDetailError(res.message || 'Không tìm thấy yêu cầu');
      }
    } catch (error) {
      console.error('Error loading request detail:', error);
      setDetailError('Có lỗi khi tải chi tiết yêu cầu');
    }
  };

  const showApprovalFormForRequest = (request) => {
    if (!request.lines || request.lines.length === 0) {
      alert('Yêu cầu này không có nguyên liệu để duyệt');
      return;
    }

    const lines = request.lines.map(line => ({
      id: line._id,
      item_id: line.item_id,
      item_name: line.item_id?.name || line.item_id?.sku || 'N/A',
      quantity_requested: line.quantity_requested || 0,
      quantity_approved: line.quantity_requested || 0, // Default to requested amount
      uom_id: line.uom_id,
      uom_name: line.uom_id?.code || line.uom_id?.name || 'N/A',
      urgency_level: line.urgency_level || 'MEDIUM',
      reason: line.reason || '',
      current_stock: line.current_stock || 0,
      minimum_required: line.minimum_required || 0
    }));

    setApprovalForm({
      requestId: request._id,
      requestNo: request.request_no,
      lines: lines,
      notes: '',
      expectedDelivery: ''
    });
    
    // Store the full request for location_id access
    setDetailRequest(request);
    setShowApprovalForm(true);
  };

  const updateApprovedQuantity = (lineIndex, newQuantity) => {
    const qty = Number(newQuantity) || 0;
    setApprovalForm(prev => ({
      ...prev,
      lines: prev.lines.map((line, idx) => 
        idx === lineIndex 
          ? { ...line, quantity_approved: qty }
          : line
      )
    }));
  };

  const submitApproval = async () => {
    if (!approvalForm.requestId) return;

    // Validate that all approved quantities are >= 0
    const invalidLines = approvalForm.lines.filter(line => 
      line.quantity_approved < 0
    );

    if (invalidLines.length > 0) {
      alert('Số lượng duyệt không được âm');
      return;
    }

    setActionLoadingId(approvalForm.requestId);
    try {
      // Prepare approved quantities object
      const approvedQuantities = {};
      approvalForm.lines.forEach(line => {
        approvedQuantities[line.item_id._id || line.item_id] = line.quantity_approved;
      });

      const payload = {
        action: 'APPROVE',
        approved_quantities: approvedQuantities,
        notes: approvalForm.notes || undefined,
        expected_delivery: approvalForm.expectedDelivery || undefined
      };

      // Step 1: Approve the material request
      const res = await workflowService.reviewMaterialRequest(approvalForm.requestId, payload);
      
      if (!res.success) {
        alert(res.message || 'Có lỗi khi duyệt yêu cầu');
        return;
      }

      // Step 2: Create inventory adjustments for approved materials
      const adjustmentPromises = approvalForm.lines
        .filter(line => line.quantity_approved > 0)
        .map(async (line) => {
          try {
            // Get the location from the original request (should be raw material location)
            const adjustmentPayload = {
              location_id: detailRequest?.location_id?._id || detailRequest?.location_id,
              item_id: line.item_id._id || line.item_id,
              qty: line.quantity_approved,
              uom_id: line.uom_id._id || line.uom_id,
              reason: `Bổ sung nguyên liệu theo yêu cầu ${approvalForm.requestNo} - ${line.item_name}`,
              // unit_cost will be calculated by backend from item.cost_price
            };

            const adjustRes = await workflowService.adjustInventory(adjustmentPayload);
            if (!adjustRes.success) {
              console.error(`Failed to adjust inventory for ${line.item_name}:`, adjustRes.message);
              return { success: false, item: line.item_name, error: adjustRes.message };
            }
            return { success: true, item: line.item_name };
          } catch (error) {
            console.error(`Error adjusting inventory for ${line.item_name}:`, error);
            return { success: false, item: line.item_name, error: error.message };
          }
        });

      const adjustmentResults = await Promise.all(adjustmentPromises);
      const failedAdjustments = adjustmentResults.filter(r => !r.success);
      
      if (failedAdjustments.length > 0) {
        const failedItems = failedAdjustments.map(r => r.item).join(', ');
        setSuccess(`Đã duyệt yêu cầu ${approvalForm.requestNo} thành công. Tuy nhiên, có lỗi khi bổ sung tồn kho cho: ${failedItems}. Vui lòng kiểm tra lại.`);
      } else {
        setSuccess(`Đã duyệt yêu cầu ${approvalForm.requestNo} và tạo phiếu bổ sung nguyên liệu thành công!`);
      }

      setShowApprovalForm(false);
      setDetailId(null);
      setDetailRequest(null);
      await loadRequests(pagination.page);
      
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Có lỗi khi duyệt yêu cầu');
    } finally {
      setActionLoadingId(null);
    }
  };

  const reviewRequest = async (requestId, action, notes = '') => {
    if (action === 'APPROVE') {
      // For approval, load full request details first, then show the approval form
      try {
        const res = await workflowService.getMaterialRequest(requestId);
        if (res.success && res.data) {
          showApprovalFormForRequest(res.data);
          return;
        } else {
          alert('Không thể tải thông tin yêu cầu');
          return;
        }
      } catch (error) {
        console.error('Error loading request for approval:', error);
        alert('Có lỗi khi tải thông tin yêu cầu');
        return;
      }
    }

    if (!window.confirm(`${action === 'APPROVE' ? 'Duyệt' : 'Từ chối'} yêu cầu này?`)) return;
    
    setActionLoadingId(requestId);
    try {
      const payload = { action };
      if (action === 'REJECT') {
        const reason = prompt('Lý do từ chối:');
        if (!reason) {
          setActionLoadingId(null);
          return;
        }
        payload.rejection_reason = reason;
      }

      const res = await workflowService.reviewMaterialRequest(requestId, payload);
      
      if (res.success) {
        setSuccess(`Đã ${action === 'APPROVE' ? 'duyệt' : 'từ chối'} yêu cầu thành công`);
        setDetailId(null);
        setDetailRequest(null);
        await loadRequests(pagination.page);
      } else {
        alert(res.message || 'Có lỗi khi xử lý yêu cầu');
      }
    } catch (error) {
      console.error('Error reviewing request:', error);
      alert('Có lỗi khi xử lý yêu cầu');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = requests.filter(req => {
    const s = (search || '').toLowerCase();
    const requestNo = req.request_no || req._id || '';
    const notes = req.notes || '';
    return !s || requestNo.toLowerCase().includes(s) || notes.toLowerCase().includes(s);
  });

  return (
    <div className='min-h-full space-y-6 animate-fade-in'>
      {success && (
        <div className='flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className='text-xs text-emerald-700/70 hover:text-emerald-900'>
            Đóng
          </button>
        </div>
      )}

      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Yêu cầu nguyên liệu</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Quản lý các yêu cầu bổ sung nguyên liệu từ bếp trung tâm
          </p>
        </div>
        <div className='flex gap-2'>
          <button
            onClick={() => loadRequests(1)}
            className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'
          >
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Tìm theo mã yêu cầu / ghi chú...'
            className='input-field w-full pl-9'
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className='input-field min-w-[150px]'
        >
          <option value='ALL'>Tất cả trạng thái</option>
          {Object.entries(REQUEST_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className='input-field min-w-[150px]'
        >
          <option value='ALL'>Tất cả mức độ</option>
          {Object.entries(PRIORITY_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Mã yêu cầu</th>
              <th className='px-4 py-3'>Ngày tạo</th>
              <th className='px-4 py-3'>Mức độ</th>
              <th className='px-4 py-3'>Lý do</th>
              <th className='px-4 py-3'>Trạng thái</th>
              <th className='px-4 py-3'>Người tạo</th>
              <th className='px-4 py-3 text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && (
              <tr>
                <td colSpan={7} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td>
              </tr>
            )}
            {!loading && !filteredRequests.length && (
              <tr>
                <td colSpan={7} className='px-4 py-6 text-center text-slate-400'>Không có yêu cầu nào.</td>
              </tr>
            )}
            {!loading && filteredRequests.map((req) => (
              <tr key={req._id}>
                <td className='px-4 py-3 font-medium text-slate-900'>
                  {req.request_no || req._id}
                </td>
                <td className='px-4 py-3 text-slate-700'>
                  {req.request_date ? new Date(req.request_date).toLocaleString('vi-VN') : '-'}
                </td>
                <td className='px-4 py-3'>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityClasses(req.priority)}`}>
                    {PRIORITY_STATUS[req.priority] || req.priority}
                  </span>
                </td>
                <td className='px-4 py-3 text-slate-700 text-xs'>
                  {req.request_reason === 'PRODUCTION_SHORTAGE' ? 'Thiếu hụt sản xuất' : req.request_reason}
                </td>
                <td className='px-4 py-3'>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(req.status)}`}>
                    {REQUEST_STATUS[req.status] || req.status}
                  </span>
                </td>
                <td className='px-4 py-3 text-slate-700 text-xs'>
                  {req.requested_by?.full_name || req.requested_by?.username || '-'}
                </td>
                <td className='px-4 py-3 text-right'>
                  <button
                    onClick={() => loadDetail(req._id)}
                    className='mr-2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'
                  >
                    Chi tiết
                  </button>
                  {req.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => reviewRequest(req._id, 'APPROVE')}
                        disabled={actionLoadingId === req._id}
                        className='mr-2 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => reviewRequest(req._id, 'REJECT')}
                        disabled={actionLoadingId === req._id}
                        className='rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60'
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.total > 0 && (
        <div className='flex items-center justify-between text-sm text-slate-500'>
          <p>
            Hiển thị {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} yêu cầu
          </p>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => loadRequests(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
            >
              Trước
            </button>
            <span>Trang {pagination.page} / {Math.max(1, pagination.pages)}</span>
            <button
              type='button'
              onClick={() => loadRequests(pagination.page + 1)}
              disabled={pagination.page >= Math.max(1, pagination.pages)}
              className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* Modal chi tiết yêu cầu */}
      {detailId && (
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => setDetailId(null)}>
          <div
            className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Chi tiết yêu cầu nguyên liệu</h2>
              <button onClick={() => setDetailId(null)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            
            {!detailRequest && !detailError && <p className='text-sm text-slate-500'>Đang tải...</p>}
            {detailError && <p className='text-sm text-red-600'>{detailError}</p>}
            
            {detailRequest && (
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-2 text-sm'>
                  <span className='text-slate-500'>Mã yêu cầu:</span>
                  <span className='font-medium'>{detailRequest.request_no || detailRequest._id}</span>
                  
                  <span className='text-slate-500'>Ngày tạo:</span>
                  <span>{detailRequest.request_date ? new Date(detailRequest.request_date).toLocaleString('vi-VN') : '-'}</span>
                  
                  <span className='text-slate-500'>Mức độ:</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityClasses(detailRequest.priority)}`}>
                    {PRIORITY_STATUS[detailRequest.priority] || detailRequest.priority}
                  </span>
                  
                  <span className='text-slate-500'>Trạng thái:</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(detailRequest.status)}`}>
                    {REQUEST_STATUS[detailRequest.status] || detailRequest.status}
                  </span>
                  
                  <span className='text-slate-500'>Người tạo:</span>
                  <span>{detailRequest.requested_by?.full_name || detailRequest.requested_by?.username || '-'}</span>
                </div>

                {detailRequest.notes && (
                  <div>
                    <h3 className='mb-2 text-sm font-medium text-slate-700'>Ghi chú</h3>
                    <p className='text-sm text-slate-600 bg-slate-50 p-3 rounded-lg'>{detailRequest.notes}</p>
                  </div>
                )}

                <div>
                  <h3 className='mb-2 text-sm font-medium text-slate-700'>Danh sách nguyên liệu yêu cầu</h3>
                  <table className='w-full text-sm'>
                    <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                      <tr>
                        <th className='px-3 py-2'>Nguyên liệu</th>
                        <th className='px-3 py-2'>Số lượng</th>
                        <th className='px-3 py-2'>ĐVT</th>
                        <th className='px-3 py-2'>Mức độ</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {(detailRequest.lines || []).map((line, idx) => (
                        <tr key={line._id || idx}>
                          <td className='px-3 py-2'>
                            {line.item_id?.name || line.item_id?.sku || line.item_id || '-'}
                          </td>
                          <td className='px-3 py-2'>{line.quantity_requested || 0}</td>
                          <td className='px-3 py-2'>{line.uom_id?.code || line.uom_id?.name || '-'}</td>
                          <td className='px-3 py-2'>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityClasses(line.urgency_level)}`}>
                              {PRIORITY_STATUS[line.urgency_level] || line.urgency_level || 'MEDIUM'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {detailRequest.status === 'PENDING' && (
                  <div className='flex justify-end gap-2 border-t pt-4'>
                    <button
                      onClick={() => reviewRequest(detailRequest._id, 'REJECT')}
                      disabled={actionLoadingId === detailRequest._id}
                      className='rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60'
                    >
                      Từ chối
                    </button>
                    <button
                      onClick={() => showApprovalFormForRequest(detailRequest)}
                      disabled={actionLoadingId === detailRequest._id}
                      className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
                    >
                      Duyệt yêu cầu
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal form duyệt yêu cầu với điều chỉnh số lượng */}
      {showApprovalForm && (
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => setShowApprovalForm(false)}>
          <div
            className='w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>
                Duyệt yêu cầu nguyên liệu - {approvalForm.requestNo}
              </h2>
              <button onClick={() => setShowApprovalForm(false)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            
            <div className='space-y-4'>
              <div className='rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700'>
                <p className='font-medium'>Hướng dẫn:</p>
                <p>• Điều chỉnh số lượng duyệt cho từng nguyên liệu (có thể bằng hoặc nhiều hơn số yêu cầu)</p>
                <p>• Hệ thống sẽ tự động bổ sung tồn kho nguyên liệu vào kho sau khi duyệt</p>
                <p>• Số lượng duyệt sẽ được cộng trực tiếp vào tồn kho hiện tại</p>
              </div>

              <div className='overflow-x-auto rounded-lg border border-slate-200'>
                <table className='w-full text-sm'>
                  <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                    <tr>
                      <th className='px-3 py-2'>Nguyên liệu</th>
                      <th className='px-3 py-2'>ĐVT</th>
                      <th className='px-3 py-2'>Tồn hiện tại</th>
                      <th className='px-3 py-2'>SL yêu cầu</th>
                      <th className='px-3 py-2'>SL duyệt</th>
                      <th className='px-3 py-2'>Mức độ</th>
                      <th className='px-3 py-2'>Lý do</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {approvalForm.lines.map((line, idx) => (
                      <tr key={line.id || idx}>
                        <td className='px-3 py-2 font-medium text-slate-800'>
                          {line.item_name}
                        </td>
                        <td className='px-3 py-2 text-slate-600'>
                          {line.uom_name}
                        </td>
                        <td className='px-3 py-2 text-slate-600'>
                          {line.current_stock}
                        </td>
                        <td className='px-3 py-2 text-slate-600'>
                          {line.quantity_requested}
                        </td>
                        <td className='px-3 py-2'>
                          <input
                            type='number'
                            min={0}
                            step={0.01}
                            value={line.quantity_approved}
                            onChange={e => updateApprovedQuantity(idx, e.target.value)}
                            className='w-20 rounded border border-slate-200 px-2 py-1 text-sm'
                          />
                        </td>
                        <td className='px-3 py-2'>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            line.urgency_level === 'URGENT' ? 'bg-red-100 text-red-700' :
                            line.urgency_level === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                            line.urgency_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {PRIORITY_STATUS[line.urgency_level] || line.urgency_level}
                          </span>
                        </td>
                        <td className='px-3 py-2 text-xs text-slate-600 max-w-32 truncate' title={line.reason}>
                          {line.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-1'>
                    Ghi chú duyệt (tùy chọn)
                  </label>
                  <textarea
                    value={approvalForm.notes}
                    onChange={e => setApprovalForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder='Ghi chú thêm về việc duyệt yêu cầu...'
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'
                    rows={3}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-1'>
                    Ngày giao dự kiến (tùy chọn)
                  </label>
                  <input
                    type='date'
                    value={approvalForm.expectedDelivery}
                    onChange={e => setApprovalForm(prev => ({ ...prev, expectedDelivery: e.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'
                  />
                </div>
              </div>

              <div className='flex justify-end gap-2 border-t pt-4'>
                <button
                  onClick={() => setShowApprovalForm(false)}
                  className='rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50'
                >
                  Hủy
                </button>
                <button
                  onClick={submitApproval}
                  disabled={actionLoadingId === approvalForm.requestId}
                  className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
                >
                  {actionLoadingId === approvalForm.requestId ? 'Đang xử lý...' : 'Duyệt và bổ sung tồn kho'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}