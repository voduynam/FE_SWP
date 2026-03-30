import { AlertTriangle } from 'lucide-react';
import { useAlertSummary } from '../../hooks/useAlertSummary';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const getSeverityFromSummary = (summary) => {
  if (!summary) return 'NONE';
  const exp = summary.expiry_alerts || {};
  const low = summary.low_stock_alerts || {};

  if ((exp.expired || 0) > 0) return 'EXPIRED';
  if ((exp.critical || 0) + (low.critical || 0) > 0) return 'CRITICAL';
  if ((exp.high || 0) + (low.high || 0) > 0) return 'HIGH';
  if ((exp.medium || 0) + (low.medium || 0) > 0) return 'MEDIUM';
  return 'NONE';
};

const severityClasses = {
  EXPIRED:
    'bg-red-100 text-red-700 ring-2 ring-red-200 hover:bg-red-200 hover:ring-red-300',
  CRITICAL:
    'bg-[#946b74]/15 text-[#632f3a] ring-2 ring-[#946b74]/25 hover:bg-[#946b74]/25 hover:ring-[#946b74]/35',
  HIGH:
    'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-200 hover:bg-yellow-200 hover:ring-yellow-300',
  MEDIUM:
    'bg-sky-100 text-sky-700 ring-2 ring-sky-200 hover:bg-sky-200 hover:ring-sky-300',
  NONE:
    'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700',
};

export default function AlertsBadge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const locationId = user?.default_location_id || null;
  const { summary } = useAlertSummary(locationId);

  const roleCodes = Array.isArray(user?.roles)
    ? user.roles.map(r => String(r.code || '').trim().toUpperCase())
    : [];

  // Hide alerts badge for drivers - they don't have inventory alerts
  if (roleCodes.includes('DRIVER')) {
    return null;
  }

  // Alerts are shown by each inventory page (expiry + low-stock),
  // so badge should navigate to the appropriate inventory screen.
  const targetPath = (() => {
    if (roleCodes.includes('FRANCHISE_STORE_STAFF')) return '/app/store/inventory';
    if (roleCodes.includes('CENTRAL_KITCHEN_STAFF')) return '/app/central/inventory';
    // Supply Coordinator / Manager / Admin: use system inventory view
    if (roleCodes.includes('SUPPLY_COORDINATOR') || roleCodes.includes('MANAGER') || roleCodes.includes('ADMIN')) {
      return '/app/manager/inventory';
    }
    return '/app/manager/inventory';
  })();

  const total = summary?.total_alerts || 0;
  const severity = getSeverityFromSummary(summary);
  const classes = severityClasses[severity] || severityClasses.NONE;

  return (
    <button
      type="button"
      onClick={() => navigate(targetPath)}
      className={`relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all shadow-sm ${classes}`}
    >
      <AlertTriangle className="h-4 w-4" />
      <span>Cảnh báo</span>
      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/80 px-1 text-[11px] font-semibold text-slate-900">
        {total}
      </span>
    </button>
  );
}

