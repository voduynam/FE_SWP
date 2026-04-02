import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { workflowService } from '../../services/workflowService';

const ORDERS_PATH = '/app/store/orders';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Đợi BE cập nhật COMPLETED (callback/webhook có thể chậm hơn redirect một chút). */
async function waitPaymentCompleted(paymentId, { maxAttempts = 12, intervalMs = 600 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await paymentService.checkPaymentStatus(paymentId);
    const status = res.success && res.data ? res.data.payment_status : null;
    if (status === 'COMPLETED') return true;
    await delay(intervalMs);
  }
  return false;
}

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('paymentId') || searchParams.get('payment_id');

  const [status, setStatus] = useState('loading'); // 'loading' | 'submitting' | 'done' | 'error'
  const [message, setMessage] = useState('Đang xác nhận thanh toán...');

  useEffect(() => {
    if (!paymentId) {
      setMessage('Thiếu thông tin thanh toán. Chuyển về trang đặt hàng.');
      setStatus('done');
      const t = setTimeout(() => navigate(ORDERS_PATH, { replace: true }), 2000);
      return () => clearTimeout(t);
    }

    let cancelled = false;

    const run = async () => {
      try {
        const resPayment = await paymentService.getPaymentById(paymentId);
        if (cancelled) return;
        if (!resPayment.success || !resPayment.data) {
          setMessage(resPayment.message || 'Không tìm thấy giao dịch. Chuyển về trang đặt hàng.');
          setStatus('done');
          setTimeout(() => navigate(ORDERS_PATH, { replace: true }), 2500);
          return;
        }

        const payment = resPayment.data;
        const orderId = payment.order_id;

        setMessage('Đang đồng bộ trạng thái thanh toán với PayOS...');
        const alreadyDone = payment.payment_status === 'COMPLETED';
        const completed = alreadyDone || (await waitPaymentCompleted(paymentId));
        if (cancelled) return;

        if (!completed) {
          setMessage(
            'Thanh toán chưa được xác nhận (COMPLETED). Bạn có thể kiểm tra lại đơn hoặc liên hệ quản trị.'
          );
          setStatus('done');
          setTimeout(() => navigate(ORDERS_PATH, { replace: true }), 3500);
          return;
        }

        setStatus('submitting');
        setMessage('Đang gửi đơn về bếp trung tâm...');
        const resUpdate = await workflowService.updateInternalOrderStatus(orderId, 'SUBMITTED');
        if (cancelled) return;

        if (!resUpdate.success) {
          setMessage(
            (resUpdate.message || 'Gửi đơn thất bại.') +
              ' Thanh toán đã ghi nhận; vui lòng gửi đơn thủ công từ chi tiết đơn.'
          );
          setStatus('done');
          setTimeout(() => navigate(ORDERS_PATH, { replace: true }), 4000);
          return;
        }

        setStatus('done');
        setMessage('Thanh toán thành công. Đơn đã được gửi về bếp trung tâm.');
        setTimeout(() => navigate(ORDERS_PATH, { replace: true }), 2000);
      } catch (err) {
        if (cancelled) return;
        console.error('Payment success page error:', err);
        setMessage('Có lỗi xử lý. Chuyển về trang đặt hàng.');
        setStatus('done');
        setTimeout(() => navigate(ORDERS_PATH, { replace: true }), 2500);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [paymentId, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-14 w-14 animate-spin text-emerald-600" />
            <p className="mt-4 text-slate-700">{message}</p>
          </>
        )}
        {status === 'submitting' && (
          <>
            <Loader2 className="mx-auto h-14 w-14 animate-spin text-orange-500" />
            <p className="mt-4 text-slate-700">{message}</p>
          </>
        )}
        {status === 'done' && (
          <>
            <CheckCircle className="mx-auto h-14 w-14 text-emerald-500" />
            <p className="mt-4 text-slate-700">{message}</p>
            <p className="mt-2 text-sm text-slate-500">Đang chuyển về trang đặt hàng...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-slate-700">{message}</p>
            <button
              type="button"
              onClick={() => navigate(ORDERS_PATH, { replace: true })}
              className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              Về trang đặt hàng
            </button>
          </>
        )}
      </div>
    </div>
  );
}
