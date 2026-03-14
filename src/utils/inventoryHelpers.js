/**
 * Tính tồn khả dụng: không tính phần đã hết hạn (lot exp_date < hôm nay).
 * @param {Object} row - Dòng tồn kho (có lot_id.exp_date, qty_on_hand, qty_reserved, qty_available)
 * @returns {number}
 */
export function getQtyAvailable(row) {
  if (!row) return 0;
  const expDate = row.lot_id?.exp_date;
  const isExpired = expDate && new Date(expDate) < new Date();
  if (isExpired) return 0;
  const onHand = row.qty_on_hand ?? 0;
  const reserved = row.qty_reserved ?? 0;
  return row.qty_available ?? (onHand - reserved) ?? onHand;
}

/** Kiểm tra lô đã hết hạn chưa */
export function isLotExpired(row) {
  if (!row?.lot_id?.exp_date) return false;
  return new Date(row.lot_id.exp_date) < new Date();
}
