import { appDialogRef } from './appDialogRef';

/**
 * Popup thông báo (thay window.alert).
 * @param {string} message
 * @param {string} [title='Thông báo']
 * @returns {Promise<void>}
 */
export function appAlert(message, title = 'Thông báo') {
  const api = appDialogRef.current;
  if (!api?.showAlert) {
    window.alert(message);
    return Promise.resolve();
  }
  return api.showAlert(String(message ?? ''), title);
}

/**
 * Popup xác nhận (thay window.confirm). Trả về Promise<boolean>.
 */
export function appConfirm(message, title = 'Xác nhận') {
  const api = appDialogRef.current;
  if (!api?.showConfirm) {
    return Promise.resolve(window.confirm(message));
  }
  return api.showConfirm(String(message ?? ''), title);
}
