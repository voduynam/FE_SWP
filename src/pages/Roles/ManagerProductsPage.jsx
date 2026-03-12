import { useEffect, useMemo, useState } from "react";
import { workflowService } from "../../services/workflowService";

const itemTypeLabel = (type) => {
  if (type === "RAW") return "Nguyên liệu";
  if (type === "FINISHED") return "Thành phẩm";
  return type || "-";
};

export default function ManagerProductsPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [itemTab, setItemTab] = useState("FINISHED"); // FINISHED | RAW | CATEGORIES
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    sku: "",
    item_type: "RAW",
    category_id: "",
    base_uom_id: "",
    tracking_type: "NONE",
    shelf_life_days: "",
    cost_price: "",
    base_sell_price: "",
    status: "ACTIVE",
  });
  const [categoryForm, setCategoryForm] = useState({ name: "", code: "" });

  const loadData = async () => {
    setError("");
    setLoading(true);
    const [itemsRes, categoryRes, uomRes] = await Promise.all([
      workflowService.getItems({ limit: 200 }),
      workflowService.getCategories({}),
      workflowService.getUoms({}),
    ]);

    const itemRows = Array.isArray(itemsRes.data?.data)
      ? itemsRes.data.data
      : Array.isArray(itemsRes.data)
        ? itemsRes.data
        : [];

    const categoryRows = Array.isArray(categoryRes.data?.data)
      ? categoryRes.data.data
      : Array.isArray(categoryRes.data)
        ? categoryRes.data
        : [];
    const uomRows = Array.isArray(uomRes.data?.data)
      ? uomRes.data.data
      : Array.isArray(uomRes.data)
        ? uomRes.data
        : [];

    if (!itemsRes.success || !categoryRes.success || !uomRes.success) {
      setError("Một phần dữ liệu items/categories/uoms chưa tải được.");
    }

    setItems(itemsRes.success ? itemRows : []);
    setCategories(categoryRes.success ? categoryRows : []);
    setUoms(uomRes.success ? uomRows : []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoryNameById = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat._id] = cat.name || cat._id;
      return acc;
    }, {});
  }, [categories]);

  const categoryRows = useMemo(() => {
    return categories.map((cat) => {
      const linkedItems = items.filter((item) => {
        const itemCategoryId =
          typeof item.category_id === "object"
            ? item.category_id?._id
            : item.category_id;
        return itemCategoryId === cat._id;
      });
      return {
        ...cat,
        item_count: linkedItems.length,
        item_names: linkedItems.map((it) => it.name || it.sku || it._id),
      };
    });
  }, [categories, items]);

  const rawItems = useMemo(
    () => items.filter((it) => (it.item_type || "").toUpperCase() === "RAW"),
    [items],
  );

  const finishedItems = useMemo(
    () =>
      items.filter((it) => (it.item_type || "").toUpperCase() === "FINISHED"),
    [items],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sản phẩm</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý danh sách thành phẩm, nguyên liệu và nhóm hàng (categories).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            disabled={loading}
          >
            Làm mới
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setItemForm({
                name: "",
                sku: "",
                item_type: "RAW",
                category_id: "",
                base_uom_id: "",
                status: "ACTIVE",
              });
              setShowItemModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
          >
            Thêm sản phẩm
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Sản phẩm & Categories
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {itemTab === "FINISHED"
                ? "Danh sách các sản phẩm thành phẩm dùng để bán / xuất kho."
                : itemTab === "RAW"
                  ? "Danh sách các nguyên liệu dùng trong sản xuất và chế biến."
                  : "Danh sách nhóm hàng và số item gắn với từng category."}
            </p>
          </div>
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setItemTab("FINISHED")}
              className={`px-3 py-1 rounded-full transition-colors ${
                itemTab === "FINISHED"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Thành phẩm
            </button>
            <button
              type="button"
              onClick={() => setItemTab("RAW")}
              className={`px-3 py-1 rounded-full transition-colors ${
                itemTab === "RAW"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Nguyên liệu
            </button>
            <button
              type="button"
              onClick={() => setItemTab("CATEGORIES")}
              className={`px-3 py-1 rounded-full transition-colors ${
                itemTab === "CATEGORIES"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Categories
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {itemTab === "CATEGORIES" ? (
            <div className="space-y-4 px-4 py-3">
              <form
                className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end bg-slate-50 rounded-xl p-3 border border-slate-200"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError("");
                  setSuccess("");
                  const payload = {
                    name: categoryForm.name.trim(),
                    code: categoryForm.code.trim() || undefined,
                  };
                  if (!payload.name) {
                    setError("Tên category không được để trống.");
                    return;
                  }
                  const res = await workflowService.createCategory(payload);
                  if (!res.success) {
                    setError(res.message || "Không thể tạo category");
                    return;
                  }
                  setCategoryForm({ name: "", code: "" });
                  setSuccess("Tạo category mới thành công.");
                  loadData();
                }}
              >
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Tên category
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Ví dụ: Đồ uống"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Mã (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={categoryForm.code}
                    onChange={(e) =>
                      setCategoryForm((f) => ({ ...f, code: e.target.value }))
                    }
                    placeholder="Ví dụ: BEV"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
                    disabled={loading}
                  >
                    Thêm category
                  </button>
                </div>
              </form>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Số item</th>
                    <th className="px-4 py-3">Danh sách item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  )}
                  {!loading && !categoryRows.length && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-slate-400"
                      >
                        Không có category
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    categoryRows.map((cat) => (
                      <tr key={cat._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {cat.name || cat._id}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{cat._id}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {cat.item_count}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {cat.item_names.length
                            ? cat.item_names.join(", ")
                            : "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tên</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                )}
                {!loading &&
                  (itemTab === "FINISHED" ? finishedItems : rawItems).length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-slate-400"
                      >
                        {itemTab === "FINISHED"
                          ? "Chưa có thành phẩm nào."
                          : "Chưa có nguyên liệu nào."}
                      </td>
                    </tr>
                  )}
                {!loading &&
                  (itemTab === "FINISHED" ? finishedItems : rawItems).map(
                    (item) => {
                      const itemCategoryId =
                        typeof item.category_id === "object"
                          ? item.category_id?._id
                          : item.category_id;
                      const baseUomId =
                        typeof item.base_uom_id === "object"
                          ? item.base_uom_id?._id
                          : item.base_uom_id;
                      return (
                        <tr
                          key={item._id || item.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-slate-900">
                              {item.name || item._id}
                            </div>
                            {/* <div className='text-xs text-slate-400'>{item._id}</div> */}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {item.sku || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {item.category_id?.name ||
                              categoryNameById[itemCategoryId] ||
                              itemCategoryId ||
                              "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                (item.status || "").toUpperCase() === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {item.status || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItem(item);
                                  setItemForm({
                                    name: item.name || "",
                                    sku: item.sku || "",
                                    item_type: item.item_type || itemTab,
                                    category_id: itemCategoryId || "",
                                    base_uom_id: baseUomId || "",
                                    tracking_type: item.tracking_type || "NONE",
                                    shelf_life_days: item.shelf_life_days ?? "",
                                    cost_price: item.cost_price ?? "",
                                    base_sell_price: item.base_sell_price ?? "",
                                    status: item.status || "ACTIVE",
                                  });
                                  setShowItemModal(true);
                                }}
                                className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const label =
                                    itemTab === "FINISHED"
                                      ? "sản phẩm"
                                      : "nguyên liệu";
                                  if (
                                    !window.confirm(
                                      `Xóa ${label} "${item.name || item.sku}"?`,
                                    )
                                  )
                                    return;
                                  const res = await workflowService.deleteItem(
                                    item._id,
                                  );
                                  if (!res.success) {
                                    setError(
                                      res.message || `Không thể xóa ${label}`,
                                    );
                                    return;
                                  }
                                  setSuccess(`Xóa ${label} thành công.`);
                                  loadData();
                                }}
                                className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showItemModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => setShowItemModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingItem ? "Cập nhật sản phẩm" : "Thêm sản phẩm"}
              </h2>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none px-2"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                setSuccess("");
                const shelfLife =
                  itemForm.shelf_life_days === "" ||
                  itemForm.shelf_life_days == null
                    ? undefined
                    : Number(itemForm.shelf_life_days) || 0;
                const costPrice =
                  itemForm.cost_price === "" || itemForm.cost_price == null
                    ? undefined
                    : Number(itemForm.cost_price) || 0;
                const baseSellPrice =
                  itemForm.base_sell_price === "" ||
                  itemForm.base_sell_price == null
                    ? undefined
                    : Number(itemForm.base_sell_price) || 0;
                const payload = {
                  name: itemForm.name.trim(),
                  sku: itemForm.sku.trim(),
                  item_type: itemForm.item_type,
                  status: itemForm.status,
                  category_id: itemForm.category_id || undefined,
                  base_uom_id: itemForm.base_uom_id,
                  tracking_type: itemForm.tracking_type || "NONE",
                  shelf_life_days: shelfLife,
                  cost_price: costPrice,
                  base_sell_price: baseSellPrice,
                };
                let res;
                if (editingItem) {
                  res = await workflowService.updateItem(
                    editingItem._id,
                    payload,
                  );
                } else {
                  res = await workflowService.createItem(payload);
                }
                if (!res.success) {
                  setError(res.message || "Không thể lưu sản phẩm");
                  return;
                }
                setShowItemModal(false);
                setSuccess(
                  editingItem
                    ? "Cập nhật sản phẩm thành công."
                    : "Tạo sản phẩm mới thành công.",
                );
                loadData();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Tên sản phẩm
                  </label>
                  <input
                    type="text"
                    required
                    value={itemForm.name}
                    onChange={(e) =>
                      setItemForm((f) => ({
                        ...f,
                        name: e.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={itemForm.sku}
                    onChange={(e) =>
                      setItemForm((f) => ({
                        ...f,
                        sku: e.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Loại
                  </label>
                  <select
                    value={itemForm.item_type}
                    onChange={(e) =>
                      setItemForm((f) => ({
                        ...f,
                        item_type: e.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  >
                    <option value="RAW">Nguyên liệu</option>
                    <option value="FINISHED">Thành phẩm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Trạng thái
                  </label>
                  <select
                    value={itemForm.status}
                    onChange={(e) =>
                      setItemForm((f) => ({
                        ...f,
                        status: e.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Category
                </label>
                <select
                  value={itemForm.category_id}
                  onChange={(e) =>
                    setItemForm((f) => ({
                      ...f,
                      category_id: e.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                >
                  <option value="">Không chọn</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name || cat._id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Đơn vị tính cơ bản (Base UOM)
                </label>
                <select
                  required
                  value={itemForm.base_uom_id}
                  onChange={(e) =>
                    setItemForm((f) => ({
                      ...f,
                      base_uom_id: e.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                >
                  <option value="">Chọn đơn vị tính</option>
                  {uoms.map((uom) => (
                    <option key={uom._id} value={uom._id}>
                      {uom.code || uom.name || uom._id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Kiểu theo dõi
                  </label>
                  <select
                    value={itemForm.tracking_type}
                    onChange={(e) =>
                      setItemForm((f) => ({
                        ...f,
                        tracking_type: e.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  >
                    <option value="NONE">NONE</option>
                    <option value="LOT">LOT</option>
                    <option value="LOT_EXPIRY">LOT_EXPIRY</option>
                    <option value="SERIAL">SERIAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Hạn sử dụng (ngày)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={itemForm.shelf_life_days}
                    onChange={(e) =>
                      setItemForm((f) => ({
                        ...f,
                        shelf_life_days: e.target.value,
                      }))
                    }
                    placeholder="VD: 365"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Giá vốn
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={itemForm.cost_price}
                    onChange={(e) =>
                      setItemForm((f) => ({
                        ...f,
                        cost_price: e.target.value,
                      }))
                    }
                    placeholder="VD: 50000"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Giá bán cơ bản
                </label>
                <input
                  type="number"
                  min={0}
                  value={itemForm.base_sell_price}
                  onChange={(e) =>
                    setItemForm((f) => ({
                      ...f,
                      base_sell_price: e.target.value,
                    }))
                  }
                  placeholder="VD: 75000"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-600"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
