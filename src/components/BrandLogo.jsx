import logoTrungThu from '../assets/image/logo_trung_thu.png';

/**
 * Logo CK Manager — ảnh Tết Trung Thu.
 * @param {'light' | 'dark'} variant — nền sáng (form) hoặc tối (sidebar)
 */
export default function BrandLogo({
  className = '',
  variant = 'light',
  alt = 'CK Manager',
}) {
  const shell =
    variant === 'dark'
      ? 'bg-white/10 ring-1 ring-white/15'
      : 'bg-white ring-1 ring-black/[0.06] shadow-sm';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl ${shell} ${className}`}
    >
      <img
        src={logoTrungThu}
        alt={alt}
        className='h-full w-full object-contain object-center p-0.5'
        loading='lazy'
        decoding='async'
      />
    </span>
  );
}
