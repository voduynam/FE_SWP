export default function AdminDashboard() {
  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-2xl font-bold mb-4'>Trang quản trị hệ thống (Admin)</h1>
      <p className='mb-4'>
        Đây là trang dành cho <strong>Quản trị hệ thống</strong>. Từ đây bạn có
        thể quản lý người dùng, phân quyền và cấu hình hệ thống.
      </p>
      <ul className='list-disc list-inside space-y-1'>
        <li>Quản lý người dùng và phân quyền theo vai trò</li>
        <li>Cấu hình hệ thống (đơn vị tính, quy trình, tham số vận hành)</li>
        <li>Quản lý danh mục cửa hàng franchise và bếp trung tâm</li>
        <li>Báo cáo tổng hợp toàn hệ thống</li>
      </ul>
    </div>
  );
}

