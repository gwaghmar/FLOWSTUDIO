/** Replace every occurrence of `find` in `source`. split/join avoids regex escaping. replaced:0 means not found. */
export function applyPatch(
  source: string,
  find: string,
  replace: string,
): { source: string; replaced: number } {
  if (!find || !source.includes(find)) return { source, replaced: 0 };
  const parts = source.split(find);
  return { source: parts.join(replace), replaced: parts.length - 1 };
}

/** True when `s` parses as JSON. Used to reject a surgical patch that would corrupt a JSON-based diagram. */
export function isValidJson(s: string): boolean {
  try { JSON.parse(s); return true; } catch { return false; }
}
