import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const ORDERS_PATH = '/app/store/orders';

export default function PaymentFailedPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reason = searchParams.get('reason') || '';

  const reasonText =
    reason === 'cancelled'
      ? 'Bạn đã hủy thanh toán.'
      : reason === 'not_found'
        ? 'Không tìm thấy giao dịch.'
        : 'Thanh toán không thành công.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg text-center">
        <XCircle className="mx-auto h-14 w-14 text-amber-500" />
        <h1 className="mt-4 text-lg font-semibold text-slate-800">Thanh toán chưa hoàn tất</h1>
        <p className="mt-2 text-slate-600">{reasonText}</p>
        <p className="mt-1 text-sm text-slate-500">Đơn hàng vẫn ở trạng thái nháp, bạn có thể thanh toán lại từ trang đặt hàng.</p>
        <button
          type="button"
          onClick={() => navigate(ORDERS_PATH, { replace: true })}
          className="mt-6 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          Về trang đặt hàng
        </button>
      </div>
    </div>
  );
}
