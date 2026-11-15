import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bus,
  Calculator,
  Coins,
  FileText,
  Fuel,
  HandCoins,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'

export type NavItem = {
  title: string
  href?: string
  icon?: LucideIcon
  children?: NavItem[]
}

export const adminNavigation: NavItem[] = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  {
    title: 'Membership',
    icon: Users,
    children: [
      { title: 'Members', href: '/admin/membership/members' },
      { title: 'Membership Applications', href: '/admin/membership/applications' },
      { title: 'Contributions', href: '/admin/membership/contributions' },
      { title: 'Membership Status', href: '/admin/membership/status' },
    ],
  },
  {
    title: 'Transport & Fleet',
    icon: Bus,
    children: [
      { title: 'Fleet Management', href: '/admin/fleet/vehicles' },
      { title: 'Dispatch & Trips', href: '/admin/fleet/dispatch' },
      { title: 'Maintenance', href: '/admin/fleet/maintenance' },
      { title: 'Fuel & Expense', href: '/admin/fleet/fuel-expense' },
    ],
  },
  { title: 'Daily Collections', href: '/admin/collections/pos', icon: HandCoins },
  {
    title: 'Loans & Financing',
    icon: Wallet,
    children: [
      { title: 'Loan Dashboard', href: '/admin/loans' },
      { title: 'Loan Applications', href: '/admin/loans/applications' },
      { title: 'Active Loans', href: '/admin/loans/active' },
      { title: 'Repayments', href: '/admin/loans/repayments' },
      { title: 'Loan Types & Terms', href: '/admin/loans/types' },
      { title: 'Reports', href: '/admin/loans/reports' },
    ],
  },
  {
    title: 'Accounting & Finance',
    icon: Calculator,
    children: [
      { title: 'Finance Dashboard', href: '/admin/finance' },
      { title: 'General Ledger', href: '/admin/finance/general-ledger' },
      { title: 'Accounts Payable', href: '/admin/finance/accounts-payable' },
      { title: 'Accounts Receivable', href: '/admin/finance/accounts-receivable' },
      { title: 'Cash & Bank', href: '/admin/finance/cash-bank' },
      { title: 'Financial Reports', href: '/admin/finance/reports' },
      { title: 'Budget & Expenses', href: '/admin/finance/budget' },
    ],
  },
  { title: 'Payroll & Benefits', href: '/admin/payroll', icon: Coins },
  { title: 'Inventory Management', href: '/admin/inventory', icon: Package },
  { title: 'Document Management', href: '/admin/documents', icon: FileText },
  { title: 'Reports & Analytics', href: '/admin/reports', icon: BarChart3 },
  { title: 'User & Access Management', href: '/admin/users', icon: Shield },
  { title: 'Settings', href: '/admin/settings', icon: Settings },
]

export const memberNavigation: NavItem[] = [
  { title: 'Dashboard', href: '/member', icon: LayoutDashboard },
  { title: 'My Account', href: '/member/account', icon: Users },
  { title: 'Loans', href: '/member/loans', icon: Wallet },
  { title: 'Savings', href: '/member/savings', icon: Coins },
  { title: 'Transactions', href: '/member/transactions', icon: HandCoins },
  { title: 'Statements', href: '/member/statements', icon: FileText },
  { title: 'Services', href: '/member/services', icon: Bus },
  { title: 'Settings', href: '/member/settings', icon: Settings },
]

export const fleetIcons = { maintenance: Wrench, fuel: Fuel }