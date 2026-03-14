/**
 * Resolve delivery photo URL for display (Cloudinary full URL or relative path from BE).
 * @param {string} url - delivery_photo_url from API
 * @returns {string} - Absolute URL for <img src> or "Xem ảnh" link
 */
export function resolvePhotoUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  let path = url;
  const uploadsIndex = path.toLowerCase().lastIndexOf('uploads');
  if (uploadsIndex >= 0) path = path.substring(uploadsIndex);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const apiRoot = apiBase.replace(/\/api\/?$/, '');
  if (path.startsWith('/')) return `${apiRoot}${path}`;
  return `${apiRoot}/${path}`;
}
