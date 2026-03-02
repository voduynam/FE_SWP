export default function CentralKitchenDashboard() {
  return (
    <div className='space-y-4 animate-fade-in'>
      <h1 className='text-2xl font-bold mb-4'>
        Trang bếp trung tâm (Central Kitchen Staff)
      </h1>
      <p className='mb-4'>
        Đây là trang dành cho <strong>Nhân viên bếp trung tâm</strong>. Tại đây
        bạn xử lý sản xuất và xuất kho.
      </p>
      <ul className='list-disc list-inside space-y-1'>
        <li>Tiếp nhận và xử lý đơn đặt hàng từ các cửa hàng franchise</li>
        <li>Lập kế hoạch sản xuất theo nhu cầu tổng hợp</li>
        <li>Cập nhật trạng thái sản xuất và xuất kho</li>
        <li>Quản lý nguyên liệu đầu vào, hạn sử dụng và lô sản xuất</li>
      </ul>
    </div>
  );
}

