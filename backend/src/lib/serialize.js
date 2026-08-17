/**
 * Convert a Prisma record (or array) into the response shape the frontend
 * already expects from the old Mongoose API:
 *  - `_id` was the ObjectId previously; it now aliases the record's `id`
 *    (UUID, or the route code string for routes) so React keys and
 *    contact update/delete routes keep working unchanged.
 *  - all other fields are passed through untouched.
 */
export function serialize(record) {
  if (record === null || record === undefined) return record;
  if (Array.isArray(record)) return record.map(serialize);
  return { ...record, _id: record.id };
}

export const serializeMany = (records) => records.map(serialize);
