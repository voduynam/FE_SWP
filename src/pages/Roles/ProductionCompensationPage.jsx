import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  Package, 
  DollarSign,
  TrendingDown,
  Calculator,
  ShoppingCart,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { workflowService } from '../../services/workflowService';

const ProductionCompensationPage = () => {
  const [productionOrders, setProductionOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [varianceData, setVarianceData] = useState(null);
  const [compensationData, setCompensationData] = useState({
    compensation_quantity: 0,
    notes: '',
    priority: 'MEDIUM'
  });
  const [varianceCosts, setVarianceCosts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProductionOrders();
    fetchVarianceCosts();
  }, []);

  const fetchProductionOrders = async () => {
    try {
      const res = await workflowService.getProductionOrdersPaginated({ 
        status: 'DONE',
        limit: 100 
      });
      if (res.success) {
        // Handle paginated response
        const payload = res.data || {};
        const orders = Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : []);
        setProductionOrders(orders);
      } else {
        toast.error(res.message || 'Lỗi khi tải danh sách đơn sản xuất');
      }
    } catch (error) {
      console.error('Error fetching production orders:', error);
      toast.error('Lỗi khi tải danh sách đơn sản xuất');
    }
  };

  const fetchVarianceCosts = async () => {
    try {
      // Tạm thời comment out vì API này chưa có trong workflowService
      // const res = await workflowService.getVarianceCosts();
      // if (res.success) {
      //   setVarianceCosts(res.data || []);
      // }
      setVarianceCosts([]); // Tạm thời để trống
    } catch (error) {
      console.error('Error fetching variance costs:', error);
      toast.error('Lỗi khi tải chi phí variance');
    }
  };

  const checkVariance = async (orderId) => {
    setLoading(true);
    try {
      const res = await workflowService.checkProductionVariance(orderId);
      if (res.success) {
        setVarianceData(res.data);
        
        if (res.data.summary?.needs_compensation) {
          const shortageItems = res.data.shortage_items || [];
          const totalShortage = shortageItems.reduce((sum, item) => sum + (item.shortage_qty || 0), 0);
          setCompensationData(prev => ({
            ...prev,
            compensation_quantity: totalShortage
          }));
        }
      } else {
        toast.error(res.message || 'Lỗi khi kiểm tra thiếu hụt');
      }
    } catch (error) {
      console.error('Error checking variance:', error);
      toast.error('Lỗi khi kiểm tra thiếu hụt');
    } finally {
      setLoading(false);
    }
  };

  const createCompensation = async () => {
    if (!selectedOrder || !compensationData.compensation_quantity) {
      toast.error('Vui lòng nhập số lượng bù');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        shortage_items: (varianceData?.shortage_items || []).map(item => ({
          item_id: item.item?._id || item.item_id,  // Fix: use item.item._id
          shortage_qty: compensationData.compensation_quantity
        })),
        reason: compensationData.notes,
        priority: compensationData.priority
      };
      
      const res = await workflowService.createProductionCompensation(selectedOrder._id || selectedOrder.id, payload);
      
      if (res.success) {
        toast.success('Đã tạo đơn sản xuất bù thành công');
        setSelectedOrder(null);
        setVarianceData(null);
        setCompensationData({
          compensation_quantity: 0,
          notes: '',
          priority: 'MEDIUM'
        });
        fetchProductionOrders();
      } else {
        toast.error(res.message || 'Lỗi khi tạo đơn bù');
      }
    } catch (error) {
      console.error('Error creating compensation:', error);
      toast.error('Lỗi khi tạo đơn bù');
    } finally {
      setLoading(false);
    }
  };

  const executeCompensation = async (orderId) => {
    setLoading(true);
    try {
      const res = await workflowService.executeProductionCompensation(orderId);
      
      if (res.success) {
        toast.success('Đã thực hiện sản xuất bù thành công');
        fetchProductionOrders();
        fetchVarianceCosts();
      } else {
        toast.error(res.message || 'Lỗi thực hiện sản xuất bù');
      }
    } catch (error) {
      console.error('Error executing compensation:', error);
      toast.error('Lỗi khi thực hiện sản xuất bù');
    } finally {
      setLoading(false);
    }
  };

  const approveVarianceCost = async (costId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/production-variance-costs/${costId}/approve`, {
        method: 'PUT'
      });

      if (response.ok) {
        toast.success('Đã phê duyệt chi phí variance');
        fetchVarianceCosts();
      }
    } catch (error) {
      toast.error('Lỗi khi phê duyệt chi phí');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING': { color: 'bg-yellow-500', text: 'Chờ Thực Hiện' },
      'IN_PROGRESS': { color: 'bg-blue-500', text: 'Đang Thực Hiện' },
      'COMPLETED': { color: 'bg-green-500', text: 'Hoàn Thành' },
      'CANCELLED': { color: 'bg-red-500', text: 'Đã Hủy' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-500', text: status };
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'HIGH': { color: 'bg-red-500', text: 'Cao' },
      'MEDIUM': { color: 'bg-orange-500', text: 'Trung Bình' },
      'LOW': { color: 'bg-green-500', text: 'Thấp' }
    };
    
    const config = priorityConfig[priority] || { color: 'bg-gray-500', text: priority };
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Quản Lý Bù Thiếu Hụt Sản Xuất</h1>
        <p className="text-gray-600">Theo dõi và xử lý các trường hợp thiếu hụt trong sản xuất</p>
      </div>

      <Tabs defaultValue="compensation" className="space-y-6">
        <TabsList>
          <TabsTrigger value="compensation">Bù Thiếu Hụt</TabsTrigger>
          <TabsTrigger value="variance-costs">Chi Phí Variance</TabsTrigger>
        </TabsList>

        <TabsContent value="compensation">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Danh sách đơn sản xuất */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Đơn Sản Xuất Hoàn Thành
                </CardTitle>
                <CardDescription>
                  Chọn đơn sản xuất để kiểm tra thiếu hụt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {productionOrders.map((order) => (
                    <div
                      key={order._id || order.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        (selectedOrder?._id || selectedOrder?.id) === (order._id || order.id)
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedOrder(order);
                        setVarianceData(null);
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">#{order.prod_order_no || order.order_number || order._id}</p>
                          <p className="text-sm text-gray-600">
                            {order.status}
                          </p>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>Kế hoạch: {order.planned_qty || 0}</div>
                        <div>Thực tế: {order.actual_qty || 0}</div>
                        <div>Ngày tạo: {new Date(order.created_at).toLocaleDateString('vi-VN')}</div>
                        <div>
                          {order.is_compensating_order && (
                            <Badge variant="outline" className="text-xs">
                              Đơn Bù
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {productionOrders.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Không có đơn sản xuất nào</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Kiểm tra và tạo đơn bù */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Kiểm Tra Thiếu Hụt
                </CardTitle>
                <CardDescription>
                  {selectedOrder 
                    ? `Kiểm tra thiếu hụt cho đơn #${selectedOrder.prod_order_no || selectedOrder.order_number || selectedOrder._id}`
                    : 'Chọn đơn sản xuất để kiểm tra'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedOrder ? (
                  <div className="space-y-4">
                    {/* Thông tin đơn hàng */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Thông Tin Đơn Sản Xuất</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Số đơn: {selectedOrder.prod_order_no || selectedOrder._id}</div>
                        <div>Trạng thái: {selectedOrder.status}</div>
                        <div>Kế hoạch: {selectedOrder.planned_qty || 0}</div>
                        <div>Thực tế: {selectedOrder.actual_qty || 0}</div>
                      </div>
                    </div>

                    {/* Nút kiểm tra */}
                    <Button 
                      onClick={() => checkVariance(selectedOrder._id || selectedOrder.id)}
                      disabled={loading}
                      className="w-full"
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Kiểm Tra Thiếu Hụt
                    </Button>

                    {/* Kết quả kiểm tra */}
                    {varianceData && (
                      <div className="space-y-4">
                        {varianceData.summary?.needs_compensation ? (
                          <Alert className="border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-700">
                              <strong>Phát hiện thiếu hụt!</strong><br />
                              Thiếu {varianceData.summary?.lines_with_shortage || 0} dòng sản phẩm
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert className="border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-700">
                              Không có thiếu hụt. Sản xuất đạt kế hoạch.
                            </AlertDescription>
                          </Alert>
                        )}

                        {varianceData.summary?.needs_compensation && (
                          <>
                            {/* Form tạo đơn bù */}
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Số Lượng Bù <span className="text-red-500">*</span>
                                </label>
                                <Input
                                  type="number"
                                  value={compensationData.compensation_quantity}
                                  onChange={(e) => setCompensationData(prev => ({
                                    ...prev, 
                                    compensation_quantity: parseInt(e.target.value) || 0
                                  }))}
                                  min="1"
                                  max={varianceData.summary?.total_shortage_value || 10}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">Mức Độ Ưu Tiên</label>
                                <select 
                                  className="w-full p-2 border rounded-md"
                                  value={compensationData.priority}
                                  onChange={(e) => setCompensationData(prev => ({
                                    ...prev, 
                                    priority: e.target.value
                                  }))}
                                >
                                  <option value="NORMAL">Bình Thường</option>
                                  <option value="URGENT">Gấp</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">Ghi Chú</label>
                                <Textarea
                                  placeholder="Ghi chú về việc bù thiếu hụt..."
                                  value={compensationData.notes}
                                  onChange={(e) => setCompensationData(prev => ({
                                    ...prev, 
                                    notes: e.target.value
                                  }))}
                                  rows={3}
                                />
                              </div>

                              <Button 
                                onClick={createCompensation}
                                disabled={loading || !compensationData.compensation_quantity}
                                className="w-full"
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Tạo Đơn Sản Xuất Bù
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Danh sách đơn bù */}
                    {selectedOrder.compensating_orders?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Đơn Sản Xuất Bù</h4>
                        {selectedOrder.compensating_orders.map((compOrder) => (
                          <div key={compOrder.id} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">#{compOrder.order_number}</span>
                              {getStatusBadge(compOrder.status)}
                            </div>
                            <div className="text-sm text-gray-600">
                              <div>Số lượng: {compOrder.planned_quantity}</div>
                              <div>Ưu tiên: {getPriorityBadge(compOrder.priority)}</div>
                            </div>
                            {compOrder.status === 'PENDING' && (
                              <Button
                                size="sm"
                                onClick={() => executeCompensation(compOrder.id)}
                                disabled={loading}
                                className="mt-2"
                              >
                                <Clock className="h-4 w-4 mr-1" />
                                Thực Hiện
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chọn đơn sản xuất từ danh sách để kiểm tra thiếu hụt</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="variance-costs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Chi Phí Variance
              </CardTitle>
              <CardDescription>
                Quản lý chi phí phát sinh từ việc bù thiếu hụt sản xuất
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {varianceCosts.map((cost) => (
                  <div key={cost.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium">
                          Đơn bù #{cost.compensating_order?.order_number}
                        </p>
                        <p className="text-sm text-gray-600">
                          Từ đơn gốc #{cost.original_order?.order_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          {formatCurrency(cost.total_cost)}
                        </p>
                        <Badge className={cost.approved ? 'bg-green-500' : 'bg-yellow-500'}>
                          {cost.approved ? 'Đã Duyệt' : 'Chờ Duyệt'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>Số lượng bù: {cost.compensating_order?.planned_quantity}</div>
                      <div>Chi phí/đơn vị: {formatCurrency(cost.cost_per_unit)}</div>
                      <div>Ngày tạo: {new Date(cost.created_at).toLocaleDateString('vi-VN')}</div>
                      <div>Tác động lợi nhuận: -{formatCurrency(cost.profit_impact)}</div>
                    </div>

                    {cost.notes && (
                      <div className="p-2 bg-gray-50 rounded text-sm">
                        <strong>Ghi chú:</strong> {cost.notes}
                      </div>
                    )}

                    {!cost.approved && (
                      <Button
                        size="sm"
                        onClick={() => approveVarianceCost(cost.id)}
                        disabled={loading}
                        className="mt-3"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Phê Duyệt Chi Phí
                      </Button>
                    )}
                  </div>
                ))}

                {varianceCosts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có chi phí variance nào</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductionCompensationPage;