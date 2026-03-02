const statusConfig = {
  pending: { label: 'Chờ xử lý', className: 'status-pending' },
  processing: { label: 'Đang xử lý', className: 'status-processing' },
  producing: { label: 'Đang sản xuất', className: 'status-processing' },
  shipping: { label: 'Đang giao', className: 'status-processing' },
  completed: { label: 'Hoàn thành', className: 'status-completed' },
  delivered: { label: 'Đã giao', className: 'status-completed' },
  cancelled: { label: 'Đã hủy', className: 'status-cancelled' },
  low_stock: { label: 'Sắp hết', className: 'status-pending' },
  out_of_stock: { label: 'Hết hàng', className: 'status-cancelled' },
  in_stock: { label: 'Còn hàng', className: 'status-completed' },
  active: { label: 'Hoạt động', className: 'status-completed' },
  inactive: { label: 'Ngừng HĐ', className: 'status-cancelled' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, className: 'status-pending' };
  
  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  );
}
