import { createPortal } from 'react-dom';

/**
 * Đưa lớp phủ modal ra document.body để `position: fixed; inset: 0`
 * phủ cả viewport (không bị cắt bởi main overflow/stacking trong CkManagerLayout).
 */
export default function ModalPortal({ children }) {
  return createPortal(children, document.body);
}
