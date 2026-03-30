import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  FileImage,
  Truck,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { workflowService } from '../../services/workflowService';

const ManagerCODConfirmationPage = () => {
  const [codPayments, setCodPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [confirmationData, setConfirmationData] = useState({
    action: '',
    manager_notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchCODPayments();
  }, []);

  const fetchCODPayments = async () => {
    try {
      // Get shipments with COD collections that need confirmation
      const response = await workflowService.getShipmentsPaginated({ 
        cod_collected_amount: { $gt: 0 },
        limit: 100 
      });
      if (response.success) {
        const shipments = response.data?.data || response.data || [];
        // Transform shipments to match the expected payment structure
        const codPayments = shipments.map(shipment => ({
          id: shipment._id,
          shipment: shipment,
          internal_order: shipment.order_id,
          amount_collected: shipment.cod_collected_amount,
          amount_expected: shipment.cod_amount,
          collected_at: shipment.cod_collected_at,
          driver: shipment.cod_collected_by,
          collection_notes: shipment.cod_collection_notes,
          evidence_photos: shipment.cod_evidence_photos || [],
          cod_status: shipment.cod_status || (shipment.cod_collected_amount > 0 ? 'COLLECTED' : 'PENDING')
        }));
        setCodPayments(codPayments);
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách COD');
    }
  };

  const handleConfirmCOD = async (action) => {
    if (!selectedPayment || !confirmationData.manager_notes.trim()) {
      toast.error('Vui lòng nhập ghi chú xác nhận');
      return;
    }

    setLoading(true);
    try {
      // Update shipment COD status instead of payment
      const response = await workflowService.updateShipmentCODStatus(selectedPayment.shipment._id, {
        action,
        manager_notes: confirmationData.manager_notes
      });

      if (response.success) {
        toast.success(`COD đã được ${action === 'CONFIRMED' ? 'xác nhận' : 'từ chối'}`);
        setSelectedPayment(null);
        setConfirmationData({ action: '', manager_notes: '' });
        fetchCODPayments();
      } else {
        throw new Error(response.message || 'Lỗi xác nhận COD');
      }
    } catch (error) {
      toast.error('Lỗi khi xác nhận COD');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING': { color: 'bg-yellow-500', text: 'Chờ xác nhận' },
      'COLLECTED': { color: 'bg-blue-500', text: 'Đã thu tiền' },
      'CONFIRMED': { color: 'bg-green-500', text: 'Đã xác nhận' },
      'DISPUTED': { color: 'bg-red-500', text: 'Có tranh chấp' },
      'REJECTED': { color: 'bg-gray-500', text: 'Đã từ chối' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-500', text: status };
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const filteredPayments = codPayments.filter(payment => {
    if (activeTab === 'pending') return payment.cod_status === 'COLLECTED';
    if (activeTab === 'confirmed') return payment.cod_status === 'CONFIRMED';
    if (activeTab === 'disputed') return payment.cod_status === 'DISPUTED';
    return true;
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Xác Nhận Thu Tiền COD</h1>
        <p className="text-gray-600">Xác nhận việc thu tiền mặt từ tài xế giao hàng</p>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chờ Xác Nhận</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {codPayments.filter(p => p.cod_status === 'COLLECTED').length}
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
                <p className="text-2xl font-bold text-green-600">
                  {codPayments.filter(p => p.cod_status === 'CONFIRMED').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Có Tranh Chấp</p>
                <p className="text-2xl font-bold text-red-600">
                  {codPayments.filter(p => p.cod_status === 'DISPUTED').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng Số Tiền</p>
                <p className="text-lg font-bold">
                  {formatCurrency(
                    codPayments
                      .filter(p => p.cod_status === 'CONFIRMED')
                      .reduce((sum, p) => sum + (p.amount_collected || 0), 0)
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Danh sách COD payments */}
        <Card>
          <CardHeader>
            <CardTitle>Danh Sách COD</CardTitle>
            <CardDescription>
              Các khoản thu COD cần xác nhận
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pending">Chờ ({codPayments.filter(p => p.cod_status === 'COLLECTED').length})</TabsTrigger>
                <TabsTrigger value="confirmed">Đã xác nhận</TabsTrigger>
                <TabsTrigger value="disputed">Tranh chấp</TabsTrigger>
                <TabsTrigger value="all">Tất cả</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPayment?.id === payment.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPayment(payment)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">#{payment.shipment?.shipment_number}</p>
                          <p className="text-sm text-gray-600">
                            Đơn hàng: {payment.internal_order?.order_number}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {formatCurrency(payment.amount_collected || 0)}
                          </div>
                          {getStatusBadge(payment.cod_status)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {payment.driver?.full_name || 'Tài xế'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(payment.collected_at).toLocaleString('vi-VN')}
                        </div>
                      </div>

                      {payment.amount_expected && payment.amount_collected !== payment.amount_expected && (
                        <div className="mt-2 p-2 bg-amber-50 rounded text-xs">
                          <AlertTriangle className="inline h-3 w-3 mr-1 text-amber-600" />
                          <span className="text-amber-700">
                            Chênh lệch: {formatCurrency(Math.abs(payment.amount_collected - payment.amount_expected))}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredPayments.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Không có COD nào trong danh mục này</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Chi tiết và xác nhận COD */}
        <Card>
          <CardHeader>
            <CardTitle>Xác Nhận COD</CardTitle>
            <CardDescription>
              {selectedPayment 
                ? `Xác nhận COD cho lô hàng #${selectedPayment.shipment?.shipment_number}`
                : 'Chọn COD để xác nhận'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedPayment ? (
              <div className="space-y-4">
                {/* Thông tin COD */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Chi Tiết COD</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Lô hàng:</strong> {selectedPayment.shipment?.shipment_number}</div>
                    <div><strong>Đơn hàng:</strong> {selectedPayment.internal_order?.order_number}</div>
                    <div><strong>Tài xế:</strong> {selectedPayment.driver?.full_name}</div>
                    <div><strong>Số tiền cần thu:</strong> {formatCurrency(selectedPayment.amount_expected || 0)}</div>
                    <div><strong>Số tiền đã thu:</strong> {formatCurrency(selectedPayment.amount_collected || 0)}</div>
                    <div><strong>Thời gian thu:</strong> {new Date(selectedPayment.collected_at).toLocaleString('vi-VN')}</div>
                    {selectedPayment.collection_notes && (
                      <div><strong>Ghi chú tài xế:</strong> {selectedPayment.collection_notes}</div>
                    )}
                  </div>
                </div>

                {/* Ảnh bằng chứng */}
                {selectedPayment.evidence_photos && selectedPayment.evidence_photos.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      Ảnh Bằng Chứng ({selectedPayment.evidence_photos.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedPayment.evidence_photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={photo.url} 
                            alt={`Evidence ${index + 1}`}
                            className="w-full h-24 object-cover rounded border"
                          />
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kiểm tra chênh lệch */}
                {selectedPayment.amount_expected && selectedPayment.amount_collected !== selectedPayment.amount_expected && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700">
                      <strong>Có chênh lệch số tiền!</strong><br />
                      Cần thu: {formatCurrency(selectedPayment.amount_expected)}<br />
                      Đã thu: {formatCurrency(selectedPayment.amount_collected)}<br />
                      Chênh lệch: {formatCurrency(Math.abs(selectedPayment.amount_collected - selectedPayment.amount_expected))}
                    </AlertDescription>
                  </Alert>
                )}

                {selectedPayment.cod_status === 'COLLECTED' && (
                  <>
                    {/* Ghi chú xác nhận */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Ghi Chú Xác Nhận <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        placeholder="Nhập ghi chú xác nhận của bạn..."
                        value={confirmationData.manager_notes}
                        onChange={(e) => setConfirmationData(prev => ({...prev, manager_notes: e.target.value}))}
                        rows={4}
                      />
                    </div>

                    {/* Nút hành động */}
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleConfirmCOD('CONFIRMED')}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Xác Nhận COD
                      </Button>
                      <Button 
                        onClick={() => handleConfirmCOD('DISPUTED')}
                        disabled={loading}
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Báo Tranh Chấp
                      </Button>
                    </div>
                  </>
                )}

                {selectedPayment.cod_status !== 'COLLECTED' && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Kết Quả Xác Nhận</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Trạng thái:</strong> {getStatusBadge(selectedPayment.cod_status)}</div>
                      {selectedPayment.confirmed_by && (
                        <div><strong>Người xác nhận:</strong> {selectedPayment.confirmed_by.full_name}</div>
                      )}
                      {selectedPayment.confirmed_at && (
                        <div><strong>Thời gian:</strong> {new Date(selectedPayment.confirmed_at).toLocaleString('vi-VN')}</div>
                      )}
                      {selectedPayment.manager_notes && (
                        <div><strong>Ghi chú:</strong> {selectedPayment.manager_notes}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chọn COD từ danh sách để xem chi tiết và xác nhận</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerCODConfirmationPage;