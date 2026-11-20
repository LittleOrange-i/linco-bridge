/** Web custom nav bars do not need the mini-program status-bar inset. */
export function getCustomNavPagePaddingTop(): number {
  return 0
}

export function getCustomNavPagePaddingStyle(): Record<string, string> {
  return { paddingTop: `${getCustomNavPagePaddingTop()}px` }
}

export function getCustomNavBarPaddingStyle(): Record<string, string> {
  return getCustomNavPagePaddingStyle()
}
