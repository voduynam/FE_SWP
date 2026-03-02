export default function ManagerDashboard() {
  return (
    <div className='space-y-4 animate-fade-in'>
      <h1 className='text-2xl font-bold mb-4'>Trang quản lý vận hành (Manager)</h1>
      <p className='mb-4'>
        Đây là trang dành cho <strong>Quản lý vận hành</strong>. Tại đây bạn có
        thể theo dõi hiệu suất và tồn kho.
      </p>
      <ul className='list-disc list-inside space-y-1'>
        <li>Quản lý danh mục sản phẩm, công thức và định mức nguyên liệu</li>
        <li>Theo dõi hiệu suất sản xuất, phân phối và bán hàng</li>
        <li>Thống kê, báo cáo chi phí, hao hụt và hiệu quả vận hành</li>
      </ul>
    </div>
  );
}

