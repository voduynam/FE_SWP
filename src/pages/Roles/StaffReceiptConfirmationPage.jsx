import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, CheckCircle, XCircle, AlertTriangle, Camera, History, RefreshCcw, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { workflowService } from '../../services/workflowService';

const GOODS_RECEIPT_STATUS = {
  DRAFT: 'Nháp',
  RECEIVED: 'Đã nhận',
  PARTIAL: 'Nhận một phần',
  CANCELLED: 'Đã hủy',
};

const PAGE_SIZE = 10;

const StaffReceiptConfirmationPage = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('confirmation');
  
  // Confirmation tab states
  const [pendingShipments, setPendingShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [confirmationData, setConfirmationData] = useState({
    receipt_status: '',
    receipt_notes: '',
    delivery_discrepancy: '',
    evidence_photos: []
  });
  const [loading, setLoading] = useState(false);

  // History tab states
  const [receipts, setReceipts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detailReceipt, setDetailReceipt] = useState(null);
  const [detailError, setDetailError] = useState(null);

  useEffect(() => {
    if (activeTab === 'confirmation') {
      fetchPendingShipments();
    } else if (activeTab === 'history') {
      loadReceipts(1);
    }
  }, [activeTab, statusFilter]);

  const fetchPendingShipments = async () => {
    try {
      console.log('Fetching pending shipments...');
      const res = await workflowService.getShipmentsPaginated({
        status: 'DELIVERED',
        receipt_status: 'PENDING_RECEIPT'
      });
      console.log('API Response:', res);
      if (res.success && res.data) {
        // Handle nested data structure from paginated endpoints
        let list = [];
        if (Array.isArray(res.data.data)) {
          list = res.data.data;
        } else if (Array.isArray(res.data)) {
          list = res.data;
        } else if (res.data.data && Array.isArray(res.data.data.data)) {
          list = res.data.data.data;
        } else if (res.data.data && Array.isArray(res.data.data)) {
          list = res.data.data;
        }
        
        console.log('Processed shipments list:', list);
        console.log('List length:', list.length);
        
        // Filter only shipments with PENDING_RECEIPT status
        const filteredList = list.filter(shipment => 
          shipment.receipt_status === 'PENDING_RECEIPT'
        );
        
        console.log('Filtered list:', filteredList);
        setPendingShipments(filteredList);
      } else {
        console.log('No success or data in response');
        setPendingShipments([]);
      }
    } catch (error) {
      console.error('Error fetching pending shipments:', error);
      toast.error('Lỗi khi tải danh sách giao hàng');
      setPendingShipments([]);
    }
  };

  // History tab functions
  const loadReceipts = async (page = 1, keepSuccess = false) => {
    setHistoryLoading(true);
    try {
      const res = await workflowService.getGoodsReceiptsPaginated({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setReceipts(list);
        setPagination({
          page: res.data.pagination?.page ?? page,
          limit: res.data.pagination?.limit ?? PAGE_SIZE,
          total: res.data.pagination?.total ?? 0,
          pages: res.data.pagination?.pages ?? 1,
        });
      } else {
        setReceipts([]);
      }
    } catch (err) {
      console.error(err);
      setReceipts([]);
      toast.error('Lỗi khi tải lịch sử nhận hàng');
    } finally {
      setHistoryLoading(false);
    }
  };
  const loadDetail = async id => {
    setDetailId(id);
    setDetailReceipt(null);
    setDetailError(null);
    if (!id) return;
    const res = await workflowService.getGoodsReceipt(id);
    if (res.success && res.data) {
      setDetailReceipt(res.data);
    } else {
      setDetailError(res.message || 'Không tìm thấy phiếu nhận hàng');
    }
  };

  const filteredReceipts = useMemo(() => {
    const s = (search || '').toLowerCase();
    return receipts.filter(r => {
      const no = r.receipt_no || r._id || '';
      const shipNo = r.shipment_id?.shipment_no || r.shipment_id || '';
      return (
        !s ||
        no.toLowerCase().includes(s) ||
        String(shipNo).toLowerCase().includes(s)
      );
    });
  }, [receipts, search]);

  const getItemName = line => {
    const item = line.item_id;
    if (!item) return line.item_id || '-';
    if (typeof item === 'object') return item.name || item.sku || item._id;
    return line.item_id;
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length + confirmationData.evidence_photos.length > 5) {
      toast.error('Chỉ được upload tối đa 5 file');
      return;
    }
    
    setConfirmationData(prev => ({
      ...prev,
      evidence_photos: [...prev.evidence_photos, ...files]
    }));
  };

  const removeFile = (index) => {
    setConfirmationData(prev => ({
      ...prev,
      evidence_photos: prev.evidence_photos.filter((_, i) => i !== index)
    }));
  };
  const handleConfirmReceipt = async (e) => {
    // Prevent any form submission or navigation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('=== handleConfirmReceipt START ===');
    console.log('selectedShipment:', selectedShipment);
    console.log('confirmationData:', confirmationData);
    
    if (!selectedShipment || !confirmationData.receipt_status) {
      console.log('VALIDATION FAILED: Missing shipment or status');
      toast.error('Vui lòng chọn trạng thái xác nhận');
      return;
    }

    console.log('VALIDATION PASSED');
    setLoading(true);
    try {
      console.log('Preparing FormData...');
      
      const formData = new FormData();
      formData.append('receipt_status', confirmationData.receipt_status);
      formData.append('receipt_notes', confirmationData.receipt_notes || '');
      formData.append('delivery_discrepancy', confirmationData.delivery_discrepancy || '');
      
      console.log('Evidence photos count:', confirmationData.evidence_photos.length);
      confirmationData.evidence_photos.forEach((file, index) => {
        console.log(`Appending file ${index}:`, file.name, file.type, file.size);
        formData.append('evidence_photos', file);
      });

      console.log('FormData prepared. Sending API call...');
      console.log('Shipment ID:', selectedShipment._id || selectedShipment.id);
      
      const res = await workflowService.confirmReceipt(selectedShipment._id || selectedShipment.id, formData);
      console.log('API Response received:', res);

      if (res.success) {
        console.log('SUCCESS: Receipt confirmed');
        console.log('Response data:', res.data);
        
        // If receipt status is OK or WITH_ISSUES, automatically add to inventory
        if (confirmationData.receipt_status === 'RECEIVED_OK' || confirmationData.receipt_status === 'RECEIVED_WITH_ISSUES') {
          console.log('Attempting to add goods to inventory...');
          
          // Get the goods receipt that was created
          const goodsReceiptRes = await workflowService.getGoodsReceipts({ shipment_id: selectedShipment._id });
          if (goodsReceiptRes.success && goodsReceiptRes.data) {
            const receipts = Array.isArray(goodsReceiptRes.data) ? goodsReceiptRes.data : 
                           Array.isArray(goodsReceiptRes.data.data) ? goodsReceiptRes.data.data : [];
            
            if (receipts.length > 0) {
              const latestReceipt = receipts[0];
              console.log('Found goods receipt:', latestReceipt._id);
              
              // Confirm goods receipt to add to inventory
              const confirmInventoryRes = await workflowService.confirmGoodsReceipt(latestReceipt._id, {
                status: 'RECEIVED'
              });
              
              if (confirmInventoryRes.success) {
                console.log('SUCCESS: Goods added to inventory');
                toast.success('Xác nhận nhận hàng và thêm vào tồn kho thành công');
              } else {
                console.log('WARNING: Could not add to inventory:', confirmInventoryRes.message);
                toast.warning('Xác nhận nhận hàng thành công nhưng chưa thêm vào tồn kho');
              }
            }
          }
        } else {
          toast.success('Xác nhận nhận hàng thành công');
        }
        
        setSelectedShipment(null);
        setConfirmationData({
          receipt_status: '',
          receipt_notes: '',
          delivery_discrepancy: '',
          evidence_photos: []
        });
        fetchPendingShipments();
      } else {
        console.log('API FAILED:', res.message);
        throw new Error(res.message || 'Lỗi xác nhận');
      }
    } catch (error) {
      console.error('=== ERROR IN handleConfirmReceipt ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      toast.error(error.message || 'Lỗi xác nhận nhận hàng');
    } finally {
      console.log('=== handleConfirmReceipt END ===');
      setLoading(false);
    }
  };
  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING_RECEIPT': { color: 'bg-yellow-500', text: 'Chờ xác nhận' },
      'RECEIVED_OK': { color: 'bg-green-500', text: 'Đã nhận OK' },
      'RECEIVED_WITH_ISSUES': { color: 'bg-orange-500', text: 'Nhận có vấn đề' },
      'NOT_RECEIVED': { color: 'bg-red-500', text: 'Chưa nhận được' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-500', text: status };
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bàn Giao & Nhận Hàng</h1>
        <p className="text-gray-600">Xác nhận nhận hàng từ driver và xem lịch sử nhận hàng</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('confirmation')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'confirmation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Xác Nhận Nhận Hàng
                {pendingShipments.length > 0 && (
                  <Badge className="bg-red-500 text-white text-xs">
                    {pendingShipments.length}
                  </Badge>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Lịch Sử Nhận Hàng
              </div>
            </button>
          </nav>
        </div>
      </div>
      {/* Confirmation Tab Content */}
      {activeTab === 'confirmation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Danh sách giao hàng chờ xác nhận */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Giao Hàng Chờ Xác Nhận
              </CardTitle>
              <CardDescription>
                {pendingShipments.length} lô hàng cần xác nhận
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingShipments.map((shipment, index) => (
                  <div
                    key={shipment._id || shipment.id || index}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      (selectedShipment?._id === shipment._id || selectedShipment?.id === shipment.id) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedShipment(shipment)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">#{shipment.shipment_no || shipment.shipment_number}</p>
                        <p className="text-sm text-gray-600">
                          Đơn hàng: {shipment.order_id?.order_no || shipment.internal_order?.order_number}
                        </p>
                      </div>
                      {getStatusBadge(shipment.receipt_status)}
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <p>Giao lúc: {shipment.delivered_at ? new Date(shipment.delivered_at).toLocaleString('vi-VN') : '-'}</p>
                      <p>Tài xế: {shipment.driver_id?.full_name || shipment.driver?.full_name}</p>
                      <p>Tổng tiền: {(shipment.order_id?.total_amount || shipment.internal_order?.total_amount || 0).toLocaleString('vi-VN')} VND</p>
                    </div>

                    {shipment.delivery_time_hours > 24 && (
                      <Alert className="mt-2 border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-700">
                          Đã quá 24h chưa xác nhận - Cần xác nhận ngay!
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}

                {pendingShipments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Không có giao hàng nào cần xác nhận</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Form xác nhận */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Xác Nhận Nhận Hàng
              </CardTitle>
              <CardDescription>
                {selectedShipment 
                  ? `Xác nhận cho lô hàng #${selectedShipment.shipment_no || selectedShipment.shipment_number}`
                  : 'Chọn lô hàng để xác nhận'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedShipment ? (
                <div className="space-y-4">
                  {/* Thông tin đơn hàng */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Thông Tin Đơn Hàng</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Số đơn: {selectedShipment.order_id?.order_no || selectedShipment.internal_order?.order_number}</div>
                      <div>Tổng tiền: {(selectedShipment.order_id?.total_amount || selectedShipment.internal_order?.total_amount || 0).toLocaleString('vi-VN')} VND</div>
                      <div>Tài xế: {selectedShipment.driver_id?.full_name || selectedShipment.driver?.full_name}</div>
                      <div>Giao lúc: {selectedShipment.delivered_at ? new Date(selectedShipment.delivered_at).toLocaleString('vi-VN') : '-'}</div>
                    </div>
                  </div>

                  {/* Trạng thái xác nhận */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Trạng Thái Nhận Hàng <span className="text-red-500">*</span>
                    </label>
                    <Select 
                      value={confirmationData.receipt_status} 
                      onValueChange={(value) => setConfirmationData(prev => ({...prev, receipt_status: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RECEIVED_OK">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Đã nhận đầy đủ, không có vấn đề
                          </div>
                        </SelectItem>
                        <SelectItem value="RECEIVED_WITH_ISSUES">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            Đã nhận nhưng có vấn đề
                          </div>
                        </SelectItem>
                        <SelectItem value="NOT_RECEIVED">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            Chưa nhận được hàng
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Ghi chú */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Ghi Chú</label>
                    <Textarea
                      placeholder="Ghi chú về tình trạng hàng nhận..."
                      value={confirmationData.receipt_notes}
                      onChange={(e) => setConfirmationData(prev => ({...prev, receipt_notes: e.target.value}))}
                      rows={3}
                    />
                  </div>

                  {/* Mô tả vấn đề (nếu có) */}
                  {(confirmationData.receipt_status === 'RECEIVED_WITH_ISSUES' || 
                    confirmationData.receipt_status === 'NOT_RECEIVED') && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Mô Tả Vấn Đề <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        placeholder="Mô tả chi tiết vấn đề gặp phải..."
                        value={confirmationData.delivery_discrepancy}
                        onChange={(e) => setConfirmationData(prev => ({...prev, delivery_discrepancy: e.target.value}))}
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Upload ảnh/video bằng chứng */}
                  {(confirmationData.receipt_status === 'RECEIVED_WITH_ISSUES' || 
                    confirmationData.receipt_status === 'NOT_RECEIVED') && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Ảnh/Video Bằng Chứng
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="evidence-upload"
                        />
                        <label htmlFor="evidence-upload" className="cursor-pointer">
                          <div className="text-center">
                            <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600">
                              Click để upload ảnh/video bằng chứng
                            </p>
                            <p className="text-xs text-gray-500">
                              Tối đa 5 files, mỗi file &lt; 50MB
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* Danh sách files đã upload */}
                      {confirmationData.evidence_photos.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {confirmationData.evidence_photos.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm truncate">{file.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nút xác nhận */}
                  <Button 
                    type="button"
                    onClick={handleConfirmReceipt}
                    disabled={loading || !confirmationData.receipt_status}
                    className="w-full"
                  >
                    {loading ? 'Đang xử lý...' : 'Xác Nhận Nhận Hàng'}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chọn lô hàng để xác nhận</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Search and Filter */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo số phiếu / số lô giao..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value='ALL'>Tất cả trạng thái</option>
              {Object.entries(GOODS_RECEIPT_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <Button
              onClick={() => loadReceipts(1)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Làm mới
            </Button>
          </div>

          {/* History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Lịch Sử Nhận Hàng
              </CardTitle>
              <CardDescription>
                Danh sách các phiếu nhận hàng đã tạo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Số phiếu</th>
                      <th className="px-4 py-3">Lô giao</th>
                      <th className="px-4 py-3">Ngày nhận</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Người nhận</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyLoading && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                          Đang tải...
                        </td>
                      </tr>
                    )}
                    {!historyLoading && !filteredReceipts.length && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                          Chưa có phiếu nhận hàng nào.
                        </td>
                      </tr>
                    )}
                    {!historyLoading &&
                      filteredReceipts.map(r => (
                        <tr key={r._id}>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {r.receipt_no || r._id}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {r.shipment_id?.shipment_no || r.shipment_id || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {r.received_date
                              ? new Date(r.received_date).toLocaleString('vi-VN')
                              : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={`${
                                r.status === 'RECEIVED'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : r.status === 'DRAFT'
                                    ? 'bg-amber-100 text-amber-700'
                                    : r.status === 'CANCELLED'
                                      ? 'bg-slate-100 text-slate-600'
                                      : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {GOODS_RECEIPT_STATUS[r.status] || r.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {r.received_by?.full_name || r.received_by?.username || r.received_by || '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              onClick={() => loadDetail(r._id)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              Chi tiết
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {pagination.total > 0 && (
                <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
                  <p>
                    Hiển thị {(pagination.page - 1) * pagination.limit + 1} -{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} phiếu
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadReceipts(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      Trước
                    </Button>
                    <span>
                      Trang {pagination.page} / {Math.max(1, pagination.pages)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadReceipts(pagination.page + 1)}
                      disabled={pagination.page >= Math.max(1, pagination.pages)}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail Modal */}
      {detailId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => { setDetailId(null); setDetailError(null); }}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Chi tiết phiếu nhận hàng
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDetailId(null); setDetailError(null); }}
              >
                ×
              </Button>
            </div>
            {!detailReceipt && !detailError && <p className="text-sm text-slate-500">Đang tải...</p>}
            {detailError && <p className="text-sm text-red-600">{detailError}</p>}
            {detailReceipt && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-slate-500">Số phiếu:</span>
                  <span className="font-medium">{detailReceipt.receipt_no || detailReceipt._id}</span>
                  <span className="text-slate-500">Lô giao:</span>
                  <span className="font-medium">
                    {detailReceipt.shipment_id?.shipment_no || detailReceipt.shipment_id}
                  </span>
                  <span className="text-slate-500">Ngày nhận:</span>
                  <span>
                    {detailReceipt.received_date
                      ? new Date(detailReceipt.received_date).toLocaleString('vi-VN')
                      : '-'}
                  </span>
                  <span className="text-slate-500">Trạng thái:</span>
                  <span>
                    {GOODS_RECEIPT_STATUS[detailReceipt.status] || detailReceipt.status}
                  </span>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-slate-700">Chi tiết dòng</h3>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Sản phẩm</th>
                        <th className="px-3 py-2">Nhận</th>
                        <th className="px-3 py-2">Từ chối</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detailReceipt.lines || []).map((line, idx) => (
                        <tr key={line._id || idx}>
                          <td className="px-3 py-2">{getItemName(line)}</td>
                          <td className="px-3 py-2">{line.qty_received ?? 0}</td>
                          <td className="px-3 py-2">{line.qty_rejected ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffReceiptConfirmationPage;