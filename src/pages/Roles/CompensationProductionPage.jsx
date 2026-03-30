import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  Package, 
  Clock,
  Play,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { workflowService } from '../../services/workflowService';

const CompensationProductionPage = () => {
  const [compensatingOrders, setCompensatingOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    fetchCompensatingOrders();
  }, []);

  const fetchCompensatingOrders = async () => {
    setLoading(true);
    try {
      // Fetch all production orders and filter for compensating ones
      const res = await workflowService.getProductionOrdersPaginated({ 
        limit: 100 
      });
      
      if (res.success) {
        const payload = res.data || {};
        const allOrders = Array.isArray(payload.data) ? payload.data : [];
        
        // Filter for compensating orders
        const compensating = allOrders.filter(order => order.is_compensating_order);
        setCompensatingOrders(compensating);
      } else {
        toast.error(res.message || 'Lỗi khi tải danh sách đơn bù');
      }
    } catch (error) {
      console.error('Error fetching compensating orders:', error);
      toast.error('Lỗi khi tải danh sách đơn bù');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PLANNED': { color: 'bg-yellow-500', text: 'Kế hoạch' },
      'RELEASED': { color: 'bg-blue-500', text: 'Sẵn sàng' },
      'IN_PROGRESS': { color: 'bg-purple-500', text: 'Đang sản xuất' },
      'DONE': { color: 'bg-green-500', text: 'Hoàn thành' },
      'CANCELLED': { color: 'bg-red-500', text: 'Đã hủy' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-500', text: status };
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  const executeCompensation = async (orderId) => {
    if (!window.confirm('Bạn chắc chắn muốn thực hiện sản xuất bù này?')) {
      return;
    }

    setExecuting(true);
    try {
      const res = await workflowService.executeProductionCompensation(orderId);
      
      if (res.success) {
        toast.success('Đã thực hiện sản xuất bù thành công');
        fetchCompensatingOrders();
        setSelectedOrder(null);
      } else {
        toast.error(res.message || 'Lỗi khi thực hiện sản xuất bù');
      }
    } catch (error) {
      console.error('Error executing compensation:', error);
      toast.error('Lỗi khi thực hiện sản xuất bù');
    } finally {
      setExecuting(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await workflowService.updateProductionOrderStatus(orderId, { status: newStatus });
      
      if (res.success) {
        toast.success(`Cập nhật trạng thái thành công`);
        fetchCompensatingOrders();
      } else {
        toast.error(res.message || 'Lỗi khi cập nhật trạng thái');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  return (
    <div className="min-h-full space-y-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Sản Xuất Bù Thiếu Hụt</h1>
        <p className="text-gray-600">Quản lý và thực hiện sản xuất bù cho các đơn thiếu hụt</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Danh sách đơn bù */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Đơn Sản Xuất Bù
              </CardTitle>
              <CardDescription>
                {compensatingOrders.length} đơn bù
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading && (
                  <div className="text-center py-4 text-gray-500">
                    Đang tải...
                  </div>
                )}
                
                {!loading && compensatingOrders.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    Không có đơn bù nào
                  </div>
                )}

                {!loading && compensatingOrders.map((order) => (
                  <div
                    key={order._id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedOrder?._id === order._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">#{order.prod_order_no}</p>
                        <p className="text-xs text-gray-600">
                          Bù cho: {order.compensating_for_order_id}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    
                    <div className="text-xs text-gray-600">
                      <div>Kế hoạch: {order.planned_qty || 0}</div>
                      <div>Thực tế: {order.actual_qty || 0}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={fetchCompensatingOrders}
                disabled={loading}
                className="w-full mt-4"
                variant="outline"
              >
                Làm mới
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Chi tiết đơn bù */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Chi Tiết Đơn Bù
                </CardTitle>
                <CardDescription>
                  {selectedOrder.prod_order_no}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Thông tin đơn */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3">Thông Tin Đơn Sản Xuất</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Số đơn</p>
                      <p className="font-medium">{selectedOrder.prod_order_no}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Trạng thái</p>
                      <p className="font-medium">{getStatusBadge(selectedOrder.status)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Kế hoạch</p>
                      <p className="font-medium">{selectedOrder.planned_qty || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Thực tế</p>
                      <p className="font-medium">{selectedOrder.actual_qty || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Bù cho đơn</p>
                      <p className="font-medium text-blue-600">{selectedOrder.compensating_for_order_id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Ngày tạo</p>
                      <p className="font-medium">
                        {new Date(selectedOrder.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status workflow */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium mb-3 text-blue-900">Quy Trình Thực Hiện</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${selectedOrder.status === 'PLANNED' || ['RELEASED', 'IN_PROGRESS', 'DONE'].includes(selectedOrder.status) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span>1. Kế hoạch (PLANNED)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${selectedOrder.status === 'RELEASED' || ['IN_PROGRESS', 'DONE'].includes(selectedOrder.status) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span>2. Sẵn sàng (RELEASED) - Manager phê duyệt</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${selectedOrder.status === 'IN_PROGRESS' || selectedOrder.status === 'DONE' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span>3. Đang sản xuất (IN_PROGRESS) - Chef thực hiện</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${selectedOrder.status === 'DONE' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span>4. Hoàn thành (DONE)</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {selectedOrder.status === 'PLANNED' && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-700">
                        Chờ manager phê duyệt. Trạng thái sẽ chuyển sang RELEASED
                      </AlertDescription>
                    </Alert>
                  )}

                  {selectedOrder.status === 'RELEASED' && (
                    <>
                      <Alert className="border-blue-200 bg-blue-50">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-700">
                          Sẵn sàng để thực hiện sản xuất bù
                        </AlertDescription>
                      </Alert>
                      <Button
                        onClick={() => executeCompensation(selectedOrder._id)}
                        disabled={executing}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {executing ? 'Đang thực hiện...' : 'Thực Hiện Sản Xuất Bù'}
                      </Button>
                    </>
                  )}

                  {selectedOrder.status === 'IN_PROGRESS' && (
                    <>
                      <Alert className="border-purple-200 bg-purple-50">
                        <Clock className="h-4 w-4 text-purple-600" />
                        <AlertDescription className="text-purple-700">
                          Đang thực hiện sản xuất bù. Vật liệu đã được trừ từ kho
                        </AlertDescription>
                      </Alert>
                      <Button
                        onClick={() => updateOrderStatus(selectedOrder._id, 'DONE')}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Hoàn Thành Sản Xuất
                      </Button>
                    </>
                  )}

                  {selectedOrder.status === 'DONE' && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700">
                        Sản xuất bù đã hoàn thành. Đơn gốc sẽ được cập nhật
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Cost info */}
                {selectedOrder.actual_material_cost > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-medium text-red-900 mb-2">Chi Phí Sản Xuất Bù</h4>
                    <div className="text-sm text-red-700">
                      <p>Chi phí vật liệu: <span className="font-bold">{selectedOrder.actual_material_cost?.toLocaleString()} VND</span></p>
                      <p className="text-xs mt-1">Công ty hấp thụ chi phí này</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chọn đơn sản xuất bù để xem chi tiết</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompensationProductionPage;