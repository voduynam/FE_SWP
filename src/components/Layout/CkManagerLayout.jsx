import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../../contexts/AuthContext";

const normalizeRoleCode = (code) => {
  const upper = (code || "").toUpperCase();
  if (upper === "CHEF") return "CENTRAL_KITCHEN_STAFF";
  if (upper === "STORE_STAFF") return "FRANCHISE_STORE_STAFF";
  return upper;
};

const mapRoleCodesToSidebarRole = (roles) => {
  const codes = Array.isArray(roles)
    ? roles.map((r) => normalizeRoleCode(r.code))
    : [];

  if (codes.includes("ADMIN")) return "admin";
  if (codes.includes("MANAGER")) return "manager";
  if (codes.includes("SUPPLY_COORDINATOR")) return "supply_coordinator";
  if (codes.includes("CENTRAL_KITCHEN_STAFF")) return "central_kitchen";
  if (codes.includes("FRANCHISE_STORE_STAFF")) return "franchise_staff";
  if (codes.includes("DRIVER")) return "driver";

  return "franchise_staff";
};

const CkManagerLayout = () => {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarRole = mapRoleCodesToSidebarRole(user?.roles || []);
  const displayName =
    user?.full_name || user?.username || user?.name || "Người dùng";

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar
        userRole={sidebarRole}
        userName={displayName}
        onLogout={logout}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <main className="flex-1 min-h-0 min-w-0 overflow-auto transition-all duration-300">
        <div className="w-full min-h-full p-4 lg:p-6 xl:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default CkManagerLayout;
