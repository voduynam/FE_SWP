import { useEffect, useState } from 'react';
import { workflowService } from '../../services/workflowService';

const formatCurrency = value => {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return `${Number(value).toLocaleString('vi-VN')} ₫`;
};

const formatPercent = value => {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return `${Number(value).toFixed(2)}%`;
};

const safeNum = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function ManagerReportsPage() {
  const [overview, setOverview] = useState(null);
  const [perfDashboard, setPerfDashboard] = useState(null);
  const [profit, setProfit] = useState(null);
  const [loading, setLoading] = useState(false);

  const profitSummary = profit?.summary || null;
  const profitTrend = Array.isArray(profit?.trend) ? profit.trend : [];
  const topProfitItems = Array.isArray(profit?.top_profit_items) ? profit.top_profit_items : [];
  const deliveryPerf = perfDashboard?.delivery_performance || null;
  const fulfillmentPerf = perfDashboard?.order_fulfillment || null;
  const exceptionPerf = perfDashboard?.exception_handling || null;

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, perfRes, profitRes] = await Promise.all([
        workflowService.getDashboardOverview({}),
        workflowService.getPerformanceDashboard({}),
        workflowService.getDashboardProfit({}),
      ]);

      setOverview(overviewRes.success ? overviewRes.data : null);
      setPerfDashboard(perfRes.success ? perfRes.data : null);
      setProfit(profitRes.success ? profitRes.data : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Báo cáo & hiệu suất vận hành</h1>

        </div>
        <button
          onClick={loadData}
          className='inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60'
          disabled={loading}
        >
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      <div className='grid gap-4 md:grid-cols-4'>
        <div className='rounded-2xl bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm ring-1 ring-sky-100'>
          <div className='text-xs font-medium text-sky-700/80'>Tổng đơn hàng</div>
          <div className='mt-2 text-2xl font-bold text-slate-900'>{overview?.orders?.total ?? '-'}</div>
          <div className='mt-1 text-xs text-slate-500'>
            Hoàn tất: {overview?.orders?.completed ?? '-'} · Tỷ lệ:{' '}
            {overview?.orders?.completion_rate != null ? `${Number(overview.orders.completion_rate).toFixed(2)}%` : '-'}
          </div>
        </div>
        <div className='rounded-2xl bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm ring-1 ring-indigo-100'>
          <div className='text-xs font-medium text-indigo-700/80'>Lệnh sản xuất</div>
          <div className='mt-2 text-2xl font-bold text-slate-900'>{overview?.production?.total ?? '-'}</div>
          <div className='mt-1 text-xs text-slate-500'>Đang hoạt động: {overview?.production?.active ?? '-'}</div>
        </div>
        <div className='rounded-2xl bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm ring-1 ring-violet-100'>
          <div className='text-xs font-medium text-violet-700/80'>Shipments</div>
          <div className='mt-2 text-2xl font-bold text-slate-900'>{overview?.shipments?.total ?? '-'}</div>
          <div className='mt-1 text-xs text-slate-500'>Đang vận chuyển: {overview?.shipments?.in_transit ?? '-'}</div>
        </div>
        <div className='rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm ring-1 ring-emerald-100'>
          <div className='text-xs font-medium text-emerald-700/80'>Giá trị tồn kho</div>
          <div className='mt-2 text-2xl font-bold text-slate-900'>
            {overview?.inventory?.total_value != null ? formatCurrency(overview.inventory.total_value) : '-'}
          </div>
          <div className='mt-1 text-xs text-slate-500'>Số mặt hàng: {overview?.inventory?.total_items ?? '-'}</div>
        </div>
      </div>

      {/* Lợi nhuận & chi phí */}
      <div className='rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100'>
        <div className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h2 className='text-base font-semibold text-slate-900'>Lợi nhuận & chi phí</h2>
          </div>
          <div className='text-xs text-slate-400'>
            {profit?.period?.start_date && profit?.period?.end_date
              ? `Kỳ: ${new Date(profit.period.start_date).toLocaleDateString('vi-VN')} – ${new Date(profit.period.end_date).toLocaleDateString('vi-VN')}`
              : null}
          </div>
        </div>

        <div className='mt-4 grid gap-4 md:grid-cols-4'>
          <div className='rounded-2xl bg-gradient-to-br from-amber-50 to-white p-4 ring-1 ring-amber-100'>
            <div className='text-xs font-medium text-amber-700/80'>Tổng doanh thu</div>
            <div className='mt-2 text-xl font-bold text-slate-900'>{formatCurrency(profitSummary?.total_revenue)}</div>
            <div className='mt-1 text-xs text-slate-500'>Đơn: {profitSummary?.order_count ?? '-'}</div>
          </div>
          <div className='rounded-2xl bg-gradient-to-br from-rose-50 to-white p-4 ring-1 ring-rose-100'>
            <div className='text-xs font-medium text-rose-700/80'>Tổng giá vốn</div>
            <div className='mt-2 text-xl font-bold text-slate-900'>{formatCurrency(profitSummary?.total_cost)}</div>
            <div className='mt-1 text-xs text-slate-500'>Sản phẩm: {profitSummary?.item_count ?? '-'}</div>
          </div>
          <div className='rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-4 ring-1 ring-emerald-100'>
            <div className='text-xs font-medium text-emerald-700/80'>Lợi nhuận</div>
            <div className='mt-2 text-xl font-bold text-slate-900'>{formatCurrency(profitSummary?.total_profit)}</div>
            <div className='mt-1 text-xs text-slate-500'>
              {safeNum(profitSummary?.total_profit) != null && safeNum(profitSummary?.total_profit) < 0 ? 'Đang âm' : 'Tích cực'}
            </div>
          </div>
          <div className='rounded-2xl bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-200'>
            <div className='text-xs font-medium text-slate-700/80'>Biên lợi nhuận</div>
            <div className='mt-2 text-xl font-bold text-slate-900'>{formatPercent(profitSummary?.profit_margin_percent)}</div>
            <div className='mt-1 text-xs text-slate-500'>Doanh thu → LN</div>
          </div>
        </div>

        <div className='mt-5 grid gap-6 md:grid-cols-2'>
          {/* Trend lợi nhuận theo ngày – dùng bảng đơn giản thay cho biểu đồ nếu chưa có chart lib */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-semibold text-slate-800'>Xu hướng lợi nhuận theo ngày</h3>
              {!!profitTrend.length && (
                <span className='text-xs text-gray-400'>
                  {profitTrend.length} điểm dữ liệu
                </span>
              )}
            </div>
            <div className='overflow-x-auto rounded-2xl bg-slate-50/60 p-1 ring-1 ring-slate-100'>
              <table className='min-w-full text-xs'>
                <thead className='bg-transparent text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500'>
                  <tr>
                    <th className='px-3 py-2'>Ngày</th>
                    <th className='px-3 py-2 text-right'>Doanh thu</th>
                    <th className='px-3 py-2 text-right'>Giá vốn</th>
                    <th className='px-3 py-2 text-right'>Lợi nhuận</th>
                    <th className='px-3 py-2 text-right'>Biên</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {profitTrend.length === 0 && (
                    <tr>
                      <td colSpan={5} className='px-3 py-4 text-center text-slate-400'>
                        Chưa có dữ liệu xu hướng.
                      </td>
                    </tr>
                  )}
                  {profitTrend.map((row, idx) => (
                    <tr key={row.date || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className='px-3 py-2 text-slate-800 whitespace-nowrap'>{row.date ?? '-'}</td>
                      <td className='px-3 py-2 text-right whitespace-nowrap'>{formatCurrency(row.revenue)}</td>
                      <td className='px-3 py-2 text-right whitespace-nowrap'>{formatCurrency(row.cost)}</td>
                      <td className='px-3 py-2 text-right font-semibold whitespace-nowrap'>{formatCurrency(row.profit)}</td>
                      <td className='px-3 py-2 text-right whitespace-nowrap'>
                        {row.margin != null ? `${Number(row.margin).toFixed(2)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top sản phẩm theo lợi nhuận */}
          <div className='space-y-2'>
            <h3 className='text-sm font-semibold text-slate-800'>Top sản phẩm theo lợi nhuận</h3>
            <div className='overflow-x-auto rounded-2xl bg-slate-50/60 p-1 ring-1 ring-slate-100'>
              <table className='min-w-full text-xs'>
                <thead className='bg-transparent text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500'>
                  <tr>
                    <th className='px-3 py-2'>Sản phẩm</th>
                    <th className='px-3 py-2 text-right'>SL</th>
                    <th className='px-3 py-2 text-right'>Doanh thu</th>
                    <th className='px-3 py-2 text-right'>Giá vốn</th>
                    <th className='px-3 py-2 text-right'>Lợi nhuận</th>
                    <th className='px-3 py-2 text-right'>Biên</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {topProfitItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className='px-3 py-4 text-center text-slate-400'>
                        Chưa có dữ liệu top sản phẩm.
                      </td>
                    </tr>
                  )}
                  {topProfitItems.map((item, idx) => {
                    const revenue = safeNum(item.total_revenue) ?? 0;
                    const margin = revenue > 0 ? (Number(item.total_profit || 0) / revenue) * 100 : null;
                    return (
                      <tr key={item.item_id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                        <td className='px-3 py-2 text-slate-800'>
                          <div className='font-medium'>{item.item_name || '-'}</div>
                          <div className='text-[11px] text-slate-400'>{item.item_sku || item.item_id || ''}</div>
                        </td>
                        <td className='px-3 py-2 text-right whitespace-nowrap'>{item.qty_sold ?? '-'}</td>
                        <td className='px-3 py-2 text-right whitespace-nowrap'>{formatCurrency(item.total_revenue)}</td>
                        <td className='px-3 py-2 text-right whitespace-nowrap'>{formatCurrency(item.total_cost)}</td>
                        <td className='px-3 py-2 text-right font-semibold whitespace-nowrap'>{formatCurrency(item.total_profit)}</td>
                        <td className='px-3 py-2 text-right whitespace-nowrap'>
                          {margin == null ? '-' : `${margin.toFixed(2)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className='rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100'>
        <div className='mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h2 className='text-base font-semibold text-slate-900'>Hiệu suất vận hành</h2>
          </div>
          <div className='text-xs text-slate-400'>
            {deliveryPerf?.metric_date && `Gần nhất: ${new Date(deliveryPerf.metric_date).toLocaleDateString('vi-VN')}`}
          </div>
        </div>

        {!deliveryPerf && !fulfillmentPerf && !exceptionPerf && (
          <p className='py-6 text-sm text-slate-400'>Chưa có dữ liệu hiệu suất vận hành.</p>
        )}

        <div className='grid gap-4 lg:grid-cols-3'>
          {/* DELIVERY_PERFORMANCE */}
          <div className='rounded-2xl bg-sky-50/60 p-4 ring-1 ring-sky-100'>
            <div className='mb-2 flex items-center justify-between'>
              <div>
                <div className='text-[11px] font-semibold uppercase tracking-wide text-sky-600'>
                  Hiệu suất giao hàng
                </div>
                <div className='mt-0.5 text-xs text-slate-500'>Giao hàng đúng hạn</div>
              </div>
            </div>
            {!deliveryPerf && <p className='mt-3 text-xs text-slate-400'>Không có dữ liệu.</p>}
            {deliveryPerf && (
              <table className='mt-2 w-full text-xs'>
                <tbody className='divide-y divide-sky-100'>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Tổng chuyến giao</td>
                    <td className='py-1 text-right font-semibold text-slate-900'>
                      {deliveryPerf.metrics?.total_deliveries ?? '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Đúng hạn</td>
                    <td className='py-1 text-right font-semibold text-emerald-700'>
                      {deliveryPerf.metrics?.on_time_deliveries ?? '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Trễ</td>
                    <td className='py-1 text-right font-semibold text-rose-600'>
                      {deliveryPerf.metrics?.late_deliveries ?? '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Tỷ lệ đúng hạn</td>
                    <td className='py-1 text-right font-semibold text-slate-900'>
                      {formatPercent(deliveryPerf.metrics?.on_time_rate * 100)}
                    </td>
                  </tr>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Trễ TB (phút)</td>
                    <td className='py-1 text-right text-slate-900'>
                      {deliveryPerf.metrics?.average_delay_mins ?? '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* ORDER_FULFILLMENT */}
          <div className='rounded-2xl bg-emerald-50/60 p-4 ring-1 ring-emerald-100'>
            <div className='mb-2 flex items-center justify-between'>
              <div>
                <div className='text-[11px] font-semibold uppercase tracking-wide text-emerald-600'>
                  Hiệu suất hoàn thành đơn hàng
                </div>
                <div className='mt-0.5 text-xs text-slate-500'>Hoàn tất đơn hàng</div>
              </div>
            </div>
            {!fulfillmentPerf && <p className='mt-3 text-xs text-slate-400'>Không có dữ liệu.</p>}
            {fulfillmentPerf && (
              <table className='mt-2 w-full text-xs'>
                <tbody className='divide-y divide-emerald-100'>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Tổng đơn</td>
                    <td className='py-1 text-right font-semibold text-slate-900'>
                      {fulfillmentPerf.metrics?.total_orders ?? '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Hoàn tất</td>
                    <td className='py-1 text-right font-semibold text-emerald-700'>
                      {fulfillmentPerf.metrics?.fully_fulfilled ?? '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Một phần</td>
                    <td className='py-1 text-right text-slate-900'>
                      {fulfillmentPerf.metrics?.partially_fulfilled ?? '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Tỷ lệ hoàn tất</td>
                    <td className='py-1 text-right font-semibold text-slate-900'>
                      {formatPercent((fulfillmentPerf.metrics?.fulfillment_rate ?? 0) * 100)}
                    </td>
                  </tr>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Thời gian TB (giờ)</td>
                    <td className='py-1 text-right text-slate-900'>
                      {fulfillmentPerf.metrics?.average_fulfillment_time_hours ?? '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* EXCEPTION_HANDLING */}
          <div className='rounded-2xl bg-rose-50/60 p-4 ring-1 ring-rose-100'>
            <div className='mb-2 flex items-center justify-between'>
              <div>
                <div className='text-[11px] font-semibold uppercase tracking-wide text-rose-600'>
                  Hiệu suất xử lý ngoại lệ
                </div>
                <div className='mt-0.5 text-xs text-slate-500'>Xử lý ngoại lệ</div>
              </div>
            </div>
            {!exceptionPerf && <p className='mt-3 text-xs text-slate-400'>Không có dữ liệu.</p>}
            {exceptionPerf && (
              <table className='mt-2 w-full text-xs'>
                <tbody className='divide-y divide-rose-100'>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Tổng ngoại lệ</td>
                    <td className='py-1 text-right font-semibold text-slate-900'>
                      {exceptionPerf.metrics?.total_exceptions ?? '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Đã xử lý</td>
                    <td className='py-1 text-right font-semibold text-emerald-700'>
                      {exceptionPerf.metrics?.resolved_exceptions ?? '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Đang mở</td>
                    <td className='py-1 text-right text-slate-900'>
                      {exceptionPerf.metrics?.open_exceptions ?? '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Nghiêm trọng</td>
                    <td className='py-1 text-right font-semibold text-rose-700'>
                      {exceptionPerf.metrics?.critical_exceptions ?? '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className='py-1 pr-2 text-slate-500'>Thời gian xử lý TB (giờ)</td>
                    <td className='py-1 text-right text-slate-900'>
                      {exceptionPerf.metrics?.average_resolution_time_hours ?? '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

