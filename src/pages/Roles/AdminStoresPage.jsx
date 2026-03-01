import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  Store as StoreIcon,
  Download,
} from "lucide-react";
import StatusBadge from "../../components/ui/StatusBadges";

const storesData = [
  {
    id: "CH001",
    name: "CH Quận 1",
    code: "Q1-001",
    address: "123 Nguyễn Huệ, Q.1",
    phone: "028 1234 5678",
    email: "q1@ckmanager.vn",
    manager: "Nguyễn Văn A",
    status: "active",
    orders: 156,
    revenue: 45600000,
  },
  {
    id: "CH002",
    name: "CH Quận 3",
    code: "Q3-002",
    address: "456 Võ Văn Tần, Q.3",
    phone: "028 2345 6789",
    email: "q3@ckmanager.vn",
    manager: "Trần Thị B",
    status: "active",
    orders: 128,
    revenue: 38200000,
  },
  {
    id: "CH003",
    name: "CH Quận 7",
    code: "Q7-003",
    address: "789 Nguyễn Văn Linh, Q.7",
    phone: "028 3456 7890",
    email: "q7@ckmanager.vn",
    manager: "Lê Văn C",
    status: "active",
    orders: 203,
    revenue: 62500000,
  },
  {
    id: "CH004",
    name: "CH Bình Thạnh",
    code: "BT-004",
    address: "321 Điện Biên Phủ, Bình Thạnh",
    phone: "028 4567 8901",
    email: "bt@ckmanager.vn",
    manager: "Phạm Thị D",
    status: "active",
    orders: 98,
    revenue: 29800000,
  },
  {
    id: "CH005",
    name: "CH Tân Bình",
    code: "TB-005",
    address: "654 Cộng Hòa, Tân Bình",
    phone: "028 5678 9012",
    email: "tb@ckmanager.vn",
    manager: "Hoàng Văn E",
    status: "inactive",
    orders: 45,
    revenue: 12500000,
  },
  {
    id: "CH006",
    name: "CH Phú Nhuận",
    code: "PN-006",
    address: "987 Phan Đình Phùng, Phú Nhuận",
    phone: "028 6789 0123",
    email: "pn@ckmanager.vn",
    manager: "Vũ Thị F",
    status: "active",
    orders: 167,
    revenue: 51200000,
  },
];

function StoreForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || {
      name: "",
      code: "",
      address: "",
      phone: "",
      email: "",
      manager: "",
      status: "active",
      orders: 0,
      revenue: 0,
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
          <label className="block text-sm font-medium">Tên cửa hàng</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="input-field mt-1 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Mã cửa hàng</label>
          <input
            type="text"
            required
            value={form.code}
            onChange={(e) => update("code", e.target.value)}
            className="input-field mt-1 w-full"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium">Địa chỉ</label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          className="input-field mt-1 w-full"
        />
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
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="input-field mt-1 w-full"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Quản lý</label>
          <input
            type="text"
            value={form.manager}
            onChange={(e) => update("manager", e.target.value)}
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

export default function AdminStoresPage() {
  const [stores, setStores] = useState(storesData);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStore, setModalStore] = useState(null);

  function openModal(store = null) {
    setModalStore(store);
    setModalVisible(true);
  }
  function closeModal() {
    setModalVisible(false);
    setModalStore(null);
  }
  function saveStore(s) {
    if (s.id) {
      setStores((prev) => prev.map((x) => (x.id === s.id ? s : x)));
    } else {
      const newId = `CH${(stores.length + 1).toString().padStart(3, "0")}`;
      setStores((prev) => [...prev, { ...s, id: newId }]);
    }
    closeModal();
  }
  function deleteStore(id) {
    if (!window.confirm("Bạn có chắc muốn xóa cửa hàng này?")) return;
    setStores((prev) => prev.filter((s) => s.id !== id));
  }

  function exportCsv() {
    if (!stores || !stores.length) return;
    const rows = filteredStores.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      address: s.address,
      phone: s.phone,
      email: s.email,
      manager: s.manager,
      status: s.status,
      orders: s.orders,
      revenue: s.revenue,
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
    link.setAttribute("download", "stores_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filteredStores = useMemo(
    () =>
      stores.filter((store) => {
        const matchesSearch =
          store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          store.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          store.address.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === "all" || store.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [stores, searchTerm, statusFilter],
  );

  const activeCount = stores.filter((s) => s.status === "active").length;
  const totalRevenue = stores.reduce((sum, s) => sum + s.revenue, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Cửa hàng</h1>
          <p className="text-muted-foreground mt-1">
            Danh mục cửa hàng franchise trong hệ thống
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => openModal()}
            className="btn-secondary flex items-center gap-2 w-fit"
          >
            <Plus className="w-4 h-4" />
            Thêm cửa hàng
          </button>
          <button
            onClick={() => exportCsv()}
            className="btn-outline flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Xuất
          </button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4">
              {modalStore ? "Chỉnh sửa cửa hàng" : "Thêm cửa hàng"}
            </h2>
            <StoreForm
              initial={modalStore}
              onCancel={closeModal}
              onSave={saveStore}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Tổng cửa hàng</p>
          <p className="text-3xl font-bold mt-1">{storesData.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Đang hoạt động</p>
          <p className="text-3xl font-bold mt-1 text-success">{activeCount}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Doanh thu tháng</p>
          <p className="text-3xl font-bold mt-1">
            {(totalRevenue / 1000000).toFixed(1)}M
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm cửa hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-11"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field min-w-[150px]"
        >
          <option value="all">Tất cả</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Ngừng HĐ</option>
        </select>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStores.map((store) => (
          <div
            key={store.id}
            className="bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <StoreIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{store.name}</h3>
                  <p className="text-sm text-muted-foreground">{store.code}</p>
                </div>
              </div>
              <StatusBadge status={store.status} />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{store.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{store.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{store.email}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">
                Quản lý:{" "}
                <span className="text-foreground font-medium">
                  {store.manager}
                </span>
              </p>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">Đơn hàng</p>
                  <p className="font-semibold">{store.orders}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Doanh thu</p>
                  <p className="font-semibold text-success">
                    {(store.revenue / 1000000).toFixed(1)}M
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex gap-2">
              <button
                onClick={() => openModal(store)}
                className="flex-1 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium flex items-center justify-center gap-1"
              >
                <Edit className="w-4 h-4" />
                Chỉnh sửa
              </button>
              <button
                onClick={() => deleteStore(store.id)}
                className="py-2 px-3 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredStores.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Không tìm thấy cửa hàng phù hợp
        </div>
      )}
    </div>
  );
}
