import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  Download,
} from "lucide-react";

const usersData = [
  {
    id: "U001",
    name: "Nguyễn Văn Admin",
    email: "admin@ckmanager.vn",
    phone: "0901234567",
    role: "admin",
    store: "Hệ thống",
    status: "active",
    lastLogin: "2025-01-19 08:30",
  },
  {
    id: "U002",
    name: "Trần Thị Manager",
    email: "manager@ckmanager.vn",
    phone: "0902345678",
    role: "manager",
    store: "Hệ thống",
    status: "active",
    lastLogin: "2025-01-19 07:45",
  },
  {
    id: "U003",
    name: "Lê Văn Kitchen",
    email: "kitchen1@ckmanager.vn",
    phone: "0903456789",
    role: "central_kitchen",
    store: "Bếp trung tâm",
    status: "active",
    lastLogin: "2025-01-19 06:00",
  },
  {
    id: "U004",
    name: "Phạm Thị Coord",
    email: "coord@ckmanager.vn",
    phone: "0904567890",
    role: "supply_coordinator",
    store: "Hệ thống",
    status: "active",
    lastLogin: "2025-01-18 16:30",
  },
  {
    id: "U005",
    name: "Hoàng Văn Staff",
    email: "staff.q1@ckmanager.vn",
    phone: "0905678901",
    role: "franchise_staff",
    store: "CH Quận 1",
    status: "active",
    lastLogin: "2025-01-19 08:00",
  },
  {
    id: "U006",
    name: "Vũ Thị Staff",
    email: "staff.q3@ckmanager.vn",
    phone: "0906789012",
    role: "franchise_staff",
    store: "CH Quận 3",
    status: "inactive",
    lastLogin: "2025-01-10 14:20",
  },
  {
    id: "U007",
    name: "Đặng Văn Staff",
    email: "staff.q7@ckmanager.vn",
    phone: "0907890123",
    role: "franchise_staff",
    store: "CH Quận 7",
    status: "active",
    lastLogin: "2025-01-19 07:15",
  },
];

const roleLabels = {
  admin: {
    label: "Quản trị viên",
    // hồng nhạt + chữ đỏ giống badge trong thiết kế
    color: "bg-rose-50 text-rose-600",
  },
  manager: {
    label: "Quản lý",
    // xanh dương nhạt
    color: "bg-sky-50 text-sky-600",
  },
  central_kitchen: {
    label: "NV Bếp TT",
    // xanh teal nhạt
    color: "bg-teal-50 text-teal-600",
  },
  supply_coordinator: {
    label: "Điều phối viên",
    // vàng nhạt
    color: "bg-amber-50 text-amber-600",
  },
  franchise_staff: {
    label: "NV Cửa hàng",
    // xanh lá nhạt
    color: "bg-emerald-50 text-emerald-600",
  },
};

const roles = [
  "Tất cả",
  "admin",
  "manager",
  "central_kitchen",
  "supply_coordinator",
  "franchise_staff",
];

function UserForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || {
      name: "",
      email: "",
      phone: "",
      role: "franchise_staff",
      store: "",
      status: "active",
    },
  );

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Tên
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Điện thoại
          </label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Vai trò
          </label>
          <select
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          >
            {roles.slice(1).map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]?.label || r}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Cửa hàng
          </label>
          <input
            type="text"
            value={form.store}
            onChange={(e) => update("store", e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Trạng thái
          </label>
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          >
            <option value="active">Hoạt động</option>
            <option value="inactive">Ngừng HĐ</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Hủy
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 shadow-sm transition-colors"
        >
          Lưu
        </button>
      </div>
    </form>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState(usersData);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState(null); // null: thêm mới

  function openModal(user = null) {
    setModalUser(user);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setModalUser(null);
  }

  function saveUser(u) {
    if (u.id) {
      // edit
      setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
    } else {
      const newId = `U${(users.length + 1).toString().padStart(3, "0")}`;
      setUsers((prev) => [...prev, { ...u, id: newId }]);
    }
    closeModal();
  }

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesSearch = searchTerm
          ? user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
          : true;
        const matchesRole = roleFilter === "Tất cả" || user.role === roleFilter;
        const matchesStatus =
          statusFilter === "all" || user.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
      }),
    [users, searchTerm, roleFilter, statusFilter],
  );

  function handleEditUser(user) {
    openModal(user);
  }

  function handleDeleteUser(userId) {
    if (!window.confirm("Bạn có chắc muốn xóa người dùng này?")) return;
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  function exportUsersCsv() {
    if (!users || !users.length) return;
    const rows = filteredUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      store: u.store,
      status: u.status,
    }));
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(",")]
      .concat(
        rows.map((r) =>
          keys
            .map((k) => `"${(r[k] ?? "").toString().replace(/"/g, '""')}"`)
            .join(","),
        ),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "users_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Quản lý Người dùng
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý tài khoản và phân quyền theo vai trò
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm người dùng
          </button>
          <button
            onClick={exportUsersCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Xuất
          </button>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalVisible && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-slate-900">
                {modalUser ? "Chỉnh sửa người dùng" : "Thêm người dùng"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none px-2"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <UserForm
              initial={modalUser}
              onCancel={closeModal}
              onSave={saveUser}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(roleLabels).map(([role, config]) => {
          const count = users.filter((u) => u.role === role).length;
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`p-4 rounded-xl border transition-all text-left ${
                roleFilter === role
                  ? "border-orange-400 bg-orange-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-orange-200"
              }`}
            >
              <p className="text-2xl font-semibold text-slate-900">{count}</p>
              <p className="text-xs mt-1 text-slate-500 uppercase tracking-wide">
                {config.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role === "Tất cả" ? role : roleLabels[role]?.label || role}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          >
            <option value="all">Tất cả TT</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Ngừng HĐ</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">Người dùng</th>
              <th className="px-6 py-3 text-left">Liên hệ</th>
              <th className="px-6 py-3 text-left">Vai trò</th>
              <th className="px-6 py-3 text-left">Cửa hàng</th>
              <th className="px-6 py-3 text-center">Trạng thái</th>
              <th className="px-6 py-3 text-left">Đăng nhập cuối</th>
              <th className="px-6 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-slate-700">
                        {user.name.split(" ").slice(-1)[0].charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-800">{user.email}</p>
                  <p className="text-xs text-slate-400">{user.phone}</p>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleLabels[user.role]?.color}`}
                  >
                    <Shield className="w-3 h-3" />
                    {roleLabels[user.role]?.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{user.store}</td>
                <td className="px-6 py-4 text-center">
                  {user.status === "active" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-sm">
                      <UserCheck className="w-4 h-4" />
                      Hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-400 text-sm">
                      <UserX className="w-4 h-4" />
                      Ngừng HĐ
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {user.lastLogin}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-2 rounded-lg hover:bg-muted"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-sm">
            Không tìm thấy người dùng phù hợp
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <p>
          Hiển thị {filteredUsers.length} / {users.length} người dùng
        </p>
      </div>
    </div>
  );
}
