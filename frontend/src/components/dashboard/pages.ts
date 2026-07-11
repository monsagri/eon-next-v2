/** The router pages of the dashboard app shell. */
export type DashboardPage = 'overview' | 'elec' | 'gas' | 'tariff' | 'ev' | 'settings'

export interface NavItem {
  page: DashboardPage
  label: string
  icon: string
}

export const NAV_ITEMS: NavItem[] = [
  { page: 'overview', label: 'Overview', icon: 'mdi:view-grid-outline' },
  { page: 'elec', label: 'Electricity', icon: 'mdi:lightning-bolt' },
  { page: 'gas', label: 'Gas', icon: 'mdi:fire' },
  { page: 'tariff', label: 'Tariff & rates', icon: 'mdi:tag-outline' },
  { page: 'ev', label: 'EV charging', icon: 'mdi:ev-station' }
]

export const PAGE_TITLES: Record<DashboardPage, string> = {
  overview: 'Overview',
  elec: 'Electricity',
  gas: 'Gas',
  tariff: 'Tariff & rates',
  ev: 'EV charging',
  settings: 'Settings'
}
