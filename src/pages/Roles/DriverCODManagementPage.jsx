import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  Package, 
  CheckCircle, 
  Clock, 
  Camera,
  AlertTriangle,
  Truck,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { workflowService } from '../../services/workflowService';

const DriverCODManagementPage = () => {
  const [codShipments, setCodShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [collectionData, setCollectionData] = useState({
    amount_collected: 0,
    collection_notes: '',
    evidence_photos: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCODShipments();
  }, []);

  const fetchCODShipments = async () => {
    try {
      const response = await workflowService.getShipments({ 
        payment_type: 'COD',
        status: 'DELIVERED',
        cod_status: 'PENDING'
      });
      if (response.success) {
        setCodShipments(response.data || []);
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách COD');
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length + collectionData.evidence_photos.length > 3) {
      toast.error('Chỉ được upload tối đa 3 ảnh');
      return;
    }
    
    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast.error('Chỉ được upload file ảnh (JPEG, PNG, WEBP)');
      return;
    }

    // Validate file sizes (5MB each)
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Mỗi file ảnh phải nhỏ hơn 5MB');
      return;
    }
    
    setCollectionData(prev => ({
      ...prev,
      evidence_photos: [...prev.evidence_photos, ...files]
    }));
  };

  const removeFile = (index) => {
    setCollectionData(prev => ({
      ...prev,
      evidence_photos: prev.evidence_photos.filter((_, i) => i !== index)
    }));
  };

  const handleCollectCOD = async () => {
    if (!selectedShipment || !collectionData.amount_collected) {
      toast.error('Vui lòng nhập số tiền thu được');
      return;
    }

    if (collectionData.evidence_photos.length === 0) {
      toast.error('Vui lòng upload ít nhất 1 ảnh bằng chứng');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('amount_collected', collectionData.amount_collected);
      formData.append('collection_notes', collectionData.collection_notes);
      
      collectionData.evidence_photos.forEach((file, index) => {
        formData.append('evidence_photos', file);
      });

      const response = await workflowService.collectCOD(selectedShipment.id, formData);

      if (response.success) {
        toast.success('Đã xác nhận thu tiền COD thành công');
        setSelectedShipment(null);
        setCollectionData({
          amount_collected: 0,
          collection_notes: '',
          evidence_photos: []
        });
        fetchCODShipments();
      } else {
        throw new Error(response.message || 'Lỗi thu tiền COD');
      }
    } catch (error) {
      toast.error('Lỗi khi xác nhận thu tiền COD');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING': { color: 'bg-yellow-500', text: 'Chờ thu tiền' },
      'COLLECTED': { color: 'bg-blue-500', text: 'Đã thu tiền' },
      'CONFIRMED': { color: 'bg-green-500', text: 'Đã xác nhận' },
      'DISPUTED': { color: 'bg-red-500', text: 'Có tranh chấp' }
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Quản Lý Thu Tiền COD</h1>
        <p className="text-gray-600">Thu tiền mặt khi giao hàng và xác nhận với hệ thống</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Danh sách lô hàng COD */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Lô Hàng COD Cần Thu Tiền
            </CardTitle>
            <CardDescription>
              {codShipments.length} lô hàng cần thu tiền mặt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {codShipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedShipment?.id === shipment.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedShipment(shipment)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">#{shipment.shipment_number}</p>
                      <p className="text-sm text-gray-600">
                        Đơn hàng: {shipment.internal_order?.order_number}
                      </p>
                    </div>
                    {getStatusBadge(shipment.cod_status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>Số tiền: {formatCurrency(shipment.internal_order?.total_amount || 0)}</div>
                    <div>Giao lúc: {new Date(shipment.delivered_at).toLocaleString('vi-VN')}</div>
                  </div>

                  <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{shipment.delivery_address || 'Địa chỉ giao hàng'}</span>
                  </div>

                  {shipment.cod_amount_expected && (
                    <div className="mt-2 p-2 bg-amber-50 rounded text-sm">
                      <strong>Cần thu: {formatCurrency(shipment.cod_amount_expected)}</strong>
                    </div>
                  )}
                </div>
              ))}

              {codShipments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Không có lô hàng COD nào cần thu tiền</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form xác nhận thu tiền */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Xác Nhận Thu Tiền
            </CardTitle>
            <CardDescription>
              {selectedShipment 
                ? `Thu tiền cho lô hàng #${selectedShipment.shipment_number}`
                : 'Chọn lô hàng để xác nhận thu tiền'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedShipment ? (
              <div className="space-y-4">
                {/* Thông tin lô hàng */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Thông Tin Lô Hàng</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Số lô: {selectedShipment.shipment_number}</div>
                    <div>Đơn hàng: {selectedShipment.internal_order?.order_number}</div>
                    <div>Cần thu: {formatCurrency(selectedShipment.internal_order?.total_amount || 0)}</div>
                    <div>Giao lúc: {new Date(selectedShipment.delivered_at).toLocaleString('vi-VN')}</div>
                  </div>
                </div>

                {/* Số tiền thu được */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Số Tiền Thu Được <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={collectionData.amount_collected}
                    onChange={(e) => setCollectionData(prev => ({
                      ...prev, 
                      amount_collected: parseInt(e.target.value) || 0
                    }))}
                    placeholder="Nhập số tiền đã thu (VND)"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Số tiền thực tế thu được từ khách hàng
                  </p>
                </div>

                {/* Ghi chú */}
                <div>
                  <label className="block text-sm font-medium mb-2">Ghi Chú Thu Tiền</label>
                  <Textarea
                    placeholder="Ghi chú về việc thu tiền (nếu có)..."
                    value={collectionData.collection_notes}
                    onChange={(e) => setCollectionData(prev => ({...prev, collection_notes: e.target.value}))}
                    rows={3}
                  />
                </div>

                {/* Upload ảnh bằng chứng */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ảnh Bằng Chứng Thu Tiền <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="evidence-upload"
                    />
                    <label htmlFor="evidence-upload" className="cursor-pointer">
                      <div className="text-center">
                        <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          Click để upload ảnh bằng chứng thu tiền
                        </p>
                        <p className="text-xs text-gray-500">
                          Tối đa 3 ảnh, mỗi ảnh &lt; 5MB
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Danh sách ảnh đã upload */}
                  {collectionData.evidence_photos.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {collectionData.evidence_photos.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4 text-blue-600" />
                            <span className="text-sm truncate">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(file.size / 1024 / 1024).toFixed(1)}MB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Kiểm tra số tiền */}
                {collectionData.amount_collected > 0 && selectedShipment.internal_order?.total_amount && (
                  <div className="p-3 rounded-lg bg-blue-50">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-700">
                        {collectionData.amount_collected === selectedShipment.internal_order.total_amount 
                          ? 'Số tiền thu đúng với đơn hàng' 
                          : `Chênh lệch: ${formatCurrency(Math.abs(collectionData.amount_collected - selectedShipment.internal_order.total_amount))}`
                        }
                      </span>
                    </div>
                  </div>
                )}

                {/* Nút xác nhận */}
                <Button 
                  onClick={handleCollectCOD}
                  disabled={loading || !collectionData.amount_collected || collectionData.evidence_photos.length === 0}
                  className="w-full"
                >
                  {loading ? 'Đang xử lý...' : 'Xác Nhận Thu Tiền COD'}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chọn lô hàng từ danh sách để xác nhận thu tiền</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lịch sử thu tiền COD */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Lịch Sử Thu Tiền COD
          </CardTitle>
          <CardDescription>
            Các lần thu tiền COD đã thực hiện
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Chức năng lịch sử sẽ được bổ sung sau</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverCODManagementPage;