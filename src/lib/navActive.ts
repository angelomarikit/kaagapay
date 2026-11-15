/** True when this nav link should show the active state (only one sibling wins). */
export function isNavItemActive(href: string, pathname: string, siblingHrefs?: string[]): boolean {
  if (href === '/admin') {
    return pathname === '/admin'
  }
  if (pathname === href) {
    return true
  }
  if (!pathname.startsWith(`${href}/`)) {
    return false
  }
  // e.g. Finance Dashboard (/admin/finance) must not stay active on /admin/finance/general-ledger
  const moreSpecificSibling = siblingHrefs?.some(
    (s) => s !== href && s.length > href.length && (pathname === s || pathname.startsWith(`${s}/`)),
  )
  return !moreSpecificSibling
}