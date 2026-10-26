// Prisma's PostgreSQL adapter can expose serialization failures through either
// P2034 or a nested database cause when the failed statement was raw SQL.
export function isTransactionConflict(error, depth = 0) {
  if (!error || typeof error !== 'object' || depth > 6) return false;
  if (['P2034', '40001', '40P01'].includes(error.code) ||
      ['40001', '40P01'].includes(error.originalCode)) return true;
  return ['cause', 'meta', 'driverAdapterError', 'error'].some(key =>
    isTransactionConflict(error[key], depth + 1));
}
