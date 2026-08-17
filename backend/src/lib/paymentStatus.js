/**
 * Payment status is DERIVED from the actual Amount / Paid / Balance values
 * stored on the user (single source of truth: PostgreSQL).
 *   balance <= 0          -> PAID
 *   paid > 0, balance > 0 -> PARTIALLY PAID
 *   paid == 0             -> UNPAID
 */
export const derivePaymentStatus = (amount, paid) => {
  const amt = Number(amount) || 0;
  const pd = Number(paid) || 0;
  if (amt - pd <= 0) return 'PAID';
  if (pd > 0) return 'PARTIALLY PAID';
  return 'UNPAID';
};

/** Attach the derived paymentStatus to a user/student record. */
export const withPaymentStatus = (record) => ({
  ...record,
  paymentStatus: derivePaymentStatus(record.feeAmount, record.feePaidAmount),
});
