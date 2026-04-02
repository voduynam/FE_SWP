/**
 * Resolve delivery photo URL for display (Cloudinary full URL or relative path from BE).
 * Không dùng blob hay localhost — chỉ hiển thị URL từ server/cloud.
 * @param {string} url - delivery_photo_url from API
 * @returns {string} - URL for <img src> or "Xem ảnh" link
 */
export function resolvePhotoUrl(url) {
  if (!url) return '';
  const u = String(url).trim().replace(/\\/g, '/');

  // Blob URL (preview local) — không dùng cho "ảnh đã gửi", tránh hiển thị ảnh local
  if (u.startsWith('blob:')) return '';

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const apiRoot = apiBase.replace(/\/api\/?$/, '') || 'http://localhost:5001';

  // URL tuyệt đối http(s)
  if (u.startsWith('http://') || u.startsWith('https://')) {
    try {
      const parsed = new URL(u);
      const host = parsed.hostname || '';
      // Nếu BE trả về localhost/127.0.0.1 thì thay bằng API base đã cấu hình (để production dùng đúng domain)
      if (host === 'localhost' || host === '127.0.0.1') {
        // Ưu tiên same-origin path để tận dụng Vite/reverse proxy (/uploads -> BE)
        if (parsed.pathname?.startsWith('/uploads/')) {
          return `${parsed.pathname}${parsed.search}`;
        }
        return `${apiRoot}${parsed.pathname}${parsed.search}`;
      }
      return u;
    } catch {
      return u;
    }
  }
  if (u.startsWith('//')) {
    const normalized = `https:${u}`;
    try {
      const parsed = new URL(normalized);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
        return `${apiRoot}${parsed.pathname}${parsed.search}`;
    } catch { /* ignore */ }
    return normalized;
  }

  // Đã là Cloudinary (không có scheme)
  if (u.includes('cloudinary.com')) return u.startsWith('http') ? u : `https://${u.replace(/^\/+/, '')}`;

  // Path tương đối (uploads/...) → full URL BE theo VITE_API_URL
  let path = u;
  const uploadsIndex = path.toLowerCase().lastIndexOf('uploads');
  if (uploadsIndex >= 0) path = path.substring(uploadsIndex);
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.startsWith('/uploads/')) return path;
  return `${apiRoot}${path}`;
}
