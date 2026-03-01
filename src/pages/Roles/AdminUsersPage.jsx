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
import StatusBadge from "../../components/ui/StatusBadges";

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
    color: "bg-destructive/15 text-destructive",
  },
  manager: { label: "Quản lý", color: "bg-primary/15 text-primary" },
  central_kitchen: { label: "NV Bếp TT", color: "bg-accent/15 text-accent" },
  supply_coordinator: {
    label: "Điều phối viên",
    color: "bg-warning/15 text-warning",
  },
  franchise_staff: {
    label: "NV Cửa hàng",
    color: "bg-success/15 text-success",
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Tên</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="input-field mt-1 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="input-field mt-1 w-full"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Điện thoại</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="input-field mt-1 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Vai trò</label>
          <select
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
            className="input-field mt-1 w-full"
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
          <label className="block text-sm font-medium">Cửa hàng</label>
          <input
            type="text"
            value={form.store}
            onChange={(e) => update("store", e.target.value)}
            className="input-field mt-1 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Trạng thái</label>
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
            className="input-field mt-1 w-full"
          >
            <option value="active">Hoạt động</option>
            <option value="inactive">Ngừng HĐ</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">
          Hủy
        </button>
        <button type="submit" className="btn-primary">
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
  const [modalUser, setModalUser] = useState(null); // null means adding

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

  function handleAddUser() {
    // placeholder: mở modal hoặc chuyển trang thêm user
    alert("Chức năng Thêm người dùng sẽ được mở (chưa triển khai).");
  }

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
          <h1 className="text-3xl font-bold">Quản lý Người dùng</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý tài khoản và phân quyền theo vai trò
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openModal()}
            className="btn-secondary flex items-center gap-2 w-fit"
          >
            <Plus className="w-4 h-4" /> Thêm người dùng
          </button>
          <button
            onClick={exportUsersCsv}
            className="btn-outline flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Xuất
          </button>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4">
              {modalUser ? "Chỉnh sửa người dùng" : "Thêm người dùng"}
            </h2>
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
              className={`p-4 rounded-xl border transition-all ${roleFilter === role ? "border-secondary bg-secondary/10" : "border-border bg-card hover:border-secondary/50"}`}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm text-muted-foreground">{config.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-11"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-field min-w-[160px]"
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
            className="input-field min-w-[140px]"
          >
            <option value="all">Tất cả TT</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Ngừng HĐ</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              <th className="px-6 py-4 text-left">Người dùng</th>
              <th className="px-6 py-4 text-left">Liên hệ</th>
              <th className="px-6 py-4 text-left">Vai trò</th>
              <th className="px-6 py-4 text-left">Cửa hàng</th>
              <th className="px-6 py-4 text-center">Trạng thái</th>
              <th className="px-6 py-4 text-left">Đăng nhập cuối</th>
              <th className="px-6 py-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-muted/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {user.name.split(" ").slice(-1)[0].charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm">{user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.phone}</p>
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
                    <span className="inline-flex items-center gap-1 text-success text-sm">
                      <UserCheck className="w-4 h-4" />
                      Hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
                      <UserX className="w-4 h-4" />
                      Ngừng HĐ
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
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
          <div className="py-12 text-center text-muted-foreground">
            Không tìm thấy người dùng phù hợp
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Hiển thị {filteredUsers.length} / {users.length} người dùng
        </p>
      </div>
    </div>
  );
}
