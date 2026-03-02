import { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Scale, 
  Bell, 
  Shield, 
  Database,
  Save,
  RefreshCw
} from 'lucide-react';

const settingsTabs = [
  { id: 'general', label: 'Cài đặt chung', icon: SettingsIcon },
  { id: 'units', label: 'Đơn vị tính', icon: Scale },
  { id: 'notifications', label: 'Thông báo', icon: Bell },
  { id: 'security', label: 'Bảo mật', icon: Shield },
  { id: 'backup', label: 'Sao lưu', icon: Database },
];

const units = [
  { id: 1, name: 'Kilogram', symbol: 'kg', type: 'Khối lượng' },
  { id: 2, name: 'Gram', symbol: 'g', type: 'Khối lượng' },
  { id: 3, name: 'Lít', symbol: 'lít', type: 'Thể tích' },
  { id: 4, name: 'Mililit', symbol: 'ml', type: 'Thể tích' },
  { id: 5, name: 'Cái', symbol: 'cái', type: 'Số lượng' },
  { id: 6, name: 'Hộp', symbol: 'hộp', type: 'Đóng gói' },
  { id: 7, name: 'Gói', symbol: 'gói', type: 'Đóng gói' },
  { id: 8, name: 'Chai', symbol: 'chai', type: 'Đóng gói' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [companyName, setCompanyName] = useState('CK Manager');
  const [email, setEmail] = useState('admin@ckmanager.vn');
  const [phone, setPhone] = useState('028 1234 5678');
  const [address, setAddress] = useState('123 Đường ABC, Quận 1, TP.HCM');

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Thông tin doanh nghiệp</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tên công ty</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Số điện thoại</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Địa chỉ</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Tham số vận hành</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Thời gian đặt hàng tối thiểu (giờ)</label>
                  <input
                    type="number"
                    defaultValue={24}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Giá trị đơn hàng tối thiểu</label>
                  <input
                    type="number"
                    defaultValue={500000}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cảnh báo tồn kho thấp (%)</label>
                  <input
                    type="number"
                    defaultValue={20}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cảnh báo hết hạn (ngày)</label>
                  <input
                    type="number"
                    defaultValue={30}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'units':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Danh sách đơn vị tính</h3>
              <button className="btn-secondary text-sm py-2">+ Thêm đơn vị</button>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    <th className="px-6 py-3 text-left">Tên đơn vị</th>
                    <th className="px-6 py-3 text-left">Ký hiệu</th>
                    <th className="px-6 py-3 text-left">Loại</th>
                    <th className="px-6 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {units.map((unit) => (
                    <tr key={unit.id} className="hover:bg-muted/50">
                      <td className="px-6 py-3 font-medium">{unit.name}</td>
                      <td className="px-6 py-3">{unit.symbol}</td>
                      <td className="px-6 py-3 text-muted-foreground">{unit.type}</td>
                      <td className="px-6 py-3 text-center">
                        <button className="text-sm text-secondary hover:underline">Sửa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Cài đặt thông báo</h3>
            <div className="space-y-4">
              {[
                { label: 'Đơn hàng mới', desc: 'Nhận thông báo khi có đơn hàng mới từ cửa hàng' },
                { label: 'Cảnh báo tồn kho', desc: 'Thông báo khi nguyên liệu sắp hết' },
                { label: 'Sắp hết hạn', desc: 'Cảnh báo sản phẩm/nguyên liệu sắp hết hạn' },
                { label: 'Đơn hàng trễ', desc: 'Thông báo khi đơn hàng giao trễ' },
                { label: 'Báo cáo hàng ngày', desc: 'Nhận email tổng kết cuối ngày' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-secondary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-background after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Cài đặt bảo mật</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border">
                <p className="font-medium mb-2">Đổi mật khẩu</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input type="password" placeholder="Mật khẩu hiện tại" className="input-field" />
                  <input type="password" placeholder="Mật khẩu mới" className="input-field" />
                </div>
              </div>
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Xác thực 2 bước</p>
                    <p className="text-sm text-muted-foreground">Bảo vệ tài khoản với xác thực OTP</p>
                  </div>
                  <button className="btn-outline text-sm py-2">Kích hoạt</button>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Phiên đăng nhập</p>
                    <p className="text-sm text-muted-foreground">Quản lý các thiết bị đang đăng nhập</p>
                  </div>
                  <button className="text-sm text-secondary hover:underline">Xem chi tiết</button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'backup':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Sao lưu & Khôi phục</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-xl border border-border text-center">
                <Database className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="font-medium mb-2">Sao lưu dữ liệu</p>
                <p className="text-sm text-muted-foreground mb-4">Tạo bản sao lưu toàn bộ dữ liệu hệ thống</p>
                <button className="btn-primary w-full">Tạo bản sao lưu</button>
              </div>
              <div className="p-6 rounded-xl border border-border text-center">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 text-accent" />
                <p className="font-medium mb-2">Khôi phục dữ liệu</p>
                <p className="text-sm text-muted-foreground mb-4">Khôi phục từ bản sao lưu trước đó</p>
                <button className="btn-outline w-full">Chọn bản sao lưu</button>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <p className="font-medium mb-2">Lịch sử sao lưu</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span>backup_2025-01-19_08-00.sql</span>
                  <span className="text-muted-foreground">45.2 MB</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span>backup_2025-01-18_08-00.sql</span>
                  <span className="text-muted-foreground">44.8 MB</span>
                </div>
                <div className="flex justify-between py-2">
                  <span>backup_2025-01-17_08-00.sql</span>
                  <span className="text-muted-foreground">44.1 MB</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cài đặt hệ thống</h1>
          <p className="text-muted-foreground mt-1">
            Cấu hình hệ thống, đơn vị tính và tham số vận hành
          </p>
        </div>
        <button className="btn-secondary flex items-center gap-2 w-fit">
          <Save className="w-4 h-4" />
          Lưu thay đổi
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-secondary/10 text-secondary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-card rounded-xl border border-border p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
