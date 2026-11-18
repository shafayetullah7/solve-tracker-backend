/** Matches SQL backfill and systemHandleFromUserId in user-handle-assign.ts */
export function systemHandleFromUserId(id) {
  return `u${id.replace(/-/g, '').toLowerCase().slice(0, 23)}`;
}