/** Per-route chrome matching approved screenshots (header search, title). */

export function getAdminSearchPlaceholder(pathname: string): string {
  if (pathname.includes('/fleet/fuel-expense')) {
    return 'Search vehicles, trip no., driver, or vendor...'
  }
  if (pathname.includes('/fleet/dispatch') || pathname.includes('/dispatch')) {
    return 'Search trips, dispatch no., vehicle, driver, or route...'
  }
  if (pathname.includes('/collections')) {
    return 'Search member, plate no., trip no., route, or OR no...'
  }
  if (pathname.includes('/loans')) {
    return 'Search member, loan no., vehicle, or OR no...'
  }
  if (pathname.includes('/finance') || pathname.includes('/reports')) {
    return 'Search transactions, account, reference no., or member...'
  }
  return 'Search members, vehicles, transactions...'
}

export function getAdminHeaderTitle(pathname: string): string {
  if (pathname.includes('/fleet/fuel-expense')) {
    return 'KAAGAPAY Cooperative Management System'
  }
  return 'KAAGAPAY Cooperative — Multi-Purpose and Transport Service Cooperative Management System'
}