import { useEffect, useState } from 'react';
import { workflowService } from '../services/workflowService';

export const useAlertSummary = (locationId) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await workflowService.getAlertsSummary({
        ...(locationId ? { location_id: locationId } : {}),
      });
      if (res.success && res.data) {
        setSummary(res.data);
      } else {
        setSummary(null);
        setError(res.message || 'Không thể tải dữ liệu cảnh báo.');
      }
    } catch (err) {
      console.error('Failed to fetch alert summary', err);
      setSummary(null);
      setError('Không thể tải dữ liệu cảnh báo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  return { summary, loading, error, refresh: fetchSummary };
};

export default useAlertSummary;

