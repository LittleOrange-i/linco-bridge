export async function resolveDisplayImageSrc(src?: string): Promise<string | undefined> {
  const trimmed = src?.trim()
  if (!trimmed) return undefined
  return trimmed
}

export async function resolveDisplayImageSrcList(
  srcs: Array<string | undefined>,
): Promise<string[]> {
  const resolved = await Promise.all(srcs.map((src) => resolveDisplayImageSrc(src)))
  return resolved.filter((src): src is string => Boolean(src))
}
