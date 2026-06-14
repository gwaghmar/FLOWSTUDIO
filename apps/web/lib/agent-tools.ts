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
