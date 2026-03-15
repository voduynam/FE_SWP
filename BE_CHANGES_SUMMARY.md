# Tổng hợp thay đổi BE (gửi nhóm BE)

Tài liệu này ghi lại các chỉnh sửa backend đã thực hiện để **gửi ảnh giao hàng lên Cloudinary** và **hiển thị ảnh đúng** trên FE. Áp dụng tùy theo bản BE đang dùng (multer diskStorage + upload trong controller, hoặc multer-storage-cloudinary).

---

## 1. BE dùng **multer-storage-cloudinary** (upload thẳng lên Cloudinary)

**Thư mục:** `SWP391-2/BE/SWP_BE` (hoặc bản BE có dùng `multer-storage-cloudinary`)

### 1.1. `src/middlewares/uploadDeliveryImage.js`

**Vấn đề:** Package cần đối tượng Cloudinary có `.v2`; nếu truyền `cloudinary.v2` thì bên trong package gọi `.v2.uploader` → lỗi. Ngoài ra `public_id` phải lấy từ option **filename** (callback), không phải `params.public_id` (function bị đưa nguyên lên Cloudinary → "is invalid").

**Thay đổi:**

- Dùng **root module** Cloudinary và config trên `.v2`:
  ```js
  const cloudinaryModule = require('cloudinary');
  cloudinaryModule.v2.config({ cloud_name, api_key, api_secret });
  ```
- Truyền `cloudinary: cloudinaryModule` (không truyền `cloudinary.v2`) vào `CloudinaryStorage`.
- **Không** đặt `public_id` trong `params`. Dùng option **filename** với callback đúng chuẩn:
  ```js
  filename: (req, file, cb) => cb(undefined, 'delivery_' + String(Date.now()))
  ```
- Có thể đặt `folder`, `allowedFormats` ở top-level; `params` chỉ giữ `resource_type: 'auto'` nếu cần.

### 1.2. `src/controllers/shipment.controller.js` (updateShipmentStatus)

**Vấn đề:** Khi dùng multer-storage-cloudinary, ảnh không lưu local nên `req.file.path` không phải URL ảnh. Package trả URL qua `req.file.secure_url` / `req.file.url`.

**Thay đổi:** Khi `status === 'DELIVERED'` và có `req.file`:

- Trước: `shipment.delivery_photo_url = req.file.path;`
- Sau: `shipment.delivery_photo_url = req.file.secure_url || req.file.url || req.file.path;`

### 1.3. `src/controllers/deliveryRoute.controller.js` (updateStopStatus)

**Vấn đề:** Giống shipment, điểm dừng cũng lưu ảnh từ multer-storage-cloudinary nhưng đang gán `req.file.path`.

**Thay đổi:** Khi `status === 'COMPLETED'` và có `req.file`:

- Trước: `stop.delivery_photo_url = req.file.path;`
- Sau: `stop.delivery_photo_url = req.file.secure_url || req.file.url || req.file.path;`

---

## 2. BE dùng **multer diskStorage** + upload Cloudinary trong controller

**Thư mục:** `New folder/SWP_BE` (hoặc bản BE lưu file local rồi `cloudinary.uploader.upload(absolutePath, ...)` trong controller)

### 2.1. `src/middlewares/uploadDeliveryImage.js`

**Vấn đề:** Tên file lưu local quá dài (full `req.params.id`) có thể khiến Cloudinary hoặc bước xử lý sau báo "too long" nếu dùng filename làm public_id hoặc tương tự.

**Thay đổi:** Rút gọn phần id trong tên file:

- Trước: `safeId = (req.params.id || 'upload').replace(...); cb(null, 'Shipment_${safeId}_${Date.now()}${ext}');`
- Sau: `raw = (req.params.id || 'upload').replace(/[^a-zA-Z0-9_-]/g, '_'); safeId = raw.slice(-12); cb(null, 'S_${safeId}_${Date.now()}${ext}');`

Controller vẫn dùng `result.secure_url` từ `cloudinary.uploader.upload` → không cần sửa controller.

---

## 3. Phân quyền GET /api/master-data/locations — dropdown "Kho nhận" đầy đủ

**File:** `src/controllers/masterData.controller.js` — hàm `getLocations`.

**Mục tiêu:** Ở **tạo phiếu giao hàng** và **tạo tuyến giao hàng**, dropdown "Kho nhận" phải hiển thị đủ **kho bếp + kho cửa hàng** cho Chef, Supply Coordinator, Manager, Admin.

**Thay đổi (đã áp dụng):**

- Chuẩn hóa `req.user.roles` thành mảng chuỗi (hỗ trợ cả role là object có `.code`).
- Nếu user có một trong các role **ADMIN, MANAGER, CHEF, SUPPLY_COORDINATOR** → coi là `canSeeAllLocations`:
  - **Bản BE (New folder):** Không set `filter.org_unit_id` theo query/user → luôn trả **tất cả** kho (bếp + cửa hàng).
  - **Bản BE (SWP391-2):** Nếu có `org_unit_id` trong query thì vẫn filter theo đó; không có thì không ép `req.user.org_unit_id` → khi FE gọi không truyền `org_unit_id` sẽ nhận đủ tất cả kho.
- User không thuộc nhóm trên (vd. DRIVER) → vẫn filter theo `org_unit_id` (query hoặc `req.user.org_unit_id`).

**Kết quả:** Chef và Supply (và Manager, Admin) thấy đầy đủ kho trong dropdown "Kho nhận" khi tạo phiếu giao và tạo tuyến giao hàng.

---

## 4. Tóm tắt theo file (BE dùng multer-storage-cloudinary)

| File | Thay đổi |
|------|----------|
| `middlewares/uploadDeliveryImage.js` | Dùng `require('cloudinary')` (root), truyền vào storage; dùng option `filename: (req, file, cb) => cb(undefined, 'delivery_' + String(Date.now()))`, không dùng `params.public_id` function. |
| `controllers/shipment.controller.js` | `delivery_photo_url = req.file.secure_url \|\| req.file.url \|\| req.file.path` khi DELIVERED. |
| `controllers/deliveryRoute.controller.js` | `stop.delivery_photo_url = req.file.secure_url \|\| req.file.url \|\| req.file.path` khi stop COMPLETED. |

---

## 5. Tóm tắt theo file (BE dùng diskStorage + upload trong controller)

| File | Thay đổi |
|------|----------|
| `middlewares/uploadDeliveryImage.js` | Tên file: chỉ lấy tối đa 12 ký tự cuối của `id`, format `S_${safeId}_${Date.now()}${ext}`. |

---

## 6. Phân quyền locations (áp dụng cho mọi bản BE)

| File | Thay đổi |
|------|----------|
| `controllers/masterData.controller.js` (getLocations) | Chuẩn hóa `req.user.roles`; nếu user có role ADMIN / MANAGER / CHEF / SUPPLY_COORDINATOR thì trả **tất cả kho** (không filter theo org) để dropdown "Kho nhận" ở tạo phiếu giao hàng và tạo tuyến giao hàng hiển thị đủ kho bếp + kho cửa hàng. |

---

**Ghi chú:** Các bản ghi shipment/stop **đã lưu** `delivery_photo_url` dạng path local (vd: `uploads/delivery-proof/...`) sẽ vẫn 404 vì ảnh không còn ở local hoặc đã chuyển lên Cloudinary. Ảnh mới upload sau khi áp dụng các thay đổi trên sẽ lưu URL Cloudinary và hiển thị đúng.
