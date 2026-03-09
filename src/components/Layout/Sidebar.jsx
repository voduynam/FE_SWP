import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Warehouse,
  TruckIcon,
  BarChart3,
  Users,
  Settings,
  ChefHat,
  Store,
  LogOut,
  Menu,
  X,
  ChevronDown,
  RotateCcw,
} from "lucide-react";

// Phân quyền menu theo yêu cầu:
// - Franchise Staff: Đặt hàng, theo dõi đơn, xác nhận nhận hàng, xem tồn kho cửa hàng
// - Central Kitchen: Xử lý đơn, cập nhật sản xuất, quản lý nguyên liệu/lô sản xuất
// - Supply Coordinator: Tổng hợp đơn, điều phối giao hàng, xử lý sự cố
// - Manager: Quản lý sản phẩm/công thức, theo dõi hiệu suất, báo cáo
// - Admin: Quản lý user, cấu hình hệ thống, quản lý cửa hàng, báo cáo tổng hợp

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/app/dashboard",
    roles: [
      "admin",
      "manager",
      "central_kitchen",
      "supply_coordinator",
      "franchise_staff",
    ],
  },
  {
    title: "Đơn hàng",
    icon: ClipboardList,
    path: "/app/orders",
    // Tất cả role đều có thể xem đơn hàng (với quyền khác nhau)
    roles: [
      "admin",
      "manager",
      "central_kitchen",
      "supply_coordinator",
      "franchise_staff",
    ],
  },
  {
    title: "Sản phẩm",
    icon: Package,
    path: "/app/products",
    // Chỉ Manager quản lý danh mục sản phẩm, công thức; Admin full quyền
    roles: ["admin", "manager"],
  },
  {
    title: "Kho hàng",
    icon: Warehouse,
    path: "/app/inventory",
    // Central Kitchen: quản lý nguyên liệu, hạn sử dụng, lô sản xuất
    // Manager: quản lý tồn kho (optional)
    // Franchise Staff: xem tồn kho cửa hàng của mình
    roles: ["admin", "manager", "central_kitchen", "franchise_staff"],
  },
  {
    title: "Vận chuyển",
    icon: TruckIcon,
    path: "/app/delivery",
    // Supply Coordinator: lập lịch giao hàng, theo dõi vận chuyển
    // Franchise Staff: theo dõi trạng thái giao hàng
    roles: ["admin", "manager", "supply_coordinator", "franchise_staff"],
  },
  {
    title: "Báo cáo",
    icon: BarChart3,
    path: "/app/reports",
    // Manager: thống kê, báo cáo chi phí, hao hụt, hiệu quả
    // Admin: báo cáo tổng hợp toàn hệ thống
    roles: ["admin", "manager"],
  },
  {
    title: "Cửa hàng",
    icon: Store,
    path: "/app/stores",
    // Admin: quản lý danh mục cửa hàng franchise và bếp trung tâm
    roles: ["admin"],
  },
  {
    title: "Người dùng",
    icon: Users,
    path: "/app/users",
    // Admin: quản lý người dùng và phân quyền
    roles: ["admin"],
  },
  {
    title: "Cài đặt",
    icon: Settings,
    path: "/app/settings",
    // Admin: cấu hình hệ thống (đơn vị tính, quy trình, tham số)
    roles: ["admin"],
  },
];

