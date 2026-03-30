import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  DollarSign,
  Truck,
  ChefHat,
  Package,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { workflowService } from '@/services/workflowService';

const PerformanceManagementPage = () => {
  const [violations, setViolations] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [reviewData, setReviewData] = useState({
    manager_notes: '',
    resolution_required: false,
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState('open');

  const fetchViolations = useCallback(async () => {
    const result = await workflowService.getPerformanceViolations({ limit: 100 });
    if (result.success) {
      // Backend returns paginated: { data: [...], pagination: {...} }
      const raw = result.data;
      const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
      setViolations(list);
    } else {
      toast.error('Lỗi khi tải danh sách vi phạm: ' + result.message);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    const result = await workflowService.getPerformanceDashboardData();
    if (result.success) {
      setDashboard(result.data);
    } else {
      toast.error('Lỗi khi tải dashboard: ' + result.message);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setFetching(true);
      await Promise.all([fetchViolations(), fetchDashboard()]);
      setFetching(false);
    };
    load();
  }, [fetchViolations, fetchDashboard]);

  const handleReviewViolation = async (violationId, decision) => {
    if (!reviewData.manager_notes.trim()) {
      toast.error('Vui lòng nhập ghi chú đánh giá');
      return;
    }

    setLoading(true);
    try {
      const result = await workflowService.reviewPerformanceViolation(violationId, {
        manager_decision: decision,
        manager_notes: reviewData.manager_notes,
        resolution_required: reviewData.resolution_required,
      });

      if (result.success) {
        toast.success(`Vi phạm đã được ${decision === 'CONFIRMED' ? 'xác nhận' : 'bác bỏ'}`);
        setSelectedViolation(null);
        setReviewData({ manager_notes: '', resolution_required: false });
        await Promise.all([fetchViolations(), fetchDashboard()]);
      } else {
        toast.error('Lỗi đánh giá vi phạm: ' + result.message);
      }
    } catch (error) {
      toast.error('Lỗi khi đánh giá vi phạm');
    } finally {
      setLoading(false);
    }
  };

  const runPerformanceCheck = async () => {
    setLoading(true);
    try {
      const result = await workflowService.runPerformanceCheck();
      if (result.success) {
        const total = result.data?.total_violations ?? 0;
        toast.success(`Đã kiểm tra hiệu suất - Phát hiện ${total} vi phạm mới`);
        await Promise.all([fetchViolations(), fetchDashboard()]);
      } else {
        toast.error('Lỗi khi chạy kiểm tra: ' + result.message);
      }
    } catch (error) {
      toast.error('Lỗi khi chạy kiểm tra hiệu suất');
    } finally {
      setLoading(false);
    }
  };

  const getViolationTypeInfo = (type) => {
    const types = {
      PRODUCTION_SHORTAGE: { icon: ChefHat, label: 'Thiếu Sản Phẩm', color: 'text-red-600', bgColor: 'bg-red-100' },
      PRODUCTION_QUALITY: { icon: Package, label: 'Chất Lượng Sản Xuất', color: 'text-orange-600', bgColor: 'bg-orange-100' },
      PRODUCTION_DELAY: { icon: Clock, label: 'Sản Xuất Trễ', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
      COORDINATOR_ASSIGNMENT: { icon: Users, label: 'Chậm Phân Công', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
      COORDINATOR_HANDOVER: { icon: Clock, label: 'Chậm Bàn Giao', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      DRIVER_DELAY: { icon: Truck, label: 'Giao Hàng Trễ', color: 'text-purple-600', bgColor: 'bg-purple-100' },
      DRIVER_COD_ERROR: { icon: DollarSign, label: 'Sai Sót COD', color: 'text-green-600', bgColor: 'bg-green-100' },
    };
    return types[type] || { icon: AlertTriangle, label: type, color: 'text-gray-600', bgColor: 'bg-gray-100' };
  };

  const getSeverityBadge = (severity) => {
    const cfg = {
      HIGH: { color: 'bg-red-500', text: 'Cao' },
      MEDIUM: { color: 'bg-orange-500', text: 'Trung Bình' },
      LOW: { color: 'bg-yellow-500', text: 'Thấp' },
      CRITICAL: { color: 'bg-red-800', text: 'Nghiêm Trọng' },
    };
    const c = cfg[severity] || { color: 'bg-gray-500', text: severity };
    return <Badge className={`${c.color} text-white`}>{c.text}</Badge>;
  };

  const getStatusBadge = (status) => {
    const cfg = {
      OPEN: { color: 'bg-yellow-500', text: 'Chờ Đánh Giá' },
      UNDER_REVIEW: { color: 'bg-blue-500', text: 'Đang Xem Xét' },
      CONFIRMED: { color: 'bg-red-500', text: 'Đã Xác Nhận' },
      DISMISSED: { color: 'bg-green-500', text: 'Đã Bác Bỏ' },
      RESOLVED: { color: 'bg-gray-500', text: 'Đã Giải Quyết' },
    };
    const c = cfg[status] || { color: 'bg-gray-400', text: status };
    return <Badge className={`${c.color} text-white`}>{c.text}</Badge>;
  };

  const renderViolationData = (data) => {
    if (!data || Object.keys(data).length === 0) return null;

    const translateKey = (key) => {
      const keysMap = {
        planned_qty: 'Kế hoạch',
        actual_qty: 'Thực tế',
        shortage_qty: 'Thiếu',
        shortage_percentage: 'Tỷ lệ thiếu',
        expected_handover_time: 'Giờ bàn giao dự kiến',
        actual_handover_time: 'Giờ bàn giao thực tế',
        delay_minutes: 'Số phút trễ',
        expected_delivery_time: 'Thời gian giao dự kiến',
        actual_delivery_time: 'Thời gian giao thực tế',
        expected_amount: 'Tiền COD dự kiến',
        collected_amount: 'Tiền COD thực thu',
        discrepancy: 'Số tiền chênh lệch',
        discrepancy_percentage: 'Tỷ lệ chênh lệch (%)',
        shipment_no: 'Mã đơn giao',
        assignment_id: 'Mã phân công',
        item_id: 'Mã thành phẩm / Vật liệu',
        waste_qty: 'Số lượng hỏng/huỷ',
        disposal_reason: 'Lý do huỷ',
        expected_completion: 'Hoàn thành dự kiến',
        actual_completion: 'Hoàn thành thực tế'
      };
      return keysMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    const formatValue = (key, value) => {
      if (typeof value === 'boolean') return value ? 'Có' : 'Không';
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        return new Date(value).toLocaleString('vi-VN', { 
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          day: '2-digit', month: '2-digit', year: 'numeric' 
        });
      }
      if (key.includes('amount') || key === 'discrepancy') {
        return Number(value).toLocaleString('vi-VN') + ' ₫';
      }
      if (key.includes('percentage') || key.includes('rate')) {
        return Number(value).toFixed(2) + '%';
      }
      if (key.includes('minutes')) {
        return `${value} phút`;
      }
      return value;
    };

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 bg-white border border-slate-200 p-3 rounded-md shadow-sm">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="text-xs text-slate-500 mb-0.5">{translateKey(key)}</span>
            <span className="text-sm font-medium text-slate-900">{formatValue(key, value)}</span>
          </div>
        ))}
      </div>
    );
  };

  // Counts
  const openCount = violations.filter(v => v.status === 'OPEN' || v.status === 'UNDER_REVIEW').length;
  const confirmedCount = violations.filter(v => v.status === 'CONFIRMED').length;
  const dismissedCount = violations.filter(v => v.status === 'DISMISSED').length;
  const resolvedCount = violations.filter(v => v.status === 'RESOLVED').length;

  const filteredViolations = violations.filter(v => {
    if (activeTab === 'open') return v.status === 'OPEN' || v.status === 'UNDER_REVIEW';
    if (activeTab === 'confirmed') return v.status === 'CONFIRMED';
    if (activeTab === 'dismissed') return v.status === 'DISMISSED';
    if (activeTab === 'resolved') return v.status === 'RESOLVED';
    return true;
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quản Lý Hiệu Suất</h1>
          <p className="text-gray-600">Theo dõi và đánh giá hiệu suất làm việc của nhân viên</p>
        </div>
        <Button onClick={runPerformanceCheck} disabled={loading || fetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Chạy Kiểm Tra
        </Button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chờ Đánh Giá</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {fetching ? '...' : (dashboard?.pending_reviews ?? openCount)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã Xác Nhận</p>
                <p className="text-2xl font-bold text-red-600">{fetching ? '...' : confirmedCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã Bác Bỏ</p>
                <p className="text-2xl font-bold text-green-600">{fetching ? '...' : dismissedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng Vi Phạm</p>
                <p className="text-2xl font-bold">{fetching ? '...' : violations.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Danh sách vi phạm */}
        <Card className="h-[750px] flex flex-col shadow-sm">
          <CardHeader className="pb-3 border-b flex-none">
            <CardTitle className="text-xl">Vi Phạm Ghi Nhận</CardTitle>
            <CardDescription>Danh sách các vi phạm hiệu suất cần xem xét</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedViolation(null); }} className="flex-1 flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-4 flex-none mb-2">
                <TabsTrigger value="open">Chờ ({openCount})</TabsTrigger>
                <TabsTrigger value="confirmed">Xác nhận ({confirmedCount})</TabsTrigger>
                <TabsTrigger value="dismissed">Bác bỏ ({dismissedCount})</TabsTrigger>
                <TabsTrigger value="all">Tất cả ({violations.length})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="flex-1 overflow-y-auto mt-0 -mx-1 px-1 custom-scrollbar">
                <div className="space-y-3 pb-4">
                  {fetching ? (
                    <div className="text-center py-12 text-gray-400">Đang tải dữ liệu...</div>
                  ) : filteredViolations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 flex flex-col items-center justify-center">
                      <AlertTriangle className="h-12 w-12 mb-4 text-slate-300" />
                      <p>Không có dữ liệu vi phạm phù hợp</p>
                    </div>
                  ) : (
                    filteredViolations.map((violation) => {
                      const typeInfo = getViolationTypeInfo(violation.violation_type);
                      const Icon = typeInfo.icon;
                      const isSelected = selectedViolation?._id === violation._id;

                      return (
                        <div
                          key={violation._id}
                          className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                            isSelected 
                            ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20' 
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                          }`}
                          onClick={() => {
                            setSelectedViolation(violation);
                            setReviewData({ manager_notes: '', resolution_required: false });
                          }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-lg shadow-sm w-10 h-10 flex items-center justify-center shrink-0 ${typeInfo.bgColor}`}>
                                <Icon className={`h-5 w-5 ${typeInfo.color}`} />
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-slate-800 leading-none mb-1.5">{typeInfo.label}</p>
                                <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                  <span>{violation.user_id?.full_name || violation.user_id}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                  <span>{violation.user_role}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                              {getSeverityBadge(violation.severity)}
                              {getStatusBadge(violation.status)}
                            </div>
                          </div>

                          <div className="bg-slate-50 rounded-lg p-3 mt-2 border border-slate-100">
                            <p className="text-sm font-medium text-slate-700 mb-1">{violation.title}</p>
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{violation.description}</p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mt-3 uppercase tracking-wider">
                            <Clock className="w-3.5 h-3.5" />
                            Phát hiện: {new Date(violation.detected_at).toLocaleString('vi-VN')}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Chi tiết và đánh giá vi phạm */}
        <Card className="h-[750px] flex flex-col shadow-sm border-slate-200 overflow-hidden">
          <CardHeader className="pb-3 border-b flex-none bg-slate-50/50">
            <CardTitle className="text-xl text-slate-800">Thông Tin Chi Tiết</CardTitle>
            <CardDescription>
              {selectedViolation
                ? `Hồ sơ vi phạm mã: #${selectedViolation._id.split('_').pop()}`
                : 'Vui lòng chọn một vi phạm từ danh sách bên trái'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 flex-1 overflow-y-auto custom-scrollbar">
            {selectedViolation ? (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Lịch sử và thông tin chi tiết */}
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                    <h4 className="font-semibold text-slate-800 text-base">Thông Tin Ngữ Cảnh</h4>
                    {getSeverityBadge(selectedViolation.severity)}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div>
                      <span className="text-slate-500 text-xs block mb-1">Loại sự cố</span>
                      <span className="font-medium text-slate-800">{getViolationTypeInfo(selectedViolation.violation_type).label}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs block mb-1">Nhân sự liên quan</span>
                      <span className="font-medium text-slate-800">{selectedViolation.user_id?.full_name || selectedViolation.user_id} <span className="opacity-70 font-normal">({selectedViolation.user_role})</span></span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 text-xs block mb-1">Mô tả hệ thống ghi nhận</span>
                      <span className="inline-block bg-white border border-slate-200 rounded p-2 text-slate-700 w-full mt-1">
                        {selectedViolation.description}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs block mb-1">Thời điểm hệ thống bắt lỗi</span>
                      <span className="font-medium text-slate-800">{new Date(selectedViolation.detected_at).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>

                  {selectedViolation.violation_data && (
                    <div className="pt-2">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 mt-2">Dữ Liệu Khách Quan</h5>
                      {renderViolationData(selectedViolation.violation_data)}
                    </div>
                  )}
                </div>


                {(selectedViolation.status === 'OPEN' || selectedViolation.status === 'UNDER_REVIEW') && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">
                        Bình luận / Ghi chú của quản lý <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        placeholder="Hãy nhập lý do giải quyết hoặc đánh giá tính hợp lý của sự cố..."
                        value={reviewData.manager_notes}
                        onChange={(e) => setReviewData(prev => ({ ...prev, manager_notes: e.target.value }))}
                        rows={4}
                        className="resize-none focus-visible:ring-blue-500 border-slate-300"
                      />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-orange-50/50 border border-orange-100 rounded-lg">
                      <input
                        type="checkbox"
                        id="resolution_required"
                        checked={reviewData.resolution_required}
                        onChange={(e) => setReviewData(prev => ({ ...prev, resolution_required: e.target.checked }))}
                        className="w-4 h-4 text-orange-600 rounded border-orange-300 focus:ring-orange-500"
                      />
                      <label htmlFor="resolution_required" className="text-sm font-medium text-orange-800 cursor-pointer">
                        Yêu cầu nhân viên thực hiện biên bản giải trình / khắc phục
                      </label>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-100 mt-2">
                      <Button
                        onClick={() => handleReviewViolation(selectedViolation._id, 'CONFIRMED')}
                        disabled={loading}
                        className="flex-1 bg-red-600 hover:bg-red-700 h-11"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Xác Nhận Có Lỗi
                      </Button>
                      <Button
                        onClick={() => handleReviewViolation(selectedViolation._id, 'DISMISSED')}
                        disabled={loading}
                        variant="outline"
                        className="flex-1 h-11 border-slate-300 hover:bg-slate-50"
                      >
                        <XCircle className="h-4 w-4 mr-2 text-slate-500" />
                        Không Ghi Nhận Lỗi
                      </Button>
                    </div>
                  </div>
                )}

                {/* Đã review → hiện kết quả */}
                {selectedViolation.status !== 'OPEN' && selectedViolation.status !== 'UNDER_REVIEW' && (
                  <div className="p-5 border border-slate-200 rounded-xl space-y-4 bg-white shadow-sm mt-4">
                    <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Kết Quả Phê Duyệt</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">
                      <div>
                        <span className="text-slate-500 block mb-1 text-xs">Trạng thái cuối</span>
                        {getStatusBadge(selectedViolation.status)}
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1 text-xs">Phê duyệt bởi</span>
                        <span className="font-medium">{selectedViolation.manager_reviewed_by?.full_name || selectedViolation.manager_reviewed_by || 'Hệ thống'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1 text-xs">Thời điểm phê duyệt</span>
                        <span className="font-medium">
                          {selectedViolation.manager_reviewed_at
                            ? new Date(selectedViolation.manager_reviewed_at).toLocaleString('vi-VN')
                            : 'Không xác định'}
                        </span>
                      </div>
                      <div className="md:col-span-2 mt-2">
                        <span className="text-slate-500 block mb-1 text-xs">Ý kiến ghi nhận</span>
                        <div className="bg-slate-50 px-3 py-2.5 rounded text-sm text-slate-700 font-medium italic border border-slate-100 italic">
                          "{selectedViolation.manager_notes || 'Không có bình luận'}"
                        </div>
                      </div>
                    </div>
                    {selectedViolation.resolution_required && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-md flex items-center gap-2 text-red-800 text-sm font-medium">
                        <AlertTriangle className="h-5 w-5" /> Đã yêu cầu văn bản giải trình từ nhân sự
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400">
                <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mb-6">
                  <TrendingDown className="h-10 w-10 opacity-30" />
                </div>
                <p className="text-lg font-medium text-slate-600">Chưa có vi phạm được chọn</p>
                <p className="text-sm mt-1 max-w-xs text-center">Bấm vào các bản ghi hệ thống báo cáo bên trái để tiến hành kiểm tra chi tiết</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceManagementPage;