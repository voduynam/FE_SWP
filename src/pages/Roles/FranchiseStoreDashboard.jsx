export default function FranchiseStoreDashboard() {
  return (
    <div className='space-y-4 animate-fade-in'>
      <h1 className='text-2xl font-bold mb-4'>
        Trang cửa hàng franchise (Franchise Store Staff)
      </h1>
      <p className='mb-4'>
        Đây là trang dành cho <strong>Nhân viên cửa hàng</strong>. Tại đây bạn
        có thể tạo và theo dõi đơn đặt hàng.
      </p>
      <ul className='list-disc list-inside space-y-1'>
        <li>Tạo đơn đặt hàng nguyên liệu / bán thành phẩm từ bếp trung tâm</li>
        <li>Theo dõi trạng thái xử lý và giao hàng của đơn đặt</li>
        <li>Xác nhận đã nhận hàng và phản hồi chất lượng</li>
        <li>Xem tồn kho hiện tại tại cửa hàng</li>
      </ul>
    </div>
  );
}