const menuByRole = {
  // Admin – quản trị hệ thống
  admin: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/app/admin/dashboard",
    },
    {
      title: "Người dùng",
      icon: Users,
      path: "/app/admin/users",
    },
    {
      title: "Cửa hàng & Bếp trung tâm",
      icon: Store,
      path: "/app/admin/stores",
    },
    {
      title: "Công thức sản xuất",
      icon: ChefHat,
      path: "/app/manager/recipes",
    },
    {
      title: "Báo cáo hệ thống",
      icon: BarChart3,
      path: "/app/admin/reports",
    },
    {
      title: "Cài đặt hệ thống",
      icon: Settings,
      path: "/app/admin/settings",
    },
  ],

  // Manager – vận hành & hiệu suất
  manager: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/app/manager/dashboard",
    },
    {
      title: "Đơn hàng nội bộ",
      icon: ClipboardList,
      path: "/app/central/orders",
    },
    {
      title: "Sản phẩm & công thức",
      icon: Package,
      path: "/app/manager/products",
    },
    {
      title: "Công thức sản xuất",
      icon: ChefHat,
      path: "/app/manager/recipes",
    },
    {
      title: "Tồn kho hệ thống",
      icon: Warehouse,
      path: "/app/manager/inventory",
    },
    {
      title: "Yêu cầu trả hàng",
      icon: RotateCcw,
      path: "/app/manager/returns",
    },
    {
      title: "Báo cáo & hiệu suất",
      icon: BarChart3,
      path: "/app/manager/reports",
    },
  ],

  // Central Kitchen Staff – sản xuất & kho bếp trung tâm
  central_kitchen: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/app/central/dashboard",
    },
    {
      title: "Đơn từ cửa hàng",
      icon: ClipboardList,
      path: "/app/central/orders",
    },
    {
      title: "Sản xuất & xuất kho",
      icon: TruckIcon,
      path: "/app/central/production",
    },
    {
      title: "Phiếu giao hàng",
      icon: TruckIcon,
      path: "/app/central/shipments",
    },
    {
      title: "Nguyên liệu & lô sản xuất",
      icon: Warehouse,
      path: "/app/central/materials",
    },
  ],

  // Supply Coordinator – điều phối cung ứng
  supply_coordinator: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/app/supply/dashboard",
    },
    {
      title: "Tổng hợp đơn hàng",
      icon: ClipboardList,
      path: "/app/supply/orders",
    },
    {
      title: "Điều phối & giao hàng",
      icon: TruckIcon,
      path: "/app/supply/delivery",
    },
    {
      title: "Xử lý sự cố",
      icon: Settings,
      path: "/app/supply/issues",
    },
  ],

  // Franchise Store Staff – cửa hàng
  franchise_staff: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/app/store/dashboard",
    },
    {
      title: "Đơn hàng cửa hàng",
      icon: ClipboardList,
      path: "/app/store/orders",
    },
    {
      title: "Nhận hàng",
      icon: Package,
      path: "/app/store/receiving",
    },
    {
      title: "Trả hàng",
      icon: RotateCcw,
      path: "/app/store/returns",
    },
    {
      title: "Tồn kho cửa hàng",
      icon: Warehouse,
      path: "/app/store/inventory",
    },
  ],

  // Driver – tài xế
  driver: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/app/driver/dashboard",
    },
    {
      title: "Lô giao hàng",
      icon: Package,
      path: "/app/driver/shipments",
    },
    {
      title: "Vận chuyển",
      icon: TruckIcon,
      path: "/app/driver/delivery",
    },
  ],
};

const roleLabels = {
  admin: "Quản trị viên",
  manager: "Quản lý",
  central_kitchen: "NV Bếp trung tâm",
  supply_coordinator: "Điều phối viên",
  franchise_staff: "NV Cửa hàng",
  driver: "Tài xế",
};

export default function Sidebar({
  userRole,
  userName,
  onLogout,
  isCollapsed,
  setIsCollapsed,
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  // tránh cảnh báo biến chưa dùng
  void menuItems;

  const roleMenuItems = menuByRole[userRole] || [];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-orange-500 text-white shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/60 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50
          ${isCollapsed ? "w-20" : "w-72"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          bg-slate-900 text-slate-100
          flex flex-col h-screen lg:h-screen
          transition-all duration-300 ease-in-out
          shadow-xl lg:shadow-none
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div
            className={`flex items-center gap-3 ${isCollapsed ? "justify-center w-full" : ""}`}
          >
            <div className="w-10 h-10 rounded-xl gradient-secondary flex items-center justify-center shadow-lg">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in">
                <h1 className="font-bold text-lg">CK Manager</h1>
                <p className="text-xs text-slate-300/80">Hệ thống quản lý</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isCollapsed ? "-rotate-90" : "rotate-90"}`}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {roleMenuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200
                    ${
                      isActive(item.path)
                        ? "bg-slate-800 text-white font-medium border-l-4 border-orange-400"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    }
                    ${isCollapsed ? "justify-center px-2" : ""}
                  `}
                  title={isCollapsed ? item.title : undefined}
                >
                  <item.icon
                    className={`w-5 h-5 flex-shrink-0 ${isActive(item.path) ? "text-orange-400" : "text-slate-300"}`}
                  />
                  {!isCollapsed && (
                    <span className="animate-fade-in">{item.title}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-slate-800">
          <div
            className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-orange-400">
                {userName?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-sm font-medium truncate">
                  {userName || "Người dùng"}
                </p>
                <p className="text-xs text-slate-300/80 truncate">
                  {roleLabels[userRole] || userRole}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={onLogout}
                className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-destructive"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
          {isCollapsed && (
            <button
              onClick={onLogout}
              className="mt-2 w-full p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-destructive flex justify-center"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
