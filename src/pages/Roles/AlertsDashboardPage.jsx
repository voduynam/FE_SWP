import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Package, Warehouse, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { workflowService } from '../../services/workflowService';
import StatCard from '../../components/ui/StatCard';

const severityLabel = {
  EXPIRED: 'Đã hết hạn',
  CRITICAL: 'Rất gấp (<3 ngày)',
  HIGH: 'Sắp hết (3-7 ngày)',
  MEDIUM: 'Cảnh báo (7-14 ngày)',
};

const severityChipClass = {
  EXPIRED: 'bg-red-100 text-red-700',
  CRITICAL: 'bg-orange-100 text-orange-700',
  HIGH: 'bg-yellow-100 text-yellow-700',
  MEDIUM: 'bg-sky-100 text-sky-700',
};

export default function AlertsDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  const effectiveLocationId = locationId || user?.default_location_id || '';

  const loadLocations = async () => {
    const res = await workflowService.getLocations({});
    if (res.success && res.data) {
      const rows = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.data)
        ? res.data.data
        : [];
      setLocations(rows);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, eRes, lRes] = await Promise.all([
        workflowService.getAlertsSummary(
          effectiveLocationId ? { location_id: effectiveLocationId } : {}
        ),
        workflowService.getAlertsExpiry({
          ...(effectiveLocationId ? { location_id: effectiveLocationId } : {}),
          days_threshold: 14,
        }),
        workflowService.getAlertsLowStock(
          effectiveLocationId ? { location_id: effectiveLocationId } : {}
        ),
      ]);

      if (sRes.success && sRes.data) {
        setSummary(sRes.data);
      } else {
        setSummary(null);
      }

      const expiryList = eRes.success && eRes.data?.alerts
        ? eRes.data.alerts
        : eRes.data?.data?.alerts || [];
      const lowStockList = lRes.success && lRes.data?.alerts
        ? lRes.data.alerts
        : lRes.data?.data?.alerts || [];

      setExpiryAlerts(Array.isArray(expiryList) ? expiryList : []);
      setLowStockAlerts(Array.isArray(lowStockList) ? lowStockList : []);
    } catch (err) {
      console.error('Failed to load alerts dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveLocationId]);

  const filteredExpiry = useMemo(() => {
    if (severityFilter === 'ALL') return expiryAlerts;
    return expiryAlerts.filter(a => a.severity === severityFilter);
  }, [expiryAlerts, severityFilter]);

  const filteredLowStock = useMemo(() => {
    if (severityFilter === 'ALL') return lowStockAlerts;
    return lowStockAlerts.filter(a => a.severity === severityFilter);
  }, [lowStockAlerts, severityFilter]);

  const totalAlerts = summary?.total_alerts ?? 0;
  const expiryTotal = summary?.expiry_alerts?.total ?? 0;
  const lowStockTotal = summary?.low_stock_alerts?.total ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Cảnh báo & Thông báo tồn kho
          </h1>
          <p className="text-sm text-slate-600">
            Theo dõi hàng sắp hết hạn, tồn kho thấp và tổng quan cảnh báo theo
            thời gian thực.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input-field min-w-[200px]"
            value={locationId}
            onChange={e => setLocationId(e.target.value)}
          >
            <option value="">Tất cả kho / theo đơn vị của bạn</option>
            {locations.map(loc => (
              <option key={loc._id} value={loc._id}>
                {loc.name} ({loc.code})
              </option>
            ))}
          </select>
          <select
            className="input-field min-w-[180px]"
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
          >
            <option value="ALL">Tất cả mức độ</option>
            <option value="EXPIRED">Đã hết hạn</option>
            <option value="CRITICAL">Rất gấp (&lt;3 ngày)</option>
            <option value="HIGH">Sắp hết (3-7 ngày)</option>
            <option value="MEDIUM">Cảnh báo (7-14 ngày)</option>
          </select>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Làm mới
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Tổng số cảnh báo"
          value={totalAlerts.toString()}
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          title="Cảnh báo hết hạn"
          value={expiryTotal.toString()}
          icon={Warehouse}
          color="destructive"
        />
        <StatCard
          title="Cảnh báo tồn kho thấp"
          value={lowStockTotal.toString()}
          icon={Package}
          color="accent"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Hết hạn & sắp hết hạn
            </h2>
            <span className="text-xs text-slate-500">
              {filteredExpiry.length} lô hàng
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Sản phẩm</th>
                  <th className="px-3 py-2">Lô / HSD</th>
                  <th className="px-3 py-2">Kho</th>
                  <th className="px-3 py-2 text-right">SL tồn</th>
                  <th className="px-3 py-2">Mức độ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-slate-400"
                    >
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                )}
                {!loading && filteredExpiry.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-slate-400"
                    >
                      Không có cảnh báo hết hạn trong khoảng này.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredExpiry.map(alert => (
                    <tr key={alert.alert_id}>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {alert.item?.name || '-'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {alert.item?.sku}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-slate-800">
                            {alert.lot?.lot_code}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            HSD:{' '}
                            {alert.exp_date
                              ? new Date(alert.exp_date).toLocaleDateString(
                                  'vi-VN'
                                )
                              : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="text-xs text-slate-700">
                          {alert.location?.name || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right align-top">
                        <span className="text-xs font-semibold text-slate-900">
                          {alert.qty_on_hand}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            severityChipClass[alert.severity] ||
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {severityLabel[alert.severity] || alert.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Tồn kho thấp theo sản phẩm
            </h2>
            <span className="text-xs text-slate-500">
              {filteredLowStock.length} sản phẩm
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Sản phẩm</th>
                  <th className="px-3 py-2">Kho</th>
                  <th className="px-3 py-2 text-right">SL khả dụng</th>
                  <th className="px-3 py-2 text-right">Mức tối thiểu</th>
                  <th className="px-3 py-2">Mức độ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-slate-400"
                    >
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                )}
                {!loading && filteredLowStock.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-slate-400"
                    >
                      Không có cảnh báo tồn kho thấp.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredLowStock.map(alert => (
                    <tr key={alert.alert_id}>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {alert.item?.name || '-'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {alert.item?.sku}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="text-xs text-slate-700">
                          {alert.location?.name || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right align-top">
                        <span className="text-xs font-semibold text-slate-900">
                          {alert.qty_available}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right align-top">
                        <span className="text-xs text-slate-700">
                          {alert.min_stock}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            severityChipClass[alert.severity] ||
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {severityLabel[alert.severity] || alert.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

