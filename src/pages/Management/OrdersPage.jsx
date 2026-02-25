export default function OrdersPage() {
  return (
    <div className='space-y-4'>
      <h1 className='text-2xl font-bold'>Đơn hàng</h1>
      <p className='text-gray-600'>
        Đây là trang quản lý và theo dõi đơn đặt hàng giữa cửa hàng và bếp trung tâm.
      </p>
      <ul className='list-disc list-inside space-y-1'>
        <li>Franchise Store Staff: tạo đơn đặt hàng, theo dõi trạng thái, xác nhận nhận hàng.</li>
        <li>Central Kitchen Staff: tiếp nhận và xử lý đơn đặt hàng.</li>
        <li>Supply Coordinator: tổng hợp đơn và xử lý các vấn đề phát sinh.</li>
        <li>Manager/Admin: xem tổng quan và báo cáo đơn hàng.</li>
      </ul>
    </div>
  );
}

