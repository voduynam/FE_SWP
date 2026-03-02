export default function SupplyCoordinatorDashboard() {
  return (
    <div className='space-y-4 animate-fade-in'>
      <h1 className='text-2xl font-bold mb-4'>
        Trang điều phối cung ứng (Supply Coordinator)
      </h1>
      <p className='mb-4'>
        Đây là trang dành cho <strong>Điều phối cung ứng</strong>. Tại đây bạn
        xử lý tổng hợp đơn hàng và điều phối giao nhận.
      </p>
      <ul className='list-disc list-inside space-y-1'>
        <li>Tổng hợp và phân loại đơn đặt hàng từ các cửa hàng</li>
        <li>Điều phối sản xuất và phân phối hàng hóa</li>
        <li>Lập lịch giao hàng và theo dõi tiến độ vận chuyển</li>
        <li>Xử lý các vấn đề phát sinh (thiếu hàng, giao trễ, hủy đơn)</li>
      </ul>
    </div>
  );
}

