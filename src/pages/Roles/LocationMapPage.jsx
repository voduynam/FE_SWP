import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  MapPin, 
  Navigation, 
  Edit, 
  Save, 
  X, 
  ExternalLink,
  RefreshCw,
  Search,
  Store,
  ChefHat,
  AlertTriangle,
  CheckCircle,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { workflowService } from '../../services/workflowService';

const LocationMapPage = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [editCoordinates, setEditCoordinates] = useState({ latitude: '', longitude: '' });
  const [searchAddress, setSearchAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocation, setNewLocation] = useState({
    type: 'STORE',
    code: '',
    name: '',
    address: '',
    district: '',
    city: '',
    coordinates: { latitude: '', longitude: '' }
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const response = await workflowService.getOrgUnitsForMap();
      if (response.success) {
        setLocations(response.data?.locations || []);
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách địa điểm');
    } finally {
      setLoading(false);
    }
  };

  const handleEditLocation = (location) => {
    setEditingLocation(location._id);
    setEditCoordinates({
      latitude: location.coordinates?.latitude || '',
      longitude: location.coordinates?.longitude || ''
    });
  };

  const handleSaveCoordinates = async (locationId) => {
    if (!editCoordinates.latitude || !editCoordinates.longitude) {
      toast.error('Vui lòng nhập đầy đủ tọa độ');
      return;
    }

    const lat = parseFloat(editCoordinates.latitude);
    const lng = parseFloat(editCoordinates.longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Tọa độ không hợp lệ');
      return;
    }

    try {
      const response = await workflowService.updateOrgUnitCoordinates(locationId, {
        latitude: lat,
        longitude: lng
      });

      if (response.success) {
        toast.success('Đã cập nhật tọa độ thành công');
        setEditingLocation(null);
        loadLocations();
      } else {
        throw new Error(response.message || 'Cập nhật thất bại');
      }
    } catch (error) {
      toast.error('Lỗi khi cập nhật tọa độ');
    }
  };

  const handleCancelEdit = () => {
    setEditingLocation(null);
    setEditCoordinates({ latitude: '', longitude: '' });
  };

  const handleAddLocation = () => {
    setShowAddForm(true);
    setNewLocation({
      type: 'STORE',
      code: '',
      name: '',
      address: '',
      district: '',
      city: '',
      coordinates: { latitude: '', longitude: '' }
    });
  };

  const handleSaveNewLocation = async () => {
    // Validate required fields
    if (!newLocation.code || !newLocation.name || !newLocation.address) {
      toast.error('Vui lòng nhập đầy đủ mã, tên và địa chỉ');
      return;
    }

    if (!newLocation.coordinates.latitude || !newLocation.coordinates.longitude) {
      toast.error('Vui lòng nhập tọa độ hoặc tìm từ địa chỉ');
      return;
    }

    const lat = parseFloat(newLocation.coordinates.latitude);
    const lng = parseFloat(newLocation.coordinates.longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Tọa độ không hợp lệ');
      return;
    }

    try {
      const response = await workflowService.createOrgUnit({
        type: newLocation.type,
        code: newLocation.code,
        name: newLocation.name,
        address: newLocation.address,
        district: newLocation.district,
        city: newLocation.city,
        coordinates: {
          latitude: lat,
          longitude: lng
        }
      });

      if (response.success) {
        toast.success('Đã tạo địa điểm mới thành công');
        setShowAddForm(false);
        loadLocations();
      } else {
        throw new Error(response.message || 'Tạo địa điểm thất bại');
      }
    } catch (error) {
      toast.error('Lỗi khi tạo địa điểm mới');
    }
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setNewLocation({
      type: 'STORE',
      code: '',
      name: '',
      address: '',
      district: '',
      city: '',
      coordinates: { latitude: '', longitude: '' }
    });
  };

  const handleGeocodeForNew = async () => {
    if (!newLocation.address.trim()) {
      toast.error('Vui lòng nhập địa chỉ cần tìm');
      return;
    }

    setGeocoding(true);
    try {
      const response = await workflowService.geocodeAddress(newLocation.address);
      if (response.success) {
        const coords = response.data.coordinates;
        setNewLocation(prev => ({
          ...prev,
          coordinates: {
            latitude: coords.latitude.toString(),
            longitude: coords.longitude.toString()
          }
        }));
        toast.success(`Đã tìm thấy tọa độ: ${coords.latitude}, ${coords.longitude}`);
        if (response.data.note) {
          toast.info(response.data.note);
        }
      } else {
        throw new Error(response.message || 'Không tìm thấy tọa độ');
      }
    } catch (error) {
      toast.error('Lỗi khi tìm kiếm địa chỉ');
    } finally {
      setGeocoding(false);
    }
  };

  const setCurrentLocationForNew = () => {
    if (currentLocation) {
      setNewLocation(prev => ({
        ...prev,
        coordinates: {
          latitude: currentLocation.latitude.toString(),
          longitude: currentLocation.longitude.toString()
        }
      }));
      toast.success('Đã sử dụng vị trí hiện tại');
    } else {
      toast.error('Vui lòng lấy vị trí hiện tại trước');
    }
  };

  const handleGeocodeAddress = async () => {
    if (!searchAddress.trim()) {
      toast.error('Vui lòng nhập địa chỉ cần tìm');
      return;
    }

    setGeocoding(true);
    try {
      const response = await workflowService.geocodeAddress(searchAddress);
      if (response.success) {
        const coords = response.data.coordinates;
        setEditCoordinates({
          latitude: coords.latitude.toString(),
          longitude: coords.longitude.toString()
        });
        toast.success(`Đã tìm thấy tọa độ: ${coords.latitude}, ${coords.longitude}`);
        if (response.data.note) {
          toast.info(response.data.note);
        }
      } else {
        throw new Error(response.message || 'Không tìm thấy tọa độ');
      }
    } catch (error) {
      toast.error('Lỗi khi tìm kiếm địa chỉ');
    } finally {
      setGeocoding(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ định vị');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        setEditCoordinates({
          latitude: latitude.toString(),
          longitude: longitude.toString()
        });
        toast.success('Đã lấy vị trí hiện tại');
        setGettingLocation(false);
      },
      () => {
        toast.error('Không thể lấy vị trí hiện tại');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openInGoogleMaps = (location) => {
    if (!location.coordinates) {
      toast.error('Địa điểm chưa có tọa độ');
      return;
    }
    const { latitude, longitude } = location.coordinates;
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const getDirections = (location) => {
    if (!location.coordinates) {
      toast.error('Địa điểm chưa có tọa độ');
      return;
    }
    const { latitude, longitude } = location.coordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const getLocationTypeIcon = (type) => {
    switch (type) {
      case 'STORE':
        return <Store className="h-4 w-4" />;
      case 'KITCHEN':
        return <ChefHat className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getLocationTypeBadge = (type) => {
    const config = {
      'STORE': { color: 'bg-blue-500', text: 'Cửa hàng' },
      'KITCHEN': { color: 'bg-orange-500', text: 'Bếp' }
    };
    const { color, text } = config[type] || { color: 'bg-gray-500', text: type };
    return <Badge className={`${color} text-white`}>{text}</Badge>;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Quản Lý Bản Đồ</h1>
        <p className="text-gray-600">Xem và chỉnh sửa tọa độ các địa điểm</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng địa điểm</p>
                <p className="text-2xl font-bold">{locations.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Có tọa độ</p>
                <p className="text-2xl font-bold text-green-600">
                  {locations.filter(l => l.coordinates).length}
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
                <p className="text-sm text-gray-600">Chưa có tọa độ</p>
                <p className="text-2xl font-bold text-red-600">
                  {locations.filter(l => !l.coordinates).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Location Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Thêm Địa Điểm Mới</CardTitle>
            <CardDescription>
              Tạo địa điểm mới với thông tin và tọa độ GPS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Location Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại địa điểm <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newLocation.type}
                    onChange={(e) => setNewLocation(prev => ({...prev, type: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="STORE">Cửa hàng</option>
                    <option value="KITCHEN">Bếp trung tâm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã địa điểm <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="VD: STORE_001"
                    value={newLocation.code}
                    onChange={(e) => setNewLocation(prev => ({...prev, code: e.target.value}))}
                  />
                </div>
              </div>

              {/* Name and Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên địa điểm <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="VD: Cửa hàng Quận 1"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation(prev => ({...prev, name: e.target.value}))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="VD: 123 Nguyễn Huệ, Phường Bến Nghé"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation(prev => ({...prev, address: e.target.value}))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quận/Huyện
                  </label>
                  <Input
                    placeholder="VD: Quận 1"
                    value={newLocation.district}
                    onChange={(e) => setNewLocation(prev => ({...prev, district: e.target.value}))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thành phố
                  </label>
                  <Input
                    placeholder="VD: TP. Hồ Chí Minh"
                    value={newLocation.city}
                    onChange={(e) => setNewLocation(prev => ({...prev, city: e.target.value}))}
                  />
                </div>
              </div>

              {/* Coordinates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tọa độ GPS <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Vĩ độ (Latitude)"
                      value={newLocation.coordinates.latitude}
                      onChange={(e) => setNewLocation(prev => ({
                        ...prev,
                        coordinates: { ...prev.coordinates, latitude: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Kinh độ (Longitude)"
                      value={newLocation.coordinates.longitude}
                      onChange={(e) => setNewLocation(prev => ({
                        ...prev,
                        coordinates: { ...prev.coordinates, longitude: e.target.value }
                      }))}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleGeocodeForNew}
                    disabled={geocoding}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {geocoding ? 'Đang tìm...' : 'Tìm từ địa chỉ'}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={setCurrentLocationForNew}
                    disabled={!currentLocation}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Dùng vị trí hiện tại
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveNewLocation} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Lưu địa điểm
                </Button>
                <Button variant="outline" onClick={handleCancelAdd} className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Hủy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Address Search */}
      {editingLocation && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tìm Tọa Độ Từ Địa Chỉ</CardTitle>
            <CardDescription>
              Nhập địa chỉ để tự động tìm tọa độ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Nhập địa chỉ (VD: Quận 1, TP.HCM)"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleGeocodeAddress()}
              />
              <Button 
                onClick={handleGeocodeAddress}
                disabled={geocoding}
              >
                <Search className="h-4 w-4 mr-2" />
                {geocoding ? 'Đang tìm...' : 'Tìm'}
              </Button>
              <Button 
                variant="outline"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
              >
                <Navigation className="h-4 w-4 mr-2" />
                {gettingLocation ? 'Đang lấy...' : 'Vị trí hiện tại'}
              </Button>
            </div>

            {currentLocation && (
              <Alert>
                <Navigation className="h-4 w-4" />
                <AlertDescription>
                  Vị trí hiện tại: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Locations List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh Sách Địa Điểm</CardTitle>
              <CardDescription>
                Quản lý tọa độ các cửa hàng và bếp
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleAddLocation}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Thêm địa điểm
              </Button>
              <Button onClick={loadLocations} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Làm mới
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Đang tải...</p>
            </div>
          )}

          {!loading && locations.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Không có địa điểm nào</p>
            </div>
          )}

          {!loading && locations.length > 0 && (
            <div className="space-y-4">
              {locations.map((location) => (
                <div
                  key={location._id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getLocationTypeIcon(location.type)}
                      <div>
                        <h3 className="font-medium">{location.name}</h3>
                        <p className="text-sm text-gray-600">{location.code}</p>
                      </div>
                      {getLocationTypeBadge(location.type)}
                    </div>
                    
                    <div className="flex gap-2">
                      {location.coordinates && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openInGoogleMaps(location)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Xem
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => getDirections(location)}
                          >
                            <Navigation className="h-4 w-4 mr-1" />
                            Chỉ đường
                          </Button>
                        </>
                      )}
                      
                      {editingLocation === location._id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSaveCoordinates(location._id)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditLocation(location)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Sửa
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    <p>{location.address}</p>
                    <p>{location.district}, {location.city}</p>
                  </div>

                  {editingLocation === location._id ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Vĩ độ (Latitude)
                        </label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="10.7769"
                          value={editCoordinates.latitude}
                          onChange={(e) => setEditCoordinates(prev => ({
                            ...prev,
                            latitude: e.target.value
                          }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Kinh độ (Longitude)
                        </label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="106.7009"
                          value={editCoordinates.longitude}
                          onChange={(e) => setEditCoordinates(prev => ({
                            ...prev,
                            longitude: e.target.value
                          }))}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-sm">
                      {location.coordinates ? (
                        <>
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Có tọa độ</span>
                          </div>
                          <span className="text-gray-500">
                            {location.coordinates.latitude.toFixed(6)}, {location.coordinates.longitude.toFixed(6)}
                          </span>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Chưa có tọa độ</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationMapPage;