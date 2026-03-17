import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, RefreshCcw, Search } from 'lucide-react';
import { workflowService } from '../../services/workflowService';
import { paymentService } from '../../services/paymentService';
import { useAuth } from '../../contexts/AuthContext';

const ORDER_STATUS = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã gửi',
  APPROVED: 'Đã phê duyệt',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đã giao',
  RECEIVED: 'Đã nhận',
  CANCELLED: 'Đã hủy',
};

const getStatusClasses = status => {
  switch (status) {
    case 'DRAFT':
      return 'bg-amber-100 text-amber-700';
    case 'SUBMITTED':
      return 'bg-sky-100 text-sky-700';
    case 'APPROVED':
      return 'bg-indigo-100 text-indigo-700';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-700';
    case 'SHIPPED':
      return 'bg-violet-100 text-violet-700';
    case 'RECEIVED':
      return 'bg-emerald-100 text-emerald-700';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const PAGE_SIZE = 10;

/** Trả về ngày giờ hiện tại (local) dạng yyyy-MM-ddThh:mm cho input datetime-local */
function getLocalDateTimeString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

export default function FranchiseOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [success, setSuccess] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingOrderBody, setPendingOrderBody] = useState(null);
  const [pendingOrderTotal, setPendingOrderTotal] = useState(0);
  const [existingOrderForPayment, setExistingOrderForPayment] = useState(null);
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false);
  const [pendingPaymentInfo, setPendingPaymentInfo] = useState(null);
  const [redirectingToPayOS, setRedirectingToPayOS] = useState(false);

  // Nhận hàng từ đơn đã giao (tạo + confirm Goods Receipt ngay tại màn hình này)
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveOrder, setReceiveOrder] = useState(null);
  const [receiveShipment, setReceiveShipment] = useState(null);
  const [receiveLines, setReceiveLines] = useState([]);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveError, setReceiveError] = useState('');

  const [newOrder, setNewOrder] = useState({
    order_date: getLocalDateTimeString(),
    is_urgent: false,
    payment_type: 'BANK_TRANSFER',
    lines: [{ item_id: '', qty_ordered: '', uom_id: '', unit_price: 0 }],
  });

  const loadOrders = async (page = 1) => {
    setLoading(true);
    setSuccess('');
    try {
      // BE tự filter theo req.user.org_unit_id cho Store Staff, không cần gửi store_org_unit_id (tránh 400)
      const res = await workflowService.getInternalOrdersPaginated({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setOrders(list);
        setPagination({
          page: res.data.pagination?.page ?? page,
          limit: res.data.pagination?.limit ?? PAGE_SIZE,
          total: res.data.pagination?.total ?? 0,
          pages: res.data.pagination?.pages ?? 1,
        });
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    const result = await workflowService.getItems({ status: 'ACTIVE', limit: 100 });
    if (result.success) {
      const rows = Array.isArray(result.data) ? result.data : (result.data?.data ?? result.data);
      setItems(Array.isArray(rows) ? rows : []);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    loadOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Mỗi lần mở modal tạo đơn, đặt lại ngày giờ = hiện tại (local)
  useEffect(() => {
    if (createOpen) {
      setNewOrder(prev => ({
        ...prev,
        order_date: getLocalDateTimeString(),
        payment_type: 'BANK_TRANSFER',
      }));
    }
  }, [createOpen]);

  const loadDetail = async id => {
    setDetailId(id);
    setDetailOrder(null);
    setDetailError(null);
    if (!id) return;
    const res = await workflowService.getInternalOrder(id);
    if (res.success && res.data) {
      setDetailOrder(res.data);
    } else {
      setDetailError(res.message || 'Không tìm thấy đơn hàng');
    }
  };

  const filteredOrders = useMemo(() => {
    const s = (search || '').toLowerCase();
    return orders.filter(o => {
      const no = o.order_no || o._id || '';
      const unitName = o.store_org_unit_id?.name || '';
      return !s || no.toLowerCase().includes(s) || (unitName && unitName.toLowerCase().includes(s));
    });
  }, [orders, search]);

  const DISCRETE_UOMS = ['PACK', 'CARTON', 'UNIT'];
  const isDiscreteUom = (itemId) => {
    const it = items.find(i => i._id === itemId);
    const code = (it?.base_uom_id?.code || '').toUpperCase();
    return DISCRETE_UOMS.includes(code);
  };

  const handleLineChange = (idx, field, value) => {
    setNewOrder(prev => {
      const lines = [...prev.lines];
      let v = value;
      if (field === 'qty_ordered') {
        v = value === '' ? '' : (Number(value) || 0);
      } else if (field === 'unit_price') {
        v = Number(value) || 0;
      }
      lines[idx] = { ...lines[idx], [field]: v };
      if (field === 'item_id') {
        const it = items.find(i => i._id === value);
        if (it) {
          lines[idx].uom_id = it.base_uom_id?._id || '';
          lines[idx].unit_price = it.base_sell_price ?? it.cost_price ?? 0;
          if (DISCRETE_UOMS.includes((it.base_uom_id?.code || '').toUpperCase())) {
            const curQty = lines[idx].qty_ordered;
            lines[idx].qty_ordered = curQty === '' ? 1 : Math.max(1, Math.round(Number(curQty) || 0));
          }
        }
      }
      if (field === 'qty_ordered' && isDiscreteUom(lines[idx].item_id) && v !== '') {
        lines[idx].qty_ordered = Math.max(1, Math.round(Number(v) || 0));
      }
      return { ...prev, lines };
    });
  };

  const addLine = () => {
    setNewOrder(prev => ({
      ...prev,
      lines: [...prev.lines, { item_id: '', qty_ordered: '', uom_id: '', unit_price: 0 }],
    }));
  };

  const removeLine = idx => {
    setNewOrder(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx),
    }));
  };

  const validateAndBuildBody = () => {
    const lines = newOrder.lines
      .filter(l => l.item_id && (l.qty_ordered || 0) > 0)
      .map(l => ({
        item_id: l.item_id,
        qty_ordered: isDiscreteUom(l.item_id) ? Math.round(Number(l.qty_ordered) || 0) : Number(l.qty_ordered) || 0,
        uom_id: l.uom_id,
        unit_price: Math.max(0, Number(l.unit_price) || 0),
      }));
    if (lines.length === 0) return { error: 'Vui lòng chọn ít nhất 1 sản phẩm với số lượng > 0.', body: null };
    if (lines.some(l => l.qty_ordered <= 0)) return { error: 'Số lượng đặt hàng phải lớn hơn 0.', body: null };
    const badDiscrete = newOrder.lines.find(l => l.item_id && isDiscreteUom(l.item_id) && !Number.isInteger(Number(l.qty_ordered)));
    if (badDiscrete) {
      const it = items.find(i => i._id === badDiscrete.item_id);
      return { error: `"${it?.name || badDiscrete.item_id}" đơn vị ${it?.base_uom_id?.code || ''} phải là số nguyên.`, body: null };
    }
    // order_date từ datetime-local dạng "yyyy-MM-ddThh:mm" (giờ local) → parse local rồi gửi ISO
    const orderDateISO = newOrder.order_date
      ? new Date(newOrder.order_date).toISOString()
      : new Date().toISOString();
    const body = {
      store_org_unit_id: user?.org_unit_id || undefined,
      order_date: orderDateISO,
      is_urgent: Boolean(newOrder.is_urgent),
      lines,
    };
    return { error: null, body };
  };

  const openConfirmModal = e => {
    e.preventDefault();
    const { error, body } = validateAndBuildBody();
    if (error) {
      setCreateError(error);
      return;
    }

    const estimatedTotal = newOrder.lines
      .filter(l => l.item_id && (l.qty_ordered || 0) > 0)
      .reduce(
        (sum, l) =>
          sum +
          (Number(l.qty_ordered || 0) *
            Math.max(0, Number(l.unit_price || 0))),
        0
      );

    setExistingOrderForPayment(null);
    setPendingOrderBody(body);
    setPendingOrderTotal(estimatedTotal);
    setNewOrder(prev => ({ ...prev, payment_type: 'BANK_TRANSFER' }));
    setCreateOpen(false);
    setConfirmOpen(true);
  };

  const createPaymentForOrder = async (orderId, orderNo, paymentType, orderAmount) => {
    if (!paymentType) return;
    try {
      const res = await paymentService.createPayment({
        order_id: orderId,
        payment_type: paymentType,
      });

      if (!res.success) {
        setSuccess('');
        alert(res.message || 'Tạo thanh toán thất bại. Đơn đã được gửi nhưng chưa ghi nhận thanh toán.');
        return;
      }

      const paymentData = res.data || {};

      if (paymentType === 'BANK_TRANSFER') {
        const payment = paymentData.payment || {};
        const checkoutUrl =
          paymentData.checkout_url ||
          paymentData.payos_link ||
          paymentData.payment_link ||
          '';
        const amount = orderAmount ?? payment.amount ?? 0;

        setPendingPaymentInfo({
          orderId,
          orderNo,
          amount,
          checkoutUrl,
        });
        // Đóng popup xác nhận đơn, mở alert xác nhận thanh toán
        setConfirmOpen(false);
        setPaymentConfirmOpen(true);
      } else {
        // CASH: đóng flow và reset form
        setSuccess(`Đã đặt hàng và thanh toán tiền mặt cho đơn ${orderNo}.`);
        setConfirmOpen(false);
        setCreateOpen(false);
        setExistingOrderForPayment(null);
        setNewOrder({
          order_date: getLocalDateTimeString(),
          is_urgent: false,
          payment_type: 'CASH',
          lines: [{ item_id: '', qty_ordered: '', uom_id: '', unit_price: 0 }],
        });
        setPendingOrderBody(null);
        setPendingOrderTotal(0);
      }
    } catch (error) {
      console.error('Create payment error:', error);
      alert(
        error?.response?.data?.message ||
          'Có lỗi khi tạo thanh toán. Đơn đã được gửi nhưng chưa ghi nhận thanh toán.'
      );
    }
  };

  /** Gửi đơn đến bếp trung tâm: tạo đơn (DRAFT) rồi gửi ngay (SUBMITTED) – đúng luồng đặt hàng */
  const submitCreateAndSend = async () => {
    if (!pendingOrderBody) return;
    setCreating(true);
    setCreateError('');
    try {
      const createRes = await workflowService.createInternalOrder(pendingOrderBody);
      if (!createRes.success) {
        setCreateError(createRes.message || 'Tạo đơn thất bại');
        setCreating(false);
        return;
      }
      const createdOrder = createRes.data?.data ?? createRes.data;
      const orderId = createdOrder?._id;
      if (!orderId) {
        setCreateError('Không nhận được mã đơn từ server.');
        setCreating(false);
        return;
      }
      const orderNo = createdOrder?.order_no || orderId;
      const orderAmount = createdOrder?.total_amount;

      const paymentType = newOrder.payment_type || 'BANK_TRANSFER';

      await createPaymentForOrder(orderId, orderNo, paymentType, orderAmount);
      setCreateError('');
      loadOrders(1).catch(() => { /* danh sách sẽ cập nhật khi user tự refresh */ });
    } catch (err) {
      console.error(err);
      setCreateError(err?.response?.data?.message || 'Có lỗi khi đặt hàng');
    } finally {
      setCreating(false);
    }
  };

  /** Chỉ lưu nháp (DRAFT), không gửi – dùng khi muốn soạn sau rồi gửi */
  const submitCreateDraftOnly = async e => {
    e.preventDefault();
    const { error, body } = validateAndBuildBody();
    if (error) {
      setCreateError(error);
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const res = await workflowService.createInternalOrder(body);
      if (!res.success) {
        setCreateError(res.message || 'Lưu nháp thất bại');
        setCreating(false);
        return;
      }
      setCreateOpen(false);
      setNewOrder({
        order_date: getLocalDateTimeString(),
        is_urgent: false,
        lines: [{ item_id: '', qty_ordered: '', uom_id: '', unit_price: 0 }],
      });
      setSuccess('Đã lưu nháp. Vào Chi tiết đơn và bấm "Gửi đơn" khi sẵn sàng gửi lên bếp trung tâm.');
      setCreateError('');
      loadOrders(1).catch(() => {});
    } catch (err) {
      console.error(err);
      setCreateError(err?.response?.data?.message || 'Có lỗi khi lưu nháp');
    } finally {
      setCreating(false);
    }
  };

  const submitOrder = async order => {
    if (order.status !== 'DRAFT') return;
    setActionLoadingId(order._id);
    setSuccess('');
    try {
      // Lấy đầy đủ thông tin đơn + lines để hiển thị ở popup xác nhận
      const res = await workflowService.getInternalOrder(order._id);
      if (!res.success || !res.data) {
        alert(res.message || 'Không lấy được thông tin đơn hàng');
        return;
      }

      const fullOrder = res.data;
      setExistingOrderForPayment(fullOrder);

      // Map dữ liệu BE -> newOrder để tái sử dụng UI xác nhận
      const mappedLines = (fullOrder.lines || []).map(line => ({
        item_id: typeof line.item_id === 'object' ? line.item_id._id : line.item_id,
        qty_ordered: line.qty_ordered ?? 0,
        uom_id: typeof line.uom_id === 'object' ? line.uom_id._id : line.uom_id,
        unit_price: line.unit_price ?? 0,
        line_total: line.line_total ?? (line.qty_ordered || 0) * (line.unit_price || 0),
      }));

      setNewOrder(prev => ({
        ...prev,
        order_date: fullOrder.order_date
          ? new Date(fullOrder.order_date).toISOString().slice(0, 16)
          : getLocalDateTimeString(),
        is_urgent: !!fullOrder.is_urgent,
        // Staff luôn sử dụng thanh toán chuyển khoản
        payment_type: 'BANK_TRANSFER',
        lines: mappedLines.length
          ? mappedLines
          : prev.lines,
      }));

      setPendingOrderBody({ existingOrderId: fullOrder._id });
      setPendingOrderTotal(fullOrder.total_amount || mappedLines.reduce((sum, l) => sum + (l.line_total || 0), 0));

      setConfirmOpen(true);
      setDetailId(null);
      setDetailOrder(null);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Gửi đơn thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const cancelOrder = async order => {
    if (order.status !== 'DRAFT') return;
    if (!window.confirm(`Hủy đơn ${order.order_no || order._id}?`)) return;
    setActionLoadingId(order._id);
    setSuccess('');
    try {
      const res = await workflowService.updateInternalOrderStatus(order._id, 'CANCELLED');
      if (res.success) {
        setSuccess(`Đơn ${order.order_no || order._id} đã hủy.`);
        setDetailId(null);
        setDetailOrder(null);
        await loadOrders(pagination.page);
      } else {
        alert(res.message || 'Hủy đơn thất bại');
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Hủy đơn thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getItemName = line => {
    const item = line.item_id;
    if (!item) return '-';
    if (typeof item === 'object') return item.name || item.sku || item._id;
    return line.item_id;
  };

  const handleReceiveLineChange = (idx, field, value) => {
    const num = field === 'qty_received' || field === 'qty_rejected' ? Number(value) || 0 : value;
    setReceiveLines(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: num };
      return next;
    });
  };

  const openReceiveModal = async order => {
    setReceiveError('');
    setReceiveOrder(order);
    setReceiveShipment(null);
    setReceiveLines([]);
    setReceiveOpen(true);
    setReceiveLoading(true);
    try {
      // Tìm shipment đã giao cho đơn này
      const shipRes = await workflowService.getShipments({
        order_id: order._id,
        status: 'SHIPPED',
        limit: 1,
      });
      const raw = shipRes.data;
      const rows = Array.isArray(raw) ? raw : (raw?.data ?? raw);
      const list = Array.isArray(rows) ? rows : [];
      const shipment = list[0];
      if (!shipRes.success || !shipment) {
        setReceiveError('Không tìm thấy chuyến giao cho đơn này (trạng thái SHIPPED).');
        setReceiveLoading(false);
        return;
      }

      // Lấy chi tiết shipment + lines để biết số lượng giao theo từng sản phẩm
      const detailRes = await workflowService.getShipment(shipment._id);
      if (!detailRes.success || !detailRes.data) {
        setReceiveError(detailRes.message || 'Không lấy được chi tiết chuyến giao.');
        setReceiveLoading(false);
        return;
      }

      const ship = detailRes.data;
      const lines = (ship.lines || []).map(l => {
        const qtyShip = typeof l.qty === 'number' ? l.qty : Number(l.qty) || 0;
        return {
          shipment_line_id: l._id,
          item_id: l.item_id?._id || l.item_id,
          name: l.item_id?.name || l.item_id?.sku || l.item_id || '',
          sku: l.item_id?.sku,
          qty_ship: qtyShip,
          qty_received: qtyShip,
          qty_rejected: 0,
        };
      });

      setReceiveShipment(ship);
      setReceiveLines(lines);
    } catch (err) {
      console.error(err);
      setReceiveError(err?.response?.data?.message || 'Có lỗi khi tải dữ liệu nhận hàng.');
    } finally {
      setReceiveLoading(false);
    }
  };

  const submitReceive = async e => {
    e.preventDefault();
    if (!receiveShipment || !receiveOrder) return;
    setReceiveLoading(true);
    setReceiveError('');
    try {
      if (!receiveLines.length) {
        setReceiveError('Không có dòng hàng để nhận.');
        setReceiveLoading(false);
        return;
      }

      const payload = {
        shipment_id: receiveShipment._id,
        received_date: new Date().toISOString(),
        lines: receiveLines
          .filter(l => l.shipment_line_id && l.item_id)
          .map(l => ({
            shipment_line_id: l.shipment_line_id,
            item_id: l.item_id,
            qty_received: Math.max(0, Number(l.qty_received) || 0),
            qty_rejected: Math.max(0, Number(l.qty_rejected) || 0),
          })),
      };

      if (!payload.lines.length) {
        setReceiveError('Mỗi dòng phải có ít nhất số lượng nhận hoặc từ chối > 0.');
        setReceiveLoading(false);
        return;
      }

      const invalidLine = payload.lines.find(l => l.qty_received + l.qty_rejected <= 0);
      if (invalidLine) {
        setReceiveError('Mỗi dòng phải có ít nhất số lượng nhận hoặc từ chối > 0.');
        setReceiveLoading(false);
        return;
      }

      const sumMismatch = payload.lines.some((l, idx) => {
        const qtyShip = receiveLines[idx]?.qty_ship ?? 0;
        return l.qty_received + l.qty_rejected !== qtyShip;
      });
      if (sumMismatch) {
        setReceiveError('Tổng SL nhận + từ chối phải đúng bằng SL giao cho từng dòng.');
        setReceiveLoading(false);
        return;
      }

      const createRes = await workflowService.createGoodsReceipt(payload);
      if (!createRes.success || !createRes.data) {
        setReceiveError(createRes.message || 'Tạo phiếu nhận hàng thất bại.');
        setReceiveLoading(false);
        return;
      }

      const receipt = createRes.data;
      const receiptId = receipt._id;
      if (!receiptId) {
        setReceiveError('Không nhận được mã phiếu nhận hàng từ server.');
        setReceiveLoading(false);
        return;
      }

      const confirmRes = await workflowService.confirmGoodsReceipt(receiptId, {
        status: 'RECEIVED',
      });
      if (!confirmRes.success) {
        setReceiveError(confirmRes.message || 'Xác nhận nhận hàng thất bại.');
        setReceiveLoading(false);
        return;
      }

      setSuccess(`Đã nhận hàng cho đơn ${receiveOrder.order_no || receiveOrder._id}.`);
      setReceiveOpen(false);
      setReceiveOrder(null);
      setReceiveShipment(null);
      setReceiveLines([]);
      await loadOrders(pagination.page);
    } catch (err) {
      console.error(err);
      setReceiveError(err?.response?.data?.message || 'Có lỗi khi nhận hàng.');
    } finally {
      setReceiveLoading(false);
    }
  };

  return (
    <div className='min-h-full space-y-6 animate-fade-in'>
      {success && (
        <div className='flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className='text-xs text-emerald-700/70 hover:text-emerald-900'>
            Đóng
          </button>
        </div>
      )}

      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Đơn hàng nội bộ</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Đặt hàng từ cửa hàng: tạo đơn và gửi lên bếp trung tâm để nhận hàng. Có thể lưu nháp nếu chưa gửi ngay.
          </p>
        </div>
        <div className='flex gap-2'>
          <button
            onClick={() => setCreateOpen(true)}
            className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600'
          >
            <Plus className='h-4 w-4' /> Tạo đơn mới
          </button>
          <button
            onClick={() => loadOrders(1)}
            className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'
          >
            <RefreshCcw className='h-4 w-4' /> Làm mới
          </button>
        </div>
      </div>

      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Tìm theo số đơn / cửa hàng...'
            className='input-field w-full pl-9'
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className='input-field min-w-[180px]'
        >
          <option value='ALL'>Tất cả trạng thái</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='w-full text-sm'>
          <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Số đơn</th>
              <th className='px-4 py-3'>Ngày đặt</th>
              <th className='px-4 py-3'>Gấp</th>
              <th className='px-4 py-3'>Tổng tiền</th>
              <th className='px-4 py-3'>Trạng thái</th>
              <th className='px-4 py-3 text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {loading && (
              <tr>
                <td colSpan={6} className='px-4 py-6 text-center text-slate-400'>Đang tải...</td>
              </tr>
            )}
            {!loading && !filteredOrders.length && (
              <tr>
                <td colSpan={6} className='px-4 py-6 text-center text-slate-400'>Không có đơn nào.</td>
              </tr>
            )}
            {!loading && filteredOrders.map(o => (
              <tr key={o._id}>
                <td className='px-4 py-3 font-medium text-slate-900'>{o.order_no || o._id}</td>
                <td className='px-4 py-3 text-slate-700'>
                  {o.order_date ? new Date(o.order_date).toLocaleString('vi-VN') : '-'}
                </td>
                <td className='px-4 py-3 text-xs'>
                  {o.is_urgent ? (
                    <span className='inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600'>Gấp</span>
                  ) : (
                    <span className='text-slate-400'>Thường</span>
                  )}
                </td>
                <td className='px-4 py-3 text-slate-800'>
                  {o.total_amount != null ? Number(o.total_amount).toLocaleString('vi-VN') + ' đ' : '-'}
                </td>
                <td className='px-4 py-3'>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(o.status)}`}>
                    {ORDER_STATUS[o.status] || o.status}
                  </span>
                </td>
                <td className='px-4 py-3 text-right'>
                  <button
                    onClick={() => loadDetail(o._id)}
                    className='mr-2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50'
                  >
                    Chi tiết
                  </button>
                  {o.status === 'SHIPPED' && (
                    <button
                      onClick={() => openReceiveModal(o)}
                      className='mr-2 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700'
                    >
                      Nhận hàng
                    </button>
                  )}
                  {o.status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => submitOrder(o)}
                        disabled={actionLoadingId === o._id}
                        className='mr-2 rounded-md bg-orange-500 px-2 py-1 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-60'
                      >
                        {actionLoadingId === o._id ? 'Đang gửi...' : 'Gửi đơn'}
                      </button>
                      <button
                        onClick={() => cancelOrder(o)}
                        disabled={actionLoadingId === o._id}
                        className='rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60'
                      >
                        Hủy đơn
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.total > 0 && (
        <div className='flex items-center justify-between text-sm text-slate-500'>
          <p>
            Hiển thị {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} đơn
          </p>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => loadOrders(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
            >
              Trước
            </button>
            <span>Trang {pagination.page} / {Math.max(1, pagination.pages)}</span>
            <button
              type='button'
              onClick={() => loadOrders(pagination.page + 1)}
              disabled={pagination.page >= Math.max(1, pagination.pages)}
              className='rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50 hover:bg-slate-50'
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* Modal chi tiết đơn – render qua Portal để luôn căn giữa viewport */}
      {detailId && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => setDetailId(null)}>
          <div
            className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Chi tiết đơn hàng</h2>
              <button onClick={() => setDetailId(null)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            {!detailOrder && !detailError && <p className='text-sm text-slate-500'>Đang tải...</p>}
            {detailError && <p className='text-sm text-red-600'>{detailError}</p>}
            {detailOrder && (
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-2 text-sm'>
                  <span className='text-slate-500'>Số đơn:</span>
                  <span className='font-medium'>{detailOrder.order_no || detailOrder._id}</span>
                  <span className='text-slate-500'>Cửa hàng:</span>
                  <span className='font-medium'>{detailOrder.store_org_unit_id?.name || detailOrder.store_org_unit_id || '-'}</span>
                  <span className='text-slate-500'>Ngày đặt:</span>
                  <span>{detailOrder.order_date ? new Date(detailOrder.order_date).toLocaleString('vi-VN') : '-'}</span>
                  <span className='text-slate-500'>Trạng thái:</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(detailOrder.status)}`}>
                    {ORDER_STATUS[detailOrder.status] || detailOrder.status}
                  </span>
                  <span className='text-slate-500'>Tổng tiền:</span>
                  <span>{detailOrder.total_amount != null ? Number(detailOrder.total_amount).toLocaleString('vi-VN') + ' đ' : '-'}</span>
                </div>
                <div>
                  <h3 className='mb-2 text-sm font-medium text-slate-700'>Dòng đơn hàng</h3>
                  <table className='w-full text-sm'>
                    <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                      <tr>
                        <th className='px-3 py-2'>Sản phẩm</th>
                        <th className='px-3 py-2'>SL đặt</th>
                        <th className='px-3 py-2'>Đã giao</th>
                        <th className='px-3 py-2'>Đã nhận</th>
                        <th className='px-3 py-2'>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {(detailOrder.lines || []).map((line, idx) => (
                        <tr key={line._id || idx}>
                          <td className='px-3 py-2'>{getItemName(line)}</td>
                          <td className='px-3 py-2'>{line.qty_ordered ?? 0}</td>
                          <td className='px-3 py-2'>{line.fulfillment?.qty_shipped_total ?? 0}</td>
                          <td className='px-3 py-2'>{line.fulfillment?.qty_received_total ?? 0}</td>
                          <td className='px-3 py-2'>{line.line_total != null ? Number(line.line_total).toLocaleString('vi-VN') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {detailOrder.status === 'DRAFT' && (
                  <div className='flex justify-end gap-2 border-t pt-4'>
                    <button
                      onClick={() => cancelOrder(detailOrder)}
                      disabled={actionLoadingId === detailOrder._id}
                      className='rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60'
                    >
                      Hủy đơn
                    </button>
                    <button
                      onClick={() => submitOrder(detailOrder)}
                      disabled={actionLoadingId === detailOrder._id}
                      className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60'
                    >
                      {actionLoadingId === detailOrder._id ? 'Đang gửi...' : 'Gửi đơn'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Modal đặt hàng – bước 1: chọn sản phẩm */}
      {createOpen && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => !creating && setCreateOpen(false)}>
          <div
            className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Đặt hàng – Chọn sản phẩm</h2>
              <button onClick={() => !creating && setCreateOpen(false)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>
            <p className='mb-3 text-sm text-slate-600'>
              Chọn sản phẩm và số lượng cần đặt. Bấm <strong>Thanh toán</strong> để sang bước xác nhận đơn và thanh toán chuyển khoản PayOS. Nếu chưa xong, có thể <strong>Lưu nháp</strong> rồi đặt sau.
            </p>
            {createError && <p className='mb-3 text-sm text-red-600'>{createError}</p>}

            <form onSubmit={openConfirmModal} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700'>Ngày giờ đặt hàng</label>
                <input
                  type='datetime-local'
                  value={newOrder.order_date}
                  onChange={e => setNewOrder(prev => ({ ...prev, order_date: e.target.value }))}
                  className='mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
                />
                <p className='mt-1 text-xs text-slate-500'>Chọn đúng ngày và giờ đặt hàng (theo giờ máy bạn).</p>
              </div>
              <label className='flex items-center gap-2 text-sm text-slate-700'>
                <input
                  type='checkbox'
                  checked={newOrder.is_urgent}
                  onChange={e => setNewOrder(prev => ({ ...prev, is_urgent: e.target.checked }))}
                />
                Đơn gấp (ưu tiên xử lý)
              </label>

              <div className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium text-slate-700'>Dòng sản phẩm (ít nhất 1, số lượng &gt; 0, đơn giá ≥ 0)</span>
                  <button type='button' onClick={addLine} className='text-xs font-medium text-orange-600 hover:text-orange-700'>+ Thêm dòng</button>
                </div>
                {newOrder.lines.map((line, idx) => (
                  <div key={idx} className='grid grid-cols-1 gap-2 rounded-lg bg-white p-3 sm:grid-cols-12'>
                    <div className='sm:col-span-5'>
                      <label className='block text-xs font-medium text-slate-600'>Sản phẩm</label>
                      <select
                        required
                        value={line.item_id}
                        onChange={e => handleLineChange(idx, 'item_id', e.target.value)}
                        className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm'
                      >
                        <option value=''>Chọn sản phẩm</option>
                        {items.map(it => (
                          <option key={it._id} value={it._id}>{it.name} ({it.sku})</option>
                        ))}
                      </select>
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs font-medium text-slate-600'>Số lượng</label>
                      <input
                        type='number'
                        min={isDiscreteUom(line.item_id) ? 1 : 0.01}
                        step={isDiscreteUom(line.item_id) ? 1 : 0.01}
                        value={line.qty_ordered === '' || line.qty_ordered == null ? '' : line.qty_ordered}
                        disabled={!line.item_id}
                        onChange={e => handleLineChange(idx, 'qty_ordered', e.target.value)}
                        placeholder='Nhập số lượng'
                        className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed'
                      />
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs font-medium text-slate-600'>ĐVT</label>
                      <input
                        value={items.find(i => i._id === line.item_id)?.base_uom_id?.code || ''}
                        readOnly
                        className='mt-1 h-9 w-full rounded-lg border border-slate-100 bg-slate-50 px-2 text-sm text-slate-500'
                      />
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs font-medium text-slate-600'>Đơn giá</label>
                      <input
                        type='number'
                        min={0}
                        value={line.unit_price}
                        readOnly
                        disabled={!line.item_id}
                        className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 cursor-not-allowed'
                      />
                    </div>
                    <div className='flex items-center justify-end sm:col-span-1'>
                      {newOrder.lines.length > 1 && (
                        <button type='button' onClick={() => removeLine(idx)} className='mt-5 text-xs text-red-500 hover:text-red-600'>Xóa</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className='flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4'>
                <button
                  type='button'
                  disabled={creating}
                  onClick={() => setCreateOpen(false)}
                  className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
                >
                  Hủy
                </button>
                <button
                  type='button'
                  disabled={creating}
                  onClick={submitCreateDraftOnly}
                  className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'
                >
                  {creating ? 'Đang xử lý...' : 'Lưu nháp'}
                </button>
                <button
                  type='submit'
                  disabled={creating}
                  className='rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60'
                >
                  {creating ? 'Đang xử lý...' : 'Thanh toán'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal xác nhận đơn + chọn hình thức thanh toán – bước 2 */}
      {confirmOpen && pendingOrderBody && createPortal(
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => !creating && setConfirmOpen(false)}>
          <div
            className='w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Xác nhận đơn hàng</h2>
              <button onClick={() => !creating && setConfirmOpen(false)} className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'>×</button>
            </div>

            <div className='space-y-4 text-sm'>
              <div className='grid grid-cols-2 gap-2'>
                <span className='text-slate-500'>Ngày đặt:</span>
                <span>{newOrder.order_date ? new Date(newOrder.order_date).toLocaleString('vi-VN') : '-'}</span>
                <span className='text-slate-500'>Đơn gấp:</span>
                <span>{newOrder.is_urgent ? 'Có' : 'Không'}</span>
                <span className='text-slate-500'>Tổng tiền tạm tính:</span>
                <span className='font-medium'>{Number(pendingOrderTotal || 0).toLocaleString('vi-VN')} đ</span>
              </div>

              <div>
                <h3 className='mb-2 text-sm font-medium text-slate-700'>Chi tiết sản phẩm</h3>
                <table className='w-full text-sm'>
                  <thead className='bg-slate-50 text-left text-xs text-slate-500'>
                    <tr>
                      <th className='px-3 py-2'>Sản phẩm</th>
                      <th className='px-3 py-2'>SL</th>
                      <th className='px-3 py-2'>Đơn giá</th>
                      <th className='px-3 py-2'>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {newOrder.lines
                      .filter(l => l.item_id && (l.qty_ordered || 0) > 0)
                      .map((line, idx) => {
                        const it = items.find(i => i._id === line.item_id);
                        const name = it?.name || getItemName(line);
                        const qty = Number(line.qty_ordered || 0);
                        const price = Math.max(0, Number(line.unit_price || 0));
                        const lineTotal = qty * price;
                        return (
                          <tr key={idx}>
                            <td className='px-3 py-2'>{name}</td>
                            <td className='px-3 py-2'>{qty}</td>
                            <td className='px-3 py-2'>{price.toLocaleString('vi-VN')} đ</td>
                            <td className='px-3 py-2'>{lineTotal.toLocaleString('vi-VN')} đ</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div>
                <span className='block text-sm font-medium text-slate-700 mb-1'>Hình thức thanh toán</span>
                <div className='inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700'>
                  <span className='w-2 h-2 rounded-full bg-emerald-500' />
                  <span>Chỉ hỗ trợ thanh toán chuyển khoản (PayOS)</span>
                </div>
                <p className='mt-1 text-xs text-slate-500'>
                  Nhân viên cửa hàng không sử dụng tiền mặt, tất cả đơn hàng được thanh toán qua chuyển khoản PayOS.
                </p>
              </div>

              <div className='flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4'>
                <button
                  type='button'
                  disabled={creating}
                  onClick={() => {
                    setConfirmOpen(false);
                    setCreateOpen(true);
                  }}
                  className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
                >
                  Quay lại chỉnh sửa
                </button>
                <button
                  type='button'
                  disabled={creating}
                  onClick={() => {
                    if (existingOrderForPayment) {
                      // Đơn đã tồn tại (DRAFT) → dùng flow thanh toán cho đơn cũ
                      (async () => {
                        setCreating(true);
                        try {
                          const orderId = existingOrderForPayment._id;
                          const orderNo = existingOrderForPayment.order_no || orderId;
                          const orderAmount = existingOrderForPayment.total_amount || 0;
                          const paymentType = newOrder.payment_type || 'BANK_TRANSFER';

                          await createPaymentForOrder(orderId, orderNo, paymentType, orderAmount);
                          setCreateError('');
                          loadOrders(1).catch(() => {});
                        } catch (err) {
                          console.error(err);
                          setCreateError(err?.response?.data?.message || 'Có lỗi khi đặt hàng');
                        } finally {
                          setCreating(false);
                        }
                      })();
                    } else {
                      // Flow tạo đơn mới
                      submitCreateAndSend();
                    }
                  }}
                  className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60'
                >
                  {creating ? 'Đang đặt đơn...' : 'Đặt hàng'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal xác nhận thanh toán trước khi sang PayOS */}
      {paymentConfirmOpen && pendingPaymentInfo && createPortal(
        <div className='fixed inset-0 z-[10010] flex items-center justify-center bg-slate-900/40 p-4' onClick={() => !creating && !redirectingToPayOS && setPaymentConfirmOpen(false)}>
          <div
            className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>
                Xác nhận thanh toán
              </h2>
              <button
                onClick={() => !creating && !redirectingToPayOS && setPaymentConfirmOpen(false)}
                className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'
              >
                ×
              </button>
            </div>

            <div className='space-y-3 text-sm text-slate-700'>
              <p>
                Xác nhận thanh toán cho đơn{' '}
                <strong>{pendingPaymentInfo.orderNo}</strong> với số tiền{' '}
                <strong>{Number(pendingPaymentInfo.amount || 0).toLocaleString('vi-VN')} đ</strong>.
              </p>
              <p className='text-xs text-slate-500'>
                Sau khi xác nhận, bạn sẽ được chuyển sang trang thanh toán PayOS để hoàn tất chuyển khoản.
              </p>
              {redirectingToPayOS && (
                <p className='text-xs text-emerald-600'>
                  Đang chuyển đến trang thanh toán PayOS, vui lòng chờ...
                </p>
              )}
            </div>

            <div className='mt-5 flex flex-wrap justify-end gap-2'>
              <button
                type='button'
                disabled={creating || redirectingToPayOS}
                onClick={() => {
                  // Đóng alert xác nhận thanh toán, quay lại popup xác nhận đơn
                  setPaymentConfirmOpen(false);
                  setConfirmOpen(true);
                }}
                className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
              >
                Để sau
              </button>
              <button
                type='button'
                disabled={creating || redirectingToPayOS}
                onClick={async () => {
                  if (redirectingToPayOS || creating) return;
                  const url = pendingPaymentInfo.checkoutUrl;
                  if (!url) {
                    alert('Không tìm thấy link thanh toán PayOS. Vui lòng liên hệ quản trị hệ thống.');
                    return;
                  }

                  setRedirectingToPayOS(true);

                  window.location.href = url;
                }}
                className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60'
              >
                {redirectingToPayOS ? 'Đang chuyển...' : 'Thanh toán ngay'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal nhận hàng trực tiếp từ đơn – Staff cửa hàng */}
      {receiveOpen && createPortal(
        <div
          className='fixed inset-0 z-[10020] flex items-center justify-center bg-slate-900/40 p-4'
          onClick={() => {
            if (!receiveLoading) {
              setReceiveOpen(false);
              setReceiveOrder(null);
              setReceiveShipment(null);
              setReceiveLines([]);
              setReceiveError('');
            }
          }}
        >
          <div
            className='w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl'
            onClick={e => e.stopPropagation()}
          >
            <div className='mb-4 flex items-center justify-between'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>Nhận hàng cho đơn nội bộ</h2>
                <p className='mt-1 text-xs text-slate-500'>
                  Kiểm tra số lượng thực nhận so với số lượng bếp đã giao. Hệ thống sẽ tự tạo và xác nhận phiếu nhận hàng.
                </p>
              </div>
              <button
                onClick={() => {
                  if (!receiveLoading) {
                    setReceiveOpen(false);
                    setReceiveOrder(null);
                    setReceiveShipment(null);
                    setReceiveLines([]);
                    setReceiveError('');
                  }
                }}
                className='px-2 text-xl leading-none text-slate-400 hover:text-slate-600'
              >
                ×
              </button>
            </div>

            {receiveError && (
              <p className='mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700'>
                {receiveError}
              </p>
            )}

            {receiveOrder && (
              <div className='mb-4 grid grid-cols-2 gap-2 text-sm'>
                <span className='text-slate-500'>Số đơn:</span>
                <span className='font-medium'>{receiveOrder.order_no || receiveOrder._id}</span>
                <span className='text-slate-500'>Cửa hàng:</span>
                <span className='font-medium'>
                  {receiveOrder.store_org_unit_id?.name || receiveOrder.store_org_unit_id || '-'}
                </span>
                <span className='text-slate-500'>Ngày đặt:</span>
                <span>
                  {receiveOrder.order_date
                    ? new Date(receiveOrder.order_date).toLocaleString('vi-VN')
                    : '-'}
                </span>
                <span className='text-slate-500'>Tổng tiền:</span>
                <span>
                  {receiveOrder.total_amount != null
                    ? Number(receiveOrder.total_amount).toLocaleString('vi-VN') + ' đ'
                    : '-'}
                </span>
              </div>
            )}

            {receiveShipment && (
              <div className='mb-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600'>
                <div>Lô giao: <span className='font-medium'>{receiveShipment.shipment_no || receiveShipment._id}</span></div>
                <div>
                  Ngày giao:{' '}
                  <span className='font-medium'>
                    {receiveShipment.ship_date
                      ? new Date(receiveShipment.ship_date).toLocaleString('vi-VN')
                      : '-'}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={submitReceive} className='space-y-4'>
              <div className='space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                <div className='text-sm font-medium text-slate-700'>
                  Số lượng nhận theo dòng sản phẩm
                </div>
                {receiveLoading && (
                  <p className='text-xs text-slate-500'>Đang tải dữ liệu nhận hàng...</p>
                )}
                {!receiveLoading && receiveLines.length === 0 && (
                  <p className='text-xs text-slate-400'>
                    Không có dòng hàng nào trong lô giao. Vui lòng kiểm tra lại.
                  </p>
                )}
                {receiveLines.length > 0 && (
                  <table className='w-full text-xs'>
                    <thead className='text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500'>
                      <tr>
                        <th className='px-2 py-2'>Sản phẩm</th>
                        <th className='px-2 py-2 text-right'>SL giao</th>
                        <th className='px-2 py-2 text-right'>SL nhận</th>
                        <th className='px-2 py-2 text-right'>SL từ chối</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100 bg-white'>
                      {receiveLines.map((line, idx) => (
                        <tr key={line.shipment_line_id || idx}>
                          <td className='px-2 py-2'>
                            <div className='font-medium text-slate-800'>{line.name || '-'}</div>
                            {line.sku && (
                              <div className='text-[11px] text-slate-400'>{line.sku}</div>
                            )}
                          </td>
                          <td className='px-2 py-2 text-right'>{line.qty_ship}</td>
                          <td className='px-2 py-2 text-right'>
                            <input
                              type='number'
                              min={0}
                              max={line.qty_ship}
                              step='any'
                              value={line.qty_received}
                              onChange={e =>
                                handleReceiveLineChange(idx, 'qty_received', e.target.value)
                              }
                              className='w-24 rounded border border-slate-200 px-2 py-1 text-xs text-right'
                            />
                          </td>
                          <td className='px-2 py-2 text-right'>
                            <input
                              type='number'
                              min={0}
                              max={line.qty_ship}
                              step='any'
                              value={line.qty_rejected}
                              onChange={e =>
                                handleReceiveLineChange(idx, 'qty_rejected', e.target.value)
                              }
                              className='w-24 rounded border border-slate-200 px-2 py-1 text-xs text-right'
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className='text-[11px] text-slate-500'>
                  Quy tắc: với mỗi dòng, <strong>SL nhận + SL từ chối phải đúng bằng SL giao</strong>.
                </p>
              </div>

              <div className='flex justify-end gap-2 border-t border-slate-200 pt-4'>
                <button
                  type='button'
                  disabled={receiveLoading}
                  onClick={() => {
                    setReceiveOpen(false);
                    setReceiveOrder(null);
                    setReceiveShipment(null);
                    setReceiveLines([]);
                    setReceiveError('');
                  }}
                  className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  disabled={receiveLoading || !receiveShipment || receiveLines.length === 0}
                  className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60'
                >
                  {receiveLoading ? 'Đang ghi nhận...' : 'Xác nhận nhận hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
