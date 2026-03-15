# Yêu cầu BE: GET /api/master-data/locations trả đủ kho cho Chef & Supply

## Hiện tượng
- Role **Chef** và **Supply Coordinator** gọi `GET /api/master-data/locations` (không truyền `org_unit_id`, có thể có `status=ACTIVE`) nhưng chỉ nhận được **kho bếp**, không thấy **kho cửa hàng**.
- Dropdown "Kho nhận" ở phiếu giao (chef) và tuyến giao hàng (supply) cần hiển thị **tất cả kho** (bếp + cửa hàng).

## FE đã làm
- Gọi `getLocations({ status: 'ACTIVE', limit: 1000 })` **không** gửi `org_unit_id` khi load dropdown "Kho nhận" (CentralShipmentFormsPage, CentralShipmentsPage, SupplyDeliveryPage).

## Yêu cầu chỉnh BE (ai có quyền sửa BE)

**File:** `src/controllers/masterData.controller.js` — hàm `getLocations`.

Đảm bảo khi user có role **CHEF** hoặc **SUPPLY_COORDINATOR** thì API trả về **tất cả location** (không filter theo `org_unit_id`) khi dùng cho dropdown "Kho nhận". Có thể làm một trong hai cách:

1. **Cách 1:** Trước khi `Location.find(filter)`, nếu user có role CHEF hoặc SUPPLY_COORDINATOR thì **xóa** `filter.org_unit_id` (nếu có), để luôn trả tất cả kho.
2. **Cách 2:** Sửa/chuẩn hóa cách kiểm tra `canAccessAnyOrg`: đảm bảo `req.user.roles` là mảng chuỗi (role code) và `req.user.roles.includes('CHEF')` / `includes('SUPPLY_COORDINATOR')` trả đúng. Khi không gửi `org_unit_id` thì không set filter theo org; khi có gửi `org_unit_id` thì với CHEF/SUPPLY không ghi đè thành `req.user.org_unit_id`.

Sau khi BE sửa, Chef và Supply sẽ thấy đủ kho bếp + kho cửa hàng trong dropdown "Kho nhận".
